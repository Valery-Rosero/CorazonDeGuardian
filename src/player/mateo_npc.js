// @ts-check
import * as THREE from 'three';
import { CARA } from '../config/player.js';
import { AnimadorCara } from './face_animator.js';
import { AnimadorProcedural } from './procedural_animator.js';

/**
 * Mateo Solano en el mundo (tablero «Mateo Solano»): aparece de rodillas al romperse el caparazón,
 * corre detrás de Victoria en el escape (siguiendo sus pasos con un poco de retraso) y en el final
 * sale del portal de runas. Usa el mismo animador y la misma cara que Victoria.
 */
export class MateoNPC {
  /**
   * @param {THREE.Object3D} escenaGlb  escena de mateo.glb
   * @param {(raiz: THREE.Object3D) => void} prepararMateriales
   * @param {Record<string, number>} cfgAnimacion
   * @param {Record<string, number>} cfgJugador
   * @param {Record<string, Record<string, number>>} expresiones
   */
  constructor(escenaGlb, prepararMateriales, cfgAnimacion, cfgJugador, expresiones) {
    this.raiz = new THREE.Group();
    this.raiz.name = 'mateo';
    this.visual = new THREE.Group();
    this.raiz.add(this.visual);
    this.modelo = escenaGlb;
    this.visual.add(this.modelo);
    prepararMateriales(this.modelo);
    /** @type {THREE.Mesh | null} */
    let cabeza = null;
    this.modelo.traverse((o) => {
      const m = /** @type {THREE.Mesh} */ (o);
      if (!m.isMesh) return;
      m.frustumCulled = false;
      m.castShadow = !o.name.includes('cabeza');
      m.receiveShadow = true;
      if (m.morphTargetDictionary && 'parpadeo' in m.morphTargetDictionary) cabeza = m;
    });
    this.animador = new AnimadorProcedural(this.modelo, this.visual, { ...cfgAnimacion }, { ...cfgJugador, velocidad_correr: cfgJugador.velocidad_correr * 0.92 });
    this.cara = cabeza ? new AnimadorCara(cabeza, expresiones, { ...CARA }) : null;
    this.raiz.visible = false;
    /** Rastro de Victoria: Mateo pisa donde ella pisó hace un momento. @type {{p: THREE.Vector3, t: number}[]} */
    this.rastro = [];
    this.siguiendo = false;
    this.retraso = 0.9;
    this.est = { velocidad: 0, enSuelo: true, velVertical: 0, aterrizaje: 0, orientacion: 0 };
    this._previa = new THREE.Vector3();
    this.arrodillado = false;
    this.caminar = /** @type {{desde: THREE.Vector3, hasta: THREE.Vector3, t: number, d: number, frenar: boolean} | null} */ (null);
  }

  /** @param {THREE.Vector3} pos @param {number} rumbo */
  colocar(pos, rumbo) {
    this.raiz.position.copy(pos);
    this._previa.copy(pos);
    this.est.orientacion = rumbo;
    this.raiz.rotation.y = rumbo;
    this.rastro.length = 0;
  }

  /** De rodillas, liberado. */
  arrodillar() {
    this.arrodillado = true;
    this.siguiendo = false;
    this.animador.gesto('arrodillado');
  }

  /** Se levanta y empieza a seguir a Victoria. */
  seguir() {
    this.arrodillado = false;
    this.animador.gestoActual = null;
    this.siguiendo = true;
    this.rastro.length = 0;
  }

  /**
   * Camina (o corre, si es rápido) en línea recta hasta un punto (final).
   * @param {THREE.Vector3} hasta @param {number} segundos @param {boolean} [frenar]  llega frenando, sin parar en seco
   */
  caminarHasta(hasta, segundos, frenar = false) {
    this.siguiendo = false;
    this.caminar = { desde: this.raiz.position.clone(), hasta: hasta.clone(), t: 0, d: segundos, frenar };
  }

  /** @param {number} rumbo */
  mirar(rumbo) {
    this.est.orientacion = rumbo;
  }

  /**
   * @param {number} dt @param {number} t
   * @param {THREE.Vector3 | null} victoria  posición de Victoria (para el rastro)
   * @param {number} reloj
   */
  actualizar(dt, t, victoria, reloj) {
    if (!this.raiz.visible || dt <= 0) return;
    if (this.siguiendo && victoria) {
      this.rastro.push({ p: victoria.clone(), t: reloj });
      while (this.rastro.length > 2 && this.rastro[1].t < reloj - this.retraso) this.rastro.shift();
      const objetivo = this.rastro[0].p;
      // Si Victoria se teletransportó (transición de zona), Mateo aparece detrás de ella
      if (objetivo.distanceTo(this.raiz.position) > 20) this.raiz.position.copy(objetivo);
      else this.raiz.position.lerp(objetivo, Math.min(1, dt * 8));
    } else if (this.caminar) {
      const c = this.caminar;
      c.t += dt;
      const u = Math.min(1, c.t / c.d);
      this.raiz.position.lerpVectors(c.desde, c.hasta, c.frenar ? 1 - (1 - u) * (1 - u) : u);
      if (u >= 1) this.caminar = null;
    }
    const mov = this.raiz.position.clone().sub(this._previa);
    mov.y = 0;
    const v = mov.length() / dt;
    this.est.velocidad += (v - this.est.velocidad) * Math.min(1, dt * 10);
    if (v > 0.3) this.est.orientacion = Math.atan2(mov.x, mov.z);
    this._previa.copy(this.raiz.position);
    this.raiz.rotation.y += Math.atan2(Math.sin(this.est.orientacion - this.raiz.rotation.y), Math.cos(this.est.orientacion - this.raiz.rotation.y)) * Math.min(1, dt * 8);
    this.animador.actualizar(dt, t, this.est);
    // De rodillas el cuerpo baja hasta apoyar las rodillas en el suelo
    this.visual.position.y += this.arrodillado ? -0.52 : 0;
    this.cara?.actualizar(dt);
  }
}
