"""Zona 3: La cámara del sol (secciones 7, 8.3 y 9.6), construida desde el tablero «Cámara del sol».

Sigue a la antesala del santuario: la puerta de la arena está en y = -674 y el suelo en z = -3.
Arena circular de 30 m de combate bajo una cúpula de 18 m con óculo, tres pilares solares, doce
columnas, anillos de runas en el suelo y el trono del Guardián al fondo.

Uso: blender --background --factory-startup --python-exit-code 1 --python tools/blender/build_zona_3_camara.py
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
import stats  # noqa: E402
import interior_builder as ib  # noqa: E402
import temple_builder  # noqa: E402
from common import (Constructor, caja_biselada, caja_invisible, colocar, objeto_suelto, orientar_hacia, prisma,  # noqa: E402
                    segmento, vacio)
from palette import PALETA  # noqa: E402
from rock_builder import tono_piedra  # noqa: E402

RAIZ = os.path.abspath(os.path.join(DIR, '..', '..'))
SALIDA = os.path.join(RAIZ, 'public', 'models', 'zona_3_camara.glb')
PRESUPUESTO = 50000

# --- Medidas del tablero «Cámara del sol» ---
SUELO = -3.0
PASILLO = dict(x=2.5, y0=-674.4, y1=-680.0, techo=6.5)
CENTRO = (0.0, -697.0)
RADIO = 15.0
MURO = 18.0
ALTO_MURO = 8.0
CUPULA = 18.0
OCULO = 3.0
PILARES = [0, 120, 240]
R_PILAR = 13.0
COLUMNAS = 12
R_COLUMNA = 16.5
ANILLOS = [4.0, 8.0, 12.0]
TRONO = (0.0, -709.0)
SEGMENTOS = 24


def materiales():
    return {
        'toon': common.material_toon('camara_toon'),
        'oro': common.material_emisivo('oro_brillante_emisivo', PALETA['oro_brillante'], 2.5),
        'rayo': common.material_toon('rayo_luz'),
        'disco': common.material_emisivo('checkpoint_disco', PALETA['oro_brillante'], 0.2),
        'anillos': [common.material_emisivo(f'anillo_runas_{i + 1}', PALETA['azul_arcano'], 0.3) for i in range(3)],
        'pilar': common.material_emisivo('pilar_solar_cristal', PALETA['oro_brillante'], 0.6),
    }


MAT = {'toon': 0, 'oro': 1, 'rayo': 2}


def P(r, ang, z=SUELO):
    return (CENTRO[0] + math.cos(ang) * r, CENTRO[1] + math.sin(ang) * r, z)


def pasillo(k):
    x, y0, y1, t = PASILLO['x'], PASILLO['y0'], PASILLO['y1'], PASILLO['techo']
    k.agregar(caja_biselada(2 * x + 2, y0 - y1 + 3, 0.5, 0.05), 'arenisca_sombra', 'escenario',
              colocar((0, (y0 + y1 - 3) / 2, SUELO - 0.25)))
    caja_invisible('col_box_suelo_pasillo_arena', (-x - 1, y1 - 3, SUELO - 0.5), (x + 1, y0, SUELO))
    for sx in (-1, 1):
        k.agregar(caja_biselada(1.0, y0 - y1 + 3, t, 0.08), ib.tono_arenisca, 'escenario', colocar((sx * (x + 0.5), (y0 + y1 - 3) / 2, SUELO + t / 2)))
        caja_invisible(f'col_box_pasillo_arena_{"e" if sx > 0 else "o"}', (sx * x if sx > 0 else -x - 1, y1 - 3, SUELO),
                       (x + 1 if sx > 0 else -x, y0, SUELO + t))
        # Franjas doradas que llevan hacia la luz de la arena
        for i in range(3):
            yy = y0 - 1.2 - i * 1.8
            k.agregar(caja_biselada(0.06, 1.2, 0.16, 0.02), 'oro_brillante', 'escenario', colocar((sx * (x - 0.03), yy, SUELO + 2.4)),
                      material=MAT['oro'])
    k.agregar(caja_biselada(2 * x + 2, y0 - y1 + 3, 0.6, 0.05), 'arenisca_oscura', 'escenario', colocar((0, (y0 + y1 - 3) / 2, SUELO + t + 0.3)))


def arena(k, m, rnd):
    cx, cy = CENTRO
    # Suelo: disco facetado con losas en anillos
    verts = [Vector((cx, cy, SUELO))] + [Vector(P(MURO, math.tau * i / SEGMENTOS)) for i in range(SEGMENTOS)]
    caras = [(0, 1 + i, 1 + (i + 1) % SEGMENTOS) for i in range(SEGMENTOS)]
    k.agregar((verts, orientar_hacia(verts, caras, (0, 0, 1))), ['arenisca' if i % 2 else 'arenisca_sombra' for i in range(SEGMENTOS)], 'escenario')
    caja_invisible('col_box_suelo_arena', (cx - MURO, cy - MURO, SUELO - 0.6), (cx + MURO, cy + MURO, SUELO))
    # Anillos de runas (cada uno con su material: se encienden por fase)
    for n, r in enumerate(ANILLOS):
        a = Constructor(PALETA, semilla=70 + n, variacion=0.0)
        segs = int(12 + r * 3)
        for i in range(segs):
            if i % 3 == 2:
                continue
            a0, a1 = math.tau * i / segs, math.tau * (i + 0.8) / segs
            q = [Vector(P(r + 0.22, a0, SUELO + 0.02)), Vector(P(r + 0.22, a1, SUELO + 0.02)),
                 Vector(P(r - 0.22, a1, SUELO + 0.02)), Vector(P(r - 0.22, a0, SUELO + 0.02))]
            q = [v - Vector((cx, cy, 0)) for v in q]
            a.agregar((q, orientar_hacia(q, [(0, 1, 2, 3)], (0, 0, 1))), 'cristal_runa', 'escenario')
        objeto_suelto(f'anillo_runas_{n + 1}', a, [m['anillos'][n]], (cx, cy, 0), {'anillo': n + 1})
    # Muro circular con canales de luz dorada (con el hueco de la entrada al norte)
    for i in range(SEGMENTOS):
        a0, a1 = math.tau * i / SEGMENTOS, math.tau * (i + 1) / SEGMENTOS
        am = (a0 + a1) / 2
        if abs(math.degrees(am) - 90) < 9:
            continue
        x0, y0, _ = P(MURO + 0.5, am)
        ancho = 2 * (MURO + 0.5) * math.sin(math.pi / SEGMENTOS) + 0.1
        giro = math.degrees(am) + 90
        k.agregar(caja_biselada(ancho, 1.0, ALTO_MURO, 0.1), ib.tono_arenisca, 'escenario', colocar((x0, y0, SUELO + ALTO_MURO / 2), (0, 0, giro)))
        caja_invisible(f'col_box_muro_arena_{i}', (x0 - ancho / 2, y0 - 0.5, SUELO), (x0 + ancho / 2, y0 + 0.5, SUELO + ALTO_MURO),
                       rot=(0, 0, giro))
        if i % 3 == 0:
            xi, yi, _ = P(MURO - 0.02, am)
            k.agregar(caja_biselada(0.3, 0.06, ALTO_MURO - 2, 0.02), 'oro_brillante', 'escenario',
                      colocar((xi, yi, SUELO + ALTO_MURO / 2), (0, 0, giro)), material=MAT['oro'])
    # Cúpula con el óculo: anillos de caras que miran hacia dentro
    pisos = 5
    for j in range(pisos):
        t0, t1 = j / pisos, (j + 1) / pisos
        r0 = MURO + 0.5 - (MURO + 0.5 - OCULO) * math.sin(t0 * math.pi / 2)
        r1 = MURO + 0.5 - (MURO + 0.5 - OCULO) * math.sin(t1 * math.pi / 2)
        z0 = SUELO + ALTO_MURO + (CUPULA - ALTO_MURO) * (1 - math.cos(t0 * math.pi / 2)) ** 0.8
        z1 = SUELO + ALTO_MURO + (CUPULA - ALTO_MURO) * (1 - math.cos(t1 * math.pi / 2)) ** 0.8
        for i in range(SEGMENTOS):
            a0, a1 = math.tau * i / SEGMENTOS, math.tau * (i + 1) / SEGMENTOS
            q = [Vector(P(r0, a0, z0)), Vector(P(r0, a1, z0)), Vector(P(r1, a1, z1)), Vector(P(r1, a0, z1))]
            centro = Vector((cx, cy, SUELO + 4))
            caras = [(0, 1, 2, 3)]
            nc = (q[0] + q[2]) / 2
            k.agregar((q, orientar_hacia(q, caras, centro - nc)), 'arenisca_sombra' if (i + j) % 2 else 'arenisca_oscura', 'escenario')
    # Haz del óculo sobre el trono
    tx, ty = TRONO
    mm, largo = segmento(Vector((cx, cy + 0.5, SUELO + CUPULA)), Vector((tx, ty + 1.0, SUELO + 0.1)))
    k.agregar(prisma(10, 1.6, largo, radio_sup=2.4), 'oro_brillante', 'escenario', mm, material=MAT['rayo'])
    # Columnas de referencia detrás del borde del combate
    for i in range(COLUMNAS):
        a = math.tau * i / COLUMNAS + 0.26
        if i % 3 == 1:
            continue   # aquí va un guardián colosal (ornamentar)
        x, y, _ = P(R_COLUMNA, a)
        k.agregar(caja_biselada(1.6, 1.6, 0.01, 0.0), 'arenisca_sombra', 'escenario', colocar((x, y, SUELO)))
        ib.columna_tallada(k, x, y, ALTO_MURO, 0.6)
        caja_invisible(f'col_cyl_columna_arena_{i}', (x - 0.7, y - 0.7, SUELO), (x + 0.7, y + 0.7, SUELO + ALTO_MURO))
    # Trono
    k.agregar(caja_biselada(6, 3.4, 1.6, 0.12), ib.tono_arenisca, 'escenario', colocar((tx, ty - 0.5, SUELO + 0.8)))
    k.agregar(caja_biselada(6, 0.8, 4.5, 0.12), ib.tono_arenisca, 'escenario', colocar((tx, ty - 2.2 + 0.4, SUELO + 2.25)))
    for sx in (-1, 1):
        k.agregar(caja_biselada(0.8, 3.2, 2.6, 0.08), ib.tono_arenisca, 'escenario', colocar((tx + sx * 2.8, ty - 0.5, SUELO + 1.3)))
    temple_builder.glifo_sol(k, colocar((tx, ty - 1.79 + 0.4 + 0.42, SUELO + 3.6), (0, 0, 180)), 0.6, 'dorado_solar')
    caja_invisible('col_box_trono', (tx - 3, ty - 2.2, SUELO), (tx + 3, ty + 1.2, SUELO + 1.6))
    caja_invisible('col_box_trono_respaldo', (tx - 3, ty - 2.2, SUELO), (tx + 3, ty - 1.4, SUELO + 4.5))
    caja_invisible('col_box_cupula', (cx - MURO, cy - MURO, SUELO + CUPULA - 0.5), (cx + MURO, cy + MURO, SUELO + CUPULA + 0.5))


def ornamentar(k, rnd):
    """Detalle de la arena según la hoja «Interiores del templo»: sobrecogimiento."""
    cx, cy = CENTRO
    # Guardianes colosales de rodillas mirando al centro: los que se volvieron piedra antes que Mateo
    for i in range(COLUMNAS):
        if i % 3 != 1:
            continue
        a = math.tau * i / COLUMNAS + 0.26
        x, y, _ = P(16.0, a)
        ib.guardian_de_rodillas(k, x, y, math.degrees(a) - 90, alto=9.0, z=SUELO)
        caja_invisible(f'col_box_coloso_{i}', (x - 1.9, y - 1.9, SUELO), (x + 1.9, y + 1.9, SUELO + 6.0), rot=(0, 0, math.degrees(a) - 90))
    # Friso de soles y cornisa escalonada en cada tramo del muro (por dentro)
    for i in range(SEGMENTOS):
        a0, a1 = math.tau * i / SEGMENTOS, math.tau * (i + 1) / SEGMENTOS
        am = (a0 + a1) / 2
        if abs(math.degrees(am) - 90) < 9:
            continue
        pa, pb = P(MURO - 0.02, a0)[:2], P(MURO - 0.02, a1)[:2]
        n = (-math.cos(am), -math.sin(am))
        ib.friso_soles(k, pa, pb, n, SUELO + 3.2, paso=2.2)
        ib.cornisa(k, pa, pb, n, SUELO + ALTO_MURO - 0.66)
        ib.banda(k, pa, pb, n, SUELO, SUELO + 0.5, 0.14, 'arenisca_oscura')
    # Nervios dorados de la cúpula, del muro al óculo
    for i in range(8):
        a = math.tau * i / 8 + math.pi / 8
        prev = None
        for j in range(6):
            t = j / 5
            r = MURO + 0.3 - (MURO + 0.5 - OCULO) * math.sin(t * math.pi / 2)
            z = SUELO + ALTO_MURO + (CUPULA - ALTO_MURO) * (1 - math.cos(t * math.pi / 2)) ** 0.8 - 0.25
            q = Vector(P(r - 0.15, a, z))
            if prev is not None:
                mm, largo = segmento(prev, q)
                k.agregar(prisma(4, 0.18, largo, giro=45), 'oro_tallado', 'escenario', mm)
            prev = q
    # El gran sol tallado en el muro, detrás del trono
    sx, sy, _ = P(MURO - 0.3, math.radians(270))
    k.agregar(prisma(16, 2.3, 0.3), 'oro_tallado', 'escenario', colocar((sx, sy, SUELO + 6.3), (90, 0, 0)))
    k.agregar(prisma(16, 1.4, 0.36), 'oro_brillante', 'escenario', colocar((sx, sy + 0.05, SUELO + 6.3), (90, 0, 0)), material=MAT['oro'])
    for i in range(12):
        t = i * math.tau / 12
        k.agregar(caja_biselada(0.35, 0.25, 1.4, 0.03), 'oro_tallado', 'escenario',
                  colocar((sx + math.cos(t) * 3.1, sy + 0.05, SUELO + 6.3 + math.sin(t) * 3.1), (0, -math.degrees(t) + 90, 0)))
    # Braseros alrededor del muro (fuego con partículas; las luces las reparte el juego)
    for j, ang in enumerate((60, 120, 200, 340)):
        x, y, _ = P(14.6, math.radians(ang))
        pos = ib.brasero(k, x, y, SUELO, 1.2)
        vacio(f'emit_fuego_arena_{j}', pos, props={'tipo': 'fuego'})
        caja_invisible(f'col_cyl_brasero_arena_{j}', (x - 0.45, y - 0.45, SUELO), (x + 0.45, y + 0.45, SUELO + 1.5))
    # Anillo de losas claras que marca el borde del combate
    for i in range(SEGMENTOS * 2):
        a = math.tau * i / (SEGMENTOS * 2)
        x, y, _ = P(15.0, a)
        k.agregar(caja_biselada(2.2, 0.5, 0.03, 0.01), 'arenisca_luz', 'escenario', colocar((x, y, SUELO + 0.012), (0, 0, math.degrees(a) + 90)))
    ib.escombros(k, *P(11.5, math.radians(160))[:2], rnd, 6, 1.0)
    ib.escombros(k, *P(12.0, math.radians(20))[:2], rnd, 5, 0.9)
    # El pasillo de entrada: pilastras y friso hacia la luz
    for sx in (-1, 1):
        a, b = (sx * PASILLO['x'], PASILLO['y0']), (sx * PASILLO['x'], PASILLO['y1'] - 2.5)
        ib.friso_soles(k, a, b, (-sx, 0.0), SUELO + 3.6, paso=1.6)
        for yy in (PASILLO['y0'] - 0.6, PASILLO['y1'] - 1.8):
            ib.pilastra(k, sx * PASILLO['x'], yy, (-sx, 0.0), PASILLO['techo'], 0.6)


def pilares(m):
    """Pilares solares: se activan con E y lanzan su rayo al pecho del Guardián (sección 7)."""
    for n, a in enumerate(PILARES, start=1):
        x, y, _ = P(R_PILAR, math.radians(a))
        p = Constructor(PALETA, semilla=80 + n, variacion=0.03)
        p.agregar(caja_biselada(1.5, 1.5, 0.4, 0.06), ib.tono_arenisca, 'escenario', colocar((0, 0, 0.2)))
        p.agregar(caja_biselada(0.9, 0.9, 3.0, 0.06, conico=0.75), ib.tono_arenisca, 'escenario', colocar((0, 0, 1.9)))
        p.agregar(caja_biselada(1.2, 1.2, 0.3, 0.06), 'arenisca_luz', 'escenario', colocar((0, 0, 3.55)))
        from common import casco
        pts = [(0, 0, 3.75), (0, 0, 4.85), (0.32, 0, 4.3), (-0.32, 0, 4.3), (0, 0.32, 4.3), (0, -0.32, 4.3)]
        p.agregar(casco(pts), 'oro_brillante', 'escenario', material=1)
        objeto_suelto(f'pilar_solar_{n}', p, [m['toon'], m['pilar']], (x, y, SUELO),
                      {'interactuable': 'pilar_solar', 'pilar': n, 'etiqueta': 'Encender el pilar solar'})
        caja_invisible(f'col_cyl_pilar_solar_{n}', (x - 0.6, y - 0.6, SUELO), (x + 0.6, y + 0.6, SUELO + 3.8))


def triggers_y_puntos():
    cx, cy = CENTRO
    caja_invisible('trg_box_zona_c_pasillo', (-2.5, -674.4, SUELO - 1), (2.5, -680, SUELO + 5), props={'zona': 'La cámara del sol — Umbral'})
    caja_invisible('trg_box_zona_c_arena', (cx - MURO, cy - MURO, SUELO - 1), (cx + MURO, -680, SUELO + 12),
                   props={'zona': 'La cámara del sol — Arena'})
    caja_invisible('trg_box_cam_c_arena', (cx - MURO, cy - MURO, SUELO - 1), (cx + MURO, -681, SUELO + 12), props={'perfil_camara': 'jefe'})
    # Al cruzar el umbral empieza el despertar del Guardián (una sola vez)
    caja_invisible('trg_box_despertar', (-2.5, -682, SUELO - 1), (2.5, -684, SUELO + 4), props={'evento': 'despertar'})
    vacio('spawn_arena', (0, -684.5, SUELO))
    vacio('spawn_debug_6', (0, -686, SUELO))
    vacio('spawn_guardian', (TRONO[0], TRONO[1] + 0.4, SUELO), rot_z=180)
    vacio('spawn_escape', (0, -690, SUELO), rot_z=180)
    vacio('hint_guardian', (TRONO[0], TRONO[1], SUELO + 5))
    vacio('centro_arena', (cx, cy, SUELO), props={'radio': RADIO})
    # Luces de la arena (grupo 3): el óculo y dos braseros en la entrada
    vacio('luz_oculo', (TRONO[0], TRONO[1] + 2, SUELO + 6), props={'color': PALETA['oro_brillante'], 'intensidad': 9.0,
                                                                  'distancia': 22.0, 'grupo': 3})
    for sx in (-1, 1):
        x, y = sx * 4.5, -684.5
        vacio(f'luz_brasero_{"e" if sx > 0 else "o"}', (x, y, SUELO + 2.2),
              props={'color': PALETA['fuego'], 'intensidad': 5.0, 'distancia': 14.0, 'parpadeo': 1, 'grupo': 3})
        vacio(f'emit_fuego_c{"e" if sx > 0 else "o"}', (x, y, SUELO + 1.6), props={'tipo': 'fuego'})
    vacio('emit_polvo_arena', (cx, cy, SUELO + 4), props={'tipo': 'polen', 'radio': 14.0})
    # Invocación de la fase 3: dos espectros a los lados de la arena
    for n, (x, y) in enumerate(((-9.0, cy + 4.0), (9.0, cy - 4.0)), start=4):
        vacio(f'spawn_espectro_{n}', (x, y, SUELO), props={'enemigo': 'espectro', 'aparece': 'invocacion'})


def braseros(k):
    for sx in (-1, 1):
        x, y = sx * 4.5, -684.5
        k.agregar(prisma(8, 0.35, 1.2, radio_sup=0.25), 'arenisca_sombra', 'escenario', colocar((x, y, SUELO + 0.6)))
        k.agregar(prisma(8, 0.4, 0.3, radio_sup=0.55), 'arenisca_sombra', 'escenario', colocar((x, y, SUELO + 1.35)))
        caja_invisible(f'col_cyl_brasero_{"e" if sx > 0 else "o"}', (x - 0.5, y - 0.5, SUELO), (x + 0.5, y + 0.5, SUELO + 1.5))


def main():
    common.limpiar_escena()
    rnd = random.Random(2028)
    m = materiales()
    k = Constructor(PALETA, semilla=13, variacion=0.04)
    pasillo(k)
    arena(k, m, rnd)
    braseros(k)
    ornamentar(k, random.Random(5151))
    pilares(m)
    triggers_y_puntos()
    principal = common.crear_malla('camara_escenario', k, [m['toon'], m['oro'], m['rayo']], grupos=False)
    sueltos = [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(('col_', 'trg_'))]
    stats.verificar_presupuesto('zona_3_camara', sueltos, PRESUPUESTO)
    print(f'[zona_3] malla principal: {stats.contar_triangulos(principal)} tri')
    common.exportar_glb(SALIDA, list(bpy.context.scene.objects))
    print(f'[zona_3] exportado {SALIDA} ({os.path.getsize(SALIDA) / 1024:.1f} KB)')
    if '--preview' in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []):
        planta()


def planta():
    """Vista desde arriba con el encuadre del plano del tablero (13 px/m), cortada a 6 m sobre el suelo."""
    import preview
    for o in bpy.context.scene.objects:
        if o.name.startswith(('col_', 'trg_')):
            o.hide_render = True
    cam = preview.preparar([o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.hide_render], PALETA['cristal_runa'])
    bpy.data.objects['suelo_preview'].hide_render = True
    cam.location = ((260 - 250) / 13, -674 - (299.5 - 30) / 13, 40)
    cam.rotation_euler = (0, 0, 0)
    cam.data.type = 'ORTHO'
    cam.data.sensor_fit = 'HORIZONTAL'
    cam.data.ortho_scale = 520 / 13
    cam.data.clip_start = 40 - (SUELO + 6)
    cam.data.clip_end = 80
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1040, 1198
    sc.render.filepath = os.path.join(RAIZ, 'docs', 'previews', 'camara_planta.png')
    bpy.ops.render.render(write_still=True)


main()
