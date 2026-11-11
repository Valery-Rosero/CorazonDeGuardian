// @ts-check
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Cámara libre con OrbitControls (requisito 2 del curso): modo foto y cámara de la demostración.
 * Orbita alrededor de un punto con amortiguación; arrastrar gira, la rueda acerca y el botón derecho desplaza.
 * Se crea una sola vez; activar y desactivar no crea nada.
 */
export class CamaraLibre {
  /**
   * @param {THREE.PerspectiveCamera} camara
   * @param {HTMLElement} dom
   */
  constructor(camara, dom) {
    this.camara = camara;
    this.controles = new OrbitControls(camara, dom);
    this.controles.enabled = false;
    this.controles.enableDamping = true;
    this.controles.dampingFactor = 0.08;
    this.controles.minDistance = 1.2;
    this.controles.maxDistance = 45;
    this.controles.maxPolarAngle = Math.PI * 0.92;
    this.activa = false;
    this.fovAntes = camara.fov;
  }

  /** @param {THREE.Vector3} objetivo */
  activar(objetivo) {
    this.activa = true;
    this.fovAntes = this.camara.fov;
    this.controles.target.copy(objetivo);
    this.controles.enabled = true;
    this.controles.update();
  }

  desactivar() {
    this.activa = false;
    this.controles.enabled = false;
    if (this.camara.fov !== this.fovAntes) {
      this.camara.fov = this.fovAntes;
      this.camara.updateProjectionMatrix();
    }
  }

  /** Cada fotograma mientras esté activa (también con el juego en pausa: modo foto). */
  actualizar() {
    if (this.activa) this.controles.update();
  }
}
