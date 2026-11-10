// @ts-check
/**
 * Sonidos generados por tools/audio/audio_synth.py en public/sounds/.
 * Los bucles van en .wav (sin silencio al repetir); los efectos cortos, en .mp3.
 */
export const SONIDOS = Object.freeze({
  cascada: '/sounds/cascada.wav',
  antorcha: '/sounds/antorcha.wav',
  ambiente_selva: '/sounds/ambiente_selva.wav',
  portal: '/sounds/portal.mp3',
  checkpoint: '/sounds/checkpoint.mp3',
  flor: '/sounds/flor.mp3',
  tabla_cruje: '/sounds/tabla_cruje.mp3',
  tabla_cae: '/sounds/tabla_cae.mp3',
  derrota: '/sounds/derrota.mp3',
  salto: '/sounds/salto.mp3',
  aterrizaje: '/sounds/aterrizaje.mp3',
  paso_tierra: '/sounds/paso_tierra.mp3',
  paso_piedra: '/sounds/paso_piedra.mp3',
  paso_madera: '/sounds/paso_madera.mp3',
});

/** Volúmenes por categoría (se podrán cambiar en Opciones). */
export const VOLUMEN = Object.freeze({
  general: 1.0,
  musica: 0.7,
  efectos: 0.9,
  ambiente: 0.8,
});

/** Audio posicional (requisito 3). Con el modelo lineal el volumen llega a 0 en 'maximo'. */
export const POSICIONAL = Object.freeze({
  cascada: { referencia: 3, maximo: 25, volumen: 1.0 },
  antorcha: { referencia: 1, maximo: 9, volumen: 0.55 },
  efecto: { referencia: 2, maximo: 18, volumen: 0.9 },
});
