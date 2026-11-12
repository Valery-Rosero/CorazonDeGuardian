// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRUPOS } from '../core/physics_world.js';
import { clasificarNombre, esColisionador } from './level_naming.js';
import { PALETA } from '../config/palette.js';
import { direccionSol } from './environment.js';
import { agregarBordeSol, agregarCieloSH, agregarViento, clonarMaterial, materialCascada, materialLago, materialPoza, materialRayo } from './shaders.js';

/** Brillo del borde de sol en las copas (hoja de escenarios): color y fuerza. */
const BORDE_SOL = { color: PALETA.dorado_solar, fuerza: 0.55 };

/**
 * @typedef {{pos: THREE.Vector3, rumbo: number, datos: Record<string, any>}} Spawn
 * @typedef {{malla: THREE.Object3D, cuerpo: CANNON.Body, datos: Record<string, any>, inicio: {p: THREE.Vector3, q: THREE.Quaternion}}} Dinamico
 * @typedef {{tipo: string, pos: THREE.Vector3, datos: Record<string, any>, objeto: THREE.Object3D}} Emisor
 */

/**
 * Convierte un .glb de Blender en escena + física + triggers leyendo los prefijos de los nombres (sección 4.4).
 * @param {import('three/examples/jsm/loaders/GLTFLoader.js').GLTF} gltf
 * @param {THREE.Scene} escena
 * @param {import('../core/physics_world.js').MundoFisico} fisica
 * @param {import('./triggers.js').SistemaTriggers} triggers
 * @param {{vegetacion?: number}} [opciones]
 */
export function construirNivel(gltf, escena, fisica, triggers, opciones = {}) {
  const raiz = gltf.scene;
  escena.add(raiz);
  raiz.updateMatrixWorld(true);

  const res = {
    raiz,
    /** @type {THREE.Object3D[]} */ colisionables: [],
    /** @type {Record<string, Spawn>} */ spawns: {},
    /** @type {Dinamico[]} */ dinamicos: [],
    /** @type {Emisor[]} */ emisores: [],
    /** @type {{objeto: THREE.Object3D, datos: Record<string, any>}[]} */ luces: [],
    /** @type {Record<string, THREE.Vector3>} */ hints: {},
    /** @type {THREE.Mesh[]} */ ocluibles: [],
    /** @type {Record<number, THREE.Object3D>} */ pilares: {},
    /** @type {Record<number, THREE.Object3D>} */ flores: {},
    /** @type {THREE.Object3D[]} */ giratorios: [],
    /** @type {THREE.MeshStandardMaterial[]} */ runas: [],
    /** @type {THREE.Object3D[]} */ interactuables: [],
  };

  /** @type {THREE.Object3D[]} */
  const objetos = [];
  raiz.traverse((o) => objetos.push(o));
  /** @type {THREE.Object3D[]} */
  const quitar = [];

  /**
   * Un objeto con varios materiales llega como un grupo cuyas mallas hijas heredan el nombre
   * (dyn_losa_1 → dyn_losa_1_1, dyn_losa_1_2). Las hijas forman parte del padre: no son objetos nuevos.
   * @param {THREE.Object3D} o
   */
  const esParteDeOtro = (o) => {
    for (let p = o.parent; p && p !== raiz; p = p.parent) {
      if (clasificarNombre(p.name).tipo !== 'visual') return true;
    }
    return false;
  };

  for (const o of objetos) {
    const { tipo, clave } = esParteDeOtro(o) ? { tipo: 'visual', clave: '' } : clasificarNombre(o.name);
    if (esColisionador(tipo)) {
      crearColisionador(/** @type {THREE.Mesh} */ (o), tipo, fisica);
      o.visible = false;
      res.colisionables.push(o);
    } else if (tipo === 'trg_box') {
      triggers.agregarCaja(clave, new THREE.Box3().setFromObject(o), o.userData);
      o.visible = false;
    } else if (tipo === 'trg_rad') {
      triggers.agregarRadio(clave, o.getWorldPosition(new THREE.Vector3()), Number(o.userData.radio ?? 2), o.userData);
    } else if (tipo === 'spawn') {
      res.spawns[clave] = { pos: o.getWorldPosition(new THREE.Vector3()), rumbo: rumboDe(o), datos: o.userData };
    } else if (tipo === 'hint') {
      res.hints[clave] = o.getWorldPosition(new THREE.Vector3());
    } else if (tipo === 'emit') {
      res.emisores.push({ tipo: String(o.userData.tipo ?? clave), pos: o.getWorldPosition(new THREE.Vector3()), datos: o.userData, objeto: o });
    } else if (tipo === 'luz') {
      res.luces.push({ objeto: o, datos: o.userData });
    } else if (tipo === 'dyn') {
      res.dinamicos.push(crearDinamico(o, fisica));
    } else if (tipo === 'inst') {
      const malla = /** @type {THREE.Mesh} */ (o);
      if (malla.isMesh && Array.isArray(o.userData.puntos)) {
        // 'fijo': plantas con colisionador (árboles jóvenes); la calidad baja no puede quitarlas
        const fraccion = o.userData.fijo ? 1 : (opciones.vegetacion ?? 1);
        // Dentro de la raíz de su escenario: se oculta con él (dibujo por sectores)
        raiz.add(crearInstancias(malla, o.userData.puntos, fraccion, Number(o.userData.viento ?? 1), Boolean(o.userData.borde_sol)));
        quitar.push(o);
      }
    }
    // Objetos con significado especial por nombre
    if (o.name.startsWith('pilar_checkpoint_') && o.userData.checkpoint) res.pilares[Number(o.userData.checkpoint)] = o;
    if (o.name.startsWith('flor_') && o.userData.cura) res.flores[Number(o.name.split('_')[1])] = o;
    if (o.userData.girar) res.giratorios.push(o);
    if (o.userData.interactuable && !res.interactuables.includes(o)) res.interactuables.push(o);
  }
  for (const o of quitar) o.removeFromParent();

  // Materiales: se ajustan una sola vez cada uno (GLTFLoader los comparte entre mallas)
  /** @type {Map<THREE.Material, THREE.Material>} */
  const cambios = new Map();
  raiz.traverse((o) => {
    const m = /** @type {THREE.Mesh} */ (o);
    if (!m.isMesh || !m.visible || clasificarNombre(m.name).tipo === 'trg_box') return;
    // La vegetación instanciada ya trae su material (y no proyecta sombra): no se vuelve a ajustar
    if (/** @type {THREE.InstancedMesh} */ (m).isInstancedMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    const original = /** @type {THREE.MeshStandardMaterial} */ (m.material);
    if (!cambios.has(original)) cambios.set(original, ajustarMaterial(original, res));
    m.material = cambios.get(original);
    if (/** @type {THREE.ShaderMaterial} */ (m.material).isShaderMaterial) m.castShadow = false;
  });

  // Lo que puede tapar a Victoria (árboles) lleva su propio material para aclararse por separado
  raiz.traverse((o) => {
    if (!o.userData.ocluir) return;
    o.traverse((h) => {
      const m = /** @type {THREE.Mesh} */ (h);
      if (!m.isMesh) return;
      const mat = clonarMaterial(/** @type {THREE.MeshStandardMaterial} */ (m.material));
      mat.transparent = true;
      m.material = mat;
      res.ocluibles.push(m);
    });
  });
  return res;
}

/** Hacia dónde mira un spawn: su eje -Y de Blender es +Z en Three.js. @param {THREE.Object3D} o */
function rumboDe(o) {
  const q = o.getWorldQuaternion(new THREE.Quaternion());
  const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  return Math.atan2(f.x, f.z);
}

/**
 * @param {THREE.MeshStandardMaterial} m
 * @param {{runas: THREE.MeshStandardMaterial[]}} res
 * @returns {THREE.Material}
 */
function ajustarMaterial(m, res) {
  const nombre = m.name || '';
  if (nombre === 'agua_cascada') return materialCascada();
  if (nombre === 'agua_poza') return materialPoza();
  if (nombre === 'agua_lago') return materialLago(direccionSol());
  if (nombre === 'rayo_luz') return materialRayo();
  if (!m.isMeshStandardMaterial) return m;
  m.vertexColors = true;
  m.roughness = 0.92;
  m.metalness = 0;
  m.envMapIntensity = 0.35;
  m.flatShading = true;
  if (nombre.includes('emisivo') || nombre.includes('disco')) {
    m.roughness = 0.4;
    m.envMapIntensity = 0.6;
  }
  if (nombre.includes('runa')) res.runas.push(m);
  // La cima de la pirámide guía al jugador: brilla a través de la niebla
  if (nombre.startsWith('cima_piramide')) m.fog = false;
  // Blender exporta todo como doble cara (glTF doubleSided); solo las hojas de un plano lo necesitan.
  // Dibujar las caras traseras de troncos, rocas y muros costaba ~65 % del fotograma en la selva.
  m.side = nombre.includes('doble') ? THREE.DoubleSide : THREE.FrontSide;
  // Copas de los árboles: el contorno que mira al sol se dora
  if (nombre.includes('copa')) agregarBordeSol(m, direccionSol(), BORDE_SOL.color, BORDE_SOL.fuerza);
  agregarCieloSH(m, m.envMapIntensity);
  m.needsUpdate = true;
  return m;
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _escala = new THREE.Vector3();
const _centro = new THREE.Vector3();
const _tam = new THREE.Vector3();

/** Medidas de una malla (o grupo de mallas) en el mundo: centro, tamaño y giro. @param {THREE.Object3D} o */
function medir(o) {
  const caja = new THREE.Box3();
  o.updateMatrixWorld(true);
  // Caja en el espacio local del objeto: así un objeto girado conserva su forma
  const inv = o.matrixWorld.clone().invert();
  o.traverse((h) => {
    const m = /** @type {THREE.Mesh} */ (h);
    if (!m.isMesh) return;
    m.geometry.computeBoundingBox();
    const b = m.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    caja.union(b);
  });
  o.matrixWorld.decompose(_pos, _quat, _escala);
  caja.getCenter(_centro);
  caja.getSize(_tam);
  _tam.multiply(_escala);
  _centro.multiply(_escala).applyQuaternion(_quat).add(_pos);
  return { centro: _centro.clone(), tam: _tam.clone(), quat: _quat.clone() };
}

/**
 * @param {THREE.Mesh} malla
 * @param {string} tipo
 * @param {import('../core/physics_world.js').MundoFisico} fisica
 */
function crearColisionador(malla, tipo, fisica) {
  const { centro, tam, quat } = medir(malla);
  /** @type {CANNON.Shape} */
  let forma;
  if (tipo === 'col_sph') {
    forma = new CANNON.Sphere(Math.max(tam.x, tam.y, tam.z) / 2);
  } else if (tipo === 'col_cyl') {
    const r = Math.max(tam.x, tam.z) / 2;
    forma = new CANNON.Cylinder(r, r, tam.y, 12);
  } else {
    forma = new CANNON.Box(new CANNON.Vec3(tam.x / 2, tam.y / 2, tam.z / 2));
  }
  const cuerpo = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.STATIC,
    material: fisica.materiales.mundo,
    collisionFilterGroup: GRUPOS.MUNDO,
    collisionFilterMask: -1,
  });
  cuerpo.addShape(forma);
  cuerpo.position.set(centro.x, centro.y, centro.z);
  cuerpo.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  fisica.world.addBody(cuerpo);
  return cuerpo;
}

/**
 * Objeto dinámico de cannon-es (requisito 6): esferas rituales, tablas del puente...
 * Propiedades: masa, forma ('esfera' | caja), material ('esfera' | 'tabla'), tipo ('cinematico' | dinámico).
 * @param {THREE.Object3D} o
 * @param {import('../core/physics_world.js').MundoFisico} fisica
 * @returns {Dinamico}
 */
function crearDinamico(o, fisica) {
  const d = o.userData;
  const { centro, tam, quat } = medir(o);
  const esfera = d.forma === 'esfera';
  const forma = esfera
    ? new CANNON.Sphere(Math.max(tam.x, tam.y, tam.z) / 2)
    : new CANNON.Box(new CANNON.Vec3(tam.x / 2, tam.y / 2, tam.z / 2));
  const cinematico = d.tipo === 'cinematico';
  const cuerpo = new CANNON.Body({
    mass: cinematico ? 0 : Number(d.masa ?? 5),
    type: cinematico ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC,
    material: fisica.materiales[d.material] ?? fisica.materiales.mundo,
    collisionFilterGroup: GRUPOS.DINAMICOS,
    collisionFilterMask: GRUPOS.MUNDO | GRUPOS.JUGADOR | GRUPOS.DINAMICOS | GRUPOS.PROYECTILES_JUGADOR | GRUPOS.ENEMIGOS,
    linearDamping: esfera ? 0.2 : 0.05,
    angularDamping: esfera ? 0.3 : 0.1,
    allowSleep: true,
    sleepSpeedLimit: 0.15,
    sleepTimeLimit: 1,
  });
  cuerpo.addShape(forma);
  // El origen del objeto está en su centro (Blender: origen a la geometría)
  cuerpo.position.set(centro.x, centro.y, centro.z);
  cuerpo.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  fisica.world.addBody(cuerpo);
  o.position.copy(centro);
  fisica.emparejar(o, cuerpo);
  o.traverse((h) => { h.castShadow = true; });
  return { malla: o, cuerpo, datos: d, inicio: { p: centro.clone(), q: quat.clone() } };
}

/**
 * Vegetación con InstancedMesh: una llamada de dibujo por tipo de planta.
 * 'puntos' viene de Blender: x, y, z, giro, escala por instancia (coordenadas de Blender).
 * @param {THREE.Mesh} plantilla
 * @param {number[]} puntos
 * @param {number} fraccion  densidad según la calidad
 * @param {number} viento  fuerza del viento (1 = helechos; los árboles se mecen mucho menos)
 * @param {boolean} bordeSol  dorar el contorno que mira al sol (árboles jóvenes)
 */
function crearInstancias(plantilla, puntos, fraccion, viento, bordeSol) {
  const total = Math.floor(puntos.length / 5);
  const cuantas = Math.max(1, Math.floor(total * fraccion));
  // Helechos y pasto son frondas de un plano (doble cara); los árboles jóvenes son volúmenes cerrados
  const plano = !plantilla.name.includes('arbol');
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, side: plano ? THREE.DoubleSide : THREE.FrontSide, roughness: 0.9, envMapIntensity: 0.3, flatShading: true,
  });
  agregarViento(material, viento);
  if (bordeSol) agregarBordeSol(material, direccionSol(), BORDE_SOL.color, BORDE_SOL.fuerza);
  agregarCieloSH(material, material.envMapIntensity);
  const inst = new THREE.InstancedMesh(plantilla.geometry, material, cuantas);
  inst.name = `vegetacion_${plantilla.name}`;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  // Se toma una de cada 'paso' para repartir la densidad por toda la zona
  const paso = total / cuantas;
  for (let i = 0; i < cuantas; i++) {
    const k = Math.floor(i * paso) * 5;
    p.set(puntos[k], puntos[k + 2], -puntos[k + 1]);
    e.set(0, puntos[k + 3], 0);
    q.setFromEuler(e);
    s.setScalar(puntos[k + 4]);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.receiveShadow = true;
  inst.castShadow = false;
  inst.frustumCulled = false;
  return inst;
}

/**
 * Une varios niveles cargados (la selva y el santuario) en uno solo: listas concatenadas y
 * registros fusionados. Los nombres de cada .glb son distintos, así que no se pisan.
 * @param {ReturnType<typeof construirNivel>[]} niveles
 */
export function combinarNiveles(niveles) {
  const [primero, ...resto] = niveles;
  const res = { ...primero };
  /** @type {Record<string, any>} */
  const r = res;
  for (const n of resto) {
    /** @type {Record<string, any>} */
    const o = n;
    for (const clave of ['colisionables', 'dinamicos', 'emisores', 'luces', 'ocluibles', 'giratorios', 'runas', 'interactuables']) {
      r[clave] = [...r[clave], ...o[clave]];
    }
    for (const clave of ['spawns', 'hints', 'pilares', 'flores']) {
      r[clave] = { ...r[clave], ...o[clave] };
    }
  }
  return res;
}
