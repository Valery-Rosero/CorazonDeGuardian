# El Templo del Sol Perdido: material para la presentación

Este documento reúne lo que hace falta para armar las diapositivas.
- **Sección 1:** los números del proyecto.
- **Sección 2:** una propuesta de diapositivas, cada una con su mensaje.
- **Sección 3:** cómo funciona cada parte por dentro, explicado sin jerga. Al final de cada punto va el nombre de la herramienta y qué hace.
- **Sección 4:** los datos curiosos: decisiones de diseño, de implementación, lo que se cambió por otra cosa y los problemas que aparecieron.
- **Sección 5:** respuestas cortas a preguntas probables.

---

## 1. Ficha rápida

| Dato | Valor |
|---|---|
| Género | Aventura 3D en tercera persona en el navegador, de 15 a 20 minutos |
| Tecnología | Three.js 0.160 (dibujo 3D), cannon-es 0.20 (física), Vite (servidor y empaquetado), Blender 5.2 con Python (modelos), numpy (sonido) |
| Escenarios | 3: la selva (≈50.000 triángulos), el santuario (36.972) y la cámara del sol (22.786) |
| Personajes | Victoria 2.577 triángulos · Mateo 1.566 · el Guardián 3.316 · centinela 678 · espectro 376 |
| Cinemáticas | 10, diseñadas plano a plano antes de construirlas |
| Sonidos | 54 archivos, **todos fabricados con código**: efectos, ambientes, voces y música |
| Pruebas automáticas | 101; algunas cargan los escenarios reales y hacen correr la física |
| Código | ≈12.000 líneas de JavaScript (juego) y ≈6.400 de Python (modelos, sonido y video) |
| Imágenes o sonidos descargados | **Ninguno** |

---

## 2. Propuesta de diapositivas

Cada diapositiva tiene un **mensaje** (la frase que debe quedar) y **qué mostrar**.

1. **Portada.**
   - Título, equipo y una captura del final al amanecer.
2. **La historia.**
   - Mensaje: «Una hija busca a su padre y descubre que el monstruo es él».
   - Victoria, Mateo, la gema y el Guardián, en tres líneas.
3. **Todo es código.**
   - Mensaje: «No hay ni una imagen ni un sonido descargado».
   - Mostrar un script de Python al lado del modelo que genera.
4. **Diseño antes que construcción.**
   - Mensaje: «Primero se dibuja, después se construye exactamente eso, después se compara».
   - Mostrar un boceto al lado del modelo en el juego (`docs/previews/*_vs_*.png`).
5. **Los 8 requisitos del curso.**
   - Mensaje: «Todo se demuestra en vivo».
   - Mostrar el modo Demostración técnica.
6. **Requisitos 1 a 4.**
   - Escenario desde Blender, navegación, audio 3D y triggers.
   - Un punto por requisito, en palabras sencillas (sección 3).
7. **Requisitos 5 a 8.**
   - Partículas, física, interfaz y optimización.
8. **Contar con la cámara.**
   - Mensaje: «Cuando habla el padre, late el pecho; cuando habla la gema, brilla la máscara».
   - Mostrar un plano del despertar.
9. **Voces sin actores.**
   - Mensaje: «Las voces son un murmullo calculado con las vocales de cada frase».
   - Explicar cómo se fabrica (sección 4.2).
10. **Rendimiento.**
    - Mensaje: «Medir antes de optimizar».
    - Mostrar tres mediciones de antes y después (sección 4.3).
11. **Calidad: lo que encontramos al revisar.**
    - Mensaje: «Revisamos cada plano de cada cinemática».
    - Mostrar el bloom que velaba el cielo y el cuadro negro de la derrota, antes y después.
12. **El final abierto.**
    - Mensaje: «Un ejército de 256 criaturas con 6 llamadas de dibujo».
    - Mostrar el epílogo.
13. **Cierre.**
    - Lo que aprendimos y la demostración en vivo.

---

## 3. Cómo funciona por dentro

Cada punto dice primero **qué hace** el juego y después **qué herramienta lo hace**.

### Requisito 1. Escenario 3D hecho en Blender

- Un programa en Python arma cada pieza con cajas y prismas, pinta cada esquina de un color y guarda la zona entera en un archivo.
  - **Script de Python en Blender (`bpy`):** controla Blender por código para crear, colorear y exportar.
- El juego abre ese archivo y lo convierte en objetos que se pueden dibujar.
  - **`GLTFLoader`:** lee el archivo `.glb` (formas, colores, esqueletos y gestos de la cara).
- El sol ilumina desde una dirección y proyecta sombras.
  - **`DirectionalLight` con `castShadow`:** luz de rayos paralelos. Para saber qué queda en sombra, dibuja la escena vista desde el sol.
- Las sombras tienen el borde suave.
  - **`PCFSoftShadowMap`:** promedia varios puntos alrededor de cada píxel.
- Lo que no recibe sol no queda negro.
  - **`HemisphereLight`:** mezcla un color de cielo (arriba) y uno de suelo (abajo) según hacia dónde mira cada cara.
- Las antorchas alumbran a su alrededor.
  - **`PointLight`:** luz que sale de un punto y se apaga con la distancia.
- Un foco ilumina el altar del santuario.
  - **`SpotLight`:** la misma luz, pero en forma de cono, como una linterna.

### Requisito 2. Navegación

- Al hacer clic se esconde el puntero, y mover el ratón gira la vista.
  - **`PointerLockControls`:** captura el ratón y entrega cuánto se movió, aunque llegue al borde de la pantalla.
- La cámara no atraviesa paredes.
  - **`Raycaster`:** lanza líneas invisibles desde Victoria hacia la cámara. Si chocan, la cámara se acerca.
- En el modo foto, la vista gira alrededor de Victoria.
  - **`OrbitControls`:** mueve la cámara sobre una esfera imaginaria alrededor del punto que se mira.

### Requisito 3. Audio 3D

- Los oídos del jugador van en la cámara.
  - **`AudioListener`:** el «micrófono» de la escena.
- La cascada suena más fuerte de cerca y del lado donde está.
  - **`PositionalAudio`:** un sonido en un punto, que baja con la distancia y se reparte entre los dos oídos.
- La música y las voces suenan igual en todas partes.
  - **`Audio`:** un sonido sin posición.

### Requisito 4. Triggers (zonas que activan algo)

- Los pilares, las páginas y las flores se activan al acercarse.
  - **`Vector3.distanceTo`:** mide la distancia entre dos puntos y la compara con un radio.
- El portal y los cambios de zona son cajas invisibles.
  - **`Box3.containsPoint`:** dice si un punto está entre la esquina mínima y la máxima de una caja.
- Cada trigger avisa solo al entrar y al salir.
  - Se guarda si Victoria estaba dentro en el fotograma anterior, y el trigger actúa solo cuando eso cambia.

### Requisito 5. Partículas

- La cascada, el fuego y las chispas son miles de puntos dibujados de una vez.
  - **`Points`:** un cuadradito mirando a la cámara por cada punto, todos en una sola orden a la tarjeta gráfica.
- Sus datos viven en listas de números que se cambian en su lugar.
  - **`BufferGeometry` + `Float32Array`:** arreglos que la tarjeta lee directo.
- Cada partícula tiene velocidad, gravedad, frenado y vida, y al morir se recicla.
- Donde se juntan, brillan más.
  - **`AdditiveBlending`:** suma el color de cada partícula al que ya hay detrás.

### Requisito 6. Física

- Un mundo invisible calcula los pesos y los choques, y el mundo que se ve lo copia en cada fotograma.
- La física avanza siempre de 1/60 en 1/60 de segundo.
  - **`world.step(1/60, dt, 3)`:** calcula los pasos fijos que caben en el tiempo pasado (como mucho 3). Así todo se mueve igual en cualquier computadora.
- Hay tres tipos de cuerpo:
  - **Estático** (masa 0): el suelo y los muros.
  - **Dinámico:** las esferas, las tablas y los fragmentos.
  - **Cinemático:** el Guardián, que lo mueve el código y empuja a los demás.
- Cada pareja de materiales tiene su agarre y su rebote.
  - **`ContactMaterial`:** define la fricción y el rebote entre dos materiales.
- Solo se comparan los objetos cercanos.
  - **`SAPBroadphase`:** ordena los cuerpos por su posición y descarta los que no pueden tocarse.
- Los golpes suenan según su fuerza.
  - **Evento `collide`:** avisa del choque y entrega la velocidad del impacto.

### Requisito 7. Interfaz

- El «Cuaderno de la cartógrafa» muestra la zona, las coordenadas X, Y y Z en vivo y una brújula que gira con la cámara.
  - **HTML y CSS sobre el lienzo:** elementos de página encima del dibujo 3D. El texto solo se reescribe cuando cambia.
- La recarga de los poderes es un anillo que se llena.
  - **Variables CSS:** el código cambia un número y el estilo dibuja el anillo.

### Requisito 8. Optimización

- Un único ciclo actualiza todo, en el mismo orden en cada fotograma.
  - **`setAnimationLoop`:** el navegador llama a esa función antes de cada fotograma.
- Nada se crea durante el juego: proyectiles, partículas y fragmentos se crean al cargar y se reutilizan.
  - **Pools:** grupos fijos que se reciclan.
- Cientos de plantas iguales se dibujan de una vez.
  - **`InstancedMesh`:** una sola orden con una lista de posiciones.
- Siempre hay el mismo número de luces, que se mueven a las antorchas más cercanas.
  - Si el número de luces cambiara, la tarjeta reescribiría sus programas y el juego daría un tirón.
- Los programas de la tarjeta gráfica se preparan en la pantalla de carga.
  - **`compileAsync`:** compila de antemano el sombreado de cada material.
- La luz del cielo se resume en 9 colores.
  - **Armónicos esféricos:** una fórmula corta que da el color del cielo en cualquier dirección.
- Si el juego va lento, baja la resolución, y la sube cuando se recupera.
  - **Resolución dinámica:** mide cada fotograma y ajusta el tamaño del dibujo.

---

## 4. Datos curiosos

### 4.1 Decisiones de diseño

- **Victoria es cartógrafa, y por eso el HUD es su cuaderno.** La interfaz forma parte de la historia: no es un panel genérico.
- **Los ojos redondos de la máscara del Guardián recuerdan las gafas de Mateo.** Es la pista visual de la revelación. Al final, Mateo se acomoda las gafas: vuelve a ser él.
- **Motivos de cámara:**
  - Cuando habla Mateo desde dentro del Guardián, la cámara mira el pecho, y el núcleo late con cada sílaba.
  - Cuando habla la gema, la cámara mira la máscara.
  - La revelación se entiende sin texto.
- **La pirámide mide 84 m, no 22.** El primer diseño decía unos 22 m, pero la cima tiene que asomar por encima del risco de la cascada (26 m) para guiar al jugador desde casi toda la selva. Su cima dorada no tiene niebla, para que se vea desde 240 m.
- **El sol se movió de lado.** Los bocetos iluminan desde arriba a la izquierda y el juego tenía el sol a la derecha. Se cambió a 34° de altura para que el juego se parezca a sus dibujos.
- **Las cabezas de piedra miran hacia el camino**, no hacia la pirámide. Mirando a la pirámide, el jugador solo les veía la nuca.
- **El primer combate enseña el Pulso; el segundo, el Escudo.** Los dos centinelas del santuario duermen como estatuas hasta que Victoria toma el escudo.
- **Cada peligro se anuncia antes de golpear.** Es un pilar de diseño: el Guardián avisa con luz y sonido antes de cada ataque.
- **El final es abierto.** Al salir, un ejército marcha hacia ellos: la gema, ahora en el brazalete de Victoria, los llama.

### 4.2 Decisiones de implementación

- **Las voces son un murmullo fabricado a partir del texto.** Por cada sílaba se genera un pulso de voz con los formantes (las frecuencias que distinguen cada vocal), y la melodía baja al final de la frase y sube en las preguntas.
  - Victoria, Mateo y la gema tienen tonos distintos.
  - Cuando Mateo habla desde dentro del Guardián, se le suma un eco.
  - La gema habla en coro, con la misma voz un poco antes, un poco después y más grave.
- **La boca se mueve leyendo el subtítulo.** Cada letra se traduce a una forma de boca (una de 6 posiciones del español). La cara tiene 17 gestos que se mezclan: cejas, párpados, boca, parpadeo y mirada.
- **La música tiene un leitmotiv**, la canción de Victoria y Mateo:
  - en la selva suena completa y tranquila;
  - en el combate, deformada en metales graves;
  - al amanecer, en tono mayor.
- **Los sonidos en bucle se guardan en `.wav` y los cortos en `.mp3`.** El `.mp3` agrega un silencio al principio y, en un bucle, se oye un corte.
- **El Pulso solar no atraviesa objetos delgados.** A 30 m/s avanza 50 cm por paso de física y podía saltarse una tabla. Además de su cuerpo físico, en cada fotograma se revisa con un rayo el tramo que recorrió.
- **Los orbes de los espectros no usan física.** En cada fotograma se revisa su tramo con un rayo. Es más barato, y a 9 m/s nunca atraviesan nada.
- **Bajo las escaleras hay una rampa invisible.** El cuerpo de Victoria no sube peldaños de 40 cm, pero sube la rampa caminando.
- **Las tablas del puente tienen fricción 0 con Victoria** y 3 cm de rendija entre ellas. La simulación mostró que se atascaba en las rendijas.
- **El acertijo de los espejos se probó entero.** El rayo de luz se calcula en 2D, a 3 m de altura, y una prueba revisa las 512 combinaciones posibles de los espejos.
- **El santuario está a 600 m de la selva**, en el mismo mundo. Debajo de la pirámide, sus salas chocarían con la escalinata. Un fundido a negro oculta el viaje.
- **Las cinemáticas son datos, no código.** Cada plano dice dónde está la cámara, qué mira, qué lente usa (en milímetros, como en el cine) y cuánto dura. La lente fija el ancho de la imagen, así que el encuadre es el mismo en cualquier pantalla.
- **El ejército del final mide el terreno al cargar.** Lanza un rayo hacia abajo cada 2 m del monte y guarda las alturas, para que cada centinela pise la ladera sin calcular nada durante la escena.
- **El mural vivo es un video fabricado con código.** Cada cuadro se dibuja con Python, se une en un video y se muestra en grande sobre el muro este de la sala de los espejos, con su propio coro posicional y un subtítulo por escena que sigue el tiempo del video.
- **La portada de la carga es un fotograma del propio juego**, dibujado en calidad alta desde una cámara colocada a propósito: Victoria en el sendero y la pirámide con su cima dorada.
- **El final no tiene cortes desde el juego.** El primer plano arranca exactamente donde estaba la cámara del jugador y se aleja mientras Victoria corre sola hasta el borde. Mateo llega corriendo por el puente, porque venía detrás de ella en el escape. El amanecer empieza al salir del templo, bajo el fundido a negro.
- **La partida se guarda en el navegador.** El punto de reaparición solo avanza: volver a cruzar el vestíbulo no te devuelve al principio del santuario.

### 4.3 Medir antes de optimizar

Los tiempos son de un navegador sin tarjeta gráfica, así que valen las proporciones, no los milisegundos.

| Cambio | Antes | Después | Por qué funcionó |
|---|---|---|---|
| Dibujar solo la cara de adelante de cada superficie | 3.168 ms | 1.705 ms (−46 %) | Blender exporta todo «de doble cara» y se sombreaban las caras traseras de troncos, rocas y muros |
| Luz del cielo en 9 colores en vez de leer una imagen | 1.786 ms | 785 ms | Con superficies mates, la imagen solo aportaba luz difusa, y leerla era más de la mitad del fotograma |
| Número fijo de luces reales (3 a 6) que se mueven a las fuentes cercanas | 558 ms | 417 ms | Cada píxel paga todas las luces de la escena |
| Personajes con un esqueleto en vez de piezas sueltas | 26 llamadas de dibujo | 3 | Cada pieza suelta era una orden más a la tarjeta gráfica |
| Precompilar los sombreadores al cargar | 8 compilaciones durante el despertar | 0 | Cada compilación congela un fotograma, justo en las cinemáticas |

### 4.4 Lo que se cambió por otra cosa

| Antes | Después | Por qué |
|---|---|---|
| Personajes de piezas sueltas, una por parte del cuerpo | Una malla con esqueleto rígido | Victoria pasó de 26 a 3 llamadas de dibujo y cada centinela de 13 a 1 |
| Luz del cielo leída de una imagen del entorno | Armónicos esféricos (9 colores) | Cuesta la mitad y se ve igual. En calidad media y alta volvió la imagen del entorno, porque da los reflejos del cielo |
| Grabar voces con el equipo | Murmullo sintetizado | El curso pide que todo el sonido se genere con código. Una grabación con el mismo nombre de archivo lo reemplazaría |
| Orbes enemigos con cuerpo físico | Un rayo por fotograma | Más barato y sin atravesar objetos |
| Partir el escenario en trozos para dibujar menos | Se probó y se descartó | Con celdas de 30 y 45 m el tiempo fue el mismo y hubo más llamadas (325) |
| Panel de deslizadores de depuración siempre visible | Solo dentro de la Demostración técnica | Los valores ya son la configuración del juego; el panel queda para enseñar la herramienta |
| La cámara volvía sola detrás de Victoria | Se queda donde la pongas; R la recentra | Pedido de control al estilo de los juegos de acción. La vuelta automática quedó como opción |
| Disparar girando a Victoria hacia la mira | Apuntado sobre el hombro con clic derecho | Se apunta con el ratón y Victoria queda alineada con la cámara |
| Plano de la llegada al puente desde un costado | Picado cenital que se inclina hasta la fachada | Detrás de la cornisa hay un risco de 26 m: ningún punto veía a la vez a Victoria y la fachada |
| Plano final del epílogo desde detrás del ejército | Grúa detrás de Victoria y Mateo | La ladera es tan empinada que la tropa quedaba fuera del cuadro. Desde detrás de los dos, el ejército entero se ve encima de ellos |
| Bloom con un umbral de brillo | Bloom que ignora el cielo | El cielo es tan luminoso que cualquier umbral lo dejaba brillar y velaba todo el cuadro |

### 4.5 Problemas que encontramos al revisar (y cómo se resolvieron)

- **La calidad alta se veía peor que la baja.** El bloom tomaba el cielo, que es muchísimo más brillante que cualquier otra cosa, y lo derramaba sobre todo el cuadro como una neblina.
  - **Solución:** el cielo se marca en una imagen intermedia y el bloom lo ignora. Las antorchas, las runas y la gema siguen brillando.
- **Un plano de la derrota salía negro.** Un solo píxel con un valor inválido (una división por cero) se extendía con el desenfoque del bloom hasta cubrir la imagen.
  - **Solución:** los valores inválidos se limpian antes de desenfocar. Los primeros intentos usaron funciones que el navegador de prueba no compilaba y se cambiaron por comparaciones simples.
- **Las cinemáticas se atrasaban respecto a las voces.** Para que la física no se descontrole, el juego limita cuánto tiempo avanza cada fotograma. En un fotograma lento, la cámara se quedaba atrás mientras la voz seguía.
  - **Solución:** las cinemáticas usan el reloj real y la física sigue limitada.
- **Las voces seguían en la pausa.**
  - **Solución:** la pausa ahora detiene también el sistema de sonido.
- **«Dientes» sobre el nicho del altar.** El techo del nicho estaba metido en el muro, con su cara delantera en el mismo plano que la del muro, y la tarjeta gráfica alternaba píxel a píxel cuál dibujar (z-fighting).
  - **Solución:** se hizo una herramienta que revisa todos los triángulos de los tres escenarios. Encontró el mismo error en los pasos entre salas, los anillos de las columnas y el suelo de la arena. El santuario quedó en 0 caras superpuestas.
- **La cámara quedaba dentro del haz de luz del altar** y velaba la cara de Victoria.
  - **Solución:** los haces se desvanecen si la cámara se acerca, y el del altar se apaga cuando el brazalete vuela: su luz entra en él.
- **Al morir en el santuario se volvía a la selva.** Solo los pilares de la selva guardaban el punto de reaparición.
  - **Solución:** cada escenario guarda el suyo.

### 4.6 Cómo se comprobó todo

- **101 pruebas automáticas.** Algunas cargan los escenarios reales y hacen correr la física: recorren la selva entera, resuelven el acertijo, pelean con el Guardián y hacen el escape en menos de 75 s (la ruta limpia dura unos 23 s).
- **Hojas de contactos de las 10 cinemáticas.** Un programa abre el juego en Chrome sin ventana, avanza el tiempo de 1/15 en 1/15 de segundo y fotografía el centro de cada plano para compararlo con su viñeta.
- **Cada modelo junto a su boceto.** Las comparaciones están en `docs/previews/`.

---

## 5. Preguntas probables del profe

- **¿Usaron modelos o sonidos de internet?** No. Todo sale de código: los modelos, de Python en Blender; los sonidos y la música, de numpy; el video del mural, de Python con Pillow y ffmpeg.
- **¿Dónde están los 60 FPS?** En el menú, **Demostración técnica** → **Optimización** muestra los FPS, las llamadas de dibujo y los triángulos en vivo. Todo se crea al cargar y en pleno juego solo se reutiliza.
- **¿Por qué física de un paso fijo?** Para que el juego se comporte igual en cualquier computadora. Si el paso dependiera de los FPS, los choques, los rebotes y los saltos cambiarían de un computador a otro, y en uno lento un objeto rápido podría atravesar una pared.
- **¿Cómo saben que el acertijo siempre tiene solución?** Una prueba revisa las 512 combinaciones de los espejos.
- **¿Qué pasa en un computador lento?** Hay tres calidades y una resolución dinámica que baja el tamaño del dibujo si no se llega a ~55 FPS.
- **¿Qué fue lo más difícil?** Elijan entre:
  - que las cinemáticas se vean bien en el tiempo correcto (reloj, sombreadores, bloom);
  - que la cámara no atraviese paredes;
  - que el puente se rompa sin que Victoria se atasque.
