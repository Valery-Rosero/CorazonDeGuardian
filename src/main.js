// @ts-check
import './style.css';
import * as THREE from 'three';
import { CAMERA_LIMITES, CAMERA_PROFILES } from './config/camera_profiles.js';
import { EXPRESIONES } from './config/expressions.js';
import { INPUT_MAP } from './config/input_map.js';
import { PALETA } from './config/palette.js';
import { ANIMACION, CARA, PLAYER } from './config/player.js';
import { CamaraTerceraPersona } from './camera/camera_rig.js';
import { cargarModelos } from './core/assets.js';
import { bus, EVENTOS } from './core/event_bus.js';
import { BucleJuego } from './core/game_loop.js';
import { Entrada } from './core/input.js';
import { MundoFisico } from './core/physics_world.js';
import { ajustarAlRedimensionar, crearRenderer } from './core/renderer.js';
import { AnimadorCara } from './player/face_animator.js';
import { ControladorJugador } from './player/player_controller.js';
import { AnimadorProcedural } from './player/procedural_animator.js';
import { PanelCartografa } from './ui/cartographer_panel.js';
import { pantallas, Subtitulos } from './ui/screens.js';
import { crearAmbienteSelva } from './world/environment.js';
import { construirNivel } from './world/level_loader.js';
import { aplicarMaterialesPersonaje, crearRampaToon } from './world/materials.js';
import { SistemaTriggers } from './world/triggers.js';

const params = new URLSearchParams(location.search);
const DEPURACION = params.has('debug') || import.meta.env.DEV;
/** Arranque sin clic ni captura del ratón, para capturas automáticas (solo en depuración). */
const AUTOMATICO = DEPURACION && params.has('auto');

async function iniciar() {
  const lienzo = /** @type {HTMLCanvasElement} */ (document.getElementById('lienzo'));
  const { renderer, calidad } = crearRenderer(lienzo, params.get('calidad'));
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600);
  camara.rotation.order = 'YXZ';
  ajustarAlRedimensionar(renderer, camara);

  const oyente = new THREE.AudioListener();
  camara.add(oyente);
  escena.add(camara);

  const ambiente = crearAmbienteSelva(escena, renderer, calidad);
  const fisica = new MundoFisico();
  const entrada = new Entrada(INPUT_MAP);
  const triggers = new SistemaTriggers();

  const modelos = await cargarModelos(
    { nivel: '/models/nivel_prueba.glb', victoria: '/models/victoria.glb' },
    (f, texto) => pantallas.progreso(f, texto),
  );

  // Nivel
  const nivel = construirNivel(modelos.nivel, escena, fisica, triggers);

  // Victoria: contenedor que mueve el controlador → nodo visual (rebote) → modelo de Blender
  const rampa = crearRampaToon();
  const victoria = new THREE.Group();
  victoria.name = 'victoria_jugador';
  const visual = new THREE.Group();
  victoria.add(visual);
  const modeloVictoria = modelos.victoria.scene;
  visual.add(modeloVictoria);
  escena.add(victoria);
  const materialesVictoria = aplicarMaterialesPersonaje(modeloVictoria, rampa);
  /** @type {THREE.Mesh | null} */
  let cabeza = null;
  modeloVictoria.traverse((o) => {
    const m = /** @type {THREE.Mesh} */ (o);
    if (!m.isMesh) return;
    m.frustumCulled = false;
    m.receiveShadow = true;
    // La cara no proyecta sombras sobre sí misma (nariz, párpados); el resto del cuerpo sí.
    m.castShadow = !o.name.includes('cabeza');
    if (m.morphTargetDictionary && 'parpadeo' in m.morphTargetDictionary) cabeza = m;
  });
  if (!cabeza) throw new Error('victoria.glb no tiene la cabeza con expresiones');

  const cfgJugador = { ...PLAYER };
  const jugador = new ControladorJugador(fisica, entrada, victoria, cfgJugador);
  jugador.colocar(nivel.spawns.jugador ?? new THREE.Vector3(0, 0, 0));
  const animador = new AnimadorProcedural(modeloVictoria, visual, { ...ANIMACION }, cfgJugador);
  const cara = new AnimadorCara(cabeza, EXPRESIONES, { ...CARA });

  // Cámara
  const perfiles = /** @type {Record<string, any>} */ (structuredClone(CAMERA_PROFILES));
  const rig = new CamaraTerceraPersona(camara, document.body, perfiles, { ...CAMERA_LIMITES });
  rig.colisionables = nivel.colisionables;
  camara.rotation.set(-0.22, params.get('vista') === 'frente' ? 0 : Math.PI, 0);

  // Interfaz
  const panel = new PanelCartografa();
  const subtitulos = new Subtitulos();
  let finSubtitulo = -1;
  /** @param {string} texto @param {string} emocion */
  const decir = (texto, emocion) => {
    cara.ponerEmocion(emocion);
    cara.hablar(texto);
    subtitulos.mostrar(texto, 'calido');
    finSubtitulo = -1;
  };
  triggers.alCambiar = (t, entra) => {
    if (t.datos.zona && entra) bus.emitir(EVENTOS.ZONA_CAMBIADA, t.datos.zona);
  };

  const depuracion = DEPURACION
    ? (await import('./debug/debug_panel.js')).crearPanelDepuracion({
        renderer, cfgJugador, camara: rig, cara, decir, emociones: Object.keys(EXPRESIONES),
      })
    : null;

  const dirCamara = new THREE.Vector3();
  // Los triggers se prueban a la altura de la cintura: los pies quedan justo en el borde inferior de las zonas
  const puntoTrigger = new THREE.Vector3();
  let reloj = 0;
  const bucle = new BucleJuego(renderer, {
    fisica: (dt) => fisica.paso(dt),
    sincronizar: () => fisica.sincronizar(),
    logica: (dt, t) => {
      depuracion?.inicio();
      reloj = t;
      jugador.actualizar(dt, camara);
      animador.actualizar(dt, t, jugador);
      cara.actualizar(dt);
      puntoTrigger.copy(jugador.posicion);
      puntoTrigger.y += 0.8;
      triggers.actualizar(puntoTrigger);
      rig.usarPerfil(jugador.corriendo ? 'carrera' : 'exploracion');
    },
    camara: (dt) => {
      rig.actualizar(dt, jugador.posicion);
      ambiente.seguir(jugador.posicion);
    },
    hud: (dt) => {
      camara.getWorldDirection(dirCamara);
      panel.actualizar(dt, triggers.zona, jugador.posicion, -Math.atan2(dirCamara.x, -dirCamara.z));
      if (cara.hablando) {
        subtitulos.actualizar(cara.progreso);
      } else if (finSubtitulo < 0) {
        subtitulos.actualizar(1);
        finSubtitulo = reloj + 1.2;
      } else if (reloj > finSubtitulo) {
        subtitulos.ocultar();
      }
      depuracion?.fin(dt);
    },
    render: () => renderer.render(escena, camara),
    finFotograma: () => {
      entrada.finFotograma();
      if (entrada.pulso('pausa') && rig.controles.isLocked) rig.controles.unlock();
    },
  });
  materialesVictoria.gema.color.set(PALETA.gema_pulso);

  // Inicio y pausa: el primer clic desbloquea el audio y captura el ratón
  bucle.pausado = !AUTOMATICO;
  bucle.iniciar();
  if (AUTOMATICO) {
    pantallas.ocultarInicio();
    document.getElementById('pantalla-carga').classList.add('oculto');
    if (params.has('hablar')) setTimeout(() => decir('Te dije que llegaría antes que tú.', 'ternura'), 400);
    // ?auto&tecla=KeyD,ShiftLeft mantiene teclas pulsadas para capturas automáticas
    for (const codigo of (params.get('tecla') ?? '').split(',').filter(Boolean)) entrada.abajo.add(codigo);
    return;
  }
  pantallas.mostrarInicio();
  pantallas.alHacerClicInicio(() => {
    oyente.context.resume();
    pantallas.ocultarInicio();
    rig.controles.lock();
  });
  pantallas.alHacerClicPausa(() => rig.controles.lock());
  rig.controles.addEventListener('lock', () => {
    bucle.pausado = false;
    pantallas.pausa(false);
  });
  rig.controles.addEventListener('unlock', () => {
    bucle.pausado = true;
    pantallas.pausa(true);
  });
}

iniciar().catch((err) => {
  console.error(err);
  pantallas.error(`No se pudo iniciar: ${err.message}`);
});
