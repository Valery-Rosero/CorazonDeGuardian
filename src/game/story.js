// @ts-check
import * as THREE from 'three';
import { brazalete, intro, puente, puertaEspejos } from '../cinematics/story_cines.js';

/**
 * La historia antes del jefe (guion gráfico): la introducción con el mapa del padre, el brazalete,
 * la llegada al puente, la puerta de los espejos y la línea de Victoria al leer la página de la cascada.
 *
 * @typedef {{
 *   cine: import('../cinematics/cinematic_player.js').ReproductorCine,
 *   jugador: import('../player/player_controller.js').ControladorJugador,
 *   animador: import('../player/procedural_animator.js').AnimadorProcedural,
 *   modeloVictoria: THREE.Object3D,
 *   dialogos: import('../ui/dialogue_player.js').Dialogos,
 *   ui: import('../ui/endgame_ui.js').InterfazFinal,
 *   audio: {efecto: (n: string, v?: number) => void},
 *   nivel: {spawns: Record<string, {pos: THREE.Vector3, rumbo: number}>, hints: Record<string, THREE.Vector3>},
 *   rig: {reorientar: (r: number) => void, sacudida: {agregar: (n: number) => void}},
 *   niebla: (factor: number) => void,
 *   alTerminarIntro: () => void,
 * }} ContextoHistoria
 */
export class Historia {
  /** @param {ContextoHistoria} c */
  constructor(c) {
    this.c = c;
    this.vistas = new Set();
    this.mapa = crearMapa();
    this.mapa.visible = false;
    // En el espacio del personaje (los huesos de Blender no tienen sus ejes): +Z es el frente
    c.modeloVictoria.add(this.mapa);
  }

  /** Introducción al pulsar Jugar: Victoria sobre la roca del mirador con el mapa abierto. */
  introduccion() {
    const c = this.c;
    const s = c.nivel.spawns.jugador;
    const cima = c.nivel.hints.piramide;
    if (!s || !cima) { c.alTerminarIntro(); return; }
    c.jugador.colocar(s.pos, s.rumbo);
    c.rig.reorientar(s.rumbo);
    c.jugador.bloqueado = true;
    c.cine.reproducir(intro(s.pos, cima), {
      alSuceso: (/** @type {any} */ e) => {
        if (e.accion === 'mapa') {
          this.mapa.visible = true;
          c.animador.gesto('leer_mapa', 15);
        }
        if (e.accion === 'acorde') c.audio.efecto('pilar_enciende', 0.5);
        // Niebla espesa en los planos aéreos: la pirámide se borra y solo brilla su cima
        if (e.accion === 'niebla') c.niebla(e.datos);
        if (e.accion === 'titulo') c.ui.titulo(e.datos);
        if (e.accion === 'guardar_mapa') this._guardarMapa();
        // El contexto narrado (hace siete años): subtítulo sin personaje, como la leyenda del mural
        if (e.accion === 'narrar') c.dialogos.narrar(e.datos);
      },
      alTerminar: () => {
        c.dialogos.narrar(null);
        this._guardarMapa();
        c.niebla(1);
        c.jugador.bloqueado = false;
        c.alTerminarIntro();
      },
    });
  }

  _guardarMapa() {
    this.mapa.visible = false;
    if (this.c.animador.gestoActual) this.c.animador.gestoActual = null;
  }

  /**
   * El brazalete: la cinemática dirige; `volar` arranca el vuelo del brazalete hacia la muñeca.
   * @param {THREE.Vector3} altar @param {() => void} volar @param {() => void} alTerminar
   */
  brazalete(altar, volar, alTerminar) {
    const c = this.c;
    const v = c.jugador.posicion.clone();
    c.cine.reproducir(brazalete(altar, v), {
      alSuceso: (/** @type {any} */ e) => {
        if (e.accion === 'mirar') c.animador.gesto('mirar_brazalete', 4.3);
        if (e.accion === 'vuela') volar();
        if (e.accion === 'decir') c.dialogos.decir(...e.datos);
      },
      alTerminar,
    });
  }

  /** Primera llegada a la cornisa por el portal de la cascada. */
  llegadaPuente() {
    if (this.vistas.has('puente')) return;
    this.vistas.add('puente');
    const c = this.c;
    const fachada = c.nivel.hints.fachada;
    if (!fachada) return;
    c.jugador.bloqueado = true;
    c.cine.reproducir(puente(c.jugador.posicion.clone(), fachada), {
      alSuceso: (/** @type {any} */ e) => e.accion === 'decir' && c.dialogos.decir(...e.datos),
      alTerminar: () => { c.jugador.bloqueado = false; },
    });
  }

  /**
   * El acertijo de los espejos resuelto: la puerta se abre en cinemática y del otro lado hay una voz.
   * @param {THREE.Vector3} puerta @param {THREE.Vector3} cristal
   * @param {{runas: () => void, abrir: () => void, alTerminar: () => void}} acciones
   */
  puertaEspejos(puerta, cristal, acciones) {
    const c = this.c;
    const v = c.jugador.posicion.clone();
    c.jugador.mirarHacia(Math.atan2(puerta.x - v.x, puerta.z - v.z), 7.1);
    c.jugador.bloqueado = true;
    c.cine.reproducir(puertaEspejos(puerta, cristal, v), {
      alSuceso: (/** @type {any} */ e) => {
        if (e.accion === 'runas') acciones.runas();
        if (e.accion === 'abrir') acciones.abrir();
        if (e.accion === 'decir') c.dialogos.decir(...e.datos);
      },
      alTerminar: () => {
        c.jugador.bloqueado = false;
        acciones.alTerminar();
      },
    });
  }

  /** Al cerrar el diario. @param {number} pagina */
  paginaLeida(pagina) {
    // «Detrás del agua hay un camino». Como siempre, tenías razón.
    if (pagina === 2 && !this.vistas.has('cascada')) {
      this.vistas.add('cascada');
      setTimeout(() => this.c.dialogos.decir('vic_cascada_01'), 600);
    }
  }
}

/**
 * El mapa de Mateo (todo dibujado con código): papel envejecido, la ruta punteada desde la selva
 * hasta la pirámide, el río, la cascada y un sol en el destino. Va delante del pecho de Victoria.
 */
function crearMapa() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 512;
  lienzo.height = 360;
  const g = /** @type {CanvasRenderingContext2D} */ (lienzo.getContext('2d'));
  const papel = g.createLinearGradient(0, 0, 512, 360);
  papel.addColorStop(0, '#E9D6A6');
  papel.addColorStop(1, '#D6BC84');
  g.fillStyle = papel;
  g.fillRect(0, 0, 512, 360);
  // Bordes gastados
  g.strokeStyle = 'rgba(110, 70, 30, 0.35)';
  g.lineWidth = 14;
  g.strokeRect(0, 0, 512, 360);
  // Río y montes
  g.strokeStyle = '#5E86A0';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(40, 330); g.bezierCurveTo(160, 280, 120, 190, 250, 170); g.bezierCurveTo(330, 158, 360, 120, 480, 110);
  g.stroke();
  g.strokeStyle = '#7A5A36';
  g.lineWidth = 3;
  for (const [x, y] of [[90, 120], [130, 90], [380, 260], [430, 230]]) {
    g.beginPath(); g.moveTo(x - 26, y + 18); g.lineTo(x, y - 14); g.lineTo(x + 26, y + 18); g.stroke();
  }
  // Ruta punteada de Mateo
  g.strokeStyle = '#8E2F1C';
  g.lineWidth = 5;
  g.setLineDash([12, 9]);
  g.beginPath();
  g.moveTo(60, 300); g.bezierCurveTo(150, 270, 210, 260, 250, 210); g.bezierCurveTo(290, 160, 330, 120, 410, 78);
  g.stroke();
  g.setLineDash([]);
  // La pirámide con un sol encima
  g.fillStyle = '#7A6A4E';
  g.beginPath(); g.moveTo(385, 92); g.lineTo(410, 52); g.lineTo(435, 92); g.closePath(); g.fill();
  g.strokeStyle = '#C88A1E';
  g.lineWidth = 3;
  g.beginPath(); g.arc(410, 36, 11, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath(); g.moveTo(410 + Math.cos(a) * 15, 36 + Math.sin(a) * 15); g.lineTo(410 + Math.cos(a) * 21, 36 + Math.sin(a) * 21); g.stroke();
  }
  g.fillStyle = '#5A3A22';
  g.font = 'italic 22px Georgia, serif';
  g.fillText('M. S.', 52, 52);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Papel un poco curvado
  const geo = new THREE.PlaneGeometry(0.42, 0.3, 6, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getX(i) / 0.21, 2) * 0.025);
  geo.computeVertexNormals();
  const malla = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  malla.name = 'mapa_mateo';
  // Delante del pecho, a la altura de las manos, con la cara hacia sus ojos
  malla.position.set(0, 1.1, 0.3);
  malla.rotation.set(-2.1, 0, 0);
  return malla;
}
