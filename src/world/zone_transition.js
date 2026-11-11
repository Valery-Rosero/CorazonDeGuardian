// @ts-check

/**
 * Transición entre zonas con fundido a negro (lógica pura): se oscurece, en el punto más negro se
 * cambia de zona (teletransporte, luces, atmósfera, audio) y se vuelve a aclarar.
 */
export class Transicion {
  /** @param {{oscurecer: number, negro: number, aclarar: number}} [tiempos] segundos */
  constructor(tiempos = { oscurecer: 0.6, negro: 0.35, aclarar: 0.8 }) {
    this.tiempos = tiempos;
    this.t = -1;
    /** @type {(() => void) | null} */
    this._alNegro = null;
    this.opacidad = 0;
  }

  get activa() {
    return this.t >= 0;
  }

  /** @param {() => void} alNegro  se llama una vez, con la pantalla en negro */
  iniciar(alNegro) {
    if (this.activa) return false;
    this.t = 0;
    this._alNegro = alNegro;
    return true;
  }

  /** @param {number} dt @returns {number} opacidad del negro (0 a 1) */
  actualizar(dt) {
    if (!this.activa) return (this.opacidad = 0);
    const { oscurecer, negro, aclarar } = this.tiempos;
    this.t += dt;
    if (this.t < oscurecer) {
      this.opacidad = this.t / oscurecer;
    } else if (this.t < oscurecer + negro) {
      this.opacidad = 1;
      if (this._alNegro) {
        const fn = this._alNegro;
        this._alNegro = null;
        fn();
      }
    } else if (this.t < oscurecer + negro + aclarar) {
      if (this._alNegro) {
        const fn = this._alNegro;
        this._alNegro = null;
        fn();
      }
      this.opacidad = 1 - (this.t - oscurecer - negro) / aclarar;
    } else {
      this.t = -1;
      this.opacidad = 0;
    }
    return this.opacidad;
  }
}
