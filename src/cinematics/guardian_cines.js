// @ts-check
/**
 * Cinemáticas del jefe y del final, plano a plano según el guion gráfico (https://claude.ai/artifact/AYcTKYeEyFFgUgv9WxaYBK) y la
 * sección 9.4). Se arman con las posiciones reales (la entrada de la arena, el Guardián donde quede,
 * Victoria y Mateo), en coordenadas de Three.js. Lentes en milímetros (equivalente de 35 mm).
 *
 * Motivos: cuando habla Mateo, el plano es el pecho (el núcleo late con su voz); cuando habla la gema,
 * la máscara. En los diálogos la cámara no cruza el eje entre los dos personajes.
 * @typedef {import('./timeline.js').Cinematica} Cinematica
 * @typedef {{x: number, y: number, z: number}} V3
 */

/** @param {V3} a @param {number} x @param {number} y @param {number} z */
export const mas = (a, x, y, z) => ({ x: a.x + x, y: a.y + y, z: a.z + z });
/**
 * a + f·k + derecha·l + arriba·h, donde derecha es la derecha de alguien que mira hacia f.
 * @param {V3} a @param {V3} f @param {number} k @param {number} l @param {number} h
 */
export const rel = (a, f, k, l, h) => ({ x: a.x + f.x * k - f.z * l, y: a.y + h, z: a.z + f.z * k + f.x * l });
/** Dirección horizontal unitaria de a hacia b. @param {V3} a @param {V3} b */
export const hacia = (a, b) => {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, y: 0, z: dz / l };
};
/** @param {number} rumbo */
const dir = (rumbo) => ({ x: Math.sin(rumbo), y: 0, z: Math.cos(rumbo) });

/**
 * Despertar del Guardián (18,5 s). La revelación: el pecho habla con la voz de Mateo y la máscara con la de la gema.
 * @param {V3} entrada  donde entra Victoria
 * @param {V3} trono  pies del Guardián sentado
 * @returns {Cinematica}
 */
export function despertar(entrada, trono) {
  const f = hacia(trono, entrada);   // del trono hacia la entrada
  return {
    nombre: 'despertar',
    planos: [
      // 1. Victoria entra: cámara baja detrás de ella, avance lento; el Guardián al fondo, inmóvil
      { duracion: 3, lente: 28, curva: 'lineal', camara: [rel(entrada, f, 3.6, 1.05, 0.95), rel(entrada, f, 1.6, 0.85, 1.0)], mira: [mas(trono, 0, 2.2, 0), mas(trono, 0, 2.5, 0)] },
      // 2. Panorámica vertical de los pies a la máscara (contrapicado)
      { duracion: 3, lente: 35, camara: [rel(trono, f, 7.6, 1.3, 0.6), rel(trono, f, 7.2, 1.1, 0.8)], mira: [mas(trono, 0, 0.4, 0), mas(trono, 0, 4.6, 0)] },
      // 3. Primer plano de la máscara: los ojos redondos (como gafas), las runas se encienden
      { duracion: 2.5, lente: 85, camara: [rel(trono, f, 4.9, 0.12, 4.3), rel(trono, f, 4.6, 0.1, 4.35)], mira: [mas(trono, 0, 4.62, 0), mas(trono, 0, 4.65, 0)] },
      // 4. Picado desde detrás del hombro del Guardián mientras se levanta: Victoria, pequeña y sola al
      //    otro lado de la arena (sección 9.3). Desde los lados no hay sitio: el muro está a 16 m.
      { duracion: 2.5, lente: 40, camara: [rel(entrada, f, -28, 3, 9), rel(entrada, f, -27.6, 2.9, 9.4)], mira: [rel(entrada, f, 0, 0, 1), rel(entrada, f, 0, 0, 1.2)], sacudida: 0.08 },
      // 5. Por encima del hombro de Victoria hacia el pecho: la voz de Mateo sale del núcleo
      { duracion: 4.5, lente: [50, 85], curva: 'sale', camara: [rel(entrada, f, 1.35, 0.5, 1.35), rel(entrada, f, 1.25, 0.45, 1.35)], mira: [mas(trono, 0, 3.6, 0), mas(trono, 0, 3.7, 0)] },
      // 6. La máscara habla con la voz de la gema (contrapicado); rótulo
      { duracion: 3.1, lente: 65, camara: [rel(trono, f, 6.4, 0.9, 3.4), rel(trono, f, 6.1, 0.8, 3.3)], mira: [mas(trono, 0, 5.4, 0), mas(trono, 0, 5.45, 0)] },
    ],
    mezclaFinal: 1.4,
    sucesos: [
      { t: 6.0, accion: 'runas' },
      { t: 8.5, accion: 'levantarse' },
      { t: 8.9, accion: 'rugido' },
      { t: 9.6, accion: 'decir', datos: ['mat_despertar_01', 'gem_despertar_01'] },
      { t: 16.0, accion: 'rotulo', datos: 'GUARDIÁN DEL SOL' },
    ],
  };
}

/**
 * Fase 2 (5,4 s): acercamiento rápido al pecho mientras se abren las placas; Victoria responde en cuadro.
 * @param {V3} pecho @param {number} rumbo  hacia dónde mira el Guardián @param {V3} victoria
 * @returns {Cinematica}
 */
export function fase2(pecho, rumbo, victoria) {
  const f = dir(rumbo);
  const hv = hacia(victoria, pecho);   // de Victoria hacia el Guardián
  return {
    nombre: 'fase2',
    planos: [
      { duracion: 2.6, lente: [35, 50], curva: 'sale', camara: [rel(pecho, f, 9.5, 1.6, 0.3), rel(pecho, f, 4.8, 0.8, 0.1)], mira: [pecho, pecho] },
      // Victoria de frente, decidida, mirando hacia arriba (contrapicado leve)
      { duracion: 2.8, lente: 50, camara: [rel(victoria, hv, 2.3, 0.35, 1.15), rel(victoria, hv, 2.2, 0.32, 1.15)], mira: [mas(victoria, 0, 1.5, 0), mas(victoria, 0, 1.52, 0)] },
    ],
    sucesos: [{ t: 0.2, accion: 'decir', datos: ['gem_fase2_01', 'vic_fase2_01'] }],
  };
}

/**
 * Fase 3 (7,4 s): grietas en plano holandés con rugido; después, con la cámara quieta, habla Mateo.
 * @param {V3} pecho @param {number} rumbo
 * @returns {Cinematica}
 */
export function fase3(pecho, rumbo) {
  const f = dir(rumbo);
  return {
    nombre: 'fase3',
    planos: [
      { duracion: 2.4, lente: 50, camara: [rel(pecho, f, 5.4, -2.0, 1.4), rel(pecho, f, 5.0, -1.8, 1.6)], mira: [mas(pecho, 0, 1.0, 0), mas(pecho, 0, 1.3, 0)], holandes: 4, sacudida: 0.06 },
      { duracion: 5.0, lente: 85, curva: 'lineal', camara: [rel(pecho, f, 6.4, 0.3, 0.05), rel(pecho, f, 6.0, 0.28, 0.05)], mira: [pecho, pecho] },
    ],
    sucesos: [{ t: 0.1, accion: 'rugido' }, { t: 2.5, accion: 'decir', datos: ['mat_fase3_01'] }],
  };
}

/**
 * Derrota del Guardián (18 s). Plano y contraplano sin cruzar el eje: Mateo, de rodillas, la mira desde
 * abajo (picado sobre él); el contraplano se toma desde su altura (contrapicado sobre ella).
 * @param {V3} pie  donde cae el Guardián (y donde queda Mateo de rodillas)
 * @param {number} rumbo
 * @param {V3} victoria  donde está Victoria mientras cae el caparazón
 * @param {V3} cerca  donde está Victoria durante el diálogo (frente a Mateo)
 * @returns {Cinematica}
 */
export function derrota(pie, rumbo, victoria, cerca) {
  const f = dir(rumbo);
  const giro = [0, 0.4, 0.8, 1.2].map((a) => {
    const ang = rumbo + a;
    return { x: pie.x + Math.sin(ang) * 9, y: pie.y + 3, z: pie.z + Math.cos(ang) * 9 };
  });
  const hv = hacia(cerca, pie);       // de Victoria hacia Mateo: el eje del diálogo
  const caraM = mas(pie, 0, 0.95, 0); // Mateo de rodillas
  const caraV = mas(cerca, 0, 1.52, 0);
  return {
    nombre: 'derrota',
    planos: [
      // 1. Cámara lenta en travelling circular mientras el núcleo se agrieta
      { duracion: 3, lente: 35, curva: 'lineal', camara: giro, mira: [mas(pie, 0, 3.6, 0), mas(pie, 0, 3.4, 0)], escalaTiempo: 0.3 },
      // 2. Gran plano general: el caparazón cae por piezas
      { duracion: 3, lente: 24, camara: [rel(pie, f, 14, 2, 6), rel(pie, f, 13, 2.5, 5.5)], mira: [mas(pie, 0, 2, 0), mas(pie, 0, 1.2, 0)], sacudida: 0.05 },
      // 3. Primer plano de Mateo de rodillas, iluminado por el núcleo (Victoria fuera de cuadro)
      { duracion: 3, lente: 85, curva: 'lineal', camara: [rel(pie, f, 3.3, -1.3, 1.0), rel(pie, f, 3.0, -1.2, 1.0)], mira: [caraM, caraM] },
      // 4. Por encima del hombro derecho de Victoria: él la mira desde abajo
      { duracion: 2.5, lente: 50, camara: [rel(cerca, hv, -0.85, 0.42, 1.45), rel(cerca, hv, -0.8, 0.42, 1.45)], mira: [caraM, caraM] },
      // 5. Contraplano desde la altura de Mateo, del mismo lado del eje: la cara de Victoria
      { duracion: 3, lente: 50, camara: [rel(pie, hv, 1.35, 0.55, 1.05), rel(pie, hv, 1.3, 0.55, 1.05)], mira: [caraV, caraV] },
      // 6. La gema vuela al brazalete: Victoria levanta la muñeca derecha (como al recibirlo)
      { duracion: 2, lente: 85, camara: [rel(cerca, hv, 1.45, 0.62, 1.2), rel(cerca, hv, 1.4, 0.6, 1.18)], mira: [rel(cerca, hv, 0.32, 0.16, 1.15), rel(cerca, hv, 0.3, 0.15, 1.15)] },
      // 7. El techo se agrieta
      { duracion: 1.5, lente: 18, camara: [rel(pie, f, 10, 1, 6), rel(pie, f, 10, 1, 6.4)], mira: [mas(pie, 0, 10, 0), mas(pie, 0, 11, 0)], sacudida: 0.16 },
    ],
    mezclaFinal: 1.0,
    sucesos: [
      { t: 0.0, accion: 'congelar' },
      { t: 0.6, accion: 'destello' },
      { t: 2.8, accion: 'caparazon' },
      { t: 5.8, accion: 'mateo' },
      { t: 9.0, accion: 'acercarse' },
      { t: 9.2, accion: 'decir', datos: ['mat_derrota_01'] },
      { t: 11.7, accion: 'decir', datos: ['vic_derrota_01'] },
      { t: 14.6, accion: 'gema' },
      { t: 16.6, accion: 'temblor' },
    ],
  };
}

/**
 * Final al amanecer (16 s): por primera vez el sol de frente. Victoria a la izquierda, Mateo a su derecha.
 * @param {V3} victoria  en el borde de la cornisa, mirando el amanecer
 * @param {number} rumbo  hacia dónde mira Victoria (el sol)
 * @param {V3} mateo  sale del portal de runas detrás de ella
 * @returns {Cinematica}
 */
export function final(victoria, rumbo, mateo) {
  const f = dir(rumbo);
  const horizonte = rel(victoria, f, 40, 0.5, 4);
  const alLado = rel(victoria, f, -0.1, 1.15, 0);
  return {
    nombre: 'final',
    planos: [
      // 1. Gran plano general desde el puente (12 m al lado de ella, 4 m sobre el tablero): el borde sobre
      //    el mar de nubes; Victoria pequeña a la izquierda, el amanecer a la derecha
      { duracion: 4, lente: 18, curva: 'lineal', camara: [rel(victoria, f, -5, 11.8, 4), rel(victoria, f, -4.6, 11.6, 4.1)], mira: [rel(victoria, f, 18, -7.5, 1.5), rel(victoria, f, 18, -7.2, 1.6)] },
      // 2. Plano medio: Victoria oye pasos y se gira
      { duracion: 2, lente: 50, camara: [rel(victoria, f, 2.9, -1.0, 1.45), rel(victoria, f, 2.8, -0.95, 1.45)], mira: [mas(victoria, 0, 1.3, 0), mas(victoria, 0, 1.32, 0)] },
      // 3. Contraplano: Mateo sale del portal, se detiene y se acomoda las gafas
      { duracion: 3, lente: 40, camara: [rel(victoria, f, 1.3, -0.45, 1.6), rel(victoria, f, 1.25, -0.43, 1.6)], mira: [mas(mateo, 0, 1.35, 0), mas(mateo, 0, 1.45, 0)] },
      // 4. Los dos de espaldas, en silueta frente al sol (Mateo llega a su lado)
      { duracion: 3.5, lente: 35, curva: 'lineal', camara: [rel(alLado, f, -5, -0.55, 1.5), rel(alLado, f, -4.4, -0.55, 1.55)], mira: [horizonte, horizonte] },
      // 5. Grúa ascendente hacia el cielo
      { duracion: 3.5, lente: 28, curva: 'entra', camara: [rel(alLado, f, -4.4, -0.55, 1.6), rel(alLado, f, -7, -0.55, 15)], mira: [horizonte, mas(horizonte, 0, 14, 0)] },
    ],
    sucesos: [
      { t: 4.2, accion: 'girar' },
      { t: 6.0, accion: 'mateo' },
      { t: 7.3, accion: 'gafas' },
      { t: 8.7, accion: 'acercarse' },
      { t: 10.4, accion: 'mirar_sol' },
      { t: 15.6, accion: 'victoria' },
    ],
  };
}
