// @ts-check
import * as THREE from 'three';
import { CALIDAD_POR_DEFECTO, QUALITY } from '../config/quality.js';

/**
 * Elige la calidad inicial según la GPU: los gráficos integrados empiezan en 'baja'.
 * @param {WebGL2RenderingContext | WebGLRenderingContext} gl
 * @returns {string}
 */
export function detectarCalidad(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const nombre = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  if (/intel|uhd|iris|mali|adreno|apple gpu/i.test(nombre) && !/arc/i.test(nombre)) return 'baja';
  return CALIDAD_POR_DEFECTO;
}

/**
 * @param {HTMLCanvasElement} lienzo
 * @param {string | null} calidadForzada
 */
export function crearRenderer(lienzo, calidadForzada) {
  const prueba = lienzo.getContext('webgl2', { powerPreference: 'high-performance' });
  if (!prueba) throw new Error('Este navegador no tiene WebGL 2. Usa Chrome o Edge con la aceleración por hardware activa.');
  const nombreCalidad = calidadForzada && QUALITY[calidadForzada] ? calidadForzada : detectarCalidad(prueba);
  const calidad = QUALITY[nombreCalidad];

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, context: prueba, antialias: calidad.antialias });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, calidad.pixelRatioMax));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return { renderer, calidad, nombreCalidad };
}

/**
 * Mantiene el lienzo a pantalla completa.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.PerspectiveCamera} camara
 */
export function ajustarAlRedimensionar(renderer, camara) {
  const ajustar = () => {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', ajustar);
  ajustar();
}
