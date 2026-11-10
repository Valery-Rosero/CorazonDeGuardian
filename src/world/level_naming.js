// @ts-check
/**
 * Convención de nombres dentro de los .glb (sección 4.4). Lógica pura: se prueba sin WebGL.
 * GLTFLoader limpia los nombres (quita puntos, cambia espacios por '_'), por eso en Blender
 * nunca se usan puntos en los nombres de objetos.
 */
export const PREFIJOS = Object.freeze([
  'col_box', 'col_cyl', 'col_sph', 'trg_box', 'trg_rad', 'spawn', 'inst', 'cam', 'hint', 'luz', 'emit', 'dyn',
]);

const PATRON = new RegExp(`^(${PREFIJOS.join('|')})_(.+)$`);

/**
 * @param {string} nombre
 * @returns {{tipo: string, clave: string}}  tipo = prefijo o 'visual'
 */
export function clasificarNombre(nombre) {
  const n = nombre.toLowerCase();
  const m = PATRON.exec(n);
  if (!m) return { tipo: 'visual', clave: n };
  return { tipo: m[1], clave: m[2] };
}

/** @param {string} tipo */
export function esColisionador(tipo) {
  return tipo === 'col_box' || tipo === 'col_cyl' || tipo === 'col_sph';
}
