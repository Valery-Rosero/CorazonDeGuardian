// @ts-check
import { rumboHacia } from './sentinel_logic.js';
import { MaquinaEstados } from './state_machine.js';

/**
 * Cerebro del espectro ancestral (sección 6.2): flota, guarda distancia, carga y dispara.
 * Lógica pura: devuelve una orden de velocidad y avisa en el fotograma del disparo.
 */
export class LogicaEspectro {
  /**
   * @param {typeof import('../config/enemies.js').ESPECTRO} cfg
   * @param {{x: number, z: number}} hogar  centro de su zona
   * @param {number} [fase]  desfase de la deriva (cada espectro distinto)
   */
  constructor(cfg, hogar, fase = 0) {
    this.cfg = cfg;
    this.hogar = { ...hogar };
    this.fase = fase;
    /** @type {number} */
    this.vida = cfg.vida;
    this.recarga = cfg.recarga * 0.5;
    this.disparo = false;
    /** Cuánto lleva cargado el orbe (0 a 1): el gestor lo usa para el brillo y el tamaño. */
    this.carga = 0;
    this.reloj = 0;
    /** Lado hacia el que rodea a Victoria (1 o -1). */
    this.lado = fase % 2 < 1 ? 1 : -1;
    this.orden = { x: 0, z: 0, velocidad: 0 };
    this.rumboDeseado = 0;
    /** @type {import('./sentinel_logic.js').Percepcion} */
    this.p = { yo: { ...hogar }, jugador: { x: 0, z: 0 }, visible: false, jugadorVivo: true };
    const c = cfg;
    this.fsm = new MaquinaEstados({
      flotar: {
        actualizar: () => {
          // Deriva lenta en un círculo de 1,5 m alrededor de su hogar
          const a = this.reloj * 0.35 + this.fase;
          this._ir({ x: this.hogar.x + Math.cos(a) * 1.5, z: this.hogar.z + Math.sin(a) * 1.5 }, 0.8);
          return this.p.jugadorVivo && this.distancia() <= c.deteccion ? 'mantener' : undefined;
        },
      },
      mantener: {
        actualizar: (_x, dt) => {
          if (!this.p.jugadorVivo || this.distancia() > c.deteccion * 1.6) return 'flotar';
          this.recarga -= dt;
          const d = this.distancia();
          const hacia = { x: (this.p.jugador.x - this.p.yo.x) / d, z: (this.p.jugador.z - this.p.yo.z) / d };
          if (d < c.distancia_min) this._dir(-hacia.x, -hacia.z, c.velocidad);
          else if (d > c.distancia_max) this._dir(hacia.x, hacia.z, c.velocidad);
          else this._dir(-hacia.z * this.lado, hacia.x * this.lado, c.velocidad * 0.45); // lo rodea despacio
          this.rumboDeseado = rumboHacia(this.p.yo, this.p.jugador);
          return this.recarga <= 0 && this.p.visible ? 'cargar' : undefined;
        },
      },
      cargar: {
        entrar: () => { this.orden.velocidad = 0; },
        actualizar: (_x, _dt, t) => {
          this.rumboDeseado = rumboHacia(this.p.yo, this.p.jugador);
          this.carga = Math.min(1, t / c.carga);
          if (t >= c.carga) {
            this.disparo = true;
            this.recarga = c.recarga;
            return 'mantener';
          }
          return undefined;
        },
        salir: () => { this.carga = 0; },
      },
      muerte: {
        entrar: () => { this.orden.velocidad = 0; this.carga = 0; },
      },
    }, 'flotar', this);
  }

  get estado() {
    return this.fsm.actual;
  }

  get muerto() {
    return this.fsm.es('muerte');
  }

  distancia() {
    return Math.hypot(this.p.jugador.x - this.p.yo.x, this.p.jugador.z - this.p.yo.z) || 1e-6;
  }

  /**
   * @param {number} dt
   * @param {import('./sentinel_logic.js').Percepcion} percepcion
   */
  actualizar(dt, percepcion) {
    this.p = percepcion;
    this.reloj += dt;
    this.disparo = false;
    this.fsm.actualizar(dt);
    return this.orden;
  }

  /** @param {number} cantidad  Devuelve true si murió. */
  danar(cantidad) {
    if (this.muerto) return false;
    this.vida = Math.max(0, this.vida - cantidad);
    if (this.vida <= 0) {
      this.fsm.cambiar('muerte');
      return true;
    }
    // Un golpe lo hace cambiar de lado y lo despierta si flotaba
    this.lado = -this.lado;
    if (this.fsm.es('flotar')) this.fsm.cambiar('mantener');
    return false;
  }

  /** @param {{x: number, z: number}} destino @param {number} velocidad */
  _ir(destino, velocidad) {
    const dx = destino.x - this.p.yo.x;
    const dz = destino.z - this.p.yo.z;
    const l = Math.hypot(dx, dz);
    if (l < 0.05) {
      this.orden.velocidad = 0;
      return;
    }
    this._dir(dx / l, dz / l, velocidad);
    this.rumboDeseado = Math.atan2(dx, dz);
  }

  /** @param {number} x @param {number} z @param {number} velocidad */
  _dir(x, z, velocidad) {
    this.orden.x = x;
    this.orden.z = z;
    this.orden.velocidad = velocidad;
  }
}
