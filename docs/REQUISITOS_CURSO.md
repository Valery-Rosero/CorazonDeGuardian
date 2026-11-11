# Requisitos del curso (check-list de la semana 10)

Los 8 requisitos funcionan en el juego completo. Cada uno se puede demostrar en vivo desde el **modo demostración** (menú principal → «Demostración técnica», o `?demo`): al pulsar un requisito, Victoria va al lugar donde mejor se ve y aparece una explicación breve.

| # | Requisito | Dónde está en el código | Cómo demostrarlo |
|---|---|---|---|
| 1 | **Escenario `.glb` desde Blender, con iluminación y sombras** | Generadores en `tools/blender/` (`build_zona_1_selva.py`, `build_zona_2_santuario.py`, `build_zona_3_camara.py`, `build_jefe.py`, piezas en `*_builder.py`) → `public/models/*.glb`. Carga con `GLTFLoader` en `src/core/assets.js` y `src/world/level_loader.js`. Luces en `src/world/environment.js`: `DirectionalLight` con sombras `PCFSoftShadowMap` que sigue a Victoria, `AmbientLight` 0,22, `HemisphereLight`, luz del cielo en armónicos esféricos, `PointLight` en antorchas y braseros, y un `SpotLight` sobre el altar del santuario (`src/main.js`). | Requisito 1 de la demostración: sombras de Victoria, árboles y columnas en las ruinas. En el santuario, el foco cálido sobre el altar del escudo. |
| 2 | **Navegación con `PointerLockControls` y `OrbitControls`** | `src/camera/camera_rig.js`: tercera persona con `PointerLockControls`, colisión de cámara, perfiles por zona y recentrado. `src/camera/free_camera.js`: `OrbitControls` con amortiguación para el modo foto y la cámara libre de la demostración. | Mover el ratón durante el juego. Pulsar **F** (modo foto) o marcar «Cámara libre» en la demostración. |
| 3 | **Audio 3D: `PositionalAudio` y `THREE.Audio`** | `src/core/audio_manager.js`. `PositionalAudio` en la cascada, las antorchas, el núcleo del Guardián (latido) y los efectos en el mundo. `THREE.Audio` global para el portal, los checkpoints, las páginas, los poderes, las voces y la música (`src/core/music.js`). Todo el sonido se sintetiza en `tools/audio/audio_synth.py` y `music_synth.py`. El audio se activa con el primer clic. | Requisito 3 de la demostración: acercarse y alejarse de la cascada (el volumen cambia). Cruzar el portal de la cueva (sonido global). |
| 4 | **Triggers radial (`distanceTo`) y AABB (`Box3`)** | `src/world/triggers.js`. AABB (`Box3.containsPoint`): zonas del cuaderno, zonas de cámara, portal con enfriamiento, umbral de la arena, salida del escape, abismo. Radiales (`Vector3.distanceTo`): checkpoints, páginas, flores, objetos interactivos, detección de enemigos. | Requisito 4 de la demostración (con las cajas y anillos visibles): el cuaderno cambia de zona; el portal lleva a la cornisa y espera 3 s antes de volver a funcionar. |
| 5 | **Partículas con `BufferGeometry` y física** | `src/fx/particles.js`: `THREE.Points` + `BufferGeometry` + `Float32Array`, capacidad fija, gravedad, arrastre y reciclaje. `src/fx/particle_presets.js`: cascada, niebla, fuego, luciérnagas, polen, chispas del Pulso, ráfagas, brasas de la fase 3 y polvo del derrumbe. `AdditiveBlending` + `depthWrite: false`. | Requisito 5 de la demostración: la cascada y su espuma; las antorchas del altar. |
| 6 | **Objeto dinámico con cannon-es (masa, gravedad, rebote)** | `src/core/physics_world.js` (paso fijo 1/60) y `src/world/level_loader.js` (`crearDinamico`). Esferas rituales de 25 kg que ruedan y rebotan; tablas del puente que caen (`src/world/bridge.js`); fragmentos de los centinelas y del caparazón del Guardián (`src/enemies/fragments.js`); rocas del escape. Posición y cuaternión se copian de cannon-es a Three.js en cada fotograma. | Requisito 6 de la demostración: disparar el Pulso (clic) a las esferas del claro. Cruzar el puente. |
| 7 | **HUD HTML/CSS con la zona y las coordenadas** | `src/ui/cartographer_panel.js` («Cuaderno de la cartógrafa»), `src/ui/hud.js`, `index.html`, `src/style.css`. | Siempre visible arriba a la izquierda. En la demostración (requisito 7) se resalta. |
| 8 | **Optimización: 60 FPS sin crear objetos en `animate()`** | `src/core/game_loop.js`: un único bucle. Todo se crea al cargar: grupos de proyectiles, orbes, fragmentos, rocas, sonidos y luces; vectores temporales preasignados. Vegetación instanciada, grupo fijo de luces puntuales, luz del cielo en armónicos esféricos y resolución dinámica (`src/core/dynamic_resolution.js`). | La demostración muestra FPS, llamadas de dibujo y triángulos en tiempo real. |

## Contenidos de las semanas 1 a 9

| Semana | Dónde se usa |
|---|---|
| 1 | Escena, cámara, renderizador y bucle con `requestAnimationFrame` (`src/core/`) |
| 2 | `BufferGeometry`, materiales, `THREE.Group` (jerarquía de los personajes) y `lil-gui` (panel de depuración) |
| 3 | Audio espacial y desbloqueo del audio con el primer clic |
| 4 | Materiales PBR, catálogo de luces, *shadow maps* y partículas con mezcla aditiva |
| 5 | cannon-es: cuerpos estáticos, dinámicos y cinemáticos (el Guardián), materiales de contacto y paso fijo |
| 6 | Control con teclado, salto por impulso, cámara en tercera persona, proyectiles y `allowSleep` |
| 7 | `GLTFLoader`, carpeta `public/` con rutas absolutas, pantalla de carga y `MeshMatcapMaterial` (espectros) |
| 8 | Todo el arte se genera con scripts de Python en Blender, con presupuesto de polígonos por zona |
| 9 | Triggers radiales y AABB, zonas sonoras, portal con enfriamiento y partículas de agua con gravedad |

## Reglas técnicas obligatorias (sección 1.3)

- Recursos en minúsculas y sin espacios, en `public/`, cargados con rutas absolutas (`/models/...`, `/sounds/...`).
- Nada se crea dentro del bucle; la física avanza con paso fijo.
- El canvas ocupa toda la ventana y se adapta al cambiar su tamaño.
- El audio empieza tras la primera interacción.

## Pruebas automáticas

`npm test` ejecuta 93 pruebas. Las simulaciones (`tests/*_simulacion.test.js`) cargan los `.glb` reales y hacen correr la física sin gráficos: el recorrido completo de la selva, el acertijo de los espejos, el combate contra el Guardián (que camina, salta y solo recibe daño con el núcleo abierto) y el escape de la arena a la cornisa en menos de 75 s.
