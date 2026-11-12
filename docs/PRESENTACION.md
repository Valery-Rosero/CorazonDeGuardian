# El Templo del Sol Perdido — contenido de las diapositivas (revisión técnica)

Cada sección es una diapositiva. Todas siguen el mismo orden:
- **Tema del curso:** lo que se vio en clase.
- **Qué aplicamos.**
- **Dónde está:** archivo y función.
- **Cómo funciona:** paso a paso.
- **Código:** un fragmento real del proyecto.
- **Mostrar:** qué enseñar en vivo.

Las rutas son del repositorio https://github.com/Valery-Rosero/ElTemploDelSol.

El checklist completo, tema por tema de las semanas 1 a 10, está en [CHECKLIST_CURSO.md](CHECKLIST_CURSO.md). Las diapositivas toman de ahí lo más importante.

---

## 1. Portada

- **El Templo del Sol Perdido.** Aventura 3D en tercera persona para el navegador.
- **Curso:** Programación de Entornos Multimedia. Equipo: *(nombres)*.
- **Imagen:** la portada del juego (`public/portada.jpg`, un fotograma del propio juego).

---

## 2. Tecnologías y por qué

| Pieza | Versión | Para qué |
|---|---|---|
| Three.js | 0.160 | Escena, cámara, renderizado WebGL 2, luces, sombras, audio 3D, carga de modelos |
| cannon-es | 0.20 | Física: gravedad, cuerpos rígidos, colisiones, materiales de contacto |
| Vite | 8 | Servidor de desarrollo y empaquetado (`npm run dev`, `npm run build`), como desde la semana 6 |
| Blender | 5.2 con Python (`bpy`) | Todos los modelos: escenarios, personajes y enemigos, **generados con scripts**, no a mano |
| Python + numpy / Pillow / ffmpeg | 3.12 | Sonidos, voces y música sintetizados; el video del mural dibujado cuadro a cuadro |
| node:test | Node 24 | 103 pruebas automáticas |

**Mensaje:** no hay ni un modelo, ni una imagen ni un sonido descargado. Todo sale de código.

---

## 3. Arquitectura del proyecto

```
src/
  core/        renderer, bucle único, física, entrada, audio, música, carga, precompilación
  world/       cargador de niveles, triggers, entorno (luces, cielo, niebla), puente, santuario, escape
  player/      controlador de Victoria, animación procedural, cara, vida, poderes (abilities/)
  camera/      cámara en tercera persona, cámara libre, oclusión, sacudida
  enemies/     centinelas, espectros, Guardián (máquinas de estados y su «cerebro» separado)
  interaction/ objetos interactivos, portal, losas, acertijo de los espejos
  cinematics/  reproductor de cinemáticas y las cinemáticas como datos
  fx/          partículas, posprocesado (bloom y profundidad de campo)
  ui/          HUD (cuaderno de la cartógrafa), diálogos, diario, menús
  game/        historia, acto final, modo demostración, partida guardada
  config/      todos los números del juego (velocidades, daños, paleta, calidad)
tools/blender/ los scripts que construyen los modelos
tools/audio/   síntesis de sonidos, voces y música
tests/         pruebas (lógica y simulaciones con los escenarios reales)
```

**Decisiones de arquitectura:**
- **Lógica separada del dibujo.** Cada sistema tiene su «cerebro» sin Three.js (por ejemplo, `sentinel_logic.js` o `bridge_logic.js`), y eso permite probarlo con `node --test` sin navegador.
- **Configuración aparte.** Los números viven en `src/config/`: se ajustan sin tocar la lógica.
- **Un bus de eventos** (`src/core/event_bus.js`) conecta sistemas que no se conocen (por ejemplo, «página encontrada» o «poder desbloqueado»).
- **Todo se crea al cargar.** Durante el juego solo se reutiliza (requisito 8).

**Mostrar:** el árbol de carpetas en el editor.

---

## 4. El bucle único (semana 1 y requisito 8)

- **Tema del curso:** un `requestAnimationFrame` que actualiza y dibuja a 60 FPS.
- **Qué aplicamos:** un solo bucle para todo el juego, con un orden fijo.
- **Dónde está:** `src/core/game_loop.js` (`BucleJuego`) y las etapas en `src/main.js`.

**Cómo funciona:**
1. `renderer.setAnimationLoop` llama a `_fotograma` antes de cada fotograma de la pantalla.
2. Calcula `dt` (el tiempo desde el fotograma anterior) y lo limita a 0,1 s, para que la física no se descontrole al volver de otra pestaña.
3. Llama a las etapas en este orden: **física → sincronizar → lógica → cámara → partículas → audio → interfaz → dibujo**.
4. En la pausa se salta la simulación, pero se sigue dibujando.

```js
// src/core/game_loop.js
const dtReal = Math.min(DT_MAXIMO, ahora - this.ultimo);
if (!this.pausado) {
  const dt = dtReal * this.escalaTiempo;
  e.fisica?.(dt);       e.sincronizar?.();   e.logica?.(dt, this.tiempo);
  e.camara?.(dt);       e.particulas?.(dt);  e.audio?.(dt);
}
e.hud?.(dtReal);
e.render();
```

**Mostrar:** la Demostración técnica, requisito 8: FPS, llamadas de dibujo y triángulos en vivo.

---

## 5. Escena, cámara y renderizador (semana 1)

- **Tema del curso:** la «trinidad» `Scene` + `PerspectiveCamera` + `WebGLRenderer`, y el ajuste al cambiar el tamaño de la ventana.
- **Dónde está:** `src/core/renderer.js` (`crearRenderer`, `ajustarAlRedimensionar`) y `src/main.js`.

**Cómo funciona:**
1. Pide un contexto WebGL 2. Si no hay, muestra un mensaje claro.
2. Elige la calidad (baja, media o alta) según la tarjeta gráfica o lo elegido en Opciones.
3. Configura el color (sRGB), el mapeo de tonos ACES y las sombras suaves.
4. Al cambiar el tamaño de la ventana, actualiza el aspecto de la cámara y su proyección.

```js
// src/core/renderer.js
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, context: prueba, antialias: calidad.antialias });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, calidad.pixelRatioMax));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

---

## 6. Del diseño al modelo: el modelado en Blender paso a paso (semanas 7 y 8)

- **Tema del curso:** modelado de pocos polígonos, presupuesto de triángulos, transformaciones aplicadas, exportación a `.glb`.
- **Qué aplicamos:** **cada modelo es un script de Python** que construye la geometría en Blender. `npm run assets` regenera todos los modelos desde cero.

**Paso a paso:**
1. **Diseño primero.** Cada pieza tiene su tablero dibujado: personajes, enemigos, selva, interiores, la pirámide. Las comparaciones entre tablero y juego están en `docs/previews/*_vs_*.png`.
2. **Piezas básicas** (`tools/blender/common.py`):
   - `caja_biselada`: caja con las aristas biseladas, con conicidad opcional;
   - `prisma`: un prisma de *n* lados;
   - `casco`: la envolvente convexa de una nube de puntos, para rocas, musgo y la cabeza;
   - `colocar`: una matriz de posición, rotación y escala.
3. **Un `Constructor`** acumula vértices y caras, y le da a cada cara su color de la paleta compartida (`palette.py`, que una prueba compara con `src/config/palette.js`). El color de una cara puede depender de su normal: `tono_piedra` pinta más claro lo que mira al sol. Así no hacen falta texturas.
4. **Personajes:** una sola malla con **esqueleto rígido** (cada vértice pertenece 100 % a un hueso). La cabeza lleva **17 *shape keys***: cejas, párpados, 6 visemas de la boca, parpadeo y mirada.
5. **Presupuesto comprobado al exportar** (`tools/blender/stats.py`):

   | Pieza | Triángulos (límite) |
   |---|---|
   | Selva | 67.768 (70.000) |
   | Santuario | ≈37.000 (50.000) |
   | Arena | ≈22.800 |
   | Victoria | 2.577 (7.500) |

6. **Exportación** a `.glb` con colores por vértice, esqueletos, *morph targets* y las propiedades personalizadas (*extras*) que lee el juego.

```python
# tools/blender/temple_builder.py — un cuerpo de la gran pirámide
k.agregar(caja_biselada(lado, lado, ht, 0.25, conico=(lt * 2) / lado), tono_piedra, 'escenario', colocar((cx, cy, z0 + ht / 2)))   # talud
k.agregar(caja_biselada(lt * 2, lt * 2, hb, 0.15), tono_piedra, 'escenario', colocar((cx, cy, z0 + ht + hb / 2)))                  # tablero
k.agregar(caja_biselada(lc * 2, lc * 2, hc, 0.08), 'piedra_luz', 'escenario', colocar((cx, cy, z0 + ht + hb + hc / 2)))           # cornisa
```

**Mostrar:** `docs/previews/piramide_tablero.png` junto a `piramide_vs_tablero.png` (el tablero y el juego), y un script abierto. El pórtico del santuario sigue la misma regla: `fachada_tablero.png` y `fachada_vs_tablero.png`.

---

## 7. Del archivo `.glb` al juego: la convención de nombres (semana 7)

- **Tema del curso:** `GLTFLoader` asíncrono y sin congelar la pestaña.
- **Dónde está:** `src/core/assets.js` (con `LoadingManager` y progreso real en la portada) y `src/world/level_loader.js`.
- **La idea:** Blender no exporta física ni triggers. Por eso **el nombre de cada objeto dice qué es**, y el cargador crea lo que corresponde.

| Prefijo en Blender | Qué crea el juego |
|---|---|
| `col_box_`, `col_cyl_`, `col_sph_` | Un colisionador estático de cannon-es (caja, cilindro o esfera) con la forma medida del objeto. La malla no se dibuja |
| `trg_box_`, `trg_rad_` | Un trigger AABB o radial, con sus datos (zona, evento, destino del portal) |
| `dyn_` | Un objeto con física (masa, forma, material), sincronizado con su malla |
| `spawn_` | Un punto de aparición (Victoria, enemigos, cinemáticas) |
| `luz_`, `emit_`, `hint_`, `inst_` | Luces, emisores de partículas, puntos de interés y vegetación instanciada |

```js
// src/world/level_loader.js — un col_box_ de Blender se vuelve un cuerpo estático
const cuerpo = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: fisica.materiales.mundo });
cuerpo.addShape(new CANNON.Box(new CANNON.Vec3(tam.x / 2, tam.y / 2, tam.z / 2)));
cuerpo.position.set(centro.x, centro.y, centro.z);
```

**Mostrar:** la Demostración técnica, requisito 4. Las cajas de colores son los triggers y la malla de alambre son los colisionadores.

---

## 8. Geometrías, materiales y transformaciones (semana 2)

- **Primitivas de Three.js:** `PlaneGeometry` (mural), `BoxGeometry` (su marco), `TorusGeometry` (anillos de los triggers), `IcosahedronGeometry` (la carga del espectro).
- **`BufferGeometry` + `BufferAttribute`:** partículas, mapa de Mateo y el ejército del final.
- **Materiales:**
  - `MeshStandardMaterial`: piedra mate, oro emisivo, marco metálico;
  - `MeshToonMaterial` con una rampa de 3 tonos (`DataTexture`) para los personajes;
  - `MeshPhysicalMaterial` con **clearcoat** en la gema del brazalete.
- **Texturas sin descargar:**
  - `CanvasTexture`: el mapa de Mateo dibujado con código y las partículas;
  - `DataTexture`: la rampa toon;
  - `VideoTexture`: el mural.
- **Transformaciones y `Group`:** los personajes son jerarquías de huesos. La animación procedural (`src/player/procedural_animator.js`) gira cada hueso con funciones seno, ajustadas por velocidad y estado.
- **`lil-gui` con carpetas:** Demostración técnica, «Parámetros en vivo» (Victoria y Cámara).

---

## 9. Luces, sombras y PBR (semana 4)

| Luz | Dónde | Para qué |
|---|---|---|
| `DirectionalLight` con sombra | `src/world/environment.js` | El sol. Su cámara de sombras sigue a Victoria, para tener sombras nítidas cerca |
| `HemisphereLight` + `AmbientLight` | `environment.js` | Luz del cielo arriba y del suelo abajo |
| `PointLight` | `crearLucesNivel` | Antorchas y braseros. Siempre son 3 a 6 luces reales, que se mueven a las fuentes más cercanas |
| `SpotLight` | `src/main.js` (`focoAltar`) | Foco sobre el altar del escudo, en el santuario |

**Sombras:**
- `castShadow` y `receiveShadow` en las mallas, y `PCFSoftShadowMap`.
- El tamaño del mapa depende de la calidad (1024 o 2048).
- Para evitar el «acné» de sombra: `bias` y `normalBias`.

**Entorno:**
- **Calidad media y alta:** `PMREMGenerator`, que genera el mapa de entorno a partir del cielo procedural (semana 7) y da los reflejos.
- **Calidad baja:** la luz del cielo resumida en armónicos esféricos.

---

## 10. Video y audio espacial (semana 3, taller «Estación multimedia inmersiva»)

- **Qué aplicamos:** el **mural vivo** de la sala de los espejos.
- **Dónde está:** `src/world/living_mural.js`. El video lo genera `tools/video/video_leyenda.py`.

**Cómo funciona:**
1. Python dibuja 336 cuadros (cuatro escenas de la leyenda) y ffmpeg los une en un `leyenda.mp4` de 1280 × 720.
2. El juego crea un `<video>`, lo convierte en `VideoTexture` y lo pone sobre un plano de 7,2 × 4 m, centrado en el muro este.
3. El canto del mural es un `PositionalAudio` **hijo del plano**: sube al acercarse.
4. Con la tecla **E** se despierta o se duerme. El navegador no deja reproducir sin una acción del jugador, así que la interacción cumple la regla del autoplay.
5. Los subtítulos de la leyenda siguen `video.currentTime`.

```js
// src/world/living_mural.js
this.textura = new THREE.VideoTexture(this.video);
const material = new THREE.MeshStandardMaterial({ map: this.textura, emissiveMap: this.textura, emissiveIntensity: 0.8 });
this.malla = new THREE.Mesh(new THREE.PlaneGeometry(MURAL.ancho, MURAL.alto), material);
this.canto = new THREE.PositionalAudio(oyente);
this.malla.add(this.canto);
```

**Mostrar:** `/?debug&auto&poderes&ir=debug_5`, girar a la derecha y pulsar **E**.

---

## 11. Audio 3D y sonido hecho con código (requisito 3, semana 9)

- **Dónde está:** `src/core/audio_manager.js` y `src/core/music.js`.
- **Posicionales** (`PositionalAudio`, modelo lineal con distancia de referencia y máxima):
  - la cascada (3 a 25 m), las antorchas, el latido del Guardián y el mural;
  - un grupo de 8 para efectos en el mundo.
- **Globales** (`THREE.Audio`): portal, checkpoints, poderes, voces y música.
- **Desbloqueo del audio:** el sonido empieza con el clic de «Jugar». En la pausa se suspende el `AudioContext`, así las voces no siguen sonando.
- **Síntesis con numpy** (`tools/audio/`):
  - **efectos:** ondas y ruido filtrado;
  - **música:** un leitmotiv que cambia por zona;
  - **voces:** un «murmullo» con los formantes de cada vocal del texto.

```js
// src/core/audio_manager.js
const audio = new THREE.PositionalAudio(oyente);
audio.setDistanceModel('linear');
audio.setRefDistance(POSICIONAL.efecto.referencia);
audio.setMaxDistance(POSICIONAL.efecto.maximo);
```

**Mostrar:** la Demostración técnica, requisito 3: acercarse y alejarse de la cascada.

---

## 12. Triggers (requisito 4, semana 9)

- **Dónde está:** `src/world/triggers.js` (`SistemaTriggers`).

**Cómo funciona:**
- **Radial:** `pos.distanceTo(centro) <= radio`. Lo usan los pilares, las páginas, las flores y los enemigos que te ven.
- **Caja AABB:** `caja.containsPoint(pos)`. Lo usan las zonas, los perfiles de cámara, el portal, la arena y el inicio del escape.
- **Solo avisa al cambiar** (entrar o salir): guarda `dentro` del fotograma anterior.
- **El portal** espera 3 s antes de volver a funcionar (`src/interaction/portal.js`) y deja a Victoria fuera de la caja de llegada, así no hay bucles.

```js
// src/world/triggers.js
const dentro = t.caja.containsPoint(pos);
if (dentro !== t.dentro) { t.dentro = dentro; this.alCambiar(t, dentro); }
// …
const dentro = pos.distanceTo(t.centro) <= t.radio;
```

---

## 13. Partículas (requisito 5, semana 4)

- **Dónde están:** `src/fx/particles.js` (`SistemaParticulas`) y `src/fx/particle_presets.js`.

**Cómo funciona:**
1. **Capacidad fija.** Todos los datos van en `Float32Array`: posición, velocidad, color, alfa, tamaño y vida.
2. **En cada fotograma,** a cada partícula se le aplica la gravedad y el arrastre, y se le resta vida. Cuando muere, **renace** en el emisor (reciclaje).
3. **Se marca `needsUpdate = true`** en los atributos que cambiaron.
4. **Se dibujan con `THREE.Points` y un *shader* propio:**
   - el tamaño se escala con la distancia;
   - `AdditiveBlending` hace que el fuego brille donde se juntan las partículas;
   - `depthWrite: false` evita que unas partículas tapen a otras.
5. **Efectos:** cascada, espuma, fuego, polen, luciérnagas, chispas del Pulso, brasas de la fase 3 y polvo del derrumbe.

```js
// src/fx/particles.js
this.pos = new Float32Array(n * 3);
this.vel = new Float32Array(n * 3);
this.atrPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
```

---

## 14. Física con cannon-es (requisito 6, semanas 5 y 10)

- **Tema del curso:** dos mundos (`CANNON.World` y `THREE.Scene`) sincronizados, cuerpos rígidos, materiales de contacto, paso fijo y evento `collide`.
- **Dónde está:** `src/core/physics_world.js` (`MundoFisico`).

**Cómo funciona:**
1. **El mundo:** gravedad −9,82 m/s², `SAPBroadphase` (más eficiente que la `NaiveBroadphase` del ejemplo de clase) y `allowSleep` (los cuerpos quietos dejan de calcularse).
2. **Paso fijo:** `world.step(1/60, dt, 3)`. Es el mismo resultado en cualquier computadora, con 3 subpasos como máximo.
3. **Tres tipos de cuerpo:**
   - **estáticos** (masa 0): suelo y muros;
   - **dinámicos:** esferas de 25 kg, tablas del puente, fragmentos y rocas;
   - **cinemáticos:** el Guardián.
4. **Materiales de contacto:**

   | Pareja | Fricción | Rebote |
   |---|---|---|
   | Victoria – mundo | 0 | 0 |
   | Esfera – mundo | 0,4 | 0,6 |
   | Tabla – mundo | 0,5 | 0,2 |

5. **Sincronización:** después de cada paso, cada malla copia la posición y la rotación de su cuerpo.
6. **Sonido de impacto:** el evento `collide` con `getImpactVelocityAlongNormal()` da el volumen según la fuerza del golpe.

```js
// src/core/physics_world.js
this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAVEDAD, 0) });
this.world.broadphase = new CANNON.SAPBroadphase(this.world);
this.world.addContactMaterial(new CANNON.ContactMaterial(m.esfera, m.mundo, { friction: 0.4, restitution: 0.6 }));
// …
this.world.step(PASO_FIJO, dt, 3);
malla.position.set(cuerpo.position.x, cuerpo.position.y, cuerpo.position.z);
malla.quaternion.set(cuerpo.quaternion.x, cuerpo.quaternion.y, cuerpo.quaternion.z, cuerpo.quaternion.w);
```

**Mostrar:** la Demostración técnica, requisito 6: disparar el Pulso a las esferas.

---

## 15. Control del personaje, proyectiles y cámara (semana 6)

- **Movimiento** (`src/player/player_controller.js`):
  - **WASD relativo a la cámara:** caminar 4,5 m/s, correr 7,5 m/s, con aceleración y frenado.
  - **Salto:** la velocidad inicial se calcula para llegar a 1,6 m. Hay un *coyote time* (se puede saltar un instante después de dejar el borde) y una gravedad extra al caer.
  - **Suelo:** se detecta con un rayo hacia abajo y con el evento `collide` (normal hacia arriba), como en clase.
- **Proyectil (Pulso solar,** `src/player/abilities/solar_pulse.js`**):**
  - es un cuerpo **sensor** (`collisionResponse: false`). Sale de la mano de Victoria hacia el punto que hay bajo la mira: un rayo desde el centro de la pantalla en la dirección de la cámara (`getWorldDirection`), con una pequeña ayuda de puntería hacia el enemigo más cercano a la mira;
  - al golpear, empuja con `applyImpulse`;
  - además, en cada fotograma revisa con un rayo el tramo que recorrió: a 30 m/s podría atravesar objetos delgados.
- **Cámara en tercera persona** (`src/camera/camera_rig.js`):
  - **Control:** `PointerLockControls` para el ratón, con perfiles por zona y suavizado.
  - **Colisión:** cinco rayos (como una esfera) desde Victoria hacia la cámara. Si algo los corta, la cámara se acerca.
  - **Apuntado:** clic derecho pone la cámara sobre el hombro. **R** la recentra.

---

## 16. HUD (requisito 7, semana 9)

- **El «Cuaderno de la cartógrafa»** (`src/ui/cartographer_panel.js`): HTML y CSS sobre el lienzo, con `pointer-events: none`.
- **Muestra** la zona actual, las coordenadas X/Y/Z en tiempo real y una brújula que gira con la cámara.
- **Rendimiento:** el texto **solo se reescribe cuando cambia**, para no tocar la página en cada fotograma.
- **Además:** la vida, los poderes con un anillo de recarga (variables CSS), los subtítulos, la barra del jefe y el reloj del escape.

---

## 17. Enemigos y jefe: máquinas de estados

- **Dónde está:** `src/enemies/state_machine.js` (genérica), `sentinel_logic.js`, `specter_logic.js` y `boss_logic.js`.
- **Centinela:** dormido → guardia → alerta → persecución → ataque → recuperación (o aturdido o muerte). El color de su ojo dice en qué estado está.
- **Espectro:** flota, mantiene la distancia y dispara orbes. Los orbes no son cuerpos físicos: cada fotograma se revisa su tramo con un rayo.
- **El Guardián:**
  - **tres fases;** cada ataque se anuncia antes con luz y sonido;
  - **solo recibe daño con el núcleo abierto** (los 3 pilares solares encendidos);
  - **invoca espectros** en la pelea.
- **Probado con simulación:** el Guardián camina, salta y solo recibe daño cuando debe (`tests/zona3_simulacion.test.js`).

---

## 18. Cinemáticas como datos

- **Dónde está:** `src/cinematics/` y `timeline.js` (`LineaTiempo`, lógica pura y probada).
- **Cada cinemática es una lista de planos y de sucesos en el tiempo:**
  - un **plano** dice dónde está la cámara, qué mira, la lente en milímetros, la curva de movimiento y cuánto dura;
  - un **suceso** es algo como «decir», «rugido» o «Mateo llega».
- **La lente en milímetros** fija el ancho de la imagen, así el encuadre es igual en cualquier pantalla (`fovDeLente`).
- **Al terminar,** la cámara de la cinemática se mezcla con la de juego, sin saltos.
- **El reloj de las cinemáticas es el real** (el de las voces), así un fotograma lento no las desincroniza.
- **Son 10:** introducción, brazalete, puente, puerta de los espejos, despertar, fases 2 y 3, derrota, final y el epílogo con un ejército de 256 criaturas dibujadas con `InstancedMesh` en 6 llamadas.

---

## 19. Optimización (requisito 8)

| Técnica | Dónde | Efecto medido |
|---|---|---|
| Un único bucle; nada se crea en pleno juego (pools, vectores preasignados) | `game_loop.js`, `fx/particles.js`, `enemies/fragments.js` | Sin pausas de memoria |
| Vegetación y ejército con `InstancedMesh` | `level_loader.js`, `world/army.js` | Cientos de objetos en una sola llamada |
| Dibujar solo la cara de adelante del escenario | `level_loader.js` | −46 % de tiempo en la selva |
| Luz del cielo en 9 colores (armónicos esféricos) | `world/shaders.js` | La mitad del tiempo |
| Número fijo de luces reales | `world/environment.js` | Sin recompilar sombreadores |
| Precompilar los sombreadores en la carga | `core/warmup.js` (`compileAsync`) | Ningún tirón en las 10 cinemáticas |
| Resolución dinámica | `core/dynamic_resolution.js` | Baja la resolución si no llega a ~55 FPS |
| Tres calidades | `config/quality.js` | Baja, media y alta |

---

## 20. Pruebas y verificación

- **103 pruebas** con `npm test`. Algunas cargan los `.glb` reales y hacen correr la física:
  - recorren la selva entera;
  - resuelven el acertijo de los espejos (las 512 combinaciones);
  - pelean con el Guardián;
  - hacen el escape en menos de 75 s.
- **`npm run check`:** comprobación de tipos.
- **Capturas automáticas** con Chrome sin ventana: cada plano de cada cinemática se fotografía y se compara con su guion gráfico.
- **`npm run zfighting`:** revisa los triángulos de los tres escenarios en busca de superficies superpuestas.
- **Instalación en otra computadora:** un comando (`scripts/instalar.ps1`) y otro para jugar (`npm run jugar`).

---

## 21. Demostración en vivo (guion)

1. **Menú** → **Demostración técnica**.
2. **Requisito 1:** sombras de Victoria y de las ruinas.
3. **Requisito 2:** mover el ratón y activar «Cámara libre».
4. **Requisito 3:** acercarse y alejarse de la cascada.
5. **Requisito 4:** ver las cajas de los triggers y cruzar el portal (espera de 3 s).
6. **Requisito 5:** la cascada y el fuego.
7. **Requisito 6:** disparar a las esferas.
8. **Requisito 7:** caminar y ver cambiar las coordenadas.
9. **Requisito 8:** FPS, llamadas y triángulos.
10. **Si sobra tiempo:**
    - el mural vivo (`ir=debug_5`, tecla E);
    - el Guardián en la fase 3 (tecla 8);
    - el final (`&final=amanecer`).

---

## Anexo: decisiones técnicas para preguntas

- **¿Por qué los modelos con código?** Se pueden regenerar, comparar con su tablero y mantener dentro del presupuesto en cada exportación. Un cambio de medida se aplica en todo el escenario.
- **¿Por qué esqueleto rígido y no piezas sueltas?** Victoria pasó de 26 a 3 llamadas de dibujo, y cada centinela de 13 a 1.
- **¿Por qué el paso fijo de física?** Para que los choques y los saltos sean iguales a cualquier FPS.
- **¿Por qué no Draco ni HDR descargado?**
  - **Draco:** los modelos pesan de 1,6 a 5 MB, gracias al estilo de pocos polígonos.
  - **HDR:** el entorno se genera del cielo procedural con `PMREMGenerator`.
- **¿Por qué no *transmission*?** Obliga a dibujar la escena dos veces. El escudo usa un *shader* propio con borde de Fresnel.
- **¿Cómo se hace el lago sin reflejos reales?** Con un *shader* propio y opaco: según el ángulo de la mirada mezcla el agua honda con el color del horizonte (efecto Fresnel: de lejos refleja el cielo, de cerca se ve el fondo). Ese color es el de la niebla, así que el lago cambia solo con el amanecer. La lámina acompaña a la cámara, como el cielo: su borde nunca se ve.
- **Problemas que encontramos al revisar,** y su solución:
  - **El bloom velaba el cielo:** se excluye el cielo del brillo.
  - **Un píxel inválido dejaba un cuadro negro:** se limpian los valores antes del desenfoque.
  - **Las cinemáticas se desfasaban de las voces:** van con el reloj real.
  - **Superficies superpuestas en el santuario:** se corrigieron con la herramienta `zfighting`.
  - **La losa del pórtico se podía rodear:** el atrio ahora es un patio cerrado y una prueba intenta rodearla y saltarla desde nueve sitios.
