// @ts-check
/** HUD de juego: barra de vida, viñeta de daño, mensajes y pantalla de derrota. */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export class Hud {
  constructor() {
    this.relleno = $('vida-relleno');
    this.texto = $('vida-texto');
    this.mensaje = $('cartografa-mensaje');
    this.derrota = $('derrota');
    this.vinyeta = $('vinyeta');
    this.ultimaVida = -1;
    this.finMensaje = 0;
    this.reloj = 0;
  }

  /** @param {number} actual @param {number} maxima */
  vida(actual, maxima) {
    const v = Math.ceil(actual);
    if (v === this.ultimaVida) return;
    if (v < this.ultimaVida) {
      this.vinyeta.classList.remove('activo');
      void this.vinyeta.offsetWidth;
      this.vinyeta.classList.add('activo');
    }
    this.ultimaVida = v;
    this.relleno.style.width = `${(100 * actual) / maxima}%`;
    this.texto.textContent = `${v}`;
  }

  /** Nota manuscrita en el cuaderno de la cartógrafa ("Portal activado", "Pilar encendido"...). @param {string} texto @param {number} [duracion] */
  nota(texto, duracion = 2.5) {
    this.mensaje.textContent = texto;
    this.mensaje.classList.add('visible');
    this.finMensaje = this.reloj + duracion;
  }

  /** @param {number} dt */
  actualizar(dt) {
    this.reloj += dt;
    if (this.finMensaje && this.reloj > this.finMensaje) {
      this.mensaje.classList.remove('visible');
      this.finMensaje = 0;
    }
  }

  /** @param {boolean} visible */
  mostrarDerrota(visible) {
    this.derrota.classList.toggle('oculto', !visible);
  }

  /** @param {() => void} fn */
  alReintentar(fn) {
    $('boton-reintentar').addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
  }
}
