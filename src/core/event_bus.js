// @ts-check
/**
 * Eventos globales poco frecuentes (zona cambiada, checkpoint, jugador muerto...).
 * Nunca se emiten en cada fotograma.
 */
export const EVENTOS = Object.freeze({
  ZONA_CAMBIADA: 'zona-cambiada',
  JUGADOR_MUERTO: 'jugador-muerto',
  CHECKPOINT: 'checkpoint',
  PODER_DESBLOQUEADO: 'poder-desbloqueado',
  PAGINA_ENCONTRADA: 'pagina-encontrada',
  JEFE_DERROTADO: 'jefe-derrotado',
});

class BusEventos extends EventTarget {
  /**
   * @param {string} nombre
   * @param {any} [detalle]
   */
  emitir(nombre, detalle) {
    this.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
  }

  /**
   * @param {string} nombre
   * @param {(detalle: any) => void} fn
   */
  escuchar(nombre, fn) {
    this.addEventListener(nombre, (e) => fn(/** @type {CustomEvent} */ (e).detail));
  }
}

export const bus = new BusEventos();
