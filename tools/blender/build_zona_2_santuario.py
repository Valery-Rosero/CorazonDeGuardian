"""Zona 2: El santuario (secciones 8.2 y 9.6), construido desde el tablero «Santuario» de la hoja de escenarios.

Recorrido: vestíbulo bajo → sala de columnas con el altar del escudo → sala de los espejos → antesala
que baja hasta la puerta de la arena. Las medidas son las del tablero (metros, coordenadas locales:
y = 0 en la entrada y negativa hacia el fondo). El santuario se coloca lejos de la selva (ORIGEN) y
se llega a él por el pasadizo de la puerta del pórtico (transición con fundido).

Uso: blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_zona_2_santuario.py
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

import common  # noqa: E402
import props_builder  # noqa: E402
import stats  # noqa: E402
import temple_builder  # noqa: E402
from common import (Constructor, caja_biselada, caja_invisible, casco, colocar, objeto_suelto, prisma,  # noqa: E402
                    segmento, vacio)
from palette import PALETA  # noqa: E402
from rock_builder import tono_musgo, tono_piedra  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'models', 'zona_2_santuario.glb')
PRESUPUESTO = 50000
ORIGEN = (0.0, -600.0, 0.0)

# --- Medidas del tablero «Santuario» (metros, locales) ---
VEST = dict(x=2.0, y0=0, y1=-12, techo=3.6)
SALA = dict(x=8.0, y0=-12, y1=-34, techo=11)
COLUMNAS = [(sx * 4.5, y) for sx in (-1, 1) for y in (-16, -21, -26, -31)]
VENTANAS = [-17, -23, -29]
NICHO = dict(y0=-21, y1=-25, fondo=2.0)
PASO = dict(x=2.0, y0=-34, y1=-36, techo=4.0)
ESP = dict(x=10.0, y0=-36, y1=-56, techo=13)
ALTURA_RAYO = 3.0
VENTANA_RAYO = (10.0, -40.0)
ESPEJOS = {'A': (-5.0, -40.0), 'B': (-5.0, -50.0), 'C': (0.0, -50.0)}
# Orientación de cada espejo en pasos de 45° (convenio de Blender: ángulo de la placa desde +X hacia +Y)
INICIAL = {'A': 0, 'B': 2, 'C': 6}
SOLUCION = {'A': 1, 'B': 3, 'C': 3}
CRISTAL = (0.0, -56.0)
PUERTA_ESPEJOS = dict(x=1.6, alto=2.6)
ANTE = dict(x=2.5, y0=-56, y1=-74, bajada=3.0, techo=4.2)
CHECKPOINTS = {4: ((0, -14), 'Entrada del santuario'), 5: ((0, -68), 'Antesala del jefe')}
PAGINAS = {4: ((0, -58.5), 15), 5: ((1.6, -64), -30), 6: ((0, -72.6), 0)}
FLOR = (-1.6, -62)
CENTINELAS = [(-5.5, -30.5), (5.5, -30.5)]
ESPECTROS = [(6.5, -46.0), (-7.0, -53.0)]
ESPECTRO_EXTRA = (0.0, -52.5)
GROSOR = 1.0


def L(x, y, z=0.0):
    """Local del santuario → Blender."""
    return (x + ORIGEN[0], y + ORIGEN[1], z + ORIGEN[2])


def z_ante(y):
    """Altura del suelo de la antesala, que baja 3 m de la puerta de los espejos a la de la arena."""
    t = (ANTE['y0'] - y) / (ANTE['y0'] - ANTE['y1'])
    return -ANTE['bajada'] * max(0.0, min(1.0, t))


def materiales():
    return {
        'toon': common.material_toon('santuario_toon'),
        'oro': common.material_emisivo('oro_brillante_emisivo', PALETA['oro_brillante'], 2.5),
        'runa': common.material_emisivo('cristal_runa_emisivo', PALETA['cristal_runa'], 3.0),
        'rayo': common.material_toon('rayo_luz'),
        'disco': common.material_emisivo('checkpoint_disco', PALETA['oro_brillante'], 0.2),
        'cristal': common.material_emisivo('cristal_solar_emisivo', PALETA['oro_brillante'], 0.4),
        'espejo': common.material_emisivo('espejo_superficie_emisivo', PALETA['agua_espuma'], 0.1),
    }


MAT = {'toon': 0, 'oro': 1, 'runa': 2, 'rayo': 3}


def caja(k, x0, y0, x1, y1, z0, z1, color=tono_piedra, nombre=None, bisel=0.08, material=0):
    """Bloque de piedra entre dos esquinas (locales) y, si lleva nombre, su colisionador."""
    ax, ay, az = L(min(x0, x1), min(y0, y1), z0)
    bx, by, bz = L(max(x0, x1), max(y0, y1), z1)
    k.agregar(caja_biselada(bx - ax, by - ay, bz - az, bisel), color, 'escenario',
              colocar(((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)), material=material)
    if nombre:
        caja_invisible(f'col_box_{nombre}', (ax, ay, az), (bx, by, bz))


def muro_con_banda(k, x0, y0, x1, y1, z0, z1, nombre):
    """Muro con zócalo oscuro y una cornisa clara: la piedra del templo no es una pared lisa."""
    caja(k, x0, y0, x1, y1, z0, z1, nombre=nombre)
    dx, dy = (0.12 if x1 - x0 < 1.5 else 0), (0.12 if y1 - y0 < 1.5 else 0)
    caja(k, x0 - dx, y0 - dy, x1 + dx, y1 + dy, z0, z0 + 0.6, 'piedra_sombra')
    if z1 - z0 > 5:
        caja(k, x0 - dx, y0 - dy, x1 + dx, y1 + dy, z1 - 1.6, z1 - 1.2, 'piedra_luz')


def vestibulo(k):
    x, y0, y1, t = VEST['x'], VEST['y0'], VEST['y1'], VEST['techo']
    caja(k, -x - GROSOR, y0 + 1, x + GROSOR, y1, -0.5, 0, 'piedra_sombra', 'suelo_vestibulo')
    muro_con_banda(k, -x - GROSOR, y0 + 1, -x, y1, 0, t, 'vest_o')
    muro_con_banda(k, x, y0 + 1, x + GROSOR, y1, 0, t, 'vest_e')
    caja(k, -x - GROSOR, y0 + 1, x + GROSOR, y1, t, t + 0.8, 'piedra_oscura', 'vest_techo')
    # Por donde se llega: la luz del día detrás de la puerta (ya no se puede volver)
    caja(k, -x, y0 + 1, x, y0 + 0.6, 0, t, 'piedra_oscura', 'vest_entrada')
    for y in (-3, -6, -9):
        for sx in (-1, 1):
            caja(k, sx * x - 0.15, y - 0.3, sx * x + 0.15, y + 0.3, 0, t, 'piedra')


def sala_columnas(k, m, rnd):
    x, y0, y1, t = SALA['x'], SALA['y0'], SALA['y1'], SALA['techo']
    caja(k, -x - GROSOR, y0, x + GROSOR, y1, -0.5, 0, 'piedra_sombra', 'suelo_sala')
    # Losas del suelo en damero suave
    for i, yy in enumerate(range(y0, y1, -2)):
        for j, xx in enumerate(range(int(-x), int(x), 2)):
            if (i + j) % 2 == 0:
                k.agregar(caja_biselada(1.9, 1.9, 0.04, 0.02), 'piedra', 'escenario', colocar(L(xx + 1, yy - 1, 0.02)))
    # Muro de la entrada (con el hueco del vestíbulo) y muro del fondo (con el paso)
    for sx in (-1, 1):
        caja(k, sx * VEST['x'], y0 + GROSOR, sx * (x + GROSOR), y0, 0, t, nombre=f'sala_n_{"e" if sx > 0 else "o"}')
        caja(k, sx * PASO['x'], y1, sx * (x + GROSOR), y1 - GROSOR, 0, t, nombre=f'sala_s_{"e" if sx > 0 else "o"}')
    caja(k, -VEST['x'], y0 + GROSOR, VEST['x'], y0, VEST['techo'], t)
    caja(k, -PASO['x'], y1, PASO['x'], y1 - GROSOR, PASO['techo'], t)
    # Muro este con tres ventanas altas (z 7 a 10)
    cortes = [y0] + [v for yv in VENTANAS for v in (yv + 0.8, yv - 0.8)] + [y1]
    for i, (a, b) in enumerate(zip(cortes[::2], cortes[1::2]), start=1):
        muro_con_banda(k, x, a, x + GROSOR, b, 0, t, f'sala_e_{i}')
    for yv in VENTANAS:
        caja(k, x, yv + 0.8, x + GROSOR, yv - 0.8, 0, 7)
        caja(k, x, yv + 0.8, x + GROSOR, yv - 0.8, 10, t)
        # Haz dorado que cruza el polvo desde la ventana hasta el suelo
        mm, largo = segmento(Vector(L(x, yv, 8.5)), Vector(L(-2.5, yv + 1.6, 0.05)))
        k.agregar(prisma(8, 0.55, largo, radio_sup=1.1), 'oro_brillante', 'escenario', mm, material=MAT['rayo'])
    # Una sola luz dorada para los tres haces (cada luz cuesta en todos los píxeles: la Iris Xe lo nota)
    vacio('luz_haces', L(-1.2, VENTANAS[1] + 1.2, 1.0), props={'color': PALETA['oro_brillante'], 'intensidad': 5.0,
                                                               'distancia': 14.0, 'grupo': 2})
    # Muro oeste con el nicho del altar
    muro_con_banda(k, -x - GROSOR, y0, -x, NICHO['y0'], 0, t, 'sala_o_1')
    muro_con_banda(k, -x - GROSOR, NICHO['y1'], -x, y1, 0, t, 'sala_o_2')
    caja(k, -x - GROSOR, NICHO['y0'], -x, NICHO['y1'], 4.2, t)
    altar_escudo(k, m)
    caja(k, -x - GROSOR, y0, x + GROSOR, y1, t, t + 1, 'piedra_oscura', 'sala_techo')
    for (cx, cy) in COLUMNAS:
        temple_builder.columna(k, L(cx, cy, 0), t, 0.55, rnd, liana=False)
        caja_invisible(f'col_cyl_columna_s_{abs(cy)}_{"e" if cx > 0 else "o"}', L(cx - 0.65, cy - 0.65, 0), L(cx + 0.65, cy + 0.65, t))
    # Antorchas en el muro del fondo
    for sx in (-1, 1):
        px, py = sx * 3.2, y1 + 0.35
        k.agregar(prisma(6, 0.12, 2.0, radio_sup=0.09), 'piedra_sombra', 'escenario', colocar(L(px, py, 1.0)))
        k.agregar(prisma(8, 0.28, 0.25, radio_sup=0.36), 'piedra_sombra', 'escenario', colocar(L(px, py, 2.1)))
        vacio(f'emit_fuego_s{"e" if sx > 0 else "o"}', L(px, py, 2.3), props={'tipo': 'fuego'})
    vacio('luz_sala_fondo', L(0, y1 + 1.5, 3.0), props={'color': PALETA['fuego'], 'intensidad': 5.0, 'distancia': 12.0,
                                                       'parpadeo': 1, 'grupo': 2})
    vacio('emit_polvo_sala', L(0, -23, 3.5), props={'tipo': 'polen', 'radio': 9.0})


def altar_escudo(k, m):
    """Nicho azul con runas que respiran y el escudo flotando sobre un pedestal."""
    x0 = -SALA['x']
    xf = x0 - NICHO['fondo']
    y0, y1 = NICHO['y0'], NICHO['y1']
    caja(k, xf - GROSOR, y0 + GROSOR, x0, y0, 0, 4.2, nombre='nicho_n')
    caja(k, xf - GROSOR, y1, x0, y1 - GROSOR, 0, 4.2, nombre='nicho_s')
    caja(k, xf - GROSOR, y0, xf, y1, 0, 4.2, '#1E3A55', 'nicho_fondo')
    caja(k, xf - GROSOR, y0 + GROSOR, x0, y1 - GROSOR, 4.2, 5.0, 'piedra_oscura')
    # Runas del fondo (material de runas: respiran en el juego)
    for i, z in enumerate((1.2, 2.0, 2.8, 3.6)):
        for j, yy in enumerate((-21.8, -23.0, -24.2)):
            if (i + j) % 2 == 0:
                k.agregar(caja_biselada(0.05, 0.35, 0.35, 0.03), 'cristal_runa', 'escenario',
                          colocar(L(xf + 0.03, yy, z), (45, 0, 0)), material=MAT['runa'])
    caja(k, xf + 0.4, -22.3, x0 - 0.2, -23.7, 0, 1.0, nombre='altar_pedestal')
    caja(k, xf + 0.3, -22.2, x0 - 0.1, -23.8, 1.0, 1.15, 'piedra_luz')
    # El escudo: medallón azul que flota y se toma con E
    e = Constructor(PALETA, semilla=33, variacion=0.02)
    e.agregar(prisma(12, 0.42, 0.08), 'cristal_runa', 'escenario', colocar((0, 0, 0), (0, 90, 0)), material=1)
    e.agregar(prisma(12, 0.5, 0.05), 'oro_brillante', 'escenario', colocar((0.02, 0, 0), (0, 90, 0)))
    objeto_suelto('prop_altar_escudo', e, [m['toon'], m['runa']], L(x0 - 1.0, -23.0, 1.75),
                  {'interactuable': 'altar_escudo', 'etiqueta': 'Tomar el Escudo arcano', 'flotar': 1})
    vacio('luz_altar_escudo', L(x0 - 0.9, -23.0, 2.6), props={'color': PALETA['azul_arcano'], 'intensidad': 6.0,
                                                               'distancia': 9.0, 'grupo': 2})


def paso_y_sala_espejos(k, m, rnd):
    # Paso entre salas
    x, y0, y1, t = PASO['x'], PASO['y0'], PASO['y1'], PASO['techo']
    caja(k, -x - GROSOR, y0, x + GROSOR, y1, -0.5, 0, 'piedra_sombra', 'suelo_paso')
    caja(k, -x - GROSOR, y0, -x, y1, 0, t, nombre='paso_o')
    caja(k, x, y0, x + GROSOR, y1, 0, t, nombre='paso_e')
    caja(k, -x - GROSOR, y0, x + GROSOR, y1, t, t + 0.6, 'piedra_oscura', 'paso_techo')

    x, y0, y1, t = ESP['x'], ESP['y0'], ESP['y1'], ESP['techo']
    caja(k, -x - GROSOR, y0, x + GROSOR, y1 - GROSOR, -0.5, 0, 'piedra_sombra', 'suelo_espejos')
    for sx in (-1, 1):
        caja(k, sx * PASO['x'], y0, sx * (x + GROSOR), y0 + GROSOR, 0, t, nombre=f'espejos_n_{"e" if sx > 0 else "o"}')
        caja(k, sx * PUERTA_ESPEJOS['x'], y1, sx * (x + GROSOR), y1 - GROSOR, 0, t,
             nombre=f'espejos_s_{"e" if sx > 0 else "o"}')
    caja(k, -PASO['x'], y0 + GROSOR, PASO['x'], y0, PASO['techo'], t)
    caja(k, -PUERTA_ESPEJOS['x'], y1, PUERTA_ESPEJOS['x'], y1 - GROSOR, PUERTA_ESPEJOS['alto'], t, nombre='espejos_dintel')
    # Muro este con la ventana del rayo, a 3 m
    vy = VENTANA_RAYO[1]
    muro_con_banda(k, x, y0, x + GROSOR, vy + 0.6, 0, t, 'espejos_e_1')
    muro_con_banda(k, x, vy - 0.6, x + GROSOR, y1, 0, t, 'espejos_e_2')
    caja(k, x, vy + 0.6, x + GROSOR, vy - 0.6, 0, ALTURA_RAYO - 0.45, nombre='espejos_e_bajo')
    caja(k, x, vy + 0.6, x + GROSOR, vy - 0.6, ALTURA_RAYO + 0.45, t)
    k.agregar(caja_biselada(0.1, 1.0, 0.7, 0.03), 'oro_brillante', 'escenario', colocar(L(x + 0.6, vy, ALTURA_RAYO)),
              material=MAT['oro'])
    muro_con_banda(k, -x - GROSOR, y0, -x, y1, 0, t, 'espejos_o')
    caja(k, -x - GROSOR, y0, x + GROSOR, y1 - GROSOR, t, t + 1, 'piedra_oscura', 'espejos_techo')
    mural(k)
    # Incrustaciones doradas del suelo: la ruta del sol
    ruta = [VENTANA_RAYO, ESPEJOS['A'], ESPEJOS['B'], ESPEJOS['C'], CRISTAL]
    for (ax, ay), (bx, by) in zip(ruta, ruta[1:]):
        mm, largo = segmento(Vector(L(ax, ay, 0.03)), Vector(L(bx, by, 0.03)))
        k.agregar(prisma(4, 0.16, largo, giro=45, tapas=False), 'dorado_solar', 'escenario',
                  mm @ colocar(escala=(1, 0.15, 1)))
    # Pedestales y espejos (el espejo es un objeto aparte: gira con E)
    for i, (nombre, (ex, ey)) in enumerate(ESPEJOS.items()):
        k.agregar(prisma(8, 0.34, 2.45, radio_sup=0.28), tono_piedra, 'escenario', colocar(L(ex, ey, 1.225)))
        k.agregar(prisma(8, 0.45, 0.25), 'piedra_luz', 'escenario', colocar(L(ex, ey, 0.125)))
        caja_invisible(f'col_cyl_pedestal_{nombre}', L(ex - 0.45, ey - 0.45, 0), L(ex + 0.45, ey + 0.45, 2.6))
        e = Constructor(PALETA, semilla=50 + i, variacion=0.02)
        e.agregar(caja_biselada(1.4, 0.1, 0.9, 0.02), 'agua_espuma', 'escenario', material=1)
        for sz in (1, -1):
            e.agregar(caja_biselada(1.5, 0.14, 0.08, 0.02), 'oro_brillante', 'escenario', colocar((0, 0, sz * 0.47)))
        for sx in (1, -1):
            e.agregar(caja_biselada(0.08, 0.14, 1.0, 0.02), 'oro_brillante', 'escenario', colocar((sx * 0.74, 0, 0)))
        e.agregar(prisma(6, 0.07, 0.6), 'oro_brillante', 'escenario', colocar((0, 0, -0.75)))
        paso_blender = INICIAL[nombre]
        obj = objeto_suelto(f'espejo_{nombre}', e, [m['toon'], m['espejo']], L(ex, ey, ALTURA_RAYO),
                            {'interactuable': 'espejo', 'etiqueta': 'Girar el espejo', 'espejo': i,
                             # En el juego el ángulo va en el plano XZ de Three.js (z = -y): se invierte
                             'paso': (8 - paso_blender) % 8, 'solucion': (8 - SOLUCION[nombre]) % 8})
        obj.rotation_euler = (0, 0, math.radians(paso_blender * 45))
    # Datos del rayo para el juego
    vacio('rayo_origen', L(VENTANA_RAYO[0], VENTANA_RAYO[1], ALTURA_RAYO), props={'dir': [-1.0, 0.0]})
    vacio('rayo_sala_min', L(-x, y1, 0))
    vacio('rayo_sala_max', L(x, y0, t))
    # Cristal solar sobre la puerta: se enciende al llegar el rayo
    c = Constructor(PALETA, semilla=60, variacion=0.0)
    pts = [(0, 0, 0.55), (0, 0, -0.55), (0.42, 0, 0), (-0.42, 0, 0), (0, 0.3, 0), (0, -0.3, 0),
           (0.25, 0.18, 0.28), (-0.25, -0.18, 0.28), (0.25, -0.18, -0.28), (-0.25, 0.18, -0.28)]
    c.agregar(casco(pts), 'oro_brillante', 'escenario', material=1)
    objeto_suelto('prop_cristal_solar', c, [m['toon'], m['cristal']], L(CRISTAL[0], CRISTAL[1] + 0.35, ALTURA_RAYO), {'cristal': 1})
    k.agregar(caja_biselada(1.3, 0.3, 0.25, 0.04), 'piedra_luz', 'escenario', colocar(L(0, y1 + 0.2, ALTURA_RAYO - 0.75)))
    vacio('luz_cristal', L(0, y1 + 1.2, ALTURA_RAYO), props={'color': PALETA['oro_brillante'], 'intensidad': 0.0,
                                                           'distancia': 10.0, 'grupo': 2, 'cristal': 1})
    # Puerta de los espejos: baja al resolver el acertijo
    pu = Constructor(PALETA, semilla=61, variacion=0.03)
    pu.agregar(caja_biselada(PUERTA_ESPEJOS['x'] * 2, 0.5, PUERTA_ESPEJOS['alto'], 0.06), 'piedra_sombra', 'escenario')
    temple_builder.glifo_sol(pu, colocar((0, -0.26, 0.2)), 0.4, 'dorado_solar')
    objeto_suelto('dyn_puerta_espejos', pu, [m['toon']], L(0, y1 - 0.5, PUERTA_ESPEJOS['alto'] / 2),
                  {'tipo': 'cinematico', 'masa': 0.0, 'material': 'mundo', 'mover': [0.0, 0.0, -2.65], 'duracion': 2.2})
    # Antorchas
    for sx in (-1, 1):
        px, py = sx * 6.0, y0 - 0.4
        k.agregar(prisma(6, 0.12, 2.0, radio_sup=0.09), 'piedra_sombra', 'escenario', colocar(L(px, py, 1.0)))
        k.agregar(prisma(8, 0.28, 0.25, radio_sup=0.36), 'piedra_sombra', 'escenario', colocar(L(px, py, 2.1)))
        vacio(f'emit_fuego_e{"e" if sx > 0 else "o"}', L(px, py, 2.3), props={'tipo': 'fuego'})
    vacio('luz_espejos', L(0, y0 - 2.0, 3.5), props={'color': PALETA['fuego'], 'intensidad': 5.0, 'distancia': 14.0,
                                                   'parpadeo': 1, 'grupo': 2})
    vacio('emit_polvo_espejos', L(0, -46, 3.5), props={'tipo': 'polen', 'radio': 9.0})


def mural(k):
    """Mural del oeste: la ruta del sol dibujada en oro sobre piedra oscura (la pista del acertijo)."""
    x = -ESP['x'] + 0.06
    k.agregar(caja_biselada(0.1, 6.0, 3.4, 0.03), 'piedra_oscura', 'escenario', colocar(L(x, -46, 3.4)))
    # La sala en miniatura (escala 1:4) mirada desde el oeste: la ruta va de la ventana al cristal
    esc = 0.25

    def pm(px, py):
        # El plano de la sala dibujado en la pared: el norte-sur del suelo va a lo largo del muro y el
        # este-oeste hacia arriba
        return Vector(L(x + 0.07, -46 + (py + 46) * esc, 3.4 + px * esc * 0.6))

    ruta = [VENTANA_RAYO, ESPEJOS['A'], ESPEJOS['B'], ESPEJOS['C'], CRISTAL]
    for (ax, ay), (bx, by) in zip(ruta, ruta[1:]):
        mm, largo = segmento(pm(ax, ay), pm(bx, by))
        k.agregar(prisma(4, 0.05, largo + 0.05, giro=45, tapas=False), 'dorado_solar', 'escenario', mm)
    for px, py in ruta[1:4]:
        k.agregar(prisma(6, 0.12, 0.04), 'oro_brillante', 'escenario', colocar(pm(px, py), (0, 90, 0)))
    temple_builder.glifo_sol(k, colocar(pm(*VENTANA_RAYO)) @ colocar(rot=(0, 0, 90)), 0.18, 'dorado_solar')


def antesala(k, m, rnd):
    x, y0, y1, t = ANTE['x'], ANTE['y0'], ANTE['y1'], ANTE['techo']
    # Suelo inclinado (colisionador girado) y escalones visuales suaves
    largo = y0 - y1
    inclinacion = math.degrees(math.atan2(ANTE['bajada'], largo))
    diagonal = math.hypot(largo, ANTE['bajada'])
    cy = (y0 + y1) / 2
    ax, ay, az = L(-x - GROSOR, cy - diagonal / 2, -ANTE['bajada'] / 2 - 0.5)
    bx, by, bz = L(x + GROSOR, cy + diagonal / 2, -ANTE['bajada'] / 2)
    caja_invisible('col_box_suelo_antesala', (ax, ay, az), (bx, by, bz), rot=(inclinacion, 0, 0))
    n = 12
    for i in range(n):
        ya, yb = y0 - largo * i / n, y0 - largo * (i + 1) / n
        za, zb = z_ante(ya), z_ante(yb)
        k.agregar(caja_biselada(2 * x, largo / n * 1.02, 0.5, 0.04), 'piedra' if i % 2 else 'piedra_sombra', 'escenario',
                  colocar(L(0, (ya + yb) / 2, (za + zb) / 2 - 0.25), (inclinacion, 0, 0)))
    for sx in (-1, 1):
        caja(k, sx * x, y0 - GROSOR, sx * (x + GROSOR), y1, -ANTE['bajada'] - 0.5, t, nombre=f'ante_{"e" if sx > 0 else "o"}')
        # Franja dorada en la pared: cada vez más cálida hacia la puerta de la arena
        for i in range(6):
            yy = y0 - 2 - i * 2.8
            k.agregar(caja_biselada(0.06, 1.6, 0.18, 0.02), 'dorado_solar' if i < 3 else 'oro_brillante', 'escenario',
                      colocar(L(sx * (x - 0.03), yy, z_ante(yy) + 2.2)), material=MAT['oro'] if i >= 3 else 0)
    caja(k, -x - GROSOR, y0 - GROSOR, x + GROSOR, y1, t - 0.5, t + 0.5, 'piedra_oscura', 'ante_techo')
    # Puerta tallada de la arena (cerrada hasta el día 5) con grietas naranjas
    caja(k, -x - GROSOR, y1, x + GROSOR, y1 - GROSOR, -ANTE['bajada'], t, 'piedra_sombra', 'puerta_arena')
    temple_builder.glifo_sol(k, colocar(L(0, y1 + 0.02, -ANTE['bajada'] + 2.0)), 0.7, 'dorado_solar')
    for (a, b) in (((-0.4, 0.4), (-0.1, 1.2)), ((0.3, 0.2), (0.6, 1.4)), ((-1.2, 2.6), (-0.6, 3.4))):
        mm, largo2 = segmento(Vector(L(a[0], y1 + 0.03, -ANTE['bajada'] + a[1])), Vector(L(b[0], y1 + 0.03, -ANTE['bajada'] + b[1])))
        k.agregar(prisma(4, 0.04, largo2, tapas=False), 'flor_centro', 'escenario', mm, material=MAT['oro'])
    caja_invisible('trg_box_puerta_arena', L(-x, y1 + 2.2, -ANTE['bajada']), L(x, y1, -ANTE['bajada'] + 3),
                   props={'evento': 'puerta_arena'})
    for i, yy in enumerate((-61, -70)):
        vacio(f'luz_antesala_{i + 1}', L(0, yy, z_ante(yy) + 2.6),
              props={'color': PALETA['fuego'] if i < 2 else PALETA['flor_centro'], 'intensidad': 3.0 + i * 1.5,
                     'distancia': 8.0, 'parpadeo': 1, 'grupo': 2})


def objetos_de_juego(m, rnd):
    for n, ((x, y), nombre) in CHECKPOINTS.items():
        z = z_ante(y) if y < ANTE['y0'] else 0.0
        props_builder.pilar_checkpoint(m, n, L(x, y, z), nombre, salida=(1.4, -0.4) if n == 5 else (1.8, -0.6))
    for n, ((x, y), giro) in PAGINAS.items():
        z = z_ante(y) if y < ANTE['y0'] else 0.0
        props_builder.pagina(m, n, L(x, y, z), giro, rnd)
    props_builder.flor(m, 4, L(FLOR[0], FLOR[1], z_ante(FLOR[1])))
    # Enemigos: los centinelas duermen como estatuas hasta que Victoria toma el escudo;
    # dos espectros aparecen al entrar a la sala de los espejos y uno más al resolverla
    for i, (x, y) in enumerate(CENTINELAS, start=2):
        vacio(f'spawn_centinela_{i}', L(x, y, 0), rot_z=180, props={'enemigo': 'centinela', 'dormido': 1, 'despierta': 'escudo'})
    for i, (x, y) in enumerate(ESPECTROS, start=1):
        vacio(f'spawn_espectro_{i}', L(x, y, 0), props={'enemigo': 'espectro', 'aparece': 'sala_espejos'})
    vacio('spawn_espectro_3', L(*ESPECTRO_EXTRA, 0), props={'enemigo': 'espectro', 'aparece': 'espejos_resueltos'})


def triggers_y_puntos():
    zonas = [
        ('vestibulo', (-2, 0.5, -1), (2, -12, 5), 'El santuario — Vestíbulo'),
        ('sala', (-10, -12, -1), (8, -34, 12), 'El santuario — Sala de columnas'),
        ('espejos', (-10, -36, -1), (10, -56, 14), 'El santuario — Sala de los espejos'),
        ('antesala', (-2.5, -56, -4), (2.5, -74, 5), 'El santuario — Antesala'),
    ]
    for nombre, a, b, texto in zonas:
        caja_invisible(f'trg_box_zona_s_{nombre}', L(*a), L(*b), props={'zona': texto})
    for nombre, a, b, perfil in (('vestibulo', (-2, 0.5, -1), (2, -12, 4), 'interior'),
                                 ('antesala', (-2.5, -56.5, -4), (2.5, -74, 5), 'interior')):
        caja_invisible(f'trg_box_cam_s_{nombre}', L(*a), L(*b), props={'perfil_camara': perfil})
    caja_invisible('trg_box_sala_espejos', L(-10, -37, -1), L(10, -56, 6), props={'evento': 'sala_espejos'})
    vacio('spawn_santuario', L(0, -1.5, 0))
    vacio('spawn_debug_4', L(0, -14, 0))
    vacio('spawn_debug_5', L(0, -39, 0))
    vacio('hint_cristal', L(CRISTAL[0], CRISTAL[1], ALTURA_RAYO))


def main():
    common.limpiar_escena()
    rnd = random.Random(2027)
    m = materiales()
    k = Constructor(PALETA, semilla=12, variacion=0.04)
    vestibulo(k)
    sala_columnas(k, m, rnd)
    paso_y_sala_espejos(k, m, rnd)
    antesala(k, m, rnd)
    objetos_de_juego(m, rnd)
    triggers_y_puntos()
    principal = common.crear_malla('santuario_escenario', k, [m['toon'], m['oro'], m['runa'], m['rayo']], grupos=False)
    sueltos = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(('col_', 'trg_'))]
    stats.verificar_presupuesto('zona_2_santuario', sueltos, PRESUPUESTO)
    print(f'[zona_2] malla principal: {stats.contar_triangulos(principal)} tri')
    common.exportar_glb(SALIDA, list(bpy.context.scene.objects))
    print(f'[zona_2] exportado {SALIDA} ({os.path.getsize(SALIDA) / 1024:.1f} KB)')
    if '--preview' in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []):
        planta()


def planta():
    """Vista desde arriba con el mismo encuadre que el plano del tablero «Santuario» (11,5 px/m, el este
    arriba y la entrada a la izquierda), cortada a 9 m de altura para ver por dentro."""
    import preview
    for o in bpy.context.scene.objects:
        if o.name.startswith(('col_', 'trg_')):
            o.hide_render = True
    cam = preview.preparar([o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render], PALETA['cristal_runa'])
    bpy.data.objects['suelo_preview'].hide_render = True
    cx, cy, _ = L(0, -36.0)
    cam.location = (cx, cy, 40)
    cam.rotation_euler = (0, 0, math.radians(-90))
    cam.data.type = 'ORTHO'
    cam.data.sensor_fit = 'HORIZONTAL'
    cam.data.ortho_scale = 900 / 11.5
    cam.data.clip_start = 40 - 9
    cam.data.clip_end = 80
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1800, 640
    sc.render.filepath = os.path.join(RAIZ, 'docs', 'previews', 'santuario_planta.png')
    bpy.ops.render.render(write_still=True)
    print(f'[preview] {sc.render.filepath}')


main()
