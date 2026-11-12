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
    /** Texto narrado fuera del guion (la leyenda del mural): se lee mientras nadie habla. @type {string | null} */
    this.narracion = null;
    /** Ritmo de la voz (0 a 1, suavizado) de quien habla: hace latir el núcleo con Mateo y las runas con la gema. */
    this.voz = { mateo: 0, gema: 0, victoria: 0 };
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

  /**
   * Subtítulo narrado (la leyenda del mural): se muestra entero mientras nadie habla; una línea de diálogo
   * pasa por delante y, al terminar, vuelve. null lo quita. @param {string | null} texto
   */
  narrar(texto) {
    if (texto === this.narracion) return;
    this.narracion = texto;
    if (this.cola.hablando || this.cola.cola.length || this.libre) return;
    if (texto) {
      this.subtitulos.mostrar(texto, 'leyenda');
      this.subtitulos.actualizar(1);
      this.ocultarEn = -1;
    } else {
      this.subtitulos.ocultar();
      this.subtitulos.texto = '';
    }
  }

  callar() {
    this.cola.callar();
    this.subtitulos.ocultar();
  }

  /**
   * Sílaba que suena ahora en la línea de 'quien' (vocal abierta = 1, consonante = 0,45, pausa = 0).
   * @param {'mateo' | 'gema' | 'victoria'} quien
   */
  _silabaDe(quien) {
    if (!this.cola.hablando) return 0;
    const l = LINEAS[this.cola.actual];
    if (l.quien !== quien) return 0;
    const u = this.cola.t / (l.duracion * 0.92);
    if (u >= 1) return 0;
    const ch = (l.texto[Math.floor(u * l.texto.length)] ?? '').toLowerCase();
    return 'aeiouáéíóú'.includes(ch) ? 1 : /[a-zñ]/.test(ch) ? 0.45 : 0;
  }

  /** @param {number} dt */
  actualizar(dt) {
    for (const q of /** @type {const} */ (['mateo', 'gema', 'victoria'])) {
      this.voz[q] += (this._silabaDe(q) - this.voz[q]) * Math.min(1, dt * 16);
    }
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
    } else if (!this.libre && !this.cola.cola.length && this.narracion) {
      // Nadie habla: vuelve la leyenda
      if (this.subtitulos.texto !== this.narracion) {
        this.subtitulos.mostrar(this.narracion, 'leyenda');
        this.subtitulos.actualizar(1);
      }
      this.ocultarEn = -1;
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
