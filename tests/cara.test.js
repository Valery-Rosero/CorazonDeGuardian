import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CARA } from '../src/config/player.js';
import { duracionHabla, programarHabla, visemaDeLetra } from '../src/player/visemas.js';

test('cada letra del español tiene su forma de boca', () => {
  assert.equal(visemaDeLetra('a'), 'A');
  assert.equal(visemaDeLetra('Á'), 'A');
  assert.equal(visemaDeLetra('é'), 'E');
  assert.equal(visemaDeLetra('y'), 'I');
  assert.equal(visemaDeLetra('ó'), 'O');
  assert.equal(visemaDeLetra('ú'), 'U');
  assert.equal(visemaDeLetra('P'), 'M');
  assert.equal(visemaDeLetra('b'), 'M');
  assert.equal(visemaDeLetra('t'), 'C');
  assert.equal(visemaDeLetra('ñ'), 'C');
  assert.equal(visemaDeLetra(' '), 'R');
  assert.equal(visemaDeLetra('¡'), 'R');
});

test('el habla programada es continua y dura lo esperado', () => {
  const texto = '¡Papá, resiste!';
  const p = programarHabla(texto, CARA);
  assert.equal(p.length, [...texto].length);
  for (let i = 1; i < p.length; i++) assert.equal(p[i].inicio, p[i - 1].fin);
  const d = duracionHabla(p);
  assert.ok(d > 0.8 && d < 2.0, `duración ${d}`);
});

test('las comas pausan más que las letras', () => {
  const p = programarHabla('a,a', CARA);
  assert.ok(p[1].fin - p[1].inicio > p[0].fin - p[0].inicio);
});
