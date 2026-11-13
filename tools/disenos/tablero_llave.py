"""Tablero de diseño de la Llave del Sol: la planta de la selva con los tres cofres, el cofre (alzado y corte
con la tapa abierta), los tres tercios y la llave completa, las tres cerraduras y la secuencia del pedestal.
Dibujado con las medidas de tools/blender/diseno_llave.py (las mismas que usa el constructor).
Uso: python tools/disenos/tablero_llave.py  →  docs/previews/llave_tablero.png
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'tools', 'blender'))
import diseno_llave as D  # noqa: E402

PAPEL, TINTA, TENUE = (238, 228, 205), (52, 40, 30), (150, 130, 105)
PIEDRA, PIEDRA_LUZ, PIEDRA_SOMBRA, OSCURO = (176, 168, 150), (214, 207, 188), (140, 132, 116), (70, 62, 54)
TIERRA, PASTO, AGUA, ORO, TIZA = (196, 160, 112), (150, 178, 112), (110, 170, 200), (232, 179, 62), (250, 246, 236)
HAZ = (255, 226, 140)


def rgb(hexa):
    return tuple(int(hexa[i:i + 2], 16) for i in (1, 3, 5))


COLOR = {s: rgb(D.COLOR[s]) for s in D.SOLES}

try:
    FUENTE = ImageFont.truetype('georgia.ttf', 19)
    TITULO = ImageFont.truetype('georgiab.ttf', 30)
    SUB = ImageFont.truetype('georgiab.ttf', 22)
    PEQ = ImageFont.truetype('georgia.ttf', 15)
except OSError:
    FUENTE = TITULO = SUB = PEQ = ImageFont.load_default()

W, H = 2200, 1050
img = Image.new('RGB', (W, H), PAPEL)
d = ImageDraw.Draw(img)
d.text((40, 24), 'La Llave del Sol — tres cofres en la selva, tres cerraduras', font=TITULO, fill=TINTA)
d.text((40, 64), 'Cada tercio abre un paso: el agua, el portal de la cascada; el jade, la losa de las ruinas; el oro, la puerta del santuario. '
                 'El portal solo despierta con la llave completa.', font=FUENTE, fill=TENUE)

# ---------------- 1. Planta de la selva (x de -30 a 30, y de 20 a -96)
E1 = 7.0
ox, oy = 70 + 30 * E1, 130 - (-20) * E1     # (0, 0) de Blender


def P(x, y):
    return (ox + x * E1, oy - y * E1)


d.text((40, 100), '1. Planta: dónde está cada cofre', font=SUB, fill=TINTA)
d.rectangle((*P(-30, 20), *P(30, -96)), fill=PASTO, outline=TINTA)
SENDERO = [(0, 18), (0, 4), (-5, -10), (-11, -24), (-9, -36), (0, -47), (6, -57), (7.5, -67), (7.5, -77),
           (5.5, -82.4), (2.6, -83.6), (0, -86)]
d.line([P(x, y) for x, y in SENDERO], fill=TIERRA, width=int(3.8 * E1), joint='curve')
# Riscos del desfiladero y de la cascada
for xa, xb in ((-30, -14), (14, 30)):
    d.rectangle((*P(xa, -52), *P(xb, -84)), fill=PIEDRA_SOMBRA, outline=TINTA)
d.rectangle((*P(-14, -84), *P(14, -96)), fill=PIEDRA, outline=TINTA)
d.rectangle((*P(-4.5, -84), *P(4.5, -94)), fill=OSCURO, outline=TINTA)                 # cueva
d.ellipse((*P(-6.2, -69.8), *P(6.2, -82.2)), fill=AGUA, outline=TINTA)                 # poza
d.rectangle((*P(-2.9, -83.6), *P(2.9, -84.4)), fill=(200, 230, 245), outline=TINTA)  # cortina
d.text(P(-3.4, -86.2), 'cueva', font=PEQ, fill=PAPEL)
d.text(P(-12, -60), 'desfiladero', font=PEQ, fill=TINTA)
d.text(P(-5.2, -74), 'poza', font=PEQ, fill=TINTA)
# Hitos
d.rectangle((*P(-1.3, -5.7), *P(1.3, -8.3)), fill=PIEDRA_LUZ, outline=TINTA)
d.text(P(2.0, -5.4), 'altar del brazalete', font=PEQ, fill=TINTA)
d.ellipse((*P(-18.5, -25.6), *P(-15.5, -28.4)), fill=PIEDRA, outline=TINTA)
d.text(P(-29, -30), 'cabeza de piedra', font=PEQ, fill=TINTA)
for x, y in ((9.7, -44.6), (12.2, -49.9), (3.5, -39.6), (13.8, -58.4)):
    d.ellipse((*P(x - 1.6, y + 1.6), *P(x + 1.6, y - 1.6)), fill=(92, 126, 72), outline=TINTA)
d.text(P(12.6, -46.2), 'ceiba', font=PEQ, fill=TINTA)
d.ellipse((*P(-1.0, 16.4), *P(1.0, 14.4)), fill=PIEDRA_LUZ, outline=TINTA)
d.text(P(1.6, 16.6), 'mirador (inicio)', font=PEQ, fill=TINTA)
# Piedras de la poza (las tres que existen y las dos nuevas) y la repisa
for x, y, _h in ((-3.0, -72.5, 0.55), (-1.2, -75.0, 0.9), (1.3, -77.4, 1.25)):
    d.ellipse((*P(x - 0.85, y + 0.85), *P(x + 0.85, y - 0.85)), fill=PIEDRA_LUZ, outline=TINTA)
for x, y, _h in D.PIEDRAS:
    d.ellipse((*P(x - 0.85, y + 0.85), *P(x + 0.85, y - 0.85)), fill=PIEDRA_LUZ, outline=COLOR['agua'], width=3)
(ra, rb) = D.REPISA
d.rectangle((*P(ra[0], rb[1]), *P(rb[0], ra[1])), fill=PIEDRA_LUZ, outline=COLOR['agua'], width=3)
d.line([P(-1.2, -75.0), P(*D.PIEDRAS[0][:2]), P(*D.PIEDRAS[1][:2]), P(-5.6, -82.0)], fill=COLOR['agua'], width=2)
# Pedestal
px, py, _ = D.PEDESTAL['pos']
d.rectangle((*P(px - 0.35, py + 0.35), *P(px + 0.35, py - 0.35)), fill=COLOR['agua'], outline=TINTA)
d.text(P(5.0, -89.0), 'pedestal', font=PEQ, fill=TINTA)


def sol_marca(cx, cy, r, color):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color, outline=TINTA, width=2)
    for i in range(8):
        a = math.tau * i / 8
        d.line((cx + math.cos(a) * r * 1.2, cy + math.sin(a) * r * 1.2, cx + math.cos(a) * r * 1.75, cy + math.sin(a) * r * 1.75),
               fill=TINTA, width=2)


ROTULOS = {'jade': 'jade: a la vista, al pie de la cabeza', 'oro': 'oro: escondido tras la ceiba',
           'agua': 'agua: en la repisa (saltando)'}
for s in D.SOLES:
    x, y, z = D.COFRES[s]['pos']
    cx, cy = P(x, y)
    sol_marca(cx, cy, 9, COLOR[s])
    tx = cx + 16 if x < 8 else cx - 250
    d.text((tx, cy - 26 if s == 'agua' else cy + 10), ROTULOS[s], font=PEQ, fill=TINTA)
d.text((70, oy - (-96) * E1 + 14), 'Escala: 10 m', font=PEQ, fill=TINTA)
d.line((170, oy + 96 * E1 + 24, 170 + 10 * E1, oy + 96 * E1 + 24), fill=TINTA, width=3)
d.text((70, oy + 96 * E1 + 40), 'Un haz de luz sube de cada cofre cerrado (9 m):\nse ve por encima de los helechos.',
       font=PEQ, fill=TINTA)

# ---------------- 2. El cofre (alzado frontal y corte con la tapa abierta)
E2 = 190.0
C = D.COFRE
bx, by = 620, 520      # pie del alzado
d.text((560, 100), '2. El cofre de piedra', font=SUB, fill=TINTA)


def R(ox_, oy_, x0, z0, x1, z1, fill, e=E2, width=1, outline=TINTA):
    d.rectangle((ox_ + min(x0, x1) * e, oy_ - max(z0, z1) * e, ox_ + max(x0, x1) * e, oy_ - min(z0, z1) * e),
                fill=fill, outline=outline, width=width)


z = C['zocalo']
R(bx + C['zocalo']['ancho'] / 2 * E2, by, -z['ancho'] / 2, 0, z['ancho'] / 2, z['alto'], PIEDRA_SOMBRA)
cx0 = bx + z['ancho'] / 2 * E2
R(cx0, by, -C['ancho'] / 2, z['alto'], C['ancho'] / 2, z['alto'] + C['alto'], PIEDRA)
t = C['tapa']
ztapa = z['alto'] + C['alto']
R(cx0, by, -t['ancho'] / 2, ztapa, t['ancho'] / 2, ztapa + t['alto'], PIEDRA_LUZ)
R(cx0, by, -t['remate'][0] / 2, ztapa + t['alto'], t['remate'][0] / 2, ztapa + t['alto'] + t['remate'][2], PIEDRA_LUZ)
g = C['glifo']
sol_marca(cx0, by - (z['alto'] + g['z']) * E2, g['radio'] * E2 * 0.7, COLOR['jade'])
# Tiza «M. S.»
tz = C['tiza']
esc = tz['alto'] * E2
for (a, b) in D.TRAZOS_M + D.TRAZOS_S:
    d.line((cx0 + tz['x'] * E2 + a[0] * esc * 0.55, by - (z['alto'] + tz['z']) * E2 - a[1] * esc,
            cx0 + tz['x'] * E2 + b[0] * esc * 0.55, by - (z['alto'] + tz['z']) * E2 - b[1] * esc), fill=TIZA, width=4)
d.text((bx, by + 12), f"Alzado: {C['ancho']} × {C['alto'] + z['alto'] + t['alto']:.2f} m;\nsol del color de su tercio;\n"
                      '«M. S.» en tiza: Mateo abrió\neste cofre hace siete años.', font=PEQ, fill=TINTA)
# Corte lateral con la tapa abierta
lx, ly = 1010, 520
R(lx + 0.45 * E2, ly, -C['fondo'] / 2, 0, C['fondo'] / 2, z['alto'] + C['alto'], PIEDRA)
hx, hz = lx + 0.45 * E2 + C['bisagra_y'] * E2, ly - ztapa * E2
a = math.radians(-C['abre'])
pts = [(0, 0), (-t['fondo'], 0), (-t['fondo'], t['alto']), (0, t['alto'])]
rot = [(hx + (px_ * math.cos(a) - pz * math.sin(a)) * E2, hz - (px_ * math.sin(a) + pz * math.cos(a)) * E2) for px_, pz in pts]
d.polygon(rot, fill=PIEDRA_LUZ, outline=TINTA)
d.ellipse((hx - 5, hz - 5, hx + 5, hz + 5), fill=TINTA)
d.arc((hx - 70, hz - 70, hx + 70, hz + 70), 180, 180 + 112, fill=TENUE, width=2)
d.text((lx, ly + 12), f"Corte: la tapa gira {abs(C['abre']):.0f}°\nsobre la bisagra de atrás.", font=PEQ, fill=TINTA)
# El tercio sube del cofre
sol_marca(lx + 0.45 * E2, ly - 1.05 * E2, 14, COLOR['jade'])
d.line((lx + 0.45 * E2, ly - 0.55 * E2, lx + 0.45 * E2, ly - 0.95 * E2), fill=TENUE, width=2)
d.text((lx + 0.45 * E2 + 26, ly - 1.12 * E2), 'el tercio sube, gira\ny vuela a la mano', font=PEQ, fill=TINTA)

# ---------------- 3. Los tres tercios y la llave completa
d.text((560, 620), '3. Los tres tercios y la llave completa', font=SUB, fill=TINTA)
S = D.SOL
E3 = 260.0


def tercio(cx, cy, s, sep=0.0):
    a0 = math.radians(D.TERCIO[s])
    a1 = a0 + math.tau / 3
    mid = (a0 + a1) / 2
    dx, dy = math.cos(mid) * sep * E3, -math.sin(mid) * sep * E3
    cx, cy = cx + dx, cy + dy
    n = 18
    exterior = [(cx + math.cos(a0 + (a1 - a0) * i / n) * S['radio'] * E3, cy - math.sin(a0 + (a1 - a0) * i / n) * S['radio'] * E3)
                for i in range(n + 1)]
    interior = [(cx + math.cos(a1 - (a1 - a0) * i / n) * S['hueco'] * E3, cy - math.sin(a1 - (a1 - a0) * i / n) * S['hueco'] * E3)
                for i in range(n + 1)]
    d.polygon(exterior + interior, fill=ORO, outline=TINTA)
    gema = [(cx + math.cos(a0 + 0.12 + (a1 - a0 - 0.24) * i / n) * S['gema'] * E3,
             cy - math.sin(a0 + 0.12 + (a1 - a0 - 0.24) * i / n) * S['gema'] * E3) for i in range(n + 1)]
    gema_in = [(cx + math.cos(a1 - 0.12 - (a1 - a0 - 0.24) * i / n) * S['hueco'] * 1.5 * E3,
                cy - math.sin(a1 - 0.12 - (a1 - a0 - 0.24) * i / n) * S['hueco'] * 1.5 * E3) for i in range(n + 1)]
    d.polygon(gema + gema_in, fill=COLOR[s], outline=TINTA)
    for i in range(S['rayos']):
        a = a0 + (a1 - a0) * (i + 0.5) / S['rayos']
        r0, r1 = S['rayo']
        w = 0.1
        d.polygon([(cx + math.cos(a - w) * r0 * E3, cy - math.sin(a - w) * r0 * E3), (cx + math.cos(a) * r1 * E3, cy - math.sin(a) * r1 * E3),
                   (cx + math.cos(a + w) * r0 * E3, cy - math.sin(a + w) * r0 * E3)], fill=ORO, outline=TINTA)


for i, s in enumerate(D.SOLES):
    cx, cy = 650 + i * 190, 800
    tercio(cx, cy, s)
    d.text((cx - 50, cy + 110), D.NOMBRE[s], font=FUENTE, fill=TINTA)
llx, lly = 1300, 790
for s in D.SOLES:
    tercio(llx, lly, s)
d.text((llx - 90, lly + 110), 'La Llave del Sol (completa)', font=FUENTE, fill=TINTA)
d.text((560, 940), f"Disco de {S['radio'] * 2:.2f} m con rayos hasta {S['rayo'][1] * 2:.2f} m; oro con una banda de cristal del color del tercio.\n"
                   'Origen de cada tercio en el centro del disco: juntarlos es ponerlos en el mismo punto.', font=PEQ, fill=TINTA)

# ---------------- 4. Las cerraduras
d.text((1460, 100), '4. Las tres cerraduras', font=SUB, fill=TINTA)
E4 = 70.0
# Pedestal (vista lateral desde el portal)
qx, qy = 1530, 420
R(qx, qy, -0.25, 0, 0.25, 0.9, PIEDRA, e=E4 * 2.2)
atr = math.radians(D.PEDESTAL['atril'])
cxp, czp = qx, qy - 1.0 * E4 * 2.2
w = 0.35 * E4 * 2.2
d.polygon([(cxp - w * math.cos(atr), czp + w * math.sin(atr) * -1), (cxp + w * math.cos(atr), czp - w * math.sin(atr) * -1),
           (cxp + w * math.cos(atr), czp - w * math.sin(atr) * -1 + 18), (cxp - w * math.cos(atr), czp + w * math.sin(atr) * -1 + 18)],
          fill=PIEDRA_LUZ, outline=TINTA)
sol_marca(cxp, czp - 8, 10, COLOR['agua'])
d.text((qx - 80, qy + 14), 'Pedestal de la cueva\n(atril a 35°): agua', font=PEQ, fill=TINTA)
# Losa (frente)
lx4, ly4 = 1790, 420
R(lx4, ly4, -6, 0, 6, 2.4, PIEDRA, e=E4 * 0.3)
d.ellipse((lx4 - D.HUECO['radio'] * E4 * 0.9, ly4 - 1.2 * E4 * 0.3 - D.HUECO['radio'] * E4 * 0.9,
           lx4 + D.HUECO['radio'] * E4 * 0.9, ly4 - 1.2 * E4 * 0.3 + D.HUECO['radio'] * E4 * 0.9), fill=OSCURO, outline=ORO, width=3)
sol_marca(lx4, ly4 - 1.2 * E4 * 0.3, 9, COLOR['jade'])
d.text((lx4 - 110, ly4 + 14), 'Losa de las ruinas (12 × 2,4 m):\nhueco a 1,2 m, del lado\ndel puente: jade', font=PEQ, fill=TINTA)
# Puerta (frente)
px4, py4 = 2060, 420
R(px4, py4, -2.2, 0, 2.2, 6.4, PIEDRA_SOMBRA, e=E4 * 0.3)
d.ellipse((px4 - D.HUECO['radio'] * E4 * 0.9, py4 - 1.4 * E4 * 0.3 - D.HUECO['radio'] * E4 * 0.9,
           px4 + D.HUECO['radio'] * E4 * 0.9, py4 - 1.4 * E4 * 0.3 + D.HUECO['radio'] * E4 * 0.9), fill=OSCURO, outline=ORO, width=3)
sol_marca(px4, py4 - 1.4 * E4 * 0.3, 9, COLOR['oro'])
d.text((px4 - 70, py4 + 14), 'Puerta del pórtico:\nhueco a 1,4 m: oro', font=PEQ, fill=TINTA)
d.text((1460, 520), 'Al pulsar E con el tercio, este vuela de la mano al hueco, se enciende\n'
                    'y la piedra se hunde llevándolo consigo. Sin el tercio: «Falta el sol de …».', font=PEQ, fill=TINTA)

# ---------------- 5. La secuencia del pedestal (cinemática «La llave», 7,2 s)
d.text((1460, 620), '5. Secuencia del pedestal: «La llave» (7,2 s)', font=SUB, fill=TINTA)
VI = [('1 · Plano medio, 50 mm, 2,4 s', 'Los tres tercios salen\nde la mano de Victoria y\nse juntan sobre el atril.'),
      ('2 · Detalle, 85 mm, 1,8 s', 'La llave completa gira;\nlas runas del arco se\nencienden una a una.'),
      ('3 · General, 24 mm, 3,0 s', 'El tercio de agua baja al\natril; jade y oro vuelven a\nella: «Tres soles, una llave».')]
for i, (tit, txt) in enumerate(VI):
    x0, y0 = 1460 + i * 245, 660
    d.rectangle((x0, y0, x0 + 215, y0 + 92), fill=(40, 52, 58), outline=TINTA, width=2)
    if i == 0:
        d.ellipse((x0 + 40, y0 + 30, x0 + 60, y0 + 50), fill=(120, 80, 50))
        d.rectangle((x0 + 36, y0 + 50, x0 + 64, y0 + 90), fill=(98, 108, 72))
        for j, s in enumerate(D.SOLES):
            d.ellipse((x0 + 100 + j * 22, y0 + 34 - j * 4, x0 + 114 + j * 22, y0 + 48 - j * 4), fill=COLOR[s])
        d.rectangle((x0 + 150, y0 + 60, x0 + 176, y0 + 92), fill=PIEDRA)
    elif i == 1:
        d.ellipse((x0 + 78, y0 + 18, x0 + 138, y0 + 78), fill=ORO, outline=TINTA)
        for j, s in enumerate(D.SOLES):
            a = math.radians(D.TERCIO[s] + 60)
            d.ellipse((x0 + 108 + math.cos(a) * 16 - 7, y0 + 48 - math.sin(a) * 16 - 7, x0 + 108 + math.cos(a) * 16 + 7,
                       y0 + 48 - math.sin(a) * 16 + 7), fill=COLOR[s])
        for j in range(8):
            a = math.tau * j / 8
            d.rectangle((x0 + 108 + math.cos(a) * 44 - 3, y0 + 48 - math.sin(a) * 40 - 3, x0 + 108 + math.cos(a) * 44 + 3,
                         y0 + 48 - math.sin(a) * 40 + 3), fill=COLOR['agua'])
    else:
        d.arc((x0 + 60, y0 + 10, x0 + 160, y0 + 110), 180, 360, fill=COLOR['agua'], width=6)
        d.rectangle((x0 + 30, y0 + 58, x0 + 46, y0 + 92), fill=(98, 108, 72))
        d.rectangle((x0 + 172, y0 + 62, x0 + 192, y0 + 92), fill=PIEDRA)
        d.ellipse((x0 + 176, y0 + 52, x0 + 188, y0 + 64), fill=COLOR['agua'])
    d.text((x0, y0 + 98), tit, font=PEQ, fill=TINTA)
    d.text((x0, y0 + 118), txt, font=PEQ, fill=TENUE)
d.text((1460, 840), 'Victoria al encontrar el primer cofre: «La marca de papá. Abrió este cofre\n'
                    'hace siete años… y el sol volvió a su sitio.»\n'
                    'En el portal sin la llave completa: «Las runas piden la llave entera.\nMe faltan soles.»',
       font=PEQ, fill=TINTA)

salida = os.path.join(RAIZ, 'docs', 'previews', 'llave_tablero.png')
img.save(salida)
print(salida)
