<#
  Instala todo lo necesario para El Templo del Sol Perdido en Windows, con un solo comando.

  Dentro de la carpeta del proyecto:
      powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
  Con las herramientas para regenerar modelos, sonidos y video (Python + numpy + Pillow, Blender y ffmpeg):
      powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Completo

  Si se ejecuta fuera del proyecto, instala Git y lo descarga en .\ElTemploDelSol antes de seguir.
  Usa winget (incluido en Windows 10 y 11). Se puede ejecutar varias veces: lo que ya está instalado se salta.
#>
param(
  [switch]$Completo,
  [string]$Repositorio = 'https://github.com/Valery-Rosero/ElTemploDelSol.git'
)
$ErrorActionPreference = 'Stop'
$NodeMinimo = [version]'22.12.0'   # lo que pide Vite 8

function Paso([string]$t) { Write-Host "`n== $t" -ForegroundColor Yellow }
function Bien([string]$t) { Write-Host "   OK  $t" -ForegroundColor Green }
function Recargar-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Tiene([string]$cmd) {
  $c = Get-Command $cmd -ErrorAction SilentlyContinue
  # El «python» de la Microsoft Store es un acceso directo vacío: no cuenta
  return [bool]$c -and ($c.Source -notlike '*WindowsApps*')
}
function Instalar([string]$id) {
  Write-Host "   Instalando $id con winget…"
  $ErrorActionPreference = 'Continue'
  winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements
  # 0 = instalado; -1978335189 / -1978335135 = ya estaba instalado o no hay versión nueva
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189 -and $LASTEXITCODE -ne -1978335135) {
    throw "winget no pudo instalar $id (código $LASTEXITCODE)."
  }
  Recargar-Path
}
function Ejecutar([string]$descripcion, [scriptblock]$bloque) {
  # Git, npm y pip escriben su progreso por el canal de errores: si alguien guarda la salida (un agente),
  # Windows PowerShell lo tomaría como un fallo. Lo que manda es el código de salida.
  $ErrorActionPreference = 'Continue'
  & $bloque 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) { throw "$descripcion falló (código $LASTEXITCODE)." }
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'Falta winget. Instala «Instalador de aplicación» (App Installer) desde la Microsoft Store y vuelve a ejecutar este script.'
}

# ---- Git y el proyecto
Paso 'Git'
if (-not (Tiene 'git')) { Instalar 'Git.Git' }
Bien (git --version)

$raiz = if ($PSScriptRoot) { Split-Path $PSScriptRoot -Parent } else { $null }
if (-not $raiz -or -not (Test-Path (Join-Path $raiz 'package.json'))) {
  Paso 'Descargar el proyecto'
  $raiz = Join-Path (Get-Location) 'ElTemploDelSol'
  if (-not (Test-Path $raiz)) { Ejecutar 'git clone' { git clone $Repositorio $raiz } }
  Bien "Proyecto en $raiz"
}
Set-Location $raiz

# ---- Node.js
Paso 'Node.js'
$versionNode = $null
if (Tiene 'node') { $versionNode = [version]((node -v).TrimStart('v')) }
if (-not $versionNode -or $versionNode -lt $NodeMinimo) {
  Instalar 'OpenJS.NodeJS.LTS'
  $versionNode = [version]((node -v).TrimStart('v'))
}
if ($versionNode -lt $NodeMinimo) { throw "Node $versionNode es muy viejo: hace falta $NodeMinimo o más. Cierra la terminal, ábrela de nuevo y repite." }
Bien "Node $versionNode"

# ---- Dependencias del proyecto (las versiones exactas de package-lock.json)
# La primera vez, instalación limpia; después, se actualiza en su lugar (npm ci borra node_modules
# y falla si el juego está abierto, porque Windows no deja borrar un archivo en uso)
if (Test-Path 'node_modules') {
  Paso 'Dependencias (npm install)'
  Ejecutar 'npm install' { npm install --no-audit --no-fund }
} else {
  Paso 'Dependencias (npm ci)'
  Ejecutar 'npm ci' { npm ci --no-audit --no-fund }
}
Bien 'three, cannon-es, lil-gui, vite y typescript'

# ---- Herramientas para regenerar los recursos (opcional)
if ($Completo) {
  Paso 'Python, numpy y Pillow'
  if (-not (Tiene 'python')) { Instalar 'Python.Python.3.12' }
  Ejecutar 'pip install' { python -m pip install --upgrade --quiet -r tools\requirements.txt }
  Bien (python --version)

  Paso 'ffmpeg'
  if (-not (Tiene 'ffmpeg')) { Instalar 'Gyan.FFmpeg' }
  Bien 'ffmpeg'

  Paso 'Blender'
  $blender = Get-ChildItem 'C:\Program Files\Blender Foundation\*\blender.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $blender) {
    Instalar 'BlenderFoundation.Blender'
    $blender = Get-ChildItem 'C:\Program Files\Blender Foundation\*\blender.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  }
  if ($blender) { Bien $blender.FullName } else { Write-Host '   Blender no apareció en C:\Program Files\Blender Foundation. Define BLENDER_PATH con la ruta a blender.exe.' -ForegroundColor Red }
}

# ---- Comprobación: el juego compila
Paso 'Comprobación (npm run build)'
Ejecutar 'npm run build' { npm run build --silent }
Bien 'El juego compila'

Write-Host "`nListo. Para jugar:" -ForegroundColor Cyan
Write-Host "    cd `"$raiz`"" -ForegroundColor Cyan
Write-Host '    npm run jugar' -ForegroundColor Cyan
