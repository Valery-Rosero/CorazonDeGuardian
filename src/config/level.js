// @ts-check
/** Valores de los sistemas del escenario (sección 8). */

export const PUENTE = Object.freeze({
  temblor: 0.4,        // s que tiembla una tabla antes de caer
  reaparicion: 3.0,    // s que tarda en volver a su sitio
  amplitud_temblor: 0.035,
  masa_tabla: 4,
});

export const PORTAL = Object.freeze({
  enfriamiento: 3.0,   // s antes de poder volver a usar un portal (evita teletransportes en bucle)
  destello: 0.7,       // s del fundido dorado
  giro: 0.35,          // rad/s del anillo de runas
});

export const CHECKPOINT = Object.freeze({
  brillo_apagado: 0.2,
  brillo_encendido: 3.0,
  rafaga: 60,          // partículas al encenderse
});

export const ESCENARIO = Object.freeze({
  niebla_selva: 0.0045,
  intensidad_entorno: 0.35,
  parpadeo_antorcha: 0.18,
  // Sol de tarde arriba a la izquierda de la cámara que mira por el sendero (hacia -Z), como en las hojas
  // de diseño: caras de la izquierda y de arriba claras, frente en tono medio, derecha en sombra.
  // tools/blender/common.py (SOL) usa la misma dirección para pintar los tonos de cada cara.
  sol_elevacion: 34,
  sol_azimut: 115,
});
