// @ts-check
/** Enemigos (sección 6) y acertijo de los espejos (sección 8.2). */

export const CENTINELA = Object.freeze({
  vida: 75,                // 3 pulsos
  dano: 20,
  vision: 12,              // m
  angulo_vision: 110,      // grados (cono completo)
  espera_alerta: 0.5,      // s con el ojo dorado antes de perseguir
  velocidad: 4,            // m/s
  velocidad_regreso: 2.2,  // m/s al volver a su puesto
  alcance_ataque: 2.2,     // m
  aviso_ataque: 0.6,       // s con los brazos en alto
  radio_golpe: 2.6,        // m: el golpe al suelo alcanza hasta aquí
  recuperacion: 0.8,       // s vulnerable tras el golpe
  aturdido: 0.3,           // s
  olvido: 4,               // s sin verte antes de volver
  radio: 0.75,             // m (cápsula física)
  alto: 2.3,               // m
  masa: 220,               // kg
  fragmentos_vida: 3,      // s antes de que desaparezcan las piezas
  rodeo: 1.6,              // m que mira a los lados para esquivar obstáculos
});

export const ESPECTRO = Object.freeze({
  vida: 50,                // 2 pulsos
  dano: 15,
  deteccion: 18,           // m
  distancia_min: 8,        // m
  distancia_max: 12,       // m
  velocidad: 2.6,          // m/s
  carga: 0.8,              // s brillando antes de disparar
  recarga: 2.5,            // s entre disparos
  altura: 0.5,             // m sobre el suelo
  ondulacion: 0.18,        // m de subida y bajada
  radio: 0.45,             // m (esfera de impacto: la máscara)
  disolver: 1.2,           // s que tarda en disolverse
});

export const ORBE = Object.freeze({
  velocidad: 9,            // m/s
  radio: 0.28,             // m
  vida: 4,                 // s
  pool: 12,
});

/** Acertijo de los espejos solares (sección 8.2). */
export const ESPEJOS = Object.freeze({
  pasos: 8,                // 8 orientaciones de 45°
  largo: 1.4,              // m de la placa reflectante
  rebotes: 6,
  radio_cristal: 0.6,      // m
  ayuda_tras: 90,          // s sin resolver antes de la pista
  ayuda: 'El mural dibuja la ruta del sol: de la ventana al oeste, luego al sur, al este y al sur otra vez.',
});
