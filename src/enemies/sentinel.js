// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GRUPOS } from '../core/physics_world.js';
import { HuesoAnimable } from '../player/procedural_animator.js';
import { LogicaCentinela, difAngulo } from './sentinel_logic.js';

/** Color del ojo según el estado (hoja de personajes, «El ojo dice qué va a hacer»). */
const OJO = {
  dormido: '#1B2A3A', guardia: '#3198DB', regreso: '#3198DB', alerta: '#DDAA36', persecucion: '#DDAA36',
  ataque: '#FFD25A', recuperacion: '#DDAA36', aturdido: '#FFFFFF', muerte: '#000000',
};

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * Centinela de piedra en el mundo: modelo con esqueleto rígido, cuerpo de cannon-es (dos esferas,
 * sin rotación) y su cerebro (LogicaCentinela). La IA fija la velocidad horizontal como con Victoria.
 */
export class ActorCentinela {
  /**
   * @param {THREE.Object3D} plantilla  nodo 'centinela' del .glb (armadura con su malla)
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {typeof import('../config/enemies.js').CENTINELA} cfg
   * @param {import('../world/level_loader.js').Spawn} spawn
   * @param {THREE.Material} toon
   */
  constructor(plantilla, fisica, cfg, spawn, toon) {
    this.tipo = 'centinela';
    this.cfg = cfg;
    this.spawn = spawn;
    this.raiz = new THREE.Group();
    this.raiz.name = `centinela_${spawn.pos.x.toFixed(0)}_${spawn.pos.z.toFixed(0)}`;
    this.modelo = clonarEsqueleto(plantilla);
    this.modelo.position.set(0, 0, 0);
    this.modelo.rotation.set(0, 0, 0);
    this.raiz.add(this.modelo);
    this.ojo = new THREE.MeshStandardMaterial({ color: OJO.guardia, emissive: OJO.guardia, emissiveIntensity: 2.8, roughness: 0.3 });
    this.modelo.traverse((o) => {
      const m = /** @type {THREE.SkinnedMesh} */ (o);
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      const nombre = /** @type {THREE.Material} */ (m.material).name || '';
      m.material = nombre.includes('ojo') ? this.ojo : toon;
    });
    this.raiz.updateMatrixWorld(true);
    const inv = this.raiz.matrixWorld.clone().invert();
    /** @type {Record<string, HuesoAnimable>} */
    this.huesos = {};
    for (const n of ['cadera', 'torso', 'cabeza', 'hombro_der', 'hombro_izq', 'brazo_der', 'brazo_izq', 'pierna_der', 'pierna_izq']) {
      const h = this.modelo.getObjectByName(n);
      if (!h) throw new Error(`El centinela no tiene el hueso ${n}`);
      this.huesos[n] = new HuesoAnimable(/** @type {THREE.Bone} */ (h), inv);
    }

    const r = cfg.radio;
    this.mitad = cfg.alto / 2;
    this.cuerpo = new CANNON.Body({
      mass: cfg.masa,
      material: fisica.materiales.jugador,
      fixedRotation: true,
      linearDamping: 0.05,
      allowSleep: false,
      collisionFilterGroup: GRUPOS.ENEMIGOS,
      collisionFilterMask: GRUPOS.MUNDO | GRUPOS.JUGADOR | GRUPOS.DINAMICOS | GRUPOS.PROYECTILES_JUGADOR | GRUPOS.ENEMIGOS,
    });
    this.cuerpo.addShape(new CANNON.Sphere(r), new CANNON.Vec3(0, -this.mitad + r, 0));
    this.cuerpo.addShape(new CANNON.Sphere(r), new CANNON.Vec3(0, this.mitad - r - 0.2, 0));
    fisica.world.addBody(this.cuerpo);
    this.logica = new LogicaCentinela(cfg, { x: spawn.pos.x, z: spawn.pos.z }, spawn.rumbo, { dormido: Boolean(spawn.datos.dormido) });
    this.rumbo = spawn.rumbo;
    this.paso = 0;
    this.brazos = 0;      // 0 = abajo, 1 = en alto (aviso del golpe)
    this.golpeT = 0;      // tiempo desde el golpe (para el remate hacia el suelo)
    this.destello = 0;
    this.activo = true;
    this.colocar(spawn.pos, spawn.rumbo);
  }

  get muerto() {
    return this.logica.muerto;
  }

  /** Centro del pecho (para apuntar y para la línea de visión). @param {THREE.Vector3} out */
  pecho(out) {
    return out.set(this.cuerpo.position.x, this.cuerpo.position.y + 0.35, this.cuerpo.position.z);
  }

  /** @param {THREE.Vector3} pies @param {number} rumbo */
  colocar(pies, rumbo) {
    this.cuerpo.position.set(pies.x, pies.y + this.mitad + 0.02, pies.z);
    this.cuerpo.velocity.set(0, 0, 0);
    this.rumbo = rumbo;
  }

  /**
   * @param {number} dt
   * @param {number} t
   * @param {import('./sentinel_logic.js').Percepcion} percepcion
   * @param {(desde: THREE.Vector3, dir: THREE.Vector3) => boolean} libre  ¿se puede caminar en esa dirección?
   */
  actualizar(dt, t, percepcion, libre) {
    if (this.muerto) return;
    const l = this.logica;
    const antes = l.estado;
    const orden = l.actualizar(dt, percepcion);
    // Esquivar obstáculos: si el camino directo está tapado, prueba a los lados
    let vx = orden.x * orden.velocidad;
    let vz = orden.z * orden.velocidad;
    if (orden.velocidad > 0) {
      _v.set(orden.x, 0, orden.z);
      const desde = this.pecho(new THREE.Vector3());
      desde.y -= 0.6;
      if (!libre(desde, _v)) {
        for (const a of [0.7, -0.7, 1.4, -1.4]) {
          const c = Math.cos(a);
          const s = Math.sin(a);
          _v.set(orden.x * c - orden.z * s, 0, orden.x * s + orden.z * c);
          if (libre(desde, _v)) {
            vx = _v.x * orden.velocidad;
            vz = _v.z * orden.velocidad;
            break;
          }
        }
      }
    }
    this.cuerpo.velocity.x = vx;
    this.cuerpo.velocity.z = vz;
    // Girar hacia donde quiere mirar (más rápido cuando persigue)
    const giro = l.estado === 'persecucion' ? 5 : 3;
    this.rumbo += Math.max(-giro * dt, Math.min(giro * dt, difAngulo(l.rumboDeseado, this.rumbo)));
    l.rumbo = this.rumbo;
    if (l.golpe) this.golpeT = 0;
    this.golpeT += dt;
    if (antes !== l.estado && l.estado === 'aturdido') this.destello = 1;
    this.destello = Math.max(0, this.destello - dt * 4);
    this._animar(dt, t, Math.hypot(vx, vz));
  }

  /** @param {number} dt @param {number} t @param {number} velocidad */
  _animar(dt, t, velocidad) {
    const l = this.logica;
    const h = this.huesos;
    this.raiz.position.set(this.cuerpo.position.x, this.cuerpo.position.y - this.mitad, this.cuerpo.position.z);
    this.raiz.rotation.y = this.rumbo;
    // Ojo: color del estado y destello blanco al recibir daño
    const color = this.destello > 0 ? OJO.aturdido : OJO[l.estado] ?? OJO.guardia;
    this.ojo.color.set(color);
    this.ojo.emissive.set(color);
    this.ojo.emissiveIntensity = l.estado === 'dormido' ? 0.15 : 2.8 + this.destello * 3;
    if (l.estado === 'dormido') {
      // Estatua: cabeza gacha y brazos colgando
      h.cabeza.rx = 0.25;
      for (const k of Object.values(h)) k.aplicar();
      return;
    }
    // Caminar: pasos pesados con balanceo de hombros
    this.paso += dt * velocidad * 1.7;
    const s = Math.sin(this.paso);
    const anda = Math.min(1, velocidad / 2);
    h.pierna_der.rx = s * 0.5 * anda;
    h.pierna_izq.rx = -s * 0.5 * anda;
    h.cadera.rz = s * 0.06 * anda;
    h.torso.rz = -s * 0.05 * anda;
    h.torso.rx = 0.12 * anda + Math.sin(t * 1.4) * 0.025;
    this.modelo.position.y = Math.abs(Math.cos(this.paso)) * 0.06 * anda;
    let brazoX = -s * 0.35 * anda;
    let brazoZ = 0;
    // Aviso del golpe: los dos brazos suben por los lados (0,6 s) y luego golpean el suelo
    const objetivo = l.estado === 'ataque' ? 1 : 0;
    this.brazos += (objetivo - this.brazos) * Math.min(1, dt * (objetivo ? 3.2 : 6));
    brazoZ = this.brazos * 2.6;
    if (this.golpeT < 0.35) {
      const k = 1 - this.golpeT / 0.35;
      brazoX = -1.1 * k;
      brazoZ = 0;
      h.torso.rx += 0.4 * k;
      h.cabeza.rx += 0.2 * k;
    }
    if (l.estado === 'aturdido') {
      h.torso.rz += Math.sin(t * 40) * 0.08;
      h.cabeza.ry = Math.sin(t * 33) * 0.15;
    }
    if (l.estado === 'alerta') h.cabeza.rx = -0.18;
    h.brazo_der.rx = brazoX;
    h.brazo_izq.rx = -brazoX * (this.brazos > 0.1 || this.golpeT < 0.35 ? -1 : 1);
    h.brazo_der.rz = -brazoZ;
    h.brazo_izq.rz = brazoZ;
    h.hombro_der.rz = -this.brazos * 0.25;
    h.hombro_izq.rz = this.brazos * 0.25;
    for (const k of Object.values(h)) k.aplicar();
  }

  /** Posición y giro de una pieza (en reposo) en el mundo, para soltar los fragmentos. @param {THREE.Vector3} reposo */
  aMundo(reposo, out) {
    this.raiz.updateMatrixWorld(true);
    out.copy(reposo).applyMatrix4(this.raiz.matrixWorld);
    return out;
  }

  get giroMundo() {
    return _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rumbo);
  }
}
