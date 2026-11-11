"""Plantas bajas desde la hoja de escenarios (tablero «Plantas bajas, rocas y riscos»).

Son plantillas para InstancedMesh (una llamada de dibujo por tipo, con viento y doble cara).
  helecho     7 frondas anchas de dos tonos + brote enrollado (dibujo 300 × 220 px, 145 px = 1,2 m)
  pasto       mata de 5 hojas gruesas (dibujo: la más alta, 99 px = 0,6 m)
  flor_solar  8 pétalos dorados y centro naranja (objeto suelto: cura)
"""
import math

from mathutils import Vector

from common import casco, colocar, prisma

# Puntas de las 7 frondas del dibujo, relativas al pie (150, 205): (desvío horizontal, altura) en píxeles.
# Desvío negativo = a la izquierda del dibujo = +X (la izquierda de la cámara del juego).
HELECHO_FRONDAS = [(-45, 85), (45, 87), (-10, 145), (-80, 115), (65, 120), (-110, 55), (112, 60)]
HELECHO_ESCALA = 1.2 / 145.0


def _fronda(k, angulo, alcance, altura, ancho, color_a, color_b):
    """Fronda de dos mitades (clara y oscura) a lado y lado del nervio, arqueada hacia arriba."""
    d = Vector((math.cos(angulo), math.sin(angulo), 0))
    lado = Vector((-d.y, d.x, 0))
    punta = d * alcance + Vector((0, 0, altura))
    control = d * alcance * 0.5 + Vector((0, 0, altura * 0.62 + alcance * 0.12))
    nervio = [Vector((0, 0, 0)).lerp(control, f).lerp(control.lerp(punta, f), f) for f in (0, 0.42, 0.78, 1.0)]
    anchos = [0, 1.0, 0.7, 0]
    for signo, color in ((1, color_a), (-1, color_b)):
        bordes = [p + lado * ancho * a * signo - Vector((0, 0, ancho * a * 0.3)) for p, a in zip(nervio, anchos)]
        verts = [nervio[0], bordes[1], nervio[1], bordes[2], nervio[2], nervio[3]]
        caras = [(0, 1, 2), (1, 3, 4, 2), (3, 5, 4)]
        k.agregar((verts, caras), color, 'escenario')


def helecho(k, rnd):
    s = HELECHO_ESCALA
    # Las frondas de cada lado del dibujo se abren en abanico hacia adelante y atrás: de frente se ve el
    # dibujo y desde cualquier otro lado la mata sigue siendo redonda
    for lado in (-1, 1):
        grupo = sorted((f for f in HELECHO_FRONDAS if (f[0] < 0) == (lado < 0)), key=lambda f: -abs(f[0]))
        for j, (desvio, altura) in enumerate(grupo):
            base = 0.0 if lado < 0 else math.pi
            ang = base + (0.0, 0.75, -0.75, 1.35)[j] + rnd.uniform(-0.12, 0.12)
            _fronda(k, ang, max(abs(desvio), 24) * s, altura * s, 16 * s, 'selva_helecho_luz', 'selva_helecho')
    # Brote enrollado en el centro: tallito y espiral (disco de 8 px de radio, de canto)
    k.agregar(prisma(4, 2 * s, 15 * s, tapas=False), 'selva_copa_luz', 'escenario', colocar((0, 0, 7.5 * s)))
    k.agregar(prisma(6, 8 * s, 4 * s), 'selva_copa_luz', 'escenario', colocar((0, 0, 23 * s), (90, 0, 20)))


# Hojas de la mata del dibujo: (base_u, alto_px, desvío_de_la_punta_px, color)
PASTO_HOJAS = [(85, 55, -33, 'selva_helecho'), (91.5, 83, -19, 'selva_helecho_luz'), (100, 99, 0, 'selva_pasto_1'),
               (107.5, 87, 20, 'selva_helecho_luz'), (113, 59, 37, 'selva_helecho')]
PASTO_ESCALA = 0.6 / 99.0


def pasto(k, rnd):
    """Mata de cinco hojas gruesas (10–12 px de ancho en la base), repartidas en abanico alrededor."""
    s = PASTO_ESCALA
    for i, (u, alto, desvio, color) in enumerate(PASTO_HOJAS):
        # Como en el dibujo: las hojas de la izquierda se abren a la izquierda de la cámara (+X), las de la
        # derecha a la derecha; un poco hacia adelante o atrás, alternando, para que la mata tenga volumen
        ang = (0.0 if desvio < 0 else math.pi) + (0.45 if i % 2 else -0.45) + rnd.uniform(-0.15, 0.15)
        d = Vector((math.cos(ang), math.sin(ang), 0))
        lado = Vector((-d.y, d.x, 0))
        base = Vector((-(u - 100) * s, 0, 0))
        caida = abs(desvio) * s + 4 * s
        medio = base + d * caida * 0.35 + Vector((0, 0, alto * s * 0.55))
        punta = base + d * caida + Vector((0, 0, alto * s))
        w = 7.0 * s
        verts = [base + lado * w, base - lado * w, medio - lado * w * 0.75, medio + lado * w * 0.75, punta]
        k.agregar((verts, [(0, 1, 2, 3), (3, 2, 4)]), color, 'escenario')


def flor_solar(k):
    """Flor que cura: tallo, dos hojas y una corona de 8 pétalos dorados alrededor de un centro naranja.
    La corona se inclina 65° hacia +Y: mira a la cámara del juego, como de frente en el dibujo."""
    from mathutils import Matrix
    c0 = Vector((0, 0, 0.58))
    inclina = Matrix.Translation(c0) @ Matrix.Rotation(math.radians(-65), 4, 'X') @ Matrix.Translation(-c0)
    k.agregar(prisma(5, 0.03, 0.55, radio_sup=0.022), 'flor_tallo', 'escenario', colocar((0, 0, 0.275)))
    for i in range(8):
        a = math.tau * i / 8
        d = Vector((math.cos(a), math.sin(a), 0))
        c = Vector((0, 0, 0.58))
        pts = [tuple(c + d * 0.04), tuple(c + d * 0.26 + Vector((0, 0, 0.06))),
               tuple(c + d * 0.15 + d.cross(Vector((0, 0, 1))) * 0.07 + Vector((0, 0, 0.03))),
               tuple(c + d * 0.15 - d.cross(Vector((0, 0, 1))) * 0.07 + Vector((0, 0, 0.03))),
               tuple(c + d * 0.12 + Vector((0, 0, -0.01)))]
        k.agregar(casco([tuple(inclina @ Vector(p)) for p in pts]), 'flor_petalo' if i % 2 == 0 else 'dorado_solar', 'escenario')
    k.agregar(prisma(8, 0.06, 0.05, radio_sup=0.04), 'flor_centro', 'escenario', inclina @ colocar((0, 0, 0.6)))
    for s in (1, -1):
        pts = [(0, 0, 0.2), (0.25 * s, 0.05, 0.32), (0.18 * s, -0.06, 0.26), (0.05 * s, 0, 0.22)]
        k.agregar(casco(pts + [(p[0], p[1] + 0.01, p[2] + 0.01) for p in pts]), 'flor_tallo', 'escenario')
