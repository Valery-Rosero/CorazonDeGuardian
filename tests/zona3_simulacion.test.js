import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import { GUARDIAN, ROCAS } from '../src/config/boss.js';
import { PoolRocas } from '../src/enemies/boss_attacks.js';
import { CombateGuardian } from '../src/enemies/boss_fight.js';
import { cargarGlb, crearSimulacion, DT } from './simulacion.js';

/** @type {Awaited<ReturnType<typeof crearSimulacion>>} */
let sim;
let glbGuardian;
before(async () => {
  sim = await crearSimulacion('public/models/zona_3_camara.glb');
  glbGuardian = await cargarGlb('public/models/guardian.glb');
});

function crearCombate() {
  const golpes = [];
  const sucesos = [];
  const centro = sim.nivel.raiz.getObjectByName('centro_arena').getWorldPosition(new THREE.Vector3());
  const combate = new CombateGuardian({
    escena: sim.escena, fisica: sim.fisica, glb: glbGuardian.scene, toon: new THREE.MeshStandardMaterial(),
    spawn: sim.nivel.spawns.guardian, centro, interactuables: sim.interactuables,
    rocas: new PoolRocas(sim.escena, sim.fisica, ROCAS), latido: null,
    avisos: {
      danar: (n) => golpes.push(n), sonido: () => {}, sacudida: () => {}, rafaga: () => {},
      fase: (f) => sucesos.push(`fase${f}`), invocar: () => sucesos.push('invocar'), derrota: () => sucesos.push('derrota'),
      barra: () => {}, nota: () => {},
    },
  });
  return { combate, golpes, sucesos };
}

test('arena: Victoria entra caminando desde la puerta y el umbral dispara el despertar', () => {
  const eventos = [];
  const anterior = sim.triggers.alCambiar;
  sim.triggers.alCambiar = (t, entra) => { if (entra && t.datos.evento) eventos.push(t.datos.evento); anterior(t, entra); };
  sim.jugador.colocar(new THREE.Vector3(0, -3, 674.8), 0);
  sim.correr(0.4);
  sim.mirar(0);
  sim.teclas('adelante');
  sim.correr(2.5);
  sim.teclas();
  sim.triggers.alCambiar = anterior;
  assert.ok(eventos.includes('despertar'), `sucesos: ${eventos}`);
  assert.equal(sim.triggers.zona, 'La cámara del sol — Arena');
  assert.ok(Math.abs(sim.jugador.posicion.y + 3) < 0.2, 'de pie sobre el suelo de la arena');
});

test('Guardián: sentado no hace nada; despierto, sus ataques alcanzan a Victoria si se queda quieta', () => {
  const { combate, golpes } = crearCombate();
  const pies = new THREE.Vector3(0, -3, 703.5);   // a 5 m del trono
  for (let t = 0; t < 4; t += DT) combate.actualizar(DT, t, pies, true);
  assert.equal(golpes.length, 0);
  combate.empezarCombate();
  for (let t = 0; t < 25; t += DT) combate.actualizar(DT, t, pies, true);
  assert.ok(golpes.length >= 2, `golpes recibidos: ${golpes}`);
  assert.ok(golpes.every((n) => n === 20 || n === 25), 'en la fase 1 solo golpe sísmico y barrido');
});

test('pilares: los tres del .glb abren el núcleo; solo entonces y cerca del pecho el Pulso le hace daño', () => {
  const { combate, sucesos } = crearCombate();
  combate.empezarCombate();
  assert.equal(combate.pilares.length, 3);
  const pecho = combate.actor.pecho(new THREE.Vector3());
  assert.equal(combate.golpear(combate.actor.cuerpo, 25, pecho), true);
  assert.equal(combate.logica.vida, GUARDIAN.vida, 'con las placas cerradas no le hace nada');
  for (const p of combate.pilares) combate.usar(p.interactuable);
  assert.equal(combate.logica.nucleoAbierto, true);
  combate.actualizar(DT, 0, new THREE.Vector3(0, -3, 690), true);
  assert.ok(sucesos.includes('fase2'));
  combate.golpear(combate.actor.cuerpo, 25, combate.actor.pecho(new THREE.Vector3()));
  assert.equal(combate.logica.vida, GUARDIAN.vida - 25);
  // Un golpe en los pies no cuenta aunque el núcleo esté abierto
  combate.golpear(combate.actor.cuerpo, 25, combate.actor.raiz.position.clone());
  assert.equal(combate.logica.vida, GUARDIAN.vida - 25);
});

test('arena: tiene el trono, la entrada, el inicio del escape y los espectros de la invocación', () => {
  for (const s of ['arena', 'guardian', 'escape', 'debug_6']) assert.ok(sim.nivel.spawns[s], `falta spawn_${s}`);
  const invocados = Object.values(sim.nivel.spawns).filter((s) => s.datos.aparece === 'invocacion');
  assert.equal(invocados.length, 2);
  const tipos = sim.interactuables.lista.filter((o) => o.tipo === 'pilar_solar').map((o) => o.datos.pilar).sort();
  assert.deepEqual(tipos, [1, 2, 3]);
});

test('Guardián: despierto baja del trono y camina hacia Victoria; en el golpe sísmico salta antes de caer', () => {
  const { combate } = crearCombate();
  combate.empezarCombate();
  combate.levantar(1);
  const lejos = new THREE.Vector3(0, -3, 685);   // Victoria en la entrada, a ~24 m del trono
  const inicio = combate.actor.raiz.position.clone();
  let maxAlto = 0;
  let sismicos = 0;
  for (let t = 0; t < 14; t += DT) {
    combate.actualizar(DT, t, lejos, true);
    maxAlto = Math.max(maxAlto, combate.actor.pose.alto);
    if (combate.logica.ataque?.tipo === 'sismico') sismicos++;
  }
  const avance = inicio.distanceTo(combate.actor.raiz.position);
  assert.ok(avance > 3, `se movió ${avance.toFixed(2)} m desde el trono`);
  assert.ok(combate.actor.raiz.position.z < inicio.z, 'hacia la entrada');
  assert.ok(sismicos > 0, 'hubo al menos un golpe sísmico');
  assert.ok(maxAlto > 1, `salto del golpe sísmico: ${maxAlto.toFixed(2)} m`);
});
