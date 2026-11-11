"""Enemigos construidos desde la hoja de personajes (tableros «Centinela de piedra» y «Espectro ancestral»).

Igual que Victoria: cada pieza usa las coordenadas del dibujo de frente convertidas a metros; la
profundidad, que el dibujo no define, se añade con volúmenes redondeados. El enemigo mira hacia -Y y
el lado izquierdo del dibujo es su derecha (-X).

Cada enemigo se exporta como:
  - una armadura y una malla con pesos rígidos (1 hueso por vértice), que anima el código del juego;
  - sus piezas sueltas (centinela_frag_*, espectro_mascara), que se usan al morir como cuerpos físicos.
"""
import math

from mathutils import Vector

from character_builder import solido
from common import (Constructor, colocar, crear_armadura, crear_malla, material_emisivo, material_toon,
                    orientar_hacia, orientar_hacia_afuera, prisma)

# ---------------------------------------------------------------------------
# Centinela de piedra: lienzo 300 × 510 (viewBox 0 -110 300 510); suelo en v=390, tope de la cabeza en
# v=78 → 312 unidades = 2,30 m
# ---------------------------------------------------------------------------

S_C = 2.30 / 312.0


def C(u, v):
    return ((u - 150.0) * S_C, (390.0 - v) * S_C)


def tono_piedra_personaje(musgo=False):
    """Como en el dibujo: el lado izquierdo (su derecha, -X) claro, el centro medio y el otro lado oscuro;
    arriba, musgo en la cabeza y los hombros."""
    def fn(_c, n):
        if musgo and n.z > 0.55:
            return 'musgo' if n.z > 0.8 else 'musgo_oscuro'
        if n.z < -0.55:
            return 'piedra_oscura'
        if n.x < -0.35:
            return 'piedra_luz'
        if n.x > 0.35:
            return 'piedra_sombra'
        return 'piedra'
    return fn


def _plano_frontal(contorno, y, color='azul_arcano', material=0):
    """Polígono plano (lista de (x, z)) en el plano y, mirando hacia -Y: runas e incrustaciones.
    Devuelve (geo, color, material)."""
    verts = [Vector((x, y, z)) for x, z in contorno]
    return (verts, orientar_hacia(verts, [tuple(range(len(verts)))], (0, -1, 0))), color, material


def _tira(p0, p1, ancho):
    """Tira plana de 'ancho' entre dos puntos (x, z) en el plano y (trazos de runas)."""
    (x0, z0), (x1, z1) = p0, p1
    dx, dz = x1 - x0, z1 - z0
    l = math.hypot(dx, dz) or 1
    nx, nz = -dz / l * ancho / 2, dx / l * ancho / 2
    return [(x0 + nx, z0 + nz), (x1 + nx, z1 + nz), (x1 - nx, z1 - nz), (x0 - nx, z0 - nz)]


def piezas_centinela():
    """Lista de (pieza, hueso, [(geo, color, material)]). Las piezas son también los fragmentos."""
    P = []
    lado_der = lambda c: [C(u, v) for u, v in c]  # noqa: E731  (lado izquierdo del dibujo = su derecha)
    lado_izq = lambda c: [C(300 - u, v) for u, v in c]  # noqa: E731

    # Cabeza: pequeña y hundida, cinta oscura en la frente y un solo ojo
    cab = [C(116, 124), C(124, 78), C(176, 78), C(184, 124)]
    y_cab = -0.12
    partes = [(solido(cab, 0.22, y_cab), tono_piedra_personaje(musgo=True), 0)]
    frente = y_cab - 0.22
    ceja = [C(121, 90), C(179, 90), C(181, 98), C(119, 98)]
    partes.append((solido(ceja, 0.035, frente - 0.01, capas=((1, 1, 0), (0.97, 0.9, 1.0))), 'piedra_sombra', 0))
    ox, oz = C(150, 110)
    partes.append((prisma(10, 8.5 * S_C, 0.03), 'oro_brillante', 1, colocar((ox, frente - 0.012, oz), (90, 0, 0))))
    P.append(('cabeza', 'cabeza', partes))

    # Torso: barril ancho con el cinturón de runas y el círculo del pecho
    torso = [C(88, 118), C(212, 118), C(232, 228), C(204, 292), C(96, 292), C(68, 228)]
    partes = [(solido(torso, 0.42, 0.02), tono_piedra_personaje(), 0)]
    cint = [C(80, 200), C(220, 200), C(224, 214), C(76, 214)]
    partes.append((solido(cint, 0.45, 0.02, capas=((1, 1, 0), (0.99, 0.9, 0.6), (0.92, 0.8, 1.0))), 'piedra_oscura', 0))
    y_cint = 0.02 - 0.45 - 0.006
    for u in (100, 125, 150, 175, 200):
        partes.append(_plano_frontal([C(u, 203), C(u + 6, 207), C(u, 211), C(u - 6, 207)], y_cint))
    y_pecho = 0.02 - 0.42 - 0.004
    cx, cz = C(150, 158)
    anillo = []
    for i in range(10):
        a0, a1 = math.tau * i / 10, math.tau * (i + 1) / 10
        anillo.append(_plano_frontal([(cx + math.cos(a) * r * S_C, cz + math.sin(a) * r * S_C)
                                      for a, r in ((a0, 17.2), (a1, 17.2), (a1, 14.8), (a0, 14.8))], y_pecho))
    partes += anillo
    P.append(('torso', 'torso', partes))

    for nombre, lado in (('der', lado_der), ('izq', lado_izq)):
        hombro = lado([(36, 108), (112, 98), (122, 168), (62, 192), (28, 160)])
        P.append((f'hombro_{nombre}', f'hombro_{nombre}', [(solido(hombro, 0.45, 0.03), tono_piedra_personaje(musgo=True), 0)]))
        sup = lado([(30, 160), (72, 172), (64, 262), (26, 252)])
        inf = lado([(16, 250), (74, 260), (78, 340), (12, 338)])
        partes = [(solido(sup, 0.17, -0.02), tono_piedra_personaje(), 0), (solido(inf, 0.21, -0.02), tono_piedra_personaje(), 0)]
        zig = lado([(28, 272), (42, 290), (28, 308), (42, 326)])
        for a, b in zip(zig, zig[1:]):
            partes.append(_plano_frontal(_tira(a, b, 3 * S_C), -0.02 - 0.21 - 0.004))
        P.append((f'brazo_{nombre}', f'brazo_{nombre}', partes))
        puno = lado([(6, 334), (82, 334), (86, 378), (2, 378)])
        P.append((f'puno_{nombre}', f'brazo_{nombre}', [(solido(puno, 0.27, -0.03), tono_piedra_personaje(), 0)]))
        pierna = lado([(106, 286), (146, 286), (143, 358), (103, 358)])
        P.append((f'pierna_{nombre}', f'pierna_{nombre}', [(solido(pierna, 0.2, 0.0), tono_piedra_personaje(), 0)]))
        pie = lado([(96, 352), (150, 352), (154, 388), (92, 388)])
        P.append((f'pie_{nombre}', f'pierna_{nombre}', [(solido(pie, 0.3, -0.08), tono_piedra_personaje(), 0)]))
    return P


def huesos_centinela():
    def b(n, cabeza, cola, padre=None):
        return (n, cabeza, cola, padre)

    cad = C(150, 288)[1]
    h = [b('cadera', (0, 0, cad), (0, 0, cad + 0.2)),
         b('torso', (0, 0, cad), (0, 0, C(0, 130)[1]), 'cadera'),
         b('cabeza', (0, -0.1, C(0, 124)[1]), (0, -0.1, C(0, 78)[1]), 'torso')]
    for nombre, signo in (('der', -1), ('izq', 1)):
        hx = C(150 + signo * 75, 0)[0]
        bx = C(150 + signo * 110, 0)[0]
        z_h = C(0, 140)[1]
        h.append(b(f'hombro_{nombre}', (hx, 0, z_h), (hx + signo * 0.15, 0, z_h), 'torso'))
        h.append(b(f'brazo_{nombre}', (bx, 0, z_h), (bx, 0, C(0, 356)[1]), f'hombro_{nombre}'))
        px = C(150 + signo * 24, 0)[0]
        h.append(b(f'pierna_{nombre}', (px, 0, C(0, 286)[1]), (px, 0, C(0, 388)[1]), 'cadera'))
    return h


def construir_centinela(paleta):
    """Devuelve (armadura, malla, [fragmentos])."""
    arm = crear_armadura('centinela', huesos_centinela())
    arm['personaje'] = 'centinela'
    arm['altura_m'] = 2.3
    toon = material_toon('centinela_toon')
    ojo = material_emisivo('centinela_ojo', paleta['azul_arcano'], 3.0)
    k = Constructor(paleta, semilla=11, variacion=0.03)
    fragmentos = []
    for nombre, hueso, partes in piezas_centinela():
        f = Constructor(paleta, semilla=hash(nombre) % 97, variacion=0.03)
        for parte in partes:
            geo, color, mat = parte[0], parte[1], parte[2]
            m = parte[3] if len(parte) > 3 else None
            k.agregar(geo, color, hueso, m, material=mat)
            f.agregar(geo, color, 'escenario', m, material=mat)
        # El fragmento lleva su origen en su centro: así su cuerpo físico gira bien
        centro = sum(f.v, Vector()) / len(f.v)
        f.v = [v - centro for v in f.v]
        frag = crear_malla(f'centinela_frag_{nombre}', f, [toon, ojo], grupos=False)
        frag.location = centro
        frag['fragmento'] = nombre
        fragmentos.append(frag)
    cuerpo = crear_malla('centinela_cuerpo', k, [toon, ojo], arm)
    return arm, cuerpo, fragmentos


# ---------------------------------------------------------------------------
# Espectro ancestral: lienzo 260 × 460; la figura va de v=36 (capucha) a v=372 (jirones) = 1,90 m y
# flota sobre el suelo (v=450)
# ---------------------------------------------------------------------------

S_E = 1.90 / 336.0


def E(u, v):
    return ((u - 130.0) * S_E, (450.0 - v) * S_E)


def extruir(contorno, prof, y0=0.0, estrechar=0.9):
    """Volumen de silueta cóncava (los jirones de la túnica): cara de delante, de atrás y un anillo
    medio un poco más ancho para que no se vea plano. Normales hacia afuera respecto del centro."""
    cx = sum(p[0] for p in contorno) / len(contorno)
    cz = sum(p[1] for p in contorno) / len(contorno)
    n = len(contorno)
    verts = []
    for y, esc in ((y0 - prof, estrechar), (y0, 1.0), (y0 + prof, estrechar)):
        for x, z in contorno:
            verts.append(Vector((cx + (x - cx) * esc, y, cz + (z - cz) * esc)))
    caras = []
    for capa in range(2):
        for i in range(n):
            a, b = capa * n + i, capa * n + (i + 1) % n
            caras.append((a, b, b + n, a + n))
    caras = orientar_hacia_afuera(verts, caras, (cx, y0, cz))
    frente = orientar_hacia(verts, [tuple(range(n))], (0, -1, 0))
    atras = orientar_hacia(verts, [tuple(range(2 * n, 3 * n))], (0, 1, 0))
    return verts, caras + frente + atras


def tono_fantasma(_c, n):
    return 'espectro_luz' if n.z > 0.5 or n.x < -0.5 else 'espectro_cuerpo'


def piezas_espectro():
    P = []
    y_cap = 0.0
    capucha = [E(98, 36), E(162, 36), E(182, 88), E(172, 142), E(88, 142), E(78, 88)]
    frente_cap = y_cap - 0.2
    hueco = [E(106, 52), E(154, 52), E(166, 92), E(158, 132), E(102, 132), E(94, 92)]
    mascara = [E(110, 60), E(150, 60), E(158, 92), E(148, 126), E(112, 126), E(102, 92)]
    y_masc = frente_cap - 0.03
    partes_cabeza = [
        (solido(capucha, 0.2, y_cap), tono_fantasma, 0),
        (solido(hueco, 0.012, frente_cap - 0.004, capas=((1, 1, 0), (0.96, 0.96, 1.0))), 'espectro_hueco', 1),
    ]
    partes_mascara = [(solido(mascara, 0.04, y_masc), tono_piedra_personaje(), 1)]
    frente_masc = y_masc - 0.04 - 0.003
    for ojo in ([(112, 84), (126, 82), (126, 88), (113, 90)], [(134, 82), (148, 84), (147, 90), (134, 88)]):
        partes_mascara.append((_plano_frontal([E(u, v) for u, v in ojo], frente_masc)[0], 'espectro_hueco', 1))
    for brillo in ([(114, 85), (124, 84), (124, 87), (115, 88)], [(136, 84), (146, 85), (145, 88), (136, 87)]):
        partes_mascara.append((_plano_frontal([E(u, v) for u, v in brillo], frente_masc - 0.002)[0], 'espectro_ojo', 2))
    for trazo in (((130, 64), (130, 78)), ((119, 104), (130, 113)), ((130, 113), (141, 104)),
                  ((122, 116), (130, 121)), ((130, 121), (138, 116))):
        partes_mascara.append((_plano_frontal(_tira(E(*trazo[0]), E(*trazo[1]), 2.2 * S_E), frente_masc - 0.002)[0],
                               'espectro_runa', 2))
    P.append(('cabeza', 'esp_cabeza', partes_cabeza + partes_mascara))

    tunica = [E(76, 138), E(184, 138), E(198, 220), E(172, 300), E(152, 364), E(132, 334), E(112, 368), E(90, 300), E(62, 220)]
    P.append(('cuerpo', 'esp_cuerpo', [(extruir(tunica, 0.24, 0.02, 0.8), tono_fantasma, 0)]))
    for nombre, brazo, garra in (('der', [(78, 146), (62, 156), (34, 246), (48, 252), (70, 196)],
                                  [(34, 246), (48, 252), (44, 272), (38, 262), (30, 268)]),
                                 ('izq', [(182, 146), (198, 156), (222, 232), (208, 240), (188, 190)],
                                  [(208, 240), (222, 232), (230, 248), (220, 246), (214, 256)])):
        P.append((f'brazo_{nombre}', f'esp_brazo_{nombre}', [
            (solido([E(u, v) for u, v in brazo], 0.07, -0.02), tono_fantasma, 0),
            (solido([E(u, v) for u, v in garra], 0.035, -0.04), 'espectro_luz', 0),
        ]))
    return P, partes_mascara


def huesos_espectro():
    z = lambda v: E(0, v)[1]  # noqa: E731
    # Prefijo 'esp_': en el mismo .glb el centinela ya usa 'cabeza' y 'brazo_*' (GLTFLoader renombraría los repetidos)
    h = [('esp_raiz', (0, 0, z(372)), (0, 0, z(300)), None),
         ('esp_cuerpo', (0, 0, z(300)), (0, 0, z(142)), 'esp_raiz'),
         ('esp_cabeza', (0, 0, z(142)), (0, 0, z(36)), 'esp_cuerpo')]
    for nombre, u in (('der', 76), ('izq', 184)):
        x = E(u, 0)[0]
        h.append((f'esp_brazo_{nombre}', (x, 0, z(146)), (E(u - 40 if nombre == 'der' else u + 40, 0)[0], 0, z(250)), 'esp_cuerpo'))
    return h


def construir_espectro(paleta):
    """Devuelve (armadura, malla, máscara suelta)."""
    arm = crear_armadura('espectro', huesos_espectro())
    arm['personaje'] = 'espectro'
    arm['altura_m'] = 1.9
    fantasma = material_toon('espectro_fantasma')
    toon = material_toon('espectro_toon')
    runa = material_emisivo('espectro_runa', paleta['espectro_runa'], 3.0)
    k = Constructor(paleta, semilla=21, variacion=0.02)
    piezas, partes_mascara = piezas_espectro()
    for _nombre, hueso, partes in piezas:
        for geo, color, mat in partes:
            k.agregar(geo, color, hueso, material=mat)
    cuerpo = crear_malla('espectro_cuerpo', k, [fantasma, toon, runa], arm)
    m = Constructor(paleta, semilla=22, variacion=0.02)
    for geo, color, mat in partes_mascara:
        m.agregar(geo, color, 'escenario', material=mat)
    centro = sum(m.v, Vector()) / len(m.v)
    m.v = [v - centro for v in m.v]
    mascara = crear_malla('espectro_mascara', m, [fantasma, toon, runa], grupos=False)
    mascara.location = centro
    return arm, cuerpo, mascara

