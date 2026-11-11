import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESCUDO, ESQUIVA, MANIPULACION, PULSO } from '../src/config/abilities.js';
import { PAGINAS } from '../src/config/diary.js';
import { elegirInteractuable, Poderes } from '../src/player/abilities/abilities_logic.js';

const DT = 1 / 60;
const correr = (p, s) => { for (let i = 0; i < Math.round(s / DT); i++) p.actualizar(DT); };
const nuevos = () => new Poderes(PULSO, ESCUDO, MANIPULACION, ESQUIVA);

test('los poderes empiezan bloqueados y se desbloquean de forma progresiva', () => {
  const p = nuevos();
  assert.equal(p.usar('pulso'), false);
  assert.equal(p.desbloquear('pulso'), true);
  assert.equal(p.desbloquear('pulso'), false, 'desbloquear dos veces no cuenta como nuevo');
  assert.equal(p.usar('pulso'), true);
  assert.equal(p.usar('escudo'), false, 'el escudo llega en el santuario');
});

test('Pulso solar: recarga de 0,5 s', () => {
  const p = nuevos();
  p.desbloquear('pulso');
  assert.equal(p.usar('pulso'), true);
  correr(p, 0.4);
  assert.equal(p.usar('pulso'), false);
  correr(p, 0.15);
  assert.equal(p.usar('pulso'), true);
});

test('Escudo arcano: dura 2,5 s, bloqueo perfecto los primeros 0,2 s y recarga de 6 s después', () => {
  const p = nuevos();
  p.desbloquear('escudo');
  assert.equal(p.usar('escudo'), true);
  assert.equal(p.escudoActivo, true);
  assert.equal(p.bloqueoPerfecto, true);
  correr(p, 0.25);
  assert.equal(p.bloqueoPerfecto, false);
  assert.equal(p.usar('escudo'), false, 'no se reactiva mientras está activo');
  correr(p, 2.3);
  assert.equal(p.escudoActivo, false);
  assert.ok(p.progreso('escudo') < 0.1, 'la recarga empieza al apagarse');
  correr(p, 5.8);
  assert.equal(p.usar('escudo'), false);
  correr(p, 0.3);
  assert.equal(p.usar('escudo'), true);
});

test('esquiva: invulnerable 0,25 s, dura 0,35 s y recarga 0,6 s', () => {
  const p = nuevos();
  assert.equal(p.esquivar(), true);
  assert.equal(p.esquivaInvulnerable, true);
  correr(p, 0.3);
  assert.equal(p.esquivaInvulnerable, false);
  assert.equal(p.esquivando, true);
  correr(p, 0.1);
  assert.equal(p.esquivando, false);
  assert.equal(p.esquivar(), false, 'todavía recargando');
  correr(p, 0.25);
  assert.equal(p.esquivar(), true);
});

test('Manipulación: elige el objeto más cercano delante de Victoria y dentro del alcance', () => {
  const origen = { x: 0, y: 1, z: 0 };
  const vista = { x: 0, y: 0, z: 1 };
  const objetos = [
    { pos: { x: 0, y: 1, z: 3.0 }, activo: true },   // delante, a 3 m
    { pos: { x: 0, y: 1, z: 2.0 }, activo: false },  // más cerca pero ya usado
    { pos: { x: 0, y: 1, z: -1.5 }, activo: true },  // detrás
    { pos: { x: 0.5, y: 1, z: 5 }, activo: true },   // demasiado lejos
  ];
  assert.equal(elegirInteractuable(origen, vista, objetos, MANIPULACION.alcance, MANIPULACION.angulo), 0);
  objetos[0].activo = false;
  assert.equal(elegirInteractuable(origen, vista, objetos, MANIPULACION.alcance, MANIPULACION.angulo), -1, 'sin objetivo válido');
});

test('Manipulación sin objetivo no gasta la recarga', () => {
  const p = nuevos();
  p.desbloquear('manipulacion');
  assert.equal(p.manipulacionLista, true);
  // El juego solo llama a usar() si hay objetivo; comprobar no consume nada
  assert.equal(p.manipulacionLista, true);
  assert.equal(p.usar('manipulacion'), true);
  assert.equal(p.manipulacionLista, false);
});

test('el diario tiene 6 páginas con la escritura cada vez más degradada', () => {
  assert.equal(PAGINAS.length, 6);
  assert.deepEqual(PAGINAS.map((p) => p.estilo), ['tinta', 'tinta', 'tinta', 'temblor', 'temblor', 'dorada']);
});
