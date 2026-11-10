// @ts-check
import * as THREE from 'three';

/**
 * Triggers del curso (requisito 4): radiales con Vector3.distanceTo y por caja AABB con Box3.containsPoint.
 * Se registran al cargar; en el bucle solo se consultan (sin crear objetos).
 *
 * @typedef {{nombre: string, caja: THREE.Box3, datos: Record<string, any>, dentro: boolean}} TriggerCaja
 * @typedef {{nombre: string, centro: THREE.Vector3, radio: number, datos: Record<string, any>, dentro: boolean}} TriggerRadio
 */
export class SistemaTriggers {
  constructor() {
    /** @type {TriggerCaja[]} */
    this.cajas = [];
    /** @type {TriggerRadio[]} */
    this.radios = [];
    /** Nombre de la zona actual (propiedad 'zona' del trg_box más pequeño que contiene al jugador). */
    this.zona = '';
    /** @type {(t: TriggerCaja | TriggerRadio, entra: boolean) => void} */
    this.alCambiar = () => {};
  }

  /**
   * @param {string} nombre
   * @param {THREE.Box3} caja
   * @param {Record<string, any>} [datos]
   */
  agregarCaja(nombre, caja, datos = {}) {
    this.cajas.push({ nombre, caja, datos, dentro: false });
  }

  /**
   * @param {string} nombre
   * @param {THREE.Vector3} centro
   * @param {number} radio
   * @param {Record<string, any>} [datos]
   */
  agregarRadio(nombre, centro, radio, datos = {}) {
    this.radios.push({ nombre, centro, radio, datos, dentro: false });
  }

  /** @param {THREE.Vector3} pos */
  actualizar(pos) {
    let zona = '';
    let volumenZona = Infinity;
    for (let i = 0; i < this.cajas.length; i++) {
      const t = this.cajas[i];
      const dentro = t.caja.containsPoint(pos);
      if (dentro !== t.dentro) {
        t.dentro = dentro;
        this.alCambiar(t, dentro);
      }
      if (dentro && t.datos.zona) {
        const s = t.caja.max;
        const r = t.caja.min;
        const vol = (s.x - r.x) * (s.y - r.y) * (s.z - r.z);
        if (vol < volumenZona) {
          volumenZona = vol;
          zona = String(t.datos.zona);
        }
      }
    }
    for (let i = 0; i < this.radios.length; i++) {
      const t = this.radios[i];
      const dentro = pos.distanceTo(t.centro) <= t.radio;
      if (dentro !== t.dentro) {
        t.dentro = dentro;
        this.alCambiar(t, dentro);
      }
    }
    this.zona = zona;
    return zona;
  }
}
