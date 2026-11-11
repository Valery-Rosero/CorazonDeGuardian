import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { SONIDOS } from '../src/config/audio.js';
import { clasificarNombre, esColisionador } from '../src/world/level_naming.js';
import { contar, leerGlb } from './glb.js';

test('clasificarNombre reconoce los prefijos de la sección 4.4', () => {
  assert.deepEqual(clasificarNombre('col_box_suelo'), { tipo: 'col_box', clave: 'suelo' });
  assert.deepEqual(clasificarNombre('trg_rad_pilar'), { tipo: 'trg_rad', clave: 'pilar' });
  assert.deepEqual(clasificarNombre('spawn_jugador'), { tipo: 'spawn', clave: 'jugador' });
  assert.deepEqual(clasificarNombre('Col_Cyl_Pilar'), { tipo: 'col_cyl', clave: 'pilar' });
  assert.deepEqual(clasificarNombre('dyn_tabla_3'), { tipo: 'dyn', clave: 'tabla_3' });
  assert.equal(clasificarNombre('selva_escenario').tipo, 'visual');
  assert.equal(clasificarNombre('colina').tipo, 'visual');
  assert.ok(esColisionador('col_sph'));
  assert.ok(!esColisionador('trg_box'));
});

const { json } = leerGlb('public/models/zona_1_selva.glb');
const nodos = json.nodes;
const nombres = nodos.map((n) => n.name);
const nodo = (n) => nodos.find((x) => x.name === n);

test('zona 1: suelo, aparición, zonas con nombre y ningún nombre con puntos', () => {
  assert.ok(nombres.includes('col_box_suelo_selva'));
  assert.ok(nombres.includes('spawn_jugador'));
  const zonas = nodos.filter((n) => n.name.startsWith('trg_box_zona_'));
  assert.ok(zonas.length >= 7);
  for (const z of zonas) assert.ok(z.extras?.zona?.startsWith('La selva olvidada'), z.name);
  for (const n of nombres) assert.ok(!n.includes('.'), `GLTFLoader borra los puntos: ${n}`);
});

test('zona 1: los requisitos del curso tienen sus piezas en el nivel', () => {
  // 3: emisor de audio posicional de la cascada
  assert.equal(nodo('emit_cascada').extras.tipo, 'cascada');
  // 4: triggers radiales y AABB
  assert.ok(nodos.some((n) => clasificarNombre(n.name).tipo === 'trg_rad'));
  for (const p of ['trg_box_portal_cascada', 'trg_box_portal_cornisa']) {
    const destino = nodo(p).extras.destino;
    assert.ok(nombres.includes(`spawn_${destino}`), `${p} lleva a un spawn que existe (${destino})`);
  }
  // 6: objetos dinámicos con masa
  const tablas = nodos.filter((n) => n.name.startsWith('dyn_tabla_'));
  assert.equal(tablas.length, 20);
  for (const t of tablas) assert.equal(t.extras.tipo, 'cinematico');
  const esferas = nodos.filter((n) => n.name.startsWith('dyn_esfera_'));
  assert.equal(esferas.length, 3);
  for (const e of esferas) assert.ok(e.extras.masa > 0 && e.extras.forma === 'esfera');
});

test('zona 1: checkpoints con su pilar, su trigger y su punto de reaparición', () => {
  for (const n of [1, 2, 3]) {
    assert.ok(nombres.includes(`pilar_checkpoint_${n}`), `pilar ${n}`);
    assert.equal(nodo(`trg_rad_checkpoint_${n}`).extras.checkpoint, n);
    assert.ok(nombres.includes(`spawn_checkpoint_${n}`), `spawn ${n}`);
  }
});

test('zona 1: vegetación instanciada con transformaciones completas', () => {
  const inst = nodos.filter((n) => n.name.startsWith('inst_'));
  assert.ok(inst.length >= 2);
  for (const n of inst) {
    const p = n.extras.puntos;
    assert.ok(Array.isArray(p) && p.length > 0 && p.length % 5 === 0, `${n.name}: ${p?.length}`);
  }
});

test('zona 1: presupuesto de 50.000 triángulos sin contar vegetación ni colisionadores', () => {
  const porMalla = new Map(json.meshes.map((m, i) => [i, m]));
  let total = 0;
  for (const n of nodos) {
    if (n.mesh === undefined) continue;
    const tipo = clasificarNombre(n.name).tipo;
    if (tipo.startsWith('col_') || tipo === 'trg_box' || tipo === 'inst') continue;
    total += contar({ meshes: [porMalla.get(n.mesh)], accessors: json.accessors }).triangulos;
  }
  assert.ok(total <= 50000, `${total} triángulos`);
});

test('zona 1: como máximo 4 luces puntuales (los shaders no se recompilan)', () => {
  assert.ok(nodos.filter((n) => n.name.startsWith('luz_')).length <= 4);
});

test('zona 1: las mallas hijas de un objeto especial no se convierten en objetos nuevos', async () => {
  const { crearSimulacion } = await import('./simulacion.js');
  const sim = await crearSimulacion();
  const nombres = sim.nivel.dinamicos.map((d) => d.malla.name).sort();
  assert.equal(nombres.filter((n) => n.startsWith('dyn_losa')).length, 1, `dinámicos: ${nombres.join(', ')}`);
  assert.equal(sim.nivel.dinamicos.length, 20 + 3 + 1, 'tablas + esferas + losa');
});

test('todos los sonidos configurados existen en public/', () => {
  for (const [nombre, ruta] of Object.entries(SONIDOS)) assert.ok(existsSync(`public${ruta}`), `${nombre}: ${ruta}`);
});
