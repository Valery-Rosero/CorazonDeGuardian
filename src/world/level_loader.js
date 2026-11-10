// @ts-check
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRUPOS } from '../core/physics_world.js';
import { clasificarNombre, esColisionador } from './level_naming.js';

/**
 * Convierte un .glb de Blender en escena + física + triggers leyendo los prefijos de los nombres.
 * @param {import('three/examples/jsm/loaders/GLTFLoader.js').GLTF} gltf
 * @param {THREE.Scene} escena
 * @param {import('../core/physics_world.js').MundoFisico} fisica
 * @param {import('./triggers.js').SistemaTriggers} triggers
 */
export function construirNivel(gltf, escena, fisica, triggers) {
  const raiz = gltf.scene;
  escena.add(raiz);
  raiz.updateMatrixWorld(true);

  /** @type {THREE.Object3D[]} */
  const colisionables = [];
  /** @type {Record<string, THREE.Vector3>} */
  const spawns = {};
  /** @type {THREE.Object3D[]} */
  const objetos = [];
  raiz.traverse((o) => objetos.push(o));

  for (const o of objetos) {
    const { tipo, clave } = clasificarNombre(o.name);
    if (esColisionador(tipo)) {
      crearColisionador(/** @type {THREE.Mesh} */ (o), tipo, fisica);
      o.visible = false;
      colisionables.push(o);
    } else if (tipo === 'trg_box') {
      triggers.agregarCaja(clave, new THREE.Box3().setFromObject(o), o.userData);
      o.visible = false;
    } else if (tipo === 'trg_rad') {
      triggers.agregarRadio(clave, o.getWorldPosition(new THREE.Vector3()), Number(o.userData.radio ?? 2), o.userData);
    } else if (tipo === 'spawn') {
      spawns[clave] = o.getWorldPosition(new THREE.Vector3());
    } else if (/** @type {THREE.Mesh} */ (o).isMesh) {
      const malla = /** @type {THREE.Mesh} */ (o);
      malla.castShadow = true;
      malla.receiveShadow = true;
      ajustarMaterialEscenario(/** @type {THREE.MeshStandardMaterial} */ (malla.material));
    }
  }
  return { raiz, colisionables, spawns };
}

/**
 * Piedra y vegetación: colores por vértice, rugosidad alta y reflejo del cielo moderado
 * (si no, la piedra se ve blanca bajo el sol de la tarde).
 * @param {THREE.MeshStandardMaterial} m
 */
function ajustarMaterialEscenario(m) {
  if (!m || !m.isMeshStandardMaterial) return;
  m.vertexColors = true;
  m.roughness = 0.92;
  m.metalness = 0;
  m.envMapIntensity = 0.35;
  m.needsUpdate = true;
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _escala = new THREE.Vector3();
const _centro = new THREE.Vector3();
const _tam = new THREE.Vector3();

/**
 * @param {THREE.Mesh} malla
 * @param {string} tipo
 * @param {import('../core/physics_world.js').MundoFisico} fisica
 */
function crearColisionador(malla, tipo, fisica) {
  const geo = malla.geometry;
  geo.computeBoundingBox();
  malla.matrixWorld.decompose(_pos, _quat, _escala);
  geo.boundingBox.getCenter(_centro);
  geo.boundingBox.getSize(_tam);
  _tam.multiply(_escala);
  _centro.multiply(_escala).applyQuaternion(_quat).add(_pos);

  /** @type {CANNON.Shape} */
  let forma;
  if (tipo === 'col_sph') {
    forma = new CANNON.Sphere(Math.max(_tam.x, _tam.y, _tam.z) / 2);
  } else if (tipo === 'col_cyl') {
    const r = Math.max(_tam.x, _tam.z) / 2;
    forma = new CANNON.Cylinder(r, r, _tam.y, 12);
  } else {
    forma = new CANNON.Box(new CANNON.Vec3(_tam.x / 2, _tam.y / 2, _tam.z / 2));
  }
  const cuerpo = new CANNON.Body({
    mass: 0,
    type: CANNON.Body.STATIC,
    material: fisica.materiales.mundo,
    collisionFilterGroup: GRUPOS.MUNDO,
    collisionFilterMask: -1,
  });
  cuerpo.addShape(forma);
  cuerpo.position.set(_centro.x, _centro.y, _centro.z);
  cuerpo.quaternion.set(_quat.x, _quat.y, _quat.z, _quat.w);
  fisica.world.addBody(cuerpo);
  return cuerpo;
}
