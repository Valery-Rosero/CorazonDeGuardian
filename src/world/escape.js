// @ts-check
import * as THREE from 'three';
import { ESCAPE } from '../config/boss.js';
import { TemporizadorEscape } from '../enemies/boss_logic.js';

const _p = new THREE.Vector3();

/**
 * El escape (sección 8.3 y tablero «Cámara del sol»): 75 s visibles, rocas que caen delante de
 * Victoria con su sombra de aviso, polvo naranja y el rumor del derrumbe. Si el tiempo se acaba,
 * avisa para la pantalla de derrota y se reintenta desde el inicio del escape.
 */
export class Escape {
  /**
   * @param {import('../enemies/boss_attacks.js').PoolRocas} rocas
   * @param {{reloj: (visible: boolean, texto: string, urgente: boolean) => void,
   *          rafaga: (p: THREE.Vector3, n: number, c: string, f?: number) => void,
   *          sacudida: (f: number) => void, sonido: (n: string, p?: THREE.Vector3, v?: number) => void,
   *          rumor: (volumen: number) => void}} avisos
   */
  constructor(rocas, avisos) {
    this.rocas = rocas;
    this.avisos = avisos;
    this.tiempo = new TemporizadorEscape(ESCAPE.tiempo);
    this.proxima = 0;
    this.polvo = 0;
    this.dir = new THREE.Vector3(0, 0, 1);
  }

  get activo() {
    return this.tiempo.activo;
  }

  iniciar() {
    this.tiempo.iniciar();
    this.proxima = 2.5;
    this.avisos.rumor(0.75);
  }

  /** Llega a la cornisa: se acabó el peligro. */
  detener() {
    this.tiempo.detener();
    this.avisos.reloj(false, '', false);
    this.avisos.rumor(0);
    this.rocas.limpiar();
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} jugador  pies de Victoria
   * @param {THREE.Vector3} velocidad  hacia dónde corre (para que las rocas caigan delante)
   * @returns {boolean} true en el fotograma en que se acaba el tiempo
   */
  actualizar(dt, jugador, velocidad) {
    if (!this.tiempo.activo) return false;
    const agotado = this.tiempo.actualizar(dt);
    this.avisos.reloj(true, this.tiempo.texto, this.tiempo.restante < 15);
    if (agotado) {
      this.avisos.rumor(0);
      return true;
    }
    if (velocidad.lengthSq() > 1) this.dir.copy(velocidad).setY(0).normalize();
    this.proxima -= dt;
    if (this.proxima <= 0) {
      this.proxima = ESCAPE.rocas_cada * (0.7 + Math.random() * 0.6);
      const lado = (Math.random() - 0.5) * 3;
      _p.copy(jugador).addScaledVector(this.dir, ESCAPE.adelanto + Math.random() * 3);
      _p.x += -this.dir.z * lado;
      _p.z += this.dir.x * lado;
      this.rocas.soltar(_p, 1.0, 15);
      this.avisos.sacudida(0.18);
    }
    // Polvo naranja que cae del techo
    this.polvo -= dt;
    if (this.polvo <= 0) {
      this.polvo = 0.12;
      _p.copy(jugador).add(new THREE.Vector3((Math.random() - 0.5) * 10, 3 + Math.random() * 2, (Math.random() - 0.5) * 10));
      this.avisos.rafaga(_p, 3, '#E0702A', 0.6);
    }
    return false;
  }
}
