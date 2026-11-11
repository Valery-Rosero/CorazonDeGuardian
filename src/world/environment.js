// @ts-check
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { ESCENARIO, INTERIOR } from '../config/level.js';
import { PALETA } from '../config/palette.js';

/** Dirección hacia el sol (mundo de Three.js), según config/level.js. */
export function direccionSol() {
  const elevacion = THREE.MathUtils.degToRad(ESCENARIO.sol_elevacion);
  const azimut = THREE.MathUtils.degToRad(ESCENARIO.sol_azimut);
  return new THREE.Vector3().setFromSphericalCoords(1, Math.PI / 2 - elevacion, azimut);
}

/**
 * Luces puntuales del nivel (luz_*): antorchas cálidas que parpadean y la luz azul de la cueva.
 * Sin sombras (sección 4.2). Cada luz pertenece a un grupo (1 = selva, 2 = santuario): solo se
 * enciende el grupo de la zona donde está Victoria, así la Iris Xe nunca calcula todas a la vez
 * (al cambiar de grupo los shaders se recompilan una vez, durante el fundido a negro).
 * @param {THREE.Scene} escena
 * @param {{objeto: THREE.Object3D, datos: Record<string, any>}[]} luces
 */
export function crearLucesNivel(escena, luces) {
  const lista = luces.map(({ objeto, datos }) => {
    const luz = new THREE.PointLight(datos.color ?? PALETA.fuego, Number(datos.intensidad ?? 5), Number(datos.distancia ?? 10), 2);
    objeto.getWorldPosition(luz.position);
    escena.add(luz);
    const grupo = Number(datos.grupo ?? 1);
    luz.visible = grupo === 1;
    return { luz, base: luz.intensity, parpadeo: Boolean(datos.parpadeo), fase: Math.random() * 10, grupo, datos };
  });
  return {
    /** @param {number} grupo */
    encenderGrupo(grupo) {
      for (const l of lista) l.luz.visible = l.grupo === grupo;
    },
    /** La luz cuyo dato 'clave' está puesto (p. ej. la del cristal solar). @param {string} clave */
    porDato(clave) {
      return lista.find((l) => l.datos[clave]) ?? null;
    },
    /** @param {number} t */
    actualizar(t) {
      for (let i = 0; i < lista.length; i++) {
        const l = lista[i];
        if (!l.parpadeo || !l.luz.visible) continue;
        const f = Math.sin(t * 9.1 + l.fase) * 0.5 + Math.sin(t * 23.7 + l.fase * 2) * 0.3 + Math.sin(t * 4.3) * 0.2;
        l.luz.intensity = l.base * (1 + f * ESCENARIO.parpadeo_antorcha);
      }
    },
  };
}

/**
 * Luz y atmósfera de la selva (sección 4.3): sol cálido de tarde con sombras, cielo procedural
 * convertido en mapa de entorno (IBL) sin descargar HDRI, niebla verdosa.
 * @param {THREE.Scene} escena
 * @param {THREE.WebGLRenderer} renderer
 * @param {import('../config/quality.js').Calidad} calidad
 */
export function crearAmbienteSelva(escena, renderer, calidad) {
  const dirSol = direccionSol();

  const cielo = crearCielo(dirSol);
  escena.add(cielo);

  // Mapa de entorno a partir de otra instancia del cielo
  const pmrem = new THREE.PMREMGenerator(renderer);
  const escenaCielo = new THREE.Scene();
  escenaCielo.add(crearCielo(dirSol));
  escena.environment = pmrem.fromScene(escenaCielo).texture;
  pmrem.dispose();

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
    ambiente: ambiente.intensity, sol: sol.intensity, entorno: escena.environment };
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
      escena.environment = exterior.entorno;
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
      escena.environment = dentro ? null : exterior.entorno;
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
