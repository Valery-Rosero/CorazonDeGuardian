// @ts-check
/**
 * Máquina de estados de una tabla del puente (sección 8.1). Lógica pura.
 * firme --(pisada)--> tiembla --(0,4 s)--> cae --(3 s)--> firme
 */
export const TABLA = Object.freeze({ FIRME: 'firme', TIEMBLA: 'tiembla', CAE: 'cae' });

/** @returns {{estado: string, tiempo: number}} */
export function crearEstadoTabla() {
  return { estado: TABLA.FIRME, tiempo: 0 };
}

/**
 * @param {{estado:string, tiempo:number}} t
 * @param {number} dt
 * @param {boolean} pisada  Victoria está sobre la tabla en este fotograma
 * @param {{temblor:number, reaparicion:number}} cfg
 * @returns {'tiembla'|'cae'|'reaparece'|null} transición ocurrida en este fotograma
 */
export function actualizarTabla(t, dt, pisada, cfg) {
  if (t.estado === TABLA.FIRME) {
    if (pisada) {
      t.estado = TABLA.TIEMBLA;
      t.tiempo = 0;
      return 'tiembla';
    }
    return null;
  }
  t.tiempo += dt;
  if (t.estado === TABLA.TIEMBLA && t.tiempo >= cfg.temblor) {
    t.estado = TABLA.CAE;
    t.tiempo = 0;
    return 'cae';
  }
  if (t.estado === TABLA.CAE && t.tiempo >= cfg.reaparicion) {
    t.estado = TABLA.FIRME;
    t.tiempo = 0;
    return 'reaparece';
  }
  return null;
}
