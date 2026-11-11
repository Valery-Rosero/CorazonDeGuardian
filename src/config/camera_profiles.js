// @ts-check
/**
 * Perfiles de cámara (sección 9.2). Distancia y altura en metros; FOV en grados;
 * lateral = desplazamiento hacia el hombro derecho; seguimiento = rapidez con la que la cámara alcanza a Victoria.
 * @typedef {{distancia:number, altura:number, lateral:number, fov:number, seguimiento:number, inclinacion:number}} PerfilCamara
 */

/** @type {Readonly<Record<string, PerfilCamara>>} */
export const CAMERA_PROFILES = Object.freeze({
  exploracion: { distancia: 4.4, altura: 1.75, lateral: 0.62, fov: 70, seguimiento: 10, inclinacion: 0 },
  carrera: { distancia: 5.0, altura: 1.5, lateral: 0.5, fov: 76, seguimiento: 12, inclinacion: 0 },
  plataformas: { distancia: 6.0, altura: 2.8, lateral: 0.3, fov: 68, seguimiento: 9, inclinacion: 20 },
  interior: { distancia: 3.6, altura: 1.4, lateral: 0.5, fov: 66, seguimiento: 11, inclinacion: 0 },
  panoramica: { distancia: 7.5, altura: 3.0, lateral: 0.4, fov: 72, seguimiento: 8, inclinacion: 0 },
  combate: { distancia: 5.2, altura: 1.9, lateral: 0.6, fov: 72, seguimiento: 12, inclinacion: 0 },
  jefe: { distancia: 7.0, altura: 2.6, lateral: 0.6, fov: 74, seguimiento: 10, inclinacion: 0 },
  persecucion: { distancia: 5.8, altura: 1.3, lateral: 0.3, fov: 80, seguimiento: 14, inclinacion: 0 },
  // Apuntar (clic derecho mantenido): sobre el hombro derecho, más cerca y con menos campo
  apuntar: { distancia: 2.5, altura: 1.6, lateral: 0.78, fov: 58, seguimiento: 18, inclinacion: 0 },
});

/** Límites de giro vertical de la cámara (radianes desde el eje vertical). */
export const CAMERA_LIMITES = Object.freeze({
  polar_min: 0.55,
  polar_max: 2.25,
  sensibilidad: 1.0,
  distancia_minima: 0.8,     // si choca con una pared, nunca se acerca más que esto
  margen_colision: 0.25,
  mezcla_perfil: 4,          // rapidez de mezcla entre perfiles
  recentrar_espera: 2.5,     // s sin tocar el ratón antes de volver detrás de Victoria (si está activado en Opciones)
  recentrar_rapidez: 1.4,
  recentrar_duracion: 0.35,  // s que tarda la tecla R en dejar la cámara detrás de Victoria
  inclinacion_defecto: -0.08, // rad: casi horizontal, para ver hacia dónde va Victoria
  radio_camara: 0.3,         // m: la cámara se trata como una esfera (cinco rayos) para no meterse en nada
  alejar_rapidez: 4,         // m/s con los que vuelve a su distancia cuando deja de haber obstáculo
  altura_minima: 0.35,       // m sobre los pies de Victoria: nunca por debajo del suelo
  anticipacion: 0.7,         // m que la cámara mira por delante de Victoria al correr
  sensibilidad_apuntar: 0.6, // al apuntar el ratón gira más despacio: más precisión
  hint_rapidez: 1.8,         // rapidez con la que la cámara se inclina hacia un punto de interés
  hint_duracion: 2.2,        // s que dura la inclinación
  ocultar_opacidad: 0.28,    // opacidad de lo que tapa a Victoria
  sacudida_maxima: 0.35,     // m
});
