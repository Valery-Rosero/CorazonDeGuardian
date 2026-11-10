import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clasificarNombre, esColisionador } from '../src/world/level_naming.js';
import { leerGlb } from './glb.js';

test('clasificarNombre reconoce los prefijos de la sección 4.4', () => {
  assert.deepEqual(clasificarNombre('col_box_suelo'), { tipo: 'col_box', clave: 'suelo' });
  assert.deepEqual(clasificarNombre('trg_rad_pilar'), { tipo: 'trg_rad', clave: 'pilar' });
  assert.deepEqual(clasificarNombre('spawn_jugador'), { tipo: 'spawn', clave: 'jugador' });
  assert.deepEqual(clasificarNombre('Col_Cyl_Pilar'), { tipo: 'col_cyl', clave: 'pilar' });
  assert.equal(clasificarNombre('nivel_visual').tipo, 'visual');
  assert.equal(clasificarNombre('colina').tipo, 'visual');
  assert.ok(esColisionador('col_sph'));
  assert.ok(!esColisionador('trg_box'));
});

test('el nivel de prueba trae suelo, spawn y zonas con nombre', () => {
  const { json } = leerGlb('public/models/nivel_prueba.glb');
  const nodos = json.nodes;
  const nombres = nodos.map((n) => n.name);
  assert.ok(nombres.includes('col_box_suelo'));
  assert.ok(nombres.includes('spawn_jugador'));
  const zonas = nodos.filter((n) => clasificarNombre(n.name).tipo === 'trg_box');
  assert.ok(zonas.length >= 2);
  for (const z of zonas) assert.ok(typeof z.extras?.zona === 'string' && z.extras.zona.length > 0, z.name);
  const radial = nodos.find((n) => n.name === 'trg_rad_pilar');
  assert.equal(radial.extras.radio, 3);
  // Ningún nombre con puntos: GLTFLoader los elimina y romperían la convención
  for (const n of nombres) assert.ok(!n.includes('.'), n);
});
