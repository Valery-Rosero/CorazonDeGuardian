import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avanza, borrarPartida, guardarPartida, leerPartida, PUNTOS } from '../src/game/save.js';

// localStorage mínimo (en el navegador lo pone el propio navegador)
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
};

test('guardado: el punto de reaparición solo avanza (santuario → columnas → espejos → arena)', () => {
  assert.deepEqual(PUNTOS, ['santuario', 'debug_4', 'debug_5', 'arena']);
  assert.ok(avanza(null, 'santuario'));
  assert.ok(avanza('santuario', 'debug_5'));
  assert.ok(avanza('debug_5', 'arena'));
  // Volver a cruzar el vestíbulo (o salir en el escape) no lo hace retroceder
  assert.ok(!avanza('arena', 'santuario'));
  assert.ok(!avanza('debug_5', 'debug_4'));
  assert.ok(!avanza('arena', 'arena'));
});

test('guardado: la partida se guarda, se recupera y se borra', () => {
  borrarPartida();
  assert.equal(leerPartida(), null);
  const p = { pilar: 3, pilares: [1, 2, 3], punto: 'debug_5', poderes: ['pulso', 'manipulacion', 'escudo'], paginas: [1, 2, 4],
    escudo: true, espejos: true, vistas: ['intro', 'brazalete'], tiempo: 610, muertes: 2 };
  guardarPartida(p);
  assert.deepEqual(leerPartida(), { version: 1, ...p });
  borrarPartida();
  assert.equal(leerPartida(), null);
});

test('guardado: un dato roto o de otra versión no rompe el juego', () => {
  localStorage.setItem('templo-del-sol-partida', '{roto');
  assert.equal(leerPartida(), null);
  localStorage.setItem('templo-del-sol-partida', JSON.stringify({ version: 99 }));
  assert.equal(leerPartida(), null);
});
