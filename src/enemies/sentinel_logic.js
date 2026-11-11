// @ts-check
import { MaquinaEstados } from './state_machine.js';

/**
 * @typedef {{x: number, z: number}} Punto
 * @typedef {{yo: Punto, jugador: Punto, visible: boolean, jugadorVivo: boolean}} Percepcion
 * @typedef {{x: number, z: number, velocidad: number}} Orden
 */

/** Ángulo (radianes) de 'desde' hacia 'hacia' en el plano XZ, con el convenio de Three.js (atan2(x, z)). */
export function rumboHacia(desde, hacia) {
  return Math.atan2(hacia.x - desde.x, hacia.z - desde.z);
}

/** Diferencia angular en (-π, π]. @param {number} a @param {number} b */
export function difAngulo(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Cerebro del centinela de piedra (sección 6.1): decide su estado y hacia dónde moverse.
 * No mueve nada: devuelve una orden de velocidad y avisa cuando golpea. El gestor de enemigos
 * aplica la orden al cuerpo de cannon-es y comprueba si el golpe alcanza a Victoria.
 */
export class LogicaCentinela {
  /**
   * @param {typeof import('../config/enemies.js').CENTINELA} cfg
   * @param {Punto} puesto  donde vigila y adonde vuelve
   * @param {number} rumbo  hacia dónde mira de guardia
   * @param {{dormido?: boolean}} [opciones]  dormido: estatua hasta que algo la despierte
   */
  constructor(cfg, puesto, rumbo, opciones = {}) {
    this.cfg = cfg;
    this.puesto = { ...puesto };
    this.rumboPuesto = rumbo;
    /** @type {number} */
    this.vida = cfg.vida;
    /** Hacia dónde mira ahora (lo actualiza el gestor con la orientación real). */
    this.rumbo = rumbo;
    /** @type {Orden} */
    this.orden = { x: 0, z: 0, velocidad: 0 };
    /** Rumbo que quiere tener (el gestor lo interpola). */
    this.rumboDeseado = rumbo;
    /** true solo en el fotograma en que el puño toca el suelo. */
    this.golpe = false;
    this.perdido = 0;
    /** @type {Percepcion} */
    this.p = { yo: { ...puesto }, jugador: { x: 0, z: 0 }, visible: false, jugadorVivo: true };
    const c = cfg;
    this.fsm = new MaquinaEstados({
      dormido: {},
      guardia: {
        entrar: () => this._parar(this.rumboPuesto),
        actualizar: () => (this.loVe() ? 'alerta' : undefined),
      },
      alerta: {
        entrar: () => this._parar(this._haciaJugador()),
        actualizar: (_x, _dt, t) => {
          this.rumboDeseado = this._haciaJugador();
          return t >= c.espera_alerta ? 'persecucion' : undefined;
        },
      },
      persecucion: {
        entrar: () => { this.perdido = 0; },
        actualizar: (_x, dt) => {
          if (!this.p.jugadorVivo) return 'regreso';
          const d = this.distancia();
          if (this.p.visible && d <= c.vision * 1.5) this.perdido = 0;
          else this.perdido += dt;
          if (this.perdido >= c.olvido) return 'regreso';
          if (d <= c.alcance_ataque) return 'ataque';
          this._ir(this.p.jugador, c.velocidad);
          return undefined;
        },
      },
      ataque: {
        // Levanta los brazos (el aviso) y golpea al terminar
        entrar: () => this._parar(this._haciaJugador()),
        actualizar: (_x, _dt, t) => {
          if (t < c.aviso_ataque * 0.5) this.rumboDeseado = this._haciaJugador();
          if (t >= c.aviso_ataque) {
            this.golpe = true;
            return 'recuperacion';
          }
          return undefined;
        },
      },
      recuperacion: {
        entrar: () => this._parar(this.rumbo),
        actualizar: (_x, _dt, t) => (t >= c.recuperacion ? 'persecucion' : undefined),
      },
      aturdido: {
        entrar: () => this._parar(this.rumbo),
        actualizar: (_x, _dt, t) => (t >= c.aturdido ? 'persecucion' : undefined),
      },
      regreso: {
        actualizar: () => {
          if (this.loVe()) return 'alerta';
          const dx = this.puesto.x - this.p.yo.x;
          const dz = this.puesto.z - this.p.yo.z;
          if (dx * dx + dz * dz < 0.25) return 'guardia';
          this._ir(this.puesto, c.velocidad_regreso);
          return undefined;
        },
      },
      muerte: {
        entrar: () => this._parar(this.rumbo),
      },
    }, opciones.dormido ? 'dormido' : 'guardia', this);
  }

  get estado() {
    return this.fsm.actual;
  }

  get muerto() {
    return this.fsm.es('muerte');
  }

  /** Despierta a una estatua dormida: va directo a la alerta. */
  despertar() {
    if (this.fsm.es('dormido')) this.fsm.cambiar('alerta');
  }

  distancia() {
    return Math.hypot(this.p.jugador.x - this.p.yo.x, this.p.jugador.z - this.p.yo.z);
  }

  /** Lo ve dentro de 12 m, en su cono de 110° y sin nada en medio. */
  loVe() {
    if (!this.p.jugadorVivo || !this.p.visible) return false;
    if (this.distancia() > this.cfg.vision) return false;
    const medio = (this.cfg.angulo_vision * Math.PI) / 360;
    return Math.abs(difAngulo(this._haciaJugador(), this.rumbo)) <= medio;
  }

  /**
   * @param {number} dt
   * @param {Percepcion} percepcion
   */
  actualizar(dt, percepcion) {
    this.p = percepcion;
    this.golpe = false;
    this.fsm.actualizar(dt);
    return this.orden;
  }

  /**
   * Recibe daño: queda aturdido (si estaba dormido, despierta). Devuelve true si murió.
   * @param {number} cantidad
   */
  danar(cantidad) {
    if (this.muerto) return false;
    this.vida = Math.max(0, this.vida - cantidad);
    if (this.vida <= 0) {
      this.fsm.cambiar('muerte');
      return true;
    }
    this.fsm.cambiar('aturdido');
    return false;
  }

  _haciaJugador() {
    return rumboHacia(this.p.yo, this.p.jugador);
  }

  /** @param {number} rumbo */
  _parar(rumbo) {
    this.orden.x = 0;
    this.orden.z = 0;
    this.orden.velocidad = 0;
    this.rumboDeseado = rumbo;
  }

  /** @param {Punto} destino @param {number} velocidad */
  _ir(destino, velocidad) {
    const dx = destino.x - this.p.yo.x;
    const dz = destino.z - this.p.yo.z;
    const l = Math.hypot(dx, dz) || 1;
    this.orden.x = dx / l;
    this.orden.z = dz / l;
    this.orden.velocidad = velocidad;
    this.rumboDeseado = Math.atan2(dx, dz);
  }
}
