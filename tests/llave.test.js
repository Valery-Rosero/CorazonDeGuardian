// La Llave del Sol (tablero docs/previews/llave_tablero.png): la lógica y, con el .glb real de la selva, que
// cada cofre se alcanza y se puede abrir (el de agua, saltando por las piedras de la poza hasta la repisa).
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import { SOLES } from '../src/config/llave.js';
import { EstadoLlave } from '../src/interaction/llave_logic.js';
import { crearSimulacion } from './simulacion.js';

test('llave: el portal pide los tres tercios y se queda con el de agua', () => {
  const e = new EstadoLlave();
  assert.equal(e.puedeColocar('agua'), false, 'sin tercios');
  e.recoger('agua');
  e.recoger('jade');
  assert.equal(e.completa, false);
  assert.deepEqual(e.faltan, ['oro']);
  assert.equal(e.colocar('agua'), false, 'con dos tercios el portal sigue dormido');
  assert.equal(e.recoger('jade'), false, 'un tercio no se recoge dos veces');
  e.recoger('oro');
  assert.equal(e.completa, true);
  assert.equal(e.colocar('agua'), true);
  assert.equal(e.portalActivo, true);
  assert.equal(e.tiene('agua'), false, 'el de agua se queda en el pedestal');
  assert.equal(e.tiene('jade'), true);
});

test('llave: la losa pide el jade y la puerta el oro, una sola vez', () => {
  const e = new EstadoLlave();
  e.recoger('jade');
  assert.equal(e.colocar('jade'), false, 'antes del portal no se llega a la losa');
  e.importar({ soles: [...SOLES], sellos: ['agua'] });
  assert.equal(e.colocar('oro'), true);
  assert.equal(e.colocar('oro'), false, 'el oro ya está en la puerta');
  assert.equal(e.colocar('jade'), true);
  assert.deepEqual(e.exportar(), { soles: ['agua', 'jade', 'oro'], sellos: ['agua', 'oro', 'jade'] });
});

test('llave: la partida guardada vuelve igual y un tercio colocado cuenta como recogido', () => {
  const e = new EstadoLlave();
  e.importar({ soles: ['oro'], sellos: ['agua', 'nada'] });
  assert.deepEqual([...e.recogidos].sort(), ['agua', 'oro']);
  assert.deepEqual([...e.colocados], ['agua']);
  const otra = new EstadoLlave();
  otra.importar(e.exportar());
  assert.deepEqual(otra.exportar(), e.exportar());
});

/** @type {Awaited<ReturnType<typeof crearSimulacion>>} */
let sim;
before(async () => {
  sim = await crearSimulacion();
});

/** Camina hacia (x, z) de Three.js hasta tener ese objeto como objetivo de la Manipulación. */
function caminarHastaObjetivo(x, z, nombre, limite = 10) {
  for (let t = 0; t < limite; t += 0.1) {
    const dx = x - sim.jugador.posicion.x;
    const dz = z - sim.jugador.posicion.z;
    sim.mirar(Math.atan2(dx, dz));
    if (sim.interactuables.objetivo?.objeto.name === nombre) {
      sim.teclas();
      return true;
    }
    sim.teclas('adelante');
    sim.correr(0.1);
  }
  sim.teclas();
  return false;
}

test('llave: en la selva hay tres cofres con su tapa, su tercio y su haz, el pedestal y las tres cerraduras', () => {
  const raiz = sim.escena;
  for (const sol of SOLES) {
    for (const n of [`cofre_${sol}`, `tapa_cofre_${sol}`, `sol_${sol}`, `haz_cofre_${sol}`, `sello_${sol}`]) {
      assert.ok(raiz.getObjectByName(n), `falta ${n}`);
    }
    const tapa = sim.interactuables.lista.find((o) => o.objeto.name === `tapa_cofre_${sol}`);
    assert.equal(tapa?.tipo, 'cofre');
    assert.equal(tapa?.datos.sol, sol);
  }
  assert.ok(sim.interactuables.lista.some((o) => o.tipo === 'pedestal'), 'el pedestal de la cueva');
  const losa = sim.interactuables.lista.find((o) => o.objeto.name === 'dyn_losa_1');
  const puerta = sim.interactuables.lista.find((o) => o.objeto.name === 'dyn_puerta_santuario');
  assert.equal(losa?.datos.sol, 'jade');
  assert.equal(puerta?.datos.sol, 'oro');
});

test('llave: los cofres de jade y de oro se alcanzan caminando desde el sendero', () => {
  for (const [sol, desde] of /** @type {const} */ ([['jade', [-10.5, 22]], ['oro', [4.5, 49]]])) {
    sim.llave.importar({});
    sim.jugador.colocar(new THREE.Vector3(desde[0], 0.2, desde[1]), 0);
    sim.correr(0.4);
    const tapa = sim.escena.getObjectByName(`tapa_cofre_${sol}`);
    const p = tapa.getWorldPosition(new THREE.Vector3());
    assert.ok(caminarHastaObjetivo(p.x, p.z, `tapa_cofre_${sol}`), `no llega al cofre de ${sol}; está en ${sim.jugador.posicion.toArray().map((v) => v.toFixed(1))}`);
  }
});

test('llave: al cofre de agua se llega saltando por las piedras de la poza hasta la repisa', () => {
  sim.llave.importar({});
  // Sobre la segunda piedra de la poza (la que ya existía), mirando a la primera de las nuevas
  sim.jugador.colocar(new THREE.Vector3(-1.2, 1.2, 75.0), 0);
  sim.correr(0.6);
  assert.ok(sim.jugador.posicion.y > 0.8, `sobre la piedra (altura ${sim.jugador.posicion.y.toFixed(2)})`);
  /** Salta caminando hacia (x, z) y suelta las teclas al llegar encima. */
  const saltar = (x, z) => {
    sim.mirar(Math.atan2(x - sim.jugador.posicion.x, z - sim.jugador.posicion.z));
    sim.teclas('adelante');
    sim.entrada.pulsadas.add('saltar');
    for (let t = 0; t < 1.6; t += 1 / 60) {
      sim.correr(1 / 60);
      if (Math.hypot(x - sim.jugador.posicion.x, z - sim.jugador.posicion.z) < 0.3) break;
    }
    sim.teclas();
    sim.correr(0.8);
  };
  saltar(-3.3, 78.3);
  assert.ok(sim.jugador.posicion.y > 1.45, `en la tercera piedra (altura ${sim.jugador.posicion.y.toFixed(2)})`);
  saltar(-4.2, 80.6);
  assert.ok(sim.jugador.posicion.y > 2.15, `en la cuarta piedra (altura ${sim.jugador.posicion.y.toFixed(2)})`);
  saltar(-5.1, 82.1);
  const y = sim.jugador.posicion.y;
  assert.ok(y > 2.9 && y < 3.3, `en la repisa, no encima del cofre (altura ${y.toFixed(2)})`);
  const p = sim.escena.getObjectByName('tapa_cofre_agua').getWorldPosition(new THREE.Vector3());
  assert.ok(caminarHastaObjetivo(p.x, p.z, 'tapa_cofre_agua', 3), 'el cofre de agua es el objetivo de la Manipulación');
  assert.ok(sim.jugador.posicion.y > 2.9, 'sigue en la repisa');
});
