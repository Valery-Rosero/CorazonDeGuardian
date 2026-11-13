import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { ColaDialogo, LineaTiempo } from '../src/cinematics/timeline.js';
import { ReproductorCine } from '../src/cinematics/cinematic_player.js';
import { LINEAS, PAUSA_ENTRE_LINEAS } from '../src/config/dialogues.js';
import { despertar, fase2, fase3, derrota, final } from '../src/cinematics/guardian_cines.js';
import { intro, brazalete, llave, puente, puertaEspejos } from '../src/cinematics/story_cines.js';
import { epilogo, T_EPILOGO } from '../src/cinematics/epilogo.js';

// Posiciones de ejemplo: los tiempos no dependen de dónde esté cada uno
const A = { x: 0, y: 0, z: 0 };
const B = { x: 3, y: 0, z: 12 };
const C = { x: -2, y: 0, z: 6 };
const CINES = [
  intro(A, B), brazalete(B, A), llave(A, mas(C, 1.7), B), puente(A, B), puertaEspejos(B, mas(B, 3), A),
  despertar(A, B), fase2(mas(B, 3), 0, A), fase3(mas(B, 3), 0), derrota(B, 0, A, C), final(A, 0, C, { camara: mas(A, 2), mira: B, mm: 30 }),
  epilogo(A, { x: 1, y: 0, z: 0 }, C, (t) => ({ x: 120 - t, y: 30, z: 0 }), { x: 125, y: 34, z: 0 }, { x: -1, y: 0, z: 0 }, () => NaN),
];
function mas(p, y) { return { x: p.x, y: p.y + y, z: p.z }; }

/** Reproduce la cinemática con su cola de diálogo a 60 FPS: cuándo empieza y termina cada línea. */
function simular(cine) {
  const linea = new LineaTiempo(cine);
  const cola = new ColaDialogo(LINEAS, PAUSA_ENTRE_LINEAS);
  const dt = 1 / 60;
  const lineas = [];
  let t = 0;
  while (t < linea.duracion + 10 && (!linea.terminada || cola.hablando || cola.cola.length)) {
    if (!linea.terminada) for (const s of linea.avanzar(dt)) if (s.accion === 'decir') cola.decir(...s.datos);
    const { empieza, termina } = cola.actualizar(dt);
    if (empieza) lineas.push({ codigo: empieza, desde: t, hasta: Infinity });
    if (termina) lineas.find((l) => l.codigo === termina && l.hasta === Infinity).hasta = t;
    t += dt;
  }
  /** Plano en el instante u. */
  const plano = (u) => {
    let acum = 0;
    for (let i = 0; i < cine.planos.length; i++) {
      acum += cine.planos[i].duracion;
      if (u < acum) return i;
    }
    return cine.planos.length - 1;
  };
  return { duracion: linea.duracion, lineas, plano };
}

test('cinemáticas: cada línea de diálogo termina dentro de su cinemática, con aire antes del corte', () => {
  for (const cine of CINES) {
    const { duracion, lineas } = simular(cine);
    for (const l of lineas) {
      assert.ok(l.hasta <= duracion - 0.2,
        `${cine.nombre}: ${l.codigo} termina a los ${l.hasta.toFixed(2)} s y la cinemática a los ${duracion.toFixed(2)} s`);
    }
  }
});

test('cinemáticas: la última línea de un plano de diálogo no se corta con el cambio de plano', () => {
  // Las líneas que el guion gráfico quiere en cuadro: quien habla se ve mientras dice su frase
  const enCuadro = { fase2: { vic_fase2_01: 1 }, fase3: { mat_fase3_01: 1 }, derrota: { mat_derrota_01: 3, vic_derrota_01: 4, mat_derrota_02: 5 }, brazalete: { vic_brazalete_01: 2 }, llave: { vic_llave_01: 2 }, despertar: { gem_despertar_01: 5 }, epilogo: { mat_epilogo_01: 3, vic_epilogo_01: 4 } };
  for (const cine of CINES) {
    const esperado = enCuadro[cine.nombre];
    if (!esperado) continue;
    const { lineas, plano } = simular(cine);
    for (const [codigo, indice] of Object.entries(esperado)) {
      const l = lineas.find((x) => x.codigo === codigo);
      assert.ok(l, `${cine.nombre}: falta ${codigo}`);
      assert.equal(plano(l.desde + 0.05), indice, `${cine.nombre}: ${codigo} empieza fuera de su plano`);
      assert.equal(plano(l.hasta - 0.05), indice, `${cine.nombre}: ${codigo} termina fuera de su plano`);
    }
  }
});

test('cinemáticas: un fotograma lento no atrasa la cinemática respecto al reloj real', () => {
  const camara = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
  const cine = new ReproductorCine(camara, /** @type {any} */ ({ cine: () => {}, saltar: () => {} }));
  const c = despertar(A, B);
  cine.reproducir(c);
  // 0,4 s de parón (un sombreador compilándose) y después 60 FPS: la línea de tiempo lleva el tiempo real
  cine.actualizar(0.4, false);
  for (let i = 0; i < 60; i++) cine.actualizar(1 / 60, false);
  assert.ok(Math.abs(cine.linea.t - 1.4) < 1e-6, `t = ${cine.linea.t}`);
});

test('cinemáticas: al saltar, el juego recibe los sucesos pendientes pero no el diálogo ni sus sonidos', () => {
  const camara = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
  const cine = new ReproductorCine(camara, /** @type {any} */ ({ cine: () => {}, saltar: () => {} }));
  let callado = 0;
  cine.callar = () => callado++;
  const recibidos = [];
  cine.reproducir(despertar(A, B), { alSuceso: (s) => recibidos.push(s.accion) });
  cine.actualizar(1, false);
  cine.saltar();
  assert.ok(recibidos.includes('levantarse') && recibidos.includes('runas') && recibidos.includes('rotulo'));
  assert.ok(!recibidos.includes('decir') && !recibidos.includes('rugido'));
  assert.equal(callado, 2, 'calla al empezar y al saltar');
  assert.equal(cine.activo, false);
});

test('epílogo: la cinemática dura lo que la música y el negro llega con el golpe final', () => {
  const c = CINES.find((x) => x.nombre === 'epilogo');
  const duracion = c.planos.reduce((s, p) => s + p.duracion, 0);
  assert.ok(Math.abs(duracion - T_EPILOGO.fin) < 1e-6, `dura ${duracion} s`);
  const negro = c.sucesos.find((s) => s.accion === 'negro');
  assert.equal(negro.t, 20.6, 'el golpe de musica_amenaza (tools/audio/music_synth.py) está a los 20,6 s');
  // El diálogo termina antes del negro
  const { lineas } = simular(c);
  for (const l of lineas) assert.ok(l.hasta < T_EPILOGO.negro, `${l.codigo} termina a los ${l.hasta.toFixed(2)} s`);
});
