// @ts-check
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/**
 * Hueso que se rota en el espacio del personaje (X = su izquierda, Y = arriba, Z = adelante),
 * sin importar cómo exportó Blender la orientación de reposo.
 * local = padreInv · delta · padre · reposo
 */
export class HuesoAnimable {
  /**
   * @param {THREE.Bone} hueso
   * @param {THREE.Matrix4} invRaiz
   */
  constructor(hueso, invRaiz) {
    this.hueso = hueso;
    this.reposo = hueso.quaternion.clone();
    this.padre = new THREE.Quaternion();
    _m.multiplyMatrices(invRaiz, hueso.parent.matrixWorld);
    _m.decompose(_p, this.padre, _s);
    this.padreInv = this.padre.clone().invert();
    this.rx = 0;
    this.ry = 0;
    this.rz = 0;
    this._e = new THREE.Euler();
    this._q = new THREE.Quaternion();
  }

  aplicar() {
    this._e.set(this.rx, this.ry, this.rz, 'YXZ');
    this._q.setFromEuler(this._e);
    this.hueso.quaternion.copy(this.padreInv).multiply(this._q).multiply(this.padre).multiply(this.reposo);
    this.rx = 0;
    this.ry = 0;
    this.rz = 0;
  }
}

/** Resorte amortiguado de un grado de libertad (trenza, poncho, aplastamiento). */
class Resorte {
  constructor() {
    this.x = 0;
    this.v = 0;
  }

  /** @param {number} objetivo @param {number} dt @param {number} k @param {number} c */
  paso(objetivo, dt, k, c) {
    this.v += (k * (objetivo - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

/** @param {number} a @param {number} b @param {number} t */
const mezclar = (a, b, t) => a + (b - a) * t;

/**
 * Gestos del torso y los brazos (capa 2 de la animación): se mezclan sobre la locomoción
 * sin detener las piernas. Rotaciones [x, y, z] en el espacio del personaje.
 * El poncho se levanta junto con los brazos para que no lo atraviesen.
 * @type {Record<string, {duracion: number, huesos: Record<string, [number, number, number]>}>}
 */
const GESTOS = {
  disparo: { duracion: 0.34, huesos: {
    brazo_sup_der: [-1.5, 0, -0.12], brazo_inf_der: [-0.1, 0, 0], mano_der: [-0.2, 0, 0], torso: [0, -0.2, 0],
    poncho_delante: [-0.4, 0, 0] } },
  escudo: { duracion: 0.7, huesos: {
    brazo_sup_izq: [-1.2, 0, -0.38], brazo_inf_izq: [-1.15, 0, 0], brazo_sup_der: [-1.2, 0, 0.38], brazo_inf_der: [-1.15, 0, 0],
    cabeza: [0.12, 0, 0], poncho_delante: [-0.45, 0, 0] } },
  manipular: { duracion: 0.6, huesos: {
    brazo_sup_der: [-1.25, 0, 0.08], brazo_inf_der: [-0.25, 0, 0], mano_der: [-0.35, 0, 0], cabeza: [0.12, 0, 0],
    poncho_delante: [-0.3, 0, 0] } },
  chisporroteo: { duracion: 0.35, huesos: {
    brazo_sup_der: [-0.9, 0, 0.1], brazo_inf_der: [-0.6, 0, 0], mano_der: [0.3, 0, 0], poncho_delante: [-0.2, 0, 0] } },
  mirar_brazalete: { duracion: 2.4, huesos: {
    brazo_sup_der: [-0.55, 0, 0.3], brazo_inf_der: [-1.75, 0, 0], mano_der: [0.2, 0, 0], cabeza: [0.38, 0.15, 0],
    poncho_delante: [-0.25, 0, 0] } },
  esquiva: { duracion: 0.35, huesos: {
    torso: [0.85, 0, 0], cabeza: [0.3, 0, 0], pierna_sup_izq: [-1.15, 0, 0], pierna_inf_izq: [1.5, 0, 0],
    pierna_sup_der: [-0.95, 0, 0], pierna_inf_der: [1.4, 0, 0], brazo_sup_izq: [-0.9, 0, 0.25], brazo_sup_der: [-0.9, 0, -0.25],
    brazo_inf_izq: [-1.0, 0, 0], brazo_inf_der: [-1.0, 0, 0] } },
};

/**
 * Animación procedural de Victoria por capas: locomoción, aire, respiración y movimiento secundario.
 * Cada fotograma se acumulan rotaciones en cada hueso y se aplican al final.
 */
export class AnimadorProcedural {
  /**
   * @param {THREE.Object3D} raiz  objeto que contiene la armadura (el que mueve el controlador)
   * @param {THREE.Object3D} cuerpoVisual  nodo al que se aplican el rebote y el aplastamiento
   * @param {Record<string, number>} cfg  valores de ANIMACION
   * @param {Record<string, number>} cfgJugador  valores de PLAYER (velocidades)
   */
  constructor(raiz, cuerpoVisual, cfg, cfgJugador) {
    this.cfg = cfg;
    this.cfgJugador = cfgJugador;
    this.cuerpoVisual = cuerpoVisual;
    raiz.updateMatrixWorld(true);
    const invRaiz = raiz.matrixWorld.clone().invert();
    /** @type {Record<string, HuesoAnimable>} */
    this.h = {};
    /** @type {HuesoAnimable[]} */
    this.lista = [];
    raiz.traverse((o) => {
      if (/** @type {THREE.Bone} */ (o).isBone) {
        const ha = new HuesoAnimable(/** @type {THREE.Bone} */ (o), invRaiz);
        this.h[o.name] = ha;
        this.lista.push(ha);
      }
    });
    this.fase = 0;
    this.pisada = false;
    this.pesoMov = 0;
    this.pesoAire = 0;
    this.orientacionPrevia = 0;
    this.trenza = Array.from({ length: 6 }, (_, i) => ({ x: new Resorte(), z: new Resorte(), hueso: this.h[`trenza_${i + 1}`] }));
    this.ponchoDelante = new Resorte();
    this.ponchoDetras = new Resorte();
    this.aplastamiento = new Resorte();
    /** Gesto en curso (solo uno a la vez: uno nuevo reemplaza al anterior). */
    this.gestoActual = /** @type {{duracion:number, huesos:Record<string, [number, number, number]>} | null} */ (null);
    this.tGesto = 0;
    // Pares (hueso, pose) precalculados por gesto para no crear nada en el bucle
    /** @type {Record<string, {h: HuesoAnimable, p: [number, number, number]}[]>} */
    this.paresGesto = {};
    for (const [nombre, g] of Object.entries(GESTOS)) {
      this.paresGesto[nombre] = Object.entries(g.huesos).filter(([n]) => n in this.h).map(([n, p]) => ({ h: this.h[n], p }));
    }
    this.pares = /** @type {{h: HuesoAnimable, p: [number, number, number]}[]} */ ([]);
  }

  /** Lanza un gesto (disparo, escudo, manipular...). @param {string} nombre @param {number} [duracion] */
  gesto(nombre, duracion) {
    const g = GESTOS[nombre];
    if (!g) return;
    this.gestoActual = duracion ? { ...g, duracion } : g;
    this.pares = this.paresGesto[nombre];
    this.tGesto = 0;
  }

  /** @param {string} nombre */
  tiene(nombre) {
    return nombre in this.h;
  }

  /**
   * @param {number} dt
   * @param {number} t
   * @param {{velocidad:number, enSuelo:boolean, velVertical:number, aterrizaje:number, orientacion:number}} est
   */
  actualizar(dt, t, est) {
    if (dt <= 0) return;
    const h = this.h;
    const cfg = this.cfg;
    const v = est.velocidad;
    const vNorm = Math.min(1, v / this.cfgJugador.velocidad_correr);

    // --- Pesos de capa
    this.pesoMov += (Math.min(1, v / 1.2) - this.pesoMov) * (1 - Math.exp(-dt * 10));
    this.pesoAire += ((est.enSuelo ? 0 : 1) - this.pesoAire) * (1 - Math.exp(-dt * 12));
    const pa = this.pesoAire;
    const pt = 1 - pa;

    // --- Locomoción
    const senoPrevio = Math.sin(this.fase);
    this.fase += dt * Math.PI * v / mezclar(cfg.paso_caminar, cfg.paso_correr, vNorm);
    const s = Math.sin(this.fase);
    // Un pie toca el suelo cada vez que el seno cruza el cero (para el sonido de los pasos)
    this.pisada = est.enSuelo && this.pesoMov > 0.35 && Math.sign(s) !== Math.sign(senoPrevio);
    const c = Math.cos(this.fase);
    const amp = mezclar(cfg.amplitud_caminar, cfg.amplitud_correr, vNorm) * this.pesoMov;
    const rodilla = amp * 1.4;

    h.pierna_sup_izq.rx += pt * (-s * amp) + pa * -0.65;
    h.pierna_sup_der.rx += pt * (s * amp) + pa * 0.25;
    h.pierna_inf_izq.rx += pt * Math.max(0, c) * rodilla + pa * 0.85;
    h.pierna_inf_der.rx += pt * Math.max(0, -c) * rodilla + pa * 0.35;
    h.bota_izq.rx += pt * -Math.max(0, c) * rodilla * 0.3;
    h.bota_der.rx += pt * -Math.max(0, -c) * rodilla * 0.3;

    const brazo = amp * 0.75;
    const abre = 0.1 + pa * 0.45;
    h.brazo_sup_izq.rx += pt * (s * brazo) + pa * -0.35;
    h.brazo_sup_der.rx += pt * (-s * brazo) + pa * -0.35;
    h.brazo_sup_izq.rz += abre;
    h.brazo_sup_der.rz -= abre;
    const codo = -0.15 - vNorm * 0.55 * this.pesoMov;
    h.brazo_inf_izq.rx += codo;
    h.brazo_inf_der.rx += codo;

    // Tronco: inclinación al correr, giro con los pasos y respiración
    const respira = Math.sin(t * 1.6) * cfg.respiracion * (1 - this.pesoMov * 0.6);
    h.torso.rx += 0.10 * vNorm * this.pesoMov + respira;
    h.torso.ry += s * 0.12 * amp;
    h.cadera.ry += -s * 0.08 * amp;
    h.cabeza.ry += -s * 0.06 * amp;
    h.cabeza.rx += -respira * 0.5 - 0.06 * vNorm * this.pesoMov;

    // Rebote del cuerpo y aplastamiento al aterrizar / estiramiento al subir
    const rebote = -cfg.rebote * amp * Math.abs(s) * pt;
    if (est.aterrizaje > 0) {
      this.aplastamiento.v -= est.aterrizaje * 3.5;
      est.aterrizaje = 0;
    }
    const estira = est.enSuelo ? 0 : THREE.MathUtils.clamp(est.velVertical * 0.012, -0.03, 0.06);
    const ap = this.aplastamiento.paso(estira, dt, 220, 14);
    this.cuerpoVisual.position.y = rebote;
    this.cuerpoVisual.scale.set(1 - ap * 0.5, 1 + ap, 1 - ap * 0.5);

    // --- Movimiento secundario: trenza y poncho con resortes
    const giro = (est.orientacion - this.orientacionPrevia) / dt;
    this.orientacionPrevia = est.orientacion;
    const k = cfg.resorte_rigidez;
    const amort = cfg.resorte_amortiguacion;
    const atras = v * 0.07 + THREE.MathUtils.clamp(-est.velVertical * 0.04, -0.3, 0.4);
    const lado = THREE.MathUtils.clamp(-giro * 0.05, -0.5, 0.5);
    for (let i = 0; i < 6; i++) {
      const r = this.trenza[i];
      const retraso = 1 - i * 0.1;
      const bx = r.x.paso(atras * 0.35, dt, k * retraso, amort);
      const bz = r.z.paso(lado * 0.3 + Math.sin(t * 2 + i * 0.7) * 0.02, dt, k * retraso, amort);
      r.hueso.rx += bx;
      r.hueso.rz += bz;
    }
    // +rx lleva la punta hacia atrás: al correr el viento pega el poncho al cuerpo; al saltar se levanta
    h.poncho_delante.rx += this.ponchoDelante.paso(0.05 * vNorm - pa * 0.18, dt, k, amort);
    h.poncho_detras.rx += this.ponchoDetras.paso(0.16 * vNorm + pa * 0.12, dt, k, amort);

    // --- Capa de gestos: entrada en 0,08 s y salida en 0,15 s
    if (this.gestoActual) {
      this.tGesto += dt;
      const d = this.gestoActual.duracion;
      const t = this.tGesto;
      const w = Math.min(1, t / 0.08) * Math.min(1, Math.max(0, (d - t) / 0.15));
      for (let i = 0; i < this.pares.length; i++) {
        const { h: hueso, p } = this.pares[i];
        hueso.rx = mezclar(hueso.rx, p[0], w);
        hueso.ry = mezclar(hueso.ry, p[1], w);
        hueso.rz = mezclar(hueso.rz, p[2], w);
      }
      if (t >= d) this.gestoActual = null;
    }

    for (let i = 0; i < this.lista.length; i++) this.lista[i].aplicar();
  }
}
