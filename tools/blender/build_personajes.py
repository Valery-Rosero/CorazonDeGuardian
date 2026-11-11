"""Genera los personajes y los exporta a public/models/.

Uso (desde la raíz del proyecto):
  blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_personajes.py
  blender ... --python tools/blender/build_personajes.py -- --preview     (además renderiza docs/previews/)
"""
import math
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

import bpy  # noqa: E402

import character_builder  # noqa: E402
import common  # noqa: E402
import stats  # noqa: E402
from palette import PALETA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
MODELOS = os.path.join(RAIZ, 'public', 'models')
PREVIEWS = os.path.join(RAIZ, 'docs', 'previews')

PRESUPUESTO = {'victoria': 7500}

EXPRESIONES_PREVIEW = {
    'neutral': {},
    'alegria': {'boca_sonrisa': 1.0, 'parpado_inf': 0.7, 'cejas_arriba': 0.35, 'vis_E': 0.35},
    'determinacion': {'cejas_ceno': 1.0, 'parpado_sup': 0.55, 'parpado_inf': 0.3, 'boca_triste': 0.15},
    'sorpresa': {'cejas_arriba': 1.0, 'vis_O': 0.85},
    'tristeza': {'cejas_tristes': 1.0, 'boca_triste': 0.9, 'parpado_sup': 0.45, 'mirada_der': 0.5},
    'ternura': {'cejas_tristes': 0.5, 'boca_sonrisa': 0.7, 'parpado_sup': 0.4, 'parpado_inf': 0.5},
    'parpadeo': {'parpadeo': 1.0},
    'habla_A': {'vis_A': 1.0, 'cejas_arriba': 0.2},
}

POSE_PRUEBA = {  # grados, ejes locales del hueso
    'brazo_sup_der': (-80, 0, 0),
    'brazo_inf_der': (-15, 0, 0),
    'brazo_sup_izq': (20, 0, 0),
    'cabeza': (0, 18, 0),
    'pierna_sup_izq': (-28, 0, 0),
    'pierna_inf_izq': (20, 0, 0),
    'pierna_sup_der': (18, 0, 0),
    'pierna_inf_der': (30, 0, 0),
    'trenza_2': (14, 0, 6),
    'trenza_3': (10, 0, 6),
    'trenza_4': (10, 0, 4),
    'poncho_delante': (-12, 0, 0),
}


def argumentos():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def renders_victoria(arm, cuerpo, cabeza):
    import preview
    os.makedirs(PREVIEWS, exist_ok=True)
    cam = preview.preparar([cuerpo, cabeza], PALETA['gema_pulso'])
    # Igual que en el juego: la cara no proyecta sombras sobre sí misma (nariz, párpados),
    # pero sí recibe la sombra del sombrero.
    cabeza.visible_shadow = False
    r = lambda n: os.path.join(PREVIEWS, f'victoria_{n}.png')  # noqa: E731
    # Mismo encuadre que el boceto (lienzo de 200 × 420 unidades): sirve para superponerlos
    alto = 420 * character_builder.ESCALA
    zc = (410 - 210) * character_builder.ESCALA
    preview.disparar(cam, r('boceto_frente'), (0, -6, zc), (0, 0, zc), alto, (400, 840), 'VERTICAL')
    preview.disparar(cam, r('boceto_espalda'), (0, 6, zc), (0, 0, zc), alto, (400, 840), 'VERTICAL')
    preview.disparar(cam, r('frente'), (0, -6, 0.85), (0, 0, 0.85), 1.95)
    preview.disparar(cam, r('espalda'), (0, 6, 0.85), (0, 0, 0.85), 1.95)
    preview.disparar(cam, r('lado'), (6, 0, 0.85), (0, 0, 0.85), 1.95)
    preview.disparar(cam, r('tres_cuartos'), (-3.6, -4.6, 2.3), (0, 0, 0.82), 2.0)
    preview.disparar(cam, r('camara_juego'), (-0.9, 4.2, 2.1), (0, 0, 1.0), 2.1)

    # En primeros planos, sin sombras proyectadas para que todas las caras reciban la misma luz
    for luz in bpy.data.lights:
        luz.use_shadow = False
    claves = cabeza.data.shape_keys.key_blocks
    for nombre, valores in EXPRESIONES_PREVIEW.items():
        for kb in claves[1:]:
            kb.value = valores.get(kb.name, 0.0)
        preview.disparar(cam, r(f'cara_{nombre}'), (0, -6, 1.40), (0, 0, 1.40), 0.36, (520, 520))
    for kb in claves[1:]:
        kb.value = 0.0
    for luz in bpy.data.lights:
        luz.use_shadow = True

    for hueso, rot in POSE_PRUEBA.items():
        pb = arm.pose.bones[hueso]
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = [math.radians(a) for a in rot]
    preview.disparar(cam, r('pose_prueba'), (-3.6, -4.6, 2.3), (0, 0, 0.82), 2.1)
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)


def main():
    args = argumentos()
    common.limpiar_escena()
    os.makedirs(MODELOS, exist_ok=True)

    arm, cuerpo, cabeza = character_builder.construir_victoria(PALETA)
    stats.verificar_presupuesto('victoria', [cuerpo, cabeza], PRESUPUESTO['victoria'])
    print(f'[victoria] huesos: {len(arm.data.bones)} | formas de cara: {len(cabeza.data.shape_keys.key_blocks) - 1}')
    ruta = os.path.join(MODELOS, 'victoria.glb')
    common.exportar_glb(ruta, [arm, cuerpo, cabeza])
    print(f'[victoria] exportado {ruta} ({os.path.getsize(ruta) / 1024:.1f} KB)')

    if '--preview' in args:
        renders_victoria(arm, cuerpo, cabeza)


main()
