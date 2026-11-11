# Checklist del curso: todo lo visto en clase y cómo está en el juego

Fuente: las diapositivas y talleres de las semanas 1 a 10 de *Programación de Entornos Multimedia* (Mg. Gabriel Guerrero Arellano). Para cada tema dice cómo se aplicó en **El Templo del Sol Perdido**, dónde está y cómo mostrarlo.

**Estado:** **Hecho** = está en el juego tal como se vio en clase · **Equivalente** = se cumple el mismo objetivo por otra vía, explicada en la fila · **No se usa** = no está, con el motivo.

La forma más rápida de mostrarlo todo es el **modo demostración**: menú principal → «Demostración técnica» (o `/?demo`).

---

## 1. Check-list del proyecto final (semana 10)

| # | Requisito | Estado | Cómo está en el juego | Cómo mostrarlo |
|---|---|---|---|---|
| 1 | Escenario completo importado desde Blender (`.glb`) con iluminación y sombras | Hecho | Tres zonas, personajes y objetos generados con Python en Blender (`tools/blender/`) y exportados a `public/models/*.glb`. Sol `DirectionalLight` con sombras `PCFSoftShadowMap`, `AmbientLight`, `HemisphereLight`, `PointLight` en antorchas y braseros, `SpotLight` en el santuario | Demostración, requisito 1 |
| 2 | Cámara fluida con `OrbitControls` o `PointerLockControls` | Hecho | Los dos: tercera persona con `PointerLockControls` (`src/camera/camera_rig.js`) y `OrbitControls` en el modo foto y la cámara libre (`src/camera/free_camera.js`) | Mover el ratón; tecla **F** |
| 3 | Un `PositionalAudio` anclado a un objeto y un audio global `THREE.Audio` | Hecho | Posicional: cascada, antorchas, latido del Guardián, canto del mural vivo, efectos en el mundo. Global: portal, checkpoints, poderes, voces y música (`src/core/audio_manager.js`, `src/core/music.js`) | Demostración, requisito 3: acercarse a la cascada |
| 4 | Dos triggers: uno radial con `distanceTo` y uno AABB con `Box3` | Hecho | `src/world/triggers.js`. Radiales: checkpoints, páginas, flores, objetos interactivos, enemigos. AABB: zonas, cámara, portal con espera de 3 s, arena, escape | Demostración, requisito 4 (cajas y anillos visibles) |
| 5 | Sistema de partículas con `BufferGeometry` + `Float32Array` y física | Hecho | `src/fx/particles.js`: agua de la cascada, fuego, humo/niebla, polen, luciérnagas, chispas, brasas y polvo, con gravedad, arrastre y reciclaje | Demostración, requisito 5 |
| 6 | Objeto dinámico de Cannon con masa, gravedad y rebote sincronizado | Hecho | Esferas rituales (25 kg, rebote), tablas del puente, fragmentos, rocas. Se copian `position` y `quaternion` a Three.js en cada fotograma | Demostración, requisito 6: disparar a las esferas |
| 7 | HUD HTML/CSS con zona actual y coordenadas en tiempo real | Hecho | «Cuaderno de la cartógrafa» (`src/ui/cartographer_panel.js`), con `pointer-events: none` | Siempre visible arriba a la izquierda |
| 8 | 60 FPS sin crear objetos dentro de `animate()` | Hecho | Un solo bucle (`src/core/game_loop.js`); todo se crea al cargar (grupos de proyectiles, fragmentos, rocas, sonidos, luces); resolución dinámica | Demostración, requisito 8: FPS, llamadas y triángulos |

Detalle de cada requisito, con archivos y funciones: [REQUISITOS_CURSO.md](REQUISITOS_CURSO.md).

---

## 2. Semana a semana

### Semana 1 · Fundamentos 3D y WebGL

| Tema de la clase | Estado | En el juego |
|---|---|---|
| La «trinidad»: `Scene`, `PerspectiveCamera` (FOV, aspecto, cerca y lejos) y `WebGLRenderer` | Hecho | `src/main.js` y `src/core/renderer.js` (WebGL 2, sombras, mapeo de tonos) |
| Bucle con `requestAnimationFrame` a 60 FPS | Hecho | `src/core/game_loop.js`, con paso de física fijo |
| Geometrías y mallas (`Mesh` = geometría + material) | Hecho | Todo el juego; geometrías de Three.js en el mural, el escudo y las ayudas visuales |
| CPU, GPU, llamadas de dibujo y *frustum culling* | Hecho | El contador de llamadas de dibujo está en la demostración; la vegetación es instanciada para reducirlas |
| CDN y Live Server | Equivalente | Desde la semana 6 el curso usa **Vite**, como este proyecto (`npm run dev`) |

### Semana 2 · Geometrías, materiales y transformaciones

| Tema de la clase | Estado | En el juego |
|---|---|---|
| Geometrías primitivas (`Box`, `Sphere`, `Plane`, `Cylinder`, `Torus`) | Hecho | Mural (`PlaneGeometry`), marco (`BoxGeometry`), ayudas de triggers (`TorusGeometry`), escudo y partículas; el resto se genera en Blender |
| `BufferGeometry` y `BufferAttribute` | Hecho | Partículas, mapa de Mateo (curvado en el código) |
| `MeshStandardMaterial` con materiales distintos (metal, brillante, mate) | Hecho | Piedra mate, oro emisivo, marco del mural metálico, gema brillante con barniz |
| Texturas (`TextureLoader`, mapas de normales, rugosidad, oclusión) | Equivalente | El juego no descarga imágenes: todo se genera con código. Se usan `CanvasTexture` (mapa de Mateo, partículas, silueta de Mateo en el núcleo, matcap de los espectros), `DataTexture` (sombreado toon) y `VideoTexture` (mural vivo) |
| Transformaciones (posición, rotación, escala) y `THREE.Group` | Hecho | Jerarquías de personajes (huesos), Victoria dentro de su grupo, piezas del Guardián |
| `lil-gui` con carpetas | Hecho | «Parámetros en vivo» en la Demostración técnica (`crearAjustesEnVivo` en `src/debug/debug_panel.js`): carpetas Victoria y Cámara. Al jugar no aparece; los valores por defecto están en `src/config/` |
| `OrbitControls` | Hecho | Modo foto y cámara libre |

### Semana 3 · Medios, animación y audio espacial (taller «Estación multimedia inmersiva»)

| Requisito del taller | Estado | En el juego |
|---|---|---|
| Video como textura 3D (`VideoTexture` sobre una malla) | Hecho | **Mural vivo** de la sala de los espejos (`src/world/living_mural.js`): la leyenda de la gema animada en cuatro escenas. El video se genera con código (`tools/video/video_leyenda.py`) |
| Audio espacial (`PositionalAudio`) pegado al objeto | Hecho | El canto del mural es un `PositionalAudio` hijo del mural: sube al acercarse y baja al alejarse |
| Interacción para iniciar o pausar video y sonido (autoplay) | Hecho | Tecla **E** frente al mural: «Despertar el mural» / «Dormir el mural» |
| Animación fluida en el bucle | Hecho | Todo el juego |
| Al menos 3 objetos que ambienten el concepto | Hecho | Tres zonas completas |
| Concepto creativo propio | Hecho | Aventura de padre e hija en un templo del sol ([FICHA_CONCEPTO.md](FICHA_CONCEPTO.md)) |
| Entrega: repositorio, video de 30–60 s, ficha PDF de una página con el nombre | Ver la sección 4 | |

**Cómo mostrarlo:** `/?debug&auto&poderes&ir=debug_5`, girar hacia el muro norte (junto al paso de entrada) y pulsar **E** frente al mural.

### Semana 4 · PBR, luces, sombras y partículas

| Tema de la clase | Estado | En el juego |
|---|---|---|
| PBR con `MeshStandardMaterial` (rugosidad, metalicidad) | Hecho | Materiales del escenario |
| `MeshPhysicalMaterial` con *clearcoat* | Hecho | La gema del brazalete lleva barniz (`clearcoat: 1`, `clearcoatRoughness: 0.08`, en `src/world/materials.js`) |
| *Transmission* y *sheen* | No se usa | *Transmission* obliga a dibujar la escena dos veces; el escudo usa un *shader* propio con borde de Fresnel. El documento maestro lo deja como extra opcional |
| Catálogo de luces: `AmbientLight`, `DirectionalLight`, `PointLight`, `SpotLight` | Hecho | Los cuatro, más `HemisphereLight` (`src/world/environment.js` y `src/main.js`) |
| Sombras (`castShadow`, `receiveShadow`, `shadow.mapSize`, `PCFSoftShadowMap`) | Hecho | `src/core/renderer.js` y `src/world/environment.js`; tamaño del mapa según la calidad (1024 o 2048) |
| Partículas `THREE.Points` con `AdditiveBlending` (fuego) | Hecho | Fuego de antorchas y braseros, chispas y brasas |
| `VideoTexture` y `PositionalAudio` | Hecho | Mural vivo (semana 3) |

### Semana 5 · Físicas con Cannon

| Tema de la clase | Estado | En el juego |
|---|---|---|
| Dos mundos: `CANNON.World` y `THREE.Scene`, sincronizados en cada fotograma | Hecho | `src/core/physics_world.js` (`sincronizar`) |
| Cuerpos rígidos y formas (`Sphere`, `Box`, `Plane`), masa 0 = estático | Hecho | Escenario estático, esferas y tablas dinámicas, colisionadores leídos por nombre desde Blender (`col_box_`, `col_cyl_`) |
| `Material` y `ContactMaterial` (fricción y rebote) | Hecho | `src/core/physics_world.js`: esferas contra el suelo (fricción 0,4 y rebote 0,6), tablas, y Victoria sin fricción para no atascarse |
| Broadphase / narrowphase | Hecho | `SAPBroadphase` (más eficiente que el `NaiveBroadphase` del ejemplo) |
| Evento `collide` y `getImpactVelocityAlongNormal()` para sonido de impacto | Hecho | Las esferas rituales suenan al chocar, más fuerte cuanto más rápido (`src/main.js`). Victoria detecta el suelo con `collide` |
| Arreglo de objetos que se actualizan | Hecho | Lista de dinámicos del nivel y grupos de piezas |

### Semana 6 · Control, colisiones y proyectiles (con Vite)

| Tema de la clase | Estado | En el juego |
|---|---|---|
| Proyecto con Vite (`npm run dev`) | Hecho | Todo el proyecto |
| Movimiento con WASD y salto con Espacio | Hecho | `src/player/player_controller.js` (salto de 1,6 m, tiempo de gracia, esquiva) |
| Detección de suelo con `collide` (normal hacia arriba) | Hecho | `src/player/player_controller.js` |
| Proyectiles con `applyImpulse` y dirección de la cámara (`getWorldDirection`) | Hecho | Pulso solar (`src/player/abilities/solar_pulse.js`): empuja lo que golpea |
| Cámara en tercera persona con desplazamiento y suavizado | Hecho | `src/camera/camera_rig.js`, con colisión de cámara y perfiles por zona |
| Paso fijo (`world.step(1/60, dt, 3)`) y reposo (`allowSleep`) | Hecho | `src/core/physics_world.js` |
| Respuesta visual y sonora al chocar | Hecho | Ráfaga de partículas y sonido en el punto donde impacta el Pulso; sonido de impacto de las esferas |

### Semana 7 · Formatos 3D, carga y entorno

| Tema de la clase | Estado | En el juego |
|---|---|---|
| glTF binario (`.glb`) | Hecho | Todos los modelos |
| `GLTFLoader` asíncrono, sin congelar la pestaña | Hecho | `src/core/assets.js` con `LoadingManager` y pantalla de carga con progreso real |
| Iluminación por mapa de entorno (HDR con `RGBELoader`) | Equivalente | No se descargan HDR: el entorno se genera del cielo procedural con `PMREMGenerator` (calidad media y alta). En calidad baja, la misma luz va en armónicos esféricos, mucho más barata |
| Compresión Draco | No se usa | Los modelos son pequeños (de 1,6 a 4 MB) gracias al estilo de pocos polígonos |
| `OrbitControls` para revisar el modelo | Hecho | Modo foto |

### Semana 8 · De Blender a la web

| Tema de la clase | Estado | En el juego |
|---|---|---|
| Modelado de pocos polígonos y presupuesto | Hecho | Presupuesto por zona (50.000 triángulos) comprobado en cada exportación (`tools/blender/stats.py`) |
| Origen, transformaciones aplicadas, exportación `.glb` | Hecho | `tools/blender/common.py` (`exportar_glb`) |
| Automatización con Python | Hecho | Todo el arte: `npm run assets` regenera los modelos |

### Semana 9 · Proyecto integrador: triggers, zonas sonoras y portales

| Tema de la clase | Estado | En el juego |
|---|---|---|
| Trigger radial `distanceTo` y trigger de caja `Box3.containsPoint` | Hecho | `src/world/triggers.js` |
| Portal con `Box3` y espera (*cooldown*) de 3 s | Hecho | Portal de la cascada a la cornisa (`src/interaction/portal.js`) |
| Zona sonora: `PositionalAudio` en un emisor con distancia de referencia y máxima | Hecho | Cascada (3 a 25 m) |
| Sonido global del portal | Hecho | `THREE.Audio` al cruzarlo |
| Desbloqueo del audio con el primer clic | Hecho | El audio empieza al pulsar Jugar (o con el primer clic en la demostración) |
| HUD sobre el canvas con `pointer-events: none`, zona y coordenadas | Hecho | Cuaderno de la cartógrafa |
| Partículas de agua con gravedad y `needsUpdate = true` | Hecho | Cascada (`src/fx/particles.js`) |
| Ajuste al cambiar el tamaño de la ventana | Hecho | `src/core/renderer.js` (`ajustarAlRedimensionar`) |
| Archivos en minúsculas y sin espacios | Hecho | `public/models/`, `public/sounds/`, `public/videos/` |
| Siguiente paso: tercera persona con WASD y colisiones sólidas | Hecho | Victoria completa |

### Semana 10 · Física real con Cannon y check-list

| Tema de la clase | Estado | En el juego |
|---|---|---|
| Arquitectura espejo física / render | Hecho | `src/core/physics_world.js` |
| Mundo con gravedad −9,81, suelo de masa 0, cuerpo dinámico, `step(1/60, dt, 3)` y copia de posición y giro | Hecho | Igual que en la clase |
| Check-list de 8 requisitos | Hecho | Sección 1 de este documento |

---

## 3. Errores comunes de la clase (semana 9) y cómo se evitan

| Problema | Cómo se evita en el juego |
|---|---|
| No suena nada (autoplay bloqueado) | El audio empieza con el clic de «Jugar» |
| Variable usada antes de declararla | El código se revisa con `npm run check` (tipos) y 101 pruebas |
| El portal teletransporta en bucle | Espera de 3 s y punto de llegada fuera de la caja del portal (probado en `tests/zona1_simulacion.test.js`) |
| La cámara salta al teletransportar | `rig.reorientar` tras cada salto; las cinemáticas se mezclan con la cámara de juego |
| Errores 404 por nombres | Nombres en minúsculas, sin espacios, rutas absolutas |

---

## 4. Entregables

| Entregable | Estado | Dónde |
|---|---|---|
| Repositorio público con el código estructurado | Hecho | https://github.com/Valery-Rosero/ElTemploDelSol |
| Video de 30 a 60 s con el audio activado | Por grabar | Guion listo en [GUION_VIDEO.md](GUION_VIDEO.md) |
| Ficha del concepto (PDF, una página, con el nombre al final) | Por completar | Borrador en [FICHA_CONCEPTO.md](FICHA_CONCEPTO.md): falta poner los nombres y exportar a PDF |
| Entrega en un `.rar` sin contraseña con los tres archivos | Por hacer | Confirmar el formato y la carpeta con el docente |
| Demostración en vivo | Lista | Modo demostración y [CONTROLES.md](CONTROLES.md) |
