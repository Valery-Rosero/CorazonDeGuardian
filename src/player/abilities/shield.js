// @ts-check
import * as THREE from 'three';
import { PALETA } from '../../config/palette.js';
import { uTiempo } from '../../world/shaders.js';

/**
 * Escudo arcano (sección 5.5): burbuja azul con efecto Fresnel (brilla en los bordes)
 * y ondas que recorren la superficie. Se crea al cargar y solo se muestra u oculta.
 */
export class BurbujaEscudo {
  /** @param {THREE.Scene} escena @param {number} radio */
  constructor(escena, radio) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(PALETA.gema_escudo) },
        uAlfa: { value: 0 },
        uGolpe: { value: 0 },
        uTiempo,
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vVista;
        varying vec3 vLocal;
        void main() {
          vLocal = position;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vVista = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uAlfa;
        uniform float uGolpe;
        uniform float uTiempo;
        varying vec3 vNormal;
        varying vec3 vVista;
        varying vec3 vLocal;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vVista)), 2.2);
          float ondas = 0.5 + 0.5 * sin(vLocal.y * 9.0 - uTiempo * 4.0 + sin(vLocal.x * 6.0) * 0.8);
          float a = (fresnel * 0.85 + ondas * 0.08 + uGolpe * 0.5) * uAlfa;
          gl_FragColor = vec4(uColor * (1.0 + uGolpe), a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.malla = new THREE.Mesh(new THREE.IcosahedronGeometry(radio, 3), this.material);
    this.malla.visible = false;
    this.malla.renderOrder = 5;
    escena.add(this.malla);
    this.escala = 0;
  }

  /** Destello al bloquear un golpe. */
  golpe() {
    this.material.uniforms.uGolpe.value = 1;
  }

  /**
   * @param {number} dt
   * @param {boolean} activo
   * @param {THREE.Vector3} pecho
   */
  actualizar(dt, activo, pecho) {
    const k = 1 - Math.exp(-dt * (activo ? 14 : 10));
    this.escala += ((activo ? 1 : 0) - this.escala) * k;
    const u = this.material.uniforms;
    u.uGolpe.value = Math.max(0, u.uGolpe.value - dt * 3);
    u.uAlfa.value = this.escala;
    this.malla.visible = this.escala > 0.01;
    if (this.malla.visible) {
      this.malla.position.copy(pecho);
      this.malla.scale.setScalar(0.6 + 0.4 * this.escala);
    }
  }
}
