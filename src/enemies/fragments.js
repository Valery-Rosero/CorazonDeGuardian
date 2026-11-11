// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRUPOS } from '../core/physics_world.js';

const LEJOS = -9000;

/**
 * Piezas sueltas de los enemigos al morir (sección 4.5): los fragmentos del centinela y la máscara
 * del espectro. Pool creado al cargar: cada pieza tiene varias copias con su cuerpo dinámico de
 * cannon-es, que duermen lejos hasta que se usan. Desaparecen encogiéndose a los 3 s.
 */
export class PoolPiezas {
  /**
   * @param {THREE.Scene} escena
   * @param {import('../core/physics_world.js').MundoFisico} fisica
   * @param {THREE.Object3D[]} modelos  mallas con el origen en su centro (centinela_frag_*, espectro_mascara)
   * @param {number} copias
   */
  constructor(escena, fisica, modelos, copias) {
    this.fisica = fisica;
    /** @type {Record<string, {malla: THREE.Object3D, cuerpo: CANNON.Body, vida: number, activo: boolean, escala: number}[]>} */
    this.piezas = {};
    let k = 0;
    for (const modelo of modelos) {
      const caja = new THREE.Box3().setFromObject(modelo);
      const tam = caja.getSize(new THREE.Vector3());
      this.piezas[modelo.name] = Array.from({ length: copias }, () => {
        const malla = modelo.clone();
        malla.position.set(0, LEJOS, 0);
        malla.visible = false;
        malla.traverse((h) => { h.castShadow = true; });
        escena.add(malla);
        const cuerpo = new CANNON.Body({
          mass: Math.max(4, tam.x * tam.y * tam.z * 900),
          material: fisica.materiales.esfera,
          collisionFilterGroup: GRUPOS.DINAMICOS,
          collisionFilterMask: GRUPOS.MUNDO | GRUPOS.DINAMICOS,
          linearDamping: 0.1,
          angularDamping: 0.2,
          allowSleep: true,
        });
        cuerpo.addShape(new CANNON.Box(new CANNON.Vec3(Math.max(0.05, tam.x / 2), Math.max(0.05, tam.y / 2), Math.max(0.05, tam.z / 2))));
        cuerpo.position.set(k++ * 3, LEJOS, 0);
        cuerpo.sleep();
        fisica.world.addBody(cuerpo);
        return { malla, cuerpo, vida: 0, activo: false, escala: 1 };
      });
    }
    this.vida = 3;
  }

  /**
   * Suelta una pieza en una posición y orientación del mundo con un empujón.
   * @param {string} nombre @param {THREE.Vector3} pos @param {THREE.Quaternion} giro @param {THREE.Vector3} impulso
   */
  soltar(nombre, pos, giro, impulso) {
    const lista = this.piezas[nombre];
    if (!lista) return;
    const p = lista.find((x) => !x.activo) ?? lista.reduce((a, b) => (a.vida < b.vida ? a : b));
    p.activo = true;
    p.vida = this.vida;
    p.malla.visible = true;
    p.malla.scale.setScalar(1);
    p.cuerpo.position.set(pos.x, pos.y, pos.z);
    p.cuerpo.quaternion.set(giro.x, giro.y, giro.z, giro.w);
    p.cuerpo.velocity.set(impulso.x, impulso.y, impulso.z);
    p.cuerpo.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    p.cuerpo.wakeUp();
  }

  /** @param {number} dt */
  actualizar(dt) {
    for (const lista of Object.values(this.piezas)) {
      for (const p of lista) {
        if (!p.activo) continue;
        p.vida -= dt;
        const b = p.cuerpo;
        p.malla.position.set(b.position.x, b.position.y, b.position.z);
        p.malla.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
        if (p.vida < 0.4) p.malla.scale.setScalar(Math.max(0.01, p.vida / 0.4));
        if (p.vida <= 0) {
          p.activo = false;
          p.malla.visible = false;
          b.velocity.set(0, 0, 0);
          b.position.set(b.position.x, LEJOS, 0);
          b.sleep();
        }
      }
    }
  }
}
