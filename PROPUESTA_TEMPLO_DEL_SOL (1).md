# El Templo del Sol Perdido
### Propuesta de videojuego

> *Una hija sigue el mapa de su padre desaparecido hasta un templo perdido en la selva… y descubre que el guardián que lo protege es él.*

---

## 1. Ficha del proyecto

| | |
|---|---|
| **Género** | Aventura de acción 3D con exploración, plataformas y acertijos |
| **Perspectiva** | Tercera persona |
| **Jugadores** | Un jugador |
| **Plataforma** | Navegador web en PC (Chrome o Edge) |
| **Tecnología** | Three.js + cannon-es + Vite, con escenarios generados en Blender |
| **Curso** | Programación de Entornos Multimedia — proyecto integrador |
| **Duración del juego** | 15 a 20 minutos |
| **Plazo de desarrollo** | 7 días |
| **Público** | Mayores de 10 años |
| **Idioma** | Español |

---

## 2. Concepto

*El Templo del Sol Perdido* es una aventura corta y completa que combina exploración, combate mágico, acertijos de luz y un jefe final con carga emocional. El jugador controla a Victoria, una joven exploradora que usa un brazalete ancestral con tres poderes para atravesar una selva olvidada, un santuario en ruinas y la cámara donde duerme el Guardián del Sol.

### Pilares de diseño

1. **Belleza procedural.** Todo el arte, la animación y el sonido se generan por código, sin recursos descargados, y aun así el juego se ve cálido, cuidado y elaborado.
2. **Claridad.** Cada peligro se anuncia antes de golpear y cada objeto con el que se puede interactuar se distingue a simple vista.
3. **Emoción.** La historia entre padre e hija se cuenta con poco texto y mucha intención: páginas de un diario, miradas y un reencuentro.

### ¿Qué lo hace distinto?

- El jefe final no es solo un enemigo: es el padre de la protagonista, y el combate se resuelve liberándolo, no destruyéndolo.
- Los tres poderes se usan en todo el juego (exploración, combate y acertijos) y se combinan en la pelea final.
- Es un proyecto 100 % original: no usa modelos, texturas, fuentes ni sonidos de terceros. Los escenarios y personajes se generan en Blender con scripts de Python, como se vio en la semana 8 del curso.

---

## 3. Historia

### Sinopsis

Hace un año, el arqueólogo **Mateo Solano** desapareció buscando un templo legendario. Su hija, **Victoria**, encuentra una copia de su mapa y parte sola hacia la selva. En la entrada descubre un brazalete ancestral y la primera página del diario de su padre. Siguiendo sus huellas, atraviesa la selva y el santuario hasta llegar a la cámara del sol, donde despierta el Guardián: una criatura de piedra cuyo núcleo dorado esconde a Mateo, consumido por la Gema del Sol.

Victoria debe romper el núcleo sin perder a su padre. Al vencer al Guardián, el caparazón se derrumba, Mateo queda libre y la gema se sella en el brazalete. El templo, sin su fuente de energía, empieza a hundirse, y ambos escapan hasta salir a la selva al amanecer.

### Personajes

| Personaje | Descripción |
|---|---|
| **Victoria Solano** | Protagonista. Exploradora y cartógrafa, valiente, terca y cariñosa. Sombrero, trenza larga, poncho verde y un brazalete dorado. |
| **Mateo Solano** | Su padre, arqueólogo. Tocó la Gema del Sol y quedó atrapado dentro del Guardián. |
| **La Gema del Sol** | El artefacto. Hermosa, cálida y posesiva: da poder, pero devora a quien la toma sin protección. |
| **Guardián del Sol** | Coloso de piedra con runas azules y un núcleo dorado en el pecho. Su máscara recuerda el rostro de Mateo. |
| **Centinelas de piedra** | Estatuas que patrullan la selva y atacan cuerpo a cuerpo. |
| **Espectros ancestrales** | Figuras flotantes y translúcidas que disparan orbes mágicos a distancia. |

### Estructura

| Acto | Lugar | Qué ocurre |
|---|---|---|
| Prólogo | Entrada de la selva | Victoria encuentra el brazalete y obtiene sus dos primeros poderes. |
| Acto 1 | La selva olvidada | Cascada, puente que se derrumba y primeros centinelas. |
| Acto 2 | El santuario | Obtiene el tercer poder, enfrenta espectros y resuelve el acertijo de los espejos. |
| Acto 3 | La cámara del sol | Combate en tres fases contra el Guardián y revelación de que es su padre. |
| Desenlace | Escape y amanecer | El templo se derrumba, escapan juntos y contemplan el amanecer. |

La historia se cuenta mediante **seis páginas del diario de Mateo** repartidas por el camino. Su escritura se va deformando a medida que la gema lo corrompe, y la última página anticipa la revelación.

---

## 4. Jugabilidad

### Controles

| Acción | Tecla |
|---|---|
| Moverse / correr | WASD / Shift |
| Saltar / esquivar | Espacio / C |
| Pulso solar | Clic izquierdo |
| Escudo arcano | Q |
| Manipulación ancestral | E |
| Pausa | P o Esc |

El ratón controla la cámara sin necesidad de hacer clic.

### Los tres poderes del brazalete

| Poder | Función | Se obtiene en |
|---|---|---|
| **Pulso solar** (dorado) | Proyectil mágico que daña a los enemigos y al núcleo del jefe. | Prólogo |
| **Manipulación ancestral** | Activa mecanismos, gira espejos, mueve losas y lee páginas del diario. | Prólogo |
| **Escudo arcano** (azul) | Burbuja que bloquea el daño durante unos segundos. Si se activa en el momento justo, devuelve los proyectiles. | Santuario |

Cada poder tiene un tiempo de recarga que se ve en pantalla.

### Enemigos

- **Centinela de piedra:** patrulla, detecta a la jugadora, la persigue y golpea. Antes de atacar levanta los brazos, lo que da tiempo para esquivar.
- **Espectro ancestral:** mantiene la distancia y dispara orbes lentos que se pueden esquivar o bloquear con el escudo.

### Jefe final: el Guardián del Sol

El combate usa los tres poderes a la vez:

1. **Despertar.** El Guardián es invulnerable. La jugadora debe esquivar sus golpes mientras activa con **E** tres pilares solares; sus rayos abren las placas del pecho y exponen el núcleo.
2. **Núcleo expuesto.** Durante unos segundos el núcleo se puede dañar con el **Pulso solar**. El Guardián añade un rayo que hay que bloquear con el **Escudo**.
3. **Furia.** Con poca vida se vuelve más rápido, hace caer rocas e invoca espectros. Mateo, desde dentro, pide a su hija que rompa el núcleo.

### Otros sistemas

- Barra de vida y flores solares que curan.
- Puntos de control (*checkpoints*) para reaparecer al morir.
- Menú principal, opciones, pausa y pantallas de derrota y victoria.
- La pantalla final muestra el tiempo total, las muertes y las páginas del diario encontradas.

---

## 5. Niveles

### Zona 1: La selva olvidada
Un claro con el altar del brazalete y esferas rituales de piedra que ruedan al golpearlas, un sendero entre helechos gigantes, una cascada con un **portal de runas** escondido detrás del agua, un puente cuyas tablas se caen al pisarlas y ruinas cubiertas de musgo. La cima dorada de la pirámide se ve desde casi toda la zona y guía al jugador.

### Zona 2: El santuario
Salas en penumbra con haces de luz dorada, el altar del escudo y la **sala de los espejos**: un rayo de sol entra por una ventana y el jugador debe girar tres espejos para llevarlo hasta un cristal sobre la puerta. Un mural da la pista.

### Zona 3: La cámara del sol
Una arena circular bajo una cúpula por cuyo óculo cae un haz de sol sobre el trono del Guardián. Tras el combate, un **escape cronometrado de 75 segundos** a través del santuario que se derrumba, y un final en un acantilado sobre la selva al amanecer.

---

## 6. Dirección de arte

**Estilo:** *low poly* estilizado, "juguete tallado a mano". Formas biseladas con pocas caras, colores ricos, mucha luz y movimiento.

### Paleta

| Color | Uso |
|---|---|
| Dorado solar `#DDAA36` | Magia, la gema, la luz y el camino a seguir |
| Azul arcano `#3198DB` | Runas, escudo, espectros y peligro mágico |
| Verde selva `#355C43` | Vegetación y el poncho de Victoria |
| Piedra antigua `#827A70` | Templo, centinelas y el Guardián |

### Todo generado por código

- **Escenarios y personajes:** modelados en **Blender mediante scripts de Python** (estilo *low poly*) y exportados a `.glb`.
- **Animaciones:** los personajes son marionetas articuladas animadas por código (caminar, correr, saltar, atacar), con trenza y poncho que se mueven con resortes.
- **Materiales:** materiales PBR y de estilo caricatura de Three.js, y *shaders* propios para el agua, la vegetación movida por el viento, las runas brillantes y los efectos mágicos.
- **Atmósfera:** niebla, rayos de luz, partículas de polen, luciérnagas, polvo y brasas.

### Iluminación por zona

| Zona | Atmósfera |
|---|---|
| Selva | Sol cálido de tarde filtrado entre los árboles y niebla verdosa. |
| Santuario | Penumbra azul fría con haces dorados. |
| Cámara del sol | Dorado intenso que se vuelve naranja rojizo en la fase final. |
| Final | Amanecer rosado y dorado. |

---

## 7. Cámara y puesta en escena

La cámara funciona como una directora de fotografía: cada momento debe verse como un plano pensado.

- **Ocho perfiles de cámara** que cambian suavemente según la situación: exploración, carrera, plataformas, interiores, panorámica, combate, jefe y persecución.
- **Lenguaje cinematográfico:** cámara baja para mostrar la grandeza del templo y del Guardián, cámara alta en el puente para transmitir vértigo, horizonte inclinado en los momentos de caos y plano y contraplano en los diálogos.
- **Cinemáticas planificadas plano a plano:** introducción sobre la selva, el brazalete, el puente, la puerta del santuario, el despertar del Guardián, los cambios de fase, la derrota en cámara lenta y el reencuentro al amanecer. Todas se pueden saltar.
- **Diseño de escenarios:** un hito visual que orienta al jugador, la luz dorada que marca el camino, pasillos estrechos que se abren a salas enormes y escenas con primer plano, plano medio y fondo.

---

## 8. Sonido

Efectos, ambientes y música **sintetizados por código** con una herramienta propia en Python. La cascada, las antorchas y el núcleo del jefe tienen **audio posicional 3D** (suena más fuerte al acercarse). Incluye pasos, poderes, enemigos, mecanismos, derrumbes, el ambiente de la selva y del templo, una melodía por zona y un tema para el jefe que se intensifica en cada fase.

---

## 9. Tecnología

| Área | Herramienta |
|---|---|
| Gráficos 3D | **Three.js** (WebGL) |
| Física | **cannon-es** |
| Proyecto y servidor | Vite + Node.js |
| Lenguaje | JavaScript (módulos ES) |
| Escenarios y personajes | Blender, generados con scripts de Python y exportados a `.glb` |
| Interfaz | HTML y CSS sobre el canvas |
| Audio | Web Audio de Three.js (`PositionalAudio` y `Audio`), sonidos sintetizados con Python |
| Control de versiones | Git y GitHub |

**Arquitectura:** un único bucle de animación; física (cannon-es) y gráficos (Three.js) en mundos paralelos que se sincronizan en cada fotograma; sistemas independientes (jugador, cámara, magia, enemigos, jefe, acertijos, interfaz) y todos los valores de balance en archivos de configuración.

---

## 10. Cumplimiento del check-list del curso

El juego está diseñado para cumplir los 8 requisitos obligatorios de la semana 10, y todos se pueden mostrar en vivo con un **modo demostración** integrado.

| # | Requisito | Dónde se ve en el juego |
|---|---|---|
| 1 | Escenario 3D desde Blender (`.glb`) con iluminación y sombras | Las tres zonas, generadas en Blender, con sol, antorchas y sombras suaves. |
| 2 | Navegación con `PointerLockControls` u `OrbitControls` | Cámara en tercera persona con `PointerLockControls`; `OrbitControls` en el modo foto. |
| 3 | Audio 3D: `PositionalAudio` + audio global | Cascada y antorchas (posicional); portal, checkpoints y música (global). |
| 4 | Triggers radial (`distanceTo`) y AABB (`Box3`) | Área de la cascada, checkpoints y objetos (radiales); portal de la cascada y cambios de zona (AABB). |
| 5 | Partículas con `BufferGeometry` y física | Agua de la cascada, fuego de las antorchas, luciérnagas, chispas y polvo. |
| 6 | Objeto dinámico con cannon-es (masa, gravedad, rebote) | Esferas rituales de piedra, tablas del puente que caen, fragmentos de enemigos y caparazón del jefe. |
| 7 | HUD HTML/CSS con zona y coordenadas | El **"cuaderno de la cartógrafa"** de Victoria: zona actual, coordenadas y brújula. |
| 8 | 60 FPS sin crear objetos dentro de `animate()` | Todo se crea al cargar y se reutiliza; contador de FPS en el modo demostración. |

Además se aplican los contenidos de las semanas 1 a 9: materiales PBR, luces y sombras, mapa de entorno, *matcaps*, controles con teclado, salto por impulso, proyectiles, portal con *cooldown* y la canalización de Blender a la web.

---

## 11. Forma de trabajo

El desarrollo se hace con **Claude Code** como asistente de programación, siguiendo un documento maestro de instrucciones que define cada sistema, cada valor y cada criterio de aceptación.

1. Claude Code programa un módulo, lo prueba con pruebas automáticas y entrega una versión jugable.
2. Al final de cada día, el equipo juega la versión y reporta lo que hay que corregir con una plantilla (qué hice, qué esperaba, qué pasó, dónde).
3. Se corrigen primero los errores que bloquean el avance, luego los de sensación de juego y por último los visuales.

Ninguna funcionalidad se da por terminada si no se ha probado.

---

## 12. Plan de 7 días

| Día | Trabajo | Resultado esperado |
|---|---|---|
| 1 | Preparación del entorno, proyecto Vite, física, cámara y una primera escena exportada desde Blender. | Un personaje provisional se mueve y salta sobre el escenario; el HUD muestra zona y coordenadas. |
| 2 | Victoria, sistema de cámara y la zona 1 completa con triggers, portal, partículas, física y audio 3D. | **Los 8 requisitos del curso funcionan en la selva.** |
| 3 | Los tres poderes, interacciones, diario e interfaz. | Los poderes funcionan y se ven en pantalla. |
| 4 | Enemigos y zona 2 con el acertijo de los espejos. | Se juega hasta la antesala del jefe. |
| 5 | Jefe final, cinemáticas del jefe, escape y final. | **El juego completo se puede jugar de principio a fin.** |
| 6 | Cinemáticas restantes, efectos visuales, sonido, menús y modo demostración. | El juego se ve y suena terminado. |
| 7 | Pruebas, correcciones, rendimiento, compilación final y documentación. | Versión final y material para la sustentación. |

Hay dos reglas: **el día 2 ya se cumple todo lo obligatorio del curso** y **el día 5 el juego ya está completo**. El día 6 es solo para embellecerlo, así que, si algo se retrasa, se recorta decoración y nunca jugabilidad ni requisitos.

---

## 13. Riesgos y cómo los manejamos

| Riesgo | Mitigación |
|---|---|
| Que el arte por código se vea simple | Iluminación, niebla, partículas y *shaders* hacen la mayor parte del trabajo visual; se reserva el día 6 completo para pulir. |
| Que no alcance el tiempo | Los requisitos del curso quedan listos el día 2, el juego completo el día 5 y hay una lista de recortes ordenada por prioridad. |
| Bajo rendimiento en el navegador | Estilo *low poly* (máximo 50.000 triángulos por zona), objetos reutilizados, tres niveles de calidad y control de FPS. |
| Que el control o la cámara no se sientan bien | Pruebas de juego diarias del equipo y valores ajustables sin tocar el código. |
| Errores al final del proyecto | Pruebas automáticas en cada módulo y una versión jugable cada día. |

### Lo que nunca se recorta
Los 8 requisitos del curso, el recorrido completo de principio a fin, los tres poderes, las tres fases del jefe, la revelación del padre, las cinemáticas del despertar y de la derrota del Guardián, el escape y las pantallas de victoria y derrota.

---

## 14. Entregables

- Repositorio público en GitHub con el proyecto completo.
- Versión compilada para navegador (opcionalmente publicada con un enlace).
- Documentación: instalación y ejecución, controles, tabla de cumplimiento de los requisitos del curso, funcionalidades implementadas y limitaciones o pendientes.
- Guion para el video de demostración de 30 a 60 segundos y borrador de la ficha del concepto.
- Modo demostración para la sustentación en vivo.
- Documento maestro de desarrollo con el diseño completo.

*El formato exacto de entrega se confirma con el docente.*
