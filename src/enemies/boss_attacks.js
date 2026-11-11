// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PALETA } from '../config/palette.js';
import { GRUPOS } from '../core/physics_world.js';
import { materialHaz } from '../interaction/mirror_puzzle.js';

const LEJOS = -9500;
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _l = new THREE.Line3();

/** Material de aviso en el suelo: aditivo, sin escribir profundidad. @param {string} color @param {number} opacidad */
function materialAviso(color, opacidad) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
}

/**
 * Rocas que caen (lluvia de rocas del Guardián y derrumbes del escape): pool de 20 cuerpos dinámicos
 * creados al cargar (sección 7.4), cada una con su sombra de aviso en el suelo 1 s antes de caer.
 */
export class PoolRocas {
  /**
   * @param {THREE.Scene} escena
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {typeof import('../config/boss.js').ROCAS} cfg
   */
  constructor(escena, fisica, cfg) {
    this.fisica = fisica;
    this.cfg = cfg;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: PALETA.piedra, roughness: 0.95, flatShading: true });
    const sombraGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    const sombraMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.0, depthWrite: false });
    this.lista = Array.from({ length: cfg.pool }, (_, i) => {
      const r = cfg.radio_min + (cfg.radio_max - cfg.radio_min) * ((i * 7) % cfg.pool) / cfg.pool;
      const malla = new THREE.Mesh(geo, mat);
      malla.scale.setScalar(r);
      malla.castShadow = true;
      malla.visible = false;
      escena.add(malla);
      const sombra = new THREE.Mesh(sombraGeo, sombraMat.clone());
      sombra.scale.setScalar(r * 1.6);
      sombra.visible = false;
      escena.add(sombra);
      const cuerpo = new CANNON.Body({
        mass: 120 * r, material: fisica.materiales.esfera, linearDamping: 0.1, allowSleep: true,
        collisionFilterGroup: GRUPOS.DINAMICOS, collisionFilterMask: GRUPOS.MUNDO | GRUPOS.DINAMICOS,
      });
      cuerpo.addShape(new CANNON.Sphere(r));
      cuerpo.position.set(i * 3, LEJOS, 0);
      cuerpo.sleep();
      fisica.world.addBody(cuerpo);
      return { malla, sombra, cuerpo, r, activo: false, t: 0, aviso: 1, suelo: new THREE.Vector3(), golpeo: false, dano: 0 };
    });
  }

  /**
   * Programa una roca que cae exactamente sobre 'suelo' dentro de 'aviso' segundos.
   * @param {THREE.Vector3} suelo @param {number} aviso @param {number} dano
   */
  soltar(suelo, aviso, dano) {
    const p = this.lista.find((x) => !x.activo) ?? this.lista.reduce((a, b) => (a.t > b.t ? a : b));
    p.activo = true;
    p.t = 0;
    p.golpeo = false;
    p.dano = dano;
    p.aviso = aviso;
    p.suelo.copy(suelo);
    p.sombra.position.set(suelo.x, suelo.y + 0.03, suelo.z);
    p.sombra.visible = true;
    // Sale desde arriba con la velocidad justa para llegar al suelo al terminar el aviso
    const h = this.cfg.altura;
    const vy = -(h - 0.5 * 9.82 * aviso * aviso) / aviso;
    p.cuerpo.position.set(suelo.x, suelo.y + h + p.r, suelo.z);
    p.cuerpo.velocity.set(0, vy, 0);
    p.cuerpo.angularVelocity.set(Math.random() * 4, Math.random() * 4, Math.random() * 4);
    p.cuerpo.wakeUp();
    p.malla.visible = true;
    return p;
  }

  /**
   * @param {number} dt
   * @param {THREE.Vector3} jugador
   * @param {(dano: number, pos: THREE.Vector3) => void} alGolpear
   */
  actualizar(dt, jugador, alGolpear) {
    for (const p of this.lista) {
      if (!p.activo) continue;
      p.t += dt;
      const b = p.cuerpo;
      p.malla.position.set(b.position.x, b.position.y, b.position.z);
      p.malla.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      // La sombra se oscurece y se achica a medida que se acerca la roca
      const u = Math.min(1, p.t / (p.aviso || 1));
      p.sombra.material.opacity = 0.15 + u * 0.45;
      if (!p.golpeo && p.t >= (p.aviso || 1)) {
        p.golpeo = true;
        p.sombra.visible = false;
        if (Math.hypot(jugador.x - p.suelo.x, jugador.z - p.suelo.z) < p.r + 0.6 && Math.abs(jugador.y - p.suelo.y) < 2) alGolpear(p.dano, p.suelo);
      }
      if (p.t > (p.aviso || 1) + 2.5) {
        p.activo = false;
        p.malla.visible = false;
        b.velocity.set(0, 0, 0);
        b.position.set(b.position.x, LEJOS, 0);
        b.sleep();
      }
    }
  }

  limpiar() {
    for (const p of this.lista) p.t = 99;
  }
}

/**
 * Los ataques del Guardián (sección 7.1) vistos y sentidos: cada uno muestra su aviso, se oye y,
 * en el momento del golpe, comprueba si alcanza a Victoria. El daño pasa por el callback del juego
 * (así el Escudo y la esquiva funcionan igual que con los otros enemigos).
 */
export class AtaquesGuardian {
  /**
   * @param {THREE.Scene} escena
   * @param {typeof import('../config/boss.js').ATAQUES} cfg
   * @param {PoolRocas} rocas
   * @param {{danar: (dano: number, pos: THREE.Vector3) => void, sonido: (n: string, p?: THREE.Vector3) => void,
   *          sacudida: (f: number) => void, rafaga: (p: THREE.Vector3, n: number, c: string, f?: number) => void}} avisos
   */
  constructor(escena, cfg, rocas, avisos) {
    this.cfg = cfg;
    this.rocas = rocas;
    this.avisos = avisos;
    // Golpe sísmico: círculo dorado de aviso y anillo que se expande por el suelo
    this.circulo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), materialAviso(PALETA.oro_brillante, 0.55));
    this.anillo = new THREE.Mesh(new THREE.RingGeometry(0.5, 1, 64).rotateX(-Math.PI / 2), materialAviso('#FFB347', 0.85));
    // Barrido: sector rojizo delante del Guardián
    const ang = THREE.MathUtils.degToRad(cfg.barrido.angulo);
    this.sector = new THREE.Mesh(new THREE.CircleGeometry(1, 32, -ang / 2 + Math.PI / 2, ang).rotateX(-Math.PI / 2), materialAviso('#FF6A2B', 0.35));
    // Rayo solar: fino mientras apunta, grueso al disparar
    this.matRayo = materialHaz();
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
    this.rayo = new THREE.Mesh(geo, this.matRayo);
    this.rayo.frustumCulled = false;
    for (const m of [this.circulo, this.anillo, this.sector, this.rayo]) {
      m.visible = false;
      m.renderOrder = 2;
      escena.add(m);
    }
    this.radioAnillo = -1;
    this.anilloGolpeo = false;
    this.mira = new THREE.Vector3();
    this.dirRayo = new THREE.Vector3();
    this.disparo = 0;
    this.rayoGolpeo = false;
    /** @type {string | null} */
    this.actual = null;
    this.t = 0;
    this.aviso = 1;
  }

  /**
   * Empieza el aviso de un ataque.
   * @param {string} tipo @param {number} aviso  s (ya escalado por la furia)
   * @param {import('./guardian.js').ActorGuardian} g @param {THREE.Vector3} jugador
   */
  empezar(tipo, aviso, g, jugador) {
    this.actual = tipo;
    this.t = 0;
    this.aviso = aviso;
    const pie = g.raiz.position;
    if (tipo === 'sismico') {
      this.circulo.position.set(pie.x, pie.y + 0.05, pie.z);
      this.circulo.visible = true;
      this.avisos.sonido('guardian_aviso', pie);
    } else if (tipo === 'barrido') {
      this.sector.position.set(pie.x, pie.y + 0.05, pie.z);
      this.sector.rotation.y = g.rumbo;
      this.sector.scale.setScalar(0.1);
      this.sector.visible = true;
      this.avisos.sonido('guardian_barrido', pie);
    } else if (tipo === 'rayo') {
      g.pecho(this.mira);
      this.mira.copy(jugador).setY(jugador.y + 1.2);
      this.rayo.visible = true;
      this.avisos.sonido('guardian_rayo', pie);
    } else if (tipo === 'rocas') {
      const c = this.cfg.rocas;
      for (let i = 0; i < c.cantidad; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = i === 0 ? 0 : 1.5 + Math.random() * c.dispersion;
        _v.set(jugador.x + Math.cos(a) * r, jugador.y, jugador.z + Math.sin(a) * r);
        this.rocas.soltar(_v, aviso, c.dano);
      }
      this.avisos.sonido('guardian_rugido', pie);
    } else if (tipo === 'invocacion') {
      this.avisos.sonido('guardian_rugido', pie);
    }
  }

  /**
   * El momento del golpe.
   * @param {string} tipo @param {import('./guardian.js').ActorGuardian} g
   * @param {THREE.Vector3} jugador @param {boolean} enSuelo
   */
  golpe(tipo, g, jugador, enSuelo) {
    const pie = g.raiz.position;
    if (tipo === 'sismico') {
      this.circulo.visible = false;
      this.radioAnillo = 1;
      this.anilloGolpeo = false;
      this.anillo.position.set(pie.x, pie.y + 0.06, pie.z);
      this.anillo.visible = true;
      this.avisos.sonido('guardian_sismico', pie);
      this.avisos.sacudida(0.6);
      this.avisos.rafaga(_v.copy(pie).setY(pie.y + 0.3), 40, PALETA.piedra_luz, 6);
    } else if (tipo === 'barrido') {
      this.sector.visible = false;
      const c = this.cfg.barrido;
      const dx = jugador.x - pie.x;
      const dz = jugador.z - pie.z;
      const d = Math.hypot(dx, dz);
      const dif = Math.atan2(Math.sin(Math.atan2(dx, dz) - g.rumbo), Math.cos(Math.atan2(dx, dz) - g.rumbo));
      if (d <= c.alcance && Math.abs(dif) <= THREE.MathUtils.degToRad(c.angulo) / 2 && jugador.y - pie.y < 3) {
        this.avisos.danar(c.dano, pie);
      }
      this.avisos.sacudida(0.3);
    } else if (tipo === 'rayo') {
      // El rayo dispara en la dirección fijada: grueso durante 'disparo' segundos
      this.disparo = this.cfg.rayo.disparo;
      this.rayoGolpeo = false;
      this.avisos.sacudida(0.25);
    }
  }

  /**
   * @param {number} dt @param {number} t
   * @param {import('./guardian.js').ActorGuardian} g
   * @param {THREE.Vector3} jugador
   * @param {boolean} enSuelo
   */
  actualizar(dt, t, g, jugador, enSuelo) {
    this.t += dt;
    this.matRayo.uniforms.uTiempo.value = t;
    const u = Math.min(1, this.t / this.aviso);
    if (this.circulo.visible) {
      // El círculo dorado crece y late durante el aviso
      const r = 2 + u * 2.5;
      this.circulo.scale.setScalar(r);
      this.circulo.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(t * 10));
    }
    if (this.radioAnillo > 0) {
      const c = this.cfg.sismico;
      this.radioAnillo += c.velocidad_anillo * dt;
      this.anillo.scale.setScalar(this.radioAnillo);
      this.anillo.material.opacity = 0.85 * (1 - this.radioAnillo / c.radio_max);
      // El anillo hace daño al pasar por debajo de Victoria si está en el suelo (saltando se esquiva)
      const pie = this.anillo.position;
      const d = Math.hypot(jugador.x - pie.x, jugador.z - pie.z);
      if (!this.anilloGolpeo && Math.abs(d - this.radioAnillo * 0.75) < c.ancho_anillo && enSuelo && Math.abs(jugador.y - pie.y) < 0.6) {
        this.anilloGolpeo = true;
        this.avisos.danar(c.dano, pie);
      }
      if (this.radioAnillo >= c.radio_max) {
        this.radioAnillo = -1;
        this.anillo.visible = false;
      }
    }
    if (this.sector.visible) {
      this.sector.scale.setScalar(0.2 + u * this.cfg.barrido.alcance);
      this.sector.rotation.y = g.rumbo;
      this.sector.material.opacity = 0.2 + 0.3 * u;
    }
    if (this.rayo.visible) {
      const origen = g.cabeza(_w);
      const c = this.cfg.rayo;
      if (this.disparo > 0) {
        this.disparo -= dt;
        this.rayo.scale.set(c.ancho, c.ancho, 40);
        // ¿Toca a Victoria? Distancia de su pecho a la línea del rayo
        _l.set(origen, _v.copy(origen).addScaledVector(this.dirRayo, 40));
        const pecho = _v.copy(jugador).setY(jugador.y + 1.1);
        const cerca = _l.closestPointToPoint(pecho, true, new THREE.Vector3());
        if (!this.rayoGolpeo && cerca.distanceTo(pecho) < c.ancho + 0.35) {
          this.rayoGolpeo = true;
          this.avisos.danar(c.dano, origen);
        }
        if (this.disparo <= 0) this.rayo.visible = false;
      } else {
        // Apunta siguiendo a Victoria; el último cuarto de segundo se queda fijo
        if (this.t < this.aviso - c.fijar) this.mira.lerp(_v.copy(jugador).setY(jugador.y + 1.1), Math.min(1, dt * 4));
        this.dirRayo.subVectors(this.mira, origen).normalize();
        this.rayo.scale.set(0.06, 0.06, origen.distanceTo(this.mira) + 6);
      }
      this.rayo.position.copy(origen);
      this.rayo.lookAt(_v.copy(origen).add(this.dirRayo));
    }
  }

  /** Apaga todos los avisos (núcleo abierto, derrota). */
  cortar() {
    this.circulo.visible = false;
    this.sector.visible = false;
    if (this.disparo <= 0) this.rayo.visible = false;
    this.actual = null;
  }
}
