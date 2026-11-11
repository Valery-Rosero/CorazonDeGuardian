// @ts-check
import * as THREE from 'three';

/** Curva suave de entrada y salida. @param {number} t */
const suave = (t) => t * t * (3 - 2 * t);

/**
 * Losas y mecanismos que se mueven con la Manipulación ancestral (sección 8.1).
 * Son cuerpos cinemáticos: el código los desplaza y la física los respeta.
 * La propiedad 'mover' viene de Blender (x, y, z) y se convierte a Three.js (x, z, -y).
 */
export class Losas {
  /** @param {import('../world/level_loader.js').Dinamico[]} dinamicos */
  constructor(dinamicos) {
    this.lista = dinamicos
      .filter((d) => d.datos.interactuable === 'losa')
      .map((d) => {
        const m = /** @type {number[]} */ (d.datos.mover ?? [0, 0, 0]);
        return {
          ...d,
          desde: d.inicio.p.clone(),
          hasta: d.inicio.p.clone().add(new THREE.Vector3(m[0], m[2], -m[1])),
          duracion: Number(d.datos.duracion ?? 1.5),
          t: -1,
        };
      });
    this._p = new THREE.Vector3();
  }

  /** @param {THREE.Object3D} objeto @returns {boolean} true si empezó a moverse */
  activar(objeto) {
    const l = this.lista.find((x) => x.malla === objeto);
    if (!l || l.t >= 0) return false;
    l.t = 0;
    return true;
  }

  /** @param {number} dt */
  actualizar(dt) {
    for (let i = 0; i < this.lista.length; i++) {
      const l = this.lista[i];
      if (l.t < 0 || l.t > l.duracion) continue;
      l.t = Math.min(l.duracion + 1e-3, l.t + dt);
      this._p.lerpVectors(l.desde, l.hasta, suave(Math.min(1, l.t / l.duracion)));
      l.cuerpo.position.set(this._p.x, this._p.y, this._p.z);
    }
  }

  /** ¿Alguna losa se está moviendo? (para el polvo y la sacudida) */
  get moviendose() {
    for (let i = 0; i < this.lista.length; i++) {
      const l = this.lista[i];
      if (l.t >= 0 && l.t <= l.duracion) return true;
    }
    return false;
  }
}
