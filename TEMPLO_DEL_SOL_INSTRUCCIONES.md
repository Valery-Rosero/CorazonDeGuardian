# EL TEMPLO DEL SOL PERDIDO
## Documento maestro de desarrollo — v4 (stack del curso)

> Instrucciones para Claude Code. Este documento reemplaza a todas las versiones anteriores (la v3 usaba Godot; **ya no se usa Godot**).
>
> **Contexto académico:** es el proyecto integrador de *Programación de Entornos Multimedia* (Universidad Cooperativa de Colombia, Mg. Gabriel Guerrero Arellano). Se entrega como una **experiencia 3D interactiva para navegador hecha con Three.js**, con el stack y las prácticas vistos en las semanas 1 a 10 del curso.
>
> **Prioridad ante cualquier duda:** requisitos obligatorios del curso (sección 1) > juego completo y jugable > estabilidad y 60 FPS > belleza > extras.

---

## 0. ROLES Y FORMA DE TRABAJO

- **Claude Code**: desarrollador senior de experiencias 3D web (Three.js, cannon-es, Vite, JavaScript moderno, shaders GLSL, scripts de Python para Blender). Escribe todo el código, genera todo el arte y el audio por código, prueba y documenta.
- **Productor (usuario) y su equipo**: no programan. Juegan cada versión al final del día y reportan qué corregir con la plantilla de la sección 16.
- Claude Code **no puede evaluar por sí mismo la sensación de control, la cámara ni la dificultad**. Valida la lógica con pruebas automáticas y, si tiene Playwright disponible en su entorno, con capturas de pantalla del juego en Chromium (sin añadir Playwright al proyecto). La validación de sensaciones la hace el productor, a quien siempre se le indica **qué probar exactamente**.
- No se construye todo de una vez. Primero se entrega el diagnóstico del entorno, la estructura y las tareas del día 1; después se avanza módulo por módulo, con pruebas y resultados verificables.

---

## 1. REQUISITOS OBLIGATORIOS DEL CURSO

Estos requisitos vienen del check-list de la semana 10 y **tienen prioridad sobre todo lo demás**. Ninguno se recorta. Cada uno debe poder demostrarse en vivo en la sustentación.

### 1.1 Check-list de la entrega final

| # | Requisito del curso | Cómo se implementa en el juego | Cómo se demuestra |
|---|---|---|---|
| 1 | **Escenario 3D** importado desde Blender (`.glb`), con iluminación y sombras configuradas. | Las tres zonas, los personajes y los props se modelan en **Blender mediante scripts de Python** (`tools/blender/`) y se exportan a `.glb` en `public/models/`. Se cargan con `GLTFLoader`. Luz principal `DirectionalLight` con sombras `PCFSoftShadowMap`, `AmbientLight` entre 0,1 y 0,3, `SpotLight` en el santuario y `PointLight` en las antorchas. | Recorrer cualquier zona: sombras de Victoria, árboles, columnas y enemigos. |
| 2 | **Navegación**: control de cámara fluido con `OrbitControls` o `PointerLockControls`. | Cámara en tercera persona basada en **`PointerLockControls`** (el ratón gira la vista sin hacer clic). Además, **`OrbitControls`** en el modo foto y en la cámara libre de depuración. | Mover el ratón durante el juego; activar el modo foto. |
| 3 | **Audio 3D**: al menos un `PositionalAudio` anclado a un objeto y un audio de evento global (`THREE.Audio`). | `PositionalAudio` en la cascada (emisor principal), las antorchas, el núcleo del Guardián, los centinelas y los mecanismos. `THREE.Audio` para el portal, los checkpoints, las páginas del diario, el desbloqueo de poderes, la interfaz y la música. El audio se desbloquea con el primer clic. | Acercarse y alejarse de la cascada (el volumen cambia); cruzar el portal (sonido global). |
| 4 | **Triggers**: al menos dos funcionales, uno radial con `distanceTo` y uno por caja AABB con `Box3`. | **Radiales (`Vector3.distanceTo`)**: área de la cascada, checkpoints, páginas, flores solares, objetos interactivos y detección de enemigos. **AABB (`Box3.containsPoint`)**: el portal de la cascada (con *cooldown*), los cambios de zona, las zonas de cámara, la puerta del santuario, la entrada a la arena y el inicio del escape. | El panel de la cartógrafa cambia el nombre de la zona; el portal teletransporta y espera 3 s antes de reactivarse. |
| 5 | **Partículas**: un sistema dinámico con `BufferGeometry` + `Float32Array` y física de simulación. | Sistemas `THREE.Points` con gravedad y reciclaje: **cascada** (principal), fuego de antorchas, polen y luciérnagas, chispas del Pulso solar, brasas de la fase 3 y polvo del derrumbe. `AdditiveBlending` + `depthWrite: false` + `transparent: true` donde aplique. | La cascada y las antorchas. |
| 6 | **Físicas** con cannon-es: al menos un objeto dinámico con masa, gravedad y rebote sincronizado con Three.js. | Victoria es un cuerpo físico. **Esferas rituales de piedra** que ruedan y rebotan al golpearlas con el Pulso; tablas del puente que caen; fragmentos de los centinelas; piezas del caparazón del Guardián; rocas del escape. Sincronización por fotograma copiando `position` y `quaternion` de cada `CANNON.Body` a su `THREE.Mesh`. | Disparar a las esferas del claro de entrada; cruzar el puente. |
| 7 | **Interfaz HUD**: panel HTML/CSS sobre el canvas con la zona actual y las coordenadas en tiempo real. | **"Cuaderno de la cartógrafa"**: panel HTML/CSS (`pointer-events: none`) arriba a la izquierda con el nombre de la zona, las coordenadas X/Y/Z de Victoria y una pequeña brújula. Encaja con la historia: Victoria es cartógrafa. | Siempre visible durante el juego. |
| 8 | **Optimización**: 60 FPS sin instanciar objetos dentro de `animate()`. | Un único bucle `animate()`. Todo se crea al cargar: *pools* de proyectiles, orbes, fragmentos, rocas y sonidos; vectores temporales preasignados; partículas con tamaño fijo. Contador de FPS en el modo de depuración. | Contador de FPS y llamadas de dibujo en el modo demostración. |

### 1.2 Contenidos de las semanas 1 a 9 que también se aplican

| Semana | Contenido | Uso en el juego |
|---|---|---|
| 1 | Escena, cámara y renderizador; bucle con `requestAnimationFrame`. | Base del motor del juego. |
| 2 | Geometrías primitivas, `BufferGeometry`, materiales, transformaciones, `THREE.Group`, `lil-gui`. | Jerarquía articulada de los personajes; panel de ajuste en vivo (solo depuración). |
| 3 | Bucle a 60 FPS, audio espacial, desbloqueo de *autoplay*, `VideoTexture`. | Audio 3D; pantalla "Haz clic para comenzar". `VideoTexture` como extra opcional (sección 17). |
| 4 | PBR (`MeshStandardMaterial`, `MeshPhysicalMaterial` con *clearcoat* y *transmission*), catálogo de luces, *shadow maps*, partículas con mezcla aditiva. | Gema del Sol con *clearcoat*, cristal solar y escudo con *transmission*, antorchas con `PointLight` que parpadea, sombras suaves. |
| 5 | cannon-es: mundo, cuerpos estáticos, dinámicos y cinemáticos, `ContactMaterial` (fricción y restitución), paso fijo, eventos `collide`. | Toda la física del juego (sección 5.2). |
| 6 | Control con teclado, salto por impulso, comprobación de suelo con `collide`, cámara en tercera persona con *offset* y *lerp*, disparo de proyectiles, *broadphase* y estado de reposo (*sleep*). | Control de Victoria, Pulso solar, `SAPBroadphase` y `allowSleep`. |
| 7 | `.glb`, `GLTFLoader`, carpeta `public/` con rutas absolutas, IBL (*environment map*), `MeshMatcapMaterial`, carga asíncrona. | Carga de modelos con pantalla de progreso; mapa de entorno generado por código; *matcap* para espectros y runas. |
| 8 | Blender a web: *low poly*, presupuesto de polígonos, origen a la geometría, aplicar transformaciones, exportación glTF binaria, automatización con Python. | Todo el arte se genera con scripts de Python en Blender (sección 4.4). |
| 9 | Triggers radiales y AABB, zonas sonoras, portal con *cooldown*, HUD de depuración, partículas de agua con gravedad, lista de errores comunes. | Portal de la cascada, zonas de audio, partículas de la cascada. |

### 1.3 Reglas técnicas del curso que son obligatorias

- Nombres de archivos de recursos **en minúsculas y sin espacios** (evita errores 404).
- Todos los recursos externos al código van en `public/` y se cargan con rutas absolutas: `/models/zona_1_selva.glb`, `/sounds/cascada.mp3`.
- Nada de crear geometrías, materiales, mallas, cuerpos, sonidos ni vectores dentro de `animate()`.
- La física avanza con paso fijo: `world.step(1 / 60, deltaTime, 3)`.
- El canvas ocupa toda la ventana y se adapta al redimensionarla (`resize`).
- El audio se activa después de la primera interacción del usuario.
- Antes de exportar en Blender: origen a la geometría, transformaciones aplicadas, eje +Y arriba, solo objetos seleccionados (sin luces ni cámaras).

### 1.4 Modo demostración (para la sustentación)

Un modo accesible desde el menú principal ("Demostración técnica") o con `?demo` en la URL:

- Panel lateral con los 8 requisitos de la tabla 1.1. Al hacer clic en uno, Victoria se teletransporta al lugar donde se ve mejor y aparece una explicación breve.
- Muestra los triggers (cajas `Box3Helper` y anillos para los radiales), los colisionadores físicos en malla de alambre, el contador de FPS, las llamadas de dibujo y el número de triángulos.
- Permite cambiar entre la cámara de juego y `OrbitControls`.

---

## 2. VISIÓN

**Pitch:** Victoria sigue el mapa de su padre desaparecido hasta un templo perdido en la selva, solo para descubrir que el temible Guardián del Sol que lo protege es su propio padre, corrompido por la gema que vino a buscar.

- Aventura 3D para un jugador en tercera persona, **en el navegador** (Chrome o Edge en PC, con WebGL 2 y aceleración por hardware). Resolución objetivo 1920 × 1080, 60 FPS.
- Se ejecuta con `npm run dev` y se entrega como sitio compilado (`npm run build` → carpeta `dist/`).
- Duración objetivo: **15 a 20 minutos** de juego.
- Plazo: **7 días**.
- Pilares de diseño:
  1. **Belleza procedural**: todo se genera por código (Blender con Python, Three.js y síntesis de audio) y aun así se ve elaborado y cálido.
  2. **Claridad**: cada peligro se anuncia antes de golpear; cada objeto interactivo se distingue.
  3. **Emoción**: la historia de padre e hija se cuenta con poco texto y mucha intención.

---

## 3. NARRATIVA

### 3.1 Personajes

- **Victoria Solano** — protagonista. Joven exploradora y cartógrafa, valiente, terca y cariñosa. Hace un año su padre desapareció buscando el templo. Victoria encontró en su estudio una copia del mapa y partió sola.
- **Mateo Solano** — su padre, arqueólogo. Encontró el templo, tocó la Gema del Sol y fue absorbido por ella. Ahora es el núcleo vivo del Guardián del Sol.
- **La Gema del Sol** — el artefacto. Hermosa, cálida y posesiva. Da poder a quien la porta, pero quiere quedarse en el templo y "devora" a quien la toma sin el brazalete adecuado.
- **El Brazalete Solar** — reliquia ancestral que permite canalizar la gema sin ser consumido. Victoria lo encuentra al inicio. Es la razón por la que ella puede hacer lo que su padre no pudo.

### 3.2 Estructura

| Acto | Lugar | Momento clave |
|---|---|---|
| Prólogo | Entrada de la selva | Victoria encuentra el brazalete y la primera página del diario de su padre. Desbloquea **Pulso solar** y **Manipulación ancestral**. |
| Acto 1 | La selva olvidada | Cascada, puente que se derrumba, primeros centinelas. Las páginas del diario confirman que su padre pasó por ahí. |
| Acto 2 | El santuario | En un altar desbloquea el **Escudo arcano**, justo antes de los espectros. Acertijo de los espejos solares. Tras la puerta se oye una voz. |
| Acto 3 | La cámara del sol | El Guardián despierta. Victoria reconoce la voz de su padre. Combate en tres fases. |
| Desenlace | Escape y amanecer | El caparazón de piedra se rompe y libera a Mateo. Victoria sella la gema en el brazalete. El templo se derrumba: escape cronometrado. Fuera, al amanecer, su padre aparece detrás de ella. |

### 3.3 Páginas del diario (coleccionables interactivos con E)

Se leen en un panel con estilo de papel. La escritura se degrada visualmente: las primeras páginas en tinta oscura y las últimas con texto dorado, temblor del texto (shader o animación de caracteres) y frases rotas.

1. **Entrada:** "Día 1. El mapa no mentía. Hay escalones de piedra bajo el musgo. Victoria, si algún día lees esto, perdóname por no esperarte."
2. **Cascada:** "Detrás del agua hay un camino. Los constructores amaban el sol: cada piedra mira hacia el este."
3. **Puente:** "El puente aguantó mi peso. Apenas. Juraría que las estatuas se mueven cuando no las miro."
4. **Santuario:** "Los espejos llevan la luz hasta la puerta. Lo resolví. Detrás hay una voz. Dice mi nombre."
5. **Antesala del jefe:** "La gema es cálida. Me pide que me quede. Solo un poco más. Solo un poco."
6. **Puerta de la arena (texto dorado y tembloroso):** "no la tomes. no salgas. el sol es mío. el sol es MÍO. victoria perdón"

### 3.4 Diálogos del combate final (subtítulos, sin voz)

Hay dos estilos de subtítulo: **Mateo** en blanco cálido y **la Gema** en dorado con brillo. Cuando hablan los dos a la vez, el texto alterna colores.

- **Despertar:** Mateo: "¿Victoria...? No... vete... no me deja soltarla..." → Gema: "Otra mano que quiere robar el sol."
- **Inicio de la fase 2 (primer núcleo expuesto):** Gema: "¡Nadie saldrá de este templo con mi luz!" → Victoria: "¡Papá, resiste!"
- **Inicio de la fase 3 (35 % de vida):** Mateo: "Hija... el núcleo... rómpelo... no tengas miedo."
- **Derrota:** el caparazón se agrieta y cae por piezas. Mateo, de rodillas: "Victoria... viniste." Victoria: "Te dije que llegaría antes que tú." La gema flota hacia el brazalete y queda sellada (destello azul y dorado).
- **Inicio del escape:** el templo tiembla. Mateo: "¡Corre! Estoy justo detrás de ti."
- **Final:** salida de la selva al amanecer. Victoria se gira; Mateo sale de entre los árboles. Ambos miran el sol. Fundido a la pantalla de victoria, cuyo título grande dice **VICTORIA**.

---

## 4. DIRECCIÓN DE ARTE: 100 % GENERADA POR CÓDIGO

**Regla de oro:** no se descarga ningún modelo, textura, HDRI, fuente ni sonido. Todo se genera con código:

- **Blender + Python** (`tools/blender/`): escenarios, personajes y props, exportados a `.glb`. Es el mismo enfoque de automatización que se vio en la semana 8.
- **Three.js**: materiales, *shaders*, partículas, cielo, mapa de entorno y texturas dibujadas en canvas.
- **Python** (`tools/audio/`): efectos de sonido, ambientes y música.

El estilo es **low poly estilizado, "juguete tallado a mano"**: formas biseladas con pocas caras, colores ricos, mucha luz y movimiento. Encaja con la filosofía *low poly* para web que pide el curso.

### 4.1 Paleta

| Uso | Color |
|---|---|
| Dorado solar (magia, gema, luz, camino) | `#DDAA36` |
| Azul arcano (runas, escudo, espectros) | `#3198DB` |
| Verde selva (vegetación, poncho) | `#355C43` |
| Piedra antigua (templo, enemigos) | `#827A70` |

Los tonos derivados (más claros, más oscuros, saturados) se definen una sola vez en `src/config/palette.js` y en `tools/blender/palette.py`, con los mismos valores. No se escriben colores sueltos en otros archivos.

### 4.2 Técnicas visuales en Three.js

- **Personajes**: `MeshToonMaterial` con un `gradientMap` de 3 tonos (`DataTexture` con filtro `NearestFilter`) y luz de contorno cálida añadida con `onBeforeCompile`. La sombra se tiñe de color, nunca negro puro.
- **Piedra y templo**: colores por vértice generados en Blender (musgo en las caras que miran hacia arriba, variación con ruido, bordes más claros) con `MeshStandardMaterial({ vertexColors: true, flatShading: true })` y rugosidad alta.
- **Vegetación**: `InstancedMesh` (una llamada de dibujo por tipo de planta) con movimiento de viento en el *vertex shader* mediante `onBeforeCompile`.
- **Agua y cascada**: `ShaderMaterial` con desplazamiento de UV animado y ruido, espuma con partículas y niebla de agua.
- **Gema del Sol**: `MeshPhysicalMaterial` con *clearcoat* y emisión dorada. **Cristal solar** y **Escudo arcano**: `MeshPhysicalMaterial` con *transmission* o un `ShaderMaterial` con efecto Fresnel.
- **Espectros y runas**: `MeshMatcapMaterial` con *matcaps* dibujados en un `CanvasTexture`. Las runas usan una textura emisiva generada en canvas con formas geométricas y un pulso de brillo.
- **Rayos de luz falsos**: conos y planos con `ShaderMaterial` aditivo y ruido, entre la vegetación y por las ventanas del templo.
- **Entorno**: cielo procedural con el *addon* `Sky` de Three.js; `PMREMGenerator` lo convierte en `scene.environment` para la iluminación basada en imagen (IBL), sin descargar HDRI. Niebla `FogExp2` por zona. *Tone mapping* `ACESFilmicToneMapping` y `outputColorSpace = SRGBColorSpace`.
- **Postprocesado** (*addons* de Three.js, sin dependencias extra): `EffectComposer` + `UnrealBloomPass` para el brillo de la magia (Media y Alta) y `BokehPass` para la profundidad de campo en las cinemáticas (solo Alta). `OutputPass` al final.
- **Sombras**: solo la `DirectionalLight` principal proyecta sombras (`PCFSoftShadowMap`). Su cámara de sombras sigue a Victoria para mantener sombras nítidas. `PointLight` y `SpotLight` sin sombras, salvo una `SpotLight` en el santuario en calidad Alta.
- **Pulido de cámara**: sacudida en impactos, congelación de impacto (*hit-stop*) de 40-60 ms y cambio sutil de FOV al correr.

### 4.3 Iluminación por zona

| Zona | Atmósfera | Luces |
|---|---|---|
| Selva | Sol cálido de tarde filtrado por los árboles, niebla verdosa baja, polen y luciérnagas. | Direccional cálida con sombras, ambiente 0,25, cielo `Sky` bajo. |
| Santuario | Penumbra azul fría, haces dorados que entran por las ventanas, polvo flotando. | Ambiente 0,12, `SpotLight` dorada por las ventanas, `PointLight` de antorchas que parpadean. |
| Cámara del sol | Dorado intenso alrededor del núcleo. En la fase 3 el ambiente vira a naranja rojizo y las runas se agrietan. | `SpotLight` cenital por el óculo, `PointLight` dorada en el núcleo que late. |
| Escape | Polvo, rocas cayendo, luz parpadeante. | Direccional naranja, `PointLight` parpadeantes. |
| Final | Amanecer rosado y dorado, niebla suave. | Direccional rosada baja, ambiente 0,3. |

### 4.4 Generación de recursos en Blender (`tools/blender/`)

Blender se ejecuta **en modo background** desde la terminal; nadie modela a mano:

```
blender --background --python tools/blender/build_zona_1_selva.py
```

**Scripts:**

- `common.py`: utilidades compartidas. Semilla fija (`random.seed`), biselado con pocos segmentos, deformación de vértices con ruido determinista, pintura de colores por vértice, origen a la geometría, aplicación de transformaciones (`transform_apply`), asignación de propiedades personalizadas y exportación.
- `palette.py`: la misma paleta de `src/config/palette.js`.
- Constructores: `rock_builder`, `tree_builder` (tronco curvado, copas *low poly*, lianas y raíces), `foliage_builder` (mallas base para instanciar), `temple_builder` (bloques biselados, columnas, escalinatas, arcos, relieves), `bridge_builder`, `water_builder`, `character_builder`.
- Escenas: `build_zona_1_selva.py`, `build_zona_2_santuario.py`, `build_zona_3_camara_sol.py`, `build_personajes.py`, `build_props.py`.
- `stats.py`: cuenta los triángulos antes de exportar y **falla si se supera el presupuesto**.
- `tools/build_assets.mjs` (se ejecuta con `npm run assets`): lanza todos los scripts de Blender y la síntesis de audio. La ruta de Blender se lee de la variable de entorno `BLENDER_PATH`.

**Configuración de exportación (como en la semana 8):** glTF Binary (`.glb`), solo objetos seleccionados, +Y arriba, materiales exportados, **propiedades personalizadas incluidas** (llegan a Three.js como `userData`), sin luces ni cámaras. Compresión Draco opcional si un archivo supera 5 MB (el decodificador se copia desde `three/examples/jsm/libs/draco/` a `public/draco/`).

**Presupuesto (semana 8):** como máximo **50.000 triángulos por zona** sin contar las instancias de vegetación. Si hace falta alguna textura, en JPG de 1024 × 1024 como máximo. Se priorizan los colores sólidos y por vértice, que no pesan.

**Convención de nombres dentro de los `.glb`** (el código del juego lee estos prefijos):

| Prefijo | Qué es | Qué hace el juego |
|---|---|---|
| `col_box_*`, `col_cyl_*`, `col_sph_*` | Colisionador invisible | Crea un `CANNON.Body` estático con la forma indicada y oculta la malla. |
| `trg_box_*` | Zona AABB | Crea un `Box3`. Sus propiedades personalizadas (`zona`, `perfil_camara`, `evento`) dicen qué hace. |
| `trg_rad_*` | Trigger radial (objeto vacío) | Centro + propiedad `radio` para `distanceTo`. |
| `spawn_*` | Punto de aparición | Jugador, enemigos, checkpoints, páginas, flores, esferas rituales. |
| `inst_*` | Posiciones de instancias | Vegetación con `InstancedMesh`. |
| `cam_*` | Puntos de cámara | Recorridos de las cinemáticas (`CatmullRomCurve3`). |
| `hint_*` | Punto de interés | Hacia dónde se inclina la cámara al entrar en una zona. |
| `luz_*` | Posición de luz | Antorchas y focos (las luces se crean en Three.js). |
| `emit_*` | Emisor | Audio posicional y sistemas de partículas. |
| `dyn_*` | Objeto dinámico | Crea un cuerpo de cannon-es con masa (tablas, esferas, losas). |

### 4.5 Personajes

Cada personaje se construye en `build_personajes.py` como **piezas separadas y emparentadas** (cadera → torso → cabeza / brazos / piernas), con nombres fijos (`cadera`, `torso`, `cabeza`, `brazo_izq`…). El `.glb` conserva la jerarquía, y en Three.js un `ProceduralAnimator` anima esas piezas por código:

- Reposo: respiración y balanceo leve.
- Caminar y correr: ciclo de pasos con funciones seno, mezclado según la velocidad, con inclinación hacia la dirección del movimiento.
- Salto: anticipación, estiramiento al subir y aplastamiento al aterrizar.
- Ataque, escudo, interacción, esquiva, daño y muerte: poses interpoladas con curvas de suavizado.
- Movimiento secundario: la trenza y el poncho siguen al cuerpo con resortes amortiguados simples.
- La cabeza gira levemente hacia donde apunta la cámara.

**Victoria Solano**: proporciones estilizadas (unas 5,5 cabezas), lectura clara de espaldas. Trenza castaña larga (cadena de 6 piezas con resortes), sombrero de ala corta, camisa crema, poncho corto verde selva, pantalón marrón, botas oscuras, mochila con un rollo de mapa. Brazalete dorado cuya gema **cambia de color según el poder**: dorado (Pulso), azul (Escudo) y blanco cálido (Manipulación). Rostro simple, con ojos como elipsoides oscuros.

**Mateo Solano** (aparece al final): mismo sistema, proporciones adultas, sombrero de explorador, chaleco, barba geométrica y ropa en tonos tierra.

**Centinela de piedra**: bloques biselados, hombros anchos y brazos largos. Un ojo emisivo: azul en guardia, dorado al detectarte, parpadeo al recibir daño. Exportado en fragmentos que, al morir, se sueltan como cuerpos dinámicos de cannon-es y desaparecen a los 3 s.

**Espectro ancestral**: figura flotante translúcida azul (*matcap* + transparencia), sin piernas; el torso se disuelve en partículas. Máscara de piedra con runas. Al morir se disuelve con un *shader* de disolución.

**Guardián del Sol**: de 3 a 4 veces la altura de Victoria. Bloques de piedra con runas azules por los brazos. Placas articuladas que cubren el núcleo del pecho y se abren con bisagras animadas. Núcleo: esfera emisiva dorada con remolino interno (*shader* de ruido animado), dentro del cual se intuye la silueta de Mateo. Máscara con rasgos que recuerdan a Mateo. En la fase 3: grietas emisivas naranjas, brasas y movimiento más brusco. El caparazón se exporta en piezas para la secuencia de derrota.

---

## 5. JUGABILIDAD

### 5.1 Controles

| Acción | Teclado y ratón |
|---|---|
| Moverse | WASD |
| Cámara | Ratón (captura con *pointer lock*) |
| Correr | Shift (mantener) |
| Saltar | Espacio |
| Esquivar | C |
| Pulso solar | Clic izquierdo |
| Escudo arcano | Q |
| Manipulación ancestral | E |
| Pausa | P o Esc |
| Saltar cinemática | Mantener Espacio 1 s |

- **No se usa Ctrl** para esquivar: Ctrl+W cierra la pestaña del navegador.
- **No se usan teclas F** (F1, F5, F11 y F12 tienen funciones del navegador).
- Al pulsar Esc, el navegador libera el ratón: el juego detecta `pointerlockchange` y abre la pausa automáticamente.
- Las teclas se leen con `event.code` y se definen solo en `src/config/input_map.js`.
- Mando con la Gamepad API: opcional, de baja prioridad.

### 5.2 Movimiento y física de Victoria (cannon-es)

- Cuerpo dinámico con dos esferas apiladas (forma de cápsula), `fixedRotation: true`, `linearDamping` 0,3 y un material propio sin fricción contra las paredes, para que no se quede pegada.
- Control de tipo *arcade* (semana 6): la velocidad horizontal se ajusta directamente hacia la deseada, con aceleración y frenado suaves; la vertical la gobierna la física.
- **Comprobación de suelo**: `world.raycastClosest` hacia abajo, más el evento `collide` con la normal del contacto (semana 6).
- **Mundo físico**: gravedad −9,82, `SAPBroadphase`, `allowSleep = true`, paso fijo `world.step(1 / 60, deltaTime, 3)`. `ContactMaterial` definidos para jugador–mundo, esferas–mundo (restitución 0,6) y tablas–mundo.
- **Grupos de colisión** (`collisionFilterGroup` / `collisionFilterMask`): MUNDO 1, JUGADOR 2, ENEMIGOS 4, PROYECTILES_JUGADOR 8, PROYECTILES_ENEMIGOS 16, DINAMICOS 32, SENSORES 64.

**Valores iniciales** (en `src/config/player.js`, ajustables con `lil-gui` en modo depuración):

- Caminar: 4,5 m/s. Correr: 7,5 m/s.
- Salto: unos 1,6 m de altura; gravedad extra al caer para que el salto se sienta firme.
- Tiempo de gracia al saltar desde un borde (*coyote time*): 0,12 s. Memoria de la tecla de salto: 0,12 s.
- Esquiva: 4 m en 0,35 s, invulnerable durante 0,25 s, reutilización de 0,6 s.

### 5.3 Cámara

Resumen: tercera persona con `PointerLockControls`, a unos 4,5 m detrás del hombro derecho, FOV 70 que sube a 76 al correr, retícula central. El sistema completo está en la sección 9.

### 5.4 Vida y daño

- Vida de Victoria: 100.
- **Flores solares** repartidas por los niveles: recuperan 25 de vida (trigger radial).
- Al recibir daño: parpadeo, empuje hacia atrás, 0,6 s de invulnerabilidad y viñeta roja breve (CSS).
- Al morir: pantalla de derrota → reintentar desde el último checkpoint con la vida completa.

### 5.5 Sistema mágico

| Poder | Control | Comportamiento | Valores iniciales |
|---|---|---|---|
| **Pulso solar** | Clic izquierdo | Proyectil dorado hacia la retícula (semana 6). Es un cuerpo sensor de cannon-es (`collisionResponse = false`) tomado de un *pool* de 16; al impactar aplica daño y, sobre objetos dinámicos, un impulso. Estela y chispas con partículas. | Daño 25, reutilización 0,5 s, velocidad 30 m/s, alcance 40 m |
| **Escudo arcano** | Q | Burbuja azul con Fresnel. Bloquea todo el daño mientras está activo. **Bloqueo perfecto**: si se activa 0,2 s antes de recibir un proyectil, lo devuelve. | Duración 2,5 s, reutilización 6 s |
| **Manipulación ancestral** | E | Interactúa con el objeto válido más cercano (trigger radial con `distanceTo` y que esté dentro del campo de visión de la cámara). Muestra un aviso en pantalla. Sin objetivo válido, el brazalete chisporrotea y no consume nada. | Alcance 3,5 m |

- Indicadores en el HUD con reutilización circular (CSS `conic-gradient`), estado bloqueado y destello cuando el poder vuelve a estar disponible.
- **Desbloqueo progresivo**: Pulso y Manipulación en el prólogo; Escudo en el altar del santuario.

### 5.6 Checkpoints

Entrada, después del puente, entrada del santuario y antesala del jefe. Cada uno es un **pilar solar** con trigger radial que se enciende al pasar (partículas y sonido global).

---

## 6. ENEMIGOS (máquinas de estados sencillas)

### 6.1 Centinela de piedra

- Vida: 75 (3 pulsos). Daño del golpe: 20.
- Estados:
  - **Guardia/Patrulla**: recorre puntos de ruta o permanece quieto.
  - **Alerta**: lo ve dentro de 12 m (`distanceTo`) y 110° de visión, con línea de visión libre (raycast). El ojo se vuelve dorado y espera 0,5 s.
  - **Persecución**: se mueve a 4 m/s directo hacia el jugador, con evitación de obstáculos por raycast (sin malla de navegación; las zonas de combate son abiertas).
  - **Ataque**: a menos de 2,2 m. Levanta los brazos durante 0,6 s (aviso visible) y golpea.
  - **Recuperación**: queda 0,8 s vulnerable tras el golpe.
  - **Aturdido**: tras recibir daño, 0,3 s.
  - **Muerte**: se desmorona.
- Si pierde de vista al jugador durante 4 s, vuelve a su posición.

### 6.2 Espectro ancestral

- Vida: 50 (2 pulsos). Daño del orbe: 15.
- Estados:
  - **Flotar**: deriva en su zona.
  - **Alerta**: detecta al jugador a 18 m (trigger radial con `distanceTo`).
  - **Mantener distancia**: se mueve para quedarse entre 8 y 12 m del jugador.
  - **Cargar**: brilla durante 0,8 s antes de disparar.
  - **Disparar**: orbe lento (9 m/s), tomado de un *pool*, que se puede esquivar o bloquear.
  - **Muerte**: se disuelve.
- Reutilización entre disparos: 2,5 s.

### 6.3 Implementación

- Cada enemigo tiene un cuerpo dinámico de cannon-es con `fixedRotation: true`; la IA fija su velocidad, como con Victoria.
- Máquina de estados genérica en `enemies/state_machine.js` (lógica pura, probada con `node --test`).
- Fragmentos de centinela, orbes y efectos salen de *pools* creados al cargar.

---

## 7. JEFE FINAL: EL GUARDIÁN DEL SOL

- Vida del núcleo: **300**. Solo recibe daño con el núcleo expuesto.
- La arena tiene **tres pilares solares** en el borde. Activar los tres con E dispara sus rayos contra el pecho del Guardián: las placas se abren y el núcleo queda expuesto. Los rayos reutilizan el mismo sistema que el acertijo de los espejos.
- Todos los ataques se anuncian con aviso visual y sonoro.

### 7.1 Ataques

| Ataque | Aviso | Cómo evitarlo | Daño | Fases |
|---|---|---|---|---|
| Golpe sísmico | Alza los brazos, círculo dorado en el suelo (1 s) | Saltar el anillo expansivo | 20 | 1, 2, 3 |
| Barrido | Gira el torso hacia atrás (0,8 s) | Esquivar o Escudo | 25 | 1, 2, 3 |
| Rayo solar | Rayo fino que sigue al jugador 1,5 s | Escudo | 30 | 2, 3 |
| Lluvia de rocas | Sombras en el suelo 1 s antes | Moverse | 15 | 3 |
| Invocación | Ruge, runas brillan | Eliminar 2 espectros | — | 3 (una vez) |

### 7.2 Fases

1. **Despertar** (presentación). Cámara guionizada de 3-4 s mientras se levanta, con el diálogo del despertar. Ataques lentos: golpe sísmico y barrido. Los pilares tienen un brillo que invita a usarlos. Con el primer núcleo expuesto empieza la fase 2.
2. **Núcleo expuesto** (100 %–35 %). Ciclo: activar los tres pilares → el núcleo se abre durante **6 s** → se cierra y los pilares se recargan en **4 s**. Añade el rayo solar.
3. **Furia** (menos del 35 %). Ataques un 30 % más rápidos, lluvia de rocas e invocación única. El núcleo se abre durante **4 s** y los pilares se recargan en **3 s**.

### 7.3 Secuencia de derrota

Congelación de 0,3 s → el núcleo se agrieta con un destello blanco → el caparazón cae por piezas con física → aparece Mateo de rodillas → diálogo final → la gema vuela al brazalete → temblor y comienza el escape.

La barra de vida del jefe se muestra arriba en el centro, con su nombre y marcas en el 35 %.

### 7.4 Implementación

- El Guardián es un **cuerpo cinemático** de cannon-es (se mueve solo por código, como en la tabla de tipos de cuerpos de la semana 5).
- Las rocas de la lluvia son cuerpos dinámicos de un *pool* de 20, con su sombra de aviso dibujada antes de caer.
- En la derrota, las piezas del caparazón pasan a ser cuerpos dinámicos que caen y rebotan.
- El núcleo lleva un `PositionalAudio` con un latido que se acelera en cada fase.

---

## 8. NIVELES

### 8.1 Zona 1: La selva olvidada

- **Entrada**: claro con el altar del brazalete y la página 1 del diario. Tutorial con mensajes contextuales (moverse, saltar, Pulso contra **esferas rituales de piedra** que ruedan y rebotan con física, Manipulación sobre una losa).
- **Cascada**: emisor principal de audio posicional y de partículas. Trigger radial "área de la cascada". Plataformas de rocas sobre el río. Detrás de la cortina de agua, una cueva con un **círculo de runas que funciona como portal** (página 2): lleva a Victoria a la cornisa alta frente al puente (ver 8.4).
- **Puente deteriorado**: las tablas tiemblan 0,4 s y se caen al pisarlas como cuerpos dinámicos de cannon-es, y reaparecen a los 3 s. Página 3 al otro lado. Checkpoint.
- **Plataformas**: ruinas escalonadas con una losa que se mueve al activarla con E.
- **Enemigos**: 3 centinelas (uno en guardia, dos patrullando).

### 8.2 Zona 2: El santuario

- **Templo interior**: salas en penumbra con haces dorados. Checkpoint.
- **Altar del escudo**: desbloquea el Escudo arcano. Mensaje de tutorial.
- **Espectros**: 2 al entrar a la sala del acertijo y 1 más al resolverlo.
- **Acertijo de los espejos solares**:
  - Un rayo de luz entra horizontalmente por una ventana.
  - Tres espejos sobre pedestales que giran en pasos de 45° con E.
  - El rayo se calcula con raycasts que se reflejan en las normales de los espejos (máximo 6 rebotes) y se dibuja con una malla estirada de shader aditivo y partículas en el punto de impacto.
  - Cada espejo iluminado brilla. Hay que llevar el rayo hasta el **cristal solar** sobre la puerta.
  - Distribución en cuadrícula con ángulos de 45° para que la reflexión sea exacta. Debe tener al menos una solución y ningún estado bloqueado.
  - Un mural muestra la ruta del sol como pista. Si pasan 90 s sin resolverlo, aparece un mensaje de ayuda.
  - Al resolverlo: la puerta se abre con polvo, temblor de cámara y sonido. Página 4.
- **Antesala del jefe**: página 5, flor solar y checkpoint. La puerta de la arena tiene la página 6.

### 8.3 Zona 3: La cámara del sol

- **Arena circular** de unos 30 m de diámetro, con los tres pilares en el borde y columnas como referencia visual (sin bloquear el combate).
- **Jefe final** (sección 7).
- **Escape** (75 s):
  - Temporizador visible.
  - Ruta lineal de regreso a través de parte del santuario, con techos que se derrumban, rocas que caen (con sombras de aviso), un salto final y el puente en llamas doradas.
  - Si el tiempo se agota: pantalla de derrota → reintentar desde el inicio del escape.
- **Final**: salida al amanecer, escena breve con Mateo y pantalla de victoria con tiempo total, muertes y páginas del diario encontradas (x/6).

### 8.4 Portal de la cascada

Inspirado en el portal de la semana 9, adaptado a la historia:

- Anillo de runas azules que gira lentamente, con partículas y un `Box3` como trigger.
- Al entrar: sonido global (`THREE.Audio`), fundido rápido a blanco dorado, teletransporte de Victoria y de su cuerpo físico a la cornisa, reorientación de la cámara y mensaje en el panel de la cartógrafa ("Portal activado").
- *Cooldown* de 3 s para evitar teletransportes en bucle.
- Existe otro anillo en la cornisa para volver a la cascada.

### 8.5 Triggers, física y audio por zona

| Zona | Triggers radiales (`distanceTo`) | Triggers AABB (`Box3`) | Física (cannon-es) | Audio posicional |
|---|---|---|---|---|
| Selva | Área de la cascada, checkpoints, páginas, flores, altar del brazalete | Portal, subzonas del panel, zonas de cámara | Esferas rituales, tablas del puente, losa que se mueve | Cascada, pájaros, antorcha de la entrada |
| Santuario | Altar del escudo, espejos, páginas, flores | Sala del acertijo, puerta, zonas de cámara | Fragmentos de centinelas, losas | Antorchas, mecanismos, espectros |
| Cámara del sol | Pilares solares | Entrada a la arena, inicio del escape, final | Piezas del caparazón, lluvia de rocas, derrumbe del escape | Núcleo del Guardián |

---

## 9. DIRECCIÓN DE CÁMARA Y PUESTA EN ESCENA

La cámara es la "directora de fotografía" del juego. Su trabajo es que cada momento se vea como un plano pensado, sin quitarle nunca el control al jugador fuera de las cinemáticas.

### 9.1 Sistema de cámara en Three.js

- **`CameraRig`**: `PointerLockControls` solo aporta la orientación (giro horizontal y vertical, limitado con `minPolarAngle` y `maxPolarAngle`). En cada fotograma el *rig* calcula la posición: punto de giro (Victoria + desplazamiento al hombro) menos la dirección de la cámara por la distancia del perfil. Se suaviza con interpolación (`lerp`) dependiente del tiempo y añade **anticipación de mirada** hacia donde corre Victoria.
- **Colisión de cámara**: un `Raycaster` (creado al cargar) desde el punto de giro hasta la posición deseada, contra las mallas de los colisionadores; si choca, la cámara se acerca.
- **Perfiles** (`src/config/camera_profiles.js`): distancia, altura, desplazamiento lateral, FOV, límites verticales, retraso de seguimiento, anticipación y tiempo de mezcla.
- **Zonas de cámara**: triggers `Box3` (`trg_box_*` con la propiedad `perfil_camara`). Al entrar, la cámara mezcla suavemente hacia su perfil (0,6–1,2 s con curva de suavizado); al salir, vuelve al anterior.
- **Puntos de interés** (`hint_*`): al entrar en ciertas zonas, la cámara se inclina suavemente hacia un hito (la pirámide, la cascada, la puerta) y deja de hacerlo en cuanto el jugador mueve el ratón.
- **Recentrado automático**: si el jugador se mueve sin tocar el ratón durante 2,5 s, la cámara vuelve lentamente detrás de Victoria.
- **Oclusión**: los objetos que tapan a Victoria (troncos, columnas, hojas) se vuelven semitransparentes con un desvanecimiento suave, en lugar de que la cámara salte.
- **`CinematicPlayer`**: reproduce secuencias de planos definidas como datos en `src/cinematics/`. Cada plano define recorrido (`CatmullRomCurve3` por los puntos `cam_*`), objetivo de mirada, FOV, duración, curva de suavizado, profundidad de campo y sacudida. Durante las cinemáticas se ignora la entrada del ratón, se ocultan el HUD y el panel de la cartógrafa, y aparecen franjas negras panorámicas (2,35:1) animadas con CSS.
- **Todas las cinemáticas se pueden saltar** (mantener Espacio 1 s, con indicador circular). Tras morir, las ya vistas se saltan solas.
- **`OrbitControls`**: modo foto (pausa el juego y permite orbitar alrededor de Victoria con amortiguación) y cámara libre de depuración.

### 9.2 Perfiles de cámara

| Perfil | Distancia | Altura | FOV | Uso |
|---|---|---|---|---|
| Exploración | 4,5 m | 1,6 m | 70 | Por defecto en la selva |
| Carrera | 5,0 m | 1,5 m | 76 | Al mantener Shift |
| Plataformas | 6,0 m | 2,8 m (inclinada hacia abajo 20°) | 68 | Puente, plataformas, saltos: se ve bien dónde caer |
| Interior | 3,6 m | 1,4 m | 66 | Pasillos del santuario: más íntima y cercana |
| Panorámica | 7,5 m | 3,0 m | 72 | Salas grandes y miradores, para mostrar la escala |
| Combate | 5,2 m | 1,9 m | 72 | Cuando hay enemigos alertados cerca |
| Jefe | 7,0 m | 2,6 m | 74 | Arena: encuadra a Victoria y al Guardián |
| Persecución | 5,8 m | 1,3 m | 80 | Escape: baja, rápida, con sacudida ligera constante |

### 9.3 Lenguaje visual de cámara

- **Regla de tercios**: en exploración, Victoria ocupa el tercio izquierdo y el espacio libre queda hacia donde mira y avanza.
- **Contrapicado** (cámara baja mirando hacia arriba) para transmitir grandeza: fachada del templo, estatuas, puerta del santuario, Guardián.
- **Picado** (cámara alta mirando hacia abajo) para transmitir vulnerabilidad: puente sobre el abismo, Victoria sola en la arena antes del despertar.
- **Plano y contraplano por encima del hombro** para los diálogos entre Victoria y Mateo.
- **Plano holandés** (horizonte inclinado 3-4°) solo en la fase 3 del jefe y en el escape, para transmitir caos.
- **Cámara en combate**: sin fijación de objetivo. La cámara desplaza un 20 % su encuadre hacia la amenaza más cercana y muestra **flechas en el borde de la pantalla** para los enemigos que atacan desde fuera de cuadro. El Pulso tiene asistencia de puntería suave (corrige hasta 6° hacia un enemigo cercano a la retícula).
- **Cámara del jefe**: mantiene al Guardián dentro del encuadre; si se acerca al borde de la pantalla, la cámara gira suavemente para recuperarlo.
- **Sensaciones de impacto**: sacudida proporcional al golpe, congelación breve, aberración cromática leve al recibir daño fuerte.
- **Accesibilidad**: en Opciones se puede reducir o desactivar la sacudida de cámara y el desenfoque.

### 9.4 Cinemáticas guionizadas (plano a plano)

Duraciones aproximadas. Todas usan la geometría del propio juego.

**Introducción (≈14 s)**
1. Gran plano general aéreo sobre el dosel de la selva al atardecer, con niebla entre los árboles. Travelling lento hacia delante (4 s).
2. Entre la niebla asoma la cima dorada de la pirámide, brillando (3 s).
3. Plano medio de Victoria de espaldas en lo alto de una roca, con el mapa abierto; la trenza y el poncho se mueven con el viento (3 s).
4. Grúa ascendente desde Victoria hasta la selva, aparece el título "El Templo del Sol Perdido" en dorado (4 s). Mezcla suave a la cámara de juego.

**El brazalete (≈5 s)**
1. Travelling circular lento alrededor del altar, iluminado por un único haz de sol.
2. Primer plano del brazalete flotando hacia la muñeca de Victoria; destello dorado y partículas.

**Llegada al puente (≈3 s)**
- Plano general en picado: el puente cruza el abismo con niebla abajo y, al fondo, la fachada del templo enmarcada de forma simétrica.

**La puerta del santuario se abre (≈4 s)**
- Plano fijo frontal en contrapicado: el rayo de luz alcanza el cristal, las runas se encienden en cadena, la puerta se abre con polvo y temblor.

**Despertar del Guardián (≈12 s)**
1. Victoria entra en la arena: cámara baja detrás de ella, avance lento (3 s).
2. Panorámica vertical desde los pies del Guardián, sentado e inmóvil en su trono, hasta la máscara (3 s).
3. Primer plano de la máscara: las runas se encienden, el núcleo late en dorado (2 s).
4. Plano general de la arena mientras se levanta, con sacudida y polvo cayendo del techo (2 s).
5. Rótulo "GUARDIÁN DEL SOL" con el diálogo del despertar. Mezcla a la cámara de jefe.

**Transiciones de fase (≈2-3 s cada una)**
- Fase 2: acercamiento rápido al pecho mientras las placas se abren por primera vez.
- Fase 3: primer plano de las grietas naranjas apareciendo, plano holandés y rugido.

**Derrota del Guardián (≈15 s)**
1. Cámara lenta (escala de tiempo 0,3) en un travelling circular mientras el núcleo se agrieta.
2. Plano general: el caparazón cae por piezas.
3. Primer plano de Mateo de rodillas, iluminado por el núcleo.
4. Plano y contraplano por encima del hombro durante el diálogo.
5. Primer plano de la gema volando al brazalete; destello azul y dorado.
6. Plano general: el techo se agrieta. Mezcla a la cámara de persecución.

**Final (≈15 s)**
1. Plano general del borde de la selva al amanecer, con un mar de nubes; Victoria pequeña en el encuadre (4 s).
2. Plano medio de Victoria que se gira (2 s).
3. Contraplano: Mateo sale de entre los árboles (3 s).
4. Plano desde detrás de los dos, en silueta frente al sol (3 s).
5. Grúa ascendente hacia el cielo y fundido a la pantalla de victoria (3 s).

### 9.5 Principios de diseño de escenarios

- **Hito visual**: la cima dorada de la pirámide se ve desde casi toda la zona 1 y orienta al jugador sin necesidad de mapa.
- **Guiar con la luz**: el dorado marca el camino y lo importante; el azul marca la magia y el peligro. El camino principal siempre está un poco más iluminado.
- **Migas de pan**: flores solares, antorchas doradas y huellas de las botas de Mateo llevan la mirada hacia delante.
- **Marcos naturales**: arcos, raíces, columnas y aberturas en el follaje enmarcan los hitos en los momentos clave.
- **Compresión y liberación**: pasillos estrechos y bajos que desembocan en espacios amplios y altos, para que cada sala nueva impresione.
- **Ritmo**: alternar tensión (combate, plataformas) y calma (miradores, páginas del diario, música suave).
- **Silueta y profundidad**: cada escena tiene primer plano (hojas, raíces), plano medio (zona de juego) y fondo (montañas, templo, niebla).
- **Anticipación sonora**: se oye la cascada antes de verla y un latido grave antes de llegar a la arena.

### 9.6 Escenarios en detalle

**Zona 1: La selva olvidada**

| Espacio | Composición y atmósfera | Hito |
|---|---|---|
| Claro de entrada | Claro circular con el altar bajo un único haz de sol. Helechos alrededor como marco. | Al fondo, sobre el dosel, la cima de la pirámide. |
| Sendero | Camino en curva en S entre helechos gigantes y troncos con lianas. El sonido del agua crece. | Luciérnagas guiando el camino. |
| Cascada | Cascada de unos 25 m en un desfiladero, poza con rocas, niebla y un arcoíris sutil. Detrás del agua, una cueva con cristales azules. | La silueta de Victoria vista a través del agua. |
| Puente | Abismo de unos 20 m de ancho con niebla abajo. Cuerdas, tablas gastadas. | La fachada del templo, simétrica, al final del puente. |
| Ruinas | Escalinatas cubiertas de musgo, cabezas de piedra gigantes medio enterradas, raíces enormes. | El pórtico del santuario. |

**Zona 2: El santuario**

| Espacio | Composición y atmósfera | Hito |
|---|---|---|
| Vestíbulo | Pasillo bajo y estrecho que se abre a una sala alta con hileras de columnas: las líneas de perspectiva llevan al fondo. | Haces dorados cruzando el polvo. |
| Altar del escudo | Nicho iluminado en azul, con runas que respiran. | El brazalete reacciona con brillo azul. |
| Sala de los espejos | Sala de unos 20 × 20 m con techo alto, ventanas por donde entra el rayo y murales del recorrido del sol. Incrustaciones doradas en el suelo. | El cristal solar sobre la puerta. |
| Antesala | Pasillo que desciende, cada vez más cálido y dorado, con un latido grave. | La puerta tallada de la arena. |

**Zona 3: La cámara del sol**

| Espacio | Composición y atmósfera | Hito |
|---|---|---|
| Arena | Círculo de 30 m bajo una cúpula con un óculo: un haz de sol cae sobre el trono del Guardián. Anillos de runas concéntricos en el suelo que se encienden en cada fase. Canales de luz dorada en los muros. | El Guardián en su trono. |
| Fase 3 | La cúpula se agrieta y entran nuevos haces de luz anaranjada; brasas en el aire. | Las grietas del Guardián. |
| Escape | El santuario recorrido en sentido inverso, con derrumbes nuevos, polvo naranja y luz parpadeante. | La luz del exterior al final. |
| Final | Borde de un acantilado sobre la selva al amanecer, con mar de nubes. | El sol naciente. |

---

## 10. INTERFAZ (HTML/CSS sobre el canvas)

Toda la interfaz es HTML y CSS en capas sobre el canvas, con `pointer-events: none` salvo en los menús.

- **Cuaderno de la cartógrafa** (requisito 7 del curso): panel arriba a la izquierda, con estilo de papel y tinta. Muestra el nombre de la zona actual ("La selva olvidada — Cascada"), las coordenadas `X: 12.4 | Y: 1.0 | Z: -33.7` de Victoria y una brújula que gira con la cámara (transformación CSS). El texto se actualiza como máximo 10 veces por segundo y solo si cambió.
- **HUD**: barra de vida, tres iconos de poderes dibujados con CSS o SVG con reutilización circular, retícula, aviso de interacción ("E — Girar espejo"), mensajes contextuales, subtítulos, barra de vida del jefe y temporizador del escape.
- **Pantalla "Haz clic para comenzar"**: desbloquea el audio (`AudioContext.resume()`) y captura el ratón. Es el mismo patrón del aviso de audio de la semana 9.
- **Pantalla de carga**: progreso real con `LoadingManager` mientras se cargan los `.glb` y los sonidos.
- **Menú principal**: título animado en dorado sobre una vista 3D del templo, con Jugar, Opciones, Demostración técnica y Salir.
- **Opciones**: volumen general, de música, de efectos y de ambiente; sensibilidad del ratón; invertir eje Y; intensidad de la sacudida de cámara; desenfoque; calidad (Baja, Media, Alta); pantalla completa (Fullscreen API). Se guardan en `localStorage` dentro de `try/catch`.
- **Pausa**: Continuar, Opciones, Modo foto, Reiniciar desde checkpoint y Menú principal. La pausa detiene la física y la lógica del juego.
- **Derrota**: "Victoria ha caído", con Reintentar y Menú.
- **Victoria**: título "VICTORIA" con tiempo total, muertes y páginas del diario encontradas (x/6).
- **Panel del diario**: papel envejecido hecho con degradados CSS y un filtro SVG `feTurbulence` (generado por código).
- **Tipografía**: solo fuentes del sistema (por ejemplo, Georgia o Palatino para el diario) y títulos con degradado dorado (`background-clip: text`). No se descargan fuentes.
- Transiciones con fundidos. Toda la interfaz en español.

---

## 11. AUDIO GENERADO POR CÓDIGO

- **Síntesis**: `tools/audio/audio_synth.py` (osciladores, ruido, envolventes y filtros) genera `.wav` y los convierte a `.mp3` con ffmpeg en `public/sounds/` (minúsculas, sin espacios). Si ffmpeg no está instalado, se usan los `.wav`.
- **Receptor**: un `THREE.AudioListener` acoplado a la cámara.
- **`PositionalAudio`** (requisito 3): la cascada es el emisor principal (`setRefDistance(3)`, `setMaxDistance(25)`, en bucle), anclado a un objeto `emit_*`. También las antorchas, el núcleo del Guardián (latido), los centinelas, los espectros y los mecanismos.
- **`THREE.Audio`** (global): música por zona, portal, checkpoint, página del diario, desbloqueo de poderes, interfaz, derrota y victoria.
- Los sonidos de efectos se reproducen desde *pools* creados al cargar (8 posicionales y 8 globales); nunca se crea un objeto de audio en `animate()`.
- **Volúmenes por categoría** (general, música, efectos, ambiente) desde las opciones.
- **Efectos**: pasos (tierra y piedra), salto y aterrizaje, Pulso (disparo e impacto), Escudo (activar, bloquear y reflejar), interacción, mecanismo de piedra, golpe de centinela, orbe de espectro, rugido del jefe, derrumbe, checkpoint, portal, página del diario e interfaz.
- **Ambientes**: selva (viento filtrado, pájaros sintetizados, cascada a partir de ruido) y templo (zumbido grave, goteo).
- **Música**: pads y arpegios generados por el mismo script, uno por zona, y un tema del jefe que se intensifica en cada fase.
- Si el sonido no alcanza la calidad mínima, se prioriza que existan todos los efectos, aunque sean simples, antes que pulir la música.

---

## 12. STACK TÉCNICO

| Área | Tecnología |
|---|---|
| Entorno | Node.js 20 LTS o superior, npm |
| Proyecto y servidor | Vite, plantilla *vanilla* (`npm create vite@latest . -- --template vanilla`), servidor en `http://localhost:5173` |
| Motor gráfico | **Three.js 0.160.0** (la misma versión usada en clase), con sus *addons* de `three/examples/jsm/` |
| Motor físico | **cannon-es 0.20.0** |
| Depuración | `lil-gui` (solo en modo depuración) y `stats.js` incluido en Three.js |
| Lenguaje | JavaScript con módulos ES, comprobado con `// @ts-check` + JSDoc (`typescript` solo como dependencia de desarrollo para `npm run check`) |
| Pruebas | Ejecutor nativo de Node (`node --test`), sin librerías adicionales |
| Arte | Blender 3.6 o superior en modo background con scripts de Python |
| Audio | Python 3 (síntesis) y ffmpeg (conversión a `.mp3`, opcional) |
| Control de versiones | Git, con repositorio público en GitHub |
| Navegador objetivo | Chrome o Edge con WebGL 2 activo (`chrome://gpu`) |

- Las versiones se fijan exactas en `package.json`: `npm install three@0.160.0 cannon-es@0.20.0 lil-gui` y `npm install -D vite typescript`. Si al instalar hay una razón técnica para usar otra versión, se anota en `docs/PENDIENTES.md`.
- **Addons utilizados**: `GLTFLoader`, `DRACOLoader` (opcional), `PointerLockControls`, `OrbitControls`, `Sky`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `BokehPass`, `OutputPass`, `stats.module.js`.
- **Sin dependencias adicionales** ni recursos descargados.

---

## 13. ARQUITECTURA

```
templo-del-sol/
├── index.html
├── package.json
├── vite.config.js
├── jsconfig.json
├── public/
│   ├── models/        (zona_1_selva.glb, zona_2_santuario.glb, zona_3_camara_sol.glb,
│   │                    victoria.glb, mateo.glb, centinela.glb, espectro.glb,
│   │                    guardian.glb, props.glb)
│   └── sounds/        (generados; minúsculas y sin espacios)
├── src/
│   ├── main.js
│   ├── style.css
│   ├── config/        (palette, player, enemies, boss, abilities, camera_profiles, quality, input_map)
│   ├── core/          (game_loop, renderer, physics_world, assets, audio_manager, input,
│   │                    event_bus, game_state, pools, settings, temp)
│   ├── world/         (level_loader, triggers, environment, materials, shaders/)
│   ├── player/        (player_controller, procedural_animator, abilities/)
│   ├── camera/        (camera_rig, camera_zones, occlusion, cinematic_player, shake, photo_mode)
│   ├── enemies/       (state_machine, sentinel, specter)
│   ├── boss/          (guardian, phases, attacks/)
│   ├── interaction/   (interactables, mirrors_puzzle, light_beam, portal, diary)
│   ├── fx/            (particles, projectile_pool, fragments, warning_decals)
│   ├── ui/            (hud, cartographer_panel, menus, subtitles, screens)
│   ├── cinematics/    (intro, bracelet, bridge, door, boss_awaken, boss_phases, boss_defeat, ending)
│   └── debug/         (debug_panel, demo_mode, helpers)
├── tests/             (pruebas con node --test)
├── tools/
│   ├── blender/       (common.py, palette.py, builders, build_*.py, stats.py)
│   ├── audio/         (audio_synth.py)
│   └── build_assets.mjs
└── docs/              (README.md, CONTROLES.md, EJECUTAR_Y_PUBLICAR.md, REQUISITOS_CURSO.md,
                        FUNCIONALIDADES.md, PENDIENTES.md, GUION_VIDEO.md, FICHA_CONCEPTO.md)
```

### 13.1 Principios

- **Un único bucle `animate()`** en `core/game_loop.js`, con este orden: entrada → `world.step(1 / 60, deltaTime, 3)` → copiar posición y rotación de cada cuerpo a su malla → lógica (jugador, enemigos, jefe, triggers, acertijos) → cámara → partículas → audio → HUD (limitado a 10 Hz) → render con el compositor. `deltaTime` se limita a 0,1 s para que la física no se descontrole al volver de otra pestaña.
- **Arquitectura espejo** (semanas 5 y 10): física (cannon-es) y render (Three.js) desacoplados; un registro de pares `{ mesh, body }` se sincroniza en cada fotograma.
- **Sistemas independientes** comunicados por un `event_bus` simple (basado en `EventTarget`) para los eventos globales: jugador muerto, checkpoint alcanzado, poder desbloqueado, zona cambiada, jefe derrotado, página encontrada.
- **Lógica separada de la vista**: vida, reutilizaciones, máquinas de estados, fases del jefe, acertijo y triggers son módulos de lógica pura que se prueban con `node --test` sin necesitar WebGL.
- **Datos en `src/config/`**: ningún valor de balance escrito directamente en la lógica.
- **Cero creación en el bucle** (requisito 8):
  - *Pools* creados al cargar: proyectiles 16, orbes 16, fragmentos 60, rocas 20, sonidos 16.
  - Partículas con capacidad fija.
  - Vectores, cuaterniones, `Box3` y `Raycaster` temporales en `core/temp.js`.
- **Carga**: las tres zonas se cargan al inicio con la pantalla de progreso y se colocan alejadas entre sí; luego se activan o desactivan según la zona, para evitar tirones a mitad del juego. El escape reutiliza la geometría del santuario.
- **Liberación de memoria**: al volver al menú se liberan geometrías, materiales y texturas con `dispose()`.
- **Nombres**: archivos en `snake_case`, clases en `PascalCase`, recursos en minúsculas y sin espacios.

### 13.2 Herramientas de depuración (solo con `?debug` o en `npm run dev`)

- **Teclas 1–5**: teletransporte a la entrada, el puente, el santuario, el acertijo y la arena.
- **6**: invulnerabilidad. **7**: desbloquear todos los poderes. **8**: vida del jefe al 36 % (para probar la fase 3). **9**: FPS (`stats.js`), llamadas de dibujo (`renderer.info`) y estado de la IA. **0**: mostrar triggers y colisionadores.
- **Panel `lil-gui`**: velocidades, salto, cámara, luces, niebla, bloom y partículas en tiempo real.

---

## 14. CALIDAD, RENDIMIENTO Y PRUEBAS

### 14.1 Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo (`http://localhost:5173`) |
| `npm run build` | Compilación de producción en `dist/`; debe terminar sin errores ni advertencias |
| `npm run preview` | Probar la compilación de producción |
| `npm run check` | Comprobación de tipos JSDoc con `tsc --noEmit`; cero errores |
| `npm test` | Pruebas de lógica con `node --test tests/` |
| `npm run assets` | Regenera los `.glb` (Blender) y los sonidos (Python) |

**Prueba de humo**: con `?smoke` en la URL, el juego carga cada zona, ejecuta 300 fotogramas por zona e informa en pantalla y en consola de cualquier error, aviso de WebGL o recurso faltante (404).

### 14.2 Pruebas automáticas mínimas

- Vida: daño, curación, invulnerabilidad y muerte.
- Reutilización y desbloqueo de los poderes. La Manipulación sin objetivo no consume nada.
- Transiciones de estado de centinela y espectro (simulando la posición del jugador).
- Triggers: detección radial por distancia y por caja AABB; el portal respeta su *cooldown* de 3 s.
- Acertijo: dada una combinación de rotaciones, el sistema detecta si está resuelto; la solución diseñada funciona y no hay estados bloqueados.
- Jefe: transiciones de fase por umbral de vida e invulnerabilidad con el núcleo cerrado.
- *Pools*: nunca crean objetos nuevos al agotarse (reciclan el más antiguo).
- Checkpoints, reaparición, pausa y temporizador del escape.
- Cámara: la mezcla entre perfiles termina en el perfil correcto y las cinemáticas se pueden saltar y devuelven el control.

### 14.3 Rendimiento

- **60 FPS** en Chrome a 1920 × 1080 en un PC de gama media (equivalente a una GTX 1060) en calidad Media; en Baja, jugable con gráficos integrados recientes.
- Menos de 300 llamadas de dibujo por fotograma (visible en el modo demostración).
- Sin dientes de sierra de recolección de basura en el perfil de memoria de Chrome durante el juego (prueba de que no se crean objetos en el bucle).

| Calidad | `pixelRatio` máximo | Sombras | Bloom | Profundidad de campo | Vegetación |
|---|---|---|---|---|---|
| Baja | 1 | 1024, solo la direccional | No | No | 40 % |
| Media | 1,5 | 2048 | Sí | No | 70 % |
| Alta | 2 | 2048 + `SpotLight` del santuario | Sí | En cinemáticas | 100 % |

### 14.4 Definición de "terminado"

Una funcionalidad está terminada solo si: `npm run build`, `npm run check` y `npm test` pasan, la prueba de humo pasa, no hay errores en la consola del navegador, está anotada para que el productor la pruebe y, si cubre un requisito del curso, está registrada en `docs/REQUISITOS_CURSO.md`. **Nunca se declara funcional algo que no se haya probado.**

---

## 15. PLAN DE 7 DÍAS

**Reglas del plan:**

1. Al final del **día 2**, los **8 requisitos del curso** deben funcionar en la zona 1. A partir de ahí, el proyecto ya cumple lo obligatorio aunque algo se retrase.
2. Al final del **día 5**, el juego debe poder jugarse **completo de principio a fin**, aunque sea con arte sencillo.
3. El día 6 es solo de pulido. Si algo se retrasa, se aplica la sección 17; nunca se recorta jugabilidad ni requisitos del curso.

| Día | Trabajo | Criterio de aceptación |
|---|---|---|
| **1** | Diagnóstico del entorno. Proyecto Vite, dependencias con versión fija, estructura, bucle único, mundo físico, entrada, `PointerLockControls` y `CameraRig` básico. Pantalla "Haz clic para comenzar". Panel de la cartógrafa. Canalización de Blender: `common.py` y un nivel de prueba exportado a `.glb` con colisionadores leídos por nombre. Victoria provisional (cápsula). Pruebas base. | La cápsula se mueve, corre y salta sobre un `.glb` exportado desde Blender; el panel muestra zona y coordenadas en tiempo real; las pruebas pasan. |
| **2** | Victoria generada en Blender + `ProceduralAnimator`. Sistema de cámara completo. **Zona 1 completa** con luces y sombras. Triggers radiales y AABB, portal de la cascada, esferas rituales y tablas del puente con física, partículas de la cascada, audio posicional de la cascada, checkpoints, vida y flores. | **Los 8 requisitos del curso se cumplen en la zona 1.** Se recorre la zona completa con muerte y reaparición. |
| **3** | Los tres poderes con efectos básicos, *pool* de proyectiles, interactuables, páginas del diario, desbloqueo progresivo. HUD completo, pausa, derrota. Herramientas de depuración y `lil-gui`. | Los tres poderes funcionan con su reutilización y el HUD los refleja. |
| **4** | Centinela y espectro con máquinas de estados. **Zona 2 completa**: altar del escudo, acertijo de espejos, puerta. Sistema de rayos de luz reutilizable. | Se juega desde la entrada hasta la antesala del jefe. |
| **5** | **Zona 3**, Guardián con sus tres fases, pilares, diálogos, `CinematicPlayer` con las cinemáticas del jefe, escape, final y pantalla de victoria. Menú principal básico. | **El juego completo se puede jugar de principio a fin.** |
| **6** | Cinemáticas de introducción, brazalete, puente, puerta y final. Composición de escenarios (sección 9.6). Postprocesado, iluminación por zona, *shaders*, partículas restantes, animaciones refinadas, transiciones. Audio completo. Opciones y niveles de calidad. **Modo demostración**. | El juego se ve y suena como un producto terminado; el modo demostración recorre los 8 requisitos. |
| **7** | Pruebas integrales, correcciones del productor, balance, rendimiento, `npm run build` final, documentación (`REQUISITOS_CURSO.md`, `GUION_VIDEO.md`, `FICHA_CONCEPTO.md`). | Compilación final funcionando y entregables listos para la sustentación. |

**Cada día termina con:** commit, pruebas en verde, `npm run build` sin errores, versión jugable para el productor e informe diario (sección 16).

---

## 16. COMUNICACIÓN CON EL PRODUCTOR

### Informe diario de Claude Code

```
## Día N — Resumen
### Hecho y probado
- (funcionalidad) — probado con: (prueba automática / prueba de humo / captura)
### Requisitos del curso cubiertos hasta hoy
- (1..8) — dónde verlo
### Qué debes probar hoy (máximo 10 minutos)
1. (acción concreta: "Abre localhost:5173/?debug, pulsa 3 y cruza el santuario; fíjate si la cámara atraviesa las paredes")
### Pendiente / riesgos
- ...
### Plan para mañana
- ...
```

### Plantilla de reporte del productor

```
Qué hice: (ej. "salté en el puente justo cuando caía la tabla")
Qué esperaba: ...
Qué pasó: ...
Dónde: (zona o tecla de depuración)
¿Se repite siempre?: sí / a veces / una vez
Navegador: Chrome / Edge
Sensación (opcional): (ej. "el salto se siente flotante")
```

Claude Code atiende primero los reportes que bloquean el avance o afectan a un requisito del curso, después los de sensación de juego y por último los visuales.

---

## 17. RECORTES DE EMERGENCIA (en este orden)

1. `VideoTexture` opcional (por ejemplo, un video del juego en el menú principal).
2. Profundidad de campo en las cinemáticas (se conserva el bloom).
3. Cinemáticas menores (brazalete, puente, puerta) reducidas a un solo plano fijo con fundido.
4. Soporte de mando.
5. Bloqueo perfecto del escudo.
6. Invocación de espectros en la fase 3.
7. Densidad de vegetación y número de props decorativos.
8. Páginas del diario 2, 3 y 5 (se conservan la 1, la 4 y la 6).
9. Escape reducido a un pasillo recto con rocas cayendo.
10. Música por zona: un solo tema ambiental y el tema del jefe.
11. Acertijo reducido a dos espejos.

**Nunca se recorta:** los 8 requisitos del curso, el panel de la cartógrafa, el modo demostración, el recorrido completo de principio a fin, los tres poderes, las tres fases del jefe, la revelación del padre, las cinemáticas del despertar y de la derrota del Guardián, el escape, ni las pantallas de victoria y derrota.

---

## 18. REGLAS DE DESARROLLO

1. Inspecciona primero el entorno: versiones de Node, npm, Blender, Python, ffmpeg y Git, y soporte de WebGL 2.
2. Si el proyecto está vacío, crea la estructura de la sección 13.
3. No sobrescribas archivos existentes sin inspeccionarlos.
4. Desarrolla por módulos, en el orden del plan.
5. Ejecuta `npm run check` y `npm test` después de cada módulo, y `npm run build` al final de cada día.
6. Corrige los errores antes de continuar.
7. No declares funcional una característica que no hayas probado.
8. Sin dependencias ni recursos externos: nada de modelos, texturas, HDRI, fuentes, complementos ni sonidos descargados.
9. Todo el arte y el audio se generan por código, con semillas fijas.
10. Nada se crea dentro de `animate()`.
11. Recursos en `public/`, en minúsculas, sin espacios y con rutas absolutas.
12. No sacrifiques la jugabilidad ni los requisitos del curso por la decoración.
13. Ningún valor de balance escrito directamente en la lógica: todo en `src/config/`.
14. Mantén `docs/REQUISITOS_CURSO.md` actualizado: requisito → archivo y función → cómo demostrarlo.
15. Cada día termina con un informe y una versión jugable para el productor.
16. Si encuentras una dificultad, propón una solución técnicamente viable que mantenga el alcance, y aplica la sección 17 antes de recortar cualquier cosa protegida.

---

## 19. ENTREGA FINAL Y SUSTENTACIÓN

**Entregables técnicos:**

- Repositorio público en GitHub con el proyecto completo (código, scripts de Blender y de audio, recursos generados en `public/`).
- Compilación de producción (`dist/`). Opcional: publicada en GitHub Pages o Netlify para tener un enlace directo.
- `docs/README.md`: requisitos, instalación (`npm install`), ejecución (`npm run dev`) y compilación.
- `docs/CONTROLES.md` y `docs/EJECUTAR_Y_PUBLICAR.md`.
- `docs/REQUISITOS_CURSO.md`: tabla de los 8 requisitos con el archivo, la función y la forma de demostrarlo.
- `docs/FUNCIONALIDADES.md`: lo implementado y cómo se probó.
- `docs/PENDIENTES.md`: limitaciones, recortes aplicados y elementos pendientes.

**Apoyo para la entrega del equipo** (en el taller de la semana 3, el docente pidió repositorio, video corto y ficha en PDF; **el formato final se confirma con el docente**):

- `docs/GUION_VIDEO.md`: guion de un video de 30 a 60 segundos que muestre los 8 requisitos con el audio activado. El equipo lo graba.
- `docs/FICHA_CONCEPTO.md`: borrador de la ficha del concepto (1 página) para que el equipo la revise, añada sus nombres y la exporte a PDF.

**Sustentación (demostración en vivo):** ruta de unos 5 minutos con el modo demostración (sección 1.4): presentación del concepto → recorrido por los 8 requisitos → un tramo de juego real (combate y acertijo) → fase 3 del jefe con la tecla de depuración 8 → FPS y llamadas de dibujo.

---

## 20. PRIMERA TAREA

Antes de escribir código, presenta:

1. Diagnóstico del entorno: sistema operativo; versiones de Node, npm, Git, Python y ffmpeg; ruta y versión de Blender; navegador y soporte de WebGL 2.
2. Estado del proyecto (vacío o existente).
3. Estructura que vas a crear.
4. Lista detallada de tareas del día 1 con su criterio de aceptación.

Si falta Blender o Node, indícale al productor exactamente qué instalar y cómo (enlace oficial y pasos para Windows) antes de continuar.

Después comienza el día 1.
