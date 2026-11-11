// @ts-check
import * as THREE from 'three';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Ajustes del posprocesado (sección 14.3). */
export const POSPROCESO = Object.freeze({
  bloom: { fuerza: 0.55, radio: 0.45, umbral: 0.82 },
  // Profundidad de campo solo en cinemáticas y en calidad alta: enfoca a la distancia de lo que se mira
  profundidad: { apertura: 0.00018, desenfoque: 0.008 },
});

/**
 * Posprocesado según la calidad: bloom a media resolución (media y alta) y profundidad de campo en las
 * cinemáticas (alta). En baja no se crea nada y se dibuja directo, sin coste extra.
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} escena
 * @param {THREE.PerspectiveCamera} camara
 * @param {import('../config/quality.js').Calidad} calidad
 */
export function crearPosproceso(renderer, escena, camara, calidad) {
  if (!calidad.bloom && !calidad.profundidad) {
    return {
      activo: false,
      render: () => renderer.render(escena, camara),
      tamano: () => {},
      /** @param {number | null} _distancia */
      enfocar: (_distancia) => {},
    };
  }
  const tam = renderer.getSize(new THREE.Vector2());
  const compositor = new EffectComposer(renderer);
  compositor.setPixelRatio(renderer.getPixelRatio());
  compositor.setSize(tam.x, tam.y);
  compositor.addPass(new RenderPass(escena, camara));
  /** @type {BokehPass | null} */
  let bokeh = null;
  if (calidad.profundidad) {
    const p = POSPROCESO.profundidad;
    bokeh = new BokehPass(escena, camara, { focus: 10, aperture: p.apertura, maxblur: p.desenfoque });
    bokeh.enabled = false;
    compositor.addPass(bokeh);
  }
  if (calidad.bloom) {
    const b = POSPROCESO.bloom;
    compositor.addPass(new UnrealBloomPass(new THREE.Vector2(tam.x / 2, tam.y / 2), b.fuerza, b.radio, b.umbral));
  }
  compositor.addPass(new OutputPass());
  // Las estadísticas cuentan todo el fotograma, no solo el último pase
  renderer.info.autoReset = false;
  return {
    activo: true,
    render: () => {
      renderer.info.reset();
      compositor.render();
    },
    /** Al cambiar el tamaño de la ventana o la resolución dinámica. */
    tamano: () => {
      renderer.getSize(tam);
      compositor.setPixelRatio(renderer.getPixelRatio());
      compositor.setSize(tam.x, tam.y);
    },
    /**
     * Profundidad de campo (solo en cinemáticas): distancia de enfoque o null para apagarla.
     * @param {number | null} distancia
     */
    enfocar: (distancia) => {
      if (!bokeh) return;
      bokeh.enabled = distancia !== null;
      if (distancia !== null) /** @type {any} */ (bokeh.uniforms).focus.value = distancia;
    },
  };
}
