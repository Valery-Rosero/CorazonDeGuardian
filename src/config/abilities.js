// @ts-check
/** Poderes del brazalete (sección 5.5) y esquiva (sección 5.2). */

export const PULSO = Object.freeze({
  dano: 25,
  recarga: 0.5,        // s
  velocidad: 30,       // m/s
  alcance: 40,         // m
  radio: 0.16,         // m (cuerpo sensor)
  impulso: 40,         // N·s sobre objetos dinámicos (una esfera de 25 kg sale a ~1,6 m/s)
  pool: 16,
  asistencia: 6,       // grados: el Pulso se corrige hacia un enemigo así de cerca de la retícula
});

export const ESCUDO = Object.freeze({
  duracion: 2.5,       // s
  recarga: 6,          // s
  bloqueo_perfecto: 0.2, // s tras activarlo en los que devuelve los proyectiles
  radio: 1.15,         // m
});

export const MANIPULACION = Object.freeze({
  alcance: 3.5,        // m
  angulo: 40,          // grados desde el centro de la vista
  recarga: 0.35,       // s (evita pulsaciones dobles)
});

export const ESQUIVA = Object.freeze({
  distancia: 4,        // m
  duracion: 0.35,      // s
  invulnerable: 0.25,  // s
  recarga: 0.6,        // s
});

/** Color de la gema del brazalete según el poder (sección 4.5). */
export const COLOR_GEMA = Object.freeze({
  pulso: 'gema_pulso',
  escudo: 'gema_escudo',
  manipulacion: 'gema_manipulacion',
});

/** Mensajes del tutorial del claro de entrada (sección 8.1). */
export const TUTORIAL = Object.freeze({
  inicio: 'WASD para moverte · Shift para correr · Espacio para saltar',
  brazalete: 'El altar brilla. Acércate y pulsa E',
  pulso: 'Clic izquierdo: Pulso solar. Prueba con las esferas de piedra',
  manipulacion: 'E: Manipulación ancestral. Úsala sobre lo que brilla en blanco',
  esquiva: 'C: esquivar',
  escudo: 'Q: Escudo arcano. Bloquea todo el daño unos segundos',
});
