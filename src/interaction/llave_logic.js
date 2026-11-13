// @ts-check
import { SOLES } from '../config/llave.js';

/** @typedef {import('../config/llave.js').Sol} Sol */

/**
 * Lógica de la Llave del Sol, sin Three.js (se prueba con node --test): qué tercios tiene Victoria,
 * cuáles ya están en su cerradura y qué se puede abrir.
 *
 * Reglas: el portal pide la llave completa (los tres tercios) y se queda con el de agua; la losa pide el
 * de jade y la puerta el de oro. Un tercio colocado ya no está en la mano.
 */
export class EstadoLlave {
  constructor() {
    /** @type {Set<Sol>} tercios sacados de sus cofres */
    this.recogidos = new Set();
    /** @type {Set<Sol>} tercios puestos en su cerradura */
    this.colocados = new Set();
  }

  /** @param {Sol} sol @returns {boolean} true si es nuevo */
  recoger(sol) {
    if (!SOLES.includes(sol) || this.recogidos.has(sol)) return false;
    this.recogidos.add(sol);
    return true;
  }

  /** @param {Sol} sol */
  tiene(sol) {
    return this.recogidos.has(sol) && !this.colocados.has(sol);
  }

  /** Los tres tercios salieron de sus cofres. */
  get completa() {
    return this.recogidos.size === SOLES.length;
  }

  /** @returns {Sol[]} los que aún están en sus cofres */
  get faltan() {
    return SOLES.filter((s) => !this.recogidos.has(s));
  }

  get portalActivo() {
    return this.colocados.has('agua');
  }

  /**
   * ¿Puede poner este tercio en su cerradura? El de agua solo con la llave completa (el portal la pide
   * entera); los otros, si los tiene y el portal ya despertó (antes no se llega a sus cerraduras).
   * @param {Sol} sol
   */
  puedeColocar(sol) {
    if (!this.tiene(sol)) return false;
    return sol === 'agua' ? this.completa : this.portalActivo;
  }

  /** @param {Sol} sol @returns {boolean} */
  colocar(sol) {
    if (!this.puedeColocar(sol)) return false;
    this.colocados.add(sol);
    return true;
  }

  /** Para la partida guardada. */
  exportar() {
    return { soles: [...this.recogidos], sellos: [...this.colocados] };
  }

  /** @param {{soles?: string[], sellos?: string[]}} datos */
  importar(datos) {
    this.recogidos.clear();
    this.colocados.clear();
    for (const s of datos.soles ?? []) if (SOLES.includes(/** @type {Sol} */ (s))) this.recogidos.add(/** @type {Sol} */ (s));
    // Un tercio colocado también se recogió (partidas viejas o a medias)
    for (const s of datos.sellos ?? []) {
      if (!SOLES.includes(/** @type {Sol} */ (s))) continue;
      this.recogidos.add(/** @type {Sol} */ (s));
      this.colocados.add(/** @type {Sol} */ (s));
    }
  }
}
