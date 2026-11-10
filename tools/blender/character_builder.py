"""Constructores de personajes. Cada uno genera:
  - un esqueleto (armadura) con nombres fijos que lee el ProceduralAnimator de Three.js,
  - una malla de cuerpo con pesos rígidos (cada vértice obedece al 100 % a un hueso),
  - y, si el personaje habla, una malla de cabeza aparte con formas de expresión (shape keys).

Medidas en metros. El personaje mira hacia -Y; su izquierda ('izq') es +X.
"""
import math

from mathutils import Vector

from common import (Constructor, agregar_formas, caja_biselada, casco, colocar, crear_armadura,
                    crear_malla, elipsoide, material_emisivo, material_toon, orientar_hacia,
                    orientar_radial, prisma, segmento)

# ---------------------------------------------------------------------------
# VICTORIA SOLANO — 1,65 m, 5,5 cabezas
# ---------------------------------------------------------------------------

CABEZA_Z = 1.40          # centro de la cabeza
OJO_Z = 1.375
OJO_X = 0.049
CARA_Y = -0.118          # plano frontal de la cara
OJO_RX, OJO_RZ = 0.0096, 0.0128
CEJA_Z = OJO_Z + 0.040

TRENZA_JUNTAS = [
    (0.000, 0.100, 1.345),
    (0.003, 0.170, 1.270),
    (0.007, 0.270, 1.195),
    (0.011, 0.295, 1.115),
    (0.015, 0.300, 1.035),
    (0.019, 0.262, 0.955),
    (0.022, 0.222, 0.880),
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
    b('torso', (0, 0, 0.88), (0, 0, 1.22), 'cadera')
    b('cabeza', (0, 0, 1.27), (0, 0, 1.50), 'torso')
    b('sombrero', (0, 0, 1.46), (0, 0, 1.62), 'cabeza')
    for lado, s in (('izq', 1), ('der', -1)):
        x = 0.158 * s
        b(f'brazo_sup_{lado}', (0.150 * s, 0, 1.20), (x, 0, 0.95), 'torso')
        b(f'brazo_inf_{lado}', (x, 0, 0.95), (x, 0, 0.79), f'brazo_sup_{lado}')
        b(f'mano_{lado}', (x, 0, 0.79), (x, 0, 0.68), f'brazo_inf_{lado}')
    for lado, s in (('izq', 1), ('der', -1)):
        x = 0.055 * s
        b(f'pierna_sup_{lado}', (x, 0, 0.84), (x, 0, 0.54), 'cadera')
        b(f'pierna_inf_{lado}', (x, 0, 0.54), (x, 0, 0.08), f'pierna_sup_{lado}')
        b(f'bota_{lado}', (x, 0, 0.08), (x, -0.15, 0.03), f'pierna_inf_{lado}')
    padre = 'cabeza'
    for k in range(6):
        b(f'trenza_{k + 1}', TRENZA_JUNTAS[k], TRENZA_JUNTAS[k + 1], padre)
        padre = f'trenza_{k + 1}'
    b('poncho_delante', (0, -0.10, 1.24), (0, -0.14, 0.86), 'torso')
    b('poncho_detras', (0, 0.10, 1.24), (0, 0.15, 0.86), 'torso')
    b('mochila', (0, 0.19, 1.22), (0, 0.19, 0.98), 'torso')
    b('brazalete', (-0.158, 0, 0.87), (-0.158, 0, 0.82), 'brazo_inf_der')
    return h


# ---------------------------------------------------------------------------
# Cuerpo
# ---------------------------------------------------------------------------

def _poncho(c):
    """Poncho en rombo: cuello estrecho, hombros que cubren los brazos y punta delante y detrás."""
    dirs = [0, 45, 90, 135, 180, 225, 270, 315]   # 0 = delante (-Y), 90 = izquierda (+X)

    def d(k):
        a = math.radians(dirs[k])
        return Vector((math.sin(a), -math.cos(a), 0))

    cuello = [Vector((d(k).x * 0.078, d(k).y * 0.072, 1.285)) for k in range(8)]
    hombro_xy = [(0, -0.115), (0.19, -0.10), (0.225, 0), (0.19, 0.10),
                 (0, 0.118), (-0.19, 0.10), (-0.225, 0), (-0.19, -0.10)]
    hombro = [Vector((x, y, 1.225 if k in (2, 6) else 1.245)) for k, (x, y) in enumerate(hombro_xy)]
    puntas = {0: Vector((0, -0.150, 0.800)), 2: Vector((0.235, 0, 0.975)),
              4: Vector((0, 0.158, 0.830)), 6: Vector((-0.235, 0, 0.975))}
    borde = []
    for k in range(8):
        if k in puntas:
            borde.append(puntas[k])
        else:
            m = (puntas[k - 1] + puntas[(k + 1) % 8]) / 2
            borde.append(m + d(k) * 0.012)
    filas = [cuello, hombro]
    for t in (0.35, 0.65, 0.80, 0.84, 0.88, 1.0):
        fila = []
        for k in range(8):
            p = hombro[k].lerp(borde[k], t)
            p = p + d(k) * (0.012 * math.sin(math.pi * t))
            fila.append(p)
        filas.append(fila)
    verts = [p for fila in filas for p in fila]
    caras = []
    for r in range(len(filas) - 1):
        for k in range(8):
            caras.append((r * 8 + k, r * 8 + (k + 1) % 8, (r + 1) * 8 + (k + 1) % 8, (r + 1) * 8 + k))
    caras = orientar_radial(verts, caras)
    bandas = ['v_poncho', 'v_poncho', 'v_poncho', 'v_poncho', 'v_ribete_oscuro', 'v_poncho', 'v_ribete']
    colores = [bandas[r] for r in range(len(filas) - 1) for _ in range(8)]

    def hueso(i, _p):
        r, k = divmod(i, 8)
        if r <= 1 or k in (2, 6):
            return 'torso'
        return 'poncho_delante' if k in (7, 0, 1) else 'poncho_detras'

    # Exterior, interior (sombra) y tapa del cuello
    c.agregar((verts, caras), colores, hueso)
    interior = [tuple(reversed(cf)) for cf in caras]
    c.agregar((verts, interior), 'v_poncho_sombra', hueso)
    tapa = orientar_hacia(verts, [tuple(range(8))], (0, 0, 1))
    c.agregar((verts, tapa), 'v_poncho_sombra', hueso)


def _brazo(c, s, lado):
    x = 0.158 * s
    c.agregar(elipsoide(0.040, 0.042, 0.036, 8, 4), 'v_camisa', f'brazo_sup_{lado}', colocar((0.153 * s, 0, 1.19)))
    c.agregar(caja_biselada(0.064, 0.070, 0.26, 0.02, conico=0.9), 'v_camisa', f'brazo_sup_{lado}',
              colocar((x, 0, 1.07)))
    c.agregar(caja_biselada(0.071, 0.075, 0.042, 0.012), 'v_camisa_luz', f'brazo_inf_{lado}', colocar((x, 0, 0.935)))
    c.agregar(caja_biselada(0.050, 0.054, 0.16, 0.015, conico=0.86), 'v_piel', f'brazo_inf_{lado}',
              colocar((x, 0, 0.85)))
    # Mano en manopla, con la palma hacia el cuerpo, y pulgar hacia delante
    mano = [(x + dx * s, y, z) for dx, y, z in (
        (-0.016, -0.029, 0.786), (0.014, -0.029, 0.786), (-0.016, 0.027, 0.786), (0.014, 0.027, 0.786),
        (-0.018, -0.033, 0.735), (0.016, -0.033, 0.735), (-0.018, 0.031, 0.735), (0.016, 0.031, 0.735),
        (-0.013, -0.024, 0.680), (0.011, -0.024, 0.680), (-0.013, 0.022, 0.680), (0.011, 0.022, 0.680),
        (-0.008, -0.014, 0.670), (0.006, -0.014, 0.670), (-0.008, 0.012, 0.670), (0.006, 0.012, 0.670))]
    c.agregar(casco(mano), 'v_piel_luz', f'mano_{lado}')
    pulgar = [(x + dx * s, y, z) for dx, y, z in (
        (-0.014, -0.030, 0.775), (0.004, -0.030, 0.775), (-0.012, -0.030, 0.745), (0.004, -0.030, 0.748),
        (-0.008, -0.050, 0.752), (0.000, -0.050, 0.752), (-0.006, -0.054, 0.740))]
    c.agregar(casco(pulgar), 'v_piel', f'mano_{lado}')


def _pierna(c, s, lado):
    x = 0.055 * s
    # 'conico' escala la cara de arriba: el muslo y la pantorrilla son más anchos arriba
    c.agregar(caja_biselada(0.092, 0.104, 0.32, 0.022, conico=1.15), 'v_pantalon', f'pierna_sup_{lado}',
              colocar((x, 0, 0.69)))
    c.agregar(caja_biselada(0.084, 0.094, 0.30, 0.020, conico=1.08), 'v_pantalon', f'pierna_inf_{lado}',
              colocar((x, 0, 0.42)))
    c.agregar(caja_biselada(0.062, 0.012, 0.060, 0.004), 'v_pantalon_sombra', f'pierna_inf_{lado}',
              colocar((x, -0.053, 0.535)))
    c.agregar(caja_biselada(0.106, 0.118, 0.24, 0.022, conico=1.06), 'v_botas', f'pierna_inf_{lado}',
              colocar((x, 0, 0.19)))
    c.agregar(caja_biselada(0.116, 0.128, 0.042, 0.010), 'v_botas_luz', f'pierna_inf_{lado}',
              colocar((x, 0, 0.30)))
    pie = [(x + dx, y, z) for dx, y, z in (
        (-0.048, 0.055, 0.015), (0.048, 0.055, 0.015), (-0.048, 0.055, 0.090), (0.048, 0.055, 0.090),
        (-0.050, -0.080, 0.015), (0.050, -0.080, 0.015), (-0.045, -0.060, 0.085), (0.045, -0.060, 0.085),
        (-0.040, -0.160, 0.015), (0.040, -0.160, 0.015), (-0.030, -0.155, 0.050), (0.030, -0.155, 0.050),
        (0.000, -0.175, 0.020))]
    c.agregar(casco(pie), 'v_botas', f'bota_{lado}')
    c.agregar(caja_biselada(0.106, 0.236, 0.018, 0.006), 'v_suela', f'bota_{lado}', colocar((x, -0.055, 0.009)))


def _sombrero(c):
    def tono(_c, n):
        if n.z > 0.5:
            return 'v_sombrero_luz'
        if n.z < -0.5:
            return 'v_sombrero_sombra'
        return 'v_sombrero'

    c.agregar(prisma(12, 0.170, 0.012), tono, 'sombrero', colocar((0, 0.004, 1.455), (5, 0, 0)))
    copa = []
    for i in range(12):
        a = 2 * math.pi * i / 12
        copa.append((math.cos(a) * 0.121, math.sin(a) * 0.121, 1.460))
    for i in range(8):
        a = 2 * math.pi * i / 8 + math.pi / 8
        copa.append((math.cos(a) * 0.098, math.sin(a) * 0.092, 1.565))
    copa += [(0, -0.055, 1.588), (0, 0.062, 1.594)]
    c.agregar(casco(copa), tono, 'sombrero')
    c.agregar(prisma(12, 0.124, 0.030, radio_sup=0.121), 'v_ribete_oscuro', 'sombrero', colocar((0, 0, 1.478)))


def _mochila(c):
    c.agregar(caja_biselada(0.200, 0.100, 0.240, 0.025), 'v_mochila', 'mochila', colocar((0, 0.190, 1.090)))
    c.agregar(caja_biselada(0.206, 0.106, 0.090, 0.020), 'v_mochila_luz', 'mochila', colocar((0, 0.191, 1.175)))
    c.agregar(caja_biselada(0.120, 0.020, 0.070, 0.008), 'v_mochila_sombra', 'mochila', colocar((0, 0.245, 1.040)))
    c.agregar(caja_biselada(0.026, 0.012, 0.032, 0.003), 'v_ribete', 'mochila', colocar((0, 0.247, 1.130)))
    m, largo = segmento((-0.115, 0.250, 1.060), (0.165, 0.250, 1.385))
    c.agregar(prisma(8, 0.026, largo), 'v_mapa', 'mochila', m)
    for t in (0.0, 1.0):
        p = Vector((-0.115, 0.250, 1.060)).lerp(Vector((0.165, 0.250, 1.385)), t)
        mm, _ = segmento(p - Vector((0.007, 0, 0.008)), p + Vector((0.007, 0, 0.008)))
        c.agregar(prisma(8, 0.028, 0.012), 'v_mapa_sombra', 'mochila', mm)
    mm, _ = segmento((0.018, 0.25, 1.214), (0.030, 0.25, 1.228))
    c.agregar(prisma(8, 0.028, 0.010), 'v_ribete', 'mochila', mm)
    # Correas: sobre el cuello del poncho y por el pecho
    for s in (1, -1):
        for a, b in (((0.07 * s, -0.098, 1.272), (0.07 * s, 0.0, 1.292)),
                     ((0.07 * s, 0.0, 1.292), (0.07 * s, 0.150, 1.215)),
                     ((0.07 * s, -0.100, 1.272), (0.07 * s, -0.143, 1.080))):
            mm, largo = segmento(a, b)
            c.agregar(caja_biselada(0.030, 0.010, largo, 0.003), 'v_mochila_sombra', 'torso', mm)


def _trenza(c):
    radios = [(0.027, 0.023), (0.026, 0.022), (0.025, 0.021), (0.023, 0.020), (0.021, 0.018), (0.019, 0.016)]
    for k in range(6):
        a, b = Vector(TRENZA_JUNTAS[k]), Vector(TRENZA_JUNTAS[k + 1])
        mm, largo = segmento(a, b)
        rx, ry = radios[k]
        tono = 'v_cabello' if k % 2 == 0 else 'v_cabello_luz'
        c.agregar(elipsoide(rx, ry, largo * 0.62, 6, 4), tono, f'trenza_{k + 1}', mm)
    fin = Vector(TRENZA_JUNTAS[6])
    mm, _ = segmento(fin + Vector((0, 0.008, 0.012)), fin - Vector((0, 0.008, 0.012)))
    c.agregar(prisma(6, 0.017, 0.014), 'v_ribete', 'trenza_6', mm)
    mechon = [tuple(fin + Vector(p)) for p in (
        (-0.016, 0, -0.008), (0.016, 0, -0.008), (0, 0.014, -0.008), (0, -0.014, -0.008),
        (-0.020, 0.004, -0.050), (0.018, -0.004, -0.052), (0.002, 0.012, -0.062), (0.0, -0.01, -0.058))]
    c.agregar(casco(mechon), 'v_cabello', 'trenza_6')


def _brazalete(c):
    x = -0.158
    c.agregar(prisma(8, 0.033, 0.034, giro=22.5), 'v_ribete', 'brazalete', colocar((x, 0, 0.848)))
    c.agregar(prisma(8, 0.034, 0.010, giro=22.5), 'v_oro_sombra', 'brazalete', colocar((x, 0, 0.828)))
    gema = [(x - 0.031, 0, 0.848 + 0.019), (x - 0.031, 0, 0.848 - 0.019),
            (x - 0.031, -0.014, 0.848), (x - 0.031, 0.014, 0.848), (x - 0.043, 0, 0.848)]
    c.agregar(casco(gema), 'gema_pulso', 'brazalete', material=1)


def construir_cuerpo(paleta):
    c = Constructor(paleta, semilla=11, variacion=0.03)
    # Cadera, cinturón y bolsa
    c.agregar(caja_biselada(0.224, 0.155, 0.130, 0.020, conico=0.95), 'v_pantalon', 'cadera', colocar((0, 0, 0.815)))
    c.agregar(caja_biselada(0.224, 0.164, 0.030, 0.008), 'v_cinturon', 'cadera', colocar((0, 0, 0.858)))
    c.agregar(caja_biselada(0.036, 0.072, 0.076, 0.010), 'v_mochila', 'cadera', colocar((0.123, 0, 0.810)))
    c.agregar(caja_biselada(0.040, 0.077, 0.022, 0.006), 'v_mochila_luz', 'cadera', colocar((0.125, 0, 0.846)))
    # Torso y cuello
    c.agregar(caja_biselada(0.200, 0.140, 0.380, 0.030, conico=1.12), 'v_camisa', 'torso', colocar((0, 0, 1.05)))
    c.agregar(prisma(8, 0.040, 0.090, giro=22.5), 'v_piel_sombra', 'torso', colocar((0, 0.005, 1.270)))
    c.agregar(prisma(8, 0.052, 0.030, radio_sup=0.046, giro=22.5), 'v_poncho_sombra', 'torso',
              colocar((0, 0, 1.290)))
    _poncho(c)
    for s, lado in ((1, 'izq'), (-1, 'der')):
        _brazo(c, s, lado)
        _pierna(c, s, lado)
    _brazalete(c)
    _sombrero(c)
    _mochila(c)
    _trenza(c)
    return c


# ---------------------------------------------------------------------------
# Cabeza con expresiones
# ---------------------------------------------------------------------------

def _anillo(z, fy, wf, w, sfy, sby, by, wb):
    """8 puntos: frente plano, laterales delanteros y traseros, nuca."""
    return [(-wf, fy, z), (wf, fy, z), (w, sfy, z), (w, sby, z), (wb, by, z), (-wb, by, z), (-w, sby, z), (-w, sfy, z)]


def _marco_boca():
    """Plano inclinado de la mandíbula donde vive la boca: devuelve (centro, eje_u, eje_v, normal)."""
    j = Vector((0, -0.100, CABEZA_Z - 0.095))
    k = Vector((0, CARA_Y, CABEZA_Z - 0.040))
    ev = (k - j).normalized()
    eu = Vector((1, 0, 0))
    n = eu.cross(ev)
    centro = j + ev * ((1.317 - j.z) / ev.z)
    return centro, eu, ev, n


BOCA_BASE = [  # (nombre, u, v) en metros sobre el plano de la boca
    ('esq_d', -0.024, 0.0), ('sup_d', -0.012, 0.0024), ('sup_c', 0.0, 0.0028), ('sup_i', 0.012, 0.0024),
    ('esq_i', 0.024, 0.0), ('inf_i', 0.012, -0.0024), ('inf_c', 0.0, -0.0030), ('inf_d', -0.012, -0.0024),
]


def construir_cabeza(paleta):
    # Sin variación de color: los párpados deben fundirse con la piel cuando están en reposo
    h = Constructor(paleta, semilla=23, variacion=0.0)
    z0 = CABEZA_Z
    pts = []
    pts += _anillo(z0 + 0.135, -0.060, 0.040, 0.070, -0.030, 0.040, 0.080, 0.040)
    pts += _anillo(z0 + 0.060, CARA_Y, 0.070, 0.112, -0.070, 0.070, 0.115, 0.070)
    pts += _anillo(z0 - 0.040, CARA_Y, 0.075, 0.112, -0.070, 0.070, 0.100, 0.065)
    pts += _anillo(z0 - 0.095, -0.100, 0.045, 0.080, -0.060, 0.050, 0.070, 0.040)
    pts += _anillo(z0 - 0.135, -0.085, 0.022, 0.030, -0.060, -0.030, -0.010, 0.020)

    def color_cabeza(c, _n):
        lz = c.z - z0
        if lz > 0.075 or c.y > 0.015:
            return 'v_cabello'
        if abs(c.x) > 0.09 and lz > -0.03 and c.y > -0.09:
            return 'v_cabello'
        return 'v_piel'

    h.agregar(casco(pts), color_cabeza, 'cabeza')
    for s in (1, -1):
        oreja = [(0.108 * s, -0.012, 1.398), (0.108 * s, 0.016, 1.398), (0.108 * s, -0.010, 1.356),
                 (0.108 * s, 0.012, 1.356), (0.120 * s, -0.006, 1.392), (0.120 * s, 0.012, 1.388),
                 (0.118 * s, 0.002, 1.360)]
        h.agregar(casco(oreja), 'v_piel_sombra', 'cabeza')
        frente = [(0.025 * s, -0.124, 1.465), (0.108 * s, -0.113, 1.465), (0.114 * s, -0.104, 1.405),
                  (0.078 * s, -0.123, 1.430)]
        mechon = frente + [(p[0], p[1] + 0.020, p[2]) for p in frente]
        h.agregar(casco(mechon), 'v_cabello', 'cabeza')
    nariz = [(0, CARA_Y - 0.0005, 1.384), (0.010, CARA_Y - 0.0005, 1.354), (-0.010, CARA_Y - 0.0005, 1.354),
             (0, -0.129, 1.357), (0.005, -0.1235, 1.352), (-0.005, -0.1235, 1.352)]
    h.agregar(casco(nariz), 'v_piel', 'cabeza')

    # Ojos, brillos, párpados, pestañas y cejas (lado 'izq' = +X)
    for s, lado in ((1, 'izq'), (-1, 'der')):
        cx = OJO_X * s
        h.agregar(prisma(8, 1.0, 0.003, giro=22.5), 'v_ojos', 'cabeza',
                  colocar((cx, CARA_Y - 0.0015, OJO_Z), (90, 0, 0), (OJO_RX, OJO_RZ, 1)), etiqueta=f'ojo_{lado}')
        h.agregar(prisma(6, 0.0028, 0.0008), 'v_brillo_ojo', 'cabeza',
                  colocar((cx + 0.003, CARA_Y - 0.00345, OJO_Z + 0.004), (90, 0, 0)), etiqueta=f'ojo_{lado}')
        # Párpados sin bisel: en reposo no deben dibujar ningún borde sobre la piel
        h.agregar(caja_biselada(0.026, 0.003, 0.013, 0.0001), 'v_piel', 'cabeza',
                  colocar((cx, CARA_Y - 0.0055, OJO_Z + OJO_RZ + 0.0065)), etiqueta=f'parpado_sup_{lado}')
        h.agregar(caja_biselada(0.027, 0.0035, 0.0024, 0.0001), 'v_ojos', 'cabeza',
                  colocar((cx, CARA_Y - 0.0058, OJO_Z + OJO_RZ + 0.0012)), etiqueta=f'pestana_{lado}')
        h.agregar(caja_biselada(0.024, 0.003, 0.008, 0.0001), 'v_piel', 'cabeza',
                  colocar((cx, CARA_Y - 0.0055, OJO_Z - OJO_RZ - 0.004)), etiqueta=f'parpado_inf_{lado}')
        h.agregar(caja_biselada(0.032, 0.006, 0.0065, 0.0015), 'v_cabello_sombra', 'cabeza',
                  colocar((0.050 * s, CARA_Y - 0.003, CEJA_Z)), etiqueta=f'ceja_{lado}')

    # Boca: abanico de 9 vértices sobre el plano de la mandíbula
    centro, eu, ev, n = _marco_boca()

    def pos(u, v):
        return centro + eu * u + ev * v + n * 0.0016

    verts = [pos(u, v) for _, u, v in BOCA_BASE] + [pos(0, 0)]
    caras = orientar_hacia(verts, [(8, i, (i + 1) % 8) for i in range(8)], n)
    indices = h.agregar((verts, caras), 'v_boca', 'cabeza', etiqueta='boca')
    for i, (nombre, u, v) in zip(indices, BOCA_BASE + [('centro', 0.0, 0.0)]):
        h.meta[i] = (nombre, u, v)
    h.meta['marco_boca'] = (centro, eu, ev, n)
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
    # Párpados
    for nombre, baja in (('parpadeo', 2 * OJO_RZ), ('parpado_sup', 0.009)):
        f = nueva(nombre)
        for lado in lados:
            mover(f, mitad(h.etiquetas[f'parpado_sup_{lado}'], True), dz(-baja))
            mover(f, h.etiquetas[f'pestana_{lado}'], dz(-baja))
    f = nueva('parpado_inf')
    for lado in lados:
        mover(f, mitad(h.etiquetas[f'parpado_inf_{lado}'], False), dz(0.008))

    # Cejas: 'interior' = extremo cercano a la nariz
    def ceja(alto, inclinacion):
        def fn(p, _i):
            cx = 0.050 if p.x > 0 else -0.050
            interior = (cx - p.x) / 0.016 if p.x > 0 else (p.x - cx) / 0.016
            p.z += alto + inclinacion * interior
            return p
        return fn

    for nombre, alto, incl in (('cejas_arriba', 0.012, 0.0), ('cejas_ceno', -0.003, -0.008),
                               ('cejas_tristes', 0.003, 0.008)):
        f = nueva(nombre)
        for lado in lados:
            mover(f, h.etiquetas[f'ceja_{lado}'], ceja(alto, incl))

    # Mirada
    for nombre, d in (('mirada_izq', 0.0035), ('mirada_der', -0.0035)):
        f = nueva(nombre)
        for lado in lados:
            def fx(p, _i, d=d):
                p.x += d
                return p
            mover(f, h.etiquetas[f'ojo_{lado}'], fx)

    # Boca: cada forma transforma (u, v) de los 8 puntos del contorno
    centro, eu, ev, n = h.meta['marco_boca']

    def pos(u, vv):
        return centro + eu * u + ev * vv + n * 0.0016

    def boca(nombre, fn):
        f = nueva(nombre)
        nuevos = {}
        for i in h.etiquetas['boca']:
            parte, u, vv = h.meta[i]
            if parte == 'centro':
                continue
            nuevos[parte] = fn(parte, u, vv)
        cu = 0.0
        cv = (nuevos['sup_c'][1] + nuevos['inf_c'][1]) / 2
        for i in h.etiquetas['boca']:
            parte = h.meta[i][0]
            u, vv = (cu, cv) if parte == 'centro' else nuevos[parte]
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

    boca('boca_ancha', ajuste(1.33, 1.33))
    boca('boca_sonrisa', ajuste(1.08, 1.04, esq_v=0.0065, sup=0.0025, sup_c=0.0005, inf=-0.0005, inf_c=-0.002))
    boca('boca_triste', ajuste(0.95, 0.97, esq_v=-0.0055, sup=-0.001, sup_c=0.0008, inf=-0.0035, inf_c=-0.0015))
    boca('vis_A', ajuste(0.85, 0.92, esq_v=-0.002, sup=0.002, sup_c=0.0025, inf=-0.010, inf_c=-0.013))
    boca('vis_E', ajuste(1.15, 1.10, sup=0.001, sup_c=0.001, inf=-0.006, inf_c=-0.007))
    boca('vis_I', ajuste(1.25, 1.18, esq_v=0.0015, sup=0.0005, sup_c=0.0005, inf=-0.003, inf_c=-0.0035))
    boca('vis_O', ajuste(0.50, 0.60, sup=0.003, sup_c=0.0045, inf=-0.008, inf_c=-0.011))
    boca('vis_U', ajuste(0.38, 0.45, sup=0.0015, sup_c=0.002, inf=-0.004, inf_c=-0.005))
    boca('vis_MBP', lambda parte, u, vv: (u * (0.96 if es_esq(parte) else 1.0), vv * 0.25))

    assert list(formas.keys()) and set(formas.keys()) == set(FORMAS_CARA), sorted(formas.keys())
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
