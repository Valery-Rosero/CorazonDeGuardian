// @ts-check
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Carga todos los recursos al inicio con progreso real (LoadingManager).
 * @param {Record<string, string>} modelos  nombre -> ruta absoluta en public/
 * @param {(fraccion: number, texto: string) => void} alProgresar
 * @returns {Promise<Record<string, import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>>}
 */
export function cargarModelos(modelos, alProgresar) {
  const gestor = new THREE.LoadingManager();
  gestor.onProgress = (url, cargados, total) => alProgresar(cargados / total, `Cargando ${url.split('/').pop()}`);
  const cargador = new GLTFLoader(gestor);
  const entradas = Object.entries(modelos);
  return Promise.all(entradas.map(([, ruta]) => cargador.loadAsync(ruta))).then((lista) => {
    /** @type {Record<string, any>} */
    const res = {};
    entradas.forEach(([nombre], i) => { res[nombre] = lista[i]; });
    return res;
  });
}
