// @ts-check
/** Pantallas HTML sobre el canvas: carga, "Haz clic para comenzar", pausa y subtítulos. */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export const pantallas = {
  /** @param {number} fraccion @param {string} texto */
  progreso(fraccion, texto) {
    $('barra-progreso').style.width = `${Math.round(fraccion * 100)}%`;
    $('texto-carga').textContent = texto;
  },
  /** @param {string} mensaje */
  error(mensaje) {
    $('texto-carga').textContent = mensaje;
    $('pantalla-carga').classList.add('con-error');
  },
  mostrarInicio() {
    $('pantalla-carga').classList.add('oculto');
    $('pantalla-inicio').classList.remove('oculto');
  },
  ocultarInicio() {
    $('pantalla-inicio').classList.add('oculto');
  },
  /** @param {boolean} visible */
  pausa(visible) {
    $('pausa').classList.toggle('oculto', !visible);
    $('hud').classList.toggle('atenuado', visible);
  },
  /** @param {() => void} fn */
  alHacerClicInicio(fn) {
    $('pantalla-inicio').addEventListener('click', fn);
  },
  /** Opacidad del fundido a negro (0 = se ve el juego, 1 = negro). @param {number} opacidad */
  fundido(opacidad) {
    $('fundido').style.opacity = String(Math.max(0, Math.min(1, opacidad)));
  },
  /** @param {() => void} fn */
  alHacerClicPausa(fn) {
    $('pausa').addEventListener('click', fn);
  },
};

/** Subtítulos con dos estilos (Mateo/Victoria en blanco cálido, la Gema en dorado). */
export class Subtitulos {
  constructor() {
    this.caja = $('subtitulo');
    this.dicho = $('subtitulo-dicho');
    this.resto = $('subtitulo-resto');
    this.texto = '';
    this.mostrado = -1;
  }

  /** @param {string} texto @param {'calido'|'gema'} [estilo] */
  mostrar(texto, estilo = 'calido') {
    this.texto = texto;
    this.mostrado = -1;
    this.caja.dataset.estilo = estilo;
    this.caja.classList.remove('oculto');
  }

  ocultar() {
    this.caja.classList.add('oculto');
  }

  /** @param {number} progreso 0..1 */
  actualizar(progreso) {
    const n = Math.round(progreso * this.texto.length);
    if (n === this.mostrado) return;
    this.mostrado = n;
    this.dicho.textContent = this.texto.slice(0, n);
    this.resto.textContent = this.texto.slice(n);
  }
}
