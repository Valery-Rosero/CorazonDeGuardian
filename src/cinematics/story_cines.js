// @ts-check
/**
 * Cinemáticas de la historia antes del jefe (guion gráfico y sección 9.4): introducción, el brazalete,
 * la Llave del Sol en el pedestal de la cascada, la llegada al puente y la puerta de los espejos. Coordenadas de Three.js; lentes en milímetros.
 * @typedef {import('./timeline.js').Cinematica} Cinematica
 * @typedef {{x: number, y: number, z: number}} V3
 */
import { hacia, mas, rel } from './guardian_cines.js';

/**
 * Introducción (15 s): el mundo antes que ella; después Victoria sola con el mapa de su padre. Dos líneas
 * narradas dan el contexto: Mateo entró en la selva hace siete años y no volvió.
 * @param {V3} victoria  pies de Victoria sobre la roca del mirador
 * @param {V3} cima  cima dorada de la pirámide
 * @returns {Cinematica}
 */
export function intro(victoria, cima) {
  const f = hacia(victoria, cima);
  return {
    nombre: 'intro',
    planos: [
      // 1. Gran plano general aéreo sobre el dosel (dentro de la selva): travelling hacia la pirámide
      { duracion: 4, lente: 24, curva: 'lineal', camara: [rel(victoria, f, -3, 0, 21), rel(victoria, f, 27, 0, 20)], mira: [mas(cima, 0, -40, 0), mas(cima, 0, -38, 0)] },
      // 2. La cima dorada asoma sobre la niebla (tele)
      { duracion: 3, lente: [100, 115], curva: 'lineal', camara: [rel(victoria, f, 30, 0.5, 24), rel(victoria, f, 32, 0.5, 24)], mira: [mas(cima, 0, -6, 0), mas(cima, 0, -6, 0)] },
      // 3. Plano medio de espaldas en contrapicado (cámara a la altura de sus rodillas): Victoria en el
      //    tercio izquierdo y la cima dorada junto a su cabeza
      { duracion: 4, lente: 35, curva: 'lineal', camara: [rel(victoria, f, -3.3, 0.55, 0.3), rel(victoria, f, -3.1, 0.52, 0.32)], mira: [rel(victoria, f, 6.7, 0.55, 3.36), rel(victoria, f, 6.9, 0.52, 3.4)] },
      // 4. Grúa ascendente: sube desde Victoria y descubre la selva hasta la pirámide; título
      { duracion: 4, lente: 28, curva: 'entra', camara: [rel(victoria, f, -3.1, 0.52, 0.35), rel(victoria, f, -10, 1.5, 16)], mira: [mas(cima, 0, -60, 0), mas(cima, 0, -30, 0)] },
    ],
    mezclaFinal: 1.6,
    sucesos: [
      { t: 0.0, accion: 'mapa' },
      { t: 0.0, accion: 'niebla', datos: 2.2 },
      { t: 0.5, accion: 'narrar', datos: 'Hace siete años, el cartógrafo Mateo Solano entró en esta selva buscando el Templo del Sol.' },
      { t: 5.6, accion: 'narrar', datos: 'Nunca volvió. Su hija tardó siete años en terminar el mapa que él dejó a medias.' },
      { t: 10.9, accion: 'narrar', datos: null },
      { t: 4.0, accion: 'niebla', datos: 1.5 },
      { t: 4.4, accion: 'acorde' },
      { t: 7.0, accion: 'niebla', datos: 1 },
      { t: 11.8, accion: 'titulo', datos: 'El Corazón del Guardián' },
      { t: 14.8, accion: 'guardar_mapa' },
    ],
  };
}

/**
 * El brazalete (7,4 s): el altar bajo un único haz de sol; el brazalete vuela a su muñeca.
 * @param {V3} altar  pie del altar
 * @param {V3} victoria  donde está Victoria (mirando al altar)
 * @returns {Cinematica}
 */
export function brazalete(altar, victoria) {
  const f = hacia(victoria, altar);   // Victoria mira al altar
  const sobre = mas(altar, 0, 1.4, 0);
  // Travelling circular de 90° alrededor del altar, empezando a la izquierda de Victoria
  const arco = [0, 0.33, 0.66, 1].map((u) => {
    const a = Math.atan2(-f.x, -f.z) - 1.1 + u * (Math.PI / 2);
    return { x: altar.x + Math.sin(a) * 5.4, y: altar.y + 2.0, z: altar.z + Math.cos(a) * 5.4 };
  });
  return {
    nombre: 'brazalete',
    planos: [
      { duracion: 3, lente: 35, curva: 'lineal', camara: arco, mira: [sobre, sobre] },
      // Plano detalle: el brazalete vuela hacia la muñeca derecha
      { duracion: 1.6, lente: 85, camara: [rel(victoria, f, 1.55, 0.95, 1.2), rel(victoria, f, 1.45, 0.9, 1.18)], mira: [rel(victoria, f, 0.32, 0.16, 1.15), rel(victoria, f, 0.3, 0.15, 1.15)] },
      // Primer plano: la cara de Victoria desde el lado del altar, un poco desde abajo (se ve bajo el ala)
      { duracion: 2.8, lente: 65, curva: 'sale', camara: [rel(victoria, f, 2.4, 0.3, 1.2), rel(victoria, f, 2.25, 0.28, 1.2)], mira: [mas(victoria, 0, 1.3, 0), mas(victoria, 0, 1.3, 0)] },
    ],
    sucesos: [
      { t: 2.7, accion: 'mirar' },
      { t: 3.0, accion: 'vuela' },
      { t: 4.7, accion: 'decir', datos: ['vic_brazalete_01'] },
    ],
  };
}

/**
 * La llave (7,2 s, tablero docs/previews/llave_tablero.png): los tres tercios salen de la mano de Victoria
 * y se juntan sobre el atril; la llave completa mira al arco de runas, que se enciende; el tercio de agua
 * baja al atril y los otros dos vuelven a ella.
 * @param {V3} victoria  frente al atril, mirándolo
 * @param {V3} llave  donde se arma la llave (sobre el atril)
 * @param {V3} arco  centro del arco de runas de la cascada
 * @returns {Cinematica}
 */
export function llave(victoria, llave, arco) {
  const f = hacia(victoria, llave);    // Victoria mira al atril
  const g = hacia(llave, arco);        // la llave mira al arco
  const h = hacia(arco, victoria);     // desde el fondo de la cueva hacia ella
  const pecho = mas(victoria, 0, 1.35, 0);
  return {
    nombre: 'llave',
    planos: [
      // 1. Plano americano de perfil desde la entrada de la cueva: Victoria y el atril; al fondo, el arco dormido
      { duracion: 2.4, lente: 35, curva: 'lineal', camara: [rel(victoria, f, 0.7, -4.3, 1.5), rel(victoria, f, 0.75, -3.9, 1.48)], mira: [rel(victoria, f, 0.7, 0, 1.25), rel(victoria, f, 0.75, 0, 1.35)] },
      // 2. Detalle desde el lado del arco: la llave completa gira y mira al arco; la luz de la entrada detrás
      { duracion: 1.8, lente: 70, camara: [rel(llave, g, 2.7, 0.25, -0.18), rel(llave, g, 2.5, 0.2, -0.15)], mira: [llave, llave] },
      // 3. General desde el fondo de la cueva: el arco encendido delante, Victoria y el atril, la salida
      { duracion: 3.0, lente: 24, curva: 'sale', camara: [rel(arco, h, -2.3, 0.6, 1.6), rel(arco, h, -2.1, 0.55, 1.55)], mira: [mas(pecho, 0, -0.3, 0), mas(pecho, 0, -0.25, 0)] },
    ],
    mezclaFinal: 1.2,
    sucesos: [
      { t: 0.25, accion: 'armar' },
      { t: 2.6, accion: 'runas' },
      { t: 4.4, accion: 'asentar' },
      { t: 4.65, accion: 'decir', datos: ['vic_llave_01'] },
    ],
  };
}

/**
 * Llegada al puente (4,9 s): picado casi cenital sobre Victoria que se inclina por el eje del puente hasta
 * la fachada, centrada. (Detrás de la cornisa el risco sube a 26 m: no hay un punto que vea a la vez a
 * Victoria abajo y la fachada arriba, así que el plano se mueve de una a otra.)
 * @param {V3} victoria  en la cornisa, al llegar por el portal
 * @param {V3} fachada  la fachada del pórtico al otro lado
 * @returns {Cinematica}
 */
export function puente(victoria, fachada) {
  const f = hacia(victoria, fachada);
  return {
    nombre: 'puente',
    planos: [
      // Picado casi cenital sobre Victoria al borde del vacío (8,5 m por encima, delante del risco); la cámara
      // se inclina por el puente hasta la fachada, centrada: de la vulnerabilidad al destino
      { duracion: 4.9, lente: 28, curva: 'suave', retener: 1.6, camara: [rel(victoria, f, -1.6, 0, 8.5), rel(victoria, f, -1.3, 0, 10)], mira: [mas(victoria, 0, 0.9, 0), mas(fachada, 0, -2, 0)] },
    ],
    mezclaFinal: 1.4,
    sucesos: [{ t: 0.8, accion: 'decir', datos: ['vic_puente_01'] }],
  };
}

/**
 * La puerta de los espejos (7,7 s): el rayo llega al cristal, las runas se encienden, la puerta se hunde;
 * del otro lado, una voz.
 * @param {V3} puerta  pie de la puerta (centro)
 * @param {V3} cristal  el cristal solar sobre ella
 * @param {V3} victoria
 * @returns {Cinematica}
 */
export function puertaEspejos(puerta, cristal, victoria) {
  const n = hacia(puerta, victoria);   // de la puerta hacia la sala
  const centro = mas(puerta, 0, 1.6, 0);
  const caraV = mas(victoria, 0, 1.36, 0);   // un poco bajo los ojos: quedan en el tercio de arriba
  const hv = hacia(victoria, puerta);
  return {
    nombre: 'puerta',
    planos: [
      // 1 y 2. Plano fijo frontal en contrapicado
      { duracion: 2.5, lente: 28, camara: [rel(puerta, n, 6.5, 0, 0.45), rel(puerta, n, 6.4, 0, 0.45)], mira: [mas(cristal, 0, -0.6, 0), mas(cristal, 0, -0.7, 0)] },
      { duracion: 2.0, lente: 28, camara: [rel(puerta, n, 6.4, 0, 0.45), rel(puerta, n, 6.3, 0, 0.45)], mira: [centro, centro], sacudida: 0.05 },
      // 3. Primer plano de Victoria desde el lado de la puerta
      { duracion: 3.2, lente: 65, curva: 'lineal', camara: [rel(victoria, hv, 1.9, -0.25, 1.38), rel(victoria, hv, 1.75, -0.23, 1.38)], mira: [caraV, caraV] },
    ],
    sucesos: [
      { t: 0.2, accion: 'runas' },
      { t: 2.5, accion: 'abrir' },
      { t: 4.2, accion: 'susurro' },
      { t: 5.6, accion: 'decir', datos: ['vic_voz_01'] },
    ],
  };
}
