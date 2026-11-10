"""Nivel de prueba del día 1: un claro con plataformas escalonadas, una rampa y un pilar.
Sirve para comprobar la canalización Blender -> .glb -> Three.js con colisionadores y triggers
leídos por nombre (sección 4.4).

Uso: blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_nivel_prueba.py
"""
import math
import os
import random
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

import bpy  # noqa: E402

import common  # noqa: E402
import stats  # noqa: E402
from common import Constructor, caja_biselada, casco, colocar, prisma  # noqa: E402
from palette import PALETA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'models', 'nivel_prueba.glb')
PRESUPUESTO = 50000

PALETA_NIVEL = dict(PALETA)
PALETA_NIVEL.update({
    'pasto_1': '#4E7A45', 'pasto_2': '#5A8A4C', 'pasto_3': '#466E3F',
    'piedra_luz': '#A39A8E', 'piedra': '#827A70', 'piedra_sombra': '#5E574F',
    'musgo': '#5F8A55', 'tierra': '#6E5A44',
})


def caja_simple(nombre, tam, pos, rot=(0, 0, 0)):
    """Objeto invisible (colisionador o trigger) con su transformación en Blender."""
    sx, sy, sz = (t / 2 for t in tam)
    v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
         (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(v, [], f)
    obj = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = [math.radians(a) for a in rot]
    return obj


def cilindro_simple(nombre, radio, alto, pos):
    v, f = prisma(12, radio, alto)
    me = bpy.data.meshes.new(nombre)
    me.from_pydata([tuple(p) for p in v], [], f)
    obj = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos
    return obj


def vacio(nombre, pos, **props):
    obj = bpy.data.objects.new(nombre, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos
    for k, val in props.items():
        obj[k] = val
    return obj


def tono_piedra(_c, n):
    if n.z > 0.6:
        return 'musgo'
    return 'piedra_luz' if n.x < -0.3 or n.y < -0.3 else 'piedra'


def main():
    common.limpiar_escena()
    rnd = random.Random(7)
    k = Constructor(PALETA_NIVEL, semilla=5, variacion=0.05)

    # Suelo: losetas de pasto con variación de color (solo visual) + un colisionador
    for i in range(-5, 5):
        for j in range(-5, 5):
            tono = rnd.choice(['pasto_1', 'pasto_2', 'pasto_3'])
            k.agregar(caja_biselada(4.0, 4.0, 0.4, 0.08), tono, 'suelo',
                      colocar((i * 4 + 2, j * 4 + 2, -0.2 + rnd.uniform(-0.02, 0.02))))
    caja_simple('col_box_suelo', (40, 40, 1), (0, 0, -0.5))

    # Plataformas escalonadas (0,5 / 1,0 / 1,5 m): prueba de salto
    for n, alto in enumerate((0.5, 1.0, 1.5)):
        x, y = -6 - n * 2.6, 6
        k.agregar(caja_biselada(2.4, 2.4, alto, 0.12), tono_piedra, 'piedra', colocar((x, y, alto / 2)))
        caja_simple(f'col_box_escalon_{n + 1}', (2.4, 2.4, alto), (x, y, alto / 2))

    # Rampa
    k.agregar(caja_biselada(3.0, 7.0, 0.35, 0.08), tono_piedra, 'piedra', colocar((7, 6, 0.95), (16, 0, 0)))
    caja_simple('col_box_rampa', (3.0, 7.0, 0.35), (7, 6, 0.95), (16, 0, 0))
    k.agregar(caja_biselada(3.0, 3.0, 1.9, 0.12), tono_piedra, 'piedra', colocar((7, 10.8, 0.95)))
    caja_simple('col_box_meseta', (3.0, 3.0, 1.9), (7, 10.8, 0.95))

    # Pilar
    k.agregar(prisma(10, 0.7, 4.0, radio_sup=0.6), tono_piedra, 'piedra', colocar((0, 9, 2.0)))
    cilindro_simple('col_cyl_pilar', 0.7, 4.0, (0, 9, 2.0))

    # Rocas decorativas con colisionador de caja aproximado
    for n in range(7):
        ang = rnd.uniform(0, math.tau)
        r = rnd.uniform(10, 16)
        x, y = math.cos(ang) * r, math.sin(ang) * r
        tam = rnd.uniform(0.6, 1.4)
        pts = [(x + rnd.uniform(-tam, tam), y + rnd.uniform(-tam, tam), rnd.uniform(0, tam * 1.3)) for _ in range(14)]
        pts += [(x - tam, y, 0), (x + tam, y, 0), (x, y - tam, 0), (x, y + tam, 0)]
        k.agregar(casco(pts), tono_piedra, 'piedra')
        caja_simple(f'col_box_roca_{n + 1}', (tam * 1.7, tam * 1.7, tam * 1.2), (x, y, tam * 0.6))

    # Muros bajos en el borde (para probar la colisión de la cámara)
    for n, (pos, tam) in enumerate((((0, -19.5, 1), (40, 1, 2)), ((0, 19.5, 1), (40, 1, 2)),
                                     ((-19.5, 0, 1), (1, 40, 2)), ((19.5, 0, 1), (1, 40, 2)))):
        k.agregar(caja_biselada(*tam, 0.15), tono_piedra, 'piedra', colocar(pos))
        caja_simple(f'col_box_muro_{n + 1}', tam, pos)

    material = common.material_toon('nivel_toon')
    malla = common.crear_malla('nivel_visual', k, [material])
    for g in list(malla.vertex_groups):
        malla.vertex_groups.remove(g)

    # Zonas (el panel de la cartógrafa muestra la propiedad 'zona')
    z1 = caja_simple('trg_box_claro', (40, 40, 6), (0, 0, 3))
    z1['zona'] = 'La selva olvidada — Claro de entrada'
    z2 = caja_simple('trg_box_ruinas', (10, 6, 6), (-8.6, 6, 3))
    z2['zona'] = 'La selva olvidada — Ruinas escalonadas'
    z3 = caja_simple('trg_box_mirador', (4, 11, 8), (7, 8, 4))
    z3['zona'] = 'La selva olvidada — Mirador'

    vacio('spawn_jugador', (0, -4, 0))
    vacio('trg_rad_pilar', (0, 9, 0), radio=3.0)

    stats.verificar_presupuesto('nivel_prueba', [malla], PRESUPUESTO)
    objetos = list(bpy.context.scene.objects)
    common.exportar_glb(SALIDA, objetos)
    print(f'[nivel_prueba] exportado {SALIDA} ({os.path.getsize(SALIDA) / 1024:.1f} KB)')


main()
