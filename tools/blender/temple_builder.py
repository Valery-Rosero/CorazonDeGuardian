"""Arquitectura del templo desde la hoja de escenarios (tablero «Ruinas del templo»).

  bloque_tallado  cubo biselado con un sol tallado en dorado viejo y musgo que gotea por el frente
  columna         cuatro tambores octagonales, capitel cuadrado y liana; la rota tiene la cima mellada
                  y un tambor caído al lado
  cabeza_gigante  rostro de guardián medio enterrado, ojos cerrados y banda con el sol; mira a la pirámide
  escalinata      peldaños de 40 cm entre dos alfardas
  piramide        cinco cuerpos escalonados, musgo en las repisas, escalinata central y santuario dorado
"""
import math

from mathutils import Matrix, Vector

from common import caja_biselada, casco, colocar, orientar_hacia, prisma, segmento
from rock_builder import tono_musgo, tono_piedra


def bloque(k, centro, tam, rnd=None, rot=(0, 0, 0), bisel=0.12, color=tono_piedra, material=0):
    giro = (rot[0], rot[1], rot[2] + (rnd.uniform(-2, 2) if rnd else 0))
    return k.agregar(caja_biselada(*tam, bisel), color, 'escenario', colocar(centro, giro), material=material)


def _plano(m, puntos):
    """Polígono plano (una cara) en el plano XZ local, mirando hacia -Y (el frente)."""
    verts = [m @ Vector((x, 0, z)) for x, z in puntos]
    normal = (m.to_3x3() @ Vector((0, -1, 0)))
    return verts, orientar_hacia(verts, [tuple(range(len(verts)))], normal)


def glifo_sol(k, m, radio, color='dorado_solar'):
    """Sol tallado: anillo, punto central y 8 rayos (caras planas sobre la cara frontal, matriz 'm')."""
    verts, caras = [], []
    for i in range(8):
        a0, a1 = math.tau * i / 8, math.tau * (i + 1) / 8
        base = len(verts)
        for (a, r) in ((a0, radio), (a1, radio), (a1, radio * 0.72), (a0, radio * 0.72)):
            verts.append(m @ Vector((math.cos(a) * r, 0, math.sin(a) * r)))
        caras.append((base, base + 1, base + 2, base + 3))
        a = (a0 + a1) / 2 - math.pi / 8
        base = len(verts)
        for (aa, r) in ((a - 0.13, radio * 1.18), (a + 0.13, radio * 1.18), (a, radio * 1.65)):
            verts.append(m @ Vector((math.cos(aa) * r, 0, math.sin(aa) * r)))
        caras.append((base, base + 1, base + 2))
    base = len(verts)
    for i in range(6):
        a = math.tau * i / 6
        verts.append(m @ Vector((math.cos(a) * radio * 0.36, 0, math.sin(a) * radio * 0.36)))
    caras.append(tuple(range(base, base + 6)))
    k.agregar((verts, orientar_hacia(verts, caras, m.to_3x3() @ Vector((0, -1, 0)))), color, 'escenario')


def bloque_tallado(k, centro, tam, rnd, giro=0.0, glifo=True, musgo=True):
    """Bloque de la hoja: piedra en tres tonos, sol tallado al frente y musgo arriba que gotea."""
    ancho, fondo, alto = tam
    m = colocar(centro, (0, 0, giro))
    k.agregar(caja_biselada(ancho, fondo, alto, min(0.12, alto * 0.12)), tono_piedra, 'escenario', m)
    if glifo:
        r = min(ancho, alto) * 0.17
        glifo_sol(k, m @ Matrix.Translation((ancho * 0.02, -fondo / 2 - 0.012, -alto * 0.08)), r)
    if musgo:
        a, b, c = ancho / 2, fondo / 2, alto / 2
        pts = [(-a * 0.92, -b * 0.92, c + 0.05), (a * 0.85, -b * 0.95, c + 0.05), (a * 0.9, b * 0.7, c + 0.05),
               (-a * 0.7, b * 0.9, c + 0.05), (-a * 0.9, -b * 0.9, c - 0.06), (a * 0.85, b * 0.7, c - 0.06),
               (-a * 0.4, -b - 0.03, c - alto * rnd.uniform(0.1, 0.18)), (a * 0.3, -b - 0.03, c - alto * rnd.uniform(0.08, 0.15)),
               (0, 0, c - 0.12)]
        k.agregar(casco([m @ Vector(p) for p in pts]), tono_musgo, 'escenario')


def _liana_columna(k, x, y, z0, alto, radio, rnd):
    fase = rnd.uniform(0, math.tau)
    pts = []
    for i in range(5):
        t = i / 4
        a = fase + t * 2.2
        pts.append(Vector((x + math.cos(a) * radio * 1.08, y + math.sin(a) * radio * 1.08, z0 + alto * (0.05 + 0.9 * t))))
    for a, b in zip(pts, pts[1:]):
        mm, largo = segmento(a, b, giro=45)
        k.agregar(prisma(4, 0.07, largo * 1.05, tapas=False), 'selva_liana', 'escenario', mm)


def columna(k, base, alto, radio, rnd, rota=False, liana=None, caida=None):
    """Columna de la hoja (5 m con capitel). Devuelve las cajas (min, max) de los tambores caídos."""
    x, y, z = base
    k.agregar(prisma(4, radio * 1.9, 0.35, radio_sup=radio * 1.75, giro=45), tono_piedra, 'escenario', colocar((x, y, z + 0.175)))
    tambores = 2 if rota else 4
    h = (alto - 0.35 - 0.75) / 4
    zt = z + 0.35
    for i in range(tambores):
        r = radio * rnd.uniform(0.95, 1.05)
        k.agregar(prisma(8, r, h * 0.97, giro=rnd.uniform(0, 22), tapas=(i == tambores - 1)), tono_piedra, 'escenario',
                  colocar((x + rnd.uniform(-0.02, 0.02), y + rnd.uniform(-0.02, 0.02), zt + h * (i + 0.5))))
    zt += h * tambores
    cajas = []
    if not rota:
        k.agregar(prisma(4, radio * 1.45, 0.45, radio_sup=radio * 1.95, giro=45), tono_piedra, 'escenario', colocar((x, y, zt + 0.225)))
        k.agregar(prisma(4, radio * 2.2, 0.3, giro=45), tono_piedra, 'escenario', colocar((x, y, zt + 0.6)))
        k.agregar(prisma(4, radio * 2.15, 0.08, radio_sup=radio * 1.9, giro=45), 'musgo', 'escenario', colocar((x, y, zt + 0.79)))
        if liana is None or liana:
            _liana_columna(k, x, y, z + 0.35, zt - z - 0.35, radio, rnd)
    else:
        # Cima mellada: tres trozos de alturas bien distintas, cada uno con su punta
        alturas = [h * rnd.uniform(0.85, 1.1) for h in (0.25, 0.85, 0.55)]
        for j in range(3):
            a0 = math.tau * j / 3 + 0.3
            pts = [(x, y, zt)]
            for a in (a0, a0 + math.tau / 6, a0 + math.tau / 3):
                pts += [(x + math.cos(a) * radio, y + math.sin(a) * radio, zt),
                        (x + math.cos(a) * radio * 0.97, y + math.sin(a) * radio * 0.97, zt + alturas[j] * 0.35)]
            am = a0 + math.tau / 6
            pts.append((x + math.cos(am) * radio * 0.6, y + math.sin(am) * radio * 0.6, zt + alturas[j]))
            k.agregar(casco(pts), tono_piedra, 'escenario')
        j = alturas.index(min(alturas))   # el musgo se asienta en el trozo más bajo
        a = math.tau * j / 3 + 0.3 + math.tau / 6
        c = Vector((x + math.cos(a) * radio * 0.5, y + math.sin(a) * radio * 0.5, zt + alturas[j] * 0.35 + 0.03))
        k.agregar(casco([c + Vector(p) for p in ((0.3, 0, 0.04), (-0.25, 0.15, 0.04), (0, -0.28, 0.04), (0.1, 0.1, -0.25),
                                                  (-0.1, -0.1, -0.3))]), tono_musgo, 'escenario')
        # Tambor caído al lado
        ang = rnd.uniform(0, math.tau) if caida is None else math.radians(caida) + rnd.uniform(-0.4, 0.4)
        d = Vector((math.cos(ang), math.sin(ang), 0))
        p = Vector((x, y, z)) + d * (radio * 2.6 + h * 0.5)
        r = radio * 0.98
        k.agregar(prisma(8, r, h * 0.97, giro=rnd.uniform(0, 22)), tono_piedra, 'escenario',
                  colocar((p.x, p.y, z + r * 0.92), (90, 0, math.degrees(ang) + 90 + rnd.uniform(-15, 15))))
        k.agregar(casco([Vector((p.x, p.y, z + r * 1.9)) + Vector(q) for q in
                         ((0.35, 0.1, 0), (-0.3, 0.12, 0), (0.1, -0.2, 0.0), (0, 0, -0.18), (0.2, 0.15, -0.12))]),
                  tono_musgo, 'escenario')
        e = max(h, r * 2) / 2
        cajas.append(((p.x - e, p.y - e, z), (p.x + e, p.y + e, z + r * 1.8)))
    return cajas


# Contorno frontal de la cabeza en el dibujo (u, v) con la base enterrada en v=200; 145 px = 3 m
CABEZA = [(90, 200), (80, 120), (100, 70), (150, 55), (200, 70), (220, 120), (210, 200)]


def cabeza_gigante(k, base, alto, rot_z, rnd):
    """Rostro de guardián: ojos cerrados, banda con el sol, nariz, boca y corona de musgo.
    El frente (-Y local) gira 'rot_z' grados."""
    s = alto / 145.0
    m = colocar(base, (rnd.uniform(-3, 3), rnd.uniform(-3, 3), rot_z))
    fondo = 2.4

    def p(u, v, y):
        return m @ Vector(((u - 150) * s, y, (200 - v) * s))

    frente = -fondo / 2
    pts = [p(u, v, frente) for u, v in CABEZA]
    pts += [p(150 + (u - 150) * 1.04, v + (4 if v < 120 else 0), 0) for u, v in CABEZA]
    pts += [p(150 + (u - 150) * 0.9, v + 8, fondo / 2) for u, v in CABEZA]
    pts += [p(u, 230, y) for u in (95, 205) for y in (frente, fondo / 2)]
    k.agregar(casco(pts), tono_piedra, 'escenario')

    def relieve(contorno, color, salida, y0=frente):
        vs = [p(u, v, y0 - 0.01) for u, v in contorno] + [p(u, v, y0 - salida) for u, v in contorno]
        k.agregar(casco(vs), color, 'escenario')

    relieve([(94, 92), (206, 92), (202, 76), (98, 76)], 'piedra_sombra', 0.1)
    glifo_sol(k, m @ Matrix.Translation(((0) * s, frente - 0.115, (200 - 84) * s)), 6.5 * s)
    relieve([(106, 108), (194, 108), (190, 116), (110, 116)], 'piedra_oscura', 0.14)
    for x0 in (114, 156):
        relieve([(x0, 127), (x0 + 15, 133), (x0 + 30, 127), (x0 + 15, 130)], 'piedra_oscura', 0.05)
    k.agregar(casco([p(150, 118, frente - 0.02), p(138, 154, frente - 0.02), p(162, 154, frente - 0.02),
                     p(150, 152, frente - 0.3)]), tono_piedra, 'escenario')
    relieve([(124, 170), (176, 170), (168, 182), (132, 182)], 'piedra_oscura', 0.06)
    musgo = [p(u, v - 2, y) for (u, v) in ((100, 70), (150, 55), (200, 70)) for y in (frente - 0.05, 0, fondo / 2 + 0.05)]
    musgo += [p(u, v, frente - 0.06) for (u, v) in ((106, 78), (126, 84), (164, 84), (198, 80))]
    musgo += [p(150, 90, 0)]
    k.agregar(casco(musgo), tono_musgo, 'escenario')
    # Montículo de tierra donde se hunde
    x, y, z = base
    k.agregar(prisma(8, 118 * s * 0.85, 0.3, radio_sup=118 * s * 0.65), 'selva_tierra_oscura', 'escenario',
              colocar((x, y, z + 0.1), (0, 0, rot_z + 10)))


def escalinata(k, x0, x1, y_inicio, z_base, escalones, huella, contrahuella, sentido=-1, alfardas=0.0):
    """Escalones a lo largo de Y (sentido -1 = hacia -Y) con alfardas inclinadas a los lados."""
    cajas = []
    for i in range(escalones):
        y_a = y_inicio + sentido * huella * i
        y_b = y_a + sentido * huella
        z_top = z_base + contrahuella * (i + 1)
        cy, cz = (y_a + y_b) / 2, (z_base + z_top) / 2
        k.agregar(caja_biselada(x1 - x0, huella * 1.02, z_top - z_base, 0.05), tono_piedra, 'escenario',
                  colocar(((x0 + x1) / 2, cy, cz)))
        cajas.append(((x0, min(y_a, y_b), z_base), (x1, max(y_a, y_b), z_top)))
    if alfardas > 0:
        y_fin = y_inicio + sentido * huella * escalones
        z_fin = z_base + contrahuella * escalones
        for xa, xb in ((x0 - alfardas, x0), (x1, x1 + alfardas)):
            pts = [(x, y, z) for x in (xa, xb) for (y, z) in ((y_inicio + sentido * -0.1, z_base), (y_inicio, z_base + 0.35),
                                                           (y_fin, z_fin + 0.35), (y_fin, z_base))]
            k.agregar(casco(pts), tono_piedra, 'escenario')
    return cajas


def piramide(k, centro, base, alto, material_oro, rnd, cuerpos=5):
    """Pirámide de la hoja: cinco cuerpos con labio claro y musgo en las repisas, escalinata central entre
    alfardas y santuario con puerta y sol dorados (material sin niebla: se ve desde toda la selva)."""
    cx, cy, cz = centro
    alto_templo = alto * 0.17
    h = (alto - alto_templo) / cuerpos
    ancho_esc = base * 0.14
    frente = []
    for i in range(cuerpos):
        lado = base * (1 - i * 0.16)
        z0 = cz + h * i
        k.agregar(caja_biselada(lado, lado, h * 0.94, 0.4), tono_piedra, 'escenario', colocar((cx, cy, z0 + h * 0.47)))
        k.agregar(caja_biselada(lado * 0.985, lado * 0.985, h * 0.08, 0.15), 'piedra_luz', 'escenario',
                  colocar((cx, cy, z0 + h * 0.96)))
        frente.append((lado, z0))
        # Musgo que gotea de la repisa, en el frente y los lados
        for _ in range(4):
            cara = rnd.choice(((0, 1), (1, 0), (-1, 0)))
            t = rnd.uniform(-0.42, 0.42) * lado
            if cara == (0, 1) and abs(t) < ancho_esc * 0.75:
                t = math.copysign(ancho_esc * 0.75 + abs(t) * 0.3, t if t else 1)
            ex = cx + (cara[0] * lado / 2 if cara[0] else t)
            ey = cy + (cara[1] * lado / 2 if cara[1] else t)
            ez = z0 + h
            tx, ty = (0, 1) if cara[0] else (1, 0)
            largo, caida = rnd.uniform(3, 7), rnd.uniform(2, 4.5)
            ox, oy = cara[0] * 0.25, cara[1] * 0.25
            pts = [(ex + tx * largo + ox, ey + ty * largo + oy, ez + 0.1), (ex - tx * largo + ox, ey - ty * largo + oy, ez + 0.1),
                   (ex - cara[0] * 2, ey - cara[1] * 2, ez + 0.1), (ex + tx * largo * 0.4 + ox, ey + ty * largo * 0.4 + oy, ez - caida),
                   (ex - tx * largo * 0.5 + ox, ey - ty * largo * 0.5 + oy, ez - caida * 0.6)]
            k.agregar(casco(pts), tono_musgo, 'escenario')
    # Escalinata central hacia +Y (mira al jugador): cada cuerpo se sube por una rampa de peldaños
    # apoyada en su cara frontal, entre dos alfardas
    corrida = base * 0.08
    n = 8
    for (lado, z0) in frente:
        y_cara = cy + lado / 2
        y_pie = y_cara + corrida
        for j in range(n):
            f1 = (j + 1) / n
            y_frente = y_pie - corrida * j / n
            k.agregar(prisma(4, 1, 1, giro=45), 'piedra_luz' if j % 2 == 0 else 'piedra', 'escenario',
                      colocar((cx, y_frente - corrida / n / 2, z0 + h * f1 / 2),
                              escala=(ancho_esc / 1.414, corrida / n / 1.414, h * f1)))
        for sg in (1, -1):
            xa, xb = cx + sg * ancho_esc / 2, cx + sg * (ancho_esc / 2 + 1.6)
            pts = [(x, y, z) for x in (xa, xb) for (y, z) in ((y_pie + 0.4, z0), (y_pie + 0.4, z0 + 1.2),
                                                           (y_cara, z0 + h + 1.2), (y_cara, z0))]
            k.agregar(casco(pts), tono_piedra, 'escenario')
    # Santuario de la cima
    lado = base * (1 - (cuerpos - 1) * 0.16)
    z = cz + h * cuerpos
    w = lado * 0.62
    hb = alto_templo * 0.62
    k.agregar(caja_biselada(w, w * 0.8, hb, 0.3), tono_piedra, 'escenario', colocar((cx, cy, z + hb / 2)))
    k.agregar(caja_biselada(w * 1.12, w * 0.92, alto_templo * 0.16, 0.25, conico=0.9), 'piedra_luz', 'escenario',
              colocar((cx, cy, z + hb + alto_templo * 0.08)))
    puerta_w, puerta_h = w * 0.3, hb * 0.78
    k.agregar(caja_biselada(puerta_w, 0.6, puerta_h, 0.1), 'oro_brillante', 'escenario',
              colocar((cx, cy + w * 0.4 + 0.05, z + puerta_h / 2)), material=material_oro)
    # Sol de la crestería: disco dorado que brilla a través de la niebla
    zr = z + hb + alto_templo * 0.16
    k.agregar(caja_biselada(w * 0.5, w * 0.25, alto_templo * 0.2, 0.2), tono_piedra, 'escenario',
              colocar((cx, cy, zr + alto_templo * 0.1)))
    k.agregar(prisma(12, alto_templo * 0.2, 0.5), 'oro_brillante', 'escenario',
              colocar((cx, cy + w * 0.13 + 0.3, zr + alto_templo * 0.32), (90, 0, 0)), material=material_oro)
    return zr + alto_templo * 0.52


def fachada_santuario(k, centro_y, z_base, ancho, alto, rnd, material_runa):
    """Fachada del santuario con pórtico y puerta cerrada (se abre en la zona 2)."""
    y = centro_y
    mitad = ancho / 2
    hueco = 2.2
    for sgn in (1, -1):
        x0, x1 = sgn * hueco, sgn * mitad
        bloque(k, ((x0 + x1) / 2, y, z_base + alto / 2), (abs(x1 - x0), 3.0, alto), rnd, bisel=0.3)
    bloque(k, (0, y, z_base + 7.2), (hueco * 2 + 0.6, 3.0, 1.6), rnd, bisel=0.2)
    for i in range(3):
        bloque(k, (0, y + 0.2, z_base + alto + 0.5 + i * 0.9), (ancho * (0.8 - i * 0.22), 2.6, 0.9), rnd, bisel=0.15)
    # Soles tallados a los lados del pórtico y musgo sobre el muro
    for sgn in (1, -1):
        glifo_sol(k, colocar((sgn * (hueco + 4.6), y - 1.52, z_base + 6.2)), 0.7)
    # La puerta es un objeto aparte (puerta_santuario): se hunde en el suelo con la Manipulación
    for sgn in (1, -1):
        columna(k, (sgn * (hueco + 0.7), y - 2.2, z_base), 6.4, 0.45, rnd, liana=(sgn > 0))
    return [((-mitad, y - 1.5, z_base), (-hueco, y + 1.5, z_base + alto)),
            ((hueco, y - 1.5, z_base), (mitad, y + 1.5, z_base + alto)),
            ((-hueco, y - 1.5, z_base + 6.4), (hueco, y + 1.5, z_base + 8.0))]   # dintel


def puerta_santuario(k, hueco, alto, material_runa):
    """Puerta de piedra del pórtico (centrada en el origen) con el disco de runas."""
    k.agregar(caja_biselada(hueco * 2, 0.6, alto, 0.08), 'piedra_sombra', 'escenario')
    k.agregar(prisma(12, 1.0, 0.1, radio_sup=1.0), 'cristal_runa', 'escenario',
              colocar((0, -0.35, 0.4), (90, 0, 0)), material=material_runa)


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
