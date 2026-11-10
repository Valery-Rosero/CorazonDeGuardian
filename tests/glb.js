// Lector mínimo de .glb para las pruebas (solo el bloque JSON).
import { readFileSync } from 'node:fs';

/** @param {string} ruta */
export function leerGlb(ruta) {
  const datos = readFileSync(ruta);
  if (datos.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${ruta} no es un GLB`);
  const largo = datos.readUInt32LE(12);
  return { json: JSON.parse(datos.toString('utf8', 20, 20 + largo)), bytes: datos.length };
}

/** Triángulos y llamadas de dibujo de todas las mallas. */
export function contar(json) {
  let triangulos = 0;
  let llamadas = 0;
  for (const m of json.meshes) {
    for (const p of m.primitives) {
      llamadas++;
      const acc = json.accessors[p.indices ?? p.attributes.POSITION];
      triangulos += acc.count / 3;
    }
  }
  return { triangulos, llamadas };
}
