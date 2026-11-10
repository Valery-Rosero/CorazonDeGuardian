// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { actualizarTabla, crearEstadoTabla, TABLA } from './bridge_logic.js';

/**
 * Puente que se derrumba (sección 8.1): cada tabla es cinemática hasta que Victoria la pisa;
 * tiembla 0,4 s, pasa a ser un cuerpo dinámico que cae con la gravedad y vuelve a su sitio a los 3 s.
 */
export class Puente {
  /**
   * @param {import('./level_loader.js').Dinamico[]} tablas
   * @param {typeof import('../config/level.js').PUENTE} cfg
   * @param {{alTemblar?: (p: THREE.Vector3) => void, alCaer?: (p: THREE.Vector3) => void}} [avisos]
   */
  constructor(tablas, cfg, avisos = {}) {
    this.cfg = cfg;
    this.avisos = avisos;
    this.tablas = tablas.map((t) => ({ ...t, estado: crearEstadoTabla() }));
    this._p = new THREE.Vector3();
  }

  /**
   * @param {number} dt
   * @param {CANNON.Body | null} cuerpoBajoVictoria
   */
  actualizar(dt, cuerpoBajoVictoria) {
    const cfg = this.cfg;
    for (let i = 0; i < this.tablas.length; i++) {
      const t = this.tablas[i];
      const evento = actualizarTabla(t.estado, dt, t.cuerpo === cuerpoBajoVictoria, cfg);
      const b = t.cuerpo;
      if (evento === 'tiembla') {
        this._p.copy(t.inicio.p);
        this.avisos.alTemblar?.(this._p);
      } else if (evento === 'cae') {
        b.type = CANNON.Body.DYNAMIC;
        b.mass = cfg.masa_tabla;
        b.updateMassProperties();
        b.position.set(t.inicio.p.x, t.inicio.p.y, t.inicio.p.z);
        b.velocity.set(0, -0.5, 0);
        b.angularVelocity.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 3);
        b.wakeUp();
        this._p.copy(t.inicio.p);
        this.avisos.alCaer?.(this._p);
      } else if (evento === 'reaparece') {
        this._restaurar(t);
      }
      if (t.estado.estado === TABLA.TIEMBLA) {
        const a = cfg.amplitud_temblor;
        b.position.set(t.inicio.p.x + (Math.random() - 0.5) * a, t.inicio.p.y + (Math.random() - 0.5) * a, t.inicio.p.z);
      }
    }
  }

  /** @param {{cuerpo: CANNON.Body, inicio: {p: THREE.Vector3, q: THREE.Quaternion}, estado: {estado: string, tiempo: number}}} t */
  _restaurar(t) {
    const b = t.cuerpo;
    b.type = CANNON.Body.KINEMATIC;
    b.mass = 0;
    b.updateMassProperties();
    b.velocity.set(0, 0, 0);
    b.angularVelocity.set(0, 0, 0);
    b.position.set(t.inicio.p.x, t.inicio.p.y, t.inicio.p.z);
    b.quaternion.set(t.inicio.q.x, t.inicio.q.y, t.inicio.q.z, t.inicio.q.w);
    t.estado.estado = TABLA.FIRME;
    t.estado.tiempo = 0;
  }

  /** Al reaparecer Victoria, el puente vuelve a estar entero. */
  reiniciar() {
    for (const t of this.tablas) this._restaurar(t);
  }
}
