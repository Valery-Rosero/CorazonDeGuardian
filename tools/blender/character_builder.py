"""Constructores de personajes. Cada uno genera:
  - un esqueleto (armadura) con nombres fijos que lee el ProceduralAnimator de Three.js,
  - una malla de cuerpo con pesos rígidos (cada vértice obedece al 100 % a un hueso),
  - y, si el personaje habla, una malla de cabeza aparte con formas de expresión (shape keys).

VICTORIA SE CONSTRUYE DESDE EL BOCETO APROBADO (hoja de personajes, vista de frente y de espalda,
lienzo de 200 × 420 unidades). Cada pieza usa las coordenadas exactas del dibujo convertidas a metros
con la misma escala, de modo que la silueta 3D vista de frente y de espalda coincide con el boceto.
La profundidad (que el dibujo no define) se añade con volúmenes redondeados.

Medidas en metros. El personaje mira hacia -Y; su izquierda ('izq') es +X.
"""
import math

from mathutils import Vector

from common import (Constructor, agregar_formas, caja_biselada, casco, colocar, crear_armadura, crear_malla,
                    elipsoide, material_emisivo, material_toon, orientar_hacia, prisma, segmento)

# ---------------------------------------------------------------------------
# Escala del boceto: 402 unidades (del tope del sombrero, v=8, a la suela, v=410) = 1,65 m
# ---------------------------------------------------------------------------

ESCALA = 1.65 / 402.0


def F(u, v):
    """Punto del boceto DE FRENTE → (x, z) en metros. El lado izquierdo del dibujo es la derecha de Victoria (-X)."""
    return ((u - 100.0) * ESCALA, (410.0 - v) * ESCALA)


def FE(u, v):
    """Punto del boceto DE ESPALDA → (x, z). En la espalda, el lado izquierdo del dibujo es su izquierda (+X)."""
    return ((100.0 - u) * ESCALA, (410.0 - v) * ESCALA)


def espejo(contorno):
    """Contorno del lado derecho de Victoria → lado izquierdo (refleja X)."""
    return [(-x, z) for x, z in reversed(contorno)]


def solido(contorno, prof, y0=0.0, capas=((1.0, 1.0, 0.0), (0.93, 0.985, 0.6), (0.74, 0.96, 1.0))):
    """Volumen redondeado cuya silueta de frente es exactamente 'contorno' (lista de (x, z)).
    Cada capa (escala_x, escala_z, fracción de profundidad) estrecha el contorno hacia su centro
    a medida que se aleja del plano medio: queda una pieza tallada de bordes biselados."""
    cx = sum(p[0] for p in contorno) / len(contorno)
    cz = sum(p[1] for p in contorno) / len(contorno)
    pts = []
    for ex, ez, f in capas:
        for signo in ((1, -1) if f > 0 else (1,)):
            for x, z in contorno:
                pts.append((cx + (x - cx) * ex, y0 + signo * prof * f, cz + (z - cz) * ez))
    return casco(pts)


# ---------------------------------------------------------------------------
# Medidas derivadas del boceto
# ---------------------------------------------------------------------------

CARA = [F(72, 52), F(128, 52), F(131, 74), F(122, 94), F(100, 102), F(78, 94), F(69, 74)]
CARA_Y = -0.115                      # plano frontal de la cara (donde viven ojos, cejas y boca)
OJO_X, OJO_Z = F(112, 75)            # ojo izquierdo de Victoria (derecha del dibujo)
OJO_RX, OJO_RZ = 4.2 * ESCALA, 5.6 * ESCALA       # 1,7 × 2,3 cm de radio: los ojos grandes del boceto
CEJA_Z = F(0, 65.2)[1]
BOCA_Z = F(0, 92.6)[1]
CABEZA_Z = 1.37

TRENZA_JUNTAS = [
    (0.000, 0.105, 1.300),
    (-0.003, 0.215, 1.215),
    (-0.006, 0.262, 1.125),
    (-0.009, 0.266, 1.035),
    (-0.012, 0.264, 0.945),
    (-0.014, 0.258, 0.850),
    (-0.016, 0.250, 0.742),
]

FORMAS_CARA = [
    'cejas_arriba', 'cejas_ceno', 'cejas_tristes',
    'parpado_sup', 'parpado_inf', 'parpadeo',
    'boca_ancha', 'boca_sonrisa', 'boca_triste',
    'vis_A', 'vis_E', 'vis_I', 'vis_O', 'vis_U', 'vis_MBP',
    'mirada_izq', 'mirada_der',
]


def huesos_victoria():
    h = []

    def b(n, cabeza, cola, padre=None):
        h.append((n, cabeza, cola, padre))

    b('cadera', (0, 0, 0.84), (0, 0, 0.95))
    b('torso', (0, 0, 0.86), (0, 0, 1.20), 'cadera')
    b('cabeza', (0, 0, 1.25), (0, 0, 1.50), 'torso')
    b('sombrero', (0, 0, 1.46), (0, 0, 1.64), 'cabeza')
    for lado, s in (('izq', 1), ('der', -1)):
        x = 0.157 * s
        b(f'brazo_sup_{lado}', (x, 0, 1.20), (x, 0, 0.935), 'torso')
        b(f'brazo_inf_{lado}', (x, 0, 0.935), (x, 0, 0.79), f'brazo_sup_{lado}')
        b(f'mano_{lado}', (x, 0, 0.79), (x, 0, 0.69), f'brazo_inf_{lado}')
    for lado, s in (('izq', 1), ('der', -1)):
        x = 0.055 * s
        b(f'pierna_sup_{lado}', (x, 0, 0.84), (x, 0, 0.53), 'cadera')
        b(f'pierna_inf_{lado}', (x, 0, 0.53), (x, 0, 0.07), f'pierna_sup_{lado}')
        b(f'bota_{lado}', (x, 0, 0.07), (x, -0.15, 0.03), f'pierna_inf_{lado}')
    padre = 'cabeza'
    for k in range(6):
        b(f'trenza_{k + 1}', TRENZA_JUNTAS[k], TRENZA_JUNTAS[k + 1], padre)
        padre = f'trenza_{k + 1}'
    b('poncho_delante', (0, -0.10, 1.22), (0, -0.12, 0.82), 'torso')
    b('poncho_detras', (0, 0.10, 1.22), (0, 0.12, 0.82), 'torso')
    b('mochila', (0, 0.155, 1.18), (0, 0.155, 0.90), 'torso')
    b('brazalete', (-0.157, 0, 0.87), (-0.157, 0, 0.82), 'brazo_inf_der')
    return h


# ---------------------------------------------------------------------------
# Poncho: cada franja del boceto es una banda de caras; la profundidad se curva hacia los lados
# ---------------------------------------------------------------------------

def _x_lado(v, izquierda=True):
    """Borde lateral del poncho en el boceto: de (60,114) a (50,170) y su espejo."""
    u = 60 - 10 * (v - 114) / 56
    return u if izquierda else 200 - u


# Polilíneas del boceto (u, v), de izquierda a derecha, que separan las franjas del poncho
_P_ARRIBA = [(60, 114), (72, 111), (100, 106), (128, 111), (140, 114)]
_P_FRANJA_A = [(_x_lado(148), 148), (72, 168), (100, 184), (128, 168), (_x_lado(148, False), 148)]
_P_FRANJA_B = [(_x_lado(153), 153), (72, 173), (100, 189), (128, 173), (_x_lado(153, False), 153)]
_P_RIBETE = [(_x_lado(162), 162), (74, 186), (100, 203), (126, 186), (_x_lado(162, False), 162)]
_P_BORDE = [(50, 170), (72, 196), (100, 214), (128, 196), (150, 170)]
_BANDAS = [(_P_ARRIBA, _P_FRANJA_A, 'v_poncho'), (_P_FRANJA_A, _P_FRANJA_B, 'v_ribete_oscuro'),
           (_P_FRANJA_B, _P_RIBETE, 'v_poncho'), (_P_RIBETE, _P_BORDE, 'v_ribete')]
PONCHO_PROF = 0.105   # media profundidad en el centro


def _prof_poncho(x):
    """El poncho es grueso en el centro (cubre el torso) y casi plano en los lados (cae sobre los brazos)."""
    t = min(1.0, abs(x) / 0.215)
    return PONCHO_PROF * math.sqrt(max(0.0, 1 - 0.86 * t * t))


def _poncho(c):
    verts, caras, colores = [], [], []

    def v3(u, v, lado):
        x, z = F(u, v)
        verts.append(Vector((x, lado * _prof_poncho(x), z)))
        return len(verts) - 1

    for lado in (-1, 1):  # -1 = delante, +1 = detrás
        for arriba, abajo, color in _BANDAS:
            ia = [v3(u, v, lado) for u, v in arriba]
            ib = [v3(u, v, lado) for u, v in abajo]
            for i in range(len(ia) - 1):
                cara = (ia[i], ia[i + 1], ib[i + 1], ib[i])
                caras.append(cara)
                colores.append(color)
    # Paredes que unen delante y detrás siguiendo el contorno (hombros, lados y borde inferior)
    perimetro = (_P_ARRIBA + [p for p in [(_x_lado(148, False), 148), (_x_lado(153, False), 153),
                                         (_x_lado(162, False), 162)]] + list(reversed(_P_BORDE))
                 + [(_x_lado(162), 162), (_x_lado(153), 153), (_x_lado(148), 148)])
    for i in range(len(perimetro)):
        (ua, va), (ub, vb) = perimetro[i], perimetro[(i + 1) % len(perimetro)]
        a0, a1 = v3(ua, va, -1), v3(ua, va, 1)
        b0, b1 = v3(ub, vb, -1), v3(ub, vb, 1)
        caras.append((a0, b0, b1, a1))
        vm = (va + vb) / 2
        colores.append('v_ribete' if vm >= 162 else 'v_ribete_oscuro' if 148 <= vm <= 153 else 'v_poncho')
    # Normales hacia afuera (el poncho es convexo alrededor del torso)
    from common import orientar_hacia_afuera
    centro = Vector((0, 0, F(0, 150)[1]))
    caras = orientar_hacia_afuera(verts, caras, centro)

    def hueso(_i, p):
        if p.z > 1.08:
            return 'torso'
        return 'poncho_delante' if p.y < 0 else 'poncho_detras'

    c.agregar((verts, caras), colores, hueso)

    # Escote en V (piel) y rombos del ribete, apenas delante de la tela
    def placa(puntos_uv, color, adelanto=0.003, hueso_placa='torso', lado=-1):
        vs = []
        for u, v in puntos_uv:
            x, z = F(u, v)
            vs.append(Vector((x, lado * (_prof_poncho(x) + adelanto), z)))
        c.agregar((vs, orientar_hacia(vs, [tuple(range(len(vs)))], (0, lado, 0))), color, hueso_placa)

    placa([(91, 106), (109, 106), (100, 122)], 'v_piel_sombra')
    for lado, hp in ((-1, 'poncho_delante'), (1, 'poncho_detras')):
        for cu, cv in ((72, 191), (100, 207), (128, 191)):
            placa([(cu, cv - 4), (cu + 3, cv), (cu, cv + 4), (cu - 3, cv)], 'v_oro_sombra', 0.004, hp, lado)


# ---------------------------------------------------------------------------
# Cuerpo
# ---------------------------------------------------------------------------

def _pierna(c, lado):
    """Pierna derecha del boceto (lado izquierdo del dibujo); la izquierda es su espejo."""
    m = (lambda pts: pts) if lado == 'der' else espejo
    s = -1 if lado == 'der' else 1
    c.agregar(solido(m([F(74, 204), F(99, 204), F(98, 286), F(76, 286)]), 0.058), 'v_pantalon', f'pierna_sup_{lado}')
    c.agregar(solido(m([F(76, 280), F(98, 280), F(97, 352), F(77, 352)]), 0.050), 'v_pantalon', f'pierna_inf_{lado}')
    # Rodillera (placa delante de la pierna)
    rod = [Vector((x, -0.058, z)) for x, z in m([F(78, 282), F(96, 282), F(95, 294), F(79, 294)])]
    c.agregar((rod, orientar_hacia(rod, [(0, 1, 2, 3)], (0, -1, 0))), 'v_pantalon_sombra', f'pierna_inf_{lado}')
    # Bota: caña, vuelta clara, pie hacia delante y suela
    c.agregar(solido(m([F(74, 338), F(99, 338), F(99, 398), F(71, 398)]), 0.058), 'v_botas', f'pierna_inf_{lado}')
    c.agregar(solido(m([F(73, 335), F(100, 335), F(100, 350), F(73, 350)]), 0.062), 'v_botas_luz', f'pierna_inf_{lado}')
    x = 0.055 * s
    pie = [(x + dx * s, y, z) for dx, y, z in (
        (-0.052, 0.055, 0.016), (0.052, 0.055, 0.016), (-0.052, 0.050, 0.085), (0.052, 0.050, 0.085),
        (-0.058, -0.080, 0.016), (0.056, -0.080, 0.016), (-0.050, -0.070, 0.075), (0.050, -0.070, 0.075),
        (-0.046, -0.165, 0.016), (0.044, -0.165, 0.016), (-0.032, -0.160, 0.055), (0.032, -0.160, 0.055),
        (0.000, -0.180, 0.022))]
    c.agregar(casco(pie), 'v_botas', f'bota_{lado}')
    c.agregar(caja_biselada(0.120, 0.250, 0.022, 0.008), 'v_suela', f'bota_{lado}', colocar((x, -0.060, 0.011)))


def _brazo(c, lado):
    """Brazo derecho del boceto; el izquierdo es su espejo. Cuelga separado del cuerpo, como en el dibujo."""
    m = (lambda pts: pts) if lado == 'der' else espejo
    c.agregar(solido(m([F(56, 116), F(70, 116), F(68, 182), F(54, 182)]), 0.031), 'v_camisa', f'brazo_sup_{lado}')
    c.agregar(solido(m([F(53, 175), F(68, 173), F(68, 190), F(53, 191)]), 0.034), 'v_camisa_luz', f'brazo_inf_{lado}')
    c.agregar(solido(m([F(54, 188), F(67, 186), F(65, 222), F(53, 222)]), 0.026), 'v_piel', f'brazo_inf_{lado}')
    c.agregar(solido(m([F(51, 218), F(66, 216), F(68, 232), F(60, 242), F(52, 236)]), 0.020), 'v_piel_luz', f'mano_{lado}')
    # Pulgar hacia delante
    xm = F(60, 0)[0] * (1 if lado == 'der' else -1)
    pulgar = [(xm + dx, y, z) for dx, y, z in (
        (-0.010, -0.018, 0.775), (0.010, -0.018, 0.775), (-0.008, -0.018, 0.745), (0.008, -0.018, 0.745),
        (-0.005, -0.038, 0.758), (0.005, -0.038, 0.758))]
    c.agregar(casco(pulgar), 'v_piel', f'mano_{lado}')


def _brazalete(c):
    """En la muñeca derecha, como en el boceto: banda dorada con la gema delante y otra detrás."""
    c.agregar(solido([F(52, 197), F(67, 195), F(67, 211), F(52, 213)], 0.031), 'v_ribete', 'brazalete')
    c.agregar(solido([F(52, 206), F(67, 204), F(67, 211), F(52, 213)], 0.032), 'v_oro_sombra', 'brazalete')
    gx, gz = F(59.5, 203.5)
    rx, rz = 4.0 * ESCALA, 5.5 * ESCALA
    for lado in (-1, 1):
        gema = [(gx - rx, lado * 0.031, gz), (gx + rx, lado * 0.031, gz), (gx, lado * 0.031, gz + rz),
                (gx, lado * 0.031, gz - rz), (gx, lado * 0.040, gz)]
        c.agregar(casco(gema), 'gema_pulso', 'brazalete', material=1)


def _sombrero(c):
    """Copa de cinco caras (78,42)-(84,14)-(100,8)-(116,14)-(122,42), cinta dorada y ala ancha."""
    def tono(_c, n):
        if n.z > 0.55:
            return 'v_sombrero_luz'
        if n.z < -0.5:
            return 'v_sombrero_sombra'
        return 'v_sombrero'

    xb, zb = F(122, 42)
    xm, zm = F(116, 14)
    _, zt = F(100, 8)
    copa = []
    for i in range(12):
        a = math.tau * i / 12
        copa.append((math.cos(a) * xb, math.sin(a) * xb * 0.9, zb))
        copa.append((math.cos(a) * xm, math.sin(a) * xm * 0.88, zm))
    copa += [(0, -0.030, zt), (0, 0.030, zt), (0.025, 0, zt - 0.004), (-0.025, 0, zt - 0.004)]
    c.agregar(casco(copa), tono, 'sombrero')
    _, z_cinta_arriba = F(0, 34)
    c.agregar(prisma(12, xb * 1.03, z_cinta_arriba - zb + 0.004, radio_sup=xb * 0.99, escala_y=0.9), 'v_ribete', 'sombrero',
              colocar((0, 0, (zb + z_cinta_arriba) / 2)))
    # Ala del boceto (52,48)-(78,40)-(122,40)-(148,48)-(140,56)-(60,56): 0,39 m de ancho, con la cara de
    # arriba inclinada desde la copa (v=40) hasta el borde (v=48) y la de abajo plana (v=56)
    ala_r = (148 - 100) * ESCALA
    _, z_arriba_copa = F(0, 40)
    _, z_borde = F(0, 48)
    _, z_abajo = F(0, 56)
    ala = []
    for i in range(16):
        a = math.tau * i / 16
        ca, sa = math.cos(a), math.sin(a)
        ala.append((ca * ala_r, sa * ala_r * 0.92, z_borde))
        ala.append((ca * (ala_r - 0.012), sa * (ala_r - 0.012) * 0.92, z_abajo + 0.004))
        ala.append((ca * xb * 1.05, sa * xb * 0.95, z_arriba_copa))
        ala.append((ca * xb * 1.05, sa * xb * 0.95, z_abajo))
    c.agregar(casco(ala), tono, 'sombrero')


def _mochila(c):
    """Vista de espalda del boceto: mochila, solapa, hebilla, correas y el rollo del mapa cruzado."""
    yc = 0.158
    c.agregar(solido([FE(76, 122), FE(124, 122), FE(127, 190), FE(73, 190)], 0.050, yc), 'v_mochila', 'mochila')
    c.agregar(solido([FE(76, 121), FE(124, 121), FE(121, 150), FE(79, 150)], 0.054, yc), 'v_mochila_luz', 'mochila')
    hx, hz = FE(100, 149)
    c.agregar(caja_biselada(0.034, 0.012, 0.040, 0.004), 'v_ribete', 'mochila', colocar((hx, yc + 0.056, hz)))
    # Correas: solo se ven de espalda, como en el boceto (de frente no aparecen)
    for u0 in (78, 112):
        cor = [FE(u0, 110), FE(u0 + 10, 110), FE(u0 + 8, 124), FE(u0 - 2, 124)]
        c.agregar(solido(cor, 0.012, 0.11), 'v_mochila_sombra', 'torso')
    # Rollo del mapa: de (46,100) a (112,138) en la espalda; asoma por el hombro izquierdo de frente
    (ax, az), (bx, bz) = FE(48, 99), FE(112, 138)
    y_rollo = yc + 0.072
    mm, largo = segmento((ax, y_rollo, az), (bx, y_rollo, bz))
    c.agregar(prisma(8, 0.019, largo, giro=22.5), 'v_mapa', 'mochila', mm)
    for t in (0.0, 1.0):
        p = Vector((ax, y_rollo, az)).lerp(Vector((bx, y_rollo, bz)), t)
        d = (Vector((bx, y_rollo, bz)) - Vector((ax, y_rollo, az))).normalized()
        me, _ = segmento(p - d * 0.006, p + d * 0.006)
        c.agregar(prisma(8, 0.021, 0.012, giro=22.5), 'v_mapa_sombra', 'mochila', me)
    centro_rollo = Vector((ax, y_rollo, az)).lerp(Vector((bx, y_rollo, bz)), 0.42)
    me, _ = segmento(centro_rollo - d * 0.006, centro_rollo + d * 0.006)
    c.agregar(prisma(8, 0.021, 0.010, giro=22.5), 'v_ribete', 'mochila', me)


def _trenza(c):
    """Seis eslabones hexagonales alternando dos tonos, de la nuca a la cintura; lazo dorado y mechón."""
    anchos = [9.0, 8.5, 8.5, 8.0, 7.0, 6.5]   # medio ancho de cada eslabón en el boceto (unidades)
    for k in range(6):
        a, b = Vector(TRENZA_JUNTAS[k]), Vector(TRENZA_JUNTAS[k + 1])
        mm, largo = segmento(a, b)
        r = anchos[k] * ESCALA * 1.3
        tono = 'v_cabello' if k % 2 == 0 else 'v_cabello_luz'
        # Eslabones gruesos que se tocan (en el boceto no hay huecos entre ellos)
        c.agregar(elipsoide(r, r * 0.75, largo * 0.68, 6, 4), tono, f'trenza_{k + 1}', mm)
    fin = Vector(TRENZA_JUNTAS[6])
    me, _ = segmento(fin + Vector((0, 0.004, 0.012)), fin - Vector((0, 0.004, 0.012)))
    c.agregar(prisma(6, 6.0 * ESCALA, 0.025), 'v_ribete', 'trenza_6', me)
    mechon = [tuple(fin + Vector(p)) for p in (
        (-0.022, 0, -0.012), (0.022, 0, -0.012), (0, 0.014, -0.012), (0, -0.014, -0.012),
        (-0.024, 0.004, -0.070), (0.026, -0.004, -0.070), (0.004, 0.010, -0.092), (-0.008, -0.008, -0.085))]
    c.agregar(casco(mechon), 'v_cabello', 'trenza_6')


def construir_cuerpo(paleta):
    c = Constructor(paleta, semilla=11, variacion=0.025)
    # Cadera, cinturón y bolsa (al costado izquierdo de Victoria, derecha del dibujo)
    c.agregar(solido([F(73, 198), F(127, 198), F(126, 228), F(74, 228)], 0.078), 'v_pantalon', 'cadera')
    c.agregar(solido([F(72, 204), F(128, 204), F(128, 214), F(72, 214)], 0.082), 'v_cinturon', 'cadera')
    c.agregar(solido([F(124, 208), F(140, 208), F(139, 230), F(125, 230)], 0.034), 'v_mochila', 'cadera')
    c.agregar(solido([F(124, 207), F(140, 207), F(140, 214), F(124, 214)], 0.036), 'v_mochila_luz', 'cadera')
    # Camisa (bajo el poncho) y cuello
    c.agregar(solido([F(76, 118), F(124, 118), F(128, 206), F(72, 206)], 0.074), 'v_camisa', 'torso')
    _, zc0 = F(0, 112)
    _, zc1 = F(0, 96)
    c.agregar(prisma(8, 7.0 * ESCALA, zc1 - zc0, giro=22.5), 'v_piel_sombra', 'torso', colocar((0, 0.005, (zc0 + zc1) / 2)))
    _poncho(c)
    for lado in ('izq', 'der'):
        _brazo(c, lado)
        _pierna(c, lado)
    _brazalete(c)
    _sombrero(c)
    _mochila(c)
    _trenza(c)
    return c


# ---------------------------------------------------------------------------
# Cabeza con expresiones
# ---------------------------------------------------------------------------

BOCA_BASE = [  # (nombre, u, v) en metros sobre el plano de la cara, centrados en la boca del boceto
    ('esq_d', -0.0246, 0.0006), ('sup_d', -0.012, 0.0010), ('sup_c', 0.0, 0.0011), ('sup_i', 0.012, 0.0010),
    ('esq_i', 0.0246, 0.0006), ('inf_i', 0.012, -0.0040), ('inf_c', 0.0, -0.0075), ('inf_d', -0.012, -0.0040),
]


def construir_cabeza(paleta):
    # Sin variación de color: los párpados deben fundirse con la piel cuando están en reposo
    h = Constructor(paleta, semilla=23, variacion=0.0)
    cx = 0.0
    cz = sum(p[1] for p in CARA) / len(CARA)
    pts = []
    # La silueta de frente es la cara hexagonal del boceto; el frente es un plano donde van los rasgos
    for ex, ez, y in ((0.86, 0.93, CARA_Y), (1.0, 1.0, -0.075), (1.0, 1.0, 0.02), (0.84, 0.9, 0.105)):
        for x, z in CARA:
            pts.append((cx + (x - cx) * ex, y, cz + (z - cz) * ez))
    for i in range(8):  # cráneo: queda dentro de la copa del sombrero (radio 0,09 a z 1,51)
        a = math.tau * i / 8
        pts.append((math.cos(a) * 0.080, math.sin(a) * 0.072, 1.505))

    def color_cabeza(c, n):
        # Como en el boceto: la frente es piel; el pelo cubre la nuca y lo que queda bajo la copa
        if c.y > -0.02 or (c.z > 1.49 and n.y > -0.5):
            return 'v_cabello'
        return 'v_piel'

    h.agregar(casco(pts), color_cabeza, 'cabeza')

    # Orejas (68,66)-(72,64)-(72,80)-(68,78)
    for s in (1, -1):
        (x0, z0), (x1, z1) = F(72 if s < 0 else 128, 64), F(68 if s < 0 else 132, 80)
        oreja = [(x0, -0.012, z0), (x0, 0.022, z0), (x0, -0.010, z1), (x0, 0.018, z1),
                 (x1, -0.004, z0 - 0.006), (x1, 0.014, z0 - 0.006), (x1, 0.004, z1 + 0.004)]
        h.agregar(casco(oreja), 'v_piel_sombra', 'cabeza')
    # Flequillo en las sienes (70,50)-(86,50)-(77,70)-(68,64) y su espejo
    for mech in ([F(70, 50), F(86, 50), F(77, 70), F(68, 64)], [F(114, 50), F(130, 50), F(132, 64), F(123, 70)]):
        frente = [(x, CARA_Y - 0.006, z) for x, z in mech]
        h.agregar(casco(frente + [(x, CARA_Y + 0.03, z) for x, z in mech]), 'v_cabello', 'cabeza')
    # Nariz (100,78)-(104,87)-(98,87)
    _, zn0 = F(0, 78)
    _, zn1 = F(0, 87)
    xn = 3.2 * ESCALA
    nariz = [(0, CARA_Y + 0.001, zn0), (xn, CARA_Y + 0.001, zn1), (-xn, CARA_Y + 0.001, zn1), (0, CARA_Y - 0.012, zn1 + 0.006)]
    h.agregar(casco(nariz), 'v_piel_sombra', 'cabeza')
    # Rubor de las mejillas
    for s in (1, -1):
        bx, bz = F(100 + 18 * s, 85)
        h.agregar(prisma(8, 1.0, 0.001, giro=22.5), 'v_rubor', 'cabeza',
                  colocar((bx, CARA_Y - 0.0006, bz), (90, 0, 0), (5.0 * ESCALA, 2.6 * ESCALA, 1)))

    # Ojos, brillos, párpados, pestañas y cejas (lado 'izq' = +X)
    for s, lado in ((1, 'izq'), (-1, 'der')):
        ox = OJO_X * s
        h.agregar(prisma(10, 1.0, 0.003, giro=18), 'v_ojos', 'cabeza',
                  colocar((ox, CARA_Y - 0.0015, OJO_Z), (90, 0, 0), (OJO_RX, OJO_RZ, 1)), etiqueta=f'ojo_{lado}')
        h.agregar(prisma(8, 1.3 * ESCALA, 0.0008), 'v_brillo_ojo', 'cabeza',
                  colocar((ox + 1.6 * ESCALA, CARA_Y - 0.00345, OJO_Z + 2.2 * ESCALA), (90, 0, 0)), etiqueta=f'ojo_{lado}')
        ancho = OJO_RX * 2 + 0.008
        # Párpados sin bisel: en reposo no deben dibujar ningún borde sobre la piel
        # El párpado superior es corto para no tapar la ceja; al parpadear, su borde baja 2 radios
        h.agregar(caja_biselada(ancho, 0.003, OJO_RZ * 0.55, 0.0001), 'v_piel', 'cabeza',
                  colocar((ox, CARA_Y - 0.0055, OJO_Z + OJO_RZ + OJO_RZ * 0.275)), etiqueta=f'parpado_sup_{lado}')
        h.agregar(caja_biselada(ancho + 0.002, 0.0035, 0.0028, 0.0001), 'v_ojos', 'cabeza',
                  colocar((ox, CARA_Y - 0.0058, OJO_Z + OJO_RZ + 0.0014)), etiqueta=f'pestana_{lado}')
        h.agregar(caja_biselada(ancho, 0.003, OJO_RZ * 0.9, 0.0001), 'v_piel', 'cabeza',
                  colocar((ox, CARA_Y - 0.0055, OJO_Z - OJO_RZ - OJO_RZ * 0.45)), etiqueta=f'parpado_inf_{lado}')
        # Ceja del boceto: (81,65)-(94,62.5)-(94.5,65.5)-(81.5,68), con el extremo interior un poco más alto
        # La ceja va por delante de los párpados para que ninguno la tape
        h.agregar(caja_biselada(13.5 * ESCALA, 0.006, 3.0 * ESCALA, 0.0015), 'v_cabello_sombra', 'cabeza',
                  colocar((F(112.4, 0)[0] * s, CARA_Y - 0.0095, CEJA_Z), (0, 8.4 * s, 0)), etiqueta=f'ceja_{lado}')

    # Boca: abanico de 9 vértices en el plano de la cara
    centro = Vector((0, CARA_Y - 0.0016, BOCA_Z))
    eu, ev, n = Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, -1, 0))
    verts = [centro + eu * u + ev * v for _, u, v in BOCA_BASE] + [centro.copy()]
    caras = orientar_hacia(verts, [(8, i, (i + 1) % 8) for i in range(8)], n)
    indices = h.agregar((verts, caras), 'v_boca', 'cabeza', etiqueta='boca')
    for i, (nombre, u, v) in zip(indices, BOCA_BASE + [('centro', 0.0, 0.0)]):
        h.meta[i] = (nombre, u, v)
    h.meta['marco_boca'] = (centro - n * 0.0, eu, ev, n * 0.0)
    return h


def formas_victoria(h):
    """Calcula las 17 formas de la cara a partir de las piezas etiquetadas."""
    v = h.v
    formas = {}

    def nueva(nombre):
        formas[nombre] = {}
        return formas[nombre]

    def mover(f, indices, fn):
        for i in indices:
            f[i] = fn(v[i].copy(), i)

    def dz(d):
        def fn(p, _i):
            p.z += d
            return p
        return fn

    def mitad(indices, abajo):
        centro_z = sum(v[i].z for i in indices) / len(indices)
        return [i for i in indices if (v[i].z < centro_z) == abajo]

    lados = ('izq', 'der')
    # Párpados (proporcionales al tamaño del ojo)
    for nombre, baja in (('parpadeo', 2 * OJO_RZ), ('parpado_sup', 0.75 * OJO_RZ)):
        f = nueva(nombre)
        for lado in lados:
            mover(f, mitad(h.etiquetas[f'parpado_sup_{lado}'], True), dz(-baja))
            mover(f, h.etiquetas[f'pestana_{lado}'], dz(-baja))
    f = nueva('parpado_inf')
    for lado in lados:
        mover(f, mitad(h.etiquetas[f'parpado_inf_{lado}'], False), dz(0.65 * OJO_RZ))

    # Cejas: 'interior' = extremo cercano a la nariz
    cx_ceja = abs(F(112.4, 0)[0])
    medio = 13.5 * ESCALA / 2

    def ceja(alto, inclinacion):
        def fn(p, _i):
            interior = (cx_ceja - p.x) / medio if p.x > 0 else (p.x + cx_ceja) / medio
            p.z += alto + inclinacion * interior
            return p
        return fn

    for nombre, alto, incl in (('cejas_arriba', 0.014, 0.0), ('cejas_ceno', -0.004, -0.010),
                               ('cejas_tristes', 0.004, 0.010)):
        f = nueva(nombre)
        for lado in lados:
            mover(f, h.etiquetas[f'ceja_{lado}'], ceja(alto, incl))

    # Mirada
    for nombre, d in (('mirada_izq', 0.005), ('mirada_der', -0.005)):
        f = nueva(nombre)
        for lado in lados:
            def fx(p, _i, d=d):
                p.x += d
                return p
            mover(f, h.etiquetas[f'ojo_{lado}'], fx)

    # Boca: cada forma transforma (u, v) de los 8 puntos del contorno
    centro, eu, ev, _ = h.meta['marco_boca']

    def pos(u, vv):
        return centro + eu * u + ev * vv

    def boca(nombre, fn):
        f = nueva(nombre)
        nuevos = {}
        for i in h.etiquetas['boca']:
            parte, u, vv = h.meta[i]
            if parte == 'centro':
                continue
            nuevos[parte] = fn(parte, u, vv)
        cv = (nuevos['sup_c'][1] + nuevos['inf_c'][1]) / 2
        for i in h.etiquetas['boca']:
            parte = h.meta[i][0]
            u, vv = (0.0, cv) if parte == 'centro' else nuevos[parte]
            f[i] = pos(u, vv)

    def es_esq(p):
        return p.startswith('esq')

    def es_sup(p):
        return p.startswith('sup')

    def ajuste(escala_esq=1.0, escala_lado=1.0, esq_v=0.0, sup=0.0, sup_c=0.0, inf=0.0, inf_c=0.0):
        def fn(parte, u, vv):
            if es_esq(parte):
                return (u * escala_esq, vv + esq_v)
            if parte == 'sup_c':
                return (u, vv + sup_c)
            if parte == 'inf_c':
                return (u, vv + inf_c)
            if es_sup(parte):
                return (u * escala_lado, vv + sup)
            return (u * escala_lado, vv + inf)
        return fn

    boca('boca_ancha', ajuste(1.30, 1.30, inf=0.001, inf_c=0.002))
    boca('boca_sonrisa', ajuste(1.10, 1.05, esq_v=0.007, sup=0.0025, sup_c=0.0005, inf=0.0, inf_c=-0.001))
    boca('boca_triste', ajuste(0.92, 0.95, esq_v=-0.006, sup=-0.0005, sup_c=0.001, inf=0.002, inf_c=0.004))
    boca('vis_A', ajuste(0.85, 0.92, esq_v=-0.002, sup=0.002, sup_c=0.0025, inf=-0.008, inf_c=-0.010))
    boca('vis_E', ajuste(1.15, 1.10, sup=0.001, sup_c=0.001, inf=-0.004, inf_c=-0.004))
    boca('vis_I', ajuste(1.25, 1.18, esq_v=0.0015, sup=0.0005, sup_c=0.0005, inf=0.0, inf_c=0.0))
    boca('vis_O', ajuste(0.50, 0.60, sup=0.003, sup_c=0.0045, inf=-0.006, inf_c=-0.007))
    boca('vis_U', ajuste(0.38, 0.45, sup=0.0015, sup_c=0.002, inf=-0.001, inf_c=-0.001))
    boca('vis_MBP', lambda parte, u, vv: (u * (0.96 if es_esq(parte) else 1.0), vv * 0.15))

    assert set(formas.keys()) == set(FORMAS_CARA), sorted(formas.keys())
    return {nombre: formas[nombre] for nombre in FORMAS_CARA}


def construir_victoria(paleta):
    """Crea la armadura, el cuerpo y la cabeza de Victoria. Devuelve (armadura, cuerpo, cabeza)."""
    arm = crear_armadura('victoria', huesos_victoria())
    arm['personaje'] = 'victoria'
    arm['altura_m'] = 1.65
    toon = material_toon('victoria_toon')
    gema = material_emisivo('victoria_gema', paleta['gema_pulso'])

    cuerpo_k = construir_cuerpo(paleta)
    cuerpo = crear_malla('victoria_cuerpo', cuerpo_k, [toon, gema], arm)

    cabeza_k = construir_cabeza(paleta)
    cabeza = crear_malla('victoria_cabeza', cabeza_k, [toon], arm)
    agregar_formas(cabeza, formas_victoria(cabeza_k))
    cabeza['formas'] = ','.join(FORMAS_CARA)
    return arm, cuerpo, cabeza
