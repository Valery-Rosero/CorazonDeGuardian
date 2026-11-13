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

// 72.000 desde la Llave del Sol (70.000 con la gran pirámide; docs/PENDIENTES.md): la computadora de prueba tiene tarjeta dedicada
test('zona 1: presupuesto de 72.000 triángulos sin contar vegetación ni colisionadores', () => {
  const porMalla = new Map(json.meshes.map((m, i) => [i, m]));
  let total = 0;
  for (const n of nodos) {
    if (n.mesh === undefined) continue;
    const tipo = clasificarNombre(n.name).tipo;
    if (tipo.startsWith('col_') || tipo === 'trg_box' || tipo === 'inst') continue;
    total += contar({ meshes: [porMalla.get(n.mesh)], accessors: json.accessors }).triangulos;
  }
  assert.ok(total <= 72000, `${total} triángulos`);
});

test('zona 1: como máximo 4 luces puntuales (los shaders no se recompilan)', () => {
  assert.ok(nodos.filter((n) => n.name.startsWith('luz_')).length <= 4);
});

test('zona 1: las mallas hijas de un objeto especial no se convierten en objetos nuevos', async () => {
  const { crearSimulacion } = await import('./simulacion.js');
  const sim = await crearSimulacion();
  const nombres = sim.nivel.dinamicos.map((d) => d.malla.name).sort();
  assert.equal(nombres.filter((n) => n.startsWith('dyn_losa')).length, 1, `dinámicos: ${nombres.join(', ')}`);
  assert.ok(nombres.includes('dyn_puerta_santuario'), 'la puerta del pórtico se abre con la Manipulación');
  assert.equal(sim.nivel.dinamicos.length, 20 + 3 + 1 + 1, 'tablas + esferas + losa + puerta del santuario');
});

test('todos los sonidos configurados existen en public/', () => {
  for (const [nombre, ruta] of Object.entries(SONIDOS)) assert.ok(existsSync(`public${ruta}`), `${nombre}: ${ruta}`);
});

test('zona 1: la selva de la hoja de escenarios (árboles jóvenes, hojas de doble cara y copas con borde de sol)', () => {
  const jovenes = nodo('inst_arbol_joven');
  assert.ok(jovenes, 'falta la plantilla de árboles jóvenes');
  assert.equal(jovenes.extras.fijo, 1, 'los jóvenes con colisionador no se quitan con la calidad baja');
  assert.ok(jovenes.extras.viento < 1, 'los árboles se mecen menos que los helechos');
  assert.equal(jovenes.extras.borde_sol, 1);
  const materiales = json.materials.map((m) => m.name);
  assert.ok(materiales.includes('selva_hojas_doble'));
  assert.ok(materiales.includes('selva_copa'));
  // Cada árbol joven dentro de lo caminable tiene su colisionador
  assert.ok(nodos.filter((n) => n.name.startsWith('col_cyl_joven_')).length >= 20);
  // Las cabezas de piedra y los bloques tallados del claro de las ruinas no se atraviesan
  for (const n of ['col_box_cabeza_o', 'col_box_cabeza_e', 'col_box_cabeza_cruce']) assert.ok(nombres.includes(n), n);
  assert.ok(nodos.filter((n) => n.name.startsWith('col_box_bloque_')).length === 8);
});

test('zona 2: presupuesto, pocas luces a la vez y los datos del acertijo', () => {
  const { json: s } = leerGlb('public/models/zona_2_santuario.glb');
  const n = s.nodes.map((x) => x.name);
  for (const nombre of ['spawn_santuario', 'rayo_origen', 'rayo_sala_min', 'rayo_sala_max', 'prop_cristal_solar',
    'dyn_puerta_espejos', 'dyn_puerta_arena', 'prop_altar_escudo', 'trg_box_sala_espejos', 'trg_box_salida_santuario']) {
    assert.ok(n.includes(nombre), `falta ${nombre}`);
  }
  for (const x of n) assert.ok(!x.includes('.'), `GLTFLoader borra los puntos: ${x}`);
  // Cada luz puntual cuesta en todos los píxeles: el santuario enciende como mucho 8 a la vez
  const luces = s.nodes.filter((x) => x.name.startsWith('luz_'));
  assert.ok(luces.length <= 8, `${luces.length} luces`);
  for (const l of luces) assert.equal(l.extras.grupo, 2, `${l.name} es del grupo del santuario`);
  let total = 0;
  for (const nodo of s.nodes) {
    if (nodo.mesh === undefined || nodo.name.startsWith('col_') || nodo.name.startsWith('trg_')) continue;
    total += contar({ meshes: [s.meshes[nodo.mesh]], accessors: s.accessors }).triangulos;
  }
  assert.ok(total <= 50000, `${total} triángulos`);
  // La transición sale del pasadizo del pórtico de la zona 1
  assert.equal(nodo('trg_box_transicion_santuario').extras.destino, 'santuario');
});

test('enemigos.glb: centinela y espectro con sus huesos, 12 fragmentos y la máscara suelta', () => {
  const { json: e } = leerGlb('public/models/enemigos.glb');
  const n = e.nodes.map((x) => x.name);
  for (const h of ['centinela', 'cadera', 'torso', 'cabeza', 'brazo_der', 'brazo_izq', 'pierna_der', 'pierna_izq',
    'espectro', 'esp_cuerpo', 'esp_cabeza', 'esp_brazo_der', 'esp_brazo_izq', 'espectro_mascara']) {
    assert.ok(n.includes(h), `falta ${h}`);
  }
  assert.equal(n.filter((x) => /^centinela_frag_[a-z_]+$/.test(x)).length, 12);
  assert.equal(new Set(n).size, n.length, 'sin nombres repetidos (GLTFLoader los renombraría)');
});
