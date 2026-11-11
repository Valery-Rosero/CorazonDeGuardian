// @ts-check
import * as THREE from 'three';
import { POSICIONAL, VOLUMEN } from '../config/audio.js';

const TAM_POOL = 8;

/**
 * Audio del juego (requisito 3):
 *  - PositionalAudio anclados a objetos (cascada, antorchas) y un pool de 8 para efectos en el mundo.
 *  - THREE.Audio global para ambiente, música y un pool de 8 para efectos de interfaz y eventos.
 * Todo se crea al cargar; durante el juego solo se reutiliza.
 */
export class GestorAudio {
  /**
   * @param {THREE.AudioListener} oyente
   * @param {Record<string, AudioBuffer>} buffers
   * @param {THREE.Scene} escena
   */
  constructor(oyente, buffers, escena) {
    this.oyente = oyente;
    this.buffers = buffers;
    this.volumen = { ...VOLUMEN };
    /** @type {{audio: THREE.Audio | THREE.PositionalAudio, base: number, categoria: string}[]} */
    this.bucles = [];
    this.globales = Array.from({ length: TAM_POOL }, () => new THREE.Audio(oyente));
    this.iGlobal = 0;
    this.anclas = Array.from({ length: TAM_POOL }, () => {
      const ancla = new THREE.Object3D();
      const audio = new THREE.PositionalAudio(oyente);
      audio.setDistanceModel('linear');
      audio.setRefDistance(POSICIONAL.efecto.referencia);
      audio.setMaxDistance(POSICIONAL.efecto.maximo);
      ancla.add(audio);
      escena.add(ancla);
      return { ancla, audio };
    });
    this.iPosicional = 0;
    this.iniciado = false;
  }

  /** @param {string} categoria */
  _vol(categoria) {
    return this.volumen.general * (this.volumen[categoria] ?? 1);
  }

  /**
   * Cambia el volumen de un bucle ya creado (p. ej. la selva se apaga dentro del santuario).
   * @param {THREE.Audio | THREE.PositionalAudio} audio @param {number} volumen
   */
  volumenBucle(audio, volumen) {
    const b = this.bucles.find((x) => x.audio === audio);
    if (!b) return;
    b.base = volumen;
    audio.setVolume(volumen * this._vol(b.categoria));
  }

  /**
   * Bucle global (ambiente o música).
   * @param {string} nombre @param {number} volumen @param {'ambiente'|'musica'} categoria
   */
  bucleGlobal(nombre, volumen, categoria = 'ambiente') {
    const a = new THREE.Audio(this.oyente);
    a.setBuffer(this.buffers[nombre]);
    a.setLoop(true);
    a.setVolume(volumen * this._vol(categoria));
    this.bucles.push({ audio: a, base: volumen, categoria });
    return a;
  }

  /**
   * Bucle 3D anclado a un objeto: suena más fuerte al acercarse.
   * @param {string} nombre
   * @param {THREE.Object3D} objeto
   * @param {{referencia:number, maximo:number, volumen:number}} cfg
   */
  buclePosicional(nombre, objeto, cfg) {
    const a = new THREE.PositionalAudio(this.oyente);
    a.setBuffer(this.buffers[nombre]);
    a.setLoop(true);
    a.setDistanceModel('linear');
    a.setRefDistance(cfg.referencia);
    a.setMaxDistance(cfg.maximo);
    a.setVolume(cfg.volumen * this._vol('ambiente'));
    objeto.add(a);
    this.bucles.push({ audio: a, base: cfg.volumen, categoria: 'ambiente' });
    return a;
  }

  /** Arranca los bucles: se llama tras el primer clic (desbloqueo del audio del navegador). */
  iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    for (const b of this.bucles) {
      // Arranque desfasado para que las antorchas no suenen idénticas
      b.audio.offset = Math.random() * (b.audio.buffer?.duration ?? 0);
      b.audio.play();
    }
  }

  /** Efecto global sin posición. @param {string} nombre @param {number} [volumen] */
  efecto(nombre, volumen = 1) {
    if (!this.iniciado || !this.buffers[nombre]) return;
    const a = this.globales[this.iGlobal];
    this.iGlobal = (this.iGlobal + 1) % TAM_POOL;
    if (a.isPlaying) a.stop();
    a.setBuffer(this.buffers[nombre]);
    a.setVolume(volumen * this._vol('efectos'));
    a.play();
  }

  /**
   * Efecto 3D en un punto del mundo.
   * @param {string} nombre @param {THREE.Vector3} pos @param {number} [volumen]
   */
  efectoEn(nombre, pos, volumen = 1) {
    if (!this.iniciado || !this.buffers[nombre]) return;
    const p = this.anclas[this.iPosicional];
    this.iPosicional = (this.iPosicional + 1) % TAM_POOL;
    if (p.audio.isPlaying) p.audio.stop();
    p.ancla.position.copy(pos);
    p.audio.setBuffer(this.buffers[nombre]);
    p.audio.setVolume(volumen * this._vol('efectos'));
    p.audio.play();
  }
}

/**
 * Carga todos los sonidos (se decodifican aunque el AudioContext aún esté suspendido).
 * @param {Record<string, string>} rutas
 * @param {THREE.LoadingManager} [gestor]
 * @returns {Promise<Record<string, AudioBuffer>>}
 */
export async function cargarSonidos(rutas, gestor) {
  const cargador = new THREE.AudioLoader(gestor);
  const entradas = Object.entries(rutas);
  const lista = await Promise.all(entradas.map(([, ruta]) => cargador.loadAsync(ruta)));
  /** @type {Record<string, AudioBuffer>} */
  const res = {};
  entradas.forEach(([n], i) => { res[n] = lista[i]; });
  return res;
}
