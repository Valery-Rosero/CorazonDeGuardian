import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import { CENTINELA, ESPECTRO, ESPEJOS, ORBE } from '../src/config/enemies.js';
import { GestorEnemigos } from '../src/enemies/enemy_manager.js';
import { AcertijoSantuario } from '../src/interaction/mirror_puzzle.js';
import { cargarGlb, crearSimulacion, DT } from './simulacion.js';

/** @type {Awaited<ReturnType<typeof crearSimulacion>>} */
let sim;
before(async () => {
  sim = await crearSimulacion('public/models/zona_2_santuario.glb');
});

/** Camina (o corre) hacia un punto del plano XZ durante como mucho 'max' segundos. */
function caminarA(s, x, z, max = 20, correr = false) {
  for (let t = 0; t < max; t += 0.1) {
    const p = s.jugador.posicion;
    const dx = x - p.x;
    const dz = z - p.z;
    if (Math.hypot(dx, dz) < 0.6) break;
    s.mirar(Math.atan2(dx, dz));
    s.teclas(...(correr ? ['adelante', 'correr'] : ['adelante']));
    s.correr(0.1);
  }
  s.teclas();
}

/** Coordenadas locales del tablero «Santuario» (x, y de Blender) → Three.js (el santuario está en y = -600). */
const S = (x, y) => [x, -(y - 600)];

test('santuario: Victoria aparece en el vestíbulo y llega caminando a la sala de columnas', () => {
  sim.ir('santuario');
  sim.correr(1);
  assert.ok(sim.jugador.enSuelo);
  assert.ok(Math.abs(sim.jugador.posicion.y) < 0.2, `altura ${sim.jugador.posicion.y.toFixed(2)}`);
  assert.equal(sim.triggers.zona, 'El santuario — Vestíbulo');
  caminarA(sim, ...S(0, -20));
  assert.equal(sim.triggers.zona, 'El santuario — Sala de columnas');
  assert.ok(sim.eventos.includes('checkpoint:4'), 'pasa por el pilar solar 4');
});

test('santuario: la puerta de los espejos cierra el paso hasta que se resuelve el acertijo', () => {
  sim.ir('debug_5');
  sim.correr(0.5);
  caminarA(sim, ...S(0, -54));
  assert.equal(sim.triggers.zona, 'El santuario — Sala de los espejos');
  caminarA(sim, ...S(0, -62), 4);
  assert.ok(sim.jugador.posicion.z < 656.2, `la puerta la detiene (z = ${sim.jugador.posicion.z.toFixed(2)})`);
});

test('santuario: el acertijo con los datos reales del .glb se resuelve y abre el camino a la antesala', () => {
  const acertijo = new AcertijoSantuario(sim.nivel.raiz, sim.escena, sim.interactuables.lista, ESPEJOS);
  assert.equal(acertijo.espejos.length, 3);
  assert.equal(acertijo.resuelto, false, 'el rayo no llega al cristal al empezar');
  let resuelto = false;
  acertijo.alResolver = () => { resuelto = true; };
  for (const e of acertijo.espejos) {
    while (!acertijo.resuelto && acertijo.logica.espejos[acertijo.espejos.indexOf(e)].paso !== Number(e.datos.solucion)) acertijo.girar(e);
  }
  assert.ok(resuelto, 'girando cada espejo a su posición del tablero se resuelve');
  assert.deepEqual(acertijo.logica.trazo.tocados, [0, 1, 2], 'el rayo pasa por A, B y C');
  // La puerta baja y Victoria baja la antesala hasta el pilar 5
  const puerta = sim.nivel.dinamicos.find((d) => d.malla.name === 'dyn_puerta_espejos');
  assert.ok(sim.losas.activar(puerta.malla));
  sim.correr(2.6);
  caminarA(sim, ...S(0, -68), 12);
  assert.equal(sim.triggers.zona, 'El santuario — Antesala');
  assert.ok(sim.jugador.posicion.y < -1.4 && sim.jugador.posicion.y > -2.6, `bajó la rampa (y = ${sim.jugador.posicion.y.toFixed(2)})`);
  assert.ok(sim.eventos.includes('checkpoint:5'), 'pasa por el pilar solar 5');
});

test('santuario: las páginas 4, 5 y 6, la flor, el altar del escudo y los espejos son interactuables', () => {
  const tipos = sim.interactuables.lista.map((o) => `${o.tipo}:${o.datos.pagina ?? o.datos.espejo ?? ''}`).sort();
  // 'losa' es la puerta de la arena, que se abre con la Manipulación
  assert.deepEqual(tipos, ['altar_escudo:', 'espejo:0', 'espejo:1', 'espejo:2', 'losa:', 'pagina:4', 'pagina:5', 'pagina:6']);
  assert.ok(sim.nivel.flores[4], 'flor solar de la antesala');
  const enemigos = Object.values(sim.nivel.spawns).filter((s) => s.datos.enemigo);
  assert.equal(enemigos.filter((s) => s.datos.enemigo === 'centinela' && s.datos.despierta === 'escudo').length, 2);
  assert.equal(enemigos.filter((s) => s.datos.enemigo === 'espectro').length, 3);
});

test('centinela en la selva: ve a Victoria, la persigue, avisa y golpea; tres pulsos lo desmoronan', async () => {
  const selva = await crearSimulacion();
  const glb = await cargarGlb('public/models/enemigos.glb');
  const golpes = [];
  const muertes = [];
  const gestor = new GestorEnemigos(selva.escena, selva.fisica, glb.scene, Object.values(selva.nivel.spawns),
    { centinela: CENTINELA, espectro: ESPECTRO, orbe: ORBE }, new THREE.MeshStandardMaterial(), {
      danarJugador: (n) => { golpes.push(n); selva.vida.danar(n); return 'dano'; },
      alMorir: (a) => muertes.push(a.tipo),
    });
  assert.equal(gestor.centinelas.length, 1);
  const c = gestor.centinelas[0];
  // Victoria sube la escalinata desde el puente: el centinela la ve y va hacia ella
  selva.ir('debug_3');
  selva.correr(0.5);
  let estados = new Set();
  for (let t = 0; t < 8; t += DT) {
    selva.correr(DT);
    gestor.actualizar(DT, t, selva.jugador.posicion, true);
    estados.add(c.logica.estado);
  }
  for (const e of ['alerta', 'persecucion', 'ataque', 'recuperacion']) assert.ok(estados.has(e), `pasa por ${e}: ${[...estados]}`);
  assert.ok(golpes.length >= 1 && golpes[0] === CENTINELA.dano, `golpes: ${golpes}`);
  assert.ok(selva.vida.actual < 100);
  // Tres pulsos solares
  for (let i = 0; i < 3; i++) gestor.golpear(c.cuerpo, 25, c.cuerpo.position);
  assert.ok(c.muerto);
  assert.deepEqual(muertes, ['centinela']);
  const piezas = Object.values(gestor.piezas.piezas).flat().filter((p) => p.activo);
  assert.equal(piezas.length, 12, 'se suelta en sus 12 piezas');
  for (let t = 0; t < 3.2; t += DT) {
    selva.fisica.paso(DT);
    gestor.actualizar(DT, t, selva.jugador.posicion, true);
  }
  assert.equal(Object.values(gestor.piezas.piezas).flat().filter((p) => p.activo).length, 0, 'desaparecen a los 3 s');
});

test('espectros: aparecen al entrar a la sala, cargan y disparan; el bloqueo perfecto devuelve el orbe y los daña', async () => {
  const glb = await cargarGlb('public/models/enemigos.glb');
  let reflejar = false;
  const recibidos = [];
  const gestor = new GestorEnemigos(sim.escena, sim.fisica, glb.scene, Object.values(sim.nivel.spawns),
    { centinela: CENTINELA, espectro: ESPECTRO, orbe: ORBE }, new THREE.MeshStandardMaterial(), {
      danarJugador: (n) => { recibidos.push(n); return reflejar ? 'reflejo' : 'dano'; },
    });
  assert.equal(gestor.espectros.filter((e) => e.activo).length, 0, 'no están hasta que Victoria entra');
  assert.equal(gestor.aparecer('sala_espejos'), 2);
  sim.ir('debug_5');
  sim.correr(0.3);
  for (let t = 0; t < 8; t += DT) {
    sim.fisica.paso(DT);
    gestor.actualizar(DT, t, sim.jugador.posicion, true);
  }
  assert.ok(recibidos.length >= 2 && recibidos.every((n) => n === ESPECTRO.dano), `orbes recibidos: ${recibidos}`);
  // Ahora cada orbe que llega se devuelve: vuelve hacia su espectro y lo daña
  reflejar = true;
  const vidaAntes = gestor.espectros.map((e) => e.logica.vida).reduce((a, b) => a + b);
  for (let t = 0; t < 10; t += DT) {
    sim.fisica.paso(DT);
    gestor.actualizar(DT, t, sim.jugador.posicion, true);
  }
  const vidaDespues = gestor.espectros.map((e) => e.logica.vida).reduce((a, b) => a + b);
  assert.ok(vidaDespues < vidaAntes, `los orbes devueltos les quitan vida (${vidaAntes} → ${vidaDespues})`);
  assert.equal(gestor.aparecer('espejos_resueltos'), 1, 'el tercero aparece al resolver el acertijo');
});
