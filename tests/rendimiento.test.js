import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { PULSO } from '../src/config/abilities.js';
import { MundoFisico } from '../src/core/physics_world.js';
import { PoolPulsos } from '../src/player/abilities/solar_pulse.js';

const caja = (x, z) => {
  const c = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
  c.addShape(new CANNON.Box(new CANNON.Vec3(1, 1, 1)));
  c.position.set(x, 0, z);
  return c;
};

test('física por sectores: solo el sector activo está en el mundo y lo demás vuelve igual', () => {
  const f = new MundoFisico();
  const selva = [caja(0, 0), caja(5, 10), caja(-3, 300)];
  const templo = [caja(0, 600), caja(2, 700)];
  for (const c of [...selva, ...templo]) f.world.addBody(c);
  const jugador = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.5) });
  f.world.addBody(jugador);
  f.sectorizar([...selva, ...templo], (c) => (c.position.z < 400 ? 'selva' : 'templo'));
  f.activarSector('selva');
  assert.equal(f.world.bodies.length, 4, 'los 3 de la selva y Victoria');
  assert.ok(templo.every((c) => !c.world));
  f.activarSector('templo');
  assert.equal(f.world.bodies.length, 3, 'los 2 del templo y Victoria');
  assert.ok(jugador.world, 'lo que no es del escenario no se toca');
  assert.equal(templo[1].position.z, 700, 'conserva su posición');
  f.activarSector('templo');
  assert.equal(f.world.bodies.length, 3, 'activar el mismo sector no hace nada');
  // La física sigue funcionando con los cuerpos que vuelven
  f.activarSector('selva');
  jugador.position.set(0, 3, 0);
  for (let i = 0; i < 90; i++) f.paso(1 / 60);
  assert.ok(Math.abs(jugador.position.y - 1.5) < 0.6, `Victoria cae sobre la caja de la selva (y = ${jugador.position.y.toFixed(2)})`);
});

test('el pool de pulsos solo pone en el mundo físico los proyectiles en vuelo', () => {
  const f = new MundoFisico();
  const pulsos = new PoolPulsos(new THREE.Scene(), f, PULSO, {});
  assert.equal(f.world.bodies.length, 0, 'guardados no cuestan nada');
  pulsos.disparar(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
  assert.equal(f.world.bodies.length, 1);
  for (let i = 0; i < 120; i++) { f.paso(1 / 60); pulsos.actualizar(1 / 60); }
  assert.equal(pulsos.activos, 0);
  assert.equal(f.world.bodies.length, 0, 'al apagarse vuelve a salir');
});
