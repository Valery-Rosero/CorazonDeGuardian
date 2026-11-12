# El Templo del Sol Perdido — Guion de diálogos

Este guion reúne todo lo que se dice o se lee en el juego. Cada línea tiene un **código**: el juego lo usa para mostrar el subtítulo, mover la cara del personaje y, si existe, reproducir el audio con ese nombre.

- **Los personajes no tienen voz** (decisión del 11/11): cada línea se lee en subtítulos y la boca de quien habla sigue el texto.

*Estado: el sistema de diálogos (`src/ui/dialogue_player.js`) lee estos códigos desde `src/config/dialogues.js`, muestra el subtítulo y mueve la boca y la expresión de quien habla. Sin sonido de voz. Las cuatro líneas que eran propuesta se aprobaron el 11/11 y ya están en el juego (brazalete, cascada, puente y voz tras la puerta).*

La duración es la que el juego le da a la línea para el subtítulo y para mover la boca.

---

## Personajes

| Personaje | Cómo suena | Subtítulo |
|---|---|---|
| **Victoria Solano** | Joven, decidida, cálida. Nunca grita por miedo: grita para darse ánimo. | Blanco cálido |
| **Mateo Solano** | Adulto, grave, cansado. Dentro del Guardián, su voz llega débil y con eco (el eco lo añade el juego). | Blanco cálido |
| **La Gema del Sol** | Susurro hermoso y posesivo, casi cantado. Parece varias voces a la vez (el coro lo añade el juego a partir de una sola toma). | Dorado con brillo |

---

## 1. Prólogo y selva

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `vic_brazalete_01` | El brazalete flota hacia su muñeca | Victoria | «Así que esto buscabas, papá.» | ternura | 2,4 s |
| `vic_cascada_01` | Al llegar a la cascada, después de leer la página 2 | Victoria | «"Detrás del agua hay un camino". Como siempre, tenías razón.» | alegría | 5,2 s |
| `vic_puente_01` | Plano general del puente | Victoria | «Te aguantó a ti… ojalá me aguante a mí.» | determinación | 3,7 s |

## 2. Santuario

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `vic_voz_01` | Tras la puerta de los espejos se oye una voz | Victoria | «¿Papá? ¿Eres tú?» | sorpresa | 1,8 s |

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

**Final (amanecer):** sin diálogo. Victoria se gira, Mateo sale del portal de runas y los dos miran el sol.

## 4b. Epílogo «La marcha» (después del amanecer)

Sobre la cresta del monte del este, a contraluz del sol, se encienden cientos de ojos: un ejército de centinelas y espectros baja hacia la cornisa. Plano a plano en [GUION_EPILOGO.md](GUION_EPILOGO.md).

| Código | Momento | Personaje | Línea | Emoción | Duración |
|---|---|---|---|---|---|
| `mat_epilogo_01` | Primer plano de Mateo, mirando la cresta | Mateo | «La gema… los está llamando.» | miedo, en voz baja | 2,6 s |
| `vic_epilogo_01` | Primer plano de Victoria; acaba de mirar el brazalete | Victoria | «¿Cómo saldremos de aquí?» | miedo contenido | 1,9 s |

Después: golpe de la música, negro y «Continuará…»; luego la pantalla de victoria.

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

## Las cuatro líneas nuevas (aprobadas el 11/11)

El documento maestro solo fija los diálogos del combate y las páginas del diario. Las cuatro líneas de Victoria (brazalete, cascada, puente y voz) son nuevas: momentos cortos de Victoria que ayudan a que el jugador la conozca antes del final. Respetan el pilar de «poco texto y mucha intención».

**Hay que aprobarlas.** Si no se aprueban, se quitan sin tocar nada más.

---

## Voces

Los personajes no tienen voz: lo pediste el 11/11. El murmullo sintetizado (`murmullo` en `tools/audio/audio_synth.py`) sigue en el código por si algún día se quiere volver a usar, pero no se genera ni se carga.
