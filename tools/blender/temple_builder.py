"""Arquitectura del templo: bloques biselados, columnas, escalinatas, cabezas gigantes, fachada y pirámide."""
import math

from common import caja_biselada, casco, colocar, prisma
from rock_builder import tono_piedra


def bloque(k, centro, tam, rnd=None, rot=(0, 0, 0), bisel=0.12, color=tono_piedra, material=0):
    giro = (rot[0], rot[1], rot[2] + (rnd.uniform(-2, 2) if rnd else 0))
    return k.agregar(caja_biselada(*tam, bisel), color, 'escenario', colocar(centro, giro), material=material)


def columna(k, base, alto, radio, rnd, rota=False):
    x, y, z = base
    k.agregar(caja_biselada(radio * 2.6, radio * 2.6, 0.35, 0.06), tono_piedra, 'escenario', colocar((x, y, z + 0.175)))
    alto_util = alto * (rnd.uniform(0.45, 0.8) if rota else 1.0)
    tramos = max(2, int(alto_util / 1.2))
    for i in range(tramos):
        h = alto_util / tramos
        k.agregar(prisma(8, radio, h * 0.96, radio_sup=radio * 0.96, giro=rnd.uniform(0, 20)), tono_piedra, 'escenario',
                  colocar((x + rnd.uniform(-0.03, 0.03), y, z + 0.35 + h * (i + 0.5)), (rnd.uniform(-1.5, 1.5), rnd.uniform(-1.5, 1.5), 0)))
    if not rota:
        k.agregar(caja_biselada(radio * 2.8, radio * 2.8, 0.4, 0.06), tono_piedra, 'escenario',
                  colocar((x, y, z + 0.35 + alto_util + 0.2)))


def escalinata(k, x0, x1, y_inicio, z_base, escalones, huella, contrahuella, sentido=-1):
    """Escalones a lo largo de Y (sentido -1 = hacia -Y). Devuelve la lista de (min, max) para colisionadores."""
    cajas = []
    for i in range(escalones):
        y_a = y_inicio + sentido * huella * i
        y_b = y_a + sentido * huella
        z_top = z_base + contrahuella * (i + 1)
        cy, cz = (y_a + y_b) / 2, (z_base + z_top) / 2
        k.agregar(caja_biselada(x1 - x0, huella * 1.02, z_top - z_base, 0.06), tono_piedra, 'escenario',
                  colocar(((x0 + x1) / 2, cy, cz)))
        cajas.append(((x0, min(y_a, y_b), z_base), (x1, max(y_a, y_b), z_top)))
    return cajas


def cabeza_gigante(k, base, escala, rot_z, rnd):
    """Cabeza de piedra medio enterrada: bloque facetado con cejas, ojos y nariz tallados."""
    x, y, z = base
    s = escala
    k.agregar(caja_biselada(2.2 * s, 2.0 * s, 2.4 * s, 0.25 * s, conico=0.9), tono_piedra, 'escenario',
              colocar((x, y, z + 0.9 * s), (rnd.uniform(-6, 6), rnd.uniform(-8, 8), rot_z)))
    import math as _m
    a = _m.radians(rot_z)
    fx, fy = -_m.sin(a), -_m.cos(a)  # frente (-Y girado)
    lx, ly = _m.cos(a), -_m.sin(a)
    for sgn in (1, -1):
        k.agregar(caja_biselada(0.7 * s, 0.25 * s, 0.22 * s, 0.05 * s), 'piedra_sombra', 'escenario',
                  colocar((x + fx * 1.0 * s + lx * 0.45 * s * sgn, y + fy * 1.0 * s + ly * 0.45 * s * sgn, z + 1.55 * s), (0, 0, rot_z)))
        k.agregar(caja_biselada(0.42 * s, 0.2 * s, 0.3 * s, 0.05 * s), 'piedra_oscura', 'escenario',
                  colocar((x + fx * 1.02 * s + lx * 0.45 * s * sgn, y + fy * 1.02 * s + ly * 0.45 * s * sgn, z + 1.25 * s), (0, 0, rot_z)))
    k.agregar(caja_biselada(0.35 * s, 0.4 * s, 0.6 * s, 0.06 * s, conico=0.6), 'piedra_luz', 'escenario',
              colocar((x + fx * 1.08 * s, y + fy * 1.08 * s, z + 0.95 * s), (0, 0, rot_z)))
    k.agregar(caja_biselada(0.9 * s, 0.2 * s, 0.16 * s, 0.04 * s), 'piedra_oscura', 'escenario',
              colocar((x + fx * 1.02 * s, y + fy * 1.02 * s, z + 0.5 * s), (0, 0, rot_z)))
    k.agregar(caja_biselada(2.3 * s, 2.1 * s, 0.25 * s, 0.08 * s), 'musgo', 'escenario',
              colocar((x, y, z + 2.1 * s), (rnd.uniform(-6, 6), rnd.uniform(-8, 8), rot_z)))


def piramide(k, centro, base, alto, niveles, material_oro):
    """Pirámide escalonada con la cima dorada (material emisivo): el hito que guía al jugador."""
    cx, cy, cz = centro
    h = alto / (niveles + 1)
    for i in range(niveles):
        lado = base * (1 - i / (niveles + 1.2))
        k.agregar(caja_biselada(lado, lado, h, 0.4), tono_piedra, 'escenario', colocar((cx, cy, cz + h * (i + 0.5))))
    lado = base * (1 - niveles / (niveles + 1.2))
    # Templete con la cima dorada (material propio: en Three.js no le afecta la niebla y brilla a lo lejos)
    k.agregar(caja_biselada(lado * 0.7, lado * 0.7, h * 0.9, 0.3), tono_piedra, 'escenario',
              colocar((cx, cy, cz + h * (niveles + 0.45))))
    k.agregar(caja_biselada(lado * 0.5, lado * 0.5, h * 1.3, 0.3, conico=0.55), 'oro_brillante', 'escenario',
              colocar((cx, cy, cz + h * (niveles + 1.55))), material=material_oro)
    # Escalinata frontal: un bloque por nivel, mirando hacia el jugador (+Y)
    for i in range(niveles):
        lado_i = base * (1 - i / (niveles + 1.2))
        k.agregar(caja_biselada(base * 0.12, h * 1.1, h, 0.15), 'piedra_luz', 'escenario',
                  colocar((cx, cy + lado_i / 2 + h * 0.3, cz + h * (i + 0.5))))


def fachada_santuario(k, centro_y, z_base, ancho, alto, rnd, material_runa):
    """Fachada del santuario con pórtico y puerta cerrada (se abre en la zona 2)."""
    y = centro_y
    mitad = ancho / 2
    hueco = 2.2
    # Muros a ambos lados del pórtico
    for sgn in (1, -1):
        x0, x1 = sgn * hueco, sgn * mitad
        bloque(k, ((x0 + x1) / 2, y, z_base + alto / 2), (abs(x1 - x0), 3.0, alto), rnd, bisel=0.3)
    # Dintel y frontón escalonado
    bloque(k, (0, y, z_base + 7.2), (hueco * 2 + 0.6, 3.0, 1.6), rnd, bisel=0.2)
    for i in range(3):
        bloque(k, (0, y + 0.2, z_base + alto + 0.5 + i * 0.9), (ancho * (0.8 - i * 0.22), 2.6, 0.9), rnd, bisel=0.15)
    # Puerta cerrada con runas
    k.agregar(caja_biselada(hueco * 2, 0.6, 6.4, 0.08), 'piedra_sombra', 'escenario', colocar((0, y - 0.4, z_base + 3.2)))
    k.agregar(prisma(12, 1.0, 0.1, radio_sup=1.0), 'cristal_runa', 'escenario',
              colocar((0, y - 0.75, z_base + 3.6), (90, 0, 0)), material=material_runa)
    # Columnas del pórtico
    for sgn in (1, -1):
        columna(k, (sgn * (hueco + 0.7), y - 2.2, z_base), 6.4, 0.45, rnd)
    return [((-mitad, y - 1.5, z_base), (-hueco, y + 1.5, z_base + alto)),
            ((hueco, y - 1.5, z_base), (mitad, y + 1.5, z_base + alto)),
            ((-hueco, y - 0.7, z_base), (hueco, y + 1.5, z_base + 7.0))]


def altar(k, centro, material_oro):
    x, y, z = centro
    k.agregar(caja_biselada(2.6, 2.6, 0.35, 0.08), tono_piedra, 'escenario', colocar((x, y, z + 0.175)))
    k.agregar(caja_biselada(1.9, 1.9, 0.35, 0.08), tono_piedra, 'escenario', colocar((x, y, z + 0.525)))
    k.agregar(caja_biselada(0.9, 0.9, 0.7, 0.08, conico=0.85), 'piedra_luz', 'escenario', colocar((x, y, z + 1.05)))
    k.agregar(caja_biselada(1.1, 1.1, 0.14, 0.04), tono_piedra, 'escenario', colocar((x, y, z + 1.47)))
    # Disco solar tallado
    k.agregar(prisma(12, 0.32, 0.05), 'oro_brillante', 'escenario', colocar((x, y - 0.46, z + 1.05), (90, 0, 0)),
              material=material_oro)
    for i in range(12):
        a = math.tau * i / 12
        pts = [(x + math.cos(a) * 0.34, y - 0.46, z + 1.05 + math.sin(a) * 0.34),
               (x + math.cos(a) * 0.5, y - 0.46, z + 1.05 + math.sin(a) * 0.5),
               (x + math.cos(a + 0.12) * 0.34, y - 0.46, z + 1.05 + math.sin(a + 0.12) * 0.34),
               (x + math.cos(a) * 0.4, y - 0.5, z + 1.05 + math.sin(a) * 0.4)]
        k.agregar(casco(pts), 'oro_brillante', 'escenario', material=material_oro)
