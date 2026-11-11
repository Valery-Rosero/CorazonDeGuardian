import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import { crearSimulacion } from './simulacion.js';

/** @type {Awaited<ReturnType<typeof crearSimulacion>>} */
let sim;
before(async () => {
  sim = await crearSimulacion();
});

const reiniciar = () => {
  sim.eventos.length = 0;
  sim.muerta = false;
  sim.vida.reiniciar();
  sim.puente.reiniciar();
  sim.teclas();
};

test('Victoria aparece en el claro y queda de pie sobre el suelo', () => {
  reiniciar();
  sim.ir('jugador');
  sim.correr(1.5);
  assert.ok(sim.jugador.enSuelo, 'debería estar en el suelo');
  assert.ok(Math.abs(sim.jugador.posicion.y) < 0.15, `altura ${sim.jugador.posicion.y}`);
  assert.equal(sim.triggers.zona, 'La selva olvidada — Claro de entrada');
});

test('camina hacia delante a la velocidad configurada sin atravesar el suelo', () => {
  reiniciar();
  sim.ir('jugador');
  sim.correr(0.5);
  const z0 = sim.jugador.posicion.z;
  sim.teclas('adelante');
  sim.correr(2);
  const avance = sim.jugador.posicion.z - z0;
  assert.ok(avance > 7 && avance < 9.5, `avanzó ${avance.toFixed(2)} m en 2 s`);
  assert.ok(sim.jugador.posicion.y > -0.2);
});

test('el salto sube alrededor de 1,6 m', () => {
  reiniciar();
  sim.ir('jugador');
  sim.correr(1);
  const y0 = sim.jugador.posicion.y;
  sim.entrada.pulsadas.add('saltar');
  let maximo = y0;
  for (let i = 0; i < 90; i++) {
    sim.correr(1 / 60);
    maximo = Math.max(maximo, sim.jugador.posicion.y);
  }
  const altura = maximo - y0;
  assert.ok(altura > 1.4 && altura < 1.85, `saltó ${altura.toFixed(2)} m`);
  assert.ok(sim.jugador.enSuelo, 'vuelve a caer al suelo');
});

test('empujar una esfera ritual la hace rodar (cuerpo dinámico con masa)', () => {
  reiniciar();
  const esfera = sim.nivel.dinamicos.find((d) => d.datos.forma === 'esfera');
  const inicio = esfera.cuerpo.position.clone();
  // Victoria a 3 m de la esfera, caminando hacia ella
  const pos = esfera.inicio.p.clone();
  pos.z -= 3;
  pos.y = 0;
  sim.jugador.colocar(pos, 0);
  sim.mirar(0);
  sim.teclas('adelante');
  sim.correr(2);
  sim.teclas();
  sim.correr(1);
  const movida = esfera.cuerpo.position.distanceTo(inicio);
  assert.ok(movida > 0.5, `la esfera se movió ${movida.toFixed(2)} m`);
  assert.ok(esfera.cuerpo.position.y > 0.3, 'no atraviesa el suelo');
});

test('cruzar el puente corriendo: las tablas caen detrás y Victoria llega a las ruinas', () => {
  reiniciar();
  sim.ir('portal_cornisa');
  sim.teclas('adelante', 'correr');
  sim.correr(6);
  assert.ok(sim.eventos.includes('tabla_cae'), 'alguna tabla debió caer');
  assert.ok(!sim.muerta, 'no debería caer al abismo');
  assert.equal(sim.triggers.zona, 'La selva olvidada — Ruinas del pórtico');
  assert.ok(sim.eventos.includes('checkpoint:3'), 'enciende el pilar después del puente');
});

test('quedarse quieta en el puente: la tabla cae, Victoria cae al abismo y muere', () => {
  reiniciar();
  sim.ir('portal_cornisa');
  sim.teclas('adelante');
  sim.correr(1.6); // ya sobre las primeras tablas
  sim.teclas();
  sim.correr(4);
  assert.ok(sim.eventos.includes('muerte'), `eventos: ${sim.eventos.join(', ')}`);
  assert.ok(sim.vida.muerta);
});

test('el portal de la cueva lleva a la cornisa y no rebota de vuelta', () => {
  reiniciar();
  sim.ir('portal_cascada');
  sim.teclas('atras'); // el portal está detrás de Victoria
  sim.correr(2);
  assert.ok(sim.eventos.includes('portal:portal_cornisa'), `eventos: ${sim.eventos.join(', ')}`);
  assert.equal(sim.eventos.filter((e) => e.startsWith('portal')).length, 1, 'un solo teletransporte');
  assert.ok(sim.jugador.posicion.y > 11, `altura tras el portal ${sim.jugador.posicion.y.toFixed(1)}`);
});

test('la escalinata de las ruinas se sube caminando hasta la terraza del pórtico', () => {
  reiniciar();
  sim.ir('debug_3');
  sim.teclas('adelante');
  sim.correr(4);
  assert.ok(sim.jugador.posicion.y > 14, `altura ${sim.jugador.posicion.y.toFixed(2)} (terraza a 14,4 m)`);
  assert.ok(!sim.muerta);
});

test('recorrido completo de la zona 1: del claro al pórtico del santuario', () => {
  reiniciar();
  sim.ir('jugador');
  sim.correr(0.5);
  // Puntos del sendero en coordenadas de Blender (x, y) → Three.js (x, -y); mismo trazado que build_zona_1_selva.py
  const sendero = [[0, 4], [-5, -10], [-11, -24], [-9, -36], [0, -47], [6, -57], [7.5, -67], [7.5, -77],
    [5.5, -82.4], [2.6, -83.6], [0, -86], [0, -92.5]];
  const zonas = new Set();
  /** @param {number[][]} puntos @param {number} limite */
  const seguir = (puntos, limite) => {
    for (const [bx, by] of puntos) {
      const objetivoX = bx;
      const objetivoZ = -by;
      let t = 0;
      while (t < limite) {
        const dx = objetivoX - sim.jugador.posicion.x;
        const dz = objetivoZ - sim.jugador.posicion.z;
        if (Math.hypot(dx, dz) < 1.2 || sim.eventos.some((e) => e.startsWith('portal'))) break;
        sim.mirar(Math.atan2(dx, dz));
        sim.teclas('adelante', 'correr');
        sim.correr(0.1);
        zonas.add(sim.triggers.zona);
        t += 0.1;
      }
      if (sim.eventos.some((e) => e.startsWith('portal'))) return;
      assert.ok(t < limite, `atascada camino de (${bx}, ${by}); está en ${sim.jugador.posicion.toArray().map((v) => v.toFixed(1))}`);
    }
  };
  seguir(sendero, 8);
  assert.ok(sim.eventos.includes('portal:portal_cornisa'), 'entra al portal de la cueva');
  sim.eventos.length = 0;
  seguir([[0, -110], [0, -128], [0, -136], [0, -141.6]], 8);
  // La losa cierra lo alto de la escalinata: se abre con la Manipulación ancestral
  sim.mirar(0);
  sim.correr(0.2);
  assert.equal(sim.manipular(), 'losa', 'la losa es el objetivo de la Manipulación');
  sim.correr(2);
  seguir([[0, -146], [0, -150]], 8);
  zonas.add(sim.triggers.zona);
  assert.ok(!sim.muerta, 'no cae al abismo');
  assert.ok(sim.jugador.posicion.y > 14, 'llega a la terraza del pórtico');
  for (const z of ['Claro de entrada', 'Sendero de los helechos', 'Cascada', 'Cueva de las runas', 'Puente viejo', 'Ruinas del pórtico']) {
    assert.ok([...zonas].some((n) => n.includes(z)), `pasó por «${z}» (zonas: ${[...zonas].join(' | ')})`);
  }
});

test('la losa cierra el paso al pórtico hasta que se usa la Manipulación', () => {
  reiniciar();
  const losa = sim.losas.lista[0];
  losa.t = -1;
  losa.cuerpo.position.set(losa.desde.x, losa.desde.y, losa.desde.z);
  for (const o of sim.interactuables.lista) if (o.tipo === 'losa') o.activo = true;
  sim.ir('debug_3');
  sim.teclas('adelante');
  sim.correr(6);
  assert.ok(sim.jugador.posicion.z < 143, `la losa la detiene antes del pórtico (z = ${sim.jugador.posicion.z.toFixed(2)})`);
  sim.teclas();
  assert.equal(sim.manipular(), 'losa');
  sim.correr(2);
  assert.ok(losa.cuerpo.position.y < losa.desde.y - 2.3, 'la losa se hundió');
  sim.teclas('adelante');
  sim.correr(3);
  assert.ok(sim.jugador.posicion.z > 146, `ahora pasa (z = ${sim.jugador.posicion.z.toFixed(2)})`);
});

test('el Pulso solar empuja una esfera ritual', () => {
  reiniciar();
  const esfera = sim.nivel.dinamicos.find((d) => d.datos.forma === 'esfera');
  esfera.cuerpo.position.set(esfera.inicio.p.x, esfera.inicio.p.y, esfera.inicio.p.z);
  esfera.cuerpo.velocity.set(0, 0, 0);
  sim.correr(0.5);
  const inicio = esfera.cuerpo.position.clone();
  // Desde 1,4 m y hacia el centro abierto del claro (en la otra dirección hay obstáculos cerca)
  const origen = new THREE.Vector3(inicio.x, inicio.y, inicio.z + 1.4);
  sim.pulsos.disparar(origen, new THREE.Vector3(0, 0, -1));
  sim.correr(1.5);
  assert.ok(sim.eventos.includes('impacto:dinamico'), `eventos: ${sim.eventos.join(', ')}`);
  const { cuerpo, pos } = sim.ultimoImpacto;
  assert.ok(cuerpo.position.distanceTo(pos) > 0.5, `la esfera golpeada rodó ${cuerpo.position.distanceTo(pos).toFixed(2)} m`);
});

test('el Pulso solar no atraviesa los riscos y su proyectil vuelve al pool', () => {
  reiniciar();
  // Desde el sendero hacia la pared del desfiladero (x > 14)
  sim.pulsos.disparar(new THREE.Vector3(8, 1.5, 70), new THREE.Vector3(1, 0, 0));
  sim.correr(1.5);
  assert.ok(sim.eventos.includes('impacto:estatico'), `eventos: ${sim.eventos.join(', ')}`);
  assert.equal(sim.pulsos.activos, 0);
});

test('el pool de pulsos nunca crea proyectiles nuevos: recicla el más antiguo', () => {
  reiniciar();
  const antes = sim.pulsos.lista.length;
  for (let i = 0; i < 20; i++) sim.pulsos.disparar(new THREE.Vector3(0, 30, 0), new THREE.Vector3(0, 1, 0));
  assert.equal(sim.pulsos.lista.length, antes);
  assert.equal(sim.pulsos.activos, 16);
  sim.correr(2);
  assert.equal(sim.pulsos.activos, 0, 'se apagan al llegar a su alcance');
});

test('el mundo está cerrado: caminar hacia el borde del claro no saca a Victoria del mapa', () => {
  reiniciar();
  sim.ir('jugador');
  sim.mirar(-Math.PI / 2);
  sim.teclas('adelante', 'correr');
  sim.correr(8);
  assert.ok(Math.abs(sim.jugador.posicion.x) < 25, `x = ${sim.jugador.posicion.x.toFixed(1)}`);
  assert.ok(sim.jugador.posicion.y > -0.5);
});
