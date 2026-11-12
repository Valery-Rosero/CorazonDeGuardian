// @ts-check
import * as THREE from 'three';

/**
 * El mural vivo: dónde está y cómo suena. Sala de los espejos, centrado en el muro este, entre la ventana
 * del rayo y la esquina del fondo: grande, como un fresco que ocupa media pared.
 */
export const MURAL = Object.freeze({
  centro: [9.9, 2.95, 649.5],     // Three.js: a 10 cm del muro este (x = 10)
  giro: -Math.PI / 2,             // mira hacia el oeste, al centro de la sala
  ancho: 7.2,
  alto: 4.05,                     // 16:9
  video: '/videos/leyenda.mp4',
  canto: { referencia: 2.0, maximo: 14, volumen: 0.8 },
  /** Subtítulos de la leyenda: una línea por escena del video (tools/video/video_leyenda.py, 3,5 s cada una). */
  escena: 3.5,
  leyenda: Object.freeze([
    'Hace mucho, el pueblo del sol vivía de su luz.',
    'Un sacerdote la tomó sin el brazalete y la gema lo volvió su guardián de piedra.',
    'Solo un brazalete de oro pudo sellarla.',
    'Y el sol volvió a nacer por el este.',
  ]),
  /** Hasta esta distancia (m) se leen los subtítulos. */
  lectura: 13,
});

/**
 * Mural vivo de la sala de los espejos (VideoTexture, semanas 3 y 4 del curso): la leyenda de la gema
 * pintada que cobra vida. Con E se despierta y se duerme (vídeo y canto a la vez: el navegador no deja
 * reproducir sonido sin una acción del jugador). El canto es un PositionalAudio: sube al acercarse.
 * Todo se crea al cargar.
 */
export class MuralVivo {
  /**
   * @param {THREE.Scene} escena
   * @param {THREE.AudioListener} oyente
   * @param {AudioBuffer | undefined} canto
   */
  constructor(escena, oyente, canto) {
    this.video = document.createElement('video');
    this.video.src = MURAL.video;
    this.video.loop = true;
    this.video.muted = true;          // el sonido es el canto posicional, no la pista del vídeo
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.crossOrigin = 'anonymous';
    this.textura = new THREE.VideoTexture(this.video);
    this.textura.colorSpace = THREE.SRGBColorSpace;
    // Emisivo: la pintura brilla un poco, como una visión; así también resalta cuando es el objetivo
    const material = new THREE.MeshStandardMaterial({
      map: this.textura, emissive: new THREE.Color('#FFFFFF'), emissiveMap: this.textura, emissiveIntensity: 0.8, roughness: 0.95,
    });
    this.malla = new THREE.Mesh(new THREE.PlaneGeometry(MURAL.ancho, MURAL.alto), material);
    this.malla.name = 'mural_vivo';
    this.malla.position.set(MURAL.centro[0], MURAL.centro[1], MURAL.centro[2]);
    this.malla.rotation.y = MURAL.giro;
    this.malla.userData = { interactuable: 'mural', etiqueta: 'Despertar el mural' };
    escena.add(this.malla);
    // Marco dorado
    const marco = new THREE.Mesh(new THREE.BoxGeometry(MURAL.ancho + 0.24, MURAL.alto + 0.24, 0.06),
      new THREE.MeshStandardMaterial({ color: '#C9952E', roughness: 0.5, metalness: 0.6 }));
    marco.position.set(0, 0, -0.04);
    this.malla.add(marco);
    this.canto = new THREE.PositionalAudio(oyente);
    if (canto) this.canto.setBuffer(canto);
    this.canto.setLoop(true);
    this.canto.setDistanceModel('linear');
    this.canto.setRefDistance(MURAL.canto.referencia);
    this.canto.setMaxDistance(MURAL.canto.maximo);
    this.canto.setVolume(MURAL.canto.volumen);
    this.malla.add(this.canto);
    this.despierto = false;
  }

  /**
   * La línea de la leyenda que corresponde a lo que muestra el video ahora (null si duerme).
   * @returns {string | null}
   */
  subtitulo() {
    if (!this.despierto) return null;
    const i = Math.floor((this.video.currentTime % (MURAL.escena * MURAL.leyenda.length)) / MURAL.escena);
    return MURAL.leyenda[Math.min(MURAL.leyenda.length - 1, i)];
  }

  /** Despierta o duerme el mural (tecla E). @returns {boolean} si quedó despierto */
  alternar() {
    this.despierto = !this.despierto;
    if (this.despierto) {
      this.video.play().catch(() => {});
      if (this.canto.buffer && !this.canto.isPlaying) this.canto.play();
    } else {
      this.video.pause();
      if (this.canto.isPlaying) this.canto.pause();
    }
    this.malla.userData.etiqueta = this.despierto ? 'Dormir el mural' : 'Despertar el mural';
    return this.despierto;
  }
}
