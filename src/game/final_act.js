// @ts-check
import * as THREE from 'three';
import { ESCAPE, ROCAS } from '../config/boss.js';
import { PALETA } from '../config/palette.js';
import { derrota, despertar, fase2, fase3, final } from '../cinematics/guardian_cines.js';
import { PoolRocas } from '../enemies/boss_attacks.js';
import { CombateGuardian } from '../enemies/boss_fight.js';
import { PoolPiezas } from '../enemies/fragments.js';
import { Escape } from '../world/escape.js';

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

/**
 * Acto 3 y desenlace (secciones 3.2, 7, 8.3 y 9.4): el despertar del Guardián, el combate con sus
 * tres fases, la derrota y Mateo liberado, el escape de 75 s y el final al amanecer.
 * Recibe del juego lo que necesita (jugador, cámara, audio, interfaz…) y avisa al terminar.
 */
export class ActoFinal {
  /**
   * @param {any} c  contexto del juego (ver main.js): escena, fisica, nivel, modelos, jugador, animador,
   *   rig, audio, hud, ui, dialogos, cine, puente, enemigos, ambiente, toon, rafaga, chispa, destello,
   *   recibirDano, teletransportar, transicion, mateo, estadisticas, alVictoria
   */
  constructor(c) {
    this.c = c;
    const nivel = c.nivel;
    const centroObj = nivel.raizCamara.getObjectByName('centro_arena');
    this.centro = centroObj ? centroObj.getWorldPosition(new THREE.Vector3()) : nivel.spawns.guardian.pos.clone();
    this.rocas = new PoolRocas(c.escena, c.fisica, ROCAS);
    const frags = [];
    c.modelos.guardian.scene.traverse((o) => {
      if (o.name.startsWith('guardian_frag_') && !o.parent?.name.startsWith('guardian_frag_')) frags.push(o);
    });
    for (const f of frags) f.traverse((h) => { if (/** @type {THREE.Mesh} */ (h).isMesh) /** @type {THREE.Mesh} */ (h).material = c.toon; });
    this.reposoFrags = frags.map((f) => ({ nombre: f.name, p: f.position.clone() }));
    this.caparazon = new PoolPiezas(c.escena, c.fisica, frags.map((f) => { const k = f.clone(); k.position.set(0, 0, 0); k.name = f.name; return k; }), 1);
    this.caparazon.vida = 12;
    this.combate = new CombateGuardian({
      escena: c.escena, fisica: c.fisica, glb: c.modelos.guardian.scene, toon: c.toon, spawn: nivel.spawns.guardian,
      centro: this.centro, interactuables: c.interactuables, rocas: this.rocas, latido: null,
      avisos: {
        danar: (n) => c.recibirDano(n),
        sonido: (n, p, v) => (p ? c.audio.efectoEn(n, p, v ?? 1) : c.audio.efecto(n, v ?? 1)),
        sacudida: (f) => c.rig.sacudida.agregar(f),
        rafaga: (p, n, col, f) => c.rafaga(p, n, col, f),
        fase: (fase) => this._fase(fase),
        invocar: () => {
          const n = c.enemigos.aparecer('invocacion');
          if (n) c.hud.nota('El Guardián llama a los espectros', 2.5);
        },
        derrota: () => this._derrota(),
        barra: (vis, f) => c.ui.barraJefe(vis, f),
        nota: (t, s) => c.hud.nota(t, s),
      },
    });
    this.latido = c.audio.buclePosicional('nucleo_latido', this.combate.actor.nucleo, { referencia: 3, maximo: 30, volumen: 0.9 });
    this.combate.d.latido = this.latido;
    this.escape = new Escape(this.rocas, {
      reloj: (vis, t, u) => c.ui.reloj(vis, t, u),
      rafaga: (p, n, col, f) => c.rafaga(p, n, col, f),
      sacudida: (f) => c.rig.sacudida.agregar(f),
      sonido: (n, p, v) => c.audio.efectoEn(n, p, v ?? 1),
      rumor: (v) => c.audio.volumenBucle(c.rumorDerrumbe, v),
    });
    /** 'antes', 'despertar', 'combate', 'derrota', 'escape', 'final', 'fin' */
    this.etapa = 'antes';
    this.levantando = -1;
    this.gema = -1;
    this.velocidad = new THREE.Vector3();
    this._previa = new THREE.Vector3();
  }

  get enEscape() {
    return this.etapa === 'escape';
  }

  /** Objetos de interacción del acto (pilares). @param {any} o */
  usar(o) {
    return this.combate.usar(o);
  }

  /** @param {import('cannon-es').Body | null} cuerpo @param {number} dano @param {THREE.Vector3} punto */
  golpear(cuerpo, dano, punto) {
    return this.combate.golpear(cuerpo, dano, punto);
  }

  /** @param {THREE.Vector3} origen @param {THREE.Vector3} dir */
  asistencia(origen, dir) {
    return this.combate.activo ? this.combate.asistencia(origen, dir) : null;
  }

  /**
   * Sucesos de los triggers del nivel que son de este acto. Devuelve true si lo manejó.
   * @param {string} evento
   */
  trigger(evento) {
    const c = this.c;
    if (evento === 'despertar' && this.etapa === 'antes') {
      this.etapa = 'despertar';
      c.jugador.bloqueado = true;
      const s = c.nivel.spawns.arena;
      c.jugador.colocar(s.pos, s.rumbo);
      c.cine.reproducir(despertar(s.pos, c.nivel.spawns.guardian.pos), {
        alSuceso: (/** @type {any} */ e) => {
          if (e.accion === 'runas') this.combate.actor.ponerFase(1);
          if (e.accion === 'levantarse') this.levantando = 0;
          if (e.accion === 'rugido') { c.audio.efecto('guardian_rugido'); c.rig.sacudida.agregar(0.4); }
          if (e.accion === 'decir') c.dialogos.decir(...e.datos);
          if (e.accion === 'rotulo') c.ui.rotulo(e.datos);
        },
        alTerminar: () => {
          this.levantando = -1;
          this.combate.levantar(1);
          this.combate.empezarCombate();
          this.etapa = 'combate';
          c.jugador.bloqueado = false;
          c.rig.reorientar(s.rumbo);
        },
      });
      return true;
    }
    if (evento === 'salida' && this.etapa === 'escape') {
      // Del vestíbulo al pasadizo del pórtico, con fundido (Mateo detrás)
      c.transicion.iniciar(() => c.teletransportar('salida_santuario'));
      return true;
    }
    if (evento === 'final' && this.etapa === 'escape') {
      this._final();
      return true;
    }
    return evento === 'despertar' || evento === 'salida' || evento === 'final';
  }

  /**
   * Depuración (tecla 8, sección 19): lleva a la arena y deja al Guardián en la fase 3 (furia),
   * para mostrarla en la sustentación sin jugar el combate entero.
   */
  saltarAFase3() {
    const c = this.c;
    if (this.etapa === 'antes') {
      c.teletransportar('debug_6');
      this.trigger('despertar');
      c.cine.saltar();
      c.dialogos.callar();
    }
    if (this.etapa !== 'combate') return false;
    const l = this.combate.logica;
    if (l.fase >= 3) return false;
    l.fase = 3;
    l.vida = Math.floor(l.cfg.vida * l.cfg.umbral_fase3) - 1;
    l.sucesos.push({ tipo: 'fase', fase: 3 });
    return true;
  }

  /** @param {number} f */
  _fase(f) {
    const c = this.c;
    const pecho = this.combate.actor.pecho(new THREE.Vector3());
    if (f === 2) {
      // Victoria mira al Guardián: su respuesta va en cuadro, de frente
      const v = c.jugador.posicion;
      c.jugador.mirarHacia(Math.atan2(pecho.x - v.x, pecho.z - v.z), 5.4);
      c.cine.reproducir(fase2(pecho, this.combate.actor.rumbo, v.clone()), { alSuceso: (/** @type {any} */ e) => e.accion === 'decir' && c.dialogos.decir(...e.datos) });
    }
    if (f === 3) {
      c.cine.reproducir(fase3(pecho, this.combate.actor.rumbo), {
        alSuceso: (/** @type {any} */ e) => {
          if (e.accion === 'rugido') { c.audio.efecto('guardian_rugido'); c.rig.sacudida.agregar(0.5); }
          if (e.accion === 'decir') c.dialogos.decir(...e.datos);
        },
      });
    }
  }

  _derrota() {
    const c = this.c;
    this.etapa = 'derrota';
    c.jugador.bloqueado = true;
    c.enemigos.reiniciarInvocados?.();
    const actor = this.combate.actor;
    const pie = actor.raiz.position.clone();
    let rumbo = actor.rumbo;
    // Si cae sin haber bajado del trono, Mateo quedaría sobre el asiento, tapado por él:
    // el Guardián cae en el suelo delante del trono (se mueve allí bajo el destello blanco).
    const trono = c.nivel.spawns.guardian.pos;
    const bajar = Math.hypot(pie.x - trono.x, pie.z - trono.z) < 2.5;
    if (bajar) {
      const haciaCentro = new THREE.Vector3(this.centro.x - trono.x, 0, this.centro.z - trono.z).normalize();
      pie.set(trono.x, trono.y, trono.z).addScaledVector(haciaCentro, 2.6);
      rumbo = Math.atan2(haciaCentro.x, haciaCentro.z);
    }
    const f = new THREE.Vector3(Math.sin(rumbo), 0, Math.cos(rumbo));
    const posVictoria = pie.clone().addScaledVector(f, 3.4);
    // Para el diálogo se acerca (el corte al plano por encima del hombro oculta el paso)
    const cerca = pie.clone().addScaledVector(f, 1.5);
    c.jugador.colocar(posVictoria, rumbo + Math.PI);
    c.cine.reproducir(derrota(pie, rumbo, posVictoria, cerca), {
      alSuceso: (/** @type {any} */ e) => {
        if (e.accion === 'destello') {
          c.destello();
          if (bajar) {
            actor.cuerpo.position.set(pie.x, pie.y, pie.z);
            actor.rumbo = rumbo;
            actor.raiz.position.copy(pie);
            actor.raiz.rotation.y = rumbo;
          }
          c.audio.efecto('acertijo_resuelto', 0.8);
          c.rafaga(actor.pecho(_v), 60, '#FFFFFF', 6);
        }
        if (e.accion === 'caparazon') {
          // Las piezas del caparazón caen con física y dejan a Mateo de rodillas
          actor.raiz.updateMatrixWorld(true);
          for (const r of this.reposoFrags) {
            _v.copy(r.p).applyMatrix4(actor.raiz.matrixWorld);
            _w.subVectors(_v, pie).setY(0).normalize().multiplyScalar(2 + Math.random() * 2);
            _w.y = 1 + Math.random() * 2;
            this.caparazon.soltar(r.nombre, _v, actor.raiz.quaternion, _w);
          }
          actor.retirar();
          c.audio.efectoEn('centinela_rompe', pie, 1);
          c.rig.sacudida.agregar(0.6);
        }
        if (e.accion === 'mateo') {
          // Ningún trozo del caparazón donde va la cámara del primer plano de Mateo
          this.caparazon.despejar(_v.copy(pie).addScaledVector(f, 3.15).add(_w.set(f.z, 0, -f.x).multiplyScalar(1.25)), 1.4);
          c.mateo.raiz.visible = true;
          c.mateo.colocar(pie, rumbo);
          c.mateo.arrodillar();
          c.dialogos.ponerCaraMateo(c.mateo.cara);
          c.rafaga(_v.copy(pie).setY(pie.y + 1), 40, PALETA.oro_brillante, 3);
        }
        if (e.accion === 'acercarse') {
          c.jugador.colocar(cerca, rumbo + Math.PI);
          this.caparazon.despejar(pie, 2.6);
          // Él levanta la cara hacia ella
          c.mateo.animador.gesto('arrodillado_mira');
        }
        if (e.accion === 'decir') c.dialogos.decir(...e.datos);
        if (e.accion === 'gema') {
          // La gema vuela al brazalete y queda sellada (destello azul y dorado)
          this.gema = 0;
          c.animador.gesto('mirar_brazalete', 2.6);
          c.audio.efecto('brazalete');
        }
        if (e.accion === 'temblor') {
          c.audio.efecto('guardian_sismico');
          c.rig.sacudida.agregar(0.8);
        }
      },
      alTerminar: () => this._empezarEscape(),
    });
  }

  _empezarEscape() {
    const c = this.c;
    this.etapa = 'escape';
    this.gema = -1;
    c.jugador.bloqueado = false;
    c.mateo.seguir();
    c.dialogos.decir('mat_escape_01');
    c.puente.reiniciar();
    c.puente.romper(ESCAPE.tablas_rotas);
    c.rig.zona('persecucion', true);
    this.escape.iniciar();
  }

  /** El tiempo se acabó, o Victoria cayó en el escape: se reintenta desde el inicio del escape. */
  reintentarEscape() {
    const c = this.c;
    c.teletransportar('escape');
    c.mateo.colocar(c.nivel.spawns.escape.pos.clone().add(new THREE.Vector3(0, 0, -1.5)), c.nivel.spawns.escape.rumbo);
    c.mateo.seguir();
    c.puente.reiniciar();
    c.puente.romper(ESCAPE.tablas_rotas);
    this.rocas.limpiar();
    this.escape.iniciar();
  }

  _final() {
    const c = this.c;
    this.etapa = 'final';
    this.escape.detener();
    c.rig.zona('persecucion', false);
    c.jugador.bloqueado = true;
    const s = c.nivel.spawns.final;
    const m = c.nivel.spawns.mateo_final;
    c.jugador.colocar(s.pos, s.rumbo);
    const haciaSol = new THREE.Vector3(Math.sin(s.rumbo), 0, Math.cos(s.rumbo));
    c.ambiente.ponerAmanecer(haciaSol);
    c.mateo.raiz.visible = false;
    c.mateo.siguiendo = false;
    c.cine.reproducir(final(s.pos, s.rumbo, m.pos), {
      alSuceso: (/** @type {any} */ e) => {
        if (e.accion === 'girar') c.jugador.mirarHacia(s.rumbo + Math.PI, 2.5);
        if (e.accion === 'mateo') {
          // Sale del portal de runas y camina hasta el lado de Victoria
          c.mateo.colocar(m.pos, m.rumbo + Math.PI);
          c.mateo.raiz.visible = true;
          c.rafaga(_v.copy(m.pos).setY(m.pos.y + 1.2), 50, PALETA.cristal_runa, 4);
          c.audio.efecto('portal', 0.7);
          // Da un par de pasos fuera del portal, hacia ella, y se detiene
          _w.subVectors(s.pos, m.pos).setY(0).normalize();
          c.mateo.caminarHasta(_v.copy(m.pos).addScaledVector(_w, 0.5), 0.8);
        }
        // El gesto de siempre: vuelve a ser él
        if (e.accion === 'gafas') c.mateo.animador.gesto('ajustar_gafas');
        if (e.accion === 'acercarse') {
          // A su lado, a la derecha de Victoria (los dos frente al sol)
          const f = new THREE.Vector3(Math.sin(s.rumbo), 0, Math.cos(s.rumbo));
          _w.set(-f.z, 0, f.x);
          c.mateo.caminarHasta(_v.copy(s.pos).addScaledVector(_w, 1.15).addScaledVector(f, -0.1), 1.6);
        }
        if (e.accion === 'mirar_sol') {
          c.jugador.mirarHacia(s.rumbo, 3);
          c.mateo.mirar(s.rumbo);
        }
        if (e.accion === 'victoria') this._victoria();
      },
      alTerminar: () => { if (this.etapa !== 'fin') this._victoria(); },
    });
  }

  _victoria() {
    if (this.etapa === 'fin') return;
    this.etapa = 'fin';
    this.c.audio.efecto('victoria');
    this.c.alVictoria();
  }

  /** Victoria cayó: si fue en el combate, el Guardián vuelve al trono; en el escape se reintenta allí. */
  alReaparecer() {
    if (this.etapa === 'combate' || this.etapa === 'despertar') {
      this.combate.reiniciar();
      this.etapa = 'antes';
      this.c.dialogos.callar();
      return false;
    }
    if (this.etapa === 'escape') {
      this.reintentarEscape();
      return true;
    }
    return false;
  }

  /**
   * @param {number} dt @param {number} t
   * @param {boolean} enCine
   * @returns {'agotado' | null}
   */
  actualizar(dt, t, enCine) {
    const c = this.c;
    const pies = c.jugador.posicion;
    const voz = this.combate.actor.voz;
    voz.mateo = c.dialogos.voz.mateo;
    voz.gema = c.dialogos.voz.gema;
    if (this.levantando >= 0) {
      this.levantando += dt;
      this.combate.levantar(Math.min(1, this.levantando / 2.4));
    }
    if (!enCine || this.etapa === 'despertar' || this.etapa === 'derrota') {
      if (!enCine) this.combate.actualizar(dt, t, pies, c.jugador.enSuelo);
      else this.combate.actor.actualizar(dt, pies, { mover: false, nucleoAbierto: false, rapidez: 1 }, this.centro);
    }
    this.rocas.actualizar(dt, pies, (n) => c.recibirDano(n));
    this.caparazon.actualizar(dt);
    // En la derrota ningún trozo del caparazón se queda entre la cámara y la cara de Mateo
    if (this.etapa === 'derrota' && enCine && c.mateo.raiz.visible) {
      this.caparazon.despejarLinea(c.cine.camara.position, _v.copy(c.mateo.raiz.position).setY(c.mateo.raiz.position.y + 0.95), 0.8);
    }
    // La gema vuela del pecho al brazalete
    if (this.gema >= 0) {
      this.gema += dt;
      c.manoDer.getWorldPosition(_w);
      _v.copy(this.combate.actor.raiz.position).setY(this.combate.actor.raiz.position.y + 1).lerp(_w, Math.min(1, this.gema / 1.4));
      c.chispa(_v, PALETA.gema_pulso, 3);
      c.chispa(_v, PALETA.gema_escudo, 2);
      if (this.gema > 1.4) {
        c.rafaga(_w, 60, PALETA.gema_escudo, 4);
        c.rafaga(_w, 60, PALETA.oro_brillante, 4);
        c.destello();
        this.gema = -1;
      }
    }
    c.mateo.actualizar(dt, t, this.enEscape ? pies : null, c.reloj());
    this.velocidad.subVectors(pies, this._previa).divideScalar(Math.max(dt, 1e-3));
    this._previa.copy(pies);
    if (this.enEscape && !enCine) return this.escape.actualizar(dt, pies, this.velocidad) ? 'agotado' : null;
    return null;
  }
}
