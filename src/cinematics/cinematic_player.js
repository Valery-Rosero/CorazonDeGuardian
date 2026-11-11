// @ts-check
import * as THREE from 'three';
import { LineaTiempo } from './timeline.js';

const _p = new THREE.Vector3();
const _m = new THREE.Vector3();

/** Punto en un recorrido: lineal con 2 puntos, CatmullRom con más (sección 9.1). */
function punto(curvas, puntos, u, out) {
  if (puntos.length === 1) return out.set(puntos[0].x, puntos[0].y, puntos[0].z);
  if (puntos.length === 2) return out.set(puntos[0].x, puntos[0].y, puntos[0].z).lerp(_m.set(puntos[1].x, puntos[1].y, puntos[1].z), u);
  let c = curvas.get(puntos);
  if (!c) {
    c = new THREE.CatmullRomCurve3(puntos.map((q) => new THREE.Vector3(q.x, q.y, q.z)));
    curvas.set(puntos, c);
  }
  return c.getPoint(u, out);
}

/**
 * CinematicPlayer (sección 9.1): reproduce cinemáticas definidas como datos (src/cinematics/*.js).
 * Mientras dura, ignora el ratón, oculta el HUD y pone las franjas 2,35:1. Se salta manteniendo
 * Espacio 1 s; las que ya se vieron se saltan solas tras morir.
 */
export class ReproductorCine {
  /**
   * @param {THREE.PerspectiveCamera} camara
   * @param {import('../ui/endgame_ui.js').InterfazFinal} ui
   */
  constructor(camara, ui) {
    this.camara = camara;
    this.ui = ui;
    /** @type {LineaTiempo | null} */
    this.linea = null;
    /** @type {((s: import('./timeline.js').SucesoCine) => void) | null} */
    this.alSuceso = null;
    /** @type {(() => void) | null} */
    this.alTerminar = null;
    this.vistas = new Set();
    this.saltando = 0;
    this.fovBase = camara.fov;
    this.curvas = new Map();
    this.reloj = 0;
    /** Depuración (?auto&tcine=N): la próxima cinemática empieza N segundos adelantada. */
    this.adelanto = 0;
  }

  get activo() {
    return this.linea !== null;
  }

  /** Escala de tiempo del juego durante el plano actual (cámara lenta de la derrota). */
  get escalaTiempo() {
    return this.linea ? this.linea.actual.plano.escalaTiempo ?? 1 : 1;
  }

  /**
   * @param {import('./timeline.js').Cinematica} cine
   * @param {{alSuceso?: (s: import('./timeline.js').SucesoCine) => void, alTerminar?: () => void}} avisos
   */
  reproducir(cine, avisos = {}) {
    this.linea = new LineaTiempo(cine);
    this.alSuceso = avisos.alSuceso ?? null;
    this.alTerminar = avisos.alTerminar ?? null;
    this.saltando = 0;
    this.fovBase = this.camara.fov;
    this.ui.cine(true);
    // Tras morir, lo ya visto no se repite
    if (this.vistas.has(cine.nombre)) this.saltar();
    this.vistas.add(cine.nombre);
    if (this.adelanto > 0 && this.linea) {
      for (const s of this.linea.avanzar(this.adelanto)) this.alSuceso?.(s);
      this.adelanto = 0;
    }
  }

  saltar() {
    if (!this.linea) return;
    for (const s of this.linea.saltar()) this.alSuceso?.(s);
    this._terminar();
  }

  _terminar() {
    this.linea = null;
    this.camara.fov = this.fovBase;
    this.camara.updateProjectionMatrix();
    this.ui.cine(false);
    const fin = this.alTerminar;
    this.alTerminar = null;
    fin?.();
  }

  /**
   * @param {number} dt  tiempo real (las cinemáticas no se frenan con la cámara lenta)
   * @param {boolean} espacio  ¿está pulsado Espacio?
   */
  actualizar(dt, espacio) {
    if (!this.linea) return;
    this.reloj += dt;
    // Saltar: mantener Espacio 1 s
    this.saltando = espacio ? this.saltando + dt : 0;
    this.ui.saltar(true, Math.min(1, this.saltando));
    if (this.saltando >= 1) {
      this.saltar();
      return;
    }
    for (const s of this.linea.avanzar(dt)) this.alSuceso?.(s);
    if (!this.linea) return;
    if (this.linea.terminada) {
      this._terminar();
      return;
    }
    const { plano, u } = this.linea.actual;
    punto(this.curvas, plano.camara, u, _p);
    const sac = plano.sacudida ?? 0;
    if (sac > 0) _p.add(_m.set(Math.sin(this.reloj * 37) * sac, Math.sin(this.reloj * 29 + 1) * sac, Math.sin(this.reloj * 31 + 2) * sac));
    this.camara.position.copy(_p);
    punto(this.curvas, plano.mira, u, _m);
    this.camara.up.set(0, 1, 0);
    this.camara.lookAt(_m);
    if (plano.holandes) this.camara.rotateZ(THREE.MathUtils.degToRad(plano.holandes));
    const fov = plano.fov ?? this.fovBase;
    if (Math.abs(this.camara.fov - fov) > 0.01) {
      this.camara.fov = fov;
      this.camara.updateProjectionMatrix();
    }
  }
}
