# Pendientes, decisiones y desvíos del documento maestro

## Decisiones aprobadas por el productor

| Fecha | Decisión | Sección del documento | Motivo |
|---|---|---|---|
| 2026-11-10 | Cada personaje es **una malla con esqueleto rígido** (cada vértice pesa 100 % en un hueso) en lugar de piezas sueltas emparentadas. La animación por código es la misma: el `ProceduralAnimator` gira huesos en vez de mallas. | 4.5 | Victoria pasa de 26 a 3 llamadas de dibujo y cada centinela de 13 a 1. El equipo de referencia tiene gráficos integrados (Intel Iris Xe). |
| 2026-11-10 | Los personajes que hablan (Victoria y Mateo) tienen **cabeza aparte con 17 formas de expresión** (shape keys → morph targets): cejas, párpados, boca, 6 visemas del español, parpadeo y mirada. La boca sigue el texto del subtítulo. | 3.4, 4.5 | El productor pidió expresiones y movimiento fluido en los diálogos. Costo: +≈600 triángulos y +1 llamada por personaje. |
| 2026-11-10 | Las piezas sueltas con física se usan solo donde hacen falta: fragmentos del centinela al morir y caparazón del Guardián en la derrota. | 4.5, 7.3 | Se mantiene el comportamiento del documento. |

## Decisiones técnicas del día 2

| Decisión | Motivo |
|---|---|
| Los sonidos en bucle (cascada, antorcha, ambiente) se guardan en **.wav**; los efectos cortos, en .mp3. | El .mp3 añade silencio al inicio y al final, y en un bucle se oye un corte. Los bucles se sintetizan en el dominio de la frecuencia y empalman exactamente. |
| Checkpoint extra en la **cornisa**, además de los cuatro del documento. | Si Victoria cae del puente, reaparece junto a él y no al principio de la selva. |
| La escalinata de las ruinas tiene, bajo los escalones visibles, una **rampa invisible** como colisionador. | La cápsula física no sube peldaños de 0,8 m; así se sube caminando. |
| La cima de la pirámide usa un material propio **sin niebla**. | Es el hito que guía al jugador y debe verse desde el claro, a 240 m. |
| **Fricción 0** entre Victoria y las tablas o esferas. Rendija de 3 cm entre tablas. Si el rayo de suelo cae en una rendija, se usa el contacto como respaldo. | La simulación mostró que Victoria se atascaba en las rendijas del puente. |
| Teclas de depuración **1, 2 y 3**: entrada, cornisa y ruinas, mientras no existan las zonas 2 y 3. 6: invulnerable. 9: FPS. 0: triggers y colisionadores. | Sección 13.2, adaptada a lo que existe hoy. |
| Con `?auto` (solo en depuración) el juego arranca sin clic. `&ir=spawn`, `&pos=x,y,z,grados` y `&tecla=KeyW` sirven para capturas automáticas. | Permite revisar la escena con Chrome sin ventana. |

## Pendiente

- `OrbitControls` en el modo foto (día 6).
- Opciones de volumen y de sacudida de cámara en el menú (día 6). Los valores ya están en `src/config/audio.js` y en `Sacudida.intensidad`.
- Las flores solares solo curan si Victoria ha recibido daño; hasta que lleguen los enemigos (día 4) se ven, pero no hacen falta.
- Medir los FPS reales en el equipo de referencia (Iris Xe). Chrome sin ventana no sirve para medir rendimiento.

## Notas técnicas

- **Blender 5.2** crea las formas nuevas con un valor distinto de 0. `common.agregar_formas` las deja en 0 para que el `.glb` cargue con la cara neutra (`tools/verificar_glb.py` lo comprueba).
- **Sombras en la cara:** la malla de la cabeza no debe proyectar sombras (`castShadow = false` en Three.js), pero sí recibirlas. Si la nariz y los párpados proyectan sombra, aparecen manchas en la cara.
- **Huesos en Three.js:** los huesos de Blender apuntan a lo largo del hueso (eje Y local), así que su rotación de reposo no es la identidad. El `ProceduralAnimator` debe aplicar las rotaciones en el espacio del personaje, precalculadas al cargar.
- **Poncho:** al levantar un brazo, este atraviesa el poncho. El animador debe levantar `poncho_delante` o `poncho_detras` junto con el brazo.
- `docs/previews/` guarda renders de revisión generados con `-- --preview`. No forman parte del juego.

## Herramientas fuera de la estructura de la sección 13

- `tools/blender/preview.py`: renders de revisión con sombreado toon.
- `tools/verificar_glb.py`: inspección rápida de un `.glb` sin Blender. Cuando exista el proyecto Vite, su comprobación pasa a una prueba de `node --test` en `tests/`.
