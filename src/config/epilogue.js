// @ts-check
/**
 * Epílogo «La marcha» (después del amanecer): al salir del templo, Victoria y Mateo ven un ejército de
 * centinelas y espectros que marcha hacia ellos. Guion gráfico en docs/GUION_EPILOGO.md.
 */
export const EJERCITO = Object.freeze({
  centinelas: 220,
  espectros: 36,
  columnas: 11,            // centinelas por fila
  separacion: 2.6,         // m entre centinelas (fila y columna)
  desorden: 0.7,           // m de variación de cada uno respecto a su lugar
  velocidad: 1.15,         // m/s de la marcha
  cadencia: 1.6,           // pasos por segundo (96 por minuto: el tempo de la música)
  escala: [0.92, 1.12],    // tamaño de cada centinela
  altura_espectros: [3.5, 7.5],
  /** Los ojos se encienden del fondo hacia delante durante estos segundos. */
  encendido: 3.2,
  /** Tamaño en el mundo del brillo de cada ojo (se ve aun dentro de la niebla). */
  brillo_ojo: 0.95,
});
