# Cumplimiento del check-list del curso (semana 10)

Estado al **día 1** (2026-11-10). La meta del plan es tener los 8 requisitos funcionando en la zona 1 al final del día 2.

| # | Requisito | Estado | Dónde está en el código | Cómo demostrarlo |
|---|---|---|---|---|
| 1 | Escenario `.glb` desde Blender con iluminación y sombras | ✅ Nivel de prueba | `tools/blender/build_nivel_prueba.py` → `public/models/nivel_prueba.glb`; carga en `src/world/level_loader.js`; luces y sombras en `src/world/environment.js` (`DirectionalLight` con `PCFSoftShadowMap`, `AmbientLight` 0,22, `HemisphereLight`) | Recorrer el claro: Victoria, las rocas y los escalones proyectan sombra |
| 2 | Navegación con `PointerLockControls` / `OrbitControls` | ✅ `PointerLockControls` · ⏳ `OrbitControls` (modo foto) | `src/camera/camera_rig.js` | Mover el ratón durante el juego |
| 3 | Audio 3D: `PositionalAudio` + `THREE.Audio` | ⏳ Día 2 (ya existen el `AudioListener` y el desbloqueo con el primer clic) | `src/main.js` | — |
| 4 | Triggers radial (`distanceTo`) y AABB (`Box3`) | ✅ | `src/world/triggers.js` (`SistemaTriggers`); se crean a partir de `trg_box_*` y `trg_rad_*` | Pasar del claro a los escalones: el cuaderno cambia a «Ruinas escalonadas» |
| 5 | Partículas con `BufferGeometry` y física | ⏳ Día 2 (cascada) | — | — |
| 6 | Objeto dinámico con cannon-es (masa, gravedad, rebote) | 🟡 Victoria es un cuerpo dinámico con gravedad · ⏳ esferas rituales con rebote el día 2 | `src/player/player_controller.js`, `src/core/physics_world.js` | Saltar y caer desde los escalones |
| 7 | HUD HTML/CSS con zona y coordenadas | ✅ Cuaderno de la cartógrafa | `src/ui/cartographer_panel.js`, `index.html`, `src/style.css` | Siempre visible arriba a la izquierda |
| 8 | 60 FPS sin crear objetos en `animate()` | ✅ Bucle único sin crear objetos | `src/core/game_loop.js`; todos los temporales se crean al cargar | Panel de depuración: FPS y llamadas de dibujo |
