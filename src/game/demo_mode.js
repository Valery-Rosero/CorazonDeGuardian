// @ts-check
import * as THREE from 'three';

/**
 * Los 8 requisitos del curso (sección 1.1) con el lugar donde mejor se ven.
 * `ir`: un spawn del nivel o una posición de Three.js con el rumbo en grados.
 * Cada punto explica primero, en palabras sencillas, qué hace el juego; después nombra la herramienta
 * (`metodo`) con una frase sobre lo que hace por dentro (`que`).
 * @typedef {{texto: string, metodo: string, que: string}} Punto
 * @type {{titulo: string, ir: {spawn?: string, pos?: [number, number, number], rumbo?: number}, idea: string, puntos: Punto[], mira: string, ayudas?: boolean, hud?: boolean}[]}
 */
export const REQUISITOS = [
  {
    titulo: 'Escenario 3D desde Blender', ir: { spawn: 'debug_3' },
    idea: 'Nadie modeló a mano: cada árbol, roca, muro y personaje sale de instrucciones escritas en Python.',
    puntos: [
      { texto: 'Un programa arma cada pieza con cajas y prismas, la pinta (cada esquina lleva su color) y guarda la zona entera en un archivo.',
        metodo: 'Script de Python en Blender (bpy)', que: 'controla Blender por código: crea las formas, las colorea y exporta el archivo .glb.' },
      { texto: 'El juego abre esos archivos y los convierte en objetos que se pueden dibujar.',
        metodo: 'GLTFLoader', que: 'lee el .glb (geometría, colores, esqueletos y formas de la cara) y lo vuelve objetos de la escena.' },
      { texto: 'El sol ilumina todo desde una misma dirección y proyecta sombras.',
        metodo: 'DirectionalLight + castShadow', que: 'luz de rayos paralelos; para la sombra dibuja la escena vista desde el sol y guarda qué queda tapado.' },
      { texto: 'El borde de las sombras es suave, no en escalera.',
        metodo: 'PCFSoftShadowMap', que: 'promedia varios puntos del mapa de sombras alrededor de cada píxel.' },
      { texto: 'Las partes sin sol no quedan negras: el cielo da una luz azulada arriba y el suelo una cálida abajo.',
        metodo: 'HemisphereLight y AmbientLight', que: 'luz pareja que llega de todos lados; la de hemisferio mezcla un color de cielo y otro de suelo según hacia dónde mire cada cara.' },
      { texto: 'Las antorchas alumbran alrededor y en el santuario un foco cae sobre el altar.',
        metodo: 'PointLight y SpotLight', que: 'luz que sale de un punto hacia todos lados y se apaga con la distancia; el foco hace lo mismo pero en forma de cono, como una linterna.' },
    ],
    mira: 'Las sombras de Victoria, los árboles y las columnas de las ruinas.',
  },
  {
    titulo: 'Navegación', ir: { spawn: 'debug_2' },
    idea: 'La cámara sigue a Victoria por detrás, se mueve con el ratón y nunca atraviesa una pared.',
    puntos: [
      { texto: 'Al hacer clic, el puntero desaparece y mover el ratón gira la vista, sin tener que arrastrar.',
        metodo: 'PointerLockControls', que: 'captura el ratón y entrega cuánto se movió en cada fotograma, aunque llegue al borde de la pantalla.' },
      { texto: 'Si una pared o una columna queda entre Victoria y la cámara, la cámara se acerca a ella.',
        metodo: 'Raycaster', que: 'lanza líneas invisibles desde Victoria hacia la cámara y dice con qué chocan primero y a qué distancia.' },
      { texto: 'En el modo foto y en la cámara libre de esta demostración, la vista gira alrededor de un punto arrastrando el ratón y la rueda acerca.',
        metodo: 'OrbitControls', que: 'mueve la cámara sobre una esfera imaginaria centrada en el punto que se mira.' },
    ],
    mira: 'Mueve el ratón con la vista capturada; activa «Cámara libre» abajo.',
  },
  {
    titulo: 'Audio 3D', ir: { pos: [0, 0, 60], rumbo: 0 },
    idea: 'Hay sonidos que viven en un lugar del mundo y otros que se oyen siempre igual.',
    puntos: [
      { texto: 'Los oídos del jugador van pegados a la cámara.',
        metodo: 'AudioListener', que: 'es el «micrófono» de la escena: todo sonido se calcula respecto a su posición y orientación.' },
      { texto: 'La cascada, las antorchas, el núcleo del Guardián y el mural suenan más fuerte al acercarse y del lado donde están.',
        metodo: 'PositionalAudio', que: 'sonido colocado en un punto; baja el volumen con la distancia y lo reparte entre el oído izquierdo y el derecho.' },
      { texto: 'La música y los avisos se oyen igual en cualquier lugar.',
        metodo: 'Audio', que: 'sonido sin posición, el mismo en los dos oídos.' },
      { texto: 'Ningún sonido es descargado: todos se fabrican con código, sumando ondas y ruido.',
        metodo: 'numpy (Python)', que: 'calcula muestra por muestra la forma de la onda y la guarda como archivo de sonido.' },
    ],
    mira: 'Acércate y aléjate de la cascada: el volumen cambia. Cruza el portal: el sonido es global.',
  },
  {
    titulo: 'Triggers', ir: { pos: [0, 0, 79], rumbo: 0 }, ayudas: true,
    idea: 'Zonas invisibles que hacen que algo pase cuando Victoria entra en ellas.',
    puntos: [
      { texto: 'Los pilares solares, las páginas, las flores y los enemigos que te descubren miran qué tan cerca está Victoria.',
        metodo: 'Vector3.distanceTo', que: 'mide la distancia en línea recta entre dos puntos; si es menor que el radio, el trigger se activa.' },
      { texto: 'El portal, los cambios de zona, las zonas de cámara y el inicio del escape son cajas.',
        metodo: 'Box3.containsPoint', que: 'dice si un punto está dentro de una caja comparando sus coordenadas con la esquina mínima y la máxima.' },
      { texto: 'Cada trigger avisa solo al entrar y al salir, no en cada fotograma. El portal espera 3 s antes de volver a funcionar.',
        metodo: 'Estado dentro / fuera', que: 'guarda si Victoria estaba dentro en el fotograma anterior y solo actúa cuando eso cambia.' },
      { texto: 'Las cajas y los anillos de colores que ves ahora son esos triggers.',
        metodo: 'Box3Helper', que: 'dibuja las aristas de una caja para poder verla.' },
    ],
    mira: 'Las cajas y anillos de colores son los triggers. Entra en la cueva: el portal te lleva a la cornisa y espera 3 s antes de volver a funcionar.',
  },
  {
    titulo: 'Partículas', ir: { pos: [2.5, 0, 63], rumbo: -10 },
    idea: 'Miles de puntos de luz que nacen, caen, se frenan y se reciclan.',
    puntos: [
      { texto: 'La cascada, el fuego, el polen, las luciérnagas, las chispas y el polvo son puntos sueltos dibujados todos de una vez.',
        metodo: 'Points', que: 'dibuja un cuadradito mirando a la cámara por cada punto, todos en una sola orden a la tarjeta gráfica.' },
      { texto: 'La posición, el color y el tamaño de todas las partículas viven en listas de números que se cambian en su lugar.',
        metodo: 'BufferGeometry + Float32Array', que: 'arreglos de números que la tarjeta gráfica lee directo; no se crean objetos nuevos en cada fotograma.' },
      { texto: 'Cada partícula tiene velocidad, gravedad, frenado por el aire y vida. Cuando muere, renace en otro lugar.',
        metodo: 'Pool de partículas', que: 'un número fijo de partículas creadas al cargar que se reutilizan para siempre.' },
      { texto: 'Donde se juntan muchas partículas, brillan más, como el fuego de verdad.',
        metodo: 'AdditiveBlending (sin escribir profundidad)', que: 'suma el color de cada partícula al que ya había detrás, y ninguna tapa a otra.' },
    ],
    mira: 'La cascada y su espuma; las antorchas del altar.',
  },
  {
    titulo: 'Físicas (cannon-es)', ir: { pos: [1.5, 0, 0.5], rumbo: 90 },
    idea: 'Un segundo mundo, invisible, calcula pesos, choques y rebotes; el que ves lo copia.',
    puntos: [
      { texto: 'La física avanza siempre de 1/60 en 1/60 de segundo, aunque la pantalla vaya más rápido o más lento.',
        metodo: 'world.step(1/60, dt, 3)', que: 'calcula los pasos fijos que caben en el tiempo transcurrido (como mucho 3 por fotograma) para que todo se mueva igual en cualquier computadora.' },
      { texto: 'El suelo y los muros no se mueven; las esferas, las tablas y los fragmentos caen y chocan; el Guardián empuja a los demás sin que lo empujen.',
        metodo: 'Cuerpos estáticos, dinámicos y cinemáticos', que: 'masa 0 = fijo; con masa = lo mueve la gravedad y los choques; cinemático = lo mueve el código.' },
      { texto: 'Cada pareja de materiales tiene su fricción y su rebote: Victoria resbala sin trabarse en las tablas del puente.',
        metodo: 'ContactMaterial', que: 'define cuánto se agarran y cuánto rebotan dos materiales al tocarse.' },
      { texto: 'Solo se comparan los objetos que están cerca entre sí.',
        metodo: 'SAPBroadphase', que: 'ordena los cuerpos por su posición en un eje y descarta de entrada los que no pueden tocarse.' },
      { texto: 'Después de cada paso, cada objeto que se ve toma la posición y el giro de su cuerpo físico. Al chocar, el golpe suena según su fuerza.',
        metodo: 'Sincronización y evento collide', que: 'copia posición y rotación a la malla; el evento collide mide la velocidad del impacto para elegir el volumen.' },
    ],
    mira: 'Dispara el Pulso solar (clic) a las esferas de piedra: ruedan y rebotan.',
  },
  {
    titulo: 'Interfaz (HUD)', ir: { spawn: 'debug_1' }, hud: true,
    idea: 'El «Cuaderno de la cartógrafa»: Victoria anota dónde está, como en su oficio.',
    puntos: [
      { texto: 'Un panel de papel encima del juego muestra la zona, las coordenadas X, Y y Z que cambian al caminar y una brújula que gira con la cámara.',
        metodo: 'HTML y CSS sobre el lienzo', que: 'elementos de la página puestos encima del dibujo 3D; el texto solo se reescribe cuando el número cambia.' },
      { texto: 'Abajo: la vida y los tres poderes, con su recarga dibujada como un reloj.',
        metodo: 'Variables CSS', que: 'el código cambia un número (por ejemplo, el porcentaje de recarga) y el estilo dibuja el resto.' },
    ],
    mira: 'Arriba a la izquierda: camina y mira cómo cambian las coordenadas y el nombre de la zona.',
  },
  {
    titulo: 'Optimización', ir: { spawn: 'debug_3' },
    idea: 'Todo se prepara al cargar; durante el juego solo se reutiliza.',
    puntos: [
      { texto: 'Un único ciclo actualiza todo, siempre en el mismo orden: entrada, física, lógica, cámara, partículas, sonido, interfaz y dibujo.',
        metodo: 'setAnimationLoop', que: 'el navegador llama a una función justo antes de cada fotograma de la pantalla.' },
      { texto: 'Proyectiles, partículas, fragmentos, rocas y luces se crean al cargar y se reciclan.',
        metodo: 'Pools y vectores preasignados', que: 'nunca se pide memoria nueva en pleno juego, así no hay pausas para limpiarla.' },
      { texto: 'Cientos de plantas iguales (y el ejército del final) se dibujan de una sola vez.',
        metodo: 'InstancedMesh', que: 'una sola orden a la tarjeta gráfica con una lista de posiciones, giros y tamaños.' },
      { texto: 'Siempre hay el mismo número de luces: se mueven a las antorchas más cercanas a la cámara.',
        metodo: 'Grupo fijo de luces', que: 'si el número de luces cambiara, la tarjeta tendría que reescribir sus programas y el juego daría un tirón.' },
      { texto: 'Los programas de la tarjeta gráfica se preparan en la pantalla de carga.',
        metodo: 'compileAsync', que: 'compila de antemano el sombreado de cada material, en las dos atmósferas, para que ninguna cinemática se congele.' },
      { texto: 'La luz del cielo se resume en 9 colores en lugar de leer una imagen por cada píxel.',
        metodo: 'Armónicos esféricos', que: 'una fórmula corta que da el color del cielo en cualquier dirección.' },
      { texto: 'Si el juego no llega a ~55 FPS, dibuja a menos resolución y la sube cuando se recupera.',
        metodo: 'Resolución dinámica', que: 'mide el tiempo de cada fotograma y ajusta el tamaño del dibujo, con margen para no oscilar.' },
    ],
    mira: 'Arriba: FPS, llamadas de dibujo y triángulos en tiempo real.',
  },
];

/**
 * Modo demostración (sección 1.4): panel con los 8 requisitos, ayudas visuales, estadísticas y cámara libre.
 */
export class ModoDemo {
  /**
   * @param {{
   *   renderer: THREE.WebGLRenderer,
   *   ir: (destino: {spawn?: string, pos?: [number, number, number], rumbo?: number}) => void,
   *   ayudas: () => THREE.Object3D,
   *   parametros?: (contenedor: HTMLElement) => Promise<unknown>,
   *   camaraLibre: (activa: boolean) => void,
   *   salir: () => void,
   * }} c
   */
  constructor(c) {
    this.c = c;
    this.activo = false;
    this.fps = 60;
    /** @type {THREE.Object3D | null} */
    this.grupoAyudas = null;
    this.panel = document.createElement('aside');
    this.panel.id = 'demo';
    this.panel.className = 'oculto';
    this.panel.innerHTML = `
      <header><span class="demo-etiqueta">Demostración técnica</span><h2>Requisitos del curso</h2></header>
      <p class="demo-stats" id="demo-stats">—</p>
      <ol class="demo-lista">${REQUISITOS.map((r, i) => `<li><button type="button" data-i="${i}"><span>${i + 1}</span>${r.titulo}</button></li>`).join('')}</ol>
      <article class="demo-ficha" id="demo-ficha"><p>Elige un requisito: Victoria va al lugar donde mejor se ve.</p></article>
      <div class="demo-parametros" id="demo-parametros"></div>
      <div class="demo-controles">
        <label><input type="checkbox" id="demo-ayudas" checked> Triggers y colisionadores</label>
        <label><input type="checkbox" id="demo-libre"> Cámara libre (OrbitControls)</label>
        <button type="button" id="demo-salir">Salir de la demostración</button>
      </div>
      <p class="demo-pista">Clic en la escena para jugar · Esc para volver al panel</p>`;
    document.body.appendChild(this.panel);
    this.stats = /** @type {HTMLElement} */ (this.panel.querySelector('#demo-stats'));
    this.ficha = /** @type {HTMLElement} */ (this.panel.querySelector('#demo-ficha'));
    this.panel.querySelectorAll('.demo-lista button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mostrar(Number(/** @type {HTMLElement} */ (b).dataset.i));
    }));
    const ayudas = /** @type {HTMLInputElement} */ (this.panel.querySelector('#demo-ayudas'));
    ayudas.addEventListener('change', () => this._ayudas(ayudas.checked));
    const libre = /** @type {HTMLInputElement} */ (this.panel.querySelector('#demo-libre'));
    libre.addEventListener('change', () => c.camaraLibre(libre.checked));
    this.casillaLibre = libre;
    this.panel.querySelector('#demo-salir')?.addEventListener('click', () => c.salir());
    this.panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  activar() {
    this.activo = true;
    this.panel.classList.remove('oculto');
    document.body.classList.add('en-demo');
    this._ayudas(true);
    // lil-gui (semana 2) plegado dentro del panel: solo existe en la demostración
    const cont = this.panel.querySelector('#demo-parametros');
    if (this.c.parametros && cont && !cont.childElementCount) this.c.parametros(/** @type {HTMLElement} */ (cont));
  }

  /** @param {number} i */
  mostrar(i) {
    const r = REQUISITOS[i];
    this.panel.querySelectorAll('.demo-lista button').forEach((b, j) => b.classList.toggle('activo', j === i));
    const puntos = r.puntos.map((pt) => `<li><p>${pt.texto}</p><p class="demo-metodo"><code>${pt.metodo}</code>: ${pt.que}</p></li>`).join('');
    this.ficha.innerHTML = `<h3>${i + 1}. ${r.titulo}</h3><p class="demo-idea">${r.idea}</p><ul class="demo-puntos">${puntos}</ul>`
      + `<p class="demo-mira"><b>Cómo verlo:</b> ${r.mira}</p>`;
    this.c.ir(r.ir);
    if (r.ayudas) {
      /** @type {HTMLInputElement} */ (this.panel.querySelector('#demo-ayudas')).checked = true;
      this._ayudas(true);
    }
    const cuaderno = document.getElementById('cartografa');
    cuaderno?.classList.toggle('resaltado', Boolean(r.hud));
  }

  /** @param {boolean} si */
  _ayudas(si) {
    if (si && !this.grupoAyudas) this.grupoAyudas = this.c.ayudas();
    if (this.grupoAyudas) this.grupoAyudas.visible = si;
  }

  /** @param {number} dtReal */
  actualizar(dtReal) {
    if (!this.activo || dtReal <= 0) return;
    this.fps += (1 / dtReal - this.fps) * Math.min(1, dtReal * 3);
    const r = this.c.renderer.info.render;
    this.stats.textContent = `${Math.round(this.fps)} FPS · ${r.calls} llamadas · ${r.triangles.toLocaleString('es')} triángulos`;
  }
}
