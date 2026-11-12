"""Kit de piezas de los interiores del templo (hoja «Interiores del templo»).

Todas las funciones reciben coordenadas de Blender ya colocadas (metros, Z arriba). Las piezas de muro
reciben el tramo de pared (a, b) y la normal hacia dentro de la sala (nx, ny).
Materiales: 0 = toon (color por vértice), 1 = oro emisivo, 2 = runa emisiva (índices de MAT del nivel).
"""
import math

from mathutils import Vector

from common import caja_biselada, casco, colocar, elipsoide, prisma
from rock_builder import tono_piedra

ORO, RUNA = 1, 2


def tono_arenisca(_c, n):
    """Arenisca iluminada desde arriba: caras de arriba claras, laterales en dos tonos y de abajo oscuras."""
    if n.z > 0.55:
        return 'arenisca_luz'
    if n.z < -0.55:
        return 'arenisca_oscura'
    return 'arenisca' if (n.x + n.y * 0.6) > -0.2 else 'arenisca_sombra'


def _eje(a, b):
    ax, ay = a
    bx, by = b
    largo = math.hypot(bx - ax, by - ay)
    return (bx - ax) / largo, (by - ay) / largo, largo


def _giro(dx, dy):
    """Giro en Z (grados) para que el eje X local siga la dirección (dx, dy)."""
    return math.degrees(math.atan2(dy, dx))


def banda(k, a, b, normal, z0, z1, salida, color, material=0):
    """Banda continua pegada a un muro (zócalo, friso, cornisa)."""
    dx, dy, largo = _eje(a, b)
    nx, ny = normal
    cx, cy = (a[0] + b[0]) / 2 + nx * salida / 2, (a[1] + b[1]) / 2 + ny * salida / 2
    k.agregar(caja_biselada(largo, salida, z1 - z0, 0.02), color, 'escenario',
              colocar((cx, cy, (z0 + z1) / 2), (0, 0, _giro(dx, dy))), material=material)


def friso_soles(k, a, b, normal, z, paso=1.6):
    """Friso dorado con discos solares tallados (relieve de la hoja)."""
    banda(k, a, b, normal, z, z + 0.42, 0.10, 'oro_tallado')
    dx, dy, largo = _eje(a, b)
    nx, ny = normal
    n = max(1, int(largo / paso))
    for i in range(n):
        u = (i + 0.5) / n * largo
        x, y = a[0] + dx * u + nx * 0.12, a[1] + dy * u + ny * 0.12
        rot = (90, 0, _giro(nx, ny) + 90)
        k.agregar(prisma(10, 0.16, 0.05), 'arenisca_oscura', 'escenario', colocar((x, y, z + 0.21), rot))
        k.agregar(prisma(8, 0.08, 0.06), 'oro_brillante', 'escenario', colocar((x + nx * 0.02, y + ny * 0.02, z + 0.21), rot), material=ORO)


def cornisa(k, a, b, normal, z, pasos=3):
    """Cornisa escalonada: cada escalón sale un poco más del muro."""
    for i in range(pasos):
        banda(k, a, b, normal, z + i * 0.22, z + (i + 1) * 0.22, 0.14 + i * 0.12, 'arenisca_luz' if i == pasos - 1 else 'arenisca')


def pilastra(k, x, y, normal, alto, ancho=0.7):
    """Pilastra con basa, capitel escalonado y banda de oro."""
    nx, ny = normal
    rot = (0, 0, _giro(-ny, nx))
    k.agregar(caja_biselada(ancho, 0.32, alto, 0.03), tono_arenisca, 'escenario', colocar((x + nx * 0.16, y + ny * 0.16, alto / 2), rot))
    k.agregar(caja_biselada(ancho + 0.2, 0.45, 0.35, 0.03), 'arenisca_sombra', 'escenario', colocar((x + nx * 0.2, y + ny * 0.2, 0.17), rot))
    for i in range(3):
        w = ancho + 0.12 + i * 0.12
        k.agregar(caja_biselada(w, 0.36 + i * 0.1, 0.18, 0.02), 'arenisca_luz', 'escenario',
                  colocar((x + nx * (0.18 + i * 0.05), y + ny * (0.18 + i * 0.05), alto - 0.6 + i * 0.18), rot))
    k.agregar(caja_biselada(ancho + 0.02, 0.34, 0.16, 0.01), 'oro_tallado', 'escenario', colocar((x + nx * 0.17, y + ny * 0.17, alto * 0.42), rot))


def boveda(k, x0, y0, x1, y1, z, pasos=5, alto_paso=0.4, eje='y'):
    """Techo en falso arco: hiladas que avanzan hacia el centro (bóveda maya)."""
    ancho = (x1 - x0) if eje == 'y' else (y1 - y0)
    for i in range(pasos):
        entra = ancho * 0.5 * (i + 1) / (pasos + 1)
        zz = z + i * alto_paso
        for lado in (-1, 1):
            if eje == 'y':
                cx = (x0 if lado < 0 else x1) - lado * entra / 2
                k.agregar(caja_biselada(entra, y1 - y0, alto_paso, 0.03), tono_arenisca, 'escenario',
                          colocar((cx, (y0 + y1) / 2, zz + alto_paso / 2)))
            else:
                cy = (y0 if lado < 0 else y1) - lado * entra / 2
                k.agregar(caja_biselada(x1 - x0, entra, alto_paso, 0.03), tono_arenisca, 'escenario',
                          colocar(((x0 + x1) / 2, cy, zz + alto_paso / 2)))


def portal(k, x, y, normal, ancho, alto, glifo=True):
    """Marco de puerta con dintel escalonado y un sol en la clave (no tapa el hueco)."""
    nx, ny = normal
    tx, ty = -ny, nx
    rot = (0, 0, _giro(tx, ty))
    for s in (-1, 1):
        k.agregar(caja_biselada(0.45, 0.5, alto, 0.04), tono_arenisca, 'escenario',
                  colocar((x + tx * s * (ancho / 2 + 0.22) + nx * 0.25, y + ty * s * (ancho / 2 + 0.22) + ny * 0.25, alto / 2), rot))
    for i in range(3):
        w = ancho + 0.9 + i * 0.4
        k.agregar(caja_biselada(w, 0.55 - i * 0.08, 0.3, 0.03), 'arenisca_luz' if i == 0 else 'arenisca', 'escenario',
                  colocar((x + nx * 0.27, y + ny * 0.27, alto + 0.15 + i * 0.3), rot))
    if glifo:
        k.agregar(prisma(12, 0.22, 0.08), 'oro_brillante', 'escenario',
                  colocar((x + nx * 0.56, y + ny * 0.56, alto + 0.6), (90, 0, _giro(nx, ny) + 90)), material=ORO)


def brasero(k, x, y, z=0.0, alto=1.0):
    """Brasero de piedra. Devuelve la posición de la llama (para el emisor de fuego y la luz)."""
    k.agregar(prisma(8, 0.2, alto, radio_sup=0.13), 'arenisca_oscura', 'escenario', colocar((x, y, z + alto / 2)))
    k.agregar(prisma(10, 0.32, 0.12), 'arenisca_sombra', 'escenario', colocar((x, y, z + 0.06)))
    k.agregar(prisma(10, 0.3, 0.26, radio_sup=0.48), 'arenisca_sombra', 'escenario', colocar((x, y, z + alto + 0.13)))
    k.agregar(prisma(10, 0.36, 0.06), 'brasa', 'escenario', colocar((x, y, z + alto + 0.24)), material=ORO)
    return (x, y, z + alto + 0.32)


def sacerdote(k, x, y, giro, alto=5.0, z=0.0, piedra=False):
    """Sacerdote del sol: estatua de bloques con máscara de oro y un disco solar entre las manos.
    piedra=True la talla en la piedra gris del exterior (los del pórtico) en vez de la arenisca."""
    e = alto / 5.0
    rot = (0, 0, giro)
    gris = {'arenisca_sombra': 'piedra_sombra', 'arenisca': 'piedra_luz', 'arenisca_oscura': 'piedra_oscura'}
    def pieza(geo, color, dx, dy, dz, material=0, r=(0, 0, 0)):
        if piedra:
            color = tono_piedra if color is tono_arenisca else gris.get(color, color)
        c, s = math.cos(math.radians(giro)), math.sin(math.radians(giro))
        k.agregar(geo, color, 'escenario', colocar((x + dx * c - dy * s, y + dx * s + dy * c, z + dz), (r[0], r[1], giro + r[2])), material=material)
    pieza(caja_biselada(1.6 * e, 1.6 * e, 0.6 * e, 0.05), 'arenisca_sombra', 0, 0, 0.3 * e)
    pieza(caja_biselada(1.1 * e, 0.9 * e, 2.6 * e, 0.06, conico=0.8), tono_arenisca, 0, 0, 0.6 * e + 1.3 * e)
    pieza(caja_biselada(1.5 * e, 1.0 * e, 0.5 * e, 0.05), 'arenisca', 0, 0, 3.0 * e)
    pieza(caja_biselada(0.7 * e, 0.7 * e, 0.8 * e, 0.04), 'oro_tallado', 0, 0, 3.65 * e)
    pieza(caja_biselada(0.5 * e, 0.06, 0.2 * e, 0.01), 'arenisca_oscura', 0, -0.36 * e, 3.75 * e)
    for i in range(7):
        t = math.pi * (0.12 + 0.76 * i / 6)
        pieza(prisma(4, 0.06 * e, 0.55 * e), 'oro_tallado', math.cos(t) * 0.62 * e, 0, 3.65 * e + math.sin(t) * 0.62 * e, r=(0, 90 - math.degrees(t), 0))
    pieza(prisma(12, 0.32 * e, 0.12 * e), 'oro_brillante', 0, -0.5 * e, 2.2 * e, material=ORO, r=(90, 0, 0))
    for s in (-1, 1):
        pieza(caja_biselada(0.3 * e, 0.8 * e, 0.3 * e, 0.03), 'arenisca', s * 0.35 * e, -0.3 * e, 2.2 * e)


def guardian_de_rodillas(k, x, y, giro, alto=9.0, z=0.0):
    """Guardián colosal de rodillas: los que se volvieron piedra antes que Mateo. Agrietado y con musgo."""
    e = alto / 9.0
    def pieza(geo, color, dx, dy, dz, r=(0, 0, 0), material=0):
        c, s = math.cos(math.radians(giro)), math.sin(math.radians(giro))
        k.agregar(geo, color, 'escenario', colocar((x + dx * c - dy * s, y + dx * s + dy * c, z + dz), (r[0], r[1], giro + r[2])), material=material)
    pieza(caja_biselada(4.0 * e, 3.6 * e, 0.8 * e, 0.08), 'arenisca_oscura', 0, 0, 0.4 * e)
    for s in (-1, 1):
        pieza(caja_biselada(1.1 * e, 2.6 * e, 1.1 * e, 0.06), 'arenisca_sombra', s * 0.8 * e, 0.3 * e, 1.35 * e)       # muslo plegado
        pieza(caja_biselada(1.0 * e, 1.0 * e, 1.6 * e, 0.06), 'arenisca_sombra', s * 0.8 * e, -0.9 * e, 1.6 * e)       # rodilla
    pieza(caja_biselada(2.6 * e, 1.6 * e, 3.0 * e, 0.08, conico=0.85), tono_arenisca, 0, 0.6 * e, 3.4 * e)           # torso
    pieza(caja_biselada(3.2 * e, 1.7 * e, 0.8 * e, 0.06), 'arenisca', 0, 0.6 * e, 5.2 * e)                         # hombros
    pieza(caja_biselada(1.2 * e, 1.2 * e, 1.4 * e, 0.05), 'arenisca', 0, 0.4 * e, 6.3 * e, r=(18, 0, 0))            # cabeza gacha
    pieza(caja_biselada(1.0 * e, 0.2 * e, 0.6 * e, 0.03), 'oro_tallado', 0, -0.25 * e, 6.25 * e, r=(18, 0, 0))     # máscara
    for s in (-1, 1):
        pieza(caja_biselada(0.8 * e, 0.8 * e, 2.6 * e, 0.05), 'arenisca_sombra', s * 1.65 * e, 0.0, 4.0 * e, r=(-25, 0, 0))  # brazos
        pieza(caja_biselada(0.9 * e, 1.0 * e, 0.8 * e, 0.05), 'arenisca_oscura', s * 1.0 * e, -1.0 * e, 2.6 * e)               # puños en las rodillas
    pieza(prisma(10, 0.35 * e, 0.12 * e), 'piedra_oscura', 0, -0.2 * e, 3.8 * e, r=(90, 0, 0))                      # núcleo apagado
    pieza(caja_biselada(3.0 * e, 1.6 * e, 0.12 * e, 0.02), 'musgo', 0, 0.6 * e, 5.66 * e)


ESCENAS = (('mural_rojo', 'oro_tallado'), ('mural_ocre', 'mural_azul'), ('mural_azul', 'mural_azul'), ('oro_tallado', 'oro_tallado'))


def mural(k, a, b, normal, z0, z1):
    """Mural de la leyenda en cuatro escenas (sin texto): 1 el pueblo adora al sol, 2 un sacerdote toma la
    gema y se vuelve piedra, 3 alguien con el brazalete la sella, 4 el sol vuelve al este."""
    banda(k, a, b, normal, z0, z1, 0.06, 'estuco')
    dx, dy, largo = _eje(a, b)
    nx, ny = normal
    rot_pared = (90, 0, _giro(nx, ny) + 90)
    for i, (fondo, sol) in enumerate(ESCENAS):
        u0, u1 = largo * i / 4 + 0.15, largo * (i + 1) / 4 - 0.15
        p = lambda u, off=0.08: (a[0] + dx * u + nx * off, a[1] + dy * u + ny * off)  # noqa: E731
        banda(k, p(u0, 0), p(u1, 0), normal, z0 + 0.2, z1 - 0.2, 0.08, fondo + '_claro')
        m = (u0 + u1) / 2
        cx, cy = p(m, 0.12)
        # El sol (o la gema) arriba
        k.agregar(prisma(12, 0.32, 0.04), sol, 'escenario', colocar((cx, cy, z1 - 0.75), rot_pared), material=ORO if sol == 'oro_tallado' else 0)
        # Figuras: el pueblo (tres), el sacerdote que se vuelve piedra (gris), la figura con el brazalete, nadie
        figuras = {0: [(-0.5, 'mural_rojo'), (0, 'mural_rojo'), (0.5, 'mural_rojo')], 1: [(-0.3, 'mural_ocre'), (0.35, 'piedra_oscura')],
                   2: [(0, 'mural_azul')], 3: []}[i]
        for off, col in figuras:
            fx, fy = p(m + off, 0.12)
            k.agregar(caja_biselada(0.3, 0.04, 0.9, 0.01, conico=0.6), col, 'escenario', colocar((fx, fy, z0 + 0.75), (0, 0, _giro(dx, dy))))
            k.agregar(prisma(8, 0.13, 0.04), col, 'escenario', colocar((fx, fy, z0 + 1.35), rot_pared))
        if i == 2:
            # El brazalete: un aro dorado en la mano levantada, y la gema sellada
            fx, fy = p(m + 0.22, 0.14)
            k.agregar(prisma(8, 0.09, 0.04), 'oro_brillante', 'escenario', colocar((fx, fy, z0 + 1.15), rot_pared), material=ORO)
        if i == 3:
            # El templo con el sol naciendo al este
            fx, fy = p(m, 0.12)
            k.agregar(caja_biselada(1.0, 0.04, 0.35, 0.01, conico=0.5), 'arenisca_oscura', 'escenario', colocar((fx, fy, z0 + 0.6), (0, 0, _giro(dx, dy))))


def campamento(k, x, y, giro):
    """El campamento abandonado de Mateo: saco de dormir, mochila, linterna, cuaderno abierto, cuerda y pico."""
    def pieza(geo, color, dx, dy, dz, r=(0, 0, 0), material=0):
        c, s = math.cos(math.radians(giro)), math.sin(math.radians(giro))
        k.agregar(geo, color, 'escenario', colocar((x + dx * c - dy * s, y + dx * s + dy * c, dz), (r[0], r[1], giro + r[2])), material=material)
    pieza(elipsoide(0.42, 1.0, 0.13, 8, 4), 'saco', 0, 0, 0.12)
    pieza(elipsoide(0.3, 0.22, 0.12, 6, 4), 'saco_luz', 0, 0.85, 0.2)
    pieza(caja_biselada(0.45, 0.3, 0.55, 0.06), 'v_mochila', 0.75, 0.3, 0.28, r=(0, 0, 20))
    pieza(caja_biselada(0.16, 0.16, 0.28, 0.02), 'hierro', -0.55, -0.5, 0.14)
    pieza(caja_biselada(0.12, 0.12, 0.16, 0.01), 'brasa', -0.55, -0.5, 0.16, material=ORO)
    pieza(caja_biselada(0.28, 0.2, 0.02, 0.005), 'papel', 0.15, -0.75, 0.02, r=(0, 0, -12))
    pieza(caja_biselada(0.28, 0.2, 0.02, 0.005), 'papel_sombra', -0.12, -0.78, 0.025, r=(0, 4, 10))
    pieza(prisma(10, 0.22, 0.08, radio_sup=0.2), 'cuerda', 0.9, -0.55, 0.04)
    pieza(prisma(5, 0.03, 0.9), 'madera_tabla_oscura', 1.05, 0.9, 0.05, r=(90, 0, 35))
    pieza(caja_biselada(0.4, 0.06, 0.08, 0.01), 'hierro', 1.25, 1.2, 0.06, r=(0, 0, 125))


def tiza(k, x, y, z, normal, escala=1.0, torcida=0.0):
    """Marca de tiza de Mateo: una flecha y sus iniciales (trazos finos sobre el muro)."""
    nx, ny = normal
    tx, ty = -ny, nx
    def trazo(u0, v0, u1, v1):
        a = Vector((x + tx * u0 * escala + nx * 0.02, y + ty * u0 * escala + ny * 0.02, z + v0 * escala))
        b = Vector((x + tx * u1 * escala + nx * 0.02, y + ty * u1 * escala + ny * 0.02, z + v1 * escala))
        d = b - a
        largo = d.length
        k.agregar(caja_biselada(largo, 0.012, 0.075 * escala, 0.002), 'tiza', 'escenario',
                  colocar(((a + b) / 2), (0, -math.degrees(math.atan2(d.z, math.hypot(d.x, d.y))), _giro(d.x, d.y) if math.hypot(d.x, d.y) > 1e-4 else _giro(tx, ty))))
    t = torcida
    trazo(-0.5, 0 + t * 0.1, 0.4, 0 - t * 0.1)
    trazo(0.4, -t * 0.1, 0.2, 0.18)
    trazo(0.4, -t * 0.1, 0.2, -0.18)
    # «M»
    trazo(-0.5, 0.3, -0.5, 0.6)
    trazo(-0.5, 0.6, -0.4, 0.45 + t * 0.1)
    trazo(-0.4, 0.45 + t * 0.1, -0.3, 0.6)
    trazo(-0.3, 0.6, -0.3, 0.3)
    # «S»
    trazo(-0.05, 0.6, -0.2, 0.6)
    trazo(-0.2, 0.6, -0.2, 0.45)
    trazo(-0.2, 0.45, -0.05, 0.45)
    trazo(-0.05, 0.45, -0.05, 0.3)
    trazo(-0.05, 0.3, -0.2, 0.3)


def vetas(k, a, b, normal, z, rnd, n=3):
    """Vetas doradas de la gema que trepan por el muro (emisivas)."""
    dx, dy, largo = _eje(a, b)
    nx, ny = normal
    for _ in range(n):
        u = rnd.uniform(0, largo)
        zz = z + rnd.uniform(-0.6, 0.6)
        for j in range(rnd.randint(4, 7)):
            u2 = min(largo, max(0, u + rnd.uniform(-0.6, 0.6)))
            z2 = zz + rnd.uniform(0.15, 0.5)
            p0 = Vector((a[0] + dx * u + nx * 0.02, a[1] + dy * u + ny * 0.02, zz))
            p1 = Vector((a[0] + dx * u2 + nx * 0.02, a[1] + dy * u2 + ny * 0.02, z2))
            d = p1 - p0
            # Oro sin brillo: de cerca, en el pasillo estrecho, el brillo dominaba el plano
            k.agregar(caja_biselada(0.025, 0.015, d.length, 0.003), 'veta', 'escenario',
                      colocar((p0 + p1) / 2, (0, -math.degrees(math.atan2(d.x * dx + d.y * dy, d.z)), _giro(dx, dy))),
                      material=0)
            u, zz = u2, z2


def raiz(k, x, y, z, normal, largo, rnd):
    """Raíz que entra por una grieta del techo y baja pegada al muro."""
    nx, ny = normal
    tx, ty = -ny, nx
    p = Vector((x + nx * 0.1, y + ny * 0.1, z))
    grosor = 0.07
    while largo > 0 and p.z > 0.2:
        q = p + Vector((tx * rnd.uniform(-0.5, 0.5), ty * rnd.uniform(-0.5, 0.5), -rnd.uniform(0.6, 1.2)))
        d = q - p
        k.agregar(prisma(5, grosor, d.length, radio_sup=grosor * 0.8), 'raiz', 'escenario',
                  colocar((p + q) / 2, (0, -math.degrees(math.atan2(math.hypot(d.x, d.y), -d.z)), _giro(d.x, d.y) + 180)))
        largo -= d.length
        grosor *= 0.85
        p = q


def escombros(k, x, y, rnd, n=6, radio=1.4, color=None):
    for _ in range(n):
        cx, cy, s = x + rnd.uniform(-radio, radio), y + rnd.uniform(-radio, radio), rnd.uniform(0.15, 0.5)
        pts = [Vector((cx + rnd.uniform(-s, s), cy + rnd.uniform(-s, s), rnd.uniform(0, s * 1.2))) for _ in range(9)]
        pts += [Vector((cx + rnd.uniform(-s, s), cy + rnd.uniform(-s, s), 0)) for _ in range(3)]
        k.agregar(casco(pts), color or tono_arenisca, 'escenario')


def duna(k, x, y, rx, ry, alto):
    """Montoncito de arena que entró con el viento."""
    k.agregar(elipsoide(rx, ry, alto, 10, 4), 'arena_duna', 'escenario', colocar((x, y, 0)))


def mosaico_sol(k, x, y, z, radio):
    """Mosaico del sol en el suelo: anillos concéntricos y doce rayos de oro."""
    for i, (r, col) in enumerate(((radio, 'arenisca_sombra'), (radio * 0.68, 'oro_tallado'), (radio * 0.42, 'arenisca'), (radio * 0.2, 'oro_brillante'))):
        k.agregar(prisma(24, r, 0.03), col, 'escenario', colocar((x, y, z + 0.015 + i * 0.006)), material=ORO if col == 'oro_brillante' else 0)
    for i in range(12):
        t = i * math.tau / 12
        cx, cy = x + math.cos(t) * radio * 0.84, y + math.sin(t) * radio * 0.84
        k.agregar(caja_biselada(radio * 0.42, 0.12, 0.03, 0.005), 'oro_tallado', 'escenario', colocar((cx, cy, z + 0.035), (0, 0, math.degrees(t))))


def columna_tallada(k, x, y, alto, radio=0.6):
    """Columna del santuario: fuste de 12 caras, basa y capitel escalonados y dos bandas de oro talladas."""
    k.agregar(prisma(12, radio, alto - 1.3, radio_sup=radio * 0.92), tono_arenisca, 'escenario', colocar((x, y, 0.6 + (alto - 1.3) / 2)))
    for i, (r, h, z) in enumerate(((radio * 1.45, 0.3, 0.15), (radio * 1.25, 0.3, 0.45))):
        k.agregar(prisma(8, r, h), 'arenisca_sombra' if i == 0 else 'arenisca', 'escenario', colocar((x, y, z)))
    for i, (r, h) in enumerate(((radio * 1.15, 0.25), (radio * 1.35, 0.25), (radio * 1.6, 0.3))):
        k.agregar(prisma(8, r, h), 'arenisca_luz' if i == 2 else 'arenisca', 'escenario', colocar((x, y, alto - 0.7 + i * 0.25 + h / 2)))
    for z in (alto * 0.22, alto * 0.55):
        k.agregar(prisma(12, radio * 1.04, 0.32), 'oro_tallado', 'escenario', colocar((x, y, z)))
        # El anillo brillante acaba 1 cm por debajo de la banda: con las tapas a la misma altura se peleaban
        k.agregar(prisma(12, radio * 1.06, 0.06), 'oro_brillante', 'escenario', colocar((x, y, z + 0.12)), material=ORO)
