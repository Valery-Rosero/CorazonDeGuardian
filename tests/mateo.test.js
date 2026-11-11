import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import * as THREE from 'three';
import { EXPRESIONES } from '../src/config/expressions.js';
import { ANIMACION, PLAYER } from '../src/config/player.js';
import { MateoNPC } from '../src/player/mateo_npc.js';
import { cargarGlb } from './simulacion.js';

/** @type {MateoNPC} */
let mateo;
before(async () => {
  const glb = await cargarGlb('public/models/mateo.glb');
  mateo = new MateoNPC(glb.scene, () => {}, { ...ANIMACION }, { ...PLAYER }, EXPRESIONES);
});

/** Altura (sobre sus pies) del hueso más bajo y de la cabeza. */
function alturas() {
  mateo.raiz.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  let minimo = Infinity;
  mateo.modelo.traverse((o) => {
    if (!(/** @type {THREE.Bone} */ (o).isBone) || o.name === 'cadera') return;
    minimo = Math.min(minimo, o.getWorldPosition(p).y);
  });
  const cabeza = mateo.modelo.getObjectByName('cabeza').getWorldPosition(p).y;
  return { minimo, cabeza };
}

function correr(segundos) {
  for (let t = 0; t < segundos; t += 1 / 60) mateo.actualizar(1 / 60, t, null, t);
}

test('Mateo: de rodillas la cabeza baja y nada atraviesa el suelo; al levantarse vuelve a su altura', () => {
  mateo.raiz.visible = true;   // en el juego aparece al romperse el caparazón
  mateo.colocar(new THREE.Vector3(0, 0, 0), 0);
  correr(0.5);
  const dePie = alturas();
  mateo.arrodillar();
  correr(1);
  const rodillas = alturas();
  assert.ok(rodillas.cabeza < dePie.cabeza - 0.4, `cabeza de pie ${dePie.cabeza.toFixed(2)} m, de rodillas ${rodillas.cabeza.toFixed(2)} m`);
  assert.ok(rodillas.minimo > -0.12, `un hueso bajo el suelo: ${rodillas.minimo.toFixed(2)} m`);
  // Sigue de rodillas durante toda la cinemática
  correr(10);
  assert.ok(Math.abs(alturas().cabeza - rodillas.cabeza) < 0.05, 'no se levanta solo');
  mateo.seguir();
  correr(1);
  assert.ok(Math.abs(alturas().cabeza - dePie.cabeza) < 0.05, 'de pie otra vez');
});
