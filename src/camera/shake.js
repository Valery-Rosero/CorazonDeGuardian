// @ts-check
import * as THREE from 'three';

/**
 * Sacudida de cámara por "trauma": cada golpe suma trauma, que baja con el tiempo;
 * el desplazamiento es trauma² para que los golpes pequeños apenas se noten.
 */
export class Sacudida {
  /** @param {number} maxima m */
  constructor(maxima) {
    this.maxima = maxima;
    this.trauma = 0;
    this.intensidad = 1; // Opciones: 0 desactiva la sacudida (accesibilidad)
    this.desplazamiento = new THREE.Vector3();
  }

  /** @param {number} cantidad 0..1 */
  agregar(cantidad) {
    this.trauma = Math.min(1, this.trauma + cantidad);
  }

  /** @param {number} dt @param {number} t */
  actualizar(dt, t) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const a = this.trauma * this.trauma * this.maxima * this.intensidad;
    this.desplazamiento.set(Math.sin(t * 37.1) * a, Math.sin(t * 41.3 + 1.7) * a * 0.7, Math.sin(t * 29.7 + 3.1) * a);
    return this.desplazamiento;
  }
}
