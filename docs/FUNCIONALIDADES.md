# Funcionalidades

Lo que tiene el juego y cómo se comprobó. «Prueba» es una prueba automática de `npm test`; «captura» es una revisión con capturas del juego real en Chrome.

## Historia y cinemáticas

| Funcionalidad | Cómo se comprobó |
|---|---|
| Nueve cinemáticas (introducción, brazalete, llegada al puente, puerta de los espejos, despertar, fases 2 y 3, derrota y final), diseñadas primero en un guion gráfico con lente, ángulo, movimiento e intención de cada plano | Captura del centro de cada plano comparada con su viñeta (`tests/cine.test.js` para el reproductor) |
| Mezcla suave con la cámara de juego al terminar cada cinemática; todas se saltan manteniendo Espacio 1 s | Prueba |
| Diálogos con subtítulos y voces sintetizadas (murmullo con el timbre de cada personaje); la cara de quien habla se mueve con el texto | Captura y prueba de las voces |
| Cuando habla Mateo desde dentro del Guardián, el núcleo late y asoma su silueta; cuando habla la gema, brillan las runas | Captura |
| Seis páginas del diario de Mateo que se leen con E | Captura |

## Jugabilidad

| Funcionalidad | Cómo se comprobó |
|---|---|
| Victoria: correr, saltar, esquivar, tres poderes (Pulso solar, Escudo arcano, Manipulación ancestral) | Prueba |
| Zona 1, la selva: claro, cascada con portal, cornisa, puente que se derrumba, ruinas y pórtico | Prueba del recorrido completo |
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
| Opciones: volúmenes (general, música, efectos, voces), sensibilidad, sacudida, subtítulos y calidad | Captura |
| Modo foto (F) con `OrbitControls` | Captura |
| Modo demostración con los 8 requisitos | Captura |

## Rendimiento

| Funcionalidad | Cómo se comprobó |
|---|---|
| Tres niveles de calidad elegidos según la tarjeta gráfica; bloom en media y alta | Captura comparando baja y media |
| Resolución dinámica con histéresis | Prueba (`tests/resolucion.test.js`) |
| Escenario dibujado por una sola cara, luz del cielo en armónicos esféricos y grupo fijo de luces puntuales | Medición del tiempo de dibujo por zona con `&stats` |
