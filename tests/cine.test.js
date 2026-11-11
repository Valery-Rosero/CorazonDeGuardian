import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { ReproductorCine } from '../src/cinematics/cinematic_player.js';
import { fovDeLente } from '../src/cinematics/timeline.js';

const ui = { cine: () => {}, saltar: () => {} };

test('cinemática: una panorámica de dos puntos mira entre el inicio y el final a mitad del plano', () => {
  const camara = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
  const cine = new ReproductorCine(camara, /** @type {any} */ (ui));
  cine.reproducir({
    nombre: 'prueba',
    planos: [{ duracion: 2, curva: 'lineal', camara: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }], mira: [{ x: 0, y: -10, z: 10 }, { x: 0, y: 10, z: 10 }] }],
    sucesos: [],
  });
  cine.actualizar(0.05, false);
  const d0 = camara.getWorldDirection(new THREE.Vector3());
  assert.ok(d0.y < -0.6, `al empezar mira abajo (y = ${d0.y.toFixed(2)})`);
  cine.actualizar(0.95, false);
  const d1 = camara.getWorldDirection(new THREE.Vector3());
  assert.ok(Math.abs(d1.y) < 0.1, `a la mitad mira al frente (y = ${d1.y.toFixed(2)})`);
});

test('cinemática: al terminar, la cámara se mezcla con la de juego en lugar de saltar', () => {
  const camara = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
  const cine = new ReproductorCine(camara, /** @type {any} */ (ui));
  cine.reproducir({ nombre: 'm', planos: [{ duracion: 0.5, camara: [{ x: 10, y: 0, z: 0 }], mira: [{ x: 10, y: 0, z: 5 }] }], sucesos: [], mezclaFinal: 1 });
  cine.actualizar(0.3, false);
  cine.actualizar(0.3, false);
  assert.equal(cine.activo, false);
  // La cámara de juego está en el origen; la mezcla la acerca poco a poco
  camara.position.set(0, 0, 0);
  cine.mezclar(0.5);
  assert.ok(camara.position.x > 2 && camara.position.x < 8, `a mitad de la mezcla (x = ${camara.position.x.toFixed(2)})`);
  camara.position.set(0, 0, 0);
  cine.mezclar(0.6);
  assert.ok(camara.position.x < 0.01, 'al final, la de juego');
});

test('lentes: 50 mm encuadran lo mismo en horizontal en cualquier pantalla', () => {
  const h = (fov, aspecto) => 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * aspecto);
  for (const aspecto of [16 / 9, 21 / 9, 4 / 3]) {
    assert.ok(Math.abs(THREE.MathUtils.radToDeg(h(fovDeLente(50, aspecto), aspecto)) - 39.6) < 0.1);
  }
});
