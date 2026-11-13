# Funcionalidades

Lo que tiene el juego y cómo se comprobó. «Prueba» es una prueba automática de `npm test`; «captura» es una revisión con capturas del juego real en Chrome.

## Historia y cinemáticas

| Funcionalidad | Cómo se comprobó |
|---|---|
| Once cinemáticas (introducción, brazalete, «La llave», llegada al puente, puerta de los espejos, despertar, fases 2 y 3, derrota, final y el epílogo «La marcha»), diseñadas primero en un guion gráfico con lente, ángulo, movimiento e intención de cada plano | Captura del centro de cada plano comparada con su viñeta (`tests/cine.test.js` para el reproductor) |
| Las cinemáticas van con el reloj real (el de la música y los subtítulos): un fotograma lento no las desfasa; la pausa detiene también el sonido; saltarlas no deja diálogo sonando después | `tests/cine_tiempos.test.js`: cada línea termina dentro de su cinemática y de su plano, el reloj no se atrasa y el salto no entrega el diálogo |
| Todos los sombreadores se compilan en la pantalla de carga (las dos atmósferas, sombras y profundidad de campo incluidas) | En las 10 cinemáticas, el número de programas antes y después es el mismo: ningún tirón por compilar |
| Partida guardada en el navegador (pilares, escenario, poderes, páginas, escudo, acertijo, cinemáticas vistas); al caer se reaparece en el escenario actual; «Continuar» en el menú | `tests/guardado.test.js`; captura: «Continuar» deja a Victoria en la sala de los espejos con lo que tenía |
| Sin caras superpuestas (z-fighting): el nicho del altar, los pasos entre salas, los anillos de las columnas, el suelo de la entrada de la arena y el pasadizo de la selva | `npm run zfighting` revisa todos los triángulos visibles de las tres zonas: santuario 0, selva y arena solo restos de centímetros donde no se llega |
| Bloom sin velo: el cielo (HDR) no brilla y un píxel inválido no se extiende por el cuadro | Hoja de contactos de las 10 cinemáticas en calidad media y alta: antes, con el cielo a la vista el cuadro quedaba lechoso (peor que en baja) y el primer plano de Mateo en la derrota salía negro |
| Epílogo: un ejército de 220 centinelas y 36 espectros (InstancedMesh, 6 llamadas de dibujo) baja del monte del este siguiendo el terreno; música sincronizada plano a plano y «Continuará…» | [GUION_EPILOGO.md](GUION_EPILOGO.md); prueba de que el negro llega con el golpe final de la música |
| Mezcla suave con la cámara de juego al terminar cada cinemática; todas se saltan manteniendo Espacio 1 s | Prueba |
| Diálogos con subtítulos, sin voz; la cara de quien habla se mueve con el texto | Captura |
| Cuando habla Mateo desde dentro del Guardián, el núcleo late y asoma su silueta; cuando habla la gema, brillan las runas | Captura |
| Seis páginas del diario de Mateo que se leen con E | Captura |

## Jugabilidad

| Funcionalidad | Cómo se comprobó |
|---|---|
| Victoria: correr, saltar, esquivar, tres poderes (Pulso solar, Escudo arcano, Manipulación ancestral) | Prueba |
| Zona 1, la selva: claro, cascada con portal, cornisa, puente que se derrumba, ruinas y pórtico | Prueba del recorrido completo |
| La Llave del Sol (tablero `docs/previews/llave_tablero.png`): tres cofres en la selva (a la vista al pie de la cabeza de piedra, escondido tras una ceiba y en una repisa junto a la cascada, saltando por las piedras de la poza), cada uno con un haz de luz y la marca de tiza de Mateo. La tapa se abre, el tercio sube, gira y vuela a la mano; el cuaderno lleva la cuenta. El arco de runas duerme hasta que se presenta la llave completa en el pedestal (cinemática «La llave»: los tres tercios se juntan y el de agua se queda); el jade abre la losa de las ruinas y el oro la puerta del santuario, y se hunden con ellas | `tests/llave.test.js`: las reglas, las piezas del nivel, los cofres se alcanzan caminando y la repisa saltando; el portal dormido no teletransporta; capturas de cada cofre, de la cinemática y de las dos cerraduras |
| Zona 2, el santuario: altar del escudo, centinelas, espectros y el acertijo de los espejos | Prueba del acertijo (las 512 combinaciones) y del recorrido |
| Zona 3, la cámara del sol: el Guardián en tres fases, pilares solares, ataques anunciados, invocación de espectros | Prueba: camina, salta en el golpe sísmico, solo recibe daño con el núcleo abierto |
| Escape cronometrado (75 s) con el puente roto y la llegada al amanecer | Prueba: la ruta limpia dura unos 23 s |
| Checkpoints, vida, flores que curan, muerte y reaparición | Prueba |

## Arte, sonido y música

| Funcionalidad | Cómo se comprobó |
|---|---|
| Todos los modelos generados con Python en Blender a partir de tableros de diseño (personajes, selva, interiores del templo) | Renders y capturas comparados con los tableros |
| Interiores del templo: arenisca tallada, frisos, columnas, murales de la leyenda, el campamento de Mateo, guardianes colosales | Capturas antes y después |
| Música sintetizada con un leitmotiv (selva, santuario, jefe, escape y tema final) que cambia con fundidos | Comprobación de niveles y de los empalmes de cada bucle |
| Partículas: cascada, fuego, polen, luciérnagas, chispas, brasas de la fase 3, polvo del derrumbe | Captura |

## Interfaz y opciones

| Funcionalidad | Cómo se comprobó |
|---|---|
| Cuaderno de la cartógrafa (zona, coordenadas, brújula, páginas), vida, poderes, barra del jefe, reloj del escape | Captura |
| Menú principal, pausa, pantalla de victoria con estadísticas | Captura |
| Opciones: volúmenes (general, música y efectos), sensibilidad, sacudida, subtítulos y calidad | Captura |
| Modo foto (F) con `OrbitControls` | Captura |
| Modo demostración con los 8 requisitos | Captura |

## Rendimiento

| Funcionalidad | Cómo se comprobó |
|---|---|
| Tres niveles de calidad elegidos según la tarjeta gráfica; bloom en media y alta | Captura comparando baja y media |
| Resolución dinámica con histéresis | Prueba (`tests/resolucion.test.js`) |
| Escenario dibujado por una sola cara, luz del cielo en armónicos esféricos y grupo fijo de luces puntuales | Medición del tiempo de dibujo por zona con `&stats` |
