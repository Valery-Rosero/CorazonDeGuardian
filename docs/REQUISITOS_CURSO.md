# Cumplimiento del check-list del curso (semana 10)

Estado al **día 2** (2026-11-11): **los 8 requisitos funcionan en la zona 1**, como pide el plan.

| # | Requisito | Dónde está en el código | Cómo demostrarlo |
|---|---|---|---|
| 1 | **Escenario `.glb` desde Blender con iluminación y sombras** | `tools/blender/build_zona_1_selva.py` y los constructores `*_builder.py` → `public/models/zona_1_selva.glb`. Carga en `src/world/level_loader.js`. Luces en `src/world/environment.js`: `DirectionalLight` con `PCFSoftShadowMap` que sigue a Victoria, `AmbientLight` 0,22, `HemisphereLight` y 4 `PointLight` (antorchas que parpadean y luz azul en la cueva). | Recorrer el claro: Victoria, los árboles, las esferas y el altar proyectan sombra. Las antorchas iluminan el altar, la cornisa y el pórtico. |
| 2 | **Navegación con `PointerLockControls` / `OrbitControls`** | `src/camera/camera_rig.js`: `PointerLockControls` con cámara en tercera persona, colisión, perfiles por zona, puntos de interés y recentrado. `OrbitControls` (modo foto) queda para el día 6. | Mover el ratón durante el juego. Al entrar en la cueva la cámara se acerca; en el puente sube y mira hacia abajo. |
| 3 | **Audio 3D: `PositionalAudio` + `THREE.Audio`** | `src/core/audio_manager.js`. `PositionalAudio` en la cascada (`emit_cascada`, modelo lineal de 3 a 25 m) y en las 6 antorchas. `THREE.Audio` global para el ambiente de la selva, el portal, los checkpoints, las flores, la derrota, los saltos y los pasos. Sonidos sintetizados en `tools/audio/audio_synth.py`. | Acercarse y alejarse de la cascada (el volumen cambia) y cruzar el portal (sonido global). |
| 4 | **Triggers radial (`distanceTo`) y AABB (`Box3`)** | `src/world/triggers.js`. AABB (`Box3.containsPoint`): zonas del cuaderno, zonas de cámara, portales, abismo. Radiales (`Vector3.distanceTo`): checkpoints, flores, área de la cascada. | El cuaderno cambia de zona; el portal de la cueva lleva a la cornisa con 3 s de enfriamiento; los pilares se encienden al pasar. |
| 5 | **Partículas con `BufferGeometry` y física** | `src/fx/particles.js` (`THREE.Points` + `BufferGeometry` + `Float32Array`, gravedad, arrastre y reciclaje) y `src/fx/particle_presets.js`: gotas y salpicaduras de la cascada, niebla, fuego de antorchas, luciérnagas, polen y ráfagas. `AdditiveBlending` + `depthWrite: false`. | La cascada y las antorchas; la ráfaga dorada al encender un pilar. |
| 6 | **Objeto dinámico con cannon-es (masa, gravedad, rebote)** | `src/world/level_loader.js` (`crearDinamico`) y `src/world/bridge.js`. Esferas rituales de 25 kg con restitución 0,6. Las 20 tablas del puente pasan de cinemáticas a dinámicas y caen. Posición y cuaternión se copian de cannon-es a Three.js en cada fotograma (`MundoFisico.sincronizar`). | Empujar las esferas del claro y cruzar el puente: las tablas tiemblan, caen y vuelven a los 3 s. |
| 7 | **HUD HTML/CSS con zona y coordenadas** | `src/ui/cartographer_panel.js`, `src/ui/hud.js`, `index.html`, `src/style.css`. Incluye barra de vida y notas en el cuaderno. | Siempre visible arriba a la izquierda. |
| 8 | **60 FPS sin crear objetos en `animate()`** | `src/core/game_loop.js`: bucle único. Partículas de capacidad fija, *pools* de audio de 8 + 8, temporales preasignados en cada sistema, materiales y vegetación creados al cargar. | Panel de depuración: FPS, llamadas de dibujo (~110 en el claro) y triángulos. |

## Pruebas automáticas que respaldan los requisitos

`npm test` ejecuta 41 pruebas. La simulación `tests/zona1_simulacion.test.js` carga el `.glb` real y hace correr la física sin gráficos para comprobar:

- aparecer, caminar, saltar 1,6 m y empujar una esfera;
- cruzar el puente mientras caen las tablas;
- caer al abismo y morir;
- el portal con su enfriamiento;
- subir la escalinata;
- los límites del mapa;
- **el recorrido completo del claro al pórtico del santuario**.
