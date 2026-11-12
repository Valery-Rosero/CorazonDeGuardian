"""Árboles de la selva construidos desde la hoja de escenarios (tablero «Árboles»).

Cada especie se arma con las coordenadas de su dibujo: (u, v) en píxeles del SVG, con el pie del árbol
en (centro_u, suelo_v). La escala convierte píxeles a metros según la altura del ejemplar, así que el árbol
en 3D tiene las mismas proporciones que el dibujo. Una semilla cambia altura, giro, almohadas y posición
de las piezas: nunca hay dos iguales.

  ceiba(...)       tronco de 8 caras, 4 raíces en aleta, vetas, 2 ramas, lianas y 7–9 almohadas
  palma(...)       8 anillos, 8 hojas de dos tonos con nervio central y racimo de frutos
  arbol_joven(...) tronco corto, 2 raíces y copa de 5 almohadas (plantilla para InstancedMesh)
"""
import math

from mathutils import Matrix, Vector

from common import SOL, casco, elipsoide, orientar_hacia, orientar_hacia_afuera, prisma, segmento, tres_tonos

tono_tronco = tres_tonos('selva_tronco_luz', 'selva_tronco', 'selva_tronco_sombra', umbral_luz=0.3, umbral_sombra=-0.3)


def tono_almohada(_c, n):
    """Como en el dibujo: arriba verde claro con la cresta hacia el sol, el costado de arriba verde medio y
    toda la mitad de abajo oscura. El borde dorado que mira al sol lo pone el material 'copa' en el juego."""
    d = n.dot(SOL)
    if n.z < -0.6:
        return 'selva_copa_1'
    if n.z < 0:
        return 'selva_copa_2' if d > 0.45 else 'selva_copa_1'
    if n.z > 0.7:
        return 'selva_copa_luz' if d > 0.7 else 'selva_copa_3'
    return 'selva_copa_3' if d > 0.1 else 'selva_copa_2'


class _Lienzo:
    """Convierte coordenadas del dibujo a metros y aplica la posición y el giro del árbol."""

    def __init__(self, base, giro, escala, centro_u, suelo_v):
        self.m = Matrix.Translation(Vector(base)) @ Matrix.Rotation(math.radians(giro), 4, 'Z')
        self.s = escala
        self.cu, self.sv = centro_u, suelo_v

    def p(self, u, v, prof=0.0):
        """Punto del dibujo (u, v) con profundidad en píxeles (negativa = hacia el frente del dibujo).
        El dibujo se ve tal cual desde la cámara del juego, que mira hacia -Y: su frente queda en +Y
        y su derecha en -X."""
        return self.m @ Vector((-(u - self.cu) * self.s, -prof * self.s, (self.sv - v) * self.s))

    def mat(self, local):
        return self.m @ local

    def px(self, n):
        return n * self.s


def _almohada(k, L, cu, cv, rx, ry, prof, giro, rnd, hueso, material=0):
    """Almohada de la copa: de frente es el octágono del dibujo (anillos a -45°, 0° y 45°), de 6 lados en planta."""
    centro = L.p(cu, cv, prof)
    geo = elipsoide(L.px(rx), L.px(rx) * rnd.uniform(0.78, 0.95), L.px(ry), 6, 4)
    k.agregar(geo, tono_almohada, hueso, Matrix.Translation(centro) @ L.m.to_3x3().to_4x4() @
              Matrix.Rotation(math.radians(giro), 4, 'Z'), material=material)


def _bezier(p0, p1, p2, p3, t):
    a = 1 - t
    return tuple(a ** 3 * p0[i] + 3 * a * a * t * p1[i] + 3 * a * t * t * p2[i] + t ** 3 * p3[i] for i in range(2))


def _liana(k, L, curva, prof, hojas, hueso):
    """Liana gruesa (6 px del dibujo) que cuelga en tres tramos, con sus hojitas."""
    pts = [_bezier(*curva, t / 3) for t in range(4)]
    for a, b in zip(pts, pts[1:]):
        m, largo = segmento(L.p(*a, prof), L.p(*b, prof), giro=45)
        k.agregar(prisma(4, L.px(3.2), largo * 1.04, radio_sup=L.px(2.8), tapas=False), 'selva_liana', hueso, m)
    for (u1, v1), (u2, v2), (u3, v3), color in hojas:
        tri = [L.p(u1, v1, prof), L.p(u2, v2, prof - 3), L.p(u3, v3, prof)]
        k.agregar(casco(tri + [L.p((u1 + u2 + u3) / 3, (v1 + v2 + v3) / 3, prof + 2.5)]), color, hueso)


def _aleta(k, L, angulo, alto_px, largo_px, grosor_px, r_tronco_px, hueso):
    """Raíz en aleta: lámina triangular que baja del tronco al suelo."""
    d = Vector((math.cos(angulo), math.sin(angulo), 0))
    t = Vector((-d.y, d.x, 0))
    s = L.s
    loc = []
    for punto, g in (((r_tronco_px * 0.75, alto_px), grosor_px), ((largo_px, 0), grosor_px * 0.45),
                     ((r_tronco_px * 0.75, 0), grosor_px)):
        r, z = punto
        for sg in (1, -1):
            loc.append(L.m @ (d * r * s + t * g * s * sg + Vector((0, 0, z * s))))
    k.agregar(casco(loc), tono_tronco, hueso)


# ---------------------------------------------------------------------------
# Ceiba (dibujo de 420 × 620 px: pie en u=210, suelo en v=600; 489 px = 14 m)
# ---------------------------------------------------------------------------

# (u, v, rx, ry, profundidad) de las 9 almohadas del dibujo, en el orden en que se pintan (atrás → adelante)
CEIBA_ALMOHADAS = [
    (175, 150, 62, 36, 40), (250, 145, 60, 34, -10),                      # piso alto
    (130, 205, 70, 40, 45), (300, 205, 66, 38, 25), (215, 192, 86, 46, -55),  # piso medio
    (85, 258, 66, 36, 15), (340, 262, 60, 34, -15), (175, 262, 78, 40, -70), (262, 258, 74, 38, -50),  # piso bajo
]


def ceiba(k, base, rnd, escala=1.0, giro=None, hueso='escenario', mat_copa=0):
    """Ceiba de 12–16 m (×escala). Devuelve el radio del tronco al pie (para su colisionador)."""
    alto = rnd.uniform(12.0, 16.0) * escala
    L = _Lienzo(base, rnd.uniform(0, 360) if giro is None else giro, alto / 489.0, 210, 600)
    # Tronco: 8 caras en dos tramos, de 33 px de radio al pie a 22 px arriba, con una leve curva
    desvio = rnd.uniform(-5, 5)
    pie, medio, alto_t = L.p(210, 600), L.p(210 + desvio, 450), L.p(210, 300)
    for (a, b, r0, r1) in ((pie, medio, 33, 27.5), (medio, alto_t, 27.5, 22)):
        m, largo = segmento(a, b, giro=rnd.uniform(0, 45))
        k.agregar(prisma(8, L.px(r0), largo * 1.02, radio_sup=L.px(r1), tapas=False), tono_tronco, hueso, m)
    m, largo = segmento(alto_t, L.p(219, 215), giro=10)
    k.agregar(prisma(6, L.px(14), largo, radio_sup=L.px(8), tapas=False), tono_tronco, hueso, m)
    # Vetas talladas: tres costillas oscuras sobre la corteza
    for (u0, v0, u1, v1) in ((196, 560, 199, 430), (222, 580, 220, 450), (204, 390, 205, 320)):
        ang = math.atan2(0, u0 - 210) + rnd.uniform(-0.5, 0.5)
        r = 31 if v0 > 450 else 25
        m, largo = segmento(L.p(210 + math.cos(ang) * r, v0, math.sin(ang) * r - 6),
                            L.p(210 + math.cos(ang) * (r - 3), v1, math.sin(ang) * (r - 3) - 6))
        k.agregar(prisma(4, L.px(2.6), largo, tapas=False), 'selva_tronco_sombra', hueso, m)
    # Cuatro raíces en aleta (en el dibujo se ven dos a los lados y una al frente)
    for j in range(4):
        _aleta(k, L, math.radians(45 + 90 * j + rnd.uniform(-18, 18)), rnd.uniform(62, 78), rnd.uniform(90, 108),
               5.5, 33, hueso)
    # Dos ramas gruesas que abren la copa
    for (u0, v0, u1, v1, r0, r1, prof) in ((198, 314, 124, 256, 8, 5, 10), (225, 328, 307, 254, 8, 5, -12)):
        m, largo = segmento(L.p(u0, v0, 0), L.p(u1, v1, prof), giro=30)
        k.agregar(prisma(6, L.px(r0), largo, radio_sup=L.px(r1), tapas=False), tono_tronco, hueso, m)
    # Lianas que cuelgan de las ramas
    if rnd.random() < 0.85:
        _liana(k, L, ((126, 262), (118, 320), (132, 360), (118, 430)), 10,
               [((122, 330), (106, 338), (120, 343), 'selva_helecho_luz'),
                ((125, 382), (140, 388), (127, 394), 'selva_helecho'),
                ((119, 428), (104, 434), (117, 440), 'selva_helecho_luz')], hueso)
    if rnd.random() < 0.7:
        _liana(k, L, ((306, 258), (318, 300), (306, 342), (322, 402)), -12,
               [((312, 318), (328, 324), (314, 330), 'selva_helecho_luz'),
                ((315, 368), (300, 374), (313, 380), 'selva_helecho')], hueso)
    # Copa: tres pisos de almohadas; cada ejemplar pierde hasta dos del piso bajo y mueve las demás
    almohadas = list(CEIBA_ALMOHADAS)
    for _ in range(rnd.choice((0, 1, 1, 2))):
        almohadas.remove(rnd.choice(almohadas[5:]))
    for (u, v, rx, ry, prof) in almohadas:
        f = rnd.uniform(0.9, 1.1)
        _almohada(k, L, u + rnd.uniform(-8, 8), v + rnd.uniform(-6, 6), rx * f, ry * f,
                  prof + rnd.uniform(-12, 12), rnd.uniform(0, 60), rnd, hueso, mat_copa)
    return L.px(33)


# ---------------------------------------------------------------------------
# Palma de corozo (dibujo de 320 × 620 px: pie en u=150, suelo en v=600; 488 px = 10 m)
# ---------------------------------------------------------------------------

PALMA_ANILLOS = [(600, 150.0, 17.0), (556, 150.45, 16.25), (513, 151.6, 15.5), (469, 153.55, 14.75),
                 (425, 156.3, 14.0), (381, 159.85, 13.25), (338, 164.15, 12.5), (294, 169.15, 11.75),
                 (250, 175.0, 11.0)]
# Punta de cada hoja (u, v) y si su mitad de arriba es la clara (las de atrás) o la media (las que caen)
PALMA_HOJAS = [((188, 112), 'selva_copa_luz'), ((125, 128), 'selva_copa_3'), ((252, 138), 'selva_copa_luz'),
               ((70, 185), 'selva_copa_3'), ((298, 196), 'selva_copa_3'), ((50, 286), 'selva_copa_3'),
               ((292, 300), 'selva_copa_2'), ((70, 322), 'selva_copa_2')]


def _tubo_anillado(k, L, anillos, lados, hueso):
    """Tronco de anillos: cada anillo se ensancha hacia arriba y el escalón de abajo queda en sombra
    (las líneas oscuras del dibujo)."""
    anillos_3d = []
    for (v, u, r) in anillos:
        anillos_3d.append((L.p(u, v), L.px(r)))
    giro = L.m.to_3x3()
    # Cada anillo va girado medio lado respecto al de abajo: dos anillos seguidos nunca tienen caras
    # paralelas (con la curva del tronco quedaban casi en el mismo plano y parpadeaban)
    fase = [math.pi / lados * (i % 2) for i in range(len(anillos_3d))]
    for i in range(len(anillos_3d) - 1):
        (c0, r0), (c1, r1) = anillos_3d[i], anillos_3d[i + 1]
        abajo = [c0 + giro @ Vector((math.cos(a) * r0 * 0.86, math.sin(a) * r0 * 0.86, 0)) for a in
                 (math.tau * j / lados + fase[i] for j in range(lados))]
        arriba = [c1 + giro @ Vector((math.cos(a) * r1, math.sin(a) * r1, 0)) for a in
                  (math.tau * j / lados + fase[i] for j in range(lados))]
        claro = i % 2 == 0
        color = tres_tonos('selva_tronco_luz' if claro else 'selva_tronco', 'selva_tronco_luz' if claro else 'selva_tronco',
                           'selva_tronco' if claro else 'selva_tronco_sombra', umbral_luz=0.25, umbral_sombra=-0.25)
        verts = abajo + arriba
        caras = [(j, (j + 1) % lados, lados + (j + 1) % lados, lados + j) for j in range(lados)]
        k.agregar((verts, orientar_hacia_afuera(verts, caras, (c0 + c1) / 2)), color, hueso)
        if i + 1 < len(anillos_3d) - 1:
            # Escalón entre este anillo y el siguiente (mira hacia abajo: línea oscura)
            r2 = anillos_3d[i + 1][1] * 0.86
            sig = [c1 + giro @ Vector((math.cos(a) * r2, math.sin(a) * r2, 0.02)) for a in
                   (math.tau * j / lados + fase[i + 1] for j in range(lados))]
            verts = arriba + sig
            caras = [(j, (j + 1) % lados, lados + (j + 1) % lados, lados + j) for j in range(lados)]
            k.agregar((verts, orientar_hacia(verts, caras, (0, 0, -1))), 'selva_tronco_sombra', hueso)


def _hoja_palma(k, L, origen, punta, color_claro, ancho_px, rnd, hueso, material):
    """Hoja larga con nervio central: mitad de arriba clara y mitad de abajo oscura, doblada en V."""
    o = Vector(origen)
    t = Vector(punta)
    cuerda = t - o
    largo = cuerda.length
    arriba = Vector((0, 0, 1))
    lado = cuerda.cross(arriba)
    if lado.length < 1e-4:
        lado = Vector((1, 0, 0))
    lado.normalize()
    normal = lado.cross(cuerda).normalized()
    control = o + cuerda * 0.5 + arriba * largo * 0.22
    nervio = [o.lerp(control, f).lerp(control.lerp(t, f), f) for f in (0, 0.25, 0.5, 0.75, 1.0)]
    anchos = [0, 0.75, 1.0, 0.6, 0]
    w = L.px(ancho_px)
    bordes_a, bordes_b = [], []
    for p, a in zip(nervio, anchos):
        caida = -normal * w * a * 0.35
        bordes_a.append(p + lado * w * a + caida)
        bordes_b.append(p - lado * w * a + caida)
    for bordes, color in ((bordes_a, color_claro), (bordes_b, 'selva_copa_1')):
        verts, caras = [], []
        for i in range(4):
            base = len(verts)
            if i == 0:
                verts += [nervio[0], bordes[1], nervio[1]]
                caras.append((base, base + 1, base + 2))
            elif i == 3:
                verts += [bordes[3], nervio[4], nervio[3]]
                caras.append((base, base + 1, base + 2))
            else:
                verts += [bordes[i], bordes[i + 1], nervio[i + 1], nervio[i]]
                caras.append((base, base + 1, base + 2, base + 3))
        k.agregar((verts, caras), color, hueso, material=material)


def palma(k, base, rnd, escala=1.0, giro=None, hueso='escenario', mat_hojas=1):
    """Palma de 8–11 m. 'mat_hojas' es el índice del material de doble cara para las hojas.
    Devuelve el radio del tronco al pie."""
    alto = rnd.uniform(8.0, 11.0) * escala
    L = _Lienzo(base, rnd.uniform(0, 360) if giro is None else giro, alto / 488.0, 150, 600)
    _tubo_anillado(k, L, PALMA_ANILLOS, 6, hueso)
    corona = L.p(175, 248)
    izq = [h for h in PALMA_HOJAS if h[0][0] < 175]
    der = [h for h in PALMA_HOJAS if h[0][0] >= 175]
    # Largo y altura de cada hoja salen del dibujo. La izquierda del dibujo es +X local (la izquierda de la
    # cámara del juego); las hojas de cada lado se abren en abanico hacia adelante y atrás: corona redonda
    hojas = [(0.0, j, len(izq), h) for j, h in enumerate(izq)] + [(180.0, j, len(der), h) for j, h in enumerate(der)]
    for lado, j, total, ((u, v), color) in hojas:
        alcance = max(abs(u - 175), 22) * L.s
        subida = (248 - v) * L.s
        ang = math.radians(lado + (j - (total - 1) / 2) * 38 + rnd.uniform(-8, 8))
        dir_h = L.m.to_3x3() @ Vector((math.cos(ang), math.sin(ang), 0))
        punta = corona + dir_h * alcance * rnd.uniform(0.92, 1.08) + Vector((0, 0, subida))
        _hoja_palma(k, L, corona, punta, color, 16, rnd, hueso, mat_hojas)
    for (u, v, color) in ((168, 258, 'madera_tabla'), (181, 262, 'selva_tronco'), (174, 270, 'madera_tabla')):
        c = L.p(u, v, rnd.uniform(-6, 6))
        k.agregar(elipsoide(L.px(7), L.px(7), L.px(7), 6, 2), color, hueso, Matrix.Translation(c))
    return L.px(17)


# ---------------------------------------------------------------------------
# Árbol joven (dibujo de 300 × 420 px: pie en u=150, suelo en v=400; 271 px = 4 m)
# ---------------------------------------------------------------------------

JOVEN_ALMOHADAS = [(150, 175, 72, 46, 20), (110, 220, 62, 40, 30), (196, 214, 64, 42, -15),
                   (118, 254, 48, 28, -35), (184, 256, 52, 30, -30)]


def arbol_joven(k, rnd, alto=4.0, hueso='escenario', mat_copa=0):
    """Plantilla de 4 m en el origen (las instancias la giran y la escalan entre 3 y 5 m)."""
    L = _Lienzo((0, 0, 0), 0, alto / 271.0, 150, 400)
    m, largo = segmento(L.p(150, 400), L.p(150, 262), giro=15)
    k.agregar(prisma(6, L.px(12), largo, radio_sup=L.px(8.5), tapas=False), tono_tronco, hueso, m)
    for ang in (180, 0, 100):
        _aleta(k, L, math.radians(ang + rnd.uniform(-15, 15)), 20, 34, 4, 12, hueso)
    for (u, v, rx, ry, prof) in JOVEN_ALMOHADAS:
        _almohada(k, L, u, v, rx, ry, prof, rnd.uniform(0, 60), rnd, hueso, mat_copa)
    return L.px(12)

