# Bienvenida: cómo poner el juego en tu computadora

Son dos pasos: **instalar** (una sola vez) y **jugar**.

## Opción A: con tu agente (Claude Code u otro)

Ábrelo en la carpeta donde quieras el proyecto y dile:

> Instala el proyecto https://github.com/Valery-Rosero/ElTemploDelSol siguiendo su AGENTS.md y ábrelo para jugar.

El agente descarga el proyecto, lee las instrucciones de [AGENTS.md](../AGENTS.md), instala todo con un comando y lo abre con otro.

## Opción B: tú mismo

### 1. Instalar (una sola vez)

**Windows.** Abre PowerShell en la carpeta del proyecto y pega:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
```

**macOS o Linux:**

```bash
bash scripts/instalar.sh
```

Instala Git y Node.js si no los tienes, descarga las librerías del juego y comprueba que todo compila. Tarda unos minutos la primera vez.

Si todavía no tienes la carpeta del proyecto, descárgalo desde GitHub (botón **Code** → **Download ZIP**), descomprímelo y ejecuta el comando dentro.

### 2. Jugar

```bash
npm run jugar
```

Se abre el navegador con el juego. Usa **Chrome o Edge**. Para cerrarlo, vuelve a la terminal y pulsa **Ctrl+C**.

## Si vas a cambiar modelos o sonidos

Para jugar no hace falta: los modelos y los sonidos ya generados vienen en el proyecto. Solo para **regenerarlos**, instala también Python, Blender y ffmpeg añadiendo `-Completo` al comando de instalación:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Completo
```

y después `npm run assets`.

## Para conocer el proyecto

- [README.md](README.md): qué es y todos los documentos.
- [CONTROLES.md](CONTROLES.md): las teclas.
- [PRESENTACION.md](PRESENTACION.md): cómo funciona cada parte, en palabras sencillas.
- En el juego, el menú **Demostración técnica** muestra los 8 requisitos del curso uno por uno.
