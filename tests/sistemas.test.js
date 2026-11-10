import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PORTAL, PUENTE } from '../src/config/level.js';
import { VIDA } from '../src/config/player.js';
import { Enfriamiento } from '../src/core/cooldown.js';
import { Vida } from '../src/player/health.js';
import { actualizarTabla, crearEstadoTabla, TABLA } from '../src/world/bridge_logic.js';
import { RegistroCheckpoints } from '../src/world/checkpoint_logic.js';

const DT = 1 / 60;
const correr = (n, fn) => { for (let i = 0; i < n; i++) fn(); };

test('el portal respeta su enfriamiento de 3 s', () => {
  const e = new Enfriamiento(PORTAL.enfriamiento);
  assert.equal(e.usar(), true);
  assert.equal(e.usar(), false);
  correr(Math.round(2.9 / DT), () => e.actualizar(DT));
  assert.equal(e.usar(), false, 'a los 2,9 s todavía no');
  correr(Math.round(0.2 / DT), () => e.actualizar(DT));
  assert.equal(e.usar(), true, 'a los 3,1 s ya sí');
});

test('vida: daño, invulnerabilidad, curación y muerte', () => {
  const v = new Vida(VIDA.maxima, VIDA.invulnerable_tras_dano);
  assert.equal(v.danar(20), true);
  assert.equal(v.actual, 80);
  assert.equal(v.danar(20), false, 'invulnerable justo después del golpe');
  correr(Math.round(0.7 / DT), () => v.actualizar(DT));
  assert.equal(v.danar(20), true);
  assert.equal(v.curar(VIDA.flor_cura), 25);
  assert.equal(v.actual, 85);
  assert.equal(v.curar(VIDA.flor_cura), 15, 'no pasa del máximo');
  assert.equal(v.curar(VIDA.flor_cura), 0, 'con la vida llena la flor no cura');
  v.matar();
  assert.equal(v.muerta, true);
  assert.equal(v.curar(50), 0, 'no se cura a una muerta');
  v.reiniciar();
  assert.equal(v.actual, 100);
});

test('modo invulnerable de depuración', () => {
  const v = new Vida(100, 0.6);
  v.dios = true;
  assert.equal(v.danar(50), false);
  assert.equal(v.matar(), false);
  assert.equal(v.muerta, false);
});

test('tabla del puente: tiembla 0,4 s, cae y reaparece a los 3 s', () => {
  const t = crearEstadoTabla();
  assert.equal(actualizarTabla(t, DT, false, PUENTE), null);
  assert.equal(actualizarTabla(t, DT, true, PUENTE), 'tiembla');
  const eventos = [];
  correr(Math.round(0.45 / DT), () => { const e = actualizarTabla(t, DT, false, PUENTE); if (e) eventos.push(e); });
  assert.deepEqual(eventos, ['cae']);
  assert.equal(t.estado, TABLA.CAE);
  correr(Math.round(3.05 / DT), () => { const e = actualizarTabla(t, DT, false, PUENTE); if (e) eventos.push(e); });
  assert.deepEqual(eventos, ['cae', 'reaparece']);
  assert.equal(t.estado, TABLA.FIRME);
  // Si al reaparecer Victoria está encima, vuelve a temblar
  assert.equal(actualizarTabla(t, DT, true, PUENTE), 'tiembla');
});

test('checkpoints: el último pilar visitado es el punto de reaparición', () => {
  const r = new RegistroCheckpoints(1);
  assert.equal(r.pasar(1), false, 'el inicial ya está encendido');
  assert.equal(r.pasar(2), true);
  assert.equal(r.pasar(2), false);
  assert.equal(r.actual, 2);
  r.pasar(3);
  assert.equal(r.actual, 3);
  r.reiniciar();
  assert.equal(r.actual, 1);
  assert.deepEqual([...r.encendidos], [1]);
});
