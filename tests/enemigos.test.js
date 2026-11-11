import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CENTINELA, ESPECTRO, ESPEJOS } from '../src/config/enemies.js';
import { LogicaCentinela } from '../src/enemies/sentinel_logic.js';
import { LogicaEspectro } from '../src/enemies/specter_logic.js';
import { MaquinaEstados } from '../src/enemies/state_machine.js';
import { AcertijoEspejos, trazarRayo } from '../src/world/light_beam_logic.js';

const DT = 1 / 60;

/** Avanza la lógica 'segundos' con el jugador quieto en 'jugador' (el enemigo no se mueve: solo decide). */
function correr(logica, segundos, jugador, { visible = true, yo = null } = {}) {
  const pos = yo ?? { ...logica.p.yo };
  for (let t = 0; t < segundos; t += DT) {
    logica.actualizar(DT, { yo: pos, jugador, visible, jugadorVivo: true });
    logica.rumbo = logica.rumboDeseado;
  }
}

test('máquina de estados: entra, sale, cuenta el tiempo y cambia cuando el estado lo pide', () => {
  const registro = [];
  const fsm = new MaquinaEstados({
    a: { entrar: () => registro.push('+a'), salir: () => registro.push('-a'), actualizar: (_c, _dt, t) => (t >= 0.5 ? 'b' : undefined) },
    b: { entrar: () => registro.push('+b') },
  }, 'a', {});
  for (let i = 0; i < 20; i++) fsm.actualizar(0.05);
  assert.equal(fsm.actual, 'b');
  assert.deepEqual(registro, ['+a', '-a', '+b']);
  assert.throws(() => fsm.cambiar('zzz'));
});

test('centinela: de guardia no ve lo que está a su espalda ni detrás de un muro', () => {
  // Mira hacia +Z; Victoria a 6 m detrás (-Z)
  const c = new LogicaCentinela(CENTINELA, { x: 0, z: 0 }, 0);
  correr(c, 1, { x: 0, z: -6 });
  assert.equal(c.estado, 'guardia');
  // Delante pero tapada
  correr(c, 1, { x: 0, z: 6 }, { visible: false });
  assert.equal(c.estado, 'guardia');
  // Delante a 14 m: fuera de los 12 m de visión
  correr(c, 1, { x: 0, z: 14 });
  assert.equal(c.estado, 'guardia');
});

test('centinela: la ve, espera 0,5 s con el ojo dorado, la persigue a 4 m/s y golpea tras el aviso', () => {
  const c = new LogicaCentinela(CENTINELA, { x: 0, z: 0 }, 0);
  correr(c, DT * 2, { x: 1, z: 8 });
  assert.equal(c.estado, 'alerta');
  correr(c, 0.4, { x: 1, z: 8 });
  assert.equal(c.estado, 'alerta', 'todavía avisa');
  correr(c, 0.2, { x: 1, z: 8 });
  assert.equal(c.estado, 'persecucion');
  assert.equal(c.orden.velocidad, CENTINELA.velocidad);
  assert.ok(c.orden.z > 0.9, 'va hacia Victoria');
  // Ya cerca: levanta los brazos 0,6 s y golpea una sola vez
  let golpes = 0;
  let enAviso = 0;
  for (let t = 0; t < 1.2; t += DT) {
    c.actualizar(DT, { yo: { x: 0, z: 0 }, jugador: { x: 0, z: 1.5 }, visible: true, jugadorVivo: true });
    if (c.golpe) golpes++;
    if (c.estado === 'ataque') enAviso += DT;
  }
  assert.equal(golpes, 1);
  assert.ok(Math.abs(enAviso - CENTINELA.aviso_ataque) < 0.05, `aviso de ${enAviso.toFixed(2)} s`);
  assert.equal(c.estado, 'recuperacion', 'queda vulnerable después del golpe');
});

test('centinela: si la pierde 4 s vuelve a su puesto y retoma la guardia', () => {
  const c = new LogicaCentinela(CENTINELA, { x: 0, z: 0 }, 0);
  correr(c, 0.7, { x: 0, z: 8 });
  assert.equal(c.estado, 'persecucion');
  correr(c, 3.9, { x: 0, z: 8 }, { visible: false, yo: { x: 0, z: 5 } });
  assert.equal(c.estado, 'persecucion');
  correr(c, 0.2, { x: 0, z: 8 }, { visible: false, yo: { x: 0, z: 5 } });
  assert.equal(c.estado, 'regreso');
  assert.ok(c.orden.z < -0.9, 'camina de vuelta');
  correr(c, DT, { x: 0, z: 30 }, { visible: false, yo: { x: 0, z: 0.1 } });
  assert.equal(c.estado, 'guardia');
});

test('centinela: 3 pulsos lo derriban; cada golpe lo aturde 0,3 s; dormido no ve hasta que despierta', () => {
  const c = new LogicaCentinela(CENTINELA, { x: 0, z: 0 }, 0, { dormido: true });
  correr(c, 2, { x: 0, z: 3 });
  assert.equal(c.estado, 'dormido');
  c.despertar();
  assert.equal(c.estado, 'alerta');
  assert.equal(c.danar(25), false);
  assert.equal(c.estado, 'aturdido');
  correr(c, 0.31, { x: 0, z: 3 });
  assert.notEqual(c.estado, 'aturdido');
  assert.equal(c.danar(25), false);
  assert.equal(c.danar(25), true);
  assert.equal(c.estado, 'muerte');
  assert.equal(c.danar(25), false, 'no muere dos veces');
});

test('espectro: detecta a 18 m, guarda entre 8 y 12 m, carga 0,8 s y dispara cada 2,5 s', () => {
  const e = new LogicaEspectro(ESPECTRO, { x: 0, z: 0 });
  correr(e, 0.5, { x: 0, z: 25 });
  assert.equal(e.estado, 'flotar');
  // Demasiado cerca: se aleja
  e.actualizar(DT, { yo: { x: 0, z: 0 }, jugador: { x: 0, z: 5 }, visible: true, jugadorVivo: true });
  assert.equal(e.estado, 'mantener');
  e.actualizar(DT, { yo: { x: 0, z: 0 }, jugador: { x: 0, z: 5 }, visible: true, jugadorVivo: true });
  assert.ok(e.orden.z < -0.9, 'retrocede');
  // Lejos: se acerca
  e.actualizar(DT, { yo: { x: 0, z: 0 }, jugador: { x: 0, z: 15 }, visible: true, jugadorVivo: true });
  assert.ok(e.orden.z > 0.9, 'se acerca');
  // A 10 m: cuenta los disparos durante 10 s
  let disparos = 0;
  let cargando = 0;
  for (let t = 0; t < 10; t += DT) {
    e.actualizar(DT, { yo: { x: 0, z: 0 }, jugador: { x: 0, z: 10 }, visible: true, jugadorVivo: true });
    if (e.disparo) disparos++;
    if (e.estado === 'cargar') cargando += DT;
  }
  assert.ok(disparos >= 3 && disparos <= 4, `${disparos} disparos`);
  assert.ok(cargando / disparos > 0.75, 'cada disparo se avisa con la carga');
  assert.equal(e.danar(25), false);
  assert.equal(e.danar(25), true, '2 pulsos');
});

test('rayo: rebota en un espejo a 45° y llega al objetivo', () => {
  const t = trazarRayo({
    origen: { x: 10, z: 0 }, dir: { x: -1, z: 0 },
    espejos: [{ x: 0, z: 0, angulo: Math.PI / 4, largo: 1.4 }],
    objetivo: { x: 0, z: -6, radio: 0.5 }, // un rayo hacia -X en una placa a 45° sale hacia -Z
    limites: { minX: -12, maxX: 12, minZ: -12, maxZ: 12 }, rebotes: 6,
  });
  assert.equal(t.alcanzado, true);
  assert.deepEqual(t.tocados, [0]);
  // Una placa de canto (paralela al rayo) no lo desvía
  const deCanto = trazarRayo({
    origen: { x: 10, z: 0 }, dir: { x: -1, z: 0 },
    espejos: [{ x: 0, z: 0, angulo: 0, largo: 1.4 }],
    objetivo: { x: 0, z: 6, radio: 0.5 },
    limites: { minX: -12, maxX: 12, minZ: -12, maxZ: 12 }, rebotes: 6,
  });
  assert.equal(deCanto.alcanzado, false);
  assert.equal(deCanto.puntos.at(-1).x, -12, 'sigue hasta el muro');
});

/** Sala de los espejos del tablero «Santuario» en coordenadas de Three.js (z = -y de Blender). */
function salaSantuario(pasos) {
  return new AcertijoEspejos(
    [{ x: -5, z: 40, paso: pasos[0] }, { x: -5, z: 50, paso: pasos[1] }, { x: 0, z: 50, paso: pasos[2] }],
    { origen: { x: 10, z: 40 }, dir: { x: -1, z: 0 }, objetivo: { x: 0, z: 56, radio: ESPEJOS.radio_cristal },
      limites: { minX: -10, maxX: 10, minZ: 36, maxZ: 56.3 } },
    ESPEJOS,
  );
}

test('espejos: la solución del tablero lleva el rayo al cristal y el inicio no está resuelto', () => {
  assert.equal(salaSantuario([7, 5, 5]).resuelto, true);
  const a = salaSantuario([0, 6, 2]);
  assert.equal(a.resuelto, false);
  // Girar A siete veces, B siete y C tres resuelve el acertijo (cada E gira 45°)
  for (let i = 0; i < 7; i++) a.girar(0);
  for (let i = 0; i < 7; i++) a.girar(1);
  a.girar(2); a.girar(2);
  assert.equal(a.resuelto, false);
  assert.equal(a.girar(2), true);
  assert.deepEqual(a.trazo.tocados, [0, 1, 2]);
});

test('espejos: desde cualquier combinación se puede llegar a la solución (sin estados bloqueados)', () => {
  let resueltos = 0;
  for (let i = 0; i < 512; i++) {
    const pasos = [i & 7, (i >> 3) & 7, (i >> 6) & 7];
    const a = salaSantuario(pasos);
    if (a.resuelto) resueltos++;
    // Girar cada espejo hasta su posición de la solución siempre es posible
    for (const [k, objetivo] of [[0, 7], [1, 5], [2, 5]]) {
      while (!a.resuelto && a.espejos[k].paso !== objetivo) a.girar(k);
    }
    assert.equal(a.resuelto, true, `desde ${pasos}`);
  }
  assert.ok(resueltos < 40, `solo unas pocas combinaciones llegan al cristal (${resueltos})`);
});

test('transición: oscurece, cambia de zona una sola vez con la pantalla en negro y vuelve a aclarar', async () => {
  const { Transicion } = await import('../src/world/zone_transition.js');
  const tr = new Transicion({ oscurecer: 0.5, negro: 0.2, aclarar: 0.5 });
  let cambios = 0;
  let opacidadAlCambiar = -1;
  assert.equal(tr.iniciar(() => { cambios++; opacidadAlCambiar = tr.opacidad; }), true);
  assert.equal(tr.iniciar(() => cambios++), false, 'no se encadenan dos transiciones');
  let maximo = 0;
  for (let t = 0; t < 1.5; t += DT) maximo = Math.max(maximo, tr.actualizar(DT));
  assert.equal(cambios, 1);
  assert.equal(opacidadAlCambiar, 1, 'el cambio ocurre con la pantalla negra');
  assert.equal(maximo, 1);
  assert.equal(tr.activa, false);
  assert.equal(tr.opacidad, 0);
});
