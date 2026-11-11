// @ts-check
/**
 * Cinemáticas del jefe y del final, plano a plano (sección 9.4). Se arman con las posiciones reales
 * (la entrada de la arena, el Guardián donde quede, Victoria y Mateo), en coordenadas de Three.js.
 * @typedef {import('./timeline.js').Cinematica} Cinematica
 * @typedef {{x: number, y: number, z: number}} V3
 */

/** @param {V3} a @param {number} x @param {number} y @param {number} z */
const mas = (a, x, y, z) => ({ x: a.x + x, y: a.y + y, z: a.z + z });
/** a + f·k + lado·l + arriba·h, con f y lado en el plano horizontal. @param {V3} a @param {V3} f @param {number} k @param {number} l @param {number} h */
const rel = (a, f, k, l, h) => ({ x: a.x + f.x * k - f.z * l, y: a.y + h, z: a.z + f.z * k + f.x * l });

/**
 * Despertar del Guardián (≈12 s).
 * @param {V3} entrada  donde entra Victoria
 * @param {V3} trono  pies del Guardián sentado
 * @returns {Cinematica}
 */
export function despertar(entrada, trono) {
  const dx = entrada.x - trono.x;
  const dz = entrada.z - trono.z;
  const l = Math.hypot(dx, dz) || 1;
  const f = { x: dx / l, y: 0, z: dz / l };   // del trono hacia la entrada
  return {
    nombre: 'despertar',
    planos: [
      // 1. Victoria entra: cámara baja detrás de ella, avance lento
      { duracion: 3, camara: [rel(entrada, f, 2.4, 0.6, 0.9), rel(entrada, f, -0.6, 0.4, 1.0)], mira: [mas(trono, 0, 2.5, 0), mas(trono, 0, 2.8, 0)], fov: 62 },
      // 2. Panorámica vertical de los pies a la máscara
      { duracion: 3, camara: [rel(trono, f, 6.5, 1.2, 0.8), rel(trono, f, 6.0, 1.0, 1.4)], mira: [mas(trono, 0, 0.3, 0), mas(trono, 0, 4.6, 0)], fov: 58 },
      // 3. Primer plano de la máscara: las runas se encienden
      { duracion: 2, camara: [rel(trono, f, 3.4, 0.2, 4.4), rel(trono, f, 2.7, 0.15, 4.5)], mira: [mas(trono, 0, 4.7, 0), mas(trono, 0, 4.7, 0)], fov: 48 },
      // 4. Plano general mientras se levanta, con sacudida
      { duracion: 2, camara: [rel(trono, f, 13, -9, 9), rel(trono, f, 12, -8, 9.5)], mira: [mas(trono, 0, 3, 0), mas(trono, 0, 3.5, 0)], fov: 70, sacudida: 0.08 },
      // 5. Rótulo y vuelta a la cámara de jefe
      { duracion: 2, camara: [rel(entrada, f, 3.2, 0.8, 1.8), rel(entrada, f, 3.6, 0.7, 2.0)], mira: [mas(trono, 0, 3.6, 0), mas(trono, 0, 3.6, 0)], fov: 74 },
    ],
    sucesos: [
      { t: 6.0, accion: 'runas' },
      { t: 6.3, accion: 'decir', datos: ['mat_despertar_01', 'gem_despertar_01'] },
      { t: 7.6, accion: 'levantarse' },
      { t: 8.0, accion: 'rugido' },
      { t: 10.0, accion: 'rotulo', datos: 'GUARDIÁN DEL SOL' },
    ],
  };
}

/**
 * Transición a la fase 2 (≈2,5 s): acercamiento rápido al pecho mientras las placas se abren.
 * @param {V3} pecho @param {number} rumbo  hacia dónde mira el Guardián
 * @returns {Cinematica}
 */
export function fase2(pecho, rumbo) {
  const f = { x: Math.sin(rumbo), y: 0, z: Math.cos(rumbo) };
  return {
    nombre: 'fase2',
    planos: [{ duracion: 2.5, camara: [rel(pecho, f, 10, 1.5, 0.4), rel(pecho, f, 4.6, 0.8, 0.1)], mira: [pecho, pecho], fov: 60 }],
    sucesos: [{ t: 0.2, accion: 'decir', datos: ['gem_fase2_01', 'vic_fase2_01'] }],
  };
}

/**
 * Transición a la fase 3 (≈2,5 s): grietas naranjas, plano holandés y rugido.
 * @param {V3} pecho @param {number} rumbo
 * @returns {Cinematica}
 */
export function fase3(pecho, rumbo) {
  const f = { x: Math.sin(rumbo), y: 0, z: Math.cos(rumbo) };
  return {
    nombre: 'fase3',
    planos: [{ duracion: 2.6, camara: [rel(pecho, f, 5.5, -2.2, 1.6), rel(pecho, f, 4.8, -1.8, 1.9)], mira: [mas(pecho, 0, 1.0, 0), mas(pecho, 0, 1.4, 0)],
      fov: 56, holandes: 4, sacudida: 0.06 }],
    sucesos: [{ t: 0.1, accion: 'rugido' }, { t: 0.6, accion: 'decir', datos: ['mat_fase3_01'] }],
  };
}

/**
 * Derrota del Guardián (≈15 s).
 * @param {V3} pie  donde cae el Guardián (y donde queda Mateo de rodillas)
 * @param {number} rumbo
 * @param {V3} victoria  donde se coloca Victoria para el diálogo
 * @returns {Cinematica}
 */
export function derrota(pie, rumbo, victoria) {
  const f = { x: Math.sin(rumbo), y: 0, z: Math.cos(rumbo) };
  const giro = [0, 0.4, 0.8, 1.2].map((a) => {
    const ang = rumbo + a;
    return { x: pie.x + Math.sin(ang) * 9, y: pie.y + 3, z: pie.z + Math.cos(ang) * 9 };
  });
  const df = { x: pie.x - victoria.x, z: pie.z - victoria.z };
  const ld = Math.hypot(df.x, df.z) || 1;
  const hv = { x: df.x / ld, y: 0, z: df.z / ld };   // de Victoria hacia Mateo
  return {
    nombre: 'derrota',
    planos: [
      // 1. Cámara lenta en travelling circular mientras el núcleo se agrieta
      { duracion: 3, camara: giro, mira: [mas(pie, 0, 3.6, 0), mas(pie, 0, 3.4, 0)], fov: 60, escalaTiempo: 0.3 },
      // 2. Plano general: el caparazón cae por piezas
      { duracion: 3, camara: [rel(pie, f, 14, 2, 6), rel(pie, f, 13, 2.5, 5.5)], mira: [mas(pie, 0, 2, 0), mas(pie, 0, 1.2, 0)], fov: 66, sacudida: 0.05 },
      // 3. Primer plano de Mateo de rodillas, iluminado por el núcleo
      { duracion: 3, camara: [rel(pie, f, 2.6, 0.6, 1.1), rel(pie, f, 2.2, 0.4, 1.05)], mira: [mas(pie, 0, 0.95, 0), mas(pie, 0, 0.95, 0)], fov: 46 },
      // 4. Por encima del hombro de Victoria
      { duracion: 3, camara: [rel(victoria, hv, -1.3, 0.5, 1.6), rel(victoria, hv, -1.1, 0.45, 1.6)], mira: [mas(pie, 0, 0.9, 0), mas(pie, 0, 0.9, 0)], fov: 50 },
      // 5. La gema vuela al brazalete
      { duracion: 2, camara: [rel(victoria, hv, 0.9, -1.3, 1.3), rel(victoria, hv, 0.8, -1.1, 1.25)], mira: [mas(victoria, 0, 1.0, 0), mas(victoria, 0, 1.0, 0)], fov: 44 },
      // 6. El techo se agrieta
      { duracion: 1.2, camara: [rel(pie, f, 10, 1, 7), rel(pie, f, 10, 1, 7.5)], mira: [mas(pie, 0, 9, 0), mas(pie, 0, 10, 0)], fov: 72, sacudida: 0.16 },
    ],
    sucesos: [
      { t: 0.0, accion: 'congelar' },
      { t: 0.6, accion: 'destello' },
      { t: 2.8, accion: 'caparazon' },
      { t: 5.8, accion: 'mateo' },
      { t: 6.6, accion: 'decir', datos: ['mat_derrota_01'] },
      { t: 9.2, accion: 'decir', datos: ['vic_derrota_01'] },
      { t: 12.1, accion: 'gema' },
      { t: 14.0, accion: 'temblor' },
    ],
  };
}

/**
 * Final al amanecer (≈15 s).
 * @param {V3} victoria  en el borde de la cornisa, mirando el amanecer
 * @param {number} rumbo  hacia dónde mira Victoria (el sol)
 * @param {V3} mateo  sale del portal de runas detrás de ella
 * @returns {Cinematica}
 */
export function final(victoria, rumbo, mateo) {
  const f = { x: Math.sin(rumbo), y: 0, z: Math.cos(rumbo) };
  const horizonte = rel(victoria, f, 40, 0, 4);
  return {
    nombre: 'final',
    planos: [
      // 1. Plano general: el borde sobre el mar de nubes, Victoria pequeña (la cámara flota sobre el abismo, a su lado)
      { duracion: 4, camara: [rel(victoria, f, 4, 12, 3), rel(victoria, f, 3.5, 10.5, 3.4)], mira: [rel(victoria, f, 14, 2, 1), rel(victoria, f, 14, 1, 1.5)], fov: 64 },
      // 2. Plano medio: Victoria se gira
      { duracion: 2, camara: [rel(victoria, f, 2.6, 1.0, 1.5), rel(victoria, f, 2.4, 0.9, 1.5)], mira: [mas(victoria, 0, 1.45, 0), mas(victoria, 0, 1.45, 0)], fov: 48 },
      // 3. Contraplano: Mateo sale del portal
      { duracion: 3, camara: [rel(victoria, f, 0.9, 0.6, 1.6), rel(victoria, f, 0.7, 0.5, 1.6)], mira: [mas(mateo, 0, 1.4, 0), mas(mateo, 0, 1.5, 0)], fov: 52 },
      // 4. Los dos de espaldas, en silueta frente al sol
      { duracion: 3, camara: [rel(victoria, f, -4.2, 0.5, 1.5), rel(victoria, f, -3.8, 0.5, 1.6)], mira: [horizonte, horizonte], fov: 58 },
      // 5. Grúa ascendente hacia el cielo
      { duracion: 3, camara: [rel(victoria, f, -4, 0.5, 2), rel(victoria, f, -6, 0.5, 14)], mira: [horizonte, mas(horizonte, 0, 12, 0)], fov: 66 },
    ],
    sucesos: [
      { t: 4.2, accion: 'girar' },
      { t: 6.0, accion: 'mateo' },
      { t: 9.0, accion: 'mirar_sol' },
      { t: 14.6, accion: 'victoria' },
    ],
  };
}
