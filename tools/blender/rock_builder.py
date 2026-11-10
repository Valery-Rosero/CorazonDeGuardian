"""Rocas y riscos tallados: envolventes convexas de puntos con ruido determinista y musgo arriba."""
import math

from mathutils import Vector

from common import casco


def tono_roca(_c, n):
    if n.z > 0.65:
        return 'musgo'
    if n.z > 0.35:
        return 'musgo_oscuro'
    return 'roca_risco_luz' if (n.x < -0.2 or n.y < -0.3) else 'roca_risco'


def tono_piedra(_c, n):
    if n.z > 0.7:
        return 'musgo'
    return 'piedra_luz' if (n.x < -0.25 or n.y < -0.25) else 'piedra'


def puntos_roca(centro, tam, rnd, achatar=0.7, n=16):
    """Nube de puntos alrededor de 'centro' con forma de canto rodado."""
    cx, cy, cz = centro
    sx, sy, sz = tam if isinstance(tam, (tuple, list)) else (tam, tam, tam * achatar)
    pts = []
    for _ in range(n):
        th = rnd.uniform(0, math.tau)
        ph = rnd.uniform(-0.15, 1.0) * math.pi / 2
        r = rnd.uniform(0.75, 1.0)
        pts.append((cx + math.cos(th) * math.cos(ph) * sx * r,
                    cy + math.sin(th) * math.cos(ph) * sy * r,
                    cz + math.sin(ph) * sz * r))
    # base plana para que asiente en el suelo
    for i in range(6):
        th = math.tau * i / 6 + rnd.uniform(-0.2, 0.2)
        pts.append((cx + math.cos(th) * sx * 0.9, cy + math.sin(th) * sy * 0.9, cz - sz * 0.15))
    return pts


def roca(k, centro, tam, rnd, achatar=0.7, color=tono_roca, hueso='escenario'):
    return k.agregar(casco(puntos_roca(centro, tam, rnd, achatar)), color, hueso)


def bloque_risco(k, minimo, maximo, rnd, irregular=0.6, color=tono_roca, hueso='escenario'):
    """Masa rocosa que llena aproximadamente la caja [minimo, maximo], con caras irregulares."""
    (x0, y0, z0), (x1, y1, z1) = minimo, maximo
    pts = []
    pasos = 4
    for i in range(pasos + 1):
        for j in range(pasos + 1):
            u, v = i / pasos, j / pasos
            for (px, py, pz) in ((x0 + (x1 - x0) * u, y0 + (y1 - y0) * v, z0),
                                 (x0 + (x1 - x0) * u, y0 + (y1 - y0) * v, z1),
                                 (x0, y0 + (y1 - y0) * u, z0 + (z1 - z0) * v),
                                 (x1, y0 + (y1 - y0) * u, z0 + (z1 - z0) * v),
                                 (x0 + (x1 - x0) * u, y0, z0 + (z1 - z0) * v),
                                 (x0 + (x1 - x0) * u, y1, z0 + (z1 - z0) * v)):
                if rnd.random() < 0.35:
                    pts.append((px + rnd.uniform(-irregular, 0) * (1 if px == x1 else -1 if px == x0 else 0),
                                py + rnd.uniform(-irregular, 0) * (1 if py == y1 else -1 if py == y0 else 0),
                                pz + rnd.uniform(-irregular, 0) * (1 if pz == z1 else 0)))
    for p in ((x0, y0, z0), (x1, y0, z0), (x0, y1, z0), (x1, y1, z0)):
        pts.append(p)
    return k.agregar(casco(pts), color, hueso)


def montana(k, centro, ancho, alto, rnd, color='montana', hueso='escenario'):
    cx, cy = centro
    pts = [(cx + math.cos(a) * ancho * rnd.uniform(0.8, 1.0), cy + math.sin(a) * ancho * rnd.uniform(0.6, 0.9), 0)
           for a in (math.tau * i / 9 for i in range(9))]
    for _ in range(8):
        a = rnd.uniform(0, math.tau)
        r = rnd.uniform(0.15, 0.55) * ancho
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r * 0.7, alto * rnd.uniform(0.55, 1.0)))
    pts.append((cx + rnd.uniform(-0.1, 0.1) * ancho, cy, alto))
    return k.agregar(casco(pts), color, hueso)


def dist_a_polilinea(p, puntos):
    """Distancia 2D de p a una polilínea (lista de (x, y))."""
    px, py = p
    mejor = 1e9
    for (ax, ay), (bx, by) in zip(puntos, puntos[1:]):
        abx, aby = bx - ax, by - ay
        t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)))
        dx, dy = ax + abx * t - px, ay + aby * t - py
        mejor = min(mejor, math.hypot(dx, dy))
    return mejor


def vec(t):
    return Vector(t)
