// @ts-check
import * as THREE from 'three';
import { clonarMaterial } from '../world/shaders.js';
import { ATAQUES, GUARDIAN } from '../config/boss.js';
import { PALETA } from '../config/palette.js';
import { materialHaz } from '../interaction/mirror_puzzle.js';
import { AtaquesGuardian } from './boss_attacks.js';
import { LogicaGuardian } from './boss_logic.js';
import { ActorGuardian } from './guardian.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/**
 * El combate contra el Guardián del Sol (sección 7): une su cerebro, su cuerpo, sus ataques, los tres
 * pilares solares con sus rayos y la barra de vida. Lo que no es del combate (cinemáticas, diálogo,
 * escape) lo pide por los avisos.
 */
export class CombateGuardian {
  /**
   * @param {{
   *   escena: THREE.Scene, fisica: import('../core/physics_world.js').MundoFisico,
   *   glb: THREE.Object3D, toon: THREE.Material, spawn: import('../world/level_loader.js').Spawn,
   *   centro: THREE.Vector3, interactuables: import('../interaction/interactables.js').Interactuables,
   *   rocas: import('./boss_attacks.js').PoolRocas,
   *   latido: THREE.PositionalAudio | null,
   *   avisos: {
   *     danar: (dano: number, pos: THREE.Vector3) => void,
   *     sonido: (n: string, p?: THREE.Vector3, v?: number) => void,
   *     sacudida: (f: number) => void,
   *     rafaga: (p: THREE.Vector3, n: number, c: string, f?: number) => void,
   *     fase: (fase: number) => void,
   *     invocar: () => void,
   *     derrota: () => void,
   *     barra: (visible: boolean, fraccion: number) => void,
   *     nota: (texto: string, s?: number) => void,
   *   },
   * }} d
   */
  constructor(d) {
    this.d = d;
    this.logica = new LogicaGuardian(GUARDIAN, ATAQUES);
    this.actor = new ActorGuardian(d.glb, d.fisica, GUARDIAN, d.spawn, d.toon);
    d.escena.add(this.actor.raiz);
    this.ataques = new AtaquesGuardian(d.escena, ATAQUES, d.rocas, {
      danar: d.avisos.danar, sonido: d.avisos.sonido, sacudida: d.avisos.sacudida, rafaga: d.avisos.rafaga,
    });
    // Pilares solares: su cristal brilla cuando se pueden encender y lanza un rayo al pecho al encenderlos
    this.pilares = d.interactuables.lista.filter((o) => o.tipo === 'pilar_solar')
      .sort((a, b) => Number(a.datos.pilar) - Number(b.datos.pilar))
      .map((o) => {
        /** @type {THREE.MeshStandardMaterial | null} */
        let cristal = null;
        o.objeto.traverse((h) => {
          const m = /** @type {THREE.Mesh} */ (h);
          if (m.isMesh && /** @type {THREE.Material} */ (m.material).name.includes('pilar')) {
            cristal = clonarMaterial(/** @type {THREE.MeshStandardMaterial} */ (m.material));
            m.material = cristal;
          }
        });
        const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
          materialHaz());
        haz.visible = false;
        haz.frustumCulled = false;
        d.escena.add(haz);
        const punta = o.objeto.position.clone().setY(o.objeto.position.y + 4.3);
        return { interactuable: o, cristal, haz, punta };
      });
    /** 'espera' (en el trono), 'despertando', 'combate', 'derrota' */
    this.estado = 'espera';
    this.brilloHaz = 0;
    this.d.latido?.setPlaybackRate(0.8);
  }

  get activo() {
    return this.estado === 'combate';
  }

  /** ¿Este interactuable es un pilar? Si lo es, lo intenta encender. @param {import('../interaction/interactables.js').Interactuable} o */
  usar(o) {
    if (o.tipo !== 'pilar_solar') return false;
    const i = this.pilares.findIndex((p) => p.interactuable === o);
    if (this.estado !== 'combate') {
      this.d.avisos.nota('El pilar está frío. Todavía no.', 2);
      return true;
    }
    if (this.logica.encenderPilar(i)) {
      this.d.avisos.sonido('pilar_enciende', this.pilares[i].punta);
      this.d.avisos.rafaga(this.pilares[i].punta, 30, PALETA.oro_brillante, 4);
    } else if (this.logica.nucleoAbierto) {
      this.d.avisos.nota('El núcleo ya está expuesto: ¡dispara!', 2);
    } else if (this.logica.recarga > 0) {
      this.d.avisos.nota('Los pilares se están recargando', 1.6);
    }
    return true;
  }

  /** Lo que despierta al Guardián (lo llama la cinemática del despertar al terminar). */
  empezarCombate() {
    this.estado = 'combate';
    this.actor.sentado = 0;
    this.logica.despertar();
    this.actor.ponerFase(1);
    this.d.avisos.barra(true, 1);
    this.d.latido?.setPlaybackRate(1);
  }

  /** Para la cinemática: se va levantando del trono. @param {number} u 0 = sentado, 1 = de pie */
  levantar(u) {
    this.actor.sentado = 1 - u;
    if (u > 0.3) this.actor.ponerFase(1);
  }

  /**
   * Un Pulso solar tocó un cuerpo. Devuelve true si era el Guardián.
   * @param {import('cannon-es').Body | null} cuerpo @param {number} dano @param {THREE.Vector3} punto
   */
  golpear(cuerpo, dano, punto) {
    if (!cuerpo || cuerpo !== this.actor.cuerpo) return false;
    // Solo el núcleo expuesto recibe daño; en las placas el pulso rebota
    const cerca = this.actor.pecho(_a).distanceTo(punto) < 1.9;
    if (cerca && this.logica.danar(dano)) {
      this.d.avisos.rafaga(punto, 22, '#FFFFFF', 4);
      this.d.avisos.barra(true, this.logica.vida / GUARDIAN.vida);
    } else {
      this.d.avisos.sonido('escudo_bloquear', punto, 0.5);
    }
    return true;
  }

  /** Dirección hacia el núcleo para la asistencia de puntería, si está expuesto. @param {THREE.Vector3} origen @param {THREE.Vector3} dir */
  asistencia(origen, dir) {
    if (!this.logica.nucleoAbierto) return null;
    this.actor.pecho(_a).sub(origen);
    const d = _a.length();
    return _a.dot(dir) / d > Math.cos(THREE.MathUtils.degToRad(8)) ? _a.normalize().clone() : null;
  }

  /**
   * @param {number} dt @param {number} t
   * @param {THREE.Vector3} jugador @param {boolean} enSuelo
   */
  actualizar(dt, t, jugador, enSuelo) {
    if (this.estado === 'derrota') return;
    const l = this.logica;
    const dist = Math.hypot(jugador.x - this.actor.raiz.position.x, jugador.z - this.actor.raiz.position.z);
    if (this.estado === 'combate') {
      for (const s of l.actualizar(dt, { distancia: dist })) this._suceso(s, jugador, enSuelo);
    }
    // Pose según el ataque en curso
    const pose = this.actor.pose;
    const a = l.ataque;
    const objetivo = { brazos: 0, golpe: 0, giro: 0, rugido: 0 };
    let alto = 0;
    if (a) {
      const aviso = l.aviso(a.tipo);
      const u = Math.min(1, a.t / aviso);
      if (a.tipo === 'sismico' || a.tipo === 'rocas') {
        objetivo.brazos = a.golpeo ? 0 : u;
        objetivo.golpe = a.golpeo ? 1 : 0;
      }
      if (a.tipo === 'sismico') {
        // Se agacha, salta con los brazos en alto y aterriza cuando nace el anillo
        const s = Math.max(0, (u - 0.35) / 0.65);
        alto = a.golpeo ? 0 : u < 0.35 ? -0.35 * (u / 0.35) : 1.6 * Math.sin(Math.PI * s) - 0.35 * (1 - s);
      } else if (a.tipo === 'barrido') {
        objetivo.giro = a.golpeo ? -0.9 : 0.9 * u;
      } else if (a.tipo === 'invocacion') {
        objetivo.brazos = 0.7;
        objetivo.rugido = 1;
      } else if (a.tipo === 'rayo') {
        objetivo.rugido = 0.4;
      }
    }
    for (const k of /** @type {const} */ (['brazos', 'golpe', 'giro', 'rugido'])) {
      pose[k] += (objetivo[k] - pose[k]) * Math.min(1, dt * (k === 'golpe' || k === 'giro' ? 14 : 6));
    }
    pose.alto = alto;
    this.actor.actualizar(dt, jugador, {
      mover: this.estado === 'combate' && !a, nucleoAbierto: l.nucleoAbierto, rapidez: l.ritmo,
    }, this.d.centro);
    // Pisadas pesadas: suenan y hacen temblar la cámara si Victoria está cerca
    if (this.actor.pisada) {
      this.d.avisos.sonido('roca_cae', this.actor.raiz.position, 0.35);
      if (dist < 14) this.d.avisos.sacudida(0.12 * (1 - dist / 14));
    }
    this.ataques.actualizar(dt, t, this.actor, jugador, enSuelo);
    this._pilares(dt, t);
  }

  /** @param {import('./boss_logic.js').Suceso} s @param {THREE.Vector3} jugador @param {boolean} enSuelo */
  _suceso(s, jugador, enSuelo) {
    const av = this.d.avisos;
    switch (s.tipo) {
      case 'aviso':
        this.ataques.empezar(s.ataque, this.logica.aviso(s.ataque), this.actor, jugador);
        break;
      case 'golpe':
        if (s.ataque === 'invocacion') av.invocar();
        else this.ataques.golpe(s.ataque, this.actor, jugador, enSuelo);
        break;
      case 'fase':
        this.actor.ponerFase(s.fase);
        this.d.latido?.setPlaybackRate(s.fase === 3 ? 1.6 : 1.25);
        av.fase(s.fase);
        break;
      case 'nucleo_abierto':
        this.ataques.cortar();
        this.brilloHaz = 1.4;
        av.sonido('acertijo_resuelto', this.actor.raiz.position, 0.6);
        av.sacudida(0.4);
        av.nota('¡El núcleo está expuesto!', 2.5);
        break;
      case 'nucleo_cerrado':
        av.sonido('losa_mover', this.actor.raiz.position, 0.7);
        break;
      case 'pilares_listos':
        av.nota('Los pilares vuelven a brillar', 2);
        break;
      case 'derrota':
        this.estado = 'derrota';
        this.ataques.cortar();
        for (const p of this.pilares) p.haz.visible = false;
        av.barra(false, 0);
        this.d.latido?.setPlaybackRate(0.6);
        av.derrota();
        break;
      default:
    }
  }

  /** @param {number} dt @param {number} t */
  _pilares(dt, t) {
    const l = this.logica;
    this.brilloHaz = Math.max(0, this.brilloHaz - dt);
    const pecho = this.actor.pecho(_b);
    this.pilares.forEach((p, i) => {
      const encendido = l.pilares[i].encendido;
      const disponible = this.estado === 'combate' && l.pilarDisponible(i);
      if (p.cristal) {
        p.cristal.emissiveIntensity = encendido ? 4 : disponible ? 1.2 + Math.sin(t * 4 + i) * 0.8 : 0.25;
      }
      // El rayo une el cristal con el pecho mientras el pilar está encendido (y destella al abrir el núcleo)
      p.haz.visible = encendido && (this.brilloHaz > 0 || !l.nucleoAbierto);
      if (p.haz.visible) {
        p.haz.position.copy(p.punta);
        p.haz.lookAt(pecho);
        const grosor = this.brilloHaz > 0 ? 3 : 1;
        p.haz.scale.set(grosor, grosor, p.punta.distanceTo(pecho));
        p.haz.material.uniforms.uTiempo.value = t;
      }
    });
  }

  /** Victoria murió durante el combate: el Guardián vuelve al trono con la vida completa. */
  reiniciar() {
    if (this.estado === 'derrota') return;
    this.logica = new LogicaGuardian(GUARDIAN, ATAQUES);
    this.estado = 'espera';
    this.actor.sentado = 1;
    this.actor.ponerFase(0);
    this.actor.cuerpo.position.set(this.d.spawn.pos.x, this.d.spawn.pos.y, this.d.spawn.pos.z);
    this.actor.rumbo = this.d.spawn.rumbo;
    this.ataques.cortar();
    this.d.rocas.limpiar();
    this.d.avisos.barra(false, 1);
    for (const p of this.pilares) p.haz.visible = false;
  }
}
