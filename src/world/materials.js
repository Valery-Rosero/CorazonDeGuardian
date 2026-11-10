// @ts-check
import * as THREE from 'three';
import { PALETA } from '../config/palette.js';

/** Rampa de 3 tonos para MeshToonMaterial (sombra, medio, luz), sin suavizado entre tonos. */
export function crearRampaToon() {
  const datos = new Uint8Array([96, 178, 255]);
  const tex = new THREE.DataTexture(datos, datos.length, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
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
  const gema = new THREE.MeshStandardMaterial({
    color: PALETA.gema_pulso,
    emissive: PALETA.gema_pulso,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.1,
  });
  raiz.traverse((o) => {
    const m = /** @type {THREE.Mesh} */ (o);
    if (!m.isMesh) return;
    const nombre = /** @type {THREE.Material} */ (m.material).name || '';
    m.material = nombre.includes('gema') ? gema : toon;
  });
  return { toon, gema };
}
