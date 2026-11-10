// @ts-check
import * as THREE from 'three';
import { PALETA } from '../config/palette.js';

/** Reloj compartido por todos los shaders animados (se actualiza una vez por fotograma). */
export const uTiempo = { value: 0 };

const RUIDO = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }`;

const VERTICE_CON_NIEBLA = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vPos;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vPos = mundo.xyz;
    vec4 mvPosition = viewMatrix * mundo;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

function uniformesConNiebla(extra) {
  return THREE.UniformsUtils.merge([THREE.UniformsLib.fog, extra]);
}

/** Cortina de la cascada: franjas de espuma que bajan, más blanca al chocar con la poza. */
export function materialCascada() {
  const u = uniformesConNiebla({ uColor: { value: new THREE.Color(PALETA.agua) }, uEspuma: { value: new THREE.Color(PALETA.agua_espuma) } });
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: VERTICE_CON_NIEBLA,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform vec3 uColor;
      uniform vec3 uEspuma;
      varying vec3 vPos;
      ${RUIDO}
      #include <fog_pars_fragment>
      void main() {
        float n = ruido(vec2(vPos.x * 1.6, vPos.y * 0.25 + uTiempo * 1.6));
        float franjas = smoothstep(0.45, 0.95, fract(vPos.y * 0.45 + uTiempo * 1.9 + n * 0.8 + sin(vPos.x * 2.3) * 0.25));
        float abajo = 1.0 - smoothstep(0.0, 4.0, vPos.y);
        vec3 col = mix(uColor, uEspuma, clamp(franjas * 0.75 + abajo * 0.7 + n * 0.15, 0.0, 1.0));
        gl_FragColor = vec4(col, 0.8 + franjas * 0.15);
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  m.uniforms.uTiempo = uTiempo;
  return m;
}

/** Poza: ondas que salen de la caída del agua y destellos de luz. */
export function materialPoza() {
  const u = uniformesConNiebla({ uColor: { value: new THREE.Color(PALETA.agua) }, uEspuma: { value: new THREE.Color(PALETA.agua_espuma) } });
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: VERTICE_CON_NIEBLA,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform vec3 uColor;
      uniform vec3 uEspuma;
      varying vec3 vPos;
      ${RUIDO}
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vPos.xz;
        float n = ruido(p * 0.9 + vec2(uTiempo * 0.3, uTiempo * 0.2)) * 0.6 + ruido(p * 2.3 - uTiempo * 0.4) * 0.4;
        float brillo = smoothstep(0.72, 0.95, n);
        vec3 col = mix(uColor * 0.75, uEspuma, brillo * 0.6);
        gl_FragColor = vec4(col, 0.78);
        #include <fog_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  m.uniforms.uTiempo = uTiempo;
  return m;
}

/** Rayo de luz falso: cono aditivo que se desvanece arriba y abajo, con polvo en suspensión. */
export function materialRayo() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(PALETA.oro_brillante) } },
    vertexShader: /* glsl */ `
      varying vec3 vLocal;
      void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTiempo;
      uniform vec3 uColor;
      varying vec3 vLocal;
      ${RUIDO}
      void main() {
        float h = vLocal.y / 9.0;
        float a = smoothstep(0.0, 0.15, h) * (1.0 - smoothstep(0.55, 1.0, h));
        float polvo = ruido(vec2(atan(vLocal.x, vLocal.z) * 3.0, vLocal.y * 1.5 - uTiempo * 0.4));
        gl_FragColor = vec4(uColor, a * (0.12 + polvo * 0.08));
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  m.uniforms.uTiempo = uTiempo;
  return m;
}

/**
 * Viento en la vegetación instanciada (sección 4.2): el vértice se mueve más cuanto más alto está,
 * con una fase distinta por instancia.
 * @param {THREE.MeshStandardMaterial} material
 */
export function agregarViento(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uTiempo;
    shader.vertexShader = 'uniform float uTiempo;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 raizViento = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 raizViento = vec2(0.0);
      #endif
      float altoViento = max(position.y, 0.0);
      float faseViento = uTiempo * 1.7 + raizViento.x * 0.35 + raizViento.y * 0.27;
      transformed.x += sin(faseViento) * 0.08 * altoViento;
      transformed.z += cos(faseViento * 0.83) * 0.06 * altoViento;`,
    );
  };
  material.customProgramCacheKey = () => 'viento';
}
