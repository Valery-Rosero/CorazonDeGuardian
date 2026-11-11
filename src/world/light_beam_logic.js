// @ts-check

/**
 * Sistema de rayos de luz reutilizable (sección 8.2): traza un rayo en un plano horizontal que se
 * refleja en espejos (segmentos que reflejan por las dos caras) hasta tocar el objetivo, un muro o
 * agotar los rebotes. Lógica pura en 2D (x, z): el santuario y la cámara del sol la comparten.
 *
 * @typedef {{x: number, z: number}} P2
 * @typedef {{x: number, z: number, angulo: number, largo: number}} Espejo  angulo: dirección de la placa
 * @typedef {{puntos: P2[], tocados: number[], alcanzado: boolean}} Trazo
 */

const EPS = 1e-6;

/**
 * Corte del rayo (o + t·d) con el segmento [a, b]. Devuelve t > 0 o Infinity.
 * @param {P2} o @param {P2} d @param {P2} a @param {P2} b
 */
export function corteSegmento(o, d, a, b) {
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const den = d.x * ez - d.z * ex;
  if (Math.abs(den) < EPS) return Infinity; // paralelo: la placa está de canto, el rayo pasa
  const wx = a.x - o.x;
  const wz = a.z - o.z;
  const t = (wx * ez - wz * ex) / den;
  const u = (wx * d.z - wz * d.x) / den;
  return t > 1e-4 && u >= 0 && u <= 1 ? t : Infinity;
}

/** Corte del rayo con un círculo. @param {P2} o @param {P2} d @param {P2} c @param {number} r */
export function corteCirculo(o, d, c, r) {
  const fx = o.x - c.x;
  const fz = o.z - c.z;
  const b = fx * d.x + fz * d.z;
  const cc = fx * fx + fz * fz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t > 1e-4 ? t : Infinity;
}

/** Extremos de la placa de un espejo. @param {Espejo} e */
export function extremos(e) {
  const hx = (Math.cos(e.angulo) * e.largo) / 2;
  const hz = (Math.sin(e.angulo) * e.largo) / 2;
  return [{ x: e.x - hx, z: e.z - hz }, { x: e.x + hx, z: e.z + hz }];
}

/**
 * @param {{origen: P2, dir: P2, espejos: Espejo[], objetivo: {x: number, z: number, radio: number},
 *          limites: {minX: number, maxX: number, minZ: number, maxZ: number}, rebotes: number}} escena
 * @returns {Trazo}
 */
export function trazarRayo({ origen, dir, espejos, objetivo, limites, rebotes }) {
  let o = { ...origen };
  const l = Math.hypot(dir.x, dir.z);
  let d = { x: dir.x / l, z: dir.z / l };
  /** @type {P2[]} */
  const puntos = [{ ...o }];
  /** @type {number[]} */
  const tocados = [];
  let ultimo = -1;
  for (let rebote = 0; rebote <= rebotes; rebote++) {
    let mejor = Infinity;
    let cual = -1;
    for (let i = 0; i < espejos.length; i++) {
      if (i === ultimo) continue;
      const [a, b] = extremos(espejos[i]);
      const t = corteSegmento(o, d, a, b);
      if (t < mejor) {
        mejor = t;
        cual = i;
      }
    }
    const tObjetivo = corteCirculo(o, d, objetivo, objetivo.radio);
    const tMuro = distanciaAMuro(o, d, limites);
    if (tObjetivo < mejor && tObjetivo <= tMuro) {
      puntos.push({ x: o.x + d.x * tObjetivo, z: o.z + d.z * tObjetivo });
      return { puntos, tocados, alcanzado: true };
    }
    if (cual < 0 || mejor > tMuro) {
      puntos.push({ x: o.x + d.x * tMuro, z: o.z + d.z * tMuro });
      return { puntos, tocados, alcanzado: false };
    }
    // Rebote: r = d - 2(d·n)n, con n perpendicular a la placa (vale para las dos caras)
    o = { x: o.x + d.x * mejor, z: o.z + d.z * mejor };
    puntos.push({ ...o });
    tocados.push(cual);
    const e = espejos[cual];
    const nx = -Math.sin(e.angulo);
    const nz = Math.cos(e.angulo);
    const dn = d.x * nx + d.z * nz;
    d = { x: d.x - 2 * dn * nx, z: d.z - 2 * dn * nz };
    ultimo = cual;
  }
  return { puntos, tocados, alcanzado: false };
}

/** Distancia hasta salir del rectángulo de la sala. @param {P2} o @param {P2} d @param {{minX: number, maxX: number, minZ: number, maxZ: number}} lim */
function distanciaAMuro(o, d, lim) {
  let t = Infinity;
  if (d.x > EPS) t = Math.min(t, (lim.maxX - o.x) / d.x);
  if (d.x < -EPS) t = Math.min(t, (lim.minX - o.x) / d.x);
  if (d.z > EPS) t = Math.min(t, (lim.maxZ - o.z) / d.z);
  if (d.z < -EPS) t = Math.min(t, (lim.minZ - o.z) / d.z);
  return Math.max(0, t);
}

/**
 * Acertijo de los espejos solares: cada espejo gira en pasos de 45° y el acertijo se resuelve
 * cuando el rayo llega al cristal.
 */
export class AcertijoEspejos {
  /**
   * @param {{x: number, z: number, paso: number}[]} espejos  paso: orientación inicial (0 a 7)
   * @param {{origen: P2, dir: P2, objetivo: {x: number, z: number, radio: number},
   *          limites: {minX: number, maxX: number, minZ: number, maxZ: number}}} sala
   * @param {typeof import('../config/enemies.js').ESPEJOS} cfg
   */
  constructor(espejos, sala, cfg) {
    this.cfg = cfg;
    this.sala = sala;
    this.espejos = espejos.map((e) => ({ x: e.x, z: e.z, paso: ((e.paso % cfg.pasos) + cfg.pasos) % cfg.pasos }));
    this.resuelto = false;
    /** @type {Trazo} */
    this.trazo = { puntos: [], tocados: [], alcanzado: false };
    this.trazar();
  }

  /** Ángulo de la placa en el plano XZ. @param {number} paso */
  angulo(paso) {
    return (paso * Math.PI * 2) / this.cfg.pasos;
  }

  /** Gira un espejo 45°. Devuelve true si con ese giro se resolvió. @param {number} i */
  girar(i) {
    if (this.resuelto) return false;
    const e = this.espejos[i];
    e.paso = (e.paso + 1) % this.cfg.pasos;
    this.trazar();
    return this.resuelto;
  }

  trazar() {
    this.trazo = trazarRayo({
      ...this.sala,
      rebotes: this.cfg.rebotes,
      espejos: this.espejos.map((e) => ({ x: e.x, z: e.z, angulo: this.angulo(e.paso), largo: this.cfg.largo })),
    });
    if (this.trazo.alcanzado) this.resuelto = true;
    return this.trazo;
  }
}
