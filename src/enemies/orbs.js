// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PALETA } from '../config/palette.js';
import { GRUPOS } from '../core/physics_world.js';

/**
 * @typedef {{malla: THREE.Mesh, activo: boolean, pos: THREE.Vector3, dir: THREE.Vector3, vida: number,
 *            devuelto: boolean, dueno: any}} Orbe
 */

/**
 * Orbes de los espectros (sección 6.2): pool creado al cargar. Vuelan en línea recta a 9 m/s; cada
 * fotograma se barre el tramo recorrido contra el escenario (raycast de cannon-es) y contra Victoria
 * (distancia del segmento a su cuerpo). Un orbe devuelto por el bloqueo perfecto busca a los enemigos.
 */
export class PoolOrbes {
  /**
   * @param {THREE.Scene} escena
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {typeof import('../config/enemies.js').ORBE} cfg
   */
  constructor(escena, fisica, cfg) {
    this.fisica = fisica;
    this.cfg = cfg;
    const nucleo = new THREE.IcosahedronGeometry(cfg.radio * 0.45, 1);
    const halo = new THREE.IcosahedronGeometry(cfg.radio, 1);
    const matNucleo = new THREE.MeshBasicMaterial({ color: '#F2FAFF' });
    const matHalo = new THREE.MeshBasicMaterial({
      color: PALETA.espectro_runa, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    /** @type {Orbe[]} */
    this.lista = Array.from({ length: cfg.pool }, () => {
      const malla = new THREE.Mesh(nucleo, matNucleo);
      malla.add(new THREE.Mesh(halo, matHalo));
      malla.visible = false;
      escena.add(malla);
      return { malla, activo: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(), vida: 0, devuelto: false, dueno: null };
    });
    this._rayo = new CANNON.RaycastResult();
    this._opciones = { collisionFilterMask: GRUPOS.MUNDO | GRUPOS.DINAMICOS, skipBackfaces: true };
    this._a = new CANNON.Vec3();
    this._b = new CANNON.Vec3();
    this._sig = new THREE.Vector3();
    this._seg = new THREE.Line3();
    this._cerca = new THREE.Vector3();
  }

  /** @param {THREE.Vector3} origen @param {THREE.Vector3} dir normalizada @param {any} dueno */
  disparar(origen, dir, dueno) {
    let o = this.lista.find((x) => !x.activo);
    if (!o) o = this.lista.reduce((a, b) => (a.vida < b.vida ? a : b));
    o.activo = true;
    o.devuelto = false;
    o.dueno = dueno;
    o.vida = this.cfg.vida;
    o.pos.copy(origen);
    o.dir.copy(dir);
    o.malla.position.copy(origen);
    o.malla.visible = true;
    return o;
  }

  /** Devuelve el orbe hacia quien lo lanzó (bloqueo perfecto). @param {Orbe} o @param {THREE.Vector3} hacia */
  devolver(o, hacia) {
    o.devuelto = true;
    o.vida = this.cfg.vida;
    o.dir.subVectors(hacia, o.pos).normalize();
  }

  /** @param {Orbe} o */
  apagar(o) {
    o.activo = false;
    o.malla.visible = false;
  }

  /**
   * @param {number} dt
   * @param {{centro: THREE.Vector3, radio: number, alto: number}} jugador  cuerpo de Victoria (pies y alto)
   * @param {{alJugador: (o: Orbe) => void, alMuro: (o: Orbe, punto: THREE.Vector3) => void,
   *          alEnemigo: (o: Orbe) => boolean, estela?: (p: THREE.Vector3) => void}} avisos
   */
  actualizar(dt, jugador, avisos) {
    const v = this.cfg.velocidad * (1.4);
    for (let i = 0; i < this.lista.length; i++) {
      const o = this.lista[i];
      if (!o.activo) continue;
      o.vida -= dt;
      const velocidad = o.devuelto ? v * 1.6 : this.cfg.velocidad;
      this._sig.copy(o.pos).addScaledVector(o.dir, velocidad * dt);
      // ¿Choca con el escenario?
      this._a.set(o.pos.x, o.pos.y, o.pos.z);
      this._b.set(this._sig.x, this._sig.y, this._sig.z);
      this._rayo.reset();
      this.fisica.world.raycastClosest(this._a, this._b, this._opciones, this._rayo);
      // ¿Toca a Victoria? (segmento contra el eje vertical de su cuerpo)
      if (!o.devuelto) {
        this._seg.set(o.pos, this._sig);
        const c = jugador.centro;
        this._cerca.set(c.x, Math.min(Math.max(this._sig.y, c.y), c.y + jugador.alto), c.z);
        this._seg.closestPointToPoint(this._cerca, true, this._cerca);
        const dx = this._cerca.x - c.x;
        const dz = this._cerca.z - c.z;
        const dentro = this._cerca.y > c.y - 0.1 && this._cerca.y < c.y + jugador.alto + 0.1;
        if (dentro && dx * dx + dz * dz < (jugador.radio + this.cfg.radio) ** 2) {
          o.pos.copy(this._cerca);
          avisos.alJugador(o);
          continue;
        }
      } else {
        o.pos.copy(this._sig);
        if (avisos.alEnemigo(o)) continue;
      }
      if (this._rayo.hasHit) {
        o.pos.set(this._rayo.hitPointWorld.x, this._rayo.hitPointWorld.y, this._rayo.hitPointWorld.z);
        avisos.alMuro(o, o.pos);
        this.apagar(o);
        continue;
      }
      o.pos.copy(this._sig);
      o.malla.position.copy(o.pos);
      avisos.estela?.(o.pos);
      if (o.vida <= 0) this.apagar(o);
    }
  }
}
