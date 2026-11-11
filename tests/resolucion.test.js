import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESOLUCION, ResolucionDinamica } from '../src/core/dynamic_resolution.js';

/** Simula `segundos` de fotogramas que duran `ms`. */
function correr(r, segundos, ms) {
  for (let t = 0; t < segundos; t += ms / 1000) r.actualizar(ms / 1000);
}

test('resolución dinámica: a 60 FPS no toca nada', () => {
  const cambios = [];
  const r = new ResolucionDinamica((e) => cambios.push(e));
  correr(r, 30, 16.7);
  assert.deepEqual(cambios, []);
  assert.equal(r.escala, 1);
});

test('resolución dinámica: a 30 FPS baja escalón a escalón hasta el mínimo, sin pasarse', () => {
  const r = new ResolucionDinamica(() => {});
  correr(r, 3.5, 33);
  assert.ok(r.escala < 1 && r.escala > RESOLUCION.minima, `tras 3 s: ${r.escala}`);
  correr(r, 20, 33);
  assert.equal(r.escala, RESOLUCION.minima);
});

test('resolución dinámica: cuando sobra margen sube; si el escalón falla, lo bloquea y no oscila', () => {
  const r = new ResolucionDinamica(() => {});
  correr(r, 2.5, 25);                       // va lento: baja
  correr(r, 1, 16.7);
  const bajo = r.escala;
  assert.ok(bajo < 1);
  correr(r, RESOLUCION.espera_subir + 1.5, 16.7);   // holgado: prueba a subir uno
  const probado = r.escala;
  assert.ok(probado > bajo, 'sube');
  correr(r, 2.5, 20);                       // a esa resolución vuelve a ir lento: baja
  assert.ok(r.escala < probado);
  // Holgado otra vez: puede recuperar escalones, pero no el que falló mientras dure el bloqueo
  let maxima = 0;
  for (let t = 0; t < 25; t += 0.0167) { r.actualizar(0.0167); maxima = Math.max(maxima, r.escala); }
  assert.ok(maxima < probado, `no vuelve a probar ${probado} enseguida (llegó a ${maxima})`);
  correr(r, RESOLUCION.bloqueo, 16.7);      // pasado el bloqueo, lo intenta de nuevo
  assert.ok(r.escala >= probado);
});

test('resolución dinámica: las pausas largas (pestaña oculta) no cuentan como lentitud', () => {
  const r = new ResolucionDinamica(() => {});
  for (let i = 0; i < 20; i++) r.actualizar(1.5);
  assert.equal(r.escala, 1);
});
