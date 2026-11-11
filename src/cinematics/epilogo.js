// @ts-check
/**
 * Epílogo «La marcha» (24 s), después del amanecer: tambores lejanos; sobre la cresta del monte del
 * este, a contraluz del sol, se encienden cientos de ojos; un ejército de centinelas y espectros baja
 * hacia la cornisa. Mateo: «La gema… los está llamando». Victoria: «¿Cómo saldremos de aquí?».
 * Golpe de la música, negro, «Continuará…». Guion gráfico: docs/GUION_EPILOGO.md.
 *
 * Coordenadas de Three.js; lentes en milímetros. La música (musica_amenaza) sigue estos mismos tiempos.
 * @typedef {import('./timeline.js').Cinematica} Cinematica
 * @typedef {{x: number, y: number, z: number}} V3
 */
import { mas, rel } from './guardian_cines.js';

/** Tiempos que comparten la cinemática, la música y el ejército. */
export const T_EPILOGO = Object.freeze({ ojos: 3.3, marcha: 7.0, dialogo: 11.7, negro: 20.6, continuara: 21.3, fin: 24.0 });

/**
 * @param {V3} victoria  pies de Victoria en el borde de la cornisa
 * @param {V3} f  hacia dónde mira (el sol, el monte del este)
 * @param {V3} mateo  pies de Mateo, a su derecha
 * @param {(t: number) => V3} frente  centro de la primera fila del ejército en el instante t de la cinemática
 * @param {V3} cresta  cumbre del monte por donde aparece el ejército
 * @param {V3} dir  hacia dónde marcha el ejército
 * @param {(x: number, z: number) => number} suelo  altura del terreno (NaN donde no hay)
 * @returns {Cinematica}
 */
export function epilogo(victoria, f, mateo, frente, cresta, dir, suelo) {
  const caraV = mas(victoria, 0, 1.42, 0);
  const caraM = mas(mateo, 0, 1.66, 0);
  const entre = rel(victoria, f, 0, 0.58, 0);   // entre los dos
  // Plano 3: a ras de suelo delante de la primera fila, retrocediendo con ella
  const f3a = frente(7.0);
  const f3b = frente(11.5);
  /** Punto k metros por delante de p en la marcha, h metros sobre el terreno que hay allí (la ladera sube hacia la cresta). */
  const ras = (/** @type {V3} */ p, /** @type {number} */ k, /** @type {number} */ h) => {
    const x = p.x + dir.x * k;
    const z = p.z + dir.z * k;
    const s = suelo(x, z);
    return { x, y: (Number.isFinite(s) ? s : p.y) + h, z };
  };
  // Plano 6: hacia dónde va la primera fila a mitad del plano (la grúa la mira desde detrás de los dos)
  const f6 = frente(19);
  return {
    nombre: 'epilogo',
    planos: [
      // 1. De espaldas, los dos frente al sol: suenan tambores lejanos (avance mínimo)
      { duracion: 3.0, lente: 40, curva: 'lineal', camara: [rel(entre, f, -4.2, 0, 1.55), rel(entre, f, -3.8, 0, 1.55)], mira: [rel(entre, f, 30, 0, 3.5), rel(entre, f, 30, 0, 3.6)] },
      // 2. Teleobjetivo entre los dos hacia la cresta, a contraluz: se encienden los ojos (zum lento)
      { duracion: 4.0, lente: [120, 150], curva: 'lineal', camara: [rel(entre, f, -1.4, 0, 1.75), rel(entre, f, -1.3, 0, 1.75)], mira: [mas(cresta, 0, -1, 0), mas(cresta, 0, -2, 0)] },
      // 3. A ras de suelo, delante de la primera fila: la tropa baja hacia la cámara
      { duracion: 4.5, lente: 24, curva: 'lineal', camara: [ras(f3a, 7, 0.7), ras(f3b, 6.2, 0.75)], mira: [ras(f3a, -6, 2.6), ras(f3b, -6, 2.8)] },
      // 4. Primer plano de Mateo, desde el lado del abismo (contrapicado leve)
      { duracion: 3.0, lente: 65, curva: 'lineal', camara: [rel(caraM, f, 2.2, -0.45, -0.18), rel(caraM, f, 2.1, -0.43, -0.16)], mira: [caraM, caraM] },
      // 5. Primer plano de Victoria: mira el brazalete y luego al frente
      { duracion: 3.0, lente: 65, curva: 'lineal', camara: [rel(caraV, f, 2.0, 0.42, -0.12), rel(caraV, f, 1.9, 0.4, -0.1)], mira: [caraV, caraV] },
      // 6. Grúa que sube detrás de los dos: de espaldas, pequeños, frente al ejército que baja del monte
      { duracion: 6.5, lente: 30, curva: 'sale', camara: [rel(entre, f, -10, 0, 2.0), rel(entre, f, -15, 0, 4.6)], mira: [mas(f6, 0, -7, 0), mas(f6, 0, -5, 0)] },
    ],
    mezclaFinal: 0.01,
    sucesos: [
      { t: 0.0, accion: 'ejercito' },
      { t: 0.0, accion: 'musica' },
      { t: 1.8, accion: 'tension' },
      { t: T_EPILOGO.ojos, accion: 'ojos' },
      { t: T_EPILOGO.dialogo, accion: 'decir', datos: ['mat_epilogo_01', 'vic_epilogo_01'] },
      { t: 14.0, accion: 'brazalete' },
      { t: T_EPILOGO.negro, accion: 'negro' },
      { t: T_EPILOGO.continuara, accion: 'continuara' },
    ],
  };
}
