import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as THREE from 'three';
import { PALETA } from '../src/config/palette.js';
import { SistemaTriggers } from '../src/world/triggers.js';

test('la paleta de JavaScript es idéntica a la de Python', () => {
  const py = readFileSync('tools/blender/palette.py', 'utf8');
  const pares = [...py.matchAll(/'(\w+)':\s*'(#[0-9A-Fa-f]{6})'/g)].map((m) => [m[1], m[2].toUpperCase()]);
  assert.ok(pares.length > 10);
  assert.deepEqual(Object.fromEntries(pares), Object.fromEntries(Object.entries(PALETA).map(([k, v]) => [k, v.toUpperCase()])));
});

test('trigger AABB: la zona es la caja más pequeña que contiene al jugador', () => {
  const t = new SistemaTriggers();
  t.agregarCaja('claro', new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 6, 20)), { zona: 'Claro' });
  t.agregarCaja('ruinas', new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(0, 6, 0)), { zona: 'Ruinas' });
  assert.equal(t.actualizar(new THREE.Vector3(10, 1, 10)), 'Claro');
  assert.equal(t.actualizar(new THREE.Vector3(-2, 1, -2)), 'Ruinas');
  assert.equal(t.actualizar(new THREE.Vector3(50, 1, 0)), '');
});

test('trigger radial: avisa al entrar y al salir (distanceTo)', () => {
  const t = new SistemaTriggers();
  const eventos = [];
  t.alCambiar = (tr, entra) => eventos.push(`${tr.nombre}:${entra}`);
  t.agregarRadio('pilar', new THREE.Vector3(0, 0, 9), 3);
  t.actualizar(new THREE.Vector3(0, 0, 0));
  t.actualizar(new THREE.Vector3(0, 0, 7));
  t.actualizar(new THREE.Vector3(0, 0, 7.5));
  t.actualizar(new THREE.Vector3(0, 0, 0));
  assert.deepEqual(eventos, ['pilar:true', 'pilar:false']);
});
