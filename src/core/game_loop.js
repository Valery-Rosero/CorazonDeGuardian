// @ts-check
/**
 * Único bucle animate() del juego (sección 13.1). El orden es fijo:
 * entrada → física → sincronizar → lógica → cámara → partículas → audio → HUD → render.
 * Nada se crea dentro de este bucle: los sistemas usan objetos preasignados.
 *
 * @typedef {{
 *   fisica?: (dt: number) => void,
 *   sincronizar?: () => void,
 *   logica?: (dt: number, t: number) => void,
 *   camara?: (dt: number) => void,
 *   particulas?: (dt: number) => void,
 *   audio?: (dt: number) => void,
 *   hud?: (dt: number) => void,
 *   render: () => void,
 *   finFotograma?: () => void,
 * }} Etapas
 */

const DT_MAXIMO = 0.1; // al volver de otra pestaña la física no se descontrola

export class BucleJuego {
  /**
   * @param {import('three').WebGLRenderer} renderer
   * @param {Etapas} etapas
   */
  constructor(renderer, etapas) {
    this.renderer = renderer;
    this.etapas = etapas;
    this.pausado = false;
    this.tiempo = 0;
    this.ultimo = -1;
    this.escalaTiempo = 1;
    this._alFotograma = this._fotograma.bind(this);
  }

  iniciar() {
    this.renderer.setAnimationLoop(this._alFotograma);
  }

  /** @param {number} ahoraMs */
  _fotograma(ahoraMs) {
    const ahora = ahoraMs / 1000;
    const dtReal = this.ultimo < 0 ? 0 : Math.min(DT_MAXIMO, ahora - this.ultimo);
    this.ultimo = ahora;
    const e = this.etapas;
    if (!this.pausado) {
      const dt = dtReal * this.escalaTiempo;
      this.tiempo += dt;
      e.fisica?.(dt);
      e.sincronizar?.();
      e.logica?.(dt, this.tiempo);
      e.camara?.(dt);
      e.particulas?.(dt);
      e.audio?.(dt);
    }
    e.hud?.(dtReal);
    e.render();
    e.finFotograma?.();
  }
}
