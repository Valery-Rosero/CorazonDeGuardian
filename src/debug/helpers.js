// @ts-check
import * as THREE from 'three';

/**
 * Atajos de depuración (sección 13.2). Mientras no existan las zonas 2 y 3:
 * 1 = entrada, 2 = cornisa/puente, 3 = ruinas. 6 = invulnerable, 9 = FPS, 0 = triggers y colisionadores.
 * Las ayudas visuales se crean la primera vez que se piden, nunca dentro del bucle.
 * @param {{
 *   escena: THREE.Scene,
 *   triggers: import('../world/triggers.js').SistemaTriggers,
 *   colisionables: THREE.Object3D[],
 *   teletransportar: (spawn: string) => void,
 *   vida: import('../player/health.js').Vida,
 *   nota: (texto: string) => void,
 *   panel: {stats: {dom: HTMLElement}, info: HTMLElement} | null,
 * }} s
 */
export function crearAtajos(s) {
  /** @type {THREE.Group | null} */
  let ayudas = null;
  const crearAyudas = () => {
    const g = new THREE.Group();
    for (const t of s.triggers.cajas) {
      const color = t.datos.evento === 'muerte' ? 0xff3b30 : t.datos.evento === 'portal' ? 0x3198db : t.datos.perfil_camara ? 0xb36bff : 0xddaa36;
      g.add(new THREE.Box3Helper(t.caja, color));
    }
    for (const t of s.triggers.radios) {
      const anillo = new THREE.Mesh(new THREE.TorusGeometry(t.radio, 0.04, 6, 48), new THREE.MeshBasicMaterial({ color: 0x4cd964 }));
      anillo.rotation.x = Math.PI / 2;
      anillo.position.copy(t.centro).add(new THREE.Vector3(0, 0.1, 0));
      g.add(anillo);
    }
    const alambre = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true });
    for (const c of s.colisionables) {
      const m = /** @type {THREE.Mesh} */ (c);
      if (!m.isMesh) continue;
      const copia = new THREE.Mesh(m.geometry, alambre);
      m.matrixWorld.decompose(copia.position, copia.quaternion, copia.scale);
      g.add(copia);
    }
    s.escena.add(g);
    return g;
  };

  window.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Digit1': s.teletransportar('debug_1'); s.nota('Depuración: entrada'); break;
      case 'Digit2': s.teletransportar('debug_2'); s.nota('Depuración: cornisa y puente'); break;
      case 'Digit3': s.teletransportar('debug_3'); s.nota('Depuración: ruinas del pórtico'); break;
      case 'Digit6':
        s.vida.dios = !s.vida.dios;
        s.nota(s.vida.dios ? 'Depuración: invulnerable' : 'Depuración: vulnerable');
        break;
      case 'Digit9':
        if (s.panel) {
          const oculto = s.panel.stats.dom.style.display === 'none';
          s.panel.stats.dom.style.display = oculto ? '' : 'none';
          s.panel.info.style.display = oculto ? '' : 'none';
        }
        break;
      case 'Digit0':
        if (!ayudas) ayudas = crearAyudas();
        else ayudas.visible = !ayudas.visible;
        break;
      default:
    }
  });
}
