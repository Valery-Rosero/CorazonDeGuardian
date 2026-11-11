// @ts-check
import * as THREE from 'three';
import { ESPEJOS } from '../config/enemies.js';
import { PALETA } from '../config/palette.js';
import { AcertijoSantuario } from '../interaction/mirror_puzzle.js';

/**
 * Sucesos de la zona 2 (sección 8.2 y tablero «Santuario»): el altar del escudo despierta a los
 * centinelas, al entrar a la sala de los espejos aparecen dos espectros, el acertijo abre la puerta
 * (polvo, temblor, sonido y un tercer espectro) y la puerta de la arena espera al día 5.
 */
export class Santuario {
  /**
   * @param {{
   *   raiz: THREE.Object3D, escena: THREE.Scene,
   *   interactuables: import('../interaction/interactables.js').Interactuables,
   *   enemigos: import('../enemies/enemy_manager.js').GestorEnemigos,
   *   losas: import('../interaction/slabs.js').Losas,
   *   dinamicos: import('./level_loader.js').Dinamico[],
   *   luzCristal: {luz: THREE.PointLight} | null,
   *   cinematica?: (puerta: THREE.Vector3, cristal: THREE.Vector3,
   *     acciones: {runas: () => void, abrir: () => void, alTerminar: () => void}) => void,
   *   avisos: {
   *     nota: (texto: string, segundos?: number) => void,
   *     tutorial: (texto: string, segundos?: number) => void,
   *     sonido: (nombre: string, pos?: THREE.Vector3, volumen?: number) => void,
   *     sacudida: (fuerza: number) => void,
   *     rafaga: (pos: THREE.Vector3, cantidad: number, color: string, fuerza?: number) => void,
   *     chispa: (pos: THREE.Vector3, color: string) => void,
   *     desbloquearEscudo: () => void,
   *   },
   * }} d
   */
  constructor(d) {
    this.d = d;
    this.acertijo = new AcertijoSantuario(d.raiz, d.escena, d.interactuables.lista, ESPEJOS);
    this.puerta = d.dinamicos.find((x) => x.malla.name === 'dyn_puerta_espejos') ?? null;
    this.enSalaEspejos = false;
    this.espejosVisitados = false;
    this.avisoArena = 0;
    this.acertijo.alResolver = () => this._resuelto();
    this.acertijo.alPedirAyuda = () => d.avisos.tutorial(ESPEJOS.ayuda, 9);
    this._p = new THREE.Vector3();
  }

  /**
   * ¿Este interactuable es del santuario? Si lo es, lo maneja y devuelve true.
   * @param {import('../interaction/interactables.js').Interactuable} o
   */
  usar(o) {
    if (o.tipo === 'altar_escudo') {
      this.d.interactuables.desactivar(o);
      o.objeto.visible = false;
      this.d.avisos.desbloquearEscudo();
      this.d.avisos.rafaga(o.pos, 80, PALETA.gema_escudo, 5);
      // Los dos centinelas del fondo de la sala despiertan: el primer combate enseña el escudo
      if (this.d.enemigos.despertar('escudo') > 0) {
        setTimeout(() => {
          this.d.avisos.sonido('centinela_despierta');
          this.d.avisos.sacudida(0.35);
          this.d.avisos.nota('Las estatuas del fondo abren el ojo…', 3);
        }, 1600);
      }
      return true;
    }
    if (this.acertijo.esEspejo(o)) {
      if (this.acertijo.girar(o)) this.d.avisos.sonido('espejo_girar', o.pos, 0.9);
      return true;
    }
    return false;
  }

  /** Victoria entra (o sale) de la sala de los espejos. @param {boolean} dentro */
  salaEspejos(dentro) {
    this.enSalaEspejos = dentro;
    if (dentro && !this.espejosVisitados) {
      this.espejosVisitados = true;
      this.d.enemigos.aparecer('sala_espejos');
      this.d.avisos.nota('Algo se mueve entre los espejos', 3);
    }
  }

  /** Victoria llega a la puerta de la arena. */
  puertaArena() {
    if (this.avisoArena > 0) return;
    this.avisoArena = 6;
    this.d.avisos.nota('La puerta de la arena late como un corazón. Todavía no se abre.', 4);
  }

  _resuelto() {
    const c = this.acertijo.cristal;
    const cristal = c ? c.getWorldPosition(new THREE.Vector3()) : null;
    // Con cinemática (guion gráfico): ella decide cuándo se encienden las runas, cuándo se abre la puerta
    // y, al terminar, aparecen los espectros. Sin ella (pruebas), el orden de siempre.
    if (this.d.cinematica && this.puerta && cristal) {
      const pie = this.puerta.malla.getWorldPosition(new THREE.Vector3());
      pie.y = cristal.y - 3;
      this.d.cinematica(pie, cristal, {
        runas: () => this._encenderCristal(),
        abrir: () => this._abrirPuerta(),
        alTerminar: () => this.d.enemigos.aparecer('espejos_resueltos'),
      });
      return;
    }
    this._encenderCristal();
    setTimeout(() => {
      this._abrirPuerta();
      this.d.enemigos.aparecer('espejos_resueltos');
    }, 900);
  }

  _encenderCristal() {
    const a = this.d.avisos;
    a.sonido('acertijo_resuelto');
    a.sacudida(0.45);
    const c = this.acertijo.cristal;
    if (c) a.rafaga(c.getWorldPosition(this._p), 70, PALETA.oro_brillante, 5);
    if (this.d.luzCristal) this.d.luzCristal.luz.intensity = 6;
  }

  _abrirPuerta() {
    const a = this.d.avisos;
    if (this.puerta && this.d.losas.activar(this.puerta.malla)) {
      a.sonido('losa_mover', this.puerta.malla.position, 1);
      a.sacudida(0.5);
      for (let i = 0; i < 4; i++) {
        this._p.copy(this.puerta.malla.position).add(new THREE.Vector3((i - 1.5) * 0.9, -1, 0.6));
        a.rafaga(this._p, 18, PALETA.piedra_luz, 2.2);
      }
    }
  }

  /** @param {number} dt @param {number} t */
  actualizar(dt, t) {
    this.acertijo.actualizar(dt, t, this.enSalaEspejos);
    this.avisoArena = Math.max(0, this.avisoArena - dt);
    // Chispas donde el rayo toca algo
    if (Math.random() < dt * 20) {
      const f = this.acertijo.final;
      if (f) this.d.avisos.chispa(f, PALETA.oro_brillante);
    }
  }
}
