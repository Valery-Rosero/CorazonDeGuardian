// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PALETA } from '../../config/palette.js';
import { GRUPOS } from '../../core/physics_world.js';

const LEJOS = -10000;

/**
 * Pulso solar (sección 5.5): proyectiles dorados de un pool de 16 creado al cargar.
 * Cada uno es un cuerpo sensor de cannon-es (collisionResponse = false) que avisa al chocar;
 * además se barre con un rayo el tramo recorrido en cada fotograma para que a 30 m/s no atraviese
 * objetos delgados. Al agotarse el pool se recicla el proyectil más antiguo.
 */
export class PoolPulsos {
  /**
   * @param {THREE.Scene} escena
   * @param {import('../../core/physics_world.js').MundoFisico} fisica
   * @param {typeof import('../../config/abilities.js').PULSO} cfg
   * @param {{alImpactar?: (pos: THREE.Vector3, cuerpo: CANNON.Body | null, dir: THREE.Vector3) => void,
   *          estela?: (pos: THREE.Vector3) => void}} [avisos]
   */
  constructor(escena, fisica, cfg, avisos = {}) {
    this.fisica = fisica;
    this.cfg = cfg;
    this.avisos = avisos;
    const nucleo = new THREE.IcosahedronGeometry(cfg.radio, 1);
    const halo = new THREE.IcosahedronGeometry(cfg.radio * 2.4, 1);
    const matNucleo = new THREE.MeshBasicMaterial({ color: PALETA.pulso_nucleo });
    const matHalo = new THREE.MeshBasicMaterial({
      color: PALETA.oro_brillante, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.mascara = GRUPOS.MUNDO | GRUPOS.ENEMIGOS | GRUPOS.DINAMICOS;
    this.lista = Array.from({ length: cfg.pool }, (_, i) => {
      const malla = new THREE.Mesh(nucleo, matNucleo);
      malla.add(new THREE.Mesh(halo, matHalo));
      malla.visible = false;
      escena.add(malla);
      const cuerpo = new CANNON.Body({
        mass: 0.2,
        type: CANNON.Body.DYNAMIC,
        collisionResponse: false,
        collisionFilterGroup: GRUPOS.PROYECTILES_JUGADOR,
        collisionFilterMask: this.mascara,
        allowSleep: false,
      });
      cuerpo.addShape(new CANNON.Sphere(cfg.radio));
      cuerpo.position.set(0, LEJOS - i, 0);
      // Fuera del mundo físico mientras está guardado: solo entra al dispararse (MundoFisico.sacar)
      const p = {
        malla, cuerpo, activo: false, vida: 0, nacido: 0,
        dir: new THREE.Vector3(), previa: new CANNON.Vec3(), choque: /** @type {CANNON.Body | null} */ (null),
      };
      cuerpo.addEventListener('collide', (/** @type {any} */ e) => {
        if (p.activo && !p.choque) p.choque = e.body;
      });
      return p;
    });
    this.reloj = 0;
    this._rayo = new CANNON.RaycastResult();
    this._opciones = { collisionFilterMask: this.mascara, skipBackfaces: true };
    this._hasta = new CANNON.Vec3();
    this._punto = new THREE.Vector3();
    this._impulso = new CANNON.Vec3();
  }

  /** @param {THREE.Vector3} origen @param {THREE.Vector3} dir normalizada */
  disparar(origen, dir) {
    let p = this.lista.find((x) => !x.activo);
    if (!p) p = this.lista.reduce((a, b) => (a.nacido < b.nacido ? a : b)); // el más antiguo
    p.activo = true;
    p.choque = null;
    p.nacido = this.reloj;
    p.vida = this.cfg.alcance / this.cfg.velocidad;
    p.dir.copy(dir);
    this.fisica.sacar(p.cuerpo);
    p.cuerpo.position.set(origen.x, origen.y, origen.z);
    p.previa.copy(p.cuerpo.position);
    p.cuerpo.velocity.set(dir.x * this.cfg.velocidad, dir.y * this.cfg.velocidad, dir.z * this.cfg.velocidad);
    p.malla.visible = true;
    p.malla.position.copy(origen);
  }

  /** @param {number} dt */
  actualizar(dt) {
    this.reloj += dt;
    const v = this.cfg.velocidad;
    for (let i = 0; i < this.lista.length; i++) {
      const p = this.lista[i];
      if (!p.activo) continue;
      const b = p.cuerpo;
      // Vuelo recto: se anula la gravedad fijando la velocidad cada fotograma
      b.velocity.set(p.dir.x * v, p.dir.y * v, p.dir.z * v);
      // Barrido del tramo recorrido
      this._rayo.reset();
      this.fisica.world.raycastClosest(p.previa, b.position, this._opciones, this._rayo);
      let golpeado = /** @type {CANNON.Body | null} */ (null);
      if (this._rayo.hasHit) {
        golpeado = this._rayo.body;
        this._punto.set(this._rayo.hitPointWorld.x, this._rayo.hitPointWorld.y, this._rayo.hitPointWorld.z);
      } else if (p.choque) {
        golpeado = p.choque;
        this._punto.set(b.position.x, b.position.y, b.position.z);
      }
      p.previa.copy(b.position);
      p.vida -= dt;
      if (golpeado) {
        if (golpeado.type === CANNON.Body.DYNAMIC && golpeado.mass > 0) {
          this._impulso.set(p.dir.x * this.cfg.impulso, p.dir.y * this.cfg.impulso + 2, p.dir.z * this.cfg.impulso);
          golpeado.wakeUp();
          // El punto de aplicación de cannon-es es relativo al centro del cuerpo: (0,0,0) = empujón limpio
          golpeado.applyImpulse(this._impulso);
        }
        this.avisos.alImpactar?.(this._punto, golpeado, p.dir);
        this._apagar(p, i);
      } else if (p.vida <= 0) {
        this._apagar(p, i);
      } else {
        p.malla.position.set(b.position.x, b.position.y, b.position.z);
        this.avisos.estela?.(p.malla.position);
      }
    }
  }

  /** @param {any} p @param {number} i */
  _apagar(p, i) {
    p.activo = false;
    p.malla.visible = false;
    p.cuerpo.velocity.set(0, 0, 0);
    p.cuerpo.position.set(0, LEJOS - i, 0);
    this.fisica.guardar(p.cuerpo);
  }

  get activos() {
    return this.lista.reduce((n, p) => n + (p.activo ? 1 : 0), 0);
  }
}
