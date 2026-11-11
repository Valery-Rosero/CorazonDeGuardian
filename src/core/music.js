// @ts-check
import * as THREE from 'three';

/** Volumen de cada pieza en bucle (antes del volumen de música de Opciones). */
const NIVEL = Object.freeze({ selva: 0.55, santuario: 0.6, jefe: 0.75, escape: 0.8 });
/** Segundos de cada fundido. */
const FUNDIDO = 2.5;

/**
 * La música (sección 11): una pieza por momento de la historia, con el leitmotiv de Victoria y Mateo.
 * Los bucles suenan siempre y se mezclan con fundidos; el tema completo (introducción y amanecer)
 * suena una vez por encima de todo. Todo se crea al cargar.
 */
export class Musica {
  /**
   * @param {import('./audio_manager.js').GestorAudio} audio
   * @param {THREE.AudioListener} oyente
   */
  constructor(audio, oyente) {
    this.audio = audio;
    /** @type {Record<string, {a: THREE.Audio, v: number}>} */
    this.pistas = {};
    for (const nombre of /** @type {const} */ (['selva', 'santuario', 'jefe', 'escape'])) {
      if (!audio.buffers[`musica_${nombre}`]) continue;
      this.pistas[nombre] = { a: audio.bucleGlobal(`musica_${nombre}`, 0, 'musica'), v: 0 };
    }
    this.temaAudio = new THREE.Audio(oyente);
    if (audio.buffers.musica_tema) this.temaAudio.setBuffer(audio.buffers.musica_tema);
    /** @type {string | null} */
    this.actual = null;
    this.tocandoTema = 0;
  }

  /** La pieza que debe sonar ahora (null = silencio). @param {string | null} nombre */
  poner(nombre) {
    this.actual = nombre;
  }

  /** El tema completo, una vez (los bucles bajan mientras suena). */
  tema() {
    if (!this.audio.iniciado || !this.temaAudio.buffer) return;
    if (this.temaAudio.isPlaying) this.temaAudio.stop();
    this.temaAudio.setVolume(this.audio._vol('musica') * 0.9);
    this.temaAudio.play();
    this.tocandoTema = this.temaAudio.buffer.duration;
  }

  /** @param {number} dt  tiempo real */
  actualizar(dt) {
    this.tocandoTema = Math.max(0, this.tocandoTema - dt);
    const k = Math.min(1, dt / FUNDIDO);
    for (const [nombre, p] of Object.entries(this.pistas)) {
      const objetivo = this.tocandoTema > 0 ? 0 : nombre === this.actual ? NIVEL[/** @type {keyof typeof NIVEL} */ (nombre)] : 0;
      if (Math.abs(objetivo - p.v) < 1e-3) continue;
      p.v += (objetivo - p.v) * k * 3;
      if (Math.abs(objetivo - p.v) < 0.005) p.v = objetivo;
      this.audio.volumenBucle(p.a, p.v);
    }
  }
}
