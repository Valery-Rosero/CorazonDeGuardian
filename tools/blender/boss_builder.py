"""Guardián del Sol desde la hoja de personajes (tablero «Guardián del Sol»).

Lienzo de 400 × 640: el suelo en v=602 y el halo llega a v=10 → 592 unidades = 6 m. El Guardián
mira hacia -Y y el lado izquierdo del dibujo es su derecha (-X). Se exporta:
  - la armadura y la malla de piedra con pesos rígidos (runas y grietas en materiales propios);
  - las 4 placas del pecho y el núcleo como objetos aparte (se abren y laten por código);
  - las piezas sueltas guardian_frag_* para la secuencia de derrota.
"""
import math

from mathutils import Vector

from character_builder import solido
from common import (Constructor, colocar, crear_armadura, crear_malla, elipsoide, material_emisivo, material_toon,
                    prisma)
from enemy_builder import _plano_frontal, _tira, tono_piedra_personaje

S_G = 6.0 / 592.0


def G(u, v):
    return ((u - 200.0) * S_G, (602.0 - v) * S_G)


def lado(contorno, derecha=True):
    """El dibujo trae los dos lados; 'derecha' (su derecha) es el lado izquierdo del dibujo."""
    return [G(u, v) if derecha else G(400 - u, v) for u, v in contorno]


def runa_trazo(puntos, y, ancho=3.5, material=2):
    """Trazo de runa (polilínea del dibujo) como tiras planas en el plano y."""
    out = []
    for a, b in zip(puntos, puntos[1:]):
        out.append(_plano_frontal(_tira(G(*a), G(*b), ancho * S_G), y, 'azul_arcano', material))
    return out


def piezas_guardian():
    """(pieza, hueso, [(geo, color, material, matriz?)]). Materiales: 0 piedra, 1 oro (incrustaciones),
    2 runas (cambian de color por fase), 3 grietas (fase 3)."""
    P = []
    roca = tono_piedra_personaje()
    musgo = tono_piedra_personaje(musgo=True)
    # --- Cabeza: la máscara con los rasgos de Mateo
    mascara = [G(148, 120), G(158, 70), G(242, 70), G(252, 120), G(238, 178), G(162, 178)]
    y_cab = -0.25
    prof_cab = 0.55
    fr = y_cab - prof_cab
    partes = [(solido(mascara, prof_cab, y_cab), musgo, 0)]
    partes.append((solido([G(152, 96), G(248, 96), G(250, 108), G(150, 108)], 0.04, fr - 0.02, capas=((1, 1, 0), (0.98, 0.9, 1))),
                   'piedra_sombra', 0))
    for u in (180, 220):
        cx, cz = G(u, 124)
        partes.append((prisma(14, 14 * S_G, 0.06), 'piedra_oscura', 0, colocar((cx, fr - 0.005, cz), (90, 0, 0))))
        anillo = []
        for i in range(12):
            a0, a1 = math.tau * i / 12, math.tau * (i + 1) / 12
            anillo.append(_plano_frontal([(cx + math.cos(a) * r * S_G, cz + math.sin(a) * r * S_G)
                                          for a, r in ((a0, 15.5), (a1, 15.5), (a1, 12.5), (a0, 12.5))], fr - 0.04, 'piedra_sombra', 0))
        partes += anillo
        partes.append((prisma(10, 6.5 * S_G, 0.04), 'azul_arcano', 2, colocar((cx, fr - 0.045, cz), (90, 0, 0))))
    partes.append(_plano_frontal(_tira(G(194, 124), G(206, 124), 3 * S_G), fr - 0.04, 'piedra_sombra', 0))
    partes += runa_trazo([(200, 78), (206, 84), (200, 90), (194, 84), (200, 78)], fr - 0.01, 2.2)
    partes.append((solido([G(200, 130), G(208, 150), G(192, 150)], 0.08, fr - 0.05, capas=((1, 1, 0), (0.6, 0.6, 1))), roca, 0))
    barba = [G(164, 152), G(236, 152), G(230, 178), G(200, 192), G(170, 178)]
    partes.append((solido(barba, 0.18, fr + 0.05, capas=((1, 1, 0), (0.95, 0.95, 1))), 'piedra_sombra', 0))
    for u, v1 in ((178, 180), (189, 186), (200, 188), (211, 186), (222, 180)):
        partes.append(_plano_frontal(_tira(G(u, 156), G(u, v1), 2.2 * S_G), fr - 0.14, 'piedra_oscura', 0))
    partes.append(_plano_frontal(_tira(G(232, 76), G(222, 98), 3 * S_G) + [], fr - 0.012, 'flor_centro', 3))
    P.append(('cabeza', 'cabeza', partes))

    # --- Halo solar detrás de la cabeza
    hx, hz = G(200, 128)
    y_halo = 0.55
    partes = [(prisma(24, 80 * S_G, 0.12), 'piedra_sombra', 0, colocar((hx, y_halo, hz), (90, 0, 0))),
              (prisma(24, 66 * S_G, 0.14), 'piedra_oscura', 0, colocar((hx, y_halo - 0.01, hz), (90, 0, 0)))]
    for i in range(24):
        a0, a1 = math.tau * i / 24, math.tau * (i + 1) / 24
        partes.append(_plano_frontal([(hx + math.cos(a) * r * S_G, hz + math.sin(a) * r * S_G)
                                      for a, r in ((a0, 76), (a1, 76), (a1, 72), (a0, 72))], y_halo - 0.07, 'dorado_solar', 1))
    for tri, color in (([(200, 10), (187.8, 51), (212.2, 51)], 'dorado_solar'), ([(302.2, 69), (260.6, 78.9), (272.8, 100)], 'dorado_solar'),
                       ([(302.2, 187), (272.8, 156), (260.6, 177.1)], 'dorado_solar'), ([(97.8, 187), (139.4, 177.1), (127.2, 156)], 'dorado_solar'),
                       ([(97.8, 69), (127.2, 100), (139.4, 78.9)], 'dorado_solar'), ([(259, 25.8), (227.9, 55.2), (249.1, 67.4)], 'v_oro_sombra'),
                       ([(318, 128), (277, 115.8), (277, 140.2)], 'v_oro_sombra'), ([(82, 128), (123, 140.2), (123, 115.8)], 'v_oro_sombra'),
                       ([(141, 25.8), (150.9, 67.4), (172.1, 55.2)], 'v_oro_sombra')):
        partes.append((solido([G(u, v) for u, v in tri], 0.05, y_halo - 0.02, capas=((1, 1, 0), (0.85, 0.85, 1))), color, 1))
    P.append(('halo', 'cabeza', partes))

    # --- Torso con el hueco del núcleo, incrustaciones doradas y grietas
    torso = [G(128, 178), G(272, 178), G(294, 330), G(252, 388), G(148, 388), G(106, 330)]
    prof_t = 1.15
    frente_t = -prof_t
    partes = [(solido(torso, prof_t, 0.0), roca, 0)]
    cx, cz = G(200, 270)
    partes.append((prisma(16, 46 * S_G, 0.08), 'piedra_oscura', 0, colocar((cx, frente_t - 0.02, cz), (90, 0, 0))))
    for a, b in (((140, 200), (168, 232)), ((260, 200), (232, 232)), ((150, 316), (172, 300)), ((250, 316), (228, 300))):
        partes.append(_plano_frontal(_tira(G(*a), G(*b), 3 * S_G), frente_t - 0.01, 'dorado_solar', 1))
    for grieta in ([(150, 196), (166, 222), (156, 248), (162, 262)], [(252, 330), (238, 350), (246, 372)]):
        for a, b in zip(grieta, grieta[1:]):
            partes.append(_plano_frontal(_tira(G(*a), G(*b), 3 * S_G), frente_t - 0.015, 'flor_centro', 3))
    P.append(('torso', 'torso', partes))
    # Cinturón con el anillo dorado
    cint = [G(146, 384), G(254, 384), G(268, 428), G(132, 428)]
    partes = [(solido(cint, 0.95, 0.0), 'piedra_sombra', 0)]
    rx, rz = G(200, 406)
    for i in range(12):
        a0, a1 = math.tau * i / 12, math.tau * (i + 1) / 12
        partes.append(_plano_frontal([(rx + math.cos(a) * r * S_G, rz + math.sin(a) * r * S_G)
                                      for a, r in ((a0, 12.5), (a1, 12.5), (a1, 9.5), (a0, 9.5))], -0.95 - 0.01, 'dorado_solar', 1))
    P.append(('cinturon', 'cadera', partes))

    for nombre, der in (('der', True), ('izq', False)):
        L = lambda c: lado(c, der)  # noqa: E731
        hombro = L([(56, 186), (150, 168), (162, 246), (84, 268), (44, 232)])
        partes = [(solido(hombro, 0.95, 0.05), musgo, 0)]
        partes += runa_trazo([(70, 226), (100, 220), (130, 226)] if der else [(330, 226), (300, 220), (270, 226)], -0.95 + 0.05 - 0.01, 3)
        if der:
            for a, b in (((90, 206), (112, 228)), ((112, 228), (104, 250))):
                partes.append(_plano_frontal(_tira(G(*a), G(*b), 3 * S_G), -0.91, 'flor_centro', 3))
        P.append((f'hombro_{nombre}', f'hombro_{nombre}', partes))
        sup = L([(56, 236), (98, 252), (92, 364), (52, 352)])
        partes = [(solido(sup, 0.42, 0.0), roca, 0)]
        partes += runa_trazo([(66, 270), (80, 300), (70, 330)] if der else [(334, 270), (320, 300), (330, 330)], -0.43, 3.5)
        P.append((f'brazo_sup_{nombre}', f'brazo_sup_{nombre}', partes))
        ante = L([(36, 348), (104, 356), (112, 474), (30, 474)])
        partes = [(solido(ante, 0.55, -0.05), roca, 0)]
        zig = [(50, 372), (70, 394), (50, 416), (70, 438), (50, 460)] if der else [(350, 372), (330, 394), (350, 416), (330, 438), (350, 460)]
        partes += runa_trazo(zig, -0.6 - 0.01, 4)
        if der:
            for a, b in (((60, 380), (80, 400)), ((80, 400), (72, 430))):
                partes.append(_plano_frontal(_tira(G(*a), G(*b), 3 * S_G), -0.6 - 0.015, 'flor_centro', 3))
        P.append((f'antebrazo_{nombre}', f'antebrazo_{nombre}', partes))
        puno = L([(24, 468), (118, 468), (124, 526), (18, 526)])
        P.append((f'puno_{nombre}', f'antebrazo_{nombre}', [(solido(puno, 0.65, -0.08), roca, 0)]))
        muslo = L([(136, 426), (192, 426), (190, 493), (134, 493)])
        P.append((f'muslo_{nombre}', f'pierna_sup_{nombre}', [(solido(muslo, 0.55, 0.0), roca, 0)]))
        canilla = L([(134, 493), (190, 493), (188, 560), (132, 560)])
        partes = [(solido(canilla, 0.52, 0.0), roca, 0)]
        if der:
            for a, b in (((150, 450), (166, 480)), ((166, 480), (156, 510))):
                partes.append(_plano_frontal(_tira(G(*a), G(*b), 3 * S_G), -0.56, 'flor_centro', 3))
        P.append((f'canilla_{nombre}', f'pierna_inf_{nombre}', partes))
        pie = L([(122, 554), (196, 554), (200, 602), (116, 602)])
        P.append((f'pie_{nombre}', f'pierna_inf_{nombre}', [(solido(pie, 0.75, -0.2), roca, 0)]))
    return P


# Placas del pecho (cerradas): esquinas del dibujo y bisagra en el borde de fuera
PLACAS = [
    ('placa_1', [(158, 230), (198, 224), (198, 268), (154, 270)], 156),
    ('placa_2', [(202, 224), (242, 230), (246, 270), (202, 268)], 244),
    ('placa_3', [(154, 272), (198, 272), (198, 314), (160, 308)], 157),
    ('placa_4', [(202, 272), (246, 272), (240, 308), (202, 314)], 243),
]


def huesos_guardian():
    z = lambda v: G(0, v)[1]  # noqa: E731
    h = [('cadera', (0, 0, z(426)), (0, 0, z(384)), None),
         ('torso', (0, 0, z(426)), (0, 0, z(178)), 'cadera'),
         ('cabeza', (0, -0.15, z(178)), (0, -0.15, z(70)), 'torso')]
    for nombre, signo in (('der', -1), ('izq', 1)):
        x = lambda u: G(200 + signo * (200 - u), 0)[0]  # noqa: E731
        h.append((f'hombro_{nombre}', (x(120), 0, z(200)), (x(70), 0, z(200)), 'torso'))
        h.append((f'brazo_sup_{nombre}', (x(77), 0, z(244)), (x(72), 0, z(356)), f'hombro_{nombre}'))
        h.append((f'antebrazo_{nombre}', (x(72), 0, z(356)), (x(70), 0, z(500)), f'brazo_sup_{nombre}'))
        h.append((f'pierna_sup_{nombre}', (x(164), 0, z(426)), (x(162), 0, z(493)), 'cadera'))
        h.append((f'pierna_inf_{nombre}', (x(162), 0, z(493)), (x(160), 0, z(600)), f'pierna_sup_{nombre}'))
    return h


def construir_guardian(paleta):
    """Devuelve (armadura, cuerpo, [placas], núcleo, [fragmentos])."""
    arm = crear_armadura('guardian', huesos_guardian())
    arm['personaje'] = 'guardian'
    arm['altura_m'] = 6.0
    toon = material_toon('guardian_toon')
    oro = material_toon('guardian_oro')
    runa = material_emisivo('guardian_runa', paleta['azul_arcano'], 3.0)
    grieta = material_emisivo('guardian_grieta', paleta['flor_centro'], 3.0)
    mats = [toon, oro, runa, grieta]
    k = Constructor(paleta, semilla=31, variacion=0.03)
    fragmentos = []
    for nombre, hueso, partes in piezas_guardian():
        f = Constructor(paleta, semilla=hash(nombre) % 97, variacion=0.03)
        for parte in partes:
            geo, color, mat = parte[0], parte[1], parte[2]
            m = parte[3] if len(parte) > 3 else None
            k.agregar(geo, color, hueso, m, material=mat)
            if mat != 3:
                f.agregar(geo, color, 'escenario', m, material=mat)
        centro = sum(f.v, Vector()) / len(f.v)
        f.v = [v - centro for v in f.v]
        frag = crear_malla(f'guardian_frag_{nombre}', f, mats[:3], grupos=False)
        frag.location = centro
        fragmentos.append(frag)
    cuerpo = crear_malla('guardian_cuerpo', k, mats, arm)
    # Placas: el origen es la bisagra (borde de fuera, a media altura de la placa)
    placas = []
    frente = -1.15 - 0.09
    for nombre, contorno, u_bisagra in PLACAS:
        c = Constructor(paleta, semilla=len(nombre) * 7, variacion=0.03)
        pts = [G(u, v) for u, v in contorno]
        bx = G(u_bisagra, 0)[0]
        bz = sum(p[1] for p in pts) / len(pts)
        local = [(x - bx, z - bz) for x, z in pts]
        c.agregar(solido(local, 0.06, 0.0, capas=((1, 1, 0), (0.94, 0.94, 1))), tono_piedra_personaje(), 'escenario')
        # Filo dorado por donde se escapa la luz entre las placas
        c.agregar(_plano_frontal(_tira(local[1], local[2], 1.6 * S_G), -0.065, 'oro_brillante', 0)[0], 'oro_brillante', 'escenario', material=1)
        obj = crear_malla(f'guardian_{nombre}', c, [toon, oro], grupos=False)
        obj.location = (bx, frente, bz)
        obj['bisagra'] = -1 if bx < 0 else 1
        placas.append(obj)
    # Núcleo: esfera dorada medio hundida en el pecho (el shader de remolino lo pone el juego)
    n = Constructor(paleta, semilla=5, variacion=0.0)
    n.agregar(elipsoide(36 * S_G, 36 * S_G, 36 * S_G, 16, 10), 'oro_brillante', 'escenario')
    nucleo = crear_malla('guardian_nucleo', n, [material_emisivo('guardian_nucleo', paleta['gema_pulso'], 3.0)], grupos=False)
    cx, cz = G(200, 270)
    # Hundido en el pecho: asoma apenas por delante, así las placas cerradas lo tapan
    nucleo.location = (cx, -1.15 + 0.30, cz)
    return arm, cuerpo, placas, nucleo, fragmentos
