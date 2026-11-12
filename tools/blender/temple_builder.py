"""Arquitectura del templo desde la hoja de escenarios (tablero «Ruinas del templo»).

  bloque_tallado  cubo biselado con un sol tallado en dorado viejo y musgo que gotea por el frente
  columna         cuatro tambores octagonales, capitel cuadrado y liana; la rota tiene la cima mellada
                  y un tambor caído al lado
  cabeza_gigante  rostro de guardián medio enterrado, ojos cerrados y banda con el sol; mira a la pirámide
  escalinata      peldaños de 40 cm entre dos alfardas
  piramide        siete cuerpos de talud y tablero, escalinata unica, templo con cresteria (tablero propio)
  fachada_santuario, atrio   el pórtico del santuario y el muro del atrio (tablero propio)
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


def piramide(k, centro, base, alto, material_oro, rnd, cuerpos=None):
    """La gran pirámide, construida con las medidas del tablero (diseno_piramide.py y
    docs/previews/piramide_tablero.png): siete cuerpos de talud, tablero con friso de soles y cornisa;
    escalinata única del suelo al templo entre alfardas, con dos cabezas solares al pie; templo de tres
    puertas con crestería y el sol dorado (material sin niebla: guía desde toda la selva); musgo, lianas,
    árboles jóvenes en las terrazas y bloques caídos. Devuelve la altura del sol (el punto que miran
    la cámara y las cinemáticas). 'base' y 'alto' deben coincidir con el diseño."""
    import diseno_piramide as D
    assert abs(base - D.BASE) < 1e-6 and abs(alto - D.ALTO) < 1e-6, 'la pirámide se construye con las medidas del tablero'
    cx, cy, cz = centro
    we = D.ESCALERA_ANCHO / 2
    libre_escalera = we + D.ALFARDA + 0.6
    # Giro de cada cara para que el frente local (-Y) mire hacia afuera: frente (+Y), derecha (+X), atrás, izquierda
    caras = ((0, 1, 180), (1, 0, 90), (0, -1, 0), (-1, 0, -90))

    def en_cara(nx, ny, dist, u):
        """Punto sobre la cara (nx, ny) a 'dist' del centro, desplazado 'u' a lo largo de ella."""
        return cx + nx * dist + (u if ny else 0), cy + ny * dist + (u if nx else 0)

    for i, lado, z0, ht, hb, hc in D.cuerpos():
        z0 += cz
        r = lado / 2
        lt = r - D.RETRANQUEO
        lc = lt + D.VUELO
        # Talud (se mete hacia arriba), tablero vertical y cornisa clara que vuela
        k.agregar(caja_biselada(lado, lado, ht, 0.25, conico=(lt * 2) / lado), tono_piedra, 'escenario', colocar((cx, cy, z0 + ht / 2)))
        k.agregar(caja_biselada(lt * 2, lt * 2, hb, 0.15), tono_piedra, 'escenario', colocar((cx, cy, z0 + ht + hb / 2)))
        k.agregar(caja_biselada(lc * 2, lc * 2, hc, 0.08), 'piedra_luz', 'escenario', colocar((cx, cy, z0 + ht + hb + hc / 2)))
        zf = z0 + ht + hb / 2              # centro del friso
        alto_friso = hb * 0.56
        for nx, ny, giro in caras:
            # Friso oscuro con soles tallados cada 7 m (en el frente, a los lados de la escalinata)
            tramos = [(-lt * 0.93, lt * 0.93)]
            if ny == 1:
                tramos = [(-lt * 0.93, -libre_escalera), (libre_escalera, lt * 0.93)]
            for u0, u1 in tramos:
                largo = u1 - u0
                if largo < 2.0:
                    continue
                px, py = en_cara(nx, ny, lt, (u0 + u1) / 2)
                k.agregar(caja_biselada(largo, 0.12, alto_friso, 0.03), 'piedra_sombra', 'escenario', colocar((px, py, zf), (0, 0, giro)))
                n_soles = max(1, int(largo // D.SOL_CADA))
                for j in range(n_soles):
                    gx, gy = en_cara(nx, ny, lt + 0.072, u0 + (j + 0.5) * largo / n_soles)
                    glifo_sol(k, colocar((gx, gy, zf), (0, 0, giro)), alto_friso * 0.3, 'piedra_luz')
            # Lianas que cuelgan de la cornisa (no delante de la escalinata)
            for _ in range(3 if i < D.CUERPOS - 1 else 1):
                u = rnd.uniform(-lc * 0.9, lc * 0.9)
                if ny == 1 and abs(u) < libre_escalera + 1:
                    continue
                largo_l = rnd.uniform(0.35, 0.8) * (hb + hc)
                lx, ly = en_cara(nx, ny, lc + 0.12, u)
                k.agregar(prisma(4, 0.09, largo_l, giro=45), 'selva_liana', 'escenario', colocar((lx, ly, z0 + D.ALTO_CUERPO - largo_l / 2)))
        # Remates de las esquinas sobre la cornisa
        for sx in (-1, 1):
            for sy in (-1, 1):
                if sy == 1 and i == D.CUERPOS - 1:
                    continue
                k.agregar(caja_biselada(1.6, 1.6, 0.9, 0.1), tono_piedra, 'escenario',
                          colocar((cx + sx * (lc - 0.8), cy + sy * (lc - 0.8), z0 + D.ALTO_CUERPO + 0.45)))
        # Musgo en la terraza (sobre la cornisa)
        zt = z0 + D.ALTO_CUERPO
        for _ in range(3):
            nx, ny, _g = caras[rnd.randrange(4)]
            u = rnd.uniform(-lc * 0.8, lc * 0.8)
            if ny == 1 and abs(u) < libre_escalera + 2:
                u = math.copysign(libre_escalera + 2 + rnd.uniform(0, 4), u if u else 1)
            mx, my = en_cara(nx, ny, lc - 1.4, u)
            pts = [(mx + rnd.uniform(-2.2, 2.2), my + rnd.uniform(-1.2, 1.2), zt + 0.02) for _ in range(7)]
            pts += [(mx + rnd.uniform(-1.2, 1.2), my + rnd.uniform(-0.6, 0.6), zt + rnd.uniform(0.15, 0.4)) for _ in range(4)]
            k.agregar(casco(pts), tono_musgo, 'escenario')

    # Árboles jóvenes que crecen en algunas terrazas, a los lados
    for i in (1, 2, 4):
        _i, lado, z0, ht, hb, hc = D.cuerpos()[i]
        lc = lado / 2 - D.RETRANQUEO + D.VUELO
        for nx in (1, -1):
            tx, ty, tz = cx + nx * (lc - 1.6), cy + rnd.uniform(-lc * 0.5, lc * 0.5), cz + z0 + D.ALTO_CUERPO
            alto_t = rnd.uniform(3.5, 5.5)
            k.agregar(prisma(6, 0.22, alto_t, radio_sup=0.14), 'selva_tronco', 'escenario', colocar((tx, ty, tz + alto_t / 2)))
            copa = [(tx + rnd.uniform(-1.8, 1.8), ty + rnd.uniform(-1.8, 1.8), tz + alto_t + rnd.uniform(-0.6, 1.4)) for _ in range(12)]
            k.agregar(casco(copa), 'selva_copa_luz', 'escenario')

    # Escalinata: macizo inclinado, peldaños y alfardas; dos cabezas solares al pie
    (y_pie, _z), (y_cima, z_cima), n, huella, contra = D.escalera()
    yp, yc_ = cy + y_pie, cy + y_cima
    k.agregar(casco([p for x in (cx - we, cx + we) for p in ((x, yp, cz), (x, yc_, cz + z_cima), (x, yc_, cz))]), tono_piedra, 'escenario')
    for j in range(n):
        y_frente = yp - j * huella
        z_top = cz + (j + 1) * contra
        k.agregar(prisma(4, 1, 1, giro=45), 'piedra_luz' if j % 2 == 0 else 'piedra', 'escenario',
                  colocar((cx, y_frente - huella / 2, z_top - contra * 0.8), escala=((we * 2 - 0.02) / 1.414, huella / 1.414, contra * 1.6)))
    for sg in (1, -1):
        xa, xb = cx + sg * we, cx + sg * (we + D.ALFARDA)
        pts = [(x, y, z) for x in (xa, xb) for (y, z) in ((yp + 0.5, cz), (yp + 0.5, cz + 1.4), (yc_, cz + z_cima + 1.2), (yc_, cz + z_cima - 3))]
        k.agregar(casco(pts), tono_piedra, 'escenario')
        cabeza_gigante(k, (cx + sg * (we + D.ALFARDA / 2), yp + 2.2, cz), 3.4, 180, rnd)

    # Bloques caídos al pie
    for _ in range(14):
        a = rnd.uniform(0, math.tau)
        rr = D.BASE / 2 + rnd.uniform(1, 7)
        bx, by = cx + math.cos(a) * rr, cy + math.sin(a) * rr
        if by > cy + D.BASE / 2 - 2 and abs(bx - cx) < libre_escalera + 3:
            continue
        tam = (rnd.uniform(1.2, 2.6), rnd.uniform(1.0, 2.0), rnd.uniform(0.8, 1.6))
        bloque(k, (bx, by, cz + tam[2] * 0.35), tam, rnd, rot=(rnd.uniform(-12, 12), rnd.uniform(-12, 12), rnd.uniform(0, 90)))

    # Templo de la cima
    T = D.TEMPLO
    z = cz + z_cima
    ty = cy - T['atras']
    aw, af = T['ancho'] / 2, T['fondo'] / 2
    k.agregar(caja_biselada(T['ancho'] + 1, T['fondo'] + 1, T['zocalo'], 0.1), 'piedra_luz', 'escenario', colocar((cx, ty, z + T['zocalo'] / 2)))
    z1 = z + T['zocalo']
    k.agregar(caja_biselada(T['ancho'], T['fondo'], T['muro'], 0.12), tono_piedra, 'escenario', colocar((cx, ty, z1 + T['muro'] / 2)))
    yf = ty + af                        # cara frontal del templo
    alto_c, alto_l = T['muro'] * 0.78, T['muro'] * 0.66
    k.agregar(caja_biselada(T['puerta_central'], 0.3, alto_c, 0.04), 'oro_brillante', 'escenario',
              colocar((cx, yf + 0.1, z1 + alto_c / 2)), material=material_oro)
    for sg in (1, -1):
        k.agregar(caja_biselada(T['puerta_lateral'], 0.3, alto_l, 0.04), 'piedra_oscura', 'escenario',
                  colocar((cx + sg * 5.5, yf + 0.1, z1 + alto_l / 2)))
        for x in (sg * 3.0, sg * (aw - 0.45)):
            k.agregar(caja_biselada(0.8, 0.5, T['muro'], 0.06), 'piedra_luz', 'escenario', colocar((cx + x, yf, z1 + T['muro'] / 2)))
    for x, w, h in ((0, T['puerta_central'], alto_c), (5.5, T['puerta_lateral'], alto_l), (-5.5, T['puerta_lateral'], alto_l)):
        k.agregar(caja_biselada(w + 0.7, 0.4, 0.35, 0.04), 'piedra_luz', 'escenario', colocar((cx + x, yf, z1 + h + 0.18)))
    z2 = z1 + T['muro']
    k.agregar(caja_biselada(T['ancho'] + 0.6, T['fondo'] + 0.6, T['friso'], 0.08), 'piedra_luz', 'escenario',
              colocar((cx, ty, z2 + T['friso'] / 2)))
    for x in (-6.8, -3.4, 0, 3.4, 6.8):
        glifo_sol(k, colocar((cx + x, yf + 0.3 + 0.012, z2 + T['friso'] / 2), (0, 0, 180)), T['friso'] * 0.32)
    z3 = z2 + T['friso']
    h1, h2 = T['techo']
    k.agregar(caja_biselada(T['ancho'] - 1, T['fondo'] - 1, h1, 0.08), tono_piedra, 'escenario', colocar((cx, ty, z3 + h1 / 2)))
    k.agregar(caja_biselada(T['ancho'] - 3, T['fondo'] - 3, h2, 0.08), tono_piedra, 'escenario', colocar((cx, ty, z3 + h1 + h2 / 2)))
    z4 = z3 + h1 + h2
    # Crestería: muro calado (huecos oscuros) y el sol dorado
    k.agregar(caja_biselada(10, 1.2, T['cresta'], 0.1), tono_piedra, 'escenario', colocar((cx, ty, z4 + T['cresta'] / 2)))
    for x in (-3, 0, 3):
        k.agregar(caja_biselada(1.6, 0.1, 1.2, 0.02), 'piedra_oscura', 'escenario', colocar((cx + x, ty + 0.6, z4 + 1.2)))
    rs = T['radio_sol']
    zs = z4 + T['cresta'] - rs * 0.6
    ys = ty + 0.6 + 0.3
    k.agregar(prisma(16, rs, 0.4), 'oro_brillante', 'escenario', colocar((cx, ys, zs), (90, 0, 0)), material=material_oro)
    for a in range(12):
        ang = math.tau * a / 12
        k.agregar(prisma(3, 0.22, rs * 0.75, radio_sup=0.02), 'oro_brillante', 'escenario',
                  colocar((cx + math.cos(ang) * rs * 1.38, ys, zs + math.sin(ang) * rs * 1.38), (0, 90 - math.degrees(ang), 0)),
                  material=material_oro)
    return zs


def fachada_santuario(k, centro_y, z_base, rnd, material_oro):
    """Pórtico del santuario, construido con las medidas del tablero (diseno_fachada.py y
    docs/previews/fachada_tablero.png), en el lenguaje de la gran pirámide: talud, tablero con friso de
    soles, cornisa clara, almenas, crestería calada con el sol de oro; jambas y dintel escalonado; un
    pórtico de dos columnas con viga y dos sacerdotes del sol de piedra. El frente mira a +Y (al puente).
    La puerta es un objeto aparte (puerta_santuario): se hunde con la Manipulación.
    Devuelve las cajas (min, max) de colisión."""
    import diseno_fachada as D
    import interior_builder as ib
    y = centro_y
    yf = y + D.FONDO / 2                        # cara delantera del muro
    m, h, j = D.ANCHO / 2, D.HUECO, D.JAMBA['ancho']
    z0 = z_base
    zc = z0 + D.ALTO_MURO                       # pie de la cornisa
    zcc = zc + D.CORNISA['alto']                # encima de la cornisa
    interior = m - D.ATRIO['fondo']             # cara interior de los muros del atrio
    al_frente = (0, 0, 180)                     # los glifos miran a su -Y local: girados miran al puente
    cajas = []
    for s in (1, -1):
        # Muro a cada lado de la puerta y talud al pie (se hunde 5 cm en la terraza: sin caras pegadas)
        k.agregar(caja_biselada(m - h, D.FONDO, D.ALTO_MURO, 0.12), tono_piedra, 'escenario',
                  colocar((s * (m + h) / 2, y, z0 + D.ALTO_MURO / 2)))
        cajas.append(((min(s * h, s * m), y - D.FONDO / 2, z0), (max(s * h, s * m), yf, zc)))
        xa, xb = sorted((s * (h + j), s * (interior - 0.02)))
        t = D.TALUD
        k.agregar(casco([(x, yy, zz) for x in (xa, xb) for (yy, zz) in ((yf - 0.05, z0 - 0.05), (yf + t['salida'], z0 - 0.05),
                                                                        (yf - 0.05, z0 + t['alto']))]), tono_piedra, 'escenario')
        cajas.append(((xa, yf, z0), (xb, yf + t['salida'] * 0.5, z0 + t['alto'] * 0.5)))
        # Friso oscuro con dos soles en relieve
        f = D.FRISO
        xa, xb = sorted((s * (h + j + f['margen']), s * (interior - f['margen'])))
        k.agregar(caja_biselada(xb - xa, 0.2, f['alto'], 0.04), 'piedra_sombra', 'escenario',
                  colocar(((xa + xb) / 2, yf, z0 + f['z'] + f['alto'] / 2)))
        for x in D.SOLES_X:
            glifo_sol(k, colocar((s * x, yf + 0.112, z0 + f['z'] + f['alto'] / 2), al_frente), D.RADIO_SOL, 'piedra_luz')
        # Jamba clara (2 cm hacia dentro del canto del muro: no comparten cara)
        xa, xb = sorted((s * (h + 0.02), s * (h + j)))
        k.agregar(caja_biselada(xb - xa, D.JAMBA['salida'] + 0.05, D.ALTO_PUERTA, 0.05), 'piedra_luz', 'escenario',
                  colocar(((xa + xb) / 2, yf + (D.JAMBA['salida'] - 0.05) / 2, z0 + D.ALTO_PUERTA / 2)))
        # Almenas sobre la cornisa, fuera de la crestería
        a = D.ALMENAS
        x = D.CRESTA['ancho'] / 2 + 0.8
        while x + a['ancho'] / 2 <= m:
            k.agregar(caja_biselada(a['ancho'], a['ancho'], a['alto'], 0.08), tono_piedra, 'escenario',
                      colocar((s * x, y, zcc + a['alto'] / 2)))
            x += a['cada']
        # Columnas del pórtico y sacerdotes del sol (de piedra, como los del santuario pero grises)
        xc, yc = s * D.COLUMNAS_X, yf + D.COLUMNAS_Y
        columna(k, (xc, yc, z0), D.VIGA['z'], 0.42, rnd, liana=(s > 0))
        cajas.append(((xc - 0.55, yc - 0.55, z0), (xc + 0.55, yc + 0.55, z0 + D.VIGA['z'])))
        e = D.ESTATUAS
        ib.sacerdote(k, s * e['x'], yf + e['y'], 180, e['alto'], z=z0, piedra=True)
        lado = 0.8 * e['alto'] / 5
        cajas.append(((s * e['x'] - lado, yf + e['y'] - lado, z0), (s * e['x'] + lado, yf + e['y'] + lado, z0 + e['alto'] * 0.8)))
    # Sobre la puerta: el bloque entra 20 cm en cada muro (sin caras coplanares)
    k.agregar(caja_biselada(2 * h + 0.4, D.FONDO, D.ALTO_MURO - D.ALTO_PUERTA, 0.05), tono_piedra, 'escenario',
              colocar((0, y, z0 + (D.ALTO_PUERTA + D.ALTO_MURO) / 2)))
    cajas.append(((-h, y - D.FONDO / 2, z0 + D.ALTO_PUERTA), (h, yf, zc)))
    # Dintel escalonado
    z = z0 + D.ALTO_PUERTA
    for n, (ancho, alto) in enumerate(D.DINTEL):
        salida = 0.45 + 0.2 * n
        k.agregar(caja_biselada(ancho, salida + 0.05, alto, 0.05), 'piedra_luz', 'escenario',
                  colocar((0, yf + (salida - 0.05) / 2, z + alto / 2)))
        z += alto
    # Cornisa clara que vuela, musgo encima y lianas que cuelgan
    c = D.CORNISA
    k.agregar(caja_biselada(D.ANCHO + 2 * c['vuelo'], D.FONDO + 2 * c['vuelo'], c['alto'], 0.08), 'piedra_luz', 'escenario',
              colocar((0, y, zc + c['alto'] / 2)))
    for x0 in (-8.6, 7.4):
        pts = [(x0 + rnd.uniform(-1.6, 1.6), y + rnd.uniform(-1.4, 1.6), zcc + 0.02) for _ in range(7)]
        pts += [(x0 + rnd.uniform(-0.9, 0.9), y + rnd.uniform(-0.5, 0.9), zcc + rnd.uniform(0.12, 0.3)) for _ in range(4)]
        k.agregar(casco(pts), tono_musgo, 'escenario')
    for x, largo in ((-7.1, 3.2), (8.0, 2.4), (10.6, 3.6), (-10.9, 1.8)):
        k.agregar(prisma(4, 0.09, largo, giro=45), 'selva_liana', 'escenario',
                  colocar((x, yf + c['vuelo'] + 0.12, zc + 0.3 - largo / 2)))
    # Crestería calada con el sol de oro
    cr = D.CRESTA
    k.agregar(caja_biselada(cr['ancho'], cr['fondo'], cr['alto'], 0.08), tono_piedra, 'escenario',
              colocar((0, y, zcc + cr['alto'] / 2)))
    for x in (-3.4, 3.4):
        k.agregar(caja_biselada(1.4, 0.1, 1.4, 0.02), 'piedra_oscura', 'escenario',
                  colocar((x, y + cr['fondo'] / 2 + 0.03, zcc + 1.3)))
    rs = cr['radio_sol']
    zs = zcc + cr['alto'] - rs * 1.1
    ys = y + cr['fondo'] / 2 + 0.15
    k.agregar(prisma(16, rs, 0.3), 'oro_brillante', 'escenario', colocar((0, ys, zs), (90, 0, 0)), material=material_oro)
    for a in range(12):
        ang = math.tau * a / 12
        k.agregar(prisma(3, 0.2, rs * 0.7, radio_sup=0.02), 'oro_brillante', 'escenario',
                  colocar((math.cos(ang) * rs * 1.36, ys, zs + math.sin(ang) * rs * 1.36), (0, 90 - math.degrees(ang), 0)),
                  material=material_oro)
    # Viga del pórtico sobre las columnas, con tres soles pequeños
    v = D.VIGA
    yc = yf + D.COLUMNAS_Y
    k.agregar(caja_biselada(2 * (D.COLUMNAS_X + 0.8), v['fondo'], v['alto'], 0.06), 'piedra_luz', 'escenario',
              colocar((0, yc, z0 + v['z'] + v['alto'] / 2)))
    for x in (-2.2, 0.0, 2.2):
        glifo_sol(k, colocar((x, yc + v['fondo'] / 2 + 0.012, z0 + v['z'] + v['alto'] / 2), al_frente), 0.22, 'piedra_sombra')
    # Losas claras del pasillo, de la puerta a la losa del atrio
    n = 4
    largo = (D.ATRIO_FONDO - D.ATRIO['fondo']) / n
    for i in range(n):
        k.agregar(caja_biselada(D.PASILLO, largo - 0.12, 0.06, 0.02), 'piedra_luz' if i % 2 == 0 else 'piedra', 'escenario',
                  colocar((0, yf + largo * (i + 0.5), z0 + 0.03)))
    return cajas


def atrio(k, centro_y, z_meseta, z_terraza, rnd):
    """Muro del atrio (tablero del pórtico): al frente, de la escalinata a las esquinas, con pilares en las
    esquinas; a los costados, hasta la fachada. La losa de la escalinata es la única entrada: los
    colisionadores suben a BARRERA_ALTO sobre la terraza (no se saltan ni desde los tambores caídos).
    Devuelve las cajas (min, max) de colisión."""
    import diseno_fachada as D
    A = D.ATRIO
    yf = centro_y + D.FONDO / 2
    y1 = yf + D.ATRIO_FONDO                     # borde delantero de la terraza
    y0 = y1 - A['fondo']
    m = D.ANCHO / 2
    tope = z_terraza + A['alto']
    techo = z_terraza + D.BARRERA_ALTO
    cajas = []
    for s in (1, -1):
        # Tramo delantero: del canto de la losa al pilar de la esquina (entra en el pilar)
        xa, xb = sorted((s * A['desde_x'], s * (m - 0.5)))
        k.agregar(caja_biselada(xb - xa, A['fondo'], tope - z_meseta, 0.06), tono_piedra, 'escenario',
                  colocar(((xa + xb) / 2, (y0 + y1) / 2, (z_meseta + tope) / 2)))
        k.agregar(caja_biselada(xb - xa - 0.1, A['fondo'] + 0.16, A['remate'], 0.04), 'piedra_luz', 'escenario',
                  colocar(((xa + xb) / 2 + s * 0.05, (y0 + y1) / 2, tope + A['remate'] / 2)))
        glifo_sol(k, colocar(((xa + xb) / 2, y1 + 0.012, z_terraza + 0.6), (0, 0, 180)), 0.45, 'piedra_luz')
        cajas.append(((xa, y0, z_meseta), (xb, y1, techo)))
        # Pilar de la esquina: de m - 0.8 a m + 0.2, más alto y más grueso que el muro
        pa, pb = sorted((s * (m - 0.8), s * (m + 0.2)))
        k.agregar(caja_biselada(1.0, A['fondo'] + 0.2, tope + 0.6 - z_meseta, 0.08), tono_piedra, 'escenario',
                  colocar(((pa + pb) / 2, (y0 + y1) / 2, (z_meseta + tope + 0.6) / 2)))
        k.agregar(caja_biselada(1.2, A['fondo'] + 0.4, 0.3, 0.05), 'piedra_luz', 'escenario',
                  colocar(((pa + pb) / 2, (y0 + y1) / 2, tope + 0.75)))
        cajas.append(((pa, y0 - 0.1, z_meseta), (pb, y1 + 0.1, techo)))
        # Costado: de detrás del pilar a la fachada (sobre la terraza; 2 cm dentro del canto: sin caras pegadas)
        xa, xb = sorted((s * (m - A['fondo']), s * (m - 0.02)))
        ya, yb = yf - 0.1, y0 + 0.2
        k.agregar(caja_biselada(xb - xa, yb - ya, A['alto'] + 0.05, 0.06), tono_piedra, 'escenario',
                  colocar(((xa + xb) / 2, (ya + yb) / 2, z_terraza + (A['alto'] - 0.05) / 2)))
        k.agregar(caja_biselada(xb - xa + 0.16, yb - ya, A['remate'], 0.04), 'piedra_luz', 'escenario',
                  colocar(((xa + xb) / 2, (ya + yb) / 2, tope + A['remate'] / 2)))
        cajas.append(((min(xa, s * m), ya, z_terraza), (max(xb, s * m), yb, techo)))
        # Musgo sobre el remate
        mx = s * (m - A['fondo'] / 2)
        my = rnd.uniform(ya + 2, yb - 2)
        k.agregar(casco([(mx + rnd.uniform(-0.5, 0.5), my + rnd.uniform(-1.4, 1.4), tope + A['remate'] + 0.01) for _ in range(6)]
                        + [(mx, my, tope + A['remate'] + 0.18)]), tono_musgo, 'escenario')
    return cajas


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
