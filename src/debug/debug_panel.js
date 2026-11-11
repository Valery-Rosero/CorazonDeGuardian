// @ts-check
import Stats from 'three/examples/jsm/libs/stats.module.js';

/**
 * Medidor de depuración (solo con ?debug o en npm run dev): FPS arriba a la derecha y, debajo,
 * las llamadas de dibujo y los triángulos. La tecla 9 lo oculta.
 * Los valores de Victoria y de la cámara no se ajustan aquí: son los de src/config/.
 * @param {{ renderer: import('three').WebGLRenderer }} sistemas
 */
export function crearPanelDepuracion({ renderer }) {
  // FPS arriba a la derecha (el cuaderno de la cartógrafa ocupa la esquina izquierda)
  const stats = new Stats();
  stats.dom.id = 'depuracion-fps';
  stats.dom.style.cssText = 'position:fixed;top:8px;right:8px;z-index:30;';
  document.body.appendChild(stats.dom);

  const info = document.createElement('div');
  info.id = 'depuracion-info';
  document.body.appendChild(info);

  let acumulado = 0;
  return {
    stats,
    info,
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

/**
 * lil-gui (semana 2 del curso) solo dentro de la Demostración técnica, plegado: muestra en vivo
 * que la velocidad de Victoria y la cámara son parámetros. Al jugar nunca aparece; los valores
 * por defecto son los de src/config/player.js y src/config/camera_profiles.js.
 * @param {HTMLElement} contenedor
 * @param {{ cfgJugador: Record<string, number>, camara: import('../camera/camera_rig.js').CamaraTerceraPersona }} s
 */
export async function crearAjustesEnVivo(contenedor, { cfgJugador, camara }) {
  const { default: GUI } = await import('lil-gui');
  const gui = new GUI({ container: contenedor, title: 'Parámetros en vivo (lil-gui)' });

  const fj = gui.addFolder('Victoria');
  fj.add(cfgJugador, 'velocidad_caminar', 1, 10, 0.1).name('caminar (m/s)');
  fj.add(cfgJugador, 'velocidad_correr', 2, 14, 0.1).name('correr (m/s)');
  fj.add(cfgJugador, 'altura_salto', 0.5, 3, 0.05).name('salto (m)');

  const fc = gui.addFolder('Cámara');
  fc.add(camara.perfiles.exploracion, 'distancia', 2, 10, 0.1).name('distancia');
  fc.add(camara.perfiles.exploracion, 'altura', 0.5, 4, 0.05).name('altura');
  fc.add(camara.perfiles.exploracion, 'fov', 40, 100, 1).name('FOV');

  gui.add({ restablecer: () => gui.reset() }, 'restablecer').name('Volver a los valores del juego');
  gui.close();
  return gui;
}
