import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { ESCAPE } from '../src/config/boss.js';
import { crearSimulacion } from './simulacion.js';

/** @type {Awaited<ReturnType<typeof crearSimulacion>>} */
let sim;
before(async () => {
  sim = await crearSimulacion(['public/models/zona_1_selva.glb', 'public/models/zona_2_santuario.glb', 'public/models/zona_3_camara.glb']);
});

/** Corre hacia un punto del plano XZ (coordenadas de Three.js); salta si se lo piden. Devuelve el tiempo usado. */
function correrA(x, z, max = 25, { saltarEn = null, hasta = null } = {}) {
  let t = 0;
  let saltado = false;
  for (; t < max; t += 0.05) {
    if (hasta && hasta()) break;
    const p = sim.jugador.posicion;
    const dx = x - p.x;
    const dz = z - p.z;
    if (Math.hypot(dx, dz) < 0.7) break;
    sim.mirar(Math.atan2(dx, dz));
    const teclas = ['adelante', 'correr'];
    // Salta una sola vez al pasar por 'saltarEn' (corriendo hacia -Z)
    sim.teclas(...teclas);
    if (saltarEn !== null && p.z <= saltarEn && !saltado && sim.jugador.enSuelo) {
      sim.entrada.pulsadas.add('saltar');   // el salto es una pulsación, no una tecla mantenida
      saltado = true;
    }
    sim.correr(0.05);
  }
  sim.teclas();
  return t;
}

test('escape: de la arena a la cornisa en menos de 75 s, con el salto final del puente', () => {
  // Estado del escape: las puertas ya están abiertas (se abrieron al llegar) y faltan dos tablas del puente
  for (const n of ['dyn_puerta_arena', 'dyn_puerta_espejos', 'dyn_puerta_santuario', 'dyn_losa_1']) {
    const d = sim.nivel.dinamicos.find((x) => x.malla.name === n);
    assert.ok(d, n);
    sim.losas.activar(d.malla);
  }
  sim.correr(3.5);
  sim.puente.reiniciar();
  sim.puente.romper(ESCAPE.tablas_rotas);
  const eventos = [];
  const anterior = sim.triggers.alCambiar;
  sim.triggers.alCambiar = (t, entra) => {
    if (entra && t.datos.evento) eventos.push(t.datos.evento);
    // La salida del vestíbulo lleva al pasadizo del pórtico (en el juego, con fundido)
    if (entra && t.datos.evento === 'salida') sim.ir('salida_santuario');
    anterior(t, entra);
  };
  sim.ir('escape');
  sim.correr(0.3);
  let tiempo = 0;
  // Arena → pasillo → antesala (sube, rodeando el pilar del checkpoint 5) → sala de los espejos (rodeando el espejo C) → paso → sala de columnas → vestíbulo
  const santuario = [[0, 678], [0, 672], [1.8, 670], [1.8, 666], [0, 658], [0, 655], [2.6, 652], [2.6, 648], [0, 640], [0, 635], [1.6, 618], [1.6, 612], [0, 606], [0, 599]];
  for (const [x, z] of santuario) {
    const dt = correrA(x, z, 25, { hasta: () => eventos.includes('salida') });
    tiempo += dt;
    if (process.env.TRAZA) console.log("tramo", x, z, dt.toFixed(1), sim.jugador.posicion.toArray().map((v) => v.toFixed(1)).join(","));
  }
  assert.ok(eventos.includes('salida'), `sucesos: ${eventos}`);
  assert.ok(sim.jugador.posicion.z < 200, `volvió a la selva (z = ${sim.jugador.posicion.z.toFixed(1)})`);
  // Pórtico → terraza → escalinata → meseta → puente (salto en el hueco) → cornisa
  const selva = [[0, 152], [0, 145], [0, 138], [0, 131], [0, 127.5]];
  for (const [x, z] of selva) {
    const dt = correrA(x, z);
    tiempo += dt;
    if (process.env.TRAZA) console.log("tramo", x, z, dt.toFixed(1), sim.jugador.posicion.toArray().map((v) => v.toFixed(1)).join(","));
  }
  tiempo += correrA(0, 103.5, 15, { saltarEn: 112.4 });
  sim.triggers.alCambiar = anterior;
  assert.equal(sim.muerta, false, 'no cayó al abismo');
  assert.ok(sim.jugador.posicion.y > 11, `llegó arriba (y = ${sim.jugador.posicion.y.toFixed(2)})`);
  assert.ok(eventos.includes('final'), `llega al final en la cornisa: ${eventos}`);
  assert.ok(tiempo < ESCAPE.tiempo, `${tiempo.toFixed(1)} s`);
  // La ruta limpia ronda 23 s: los 75 s del documento dejan margen para rocas, tropiezos y un checkpoint
  assert.ok(tiempo > 15, `ruta demasiado corta: ${tiempo.toFixed(1)} s`);
});
