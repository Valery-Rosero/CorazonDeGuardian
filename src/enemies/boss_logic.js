// @ts-check

/**
 * @typedef {'sismico'|'barrido'|'rayo'|'rocas'|'invocacion'} TipoAtaque
 * @typedef {{tipo: 'aviso'|'golpe'|'fin_ataque', ataque: TipoAtaque}
 *   | {tipo: 'fase', fase: number} | {tipo: 'nucleo_abierto'} | {tipo: 'nucleo_cerrado'} | {tipo: 'pilares_listos'}
 *   | {tipo: 'pilar', indice: number} | {tipo: 'derrota'}} Suceso
 */

/**
 * Cerebro del Guardián del Sol (sección 7): fases, ciclo de los tres pilares, núcleo expuesto y la
 * elección y el ritmo de los ataques, cada uno con su aviso. Lógica pura: no sabe de Three.js; cada
 * fotograma devuelve la lista de sucesos para que el juego dibuje, suene y aplique el daño.
 */
export class LogicaGuardian {
  /**
   * @param {typeof import('../config/boss.js').GUARDIAN} cfg
   * @param {typeof import('../config/boss.js').ATAQUES} ataques
   * @param {() => number} [azar]
   */
  constructor(cfg, ataques, azar = Math.random) {
    this.cfg = cfg;
    this.ataques = ataques;
    this.azar = azar;
    /** @type {number} */
    this.vida = cfg.vida;
    /** 0 = dormido en el trono; 1, 2, 3 = fases; 4 = derrotado. */
    this.fase = 0;
    this.pilares = [0, 1, 2].map(() => ({ encendido: false }));
    this.nucleo = 0;           // s que le quedan al núcleo abierto
    this.recarga = 0;          // s hasta que los pilares se pueden volver a encender
    this.pausa = 2.0;          // s hasta el próximo ataque
    /** @type {{tipo: TipoAtaque, t: number, golpeo: boolean} | null} */
    this.ataque = null;
    this.invoco = false;
    /** @type {Suceso[]} */
    this.sucesos = [];
  }

  get derrotado() {
    return this.fase === 4;
  }

  get nucleoAbierto() {
    return this.nucleo > 0;
  }

  /** Velocidad de la fase (la furia acelera avisos y pausas). */
  get ritmo() {
    return this.fase === 3 ? this.cfg.furia : 1;
  }

  /** Aviso del ataque en curso escalado por la furia. @param {TipoAtaque} tipo */
  aviso(tipo) {
    return this.ataques[tipo].aviso / this.ritmo;
  }

  /** Termina la cinemática del despertar: empieza la fase 1. */
  despertar() {
    if (this.fase === 0) {
      this.fase = 1;
      this.sucesos.push({ tipo: 'fase', fase: 1 });
    }
  }

  /** ¿Se puede encender este pilar ahora? @param {number} i */
  pilarDisponible(i) {
    return this.fase >= 1 && this.fase <= 3 && !this.nucleoAbierto && this.recarga <= 0 && !this.pilares[i].encendido;
  }

  /** Victoria enciende un pilar con E. Devuelve true si se encendió. @param {number} i */
  encenderPilar(i) {
    if (!this.pilarDisponible(i)) return false;
    this.pilares[i].encendido = true;
    this.sucesos.push({ tipo: 'pilar', indice: i });
    if (this.pilares.every((p) => p.encendido)) this._abrirNucleo();
    return true;
  }

  _abrirNucleo() {
    // El primer núcleo expuesto empieza la fase 2
    if (this.fase === 1) {
      this.fase = 2;
      this.sucesos.push({ tipo: 'fase', fase: 2 });
    }
    this.nucleo = this.cfg.nucleo_abierto[this.fase === 3 ? 3 : 2];
    // Con las placas abiertas no ataca: se tambalea
    this.ataque = null;
    this.sucesos.push({ tipo: 'nucleo_abierto' });
  }

  /** Daño de un Pulso solar: solo cuenta con el núcleo expuesto. Devuelve true si le hizo daño. @param {number} n */
  danar(n) {
    if (!this.nucleoAbierto || this.fase < 2 || this.fase > 3) return false;
    this.vida = Math.max(0, this.vida - n);
    if (this.vida <= 0) {
      this.fase = 4;
      this.nucleo = 0;
      this.ataque = null;
      this.sucesos.push({ tipo: 'derrota' });
      return true;
    }
    if (this.fase === 2 && this.vida <= this.cfg.vida * this.cfg.umbral_fase3) {
      this.fase = 3;
      this.sucesos.push({ tipo: 'fase', fase: 3 });
    }
    return true;
  }

  /**
   * @param {number} dt
   * @param {{distancia: number}} percepcion  distancia de Victoria al Guardián
   * @returns {Suceso[]}
   */
  actualizar(dt, percepcion) {
    const sucesos = this.sucesos;
    this.sucesos = [];
    if (this.fase < 1 || this.fase > 3) return sucesos;
    // Núcleo abierto → cerrado → recarga de los pilares
    if (this.nucleo > 0) {
      this.nucleo -= dt;
      if (this.nucleo <= 0) {
        this.nucleo = 0;
        this.recarga = this.cfg.recarga_pilares[this.fase === 3 ? 3 : 2];
        for (const p of this.pilares) p.encendido = false;
        this.pausa = 1.2;
        sucesos.push({ tipo: 'nucleo_cerrado' });
      }
      return sucesos;
    }
    if (this.recarga > 0) {
      this.recarga -= dt;
      if (this.recarga <= 0) {
        this.recarga = 0;
        sucesos.push({ tipo: 'pilares_listos' });
      }
    }
    // Ataques: aviso → golpe → un poco de recuperación → pausa → el siguiente
    if (this.ataque) {
      const a = this.ataque;
      a.t += dt;
      const aviso = this.aviso(a.tipo);
      if (!a.golpeo && a.t >= aviso) {
        a.golpeo = true;
        sucesos.push({ tipo: 'golpe', ataque: a.tipo });
      }
      const duracion = aviso + (a.tipo === 'rayo' ? this.ataques.rayo.disparo : 0.6);
      if (a.t >= duracion) {
        sucesos.push({ tipo: 'fin_ataque', ataque: a.tipo });
        this.ataque = null;
        this.pausa = this.cfg.pausa_ataques[this.fase] / this.ritmo;
      }
      return sucesos;
    }
    this.pausa -= dt;
    if (this.pausa <= 0) {
      const tipo = this.elegirAtaque(percepcion.distancia);
      this.ataque = { tipo, t: 0, golpeo: false };
      if (tipo === 'invocacion') this.invoco = true;
      sucesos.push({ tipo: 'aviso', ataque: tipo });
    }
    return sucesos;
  }

  /**
   * Elige el ataque según la fase y la distancia: el barrido solo de cerca, el rayo y la lluvia de
   * rocas sobre todo de lejos, y la invocación una sola vez en la fase 3.
   * @param {number} distancia
   * @returns {TipoAtaque}
   */
  elegirAtaque(distancia) {
    if (this.fase === 3 && !this.invoco) return 'invocacion';
    /** @type {[TipoAtaque, number][]} */
    const pesos = [];
    for (const [tipo, a] of /** @type {[TipoAtaque, any][]} */ (Object.entries(this.ataques))) {
      if (tipo === 'invocacion' || !a.fases.includes(this.fase)) continue;
      let w = 1;
      if (tipo === 'barrido') w = distancia <= this.ataques.barrido.cerca ? 2.2 : 0;
      if (tipo === 'rayo' || tipo === 'rocas') w = distancia > 7 ? 1.6 : 0.6;
      if (w > 0) pesos.push([tipo, w]);
    }
    const total = pesos.reduce((s, [, w]) => s + w, 0);
    let r = this.azar() * total;
    for (const [tipo, w] of pesos) {
      r -= w;
      if (r <= 0) return tipo;
    }
    return pesos[pesos.length - 1][0];
  }
}

/**
 * Temporizador del escape (sección 8.3): 75 s visibles. Al agotarse avisa una sola vez.
 */
export class TemporizadorEscape {
  /** @param {number} segundos */
  constructor(segundos) {
    this.total = segundos;
    this.restante = segundos;
    this.activo = false;
    this.agotado = false;
  }

  iniciar() {
    this.restante = this.total;
    this.activo = true;
    this.agotado = false;
  }

  detener() {
    this.activo = false;
  }

  /** @param {number} dt @returns {boolean} true en el fotograma en que se acaba el tiempo */
  actualizar(dt) {
    if (!this.activo) return false;
    this.restante = Math.max(0, this.restante - dt);
    if (this.restante <= 0 && !this.agotado) {
      this.agotado = true;
      this.activo = false;
      return true;
    }
    return false;
  }

  /** «1:05» */
  get texto() {
    const s = Math.ceil(this.restante);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
}
