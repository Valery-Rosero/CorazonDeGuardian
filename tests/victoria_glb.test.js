import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FORMAS_CARA, EXPRESIONES } from '../src/config/expressions.js';
import { contar, leerGlb } from './glb.js';

const { json } = leerGlb('public/models/victoria.glb');

const HUESOS = [
  'cadera', 'torso', 'cabeza', 'sombrero',
  'brazo_sup_izq', 'brazo_inf_izq', 'mano_izq', 'brazo_sup_der', 'brazo_inf_der', 'mano_der',
  'pierna_sup_izq', 'pierna_inf_izq', 'bota_izq', 'pierna_sup_der', 'pierna_inf_der', 'bota_der',
  'trenza_1', 'trenza_2', 'trenza_3', 'trenza_4', 'trenza_5', 'trenza_6',
  'poncho_delante', 'poncho_detras', 'mochila', 'brazalete',
];

test('Victoria tiene los 26 huesos que usa el animador', () => {
  assert.equal(json.skins.length, 1);
  const nombres = json.skins[0].joints.map((j) => json.nodes[j].name).sort();
  assert.deepEqual(nombres, [...HUESOS].sort());
});

test('la cabeza tiene las 17 formas de cara y arranca neutra', () => {
  const cabeza = json.meshes.find((m) => m.name === 'victoria_cabeza');
  assert.ok(cabeza, 'falta la malla victoria_cabeza');
  assert.deepEqual(cabeza.extras.targetNames, [...FORMAS_CARA]);
  const pesos = cabeza.weights ?? [];
  assert.ok(pesos.every((w) => w === 0), `pesos iniciales no neutros: ${pesos}`);
});

test('las emociones solo usan formas que existen', () => {
  for (const [nombre, formas] of Object.entries(EXPRESIONES)) {
    for (const f of Object.keys(formas)) assert.ok(FORMAS_CARA.includes(f), `${nombre} usa ${f}, que no existe`);
  }
});

test('Victoria respeta el presupuesto: ≤ 7.500 triángulos y ≤ 3 llamadas', () => {
  const { triangulos, llamadas } = contar(json);
  assert.ok(triangulos <= 7500, `${triangulos} triángulos`);
  assert.ok(llamadas <= 3, `${llamadas} llamadas`);
});

test('todas las mallas tienen color por vértice', () => {
  for (const m of json.meshes) for (const p of m.primitives) assert.ok('COLOR_0' in p.attributes, m.name);
});
