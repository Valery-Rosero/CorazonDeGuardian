// @ts-check
import * as THREE from 'three';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Sustituye un trozo de un sombreador y avisa si la versión de Three.js ya no lo tiene.
 * @param {THREE.ShaderMaterial} m @param {string} buscar @param {string} poner
 */
function retocar(m, buscar, poner) {
  if (!m.fragmentShader.includes(buscar)) {
    console.warn('[posproceso] no encuentro en el sombreador:', buscar);
    return;
  }
  m.fragmentShader = m.fragmentShader.replace(buscar, poner);
  m.needsUpdate = true;
}

/**
 * El cielo no brilla (bloom). Su luz es HDR (muy por encima de 1 cerca del sol) y, con el umbral del
 * bloom, se derramaba sobre todo el cuadro: con el cielo a la vista, el juego en calidad media y alta
 * se veía lechoso y más pobre que en baja. El cielo escribe alfa 0 en la imagen intermedia y el
 * filtro de brillo del bloom multiplica por ese alfa; las antorchas, runas, ojos y la gema siguen brillando.
 * @param {THREE.ShaderMaterial} cielo  material del Sky de la escena
 */
export function excluirDelBrillo(cielo) {
  retocar(cielo, 'gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor, 0.0 );');
}

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
      /** @type {THREE.WebGLRenderTarget | null} donde se dibuja la escena (null: la pantalla) */
      destino: null,
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
    // Conserva el alfa (la marca del cielo para el bloom) en lugar de ponerlo a 1
    retocar(/** @type {THREE.ShaderMaterial} */ (bokeh.materialBokeh), 'gl_FragColor.a = 1.0;', 'gl_FragColor.a = texture2D( tColor, vUv.xy ).a;');
    bokeh.enabled = false;
    compositor.addPass(bokeh);
  }
  if (calidad.bloom) {
    const b = POSPROCESO.bloom;
    const bloom = new UnrealBloomPass(new THREE.Vector2(tam.x / 2, tam.y / 2), b.fuerza, b.radio, b.umbral);
    // Solo brilla lo que tiene alfa (todo menos el cielo)
    retocar(bloom.materialHighPassFilter, 'gl_FragColor = mix( outputColor, texel, alpha );', 'gl_FragColor = mix( outputColor, texel, alpha * texel.a );');
    // Un solo píxel inválido (NaN o infinito: una división por cero en algún sombreador, un valor que
    // desborda la textura de media precisión) se extendía con el desenfoque del bloom por todo el cuadro y
    // lo dejaba negro (el primer plano de Mateo en la derrota). Aquí se limpia antes de desenfocar.
    retocar(bloom.materialHighPassFilter, 'vec4 texel = texture2D( tDiffuse, vUv );',
      `vec4 texel = texture2D( tDiffuse, vUv );
      if ( any( notEqual( texel, texel ) ) || any( greaterThan( abs( texel ), vec4( 6.0e4 ) ) ) ) texel = vec4( 0.0 );
      texel.rgb = min( texel.rgb, vec3( 64.0 ) );`);
    compositor.addPass(bloom);
  }
  const salida = new OutputPass();
  // A la pantalla, opaco: el lienzo tiene canal alfa y el cielo marcado con alfa 0 dejaría ver la página
  retocar(salida.material, 'gl_FragColor = texture2D( tDiffuse, vUv );',
    `gl_FragColor = vec4( texture2D( tDiffuse, vUv ).rgb, 1.0 );
    if ( any( notEqual( gl_FragColor, gl_FragColor ) ) || any( greaterThan( abs( gl_FragColor ), vec4( 6.0e4 ) ) ) ) gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );`);
  compositor.addPass(salida);
  // Las estadísticas cuentan todo el fotograma, no solo el último pase
  renderer.info.autoReset = false;
  return {
    activo: true,
    /** El compositor (depuración: ver cada pase por separado). */
    compositor,
    /** @type {THREE.WebGLRenderTarget | null} la escena se dibuja en una textura del compositor */
    destino: compositor.readBuffer,
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
