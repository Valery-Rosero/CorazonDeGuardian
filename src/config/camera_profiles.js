// @ts-check
/**
 * Perfiles de cámara (sección 9.2). Distancia y altura en metros; FOV en grados;
 * lateral = desplazamiento hacia el hombro derecho; seguimiento = rapidez con la que la cámara alcanza a Victoria.
 * @typedef {{distancia:number, altura:number, lateral:number, fov:number, seguimiento:number, inclinacion:number}} PerfilCamara
 */

/** @type {Readonly<Record<string, PerfilCamara>>} */
export const CAMERA_PROFILES = Object.freeze({
  exploracion: { distancia: 4.5, altura: 1.6, lateral: 0.55, fov: 70, seguimiento: 10, inclinacion: 0 },
  carrera: { distancia: 5.0, altura: 1.5, lateral: 0.5, fov: 76, seguimiento: 12, inclinacion: 0 },
  plataformas: { distancia: 6.0, altura: 2.8, lateral: 0.3, fov: 68, seguimiento: 9, inclinacion: 20 },
  interior: { distancia: 3.6, altura: 1.4, lateral: 0.5, fov: 66, seguimiento: 11, inclinacion: 0 },
  panoramica: { distancia: 7.5, altura: 3.0, lateral: 0.4, fov: 72, seguimiento: 8, inclinacion: 0 },
  combate: { distancia: 5.2, altura: 1.9, lateral: 0.6, fov: 72, seguimiento: 12, inclinacion: 0 },
  jefe: { distancia: 7.0, altura: 2.6, lateral: 0.6, fov: 74, seguimiento: 10, inclinacion: 0 },
  persecucion: { distancia: 5.8, altura: 1.3, lateral: 0.3, fov: 80, seguimiento: 14, inclinacion: 0 },
});

/** Límites de giro vertical de la cámara (radianes desde el eje vertical). */
export const CAMERA_LIMITES = Object.freeze({
  polar_min: 0.55,
  polar_max: 2.25,
  sensibilidad: 1.0,
  distancia_minima: 0.8,     // si choca con una pared, nunca se acerca más que esto
  margen_colision: 0.25,
  mezcla_perfil: 4,          // rapidez de mezcla entre perfiles
  recentrar_espera: 2.5,     // s sin tocar el ratón antes de volver detrás de Victoria
  recentrar_rapidez: 1.4,
  hint_rapidez: 1.8,         // rapidez con la que la cámara se inclina hacia un punto de interés
  hint_duracion: 2.2,        // s que dura la inclinación
  ocultar_opacidad: 0.28,    // opacidad de lo que tapa a Victoria
  sacudida_maxima: 0.35,     // m
});
