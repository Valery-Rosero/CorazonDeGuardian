"""Superficies de agua. Solo geometría: el aspecto lo da un ShaderMaterial en Three.js
(se elige por el nombre del material: agua_cascada / agua_poza)."""
import math

from mathutils import Vector


def cortina_cascada(k, x0, x1, y_borde, z_arriba, z_abajo, comba, material):
    """Lámina curva que cae desde el borde del risco hasta la poza."""
    cols, filas = 6, 10
    verts, caras = [], []
    for j in range(filas + 1):
        t = j / filas
        z = z_arriba + (z_abajo - z_arriba) * t
        y = y_borde + comba * math.sin(t * math.pi * 0.5)
        for i in range(cols + 1):
            u = i / cols
            x = x0 + (x1 - x0) * u
            verts.append(Vector((x, y + math.sin(u * math.pi) * 0.25, z)))
    for j in range(filas):
        for i in range(cols):
            a = j * (cols + 1) + i
            caras.append((a, a + 1, a + cols + 2, a + cols + 1))
    # normales hacia el frente (+Y en Blender, hacia la poza)
    from common import orientar_hacia
    caras = orientar_hacia(verts, caras, (0, 1, 0))
    k.agregar((verts, caras), 'agua', 'escenario', material=material)


def disco_agua(k, centro, radio, lados, material, escala_y=1.0):
    cx, cy, cz = centro
    verts = [Vector((cx, cy, cz))]
    for i in range(lados):
        a = math.tau * i / lados
        r = radio * (1 + 0.08 * math.sin(a * 3))
        verts.append(Vector((cx + math.cos(a) * r, cy + math.sin(a) * r * escala_y, cz)))
    caras = [(0, 1 + i, 1 + (i + 1) % lados) for i in range(lados)]
    from common import orientar_hacia
    k.agregar((verts, orientar_hacia(verts, caras, (0, 0, 1))), 'agua', 'escenario', material=material)


def franja_agua(k, puntos, ancho, z, material):
    """Río: franja que sigue una polilínea (x, y)."""
    verts, caras = [], []
    for i, (x, y) in enumerate(puntos):
        if i < len(puntos) - 1:
            dx, dy = puntos[i + 1][0] - x, puntos[i + 1][1] - y
        else:
            dx, dy = x - puntos[i - 1][0], y - puntos[i - 1][1]
        n = Vector((-dy, dx, 0)).normalized() * ancho / 2
        verts += [Vector((x, y, z)) + n, Vector((x, y, z)) - n]
    for i in range(len(puntos) - 1):
        a = i * 2
        caras.append((a, a + 2, a + 3, a + 1))
    from common import orientar_hacia
    k.agregar((verts, orientar_hacia(verts, caras, (0, 0, 1))), 'agua', 'escenario', material=material)
