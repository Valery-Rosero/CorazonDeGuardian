// @ts-check
import * as THREE from 'three';

/**
 * Oclusión (sección 9.1): lo que se interpone entre la cámara y Victoria se vuelve semitransparente
 * con un fundido suave, en lugar de que la cámara salte.
 */
export class Oclusion {
  /**
   * @param {THREE.Mesh[]} mallas  cada una con su propio material transparente
   * @param {number} opacidadMinima
   */
  constructor(mallas, opacidadMinima) {
    this.mallas = mallas;
    this.minima = opacidadMinima;
    this.objetivo = new Float32Array(mallas.length).fill(1);
    this.rayo = new THREE.Raycaster();
    /** @type {THREE.Intersection[]} */
    this.impactos = [];
    this.dir = new THREE.Vector3();
    /** @type {Map<THREE.Object3D, number>} */
    this.indice = new Map(mallas.map((m, i) => [m, i]));
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} camara
   * @param {THREE.Vector3} pecho  punto de Victoria que debe verse
   */
  actualizar(dt, camara, pecho) {
    this.objetivo.fill(1);
    this.dir.subVectors(pecho, camara);
    const dist = this.dir.length();
    this.dir.divideScalar(dist);
    this.rayo.set(camara, this.dir);
    this.rayo.far = dist - 0.3;
    this.impactos.length = 0;
    this.rayo.intersectObjects(this.mallas, false, this.impactos);
    for (let i = 0; i < this.impactos.length; i++) {
      const j = this.indice.get(this.impactos[i].object);
      if (j !== undefined) this.objetivo[j] = this.minima;
    }
    const k = 1 - Math.exp(-dt * 8);
    for (let i = 0; i < this.mallas.length; i++) {
      const mat = /** @type {THREE.MeshStandardMaterial} */ (this.mallas[i].material);
      mat.opacity += (this.objetivo[i] - mat.opacity) * k;
      mat.depthWrite = mat.opacity > 0.95;
    }
  }
}
