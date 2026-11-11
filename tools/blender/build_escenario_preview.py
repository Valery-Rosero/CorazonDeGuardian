"""Renders de revisión del escenario: cada pieza sola, encuadrada igual que su dibujo en la hoja de escenarios.

Las piezas se construyen sin variación (cada valor al azar toma su punto medio), así el render se puede
comparar con el dibujo. La cámara mira como la del juego (desde +Y hacia -Y) y el sol es el del juego.
Uso: blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_escenario_preview.py
"""
import os
import random
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import common  # noqa: E402
import foliage_builder  # noqa: E402
import preview  # noqa: E402
import rock_builder  # noqa: E402
import temple_builder  # noqa: E402
import tree_builder  # noqa: E402
from common import SOL, Constructor  # noqa: E402
from palette import PALETA  # noqa: E402

SALIDA = os.path.join(DIR, '..', '..', 'docs', 'previews', 'escenario')


class Fijo:
    """Sustituto de random.Random que devuelve siempre el punto medio: la pieza queda igual al dibujo."""

    def uniform(self, a, b):
        return (a + b) / 2

    def random(self):
        return 0.0

    def choice(self, seq):
        return seq[0]

    def randint(self, a, _b):
        return a

    def sample(self, seq, n):
        return list(seq)[:n]


def pieza(nombre, construir):
    k = Constructor(PALETA, semilla=1, variacion=0.0)
    construir(k)
    return common.crear_malla(nombre, k, [common.material_toon('toon'), common.material_toon('hojas')], grupos=False)


# nombre, función, viewBox (ancho, alto) del dibujo, centro del dibujo en metros (x, z), metros por píxel,
# dirección de la cámara (desde dónde mira)
def piezas():
    f = Fijo()
    s_ceiba, s_palma, s_joven = 14 / 489, 9.5 / 488, 4 / 271
    s_hel, s_pasto = 1.2 / 145, 0.6 / 99
    s_roca, s_risco, s_bloque, s_col, s_cab = 2.4 / 238, 12 / 238, 1.2 / 130, 5 / 174, 3 / 145
    atras = (0, 1, 0)
    return [
        ('ceiba', lambda k: tree_builder.ceiba(k, (0, 0, 0), f, giro=0), (420, 620), (0, (600 - 310) * s_ceiba), s_ceiba, atras),
        ('palma', lambda k: tree_builder.palma(k, (0, 0, 0), f, giro=0), (320, 620),
         (-(160 - 150) * s_palma, (600 - 310) * s_palma), s_palma, atras),
        ('arbol_joven', lambda k: tree_builder.arbol_joven(k, f), (300, 420), (0, (400 - 210) * s_joven), s_joven, atras),
        ('helecho', lambda k: foliage_builder.helecho(k, f), (300, 220), (0, (205 - 110) * s_hel), s_hel, atras),
        ('pasto', lambda k: foliage_builder.pasto(k, f), (300, 220), (-(150 - 100) * s_pasto, (195 - 110) * s_pasto), s_pasto, atras),
        ('flor_solar', lambda k: foliage_builder.flor_solar(k), (300, 220), (0, (210 - 110) * 0.6 / 115), 0.6 / 115, atras),
        ('canto', lambda k: rock_builder.canto(k, (0, 0, 0), (1.2, 1.0, 1.19), random.Random(7), musgo=True), (300, 220),
         (0, (194 - 110) * s_roca), s_roca, atras),
        ('risco', lambda k: rock_builder.estratos(k, (-190 * s_risco, -4, 0), (190 * s_risco, 4, 238 * s_risco),
                                                  random.Random(3), 0.9),
         (420, 260), (0, (250 - 130) * s_risco), s_risco, (0, 1, 0.25)),
        ('bloque_tallado', lambda k: temple_builder.bloque_tallado(k, (0, 0, 0.6), (1.2, 1.2, 1.2), f, giro=180), (300, 220),
         (0, 0.6), s_bloque, (-0.55, 1, 0.5)),
        ('columnas', lambda k: (temple_builder.columna(k, (60 * s_col, 0, 0), 5.0, 0.42, f),
                                temple_builder.columna(k, (-60 * s_col, 0, 0), 5.0, 0.42, random.Random(5), rota=True, caida=180)),
         (300, 220), (0, (208 - 110) * s_col), s_col, atras),
        ('cabeza', lambda k: temple_builder.cabeza_gigante(k, (0, 0, 0), 3.0, 180, f), (300, 220),
         (0, (200 - 110) * s_cab), s_cab, atras),
        ('piramide', lambda k: temple_builder.piramide(k, (0, 0, 0), 96, 84, 6, random.Random(4)), (520, 520), (0, 46), 100 / 520, atras),
    ]


def main():
    common.limpiar_escena()
    os.makedirs(SALIDA, exist_ok=True)
    cam = preview.preparar([], '#FFD45E')
    bpy.data.objects['suelo_preview'].hide_render = True
    clave = bpy.data.objects['sol_clave']
    clave.rotation_euler = (-SOL).to_track_quat('-Z', 'Y').to_euler()
    toon = bpy.data.materials['preview_toon']
    for nombre, construir, (ancho, alto), (cx, cz), escala, desde in piezas():
        obj = pieza(nombre, construir)
        for slot in obj.material_slots:
            slot.material = toon
        objetivo = Vector((cx, 0, cz))
        d = Vector(desde).normalized()
        preview.disparar(cam, os.path.join(SALIDA, f'{nombre}.png'), objetivo + d * 150, objetivo, alto * escala,
                         (int(ancho * 2), int(alto * 2)), 'VERTICAL', lejos=400)
        bpy.data.objects.remove(obj, do_unlink=True)


main()
