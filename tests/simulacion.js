// Simulación sin gráficos de la zona 1: el .glb real, la física, el controlador de Victoria,
// el puente, los triggers, los portales, los checkpoints y la muerte, a 60 pasos por segundo.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ESCUDO, ESQUIVA, MANIPULACION, PULSO } from '../src/config/abilities.js';
import { PORTAL, PUENTE } from '../src/config/level.js';
import { Interactuables } from '../src/interaction/interactables.js';
import { Losas } from '../src/interaction/slabs.js';
import { EstadoLlave } from '../src/interaction/llave_logic.js';
import { Poderes } from '../src/player/abilities/abilities_logic.js';
import { PoolPulsos } from '../src/player/abilities/solar_pulse.js';
import { PLAYER, VIDA } from '../src/config/player.js';
import { Enfriamiento } from '../src/core/cooldown.js';
import { MundoFisico } from '../src/core/physics_world.js';
import { Vida } from '../src/player/health.js';
import { ControladorJugador } from '../src/player/player_controller.js';
import { Puente } from '../src/world/bridge.js';
import { RegistroCheckpoints } from '../src/world/checkpoint_logic.js';
import { combinarNiveles, construirNivel } from '../src/world/level_loader.js';
import { SistemaTriggers } from '../src/world/triggers.js';

export const DT = 1 / 60;

export function cargarGlb(ruta) {
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

/** @param {string | string[]} [ruta]  .glb de la zona (por defecto la selva); con varias, se juntan en un mismo mundo */
export async function crearSimulacion(ruta = 'public/models/zona_1_selva.glb') {
  const rutas = Array.isArray(ruta) ? ruta : [ruta];
  const escena = new THREE.Scene();
  const fisica = new MundoFisico();
  const triggers = new SistemaTriggers();
  const niveles = [];
  for (const r of rutas) niveles.push(construirNivel(await cargarGlb(r), escena, fisica, triggers, { vegetacion: 0.1 }));
  const nivel = niveles.length > 1 ? combinarNiveles(niveles) : niveles[0];
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

  const poderes = new Poderes(PULSO, ESCUDO, MANIPULACION, ESQUIVA);
  const interactuables = new Interactuables(nivel.interactuables, MANIPULACION);
  const losas = new Losas(nivel.dinamicos);
  const pulsos = new PoolPulsos(escena, fisica, PULSO, {
    alImpactar: (p, cuerpo) => {
      eventos.push(`impacto:${cuerpo?.type === 1 ? 'dinamico' : 'estatico'}`);
      sim.ultimoImpacto = cuerpo ? { cuerpo, pos: cuerpo.position.clone() } : null;
    },
  });
  const pecho = new THREE.Vector3();
  const llave = new EstadoLlave();

  const sim = {
    nivel, jugador, entrada, vida, checkpoints, puente, eventos, triggers, fisica, escena, camara,
    poderes, interactuables, losas, pulsos, llave,
    muerta: false,
    /** @type {{cuerpo: any, pos: any} | null} */
    ultimoImpacto: null,
    /**
     * Pulsa E: si hay una losa a la vista, la mueve (la losa y la puerta del pórtico piden su tercio de la
     * Llave del Sol: sin él devuelve 'falta'). Devuelve el tipo del objetivo (o null).
     */
    manipular() {
      const o = interactuables.objetivo;
      if (!o) return null;
      if (o.tipo === 'losa' && o.datos.sol && !llave.colocados.has(o.datos.sol) && !llave.colocar(o.datos.sol)) return 'falta';
      if (o.tipo === 'losa' && losas.activar(o.objeto)) interactuables.desactivar(o);
      return o.tipo;
    },
    /** Los tres tercios recogidos y el portal de la cascada despierto (lo que hace el pedestal). */
    despertarPortal() {
      llave.importar({ soles: ['agua', 'jade', 'oro'], sellos: ['agua'] });
    },
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
        pulsos.actualizar(DT);
        losas.actualizar(DT);
        poderes.actualizar(DT);
        pecho.copy(jugador.posicion).y += 1.2;
        interactuables.actualizar(DT, pecho, camara, () => true);
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
    // El arco de la cascada duerme hasta que se le presenta la Llave del Sol completa
    if (d.evento === 'portal' && d.destino === 'portal_cornisa' && !llave.portalActivo) {
      eventos.push('portal_dormido');
    } else if (d.evento === 'portal' && enfriamiento.usar()) {
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
