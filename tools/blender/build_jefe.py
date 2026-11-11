"""Genera el Guardián del Sol y a Mateo y los exporta a public/models/ (guardian.glb y mateo.glb).

Uso (desde la raíz del proyecto):
  blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_jefe.py
  blender ... --python tools/blender/build_jefe.py -- --preview     (además renderiza docs/previews/)
"""
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

import bpy  # noqa: E402

import boss_builder  # noqa: E402
import common  # noqa: E402
import mateo_builder  # noqa: E402
import stats  # noqa: E402
from palette import PALETA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
MODELOS = os.path.join(RAIZ, 'public', 'models')
PREVIEWS = os.path.join(RAIZ, 'docs', 'previews')
PRESUPUESTO = {'guardian': 16000, 'mateo': 5600}   # hoja de personajes


def render(objetos, nombre, ancho, alto, cz, escala):
    import preview
    cam = preview.preparar(objetos, PALETA['gema_pulso'])
    bpy.data.objects['suelo_preview'].hide_render = True
    preview.disparar(cam, os.path.join(PREVIEWS, f'{nombre}_boceto_frente.png'), (0, -30, cz), (0, 0, cz), alto * escala,
                     (ancho * 2, alto * 2), 'VERTICAL', lejos=80)


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    common.limpiar_escena()
    arm, cuerpo, placas, nucleo, frags = boss_builder.construir_guardian(PALETA)
    stats.verificar_presupuesto('guardian', [cuerpo, *placas, nucleo], PRESUPUESTO['guardian'])
    ruta = os.path.join(MODELOS, 'guardian.glb')
    common.exportar_glb(ruta, [arm, cuerpo, *placas, nucleo, *frags])
    print(f'[guardian] {len(frags)} piezas sueltas | exportado ({os.path.getsize(ruta) / 1024:.1f} KB)')
    if '--preview' in args:
        for f in frags:
            f.hide_render = True
        render([cuerpo, *placas, nucleo], 'guardian', 400, 640, (602 - 320) * boss_builder.S_G, boss_builder.S_G)

    common.limpiar_escena()
    arm, cuerpo, cabeza = mateo_builder.construir_mateo(PALETA)
    stats.verificar_presupuesto('mateo', [cuerpo, cabeza], PRESUPUESTO['mateo'])
    ruta = os.path.join(MODELOS, 'mateo.glb')
    common.exportar_glb(ruta, [arm, cuerpo, cabeza])
    print(f'[mateo] formas de cara: {len(cabeza.data.shape_keys.key_blocks) - 1} | exportado ({os.path.getsize(ruta) / 1024:.1f} KB)')
    if '--preview' in args:
        render([cuerpo, cabeza], 'mateo', 200, 440, (432 - 220) * mateo_builder.S_M, mateo_builder.S_M)


main()
