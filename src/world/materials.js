// @ts-check
import * as THREE from 'three';
import { PALETA } from '../config/palette.js';

/**
 * Rampa de 3 tonos para MeshToonMaterial (sombra, medio, luz), sin suavizado entre tonos.
 * Los personajes usan una sombra más clara que el escenario: como en el boceto, la cara nunca queda oscura.
 * @param {number[]} [tonos]
 */
export function crearRampaToon(tonos = [150, 212, 255]) {
  const datos = new Uint8Array(tonos);
  const tex = new THREE.DataTexture(datos, datos.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Luz de contorno cálida (sección 4.2): ilumina los bordes que miran de lado a la cámara,
 * para que el personaje se despegue del fondo y su sombra nunca sea negra.
 * @param {THREE.MeshToonMaterial} material
 * @param {string} color
 * @param {number} fuerza
 */
function agregarLuzDeContorno(material, color, fuerza) {
  const uColor = { value: new THREE.Color(color).multiplyScalar(fuerza) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uContorno = uColor;
    shader.fragmentShader = 'uniform vec3 uContorno;\n' + shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `float bordeLuz = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4);
      outgoingLight += uContorno * bordeLuz;
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => 'toon-contorno';
}

/**
 * Sustituye los materiales de un personaje exportado desde Blender:
 *  - '*_toon'  -> MeshToonMaterial con colores por vértice
 *  - '*_gema'  -> material emisivo cuyo color cambia según el poder
 * Los materiales se comparten entre todas las mallas del personaje.
 * @param {THREE.Object3D} raiz
 * @param {THREE.Texture} rampa
 */
export function aplicarMaterialesPersonaje(raiz, rampa) {
  const toon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: rampa });
  agregarLuzDeContorno(toon, PALETA.oro_brillante, 0.32);
  // La gema lleva una capa de barniz brillante (clearcoat de MeshPhysicalMaterial, semana 4 del curso)
  const gema = new THREE.MeshPhysicalMaterial({
    color: PALETA.gema_pulso,
    emissive: PALETA.gema_pulso,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  raiz.traverse((o) => {
    const m = /** @type {THREE.Mesh} */ (o);
    if (!m.isMesh) return;
    const nombre = /** @type {THREE.Material} */ (m.material).name || '';
    m.material = nombre.includes('gema') ? gema : toon;
  });
  return { toon, gema };
}
