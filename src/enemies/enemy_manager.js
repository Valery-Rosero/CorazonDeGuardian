// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRUPOS } from '../core/physics_world.js';
import { PoolPiezas } from './fragments.js';
import { PoolOrbes } from './orbs.js';
import { ActorCentinela } from './sentinel.js';
import { ActorEspectro } from './specter.js';

const _a = new CANNON.Vec3();
const _b = new CANNON.Vec3();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _imp = new THREE.Vector3();
const _pecho = new THREE.Vector3();

/**
 * @typedef {{
 *   danarJugador: (cantidad: number, origen: THREE.Vector3, orbe?: import('./orbs.js').Orbe) => 'dano' | 'bloqueo' | 'reflejo' | 'nada',
 *   alGolpeSuelo?: (pos: THREE.Vector3) => void,
 *   alMorir?: (actor: ActorCentinela | ActorEspectro, pos: THREE.Vector3) => void,
 *   alDanar?: (actor: ActorCentinela | ActorEspectro, pos: THREE.Vector3) => void,
 *   alEstado?: (actor: ActorCentinela | ActorEspectro, estado: string, pos: THREE.Vector3) => void,
 *   alDisparar?: (pos: THREE.Vector3) => void,
 *   alOrbeMuro?: (pos: THREE.Vector3) => void,
 *   estela?: (pos: THREE.Vector3, color: string) => void,
 * }} Avisos
 */

/**
 * Gestor de enemigos (sección 6): crea los centinelas y espectros a partir de los spawn_* que
 * tienen 'enemigo', les da su percepción (distancia y línea de visión con raycast de cannon-es),
 * reparte el daño en los dos sentidos y despierta o hace aparecer a los que el nivel pide.
 */
export class GestorEnemigos {
  /**
   * @param {THREE.Scene} escena
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {THREE.Object3D} modelos  escena del .glb de enemigos
   * @param {import('../world/level_loader.js').Spawn[]} spawns
   * @param {{centinela: any, espectro: any, orbe: any}} cfg
   * @param {THREE.Material} toon
   * @param {Avisos} avisos
   */
  constructor(escena, fisica, modelos, spawns, cfg, toon, avisos) {
    this.fisica = fisica;
    this.cfg = cfg;
    this.avisos = avisos;
    const plantillaC = modelos.getObjectByName('centinela');
    const plantillaE = modelos.getObjectByName('espectro');
    if (!plantillaC || !plantillaE) throw new Error('enemigos.glb no tiene las armaduras centinela y espectro');
    /** @type {ActorCentinela[]} */
    this.centinelas = [];
    /** @type {ActorEspectro[]} */
    this.espectros = [];
    spawns.forEach((s, i) => {
      if (s.datos.enemigo === 'centinela') this.centinelas.push(new ActorCentinela(plantillaC, fisica, cfg.centinela, s, toon));
      if (s.datos.enemigo === 'espectro') this.espectros.push(new ActorEspectro(plantillaE, fisica, cfg.espectro, s, toon, i * 1.7));
    });
    for (const a of this.todos) escena.add(a.raiz);
    /** @type {Map<CANNON.Body, ActorCentinela | ActorEspectro>} */
    this.porCuerpo = new Map(this.todos.map((a) => [a.cuerpo, a]));
    // Fragmentos del centinela (2 muertes a la vez) y máscaras de los espectros
    const frags = [];
    // Con varios materiales una pieza llega como grupo cuyas mallas hijas heredan el nombre: solo el de arriba cuenta
    modelos.traverse((o) => {
      if (o.name.startsWith('centinela_frag_') && !o.parent?.name.startsWith('centinela_frag_')) frags.push(o);
    });
    const mascara = modelos.getObjectByName('espectro_mascara');
    for (const f of frags) f.traverse((h) => { if (/** @type {THREE.Mesh} */ (h).isMesh) /** @type {THREE.Mesh} */ (h).material = toon; });
    /** Posición de reposo de cada fragmento respecto al pie del centinela. */
    this.reposo = new Map(frags.map((f) => [f.name, f.position.clone()]));
    const piezas = frags.map((f) => { const c = f.clone(); c.position.set(0, 0, 0); c.name = f.name; return c; });
    if (mascara) {
      const c = mascara.clone();
      c.position.set(0, 0, 0);
      c.traverse((h) => { if (/** @type {THREE.Mesh} */ (h).isMesh) /** @type {THREE.Mesh} */ (h).material = toon; });
      piezas.push(c);
    }
    this.piezas = new PoolPiezas(escena, fisica, piezas, 2);
    this.piezas.vida = cfg.centinela.fragmentos_vida;
    this.orbes = new PoolOrbes(escena, fisica, cfg.orbe);
    this._rayo = new CANNON.RaycastResult();
    this._vista = { collisionFilterMask: GRUPOS.MUNDO | GRUPOS.DINAMICOS, skipBackfaces: true };
    this._estados = new Map(this.todos.map((a) => [a, a.logica.estado]));
    this._jugador = { centro: new THREE.Vector3(), radio: 0.42, alto: 1.7 };
  }

  get todos() {
    return [...this.centinelas, ...this.espectros];
  }

  /** Raíces visuales (para el rayo de la mira). */
  get visuales() {
    return this.todos.map((a) => a.raiz);
  }

  /** ¿Hay algo sólido entre estos dos puntos? @param {THREE.Vector3} desde @param {THREE.Vector3} hasta */
  _tapado(desde, hasta) {
    _a.set(desde.x, desde.y, desde.z);
    _b.set(hasta.x, hasta.y, hasta.z);
    this._rayo.reset();
    this.fisica.world.raycastClosest(_a, _b, this._vista, this._rayo);
    return this._rayo.hasHit;
  }

  /** Despierta a los centinelas dormidos que esperan ese suceso (p. ej. 'escudo'). @param {string} suceso */
  despertar(suceso) {
    let n = 0;
    for (const c of this.centinelas) {
      if (c.spawn.datos.despierta === suceso && c.logica.estado === 'dormido') {
        c.logica.despertar();
        n++;
      }
    }
    return n;
  }

  /** Hace aparecer a los espectros que esperan ese suceso (p. ej. 'sala_espejos'). @param {string} suceso */
  aparecer(suceso) {
    let n = 0;
    for (const e of this.espectros) {
      if (e.spawn.datos.aparece === suceso && !e.activo) {
        e.activar();
        n++;
      }
    }
    return n;
  }

  /**
   * Un Pulso solar tocó un cuerpo: si es de un enemigo, le hace daño. Devuelve true si era un enemigo.
   * @param {CANNON.Body | null} cuerpo @param {number} dano @param {THREE.Vector3} punto
   */
  golpear(cuerpo, dano, punto) {
    const a = cuerpo ? this.porCuerpo.get(cuerpo) : undefined;
    if (!a || a.muerto) return false;
    if (a instanceof ActorEspectro && !a.activo) return false;
    if (a.logica.danar(dano)) this._morir(a);
    else this.avisos.alDanar?.(a, punto);
    return true;
  }

  /** @param {ActorCentinela | ActorEspectro} a */
  _morir(a) {
    a.pecho(_p);
    this.avisos.alMorir?.(a, _p.clone());
    if (a instanceof ActorCentinela) {
      // Se desmorona: sus piezas se sueltan como cuerpos dinámicos
      a.raiz.visible = false;
      this.fisica.world.removeBody(a.cuerpo);
      for (const [nombre, reposo] of this.reposo) {
        a.aMundo(reposo, _p);
        _imp.set(_p.x - a.cuerpo.position.x, 1.5, _p.z - a.cuerpo.position.z).normalize().multiplyScalar(2 + Math.random() * 2.5);
        _imp.y += 1 + Math.random() * 2;
        this.piezas.soltar(nombre, _p, a.giroMundo, _imp);
      }
    } else {
      a.cabezaMundo(_p, _q);
      a.soltarMascara();
      this.piezas.soltar('espectro_mascara', _p, _q, _imp.set((Math.random() - 0.5) * 1.5, 1.5, (Math.random() - 0.5) * 1.5));
    }
  }

  /**
   * Asistencia de puntería del Pulso (sección 5.5): si un enemigo vivo y visible está a menos de
   * 'grados' de la dirección del disparo, devuelve la dirección hacia su pecho.
   * @param {THREE.Vector3} origen @param {THREE.Vector3} dir @param {number} grados @param {number} alcance
   */
  asistencia(origen, dir, grados, alcance) {
    const cosMin = Math.cos(THREE.MathUtils.degToRad(grados));
    let mejor = null;
    let mejorCos = cosMin;
    for (const a of this.todos) {
      if (a.muerto || (a instanceof ActorEspectro && !a.activo)) continue;
      a.pecho(_pecho);
      _p.subVectors(_pecho, origen);
      const d = _p.length();
      if (d > alcance || d < 0.5) continue;
      const c = _p.dot(dir) / d;
      if (c > mejorCos && !this._tapado(origen, _pecho)) {
        mejorCos = c;
        mejor = _p.clone().normalize();
      }
    }
    return mejor;
  }

  /**
   * @param {number} dt
   * @param {number} t
   * @param {THREE.Vector3} pies  posición de Victoria
   * @param {boolean} vivo
   */
  actualizar(dt, t, pies, vivo) {
    const pechoJ = _pecho.copy(pies).setY(pies.y + 1.25);
    const ojo = new THREE.Vector3();
    const jug = { x: pies.x, z: pies.z };
    for (const c of this.centinelas) {
      if (c.muerto) continue;
      c.pecho(ojo);
      ojo.y += 0.55;
      // Solo se mira si está cerca (ahorra raycasts) y a la altura de su piso
      const cerca = Math.abs(pies.y - (c.cuerpo.position.y - c.mitad)) < 4 && ojo.distanceToSquared(pechoJ) < 30 * 30;
      const visible = vivo && cerca && !this._tapado(ojo, pechoJ);
      c.actualizar(dt, t, { yo: { x: c.cuerpo.position.x, z: c.cuerpo.position.z }, jugador: jug, visible, jugadorVivo: vivo },
        (desde, dirMov) => !this._tapado(desde, _p.copy(desde).addScaledVector(dirMov, this.cfg.centinela.rodeo)));
      this._avisarEstado(c);
      if (c.logica.golpe) {
        c.pecho(_p);
        _p.y = c.cuerpo.position.y - c.mitad;
        this.avisos.alGolpeSuelo?.(_p.clone());
        const dx = pies.x - _p.x;
        const dz = pies.z - _p.z;
        if (vivo && dx * dx + dz * dz <= this.cfg.centinela.radio_golpe ** 2 && Math.abs(pies.y - _p.y) < 1.6) {
          this.avisos.danarJugador(this.cfg.centinela.dano, _p);
        }
      }
    }
    const mano = new THREE.Vector3();
    for (const e of this.espectros) {
      if (!e.activo) continue;
      e.pecho(ojo);
      const visible = vivo && !e.muerto && !this._tapado(ojo, pechoJ);
      e.actualizar(dt, t, { yo: { x: e.cuerpo.position.x, z: e.cuerpo.position.z }, jugador: jug, visible, jugadorVivo: vivo });
      this._avisarEstado(e);
      if (!e.muerto && e.raiz.visible && Math.random() < dt * 10) {
        _p.set(e.raiz.position.x + (Math.random() - 0.5) * 0.5, e.raiz.position.y + this.cfg.espectro.altura + Math.random() * 0.3,
          e.raiz.position.z + (Math.random() - 0.5) * 0.5);
        this.avisos.estela?.(_p, '#7FC8F5');
      }
      if (e.logica.disparo) {
        e.mano(mano);
        const dir = new THREE.Vector3().subVectors(pechoJ, mano).normalize();
        this.orbes.disparar(mano, dir, e);
        this.avisos.alDisparar?.(mano.clone());
      }
    }
    // Orbes: contra Victoria, contra el escenario y, si se devolvieron, contra los enemigos
    this._jugador.centro.copy(pies);
    this.orbes.actualizar(dt, this._jugador, {
      alJugador: (o) => {
        const r = this.avisos.danarJugador(this.cfg.espectro.dano, o.pos, o);
        if (r === 'reflejo' && o.dueno) {
          o.dueno.pecho(_p);
          this.orbes.devolver(o, _p);
        } else {
          this.avisos.alOrbeMuro?.(o.pos.clone());
          this.orbes.apagar(o);
        }
      },
      alMuro: (o, p) => this.avisos.alOrbeMuro?.(p.clone()),
      alEnemigo: (o) => {
        for (const a of this.todos) {
          if (a.muerto || (a instanceof ActorEspectro && !a.activo)) continue;
          a.pecho(_p);
          if (_p.distanceToSquared(o.pos) < 0.9 * 0.9) {
            this.golpear(a.cuerpo, this.cfg.espectro.dano * 2, o.pos);
            this.avisos.alOrbeMuro?.(o.pos.clone());
            this.orbes.apagar(o);
            return true;
          }
        }
        return false;
      },
      estela: (p) => { if (Math.random() < 0.5) this.avisos.estela?.(p, '#8FD3FF'); },
    });
    this.piezas.actualizar(dt);
  }

  /** @param {ActorCentinela | ActorEspectro} a */
  _avisarEstado(a) {
    const antes = this._estados.get(a);
    const ahora = a.logica.estado;
    if (antes === ahora) return;
    this._estados.set(a, ahora);
    a.pecho(_p);
    this.avisos.alEstado?.(a, ahora, _p.clone());
  }

  /** Al reaparecer Victoria: los enemigos vivos vuelven a su puesto con la vida completa. */
  reiniciar() {
    for (const c of this.centinelas) {
      if (c.muerto) continue;
      c.colocar(c.spawn.pos, c.spawn.rumbo);
      c.logica.vida = c.cfg.vida;
      if (c.logica.estado !== 'dormido') c.logica.fsm.cambiar('guardia');
    }
    for (const e of this.espectros) {
      if (e.muerto || !e.activo) continue;
      e.cuerpo.position.set(e.spawn.pos.x, e.alturaCentro, e.spawn.pos.z);
      e.logica.vida = e.cfg.vida;
      e.logica.fsm.cambiar('flotar');
    }
    for (const o of this.orbes.lista) this.orbes.apagar(o);
  }

  /** Enemigos vivos que esperan o ya despertaron por un suceso (para saber si una sala está despejada). */
  vivos() {
    return this.todos.filter((a) => !a.muerto && (!(a instanceof ActorEspectro) || a.activo)).length;
  }
}
