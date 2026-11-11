"""Rocas y riscos desde la hoja de escenarios (tablero «Plantas bajas, rocas y riscos»).

  canto        canto rodado de pocas caras, claro hacia el sol, con capa de musgo que gotea por el borde
  piedra_poza  piedra plana y ancha con la cara de arriba clara y musgo en un borde
  estratos     risco de capas horizontales apiladas, con labio claro, musgo en cada repisa y grietas
  montana      masa lejana del horizonte
"""
import math

from mathutils import Vector

from common import SOL, casco, tres_tonos

# En el juego el sol real ya aclara las caras que lo miran: si además se pintaran con el tono claro,
# la piedra se vería casi blanca. Se pinta el tono medio en la luz y el oscuro en la sombra, y el sol
# pone el claro del dibujo.
tono_piedra = tres_tonos('piedra', 'piedra', 'piedra_sombra', fondo='piedra_oscura')
tono_estrato = tres_tonos('roca_risco', 'roca_risco', 'piedra_sombra', fondo='piedra_oscura')


def tono_musgo(_c, n):
    if n.z > 0.5 and n.dot(SOL) > 0.5:
        return 'musgo_luz'
    if n.z > 0.2:
        return 'musgo'
    return 'musgo_oscuro'


def tono_capa(_c, n):
    """Capa del risco: repisa con musgo, labio claro (bisel) y cara de roca en tres tonos."""
    if n.z > 0.85:
        return 'musgo'
    if n.z > 0.35:
        return 'roca_risco_luz'
    return tono_estrato(_c, n)


def puntos_roca(centro, tam, rnd, achatar=0.7, n=11):
    """Canto rodado de pocas caras: base plana, anillo ancho a media altura, anillo más estrecho arriba
    y una cima suave (ancho y bajo, como en el dibujo). 'n' se conserva por compatibilidad."""
    cx, cy, cz = centro
    sx, sy, sz = tam if isinstance(tam, (tuple, list)) else (tam, tam, tam * achatar)
    pts = []
    for (cuantos, z, r) in ((6, -0.12, 0.9), (5, 0.32, 1.0), (4, 0.78, 0.66)):
        giro = rnd.uniform(0, math.tau)
        for i in range(cuantos):
            th = giro + math.tau * i / cuantos + rnd.uniform(-0.3, 0.3)
            rr = r * rnd.uniform(0.86, 1.0)
            pts.append((cx + math.cos(th) * sx * rr, cy + math.sin(th) * sy * rr, cz + sz * (z + rnd.uniform(-0.07, 0.07))))
    pts.append((cx + rnd.uniform(-0.2, 0.2) * sx, cy + rnd.uniform(-0.2, 0.2) * sy, cz + sz))
    return pts


def canto(k, centro, tam, rnd, achatar=0.7, musgo=True, hueso='escenario'):
    """Canto rodado con su capa de musgo encima. Devuelve la altura de la roca."""
    cx, cy, cz = centro
    sx, sy, sz = tam if isinstance(tam, (tuple, list)) else (tam, tam, tam * achatar)
    verts, caras = casco(puntos_roca(centro, (sx, sy, sz), rnd))
    k.agregar((verts, caras), tono_piedra, hueso)
    if musgo:
        c = Vector((cx, cy, cz + sz * 0.2))
        corte = cz + sz * 0.6
        arriba = [v for v in verts if v.z > corte]
        laterales = [v for v in verts if cz + sz * 0.2 < v.z <= corte]
        gotas = rnd.sample(laterales, min(len(laterales), rnd.randint(1, 2)))
        pts = [c + (v - c) * 1.05 for v in arriba] + [c + (v - c) * 1.04 for v in gotas]
        # Fondo de la capa: hundido dentro de la roca para que no se vea por debajo
        pts += [c + (v - c) * 0.6 for v in arriba]
        if len(pts) >= 4:
            k.agregar(casco(pts), tono_musgo, hueso)
    return sz


def piedra_poza(k, centro, ancho, alto, rnd, hueso='escenario'):
    """Piedra plana para cruzar la poza: cara de arriba ancha y clara, musgo en un borde."""
    cx, cy, cz = centro
    pts = []
    for i in range(7):
        th = math.tau * i / 7 + rnd.uniform(-0.2, 0.2)
        r = ancho / 2 * rnd.uniform(0.88, 1.0)
        pts.append((cx + math.cos(th) * r, cy + math.sin(th) * r * 0.9, cz + alto))
        pts.append((cx + math.cos(th) * r * 1.12, cy + math.sin(th) * r * 1.02, cz + alto * 0.55))
        pts.append((cx + math.cos(th) * r * 1.05, cy + math.sin(th) * r * 0.95, cz))

    def color(_c, n):
        return 'piedra_luz' if n.z > 0.8 else tono_piedra(_c, n)

    k.agregar(casco(pts), color, hueso)
    th = rnd.uniform(0, math.tau)
    d = Vector((math.cos(th), math.sin(th), 0))
    t = Vector((-d.y, d.x, 0))
    b = Vector((cx, cy, cz + alto)) + d * ancho * 0.42
    borde = [b + t * ancho * 0.25 + Vector((0, 0, 0.03)), b - t * ancho * 0.25 + Vector((0, 0, 0.03)),
             b - d * ancho * 0.14 + Vector((0, 0, 0.03)), b + d * ancho * 0.12 - Vector((0, 0, alto * 0.45)),
             b + t * ancho * 0.18 + d * ancho * 0.1 - Vector((0, 0, alto * 0.3)), b - Vector((0, 0, 0.08))]
    k.agregar(casco(borde), tono_musgo, hueso)


def _anillo(x0, y0, x1, y1, z, rnd, jitter):
    """Contorno de una capa: rectángulo con un punto intermedio en cada lado, empujado hacia afuera o adentro."""
    pts = [(x0, y0), ((x0 + x1) / 2 + rnd.uniform(-1, 1) * (x1 - x0) * 0.15, y0 - rnd.uniform(-1, 1) * jitter),
           (x1, y0), (x1 + rnd.uniform(-1, 1) * jitter, (y0 + y1) / 2 + rnd.uniform(-1, 1) * (y1 - y0) * 0.15),
           (x1, y1), ((x0 + x1) / 2 + rnd.uniform(-1, 1) * (x1 - x0) * 0.15, y1 + rnd.uniform(-1, 1) * jitter),
           (x0, y1), (x0 - rnd.uniform(-1, 1) * jitter, (y0 + y1) / 2 + rnd.uniform(-1, 1) * (y1 - y0) * 0.15)]
    return [Vector((x, y, z)) for x, y in pts]


def estratos(k, minimo, maximo, rnd, irregular=0.6, tope_exacto=False, repisas=None, a_ras=(), hueso='escenario'):
    """Risco de capas horizontales que llena la caja [minimo, maximo].

    tope_exacto=False: cada capa se mete un poco más que la de abajo (paredes y fondos).
    tope_exacto=True: la capa de arriba coincide con la caja (se camina encima) y las de abajo sobresalen.
    repisas: lista donde se agregan puntos (x, y, z) de las repisas para sembrar helechos.
    a_ras: lados que no se meten ('x0', 'x1', 'y0', 'y1'), p. ej. el que toca otro bloque o la cascada.
    """
    (x0, y0, z0), (x1, y1, z1) = minimo, maximo
    alto = z1 - z0
    n = max(1, round(alto / 3.2))
    cortes = [z0] + sorted(z0 + alto * (i + rnd.uniform(-0.18, 0.18)) / n for i in range(1, n)) + [z1]
    paso = irregular * 0.75
    lim = min(x1 - x0, y1 - y0) * 0.3
    for i in range(n):
        za, zb = cortes[i], cortes[i + 1]
        if tope_exacto:
            meter = -min(paso * (n - 1 - i) * 0.6, 1.2)
        else:
            meter = min(paso * i, lim)
        if i == n - 1 and tope_exacto:
            meter = 0.0
        ax0 = x0 + (0 if 'x0' in a_ras else meter)
        ay0 = y0 + (0 if 'y0' in a_ras else meter)
        ax1 = x1 - (0 if 'x1' in a_ras else meter)
        ay1 = y1 - (0 if 'y1' in a_ras else meter)
        jitter = 0.0 if (tope_exacto and i == n - 1) else irregular * 0.35
        labio = min(0.35, (zb - za) * 0.2)
        bisel = min(0.3, (ax1 - ax0) * 0.1, (ay1 - ay0) * 0.1)
        if tope_exacto and i == n - 1:
            bisel = 0.0
        anillo = _anillo(ax0, ay0, ax1, ay1, za, rnd, jitter)
        cuello = [Vector((p.x, p.y, zb - labio)) for p in anillo]
        tope = [Vector((p.x + (bisel if p.x <= ax0 + 1e-6 else -bisel if p.x >= ax1 - 1e-6 else 0),
                        p.y + (bisel if p.y <= ay0 + 1e-6 else -bisel if p.y >= ay1 - 1e-6 else 0), zb)) for p in anillo]
        k.agregar(casco(anillo + cuello + tope), tono_capa, hueso)
        # Musgo que gotea del borde de la repisa y una grieta vertical
        for _ in range(2 if i < n - 1 else 1):
            p = rnd.choice(anillo)
            q = anillo[(anillo.index(p) + 1) % len(anillo)]
            f = rnd.uniform(0.2, 0.8)
            e = Vector((p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, zb))
            fuera = Vector((e.x - (ax0 + ax1) / 2, e.y - (ay0 + ay1) / 2, 0))
            fuera = Vector((math.copysign(1, fuera.x) if abs(fuera.x) / max(ax1 - ax0, 1e-3) > abs(fuera.y) / max(ay1 - ay0, 1e-3) else 0,
                            0 if abs(fuera.x) / max(ax1 - ax0, 1e-3) > abs(fuera.y) / max(ay1 - ay0, 1e-3) else math.copysign(1, fuera.y), 0))
            t = Vector((-fuera.y, fuera.x, 0))
            largo = rnd.uniform(0.8, 1.8)
            caida = rnd.uniform(0.5, 1.1)
            gota = [e + t * largo + fuera * 0.06 + Vector((0, 0, 0.05)), e - t * largo + fuera * 0.06 + Vector((0, 0, 0.05)),
                    e - fuera * 0.5 + Vector((0, 0, 0.05)), e + t * largo * 0.3 + fuera * 0.08 - Vector((0, 0, caida)),
                    e - t * largo * 0.4 + fuera * 0.08 - Vector((0, 0, caida * 0.6)), e - fuera * 0.4 - Vector((0, 0, caida))]
            k.agregar(casco(gota), tono_musgo, hueso)
            if repisas is not None and i < n - 1:
                repisas.append((e.x - fuera.x * 0.7, e.y - fuera.y * 0.7, zb))
        if zb - za > 1.6:
            p = rnd.choice(anillo)
            q = anillo[(anillo.index(p) + 1) % len(anillo)]
            f = rnd.uniform(0.25, 0.75)
            c = Vector((p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, 0))
            t = (q - p)
            t.z = 0
            if t.length > 1e-4:
                t.normalize()
                fuera = Vector((t.y, -t.x, 0))
                if fuera.dot(Vector((c.x - (ax0 + ax1) / 2, c.y - (ay0 + ay1) / 2, 0))) < 0:
                    fuera = -fuera
                zc0, zc1 = za + (zb - za) * 0.15, zb - labio - 0.1
                grieta = [c + t * 0.09 + fuera * 0.05 + Vector((0, 0, zc0)), c - t * 0.09 + fuera * 0.05 + Vector((0, 0, zc0)),
                          c + t * 0.12 + fuera * 0.05 + Vector((0, 0, zc1)), c - t * 0.06 + fuera * 0.05 + Vector((0, 0, zc1)),
                          c - fuera * 0.2 + Vector((0, 0, (zc0 + zc1) / 2))]
                k.agregar(casco(grieta), 'piedra_oscura', hueso)


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
