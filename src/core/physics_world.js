// @ts-check
import * as CANNON from 'cannon-es';

/** Grupos de colisión (sección 5.2). */
export const GRUPOS = Object.freeze({
  MUNDO: 1,
  JUGADOR: 2,
  ENEMIGOS: 4,
  PROYECTILES_JUGADOR: 8,
  PROYECTILES_ENEMIGOS: 16,
  DINAMICOS: 32,
  SENSORES: 64,
});

export const GRAVEDAD = 9.82;
const PASO_FIJO = 1 / 60;

/**
 * Mundo físico de cannon-es en paralelo a la escena de Three.js ("arquitectura espejo").
 * Cada par {malla, cuerpo} se sincroniza una vez por fotograma.
 */
export class MundoFisico {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVEDAD, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    this.materiales = {
      mundo: new CANNON.Material('mundo'),
      jugador: new CANNON.Material('jugador'),
      esfera: new CANNON.Material('esfera'),
      tabla: new CANNON.Material('tabla'),
    };
    const m = this.materiales;
    // Sin fricción para el jugador: no se queda pegado a las paredes.
    this.world.addContactMaterial(new CANNON.ContactMaterial(m.jugador, m.mundo, { friction: 0, restitution: 0 }));
    // Sin fricción tampoco contra tablas y esferas: si no, Victoria se atasca en las rendijas del puente
    this.world.addContactMaterial(new CANNON.ContactMaterial(m.jugador, m.tabla, { friction: 0, restitution: 0 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(m.jugador, m.esfera, { friction: 0, restitution: 0.1 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(m.esfera, m.mundo, { friction: 0.4, restitution: 0.6 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(m.tabla, m.mundo, { friction: 0.5, restitution: 0.2 }));

    /** @type {{malla: import('three').Object3D, cuerpo: CANNON.Body}[]} */
    this.pares = [];
  }

  /**
   * @param {import('three').Object3D} malla
   * @param {CANNON.Body} cuerpo
   */
  emparejar(malla, cuerpo) {
    this.pares.push({ malla, cuerpo });
  }

  /** @param {number} dt */
  paso(dt) {
    this.world.step(PASO_FIJO, dt, 3);
  }

  sincronizar() {
    for (let i = 0; i < this.pares.length; i++) {
      const { malla, cuerpo } = this.pares[i];
      malla.position.set(cuerpo.position.x, cuerpo.position.y, cuerpo.position.z);
      malla.quaternion.set(cuerpo.quaternion.x, cuerpo.quaternion.y, cuerpo.quaternion.z, cuerpo.quaternion.w);
    }
  }
}
