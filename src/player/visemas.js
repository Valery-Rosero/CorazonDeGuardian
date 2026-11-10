// @ts-check
/**
 * Del texto del subtítulo a formas de boca (lógica pura).
 * Vocales: A, E, I, O, U. M/B/P/V cierran los labios. Espacios y signos: boca en reposo ('R').
 * El resto de consonantes: boca entreabierta ('C').
 */

/** @param {string} letra @returns {'A'|'E'|'I'|'O'|'U'|'M'|'C'|'R'} */
export function visemaDeLetra(letra) {
  const c = letra.toLowerCase();
  if ('aá'.includes(c)) return 'A';
  if ('eé'.includes(c)) return 'E';
  if ('iíy'.includes(c)) return 'I';
  if ('oó'.includes(c)) return 'O';
  if ('uúü'.includes(c)) return 'U';
  if ('mbpv'.includes(c)) return 'M';
  if (c === ' ' || ',.;:!?¡¿…-—«»"\''.includes(c)) return 'R';
  return 'C';
}

/**
 * Programa el habla: una entrada por letra con su inicio y fin en segundos.
 * Se llama una vez por línea de diálogo (nunca en cada fotograma).
 * @param {string} texto
 * @param {{vocal:number, consonante:number, espacio:number, pausa:number}} cfg
 * @returns {{inicio:number, fin:number, visema:string}[]}
 */
export function programarHabla(texto, cfg) {
  const lista = [];
  let t = 0;
  for (const letra of texto) {
    const v = visemaDeLetra(letra);
    let d = cfg.consonante;
    if ('AEIOU'.includes(v)) d = cfg.vocal;
    else if (v === 'R') d = letra === ' ' ? cfg.espacio : cfg.pausa;
    lista.push({ inicio: t, fin: t + d, visema: v });
    t += d;
  }
  return lista;
}

/** Duración total de una línea programada. @param {{fin:number}[]} programa */
export function duracionHabla(programa) {
  return programa.length ? programa[programa.length - 1].fin : 0;
}
