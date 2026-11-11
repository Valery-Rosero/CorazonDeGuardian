// Busca caras superpuestas en el mismo plano (z-fighting: dos superficies que se pelean píxel a píxel y
// dejan «dientes» o parpadeo). Carga los .glb de los escenarios y compara todos los triángulos visibles.
// Uso: node tools/zfighting.mjs [ruta.glb ...]   (sin rutas: las tres zonas)
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RUTAS = ARGS.length ? ARGS
  : ['public/models/zona_1_selva.glb', 'public/models/zona_2_santuario.glb', 'public/models/zona_3_camara.glb'];
const AREA_MINIMA = 0.002;   // m²: por debajo, un roce de bordes biselados
/** Diferencia de color (0 a 1) desde la que el parpadeo se nota; con --todas se listan también las del mismo color. */
const DIFERENCIA = process.argv.includes('--todas') ? -1 : 0.06;

function cargar(ruta) {
  const datos = readFileSync(ruta);
  const buffer = datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength);
  return new Promise((ok, mal) => new GLTFLoader().parse(buffer, '', ok, mal));
}

/** Área de la intersección de dos polígonos convexos en 2D (Sutherland–Hodgman). */
function areaInterseccion(a, b) {
  let poli = a;
  for (let i = 0; i < b.length && poli.length; i++) {
    const p = b[i];
    const q = b[(i + 1) % b.length];
    const dentro = (v) => (q[0] - p[0]) * (v[1] - p[1]) - (q[1] - p[1]) * (v[0] - p[0]) >= -1e-9;
    const corte = (u, v) => {
      const a1 = q[1] - p[1];
      const b1 = p[0] - q[0];
      const c1 = a1 * p[0] + b1 * p[1];
      const a2 = v[1] - u[1];
      const b2 = u[0] - v[0];
      const c2 = a2 * u[0] + b2 * u[1];
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-12) return u;
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
    };
    const sal = [];
    for (let j = 0; j < poli.length; j++) {
      const u = poli[j];
      const v = poli[(j + 1) % poli.length];
      if (dentro(v)) {
        if (!dentro(u)) sal.push(corte(u, v));
        sal.push(v);
      } else if (dentro(u)) sal.push(corte(u, v));
    }
    poli = sal;
  }
  let area = 0;
  for (let i = 0; i < poli.length; i++) {
    const [x1, y1] = poli[i];
    const [x2, y2] = poli[(i + 1) % poli.length];
    area += x1 * y2 - x2 * y1;
  }
  return { area: Math.abs(area) / 2, poli };
}

/** Proyecta un triángulo a 2D sobre su plano, con los vértices en sentido antihorario. */
function a2D(v, n) {
  const u = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const e1 = u.clone().cross(n).normalize();
  const e2 = n.clone().cross(e1);
  const p = v.map((x) => [x.dot(e1), x.dot(e2)]);
  const s = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
  return { p: s < 0 ? [p[0], p[2], p[1]] : p, e1, e2 };
}

let total = 0;
for (const ruta of RUTAS) {
  const gltf = await cargar(ruta);
  gltf.scene.updateMatrixWorld(true);
  /** @type {Map<string, {malla: string, centro: THREE.Vector3, p2: number[][], caja: number[]}[]>} */
  const planos = new Map();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  /** @type {THREE.Object3D[]} */
  const visibles = [];
  gltf.scene.traverse((o) => {
    if (!o.isMesh || /^(col_|trg_)/.test(o.name)) return;
    visibles.push(o);
    // Los rayos de visibilidad cuentan las dos caras: una cara metida dentro de un bloque queda tapada
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.side = THREE.DoubleSide;
  });
  const rayo = new THREE.Raycaster();
  rayo.near = 0;
  rayo.far = 200;
  const nh = new THREE.Vector3();
  /**
   * ¿No se ve este punto de la cara? Lo tapa otra pieza apoyada encima (algo a menos de 3 cm), o está
   * metido dentro de un bloque (lo primero que encuentra el rayo es una cara vista por detrás).
   */
  const tapado = (pt, n) => {
    rayo.set(pt.clone().addScaledVector(n, 0.003), n);
    const h = rayo.intersectObjects(visibles, false)[0];
    if (!h) return false;
    if (h.distance < 0.03) return true;
    nh.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    return nh.dot(n) > 0.2;
  };
  gltf.scene.traverse((o) => {
    if (!o.isMesh || /^(col_|trg_)/.test(o.name)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => /rayo|agua|cascada|poza/.test(m.name || ''))) return;
    const g = o.geometry;
    const pos = g.attributes.position;
    const col = g.attributes.color;
    const base = new THREE.Color(mats[0].color ?? 0xffffff);
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const ia = idx ? idx.getX(i) : i;
      const ib = idx ? idx.getX(i + 1) : i + 1;
      const ic = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
      const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const area = nrm.length() / 2;
      if (area < AREA_MINIMA) continue;
      nrm.normalize();
      // Las caras que miran hacia abajo (bases sobre el suelo) nunca se ven
      if (nrm.y < -0.7) continue;
      const d = nrm.dot(a);
      const clave = `${Math.round(nrm.x * 200)},${Math.round(nrm.y * 200)},${Math.round(nrm.z * 200)},${Math.round(d * 250)}`;
      const color = col ? [0, 1, 2].map((k) => (col.getComponent(ia, k) + col.getComponent(ib, k) + col.getComponent(ic, k)) / 3)
        : [base.r, base.g, base.b];
      const { p: p2, e1, e2 } = a2D([a.clone(), b.clone(), c.clone()], nrm);
      const caja = [Math.min(...p2.map((p) => p[0])), Math.min(...p2.map((p) => p[1])), Math.max(...p2.map((p) => p[0])), Math.max(...p2.map((p) => p[1]))];
      if (!planos.has(clave)) planos.set(clave, []);
      planos.get(clave).push({ malla: `${o.name}`, color, n: nrm.clone(), d, e1, e2, centro: a.clone().add(b).add(c).divideScalar(3), p2, caja });
    }
  });
  const halladas = [];
  for (const lista of planos.values()) {
    if (lista.length < 2 || lista.length > 4000) continue;
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const t = lista[i];
        const u = lista[j];
        if (Math.max(...[0, 1, 2].map((k) => Math.abs(t.color[k] - u.color[k]))) <= DIFERENCIA) continue;
        if (t.caja[2] <= u.caja[0] || u.caja[2] <= t.caja[0] || t.caja[3] <= u.caja[1] || u.caja[3] <= t.caja[1]) continue;
        const { area, poli } = areaInterseccion(t.p2, u.p2);
        if (area <= AREA_MINIMA) continue;
        // Puntos de la zona común: el centro y, a medio camino, cada vértice
        const cx = poli.reduce((s2, q) => s2 + q[0], 0) / poli.length;
        const cy = poli.reduce((s2, q) => s2 + q[1], 0) / poli.length;
        const pts = [[cx, cy], ...poli.map((q) => [(q[0] + cx) / 2, (q[1] + cy) / 2])];
        const libres = pts.filter(([x, y]) => !tapado(t.e1.clone().multiplyScalar(x).addScaledVector(t.e2, y).addScaledVector(t.n, t.d), t.n)).length;
        if (!libres) continue;
        const donde = t.e1.clone().multiplyScalar(cx).addScaledVector(t.e2, cy).addScaledVector(t.n, t.d);
        halladas.push({ area: area * libres / pts.length, donde, mallas: `${t.malla} / ${u.malla}`, n: t.n, c: [t.color, u.color] });
      }
    }
  }
  // Agrupa las superpuestas cercanas (una misma pieza da varias parejas de triángulos)
  const grupos = [];
  for (const h of halladas.sort((x, y) => y.area - x.area)) {
    const g = grupos.find((x) => x.donde.distanceTo(h.donde) < 1.5);
    if (g) g.area += h.area;
    else grupos.push({ ...h });
  }
  console.log(`\n${ruta}: ${grupos.length} zonas con caras superpuestas`);
  for (const g of grupos.sort((x, y) => y.area - x.area).slice(0, 40)) {
    const hex = (c) => '#' + c.map((v) => Math.round(Math.min(1, v) * 255).toString(16).padStart(2, '0')).join('');
    console.log(`  ${g.area.toFixed(3)} m²  en (${g.donde.x.toFixed(1)}, ${g.donde.y.toFixed(1)}, ${g.donde.z.toFixed(1)})  normal (${g.n.x.toFixed(1)}, ${g.n.y.toFixed(1)}, ${g.n.z.toFixed(1)})  ${hex(g.c[0])}/${hex(g.c[1])}  ${g.mallas}`);
  }
  total += grupos.length;
}
process.exitCode = total ? 1 : 0;
