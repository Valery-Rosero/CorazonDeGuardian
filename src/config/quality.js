// @ts-check
/**
 * Niveles de calidad (sección 14.3). El equipo de referencia (Intel Iris Xe) usa 'baja' por defecto.
 * @typedef {{pixelRatioMax:number, sombras:number, antialias:boolean, bloom:boolean, profundidad:boolean, vegetacion:number, particulas:number}} Calidad
 */

/** @type {Readonly<Record<string, Calidad>>} */
export const QUALITY = Object.freeze({
  baja: { pixelRatioMax: 1, sombras: 1024, antialias: false, bloom: false, profundidad: false, vegetacion: 0.4, particulas: 0.6 },
  media: { pixelRatioMax: 1.5, sombras: 2048, antialias: true, bloom: true, profundidad: false, vegetacion: 0.7, particulas: 0.85 },
  alta: { pixelRatioMax: 2, sombras: 2048, antialias: true, bloom: true, profundidad: true, vegetacion: 1.0, particulas: 1.0 },
});

export const CALIDAD_POR_DEFECTO = 'media';
