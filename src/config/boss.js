// @ts-check
/** Guardián del Sol (sección 7), escape (sección 8.3) y estadísticas del final. */

export const GUARDIAN = Object.freeze({
  vida: 300,
  umbral_fase3: 0.35,           // fracción de vida
  nucleo_abierto: { 2: 6, 3: 4 },   // s que el núcleo queda expuesto
  recarga_pilares: { 2: 4, 3: 3 },  // s hasta que los pilares se pueden volver a encender
  furia: 1.4,                   // fase 3: ataques un 40 % más rápidos
  pausa_ataques: { 1: 1.8, 2: 1.5, 3: 1.5 },   // s entre ataques (en la fase 3 se divide por 'furia')
  velocidad: 3.8,               // m/s al acercarse (Victoria camina a 4,5 y corre a 7,5)
  giro: 2.8,                    // rad/s
  distancia_comoda: 8,          // m: más lejos, camina hacia Victoria
  radio_movimiento: 10,         // m desde el centro de la arena
  alto_pecho: 3.6,              // m: donde apuntan los rayos de los pilares
});

/** Ataques (tabla de la sección 7.1). aviso: s de aviso visual y sonoro antes del golpe. */
export const ATAQUES = Object.freeze({
  sismico: { aviso: 0.8, dano: 20, fases: [1, 2, 3], velocidad_anillo: 11, ancho_anillo: 0.9, radio_max: 17 },
  barrido: { aviso: 0.65, dano: 25, fases: [1, 2, 3], alcance: 8.5, angulo: 200, cerca: 9 },
  rayo: { aviso: 1.2, dano: 30, fases: [2, 3], disparo: 0.5, ancho: 0.9, fijar: 0.25 },
  rocas: { aviso: 1.0, dano: 15, fases: [3], cantidad: 7, radio: 1.4, dispersion: 6 },
  invocacion: { aviso: 1.6, dano: 0, fases: [3], espectros: 2 },
});

export const ROCAS = Object.freeze({ pool: 20, altura: 14, radio_min: 0.55, radio_max: 0.95 });

export const ESCAPE = Object.freeze({
  tiempo: 75,                   // s
  rocas_cada: 1.3,              // s entre rocas que caen delante de Victoria
  adelanto: 7,                  // m delante de Victoria donde caen
  // Tablas del puente que faltan en el escape, junto a la cornisa: el salto final (unos 2 m)
  tablas_rotas: ['dyn_tabla_3', 'dyn_tabla_4'],
});
