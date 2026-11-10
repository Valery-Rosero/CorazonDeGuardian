// @ts-check
import { duracionHabla, programarHabla } from './visemas.js';

const VISEMA_A_FORMA = Object.freeze({ A: 'vis_A', E: 'vis_E', I: 'vis_I', O: 'vis_O', U: 'vis_U', M: 'vis_MBP' });
const FORMAS_BOCA = Object.freeze(['boca_ancha', 'boca_sonrisa', 'boca_triste', 'vis_A', 'vis_E', 'vis_I', 'vis_O', 'vis_U', 'vis_MBP']);

/**
 * Cara viva: emoción que se mezcla suavemente, boca que sigue el subtítulo, parpadeo y mirada automáticos.
 * Escribe directamente en morphTargetInfluences de la malla de la cabeza.
 */
export class AnimadorCara {
  /**
   * @param {import('three').Mesh} cabeza
   * @param {Readonly<Record<string, Readonly<Record<string, number>>>>} expresiones
   * @param {typeof import('../config/player.js').CARA} cfg
   */
  constructor(cabeza, expresiones, cfg) {
    this.cfg = cfg;
    this.dic = cabeza.morphTargetDictionary;
    this.inf = cabeza.morphTargetInfluences;
    this.n = this.inf.length;
    this.objetivo = new Float32Array(this.n);
    this.esBoca = new Uint8Array(this.n);
    for (const f of FORMAS_BOCA) if (f in this.dic) this.esBoca[this.dic[f]] = 1;
    this.iParpadeo = this.dic.parpadeo ?? -1;
    this.iMiradaIzq = this.dic.mirada_izq ?? -1;
    this.iMiradaDer = this.dic.mirada_der ?? -1;

    /** Emociones precalculadas como pares (índice, peso). */
    /** @type {Record<string, {i:number, w:number}[]>} */
    this.emociones = {};
    for (const [nombre, formas] of Object.entries(expresiones)) {
      this.emociones[nombre] = Object.entries(formas).filter(([f]) => f in this.dic).map(([f, w]) => ({ i: this.dic[f], w }));
    }
    /** @type {Record<string, number>} */
    this.visemas = {};
    for (const [v, f] of Object.entries(VISEMA_A_FORMA)) this.visemas[v] = this.dic[f] ?? -1;

    this.emocion = 'neutral';
    /** @type {{inicio:number, fin:number, visema:string}[] | null} */
    this.programa = null;
    this.tHabla = 0;
    this.iLetra = 0;
    this.duracion = 0;
    this.proximoParpadeo = 1.5;
    this.finParpadeo = -1;
    this.proximaMirada = 1;
    this.mirada = 0;
    this.reloj = 0;
  }

  /** @param {string} nombre */
  ponerEmocion(nombre) {
    if (nombre in this.emociones) this.emocion = nombre;
  }

  /** Empieza a decir una línea (se llama una vez por línea). @param {string} texto */
  hablar(texto) {
    this.programa = programarHabla(texto, this.cfg);
    this.duracion = duracionHabla(this.programa);
    this.tHabla = 0;
    this.iLetra = 0;
  }

  get hablando() {
    return this.programa !== null;
  }

  /** Fracción del texto ya dicha (para resaltar el subtítulo). */
  get progreso() {
    return this.programa ? this.iLetra / this.programa.length : 1;
  }

  /** @param {number} dt */
  actualizar(dt) {
    const cfg = this.cfg;
    const obj = this.objetivo;
    this.reloj += dt;
    obj.fill(0);
    const emo = this.emociones[this.emocion];
    for (let k = 0; k < emo.length; k++) obj[emo[k].i] = emo[k].w;

    // Habla: la forma de la vocal manda sobre la boca de la emoción
    if (this.programa) {
      this.tHabla += dt;
      const p = this.programa;
      while (this.iLetra < p.length && this.tHabla >= p[this.iLetra].fin) this.iLetra++;
      if (this.tHabla >= this.duracion) {
        this.programa = null;
      } else if (this.iLetra < p.length) {
        const iv = this.visemas[p[this.iLetra].visema];
        for (let i = 0; i < this.n; i++) if (this.esBoca[i]) obj[i] *= 0.4;
        if (iv !== undefined && iv >= 0) obj[iv] = 1;
        else if (p[this.iLetra].visema === 'C' && this.visemas.E >= 0) obj[this.visemas.E] = 0.35;
      }
    }

    // Parpadeo
    if (this.reloj >= this.proximoParpadeo) {
      this.finParpadeo = this.reloj + cfg.parpadeo_duracion;
      this.proximoParpadeo = this.reloj + cfg.parpadeo_min + Math.random() * (cfg.parpadeo_max - cfg.parpadeo_min);
    }
    const parpadea = this.reloj < this.finParpadeo;
    if (parpadea && this.iParpadeo >= 0) obj[this.iParpadeo] = 1;

    // Mirada: pequeños movimientos de ojos
    if (this.reloj >= this.proximaMirada) {
      this.mirada = (Math.random() * 2 - 1) * 0.8;
      this.proximaMirada = this.reloj + cfg.mirada_min + Math.random() * (cfg.mirada_max - cfg.mirada_min);
    }
    if (this.iMiradaIzq >= 0 && this.mirada > 0) obj[this.iMiradaIzq] = this.mirada;
    if (this.iMiradaDer >= 0 && this.mirada < 0) obj[this.iMiradaDer] = -this.mirada;

    // Suavizado: boca rápida, párpados muy rápidos, el resto más lento
    const kBoca = 1 - Math.exp(-dt * cfg.suavizado_boca);
    const kCara = 1 - Math.exp(-dt * cfg.suavizado_cara);
    const kParpado = 1 - Math.exp(-dt * cfg.suavizado_parpado);
    const inf = this.inf;
    for (let i = 0; i < this.n; i++) {
      const k = i === this.iParpadeo || i === this.iMiradaIzq || i === this.iMiradaDer ? kParpado : this.esBoca[i] ? kBoca : kCara;
      inf[i] += (obj[i] - inf[i]) * k;
    }
  }
}
