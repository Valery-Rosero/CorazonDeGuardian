import assert from 'node:assert/strict';
import { before, test } from 'node:test';
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
  seguir([[0, -110], [0, -128], [0, -136], [0, -145], [0, -150]], 8);
  zonas.add(sim.triggers.zona);
  assert.ok(!sim.muerta, 'no cae al abismo');
  assert.ok(sim.jugador.posicion.y > 14, 'llega a la terraza del pórtico');
  for (const z of ['Claro de entrada', 'Sendero de los helechos', 'Cascada', 'Cueva de las runas', 'Puente viejo', 'Ruinas del pórtico']) {
    assert.ok([...zonas].some((n) => n.includes(z)), `pasó por «${z}» (zonas: ${[...zonas].join(' | ')})`);
  }
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
