// @ts-check
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { anguloMasCorto } from '../player/movement_logic.js';
import { Sacudida } from './shake.js';

const ARRIBA = new THREE.Vector3(0, 1, 0);
const CLAVES = /** @type {const} */ (['distancia', 'altura', 'lateral', 'fov', 'seguimiento']);

/**
 * Cámara en tercera persona (sección 9.1). PointerLockControls solo aporta la orientación;
 * aquí se calcula la posición (punto de giro = Victoria + hombro, menos la dirección por la distancia)
 * con seguimiento suave, colisión con las paredes, perfiles por zona, puntos de interés,
 * recentrado automático y sacudida.
 */
export class CamaraTerceraPersona {
  /**
   * @param {THREE.PerspectiveCamera} camara
   * @param {HTMLElement} dom
   * @param {Record<string, import('../config/camera_profiles.js').PerfilCamara>} perfiles
   * @param {typeof import('../config/camera_profiles.js').CAMERA_LIMITES} limites
   */
  constructor(camara, dom, perfiles, limites) {
    this.camara = camara;
    this.perfiles = perfiles;
    this.limites = limites;
    this.controles = new PointerLockControls(camara, dom);
    this.controles.minPolarAngle = limites.polar_min;
    this.controles.maxPolarAngle = limites.polar_max;
    this.controles.pointerSpeed = limites.sensibilidad;

    this.nombrePerfil = 'exploracion';
    this.actual = { ...perfiles.exploracion };
    this.objetivo = perfiles.exploracion;
    /** Perfiles de las zonas de cámara en las que está Victoria (la última manda). @type {string[]} */
    this.zonas = [];
    /** @type {THREE.Object3D[]} */
    this.colisionables = [];
    this.sacudida = new Sacudida(limites.sacudida_maxima);

    this.reloj = 0;
    this.ultimoRaton = 0;
    this.controles.addEventListener('change', () => {
      this.ultimoRaton = this.reloj;
      this.hint = null;
    });
    /** @type {THREE.Vector3 | null} */
    this.hint = null;
    this.finHint = 0;

    this._rayo = new THREE.Raycaster();
    /** @type {THREE.Intersection[]} */
    this._impactos = [];
    this._dir = new THREE.Vector3();
    this._derecha = new THREE.Vector3();
    this._pivote = new THREE.Vector3();
    this._seguido = new THREE.Vector3();
    this._atras = new THREE.Vector3();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._primera = true;
  }

  /** Entra o sale de una zona de cámara (trg_box con 'perfil_camara'). @param {string} perfil @param {boolean} entra */
  zona(perfil, entra) {
    const i = this.zonas.lastIndexOf(perfil);
    if (entra) this.zonas.push(perfil);
    else if (i >= 0) this.zonas.splice(i, 1);
  }

  /** La cámara se inclina hacia un hito hasta que el jugador mueve el ratón. @param {THREE.Vector3} punto */
  mirarHacia(punto) {
    this.hint = punto;
    this.finHint = this.reloj + this.limites.hint_duracion;
  }

  /** Coloca la cámara detrás de Victoria al instante (tras un portal o al reaparecer). @param {number} rumbo */
  reorientar(rumbo) {
    this._euler.set(-0.18, rumbo + Math.PI, 0, 'YXZ');
    this.camara.quaternion.setFromEuler(this._euler);
    this._primera = true;
    this.hint = null;
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} pies  posición de los pies de Victoria
   * @param {{corriendo: boolean, velocidad: number, orientacion: number}} jugador
   */
  actualizar(dt, pies, jugador) {
    this.reloj += dt;
    const lim = this.limites;

    // Perfil: el de la zona más reciente; en exploración, correr cambia a 'carrera'
    let perfil = this.zonas.length ? this.zonas[this.zonas.length - 1] : 'exploracion';
    if (perfil === 'exploracion' && jugador.corriendo) perfil = 'carrera';
    if (perfil !== this.nombrePerfil && perfil in this.perfiles) {
      this.nombrePerfil = perfil;
      this.objetivo = this.perfiles[perfil];
    }
    const p = this.actual;
    const km = 1 - Math.exp(-dt * lim.mezcla_perfil);
    for (let i = 0; i < CLAVES.length; i++) {
      const c = CLAVES[i];
      p[c] += (this.objetivo[c] - p[c]) * km;
    }

    // Punto de interés o recentrado detrás de Victoria
    if (this.hint && this.reloj < this.finHint) {
      this._m.lookAt(this.camara.position, this.hint, ARRIBA);
      this._q.setFromRotationMatrix(this._m);
      this.camara.quaternion.slerp(this._q, 1 - Math.exp(-dt * lim.hint_rapidez));
    } else if (jugador.velocidad > 0.5 && this.reloj - this.ultimoRaton > lim.recentrar_espera) {
      this._euler.setFromQuaternion(this.camara.quaternion, 'YXZ');
      const deseado = jugador.orientacion + Math.PI;
      this._euler.y += anguloMasCorto(this._euler.y, deseado) * (1 - Math.exp(-dt * lim.recentrar_rapidez));
      this.camara.quaternion.setFromEuler(this._euler);
    }

    // Seguimiento suave del punto de giro
    if (this._primera) {
      this._seguido.copy(pies);
      this._primera = false;
    } else {
      this._seguido.lerp(pies, 1 - Math.exp(-dt * p.seguimiento));
    }
    this.camara.getWorldDirection(this._dir);
    this._derecha.crossVectors(this._dir, ARRIBA).normalize();
    this._pivote.copy(this._seguido);
    this._pivote.y += p.altura;
    this._pivote.addScaledVector(this._derecha, p.lateral);

    // Colisión: si una pared queda entre Victoria y la cámara, la cámara se acerca
    let distancia = p.distancia;
    this._atras.copy(this._dir).negate();
    this._rayo.set(this._pivote, this._atras);
    this._rayo.far = p.distancia;
    this._impactos.length = 0;
    this._rayo.intersectObjects(this.colisionables, false, this._impactos);
    if (this._impactos.length > 0) {
      distancia = Math.max(lim.distancia_minima, this._impactos[0].distance - lim.margen_colision);
    }
    this.camara.position.copy(this._pivote).addScaledVector(this._atras, distancia);
    this.camara.position.add(this.sacudida.actualizar(dt, this.reloj));

    if (Math.abs(this.camara.fov - p.fov) > 0.01) {
      this.camara.fov = p.fov;
      this.camara.updateProjectionMatrix();
    }
  }
}
