// @ts-check
import * as THREE from 'three';
import { LLAVE, SOLES } from '../config/llave.js';
import { PORTAL } from '../config/level.js';
import { EstadoLlave } from './llave_logic.js';

/** @typedef {import('../config/llave.js').Sol} Sol */

const suave = (/** @type {number} */ t) => t * t * (3 - 2 * t);
const EJE_X = new THREE.Vector3(1, 0, 0);
const EJE_Y = new THREE.Vector3(0, 1, 0);
const EJE_Z = new THREE.Vector3(0, 0, 1);

/**
 * La Llave del Sol en el mundo (tablero docs/previews/llave_tablero.png): abre los cofres, lleva cada
 * tercio a la mano de Victoria, los junta sobre el pedestal, despierta el arco de runas de la cascada y
 * pone cada tercio en su cerradura. La lógica (qué se tiene y qué se puede abrir) está en EstadoLlave.
 *
 * Cada tercio es un objeto propio del .glb (sol_agua, sol_jade, sol_oro) con el origen en el centro del
 * disco y el frente hacia +Z local: juntar la llave es poner los tres en el mismo punto con el mismo giro.
 * Dónde queda cada uno colocado lo dicen los vacíos sello_* (posición y giro).
 *
 * @typedef {{
 *   mano: (destino: THREE.Vector3) => THREE.Vector3,
 *   chispa: (pos: THREE.Vector3, color: string, n: number) => void,
 *   rafaga: (pos: THREE.Vector3, color: string, n: number) => void,
 *   sonido: (nombre: string, pos?: THREE.Vector3, volumen?: number) => void,
 * }} EfectosLlave
 *
 * @typedef {{
 *   objeto: THREE.Object3D, t: number, duracion: number,
 *   desdeP: THREE.Vector3, desdeQ: THREE.Quaternion, desdeE: number,
 *   haciaP: () => THREE.Vector3, haciaQ: () => THREE.Quaternion, haciaE: number,
 *   estela: string | null, alTerminar: (() => void) | null,
 * }} Vuelo
 */
export class LlaveDelSol {
  /**
   * @param {THREE.Object3D} raiz  el nivel de la selva
   * @param {THREE.Object3D[]} giratorios  los objetos que el bucle hace girar (el arco de la cascada sale de ahí: lo gira la llave)
   * @param {EfectosLlave} efectos
   */
  constructor(raiz, giratorios, efectos) {
    this.estado = new EstadoLlave();
    this.efectos = efectos;
    /** @type {Record<string, {pieza: THREE.Object3D, tapa: THREE.Object3D | null, haz: THREE.ShaderMaterial | null, hazMalla: THREE.Object3D | null,
     *   ancla: THREE.Object3D | null, baseTapa: THREE.Quaternion, abierta: boolean, tTapa: number}>} */
    this.partes = {};
    for (const sol of SOLES) {
      const pieza = raiz.getObjectByName(`sol_${sol}`);
      if (!pieza) continue;
      // Su propio oro, menos encendido que el de los frisos: de cerca (cofre, cinemática) se lee la forma
      pieza.traverse((h) => {
        const m = /** @type {THREE.Mesh} */ (h);
        const mat = /** @type {THREE.MeshStandardMaterial} */ (m.material);
        if (!m.isMesh || !mat?.emissive) return;
        const propio = mat.clone();
        propio.emissiveIntensity = mat.emissiveIntensity * LLAVE.brilloTercio;
        propio.metalness = 0.6;
        propio.roughness = 0.35;
        m.material = propio;
      });
      const tapa = raiz.getObjectByName(`tapa_cofre_${sol}`) ?? null;
      const hazMalla = raiz.getObjectByName(`haz_cofre_${sol}`) ?? null;
      this.partes[sol] = {
        pieza, tapa, hazMalla, haz: hazMalla ? this._materialPropio(hazMalla) : null,
        ancla: raiz.getObjectByName(`sello_${sol}`) ?? null,
        baseTapa: tapa ? tapa.quaternion.clone() : new THREE.Quaternion(), abierta: false, tTapa: -1,
      };
    }
    // Cerraduras que se mueven (la losa y la puerta): el tercio colocado se hunde con ellas
    this.cerraduras = { jade: raiz.getObjectByName(LLAVE.objeto.jade) ?? null, oro: raiz.getObjectByName(LLAVE.objeto.oro) ?? null };
    // El arco de runas de la cascada: su propio material (las demás runas siguen latiendo juntas)
    this.arco = raiz.getObjectByName(LLAVE.objeto.agua) ?? null;
    /** @type {THREE.MeshStandardMaterial | null} */
    this.runasArco = null;
    if (this.arco) {
      const i = giratorios.indexOf(this.arco);
      if (i >= 0) giratorios.splice(i, 1);
      this.arco.traverse((h) => {
        const m = /** @type {THREE.Mesh} */ (h);
        const mat = /** @type {THREE.MeshStandardMaterial} */ (m.material);
        if (!m.isMesh || !mat?.name?.includes('runa')) return;
        this.runasArco ??= mat.clone();
        m.material = this.runasArco;
      });
    }
    this.centroArco = this.arco ? this.arco.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    this.despertar = 0;      // 0 dormido → 1 despierto
    this.despertando = false;
    /** @type {number} */
    this.giroArco = LLAVE.giroDormido;
    this.reloj = 0;
    /** @type {Vuelo[]} */
    this.vuelos = [];
    /** @type {{sol: Sol, t: number, inicio: THREE.Vector3, alRecoger: () => void} | null} */
    this.cofreAbriendo = null;
    /** La llave armada sobre el pedestal: gira mientras está completa */
    this.armada = false;
    this.giroLlave = 0;
    this.centroLlave = new THREE.Vector3();
    this.frenteLlave = new THREE.Quaternion();
    /** @type {Array<{t: number, pos: THREE.Vector3}>} chispas de las runas que se encienden una a una */
    this.chispasRunas = [];
    /** @type {Array<{t: number, fn: () => void}>} lo que pasa después de un rato de juego */
    this.esperas = [];
    this._v = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._qGiro = new THREE.Quaternion();
    this._mano = new THREE.Vector3();
    this._ponerArco(0);
  }

  /** El haz de cada cofre lleva su propio material: se apaga sin apagar el del altar. @param {THREE.Object3D} o */
  _materialPropio(o) {
    /** @type {THREE.ShaderMaterial | null} */
    let propio = null;
    o.traverse((h) => {
      const m = /** @type {THREE.Mesh} */ (h);
      const mat = /** @type {THREE.ShaderMaterial} */ (m.material);
      if (!m.isMesh || !mat?.isShaderMaterial || !mat.uniforms?.uIntensidad) return;
      if (!propio) {
        propio = mat.clone();
        propio.uniforms.uTiempo = mat.uniforms.uTiempo;   // el mismo reloj del polvo que el del altar
        propio.uniforms.uColor = { value: new THREE.Color(LLAVE.color[/** @type {Sol} */ (o.userData.cofre)] ?? '#FFD45E').lerp(new THREE.Color('#FFE7A8'), 0.55) };
      }
      m.material = propio;
    });
    return propio;
  }

  // ---------------- Lo que pide el juego

  /** @param {Sol} sol */
  cofreAbierto(sol) {
    return Boolean(this.partes[sol]?.abierta);
  }

  /**
   * Abre el cofre: la tapa gira, el tercio sube, gira en el aire y vuela a la mano.
   * @param {Sol} sol @param {() => void} alRecoger  cuando llega a la mano
   */
  abrirCofre(sol, alRecoger) {
    const p = this.partes[sol];
    if (!p || p.abierta) return false;
    p.abierta = true;
    p.tTapa = 0;
    this.cofreAbriendo = { sol, t: 0, inicio: p.pieza.position.clone(), alRecoger };
    this.efectos.sonido('losa_mover', p.pieza.getWorldPosition(this._v), 0.55);
    return true;
  }

  /**
   * La secuencia del pedestal, paso 1: los tercios salen de la mano y se juntan sobre el atril.
   * @param {THREE.Vector3} centro  dónde se arma la llave @param {THREE.Vector3} mirarA  hacia dónde mira su frente
   */
  armar(centro, mirarA) {
    this.centroLlave.copy(centro);
    const m = new THREE.Matrix4().lookAt(mirarA, centro, EJE_Y);   // +Z local hacia mirarA
    this.frenteLlave.setFromRotationMatrix(m);
    this.efectos.mano(this._mano);
    SOLES.forEach((sol, i) => {
      const p = this.partes[sol];
      if (!p || !this.estado.tiene(sol)) return;
      p.pieza.visible = true;
      p.pieza.position.copy(this._mano);
      p.pieza.scale.setScalar(0.4);
      const destino = centro.clone();
      this._volar(p.pieza, () => destino, () => this.frenteLlave, 1, 1.25 + i * 0.18, LLAVE.color[sol], i === 2 ? () => {
        this.armada = true;
        this.giroLlave = 0;
        this.efectos.rafaga(centro, '#FFE7A8', 60);
        this.efectos.sonido('brazalete', centro, 0.9);
      } : null);
    });
  }

  /** Paso 2: las runas del arco se encienden una a una y el arco acelera. */
  runas() {
    this.despertando = true;
    this.efectos.sonido('acertijo_resuelto', this.centroArco, 1);
    this.chispasRunas.length = 0;
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI * 2;
      this.chispasRunas.push({ t: 0.12 + i * 0.16, pos: this.centroArco.clone().add(new THREE.Vector3(Math.cos(a) * 1.35, Math.sin(a) * 1.35, -0.2)) });
    }
  }

  /**
   * Paso 3: el tercio de agua baja al atril; el jade y el oro vuelven a la mano.
   * @param {() => void} [alTerminar]
   */
  asentar(alTerminar) {
    this.armada = false;
    for (const sol of SOLES) {
      const p = this.partes[sol];
      if (!p || !this.estado.tiene(sol)) continue;
      if (sol === 'agua') {
        this.estado.colocar('agua');
        const { pos, quat } = this._pose(sol);
        this._volar(p.pieza, () => pos, () => quat, 1, 1.0, LLAVE.color.agua, () => {
          this.efectos.rafaga(pos, LLAVE.color.agua, 30);
          alTerminar?.();
        });
      } else {
        this._volarAMano(p.pieza, LLAVE.color[sol], 1.1, null);
      }
    }
  }

  /**
   * Pone un tercio en su cerradura (la losa o la puerta): vuela de la mano al hueco, se enciende y avisa
   * (entonces la piedra se hunde y el tercio con ella).
   * @param {Sol} sol @param {() => void} alEncajar
   */
  colocar(sol, alEncajar) {
    const p = this.partes[sol];
    if (!p || !this.estado.colocar(sol)) return false;
    this.efectos.mano(this._mano);
    p.pieza.visible = true;
    p.pieza.position.copy(this._mano);
    p.pieza.scale.setScalar(0.4);
    const { pos, quat } = this._pose(sol);
    this._volar(p.pieza, () => pos, () => quat, 1, LLAVE.volar * 1.3, LLAVE.color[sol], () => {
      this.efectos.rafaga(pos, LLAVE.color[sol], 40);
      this.efectos.sonido('pilar_enciende', pos, 0.8);
      this._pegarACerradura(sol);
      this.esperas.push({ t: LLAVE.encender, fn: alEncajar });   // con el reloj del juego (la pausa lo detiene)
    });
    return true;
  }

  // ---------------- Sin animación (partida guardada, escape, demostración)

  /** Deja el mundo como lo dice el estado: cofres abiertos, tercios en sus huecos y el arco despierto. */
  aplicarEstado() {
    for (const sol of SOLES) {
      const p = this.partes[sol];
      if (!p) continue;
      if (this.estado.recogidos.has(sol)) {
        p.abierta = true;
        p.tTapa = LLAVE.tapa;
        this._ponerTapa(p, 1);
        if (p.haz) p.haz.uniforms.uIntensidad.value = 0;
        if (p.hazMalla) p.hazMalla.visible = false;
        p.pieza.visible = false;
      }
      // Ya pegado a su losa o a su puerta (que quizá se hundió): no se toca
      const cerradura = /** @type {Record<string, THREE.Object3D | null>} */ (this.cerraduras)[sol];
      if (this.estado.colocados.has(sol) && !(cerradura && p.pieza.parent === cerradura)) {
        const { pos, quat } = this._pose(sol);
        p.pieza.visible = true;
        p.pieza.scale.setScalar(1);
        p.pieza.position.copy(pos);
        p.pieza.quaternion.copy(quat);
        this._pegarACerradura(sol);
      }
    }
    if (this.estado.portalActivo) {
      this.despertar = 1;
      this.despertando = false;
      this.giroArco = PORTAL.giro;
      this._ponerArco(1);
    }
  }

  // ---------------- Cada fotograma

  /** @param {number} dt */
  actualizar(dt) {
    this.reloj += dt;
    // Cofre que se abre: tapa, subida, giro en el aire y vuelo a la mano
    if (this.cofreAbriendo) this._avanzarCofre(dt);
    for (const sol of SOLES) {
      const p = this.partes[sol];
      if (!p) continue;
      if (p.tTapa >= 0 && p.tTapa < LLAVE.tapa) {
        p.tTapa = Math.min(LLAVE.tapa, p.tTapa + dt);
        this._ponerTapa(p, suave(p.tTapa / LLAVE.tapa));
        if (p.haz) p.haz.uniforms.uIntensidad.value = LLAVE.haz * (1 - p.tTapa / LLAVE.tapa);
        if (p.hazMalla && p.tTapa >= LLAVE.tapa) p.hazMalla.visible = false;
      }
    }
    for (let i = this.esperas.length - 1; i >= 0; i--) {
      const e = this.esperas[i];
      e.t -= dt;
      if (e.t > 0) continue;
      this.esperas.splice(i, 1);
      e.fn();
    }
    // Vuelos
    for (let i = this.vuelos.length - 1; i >= 0; i--) {
      const v = this.vuelos[i];
      v.t += dt;
      const u = suave(Math.min(1, v.t / v.duracion));
      const destino = v.haciaP();
      v.objeto.position.lerpVectors(v.desdeP, destino, u);
      // Un arco hacia arriba: no vuela en línea recta
      v.objeto.position.y += Math.sin(Math.PI * u) * 0.5;
      v.objeto.quaternion.slerpQuaternions(v.desdeQ, v.haciaQ(), u);
      v.objeto.scale.setScalar(v.desdeE + (v.haciaE - v.desdeE) * u);
      if (v.estela && u < 1) this.efectos.chispa(v.objeto.position, v.estela, 1);
      if (v.t >= v.duracion) {
        this.vuelos.splice(i, 1);
        v.alTerminar?.();
      }
    }
    // La llave armada gira sobre su eje
    if (this.armada) {
      this.giroLlave += dt * 1.4;
      this._qGiro.setFromAxisAngle(EJE_Z, this.giroLlave);
      this._q.copy(this.frenteLlave).multiply(this._qGiro);
      for (const sol of SOLES) {
        const p = this.partes[sol];
        if (!p || !this.estado.tiene(sol)) continue;
        p.pieza.position.copy(this.centroLlave);
        p.pieza.position.y += Math.sin(this.reloj * 2.4) * 0.03;
        p.pieza.quaternion.copy(this._q);
      }
    }
    // El arco de runas: dormido apenas brilla y gira despacio; al despertar se enciende y acelera
    if (this.despertando) {
      this.despertar = Math.min(1, this.despertar + dt / 1.6);
      this.giroArco = LLAVE.giroDormido + (PORTAL.giro - LLAVE.giroDormido) * this.despertar;
      for (const c of this.chispasRunas) {
        c.t -= dt;
        if (c.t <= 0 && c.t > -dt - 1e-6) {
          this.efectos.rafaga(c.pos, LLAVE.color.agua, 14);
          this.efectos.sonido('pilar_enciende', c.pos, 0.25);
        }
      }
      if (this.despertar >= 1) this.despertando = false;
    }
    this._ponerArco(this.despertar);
    if (this.arco) this.arco.rotation.z += dt * this.giroArco;
  }

  // ---------------- Interno

  /** @param {Sol} sol @returns {{pos: THREE.Vector3, quat: THREE.Quaternion}} */
  _pose(sol) {
    const a = this.partes[sol]?.ancla;
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    if (a) {
      a.getWorldPosition(pos);
      a.getWorldQuaternion(quat);
    }
    return { pos, quat };
  }

  /** El tercio de jade o de oro se hunde con la losa o con la puerta. @param {Sol} sol */
  _pegarACerradura(sol) {
    const c = /** @type {Record<string, THREE.Object3D | null>} */ (this.cerraduras)[sol];
    const p = this.partes[sol];
    if (c && p && p.pieza.parent !== c) c.attach(p.pieza);
  }

  /** @param {number} k  0 dormido, 1 despierto */
  _ponerArco(k) {
    if (!this.runasArco) return;
    const latido = k > 0 ? Math.sin(this.reloj * 2.2) * 0.3 * k : 0;
    this.runasArco.emissiveIntensity = LLAVE.runasDormidas + (LLAVE.runasDespiertas - LLAVE.runasDormidas) * k + latido;
  }

  /** @param {{tapa: THREE.Object3D | null, baseTapa: THREE.Quaternion}} p @param {number} u */
  _ponerTapa(p, u) {
    if (!p.tapa) return;
    const abre = THREE.MathUtils.degToRad(Number(p.tapa.userData.abre ?? -112));
    this._qGiro.setFromAxisAngle(EJE_X, abre * u);
    p.tapa.quaternion.copy(p.baseTapa).multiply(this._qGiro);
  }

  /** @param {number} dt */
  _avanzarCofre(dt) {
    const c = /** @type {NonNullable<typeof this.cofreAbriendo>} */ (this.cofreAbriendo);
    const p = this.partes[c.sol];
    c.t += dt;
    const t0 = LLAVE.tapa * 0.6;                 // empieza a subir con la tapa a medio abrir
    const t1 = t0 + LLAVE.subir;
    const t2 = t1 + LLAVE.flotar;
    if (c.t < t0) return;
    if (c.t < t2) {
      // Sube y se endereza mirando a Victoria, girando sobre sí mismo
      const u = suave(Math.min(1, (c.t - t0) / LLAVE.subir));
      p.pieza.position.copy(c.inicio);
      p.pieza.position.y += LLAVE.altura * u;
      // Crece al salir: en el aire se lee su forma de tercio de sol
      p.pieza.scale.setScalar(1 + (LLAVE.crecer - 1) * u);
      this._qGiro.setFromAxisAngle(EJE_Y, this.reloj * LLAVE.giro);
      this._q.setFromAxisAngle(EJE_X, -Math.PI / 2 * (1 - u));
      p.pieza.quaternion.copy(this._qGiro).multiply(this._q);
      if (Math.random() < 0.5) this.efectos.chispa(p.pieza.position, LLAVE.color[c.sol], 1);
      if (c.t - dt < t0) this.efectos.rafaga(p.pieza.position, '#FFE7A8', 30);
      return;
    }
    this.cofreAbriendo = null;
    this._volarAMano(p.pieza, LLAVE.color[c.sol], LLAVE.volar, () => {
      this.estado.recoger(c.sol);
      c.alRecoger();
    });
  }

  /** @param {THREE.Object3D} pieza @param {string} color @param {number} duracion @param {(() => void) | null} alTerminar */
  _volarAMano(pieza, color, duracion, alTerminar) {
    const destino = new THREE.Vector3();
    this._volar(pieza, () => this.efectos.mano(destino), () => pieza.quaternion, 0.35, duracion, color, () => {
      pieza.visible = false;
      pieza.scale.setScalar(1);
      this.efectos.rafaga(this.efectos.mano(destino), color, 18);
      alTerminar?.();
    });
  }

  /**
   * @param {THREE.Object3D} objeto @param {() => THREE.Vector3} haciaP @param {() => THREE.Quaternion} haciaQ
   * @param {number} escala @param {number} duracion @param {string | null} estela @param {(() => void) | null} alTerminar
   */
  _volar(objeto, haciaP, haciaQ, escala, duracion, estela, alTerminar) {
    // Si estaba pegado a otra cosa, vuelve al mundo del nivel sin saltar
    this.vuelos = this.vuelos.filter((v) => v.objeto !== objeto);
    this.vuelos.push({
      objeto, t: 0, duracion,
      desdeP: objeto.position.clone(), desdeQ: objeto.quaternion.clone(), desdeE: objeto.scale.x,
      haciaP, haciaQ, haciaE: escala, estela, alTerminar,
    });
  }
}
