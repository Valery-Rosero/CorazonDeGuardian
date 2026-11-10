// @ts-check
/** Tiempo de recarga genérico (portal, poderes). Lógica pura. */
export class Enfriamiento {
  /** @param {number} duracion s */
  constructor(duracion) {
    this.duracion = duracion;
    this.restante = 0;
  }

  get listo() {
    return this.restante <= 0;
  }

  /** Fracción de recarga completada (0 = recién usado, 1 = listo). */
  get progreso() {
    return this.duracion > 0 ? 1 - Math.max(0, this.restante) / this.duracion : 1;
  }

  /** Intenta usarlo: devuelve true si estaba listo y empieza la recarga. */
  usar() {
    if (!this.listo) return false;
    this.restante = this.duracion;
    return true;
  }

  /** @param {number} dt */
  actualizar(dt) {
    if (this.restante > 0) this.restante -= dt;
  }

  reiniciar() {
    this.restante = 0;
  }
}
