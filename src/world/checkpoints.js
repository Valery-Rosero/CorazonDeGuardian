// @ts-check
import * as THREE from 'three';
import { clonarMaterial } from './shaders.js';
import { RegistroCheckpoints } from './checkpoint_logic.js';

/**
 * Pilares solares (sección 5.6): se encienden al pasar junto a ellos y marcan dónde reaparece Victoria.
 * El disco dorado de cada pilar tiene su propio material para brillar por separado.
 */
export class Checkpoints {
  /**
   * @param {Record<number, THREE.Object3D>} pilares
   * @param {Record<string, import('./level_loader.js').Spawn>} spawns
   * @param {typeof import('../config/level.js').CHECKPOINT} cfg
   */
  constructor(pilares, spawns, cfg) {
    this.cfg = cfg;
    this.spawns = spawns;
    this.registro = new RegistroCheckpoints(1);
    /**
     * Punto de reaparición del escenario actual (santuario, sus salas, la arena: no tienen pilares).
     * Una vez fijado manda sobre los pilares de la selva: la aventura no vuelve atrás.
     * @type {string | null}
     */
    this.punto = null;
    /** @type {Record<number, {material: THREE.MeshStandardMaterial, objetivo: number, centro: THREE.Vector3}>} */
    this.pilares = {};
    for (const [n, obj] of Object.entries(pilares)) {
      /** @type {THREE.MeshStandardMaterial | null} */
      let disco = null;
      obj.traverse((h) => {
        const m = /** @type {THREE.Mesh} */ (h);
        if (m.isMesh && /** @type {THREE.Material} */ (m.material).name.includes('disco')) {
          disco = clonarMaterial(/** @type {THREE.MeshStandardMaterial} */ (m.material));
          m.material = disco;
        }
      });
      if (!disco) continue;
      disco.emissiveIntensity = cfg.brillo_apagado;
      const centro = obj.getWorldPosition(new THREE.Vector3());
      centro.y += 2.75;
      this.pilares[Number(n)] = { material: disco, objetivo: cfg.brillo_apagado, centro };
    }
    this._encender(1, true);
  }

  /**
   * @param {number} n
   * @returns {THREE.Vector3 | null} posición del disco si se encendió por primera vez
   */
  pasar(n) {
    const nuevo = this.registro.pasar(n);
    if (nuevo) this._encender(n, false);
    return nuevo && this.pilares[n] ? this.pilares[n].centro : null;
  }

  /** @param {number} n @param {boolean} inmediato */
  _encender(n, inmediato) {
    const p = this.pilares[n];
    if (!p) return;
    p.objetivo = this.cfg.brillo_encendido;
    if (inmediato) p.material.emissiveIntensity = p.objetivo;
  }

  /** Al llegar a un escenario nuevo: aquí se reaparece desde ahora. @param {string} nombreSpawn */
  fijar(nombreSpawn) {
    if (this.spawns[nombreSpawn]) this.punto = nombreSpawn;
  }

  /** @returns {import('./level_loader.js').Spawn} */
  get reaparicion() {
    if (this.punto && this.spawns[this.punto]) return this.spawns[this.punto];
    return this.spawns[`checkpoint_${this.registro.actual}`] ?? this.spawns.jugador;
  }

  /** @param {number} dt @param {number} t */
  actualizar(dt, t) {
    const k = 1 - Math.exp(-dt * 3);
    for (const n in this.pilares) {
      const p = this.pilares[n];
      const pulso = p.objetivo > this.cfg.brillo_apagado ? Math.sin(t * 2 + Number(n)) * 0.35 : 0;
      p.material.emissiveIntensity += (p.objetivo + pulso - p.material.emissiveIntensity) * k;
    }
  }
}
