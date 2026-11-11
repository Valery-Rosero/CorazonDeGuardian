// @ts-check

/**
 * @template C
 * @typedef {{
 *   entrar?: (ctx: C) => void,
 *   actualizar?: (ctx: C, dt: number, tiempo: number) => (string | void),
 *   salir?: (ctx: C) => void,
 * }} Estado
 */

/**
 * Máquina de estados genérica (sección 6.3). Lógica pura: no sabe de Three.js ni de cannon-es.
 * Cada estado puede devolver desde `actualizar` el nombre del siguiente; `tiempo` es lo que lleva
 * en el estado actual.
 * @template C
 */
export class MaquinaEstados {
  /**
   * @param {Record<string, Estado<C>>} estados
   * @param {string} inicial
   * @param {C} contexto
   */
  constructor(estados, inicial, contexto) {
    this.estados = estados;
    this.contexto = contexto;
    this.actual = '';
    this.tiempo = 0;
    /** @type {string[]} cambios recientes, útil para depurar y para las pruebas */
    this.historial = [];
    this.cambiar(inicial);
  }

  /** @param {string} nombre */
  cambiar(nombre) {
    if (!(nombre in this.estados)) throw new Error(`Estado desconocido: ${nombre}`);
    if (nombre === this.actual) return;
    this.estados[this.actual]?.salir?.(this.contexto);
    this.actual = nombre;
    this.tiempo = 0;
    this.historial.push(nombre);
    if (this.historial.length > 32) this.historial.shift();
    this.estados[nombre].entrar?.(this.contexto);
  }

  /** @param {number} dt */
  actualizar(dt) {
    this.tiempo += dt;
    const siguiente = this.estados[this.actual].actualizar?.(this.contexto, dt, this.tiempo);
    if (siguiente && siguiente !== this.actual) this.cambiar(siguiente);
  }

  /** @param {string} nombre */
  es(nombre) {
    return this.actual === nombre;
  }
}
