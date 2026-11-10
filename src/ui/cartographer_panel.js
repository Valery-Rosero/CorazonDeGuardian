// @ts-check
/**
 * "Cuaderno de la cartógrafa" (requisito 7): zona actual, coordenadas X/Y/Z y brújula.
 * Se actualiza como máximo 10 veces por segundo y solo si algo cambió.
 */
export class PanelCartografa {
  constructor() {
    this.zona = /** @type {HTMLElement} */ (document.getElementById('cartografa-zona'));
    this.coords = /** @type {HTMLElement} */ (document.getElementById('cartografa-coords'));
    this.aguja = /** @type {HTMLElement} */ (document.getElementById('cartografa-aguja'));
    this.acumulado = 0;
    this.ultimaZona = '';
    this.ux = NaN;
    this.uy = NaN;
    this.uz = NaN;
    this.uAngulo = NaN;
  }

  /**
   * @param {number} dt
   * @param {string} zona
   * @param {{x:number, y:number, z:number}} pos
   * @param {number} rumbo  ángulo de la cámara alrededor del eje vertical (radianes)
   */
  actualizar(dt, zona, pos, rumbo) {
    this.acumulado += dt;
    if (this.acumulado < 0.1) return;
    this.acumulado = 0;
    const texto = zona || 'Territorio sin cartografiar';
    if (texto !== this.ultimaZona) {
      this.zona.textContent = texto;
      this.ultimaZona = texto;
    }
    const x = Math.round(pos.x * 10) / 10;
    const y = Math.round(pos.y * 10) / 10;
    const z = Math.round(pos.z * 10) / 10;
    if (x !== this.ux || y !== this.uy || z !== this.uz) {
      this.coords.textContent = `X: ${x.toFixed(1)} | Y: ${y.toFixed(1)} | Z: ${z.toFixed(1)}`;
      this.ux = x;
      this.uy = y;
      this.uz = z;
    }
    const grados = Math.round((rumbo * 180) / Math.PI);
    if (grados !== this.uAngulo) {
      this.aguja.style.transform = `rotate(${grados}deg)`;
      this.uAngulo = grados;
    }
  }
}
