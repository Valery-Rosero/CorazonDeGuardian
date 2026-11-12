// @ts-check
/**
 * Líneas de diálogo del guion (docs/GUION_DIALOGOS.md, sección 3.4 del documento maestro).
 * Los personajes no tienen voz (11/11): cada línea es un subtítulo con su duración y la boca de quien habla.
 * Reescrito el 12/11: Mateo desapareció hace siete años; Victoria, cartógrafa adulta, le dice «Mateo» con la
 * distancia de esos años y solo lo llama «papá» una vez, cuando lo descubre dentro del Guardián.
 *
 * quien: 'victoria' | 'mateo' | 'gema'. estilo del subtítulo: Mateo y Victoria en blanco cálido,
 * la Gema en dorado. dentro: Mateo habla desde dentro del Guardián (su cara no se ve).
 */
export const LINEAS = Object.freeze({
  mat_despertar_01: { quien: 'mateo', texto: '¿Victoria…? No… vete… no me deja soltarla…', emocion: 'miedo', duracion: 5.9, dentro: true },
  gem_despertar_01: { quien: 'gema', texto: 'Otra mano que quiere robar el sol.', emocion: 'desprecio', duracion: 2.7 },
  gem_fase2_01: { quien: 'gema', texto: '¡Nadie saldrá de este templo con mi luz!', emocion: 'furia', duracion: 3.2 },
  vic_fase2_01: { quien: 'victoria', texto: '¡Aguanta, papá!', emocion: 'determinacion', duracion: 1.6 },
  mat_fase3_01: { quien: 'mateo', texto: 'Victoria… el núcleo… rómpelo. No dudes.', emocion: 'dolor', duracion: 5.1, dentro: true },
  mat_derrota_01: { quien: 'mateo', texto: '¿Victoria…? ¿Cuánto tiempo…?', emocion: 'alivio', duracion: 2.1 },
  vic_derrota_01: { quien: 'victoria', texto: 'Siete años. Pero te encontré.', emocion: 'ternura', duracion: 2.7 },
  // Qué protege el Guardián: la gema se queda con quien la toma sin el brazalete y lo vuelve su guardián
  mat_derrota_02: { quien: 'mateo', texto: 'La toqué sin el brazalete… y se quedó conmigo.', emocion: 'dolor', duracion: 2.8 },
  mat_escape_01: { quien: 'mateo', texto: '¡Corre! Estoy justo detrás de ti.', emocion: 'urgencia', duracion: 2.9 },
  vic_brazalete_01: { quien: 'victoria', texto: 'Siete años detrás de esto, Mateo.', emocion: 'ternura', duracion: 2.4 },
  vic_cascada_01: { quien: 'victoria', texto: '«Detrás del agua hay un camino». Lo anoto en el mapa: entrada oculta.', emocion: 'determinacion', duracion: 5.2 },
  vic_puente_01: { quien: 'victoria', texto: 'Si te aguantó a ti hace siete años, me aguanta a mí.', emocion: 'determinacion', duracion: 3.7 },
  vic_voz_01: { quien: 'victoria', texto: '¿Mateo…?', emocion: 'sorpresa', duracion: 1.8 },
  // Epílogo «La marcha» (11/11)
  mat_epilogo_01: { quien: 'mateo', texto: 'La gema… los está llamando.', emocion: 'miedo', duracion: 2.6 },
  vic_epilogo_01: { quien: 'victoria', texto: '¿Cómo saldremos de aquí?', emocion: 'miedo', duracion: 1.9 },
});

/** Emoción de la cara de Victoria (config/expressions.js) para cada emoción del guion. */
export const CARA_POR_EMOCION = Object.freeze({
  determinacion: 'determinacion', ternura: 'ternura', miedo: 'tristeza', dolor: 'tristeza', alivio: 'alegria',
  urgencia: 'sorpresa', desprecio: 'neutral', furia: 'determinacion', alegria: 'alegria', sorpresa: 'sorpresa',
});

/** Pausa entre dos líneas seguidas (s). */
export const PAUSA_ENTRE_LINEAS = 0.35;
