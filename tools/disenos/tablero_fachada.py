"""Tablero de diseño del pórtico del santuario (meseta de las ruinas): alzado frontal y planta del atrio,
dibujados con las medidas de tools/blender/diseno_fachada.py (las mismas que usa el constructor).
Uso: python tools/disenos/tablero_fachada.py  →  docs/previews/fachada_tablero.png
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'tools', 'blender'))
import diseno_fachada as D  # noqa: E402

E = 30.0                                 # píxeles por metro
PAPEL, TINTA, TENUE = (238, 228, 205), (52, 40, 30), (150, 130, 105)
PIEDRA, PIEDRA_LUZ, PIEDRA_SOMBRA, OSCURO = (176, 168, 150), (214, 207, 188), (140, 132, 116), (70, 62, 54)
MUSGO, ORO, RUNA, ROJO = (112, 140, 82), (232, 179, 62), (90, 170, 230), (178, 60, 40)

try:
    FUENTE = ImageFont.truetype('georgia.ttf', 20)
    TITULO = ImageFont.truetype('georgiab.ttf', 30)
    PEQ = ImageFont.truetype('georgia.ttf', 16)
except OSError:
    FUENTE = TITULO = PEQ = ImageFont.load_default()

W, H = 2000, 1100
img = Image.new('RGB', (W, H), PAPEL)
d = ImageDraw.Draw(img)


def rect(ox, oy, x0, z0, x1, z1, fill, outline=TINTA):
    """Rectángulo en metros (x a la derecha, z arriba; en planta z es la profundidad) con origen (ox, oy)."""
    d.rectangle((ox + min(x0, x1) * E, oy - max(z0, z1) * E, ox + max(x0, x1) * E, oy - min(z0, z1) * E),
                fill=fill, outline=outline, width=1)


def poli(ox, oy, pts, fill, outline=TINTA):
    d.polygon([(ox + x * E, oy - z * E) for x, z in pts], fill=fill, outline=outline)


def sol(ox, oy, x, z, r, fill):
    d.ellipse((ox + (x - r) * E, oy - (z + r) * E, ox + (x + r) * E, oy - (z - r) * E), fill=fill, outline=TINTA)
    for i in range(8):
        a = math.tau * i / 8
        d.line((ox + (x + math.cos(a) * r * 1.15) * E, oy - (z + math.sin(a) * r * 1.15) * E,
                ox + (x + math.cos(a) * r * 1.6) * E, oy - (z + math.sin(a) * r * 1.6) * E), fill=TINTA, width=3)
    d.ellipse((ox + (x - r * 0.36) * E, oy - (z + r * 0.36) * E, ox + (x + r * 0.36) * E, oy - (z - r * 0.36) * E), outline=TINTA)


m = D.ANCHO / 2
h, j = D.HUECO, D.JAMBA['ancho']
# ---------------- Alzado frontal (desde el atrio)
ox, oy = 60 + (m + 1.5) * E, 700
d.text((60, 30), 'Pórtico del santuario — alzado frontal (desde la losa)', font=TITULO, fill=TINTA)
for s in (-1, 1):
    rect(ox, oy, s * h, 0, s * m, D.ALTO_MURO, PIEDRA)                                              # muro
    poli(ox, oy, [(s * (h + j), 0), (s * m, 0), (s * m, D.TALUD['alto']), (s * (h + j), D.TALUD['alto'])], PIEDRA_SOMBRA)  # talud
    f = D.FRISO
    rect(ox, oy, s * (h + j + f['margen']), f['z'], s * (m - f['margen']), f['z'] + f['alto'], PIEDRA_SOMBRA)
    for x in D.SOLES_X:
        sol(ox, oy, s * x, f['z'] + f['alto'] / 2, D.RADIO_SOL, PIEDRA_LUZ)
    rect(ox, oy, s * h, 0, s * (h + j), D.ALTO_PUERTA, PIEDRA_LUZ)                                 # jamba
    # almenas sobre la cornisa, fuera de la crestería
    a = D.ALMENAS
    x = D.CRESTA['ancho'] / 2 + 0.8
    while x + a['ancho'] / 2 <= m:
        rect(ox, oy, s * (x - a['ancho'] / 2), D.ALTO_MURO + D.CORNISA['alto'], s * (x + a['ancho'] / 2),
             D.ALTO_MURO + D.CORNISA['alto'] + a['alto'], PIEDRA)
        x += a['cada']
    # lianas
    for x in (8.0, 10.6) if s > 0 else (7.1,):
        d.line((ox + s * x * E, oy - D.ALTO_MURO * E, ox + s * x * E, oy - (D.ALTO_MURO - 3.2) * E), fill=MUSGO, width=4)
rect(ox, oy, -h, D.ALTO_PUERTA, h, D.ALTO_MURO, PIEDRA)                                              # sobre la puerta
rect(ox, oy, -h, 0, h, D.ALTO_PUERTA, PIEDRA_SOMBRA)                                                  # la puerta
d.ellipse((ox - 1.0 * E, oy - 1.4 * E, ox + 1.0 * E, oy - 0.6 * E + 0 * E), fill=RUNA, outline=TINTA)
z = D.ALTO_PUERTA
for ancho, alto in D.DINTEL:                                                                         # dintel escalonado
    rect(ox, oy, -ancho / 2, z, ancho / 2, z + alto, PIEDRA_LUZ)
    z += alto
c = D.CORNISA
rect(ox, oy, -m - c['vuelo'], D.ALTO_MURO, m + c['vuelo'], D.ALTO_MURO + c['alto'], PIEDRA_LUZ)
d.rectangle((ox + (-m * 0.85) * E, oy - (D.ALTO_MURO + c['alto'] + 0.12) * E, ox + (-m * 0.6) * E, oy - (D.ALTO_MURO + c['alto']) * E), fill=MUSGO)
cr = D.CRESTA
z0 = D.ALTO_MURO + c['alto']
rect(ox, oy, -cr['ancho'] / 2, z0, cr['ancho'] / 2, z0 + cr['alto'], PIEDRA)
for x in (-3.4, 3.4):
    rect(ox, oy, x - 0.7, z0 + 0.6, x + 0.7, z0 + 2.0, OSCURO)
sol(ox, oy, 0, z0 + cr['alto'] - cr['radio_sol'] * 1.1, cr['radio_sol'], ORO)
# Columnas y viga del pórtico (delante)
v = D.VIGA
for s in (-1, 1):
    x = s * D.COLUMNAS_X
    rect(ox, oy, x - 0.75, 0, x + 0.75, 0.35, PIEDRA)
    rect(ox, oy, x - 0.42, 0.35, x + 0.42, v['z'] - 0.6, PIEDRA_LUZ)
    rect(ox, oy, x - 0.75, v['z'] - 0.6, x + 0.75, v['z'], PIEDRA)
    # antorchas y estatuas
    xa = s * D.ANTORCHAS_X
    rect(ox, oy, xa - 0.12, 0, xa + 0.12, 2.0, OSCURO)
    d.ellipse((ox + (xa - 0.3) * E, oy - 2.8 * E, ox + (xa + 0.3) * E, oy - 2.0 * E), fill=ORO, outline=TINTA)
    xe, e = s * D.ESTATUAS['x'], D.ESTATUAS['alto'] / 5
    rect(ox, oy, xe - 0.8 * e, 0, xe + 0.8 * e, 0.6 * e, PIEDRA_SOMBRA)
    poli(ox, oy, [(xe - 0.55 * e, 0.6 * e), (xe + 0.55 * e, 0.6 * e), (xe + 0.44 * e, 3.2 * e), (xe - 0.44 * e, 3.2 * e)], PIEDRA)
    rect(ox, oy, xe - 0.75 * e, 2.75 * e, xe + 0.75 * e, 3.25 * e, PIEDRA_LUZ)
    rect(ox, oy, xe - 0.35 * e, 3.25 * e, xe + 0.35 * e, 4.05 * e, ORO)
    d.ellipse((ox + (xe - 0.32 * e) * E, oy - 2.52 * e * E, ox + (xe + 0.32 * e) * E, oy - 1.88 * e * E), fill=ORO, outline=TINTA)
rect(ox, oy, -D.COLUMNAS_X - 0.8, v['z'], D.COLUMNAS_X + 0.8, v['z'] + v['alto'], PIEDRA_LUZ)
for x in (-2.2, 0, 2.2):
    sol(ox, oy, x, v['z'] + v['alto'] / 2, 0.22, PIEDRA)
d.line((ox - (m + 1) * E, oy, ox + (m + 1) * E, oy), fill=TINTA, width=2)
d.text((ox - m * E, oy + 10), f'{D.ANCHO:.0f} m de ancho · muro de {D.ALTO_MURO:.0f} m · puerta de {D.HUECO * 2:.1f} × {D.ALTO_PUERTA:.1f} m'
       f' · {D.ALTO_MURO + c["alto"] + cr["alto"]:.1f} m al tope de la crestería', font=FUENTE, fill=TINTA)

# ---------------- Planta de la terraza y el atrio (el puente queda abajo)
E2 = 22.0
px, py = 1460, 260
d.text((1000, 30), 'Planta: el atrio se cierra; la losa es la única entrada', font=TITULO, fill=TINTA)


def r2(x0, y0, x1, y1, fill, outline=TINTA):
    d.rectangle((px + min(x0, x1) * E2, py + 300 - max(y0, y1) * E2 + 0 * 0, px + max(x0, x1) * E2, py + 300 - min(y0, y1) * E2),
                fill=fill, outline=outline, width=1)


# y en planta: 0 = cara delantera de la fachada; positivo hacia el puente
fondo_atrio = D.ATRIO_FONDO
r2(-m, -5.7, m, fondo_atrio, PIEDRA_LUZ)                                         # terraza
r2(-D.PASILLO / 2, 0, D.PASILLO / 2, fondo_atrio, (226, 220, 202))               # pasillo
r2(-m, -D.FONDO, m, 0, PIEDRA)                                                   # muro de la fachada
r2(-h, -D.FONDO, h, 0, OSCURO)                                                   # hueco de la puerta
r2(-h, -0.6, h, 0, PIEDRA_SOMBRA)                                                # la puerta
for s in (-1, 1):
    r2(s * D.ATRIO['desde_x'], fondo_atrio - D.ATRIO['fondo'], s * D.ATRIO['hasta_x'], fondo_atrio, PIEDRA_SOMBRA)   # muro del atrio
    r2(s * (m - D.ATRIO['fondo']), 0, s * m, fondo_atrio, PIEDRA_SOMBRA)                                             # costados
    d.ellipse((px + (s * D.COLUMNAS_X - 0.45) * E2, py + 300 - (D.COLUMNAS_Y + 0.45) * E2,
               px + (s * D.COLUMNAS_X + 0.45) * E2, py + 300 - (D.COLUMNAS_Y - 0.45) * E2), fill=PIEDRA, outline=TINTA)
    r2(s * D.ESTATUAS['x'] - 0.7, D.ESTATUAS['y'] - 0.7, s * D.ESTATUAS['x'] + 0.7, D.ESTATUAS['y'] + 0.7, PIEDRA)
    r2(s * 6, fondo_atrio, s * 6.9, fondo_atrio + 3.6, PIEDRA)                                                       # alfardas
    # barrera invisible (línea roja discontinua)
    for k in range(0, int(fondo_atrio * 2) + 1, 2):
        y0 = k / 2
        d.line((px + s * m * E2, py + 300 - y0 * E2, px + s * m * E2, py + 300 - (y0 + 0.5) * E2), fill=ROJO, width=3)
r2(-6, fondo_atrio - 0.8, 6, fondo_atrio, RUNA)                                                                       # la losa
for k in range(6):
    yy = fondo_atrio + 0.6 * (k + 1)
    d.line((px - 6 * E2, py + 300 - yy * E2, px + 6 * E2, py + 300 - yy * E2), fill=TENUE)
d.text((px - 2.6 * E2, py + 300 - (fondo_atrio + 4.6) * E2), 'escalinata', font=PEQ, fill=TINTA)
d.text((px - 1.2 * E2, py + 300 - (fondo_atrio - 0.3) * E2 - 2), 'losa', font=PEQ, fill=TINTA)

# ---------------- Notas
notas = [
    'Mismo lenguaje que la gran pirámide: talud al pie, tablero con friso oscuro y soles en relieve,',
    'cornisa clara que vuela y hace línea de sombra, almenas, crestería calada con el sol de oro.',
    'Puerta enmarcada por jambas claras y un dintel escalonado; delante, un pórtico de dos columnas',
    'con viga de soles. Dos sacerdotes del sol de piedra (los mismos del santuario) custodian el atrio.',
    '',
    f'El atrio se cierra con un muro de {D.ATRIO["alto"]:.1f} m (frente y costados): la losa de la escalinata es la',
    f'única entrada. Sus colisionadores suben a {D.BARRERA_ALTO:.0f} m (salto de Victoria: 1,6 m): no se rodea',
    'ni se salta, ni siquiera desde los tambores caídos. Línea roja: barandas sin dibujo en los costados.',
    'Al recuperar una partida más allá del pórtico, losa y puerta quedan abiertas.',
]
for i, t in enumerate(notas):
    d.text((60, 790 + i * 30), t, font=FUENTE, fill=TINTA)

salida = os.path.join(RAIZ, 'docs', 'previews', 'fachada_tablero.png')
img.save(salida)
print(salida)
