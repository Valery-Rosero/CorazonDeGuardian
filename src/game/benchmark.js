// @ts-check
/**
 * Prueba de rendimiento (?banco). Recorre siempre los mismos lugares, gira la cámara 360° en cada uno y
 * mide los FPS promedio, el 1 % de fotogramas más lentos, el tiempo del procesador por fotograma y, si
 * la tarjeta lo permite (EXT_disjoint_timer_query_webgl2), el tiempo de la tarjeta gráfica. Con eso se
 * comprueba la meta (60 FPS, mínimo 50) en cualquier PC y se sabe quién limita: el procesador o la tarjeta.
 * La resolución dinámica se apaga durante la prueba: se mide la calidad elegida tal cual.
 */

/** Lugares del recorrido (spawns del nivel). */
export const PARADAS = Object.freeze([
  { spawn: 'jugador', nombre: 'Claro de entrada' },
  { spawn: 'debug_2', nombre: 'Cornisa y lago' },
  { spawn: 'debug_3', nombre: 'Ruinas y pórtico' },
  { spawn: 'santuario', nombre: 'Santuario' },
  { spawn: 'debug_5', nombre: 'Sala de los espejos' },
  { spawn: 'debug_6', nombre: 'Arena (combate)' },
]);

export const BANCO = Object.freeze({
  asentar: 1.5,   // s en cada lugar antes de medir (cargas, cinemática que se salta)
  medir: 8,       // s midiendo mientras la cámara da una vuelta completa
  meta: 60,
  minimo: 50,
});

/**
 * Resumen de una lista de duraciones de fotograma (ms).
 * @param {number[]} ms
 */
export function resumir(ms) {
  if (!ms.length) return { fps: 0, bajo1: 0, p99: 0 };
  const orden = [...ms].sort((a, b) => a - b);
  const media = orden.reduce((s, x) => s + x, 0) / orden.length;
  const p99 = orden[Math.min(orden.length - 1, Math.floor(orden.length * 0.99))];
  return { fps: 1000 / media, bajo1: 1000 / p99, p99 };
}

/**
 * @typedef {{nombre: string, fps: number, bajo1: number, cpu: number, gpu: number | null, llamadas: number, triangulos: number}} Resultado
 * @typedef {{
 *   renderer: import('three').WebGLRenderer,
 *   ir: (spawn: string) => void,
 *   girar: (rumbo: number) => void,
 *   saltarCine: () => void,
 *   calidad: string,
 * }} ContextoBanco
 */

export class Banco {
  /** @param {ContextoBanco} c */
  constructor(c) {
    this.c = c;
    this.parada = -1;
    this.t = 0;
    /** @type {number[]} */ this.fotogramas = [];
    /** @type {number[]} */ this.cpu = [];
    /** @type {number[]} */ this.gpu = [];
    /** @type {Resultado[]} */ this.resultados = [];
    this.terminado = false;
    this.llamadas = 0;
    this.triangulos = 0;
    const gl = c.renderer.getContext();
    this.gl = /** @type {WebGL2RenderingContext} */ (gl);
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    /** @type {WebGLQuery[]} */ this.pendientes = [];
    /** @type {WebGLQuery | null} */ this.consulta = null;
    this.rumbo = 0;
  }

  empezar() {
    this._siguiente();
  }

  _siguiente() {
    this.parada++;
    if (this.parada >= PARADAS.length) {
      this.terminado = true;
      this._mostrar();
      return;
    }
    this.t = 0;
    this.fotogramas = [];
    this.cpu = [];
    this.gpu = [];
    this.llamadas = 0;
    this.triangulos = 0;
    this.c.ir(PARADAS[this.parada].spawn);
  }

  /** Justo antes de dibujar el fotograma: empieza a cronometrar la tarjeta. */
  antes() {
    if (!this.ext || this.terminado || this.consulta) return;
    this.consulta = this.gl.createQuery();
    if (this.consulta) this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.consulta);
  }

  /** Justo después: cierra el cronómetro (el resultado llega unos fotogramas después). */
  despues() {
    if (!this.ext || !this.consulta) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pendientes.push(this.consulta);
    this.consulta = null;
  }

  _leerGpu() {
    const gl = this.gl;
    const ext = this.ext;
    if (!ext) return;
    while (this.pendientes.length) {
      const q = this.pendientes[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const valido = !gl.getParameter(ext.GPU_DISJOINT_EXT);
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
      gl.deleteQuery(q);
      this.pendientes.shift();
      if (valido && this.t > BANCO.asentar) this.gpu.push(ns / 1e6);
    }
  }

  /**
   * Al terminar cada fotograma.
   * @param {number} dtReal s desde el anterior  @param {number} msCpu  ms del procesador en este fotograma
   */
  fotograma(dtReal, msCpu) {
    if (this.terminado || this.parada < 0) return;
    this._leerGpu();
    this.c.saltarCine();
    this.t += dtReal;
    if (this.t > BANCO.asentar) {
      this.fotogramas.push(dtReal * 1000);
      this.cpu.push(msCpu);
      const info = this.c.renderer.info.render;
      this.llamadas = Math.max(this.llamadas, info.calls);
      this.triangulos = Math.max(this.triangulos, info.triangles);
      // Una vuelta completa de la cámara durante la medición
      this.c.girar(this.rumbo + (Math.PI * 2 * (this.t - BANCO.asentar)) / BANCO.medir);
    }
    if (this.t > BANCO.asentar + BANCO.medir) {
      const r = resumir(this.fotogramas);
      const media = (/** @type {number[]} */ l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);
      this.resultados.push({
        nombre: PARADAS[this.parada].nombre, fps: r.fps, bajo1: r.bajo1, cpu: media(this.cpu),
        gpu: this.gpu.length ? media(this.gpu) : null, llamadas: this.llamadas, triangulos: this.triangulos,
      });
      this._siguiente();
    }
  }

  /** Texto de los resultados (para copiar y pegar). */
  texto() {
    const c = this.c.renderer.getContext();
    const e = c.getExtension('WEBGL_debug_renderer_info');
    const tarjeta = e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'desconocida';
    const lienzo = this.c.renderer.domElement;
    const filas = this.resultados.map((r) => `${r.nombre}: ${r.fps.toFixed(0)} FPS (1 % más lento: ${r.bajo1.toFixed(0)}) · procesador ${r.cpu.toFixed(1)} ms · `
      + `tarjeta ${r.gpu === null ? 'sin medir' : `${r.gpu.toFixed(1)} ms`} · ${r.llamadas} llamadas · ${Math.round(r.triangulos / 1000)} mil triángulos`);
    return [`Tarjeta: ${tarjeta}`, `Resolución: ${lienzo.width} × ${lienzo.height} · calidad ${this.c.calidad}`, ...filas].join('\n');
  }

  _mostrar() {
    const caja = document.createElement('div');
    caja.id = 'banco-resultados';
    caja.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,16,12,0.86);z-index:10001;font-family:Georgia,serif;color:#efe7d6';
    const filas = this.resultados.map((r) => {
      const color = r.bajo1 >= BANCO.minimo && r.fps >= BANCO.meta ? '#8fd18f' : r.bajo1 >= BANCO.minimo ? '#e6c86a' : '#e88a6a';
      const limita = r.gpu === null ? '' : r.gpu > r.cpu ? 'tarjeta' : 'procesador';
      return `<tr><td>${r.nombre}</td><td style="color:${color};font-weight:700">${r.fps.toFixed(0)}</td><td style="color:${color}">${r.bajo1.toFixed(0)}</td>`
        + `<td>${r.cpu.toFixed(1)} ms</td><td>${r.gpu === null ? '—' : `${r.gpu.toFixed(1)} ms`}</td><td>${limita}</td><td>${r.llamadas}</td></tr>`;
    }).join('');
    caja.innerHTML = `<div style="background:#13211b;border:1px solid #d6a03a;border-radius:14px;padding:28px 36px;max-width:960px">
      <h2 style="margin:0 0 6px;color:#d6a03a;font-weight:600">Prueba de rendimiento</h2>
      <p style="margin:0 0 16px;color:#b9b29f">Meta: ${BANCO.meta} FPS; nunca menos de ${BANCO.minimo} en el 1 % más lento.</p>
      <table style="border-collapse:collapse;font-size:17px;line-height:1.8">
        <tr style="color:#d6a03a;text-align:left"><th style="padding-right:22px">Lugar</th><th style="padding-right:18px">FPS</th><th style="padding-right:18px">1 % lento</th>
        <th style="padding-right:18px">Procesador</th><th style="padding-right:18px">Tarjeta</th><th style="padding-right:18px">Limita</th><th>Llamadas</th></tr>${filas}</table>
      <pre id="banco-texto" style="white-space:pre-wrap;font-size:13px;color:#b9b29f;margin:16px 0 0">${this.texto()}</pre>
      <button id="banco-copiar" style="margin-top:14px;padding:8px 18px;font:inherit;background:#d6a03a;color:#13211b;border:0;border-radius:8px;cursor:pointer">Copiar resultados</button>
    </div>`;
    document.body.appendChild(caja);
    const boton = /** @type {HTMLButtonElement} */ (document.getElementById('banco-copiar'));
    boton.addEventListener('click', () => {
      navigator.clipboard?.writeText(this.texto()).then(() => { boton.textContent = 'Copiado'; }, () => {});
    });
    console.log(this.texto());
  }
}
