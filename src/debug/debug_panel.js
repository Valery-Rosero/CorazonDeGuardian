// @ts-check
import GUI from 'lil-gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';

/**
 * Panel de depuración (solo con ?debug o en npm run dev): FPS, llamadas de dibujo,
 * valores de Victoria y de la cámara en vivo, y pruebas de la cara.
 * @param {{
 *   renderer: import('three').WebGLRenderer,
 *   cfgJugador: Record<string, number>,
 *   camara: import('../camera/camera_rig.js').CamaraTerceraPersona,
 *   cara: import('../player/face_animator.js').AnimadorCara,
 *   decir: (texto: string, emocion: string) => void,
 *   emociones: string[],
 * }} sistemas
 */
export function crearPanelDepuracion({ renderer, cfgJugador, camara, cara, decir, emociones }) {
  const stats = new Stats();
  stats.dom.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:30;';
  document.body.appendChild(stats.dom);

  const info = document.createElement('div');
  info.id = 'depuracion-info';
  document.body.appendChild(info);

  const gui = new GUI({ title: 'Depuración' });
  gui.domElement.style.zIndex = '30';

  const fj = gui.addFolder('Victoria');
  fj.add(cfgJugador, 'velocidad_caminar', 1, 10, 0.1).name('caminar (m/s)');
  fj.add(cfgJugador, 'velocidad_correr', 2, 14, 0.1).name('correr (m/s)');
  fj.add(cfgJugador, 'altura_salto', 0.5, 3, 0.05).name('salto (m)');
  fj.add(cfgJugador, 'gravedad_extra_caida', 1, 3, 0.05).name('gravedad al caer');
  fj.add(cfgJugador, 'coyote', 0, 0.3, 0.01).name('coyote (s)');

  const fc = gui.addFolder('Cámara');
  fc.add(camara.perfiles.exploracion, 'distancia', 2, 10, 0.1).name('distancia');
  fc.add(camara.perfiles.exploracion, 'altura', 0.5, 4, 0.05).name('altura');
  fc.add(camara.perfiles.exploracion, 'lateral', -1.5, 1.5, 0.05).name('hombro');
  fc.add(camara.perfiles.exploracion, 'fov', 40, 100, 1).name('FOV');
  fc.close();

  const estado = { emocion: 'neutral' };
  const fx = gui.addFolder('Cara');
  fx.add(estado, 'emocion', emociones).name('emoción').onChange((/** @type {string} */ v) => cara.ponerEmocion(v));
  /** @type {Record<string, () => void>} */
  const lineas = {
    '«¡Papá, resiste!»': () => decir('¡Papá, resiste!', 'determinacion'),
    '«Te dije que llegaría antes que tú.»': () => decir('Te dije que llegaría antes que tú.', 'ternura'),
  };
  for (const nombre of Object.keys(lineas)) fx.add(lineas, nombre);

  let acumulado = 0;
  return {
    inicio() {
      stats.begin();
    },
    /** @param {number} dt */
    fin(dt) {
      stats.end();
      acumulado += dt;
      if (acumulado > 0.5) {
        acumulado = 0;
        const r = renderer.info.render;
        info.textContent = `llamadas: ${r.calls} · triángulos: ${r.triangles}`;
      }
    },
  };
}
