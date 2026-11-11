// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GRUPOS } from '../core/physics_world.js';
import { HuesoAnimable } from '../player/procedural_animator.js';
import { difAngulo } from './sentinel_logic.js';

const _eje = new THREE.Vector3();
const _giro = new THREE.Quaternion();

/** Color de las runas por fase (tablero «Guardián del Sol»). */
const RUNAS = { 0: '#1B2A3A', 1: '#3198DB', 2: '#4FB3F0', 3: '#FF6A2B', 4: '#000000' };
/** Cuánto se ve Mateo dentro del núcleo en cada fase. */
const MATEO = { 0: 0, 1: 0, 2: 0.5, 3: 0.75, 4: 0.9 };

/** Núcleo dorado con remolino animado (ruido de valor que gira). */
function materialNucleo() {
  return new THREE.ShaderMaterial({
    uniforms: { uTiempo: { value: 0 }, uBrillo: { value: 1 }, uFuria: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vVista;
      void main() {
        vPos = position;
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vVista = normalize(-p.xyz);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform float uBrillo;
      uniform float uFuria;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec3 vVista;
      float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float ruido(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        vec3 n = normalize(vPos);
        float ang = atan(n.y, n.x) + uTiempo * (0.6 + uFuria * 0.8) + length(n.xy) * 3.0;
        float r = ruido(vec2(ang * 2.0, n.z * 3.0 + uTiempo * 0.5)) * 0.6 + ruido(vec2(ang * 5.0, n.z * 6.0)) * 0.4;
        vec3 oro = mix(vec3(0.85, 0.52, 0.12), vec3(1.0, 0.97, 0.85), r);
        oro = mix(oro, vec3(1.0, 0.45, 0.15), uFuria * 0.6 * (1.0 - r));
        float borde = pow(1.0 - abs(dot(vNormal, vVista)), 2.0);
        gl_FragColor = vec4(oro * (1.2 + borde * 1.5) * uBrillo, 1.0);
      }`,
  });
}

/** Silueta encogida de Mateo (tablero «Mateo Solano», «Dentro del núcleo») dibujada en un canvas. */
function texturaSilueta() {
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  g.fillStyle = '#6B3A12';
  g.beginPath();
  g.arc(53, 50, 10, 0, Math.PI * 2);
  g.fill();
  for (const pol of [[[46, 59], [66, 54], [80, 64], [82, 80], [70, 88], [58, 83], [62, 72], [51, 69]], [[70, 86], [83, 78], [90, 90], [78, 94]]]) {
    g.beginPath();
    pol.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * El Guardián en el mundo (sección 7.4): cuerpo cinemático de cannon-es que se mueve solo por código,
 * modelo con esqueleto, placas del pecho con bisagra, núcleo con remolino y la silueta de Mateo.
 */
export class ActorGuardian {
  /**
   * @param {THREE.Object3D} escenaGlb  escena de guardian.glb
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {typeof import('../config/boss.js').GUARDIAN} cfg
   * @param {import('../world/level_loader.js').Spawn} spawn
   * @param {THREE.Material} toon
   */
  constructor(escenaGlb, fisica, cfg, spawn, toon) {
    this.cfg = cfg;
    this.fisica = fisica;
    this.spawn = spawn;
    const plantilla = escenaGlb.getObjectByName('guardian');
    if (!plantilla) throw new Error('guardian.glb no trae la armadura guardian');
    this.raiz = new THREE.Group();
    this.raiz.name = 'guardian_jefe';
    this.modelo = clonarEsqueleto(plantilla);
    this.raiz.add(this.modelo);
    this.runas = new THREE.MeshStandardMaterial({ color: RUNAS[0], emissive: RUNAS[0], emissiveIntensity: 2.4 });
    this.grietas = new THREE.MeshStandardMaterial({ color: '#FF8A3D', emissive: '#FF8A3D', emissiveIntensity: 3, visible: false });
    const oro = new THREE.MeshToonMaterial({ color: '#FFFFFF', vertexColors: true });
    /** @param {THREE.Object3D} o */
    const pintar = (o) => o.traverse((h) => {
      const m = /** @type {THREE.Mesh} */ (h);
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const n = /** @type {THREE.Material} */ (m.material).name || '';
      m.material = n.includes('runa') ? this.runas : n.includes('grieta') ? this.grietas : n.includes('oro') ? oro : toon;
    });
    pintar(this.modelo);
    this.raiz.updateMatrixWorld(true);
    const inv = this.raiz.matrixWorld.clone().invert();
    /** @type {Record<string, HuesoAnimable>} */
    this.h = {};
    this.modelo.traverse((o) => {
      if (/** @type {THREE.Bone} */ (o).isBone) this.h[o.name] = new HuesoAnimable(/** @type {THREE.Bone} */ (o), inv);
    });
    // Placas y núcleo cuelgan del hueso del torso
    const torso = /** @type {THREE.Bone} */ (this.modelo.getObjectByName('torso'));
    torso.updateMatrixWorld(true);
    /** @type {{obj: THREE.Object3D, lado: number, fila: number, abierta: number, base: THREE.Quaternion}[]} */
    this.placas = [];
    for (let i = 1; i <= 4; i++) {
      const p = escenaGlb.getObjectByName(`guardian_placa_${i}`);
      if (!p) continue;
      const c = p.clone();
      pintar(c);
      const lado = Number(p.userData.bisagra ?? (p.position.x < 0 ? -1 : 1));
      torso.attach(c);
      // Las de arriba se abren hacia arriba y las de abajo hacia abajo, girando en su bisagra de fuera
      this.placas.push({ obj: c, lado, fila: i <= 2 ? 1 : -1, abierta: 0, base: c.quaternion.clone() });
    }
    const n = escenaGlb.getObjectByName('guardian_nucleo');
    this.matNucleo = materialNucleo();
    this.nucleo = /** @type {THREE.Mesh} */ (n ? n.clone() : new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12)));
    this.nucleo.traverse((h) => { if (/** @type {THREE.Mesh} */ (h).isMesh) /** @type {THREE.Mesh} */ (h).material = this.matNucleo; });
    torso.attach(this.nucleo);
    this.silueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaSilueta(), transparent: true, opacity: 0, depthWrite: false }));
    this.silueta.scale.setScalar(0.62);
    this.nucleo.add(this.silueta);
    this.silueta.position.set(0, 0, 0.32);
    this.luz = new THREE.PointLight('#FFC94A', 0, 12, 2);
    this.nucleo.add(this.luz);
    // Cuerpo cinemático: tres esferas apiladas (no lo empuja nada, se mueve por código)
    this.cuerpo = new CANNON.Body({
      mass: 0, type: CANNON.Body.KINEMATIC,
      collisionFilterGroup: GRUPOS.ENEMIGOS,
      collisionFilterMask: GRUPOS.JUGADOR | GRUPOS.PROYECTILES_JUGADOR | GRUPOS.DINAMICOS,
    });
    for (const y of [1.3, 2.9, 4.4]) this.cuerpo.addShape(new CANNON.Sphere(1.35), new CANNON.Vec3(0, y, 0));
    this.cuerpo.position.set(spawn.pos.x, spawn.pos.y, spawn.pos.z);
    fisica.world.addBody(this.cuerpo);
    this.rumbo = spawn.rumbo;
    this.sentado = 1;      // 1 = en el trono, 0 = de pie
    this.reloj = 0;
    this.pose = { brazos: 0, golpe: 0, giro: 0, abre: 0, rugido: 0 };
    this.fase = 0;
    this.visible = true;
    this.colocar();
  }

  /** Pecho (núcleo) en el mundo. @param {THREE.Vector3} out */
  pecho(out) {
    this.nucleo.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.nucleo.matrixWorld);
  }

  /** Cabeza (de donde sale el rayo solar). @param {THREE.Vector3} out */
  cabeza(out) {
    const c = this.modelo.getObjectByName('cabeza');
    if (!c) return out.copy(this.raiz.position).setY(this.raiz.position.y + 5.2);
    c.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(c.matrixWorld).add(new THREE.Vector3(0, 0.6, 0));
  }

  colocar() {
    this.raiz.position.set(this.cuerpo.position.x, this.cuerpo.position.y, this.cuerpo.position.z);
    this.raiz.rotation.y = this.rumbo;
  }

  /** Cambia los colores de la fase: runas, grietas, núcleo y la silueta de Mateo. @param {number} fase */
  ponerFase(fase) {
    this.fase = fase;
    const c = RUNAS[fase] ?? RUNAS[1];
    this.runas.color.set(c);
    this.runas.emissive.set(c);
    this.grietas.visible = fase === 3;
    this.matNucleo.uniforms.uFuria.value = fase === 3 ? 1 : 0;
  }

  /**
   * Movimiento y pose. 'pose' la fija BossFight según el ataque en curso.
   * @param {number} dt
   * @param {THREE.Vector3} jugador
   * @param {{mover: boolean, nucleoAbierto: boolean, rapidez: number}} estado
   * @param {THREE.Vector3} centro  centro de la arena (no se aleja más de radio_movimiento)
   */
  actualizar(dt, jugador, estado, centro) {
    this.reloj += dt;
    const b = this.cuerpo;
    const dx = jugador.x - b.position.x;
    const dz = jugador.z - b.position.z;
    const d = Math.hypot(dx, dz);
    if (estado.mover && this.sentado <= 0.01) {
      const objetivo = Math.atan2(dx, dz);
      this.rumbo += Math.max(-this.cfg.giro * dt * estado.rapidez, Math.min(this.cfg.giro * dt * estado.rapidez, difAngulo(objetivo, this.rumbo)));
      if (d > this.cfg.distancia_comoda && !estado.nucleoAbierto) {
        const v = this.cfg.velocidad * estado.rapidez * dt;
        const nx = b.position.x + (dx / d) * v;
        const nz = b.position.z + (dz / d) * v;
        if (Math.hypot(nx - centro.x, nz - centro.z) < this.cfg.radio_movimiento) b.position.set(nx, b.position.y, nz);
      }
    }
    this.colocar();
    this.matNucleo.uniforms.uTiempo.value = this.reloj;
    this.silueta.material.opacity += ((estado.nucleoAbierto ? MATEO[this.fase] : MATEO[this.fase] * 0.3) - this.silueta.material.opacity) * Math.min(1, dt * 3);
    this.luz.intensity += ((estado.nucleoAbierto ? 8 : 1.5) - this.luz.intensity) * Math.min(1, dt * 4);
    this._animar(dt, estado, d);
  }

  /** @param {number} dt @param {{nucleoAbierto: boolean}} estado @param {number} d */
  _animar(dt, estado, d) {
    const h = this.h;
    const p = this.pose;
    const t = this.reloj;
    // Sentado en el trono: muslos hacia delante y la cabeza gacha
    const s = this.sentado;
    h.pierna_sup_der.rx += -1.45 * s;
    h.pierna_sup_izq.rx += -1.45 * s;
    h.pierna_inf_der.rx += 1.35 * s;
    h.pierna_inf_izq.rx += 1.35 * s;
    h.cabeza.rx += 0.35 * s;
    this.modelo.position.y = -0.15 * s;
    // Respiración pesada
    h.torso.rx += Math.sin(t * 1.1) * 0.03;
    // Núcleo abierto: se tambalea con los brazos abiertos (expone el pecho)
    p.abre += ((estado.nucleoAbierto ? 1 : 0) - p.abre) * Math.min(1, dt * 4);
    h.torso.rx += -0.18 * p.abre;
    h.brazo_sup_der.rz += -0.9 * p.abre;
    h.brazo_sup_izq.rz += 0.9 * p.abre;
    h.cabeza.rx += -0.2 * p.abre + Math.sin(t * 7) * 0.03 * p.abre;
    // Ataques
    h.brazo_sup_der.rz += -2.6 * p.brazos;
    h.brazo_sup_izq.rz += 2.6 * p.brazos;
    h.antebrazo_der.rx += -0.4 * p.brazos;
    h.antebrazo_izq.rx += -0.4 * p.brazos;
    h.brazo_sup_der.rx += -1.3 * p.golpe;
    h.brazo_sup_izq.rx += -1.3 * p.golpe;
    h.torso.rx += 0.35 * p.golpe;
    h.torso.ry += p.giro;
    h.brazo_sup_der.rz += -0.6 * Math.abs(p.giro);
    h.cabeza.rx += -0.3 * p.rugido;
    // Caminar (cuando se acerca)
    const anda = this.sentado < 0.01 && !estado.nucleoAbierto && d > this.cfg.distancia_comoda ? 1 : 0;
    const paso = Math.sin(t * 2.4) * 0.32 * anda;
    h.pierna_sup_der.rx += paso;
    h.pierna_sup_izq.rx -= paso;
    for (const k of Object.values(h)) k.aplicar();
    // Placas: giran en su bisagra de fuera, en el plano del pecho (como el dibujo de la fase 2)
    for (const pl of this.placas) {
      pl.abierta += ((estado.nucleoAbierto ? 1 : 0) - pl.abierta) * Math.min(1, dt * 5);
      _eje.set(0, 0, 1);
      _giro.setFromAxisAngle(_eje, -pl.fila * pl.lado * 1.1 * pl.abierta);
      pl.obj.quaternion.copy(pl.base).multiply(_giro);
    }
  }

  /** Lo esconde y quita su cuerpo (al romperse el caparazón). */
  retirar() {
    this.raiz.visible = false;
    if (this.cuerpo.world) this.fisica.world.removeBody(this.cuerpo);
  }
}
