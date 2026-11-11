"""Genera el centinela de piedra y el espectro ancestral y los exporta a public/models/enemigos.glb.

Uso (desde la raíz del proyecto):
  blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_enemigos.py
  blender ... --python tools/blender/build_enemigos.py -- --preview     (además renderiza docs/previews/)
"""
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

import bpy  # noqa: E402

import common  # noqa: E402
import enemy_builder  # noqa: E402
import stats  # noqa: E402
from palette import PALETA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'models', 'enemigos.glb')
PREVIEWS = os.path.join(RAIZ, 'docs', 'previews')
PRESUPUESTO = {'centinela': 2500, 'espectro': 1800}   # hoja de personajes


def renders(centinela, espectro):
    import preview
    cam = preview.preparar([centinela, espectro], PALETA['azul_arcano'])
    for o in bpy.context.scene.objects:
        if o.type == 'MESH' and o.name.startswith(('centinela_frag', 'espectro_mascara')):
            o.hide_render = True
    # Encuadre del boceto del centinela (viewBox 0 -110 300 510)
    espectro.hide_render = True
    zc = (390 - 145) * enemy_builder.S_C
    preview.disparar(cam, os.path.join(PREVIEWS, 'centinela_boceto_frente.png'), (0, -8, zc), (0, 0, zc),
                     510 * enemy_builder.S_C, (600, 1020), 'VERTICAL')
    preview.disparar(cam, os.path.join(PREVIEWS, 'centinela_tres_cuartos.png'), (-4.5, -6, 2.6), (0, 0, 1.15), 2.8, (700, 800))
    espectro.hide_render = False
    centinela.hide_render = True
    zc = (450 - 230) * enemy_builder.S_E
    preview.disparar(cam, os.path.join(PREVIEWS, 'espectro_boceto_frente.png'), (0, -8, zc), (0, 0, zc),
                     460 * enemy_builder.S_E, (520, 920), 'VERTICAL')
    preview.disparar(cam, os.path.join(PREVIEWS, 'espectro_tres_cuartos.png'), (-4, -6, 2.4), (0, 0, 1.4), 2.6, (700, 800))


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    common.limpiar_escena()
    arm_c, centinela, fragmentos = enemy_builder.construir_centinela(PALETA)
    stats.verificar_presupuesto('centinela', [centinela], PRESUPUESTO['centinela'])
    arm_e, espectro, mascara = enemy_builder.construir_espectro(PALETA)
    stats.verificar_presupuesto('espectro', [espectro], PRESUPUESTO['espectro'])
    # Las piezas sueltas quedan lejos del origen en el .glb: el juego las clona al morir un enemigo
    common.exportar_glb(SALIDA, [arm_c, centinela, *fragmentos, arm_e, espectro, mascara])
    print(f'[enemigos] {len(fragmentos)} fragmentos | exportado {SALIDA} ({os.path.getsize(SALIDA) / 1024:.1f} KB)')
    if '--preview' in args:
        renders(centinela, espectro)


main()
