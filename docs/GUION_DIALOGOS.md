# El Templo del Sol Perdido — Guion de diálogos

Este guion reúne todo lo que se dice o se lee en el juego. Cada línea tiene un **código**: el juego lo usa para mostrar el subtítulo, mover la cara del personaje y, si existe, reproducir el audio con ese nombre.

- **Sin grabación:** el juego funciona igual, con subtítulos y la boca siguiendo el texto.
- **Con grabación:** basta con poner el archivo en `public/sounds/voz/` con el nombre indicado y sonará en lugar de la voz sintetizada.

*Estado: los subtítulos y la boca que sigue el texto ya funcionan. El sistema de diálogos que lee estos códigos y busca los audios se construye junto con las cinemáticas (días 5 y 6).*

La duración estimada es la que el juego le da a la línea para mover la boca. Una toma grabada puede durar un poco más o menos; el juego se ajusta a la duración real del audio.

---

## Personajes y voces

| Personaje | Cómo suena | Subtítulo |
|---|---|---|
| **Victoria Solano** | Joven, decidida, cálida. Nunca grita por miedo: grita para darse ánimo. | Blanco cálido |
| **Mateo Solano** | Adulto, grave, cansado. Dentro del Guardián, su voz llega débil y con eco (el eco lo añade el juego). | Blanco cálido |
| **La Gema del Sol** | Susurro hermoso y posesivo, casi cantado. Parece varias voces a la vez (el coro lo añade el juego a partir de una sola toma). | Dorado con brillo |

---

## 1. Prólogo y selva

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `vic_brazalete_01` *(propuesta)* | El brazalete flota hacia su muñeca | Victoria | «Así que esto buscabas, papá.» | ternura | 2,4 s |
| `vic_cascada_01` *(propuesta)* | Al llegar a la cascada, después de leer la página 2 | Victoria | «"Detrás del agua hay un camino". Como siempre, tenías razón.» | alegría | 5,2 s |
| `vic_puente_01` *(propuesta)* | Plano general del puente | Victoria | «Te aguantó a ti… ojalá me aguante a mí.» | determinación | 3,7 s |

## 2. Santuario

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `vic_voz_01` *(propuesta)* | Tras la puerta de los espejos se oye una voz | Victoria | «¿Papá? ¿Eres tú?» | sorpresa | 1,8 s |

## 3. Combate contra el Guardián (sección 3.4 del documento maestro)

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `mat_despertar_01` | El Guardián se levanta | Mateo (desde dentro) | «¿Victoria…? No… vete… no me deja soltarla…» | miedo, voz rota | 5,9 s |
| `gem_despertar_01` | Justo después | La Gema | «Otra mano que quiere robar el sol.» | desprecio, susurro | 2,7 s |
| `gem_fase2_01` | Las placas del pecho se abren por primera vez | La Gema | «¡Nadie saldrá de este templo con mi luz!» | furia | 3,2 s |
| `vic_fase2_01` | Respuesta inmediata | Victoria | «¡Papá, resiste!» | determinación | 1,6 s |
| `mat_fase3_01` | El Guardián baja del 35 % de vida | Mateo (desde dentro) | «Hija… el núcleo… rómpelo… no tengas miedo.» | dolor, ternura | 5,1 s |

## 4. Derrota del Guardián y escape

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `mat_derrota_01` | Mateo de rodillas entre los restos del caparazón | Mateo | «Victoria… viniste.» | alivio, agotado | 2,1 s |
| `vic_derrota_01` | Plano y contraplano | Victoria | «Te dije que llegaría antes que tú.» | ternura, entre la risa y el llanto | 2,7 s |
| `mat_escape_01` | El templo empieza a derrumbarse | Mateo | «¡Corre! Estoy justo detrás de ti.» | urgencia | 2,9 s |

**Final (amanecer):** sin diálogo. Victoria se gira, Mateo sale de entre los árboles, ambos miran el sol y aparece «VICTORIA».

---

## 5. Páginas del diario de Mateo (sección 3.3)

Se leen en un panel de papel. Si se graban, las lee **Mateo en voz en off**, cada vez más cansado. En la página 6 lo acompaña el susurro de la Gema.

| Código | Lugar | Texto | Cómo leerla |
|---|---|---|---|
| `mat_diario_01` | Entrada | «Día 1. El mapa no mentía. Hay escalones de piedra bajo el musgo. Victoria, si algún día lees esto, perdóname por no esperarte.» | Ilusionado; la última frase, con culpa |
| `mat_diario_02` | Cascada | «Detrás del agua hay un camino. Los constructores amaban el sol: cada piedra mira hacia el este.» | Curioso, de arqueólogo |
| `mat_diario_03` | Puente | «El puente aguantó mi peso. Apenas. Juraría que las estatuas se mueven cuando no las miro.» | Medio en broma, medio inquieto |
| `mat_diario_04` | Santuario | «Los espejos llevan la luz hasta la puerta. Lo resolví. Detrás hay una voz. Dice mi nombre.» | Orgulloso al principio; susurrando al final |
| `mat_diario_05` | Antesala del jefe | «La gema es cálida. Me pide que me quede. Solo un poco más. Solo un poco.» | Hipnotizado, lento |
| `mat_diario_06` | Puerta de la arena | «no la tomes. no salgas. el sol es mío. el sol es MÍO. victoria perdón» | Mateo y la Gema se pisan; «MÍO» es la Gema; «victoria perdón» es Mateo, apenas audible |

---

## Las líneas marcadas como *propuesta*

El documento maestro solo fija los diálogos del combate y las páginas del diario. Las cuatro líneas *propuesta* son nuevas: momentos cortos de Victoria que ayudan a que el jugador la conozca antes del final. Respetan el pilar de «poco texto y mucha intención».

**Hay que aprobarlas.** Si no se aprueban, se quitan sin tocar nada más.

---

## Si se graban las voces

- **Formato:** WAV o MP3, mono, 44,1 o 48 kHz. Sirve un celular en un cuarto silencioso, a un palmo de la boca.
- **Una toma limpia por archivo**, con medio segundo de silencio antes y después. Graben 2 o 3 tomas y elijan la mejor.
- **Sin efectos:** el eco de Mateo dentro del Guardián y el coro de la Gema los añade el juego.
- **Nombre del archivo** = código de la línea: `mat_despertar_01.mp3`. Van en `public/sounds/voz/`.
- **Importante para la entrega:** el documento del curso dice que todo el sonido se genera por código. Las voces grabadas por el equipo son originales, pero conviene **confirmarlo con el docente** antes de grabar.
