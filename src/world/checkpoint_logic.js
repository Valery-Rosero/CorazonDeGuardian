// @ts-check
/** Registro de checkpoints (sección 5.6). Lógica pura: qué pilares están encendidos y dónde se reaparece. */
export class RegistroCheckpoints {
  /** @param {number} inicial  checkpoint donde empieza la partida */
  constructor(inicial = 1) {
    this.inicial = inicial;
    this.actual = inicial;
    /** @type {Set<number>} */
    this.encendidos = new Set([inicial]);
  }

  /**
   * Pasar junto a un pilar lo enciende y lo vuelve el punto de reaparición.
   * @param {number} n
   * @returns {boolean} true si se encendió por primera vez
   */
  pasar(n) {
    const nuevo = !this.encendidos.has(n);
    this.encendidos.add(n);
    this.actual = n;
    return nuevo;
  }

  reiniciar() {
    this.actual = this.inicial;
    this.encendidos = new Set([this.inicial]);
  }
}
