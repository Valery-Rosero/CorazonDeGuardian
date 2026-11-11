// @ts-check

/**
 * Lógica pura de las cinemáticas (sección 9.1): una cinemática es una lista de planos y de sucesos
 * en el tiempo. Esta clase solo lleva la cuenta del tiempo; CinematicPlayer mueve la cámara.
 *
 * @typedef {{x: number, y: number, z: number}} V3
 * @typedef {{duracion: number, camara: V3[], mira: V3[], fov?: number, holandes?: number, sacudida?: number,
 *            escalaTiempo?: number}} Plano  camara/mira: puntos del recorrido (CatmullRom si hay más de 2)
 * @typedef {{t: number, accion: string, datos?: any}} SucesoCine
 * @typedef {{nombre: string, planos: Plano[], sucesos: SucesoCine[], mezclaFinal?: number}} Cinematica
 */

/** Suavizado de entrada y salida. @param {number} u */
export const suave = (u) => u * u * (3 - 2 * u);

export class LineaTiempo {
  /** @param {Cinematica} cine */
  constructor(cine) {
    this.cine = cine;
    this.t = 0;
    this.duracion = cine.planos.reduce((s, p) => s + p.duracion, 0);
    this.siguiente = 0;
    this.terminada = false;
    /** Sucesos ordenados por tiempo. */
    this.sucesos = [...cine.sucesos].sort((a, b) => a.t - b.t);
  }

  /** Plano actual y su avance (0 a 1, ya suavizado). */
  get actual() {
    let acum = 0;
    for (let i = 0; i < this.cine.planos.length; i++) {
      const p = this.cine.planos[i];
      if (this.t < acum + p.duracion || i === this.cine.planos.length - 1) {
        const u = Math.min(1, Math.max(0, (this.t - acum) / p.duracion));
        return { indice: i, plano: p, u: suave(u), crudo: u };
      }
      acum += p.duracion;
    }
    return { indice: 0, plano: this.cine.planos[0], u: 0, crudo: 0 };
  }

  /**
   * Avanza el tiempo (el reloj de la cinemática; la cámara lenta solo afecta al juego).
   * @param {number} dt @returns {SucesoCine[]} sucesos que ocurrieron en este paso
   */
  avanzar(dt) {
    if (this.terminada) return [];
    this.t += dt;
    const salen = [];
    while (this.siguiente < this.sucesos.length && this.sucesos[this.siguiente].t <= this.t) {
      salen.push(this.sucesos[this.siguiente++]);
    }
    if (this.t >= this.duracion) {
      this.terminada = true;
      // Los sucesos que quedaban (si se saltó la cinemática) se entregan todos
      while (this.siguiente < this.sucesos.length) salen.push(this.sucesos[this.siguiente++]);
    }
    return salen;
  }

  /** Saltar: termina ya y devuelve los sucesos pendientes, para que el juego quede en el mismo estado. */
  saltar() {
    this.t = this.duracion;
    return this.avanzar(0);
  }
}

/**
 * Cola de diálogo: reproduce líneas una tras otra con una pausa entre ellas.
 */
export class ColaDialogo {
  /**
   * @param {Record<string, {duracion: number}>} lineas
   * @param {number} pausa
   */
  constructor(lineas, pausa) {
    this.lineas = lineas;
    this.pausa = pausa;
    /** @type {string[]} */
    this.cola = [];
    this.actual = '';
    this.t = 0;
    this.espera = 0;
  }

  get hablando() {
    return this.actual !== '';
  }

  /** @param {string[]} codigos */
  decir(...codigos) {
    for (const c of codigos) {
      if (!(c in this.lineas)) throw new Error(`Línea desconocida: ${c}`);
      this.cola.push(c);
    }
  }

  /** Corta lo que se está diciendo y vacía la cola. */
  callar() {
    this.cola.length = 0;
    this.actual = '';
    this.espera = 0;
  }

  /**
   * @param {number} dt
   * @returns {{empieza: string | null, termina: string | null}}
   */
  actualizar(dt) {
    let empieza = null;
    let termina = null;
    if (this.actual) {
      this.t += dt;
      if (this.t >= this.lineas[this.actual].duracion) {
        termina = this.actual;
        this.actual = '';
        this.espera = this.pausa;
      }
    } else if (this.espera > 0) {
      this.espera -= dt;
    }
    if (!this.actual && this.espera <= 0 && this.cola.length) {
      this.actual = /** @type {string} */ (this.cola.shift());
      this.t = 0;
      empieza = this.actual;
    }
    return { empieza, termina };
  }
}
