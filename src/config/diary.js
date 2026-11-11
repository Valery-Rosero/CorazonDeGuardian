// @ts-check
/**
 * Páginas del diario de Mateo (sección 3.3). La escritura se degrada: 'tinta' → 'temblor' → 'dorada'.
 * Los códigos coinciden con docs/GUION_DIALOGOS.md.
 */
export const PAGINAS = Object.freeze([
  { n: 1, codigo: 'mat_diario_01', lugar: 'Entrada', estilo: 'tinta',
    texto: 'Día 1. El mapa no mentía. Hay escalones de piedra bajo el musgo. Victoria, si algún día lees esto, perdóname por no esperarte.' },
  { n: 2, codigo: 'mat_diario_02', lugar: 'Cascada', estilo: 'tinta',
    texto: 'Detrás del agua hay un camino. Los constructores amaban el sol: cada piedra mira hacia el este.' },
  { n: 3, codigo: 'mat_diario_03', lugar: 'Puente', estilo: 'tinta',
    texto: 'El puente aguantó mi peso. Apenas. Juraría que las estatuas se mueven cuando no las miro.' },
  { n: 4, codigo: 'mat_diario_04', lugar: 'Santuario', estilo: 'temblor',
    texto: 'Los espejos llevan la luz hasta la puerta. Lo resolví. Detrás hay una voz. Dice mi nombre.' },
  { n: 5, codigo: 'mat_diario_05', lugar: 'Antesala', estilo: 'temblor',
    texto: 'La gema es cálida. Me pide que me quede. Solo un poco más. Solo un poco.' },
  { n: 6, codigo: 'mat_diario_06', lugar: 'Puerta de la arena', estilo: 'dorada',
    texto: 'no la tomes. no salgas. el sol es mío. el sol es MÍO. victoria perdón' },
]);

export const TOTAL_PAGINAS = PAGINAS.length;
