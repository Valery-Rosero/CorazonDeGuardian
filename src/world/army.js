// @ts-check
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EJERCITO } from '../config/epilogue.js';
import { PALETA } from '../config/palette.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _esc = new THREE.Vector3();
const _c = new THREE.Color();

/**
 * El ejército del epílogo: cientos de centinelas y espectros que marchan, con InstancedMesh (una llamada
 * de dibujo por material, no una por criatura). Las plantillas son las mismas del .glb de los enemigos,
 * horneadas en su pose de reposo; la marcha (balanceo, rebote y avance) se calcula aquí cada fotograma.
 * Los ojos se encienden poco a poco y brillan a través de la niebla. Todo se crea al cargar.
 */
export class Ejercito {
  /**
   * @param {THREE.Object3D} modelos  escena de enemigos.glb (con las armaduras 'centinela' y 'espectro')
   * @param {THREE.Material} toon  el material toon de los enemigos
   */
  constructor(modelos, toon) {
    const cfg = EJERCITO;
    this.grupo = new THREE.Group();
    this.grupo.name = 'ejercito_epilogo';
    this.grupo.visible = false;
    this.reloj = 0;
    this.tOjos = -1;

    const centinela = modelos.getObjectByName('centinela');
    const espectro = modelos.getObjectByName('espectro');
    if (!centinela || !espectro) throw new Error('enemigos.glb no tiene las armaduras centinela y espectro');

    // ---- Centinelas: cuerpo de piedra (toon) y ojo
    const c = hornear(centinela, (n) => (n.includes('ojo') ? 'ojo' : 'cuerpo'));
    this.cuerpos = new THREE.InstancedMesh(c.get('cuerpo') ?? vacia(), toon, cfg.centinelas);
    this.cuerpos.castShadow = true;
    this.cuerpos.receiveShadow = true;
    const ojoGeo = c.get('ojo') ?? vacia();
    ojoGeo.computeBoundingBox();
    /** Dónde está el ojo respecto a los pies (para el brillo). */
    this.alturaOjo = /** @type {THREE.Box3} */ (ojoGeo.boundingBox).getCenter(new THREE.Vector3());
    this.ojos = new THREE.InstancedMesh(ojoGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), cfg.centinelas);

    // ---- Espectros: velo translúcido, máscara y runas
    const e = hornear(espectro, (n) => (n.includes('fantasma') ? 'velo' : n.includes('runa') ? 'runa' : 'mascara'));
    const velo = new THREE.MeshBasicMaterial({ color: PALETA.espectro_ojo, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
    const runa = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETA.espectro_runa).multiplyScalar(2.2), toneMapped: false });
    this.velos = new THREE.InstancedMesh(e.get('velo') ?? vacia(), velo, cfg.espectros);
    this.mascaras = new THREE.InstancedMesh(e.get('mascara') ?? vacia(), toon, cfg.espectros);
    this.runas = new THREE.InstancedMesh(e.get('runa') ?? vacia(), runa, cfg.espectros);

    // ---- Brillo de cada ojo: un punto aditivo que no se apaga con la niebla
    const nBrillos = cfg.centinelas + cfg.espectros;
    const geo = new THREE.BufferGeometry();
    this.posBrillo = new Float32Array(nBrillos * 3);
    this.colBrillo = new Float32Array(nBrillos * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posBrillo, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colBrillo, 3).setUsage(THREE.DynamicDrawUsage));
    this.brillos = new THREE.Points(geo, new THREE.PointsMaterial({
      size: cfg.brillo_ojo, map: texturaBrillo(), vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
    }));
    this.brillos.frustumCulled = false;

    for (const m of [this.cuerpos, this.ojos, this.velos, this.mascaras, this.runas]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.grupo.add(m);
    }
    this.grupo.add(this.brillos);
    this.ojos.setColorAt(0, _c.setRGB(0, 0, 0));

    /** Lugar en la formación, fase de la marcha, tamaño y momento en que se encienden los ojos. */
    this.tropa = Array.from({ length: cfg.centinelas }, () => ({ base: new THREE.Vector3(), fase: 0, escala: 1, ojo: 0 }));
    this.vuelo = Array.from({ length: cfg.espectros }, () => ({ base: new THREE.Vector3(), fase: 0, alto: 0, ojo: 0 }));
    this.dir = new THREE.Vector3(0, 0, 1);
    this.giro = 0;
    this.suelo = 0;
    /** Cumbre por donde aparece el ejército (la mide main al cargar). */
    this.cresta = new THREE.Vector3();
    /** Altura del terreno en (x, z); NaN donde no hay suelo (esa criatura no se dibuja). */
    this.altura = (/** @type {number} */ _x, /** @type {number} */ _z) => this.suelo;
  }

  /**
   * Forma el ejército: la primera fila en `frente`, las demás detrás, marchando en `dir`.
   * @param {THREE.Vector3} frente @param {THREE.Vector3} dir  horizontal y unitario
   */
  formar(frente, dir) {
    const cfg = EJERCITO;
    this.dir.copy(dir).setY(0).normalize();
    this.giro = Math.atan2(this.dir.x, this.dir.z);
    this.suelo = frente.y;
    const derecha = _p.set(this.dir.z, 0, -this.dir.x);
    const azar = aleatorio(1971);
    const filas = Math.ceil(cfg.centinelas / cfg.columnas);
    this.tropa.forEach((t, i) => {
      const fila = Math.floor(i / cfg.columnas);
      const col = (i % cfg.columnas) - (cfg.columnas - 1) / 2 + (fila % 2) * 0.5;
      t.base.copy(frente)
        .addScaledVector(derecha, col * cfg.separacion + (azar() - 0.5) * cfg.desorden)
        .addScaledVector(this.dir, -fila * cfg.separacion + (azar() - 0.5) * cfg.desorden);
      t.fase = azar() * Math.PI * 2;
      t.escala = cfg.escala[0] + azar() * (cfg.escala[1] - cfg.escala[0]);
      // Del fondo hacia delante: primero se encienden los de atrás, como una ola que se acerca
      t.ojo = (1 - fila / filas) * 0.75 + azar() * 0.25;
    });
    const largo = filas * cfg.separacion;
    this.vuelo.forEach((v, i) => {
      v.base.copy(frente)
        .addScaledVector(derecha, (azar() - 0.5) * cfg.columnas * cfg.separacion * 1.3)
        .addScaledVector(this.dir, -azar() * largo);
      v.fase = azar() * Math.PI * 2;
      v.alto = cfg.altura_espectros[0] + azar() * (cfg.altura_espectros[1] - cfg.altura_espectros[0]);
      v.ojo = azar();
    });
    this.reloj = 0;
    this.tOjos = -1;
    this._colocar();
  }

  /** Aparece (los ojos, apagados). */
  mostrar() {
    this.grupo.visible = true;
    this.reloj = 0;
  }

  ocultar() {
    this.grupo.visible = false;
  }

  /** Los ojos empiezan a encenderse. */
  encenderOjos() {
    this.tOjos = 0;
  }

  /** @param {number} dt */
  actualizar(dt) {
    if (!this.grupo.visible) return;
    this.reloj += dt;
    if (this.tOjos >= 0) this.tOjos += dt;
    this._colocar();
  }

  _colocar() {
    const cfg = EJERCITO;
    const avance = this.reloj * cfg.velocidad;
    const azul = _s.set(0x31 / 255, 0x98 / 255, 0xdb / 255);
    let k = 0;
    for (let i = 0; i < this.tropa.length; i++) {
      const t = this.tropa[i];
      const paso = this.reloj * cfg.cadencia * Math.PI + t.fase;
      // Rebote de cada pisada y balanceo de un pie al otro
      _p.copy(t.base).addScaledVector(this.dir, avance);
      const suelo = this.altura(_p.x, _p.z);
      const hay = Number.isFinite(suelo);
      _p.y = (hay ? suelo : this.suelo) + Math.abs(Math.sin(paso)) * 0.09 * t.escala;
      _e.set(0, this.giro + Math.sin(paso * 0.5) * 0.03, Math.sin(paso) * 0.06, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p, _q, _esc.setScalar(hay ? t.escala : 0));
      this.cuerpos.setMatrixAt(i, _m);
      this.ojos.setMatrixAt(i, _m);
      const luz = hay ? this._luz(t.ojo) : 0;
      this.ojos.setColorAt(i, _c.setRGB(azul.x * 3 * luz, azul.y * 3 * luz, azul.z * 3 * luz));
      // El brillo, delante del ojo
      _p.set(this.alturaOjo.x, this.alturaOjo.y, this.alturaOjo.z).multiplyScalar(t.escala).applyQuaternion(_q);
      this.posBrillo[k * 3] = _m.elements[12] + _p.x;
      this.posBrillo[k * 3 + 1] = _m.elements[13] + _p.y;
      this.posBrillo[k * 3 + 2] = _m.elements[14] + _p.z;
      this.colBrillo[k * 3] = azul.x * luz;
      this.colBrillo[k * 3 + 1] = azul.y * luz;
      this.colBrillo[k * 3 + 2] = azul.z * luz;
      k++;
    }
    const runa = _c.set(PALETA.espectro_runa);
    for (let i = 0; i < this.vuelo.length; i++) {
      const v = this.vuelo[i];
      _p.copy(v.base).addScaledVector(this.dir, avance * 1.1);
      const suelo = this.altura(_p.x, _p.z);
      _p.y = (Number.isFinite(suelo) ? Math.max(suelo, this.suelo - 8) : this.suelo) + v.alto + Math.sin(this.reloj * 1.3 + v.fase) * 0.4;
      _e.set(0.12, this.giro + Math.sin(this.reloj * 0.7 + v.fase) * 0.15, 0, 'YXZ');
      _q.setFromEuler(_e);
      _m.compose(_p, _q, _esc.setScalar(1));
      this.velos.setMatrixAt(i, _m);
      this.mascaras.setMatrixAt(i, _m);
      this.runas.setMatrixAt(i, _m);
      const luz = this._luz(v.ojo);
      this.posBrillo[k * 3] = _p.x;
      this.posBrillo[k * 3 + 1] = _p.y + 1.1;
      this.posBrillo[k * 3 + 2] = _p.z;
      this.colBrillo[k * 3] = runa.r * luz;
      this.colBrillo[k * 3 + 1] = runa.g * luz;
      this.colBrillo[k * 3 + 2] = runa.b * luz;
      k++;
    }
    for (const m of [this.cuerpos, this.ojos, this.velos, this.mascaras, this.runas]) m.instanceMatrix.needsUpdate = true;
    if (this.ojos.instanceColor) this.ojos.instanceColor.needsUpdate = true;
    const g = this.brillos.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
  }

  /** Cuánto brilla un ojo (0 a 1) según su turno de encendido. @param {number} turno 0..1 */
  _luz(turno) {
    if (this.tOjos < 0) return 0;
    const u = (this.tOjos - turno * EJERCITO.encendido) / 0.35;
    return Math.max(0, Math.min(1, u));
  }
}

/**
 * Hornea una armadura en su pose de reposo: une las mallas de cada papel ('cuerpo', 'ojo'…) en una
 * geometría, relativa a los pies de la plantilla (sin su posición ni su giro en el .glb).
 * @param {THREE.Object3D} plantilla @param {(nombreMaterial: string) => string} papel
 * @returns {Map<string, THREE.BufferGeometry>}
 */
function hornear(plantilla, papel) {
  plantilla.updateMatrixWorld(true);
  const origen = new THREE.Matrix4().compose(
    plantilla.getWorldPosition(new THREE.Vector3()), plantilla.getWorldQuaternion(new THREE.Quaternion()), new THREE.Vector3(1, 1, 1),
  ).invert();
  /** @type {Map<string, THREE.BufferGeometry[]>} */
  const partes = new Map();
  plantilla.traverse((o) => {
    const malla = /** @type {THREE.Mesh} */ (o);
    if (!malla.isMesh) return;
    const nombre = /** @type {THREE.Material} */ (malla.material).name || '';
    let g = malla.geometry.index ? malla.geometry.toNonIndexed() : malla.geometry.clone();
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal' && a !== 'color') g.deleteAttribute(a);
    // Color de vértice como RGB en coma flotante (las piezas lo traen en formatos distintos)
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3).fill(1);
    const orig = g.attributes.color;
    if (orig) for (let i = 0; i < n; i++) { col[i * 3] = orig.getX(i); col[i * 3 + 1] = orig.getY(i); col[i * 3 + 2] = orig.getZ(i); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(origen, malla.matrixWorld));
    const p = papel(nombre);
    if (!partes.has(p)) partes.set(p, []);
    /** @type {THREE.BufferGeometry[]} */ (partes.get(p)).push(g);
  });
  /** @type {Map<string, THREE.BufferGeometry>} */
  const unidas = new Map();
  for (const [p, lista] of partes) {
    const g = mergeGeometries(lista, false);
    if (g) unidas.set(p, g);
  }
  return unidas;
}

/**
 * Mapa de alturas del terreno por donde marcha el ejército (se mide una vez, al cargar): rayos hacia
 * abajo cada `paso` metros contra las mallas que caen en la zona. Devuelve la altura en (x, z) con
 * interpolación bilineal, o NaN fuera del terreno (el vacío del abismo).
 * @param {THREE.Object3D} raiz @param {{x0: number, z0: number, x1: number, z1: number}} zona @param {number} paso
 * @returns {(x: number, z: number) => number}
 */
export function crearMapaAlturas(raiz, zona, paso) {
  const caja = new THREE.Box3(new THREE.Vector3(zona.x0, -100, zona.z0), new THREE.Vector3(zona.x1, 300, zona.z1));
  /** @type {THREE.Object3D[]} */
  const mallas = [];
  const b = new THREE.Box3();
  raiz.updateMatrixWorld(true);
  raiz.traverse((o) => {
    const m = /** @type {THREE.Mesh} */ (o);
    if (!m.isMesh || /^(col_|trg_)/.test(m.name) || /** @type {any} */ (m).isInstancedMesh) return;
    // El lago no es suelo: la tropa que baja más allá de la orilla se oculta (sin suelo bajo el agua)
    if (/^agua_/.test(m.name) || /^agua_/.test(/** @type {any} */ (m.material).name ?? '')) return;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    b.copy(/** @type {THREE.Box3} */ (m.geometry.boundingBox)).applyMatrix4(m.matrixWorld);
    if (b.intersectsBox(caja)) mallas.push(m);
  });
  const nx = Math.ceil((zona.x1 - zona.x0) / paso) + 1;
  const nz = Math.ceil((zona.z1 - zona.z0) / paso) + 1;
  const alto = new Float32Array(nx * nz).fill(NaN);
  const rayo = new THREE.Raycaster();
  const abajo = new THREE.Vector3(0, -1, 0);
  const origen = new THREE.Vector3();
  /** @type {THREE.Intersection[]} */
  const golpes = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      rayo.set(origen.set(zona.x0 + i * paso, 300, zona.z0 + j * paso), abajo);
      golpes.length = 0;
      rayo.intersectObjects(mallas, false, golpes);
      if (golpes.length) alto[j * nx + i] = golpes[0].point.y;
    }
  }
  return (x, z) => {
    const u = (x - zona.x0) / paso;
    const v = (z - zona.z0) / paso;
    if (u < 0 || v < 0 || u > nx - 1 || v > nz - 1) return NaN;
    const i = Math.min(nx - 2, Math.floor(u));
    const j = Math.min(nz - 2, Math.floor(v));
    const fu = u - i;
    const fv = v - j;
    const a = alto[j * nx + i];
    const b2 = alto[j * nx + i + 1];
    const c = alto[(j + 1) * nx + i];
    const d = alto[(j + 1) * nx + i + 1];
    return (a * (1 - fu) + b2 * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
  };
}

/** Geometría vacía (si a una plantilla le falta un papel). */
const vacia = () => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));

/** Mancha de luz radial para el brillo de los ojos. */
function texturaBrillo() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Azar repetible (mismo ejército en cada partida). @param {number} semilla */
function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
