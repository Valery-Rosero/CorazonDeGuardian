// @ts-check
/**
 * Partida guardada (en el navegador, localStorage): se guarda sola al encender un pilar solar, al
 * cambiar de escenario y al leer una página. «Continuar» en el menú la recupera; «Nueva partida» la borra.
 *
 * @typedef {{
 *   version: 1,
 *   pilar: number,           // último pilar solar encendido (selva)
 *   pilares: number[],       // pilares encendidos
 *   punto: string | null,    // punto de reaparición del escenario (ver PUNTOS), o null si es el pilar
 *   poderes: string[],
 *   paginas: number[],
 *   escudo: boolean,         // el escudo ya se tomó del altar del santuario
 *   espejos: boolean,        // el acertijo de los espejos está resuelto (la puerta, abierta)
 *   vistas: string[],        // cinemáticas ya vistas (no se repiten)
 *   tiempo: number,
 *   muertes: number,
 * }} Partida
 */

const CLAVE = 'templo-del-sol-partida';

/**
 * Puntos de reaparición de cada escenario, en el orden de la aventura (los nombres son spawns del nivel):
 * el vestíbulo del santuario, la sala de columnas (al tomar el escudo), la sala de los espejos y la
 * entrada de la arena.
 */
export const PUNTOS = Object.freeze(['santuario', 'debug_4', 'debug_5', 'arena']);

/**
 * ¿Avanza la aventura si el punto de reaparición pasa de `actual` a `nuevo`? (nunca hacia atrás:
 * volver a cruzar el vestíbulo no quita el punto de la arena).
 * @param {string | null} actual @param {string} nuevo
 */
export function avanza(actual, nuevo) {
  return PUNTOS.indexOf(nuevo) > (actual ? PUNTOS.indexOf(actual) : -1);
}

/** @returns {Partida | null} */
export function leerPartida() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    return p && p.version === 1 ? p : null;
  } catch {
    return null;
  }
}

/** @param {Omit<Partida, 'version'>} p */
export function guardarPartida(p) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ version: 1, ...p }));
  } catch {
    /* sin almacenamiento (ventana privada): la partida sigue, solo no se guarda */
  }
}

export function borrarPartida() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que borrar */
  }
}
