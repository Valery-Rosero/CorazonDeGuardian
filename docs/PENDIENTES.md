# Pendientes, decisiones y desvíos del documento maestro

## Decisiones aprobadas por el productor

| Fecha | Decisión | Sección del documento | Motivo |
|---|---|---|---|
| 2026-11-10 | Cada personaje es **una malla con esqueleto rígido** (cada vértice pesa 100 % en un hueso) en lugar de piezas sueltas emparentadas. La animación por código es la misma: el `ProceduralAnimator` gira huesos en vez de mallas. | 4.5 | Victoria pasa de 26 a 3 llamadas de dibujo y cada centinela de 13 a 1. El equipo de referencia tiene gráficos integrados (Intel Iris Xe). |
| 2026-11-10 | Los personajes que hablan (Victoria y Mateo) tienen **cabeza aparte con 17 formas de expresión** (shape keys → morph targets): cejas, párpados, boca, 6 visemas del español, parpadeo y mirada. La boca sigue el texto del subtítulo. | 3.4, 4.5 | El productor pidió expresiones y movimiento fluido en los diálogos. Costo: +≈600 triángulos y +1 llamada por personaje. |
| 2026-11-10 | Las piezas sueltas con física se usan solo donde hacen falta: fragmentos del centinela al morir y caparazón del Guardián en la derrota. | 4.5, 7.3 | Se mantiene el comportamiento del documento. |
| 2026-11-11 | La selva, las rocas, los riscos y las ruinas se construyen **desde la hoja de escenarios** (canvas «Hoja de escenarios — Templo del Sol»), igual que Victoria desde su boceto. Cada pieza se compara con su dibujo en `docs/previews/escenario_vs_hoja_*.png`. | 4.1, 8.1 | El productor pidió coherencia: «no construyas por construir». |

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

## Decisiones técnicas del día 3

| Decisión | Motivo |
|---|---|
| El Pulso solar es un cuerpo sensor de cannon-es (como pide la sección 5.5) y **además** barre con un rayo el tramo que recorre en cada fotograma. | A 30 m/s avanza 50 cm por paso de física y podía atravesar objetos delgados. |
| Impulso del Pulso: **40 N·s**. | Con 16, una esfera de 25 kg apenas se movía. |
| La **losa de las ruinas** cierra lo alto de la escalinata hasta que se usa la Manipulación. | El documento pide «una losa que se mueve al activarla con E»; así la Manipulación es necesaria para avanzar. |
| Las páginas del diario solo se pueden leer con la Manipulación desbloqueada; el brazalete se toma con E desde el principio. | La sección 5.5 dice que la Manipulación «lee páginas del diario». |
| Mientras el diario está abierto el juego se detiene, pero el ratón sigue capturado. | Se lee sin salir del juego. Esc lo cierra y abre la pausa. |
| El cargador ignora las mallas hijas de un objeto especial (`dyn_losa_1` → `dyn_losa_1_1`). | GLTFLoader divide los objetos con varios materiales en mallas hijas que heredan el nombre; la simulación mostró que se creaban cuerpos físicos de más. |
| El menú «Reiniciar la aventura» recarga la página. | El menú principal llega el día 6. |
| La tecla **8** de depuración aplica 20 de daño mientras no exista el jefe. | Permite probar el escudo, la esquiva y la barra de vida. |

## Selva desde la hoja de escenarios

| Decisión | Motivo |
|---|---|
| Cada especie se arma con las coordenadas de su dibujo (píxeles del SVG → metros según la altura del ejemplar). Una semilla cambia altura, giro y almohadas. | Las proporciones del 3D son las del dibujo y no hay dos árboles iguales. |
| Ceibas y palmas junto al sendero son objetos propios (se aclaran si tapan a Victoria). Los **árboles jóvenes** son una InstancedMesh con viento suave (0,12) y colisionador en el tronco; no se quitan con la calidad baja (`fijo`). | La hoja pide muchos jóvenes «casi sin costo». |
| El **sol** pasa a 34° de elevación y 115° de azimut: arriba a la izquierda de la cámara que mira por el sendero. `config/level.js` y `tools/blender/common.py` (SOL) usan la misma dirección. | Las hojas iluminan desde arriba a la izquierda: izquierda y arriba claras, frente medio, derecha oscura. Antes el sol venía de la derecha. |
| La piedra se pinta en tono medio del lado del sol y oscuro en la sombra; el sol real pone el tono claro. | Pintado claro y además iluminado, la piedra se veía casi blanca («riscos pálidos»). |
| El **borde dorado** de las copas es un brillo de contorno en el shader (`agregarBordeSol`), solo en las caras que miran al sol. | Pintado en las caras, el dorado cubría caras enteras; en la hoja es solo una línea en el borde. |
| Las hojas de palma usan el material `selva_hojas_doble` (doble cara). | Son láminas de una cara. |
| Las **cabezas de piedra** miran hacia el camino por el que llega Victoria (la hoja se corrigió). | Mirando a la pirámide, el jugador solo veía su nuca y la cara quedaba siempre en sombra. |
| La **pirámide** mide 84 m (la hoja se corrigió; decía ≈ 22 m). | La cima tiene que asomar por encima del risco de la cascada (26 m) para guiar desde casi toda la zona. |
| La escalinata de las ruinas tiene 6 peldaños de 40 cm con alfardas; la rampa invisible se ensanchó a las alfardas. | Así lo dibuja la hoja; la simulación confirma que se sube caminando. |
| Los riscos son capas apiladas (`rock_builder.estratos`). En la cornisa y la meseta la capa de arriba coincide con el colisionador; en la cascada los lados que tocan el agua quedan a ras (`a_ras`). | Victoria camina sobre la cornisa y la meseta, y la cortina de agua cae pegada a la roca. |
| Presupuesto: 49.368 de 50.000 triángulos sin contar las instancias. Para no pasarse hay 20 ceibas de fondo en vez de 22. | Límite de la sección 4.2. |

## Decisiones técnicas del día 4

| Decisión | Motivo |
|---|---|
| El santuario se diseñó primero como tablero de la hoja de escenarios («Zona 2 · El santuario») y se construyó con sus medidas exactas (`docs/previews/santuario_vs_tablero.png`). | Misma regla que la selva y Victoria: nada se construye sin su diseño. |
| El santuario es otro `.glb` (`zona_2_santuario.glb`) colocado lejos de la selva (y = -600 en Blender). Se entra por el pasadizo detrás de la puerta del pórtico, con fundido a negro. | La escalinata de la pirámide atravesaría las salas si el santuario estuviera debajo. El fundido además oculta el cambio de luces. |
| La puerta del pórtico (`dyn_puerta_santuario`) se abre con la Manipulación, como la losa. | La sección 8.1 dice que el pórtico lleva al santuario; ahora se puede entrar. |
| Las luces llevan grupo (1 selva, 2 santuario) y solo se enciende el de la zona donde está Victoria. El santuario usa 7. | Cada luz puntual cuesta en todos los píxeles; con todas encendidas la Iris Xe calcularía 11 (4 de la selva y 7 del santuario). |
| Dentro del santuario: niebla azul oscura, sin sol ni luz del cielo, y un hemisferio azul más fuerte (`config/level.js`, `INTERIOR`). | Penumbra azul del tablero; sin la luz del cielo hacía falta más hemisferio para que se lea. |
| Los enemigos se construyen desde sus tableros de la hoja de personajes (`docs/previews/enemigos_vs_boceto.png`): centinela de 678 triángulos y espectro de 376, dentro de su presupuesto. | Coherencia con los bocetos aprobados. |
| El ojo del centinela es un material propio por centinela (2 llamadas por centinela en vez de 1). | El ojo cambia de color según el estado y no puede ser un color por vértice compartido. |
| Las runas del centinela van en color por vértice y no brillan; solo el ojo cambia de color. | En el tablero, al cambiar de estado solo cambia el ojo. |
| Los huesos del espectro llevan el prefijo `esp_`. | Comparte el `.glb` con el centinela y GLTFLoader renombra los nombres repetidos. |
| Los orbes no son cuerpos de cannon-es: cada fotograma se barre su tramo con un raycast contra el escenario y con la distancia al cuerpo de Victoria. | Más barato y no atraviesan a 9 m/s. |
| El primer centinela vigila la escalinata de las ruinas (zona 1). Los dos del santuario duermen como estatuas hasta que Victoria toma el escudo. | El primer combate se aprende con el Pulso; el segundo enseña el escudo justo cuando se consigue. |
| Las cabezas de piedra y los bloques tallados tienen colisionador. | Antes se podían atravesar. |
| Al reaparecer, los enemigos vivos vuelven a su puesto con la vida completa; los muertos siguen muertos. | El jugador no repite peleas ya ganadas. |
| El rayo del acertijo se calcula en 2D (segmentos que reflejan por las dos caras) a 3 m de altura. | Pasa por encima de Victoria y de los espectros; la prueba revisa las 512 combinaciones: ninguna queda bloqueada. |

## Decisiones técnicas del día 5

| Decisión | Motivo |
|---|---|
| La cámara del sol se diseñó primero como tablero («Zona 3 · La cámara del sol») y se construyó con sus medidas (`docs/previews/camara_vs_tablero.png`). El Guardián y Mateo salen de sus bocetos (`docs/previews/jefe_vs_boceto.png`): 1.858 y 1.566 triángulos. | Misma regla de siempre: primero el diseño, después la construcción. |
| La arena es otro `.glb` (`zona_3_camara.glb`) pegado a la antesala, a la altura donde termina su rampa (z = -3 en Blender). Del santuario a la arena se pasa caminando, sin fundido; la zona se decide por la posición. | La antesala ya baja 3 m hacia la puerta: la arena continúa el recorrido sin cortes. |
| Luces del grupo 3 (cámara): 3 puntuales. | Igual que en el santuario, solo se enciende el grupo de la zona donde está Victoria. |
| El Pulso solo daña al Guardián con el núcleo abierto (los 3 pilares solares encendidos) y si el golpe llega cerca del pecho. | Obliga a usar los pilares y a acercarse; un golpe en los pies no cuenta (la prueba lo revisa). |
| Las placas del pecho son piezas aparte con el origen en su bisagra, y el núcleo es su propia malla con un sombreado de remolino. | Se abren girando como en el boceto y el núcleo se ve detrás. |
| Las cinemáticas son datos (`src/cinematics/guardian_cines.js`): despertar, fase 2, fase 3, derrota y final. Se saltan manteniendo Espacio 1 s, y tras morir las ya vistas se saltan solas. | Sección 9.1. Se ajustan los planos sin tocar el reproductor. |
| Escape: 75 s y faltan las tablas 3 y 4 del puente. La salida del vestíbulo lleva con fundido al pasadizo del pórtico. | La ruta limpia ronda 23 s (`tests/escape_simulacion.test.js`): queda margen para las rocas, los tropiezos y un checkpoint. |
| El final ocurre en la cornisa al amanecer: Victoria mira al este, hacia el sol, y Mateo sale del portal de runas detrás de ella. | Lo dice el tablero de la cámara; mirando al este el sol queda de frente, en silueta. |
| El menú principal es básico: jugar y opciones de volumen, sensibilidad del ratón y sacudida de cámara, guardadas en `localStorage`. | Lo mínimo para jugar de principio a fin; el resto de opciones queda para el día 6. |
| Los personajes no tienen voz: los diálogos van solo con subtítulos y la boca de quien habla. Se quitaron el murmullo sintetizado (`public/sounds/voz/`) y la opción «Voces». | Lo pediste el 11/11; los demás sonidos se quedan. |
| Parámetros de depuración: `&final=derrota`, `&final=amanecer` o `&final=epilogo` saltan al final del combate, al amanecer o al epílogo; `&tcine=N` adelanta N segundos la siguiente cinemática y `&pasofijo=N` avanza 1/N s por fotograma (capturas en tiempos exactos sin GPU). | Chrome sin ventana dibuja pocos fotogramas: sin ellos no se pueden revisar los planos. |

## Rendimiento (tras medir ~30 FPS en el equipo de referencia)

Medido con Chrome sin ventana y swiftshader a 1920 × 1080: el tiempo absoluto no es el de la Iris Xe, pero sí la proporción de cada parte. Herramienta: `&stats` muestra llamadas, triángulos, luces y la escala de resolución.

| Decisión | Medición | Motivo |
|---|---|---|
| El escenario se dibuja por una sola cara; solo las hojas de un plano (`doble`, helechos, pasto) son de doble cara. | Selva: 3.168 → 1.705 ms (−46 %). | Blender exporta todo como `doubleSided`: se sombreaban las caras traseras de troncos, rocas y muros. |
| La luz del cielo pasa de mapa de entorno (PMREM) a armónicos esféricos (`CIELO_SH`), calculados del mismo cielo. Al amanecer se recalculan con el cielo rosado. | Selva: 1.786 → 785 ms; meseta: 3.580 → 1.598 ms. | Con rugosidad 0,92 el entorno solo aportaba luz difusa; muestrearlo era más de la mitad del fotograma. Se ve igual. |
| Solo hay 3 luces puntuales reales en calidad baja (4 en media y 6 en alta). Toman la posición de las fuentes más cercanas a la cámara, con un fundido al cambiar. La luz del núcleo del Guardián es una fuente más. | Santuario: 558 → 417 ms. | Cada píxel paga todas las luces de la escena. El número nunca cambia, así que no se recompilan los shaders. |
| Resolución dinámica (`src/core/dynamic_resolution.js`): si no llega a ~55 FPS dibuja a menos resolución, hasta el 67 %, y vuelve a subir con histéresis. `&resolucion=fija` la desactiva. | Prueba `tests/resolucion.test.js`. | Red de seguridad para llegar a 60 FPS en la Iris Xe sin poder medirla desde aquí. |
| No se parte el escenario en trozos. | Probado con celdas de 30 y 45 m: el mismo tiempo y más llamadas de dibujo (325). | El sobredibujado no era el problema. |
| `Material.clone()` no copia `onBeforeCompile`: se usa `clonarMaterial()`. | — | Sin eso, los objetos interactuables perdían la luz del cielo. |

## Historia y cinematografía (día 6)

Guion gráfico con las nueve cinemáticas, cada viñeta junto a su captura del juego: https://claude.ai/artifact/AYcTKYeEyFFgUgv9WxaYBK

| Decisión | Motivo |
|---|---|
| Cada cinemática se diseña primero como guion gráfico (tamaño de plano, ángulo, lente, movimiento, sonido e intención), se construye y se compara contra capturas del juego. | Pediste que la historia y la cinematografía estén muy bien construidas; misma regla de coherencia que los tableros. |
| Motivos visuales: cuando habla Mateo, el plano es el pecho (el núcleo late y asoma su silueta con cada sílaba); cuando habla la gema, la máscara (sus runas brillan con su voz). Los ojos redondos de la máscara recuerdan las gafas de Mateo; al final, él se las acomoda. | La revelación se entiende sin texto (pilar «poco texto y mucha intención»). |
| Lentes en milímetros con campo horizontal fijo; 18–24 mm para los grandes planos y 65–85 mm para los primeros planos. Al terminar, la cámara se mezcla con la de juego (1–1,6 s). | Encuadre igual en cualquier pantalla; caras sin deformar; sin saltos al volver al juego. |
| Nuevas: introducción (con la roca del mirador, el mapa de Mateo dibujado con código y niebla espesa en los planos aéreos), brazalete, llegada al puente y puerta de los espejos. | Sección 9.4. Las cuatro líneas aprobadas tienen su momento en cuadro. |
| La partida empieza sobre la roca del mirador, en el claro de entrada. | La intro pide a Victoria «en lo alto de una roca»; la roca usa su propio azar para no mover nada de la selva. |
| El despertar dura 18,5 s, las fases 2 y 3 tienen dos planos y la derrota es plano y contraplano sin cruzar el eje. | La voz de Mateo necesita su plano; la respuesta de Victoria va en cuadro. |
| En el puente, el plano va de cenital sobre Victoria a la fachada; el plano general del despertar es la mirada del Guardián. | El terreno no permite el encuadre original (risco de 26 m detrás de la cornisa; muro de la arena a 16 m). |
| Durante la derrota se retiran los trozos del caparazón que se cruzan entre la cámara y Mateo. | Caen con impulso al azar y a veces tapaban el primer plano. |
| Se arregló un fallo del reproductor: con dos puntos, la mira se quedaba en el punto final (`tests/cine.test.js`). | Ninguna panorámica se movía. |

## Día 6: el juego completo

| Decisión | Motivo |
|---|---|
| Modo demostración (menú o `?demo`) con los 8 requisitos, triggers y colisionadores visibles, estadísticas y cámara libre. | Sección 1.4: la sustentación se hace desde ahí. |
| Modo foto con `OrbitControls` (F o desde la pausa). | Requisito 2 del curso. |
| `SpotLight` sobre el altar del escudo; su sombra solo en calidad alta. | Requisito 1 y tabla de la sección 14.3. |
| Música sintetizada (`tools/audio/music_synth.py`) con un leitmotiv; los bucles van en `.wav` para empalmar sin silencio. | Sección 11. Un `.mp3` añade silencio al empezar y el bucle se oiría cortado. |
| Bloom en calidad media y alta; profundidad de campo en las cinemáticas en alta. | Sección 14.3. |
| Opciones completas (volúmenes por categoría, subtítulos y calidad). La calidad se aplica al recargar. | El renderizador se crea al empezar. |
| Santuario y arena reconstruidos desde la hoja «Interiores del templo», con las mismas medidas y colisiones de juego. | Pediste mucho más detalle; las medidas sostienen el acertijo, el combate y las pruebas. |
| El Guardián acepta los pasos que lo acercan al centro de la arena; en el golpe sísmico salta. | Se quedaba clavado en el trono (estaba fuera de su radio de movimiento). |
| Tecla 8: el Guardián en fase 3. | Sección 19: la ruta de la sustentación. |
| No se recorta calidad para la Iris Xe: el rendimiento se medirá en una computadora con tarjeta dedicada. | Lo pediste así. |

## La gran pirámide (rediseño)

| Decisión | Motivo |
|---|---|
| La pirámide se diseñó primero en su tablero (`docs/previews/piramide_tablero.png`, dibujado por `tools/disenos/tablero_piramide.py`) y se construye con las mismas medidas (`tools/blender/diseno_piramide.py`). Comparación: `docs/previews/piramide_vs_tablero.png`. | Antes eran cinco cajas lisas; pediste más diseño. Misma regla de coherencia: primero el dibujo. |
| Siete cuerpos de talud, tablero con friso de soles y cornisa; escalinata única de 118 peldaños entre alfardas, con dos cabezas solares al pie; templo de tres puertas con crestería y sol dorado; musgo, lianas, árboles jóvenes y bloques caídos. Misma huella (96 m) y altura (84 m). | Sigue guiando desde toda la selva y no toca la meseta ni los planos de las cinemáticas. |
| Presupuesto de la selva: de 50.000 a 70.000 triángulos (usa 67.768; la pirámide suma unos 12.600 y el pórtico, la orilla y la isla unos 5.800). | La computadora de prueba tiene tarjeta dedicada. |
| El cielo acompaña a Victoria. | Es una caja de 400 m: una cámara lejos del centro del mundo quedaba fuera y veía negro. |

## El pórtico del santuario, el atrio y el lago

| Decisión | Motivo |
|---|---|
| El pórtico se diseñó en su tablero (`docs/previews/fachada_tablero.png`, de `tools/disenos/tablero_fachada.py`) con las medidas de `tools/blender/diseno_fachada.py`, las mismas que usa el constructor. Comparación: `docs/previews/fachada_vs_tablero.png`. | La fachada era una caja lisa (y sus soles y columnas habían quedado detrás del muro). Mismo lenguaje que la pirámide. |
| Talud, friso oscuro con cuatro soles, jambas claras, dintel escalonado, cornisa con almenas, crestería con el sol de oro, pórtico de dos columnas con viga y dos sacerdotes del sol de piedra (los del santuario, en gris). La puerta sigue igual: 4,4 × 6,4 m. | La puerta, el pasadizo y la transición al santuario no cambian. |
| El atrio es un patio cerrado: muro de 2,4 m al frente (de la losa a dos pilares en las esquinas) y a los costados hasta la fachada. Sus colisionadores suben 4 m sobre la terraza. | La losa se rodeaba por un lado. Ahora es la única entrada; una prueba intenta rodearla y saltarla desde nueve sitios (fallaba con la versión anterior). |
| Al recuperar una partida guardada en el santuario o la arena, y al salir del santuario en el escape, la losa y la puerta quedan abiertas. | Con el atrio cerrado, Victoria quedaría encerrada en el escape. |
| Un lago llena el valle entre los montes (nivel −1 m): la selva baja a su orilla, la pirámide está en una isla, el abismo bajo el puente es agua con rocas que asoman y hay montes también al norte. | El suelo terminaba en un vacío blanco. |
| El lago es un *shader* opaco (Fresnel hacia el color de la niebla, olas lentas y destellos del sol) que acompaña a la cámara y se oculta dentro del templo. Caer al agua es como caer al abismo: Victoria vuelve al último punto. | Una lámina transparente de cientos de metros cuesta más y se ordena mal; su borde nunca se ve. |
| La orilla, la isla y el lago tienen su propio azar. | Así no movieron nada de la selva ya aprobada. |
| Los anillos del tronco de las palmas van girados medio lado uno respecto al otro. | Dos anillos seguidos quedaban casi en el mismo plano en un lado del tronco y podían parpadear (lo encontró `npm run zfighting`). |

## Pendiente

- Medir los FPS en una computadora con tarjeta gráfica dedicada (calidad media y alta).
- Escuchar la música y los efectos en el juego y ajustar volúmenes.
- Grabar el video (`docs/GUION_VIDEO.md`) y completar la ficha (`docs/FICHA_CONCEPTO.md`) con los nombres del equipo.
- Publicar `dist/` en la raíz de un dominio (Netlify o Vercel) si se quiere un enlace directo.

## Notas técnicas

- **Blender 5.2** crea las formas nuevas con un valor distinto de 0. `common.agregar_formas` las deja en 0 para que el `.glb` cargue con la cara neutra (`tools/verificar_glb.py` lo comprueba).
- **Sombras en la cara:** la malla de la cabeza no debe proyectar sombras (`castShadow = false` en Three.js), pero sí recibirlas. Si la nariz y los párpados proyectan sombra, aparecen manchas en la cara.
- **Huesos en Three.js:** los huesos de Blender apuntan a lo largo del hueso (eje Y local), así que su rotación de reposo no es la identidad. El `ProceduralAnimator` debe aplicar las rotaciones en el espacio del personaje, precalculadas al cargar.
- **Poncho:** al levantar un brazo, este atraviesa el poncho. El animador debe levantar `poncho_delante` o `poncho_detras` junto con el brazo.
- `docs/previews/` guarda renders de revisión generados con `-- --preview`. No forman parte del juego.

## Herramientas fuera de la estructura de la sección 13

- `tools/blender/preview.py`: renders de revisión con sombreado toon.
- `tools/blender/build_escenario_preview.py`: renderiza cada pieza del escenario encuadrada como su dibujo (`docs/previews/escenario/`).
- `tools/blender/build_enemigos.py -- --preview` y `build_zona_2_santuario.py -- --preview`: renders para comparar con los bocetos y con el plano del tablero.
- `tools/verificar_glb.py`: inspección rápida de un `.glb` sin Blender. Cuando exista el proyecto Vite, su comprobación pasa a una prueba de `node --test` en `tests/`.
