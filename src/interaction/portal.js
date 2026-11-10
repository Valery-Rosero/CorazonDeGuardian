// @ts-check
import { Enfriamiento } from '../core/cooldown.js';

/**
 * Portal de runas de la cascada (sección 8.4): trigger Box3, sonido global, destello dorado,
 * teletransporte de Victoria y de su cuerpo físico, cámara reorientada y enfriamiento de 3 s.
 */
export class Portales {
  /**
   * @param {typeof import('../config/level.js').PORTAL} cfg
   * @param {(destino: string) => void} teletransportar
   */
  constructor(cfg, teletransportar) {
    this.cfg = cfg;
    this.teletransportar = teletransportar;
    this.enfriamiento = new Enfriamiento(cfg.enfriamiento);
    this.destello = /** @type {HTMLElement} */ (document.getElementById('destello'));
  }

  /**
   * Se llama al entrar en un trg_box con evento 'portal'.
   * @param {Record<string, any>} datos
   * @returns {boolean} true si se usó el portal
   */
  entrar(datos) {
    if (!this.enfriamiento.usar()) return false;
    this.destello.classList.remove('activo');
    void this.destello.offsetWidth; // reinicia la animación CSS
    this.destello.style.animationDuration = `${this.cfg.destello}s`;
    this.destello.classList.add('activo');
    this.teletransportar(String(datos.destino));
    return true;
  }

  /** @param {number} dt */
  actualizar(dt) {
    this.enfriamiento.actualizar(dt);
  }
}
