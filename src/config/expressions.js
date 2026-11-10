// @ts-check
/**
 * Emociones de la cara como mezcla de formas (los nombres coinciden con las shape keys de Blender).
 * Las formas de boca 'vis_*' las controla el habla; aquí solo se usan como parte de una emoción.
 * @type {Readonly<Record<string, Readonly<Record<string, number>>>>}
 */
export const EXPRESIONES = Object.freeze({
  neutral: {},
  alegria: { boca_sonrisa: 1.0, parpado_inf: 0.7, cejas_arriba: 0.35, vis_E: 0.3 },
  determinacion: { cejas_ceno: 1.0, parpado_sup: 0.55, parpado_inf: 0.3, boca_triste: 0.15 },
  sorpresa: { cejas_arriba: 1.0, vis_O: 0.7 },
  tristeza: { cejas_tristes: 1.0, boca_triste: 0.9, parpado_sup: 0.45 },
  miedo: { cejas_tristes: 0.8, cejas_arriba: 0.6, boca_triste: 0.5, vis_E: 0.35 },
  ternura: { cejas_tristes: 0.5, boca_sonrisa: 0.7, parpado_sup: 0.4, parpado_inf: 0.5 },
});

/** Formas que existen en la cabeza de Victoria y Mateo (mismo orden que en Blender). */
export const FORMAS_CARA = Object.freeze([
  'cejas_arriba', 'cejas_ceno', 'cejas_tristes',
  'parpado_sup', 'parpado_inf', 'parpadeo',
  'boca_ancha', 'boca_sonrisa', 'boca_triste',
  'vis_A', 'vis_E', 'vis_I', 'vis_O', 'vis_U', 'vis_MBP',
  'mirada_izq', 'mirada_der',
]);
