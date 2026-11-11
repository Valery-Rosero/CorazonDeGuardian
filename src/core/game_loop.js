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
/**
 * Las cinemáticas y los diálogos van con el reloj de verdad (el de las voces): un fotograma lento no
 * debe atrasar la cámara ni los subtítulos respecto a lo que ya sonó. Solo se corta si la pestaña
 * estuvo oculta.
 */
const DT_MAXIMO_CINE = 0.5;

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
    /** Tiempo real de este fotograma para cinemáticas y diálogos (hasta DT_MAXIMO_CINE). */
    this.dtCine = 0;
    /**
     * Revisión fotograma a fotograma (capturas automáticas en máquinas sin GPU): si es > 0, cada
     * fotograma avanza exactamente esto, juego y cinemática juntos, por lento que se dibuje.
     */
    this.pasoFijo = 0;
    this._alFotograma = this._fotograma.bind(this);
  }

  iniciar() {
    this.renderer.setAnimationLoop(this._alFotograma);
  }

  /** @param {number} ahoraMs */
  _fotograma(ahoraMs) {
    const ahora = ahoraMs / 1000;
    const transcurrido = this.ultimo < 0 ? 0 : ahora - this.ultimo;
    const dtReal = this.pasoFijo > 0 && this.ultimo >= 0 ? this.pasoFijo : Math.min(DT_MAXIMO, transcurrido);
    this.dtCine = this.pasoFijo > 0 ? dtReal : Math.min(DT_MAXIMO_CINE, transcurrido);
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
