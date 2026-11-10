"""Mallas base de vegetación para InstancedMesh (una llamada de dibujo por tipo) y flores solares."""
import math

from mathutils import Vector

from common import casco, prisma


def _hoja(k, angulo, largo, ancho, caida, color_a, color_b):
    """Fronda curvada en 4 tramos (superficie de una cara: en Three.js se dibuja por ambos lados)."""
    d = Vector((math.cos(angulo), math.sin(angulo), 0))
    lado = d.cross(Vector((0, 0, 1)))
    verts, caras, colores = [], [], []
    tramos = 4
    for i in range(tramos + 1):
        t = i / tramos
        centro = d * largo * t + Vector((0, 0, largo * 0.55 * math.sin(t * math.pi * 0.75) - caida * t * t))
        w = ancho * math.sin(math.pi * min(1.0, t * 1.1 + 0.08))
        verts += [centro + lado * w, centro - lado * w]
    for i in range(tramos):
        a = i * 2
        caras.append((a, a + 2, a + 3, a + 1))
        colores.append(color_a if i % 2 == 0 else color_b)
    k.agregar((verts, caras), colores, 'escenario')


def helecho(k, rnd):
    for i in range(7):
        ang = math.tau * i / 7 + rnd.uniform(-0.2, 0.2)
        _hoja(k, ang, rnd.uniform(0.9, 1.3), 0.16, 0.5, 'selva_helecho', 'selva_helecho_luz')


def pasto(k, rnd):
    for i in range(5):
        ang = math.tau * i / 5 + rnd.uniform(-0.3, 0.3)
        d = Vector((math.cos(ang), math.sin(ang), 0)) * 0.12
        lado = d.cross(Vector((0, 0, 1))).normalized() * 0.035
        alto = rnd.uniform(0.35, 0.6)
        verts = [d * 0.2 + lado, d * 0.2 - lado, d * 1.4 + Vector((0, 0, alto))]
        k.agregar((verts, [(0, 1, 2)]), 'selva_pasto_2' if i % 2 else 'selva_helecho_luz', 'escenario')


def flor_solar(k):
    """Flor que cura: tallo, hojas y una corona de pétalos dorados alrededor de un centro naranja."""
    k.agregar(prisma(5, 0.03, 0.55, radio_sup=0.022), 'flor_tallo', 'escenario', _t((0, 0, 0.275)))
    for i in range(8):
        a = math.tau * i / 8
        d = Vector((math.cos(a), math.sin(a), 0))
        c = Vector((0, 0, 0.58))
        pts = [tuple(c + d * 0.04), tuple(c + d * 0.26 + Vector((0, 0, 0.06))),
               tuple(c + d * 0.15 + d.cross(Vector((0, 0, 1))) * 0.07 + Vector((0, 0, 0.03))),
               tuple(c + d * 0.15 - d.cross(Vector((0, 0, 1))) * 0.07 + Vector((0, 0, 0.03))),
               tuple(c + d * 0.12 + Vector((0, 0, -0.01)))]
        k.agregar(casco(pts), 'flor_petalo', 'escenario')
    k.agregar(prisma(8, 0.06, 0.05, radio_sup=0.04), 'flor_centro', 'escenario', _t((0, 0, 0.6)))
    for s in (1, -1):
        pts = [(0, 0, 0.2), (0.25 * s, 0.05, 0.32), (0.18 * s, -0.06, 0.26), (0.05 * s, 0, 0.22)]
        k.agregar(casco(pts + [(p[0], p[1] + 0.01, p[2] + 0.01) for p in pts]), 'flor_tallo', 'escenario')


def _t(pos):
    from common import colocar
    return colocar(pos)
