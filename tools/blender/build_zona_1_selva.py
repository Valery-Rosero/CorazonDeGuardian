"""Zona 1: La selva olvidada (secciones 8.1 y 9.6).

Recorrido: claro de entrada (altar, esferas rituales) → sendero de helechos → cascada con cueva y
portal de runas → cornisa alta → puente que se derrumba → ruinas con el pórtico del santuario.
La cima dorada de la pirámide se ve al fondo desde casi toda la zona.

Coordenadas de Blender: Z arriba; el recorrido avanza hacia -Y.
Uso: blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_zona_1_selva.py
"""
import math
import os
import random
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import bridge_builder  # noqa: E402
import common  # noqa: E402
import foliage_builder  # noqa: E402
import rock_builder  # noqa: E402
import stats  # noqa: E402
import temple_builder  # noqa: E402
import tree_builder  # noqa: E402
import water_builder  # noqa: E402
from common import (Constructor, caja_biselada, caja_invisible, casco, colocar, objeto_suelto, prisma,  # noqa: E402
                    vacio)
from palette import PALETA  # noqa: E402
from rock_builder import dist_a_polilinea, tono_piedra  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'models', 'zona_1_selva.glb')
PRESUPUESTO = 50000   # sin contar las instancias de vegetación

# Recorrido del sendero (x, y): guía colores del suelo, vegetación y árboles
SENDERO = [(0, 18), (0, 4), (-5, -10), (-11, -24), (-9, -36), (0, -47), (6, -57), (7.5, -67), (7.5, -77),
           (5.5, -82.4), (2.6, -83.6), (0, -86)]
POZA = (0, -76, 6.2)          # centro x, y y radio de la poza
ALTAR = (0, -7, 0)
CUEVA_Y = (-94, -84)          # interior de la cueva
CORNISA = ((-6, -107), (6, -100), 12.0)
PUENTE = (-107, -127, 12.0)   # y_inicio, y_fin, z del tablero
MESETA = ((-16, -160), (16, -127), 12.0)
PIRAMIDE = (0, -225, 0)


def materiales():
    return {
        'toon': common.material_toon('selva_toon'),
        'oro': common.material_emisivo('oro_brillante_emisivo', PALETA['oro_brillante'], 2.5),
        'runa': common.material_emisivo('cristal_runa_emisivo', PALETA['cristal_runa'], 3.0),
        'cascada': common.material_toon('agua_cascada'),
        'poza': common.material_toon('agua_poza'),
        'rayo': common.material_toon('rayo_luz'),
        'disco': common.material_emisivo('checkpoint_disco', PALETA['oro_brillante'], 0.2),
        'cima': common.material_emisivo('cima_piramide_emisivo', PALETA['oro_brillante'], 3.0),
    }


def suelo(k, rnd):
    """Terreno facetado en cuadrícula: pasto, tierra en el sendero y lecho oscuro bajo la poza."""
    paso = 3.0
    xs = [-30 + paso * i for i in range(21)]
    ys = [-96 + paso * j for j in range(39)]
    alturas = {}
    for x in xs:
        for y in ys:
            d = dist_a_polilinea((x, y), SENDERO)
            alturas[(x, y)] = 0.0 if d < 3 else rnd.uniform(-0.05, 0.07)
    verts, caras, colores = [], [], []
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            esquinas = [(xs[i], ys[j]), (xs[i + 1], ys[j]), (xs[i + 1], ys[j + 1]), (xs[i], ys[j + 1])]
            base = len(verts)
            verts += [Vector((x, y, alturas[(x, y)])) for x, y in esquinas]
            for tri in ((0, 1, 2), (0, 2, 3)):
                cx = sum(esquinas[t][0] for t in tri) / 3
                cy = sum(esquinas[t][1] for t in tri) / 3
                d = dist_a_polilinea((cx, cy), SENDERO)
                if math.hypot(cx - POZA[0], cy - POZA[1]) < POZA[2] + 0.8:
                    color = 'selva_tierra_oscura'
                elif CUEVA_Y[0] - 2 < cy < CUEVA_Y[1] and abs(cx) < 5:
                    color = 'piedra_oscura'
                elif d < 1.9:
                    color = 'selva_tierra'
                elif d < 2.6:
                    color = rnd.choice(['selva_tierra', 'selva_pasto_3'])
                else:
                    color = rnd.choice(['selva_pasto_1', 'selva_pasto_2', 'selva_pasto_3'])
                caras.append(tuple(base + t for t in tri))
                colores.append(color)
    from common import orientar_hacia
    k.agregar((verts, orientar_hacia(verts, caras, (0, 0, 1))), colores, 'escenario')
    caja_invisible('col_box_suelo_selva', (-30, -96, -1), (30, 20, 0))


def claro(k, m, rnd):
    temple_builder.altar(k, ALTAR, 1)
    # Antorchas junto al altar
    for s in (1, -1):
        x = 2.4 * s
        k.agregar(prisma(6, 0.09, 1.7, radio_sup=0.07), 'madera_tabla_oscura', 'escenario', colocar((x, -7, 0.85)))
        k.agregar(prisma(8, 0.24, 0.22, radio_sup=0.32), 'piedra_sombra', 'escenario', colocar((x, -7, 1.8)))
        vacio(f'emit_fuego_{1 if s > 0 else 2}', (x, -7, 1.95), props={'tipo': 'fuego'})
    vacio('luz_altar', (0, -6.2, 2.6), props={'color': PALETA['fuego'], 'intensidad': 6.0, 'distancia': 12.0, 'parpadeo': 1})
    caja_invisible('col_box_altar', (-1.3, -8.3, 0), (1.3, -5.7, 1.55))
    # Rayo de luz falso sobre el altar
    rayo = Constructor(PALETA, semilla=3, variacion=0)
    rayo.agregar(prisma(10, 1.7, 9.0, radio_sup=0.6), 'oro_brillante', 'escenario', colocar((0, 0, 4.5)))
    objeto_suelto('rayo_altar', rayo, [m['rayo']], (0.6, -7, 0), {'efecto': 'rayo'})
    # Esferas rituales: ruedan y rebotan (requisito 6)
    for n, (x, y) in enumerate(((6.0, -2.2), (7.5, -0.6), (5.4, 0.9)), start=1):
        e = Constructor(PALETA, semilla=40 + n, variacion=0.04)
        e.agregar(common.elipsoide(0.5, 0.5, 0.5, 10, 7), tono_piedra, 'escenario')
        e.agregar(prisma(12, 0.515, 0.12), 'oro_brillante', 'escenario', colocar((0, 0, 0), (rnd.uniform(-20, 20), 90, 0)))
        objeto_suelto(f'dyn_esfera_{n}', e, [m['toon']], (x, y, 0.52),
                      {'masa': 25.0, 'forma': 'esfera', 'material': 'esfera'})
    # Rocas que rodean el claro
    for _ in range(14):
        a = rnd.uniform(0, math.tau)
        r = rnd.uniform(15, 19)
        x, y = math.cos(a) * r, math.sin(a) * r * 0.9
        if dist_a_polilinea((x, y), SENDERO) < 4:
            continue
        t = rnd.uniform(0.6, 1.4)
        rock_builder.roca(k, (x, y, 0), t, rnd)


def bosque(k, m, rnd):
    """Árboles junto al sendero (objetos sueltos que se aclaran si tapan a Victoria) y masa de fondo."""
    individuales = 0
    for i in range(1, len(SENDERO) - 3):
        (ax, ay), (bx, by) = SENDERO[i], SENDERO[i + 1]
        for t in (0.25, 0.75):
            px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            dx, dy = bx - ax, by - ay
            largo = math.hypot(dx, dy)
            nx, ny = -dy / largo, dx / largo
            for lado in (1, -1):
                d = rnd.uniform(6.5, 10)
                x, y = px + nx * d * lado, py + ny * d * lado
                if abs(x) > 22 or y < -66 or dist_a_polilinea((x, y), SENDERO) < 5.5:
                    continue
                if math.hypot(x - ALTAR[0], y - ALTAR[1]) < 7:
                    continue
                a = Constructor(PALETA, semilla=200 + individuales, variacion=0.05)
                tree_builder.arbol(a, (0, 0, 0), rnd, escala=rnd.uniform(0.85, 1.2))
                individuales += 1
                objeto_suelto(f'arbol_{individuales}', a, [m['toon']], (x, y, 0), {'ocluir': 1})
                caja_invisible(f'col_cyl_tronco_{individuales}', (x - 0.45, y - 0.45, 0), (x + 0.45, y + 0.45, 6))
    # Masa de selva en los bordes (fusionada en la malla principal)
    for _ in range(46):
        lado = rnd.choice((1, -1))
        x = lado * rnd.uniform(25, 36)
        y = rnd.uniform(-60, 24)
        tree_builder.arbol(k, (x, y, 0), rnd, escala=rnd.uniform(1.0, 1.5))
    for _ in range(10):
        tree_builder.arbol(k, (rnd.uniform(-28, 28), rnd.uniform(23, 34), 0), rnd, escala=rnd.uniform(1.0, 1.4))
    return individuales


def cascada(k, m, rnd):
    x0, x1 = -14, 14
    yf, yb = -84, -100
    altura = 26
    # Riscos del desfiladero (paredes laterales)
    for s in (1, -1):
        for y in range(-52, -84, -8):
            xa, xb = (14, 30) if s > 0 else (-30, -14)
            rock_builder.bloque_risco(k, (xa, y - 9, 0), (xb, y + 1, rnd.uniform(14, 22)), rnd, 0.9)
        xa, xb = (14, 30) if s > 0 else (-30, -14)
        caja_invisible(f'col_box_desfiladero_{"e" if s > 0 else "o"}', (xa, -84, 0), (xb, -50, 24))
    # Risco de la cascada, con la entrada de la cueva detrás del agua
    rock_builder.bloque_risco(k, (x0, yb, 0), (-4.5, yf, altura), rnd, 0.6)
    rock_builder.bloque_risco(k, (4.5, yb, 0), (x1, yf, altura), rnd, 0.6)
    rock_builder.bloque_risco(k, (-4.5, yb, 5.0), (4.5, yf, altura), rnd, 0.4)
    rock_builder.bloque_risco(k, (-4.5, -86, 0), (-2.0, yf, 5.0), rnd, 0.25)
    rock_builder.bloque_risco(k, (2.0, -86, 0), (4.5, yf, 5.0), rnd, 0.25)
    rock_builder.bloque_risco(k, (-4.5, yb, 0), (4.5, CUEVA_Y[0], 5.0), rnd, 0.3)
    caja_invisible('col_box_risco_o', (x0, yb, 0), (-4.5, yf, altura))
    caja_invisible('col_box_risco_e', (4.5, yb, 0), (x1, yf, altura))
    caja_invisible('col_box_risco_techo', (-4.5, yb, 5.0), (4.5, yf, altura))
    caja_invisible('col_box_jamba_o', (-4.5, -86, 0), (-2.0, yf, 5.0))
    caja_invisible('col_box_jamba_e', (2.0, -86, 0), (4.5, yf, 5.0))
    caja_invisible('col_box_cueva_fondo', (-4.5, yb, 0), (4.5, CUEVA_Y[0], 5.0))
    # Agua: cortina, poza y río en lo alto
    water_builder.cortina_cascada(k, -2.9, 2.9, -84.15, altura + 0.1, 0.15, 1.4, 3)
    water_builder.disco_agua(k, (POZA[0], POZA[1], 0.06), POZA[2], 20, 4)
    water_builder.franja_agua(k, [(0, -99), (-1.5, -94), (0.5, -89), (0, -84.2)], 5.4, altura + 0.04, 4)
    # Rocas del borde de la poza (algunas sirven de plataforma)
    for i in range(12):
        a = math.tau * i / 12 + rnd.uniform(-0.15, 0.15)
        x = POZA[0] + math.cos(a) * (POZA[2] + 0.6)
        y = POZA[1] + math.sin(a) * (POZA[2] + 0.6) * 0.95
        if dist_a_polilinea((x, y), SENDERO) < 1.6:
            continue
        rock_builder.roca(k, (x, y, 0), rnd.uniform(0.6, 1.1), rnd)
    for n, (x, y, h) in enumerate(((-3.0, -72.5, 0.55), (-1.2, -75.0, 0.9), (1.3, -77.4, 1.25)), start=1):
        rock_builder.roca(k, (x, y, 0), (0.95, 0.95, h), rnd, color=tono_piedra)
        caja_invisible(f'col_box_piedra_poza_{n}', (x - 0.75, y - 0.75, 0), (x + 0.75, y + 0.75, h * 0.95))
    # Cueva: cristales azules, portal de runas y luz
    for i in range(9):
        lado = 1 if i % 2 else -1
        y = rnd.uniform(CUEVA_Y[0] + 0.8, CUEVA_Y[1] - 2.5)
        x = lado * rnd.uniform(3.6, 4.3)
        z = rnd.uniform(0.0, 3.8)
        pts = [(x, y, z), (x - lado * 0.7, y + rnd.uniform(-0.2, 0.2), z + rnd.uniform(0.3, 0.9)),
               (x + 0.1, y + 0.3, z + 0.1), (x - 0.1, y - 0.3, z + 0.2), (x - lado * 0.25, y, z - 0.25)]
        k.agregar(casco(pts), 'cristal_runa', 'escenario', material=2)
    vacio('luz_cueva', (0, -89.5, 2.6), props={'color': PALETA['cristal_runa'], 'intensidad': 5.0, 'distancia': 10.0})
    # Vegetación en lo alto del risco
    for _ in range(8):
        tree_builder.arbol(k, (rnd.uniform(-12, 12), rnd.uniform(-99, -88), altura), rnd, escala=rnd.uniform(0.9, 1.2))


def portal(m, nombre, centro, rot_z):
    """Anillo de runas que gira (el giro lo hace Three.js con la propiedad 'girar')."""
    k = Constructor(PALETA, semilla=hash(nombre) % 997, variacion=0.03)
    for i in range(16):
        a = math.tau * i / 16
        x, z = math.cos(a) * 1.35, math.sin(a) * 1.35
        k.agregar(caja_biselada(0.42, 0.26, 0.3, 0.05), tono_piedra, 'escenario', colocar((x, 0, z), (0, -math.degrees(a), 0)))
        if i % 2 == 0:
            k.agregar(caja_biselada(0.16, 0.06, 0.16, 0.02), 'cristal_runa', 'escenario',
                      colocar((x * 0.98, -0.15, z * 0.98), (0, -math.degrees(a) + 45, 0)), material=1)
    obj = objeto_suelto(nombre, k, [m['toon'], m['runa']], centro, {'girar': 0.35})
    obj.rotation_euler = (0, 0, math.radians(rot_z))
    return obj


def cornisa_y_puente(k, m, rnd):
    (x0, y0), (x1, y1), zt = CORNISA
    rock_builder.bloque_risco(k, (x0, y0, -22), (x1, y1, zt), rnd, 0.3)
    caja_invisible('col_box_cornisa', (x0, y0, -22), (x1, y1, zt))
    k.agregar(caja_biselada(x1 - x0 - 0.4, y1 - y0 - 0.4, 0.25, 0.08), 'musgo', 'escenario', colocar((0, (y0 + y1) / 2, zt + 0.02)))
    ya, yb, zp = PUENTE
    bridge_builder.cuerdas(k, ya, yb, zp, 1.7)
    for s, n in ((1, 3), (-1, 4)):
        vacio(f'emit_fuego_{n}', (s * 1.1, ya + 0.3, zp + 1.45), props={'tipo': 'fuego'})
    vacio('luz_cornisa', (0, ya + 1.0, zp + 2.0), props={'color': PALETA['fuego'], 'intensidad': 5.0, 'distancia': 11.0, 'parpadeo': 1})
    bridge_builder.tablas(PALETA, m['toon'], ya, yb, zp, 1.7, rnd)
    # Fondo del abismo
    caja_invisible('col_box_abismo_fondo', (-60, -175, -24), (60, -100.5, -22))
    for _ in range(16):
        rock_builder.roca(k, (rnd.uniform(-30, 30), rnd.uniform(-170, -101), -22), rnd.uniform(2, 5), rnd)
    # Paredes del abismo bajo la cornisa y la meseta
    for x in (-24, 24):
        rock_builder.bloque_risco(k, (x - 8, -175, -22), (x + 8, -100, rnd.uniform(4, 10)), rnd, 1.2)


def ruinas(k, m, rnd):
    (x0, y0), (x1, y1), zt = MESETA
    rock_builder.bloque_risco(k, (x0, y0, -22), (x1, y1, zt), rnd, 0.4)
    caja_invisible('col_box_meseta', (x0, y0, -22), (x1, y1, zt))
    k.agregar(caja_biselada(x1 - x0 - 0.6, y1 - y0 - 0.6, 0.2, 0.1), 'selva_pasto_3', 'escenario', colocar((0, (y0 + y1) / 2, zt + 0.02)))
    # Escalinata y terraza superior
    temple_builder.escalinata(k, -6, 6, -139, zt, 3, 1.2, 0.8)
    # Bajo los escalones visibles, una rampa invisible: se suben caminando (la cápsula no sube peldaños de 0,8 m)
    largo, subida, grosor = 3.6, 2.4, 0.4
    inclinacion = math.degrees(math.atan2(subida, largo))
    diagonal = math.hypot(largo, subida)
    ny, nz = subida / diagonal, largo / diagonal
    cy, cz = -139 - largo / 2 - ny * grosor / 2 + 0.05, zt + subida / 2 - nz * grosor / 2 + 0.02
    caja_invisible('col_box_rampa_escalinata', (-6, cy - diagonal / 2, cz - grosor / 2), (6, cy + diagonal / 2, cz + grosor / 2),
                   rot=(-inclinacion, 0, 0))
    z_terraza = zt + 2.4
    temple_builder.bloque(k, (0, -151.9, zt + 1.2), (24, 16.6, 2.4), rnd, bisel=0.2)
    caja_invisible('col_box_terraza', (-12, -160.2, zt), (12, -142.6, z_terraza))
    for n, (a, b) in enumerate(temple_builder.fachada_santuario(k, -156.0, z_terraza, 24, 10, rnd, 2), start=1):
        caja_invisible(f'col_box_fachada_{n}', a, b)
    caja_invisible('col_box_limite_sur', (-16, -161, zt), (16, -157.5, zt + 20))
    # Antorchas del pórtico
    for s, n in ((1, 5), (-1, 6)):
        k.agregar(prisma(6, 0.12, 2.0, radio_sup=0.09), 'piedra_sombra', 'escenario', colocar((s * 4.0, -152.5, z_terraza + 1.0)))
        k.agregar(prisma(8, 0.28, 0.25, radio_sup=0.36), 'piedra_sombra', 'escenario', colocar((s * 4.0, -152.5, z_terraza + 2.1)))
        vacio(f'emit_fuego_{n}', (s * 4.0, -152.5, z_terraza + 2.3), props={'tipo': 'fuego'})
    vacio('luz_ruinas', (0, -151.5, z_terraza + 3.0), props={'color': PALETA['fuego'], 'intensidad': 6.0, 'distancia': 14.0, 'parpadeo': 1})
    # Columnas rotas, cabezas gigantes y bloques caídos
    columnas = ((-10, -131, True), (-10, -137, False), (10, -131, False), (10, -137, True), (-13, -146, True), (13, -146, False))
    for n, (x, y, rota) in enumerate(columnas, start=1):
        temple_builder.columna(k, (x, y, zt), 4.5, 0.42, rnd, rota)
        caja_invisible(f'col_cyl_columna_{n}', (x - 0.55, y - 0.55, zt), (x + 0.55, y + 0.55, zt + 4.8))
    for (x, y, rz) in ((-8.5, -134.5, 25), (8.8, -133.5, -30)):
        temple_builder.cabeza_gigante(k, (x, y, zt - 0.6), 1.25, rz, rnd)
        caja_invisible(f'col_box_cabeza_{"o" if x < 0 else "e"}', (x - 1.5, y - 1.4, zt), (x + 1.5, y + 1.4, zt + 2.4))
    for _ in range(8):
        temple_builder.bloque(k, (rnd.uniform(-14, 14), rnd.uniform(-141, -129), zt + 0.3),
                              (rnd.uniform(0.8, 1.6), rnd.uniform(0.8, 1.6), 0.6), rnd, rot=(0, 0, rnd.uniform(0, 90)))
    for _ in range(6):
        tree_builder.arbol(k, (rnd.choice((-1, 1)) * rnd.uniform(13, 15), rnd.uniform(-158, -128), zt), rnd, escala=0.9)


def paisaje(k, m, rnd):
    temple_builder.piramide(k, PIRAMIDE, 96, 84, 8, 6)
    for _ in range(22):
        a = rnd.uniform(math.radians(200), math.radians(340))
        r = rnd.uniform(210, 320)
        rock_builder.montana(k, (math.cos(a) * r, math.sin(a) * r * 0.9 - 60), rnd.uniform(40, 80), rnd.uniform(35, 90), rnd,
                             color=rnd.choice(('montana', 'montana_lejana')))
    for _ in range(12):
        lado = rnd.choice((1, -1))
        rock_builder.montana(k, (lado * rnd.uniform(70, 140), rnd.uniform(-150, 60)), rnd.uniform(30, 60), rnd.uniform(18, 45), rnd)


def checkpoints_y_flores(m):
    puntos = {1: ((-4.0, 7.0, 0.0), 'Claro de entrada'), 2: ((-3.6, -102.4, CORNISA[2]), 'Cornisa'),
              3: ((-3.0, -130.5, MESETA[2]), 'Después del puente')}
    for n, ((x, y, z), nombre) in puntos.items():
        p = Constructor(PALETA, semilla=60 + n, variacion=0.03)
        p.agregar(caja_biselada(0.9, 0.9, 0.3, 0.06), tono_piedra, 'escenario', colocar((0, 0, 0.15)))
        p.agregar(caja_biselada(0.55, 0.55, 2.2, 0.06, conico=0.7), tono_piedra, 'escenario', colocar((0, 0, 1.4)))
        p.agregar(prisma(12, 0.34, 0.08), 'oro_brillante', 'escenario', colocar((0, 0, 2.75), (90, 0, 0)), material=1)
        objeto_suelto(f'pilar_checkpoint_{n}', p, [m['toon'], m['disco']], (x, y, z), {'checkpoint': n})
        vacio(f'trg_rad_checkpoint_{n}', (x, y, z), props={'radio': 4.0, 'evento': 'checkpoint', 'checkpoint': n, 'nombre': nombre})
        vacio(f'spawn_checkpoint_{n}', (x + 1.8, y - 0.6, z))
        caja_invisible(f'col_box_pilar_{n}', (x - 0.45, y - 0.45, z), (x + 0.45, y + 0.45, z + 2.6))
    for n, (x, y, z) in enumerate(((9.5, -29.0, 0.0), (3.2, -104.6, CORNISA[2]), (6.5, -134.0, MESETA[2])), start=1):
        f = Constructor(PALETA, semilla=80 + n, variacion=0.04)
        foliage_builder.flor_solar(f)
        objeto_suelto(f'flor_{n}', f, [m['toon']], (x, y, z), {'cura': 25})
        vacio(f'trg_rad_flor_{n}', (x, y, z), props={'radio': 1.3, 'evento': 'flor', 'flor': n})


def interactuables(m, rnd):
    """Objetos de la Manipulación ancestral (E): el brazalete, las páginas del diario y la losa."""
    # Brazalete sobre el altar: aro de 12 segmentos dorados con la gema azul
    b = Constructor(PALETA, semilla=31, variacion=0.02)
    for i in range(12):
        a = math.tau * i / 12
        b.agregar(caja_biselada(0.09, 0.05, 0.07, 0.012), 'oro_brillante', 'escenario',
                  colocar((math.cos(a) * 0.15, math.sin(a) * 0.15, 0), (0, 0, math.degrees(a))), material=1)
    b.agregar(casco([(0.15, 0, 0.05), (0.15, 0, -0.05), (0.15, 0.04, 0), (0.15, -0.04, 0), (0.21, 0, 0)]),
              'cristal_runa', 'escenario', material=2)
    objeto_suelto('prop_brazalete', b, [m['toon'], m['oro'], m['runa']], (ALTAR[0], ALTAR[1], 1.85),
                  {'interactuable': 'brazalete', 'etiqueta': 'Tomar el brazalete', 'flotar': 1})
    # Páginas del diario: hoja con una piedrita encima
    for n, (pos, giro) in {1: ((1.2, -5.6, 0.36), 20), 2: ((8.6, -71.5, 0.0), -35), 3: ((2.6, -129.2, MESETA[2]), 60)}.items():
        p = Constructor(PALETA, semilla=90 + n, variacion=0.04)
        p.agregar(caja_biselada(0.32, 0.42, 0.012, 0.004), 'papel', 'escenario', colocar((0, 0, 0.006), (0, 0, giro)))
        p.agregar(caja_biselada(0.3, 0.06, 0.014, 0.004), 'papel_sombra', 'escenario', colocar((0.01, -0.12, 0.012), (0, 0, giro)))
        p.agregar(casco(rock_builder.puntos_roca((0.06, 0.08, 0.04), 0.07, rnd)), tono_piedra, 'escenario')
        objeto_suelto(f'pagina_{n}', p, [m['toon']], pos, {'interactuable': 'pagina', 'pagina': n, 'etiqueta': 'Leer la página'})
    # Losa que cierra lo alto de la escalinata de las ruinas: se hunde en la terraza al manipularla
    zt = MESETA[2] + 2.4
    l = Constructor(PALETA, semilla=77, variacion=0.04)
    l.agregar(caja_biselada(12.0, 0.8, 2.4, 0.12), tono_piedra, 'escenario')
    for i in range(5):
        l.agregar(caja_biselada(0.5, 0.06, 0.5, 0.05), 'cristal_runa', 'escenario', colocar((-4 + i * 2, -0.42, 0.3), (0, 45, 0)), material=1)
    objeto_suelto('dyn_losa_1', l, [m['toon'], m['runa']], (0, -143.0, zt + 1.2),
                  {'tipo': 'cinematico', 'masa': 0.0, 'material': 'mundo', 'interactuable': 'losa',
                   'etiqueta': 'Mover la losa', 'mover': [0.0, 0.0, -2.45], 'duracion': 1.6})


def triggers_y_puntos():
    zonas = [
        ('claro', (-24, -16, -1), (24, 20, 8), 'La selva olvidada — Claro de entrada'),
        ('sendero', (-24, -62, -1), (24, -16, 8), 'La selva olvidada — Sendero de los helechos'),
        ('cascada', (-14, -84, -1), (14, -62, 10), 'La selva olvidada — Cascada'),
        ('cueva', (-4.5, -94, -1), (4.5, -84, 5), 'La selva olvidada — Cueva de las runas'),
        ('cornisa', (-6, -107, 11), (6, -100, 18), 'La selva olvidada — Cornisa'),
        ('puente', (-4, -127, 8), (4, -107, 18), 'La selva olvidada — Puente viejo'),
        ('ruinas', (-16, -161, 11), (16, -127, 24), 'La selva olvidada — Ruinas del pórtico'),
    ]
    for nombre, a, b, texto in zonas:
        caja_invisible(f'trg_box_zona_{nombre}', a, b, props={'zona': texto})
    camaras = [
        ('inicio', (-8, 8, -1), (8, 20, 5), 'exploracion', 'piramide'),
        ('cascada', (-14, -82, -1), (14, -66, 9), 'panoramica', 'cascada'),
        ('cueva', (-4.5, -94, -1), (4.5, -84.3, 5), 'interior', ''),
        ('cornisa', (-6, -107, 11.5), (6, -100, 17), 'panoramica', 'fachada'),
        ('puente', (-3, -127, 9), (3, -107, 17), 'plataformas', ''),
    ]
    for nombre, a, b, perfil, hint in camaras:
        props = {'perfil_camara': perfil}
        if hint:
            props['hint'] = hint
        caja_invisible(f'trg_box_cam_{nombre}', a, b, props=props)
    caja_invisible('trg_box_portal_cascada', (-1.1, -91.3, 0), (1.1, -89.7, 3.0),
                   props={'evento': 'portal', 'destino': 'portal_cornisa'})
    caja_invisible('trg_box_portal_cornisa', (3.3, -101.9, 12), (5.1, -100.4, 15),
                   props={'evento': 'portal', 'destino': 'portal_cascada'})
    caja_invisible('trg_box_abismo', (-60, -175, -40), (60, -100.5, 5), props={'evento': 'muerte'})
    caja_invisible('col_box_limite_norte', (-30, 20, -1), (30, 22, 10))
    caja_invisible('col_box_limite_o', (-26, -52, -1), (-24, 20, 10))
    caja_invisible('col_box_limite_e', (24, -52, -1), (26, 20, 10))

    vacio('spawn_jugador', (0, 14, 0))
    vacio('spawn_portal_cornisa', (0.0, -103.2, CORNISA[2]))
    vacio('spawn_portal_cascada', (0.0, -87.6, 0), rot_z=180)
    vacio('spawn_debug_1', (0, 10, 0))
    vacio('spawn_debug_2', (0, -103, CORNISA[2]))
    vacio('spawn_debug_3', (0, -132, MESETA[2]))
    vacio('hint_piramide', (PIRAMIDE[0], PIRAMIDE[1], 90))
    vacio('hint_cascada', (0, -84, 14))
    vacio('hint_fachada', (0, -156, 20))
    vacio('trg_rad_cascada', (0, -79, 0), props={'radio': 14.0, 'evento': 'area_cascada'})
    vacio('emit_cascada', (0, -82.6, 2.5), props={'tipo': 'cascada', 'ancho': 5.6, 'alto': 26.0})
    vacio('emit_niebla_cascada', (0, -79.5, 0.4), props={'tipo': 'niebla', 'radio': 6.0})
    vacio('emit_luciernagas_1', (-7, -28, 1.6), props={'tipo': 'luciernagas', 'radio': 11.0})
    vacio('emit_luciernagas_2', (3, -54, 1.6), props={'tipo': 'luciernagas', 'radio': 9.0})
    vacio('emit_polen', (0, 2, 2.2), props={'tipo': 'polen', 'radio': 15.0})
    vacio('emit_niebla_abismo', (0, -117, -14), props={'tipo': 'niebla', 'radio': 26.0})


def vegetacion(m, rnd):
    """Plantillas para InstancedMesh: la propiedad 'puntos' guarda x, y, z, giro, escala por instancia."""
    tipos = {'helecho': [], 'pasto': []}
    intentos = 0
    while len(tipos['helecho']) < 280 and intentos < 6000:
        intentos += 1
        x, y = rnd.uniform(-23, 23), rnd.uniform(-66, 19)
        d = dist_a_polilinea((x, y), SENDERO)
        if not 2.6 < d < 9:
            continue
        if math.hypot(x - ALTAR[0], y - ALTAR[1]) < 4.5 or math.hypot(x - POZA[0], y - POZA[1]) < POZA[2] + 1.5:
            continue
        tipos['helecho'].append((x, y, 0.0, rnd.uniform(0, math.tau), rnd.uniform(0.8, 1.5)))
    intentos = 0
    while len(tipos['pasto']) < 700 and intentos < 9000:
        intentos += 1
        x, y = rnd.uniform(-23, 23), rnd.uniform(-66, 19)
        if dist_a_polilinea((x, y), SENDERO) < 1.7 or math.hypot(x - POZA[0], y - POZA[1]) < POZA[2] + 0.6:
            continue
        tipos['pasto'].append((x, y, 0.0, rnd.uniform(0, math.tau), rnd.uniform(0.8, 1.4)))
    for nombre, constructor in (('helecho', foliage_builder.helecho), ('pasto', foliage_builder.pasto)):
        k = Constructor(PALETA, semilla=len(nombre), variacion=0.05)
        constructor(k, rnd)
        plano = [v for p in tipos[nombre] for v in p]
        objeto_suelto(f'inst_{nombre}', k, [m['toon']], (0, 0, -500), {'puntos': plano, 'viento': 1})
    return {n: len(v) for n, v in tipos.items()}


def main():
    common.limpiar_escena()
    rnd = random.Random(2026)
    m = materiales()
    k = Constructor(PALETA, semilla=9, variacion=0.05)
    suelo(k, rnd)
    claro(k, m, rnd)
    n_arboles = bosque(k, m, rnd)
    cascada(k, m, rnd)
    portal(m, 'portal_cascada', (0, -90.5, 0.15), 0)
    portal(m, 'portal_cornisa', (4.2, -101.15, 12.15), 0)
    cornisa_y_puente(k, m, rnd)
    ruinas(k, m, rnd)
    paisaje(k, m, rnd)
    checkpoints_y_flores(m)
    interactuables(m, rnd)
    triggers_y_puntos()
    plantas = vegetacion(m, rnd)

    principal = common.crear_malla('selva_escenario', k,
                                   [m['toon'], m['oro'], m['runa'], m['cascada'], m['poza'], m['rayo'], m['cima']], grupos=False)
    sueltos = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(('col_', 'trg_', 'inst_'))]
    stats.verificar_presupuesto('zona_1_selva', sueltos, PRESUPUESTO)
    print(f'[zona_1] árboles sueltos: {n_arboles} | instancias: {plantas} | malla principal: {stats.contar_triangulos(principal)} tri')
    common.exportar_glb(SALIDA, list(bpy.context.scene.objects))
    print(f'[zona_1] exportado {SALIDA} ({os.path.getsize(SALIDA) / 1024:.1f} KB)')


main()
