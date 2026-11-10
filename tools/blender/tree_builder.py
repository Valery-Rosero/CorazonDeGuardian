"""Árboles de selva: tronco curvo en tramos, raíces, copa de varias masas y lianas."""
import math

from mathutils import Vector

from common import casco, prisma, segmento


def tono_tronco(_c, n):
    return 'selva_tronco_luz' if (n.x < -0.2 or n.y < -0.3) else 'selva_tronco'


def tono_copa(indice):
    base = ('selva_copa_1', 'selva_copa_2', 'selva_copa_3')[indice % 3]

    def fn(_c, n):
        if n.z > 0.6:
            return 'selva_copa_3'
        if n.z < -0.4:
            return 'selva_copa_1'
        return base
    return fn


def arbol(k, base, rnd, escala=1.0, hueso='escenario'):
    """Agrega un árbol al constructor 'k' con su pie en 'base' (coordenadas locales del constructor)."""
    base = Vector(base)
    alto = rnd.uniform(8.0, 12.0) * escala
    inclina = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0))
    if inclina.length > 0:
        inclina.normalize()
    inclina *= rnd.uniform(0.4, 1.1) * escala
    puntos = [base + Vector((0, 0, alto * i / 4)) + inclina * math.sin(i / 4 * math.pi * 0.85) for i in range(5)]
    r0 = 0.42 * escala
    for i in range(4):
        m, largo = segmento(puntos[i], puntos[i + 1], giro=rnd.uniform(0, 60))
        k.agregar(prisma(6, r0 * (1 - 0.17 * i), largo * 1.05, radio_sup=r0 * (1 - 0.17 * (i + 1))), tono_tronco, hueso, m)
    # Raíces en abanico
    for j in range(4):
        a = math.tau * j / 4 + rnd.uniform(-0.4, 0.4)
        d = Vector((math.cos(a), math.sin(a), 0))
        pts = [tuple(base + d * 0.15 * escala + Vector((0, 0, 0.9 * escala))),
               tuple(base + d * 1.3 * escala + Vector((0, 0, 0.0))),
               tuple(base + d * 0.2 * escala + Vector((0, 0, 0))),
               tuple(base + d * 0.7 * escala + d.cross(Vector((0, 0, 1))) * 0.18 * escala),
               tuple(base + d * 0.7 * escala - d.cross(Vector((0, 0, 1))) * 0.18 * escala)]
        k.agregar(casco(pts), 'selva_tronco', hueso)
    # Copa: tres masas facetadas
    cima = puntos[-1]
    for j in range(3):
        c = cima + Vector((rnd.uniform(-1.3, 1.3), rnd.uniform(-1.3, 1.3), rnd.uniform(-0.6, 1.0))) * escala
        pts = [tuple(c + Vector((rnd.uniform(-1, 1) * 2.6, rnd.uniform(-1, 1) * 2.6, rnd.uniform(-0.7, 1.0) * 1.5)) * 1.0)
               for _ in range(14)]
        pts = [tuple(c + (Vector(p) - c) * escala) for p in pts]
        k.agregar(casco(pts), tono_copa(j), hueso)
    # Lianas que cuelgan de la copa
    for _ in range(rnd.randint(1, 3)):
        a = Vector((rnd.uniform(-1.6, 1.6), rnd.uniform(-1.6, 1.6), -0.6)) * escala + cima
        b = a + Vector((rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), -rnd.uniform(3, 5.5) * escala))
        m, largo = segmento(a, b)
        k.agregar(prisma(4, 0.05 * escala, largo, radio_sup=0.035 * escala), 'selva_liana', hueso, m)
    return cima
