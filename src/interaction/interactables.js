// @ts-check
import * as THREE from 'three';
import { clonarMaterial } from '../world/shaders.js';
import { elegirInteractuable } from '../player/abilities/abilities_logic.js';

/**
 * Objetos con los que se interactúa con E (sección 5.5): brazalete, páginas del diario y losas.
 * Cada uno lleva su propio material para brillar cuando es el objetivo.
 * No toca el DOM: el HUD lee 'objetivo' para mostrar el aviso.
 *
 * @typedef {{objeto: THREE.Object3D, tipo: string, datos: Record<string, any>, pos: THREE.Vector3, activo: boolean,
 *            materiales: THREE.MeshStandardMaterial[], base: THREE.Vector3}} Interactuable
 */
export class Interactuables {
  /**
   * @param {THREE.Object3D[]} objetos  objetos con userData.interactuable
   * @param {typeof import('../config/abilities.js').MANIPULACION} cfg
   */
  constructor(objetos, cfg) {
    this.cfg = cfg;
    /** @type {Interactuable[]} */
    this.lista = objetos.map((objeto) => {
      /** @type {THREE.MeshStandardMaterial[]} */
      const materiales = [];
      objeto.traverse((h) => {
        const m = /** @type {THREE.Mesh} */ (h);
        if (!m.isMesh) return;
        const mat = clonarMaterial(/** @type {THREE.MeshStandardMaterial} */ (m.material));
        if (!mat.emissive) return;
        m.material = mat;
        materiales.push(mat);
      });
      const pos = objeto.getWorldPosition(new THREE.Vector3());
      return { objeto, tipo: String(objeto.userData.interactuable), datos: objeto.userData, pos, activo: true, materiales, base: objeto.position.clone() };
    });
    /** @type {Interactuable | null} */
    this.objetivo = null;
    this.reloj = 0;
    this._vista = new THREE.Vector3();
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} pecho
   * @param {THREE.Camera} camara
   * @param {(i: Interactuable) => boolean} permitido  p. ej. las páginas requieren la Manipulación
   */
  actualizar(dt, pecho, camara, permitido) {
    this.reloj += dt;
    camara.getWorldDirection(this._vista);
    const i = elegirInteractuable(pecho, this._vista, this.lista, this.cfg.alcance, this.cfg.angulo);
    const elegido = i >= 0 && permitido(this.lista[i]) ? this.lista[i] : null;
    this.objetivo = elegido;
    for (let j = 0; j < this.lista.length; j++) {
      const o = this.lista[j];
      if (!o.activo) continue;
      const brillo = o === elegido ? 0.55 + Math.sin(this.reloj * 6) * 0.25 : 0;
      for (const m of o.materiales) {
        if (o.tipo === 'brazalete') continue; // ya es emisivo
        m.emissive.setRGB(1, 0.92, 0.75);
        m.emissiveIntensity = brillo;
      }
      if (o.datos.flotar) {
        o.objeto.position.y = o.base.y + Math.sin(this.reloj * 1.6) * 0.08;
        o.objeto.rotation.y += dt * 0.8;
      }
    }
  }

  /** @param {Interactuable} o */
  desactivar(o) {
    o.activo = false;
    for (const m of o.materiales) if (o.tipo !== 'brazalete') m.emissiveIntensity = 0;
    if (this.objetivo === o) this.objetivo = null;
  }

  reactivarTodo() {
    for (const o of this.lista) {
      o.activo = true;
      o.objeto.visible = true;
    }
  }
}
