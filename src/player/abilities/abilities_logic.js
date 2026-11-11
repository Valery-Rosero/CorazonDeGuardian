// @ts-check
import { Enfriamiento } from '../../core/cooldown.js';

/**
 * Estado de los poderes del brazalete: desbloqueo progresivo, recargas y duración del escudo.
 * Lógica pura (se prueba con node --test).
 */
export class Poderes {
  /**
   * @param {{recarga:number}} pulso
   * @param {{recarga:number, duracion:number, bloqueo_perfecto:number}} escudo
   * @param {{recarga:number}} manipulacion
   * @param {{recarga:number, duracion:number, invulnerable:number}} esquiva
   */
  constructor(pulso, escudo, manipulacion, esquiva) {
    this.cfgEscudo = escudo;
    this.cfgEsquiva = esquiva;
    this.recargas = {
      pulso: new Enfriamiento(pulso.recarga),
      escudo: new Enfriamiento(escudo.recarga),
      manipulacion: new Enfriamiento(manipulacion.recarga),
      esquiva: new Enfriamiento(esquiva.recarga),
    };
    /** @type {Set<string>} */
    this.desbloqueados = new Set();
    this.escudoRestante = 0;
    this.escudoEdad = 0;
    this.esquivaRestante = 0;
    this.esquivaEdad = 0;
  }

  /** @param {string} poder */
  desbloquear(poder) {
    const nuevo = !this.desbloqueados.has(poder);
    this.desbloqueados.add(poder);
    return nuevo;
  }

  /** @param {string} poder */
  tiene(poder) {
    return this.desbloqueados.has(poder);
  }

  /**
   * Intenta usar un poder: falla si está bloqueado o recargando.
   * @param {'pulso'|'escudo'|'manipulacion'} poder
   */
  usar(poder) {
    if (!this.tiene(poder)) return false;
    if (poder === 'escudo' && this.escudoActivo) return false;
    if (!this.recargas[poder].usar()) return false;
    if (poder === 'escudo') {
      this.escudoRestante = this.cfgEscudo.duracion;
      this.escudoEdad = 0;
      // La recarga del escudo empieza cuando la burbuja se apaga
      this.recargas.escudo.restante = this.cfgEscudo.duracion + this.recargas.escudo.duracion;
    }
    return true;
  }

  /** La Manipulación sin objetivo no consume nada: se comprueba antes sin gastar la recarga. */
  get manipulacionLista() {
    return this.tiene('manipulacion') && this.recargas.manipulacion.listo;
  }

  /** La esquiva está disponible desde el principio (es movimiento, no un poder). */
  esquivar() {
    if (this.esquivaRestante > 0 || !this.recargas.esquiva.usar()) return false;
    this.esquivaRestante = this.cfgEsquiva.duracion;
    this.esquivaEdad = 0;
    return true;
  }

  get escudoActivo() {
    return this.escudoRestante > 0;
  }

  /** Bloqueo perfecto: el escudo se activó hace menos de 0,2 s. */
  get bloqueoPerfecto() {
    return this.escudoActivo && this.escudoEdad <= this.cfgEscudo.bloqueo_perfecto;
  }

  get esquivando() {
    return this.esquivaRestante > 0;
  }

  get esquivaInvulnerable() {
    return this.esquivando && this.esquivaEdad <= this.cfgEsquiva.invulnerable;
  }

  /** @param {number} dt */
  actualizar(dt) {
    for (const r of Object.values(this.recargas)) r.actualizar(dt);
    if (this.escudoRestante > 0) {
      this.escudoRestante -= dt;
      this.escudoEdad += dt;
    }
    if (this.esquivaRestante > 0) {
      this.esquivaRestante -= dt;
      this.esquivaEdad += dt;
    }
  }

  /**
   * Fracción de recarga para el HUD (1 = listo).
   * @param {'pulso'|'escudo'|'manipulacion'} poder
   */
  progreso(poder) {
    if (poder === 'escudo' && this.escudoActivo) return 0;
    if (poder === 'escudo') {
      const r = this.recargas.escudo;
      return 1 - Math.max(0, r.restante) / r.duracion;
    }
    return this.recargas[poder].progreso;
  }

  reiniciarRecargas() {
    for (const r of Object.values(this.recargas)) r.reiniciar();
    this.escudoRestante = 0;
    this.esquivaRestante = 0;
  }
}

/**
 * Elige el objeto interactuable: el más cercano dentro del alcance y del ángulo de visión.
 * @param {{x:number, y:number, z:number}} origen  posición de Victoria (pecho)
 * @param {{x:number, y:number, z:number}} vista  dirección de la cámara (normalizada)
 * @param {{pos:{x:number, y:number, z:number}, activo:boolean}[]} objetos
 * @param {number} alcance
 * @param {number} anguloGrados
 * @returns {number} índice del objeto elegido o -1
 */
export function elegirInteractuable(origen, vista, objetos, alcance, anguloGrados) {
  const cosMin = Math.cos((anguloGrados * Math.PI) / 180);
  let mejor = -1;
  let mejorD = Infinity;
  for (let i = 0; i < objetos.length; i++) {
    const o = objetos[i];
    if (!o.activo) continue;
    const dx = o.pos.x - origen.x;
    const dy = o.pos.y - origen.y;
    const dz = o.pos.z - origen.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > alcance) continue;
    // En horizontal: lo que importa es si está delante, no si está más arriba o abajo
    const h = Math.hypot(dx, dz);
    const vh = Math.hypot(vista.x, vista.z) || 1;
    const cos = h < 0.6 ? 1 : (dx * vista.x + dz * vista.z) / (h * vh);
    if (cos < cosMin) continue;
    if (d < mejorD) {
      mejorD = d;
      mejor = i;
    }
  }
  return mejor;
}
