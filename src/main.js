// @ts-check
import './style.css';
import * as THREE from 'three';
import { COLOR_GEMA, ESCUDO, ESQUIVA, MANIPULACION, PULSO, TUTORIAL } from './config/abilities.js';
import { POSICIONAL, SONIDOS } from './config/audio.js';
import { PAGINAS, TOTAL_PAGINAS } from './config/diary.js';
import { CAMERA_LIMITES, CAMERA_PROFILES } from './config/camera_profiles.js';
import { CENTINELA, ESPECTRO, ORBE } from './config/enemies.js';
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
import { GestorEnemigos } from './enemies/enemy_manager.js';
import { chispaEn, crearEstela, crearParticulasDeEmisor, crearRafagas, rafagaEn } from './fx/particle_presets.js';
import { texturaPunto } from './fx/particles.js';
import { Interactuables } from './interaction/interactables.js';
import { Portales } from './interaction/portal.js';
import { Losas } from './interaction/slabs.js';
import { Poderes } from './player/abilities/abilities_logic.js';
import { BurbujaEscudo } from './player/abilities/shield.js';
import { PoolPulsos } from './player/abilities/solar_pulse.js';
import { AnimadorCara } from './player/face_animator.js';
import { Vida } from './player/health.js';
import { ControladorJugador } from './player/player_controller.js';
import { AnimadorProcedural } from './player/procedural_animator.js';
import { PanelCartografa } from './ui/cartographer_panel.js';
import { PanelDiario } from './ui/diary_panel.js';
import { Hud } from './ui/hud.js';
import { pantallas, Subtitulos } from './ui/screens.js';
import { Puente } from './world/bridge.js';
import { Checkpoints } from './world/checkpoints.js';
import { crearAmbienteSelva, crearLucesNivel } from './world/environment.js';
import { combinarNiveles, construirNivel } from './world/level_loader.js';
import { aplicarMaterialesPersonaje, crearRampaToon } from './world/materials.js';
import { Santuario } from './world/sanctuary.js';
import { uTiempo } from './world/shaders.js';
import { SistemaTriggers } from './world/triggers.js';
import { Transicion } from './world/zone_transition.js';

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
    cargarModelos({
      zona: '/models/zona_1_selva.glb', santuario: '/models/zona_2_santuario.glb',
      victoria: '/models/victoria.glb', enemigos: '/models/enemigos.glb',
    }, (f, texto) => pantallas.progreso(f * 0.85, texto)),
    cargarSonidos(SONIDOS),
  ]);
  pantallas.progreso(0.95, 'Despertando la selva…');

  const opcionesNivel = { vegetacion: calidad.vegetacion };
  const nivelSantuario = construirNivel(modelos.santuario, escena, fisica, triggers, opcionesNivel);
  const nivel = combinarNiveles([construirNivel(modelos.zona, escena, fisica, triggers, opcionesNivel), nivelSantuario]);
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
  const ambienteSelva = audio.bucleGlobal('ambiente_selva', 0.55);
  const ambienteSantuario = audio.bucleGlobal('ambiente_santuario', 0);
  for (const em of nivel.emisores) {
    if (em.tipo === 'cascada') audio.buclePosicional('cascada', em.objeto, POSICIONAL.cascada);
    if (em.tipo === 'fuego') audio.buclePosicional('antorcha', em.objeto, POSICIONAL.antorcha);
  }

  // ---------------- Partículas (requisito 5)
  const textura = texturaPunto();
  const particulas = nivel.emisores.flatMap((em) => crearParticulasDeEmisor(em, textura, calidad.particulas));
  const rafagas = crearRafagas(textura);
  const estela = crearEstela(textura);
  particulas.push(rafagas, estela);
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

  // ---------------- Zonas: la selva y el santuario (que está lejos, más allá de la niebla)
  let dentroSantuario = false;
  /** @param {THREE.Vector3} pos */
  const esSantuario = (pos) => pos.z > 400;
  /** Luces, atmósfera y ambiente de la zona donde está Victoria. @param {boolean} dentro */
  const aplicarZona = (dentro) => {
    if (dentro === dentroSantuario) return;
    dentroSantuario = dentro;
    ambiente.ponerInterior(dentro);
    luces.encenderGrupo(dentro ? 2 : 1);
    audio.volumenBucle(ambienteSelva, dentro ? 0 : 0.55);
    audio.volumenBucle(ambienteSantuario, dentro ? 0.6 : 0);
  };
  const transicion = new Transicion();

  /** @param {string} nombreSpawn */
  const teletransportar = (nombreSpawn) => {
    const s = nivel.spawns[nombreSpawn];
    if (!s) return;
    jugador.colocar(s.pos, s.rumbo);
    rig.reorientar(s.rumbo);
    aplicarZona(esSantuario(s.pos));
  };
  /** Del pasadizo del pórtico al vestíbulo del santuario, con fundido a negro. */
  const entrarAlSantuario = () => {
    if (!transicion.iniciar(() => {
      teletransportar('santuario');
      hud.nota('El santuario', 3);
    })) return;
    jugador.bloqueado = true;
    setTimeout(() => { if (!muerta) jugador.bloqueado = false; }, 1400);
  };
  const portales = new Portales(PORTAL, (destino) => {
    teletransportar(destino);
    audio.efecto('portal');
    rig.sacudida.agregar(0.3);
    hud.nota('Portal activado');
  });

  // ---------------- Poderes del brazalete (sección 5.5)
  const dirCamara = new THREE.Vector3();
  const pecho = new THREE.Vector3();
  const poderes = new Poderes(PULSO, ESCUDO, MANIPULACION, ESQUIVA);
  const burbuja = new BurbujaEscudo(escena, ESCUDO.radio);
  const pulsos = new PoolPulsos(escena, fisica, PULSO, {
    alImpactar: (p, cuerpo) => {
      rafagaEn(rafagas, p, 22, PALETA.oro_brillante, 4);
      audio.efectoEn('pulso_impacto', p, 0.9);
      enemigos.golpear(cuerpo, PULSO.dano, p);
    },
    estela: (p) => chispaEn(estela, p, PALETA.oro_brillante, 1, 0.22),
  });
  const interactuables = new Interactuables(nivel.interactuables, MANIPULACION);
  const losas = new Losas(nivel.dinamicos);
  const panelDiario = new PanelDiario();
  /** @type {Set<number>} */
  const paginas = new Set();
  hud.paginas(0, TOTAL_PAGINAS);
  const huesoBrazalete = modeloVictoria.getObjectByName('brazalete');
  const manoDer = modeloVictoria.getObjectByName('mano_der');
  huesoBrazalete.scale.setScalar(0.001); // aún no lo tiene: se le ve al tomarlo del altar
  const colorGema = new THREE.Color(PALETA.gema_pulso);
  const colorObjetivo = new THREE.Color();
  let brilloGema = 0;
  const tutorial = { brazalete: false, pulso: false, manipulacion: false, esquiva: false };
  const objBrazalete = interactuables.lista.find((o) => o.tipo === 'brazalete');

  // Apuntar: rayo desde el centro de la pantalla (la retícula) contra el escenario
  const rayoMira = new THREE.Raycaster();
  rayoMira.far = PULSO.alcance;
  /** @type {THREE.Intersection[]} */
  const impactosMira = [];
  const objetivosMira = [...nivel.colisionables, ...nivel.dinamicos.map((d) => d.malla)];
  const centroPantalla = new THREE.Vector2(0, 0);
  const mira = new THREE.Vector3();
  const origenPulso = new THREE.Vector3();
  const dirPulso = new THREE.Vector3();
  const derecha = new THREE.Vector3();
  const posMano = new THREE.Vector3();
  const rumboCamara = () => {
    camara.getWorldDirection(dirCamara);
    return Math.atan2(dirCamara.x, dirCamara.z);
  };

  const dispararPulso = () => {
    rayoMira.setFromCamera(centroPantalla, camara);
    impactosMira.length = 0;
    rayoMira.intersectObjects(objetivosMira, true, impactosMira);
    if (impactosMira.length) mira.copy(impactosMira[0].point);
    else mira.copy(rayoMira.ray.origin).addScaledVector(rayoMira.ray.direction, PULSO.alcance);
    // Sale de la mano derecha (la del brazalete), a la altura del pecho
    derecha.set(Math.cos(jugador.orientacion), 0, -Math.sin(jugador.orientacion));
    origenPulso.copy(jugador.posicion).addScaledVector(derecha, -0.3);
    origenPulso.y += 1.3;
    camara.getWorldDirection(dirCamara);
    origenPulso.addScaledVector(dirCamara, 0.45);
    dirPulso.subVectors(mira, origenPulso).normalize();
    // Asistencia de puntería (sección 5.5): si un enemigo está casi bajo la retícula, va hacia él
    const asistido = enemigos.asistencia(origenPulso, dirPulso, PULSO.asistencia, PULSO.alcance);
    if (asistido) dirPulso.copy(asistido);
    pulsos.disparar(origenPulso, dirPulso);
    animador.gesto('disparo');
    jugador.mirarHacia(rumboCamara(), 0.45);
    audio.efecto('pulso_disparo', 0.8);
    rafagaEn(rafagas, origenPulso, 8, PALETA.oro_brillante, 2);
    brilloGema = 1;
    if (!tutorial.manipulacion) {
      tutorial.manipulacion = true;
      setTimeout(() => hud.mensajeTutorial(TUTORIAL.manipulacion, 7), 2500);
    }
  };

  /** Secuencia del altar: el brazalete vuela a la muñeca de Victoria y despierta dos poderes. */
  let secuenciaBrazalete = null;
  /** @param {import('./interaction/interactables.js').Interactuable} o */
  const tomarBrazalete = (o) => {
    interactuables.desactivar(o);
    secuenciaBrazalete = { t: 0, desde: o.objeto.position.clone(), objeto: o.objeto };
    animador.gesto('mirar_brazalete');
    jugador.mirarHacia(Math.atan2(o.pos.x - jugador.posicion.x, o.pos.z - jugador.posicion.z), 0.8);
    jugador.bloqueado = true;
  };
  /** @param {number} dt */
  const avanzarBrazalete = (dt) => {
    if (!secuenciaBrazalete) return;
    const s = secuenciaBrazalete;
    s.t += dt;
    manoDer.getWorldPosition(posMano);
    const u = Math.min(1, s.t / 0.9);
    s.objeto.position.lerpVectors(s.desde, posMano, u * u * (3 - 2 * u));
    s.objeto.scale.setScalar(1 - u * 0.6);
    chispaEn(estela, s.objeto.position, PALETA.oro_brillante, 2, 0.4);
    if (u >= 1 && s.objeto.visible) {
      s.objeto.visible = false;
      huesoBrazalete.scale.setScalar(1);
      poderes.desbloquear('pulso');
      poderes.desbloquear('manipulacion');
      rafagaEn(rafagas, posMano, 70, PALETA.oro_brillante, 5);
      audio.efecto('brazalete');
      cara.ponerEmocion('ternura');
      hud.nota('El brazalete despierta: Pulso solar y Manipulación', 4);
      bus.emitir(EVENTOS.PODER_DESBLOQUEADO, ['pulso', 'manipulacion']);
    }
    if (s.t > 2.2) {
      secuenciaBrazalete = null;
      jugador.bloqueado = false;
      cara.ponerEmocion('neutral');
      hud.mensajeTutorial(TUTORIAL.pulso, 8);
      tutorial.pulso = true;
    }
  };

  /** @param {import('./interaction/interactables.js').Interactuable} o */
  const leerPagina = (o) => {
    const pagina = PAGINAS[Number(o.datos.pagina) - 1];
    if (!pagina) return;
    interactuables.desactivar(o);
    o.objeto.visible = false;
    paginas.add(pagina.n);
    hud.paginas(paginas.size, TOTAL_PAGINAS);
    audio.efecto('pagina');
    bus.emitir(EVENTOS.PAGINA_ENCONTRADA, pagina.n);
    panelDiario.abrir(pagina);
    bucle.pausado = true;
  };
  panelDiario.alCerrar = () => {
    entrada.pulsadas.clear(); // la misma E que cierra el diario no debe volver a interactuar
    if (!muerta && rig.controles.isLocked) bucle.pausado = false;
    if (!tutorial.esquiva) {
      tutorial.esquiva = true;
      hud.mensajeTutorial(TUTORIAL.esquiva, 5);
    }
  };

  const manipular = () => {
    const o = interactuables.objetivo;
    if (o && o.tipo === 'brazalete') {
      tomarBrazalete(o);
      return;
    }
    if (!poderes.tiene('manipulacion')) return;
    if (!o) {
      // Sin objetivo el brazalete chisporrotea y no gasta nada
      if (!poderes.manipulacionLista) return;
      manoDer.getWorldPosition(posMano);
      chispaEn(estela, posMano, PALETA.gema_manipulacion, 10, 0.35);
      animador.gesto('chisporroteo');
      audio.efecto('chisporroteo', 0.6);
      return;
    }
    if (!poderes.usar('manipulacion')) return;
    animador.gesto('manipular');
    jugador.mirarHacia(Math.atan2(o.pos.x - jugador.posicion.x, o.pos.z - jugador.posicion.z), 0.6);
    audio.efecto('manipular', 0.8);
    rafagaEn(rafagas, o.pos, 18, PALETA.gema_manipulacion, 2.5);
    if (santuario.usar(o)) return;
    if (o.tipo === 'pagina') leerPagina(o);
    else if (o.tipo === 'losa' && losas.activar(o.objeto)) {
      interactuables.desactivar(o);
      audio.efectoEn('losa_mover', o.pos, 1);
      rig.sacudida.agregar(0.3);
      hud.nota(o.objeto.name === 'dyn_puerta_santuario' ? 'La puerta del santuario se hunde en el suelo' : 'La losa se hunde en la piedra');
    }
  };

  /** Todo el daño pasa por aquí: el escudo lo bloquea y la esquiva lo evita. @param {number} cantidad */
  const recibirDano = (cantidad) => {
    if (muerta) return false;
    if (poderes.escudoActivo) {
      burbuja.golpe();
      audio.efecto('escudo_bloquear');
      return false;
    }
    if (poderes.esquivaInvulnerable || !vida.danar(cantidad)) return false;
    rig.sacudida.agregar(0.35);
    audio.efecto('dano', 0.8);
    if (vida.muerta) morir();
    return true;
  };

  // ---------------- Enemigos (sección 6)
  const toonEnemigos = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: rampa });
  const posAviso = new THREE.Vector3();
  const enemigos = new GestorEnemigos(escena, fisica, modelos.enemigos.scene, Object.values(nivel.spawns),
    { centinela: CENTINELA, espectro: ESPECTRO, orbe: ORBE }, toonEnemigos, {
      danarJugador: (cantidad, origen, orbe) => {
        if (orbe && poderes.bloqueoPerfecto) {
          // Bloqueo perfecto (sección 5.5): el orbe vuelve hacia el espectro
          burbuja.golpe();
          audio.efecto('escudo_bloquear');
          rafagaEn(rafagas, origen, 30, PALETA.gema_escudo, 4);
          hud.nota('¡Bloqueo perfecto!', 1.6);
          return 'reflejo';
        }
        if (poderes.escudoActivo) {
          recibirDano(cantidad);
          return 'bloqueo';
        }
        return recibirDano(cantidad) ? 'dano' : 'nada';
      },
      alGolpeSuelo: (p) => {
        audio.efectoEn('centinela_golpe', p, 1);
        rafagaEn(rafagas, posAviso.copy(p).setY(p.y + 0.2), 26, PALETA.piedra_luz, 3.5);
        rig.sacudida.agregar(Math.max(0, 0.5 - p.distanceTo(jugador.posicion) * 0.04));
      },
      alMorir: (a, p) => {
        audio.efectoEn(a.tipo === 'centinela' ? 'centinela_rompe' : 'espectro_muere', p, 1);
        rafagaEn(rafagas, p, 50, a.tipo === 'centinela' ? PALETA.piedra_luz : PALETA.espectro_luz, 5);
      },
      alDanar: (a, p) => rafagaEn(rafagas, p, 14, '#FFFFFF', 3),
      alEstado: (a, estado, p) => {
        if (a.tipo === 'centinela' && estado === 'ataque') audio.efectoEn('centinela_aviso', p, 0.9);
        if (a.tipo === 'centinela' && estado === 'alerta') audio.efectoEn('centinela_despierta', p, 0.5);
        if (a.tipo === 'espectro' && estado === 'cargar') audio.efectoEn('espectro_carga', p, 0.8);
      },
      alDisparar: (p) => audio.efectoEn('orbe_disparo', p, 0.9),
      alOrbeMuro: (p) => {
        audio.efectoEn('orbe_impacto', p, 0.7);
        rafagaEn(rafagas, p, 16, PALETA.espectro_runa, 3);
      },
      estela: (p, color) => chispaEn(estela, p, color, 1, 0.5),
    });

  // ---------------- Santuario: altar del escudo, espejos y puertas (sección 8.2)
  const santuario = new Santuario({
    raiz: nivelSantuario.raiz, escena, interactuables, enemigos, losas, dinamicos: nivel.dinamicos,
    luzCristal: luces.porDato('cristal'),
    avisos: {
      nota: (texto, seg) => hud.nota(texto, seg),
      tutorial: (texto, seg) => hud.mensajeTutorial(texto, seg),
      sonido: (nombre, pos, vol) => (pos ? audio.efectoEn(nombre, pos, vol ?? 1) : audio.efecto(nombre, vol ?? 1)),
      sacudida: (f) => rig.sacudida.agregar(f),
      rafaga: (pos, n, color, fuerza) => rafagaEn(rafagas, pos, n, color, fuerza),
      chispa: (pos, color) => chispaEn(estela, pos, color, 1, 0.3),
      desbloquearEscudo: () => {
        poderes.desbloquear('escudo');
        audio.efecto('brazalete');
        brilloGema = 1;
        colorGema.set(PALETA.gema_escudo);
        cara.ponerEmocion('determinacion');
        setTimeout(() => cara.ponerEmocion('neutral'), 2500);
        hud.nota('El brazalete aprende el Escudo arcano', 4);
        hud.mensajeTutorial(TUTORIAL.escudo, 8);
        bus.emitir(EVENTOS.PODER_DESBLOQUEADO, ['escudo']);
      },
    },
  });

  /** @param {number} dt */
  const usarPoderes = (dt) => {
    poderes.actualizar(dt);
    if (muerta || jugador.bloqueado) return;
    if (entrada.clicPulsado && poderes.usar('pulso')) dispararPulso();
    if (entrada.pulso('escudo')) {
      if (poderes.usar('escudo')) {
        animador.gesto('escudo');
        audio.efecto('escudo_activar');
      } else if (!poderes.tiene('escudo')) {
        hud.nota('El brazalete aún no conoce ese poder', 2);
      }
    }
    if (entrada.pulso('esquivar') && poderes.esquivar()) {
      jugador.esquivar(ESQUIVA);
      animador.gesto('esquiva');
      audio.efecto('esquiva', 0.7);
    }
    if (entrada.pulso('manipular')) manipular();
  };

  /** Color de la gema: dorado (Pulso), azul (Escudo) o blanco cálido (Manipulación con objetivo). @param {number} dt */
  const actualizarGema = (dt) => {
    const clave = poderes.escudoActivo ? COLOR_GEMA.escudo
      : interactuables.objetivo && poderes.tiene('manipulacion') ? COLOR_GEMA.manipulacion : COLOR_GEMA.pulso;
    colorObjetivo.set(PALETA[clave]);
    colorGema.lerp(colorObjetivo, 1 - Math.exp(-dt * 10));
    brilloGema = Math.max(0, brilloGema - dt * 3);
    matVictoria.gema.color.copy(colorGema);
    matVictoria.gema.emissive.copy(colorGema);
    matVictoria.gema.emissiveIntensity = 2.2 + brilloGema * 4;
  };

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
    enemigos.reiniciar();
    aplicarZona(esSantuario(s.pos));
    vida.reiniciar();
    poderes.reiniciarRecargas();
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
    if (d.evento === 'sala_espejos') santuario.salaEspejos(entra);
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
      case 'transicion':
        entrarAlSantuario();
        break;
      case 'puerta_arena':
        santuario.puertaArena();
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
      desbloquearTodo: () => {
        for (const p of ['pulso', 'escudo', 'manipulacion']) poderes.desbloquear(p);
        huesoBrazalete.scale.setScalar(1);
        if (objBrazalete && objBrazalete.activo) {
          interactuables.desactivar(objBrazalete);
          objBrazalete.objeto.visible = false;
        }
      },
      recibirDano,
    });
  }

  // ---------------- Bucle único
  let reloj = 0;
  let tChispas = 0;
  const bucle = new BucleJuego(renderer, {
    fisica: (dt) => fisica.paso(dt),
    sincronizar: () => fisica.sincronizar(),
    logica: (dt, t) => {
      depuracion?.inicio();
      reloj = t;
      uTiempo.value = t;
      usarPoderes(dt);
      jugador.actualizar(dt, camara);
      animador.actualizar(dt, t, jugador);
      cara.actualizar(dt);
      vida.actualizar(dt);
      pulsos.actualizar(dt);
      losas.actualizar(dt);
      // La zona (luces, atmósfera, ambiente) sigue a Victoria esté donde esté (teletransportes de depuración incluidos)
      if (!transicion.activa) aplicarZona(esSantuario(jugador.posicion));
      enemigos.actualizar(dt, t, jugador.posicion, !muerta);
      santuario.actualizar(dt, t);
      pantallas.fundido(transicion.actualizar(dt));
      avanzarBrazalete(dt);
      pecho.copy(jugador.posicion).y += 1.2;
      interactuables.actualizar(dt, pecho, camara, (o) => o.tipo === 'brazalete' || poderes.tiene('manipulacion'));
      burbuja.actualizar(dt, poderes.escudoActivo, pecho);
      actualizarGema(dt);
      // Los objetos interactuables cercanos sueltan chispas blancas
      tChispas += dt;
      if (tChispas > 0.3) {
        tChispas = 0;
        for (let i = 0; i < interactuables.lista.length; i++) {
          const o = interactuables.lista[i];
          if (o.activo && o.pos.distanceToSquared(jugador.posicion) < 196) chispaEn(estela, o.objeto.position, PALETA.gema_manipulacion, 2, 0.9);
        }
      }
      if (!tutorial.brazalete && objBrazalete && objBrazalete.activo && objBrazalete.pos.distanceTo(jugador.posicion) < 10) {
        tutorial.brazalete = true;
        hud.mensajeTutorial(TUTORIAL.brazalete, 7);
      }
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
      hud.poder('pulso', poderes.tiene('pulso'), poderes.progreso('pulso'));
      hud.poder('escudo', poderes.tiene('escudo'), poderes.progreso('escudo'), poderes.escudoActivo);
      hud.poder('manipulacion', poderes.tiene('manipulacion'), poderes.progreso('manipulacion'));
      hud.avisoInteraccion(interactuables.objetivo && !secuenciaBrazalete ? String(interactuables.objetivo.datos.etiqueta) : '');
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
    // ?auto&poderes desbloquea los tres poderes; &disparar lanza un Pulso cada 0,6 s; &escudo lo mantiene
    if (params.has('poderes')) {
      for (const p of ['pulso', 'escudo', 'manipulacion']) poderes.desbloquear(p);
      huesoBrazalete.scale.setScalar(1);
    }
    if (params.has('disparar')) setInterval(() => { if (poderes.usar('pulso')) dispararPulso(); }, 600);
    // &diario=N abre esa página (para revisar el estilo de la escritura)
    const pagina = PAGINAS[Number(params.get('diario')) - 1];
    if (pagina) setTimeout(() => panelDiario.abrir(pagina), 300);
    if (params.has('escudo')) setInterval(() => { if (poderes.usar('escudo')) animador.gesto('escudo'); }, 300);
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
    hud.mensajeTutorial(TUTORIAL.inicio, 7);
  });
  hud.alReintentar(() => {
    reaparecer();
    rig.controles.lock();
  });
  hud.menuPausa({
    continuar: () => rig.controles.lock(),
    checkpoint: () => {
      reaparecer();
      rig.controles.lock();
    },
    inicio: () => location.reload(),
  });
  rig.controles.addEventListener('lock', () => {
    bucle.pausado = false;
    pantallas.pausa(false);
  });
  rig.controles.addEventListener('unlock', () => {
    bucle.pausado = true;
    if (panelDiario.abierto) panelDiario.cerrar();
    if (!muerta) pantallas.pausa(true);
  });
}

iniciar().catch((err) => {
  console.error(err);
  pantallas.error(`No se pudo iniciar: ${err.message}`);
});
