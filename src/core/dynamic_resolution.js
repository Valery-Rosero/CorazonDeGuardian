// @ts-check
/**
 * Resolución dinámica (sección 14.3): si el juego no llega a ~55 FPS, se dibuja a menos resolución
 * (el navegador la escala a pantalla completa) y se vuelve a subir cuando sobra margen.
 *
 * Con sincronización vertical el tiempo de fotograma nunca baja de 16,7 ms, así que no se sabe cuánto
 * margen hay: se prueba a subir un escalón y, si en los segundos siguientes vuelve a ir lento, se
 * baja y ese escalón queda bloqueado un buen rato (sin oscilar).
 */
export const RESOLUCION = Object.freeze({
  minima: 0.67,
  paso: 0.08,
  ventana: 1.0,        // s de fotogramas que se promedian
  lento_ms: 18.5,      // por encima: ~54 FPS o menos → bajar
  holgado_ms: 17.2,    // por debajo (con VSync, ~60 FPS) → se puede probar a subir
  espera_subir: 6,     // s holgados seguidos antes de probar a subir
  bloqueo: 40,         // s que un escalón que falló no se vuelve a probar
});

export class ResolucionDinamica {
  /**
   * @param {(escala: number) => void} aplicar  cambia la resolución (1 = la de la calidad elegida)
   * @param {Partial<typeof RESOLUCION>} [cfg]
   */
  constructor(aplicar, cfg = {}) {
    this.cfg = { ...RESOLUCION, ...cfg };
    this.aplicar = aplicar;
    this.escala = 1;
    this.activa = true;
    this._suma = 0;
    this._n = 0;
    this._t = 0;
    this._holgado = 0;
    /** Escala a la que se subió por última vez y cuándo (para detectar que falló). */
    this._prueba = { escala: 0, t: -1 };
    /** Escalones bloqueados: escala → hasta cuándo. @type {Map<number, number>} */
    this._bloqueos = new Map();
    this.reloj = 0;
  }

  /** @param {number} dtReal  segundos reales del último fotograma */
  actualizar(dtReal) {
    if (!this.activa || dtReal <= 0 || dtReal > 0.25) return;   // pausas y pestañas ocultas no cuentan
    this.reloj += dtReal;
    this._suma += dtReal;
    this._n++;
    this._t += dtReal;
    if (this._t < this.cfg.ventana) return;
    const ms = (this._suma / this._n) * 1000;
    this._suma = 0;
    this._n = 0;
    this._t = 0;
    const c = this.cfg;
    if (ms > c.lento_ms && this.escala > c.minima + 1e-6) {
      // Si acabábamos de subir a esta escala, ese escalón queda bloqueado
      if (this._prueba.t >= 0 && Math.abs(this._prueba.escala - this.escala) < 1e-6 && this.reloj - this._prueba.t < c.espera_subir) {
        this._bloqueos.set(this._clave(this.escala), this.reloj + c.bloqueo);
      }
      this._poner(Math.max(c.minima, this.escala - c.paso));
      this._holgado = 0;
      return;
    }
    this._holgado = ms < c.holgado_ms ? this._holgado + c.ventana : 0;
    if (this._holgado >= c.espera_subir && this.escala < 1) {
      const siguiente = Math.min(1, this.escala + c.paso);
      const hasta = this._bloqueos.get(this._clave(siguiente)) ?? -1;
      if (this.reloj >= hasta) {
        this._poner(siguiente);
        this._prueba = { escala: siguiente, t: this.reloj };
      }
      this._holgado = 0;
    }
  }

  /** @param {number} e */
  _poner(e) {
    this.escala = Math.round(e * 1000) / 1000;
    this.aplicar(this.escala);
  }

  /** @param {number} e */
  _clave(e) {
    return Math.round(e * 1000);
  }
}
