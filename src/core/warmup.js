// @ts-check

/**
 * Precompila los sombreadores de todo el nivel durante la pantalla de carga (sección 14: nada se crea
 * en el bucle). Sin esto, la primera vez que la cámara ve un material (el Guardián al levantarse, la gema,
 * las brasas) WebGL lo compila en ese fotograma y el juego se congela: justo en las cinemáticas.
 *
 * Por cada atmósfera (con o sin sombra del sol, con o sin la luz del cielo cambian los programas):
 * 1. compileAsync: los materiales de todos los objetos, en el render target donde dibuja el posproceso
 *    (el mismo material compila otro programa si se dibuja a la pantalla o a una textura);
 * 2. un fotograma con todo visible y sin recorte por la vista: compila lo que compileAsync no ve, los
 *    materiales de profundidad de las sombras y de la profundidad de campo de las cinemáticas.
 *
 * @param {import('three').WebGLRenderer} renderer
 * @param {import('three').Scene} escena
 * @param {import('three').Camera} camara
 * @param {import('three').WebGLRenderTarget | null} destino
 * @param {(() => void)[]} atmosferas  cada una deja la escena en un estado; la última debe ser la inicial
 * @param {() => void} dibujar  un fotograma completo (con la profundidad de campo encendida)
 * @returns {Promise<number>} programas compilados
 */
export async function precompilar(renderer, escena, camara, destino, atmosferas, dibujar) {
  const previo = renderer.getRenderTarget();
  for (const poner of atmosferas) {
    poner();
    renderer.setRenderTarget(destino);
    try {
      await renderer.compileAsync(escena, camara);
    } finally {
      renderer.setRenderTarget(previo);
    }
    dibujarTodo(escena, dibujar);
  }
  return renderer.info.programs?.length ?? 0;
}

/**
 * Dibuja un fotograma con todos los objetos visibles y sin recorte por la vista; después todo vuelve
 * a como estaba. Las luces no se tocan: su número decide los programas.
 * @param {import('three').Scene} escena @param {() => void} dibujar
 */
function dibujarTodo(escena, dibujar) {
  /** @type {[import('three').Object3D, 'visible' | 'frustumCulled', boolean][]} */
  const cambiados = [];
  escena.traverse((o) => {
    if (/** @type {any} */ (o).isLight) return;
    if (!o.visible) { cambiados.push([o, 'visible', false]); o.visible = true; }
    if (o.frustumCulled) { cambiados.push([o, 'frustumCulled', true]); o.frustumCulled = false; }
  });
  try {
    dibujar();
  } finally {
    for (const [o, k, v] of cambiados) o[k] = v;
  }
}
