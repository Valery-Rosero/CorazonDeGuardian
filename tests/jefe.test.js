import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LineaTiempo, ColaDialogo } from '../src/cinematics/timeline.js';
import { ATAQUES, ESCAPE, GUARDIAN } from '../src/config/boss.js';
import { LINEAS, PAUSA_ENTRE_LINEAS } from '../src/config/dialogues.js';
import { LogicaGuardian, TemporizadorEscape } from '../src/enemies/boss_logic.js';

const DT = 1 / 60;

/** Avanza la lógica y junta los sucesos. */
function correr(g, segundos, distancia = 10) {
  const todos = [];
  for (let t = 0; t < segundos; t += DT) todos.push(...g.actualizar(DT, { distancia }));
  return todos;
}

test('Guardián: dormido no ataca; al despertar ataca solo con golpe sísmico y barrido en la fase 1', () => {
  let k = 0;
  const g = new LogicaGuardian(GUARDIAN, ATAQUES, () => (k = (k + 0.37) % 1));
  assert.equal(correr(g, 5).length, 0);
  g.despertar();
  const sucesos = correr(g, 40, 5);
  const tipos = new Set(sucesos.filter((s) => s.tipo === 'aviso').map((s) => s.ataque));
  assert.deepEqual([...tipos].sort(), ['barrido', 'sismico']);
  // Cada golpe llega exactamente después de su aviso
  const avisos = sucesos.filter((s) => s.tipo === 'aviso').length;
  const golpes = sucesos.filter((s) => s.tipo === 'golpe').length;
  assert.ok(Math.abs(avisos - golpes) <= 1);
});

test('Guardián: sin el núcleo expuesto es invulnerable; los tres pilares lo abren 6 s y empiezan la fase 2', () => {
  const g = new LogicaGuardian(GUARDIAN, ATAQUES);
  g.despertar();
  assert.equal(g.danar(25), false, 'placas cerradas');
  assert.equal(g.encenderPilar(0), true);
  assert.equal(g.encenderPilar(0), false, 'un pilar encendido no se vuelve a encender');
  g.encenderPilar(1);
  assert.equal(g.nucleoAbierto, false);
  g.encenderPilar(2);
  assert.equal(g.nucleoAbierto, true);
  assert.equal(g.fase, 2);
  const s = correr(g, 0.1);
  assert.ok(s.some((x) => x.tipo === 'fase' && x.fase === 2));
  assert.equal(g.danar(25), true);
  assert.equal(g.vida, GUARDIAN.vida - 25);
  // A los 6 s se cierra y los pilares necesitan 4 s para volver a encenderse
  const cierre = correr(g, 6);
  assert.ok(cierre.some((x) => x.tipo === 'nucleo_cerrado'));
  assert.equal(g.encenderPilar(0), false, 'recargando');
  correr(g, 4.1);
  assert.equal(g.encenderPilar(0), true);
});

test('Guardián: bajo el 35 % entra en furia (núcleo 4 s, pilares 3 s, invocación una vez) y con 0 se derrota', () => {
  const g = new LogicaGuardian(GUARDIAN, ATAQUES, () => 0.5);
  g.despertar();
  const abrir = () => { for (let i = 0; i < 3; i++) g.encenderPilar(i); };
  abrir();
  while (g.vida - 25 > GUARDIAN.vida * GUARDIAN.umbral_fase3) g.danar(25);
  assert.equal(g.fase, 2);
  g.danar(25);
  assert.equal(g.fase, 3, `vida ${g.vida}`);
  // Se cierra el núcleo que estaba abierto y los pilares se recargan en 3 s (fase 3)
  const vistos = [...correr(g, 6.1)];
  assert.ok(g.recarga > 2.9 && g.recarga <= 3);
  vistos.push(...correr(g, 3.1));
  abrir();
  assert.equal(g.nucleo, 4, 'en la fase 3 el núcleo se abre 4 s');
  vistos.push(...correr(g, 4.05));
  assert.equal(g.recarga > 0, true);
  assert.ok(g.recarga <= 3);
  // La primera elección de la fase 3 es la invocación, y solo una vez
  const s = correr(g, 20, 12);
  vistos.push(...s);
  const invocaciones = vistos.filter((x) => x.tipo === 'aviso' && x.ataque === 'invocacion').length;
  assert.equal(invocaciones, 1);
  assert.ok(s.some((x) => x.tipo === 'aviso' && (x.ataque === 'rocas' || x.ataque === 'rayo')));
  abrir();
  while (!g.derrotado) g.danar(25);
  assert.equal(g.vida, 0);
  assert.equal(g.danar(25), false);
});

test('Guardián: la furia acelera los avisos un 30 %', () => {
  const g = new LogicaGuardian(GUARDIAN, ATAQUES);
  g.fase = 2;
  const normal = g.aviso('sismico');
  g.fase = 3;
  assert.ok(Math.abs(g.aviso('sismico') - normal / 1.3) < 1e-9);
});

test('escape: 75 s, avisa una sola vez al agotarse y muestra m:ss', () => {
  const e = new TemporizadorEscape(ESCAPE.tiempo);
  e.iniciar();
  assert.equal(e.texto, '1:15');
  let avisos = 0;
  for (let t = 0; t < 80; t += 0.5) if (e.actualizar(0.5)) avisos++;
  assert.equal(avisos, 1);
  assert.equal(e.texto, '0:00');
});

test('diálogo: las líneas del combate existen y se dicen una tras otra con su pausa', () => {
  const c = new ColaDialogo(LINEAS, PAUSA_ENTRE_LINEAS);
  c.decir('mat_despertar_01', 'gem_despertar_01');
  const empiezan = [];
  let t = 0;
  for (; t < 12; t += DT) {
    const r = c.actualizar(DT);
    if (r.empieza) empiezan.push([r.empieza, t]);
  }
  assert.deepEqual(empiezan.map((x) => x[0]), ['mat_despertar_01', 'gem_despertar_01']);
  const hueco = empiezan[1][1] - empiezan[0][1];
  assert.ok(Math.abs(hueco - (LINEAS.mat_despertar_01.duracion + PAUSA_ENTRE_LINEAS)) < 0.05);
  assert.throws(() => c.decir('linea_que_no_existe'));
});

test('cinemática: avanza por sus planos, entrega cada suceso una vez y al saltarla entrega los pendientes', () => {
  const cine = {
    nombre: 'prueba',
    planos: [{ duracion: 2, camara: [{ x: 0, y: 0, z: 0 }], mira: [{ x: 0, y: 0, z: 1 }] },
      { duracion: 3, camara: [{ x: 0, y: 0, z: 0 }], mira: [{ x: 0, y: 0, z: 1 }] }],
    sucesos: [{ t: 1, accion: 'a' }, { t: 4, accion: 'b' }, { t: 4.9, accion: 'c' }],
  };
  const l = new LineaTiempo(cine);
  assert.equal(l.duracion, 5);
  assert.deepEqual(l.avanzar(1.5).map((s) => s.accion), ['a']);
  l.avanzar(1);
  assert.equal(l.actual.indice, 1);
  assert.deepEqual(l.saltar().map((s) => s.accion), ['b', 'c']);
  assert.equal(l.terminada, true);
  assert.deepEqual(l.avanzar(1), []);
});
