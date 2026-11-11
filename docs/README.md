# El Templo del Sol Perdido

Aventura 3D para navegador hecha con **Three.js 0.160.0** y **cannon-es 0.20.0**: proyecto integrador de *Programación de Entornos Multimedia*.

Victoria sigue el mapa de su padre desaparecido hasta un templo perdido en la selva y descubre que el Guardián del Sol que lo protege es su propio padre, atrapado por la gema que vino a buscar.

Todo se genera con código: los personajes y escenarios con scripts de Python en Blender, la música, las voces y los efectos de sonido con numpy, y los materiales, la luz y las partículas en Three.js.

## Requisitos

- Node.js 20 o superior.
- Chrome o Edge con WebGL 2 y la aceleración por hardware activa.
- Solo para regenerar los recursos: Blender 3.6 o superior (probado con 5.2 LTS), Python 3 con numpy y, opcionalmente, ffmpeg.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
```

Pulsa **Jugar** en el menú. **Demostración técnica** recorre los 8 requisitos del curso, uno por uno.

- Controles: [CONTROLES.md](CONTROLES.md).
- Cómo compilar, publicar y probar en otra computadora: [EJECUTAR_Y_PUBLICAR.md](EJECUTAR_Y_PUBLICAR.md).

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Probar la compilación de producción |
| `npm run check` | Comprobación de tipos JSDoc |
| `npm test` | 93 pruebas (`node --test`): lógica, y simulaciones que cargan los `.glb` reales y hacen correr la física |
| `npm run assets` | Regenera los `.glb` con Blender y los sonidos y la música con Python. La ruta de Blender se lee de `BLENDER_PATH`. |

## Documentación

| Documento | Contenido |
|---|---|
| [REQUISITOS_CURSO.md](REQUISITOS_CURSO.md) | Los 8 requisitos del curso: archivo, función y cómo demostrarlos |
| [FUNCIONALIDADES.md](FUNCIONALIDADES.md) | Lo que tiene el juego y cómo se probó |
| [CONTROLES.md](CONTROLES.md) | Teclas de juego y de depuración |
| [EJECUTAR_Y_PUBLICAR.md](EJECUTAR_Y_PUBLICAR.md) | Compilar, publicar y probar en otra computadora |
| [GUION_DIALOGOS.md](GUION_DIALOGOS.md) | Todas las líneas de diálogo, con su código y emoción |
| [GUION_VIDEO.md](GUION_VIDEO.md) | Guion del video corto de la entrega |
| [FICHA_CONCEPTO.md](FICHA_CONCEPTO.md) | Borrador de la ficha del concepto (una página) |
| [PENDIENTES.md](PENDIENTES.md) | Decisiones, desvíos del documento maestro y lo que queda pendiente |

## Estructura

Sigue la sección 13 del documento maestro (`TEMPLO_DEL_SOL_INSTRUCCIONES.md`):

- `src/`: el código del juego (núcleo, cámara, jugador, enemigos, mundo, interfaz, cinemáticas, efectos).
- `tools/blender/`: la generación de modelos; `tools/audio/`: la síntesis de sonidos, voces y música.
- `public/models/` y `public/sounds/`: los recursos generados.
- `tests/`: las pruebas.
- `docs/`: la documentación y los renders de revisión (`docs/previews/`).
