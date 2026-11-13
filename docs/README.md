# El Corazón del Guardián

Aventura 3D para navegador hecha con **Three.js 0.160.0** y **cannon-es 0.20.0**: proyecto integrador de *Programación de Entornos Multimedia*.

Victoria sigue el mapa de su padre desaparecido hasta un templo perdido en la selva y descubre que el Guardián del Sol que lo protege es su propio padre, atrapado por la gema que vino a buscar.

Todo se genera con código: los personajes y escenarios con scripts de Python en Blender, la música y los efectos de sonido con numpy (los personajes no tienen voz), y los materiales, la luz y las partículas en Three.js.

## Requisitos

- Node.js 20 o superior.
- Chrome o Edge con WebGL 2 y la aceleración por hardware activa.
- Solo para regenerar los recursos: Blender 3.6 o superior (probado con 5.2 LTS), Python 3 con numpy y, opcionalmente, ffmpeg.

## Ejecutar

**Primera vez en una computadora nueva:** sigue [ONBOARDING.md](ONBOARDING.md). Es un comando para instalar todo y otro para jugar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1   # Windows (en macOS o Linux: bash scripts/instalar.sh)
npm run jugar                                                  # abre el juego en el navegador
```

Pulsa **Jugar** en el menú. **Demostración técnica** recorre los 8 requisitos del curso, uno por uno.

- Controles: [CONTROLES.md](CONTROLES.md).
- Cómo compilar, publicar y probar en otra computadora: [EJECUTAR_Y_PUBLICAR.md](EJECUTAR_Y_PUBLICAR.md).

## Comandos

| Comando | Uso |
|---|---|
| `npm run jugar` | Servidor de desarrollo y abre el navegador |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Probar la compilación de producción |
| `npm run check` | Comprobación de tipos JSDoc |
| `npm test` | 113 pruebas (`node --test`): lógica, y simulaciones que cargan los `.glb` reales y hacen correr la física |
| `npm run banco` | Prueba de rendimiento (`/?banco`): recorre seis lugares, gira la cámara en cada uno y muestra FPS, el 1 % más lento y el tiempo del procesador y de la tarjeta, con un botón para copiar los resultados |
| `npm run zfighting` | Busca caras superpuestas en el mismo plano en los tres escenarios (el parpadeo con «dientes» de dos superficies que se pelean) |
| `npm run assets` | Regenera los `.glb` con Blender y los sonidos y la música con Python. La ruta de Blender se lee de `BLENDER_PATH`. |

## Documentación

| Documento | Contenido |
|---|---|
| [ONBOARDING.md](ONBOARDING.md) | Instalar el proyecto en otra computadora con un comando (y [AGENTS.md](../AGENTS.md) para los agentes) |
| [REQUISITOS_CURSO.md](REQUISITOS_CURSO.md) | Los 8 requisitos del curso: archivo, función y cómo demostrarlos |
| [CHECKLIST_CURSO.md](CHECKLIST_CURSO.md) | Todo lo visto en las semanas 1 a 10 y cómo está en el juego |
| [FUNCIONALIDADES.md](FUNCIONALIDADES.md) | Lo que tiene el juego y cómo se probó |
| [CONTROLES.md](CONTROLES.md) | Teclas de juego y de depuración |
| [EJECUTAR_Y_PUBLICAR.md](EJECUTAR_Y_PUBLICAR.md) | Compilar, publicar y probar en otra computadora |
| [GUION_DIALOGOS.md](GUION_DIALOGOS.md) | Todas las líneas de diálogo, con su código y emoción |
| [PRESENTACION.md](PRESENTACION.md) | Material para las diapositivas: números, propuesta de diapositivas, cómo funciona cada parte y datos curiosos |
| [GUION_EPILOGO.md](GUION_EPILOGO.md) | Guion gráfico del epílogo «La marcha» |
| [GUION_VIDEO.md](GUION_VIDEO.md) | Guion del video corto de la entrega |
| [FICHA_CONCEPTO.md](FICHA_CONCEPTO.md) | Borrador de la ficha del concepto (una página) |
| [PENDIENTES.md](PENDIENTES.md) | Decisiones, desvíos del documento maestro y lo que queda pendiente |

## Estructura

Sigue la sección 13 del documento maestro (`TEMPLO_DEL_SOL_INSTRUCCIONES.md`):

- `src/`: el código del juego (núcleo, cámara, jugador, enemigos, mundo, interfaz, cinemáticas, efectos).
- `tools/blender/`: la generación de modelos; `tools/audio/`: la síntesis de sonidos y música.
- `public/models/` y `public/sounds/`: los recursos generados.
- `tests/`: las pruebas.
- `docs/`: la documentación y los renders de revisión (`docs/previews/`).
