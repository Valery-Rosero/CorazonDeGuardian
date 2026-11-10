import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLAYER } from '../src/config/player.js';
import { acercar, actualizarSalto, anguloMasCorto, crearEstadoSalto, velocidadSalto } from '../src/player/movement_logic.js';

const DT = 1 / 60;

test('acercar no se pasa del objetivo', () => {
  assert.equal(acercar(0, 10, 3), 3);
  assert.equal(acercar(9, 10, 3), 10);
  assert.equal(acercar(0, -10, 4), -4);
});

test('velocidad de salto para 1,6 m con g = 9,82', () => {
  assert.ok(Math.abs(velocidadSalto(1.6, 9.82) - 5.605) < 0.01);
});

test('anguloMasCorto gira por el lado corto', () => {
  assert.ok(Math.abs(anguloMasCorto(0.1, -0.1) + 0.2) < 1e-9);
  assert.ok(Math.abs(anguloMasCorto(3.0, -3.0) - (2 * Math.PI - 6.0)) < 1e-9);
});

test('se puede saltar justo después de salir de un borde (coyote time)', () => {
  const e = crearEstadoSalto();
  actualizarSalto(e, DT, true, false, PLAYER);
  for (let i = 0; i < 5; i++) actualizarSalto(e, DT, false, false, PLAYER); // 0,083 s en el aire
  assert.equal(actualizarSalto(e, DT, false, true, PLAYER), true);
});

test('pasado el coyote time ya no se salta en el aire', () => {
  const e = crearEstadoSalto();
  actualizarSalto(e, DT, true, false, PLAYER);
  for (let i = 0; i < 12; i++) actualizarSalto(e, DT, false, false, PLAYER); // 0,2 s
  assert.equal(actualizarSalto(e, DT, false, true, PLAYER), false);
});

test('la tecla pulsada justo antes de aterrizar se recuerda', () => {
  const e = crearEstadoSalto();
  actualizarSalto(e, DT, false, true, PLAYER);
  for (let i = 0; i < 4; i++) assert.equal(actualizarSalto(e, DT, false, false, PLAYER), false);
  assert.equal(actualizarSalto(e, DT, true, false, PLAYER), true);
});

test('un solo salto por pulsación', () => {
  const e = crearEstadoSalto();
  assert.equal(actualizarSalto(e, DT, true, true, PLAYER), true);
  assert.equal(actualizarSalto(e, DT, true, false, PLAYER), false);
});
