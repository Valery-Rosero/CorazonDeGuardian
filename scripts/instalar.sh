#!/usr/bin/env bash
# Instala todo lo necesario para El Templo del Sol Perdido en macOS o Linux, con un solo comando.
#
#   Dentro de la carpeta del proyecto:   bash scripts/instalar.sh
#   Con las herramientas para regenerar modelos, sonidos y video:   bash scripts/instalar.sh --completo
#
# Si se ejecuta fuera del proyecto, lo descarga en ./ElTemploDelSol antes de seguir.
# macOS usa Homebrew; Linux, apt (Debian/Ubuntu). Se puede ejecutar varias veces.
set -euo pipefail

REPOSITORIO="https://github.com/Valery-Rosero/ElTemploDelSol.git"
NODE_MINIMO="22.12.0"   # lo que pide Vite 8
COMPLETO=0
[ "${1:-}" = "--completo" ] && COMPLETO=1

paso() { printf '\n\033[33m== %s\033[0m\n' "$1"; }
bien() { printf '   \033[32mOK\033[0m  %s\n' "$1"; }
tiene() { command -v "$1" >/dev/null 2>&1; }
# ¿La versión $1 es al menos $2?
al_menos() { [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]; }

SO="$(uname -s)"
instalar() {   # instalar <paquete brew> <paquete apt>
  if [ "$SO" = "Darwin" ]; then
    tiene brew || { echo "Falta Homebrew: instálalo desde https://brew.sh y repite."; exit 1; }
    brew install "$1"
  else
    sudo apt-get update -qq && sudo apt-get install -y "$2"
  fi
}

paso "Git"
tiene git || instalar git git
bien "$(git --version)"

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." 2>/dev/null && pwd || true)"
if [ -z "$RAIZ" ] || [ ! -f "$RAIZ/package.json" ]; then
  paso "Descargar el proyecto"
  RAIZ="$(pwd)/ElTemploDelSol"
  [ -d "$RAIZ" ] || git clone "$REPOSITORIO" "$RAIZ"
  bien "Proyecto en $RAIZ"
fi
cd "$RAIZ"

paso "Node.js"
if ! tiene node || ! al_menos "$(node -v | tr -d v)" "$NODE_MINIMO"; then
  if [ "$SO" = "Darwin" ]; then
    instalar node node
  else
    # La versión de apt suele ser vieja: NodeSource da la LTS actual
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
fi
al_menos "$(node -v | tr -d v)" "$NODE_MINIMO" || { echo "Hace falta Node $NODE_MINIMO o más."; exit 1; }
bien "Node $(node -v)"

if [ -d node_modules ]; then
  paso "Dependencias (npm install)"
  npm install --no-audit --no-fund
else
  paso "Dependencias (npm ci)"
  npm ci --no-audit --no-fund
fi
bien "three, cannon-es, lil-gui, vite y typescript"

if [ "$COMPLETO" = "1" ]; then
  paso "Python, numpy y Pillow"
  tiene python3 || instalar python python3
  python3 -m pip install --upgrade --quiet -r tools/requirements.txt || python3 -m pip install --user --upgrade --quiet -r tools/requirements.txt
  bien "$(python3 --version)"

  paso "ffmpeg"
  tiene ffmpeg || instalar ffmpeg ffmpeg
  bien "ffmpeg"

  paso "Blender"
  if [ "$SO" = "Darwin" ]; then
    [ -d /Applications/Blender.app ] || brew install --cask blender
  else
    tiene blender || sudo snap install blender --classic
  fi
  bien "Blender"
fi

paso "Comprobación (npm run build)"
npm run build --silent
bien "El juego compila"

printf '\n\033[36mListo. Para jugar:\n    cd "%s"\n    npm run jugar\033[0m\n' "$RAIZ"
