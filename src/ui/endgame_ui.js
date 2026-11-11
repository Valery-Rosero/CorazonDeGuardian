// @ts-check
/**
 * Interfaz del final del juego (secciones 7, 8.3, 9.1 y 10): barra del jefe, reloj del escape,
 * franjas de cine, indicador para saltar cinemáticas, rótulos, pantalla de victoria y menú principal.
 */

/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export class InterfazFinal {
  constructor() {
    this.ultimaFraccion = -1;
    this.ultimoReloj = '';
  }

  /** @param {boolean} visible @param {number} fraccion 0..1 */
  barraJefe(visible, fraccion) {
    $('jefe-barra').classList.toggle('oculto', !visible);
    if (fraccion !== this.ultimaFraccion) {
      $('jefe-relleno').style.width = `${Math.max(0, Math.min(1, fraccion)) * 100}%`;
      this.ultimaFraccion = fraccion;
    }
  }

  /** @param {boolean} visible @param {string} texto @param {boolean} urgente */
  reloj(visible, texto, urgente) {
    const r = $('escape-reloj');
    r.classList.toggle('oculto', !visible);
    r.classList.toggle('urgente', urgente);
    if (texto !== this.ultimoReloj) {
      r.textContent = texto;
      this.ultimoReloj = texto;
    }
  }

  /** Franjas panorámicas 2,35:1 y HUD oculto durante las cinemáticas. @param {boolean} activo */
  cine(activo) {
    $('cine-franjas').classList.toggle('activas', activo);
    document.body.classList.toggle('en-cine', activo);
    if (!activo) this.saltar(false, 0);
  }

  /** @param {boolean} visible @param {number} progreso 0..1 */
  saltar(visible, progreso) {
    const s = $('cine-saltar');
    s.classList.toggle('oculto', !visible);
    s.style.setProperty('--p', String(progreso));
  }

  /** Rótulo grande en dorado («GUARDIÁN DEL SOL»). @param {string} texto */
  rotulo(texto) {
    const r = $('rotulo');
    r.textContent = texto;
    r.classList.remove('oculto');
    // Reinicia la animación CSS
    r.style.animation = 'none';
    void r.offsetWidth;
    r.style.animation = '';
    setTimeout(() => r.classList.add('oculto'), 3300);
  }

  /** Título del juego al final de la introducción (aparece y se desvanece). @param {string} texto */
  titulo(texto) {
    const r = $('titulo-intro');
    r.textContent = texto;
    r.classList.remove('oculto');
    r.style.animation = 'none';
    void r.offsetWidth;
    r.style.animation = '';
    setTimeout(() => r.classList.add('oculto'), 4600);
  }

  /** @param {{tiempo: number, muertes: number, paginas: number, total: number}} e */
  victoria(e) {
    const m = Math.floor(e.tiempo / 60);
    const s = Math.floor(e.tiempo % 60);
    $('est-tiempo').textContent = `${m}:${String(s).padStart(2, '0')}`;
    $('est-muertes').textContent = String(e.muertes);
    $('est-paginas').textContent = `${e.paginas}/${e.total}`;
    $('victoria').classList.remove('oculto');
  }

  /** @param {() => void} fn */
  alVolverDeVictoria(fn) {
    $('boton-victoria-menu').addEventListener('click', fn);
  }

  /** Textos de la pantalla de derrota (caída normal o tiempo agotado en el escape). @param {string} titulo @param {string} texto */
  textosDerrota(titulo, texto) {
    $('derrota-titulo').textContent = titulo;
    $('derrota-texto').textContent = texto;
  }

  /**
   * Menú principal: Jugar, Opciones (volúmenes, ratón, sacudida, subtítulos y calidad; se guardan en
   * localStorage) y Demostración técnica.
   * @param {{jugar: () => void, opciones: (o: Opciones) => void}} acciones
   */
  menu(acciones) {
    const opciones = cargarOpciones();
    const deslizadores = /** @type {const} */ (['volumen', 'musica', 'efectos', 'voces', 'sensibilidad', 'sacudida']);
    for (const clave of deslizadores) {
      const input = /** @type {HTMLInputElement} */ ($(`opcion-${clave}`));
      input.value = String(opciones[clave]);
      input.addEventListener('input', () => {
        opciones[clave] = Number(input.value);
        guardarOpciones(opciones);
        acciones.opciones(opciones);
      });
    }
    const subt = /** @type {HTMLInputElement} */ ($('opcion-subtitulos'));
    subt.checked = opciones.subtitulos;
    subt.addEventListener('change', () => {
      opciones.subtitulos = subt.checked;
      guardarOpciones(opciones);
      acciones.opciones(opciones);
    });
    const rec = /** @type {HTMLInputElement} */ ($('opcion-recentrar'));
    rec.checked = opciones.recentrar;
    rec.addEventListener('change', () => {
      opciones.recentrar = rec.checked;
      guardarOpciones(opciones);
      acciones.opciones(opciones);
    });
    const cal = /** @type {HTMLSelectElement} */ ($('opcion-calidad'));
    cal.value = opciones.calidad;
    cal.addEventListener('change', () => {
      opciones.calidad = cal.value;
      guardarOpciones(opciones);
      $('opcion-calidad-nota').textContent = 'Se aplica al volver a cargar la página.';
    });
    acciones.opciones(opciones);
    $('boton-jugar').addEventListener('click', acciones.jugar);
    $('boton-opciones').addEventListener('click', () => {
      $('menu-principal').classList.add('oculto');
      $('opciones').classList.remove('oculto');
    });
    $('boton-opciones-volver').addEventListener('click', () => {
      $('opciones').classList.add('oculto');
      $('menu-principal').classList.remove('oculto');
    });
  }
}

const CLAVE = 'templo-del-sol-opciones';

/**
 * Opciones del jugador (sección 10). La calidad se aplica al recargar (el renderizador se crea al empezar).
 * @typedef {{volumen: number, musica: number, efectos: number, voces: number, sensibilidad: number, sacudida: number,
 *            subtitulos: boolean, recentrar: boolean, calidad: string}} Opciones
 */

/** @returns {Opciones} */
export function cargarOpciones() {
  /** @type {Opciones} */
  const base = { volumen: 1, musica: 0.7, efectos: 0.9, voces: 1, sensibilidad: 1, sacudida: 1, subtitulos: true, recentrar: false, calidad: 'auto' };
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
    return { ...base, ...g };
  } catch {
    return base;
  }
}

/** @param {Opciones} o */
function guardarOpciones(o) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(o));
  } catch {
    // Sin almacenamiento (modo privado): las opciones duran lo que dure la partida
  }
}
