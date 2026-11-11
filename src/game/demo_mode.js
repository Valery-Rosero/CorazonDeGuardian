// @ts-check
import * as THREE from 'three';

/**
 * Los 8 requisitos del curso (sección 1.1) con el lugar donde mejor se ven.
 * `ir`: un spawn del nivel o una posición de Three.js con el rumbo en grados.
 * @type {{titulo: string, ir: {spawn?: string, pos?: [number, number, number], rumbo?: number}, hecho: string, mira: string, ayudas?: boolean, hud?: boolean}[]}
 */
export const REQUISITOS = [
  {
    titulo: 'Escenario 3D desde Blender', ir: { spawn: 'debug_3' },
    hecho: 'Las tres zonas, los personajes y los props se generan con scripts de Python en Blender y se exportan a .glb (GLTFLoader). Sol direccional con sombras PCF suaves, luz ambiente, SpotLight en el santuario y luces puntuales en las antorchas.',
    mira: 'Las sombras de Victoria, los árboles y las columnas de las ruinas.',
  },
  {
    titulo: 'Navegación', ir: { spawn: 'debug_2' },
    hecho: 'Cámara en tercera persona con PointerLockControls: el ratón gira la vista sin hacer clic. OrbitControls en el modo foto (tecla F) y en la cámara libre de esta demostración.',
    mira: 'Mueve el ratón con la vista capturada; activa «Cámara libre» abajo.',
  },
  {
    titulo: 'Audio 3D', ir: { pos: [0, 0, 60], rumbo: 0 },
    hecho: 'PositionalAudio en la cascada, las antorchas, el núcleo del Guardián y los mecanismos. THREE.Audio global para el portal, los checkpoints, las páginas, los poderes, las voces y la música. Todo el sonido se sintetiza con código.',
    mira: 'Acércate y aléjate de la cascada: el volumen cambia. Cruza el portal: el sonido es global.',
  },
  {
    titulo: 'Triggers', ir: { pos: [0, 0, 79], rumbo: 0 }, ayudas: true,
    hecho: 'Radiales con Vector3.distanceTo (checkpoints, páginas, flores, objetos interactivos, detección de enemigos) y AABB con Box3.containsPoint (portal con espera de 3 s, cambios de zona, zonas de cámara, umbral de la arena, inicio del escape).',
    mira: 'Las cajas y anillos de colores son los triggers. Entra en la cueva: el portal te lleva a la cornisa y espera 3 s antes de volver a funcionar.',
  },
  {
    titulo: 'Partículas', ir: { pos: [2.5, 0, 63], rumbo: -10 },
    hecho: 'THREE.Points con BufferGeometry y Float32Array, gravedad, arrastre y reciclaje: la cascada, el fuego, el polen, las luciérnagas, las chispas del Pulso, el polvo y las brasas. Mezcla aditiva sin escribir profundidad.',
    mira: 'La cascada y su espuma; las antorchas del altar.',
  },
  {
    titulo: 'Físicas (cannon-es)', ir: { pos: [1.5, 0, 0.5], rumbo: 90 },
    hecho: 'Victoria es un cuerpo físico. Esferas rituales con masa y rebote, tablas del puente que caen, fragmentos de los centinelas y del caparazón, rocas del escape. Paso fijo de 1/60 s y sincronización de posición y giro por fotograma.',
    mira: 'Dispara el Pulso solar (clic) a las esferas de piedra: ruedan y rebotan.',
  },
  {
    titulo: 'Interfaz (HUD)', ir: { spawn: 'debug_1' }, hud: true,
    hecho: '«Cuaderno de la cartógrafa»: panel HTML/CSS sobre el canvas con la zona, las coordenadas X/Y/Z en tiempo real y una brújula. Victoria es cartógrafa: el HUD es parte de la historia.',
    mira: 'Arriba a la izquierda: camina y mira cómo cambian las coordenadas y el nombre de la zona.',
  },
  {
    titulo: 'Optimización', ir: { spawn: 'debug_3' },
    hecho: 'Un único bucle. Todo se crea al cargar: grupos (pools) de proyectiles, orbes, fragmentos, rocas y luces; vectores temporales preasignados. Vegetación instanciada, luces puntuales en un grupo fijo, luz del cielo en armónicos esféricos y resolución dinámica.',
    mira: 'Arriba: FPS, llamadas de dibujo y triángulos en tiempo real.',
  },
];

/**
 * Modo demostración (sección 1.4): panel con los 8 requisitos, ayudas visuales, estadísticas y cámara libre.
 */
export class ModoDemo {
  /**
   * @param {{
   *   renderer: THREE.WebGLRenderer,
   *   ir: (destino: {spawn?: string, pos?: [number, number, number], rumbo?: number}) => void,
   *   ayudas: () => THREE.Object3D,
   *   parametros?: (contenedor: HTMLElement) => Promise<unknown>,
   *   camaraLibre: (activa: boolean) => void,
   *   salir: () => void,
   * }} c
   */
  constructor(c) {
    this.c = c;
    this.activo = false;
    this.fps = 60;
    /** @type {THREE.Object3D | null} */
    this.grupoAyudas = null;
    this.panel = document.createElement('aside');
    this.panel.id = 'demo';
    this.panel.className = 'oculto';
    this.panel.innerHTML = `
      <header><span class="demo-etiqueta">Demostración técnica</span><h2>Requisitos del curso</h2></header>
      <p class="demo-stats" id="demo-stats">—</p>
      <ol class="demo-lista">${REQUISITOS.map((r, i) => `<li><button type="button" data-i="${i}"><span>${i + 1}</span>${r.titulo}</button></li>`).join('')}</ol>
      <article class="demo-ficha" id="demo-ficha"><p>Elige un requisito: Victoria va al lugar donde mejor se ve.</p></article>
      <div class="demo-parametros" id="demo-parametros"></div>
      <div class="demo-controles">
        <label><input type="checkbox" id="demo-ayudas" checked> Triggers y colisionadores</label>
        <label><input type="checkbox" id="demo-libre"> Cámara libre (OrbitControls)</label>
        <button type="button" id="demo-salir">Salir de la demostración</button>
      </div>
      <p class="demo-pista">Clic en la escena para jugar · Esc para volver al panel</p>`;
    document.body.appendChild(this.panel);
    this.stats = /** @type {HTMLElement} */ (this.panel.querySelector('#demo-stats'));
    this.ficha = /** @type {HTMLElement} */ (this.panel.querySelector('#demo-ficha'));
    this.panel.querySelectorAll('.demo-lista button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mostrar(Number(/** @type {HTMLElement} */ (b).dataset.i));
    }));
    const ayudas = /** @type {HTMLInputElement} */ (this.panel.querySelector('#demo-ayudas'));
    ayudas.addEventListener('change', () => this._ayudas(ayudas.checked));
    const libre = /** @type {HTMLInputElement} */ (this.panel.querySelector('#demo-libre'));
    libre.addEventListener('change', () => c.camaraLibre(libre.checked));
    this.casillaLibre = libre;
    this.panel.querySelector('#demo-salir')?.addEventListener('click', () => c.salir());
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  activar() {
    this.activo = true;
    this.panel.classList.remove('oculto');
    document.body.classList.add('en-demo');
    this._ayudas(true);
    // lil-gui (semana 2) plegado dentro del panel: solo existe en la demostración
    const cont = this.panel.querySelector('#demo-parametros');
    if (this.c.parametros && cont && !cont.childElementCount) this.c.parametros(/** @type {HTMLElement} */ (cont));
  }

  /** @param {number} i */
  mostrar(i) {
    const r = REQUISITOS[i];
    this.panel.querySelectorAll('.demo-lista button').forEach((b, j) => b.classList.toggle('activo', j === i));
    this.ficha.innerHTML = `<h3>${i + 1}. ${r.titulo}</h3><p>${r.hecho}</p><p class="demo-mira"><b>Cómo verlo:</b> ${r.mira}</p>`;
    this.c.ir(r.ir);
    if (r.ayudas) {
      /** @type {HTMLInputElement} */ (this.panel.querySelector('#demo-ayudas')).checked = true;
      this._ayudas(true);
    }
    const cuaderno = document.getElementById('cartografa');
    cuaderno?.classList.toggle('resaltado', Boolean(r.hud));
  }

  /** @param {boolean} si */
  _ayudas(si) {
    if (si && !this.grupoAyudas) this.grupoAyudas = this.c.ayudas();
    if (this.grupoAyudas) this.grupoAyudas.visible = si;
  }

  /** @param {number} dtReal */
  actualizar(dtReal) {
    if (!this.activo || dtReal <= 0) return;
    this.fps += (1 / dtReal - this.fps) * Math.min(1, dtReal * 3);
    const r = this.c.renderer.info.render;
    this.stats.textContent = `${Math.round(this.fps)} FPS · ${r.calls} llamadas · ${r.triangles.toLocaleString('es')} triángulos`;
  }
}
