// @ts-check
import * as THREE from 'three';

/**
 * Sistema de partículas genérico (requisito 5): THREE.Points con BufferGeometry + Float32Array,
 * capacidad fija, física simple (gravedad, arrastre) y reciclaje. Nunca crea objetos al actualizar.
 *
 * @typedef {{
 *   capacidad: number,
 *   textura: THREE.Texture,
 *   aditivo?: boolean,
 *   gravedad?: number,
 *   arrastre?: number,
 *   perfil?: 'desvanecer' | 'aparecer_desvanecer' | 'parpadeo',
 *   continuo?: boolean,
 *   nacer: (s: SistemaParticulas, i: number) => void,
 *   moverExtra?: (s: SistemaParticulas, i: number, dt: number, t: number) => void,
 *   muere?: (s: SistemaParticulas, i: number) => boolean,
 * }} OpcionesParticulas
 */
export class SistemaParticulas {
  /** @param {OpcionesParticulas} o */
  constructor(o) {
    const n = o.capacidad;
    this.n = n;
    this.o = o;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.color = new Float32Array(n * 3);
    this.alfa = new Float32Array(n);
    this.tam = new Float32Array(n);
    this.tamBase = new Float32Array(n);
    this.alfaBase = new Float32Array(n);
    this.vida = new Float32Array(n);
    this.vidaTotal = new Float32Array(n);
    this.semilla = new Float32Array(n);
    for (let i = 0; i < n; i++) this.semilla[i] = Math.random() * 100;

    const geo = new THREE.BufferGeometry();
    this.atrPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.atrAlfa = new THREE.BufferAttribute(this.alfa, 1).setUsage(THREE.DynamicDrawUsage);
    this.atrTam = new THREE.BufferAttribute(this.tam, 1).setUsage(THREE.DynamicDrawUsage);
    this.atrColor = new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.atrPos);
    geo.setAttribute('aAlfa', this.atrAlfa);
    geo.setAttribute('aTam', this.atrTam);
    geo.setAttribute('aColor', this.atrColor);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: o.textura },
        uEscala: { value: 400 },
      },
      vertexShader: /* glsl */ `
        attribute float aAlfa;
        attribute float aTam;
        attribute vec3 aColor;
        uniform float uEscala;
        varying float vAlfa;
        varying vec3 vColor;
        void main() {
          vAlfa = aAlfa;
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aTam * uEscala / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        varying float vAlfa;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          float a = t.a * vAlfa;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor * t.rgb, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: o.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.puntos = new THREE.Points(geo, this.material);
    this.puntos.frustumCulled = false;
    this.activo = true;

    if (o.continuo !== false) {
      for (let i = 0; i < n; i++) {
        o.nacer(this, i);
        // Edad inicial repartida para que el sistema empiece "lleno"
        this.vida[i] = this.vidaTotal[i] * Math.random();
      }
    } else {
      for (let i = 0; i < n; i++) this.vida[i] = 0;
    }
  }

  /** Ayudante para los emisores: define una partícula. */
  colocar(i, x, y, z, vx, vy, vz, vida, tam, alfa, r, g, b) {
    const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z;
    this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.vida[i] = vida;
    this.vidaTotal[i] = vida;
    this.tamBase[i] = tam;
    this.alfaBase[i] = alfa;
    this.color[k] = r; this.color[k + 1] = g; this.color[k + 2] = b;
  }

  /**
   * Ráfaga puntual (sistemas no continuos): reutiliza las partículas muertas.
   * @param {number} cantidad
   * @param {(s: SistemaParticulas, i: number) => void} nacer
   */
  rafaga(cantidad, nacer) {
    let hechas = 0;
    for (let i = 0; i < this.n && hechas < cantidad; i++) {
      if (this.vida[i] <= 0) {
        nacer(this, i);
        hechas++;
      }
    }
  }

  /** @param {number} dt @param {number} t */
  actualizar(dt, t) {
    if (!this.activo) return;
    const o = this.o;
    const g = o.gravedad ?? 0;
    const arrastre = Math.exp(-(o.arrastre ?? 0) * dt);
    const continuo = o.continuo !== false;
    for (let i = 0; i < this.n; i++) {
      this.vida[i] -= dt;
      if (this.vida[i] <= 0 || (o.muere && o.muere(this, i))) {
        if (continuo) o.nacer(this, i);
        else { this.alfa[i] = 0; continue; }
      }
      const k = i * 3;
      this.vel[k + 1] -= g * dt;
      this.vel[k] *= arrastre; this.vel[k + 1] *= arrastre; this.vel[k + 2] *= arrastre;
      if (o.moverExtra) o.moverExtra(this, i, dt, t);
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      const u = 1 - this.vida[i] / this.vidaTotal[i]; // 0 al nacer, 1 al morir
      let a;
      if (o.perfil === 'aparecer_desvanecer') a = Math.sin(Math.PI * u);
      else if (o.perfil === 'parpadeo') a = Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(t * 3 + this.semilla[i]));
      else a = 1 - u;
      this.alfa[i] = a * this.alfaBase[i];
      this.tam[i] = this.tamBase[i] * (o.perfil === 'desvanecer' ? 1 - u * 0.5 : 1);
    }
    this.atrPos.needsUpdate = true;
    this.atrAlfa.needsUpdate = true;
    this.atrTam.needsUpdate = true;
    this.atrColor.needsUpdate = true;
  }
}

/** Textura de punto suave generada en un canvas (sin descargar imágenes). */
export function texturaPunto() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
