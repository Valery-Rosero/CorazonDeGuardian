// @ts-check
/** Valores iniciales de Victoria (sección 5.2). Ajustables con lil-gui en modo depuración. */
export const PLAYER = Object.freeze({
  velocidad_caminar: 4.5,      // m/s
  velocidad_correr: 7.5,       // m/s
  aceleracion: 32,             // m/s² en el suelo con entrada
  frenado: 42,                 // m/s² en el suelo sin entrada
  aceleracion_aire: 12,        // control en el aire
  altura_salto: 1.6,           // m
  compensacion_amortiguacion: 1.12, // corrige la pérdida por linearDamping al subir
  gravedad_extra_caida: 1.8,   // multiplicador de la gravedad al caer: salto firme
  coyote: 0.12,                // s de gracia al saltar desde un borde
  memoria_salto: 0.12,         // s que se recuerda la tecla de salto
  radio_capsula: 0.28,         // m
  altura_capsula: 1.65,        // m
  masa: 60,                    // kg
  amortiguacion: 0.3,          // linearDamping
  giro: 12,                    // rapidez con la que Victoria gira hacia donde se mueve
});

/** Animación procedural de Victoria. */
export const ANIMACION = Object.freeze({
  paso_caminar: 1.25,          // m recorridos por paso al caminar
  paso_correr: 1.75,           // m por paso al correr
  amplitud_caminar: 0.45,      // rad de balanceo de piernas
  amplitud_correr: 0.85,
  rebote: 0.04,                // m de subida y bajada del cuerpo al andar
  respiracion: 0.02,           // rad
  resorte_rigidez: 60,
  resorte_amortiguacion: 9,
});

/** Cara: parpadeo, mirada y habla. */
export const CARA = Object.freeze({
  parpadeo_min: 2.2,           // s entre parpadeos
  parpadeo_max: 5.0,
  parpadeo_duracion: 0.12,     // s con los ojos cerrados
  mirada_min: 0.9,             // s entre movimientos de ojos
  mirada_max: 3.0,
  vocal: 0.095,                // s por vocal al hablar
  consonante: 0.062,
  espacio: 0.055,
  pausa: 0.23,                 // s en comas y puntos
  suavizado_boca: 24,          // cuanto más alto, más rápida la boca
  suavizado_cara: 9,
  suavizado_parpado: 40,
});
