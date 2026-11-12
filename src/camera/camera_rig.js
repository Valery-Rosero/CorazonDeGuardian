// @ts-check
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { anguloMasCorto } from '../player/movement_logic.js';
import { Sacudida } from './shake.js';

const ARRIBA = new THREE.Vector3(0, 1, 0);
const CLAVES = /** @type {const} */ (['distancia', 'altura', 'lateral', 'fov', 'seguimiento']);

/**
 * Cámara en tercera persona (sección 9.1). PointerLockControls solo aporta la orientación;
 * aquí se calcula la posición (punto de giro = Victoria + hombro, menos la dirección por la distancia)
 * con seguimiento suave, colisión con las paredes, perfiles por zona, puntos de interés,
 * recentrado automático y sacudida.
 */
export class CamaraTerceraPersona {
  /**
   * @param {THREE.PerspectiveCamera} camara
   * @param {HTMLElement} dom
   * @param {Record<string, import('../config/camera_profiles.js').PerfilCamara>} perfiles
   * @param {typeof import('../config/camera_profiles.js').CAMERA_LIMITES} limites
   */
  constructor(camara, dom, perfiles, limites) {
    this.camara = camara;
    this.perfiles = perfiles;
    this.limites = limites;
    this.controles = new PointerLockControls(camara, dom);
    this.controles.minPolarAngle = limites.polar_min;
    this.controles.maxPolarAngle = limites.polar_max;
    this.controles.pointerSpeed = limites.sensibilidad;

    this.nombrePerfil = 'exploracion';
    this.actual = { ...perfiles.exploracion };
    this.objetivo = perfiles.exploracion;
    /** Perfiles de las zonas de cámara en las que está Victoria (la última manda). @type {string[]} */
    this.zonas = [];
    /** @type {THREE.Object3D[]} */
    this.colisionables = [];
    this.sacudida = new Sacudida(limites.sacudida_maxima);

    this.reloj = 0;
    this.ultimoRaton = 0;
    this.controles.addEventListener('change', () => {
      this.ultimoRaton = this.reloj;
      this.hint = null;
    });
    /** @type {THREE.Vector3 | null} */
    this.hint = null;
    this.finHint = 0;

    this._rayo = new THREE.Raycaster();
    /** @type {THREE.Intersection[]} */
    this._impactos = [];
    this._dir = new THREE.Vector3();
    this._derecha = new THREE.Vector3();
    this._pivote = new THREE.Vector3();
    this._seguido = new THREE.Vector3();
    this._atras = new THREE.Vector3();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._primera = true;
    /** La cámara vuelve sola detrás de Victoria al caminar sin tocar el ratón (Opciones; apagado por defecto). */
    this.recentrarAuto = false;
    // Recentrado con R: de la orientación actual a la de detrás de Victoria
    this._qDesde = new THREE.Quaternion();
    this._qHasta = new THREE.Quaternion();
    this._recentrado = -1;
    // Colisión como esfera: distancia actual suavizada y rayos alrededor del centro
    this._distancia = -1;
    this._arriba = new THREE.Vector3();
    this._fin = new THREE.Vector3();
    this._lado = new THREE.Vector3();
    this._anticipo = new THREE.Vector3();
  }

  /** Tecla R: la cámara vuelve detrás de Victoria, casi horizontal, en un instante suave. @param {number} rumbo */
  recentrar(rumbo) {
    this._qDesde.copy(this.camara.quaternion);
    this._euler.set(this.limites.inclinacion_defecto, rumbo + Math.PI, 0, 'YXZ');
    this._qHasta.setFromEuler(this._euler);
    this._recentrado = 0;
    this.hint = null;
  }

  /** Entra o sale de una zona de cámara (trg_box con 'perfil_camara'). @param {string} perfil @param {boolean} entra */
  zona(perfil, entra) {
    const i = this.zonas.lastIndexOf(perfil);
    if (entra) this.zonas.push(perfil);
    else if (i >= 0) this.zonas.splice(i, 1);
  }

  /** La cámara se inclina hacia un hito hasta que el jugador mueve el ratón. @param {THREE.Vector3} punto */
  mirarHacia(punto) {
    this.hint = punto;
    this.finHint = this.reloj + this.limites.hint_duracion;
  }

  /** Coloca la cámara detrás de Victoria al instante (tras un portal o al reaparecer). @param {number} rumbo */
  reorientar(rumbo) {
    this._euler.set(this.limites.inclinacion_defecto, rumbo + Math.PI, 0, 'YXZ');
    this.camara.quaternion.setFromEuler(this._euler);
    this._primera = true;
    this.hint = null;
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} pies  posición de los pies de Victoria
   * @param {{corriendo: boolean, velocidad: number, orientacion: number, apuntando?: boolean}} jugador
   */
  actualizar(dt, pies, jugador) {
    this.reloj += dt;
    const lim = this.limites;

    // La cámara de juego nunca se inclina de lado. La orientación sale de la propia cámara (el ratón la
    // gira), así que si una cinemática la dejó ladeada (el plano holandés de la fase 3), el giro quedaba
    // pegado; aquí se quita
    this._euler.setFromQuaternion(this.camara.quaternion, 'YXZ');
    if (Math.abs(this._euler.z) > 1e-5) {
      this._euler.z = 0;
      this.camara.quaternion.setFromEuler(this._euler);
    }

    // Perfil: el de la zona más reciente; en exploración, correr cambia a 'carrera'
    let perfil = this.zonas.length ? this.zonas[this.zonas.length - 1] : 'exploracion';
    if (perfil === 'exploracion' && jugador.corriendo) perfil = 'carrera';
    if (jugador.apuntando) perfil = 'apuntar';
    if (perfil !== this.nombrePerfil && perfil in this.perfiles) {
      this.nombrePerfil = perfil;
      this.objetivo = this.perfiles[perfil];
    }
    const p = this.actual;
    const km = 1 - Math.exp(-dt * lim.mezcla_perfil);
    for (let i = 0; i < CLAVES.length; i++) {
      const c = CLAVES[i];
      p[c] += (this.objetivo[c] - p[c]) * km;
    }

    // Recentrado con R, punto de interés o (si está activado) recentrado automático detrás de Victoria
    if (this._recentrado >= 0) {
      this._recentrado += dt;
      const u = Math.min(1, this._recentrado / lim.recentrar_duracion);
      this.camara.quaternion.slerpQuaternions(this._qDesde, this._qHasta, u * u * (3 - 2 * u));
      if (u >= 1) this._recentrado = -1;
    } else if (this.hint && this.reloj < this.finHint) {
      this._m.lookAt(this.camara.position, this.hint, ARRIBA);
      this._q.setFromRotationMatrix(this._m);
      this.camara.quaternion.slerp(this._q, 1 - Math.exp(-dt * lim.hint_rapidez));
    } else if (this.recentrarAuto && !jugador.apuntando && jugador.velocidad > 0.5 && this.reloj - this.ultimoRaton > lim.recentrar_espera) {
      this._euler.setFromQuaternion(this.camara.quaternion, 'YXZ');
      const deseado = jugador.orientacion + Math.PI;
      this._euler.y += anguloMasCorto(this._euler.y, deseado) * (1 - Math.exp(-dt * lim.recentrar_rapidez));
      this.camara.quaternion.setFromEuler(this._euler);
    }

    // Seguimiento suave del punto de giro
    if (this._primera) {
      this._seguido.copy(pies);
      this._primera = false;
    } else {
      this._seguido.lerp(pies, 1 - Math.exp(-dt * p.seguimiento));
    }
    this.camara.getWorldDirection(this._dir);
    this._derecha.crossVectors(this._dir, ARRIBA).normalize();
    this._pivote.copy(this._seguido);
    this._pivote.y += p.altura;
    this._pivote.addScaledVector(this._derecha, p.lateral);
    // Anticipación de mirada (sección 9.1): al correr, mira un poco por delante de Victoria
    const lead = jugador.apuntando ? 0 : Math.min(1, jugador.velocidad / 7) * lim.anticipacion;
    this._anticipo.lerp(this._fin.set(Math.sin(jugador.orientacion) * lead, 0, Math.cos(jugador.orientacion) * lead), 1 - Math.exp(-dt * 3));
    this._pivote.add(this._anticipo);

    // Colisión como una esfera: cinco rayos (centro y cuatro alrededor) desde el punto de giro hacia la
    // cámara; manda el obstáculo más cercano. Se acerca al instante y se aleja con suavidad (sin saltos).
    this._atras.copy(this._dir).negate();
    this._arriba.crossVectors(this._derecha, this._dir).normalize();
    let libre = p.distancia;
    const r = lim.radio_camara;
    for (let i = 0; i < 5; i++) {
      const dx = i === 1 ? r : i === 2 ? -r : 0;
      const dy = i === 3 ? r : i === 4 ? -r : 0;
      this._fin.copy(this._pivote).addScaledVector(this._atras, p.distancia).addScaledVector(this._derecha, dx).addScaledVector(this._arriba, dy);
      this._lado.subVectors(this._fin, this._pivote);
      const largo = this._lado.length();
      this._rayo.set(this._pivote, this._lado.divideScalar(largo));
      this._rayo.far = largo;
      this._impactos.length = 0;
      this._rayo.intersectObjects(this.colisionables, false, this._impactos);
      if (this._impactos.length > 0) libre = Math.min(libre, (this._impactos[0].distance / largo) * p.distancia - lim.margen_colision);
    }
    // Sexto rayo, desde el pecho de Victoria: lo que se interpone entre su cuerpo y la cámara (un pilar,
    // una columna) también acerca la cámara, para no perderla de vista
    this._lado.copy(this._seguido);
    this._lado.y += p.altura * 0.8;
    this._fin.copy(this._pivote).addScaledVector(this._atras, p.distancia).sub(this._lado);
    const largoPecho = this._fin.length();
    this._rayo.set(this._lado, this._fin.divideScalar(largoPecho));
    this._rayo.far = largoPecho;
    this._impactos.length = 0;
    this._rayo.intersectObjects(this.colisionables, false, this._impactos);
    if (this._impactos.length > 0) libre = Math.min(libre, (this._impactos[0].distance / largoPecho) * p.distancia - lim.margen_colision);
    libre = Math.max(lim.distancia_minima, libre);
    if (this._distancia < 0 || libre < this._distancia) this._distancia = libre;
    else this._distancia = Math.min(libre, this._distancia + lim.alejar_rapidez * dt);
    this.camara.position.copy(this._pivote).addScaledVector(this._atras, this._distancia);
    // Nunca por debajo del suelo de Victoria (al mirar hacia arriba)
    const suelo = this._seguido.y + lim.altura_minima;
    if (this.camara.position.y < suelo) this.camara.position.y = suelo;
    this.camara.position.add(this.sacudida.actualizar(dt, this.reloj));

    if (Math.abs(this.camara.fov - p.fov) > 0.01) {
      this.camara.fov = p.fov;
      this.camara.updateProjectionMatrix();
    }
  }
}
