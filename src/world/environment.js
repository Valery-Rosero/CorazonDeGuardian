// @ts-check
import * as THREE from 'three';
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { ESCENARIO, INTERIOR } from '../config/level.js';
import { PALETA } from '../config/palette.js';
import { CIELO_SH } from './shaders.js';

/** Dirección hacia el sol (mundo de Three.js), según config/level.js. */
export function direccionSol() {
  const elevacion = THREE.MathUtils.degToRad(ESCENARIO.sol_elevacion);
  const azimut = THREE.MathUtils.degToRad(ESCENARIO.sol_azimut);
  return new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - elevacion, azimut);
}

/**
 * @typedef {{luz: THREE.PointLight, parpadeo: boolean, fase: number, grupo: number, datos: Record<string, any>}} FuenteLuz
 *   `luz` no se dibuja: guarda posición, color, intensidad y alcance (el juego puede cambiarlos).
 */

/**
 * Luces puntuales del nivel (luz_*): antorchas cálidas que parpadean, la luz azul de la cueva, la del
 * cristal solar y la del núcleo del Guardián. Sin sombras (sección 4.2).
 *
 * Cada píxel paga todas las luces puntuales de la escena, estén cerca o no (medido: dentro del santuario
 * eran el 60 % del fotograma). Por eso solo hay `huecos` luces reales, siempre encendidas (el número
 * nunca cambia: los shaders no se recompilan), que toman la posición y el color de las fuentes del
 * grupo de la zona más cercanas a la cámara. Al cambiar de fuente, el hueco se apaga y se vuelve a
 * encender con un fundido corto, sin saltos.
 * @param {THREE.Scene} escena
 * @param {{objeto: THREE.Object3D, datos: Record<string, any>}[]} luces
 * @param {number} huecos
 */
export function crearLucesNivel(escena, luces, huecos) {
  /** @type {FuenteLuz[]} */
  const fuentes = luces.map(({ objeto, datos }) => {
    const luz = new THREE.PointLight(datos.color ?? PALETA.fuego, Number(datos.intensidad ?? 5), Number(datos.distancia ?? 10), 2);
    objeto.getWorldPosition(luz.position);
    luz.updateMatrixWorld();
    return { luz, parpadeo: Boolean(datos.parpadeo), fase: Math.random() * 10, grupo: Number(datos.grupo ?? 1), datos };
  });
  const reales = Array.from({ length: huecos }, () => {
    const luz = new THREE.PointLight('#FFFFFF', 0, 10, 2);
    escena.add(luz);
    return { luz, /** @type {FuenteLuz | null} */ fuente: null, peso: 0 };
  });
  let grupoActivo = 1;
  const _p = new THREE.Vector3();
  /** @type {FuenteLuz[]} */
  const elegidas = [];
  return {
    /** @param {number} grupo */
    encenderGrupo(grupo) {
      grupoActivo = grupo;
    },
    /** La fuente cuyo dato 'clave' está puesto (p. ej. la del cristal solar). @param {string} clave */
    porDato(clave) {
      return fuentes.find((l) => l.datos[clave]) ?? null;
    },
    /**
     * Una luz que se mueve con un objeto (el núcleo del Guardián): se mantiene invisible y el grupo
     * copia su posición, color e intensidad.
     * @param {THREE.PointLight} luz @param {number} grupo
     * @param {THREE.Object3D} [dueno]  si se oculta (el Guardián derrotado), la luz no cuenta
     */
    registrar(luz, grupo, dueno) {
      luz.visible = false;
      fuentes.push({ luz, parpadeo: false, fase: 0, grupo, datos: { dueno } });
    },
    /** @param {number} t @param {number} dt @param {THREE.Vector3} ref  la cámara */
    actualizar(t, dt, ref) {
      // Las fuentes del grupo más cercanas (por el borde de su alcance)
      elegidas.length = 0;
      for (let i = 0; i < fuentes.length; i++) {
        const f = fuentes[i];
        if (f.grupo !== grupoActivo || f.luz.intensity <= 0 || (f.datos.dueno && !f.datos.dueno.visible)) continue;
        f.luz.getWorldPosition(_p);
        /** @type {any} */ (f).d = Math.max(0, _p.distanceTo(ref) - f.luz.distance);
        elegidas.push(f);
      }
      elegidas.sort((a, b) => /** @type {any} */ (a).d - /** @type {any} */ (b).d);
      if (elegidas.length > huecos) elegidas.length = huecos;
      // Los huecos cuya fuente ya no está entre las elegidas se apagan; los libres toman las nuevas
      for (const r of reales) {
        const sigue = r.fuente !== null && elegidas.includes(r.fuente);
        r.peso = Math.max(0, Math.min(1, r.peso + (sigue ? 1 : -1) * dt * 4));
        if (!sigue && r.peso === 0) r.fuente = null;
      }
      for (const f of elegidas) {
        if (reales.some((r) => r.fuente === f)) continue;
        const libre = reales.find((r) => r.fuente === null);
        if (libre) { libre.fuente = f; libre.peso = 0; }
      }
      for (const r of reales) {
        const f = r.fuente;
        if (!f) { r.luz.intensity = 0; continue; }
        f.luz.getWorldPosition(r.luz.position);
        r.luz.color.copy(f.luz.color);
        r.luz.distance = f.luz.distance;
        let k = 1;
        if (f.parpadeo) k += (Math.sin(t * 9.1 + f.fase) * 0.5 + Math.sin(t * 23.7 + f.fase * 2) * 0.3 + Math.sin(t * 4.3) * 0.2) * ESCENARIO.parpadeo_antorcha;
        r.luz.intensity = f.luz.intensity * k * r.peso;
      }
    },
  };
}

/**
 * Luz y atmósfera de la selva (sección 4.3): sol cálido de tarde con sombras, cielo procedural
 * convertido en luz difusa (armónicos esféricos, ver CIELO_SH) sin descargar HDRI, niebla verdosa.
 * @param {THREE.Scene} escena
 * @param {THREE.WebGLRenderer} renderer
 * @param {import('../config/quality.js').Calidad} calidad
 */
export function crearAmbienteSelva(escena, renderer, calidad) {
  const dirSol = direccionSol();

  const cielo = crearCielo(dirSol);
  escena.add(cielo);

  // Luz difusa del cielo a partir de otra instancia del cielo: un cubo de 32 px proyectado en
  // armónicos esféricos (antes era un mapa de entorno PMREM, mucho más caro por píxel)
  const escenaCielo = new THREE.Scene();
  const cieloLuz = crearCielo(dirSol);
  escenaCielo.add(cieloLuz);
  const cubo = new THREE.WebGLCubeRenderTarget(32, { type: THREE.HalfFloatType });
  const camaraCubo = new THREE.CubeCamera(1, 1000, cubo);
  const medirCielo = () => {
    camaraCubo.update(renderer, escenaCielo);
    const sonda = LightProbeGenerator.fromCubeRenderTarget(renderer, cubo);
    sonda.sh.coefficients.forEach((c, i) => CIELO_SH.coef.value[i].copy(c));
  };
  medirCielo();
  // Calidad media y alta: además, el mapa de entorno (IBL, semana 7 del curso) generado del mismo cielo
  // con PMREMGenerator. Da también los reflejos del cielo; entonces la luz difusa la pone él y los
  // armónicos se apagan (la cantidad de luz es la misma). En baja solo hay armónicos: es mucho más barato.
  const ibl = calidad.bloom;
  const pmrem = ibl ? new THREE.PMREMGenerator(renderer) : null;
  /** @type {THREE.Texture | null} */
  let entorno = null;
  const generarEntorno = () => {
    if (!pmrem) return;
    entorno?.dispose();
    entorno = pmrem.fromScene(escenaCielo).texture;
    escena.environment = entorno;
  };
  generarEntorno();
  CIELO_SH.fuerza.value = ibl ? 0 : 1;

  escena.fog = new THREE.FogExp2(PALETA.niebla_selva, ESCENARIO.niebla_selva);

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4632, 0.55);
  escena.add(hemi);
  const ambiente = new THREE.AmbientLight(0xfff0dc, 0.22);
  escena.add(ambiente);

  const sol = new THREE.DirectionalLight(0xffe0b0, 2.3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(calidad.sombras, calidad.sombras);
  const c = sol.shadow.camera;
  c.left = -14; c.right = 14; c.top = 14; c.bottom = -14; c.near = 1; c.far = 80;
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  escena.add(sol);
  escena.add(sol.target);

  const desplazamiento = dirSol.clone().multiplyScalar(35);
  const exterior = { niebla: escena.fog.color.clone(), densidad: /** @type {THREE.FogExp2} */ (escena.fog).density, hemi: hemi.intensity,
    cielo: hemi.color.clone(), suelo: hemi.groundColor.clone(),
    ambiente: ambiente.intensity, sol: sol.intensity };
  return {
    sol,
    /**
     * Final (tablero «Cámara del sol», «Final al amanecer»): sol bajo y rosado delante de la cornisa,
     * cielo de amanecer y niebla clara (el mar de nubes).
     * @param {THREE.Vector3} haciaSol  dirección horizontal hacia donde sale el sol
     */
    ponerAmanecer(haciaSol) {
      const d = new THREE.Vector3(haciaSol.x, 0, haciaSol.z).normalize();
      const dir = new THREE.Vector3(d.x * Math.cos(0.07), Math.sin(0.07), d.z * Math.cos(0.07));
      const u = cielo.material.uniforms;
      u.sunPosition.value.copy(dir);
      u.rayleigh.value = 2.6;
      u.turbidity.value = 3.5;
      u.mieCoefficient.value = 0.004;
      u.mieDirectionalG.value = 0.92;
      // La luz del cielo también es la del amanecer
      const ul = cieloLuz.material.uniforms;
      for (const k of ['sunPosition', 'rayleigh', 'turbidity', 'mieCoefficient', 'mieDirectionalG']) {
        if (k === 'sunPosition') ul[k].value.copy(u[k].value);
        else ul[k].value = u[k].value;
      }
      medirCielo();
      generarEntorno();
      CIELO_SH.fuerza.value = ibl ? 0 : 1;
      const niebla = /** @type {THREE.FogExp2} */ (escena.fog);
      niebla.color.set('#F0BFB4');
      niebla.density = exterior.densidad * 0.8;
      sol.color.set('#FFB38A');
      sol.intensity = 1.8;
      hemi.color.set('#FFD8C8');
      hemi.groundColor.set('#6A4E58');
      hemi.intensity = 0.7;
      ambiente.intensity = 0.3;
      desplazamiento.copy(dir).multiplyScalar(35);
      escena.background = null;
      sol.castShadow = true;
    },
    /**
     * Cambia la atmósfera entre la selva y el interior del santuario (de golpe: se llama durante
     * el fundido a negro de la transición).
     * @param {boolean} dentro
     */
    ponerInterior(dentro) {
      const niebla = /** @type {THREE.FogExp2} */ (escena.fog);
      niebla.color.set(dentro ? INTERIOR.niebla : exterior.niebla);
      niebla.density = dentro ? INTERIOR.densidad : exterior.densidad;
      hemi.intensity = dentro ? INTERIOR.hemisferio : exterior.hemi;
      hemi.color.set(dentro ? INTERIOR.cielo : exterior.cielo);
      hemi.groundColor.set(dentro ? INTERIOR.suelo : exterior.suelo);
      ambiente.intensity = dentro ? INTERIOR.ambiente : exterior.ambiente;
      sol.intensity = dentro ? INTERIOR.sol : exterior.sol;
      sol.castShadow = !dentro;
      CIELO_SH.fuerza.value = dentro || ibl ? 0 : 1;
      escena.environment = dentro ? null : entorno;
      escena.background = dentro ? new THREE.Color(INTERIOR.niebla) : null;
    },
    /** La cámara de sombras sigue a Victoria para mantener sombras nítidas. @param {THREE.Vector3} pos */
    seguir(pos) {
      sol.position.copy(pos).add(desplazamiento);
      sol.target.position.copy(pos);
    },
  };
}

/** @param {THREE.Vector3} dirSol */
function crearCielo(dirSol) {
  const cielo = new Sky();
  cielo.scale.setScalar(400);
  const u = cielo.material.uniforms;
  u.turbidity.value = 6;
  u.rayleigh.value = 1.8;
  u.mieCoefficient.value = 0.006;
  u.mieDirectionalG.value = 0.86;
  u.sunPosition.value.copy(dirSol);
  return cielo;
}
