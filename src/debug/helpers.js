// @ts-check
import * as THREE from 'three';

/**
 * Atajos de depuración (sección 13.2). Mientras no existan las zonas 2 y 3:
 * 1 = entrada, 2 = cornisa/puente, 3 = ruinas, 4 y 5 = santuario. 6 = invulnerable, 7 = todos los poderes,
 * 8 = el Guardián en fase 3, 9 = FPS, 0 = triggers y colisionadores, º = deslizadores de ajuste en vivo.
 * Las ayudas visuales se crean la primera vez que se piden, nunca dentro del bucle.
 * @param {{
 *   escena: THREE.Scene,
 *   triggers: import('../world/triggers.js').SistemaTriggers,
 *   colisionables: THREE.Object3D[],
 *   teletransportar: (spawn: string) => void,
 *   vida: import('../player/health.js').Vida,
 *   nota: (texto: string) => void,
 *   panel: {stats: {dom: HTMLElement}, info: HTMLElement, gui: import('lil-gui').GUI} | null,
 *   desbloquearTodo: () => void,
 *   recibirDano: (cantidad: number) => boolean,
 *   fase3: () => boolean,
 * }} s
 */
export function crearAtajos(s) {
  /** @type {THREE.Group | null} */
  let ayudas = null;
  const crearAyudas = () => crearAyudasVisuales(s.escena, s.triggers, s.colisionables);

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Digit1': s.teletransportar('debug_1'); s.nota('Depuración: entrada'); break;
      case 'Digit2': s.teletransportar('debug_2'); s.nota('Depuración: cornisa y puente'); break;
      case 'Digit3': s.teletransportar('debug_3'); s.nota('Depuración: ruinas del pórtico'); break;
      case 'Digit4': s.teletransportar('debug_4'); s.nota('Depuración: santuario, sala de columnas'); break;
      case 'Digit5': s.teletransportar('debug_5'); s.nota('Depuración: santuario, sala de los espejos'); break;
      case 'Digit6':
        s.vida.dios = !s.vida.dios;
        s.nota(s.vida.dios ? 'Depuración: invulnerable' : 'Depuración: vulnerable');
        break;
      case 'Digit7':
        s.desbloquearTodo();
        s.nota('Depuración: todos los poderes');
        break;
      case 'Digit8':
        // Sección 19: la fase 3 del jefe sin jugar el combate entero
        s.nota(s.fase3() ? 'Depuración: el Guardián, en fase 3' : 'Depuración: el combate ya está en la fase 3');
        break;
      case 'Digit9':
        if (s.panel) {
          const oculto = s.panel.stats.dom.style.display === 'none';
          s.panel.stats.dom.style.display = oculto ? '' : 'none';
          s.panel.info.style.display = oculto ? '' : 'none';
        }
        break;
      case 'Backquote':
        // Deslizadores de ajuste en vivo (velocidades de Victoria, cámara, cara)
        if (s.panel) s.panel.gui._hidden ? s.panel.gui.show() : s.panel.gui.hide();
        break;
      case 'Digit0':
        if (!ayudas) ayudas = crearAyudas();
        else ayudas.visible = !ayudas.visible;
        break;
      default:
    }
  });
}

/**
 * Ayudas visuales (requisito 4 y modo demostración): cajas Box3Helper de los triggers AABB,
 * anillos de los triggers radiales y los colisionadores físicos en malla de alambre.
 * Se crean una sola vez, al pedirlas por primera vez.
 * @param {THREE.Scene} escena
 * @param {import('../world/triggers.js').SistemaTriggers} triggers
 * @param {THREE.Object3D[]} colisionables
 */
export function crearAyudasVisuales(escena, triggers, colisionables) {
  const g = new THREE.Group();
  g.name = 'ayudas_depuracion';
  for (const t of triggers.cajas) {
    const color = t.datos.evento === 'muerte' ? 0xff3b30 : t.datos.evento === 'portal' ? 0x3198db : t.datos.perfil_camara ? 0xb36bff : 0xddaa36;
    g.add(new THREE.Box3Helper(t.caja, color));
  }
  for (const t of triggers.radios) {
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(t.radio, 0.04, 6, 48), new THREE.MeshBasicMaterial({ color: 0x4cd964 }));
    anillo.rotation.x = Math.PI / 2;
    anillo.position.copy(t.centro).add(new THREE.Vector3(0, 0.1, 0));
    g.add(anillo);
  }
  const alambre = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
  for (const c of colisionables) {
    const m = /** @type {THREE.Mesh} */ (c);
    if (!m.isMesh) continue;
    const copia = new THREE.Mesh(m.geometry, alambre);
    m.matrixWorld.decompose(copia.position, copia.quaternion, copia.scale);
    g.add(copia);
  }
  escena.add(g);
  return g;
}
