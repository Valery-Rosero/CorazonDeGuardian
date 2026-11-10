// @ts-check
/** Vida de Victoria (sección 5.4). Lógica pura. */
export class Vida {
  /**
   * @param {number} maxima
   * @param {number} invulnerableTrasDano s
   */
  constructor(maxima, invulnerableTrasDano) {
    this.maxima = maxima;
    this.invulnerableTrasDano = invulnerableTrasDano;
    this.actual = maxima;
    this.invulnerable = 0;
    /** Invulnerabilidad permanente (tecla de depuración 6). */
    this.dios = false;
  }

  get muerta() {
    return this.actual <= 0;
  }

  get fraccion() {
    return this.actual / this.maxima;
  }

  /**
   * @param {number} cantidad
   * @returns {boolean} true si el daño se aplicó
   */
  danar(cantidad) {
    if (this.muerta || this.dios || this.invulnerable > 0 || cantidad <= 0) return false;
    this.actual = Math.max(0, this.actual - cantidad);
    this.invulnerable = this.invulnerableTrasDano;
    return true;
  }

  /** Daño que ignora la invulnerabilidad (caer al abismo). */
  matar() {
    if (this.dios) return false;
    this.actual = 0;
    return true;
  }

  /**
   * @param {number} cantidad
   * @returns {number} vida recuperada de verdad (0 si ya estaba llena)
   */
  curar(cantidad) {
    if (this.muerta) return 0;
    const antes = this.actual;
    this.actual = Math.min(this.maxima, this.actual + cantidad);
    return this.actual - antes;
  }

  /** @param {number} dt */
  actualizar(dt) {
    if (this.invulnerable > 0) this.invulnerable -= dt;
  }

  reiniciar() {
    this.actual = this.maxima;
    this.invulnerable = 0;
  }
}
