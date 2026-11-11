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
  pulso_disparo: '/sounds/pulso_disparo.mp3',
  pulso_impacto: '/sounds/pulso_impacto.mp3',
  escudo_activar: '/sounds/escudo_activar.mp3',
  escudo_bloquear: '/sounds/escudo_bloquear.mp3',
  manipular: '/sounds/manipular.mp3',
  chisporroteo: '/sounds/chisporroteo.mp3',
  brazalete: '/sounds/brazalete.mp3',
  pagina: '/sounds/pagina.mp3',
  losa_mover: '/sounds/losa_mover.mp3',
  esquiva: '/sounds/esquiva.mp3',
  // Día 4: enemigos y santuario
  ambiente_santuario: '/sounds/ambiente_santuario.wav',
  centinela_despierta: '/sounds/centinela_despierta.mp3',
  centinela_aviso: '/sounds/centinela_aviso.mp3',
  centinela_golpe: '/sounds/centinela_golpe.mp3',
  centinela_rompe: '/sounds/centinela_rompe.mp3',
  espectro_carga: '/sounds/espectro_carga.mp3',
  orbe_disparo: '/sounds/orbe_disparo.mp3',
  orbe_impacto: '/sounds/orbe_impacto.mp3',
  espectro_muere: '/sounds/espectro_muere.mp3',
  dano: '/sounds/dano.mp3',
  espejo_girar: '/sounds/espejo_girar.mp3',
  acertijo_resuelto: '/sounds/acertijo_resuelto.mp3',
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
