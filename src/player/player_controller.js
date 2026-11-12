// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRAVEDAD, GRUPOS } from '../core/physics_world.js';
import { acercar, actualizarSalto, anguloMasCorto, crearEstadoSalto, velocidadSalto } from './movement_logic.js';

const ARRIBA = new THREE.Vector3(0, 1, 0);

/**
 * Victoria como cuerpo físico (cápsula de tres esferas, sin rotación) con control arcade:
 * la velocidad horizontal se lleva hacia la deseada; la vertical la gobierna la física.
 */
export class ControladorJugador {
  /**
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {import('../core/input.js').Entrada} entrada
   * @param {THREE.Object3D} modelo
   * @param {typeof import('../config/player.js').PLAYER} cfg  copia editable de src/config/player.js
   */
  constructor(fisica, entrada, modelo, cfg) {
    this.fisica = fisica;
    this.entrada = entrada;
    this.modelo = modelo;
    this.cfg = cfg;
    this.mitad = cfg.altura_capsula / 2;
    const r = cfg.radio_capsula;

    const cuerpo = new CANNON.Body({
      mass: cfg.masa,
      material: fisica.materiales.jugador,
      fixedRotation: true,
      linearDamping: cfg.amortiguacion,
      allowSleep: false,
      collisionFilterGroup: GRUPOS.JUGADOR,
      collisionFilterMask: GRUPOS.MUNDO | GRUPOS.ENEMIGOS | GRUPOS.PROYECTILES_ENEMIGOS | GRUPOS.DINAMICOS,
    });
    cuerpo.addShape(new CANNON.Sphere(r), new CANNON.Vec3(0, -this.mitad + r, 0));
    cuerpo.addShape(new CANNON.Sphere(r), new CANNON.Vec3(0, 0, 0));
    cuerpo.addShape(new CANNON.Sphere(r), new CANNON.Vec3(0, this.mitad - r, 0));
    cuerpo.updateMassProperties();
    fisica.world.addBody(cuerpo);
    this.cuerpo = cuerpo;

    // Estado que lee el animador
    this.enSuelo = false;
    this.corriendo = false;
    this.velocidad = 0;
    this.velVertical = 0;
    this.orientacion = 0;
    this.aterrizaje = 0;
    this.salto = false;
    /** Cuerpo físico sobre el que está parada (para el puente). @type {CANNON.Body | null} */
    this.cuerpoSuelo = null;
    /** Mientras está muerta o en una cinemática, el jugador no controla a Victoria. */
    this.bloqueado = false;
    /**
     * Cinemáticas: Victoria corre sola por estos puntos (con su animación de siempre) y frena al llegar.
     * Se vacía al llegar al último. @type {THREE.Vector3[]}
     */
    this.autopiloto = [];
    /** Mantiene el clic derecho: la cámara va sobre el hombro y Victoria mira hacia donde apunta. */
    this.apuntando = false;
    /** Posición de los pies (para la cámara, el HUD y los triggers). */
    this.posicion = new THREE.Vector3();

    this._salto = crearEstadoSalto();
    this._contactoSuelo = false;
    this._desde = new CANNON.Vec3();
    this._hasta = new CANNON.Vec3();
    this._rayo = new CANNON.RaycastResult();
    this._opcionesRayo = { collisionFilterMask: GRUPOS.MUNDO | GRUPOS.DINAMICOS, skipBackfaces: true };
    this._adelante = new THREE.Vector3();
    this._derecha = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    // Esquiva: impulso corto en la dirección de la entrada (o hacia delante)
    this._esquivaT = 0;
    this._esquivaV = 0;
    this._esquivaDir = new THREE.Vector3();
    // Al disparar o interactuar, Victoria gira hacia donde apunta la cámara
    this._rumboForzado = 0;
    this._tForzado = 0;

    // Comprobación de suelo por contacto (semana 6): normal del contacto hacia arriba.
    /** @type {CANNON.Body | null} */
    this._cuerpoContacto = null;
    cuerpo.addEventListener('collide', (/** @type {any} */ e) => {
      const ni = e.contact.ni;
      const signo = e.contact.bi === cuerpo ? -1 : 1;
      if (ni.y * signo > 0.5) {
        this._contactoSuelo = true;
        this._cuerpoContacto = e.contact.bi === cuerpo ? e.contact.bj : e.contact.bi;
      }
    });
  }

  /**
   * Coloca a Victoria (aparición, portal, reaparición) con su cuerpo físico.
   * @param {THREE.Vector3} pies
   * @param {number} [rumbo]
   */
  colocar(pies, rumbo) {
    this.cuerpo.position.set(pies.x, pies.y + this.mitad + 0.05, pies.z);
    this.cuerpo.velocity.set(0, 0, 0);
    this.cuerpo.wakeUp();
    if (rumbo !== undefined) this.orientacion = rumbo;
    this.posicion.set(pies.x, pies.y, pies.z);
    this.modelo.position.copy(this.posicion);
    this.modelo.rotation.y = this.orientacion;
  }

  /**
   * Esquiva (sección 5.2): 'distancia' metros en 'duracion' segundos.
   * @param {{distancia:number, duracion:number}} cfg
   */
  esquivar(cfg) {
    if (this._dir.lengthSq() > 1e-4) this._esquivaDir.copy(this._dir);
    else this._esquivaDir.set(Math.sin(this.orientacion), 0, Math.cos(this.orientacion));
    this._esquivaT = cfg.duracion;
    this._esquivaV = cfg.distancia / cfg.duracion;
  }

  /** Gira a Victoria hacia un rumbo durante un momento (disparar, manipular). @param {number} rumbo @param {number} tiempo */
  mirarHacia(rumbo, tiempo) {
    this._rumboForzado = rumbo;
    this._tForzado = tiempo;
  }

  /**
   * @param {number} dt
   * @param {THREE.Camera} camara
   */
  actualizar(dt, camara) {
    const cfg = this.cfg;
    const e = this.entrada;
    const b = this.cuerpo;

    // Suelo: rayo hacia abajo + contacto
    this._desde.set(b.position.x, b.position.y, b.position.z);
    this._hasta.set(b.position.x, b.position.y - this.mitad - 0.25, b.position.z);
    this._rayo.reset();
    this.fisica.world.raycastClosest(this._desde, this._hasta, this._opcionesRayo, this._rayo);
    const estabaEnSuelo = this.enSuelo;
    const porRayo = this._rayo.hasHit && this._rayo.distance <= this.mitad + 0.1;
    this.enSuelo = (porRayo || this._contactoSuelo) && b.velocity.y <= 0.6;
    // Si el rayo cae en una rendija, el contacto dice sobre qué cuerpo está apoyada
    this.cuerpoSuelo = porRayo ? this._rayo.body : this._contactoSuelo ? this._cuerpoContacto : null;
    this._contactoSuelo = false;
    if (!estabaEnSuelo && this.enSuelo) this.aterrizaje = Math.min(1, Math.abs(this.velVertical) / 9);

    // Dirección relativa a la cámara
    camara.getWorldDirection(this._adelante);
    this._adelante.y = 0;
    this._adelante.normalize();
    this._derecha.crossVectors(this._adelante, ARRIBA).normalize();
    let ix = 0;
    let iz = 0;
    if (!this.bloqueado) {
      if (e.mantiene('adelante')) iz += 1;
      if (e.mantiene('atras')) iz -= 1;
      if (e.mantiene('derecha')) ix += 1;
      if (e.mantiene('izquierda')) ix -= 1;
    }
    this._dir.set(0, 0, 0).addScaledVector(this._adelante, iz).addScaledVector(this._derecha, ix);
    // Piloto automático (cinemáticas): la dirección va al siguiente punto; frena en los últimos metros
    let frenoPiloto = Infinity;
    if (this.autopiloto.length) {
      const p = this.autopiloto[0];
      this._dir.set(p.x - b.position.x, 0, p.z - b.position.z);
      const d = this._dir.length();
      const ultimo = this.autopiloto.length === 1;
      if (d < (ultimo ? 0.15 : 0.6)) {
        this.autopiloto.shift();
        this._dir.set(0, 0, 0);
      } else if (ultimo) frenoPiloto = d * 2.6;
    }
    const hayEntrada = this._dir.lengthSq() > 1e-4;
    if (hayEntrada) this._dir.normalize();

    // Apuntando (clic derecho) no corre y camina más despacio, de lado o hacia atrás sin dejar de apuntar
    this.corriendo = hayEntrada && (e.mantiene('correr') || this.autopiloto.length > 0) && !this.apuntando;
    const vmax = Math.min(frenoPiloto,
      this.apuntando ? cfg.velocidad_caminar * cfg.factor_apuntar : this.corriendo ? cfg.velocidad_correr : cfg.velocidad_caminar);
    const acel = this.enSuelo ? (hayEntrada ? cfg.aceleracion : cfg.frenado) : cfg.aceleracion_aire;
    if (this._esquivaT > 0) {
      this._esquivaT -= dt;
      b.velocity.x = this._esquivaDir.x * this._esquivaV;
      b.velocity.z = this._esquivaDir.z * this._esquivaV;
    } else {
      b.velocity.x = acercar(b.velocity.x, this._dir.x * vmax, acel * dt);
      b.velocity.z = acercar(b.velocity.z, this._dir.z * vmax, acel * dt);
    }

    // Salto con coyote time y memoria de tecla; gravedad extra al caer
    this.salto = false;
    if (actualizarSalto(this._salto, dt, this.enSuelo, !this.bloqueado && e.pulso('saltar'), cfg)) {
      b.velocity.y = velocidadSalto(cfg.altura_salto, GRAVEDAD) * cfg.compensacion_amortiguacion;
      this.enSuelo = false;
      this.salto = true;
    }
    if (!this.enSuelo && b.velocity.y < 0) b.velocity.y -= GRAVEDAD * (cfg.gravedad_extra_caida - 1) * dt;

    // Orientación del modelo: apuntando, siempre hacia donde mira la cámara (como en los juegos de
    // acción en tercera persona); si no, hacia donde dispara o hacia donde se mueve
    if (this.apuntando && this._esquivaT <= 0) {
      this.orientacion += anguloMasCorto(this.orientacion, Math.atan2(this._adelante.x, this._adelante.z)) * (1 - Math.exp(-dt * cfg.giro_apuntar));
    } else if (this._tForzado > 0) {
      this._tForzado -= dt;
      this.orientacion += anguloMasCorto(this.orientacion, this._rumboForzado) * (1 - Math.exp(-dt * cfg.giro * 2));
    } else if (this._esquivaT > 0) {
      this.orientacion += anguloMasCorto(this.orientacion, Math.atan2(this._esquivaDir.x, this._esquivaDir.z)) * (1 - Math.exp(-dt * cfg.giro * 2));
    } else if (hayEntrada) {
      const objetivo = Math.atan2(this._dir.x, this._dir.z);
      this.orientacion += anguloMasCorto(this.orientacion, objetivo) * (1 - Math.exp(-dt * cfg.giro));
    }

    this.velocidad = Math.hypot(b.velocity.x, b.velocity.z);
    this.velVertical = b.velocity.y;
    this.posicion.set(b.position.x, b.position.y - this.mitad, b.position.z);
    this.modelo.position.copy(this.posicion);
    this.modelo.rotation.y = this.orientacion;
  }
}
