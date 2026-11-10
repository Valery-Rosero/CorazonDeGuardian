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
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.clic = true;
        this.clicPulsado = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.clic = false;
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
