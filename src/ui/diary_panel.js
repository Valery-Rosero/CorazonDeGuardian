// @ts-check
import { TOTAL_PAGINAS } from '../config/diary.js';

/**
 * Panel del diario de Mateo (sección 3.3): hoja de papel con la escritura cada vez más degradada.
 * Mientras está abierto, el juego se detiene (sin soltar el ratón).
 */
export class PanelDiario {
  constructor() {
    this.panel = /** @type {HTMLElement} */ (document.getElementById('diario'));
    this.texto = /** @type {HTMLElement} */ (document.getElementById('diario-texto'));
    this.numero = /** @type {HTMLElement} */ (document.getElementById('diario-numero'));
    this.abierto = false;
    /** @type {() => void} */
    this.alCerrar = () => {};
    this.panel.addEventListener('click', () => this.cerrar());
    window.addEventListener('keydown', (e) => {
      if (this.abierto && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        this.cerrar();
      }
    });
  }

  /** @param {{n:number, texto:string, estilo:string}} pagina */
  abrir(pagina) {
    this.numero.textContent = `Página ${pagina.n} de ${TOTAL_PAGINAS}`;
    this.texto.className = pagina.estilo;
    this.texto.textContent = '';
    if (pagina.estilo === 'tinta') {
      this.texto.textContent = pagina.texto;
    } else {
      // Cada letra tiembla con su propio retraso (la gema le ganó la mano a Mateo).
      // Se agrupan por palabras para que ninguna palabra se parta al final de la línea.
      pagina.texto.split(' ').forEach((palabra, i) => {
        if (i > 0) this.texto.appendChild(document.createTextNode(' '));
        const p = document.createElement('span');
        p.className = 'palabra';
        for (const letra of palabra) {
          const s = document.createElement('span');
          s.className = 'letra';
          s.textContent = letra;
          s.style.animationDelay = `${(Math.random() * 0.4).toFixed(2)}s`;
          p.appendChild(s);
        }
        this.texto.appendChild(p);
      });
    }
    this.panel.classList.remove('oculto');
    this.abierto = true;
  }

  cerrar() {
    if (!this.abierto) return;
    this.abierto = false;
    this.panel.classList.add('oculto');
    this.alCerrar();
  }
}
