"""Tablero de diseño de la gran pirámide: alzado frontal, alzado lateral y planta, dibujados con las
medidas de tools/blender/diseno_piramide.py (las mismas que usa el constructor).
Uso: python tools/disenos/tablero_piramide.py  →  docs/previews/piramide_tablero.png
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(RAIZ, 'tools', 'blender'))
import diseno_piramide as D  # noqa: E402

E = 6.0                                  # píxeles por metro
PAPEL, TINTA, TENUE = (238, 228, 205), (52, 40, 30), (150, 130, 105)
PIEDRA, PIEDRA_LUZ, PIEDRA_SOMBRA, OSCURO = (176, 168, 150), (214, 207, 188), (140, 132, 116), (70, 62, 54)
MUSGO, ORO, ESCALON = (112, 140, 82), (232, 179, 62), (196, 189, 170)

try:
    FUENTE = ImageFont.truetype('georgia.ttf', 20)
    TITULO = ImageFont.truetype('georgiab.ttf', 30)
    PEQ = ImageFont.truetype('georgia.ttf', 15)
except OSError:
    FUENTE = TITULO = PEQ = ImageFont.load_default()

W, H = 2000, 980
img = Image.new('RGB', (W, H), PAPEL)
d = ImageDraw.Draw(img)


def rect(ox, oy, x0, z0, x1, z1, fill, outline=TINTA):
    """Rectángulo en metros (x a la derecha, z arriba) con origen de dibujo (ox, oy) en el suelo."""
    d.rectangle((ox + x0 * E, oy - z1 * E, ox + x1 * E, oy - z0 * E), fill=fill, outline=outline, width=1)


def poli(ox, oy, pts, fill, outline=TINTA):
    d.polygon([(ox + x * E, oy - z * E) for x, z in pts], fill=fill, outline=outline)


# ---------------- Alzado frontal
ox, oy = 60 + D.BASE / 2 * E + 30, 860
d.text((60, 40), 'La gran pirámide — alzado frontal (desde el claro)', font=TITULO, fill=TINTA)
(ypie, _), (ycima, zcima), n, huella, contra = D.escalera()
for i, lado, z0, zt, zb, zc in D.cuerpos():
    r = lado / 2
    lt = r - D.RETRANQUEO
    lc = lt + D.VUELO
    poli(ox, oy, [(-r, z0), (r, z0), (lt, z0 + zt), (-lt, z0 + zt)], PIEDRA)                    # talud
    rect(ox, oy, -lt, z0 + zt, lt, z0 + zt + zb, PIEDRA)                                      # tablero
    rect(ox, oy, -lt * 0.93, z0 + zt + zb * 0.22, lt * 0.93, z0 + zt + zb * 0.78, PIEDRA_SOMBRA)  # friso
    k = int(lt * 2 * 0.93 // D.SOL_CADA)
    for j in range(k):
        x = -lt * 0.93 + (j + 0.5) * (lt * 2 * 0.93 / k)
        if abs(x) < D.ESCALERA_ANCHO / 2 + D.ALFARDA + 0.5:
            continue
        rr = zb * 0.22
        d.ellipse((ox + (x - rr) * E, oy - (z0 + zt + zb / 2 + rr) * E, ox + (x + rr) * E, oy - (z0 + zt + zb / 2 - rr) * E),
                  fill=PIEDRA_LUZ, outline=TINTA)
    rect(ox, oy, -lc, z0 + zt + zb, lc, z0 + zt + zb + zc, PIEDRA_LUZ)                         # cornisa
    for s in (-1, 1):                                                                        # remates de esquina
        rect(ox, oy, s * lc - (0.8 if s > 0 else -0.8) - 0.8, z0 + D.ALTO_CUERPO, s * lc - (0.8 if s > 0 else -0.8) + 0.8,
             z0 + D.ALTO_CUERPO + 0.9, PIEDRA)
    # musgo en la terraza y lianas que cuelgan de la cornisa
    rect(ox, oy, -lc * 0.8, z0 + D.ALTO_CUERPO, -lc * 0.55, z0 + D.ALTO_CUERPO + 0.25, MUSGO, MUSGO)
    for x in (-lc * 0.72, lc * 0.4, lc * 0.81):
        d.line((ox + x * E, oy - (z0 + zt + zb + zc) * E, ox + x * E, oy - (z0 + zt + zb * 0.35) * E), fill=MUSGO, width=2)
# Escalinata y alfardas
we = D.ESCALERA_ANCHO / 2
rect(ox, oy, -we, 0, we, zcima, ESCALON)
for j in range(0, n, 4):
    z = j * contra
    d.line((ox - we * E, oy - z * E, ox + we * E, oy - z * E), fill=TENUE)
for s in (-1, 1):
    rect(ox, oy, s * we if s > 0 else -we - D.ALFARDA, 0, s * we + D.ALFARDA if s > 0 else -we, zcima + 1.2, PIEDRA)
    d.ellipse((ox + (s * (we + 1) - 1.6) * E, oy - 3.4 * E, ox + (s * (we + 1) + 1.6) * E, oy - 0.2 * E), fill=PIEDRA_SOMBRA, outline=TINTA)
# Templo
T = D.TEMPLO
zt0 = zcima
tw = T['ancho'] / 2
rect(ox, oy, -tw - 0.5, zt0, tw + 0.5, zt0 + T['zocalo'], PIEDRA_LUZ)
z1 = zt0 + T['zocalo']
rect(ox, oy, -tw, z1, tw, z1 + T['muro'], PIEDRA)
pc, pl = T['puerta_central'] / 2, T['puerta_lateral'] / 2
rect(ox, oy, -pc, z1, pc, z1 + T['muro'] * 0.78, ORO)
for s in (-1, 1):
    rect(ox, oy, s * 5.5 - pl, z1, s * 5.5 + pl, z1 + T['muro'] * 0.66, OSCURO)
z2 = z1 + T['muro']
rect(ox, oy, -tw - 0.3, z2, tw + 0.3, z2 + T['friso'], PIEDRA_LUZ)
z3 = z2 + T['friso']
rect(ox, oy, -tw + 0.5, z3, tw - 0.5, z3 + T['techo'][0], PIEDRA)
rect(ox, oy, -tw + 1.5, z3 + T['techo'][0], tw - 1.5, z3 + sum(T['techo']), PIEDRA)
z4 = z3 + sum(T['techo'])
rect(ox, oy, -5, z4, 5, z4 + T['cresta'], PIEDRA)
for s in (-1, 0, 1):
    rect(ox, oy, s * 3 - 0.8, z4 + 0.6, s * 3 + 0.8, z4 + 1.8, OSCURO)
rs = T['radio_sol']
zs = z4 + T['cresta'] - rs * 0.6
d.ellipse((ox - rs * E, oy - (zs + rs) * E, ox + rs * E, oy - (zs - rs) * E), fill=ORO, outline=TINTA)
d.line((ox - D.BASE / 2 * E - 20, oy, ox + D.BASE / 2 * E + 20, oy), fill=TINTA, width=2)
d.text((ox - D.BASE / 2 * E, oy + 10), f'{D.BASE:.0f} m de lado · {D.CUERPOS} cuerpos de {D.ALTO_CUERPO:.1f} m · {D.ALTO:.0f} m al sol de la crestería',
       font=FUENTE, fill=TINTA)

# ---------------- Alzado lateral (corte por el eje de la escalinata)
ox2, oy2 = 1000 + 40, 860
d.text((1000, 40), 'Alzado lateral', font=TITULO, fill=TINTA)
for i, lado, z0, zt, zb, zc in D.cuerpos():
    r = lado / 2
    lt = r - D.RETRANQUEO
    lc = lt + D.VUELO
    cx = 0
    poli(ox2 + 48 * E, oy2, [(-r, z0), (r, z0), (lt, z0 + zt), (-lt, z0 + zt)], PIEDRA)
    rect(ox2 + 48 * E, oy2, -lt, z0 + zt, lt, z0 + zt + zb, PIEDRA)
    rect(ox2 + 48 * E, oy2, -lc, z0 + zt + zb, lc, z0 + D.ALTO_CUERPO, PIEDRA_LUZ)
# La escalinata vista de lado: va del pie (y = 56 m) a la terraza de arriba
poli(ox2 + 48 * E, oy2, [(ypie, 0), (ycima, zcima), (ycima, zcima + 1.2), (ypie, 1.4)], PIEDRA)
for j in range(0, n, 3):
    y = ypie - j * huella
    z = j * contra
    d.line((ox2 + (48 + y) * E, oy2 - z * E, ox2 + (48 + y - huella) * E, oy2 - z * E), fill=TINTA)
rect(ox2 + 48 * E, oy2, -T['fondo'] / 2 - T['atras'], zcima, T['fondo'] / 2 - T['atras'], z4 - sum(T['techo']), PIEDRA)
rect(ox2 + 48 * E, oy2, -T['atras'] - 0.6, z4, -T['atras'] + 0.6, z4 + T['cresta'], PIEDRA)
d.text((ox2, oy2 + 10), f'Escalinata: {n} peldaños de {contra:.2f} m, huella {huella:.2f} m, {D.ESCALERA_ANCHO:.0f} m de ancho entre alfardas de {D.ALFARDA:.0f} m',
       font=FUENTE, fill=TINTA)
d.line((ox2 - 20, oy2, ox2 + 110 * E, oy2), fill=TINTA, width=2)

# ---------------- Notas
notas = [
    'Cada cuerpo: talud que se mete 1,4 m, tablero vertical con un friso oscuro y soles en relieve cada 7 m,',
    'cornisa clara que vuela 0,3 m (línea de sombra). Remates en las esquinas. Terrazas de 4,4 m con musgo.',
    'Lianas que cuelgan de las cornisas; bloques caídos al pie; árboles jóvenes en algunas terrazas.',
    'Templo: tres puertas (la central de oro, encendida), friso, techo escalonado y crestería con el sol dorado,',
    'sin niebla: guía al jugador desde toda la selva. Al pie de la escalinata, dos cabezas solares de piedra.',
]
for i, t in enumerate(notas):
    d.text((1000, 100 + i * 26), t, font=PEQ, fill=TINTA)

salida = os.path.join(RAIZ, 'docs', 'previews', 'piramide_tablero.png')
img.save(salida)
print(salida)
