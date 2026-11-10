// Simulación sin gráficos de la zona 1: el .glb real, la física, el controlador de Victoria,
// el puente, los triggers, los portales, los checkpoints y la muerte, a 60 pasos por segundo.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PORTAL, PUENTE } from '../src/config/level.js';
import { PLAYER, VIDA } from '../src/config/player.js';
import { Enfriamiento } from '../src/core/cooldown.js';
import { MundoFisico } from '../src/core/physics_world.js';
import { Vida } from '../src/player/health.js';
import { ControladorJugador } from '../src/player/player_controller.js';
import { Puente } from '../src/world/bridge.js';
import { RegistroCheckpoints } from '../src/world/checkpoint_logic.js';
import { construirNivel } from '../src/world/level_loader.js';
import { SistemaTriggers } from '../src/world/triggers.js';

export const DT = 1 / 60;

function cargarGlb(ruta) {
  const datos = readFileSync(ruta);
  const buffer = datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength);
  return new Promise((ok, mal) => new GLTFLoader().parse(buffer, '', ok, mal));
}

/** Entrada falsa: el test decide qué teclas están pulsadas. */
class EntradaFalsa {
  constructor() {
    this.abajo = new Set();
    this.pulsadas = new Set();
  }
  mantiene(a) { return this.abajo.has(a); }
  pulso(a) { return this.pulsadas.has(a); }
}

export async function crearSimulacion() {
  const gltf = await cargarGlb('public/models/zona_1_selva.glb');
  const escena = new THREE.Scene();
  const fisica = new MundoFisico();
  const triggers = new SistemaTriggers();
  const nivel = construirNivel(gltf, escena, fisica, triggers, { vegetacion: 0.1 });
  const entrada = new EntradaFalsa();
  const modelo = new THREE.Object3D();
  const jugador = new ControladorJugador(fisica, /** @type {any} */ (entrada), modelo, { ...PLAYER });
  const camara = new THREE.PerspectiveCamera();
  camara.rotation.order = 'YXZ';
  const vida = new Vida(VIDA.maxima, VIDA.invulnerable_tras_dano);
  const checkpoints = new RegistroCheckpoints(1);
  const enfriamiento = new Enfriamiento(PORTAL.enfriamiento);
  const eventos = [];
  const puente = new Puente(nivel.dinamicos.filter((d) => d.datos.cae_al_pisar), PUENTE, {
    alCaer: () => eventos.push('tabla_cae'),
  });

  const sim = {
    nivel, jugador, entrada, vida, checkpoints, puente, eventos, triggers, fisica,
    muerta: false,
    /** Coloca a Victoria en un spawn y orienta la "cámara" detrás de ella. */
    ir(nombre) {
      const s = nivel.spawns[nombre];
      jugador.colocar(s.pos, s.rumbo);
      camara.rotation.set(0, s.rumbo + Math.PI, 0);
      camara.updateMatrixWorld();
    },
    /** Orienta la cámara para que "adelante" sea el rumbo dado (radianes). */
    mirar(rumbo) {
      camara.rotation.set(0, rumbo + Math.PI, 0);
      camara.updateMatrixWorld();
    },
    teclas(...acciones) {
      entrada.abajo = new Set(acciones);
    },
    /** Avanza 'segundos' de juego. */
    correr(segundos) {
      const pasos = Math.round(segundos / DT);
      const p = new THREE.Vector3();
      for (let i = 0; i < pasos; i++) {
        fisica.paso(DT);
        fisica.sincronizar();
        jugador.actualizar(DT, camara);
        enfriamiento.actualizar(DT);
        puente.actualizar(DT, jugador.cuerpoSuelo);
        p.copy(jugador.posicion);
        p.y += 0.8;
        triggers.actualizar(p);
        entrada.pulsadas.clear();
      }
    },
  };

  triggers.alCambiar = (t, entra) => {
    if (!entra) return;
    const d = t.datos;
    if (d.evento === 'portal' && enfriamiento.usar()) {
      eventos.push(`portal:${d.destino}`);
      sim.ir(d.destino);
    } else if (d.evento === 'muerte' && !sim.muerta) {
      sim.muerta = true;
      vida.matar();
      eventos.push('muerte');
    } else if (d.evento === 'checkpoint') {
      if (checkpoints.pasar(Number(d.checkpoint))) eventos.push(`checkpoint:${d.checkpoint}`);
    }
  };
  return sim;
}
