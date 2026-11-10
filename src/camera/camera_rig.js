// @ts-check
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const ARRIBA = new THREE.Vector3(0, 1, 0);
const CLAVES = /** @type {const} */ (['distancia', 'altura', 'lateral', 'fov', 'seguimiento']);

/**
 * Cámara en tercera persona (sección 9.1). PointerLockControls solo aporta la orientación;
 * aquí se calcula la posición: punto de giro (Victoria + hombro) menos la dirección por la distancia,
 * con seguimiento suave, colisión contra las paredes y mezcla entre perfiles.
 */
export class CamaraTerceraPersona {
  /**
   * @param {THREE.PerspectiveCamera} camara
   * @param {HTMLElement} dom
   * @param {Readonly<Record<string, import('../config/camera_profiles.js').PerfilCamara>>} perfiles
   * @param {Record<string, number>} limites
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
    /** @type {THREE.Object3D[]} */
    this.colisionables = [];

    this._rayo = new THREE.Raycaster();
    /** @type {THREE.Intersection[]} */
    this._impactos = [];
    this._dir = new THREE.Vector3();
    this._derecha = new THREE.Vector3();
    this._pivote = new THREE.Vector3();
    this._seguido = new THREE.Vector3();
    this._atras = new THREE.Vector3();
    this._primera = true;
  }

  /** @param {string} nombre */
  usarPerfil(nombre) {
    if (nombre in this.perfiles && nombre !== this.nombrePerfil) {
      this.nombrePerfil = nombre;
      this.objetivo = this.perfiles[nombre];
    }
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} pies  posición de los pies de Victoria
   */
  actualizar(dt, pies) {
    const p = this.actual;
    const km = 1 - Math.exp(-dt * this.limites.mezcla_perfil);
    for (let i = 0; i < CLAVES.length; i++) {
      const c = CLAVES[i];
      p[c] += (this.objetivo[c] - p[c]) * km;
    }

    // El punto seguido se suaviza; la orientación responde al instante al ratón
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
      distancia = Math.max(this.limites.distancia_minima, this._impactos[0].distance - this.limites.margen_colision);
    }
    this.camara.position.copy(this._pivote).addScaledVector(this._atras, distancia);

    if (Math.abs(this.camara.fov - p.fov) > 0.01) {
      this.camara.fov = p.fov;
      this.camara.updateProjectionMatrix();
    }
  }
}
