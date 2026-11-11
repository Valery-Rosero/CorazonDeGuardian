// @ts-check
import * as THREE from 'three';
import { PALETA } from '../config/palette.js';
import { SistemaParticulas } from './particles.js';

const _c = new THREE.Color();
/** @param {string} hex */
const rgb = (hex) => {
  _c.set(hex);
  return [_c.r, _c.g, _c.b];
};
const AGUA = rgb(PALETA.agua_espuma);
const AGUA_AZUL = rgb(PALETA.agua);
const FUEGO = rgb(PALETA.fuego);
const ORO = rgb(PALETA.oro_brillante);
const NIEBLA = rgb(PALETA.niebla_selva);
const R = Math.random;

/**
 * Crea los sistemas de partículas a partir de los emisores emit_* del nivel.
 * La posición del emisor llega en coordenadas de Three.js; sus propiedades, en userData.
 * @param {{tipo:string, pos:THREE.Vector3, datos:Record<string, any>}} em
 * @param {THREE.Texture} tex
 * @param {number} escala  fracción de la calidad (Baja 0,6, Media 0,85, Alta 1)
 * @returns {SistemaParticulas[]}
 */
export function crearParticulasDeEmisor(em, tex, escala) {
  const p = em.pos;
  const d = em.datos;
  const cap = (/** @type {number} */ n) => Math.max(8, Math.round(n * escala));
  switch (em.tipo) {
    case 'cascada': {
      const ancho = Number(d.ancho ?? 5);
      const alto = Number(d.alto ?? 20);
      // La cortina está 1,55 m detrás del emisor (hacia el risco) y cae hacia la poza (-Z del risco al jugador)
      const gotas = new SistemaParticulas({
        capacidad: cap(520), textura: tex, gravedad: 9.8, arrastre: 0.15, perfil: 'aparecer_desvanecer',
        nacer: (s, i) => {
          const c = R() < 0.5 ? AGUA : AGUA_AZUL;
          s.colocar(i, p.x + (R() - 0.5) * ancho, alto - R() * 1.5, p.z + 1.45 - R() * 0.3,
            (R() - 0.5) * 0.3, -1.5 - R() * 2, -0.5 - R() * 0.6, 2.4, 0.35 + R() * 0.45, 0.55, c[0], c[1], c[2]);
        },
        muere: (s, i) => s.pos[i * 3 + 1] < 0.25,
      });
      const salpica = new SistemaParticulas({
        capacidad: cap(260), textura: tex, gravedad: 6, arrastre: 0.6, perfil: 'desvanecer',
        nacer: (s, i) => {
          s.colocar(i, p.x + (R() - 0.5) * ancho, 0.25, p.z + 0.4 + (R() - 0.5) * 0.8,
            (R() - 0.5) * 2.2, 2 + R() * 3, -R() * 2.6, 0.6 + R() * 0.5, 0.25 + R() * 0.35, 0.7, AGUA[0], AGUA[1], AGUA[2]);
        },
        muere: (s, i) => s.pos[i * 3 + 1] < 0.05,
      });
      return [gotas, salpica];
    }
    case 'niebla': {
      const radio = Number(d.radio ?? 6);
      return [new SistemaParticulas({
        capacidad: cap(radio > 15 ? 70 : 50), textura: tex, perfil: 'aparecer_desvanecer',
        nacer: (s, i) => {
          const a = R() * Math.PI * 2;
          const r = Math.sqrt(R()) * radio;
          s.colocar(i, p.x + Math.cos(a) * r, p.y + R() * 1.2, p.z + Math.sin(a) * r,
            (R() - 0.5) * 0.3, 0.12 + R() * 0.2, (R() - 0.5) * 0.3, 5 + R() * 4, radio > 15 ? 9 + R() * 6 : 2.8 + R() * 2.5, 0.22,
            NIEBLA[0], NIEBLA[1], NIEBLA[2]);
        },
      })];
    }
    case 'fuego':
      return [new SistemaParticulas({
        capacidad: cap(34), textura: tex, aditivo: true, gravedad: -1.2, arrastre: 1.2, perfil: 'desvanecer',
        nacer: (s, i) => {
          s.colocar(i, p.x + (R() - 0.5) * 0.18, p.y, p.z + (R() - 0.5) * 0.18,
            (R() - 0.5) * 0.3, 0.6 + R() * 0.8, (R() - 0.5) * 0.3, 0.45 + R() * 0.45, 0.35 + R() * 0.3, 0.9,
            FUEGO[0], FUEGO[1] * (0.7 + R() * 0.3), FUEGO[2]);
        },
      })];
    case 'luciernagas': {
      const radio = Number(d.radio ?? 10);
      return [new SistemaParticulas({
        capacidad: cap(60), textura: tex, aditivo: true, perfil: 'parpadeo',
        nacer: (s, i) => {
          const a = R() * Math.PI * 2;
          const r = Math.sqrt(R()) * radio;
          s.colocar(i, p.x + Math.cos(a) * r, 0.4 + R() * 2.4, p.z + Math.sin(a) * r,
            0, 0, 0, 6 + R() * 6, 0.12 + R() * 0.08, 1.0, ORO[0], ORO[1], ORO[2] * 0.6);
        },
        moverExtra: (s, i, dt, t) => {
          const k = i * 3;
          const f = s.semilla[i];
          s.vel[k] = Math.sin(t * 0.7 + f) * 0.35;
          s.vel[k + 1] = Math.sin(t * 1.1 + f * 1.7) * 0.18;
          s.vel[k + 2] = Math.cos(t * 0.6 + f * 0.6) * 0.35;
        },
      })];
    }
    case 'polen': {
      const radio = Number(d.radio ?? 12);
      return [new SistemaParticulas({
        capacidad: cap(90), textura: tex, perfil: 'aparecer_desvanecer',
        nacer: (s, i) => {
          const a = R() * Math.PI * 2;
          const r = Math.sqrt(R()) * radio;
          s.colocar(i, p.x + Math.cos(a) * r, 0.5 + R() * 4, p.z + Math.sin(a) * r,
            0.15 + R() * 0.2, (R() - 0.4) * 0.1, (R() - 0.5) * 0.2, 6 + R() * 5, 0.05 + R() * 0.05, 0.7, 1, 0.95, 0.75);
        },
      })];
    }
    default:
      return [];
  }
}

/** Estela del Pulso solar y destellos pequeños: partículas cortas, sin gravedad. */
export function crearEstela(tex) {
  return new SistemaParticulas({
    capacidad: 260, textura: tex, aditivo: true, arrastre: 3, perfil: 'desvanecer', continuo: false,
    nacer: () => {},
  });
}

/**
 * @param {SistemaParticulas} s
 * @param {THREE.Vector3} pos
 * @param {string} hex
 * @param {number} [cantidad]
 * @param {number} [vida]
 */
export function chispaEn(s, pos, hex, cantidad = 1, vida = 0.28) {
  const c = rgb(hex);
  s.rafaga(cantidad, (sis, i) => {
    sis.colocar(i, pos.x + (R() - 0.5) * 0.08, pos.y + (R() - 0.5) * 0.08, pos.z + (R() - 0.5) * 0.08,
      (R() - 0.5) * 0.6, (R() - 0.2) * 0.6, (R() - 0.5) * 0.6, vida * (0.6 + R() * 0.6), 0.14 + R() * 0.1, 0.9, c[0], c[1], c[2]);
  });
}

/** Sistema de ráfagas (checkpoint, flor, portal, chispas): no continuo, se dispara bajo demanda. */
export function crearRafagas(tex) {
  return new SistemaParticulas({
    capacidad: 220, textura: tex, aditivo: true, gravedad: 2.5, arrastre: 1.6, perfil: 'desvanecer', continuo: false,
    nacer: () => {},
  });
}

/**
 * @param {SistemaParticulas} s
 * @param {THREE.Vector3} pos
 * @param {number} cantidad
 * @param {string} hex
 * @param {number} [fuerza]
 */
export function rafagaEn(s, pos, cantidad, hex, fuerza = 4) {
  const c = rgb(hex);
  s.rafaga(cantidad, (sis, i) => {
    const a = R() * Math.PI * 2;
    const b = (R() - 0.3) * Math.PI;
    const v = fuerza * (0.4 + R() * 0.6);
    sis.colocar(i, pos.x, pos.y, pos.z, Math.cos(a) * Math.cos(b) * v, Math.sin(b) * v + 1.5, Math.sin(a) * Math.cos(b) * v,
      0.7 + R() * 0.7, 0.2 + R() * 0.25, 1, c[0], c[1], c[2]);
  });
}

/**
 * Fuente de un sistema que el juego mueve y enciende (brasas de la fase 3, polvo del derrumbe).
 * @typedef {{pos: THREE.Vector3, activo: boolean}} FuenteParticulas
 */

/** Mientras la fuente está apagada, las partículas que renacen quedan invisibles y lejos. */
function apagada(s, i) {
  s.colocar(i, 0, -1000, 0, 0, 0, 0, 0.2 + R() * 0.3, 0.01, 0, 0, 0, 0);
}

const BRASA = rgb('#FF6A2A');
const BRASA_CLARA = rgb(PALETA.oro_brillante);

/**
 * Brasas de la fase 3 (sección 7.2, «Furia»): suben del suelo de la arena girando, naranjas y rojas.
 * @param {THREE.Texture} tex @param {number} escala @param {FuenteParticulas} fuente  centro de la arena
 */
export function crearBrasas(tex, escala, fuente) {
  return new SistemaParticulas({
    capacidad: Math.round(160 * escala), textura: tex, aditivo: true, gravedad: -0.9, arrastre: 0.4, perfil: 'aparecer_desvanecer',
    nacer: (s, i) => {
      if (!fuente.activo) { apagada(s, i); return; }
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(R()) * 13;
      const c = R() < 0.3 ? BRASA_CLARA : BRASA;
      s.colocar(i, fuente.pos.x + Math.cos(a) * r, fuente.pos.y + R() * 0.4, fuente.pos.z + Math.sin(a) * r,
        0, 0.4 + R() * 0.9, 0, 2.2 + R() * 2.2, 0.2 + R() * 0.16, 1.0, c[0], c[1], c[2]);
    },
    moverExtra: (s, i, dt, t) => {
      const k = i * 3;
      const f = s.semilla[i];
      s.vel[k] += Math.sin(t * 1.7 + f) * 0.8 * dt;
      s.vel[k + 2] += Math.cos(t * 1.3 + f * 1.7) * 0.8 * dt;
    },
  });
}

const POLVO = rgb('#D8C08E');

/**
 * Polvo del derrumbe (escape): cae del techo alrededor de Victoria, con algún grano más grueso.
 * @param {THREE.Texture} tex @param {number} escala @param {FuenteParticulas} fuente  Victoria
 */
export function crearPolvoDerrumbe(tex, escala, fuente) {
  return new SistemaParticulas({
    capacidad: Math.round(220 * escala), textura: tex, gravedad: 2.6, arrastre: 1.6, perfil: 'aparecer_desvanecer',
    nacer: (s, i) => {
      if (!fuente.activo) { apagada(s, i); return; }
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(R()) * 9;
      const grueso = R() < 0.12;
      s.colocar(i, fuente.pos.x + Math.cos(a) * r, fuente.pos.y + 4 + R() * 4, fuente.pos.z + Math.sin(a) * r,
        (R() - 0.5) * 0.3, -0.5 - R(), (R() - 0.5) * 0.3, 1.6 + R() * 1.4, grueso ? 0.22 : 0.09 + R() * 0.1, grueso ? 0.9 : 0.55,
        POLVO[0] * (0.8 + R() * 0.2), POLVO[1] * (0.8 + R() * 0.2), POLVO[2] * (0.8 + R() * 0.2));
    },
  });
}
