"""Mateo Solano desde la hoja de personajes (tablero «Mateo Solano»).

Lienzo de 200 × 440: el sombrero llega a v=12 y la suela a v=432 → 420 unidades = 1,80 m. Mira hacia
-Y; el lado izquierdo del dibujo es su derecha (-X). Usa los mismos nombres de huesos que Victoria
(sin trenza ni poncho) para que el mismo animador lo haga caminar, correr y arrodillarse, y una cabeza
aparte con las mismas 17 formas de cara para que hable en la escena de la derrota.
"""
import math

from mathutils import Vector

from character_builder import FORMAS_CARA, solido
from common import (Constructor, agregar_formas, colocar, crear_armadura, crear_malla, elipsoide, material_toon,
                    orientar_hacia)

S_M = 1.80 / 420.0


def M(u, v):
    return ((u - 100.0) * S_M, (432.0 - v) * S_M)


def espejo_u(contorno):
    return [(200 - u, v) for u, v in reversed(contorno)]


def tono2(claro, oscuro, arriba=None):
    """Dos tonos como en el dibujo: su derecha (-X, izquierda del dibujo) clara y su izquierda oscura."""
    def fn(_c, n):
        if arriba and n.z > 0.6:
            return arriba
        return claro if n.x < 0.15 else oscuro
    return fn


def piel(_c, n):
    return 'v_piel' if n.x < 0.15 else 'v_piel_sombra'


def huesos_mateo():
    z = lambda v: M(0, v)[1]  # noqa: E731
    h = [('cadera', (0, 0, z(214)), (0, 0, z(200)), None),
         ('torso', (0, 0, z(214)), (0, 0, z(104)), 'cadera'),
         ('cabeza', (0, 0, z(100)), (0, 0, z(40)), 'torso'),
         ('sombrero', (0, 0, z(40)), (0, 0, z(12)), 'cabeza')]
    for lado, s in (('izq', 1), ('der', -1)):
        x = M(100 + s * 41, 0)[0]
        h.append((f'brazo_sup_{lado}', (x, 0, z(110)), (x, 0, z(188)), 'torso'))
        h.append((f'brazo_inf_{lado}', (x, 0, z(188)), (x, 0, z(236)), f'brazo_sup_{lado}'))
        h.append((f'mano_{lado}', (x, 0, z(236)), (x, 0, z(256)), f'brazo_inf_{lado}'))
        px = M(100 + s * 15, 0)[0]
        h.append((f'pierna_sup_{lado}', (px, 0, z(214)), (px, 0, z(296)), 'cadera'))
        h.append((f'pierna_inf_{lado}', (px, 0, z(296)), (px, 0, z(418)), f'pierna_sup_{lado}'))
        h.append((f'bota_{lado}', (px, 0, z(418)), (px, -0.14, z(430)), f'pierna_inf_{lado}'))
    return h


def construir_cuerpo(paleta):
    k = Constructor(paleta, semilla=41, variacion=0.02)

    def poner(contorno, prof, color, hueso, y0=0.0, capas=None, ambos=True):
        cont = [M(u, v) for u, v in contorno]
        geo = solido(cont, prof, y0) if capas is None else solido(cont, prof, y0, capas)
        k.agregar(geo, color, hueso)
        if ambos:
            cont2 = [M(u, v) for u, v in espejo_u(contorno)]
            geo2 = solido(cont2, prof, y0) if capas is None else solido(cont2, prof, y0, capas)
            k.agregar(geo2, color, hueso.replace('_der', '_izq'))

    # Piernas y botas
    poner([(70, 214), (99, 214), (97, 296), (73, 296)], 0.085, tono2('#725C44', '#5C4A36'), 'pierna_sup_der')
    poner([(73, 296), (97, 296), (97, 372), (74, 372)], 0.08, tono2('#725C44', '#44372A'), 'pierna_inf_der')
    poner([(71, 360), (98, 360), (99, 418), (102, 426), (64, 428), (68, 418)], 0.09, tono2('#4D3A2E', '#3A2B22'), 'bota_der', -0.02)
    poner([(64, 426), (102, 426), (102, 432), (64, 432)], 0.1, 'v_suela', 'bota_der', -0.03)
    # Torso: camisa, chaleco con bolsillos, cinturón con hebilla y la correa del morral
    k.agregar(solido([M(68, 104), M(132, 104), M(134, 216), M(66, 216)], 0.13, 0.0), tono2('#D8CBB0', '#B9AA8B'), 'torso')
    k.agregar(solido([M(66, 104), M(94, 104), M(98, 206), M(64, 206)], 0.137, 0.0, capas=((1, 1, 0), (0.95, 0.99, 0.7), (0.8, 0.97, 1))),
              tono2('#A8966C', '#8C7A55'), 'torso')
    k.agregar(solido([M(106, 104), M(134, 104), M(136, 206), M(102, 206)], 0.137, 0.0, capas=((1, 1, 0), (0.95, 0.99, 0.7), (0.8, 0.97, 1))),
              tono2('#8C7A55', '#7E6E4C'), 'torso')
    for (u0, v0, u1, v1, c) in ((72, 120, 88, 134, '#8C7A55'), (70, 152, 90, 172, '#8C7A55'), (110, 152, 130, 172, '#66593D')):
        k.agregar(solido([M(u0, v0), M(u1, v0), M(u1, v1), M(u0, v1)], 0.012, -0.135, capas=((1, 1, 0), (0.95, 0.95, 1))), c, 'torso')
    k.agregar(solido([M(66, 206), M(134, 206), M(134, 216), M(66, 216)], 0.142, 0.0), '#3F2E22', 'cadera')
    k.agregar(solido([M(95, 206), M(105, 206), M(105, 216), M(95, 216)], 0.01, -0.145), 'v_ribete', 'cadera')
    k.agregar(solido([M(130, 104), M(138, 108), M(74, 206), M(66, 202)], 0.15, 0.0, capas=((1, 1, 0), (1, 1, 1))), '#5C412A', 'torso')
    k.agregar(solido([M(46, 196), M(76, 196), M(78, 226), M(46, 226)], 0.07, -0.02), tono2('#94704A', '#7D5B3C'), 'torso')
    k.agregar(solido([M(58, 206), M(64, 206), M(64, 212), M(58, 212)], 0.01, -0.095), 'v_ribete', 'torso')
    # Cuello y cuello de la camisa
    k.agregar(solido([M(92, 92), M(108, 92), M(108, 104), M(92, 104)], 0.05, 0.0), piel, 'torso')
    k.agregar(solido([M(90, 100), M(110, 100), M(106, 114), M(94, 114)], 0.06, -0.06), '#E8DCC4', 'torso')
    # Brazos arremangados
    poner([(52, 110), (68, 106), (66, 186), (50, 188)], 0.06, tono2('#D8CBB0', '#B9AA8B'), 'brazo_sup_der')
    poner([(48, 182), (67, 180), (67, 194), (48, 196)], 0.065, '#E8DCC4', 'brazo_inf_der')
    poner([(50, 194), (66, 192), (64, 234), (50, 236)], 0.05, piel, 'brazo_inf_der')
    poner([(48, 232), (65, 230), (67, 248), (58, 256), (49, 250)], 0.05, piel, 'mano_der')
    # Sombrero de explorador: ala redonda, copa y cinta
    zb = M(0, 42)[1]
    k.agregar(elipsoide(56 * S_M, 50 * S_M, 4 * S_M, 14, 3), tono2('#846845', '#6A5236', '#846845'), 'sombrero', colocar((0, 0, zb)))
    k.agregar(solido([M(78, 38), M(84, 14), M(100, 12), M(116, 14), M(122, 38)], 0.11, 0.0), tono2('#846845', '#6A5236'), 'sombrero')
    k.agregar(solido([M(78, 30), M(122, 30), M(122, 38), M(78, 38)], 0.115, 0.0), '#3F2E22', 'sombrero')
    return k


OJO = {'der': M(88, 57), 'izq': M(112, 57)}
OJO_R = (3 * S_M, 4 * S_M)
CARA_Y = -0.105


def construir_cabeza(paleta):
    """Cara, barba, gafas, cejas, ojos y boca, con etiquetas para las formas de expresión."""
    h = Constructor(paleta, semilla=43, variacion=0.0)
    cara = [M(74, 40), M(126, 40), M(128, 62), M(118, 84), M(100, 92), M(82, 84), M(72, 62)]
    h.agregar(solido(cara, 0.1, 0.0), piel, 'cabeza')
    h.agregar(solido([M(70, 54), M(74, 54), M(74, 70), M(70, 68)], 0.02, 0.0), 'v_piel_sombra', 'cabeza')
    h.agregar(solido([M(126, 54), M(130, 56), M(130, 68), M(126, 70)], 0.02, 0.0), 'v_piel_sombra', 'cabeza')
    # Barba geométrica con canas
    barba = [M(72, 62), M(82, 74), M(100, 80), M(118, 74), M(128, 62), M(128, 74), M(118, 94), M(100, 104), M(82, 94), M(72, 74)]
    h.agregar(solido(barba, 0.11, -0.005, capas=((1, 1, 0), (0.97, 0.98, 0.7), (0.85, 0.95, 1))), tono2('#4A3628', '#3A2A1E'), 'cabeza')
    for c in ([(84, 90), (92, 95), (90, 100), (82, 94)], [(108, 95), (116, 90), (118, 94), (110, 100)]):
        h.agregar(_plano([M(u, v) for u, v in c], CARA_Y - 0.012), '#8A8178', 'cabeza')
    # Nariz
    h.agregar(solido([M(100, 62), M(104, 71), M(97, 71)], 0.02, CARA_Y - 0.01, capas=((1, 1, 0), (0.6, 0.6, 1))), piel, 'cabeza')
    # Boca (bajo el bigote): 6 puntos con su papel en la forma
    partes = {'esq_der': (88, 74), 'sup_c': (100, 71), 'esq_izq': (112, 74), 'inf_izq': (108, 78), 'inf_c': (100, 76), 'inf_der': (92, 78)}
    centro = Vector((0, CARA_Y - 0.015, M(0, 75)[1]))
    verts = [centro + Vector((x, 0, z - centro.z)) for (x, z) in (M(*p) for p in partes.values())]
    idx = h.agregar((verts, orientar_hacia(verts, [tuple(range(len(verts)))], (0, -1, 0))), 'v_boca', 'cabeza', etiqueta='boca')
    for i, parte in zip(idx, partes):
        h.meta[i] = parte
    # Cejas rectas y gruesas
    for lado, c in (('der', [(80, 47), (95, 46), (95, 49.5), (80, 50.5)]), ('izq', [(105, 46), (120, 47), (120, 50.5), (105, 49.5)])):
        h.agregar(solido([M(u, v) for u, v in c], 0.006, CARA_Y - 0.012, capas=((1, 1, 0), (0.95, 0.8, 1))), '#3A2A1E', 'cabeza',
                  etiqueta=f'ceja_{lado}')
    # Ojos (detrás de las gafas) y gafas redondas
    for lado, (ox, oz) in OJO.items():
        h.agregar(elipsoide(OJO_R[0], 0.004, OJO_R[1], 10, 4), 'v_ojos', 'cabeza', colocar((ox, CARA_Y - 0.004, oz)), etiqueta=f'ojo_{lado}')
        for i in range(12):
            a0, a1 = math.tau * i / 12, math.tau * (i + 1) / 12
            anillo = [Vector((ox + math.cos(a) * r * S_M, CARA_Y - 0.02, oz + math.sin(a) * r * S_M))
                      for a, r in ((a0, 8.5), (a1, 8.5), (a1, 6.8), (a0, 6.8))]
            h.agregar((anillo, orientar_hacia(anillo, [(0, 1, 2, 3)], (0, -1, 0))), '#2E2219', 'cabeza')
    puente = [M(95.5, 56), M(104.5, 56), M(104.5, 58), M(95.5, 58)]
    h.agregar(_plano(puente, CARA_Y - 0.02), '#2E2219', 'cabeza')
    return h


def _plano(contorno, y):
    verts = [Vector((x, y, z)) for x, z in contorno]
    return verts, orientar_hacia(verts, [tuple(range(len(verts)))], (0, -1, 0))


def formas_mateo(h):
    """Las 17 formas de la cara de Victoria, con los rasgos de Mateo (párpados = ojo que se cierra)."""
    v = h.v
    formas = {n: {} for n in FORMAS_CARA}

    def mover(nombre, indices, fn):
        for i in indices:
            formas[nombre][i] = fn(v[i].copy())

    for nombre, f in (('parpadeo', 0.08), ('parpado_sup', 0.6), ('parpado_inf', 0.75)):
        for lado, (_ox, oz) in OJO.items():
            def cerrar(p, f=f, oz=oz, nombre=nombre):
                if nombre == 'parpado_inf' and p.z > oz:
                    return p
                if nombre == 'parpado_sup' and p.z < oz:
                    return p
                p.z = oz + (p.z - oz) * f
                return p
            mover(nombre, h.etiquetas[f'ojo_{lado}'], cerrar)
    for nombre, alto, incl in (('cejas_arriba', 0.012, 0.0), ('cejas_ceno', -0.004, -0.008), ('cejas_tristes', 0.003, 0.008)):
        for lado in ('der', 'izq'):
            def ceja(p, alto=alto, incl=incl, lado=lado):
                interior = 1 - min(1, abs(p.x) / (25 * S_M))
                p.z += alto + incl * interior
                return p
            mover(nombre, h.etiquetas[f'ceja_{lado}'], ceja)
    for nombre, d in (('mirada_izq', 0.004), ('mirada_der', -0.004)):
        for lado in ('der', 'izq'):
            def mira(p, d=d):
                p.x += d
                return p
            mover(nombre, h.etiquetas[f'ojo_{lado}'], mira)
    ajustes = {
        'boca_ancha': (1.25, 0, 0, 0.001), 'boca_sonrisa': (1.1, 0.005, 0.002, -0.001), 'boca_triste': (0.92, -0.005, 0.0, 0.002),
        'vis_A': (0.85, -0.002, 0.002, -0.011), 'vis_E': (1.12, 0, 0.001, -0.005), 'vis_I': (1.2, 0.001, 0.0005, -0.001),
        'vis_O': (0.55, 0, 0.003, -0.008), 'vis_U': (0.42, 0, 0.0015, -0.002), 'vis_MBP': (0.96, 0, -0.001, 0.003),
    }
    boca = h.etiquetas['boca']
    centro_x = sum(v[i].x for i in boca) / len(boca)
    for nombre, (ancho, esq_z, sup_z, inf_z) in ajustes.items():
        for i in boca:
            parte = h.meta[i]
            p = v[i].copy()
            p.x = centro_x + (p.x - centro_x) * ancho
            if parte.startswith('esq'):
                p.z += esq_z
            elif parte == 'sup_c':
                p.z += sup_z
            elif parte == 'inf_c':
                p.z += inf_z
            else:
                p.z += inf_z * 0.7
            formas[nombre][i] = p
    return formas


def construir_mateo(paleta):
    arm = crear_armadura('mateo', huesos_mateo())
    arm['personaje'] = 'mateo'
    arm['altura_m'] = 1.8
    toon = material_toon('mateo_toon')
    cuerpo = crear_malla('mateo_cuerpo', construir_cuerpo(paleta), [toon], arm)
    hk = construir_cabeza(paleta)
    cabeza = crear_malla('mateo_cabeza', hk, [toon], arm)
    agregar_formas(cabeza, formas_mateo(hk))
    cabeza['formas'] = ','.join(FORMAS_CARA)
    return arm, cuerpo, cabeza

