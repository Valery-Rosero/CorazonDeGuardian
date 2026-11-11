// @ts-check
import { TECLAS_BLOQUEADAS } from '../config/input_map.js';

/**
 * Estado del teclado y del ratón. Los eventos solo marcan banderas; el bucle las lee.
 * 'mantiene' = la tecla está abajo; 'pulso' = se pulsó en este fotograma.
 */
export class Entrada {
  /** @param {Readonly<Record<string, readonly string[]>>} mapa */
  constructor(mapa) {
    this.mapa = mapa;
    /** @type {Set<string>} */
    this.abajo = new Set();
    /** @type {Set<string>} */
    this.pulsadas = new Set();
    this.clic = false;
    this.clicPulsado = false;

    window.addEventListener('keydown', (e) => {
      if (!this.abajo.has(e.code)) this.pulsadas.add(e.code);
      this.abajo.add(e.code);
      if (TECLAS_BLOQUEADAS.includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.abajo.delete(e.code));
    window.addEventListener('blur', () => this.abajo.clear());
    // Botones del ratón: el izquierdo dispara; el central y el derecho se leen como teclas
    // ('Mouse1' recentra la cámara, 'Mouse2' apunta) para poder ponerlos en el mapa de controles
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.clic = true;
        this.clicPulsado = true;
      } else {
        const codigo = `Mouse${e.button}`;
        if (!this.abajo.has(codigo)) this.pulsadas.add(codigo);
        this.abajo.add(codigo);
        if (e.button === 1) e.preventDefault();   // sin el desplazamiento automático del navegador
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.clic = false;
      else this.abajo.delete(`Mouse${e.button}`);
    });
    // Sin menú contextual: el clic derecho apunta
    window.addEventListener('contextmenu', (e) => {
      if (/** @type {HTMLElement} */ (e.target)?.tagName === 'CANVAS' || document.pointerLockElement) e.preventDefault();
    });
  }

  /** @param {string} accion */
  mantiene(accion) {
    const codigos = this.mapa[accion];
    for (let i = 0; i < codigos.length; i++) if (this.abajo.has(codigos[i])) return true;
    return false;
  }

  /** @param {string} accion */
  pulso(accion) {
    const codigos = this.mapa[accion];
    for (let i = 0; i < codigos.length; i++) if (this.pulsadas.has(codigos[i])) return true;
    return false;
  }

  /** Se llama al final de cada fotograma. */
  finFotograma() {
    this.pulsadas.clear();
    this.clicPulsado = false;
  }
}
