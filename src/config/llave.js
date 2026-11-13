// @ts-check
/**
 * La Llave del Sol (tablero docs/previews/llave_tablero.png; medidas en tools/blender/diseno_llave.py).
 * El pueblo del sol partió la llave en tres y escondió cada tercio en un cofre de la selva. Cada tercio
 * abre un paso: el agua, el portal de la cascada; el jade, la losa de las ruinas; el oro, la puerta del
 * santuario. El portal solo despierta con la llave completa.
 */
import { PALETA } from './palette.js';

/** @typedef {'agua' | 'jade' | 'oro'} Sol */

/** @type {readonly Sol[]} en el orden de sus cerraduras */
export const SOLES = Object.freeze(/** @type {Sol[]} */ (['agua', 'jade', 'oro']));

export const LLAVE = Object.freeze({
  nombre: /** @type {Record<Sol, string>} */ ({ agua: 'sol de agua', jade: 'sol de jade', oro: 'sol de oro' }),
  color: /** @type {Record<Sol, string>} */ ({ agua: PALETA.sol_agua, jade: PALETA.sol_jade, oro: PALETA.sol_oro }),
  /** Qué abre cada tercio */
  cerradura: /** @type {Record<Sol, string>} */ ({ agua: 'el portal de la cascada', jade: 'la losa de las ruinas', oro: 'la puerta del santuario' }),
  /** Objeto del nivel que cierra cada tercio (la losa y la puerta se hunden; el agua despierta el portal) */
  objeto: /** @type {Record<Sol, string>} */ ({ agua: 'portal_cascada', jade: 'dyn_losa_1', oro: 'dyn_puerta_santuario' }),
  // Tiempos de las animaciones (segundos)
  tapa: 0.9,          // la tapa del cofre se abre
  subir: 0.9,         // el tercio sube del cofre
  flotar: 0.7,        // gira en el aire antes de volar
  volar: 0.75,        // del cofre (o del hueco) a la mano, y de la mano al hueco
  encender: 0.8,      // el tercio colocado se enciende antes de que la piedra se hunda
  altura: 1.1,        // cuánto sube sobre el cofre
  crecer: 1.8,        // escala del tercio mientras flota sobre el cofre
  brilloTercio: 0.12, // fracción del brillo del oro de los frisos que conserva cada tercio
  giro: 2.6,          // vueltas por segundo mientras flota (radianes por segundo)
  // El arco de runas de la cascada
  runasDormidas: 0.06,
  runasDespiertas: 1.6,
  giroDormido: 0.08,  // radianes por segundo del arco dormido (el despierto gira con PORTAL.giro)
  haz: 1,             // intensidad del haz de luz de un cofre cerrado
  // El aviso del portal sin la llave completa no se repite antes de este tiempo
  avisoPortal: 6,
});
