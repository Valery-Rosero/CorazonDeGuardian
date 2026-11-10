# El Templo del Sol Perdido

Aventura 3D para navegador hecha con **Three.js 0.160.0** y **cannon-es 0.20.0**: proyecto integrador de *Programación de Entornos Multimedia*. Todo el arte se genera por código: los personajes y escenarios con scripts de Python en Blender, y los materiales y efectos en Three.js.

## Requisitos

- Node.js 20 o superior
- Chrome o Edge con WebGL 2 activo
- Solo para regenerar los recursos:
  - Blender 3.6 o superior (probado con 5.2 LTS);
  - Python 3 con numpy (para el audio);
  - ffmpeg, opcional.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
```

Haz clic en la pantalla para empezar. **Controles:** WASD para moverse, Shift para correr, Espacio para saltar, el ratón para la cámara y P o Esc para pausar.

En `npm run dev`, o con `?debug` en la URL, aparece el panel de depuración. Muestra los FPS y las llamadas de dibujo, y permite ajustar en vivo la velocidad, el salto, la cámara y la cara. Desde ahí se puede probar cada emoción y hacer que Victoria diga una línea.

## Comandos

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Probar la compilación de producción |
| `npm run check` | Comprobación de tipos JSDoc |
| `npm test` | Pruebas de lógica (`node --test`) |
| `npm run assets` | Regenera los `.glb` con Blender y los sonidos con Python. La ruta de Blender se lee de `BLENDER_PATH`. Con `-- --preview`, además genera renders de Victoria en `docs/previews/`. |

## Teclas de depuración (en `npm run dev` o con `?debug`)

| Tecla | Acción |
|---|---|
| 1, 2, 3 | Teletransporte: entrada, cornisa, ruinas |
| 6 | Invulnerabilidad |
| 9 | Mostrar u ocultar los FPS y las llamadas de dibujo |
| 0 | Mostrar u ocultar los triggers y los colisionadores |

## Estructura

Sigue la sección 13 del documento maestro (`TEMPLO_DEL_SOL_INSTRUCCIONES.md`):

- `src/`: el código del juego.
- `tools/blender/`: la generación de modelos.
- `public/models/`: los modelos generados.
- `tests/`: las pruebas.
- `docs/`: la documentación.

Las decisiones que se apartan del documento están en [PENDIENTES.md](PENDIENTES.md).
