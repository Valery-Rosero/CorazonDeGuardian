// @ts-check
import { LLAVE, SOLES } from '../config/llave.js';
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
    this.aviso = $('aviso-interaccion');
    this.avisoTexto = $('aviso-texto');
    this.ultimoAviso = '';
    this.tutorial = $('tutorial');
    this.finTutorial = 0;
    this.diario = $('cartografa-diario');
    this.soles_ = $('cartografa-soles');
    this.ultimosSoles = '';
    /** @type {Record<string, {el: HTMLElement, p: number, estado: string}>} */
    this.poderes = {};
    for (const nombre of ['pulso', 'escudo', 'manipulacion']) {
      this.poderes[nombre] = { el: $(`poder-${nombre}`), p: 1, estado: 'bloqueado' };
    }
  }

  /**
   * Icono de un poder: bloqueado, recargando (anillo que se llena), listo (destello) o activo.
   * Solo toca el DOM cuando algo cambia de verdad.
   * @param {string} nombre @param {boolean} desbloqueado @param {number} progreso 0..1 @param {boolean} [activo]
   */
  poder(nombre, desbloqueado, progreso, activo = false) {
    const p = this.poderes[nombre];
    const estado = !desbloqueado ? 'bloqueado' : activo ? 'activo' : progreso < 1 ? 'recargando' : 'listo';
    const q = Math.round(progreso * 50) / 50;
    if (q !== p.p) {
      p.p = q;
      p.el.style.setProperty('--p', String(q));
    }
    if (estado !== p.estado) {
      p.el.classList.remove(p.estado);
      p.el.classList.add(estado);
      p.estado = estado;
    }
  }

  /** Aviso de interacción ("E — Leer la página"); vacío = oculto. @param {string} texto */
  avisoInteraccion(texto) {
    if (texto === this.ultimoAviso) return;
    this.ultimoAviso = texto;
    this.aviso.classList.toggle('oculto', !texto);
    this.avisoTexto.textContent = texto;
  }

  /** Mensaje contextual del tutorial. @param {string} texto @param {number} [duracion] */
  mensajeTutorial(texto, duracion = 6) {
    this.tutorial.textContent = texto;
    this.tutorial.classList.remove('oculto');
    this.finTutorial = this.reloj + duracion;
  }

  /** @param {number} encontradas @param {number} total */
  paginas(encontradas, total) {
    this.diario.textContent = `Diario: ${encontradas}/${total}`;
  }

  /**
   * Los tercios de la Llave del Sol en el cuaderno: vacío en su cofre, lleno en la mano y tenue en su
   * cerradura. Aparece cuando Victoria tiene el brazalete (o algún tercio).
   * @param {Set<string>} recogidos @param {Set<string>} colocados @param {boolean} [mostrar]
   */
  soles(recogidos, colocados, mostrar = false) {
    if (!this.soles_) return;
    const estado = SOLES.map((s) => (colocados.has(s) ? 'colocado' : recogidos.has(s) ? 'tiene' : '')).join(',');
    const visible = mostrar || recogidos.size > 0;
    if (estado + visible === this.ultimosSoles) return;
    this.ultimosSoles = estado + visible;
    this.soles_.classList.toggle('oculto', !visible);
    this.soles_.replaceChildren(document.createTextNode('Llave del Sol'), ...SOLES.map((s) => {
      const el = document.createElement('span');
      el.className = `sol-llave ${colocados.has(s) ? 'colocado' : recogidos.has(s) ? 'tiene' : ''}`;
      el.style.setProperty('--color', LLAVE.color[s]);
      el.title = LLAVE.nombre[s];
      return el;
    }));
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
    if (this.finTutorial && this.reloj > this.finTutorial) {
      this.tutorial.classList.add('oculto');
      this.finTutorial = 0;
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

  /** Botones del menú de pausa. @param {{continuar: () => void, checkpoint: () => void, foto: () => void, inicio: () => void}} fn */
  menuPausa(fn) {
    for (const [id, accion] of [['boton-continuar', fn.continuar], ['boton-checkpoint', fn.checkpoint], ['boton-foto', fn.foto], ['boton-inicio', fn.inicio]]) {
      $(/** @type {string} */ (id)).addEventListener('click', (e) => {
        e.stopPropagation();
        /** @type {() => void} */ (accion)();
      });
    }
  }
}
