// @ts-check
import * as THREE from 'three';

/** El mural vivo: dónde está y cómo suena (sala de los espejos, muro norte, entre el paso y la antorcha). */
export const MURAL = Object.freeze({
  centro: [-3.85, 2.2, 636.14],   // Three.js
  ancho: 3.0,
  alto: 1.69,                     // 16:9
  video: '/videos/leyenda.mp4',
  canto: { referencia: 2.0, maximo: 14, volumen: 0.8 },
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
      map: this.textura, emissive: new THREE.Color('#FFFFFF'), emissiveMap: this.textura, emissiveIntensity: 0.45, roughness: 0.95,
    });
    this.malla = new THREE.Mesh(new THREE.PlaneGeometry(MURAL.ancho, MURAL.alto), material);
    this.malla.name = 'mural_vivo';
    this.malla.position.set(MURAL.centro[0], MURAL.centro[1], MURAL.centro[2]);
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
