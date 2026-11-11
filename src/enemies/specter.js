// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PALETA } from '../config/palette.js';
import { GRUPOS } from '../core/physics_world.js';
import { HuesoAnimable } from '../player/procedural_animator.js';
import { difAngulo } from './sentinel_logic.js';
import { LogicaEspectro } from './specter_logic.js';

/**
 * Matcap azul dibujado en un canvas (hoja de personajes: «matcap azul dibujado en canvas + borde
 * Fresnel»): centro oscuro y borde claro, así el contorno del espectro brilla como un fantasma.
 */
function crearMatcap() {
  if (typeof document === 'undefined') return new THREE.Texture();   // pruebas sin navegador
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const g = /** @type {CanvasRenderingContext2D} */ (lienzo.getContext('2d'));
  const grad = g.createRadialGradient(54, 50, 6, 64, 64, 64);
  grad.addColorStop(0, '#9AD6FA');
  grad.addColorStop(0.45, '#3C8CD2');
  grad.addColorStop(0.85, '#1E5A9A');
  grad.addColorStop(1, '#BFE6FF');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** @type {THREE.Texture | null} */
let matcapCompartido = null;

/**
 * Cuerpo translúcido del espectro con disolución de abajo hacia arriba y un borde de luz
 * (al morir). Una sola capa transparente sin escribir profundidad (la Iris Xe lo agradece).
 */
function materialFantasma() {
  matcapCompartido ??= crearMatcap();
  const m = new THREE.MeshMatcapMaterial({
    matcap: matcapCompartido, color: '#FFFFFF', transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide,
  });
  const uDisolver = { value: 0 };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uDisolver = uDisolver;
    shader.vertexShader = 'varying float vAlto;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n  vAlto = position.y;');
    shader.fragmentShader = 'uniform float uDisolver;\nvarying float vAlto;\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `float corteAlto = uDisolver * 2.6 - 0.1 + sin(vAlto * 31.0 + gl_FragCoord.x * 0.05) * 0.06;
      if (vAlto < corteAlto) discard;
      float bordeDisolver = 1.0 - smoothstep(0.0, 0.12, vAlto - corteAlto);
      outgoingLight += vec3(0.6, 0.85, 1.0) * bordeDisolver * step(0.001, uDisolver) * 2.0;
      #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => 'espectro-fantasma';
  return { material: m, uDisolver };
}

/**
 * Espectro ancestral en el mundo: modelo con esqueleto, cuerpo dinámico que flota (se sostiene a
 * su altura cada fotograma) y su cerebro (LogicaEspectro).
 */
export class ActorEspectro {
  /**
   * @param {THREE.Object3D} plantilla  nodo 'espectro' del .glb
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {typeof import('../config/enemies.js').ESPECTRO} cfg
   * @param {import('../world/level_loader.js').Spawn} spawn
   * @param {THREE.Material} toon
   * @param {number} fase
   */
  constructor(plantilla, fisica, cfg, spawn, toon, fase) {
    this.tipo = 'espectro';
    this.cfg = cfg;
    this.spawn = spawn;
    this.fisica = fisica;
    this.raiz = new THREE.Group();
    this.modelo = clonarEsqueleto(plantilla);
    this.raiz.add(this.modelo);
    const { material, uDisolver } = materialFantasma();
    this.uDisolver = uDisolver;
    this.mascara = /** @type {THREE.MeshToonMaterial} */ (toon).clone();
    this.runas = new THREE.MeshStandardMaterial({ color: PALETA.espectro_runa, emissive: PALETA.espectro_runa, emissiveIntensity: 2.5 });
    this.modelo.traverse((o) => {
      const m = /** @type {THREE.SkinnedMesh} */ (o);
      if (!m.isMesh) return;
      m.frustumCulled = false;
      m.castShadow = false;
      const nombre = /** @type {THREE.Material} */ (m.material).name || '';
      m.material = nombre.includes('fantasma') ? material : nombre.includes('runa') ? this.runas : this.mascara;
      if (!nombre.includes('fantasma')) m.castShadow = true;
    });
    this.raiz.updateMatrixWorld(true);
    const inv = this.raiz.matrixWorld.clone().invert();
    /** @type {Record<string, HuesoAnimable>} */
    this.huesos = {};
    for (const n of ['cuerpo', 'cabeza', 'brazo_der', 'brazo_izq']) {
      const h = this.modelo.getObjectByName(`esp_${n}`);
      if (!h) throw new Error(`El espectro no tiene el hueso esp_${n}`);
      this.huesos[n] = new HuesoAnimable(/** @type {THREE.Bone} */ (h), inv);
    }
    // Orbe que se carga en la mano
    this.carga = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3, 1),
      new THREE.MeshBasicMaterial({ color: PALETA.espectro_ojo, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.carga.visible = false;
    this.raiz.add(this.carga);

    this.cuerpo = new CANNON.Body({
      mass: 30,
      linearDamping: 0.4,
      fixedRotation: true,
      allowSleep: false,
      collisionFilterGroup: GRUPOS.ENEMIGOS,
      collisionFilterMask: GRUPOS.MUNDO | GRUPOS.JUGADOR | GRUPOS.PROYECTILES_JUGADOR | GRUPOS.ENEMIGOS,
    });
    this.cuerpo.addShape(new CANNON.Sphere(0.5), new CANNON.Vec3(0, 0, 0));
    this.cuerpo.addShape(new CANNON.Sphere(cfg.radio), new CANNON.Vec3(0, 0.62, 0));
    this.suelo = spawn.pos.y;
    this.logica = new LogicaEspectro(cfg, { x: spawn.pos.x, z: spawn.pos.z }, fase);
    this.rumbo = spawn.rumbo;
    this.reloj = fase;
    this.activo = false;       // aparece cuando lo pide el nivel (al entrar a la sala o al resolverla)
    this.aparecer = 0;
    this.disolver = 0;
    this.raiz.visible = false;
  }

  get muerto() {
    return this.logica.muerto;
  }

  /** Altura del centro del cuerpo sobre el suelo: flota medio metro y la túnica llega a 1,9 m. */
  get alturaCentro() {
    return this.suelo + this.cfg.altura + 0.9;
  }

  /** @param {THREE.Vector3} out */
  pecho(out) {
    return out.set(this.cuerpo.position.x, this.cuerpo.position.y + 0.4, this.cuerpo.position.z);
  }

  /** Aparece con un destello. */
  activar() {
    if (this.activo) return;
    this.activo = true;
    this.aparecer = 0;
    this.raiz.visible = true;
    this.cuerpo.position.set(this.spawn.pos.x, this.alturaCentro, this.spawn.pos.z);
    this.cuerpo.velocity.set(0, 0, 0);
    this.fisica.world.addBody(this.cuerpo);
  }

  /** Retira el cuerpo físico (al terminar de disolverse). */
  retirar() {
    if (this.cuerpo.world) this.fisica.world.removeBody(this.cuerpo);
  }

  /**
   * @param {number} dt
   * @param {number} t
   * @param {import('./sentinel_logic.js').Percepcion} percepcion
   */
  actualizar(dt, t, percepcion) {
    if (!this.activo) return;
    this.reloj += dt;
    if (this.muerto) {
      this.disolver = Math.min(1, this.disolver + dt / this.cfg.disolver);
      this.uDisolver.value = this.disolver;
      this.carga.visible = false;
      if (this.disolver >= 1) {
        this.raiz.visible = false;
        this.retirar();
      }
      return;
    }
    this.aparecer = Math.min(1, this.aparecer + dt * 1.5);
    const l = this.logica;
    const orden = l.actualizar(dt, percepcion);
    const b = this.cuerpo;
    b.velocity.x = orden.x * orden.velocidad;
    b.velocity.z = orden.z * orden.velocidad;
    // Flotar: se sostiene a su altura con una ondulación lenta (sin gravedad aparente)
    const alto = this.alturaCentro + Math.sin(this.reloj * 1.6) * this.cfg.ondulacion;
    b.velocity.y = (alto - b.position.y) * 4 + 9.82 / 60;
    this.rumbo += Math.max(-3 * dt, Math.min(3 * dt, difAngulo(l.rumboDeseado, this.rumbo)));
    this.raiz.position.set(b.position.x, b.position.y - 0.9 - this.cfg.altura + (1 - this.aparecer) * 0.6, b.position.z);
    this.raiz.rotation.y = this.rumbo;
    this.modelo.scale.setScalar(0.4 + this.aparecer * 0.6);
    // Brazos: se estiran hacia Victoria mientras carga el orbe
    const h = this.huesos;
    const c = l.carga;
    h.cuerpo.rx = Math.sin(this.reloj * 1.3) * 0.05 + c * 0.12;
    h.cabeza.rx = Math.sin(this.reloj * 1.7 + 1) * 0.06 - c * 0.1;
    h.brazo_der.rx = -0.25 - c * 1.15 + Math.sin(this.reloj * 2.1) * 0.08;
    h.brazo_izq.rx = -0.15 + Math.sin(this.reloj * 2.1 + 2) * 0.08;
    h.brazo_der.rz = c * 0.35;
    for (const k of Object.values(h)) k.aplicar();
    this.runas.emissiveIntensity = 2.5 + c * 4;
    this.carga.visible = c > 0;
    this.carga.scale.setScalar(0.3 + c * 0.9);
    this.carga.position.set(-0.45, 1.55, 0.55);
  }

  /** Punto de salida del orbe (la mano estirada) en el mundo. @param {THREE.Vector3} out */
  mano(out) {
    this.raiz.updateMatrixWorld(true);
    return out.set(-0.45, 1.55, 0.55).applyMatrix4(this.raiz.matrixWorld);
  }

  /** Posición y giro de la máscara en el mundo (para soltarla al morir). */
  cabezaMundo(pos, giro) {
    const h = this.modelo.getObjectByName('esp_cabeza');
    if (!h) return;
    h.updateWorldMatrix(true, false);
    pos.setFromMatrixPosition(h.matrixWorld);
    pos.y += 0.25;
    giro.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rumbo);
  }

  /** Esconde la máscara pegada al cuerpo (cae la pieza suelta en su lugar). */
  soltarMascara() {
    this.mascara.visible = false;
    this.runas.visible = false;
  }
}
