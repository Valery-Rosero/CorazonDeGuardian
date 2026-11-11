// @ts-check
/**
 * Líneas de diálogo del guion (docs/GUION_DIALOGOS.md, sección 3.4 del documento maestro).
 * El código es el nombre del audio en public/sounds/voz/ (voz sintetizada: murmullo, opción A).
 * Las cuatro líneas que eran *propuesta* (brazalete, cascada, puente y voz) se aprobaron el 11/11.
 *
 * quien: 'victoria' | 'mateo' | 'gema'. estilo del subtítulo: Mateo y Victoria en blanco cálido,
 * la Gema en dorado. dentro: Mateo habla desde dentro del Guardián (su cara no se ve).
 */
export const LINEAS = Object.freeze({
  mat_despertar_01: { quien: 'mateo', texto: '¿Victoria…? No… vete… no me deja soltarla…', emocion: 'miedo', duracion: 5.9, dentro: true },
  gem_despertar_01: { quien: 'gema', texto: 'Otra mano que quiere robar el sol.', emocion: 'desprecio', duracion: 2.7 },
  gem_fase2_01: { quien: 'gema', texto: '¡Nadie saldrá de este templo con mi luz!', emocion: 'furia', duracion: 3.2 },
  vic_fase2_01: { quien: 'victoria', texto: '¡Papá, resiste!', emocion: 'determinacion', duracion: 1.6 },
  mat_fase3_01: { quien: 'mateo', texto: 'Hija… el núcleo… rómpelo… no tengas miedo.', emocion: 'dolor', duracion: 5.1, dentro: true },
  mat_derrota_01: { quien: 'mateo', texto: 'Victoria… viniste.', emocion: 'alivio', duracion: 2.1 },
  vic_derrota_01: { quien: 'victoria', texto: 'Te dije que llegaría antes que tú.', emocion: 'ternura', duracion: 2.7 },
  mat_escape_01: { quien: 'mateo', texto: '¡Corre! Estoy justo detrás de ti.', emocion: 'urgencia', duracion: 2.9 },
  vic_brazalete_01: { quien: 'victoria', texto: 'Así que esto buscabas, papá.', emocion: 'ternura', duracion: 2.4 },
  vic_cascada_01: { quien: 'victoria', texto: '«Detrás del agua hay un camino». Como siempre, tenías razón.', emocion: 'alegria', duracion: 5.2 },
  vic_puente_01: { quien: 'victoria', texto: 'Te aguantó a ti… ojalá me aguante a mí.', emocion: 'determinacion', duracion: 3.7 },
  vic_voz_01: { quien: 'victoria', texto: '¿Papá? ¿Eres tú?', emocion: 'sorpresa', duracion: 1.8 },
});

/** Emoción de la cara de Victoria (config/expressions.js) para cada emoción del guion. */
export const CARA_POR_EMOCION = Object.freeze({
  determinacion: 'determinacion', ternura: 'ternura', miedo: 'tristeza', dolor: 'tristeza', alivio: 'alegria',
  urgencia: 'sorpresa', desprecio: 'neutral', furia: 'determinacion', alegria: 'alegria', sorpresa: 'sorpresa',
});

/** Pausa entre dos líneas seguidas (s). */
export const PAUSA_ENTRE_LINEAS = 0.35;
