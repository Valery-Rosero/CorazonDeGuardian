// @ts-check
import './style.css';
import * as THREE from 'three';
import { POSICIONAL, SONIDOS } from './config/audio.js';
import { CAMERA_LIMITES, CAMERA_PROFILES } from './config/camera_profiles.js';
import { EXPRESIONES } from './config/expressions.js';
import { INPUT_MAP } from './config/input_map.js';
import { CHECKPOINT, PORTAL, PUENTE } from './config/level.js';
import { PALETA } from './config/palette.js';
import { ANIMACION, CARA, PLAYER, VIDA } from './config/player.js';
import { CamaraTerceraPersona } from './camera/camera_rig.js';
import { Oclusion } from './camera/occlusion.js';
import { cargarModelos } from './core/assets.js';
import { cargarSonidos, GestorAudio } from './core/audio_manager.js';
import { bus, EVENTOS } from './core/event_bus.js';
import { BucleJuego } from './core/game_loop.js';
import { Entrada } from './core/input.js';
import { MundoFisico } from './core/physics_world.js';
import { ajustarAlRedimensionar, crearRenderer } from './core/renderer.js';
import { crearParticulasDeEmisor, crearRafagas, rafagaEn } from './fx/particle_presets.js';
import { texturaPunto } from './fx/particles.js';
import { Portales } from './interaction/portal.js';
import { AnimadorCara } from './player/face_animator.js';
import { Vida } from './player/health.js';
import { ControladorJugador } from './player/player_controller.js';
import { AnimadorProcedural } from './player/procedural_animator.js';
import { PanelCartografa } from './ui/cartographer_panel.js';
import { Hud } from './ui/hud.js';
import { pantallas, Subtitulos } from './ui/screens.js';
import { Puente } from './world/bridge.js';
import { Checkpoints } from './world/checkpoints.js';
import { crearAmbienteSelva, crearLucesNivel } from './world/environment.js';
import { construirNivel } from './world/level_loader.js';
import { aplicarMaterialesPersonaje, crearRampaToon } from './world/materials.js';
import { uTiempo } from './world/shaders.js';
import { SistemaTriggers } from './world/triggers.js';

const params = new URLSearchParams(location.search);
const DEPURACION = params.has('debug') || import.meta.env.DEV;
/** Arranque sin clic ni captura del ratón, para capturas automáticas (solo en depuración). */
const AUTOMATICO = DEPURACION && params.has('auto');

/**
 * Prepara el modelo de Victoria: materiales toon, sombras y la cabeza con expresiones.
 * @param {THREE.Object3D} modelo
 * @param {THREE.Texture} rampa
 */
function prepararVictoria(modelo, rampa) {
  const materiales = aplicarMaterialesPersonaje(modelo, rampa);
  /** @type {THREE.Mesh | null} */
  let cabeza = null;
  modelo.traverse((o) => {
    const m = /** @type {THREE.Mesh} */ (o);
    if (!m.isMesh) return;
    m.frustumCulled = false;
    m.receiveShadow = true;
    // La cara no proyecta sombras sobre sí misma (nariz, párpados); el resto del cuerpo sí.
    m.castShadow = !o.name.includes('cabeza');
    if (m.morphTargetDictionary && 'parpadeo' in m.morphTargetDictionary) cabeza = m;
  });
  if (!cabeza) throw new Error('victoria.glb no tiene la cabeza con expresiones');
  return { materiales, cabeza };
}

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

  // ---------------- Carga
  const [modelos, buffers] = await Promise.all([
    cargarModelos({ zona: '/models/zona_1_selva.glb', victoria: '/models/victoria.glb' }, (f, texto) => pantallas.progreso(f * 0.85, texto)),
    cargarSonidos(SONIDOS),
  ]);
  pantallas.progreso(0.95, 'Despertando la selva…');

  const nivel = construirNivel(modelos.zona, escena, fisica, triggers, { vegetacion: calidad.vegetacion });
  const luces = crearLucesNivel(escena, nivel.luces);

  // ---------------- Victoria
  const rampa = crearRampaToon();
  const victoria = new THREE.Group();
  victoria.name = 'victoria_jugador';
  const visual = new THREE.Group();
  victoria.add(visual);
  const modeloVictoria = modelos.victoria.scene;
  visual.add(modeloVictoria);
  escena.add(victoria);
  const { materiales: matVictoria, cabeza } = prepararVictoria(modeloVictoria, rampa);
  matVictoria.gema.color.set(PALETA.gema_pulso);

  const cfgJugador = { ...PLAYER };
  const jugador = new ControladorJugador(fisica, entrada, victoria, cfgJugador);
  const animador = new AnimadorProcedural(modeloVictoria, visual, { ...ANIMACION }, cfgJugador);
  const cara = new AnimadorCara(cabeza, EXPRESIONES, { ...CARA });
  const vida = new Vida(VIDA.maxima, VIDA.invulnerable_tras_dano);

  // ---------------- Cámara
  const perfiles = structuredClone(/** @type {any} */ (CAMERA_PROFILES));
  const rig = new CamaraTerceraPersona(camara, document.body, perfiles, { ...CAMERA_LIMITES });
  rig.colisionables = nivel.colisionables;
  const oclusion = new Oclusion(nivel.ocluibles, CAMERA_LIMITES.ocultar_opacidad);

  const inicio = nivel.spawns.jugador;
  jugador.colocar(inicio.pos, inicio.rumbo);
  rig.reorientar(params.get('vista') === 'frente' ? inicio.rumbo + Math.PI : inicio.rumbo);

  // ---------------- Audio (requisito 3)
  const audio = new GestorAudio(oyente, buffers, escena);
  audio.bucleGlobal('ambiente_selva', 0.55);
  for (const em of nivel.emisores) {
    if (em.tipo === 'cascada') audio.buclePosicional('cascada', em.objeto, POSICIONAL.cascada);
    if (em.tipo === 'fuego') audio.buclePosicional('antorcha', em.objeto, POSICIONAL.antorcha);
  }

  // ---------------- Partículas (requisito 5)
  const textura = texturaPunto();
  const particulas = nivel.emisores.flatMap((em) => crearParticulasDeEmisor(em, textura, calidad.particulas));
  const rafagas = crearRafagas(textura);
  particulas.push(rafagas);
  for (const p of particulas) escena.add(p.puntos);

  // ---------------- Interfaz
  const panel = new PanelCartografa();
  const hud = new Hud();
  hud.vida(vida.actual, vida.maxima);
  const subtitulos = new Subtitulos();
  let finSubtitulo = -1;
  /** @param {string} texto @param {string} emocion */
  const decir = (texto, emocion) => {
    cara.ponerEmocion(emocion);
    cara.hablar(texto);
    subtitulos.mostrar(texto, 'calido');
    finSubtitulo = -1;
  };

  // ---------------- Puente, checkpoints, portales
  const puente = new Puente(nivel.dinamicos.filter((d) => d.datos.cae_al_pisar), PUENTE, {
    alTemblar: (p) => audio.efectoEn('tabla_cruje', p, 0.8),
    alCaer: (p) => { audio.efectoEn('tabla_cae', p, 0.9); rig.sacudida.agregar(0.12); },
  });
  const checkpoints = new Checkpoints(nivel.pilares, nivel.spawns, CHECKPOINT);

  /** @param {string} nombreSpawn */
  const teletransportar = (nombreSpawn) => {
    const s = nivel.spawns[nombreSpawn];
    if (!s) return;
    jugador.colocar(s.pos, s.rumbo);
    rig.reorientar(s.rumbo);
  };
  const portales = new Portales(PORTAL, (destino) => {
    teletransportar(destino);
    audio.efecto('portal');
    rig.sacudida.agregar(0.3);
    hud.nota('Portal activado');
  });

  // ---------------- Muerte y reaparición
  let muerta = false;
  let tiempoMuerte = 0;
  const morir = () => {
    if (muerta || !vida.matar()) return;
    muerta = true;
    tiempoMuerte = 0;
    jugador.bloqueado = true;
    audio.efecto('derrota');
    bus.emitir(EVENTOS.JUGADOR_MUERTO);
  };
  const reaparecer = () => {
    const s = checkpoints.reaparicion;
    puente.reiniciar();
    vida.reiniciar();
    jugador.colocar(s.pos, s.rumbo);
    jugador.bloqueado = false;
    rig.reorientar(s.rumbo);
    muerta = false;
    hud.mostrarDerrota(false);
  };

  // ---------------- Triggers (requisito 4)
  const puntoTrigger = new THREE.Vector3();
  triggers.alCambiar = (t, entra) => {
    const d = t.datos;
    if (d.zona && entra) bus.emitir(EVENTOS.ZONA_CAMBIADA, d.zona);
    if (d.perfil_camara) rig.zona(String(d.perfil_camara), entra);
    if (!entra) return;
    if (d.hint && nivel.hints[d.hint]) rig.mirarHacia(nivel.hints[d.hint]);
    if (muerta) return;
    switch (d.evento) {
      case 'portal':
        portales.entrar(d);
        break;
      case 'muerte':
        morir();
        break;
      case 'checkpoint': {
        const disco = checkpoints.pasar(Number(d.checkpoint));
        if (disco) {
          rafagaEn(rafagas, disco, CHECKPOINT.rafaga, PALETA.oro_brillante, 5);
          audio.efecto('checkpoint');
          hud.nota(`Pilar solar encendido: ${d.nombre}`);
          bus.emitir(EVENTOS.CHECKPOINT, d.checkpoint);
        }
        break;
      }
      case 'flor': {
        const flor = nivel.flores[Number(d.flor)];
        if (!flor || !flor.visible) break;
        if (vida.curar(VIDA.flor_cura) > 0) {
          flor.visible = false;
          puntoTrigger.copy(flor.position).y += 0.6;
          rafagaEn(rafagas, puntoTrigger, 30, PALETA.flor_petalo, 3);
          audio.efecto('flor');
          hud.nota('Flor solar: +25 de vida');
        } else {
          hud.nota('Una flor solar. Mejor guardarla para después.', 2);
        }
        break;
      }
      default:
    }
  };

  // ---------------- Depuración
  const depuracion = DEPURACION
    ? (await import('./debug/debug_panel.js')).crearPanelDepuracion({
        renderer, cfgJugador, camara: rig, cara, decir, emociones: Object.keys(EXPRESIONES),
      })
    : null;
  if (DEPURACION) {
    (await import('./debug/helpers.js')).crearAtajos({
      escena, triggers, colisionables: nivel.colisionables, vida, panel: depuracion,
      teletransportar: (n) => { teletransportar(n); puente.reiniciar(); },
      nota: (texto) => hud.nota(texto, 1.6),
    });
  }

  // ---------------- Bucle único
  const dirCamara = new THREE.Vector3();
  const pecho = new THREE.Vector3();
  let reloj = 0;
  const bucle = new BucleJuego(renderer, {
    fisica: (dt) => fisica.paso(dt),
    sincronizar: () => fisica.sincronizar(),
    logica: (dt, t) => {
      depuracion?.inicio();
      reloj = t;
      uTiempo.value = t;
      jugador.actualizar(dt, camara);
      animador.actualizar(dt, t, jugador);
      cara.actualizar(dt);
      vida.actualizar(dt);
      portales.actualizar(dt);
      puente.actualizar(dt, jugador.cuerpoSuelo);
      checkpoints.actualizar(dt, t);
      luces.actualizar(t);
      puntoTrigger.copy(jugador.posicion);
      puntoTrigger.y += 0.8;
      triggers.actualizar(puntoTrigger);
      for (let i = 0; i < nivel.giratorios.length; i++) nivel.giratorios[i].rotation.z += dt * PORTAL.giro;
      for (let i = 0; i < nivel.runas.length; i++) nivel.runas[i].emissiveIntensity = 0.9 + Math.sin(t * 2.2) * 0.35;
      if (muerta) {
        tiempoMuerte += dt;
        if (tiempoMuerte > VIDA.espera_reaparicion && tiempoMuerte - dt <= VIDA.espera_reaparicion) {
          if (AUTOMATICO) reaparecer();
          else {
            hud.mostrarDerrota(true);
            rig.controles.unlock();
          }
        }
      }
    },
    camara: (dt) => {
      rig.actualizar(dt, jugador.posicion, jugador);
      ambiente.seguir(jugador.posicion);
      pecho.copy(jugador.posicion).y += 1.2;
      oclusion.actualizar(dt, camara.position, pecho);
    },
    particulas: (dt) => {
      const escala = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2));
      for (let i = 0; i < particulas.length; i++) {
        particulas[i].material.uniforms.uEscala.value = escala;
        particulas[i].actualizar(dt, reloj);
      }
    },
    audio: () => {
      if (animador.pisada) {
        const madera = jugador.cuerpoSuelo?.material?.name === 'tabla';
        const piedra = /Cueva|Cornisa|Ruinas|Puente/.test(triggers.zona);
        audio.efecto(madera ? 'paso_madera' : piedra ? 'paso_piedra' : 'paso_tierra', 0.35);
      }
      if (jugador.salto) audio.efecto('salto', 0.5);
      if (jugador.aterrizaje > 0.25) {
        audio.efecto('aterrizaje', jugador.aterrizaje);
        rig.sacudida.agregar(jugador.aterrizaje * 0.25);
      }
    },
    hud: (dt) => {
      camara.getWorldDirection(dirCamara);
      panel.actualizar(dt, triggers.zona, jugador.posicion, -Math.atan2(dirCamara.x, -dirCamara.z));
      hud.vida(vida.actual, vida.maxima);
      hud.actualizar(dt);
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

  // ---------------- Inicio, pausa y derrota
  bucle.pausado = !AUTOMATICO;
  bucle.iniciar();
  if (AUTOMATICO) {
    pantallas.ocultarInicio();
    document.getElementById('pantalla-carga').classList.add('oculto');
    if (params.has('hablar')) setTimeout(() => decir('Te dije que llegaría antes que tú.', 'ternura'), 400);
    const destino = params.get('ir');
    if (destino) teletransportar(destino);
    // ?auto&pos=x,y,z,grados coloca a Victoria en cualquier punto (coordenadas de Three.js)
    const pos = (params.get('pos') ?? '').split(',').map(Number);
    if (pos.length === 4 && pos.every(Number.isFinite)) {
      const rumbo = THREE.MathUtils.degToRad(pos[3]);
      jugador.colocar(new THREE.Vector3(pos[0], pos[1], pos[2]), rumbo);
      rig.reorientar(params.get('vista') === 'frente' ? rumbo + Math.PI : rumbo);
    }
    // ?auto&tecla=KeyW,ShiftLeft mantiene teclas pulsadas para capturas automáticas
    for (const codigo of (params.get('tecla') ?? '').split(',').filter(Boolean)) entrada.abajo.add(codigo);
    return;
  }
  pantallas.mostrarInicio();
  pantallas.alHacerClicInicio(() => {
    oyente.context.resume();
    audio.iniciar();
    pantallas.ocultarInicio();
    rig.controles.lock();
  });
  pantallas.alHacerClicPausa(() => rig.controles.lock());
  hud.alReintentar(() => {
    reaparecer();
    rig.controles.lock();
  });
  rig.controles.addEventListener('lock', () => {
    bucle.pausado = false;
    pantallas.pausa(false);
  });
  rig.controles.addEventListener('unlock', () => {
    bucle.pausado = true;
    if (!muerta) pantallas.pausa(true);
  });
}

iniciar().catch((err) => {
  console.error(err);
  pantallas.error(`No se pudo iniciar: ${err.message}`);
});
