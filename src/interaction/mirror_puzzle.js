// @ts-check
import * as THREE from 'three';
import { clonarMaterial } from '../world/shaders.js';
import { PALETA } from '../config/palette.js';
import { AcertijoEspejos } from '../world/light_beam_logic.js';

/** Haz de luz: cilindro aditivo que se desvanece hacia los bordes (lo bastante barato para la Iris Xe). */
export function materialHaz() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTiempo: { value: 0 }, uColor: { value: new THREE.Color(PALETA.oro_brillante) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vVista;
      void main() {
        vUv = uv;
        vec4 p = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vVista = normalize(-p.xyz);
        gl_Position = projectionMatrix * p;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vVista;
      void main() {
        float centro = pow(abs(dot(vNormal, vVista)), 1.5);
        float pulso = 0.8 + 0.2 * sin(vUv.y * 40.0 - uTiempo * 9.0);
        gl_FragColor = vec4(uColor * (0.35 + centro * 1.6) * pulso, centro * 0.9);
      }`,
  });
}

/**
 * Acertijo de los espejos solares en el santuario: lee del nivel los espejos, la ventana del rayo, la
 * sala y el cristal; dibuja el rayo (6 rebotes como máximo) y enciende lo que toca.
 */
export class AcertijoSantuario {
  /**
   * @param {THREE.Object3D} raiz  escena del nivel del santuario
   * @param {THREE.Scene} escena
   * @param {import('../interaction/interactables.js').Interactuable[]} interactuables
   * @param {typeof import('../config/enemies.js').ESPEJOS} cfg
   */
  constructor(raiz, escena, interactuables, cfg) {
    this.cfg = cfg;
    const origen = raiz.getObjectByName('rayo_origen');
    const min = raiz.getObjectByName('rayo_sala_min');
    const max = raiz.getObjectByName('rayo_sala_max');
    this.cristal = raiz.getObjectByName('prop_cristal_solar') ?? null;
    if (!origen || !min || !max || !this.cristal) throw new Error('El santuario no trae los datos del acertijo de los espejos');
    const o = origen.getWorldPosition(new THREE.Vector3());
    const a = min.getWorldPosition(new THREE.Vector3());
    const b = max.getWorldPosition(new THREE.Vector3());
    const c = this.cristal.getWorldPosition(new THREE.Vector3());
    this.altura = o.y;
    const dir = /** @type {number[]} */ (origen.userData.dir ?? [-1, 0]);
    this.espejos = interactuables.filter((i) => i.tipo === 'espejo').sort((p, q) => Number(p.datos.espejo) - Number(q.datos.espejo));
    this.logica = new AcertijoEspejos(
      this.espejos.map((e) => ({ x: e.objeto.position.x, z: e.objeto.position.z, paso: Number(e.datos.paso) })),
      {
        origen: { x: o.x, z: o.z },
        dir: { x: dir[0], z: -dir[1] },   // (x, y) de Blender → (x, z) de Three.js
        objetivo: { x: c.x, z: c.z, radio: cfg.radio_cristal },
        limites: { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) + 0.6 },
      },
      cfg,
    );
    // Superficie de cada espejo con su propio material para brillar cuando el rayo la toca
    this.superficies = this.espejos.map((e) => {
      /** @type {THREE.MeshStandardMaterial | null} */
      let mat = null;
      e.objeto.traverse((h) => {
        const m = /** @type {THREE.Mesh} */ (h);
        if (m.isMesh && /** @type {THREE.Material} */ (m.material).name.includes('espejo')) {
          mat = clonarMaterial(/** @type {THREE.MeshStandardMaterial} */ (m.material));
          m.material = mat;
        }
      });
      return mat;
    });
    this.giroVisual = this.espejos.map((e) => e.objeto.rotation.y);
    /** @type {THREE.MeshStandardMaterial | null} */
    this.matCristal = null;
    this.cristal.traverse((h) => {
      const m = /** @type {THREE.Mesh} */ (h);
      if (m.isMesh && /** @type {THREE.Material} */ (m.material).name.includes('cristal')) {
        this.matCristal = clonarMaterial(/** @type {THREE.MeshStandardMaterial} */ (m.material));
        m.material = this.matCristal;
      }
    });
    // Tramos del rayo
    this.material = materialHaz();
    const geo = new THREE.CylinderGeometry(0.13, 0.13, 1, 8, 1, true);
    geo.translate(0, 0.5, 0);
    geo.rotateX(Math.PI / 2);   // el tramo crece a lo largo de +Z
    this.tramos = Array.from({ length: cfg.rebotes + 2 }, () => {
      const m = new THREE.Mesh(geo, this.material);
      m.visible = false;
      m.frustumCulled = false;
      escena.add(m);
      return m;
    });
    this.tiempoEnSala = 0;
    this.ayudaMostrada = false;
    this.brilloCristal = 0;
    /** @type {(() => void) | null} */
    this.alResolver = null;
    /** @type {(() => void) | null} */
    this.alPedirAyuda = null;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._dibujar();
  }

  get resuelto() {
    return this.logica.resuelto;
  }

  /** ¿Este interactuable es uno de los espejos? @param {import('../interaction/interactables.js').Interactuable} o */
  esEspejo(o) {
    return this.espejos.includes(o);
  }

  /** Gira 45° el espejo elegido con E. @param {import('../interaction/interactables.js').Interactuable} o */
  girar(o) {
    const i = this.espejos.indexOf(o);
    if (i < 0 || this.resuelto) return false;
    const resolvio = this.logica.girar(i);
    this._dibujar();
    if (resolvio) this.alResolver?.();
    return true;
  }

  _dibujar() {
    const pts = this.logica.trazo.puntos;
    for (let i = 0; i < this.tramos.length; i++) {
      const t = this.tramos[i];
      if (i >= pts.length - 1) {
        t.visible = false;
        continue;
      }
      this._a.set(pts[i].x, this.altura, pts[i].z);
      this._b.set(pts[i + 1].x, this.altura, pts[i + 1].z);
      t.visible = true;
      t.position.copy(this._a);
      t.lookAt(this._b);
      t.scale.set(1, 1, this._a.distanceTo(this._b));
    }
    const tocados = new Set(this.logica.trazo.tocados);
    this.superficies.forEach((m, i) => {
      if (!m) return;
      m.emissive.set(tocados.has(i) ? PALETA.oro_brillante : PALETA.agua_espuma);
      m.emissiveIntensity = tocados.has(i) ? 1.6 : 0.1;
    });
  }

  /** Punto donde termina el rayo (para las chispas del impacto). */
  get final() {
    const p = this.logica.trazo.puntos.at(-1);
    return p ? this._b.set(p.x, this.altura, p.z) : null;
  }

  /**
   * @param {number} dt @param {number} t
   * @param {boolean} enSala  Victoria está en la sala (cuenta el tiempo para la ayuda)
   */
  actualizar(dt, t, enSala) {
    this.material.uniforms.uTiempo.value = t;
    // Los espejos giran suavemente hasta su nuevo ángulo (el visual va al revés que el de la lógica)
    this.espejos.forEach((e, i) => {
      const objetivo = -this.logica.angulo(this.logica.espejos[i].paso);
      let d = (objetivo - this.giroVisual[i]) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.giroVisual[i] += d * Math.min(1, dt * 10);
      e.objeto.rotation.y = this.giroVisual[i];
    });
    if (enSala && !this.resuelto) {
      this.tiempoEnSala += dt;
      if (!this.ayudaMostrada && this.tiempoEnSala >= this.cfg.ayuda_tras) {
        this.ayudaMostrada = true;
        this.alPedirAyuda?.();
      }
    }
    if (this.matCristal) {
      this.brilloCristal += ((this.resuelto ? 4 : 0.4 + Math.sin(t * 2) * 0.15) - this.brilloCristal) * Math.min(1, dt * 3);
      this.matCristal.emissiveIntensity = this.brilloCristal;
    }
  }
}
