# Instrucciones para agentes

El Templo del Sol Perdido: aventura 3D para el navegador hecha con Three.js 0.160, cannon-es 0.20 y Vite.

## Instalar todo (un comando)

Windows (PowerShell), desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
```

macOS o Linux:

```bash
bash scripts/instalar.sh
```

El script se puede repetir sin problema: lo que ya está instalado lo salta.
1. Instala Git y Node.js 22.12 o más (en Windows con `winget`; en macOS con Homebrew; en Linux con apt y NodeSource).
2. Ejecuta `npm ci` con las versiones exactas de `package-lock.json`.
3. Comprueba que el juego compila con `npm run build`.

Si el proyecto todavía no está descargado, ejecuta el script desde la carpeta donde se quiera: lo clona en `./ElTemploDelSol` y sigue.

Si además hay que **regenerar** modelos, sonidos o el video, añade `-Completo` (Windows) o `--completo` (macOS/Linux). Instala Python con numpy y Pillow, ffmpeg y Blender. Para jugar no hace falta: los recursos ya generados vienen en `public/`.

## Jugar (un comando)

```bash
npm run jugar
```

Abre el juego en el navegador, en http://localhost:5173. Hace falta Chrome o Edge con aceleración por hardware (WebGL 2). Para cerrar el servidor: Ctrl+C.

## Otros comandos

| Comando | Para qué |
|---|---|
| `npm test` | 104 pruebas (lógica y simulaciones con los escenarios reales); tardan unos minutos |
| `npm run check` | Comprobación de tipos |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run assets` | Regenera modelos (Blender), sonidos y música (Python) y el video. Solo con la instalación `-Completo` |
| `npm run zfighting` | Busca caras superpuestas en los escenarios |

## Si algo falla

- **«No se reconoce node» o «npm» justo después de instalar:** cierra la terminal y ábrela de nuevo para que cargue el nuevo PATH, y repite el script.
- **Falta winget:** instala «Instalador de aplicación» (App Installer) desde la Microsoft Store.
- **El navegador muestra la pantalla negra:** activa la aceleración por hardware en Chrome (Configuración → Sistema).
- **`npm run assets` no encuentra Blender:** define `BLENDER_PATH` con la ruta completa a `blender.exe`.

## Reglas del proyecto

- **Comunicación:** en español, con las palabras del juego (Victoria, el santuario, el Guardián…).
- **Documentos:** la documentación está en `docs/`, empezando por `docs/README.md`. El documento maestro es `TEMPLO_DEL_SOL_INSTRUCCIONES.md`.
- **Arte y sonido:** todo se genera con código. No se descargan imágenes ni sonidos.
- **Rutas:** las rutas de los recursos son absolutas (`/models`, `/sounds`, `/videos`).
