// @ts-check
import { CARA_POR_EMOCION, LINEAS, PAUSA_ENTRE_LINEAS } from '../config/dialogues.js';
import { ColaDialogo } from '../cinematics/timeline.js';

/**
 * Sistema de diálogos (guion con códigos, docs/GUION_DIALOGOS.md): cada línea muestra su subtítulo
 * (Mateo y Victoria en blanco cálido, la Gema en dorado), suena su voz (voz/<código>, murmullo
 * sintetizado o grabación si existe) y mueve la boca de quien habla.
 */
export class Dialogos {
  /**
   * @param {import('./screens.js').Subtitulos} subtitulos
   * @param {{efecto: (n: string, v?: number) => void}} audio
   * @param {import('../player/face_animator.js').AnimadorCara} caraVictoria
   */
  constructor(subtitulos, audio, caraVictoria) {
    this.subtitulos = subtitulos;
    this.audio = audio;
    this.caras = { victoria: caraVictoria, mateo: /** @type {import('../player/face_animator.js').AnimadorCara | null} */ (null) };
    this.cola = new ColaDialogo(LINEAS, PAUSA_ENTRE_LINEAS);
    this.ocultarEn = -1;
    /** Línea libre de Victoria (depuración): la boca lleva el ritmo. */
    this.libre = false;
  }

  /** Cara de Mateo cuando ya está libre (escena de la derrota y final). @param {import('../player/face_animator.js').AnimadorCara | null} c */
  ponerCaraMateo(c) {
    this.caras.mateo = c;
  }

  get hablando() {
    return this.cola.hablando || this.cola.cola.length > 0;
  }

  /** @param {...string} codigos */
  decir(...codigos) {
    this.libre = false;
    this.cola.decir(...codigos);
  }

  /** Victoria dice algo que no está en el guion (atajos de depuración). @param {string} texto @param {string} emocion */
  decirLibre(texto, emocion) {
    this.cola.callar();
    this.libre = true;
    this.caras.victoria.ponerEmocion(emocion);
    this.caras.victoria.hablar(texto);
    this.subtitulos.mostrar(texto, 'calido');
    this.ocultarEn = -1;
  }

  callar() {
    this.cola.callar();
    this.subtitulos.ocultar();
  }

  /** @param {number} dt */
  actualizar(dt) {
    if (this.libre) {
      const c = this.caras.victoria;
      if (c.hablando) {
        this.subtitulos.actualizar(c.progreso);
      } else {
        this.libre = false;
        this.subtitulos.actualizar(1);
        this.ocultarEn = 1.2;
      }
    }
    const { empieza } = this.cola.actualizar(dt);
    if (empieza) {
      const l = LINEAS[empieza];
      this.subtitulos.mostrar(l.texto, l.quien === 'gema' ? 'gema' : 'calido');
      this.audio.efecto(`voz/${empieza}`, l.quien === 'gema' ? 0.85 : 1);
      const cara = l.quien === 'victoria' ? this.caras.victoria : l.quien === 'mateo' && !l.dentro ? this.caras.mateo : null;
      if (cara) {
        cara.ponerEmocion(CARA_POR_EMOCION[l.emocion] ?? 'neutral');
        cara.hablar(l.texto);
      }
      this.ocultarEn = -1;
    }
    if (this.cola.hablando) {
      const l = LINEAS[this.cola.actual];
      this.subtitulos.actualizar(Math.min(1, this.cola.t / (l.duracion * 0.92)));
    } else if (!this.libre && this.ocultarEn < 0 && !this.cola.cola.length && this.subtitulos.texto) {
      this.subtitulos.actualizar(1);
      this.ocultarEn = 1.2;
    }
    if (this.ocultarEn > 0) {
      this.ocultarEn -= dt;
      if (this.ocultarEn <= 0) {
        this.subtitulos.ocultar();
        this.subtitulos.texto = '';
      }
    }
  }
}
