"""La Llave del Sol (tablero docs/previews/llave_tablero.png, medidas en diseno_llave.py): los cofres de
piedra con su tapa, los tres tercios del disco solar, el haz de luz de cada cofre, el pedestal de la cueva
y el hueco donde encaja cada tercio. Todo con la paleta compartida; sin texturas."""
import math

from mathutils import Vector

import diseno_llave as D
import temple_builder
from common import Constructor, caja_biselada, caja_invisible, casco, colocar, objeto_suelto, orientar_hacia, prisma, vacio
from palette import PALETA
from rock_builder import tono_piedra


def mira_a(x, y, ox, oy):
    """Giro en Z para que el frente (-Y local) de una pieza en (x, y) mire hacia (ox, oy)."""
    return math.degrees(math.atan2(ox - x, -(oy - y)))


def _rotar(v, grados):
    a = math.radians(grados)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


def tercio(k, sol, material_oro, material_gema):
    """Un tercio del disco solar en el plano XZ (el frente mira a -Y), con origen en el centro del disco:
    seis tramos convexos de oro, la banda de cristal del color del tercio y tres rayos."""
    s = D.SOL
    a0 = math.radians(D.TERCIO[sol])
    tramos = 6
    g = s['grosor'] / 2
    paso = (math.tau / 3) / tramos
    for i in range(tramos):
        aa, ab = a0 + paso * i, a0 + paso * (i + 1)
        pts = []
        for a in (aa, ab):
            for r in (s['hueco'], s['radio']):
                for y in (-g, g):
                    pts.append((math.cos(a) * r, y, math.sin(a) * r))
        k.agregar(casco(pts), 'oro_brillante', 'escenario', material=material_oro)
    # Banda de cristal: cuadriláteros sobre el frente, un poco separados de los bordes del tercio
    verts, caras = [], []
    r0, r1 = s['hueco'] * 1.5, s['gema']
    margen = 0.12
    for i in range(tramos):
        aa = a0 + margen + (math.tau / 3 - 2 * margen) * i / tramos
        ab = a0 + margen + (math.tau / 3 - 2 * margen) * (i + 1) / tramos
        base = len(verts)
        for a, r in ((aa, r0), (aa, r1), (ab, r1), (ab, r0)):
            verts.append(Vector((math.cos(a) * r, -g - 0.006, math.sin(a) * r)))
        caras.append((base, base + 1, base + 2, base + 3))
    k.agregar((verts, orientar_hacia(verts, caras, (0, -1, 0))), f'sol_{sol}', 'escenario', material=material_gema)
    # Rayos: prismas triangulares en el borde
    for i in range(s['rayos']):
        a = a0 + (math.tau / 3) * (i + 0.5) / s['rayos']
        w = 0.1
        pts = []
        for y in (-g * 0.7, g * 0.7):
            pts += [(math.cos(a - w) * s['rayo'][0], y, math.sin(a - w) * s['rayo'][0]),
                    (math.cos(a + w) * s['rayo'][0], y, math.sin(a + w) * s['rayo'][0]),
                    (math.cos(a) * s['rayo'][1], y, math.sin(a) * s['rayo'][1])]
        k.agregar(casco(pts), 'oro_brillante', 'escenario', material=material_oro)


def objeto_tercio(m, sol, pos, rot):
    """El tercio como objeto propio (el juego lo mueve: del cofre a la mano y de la mano al hueco)."""
    k = Constructor(PALETA, semilla=500 + D.SOLES.index(sol), variacion=0.0)
    tercio(k, sol, 1, 2)
    obj = objeto_suelto(f'sol_{sol}', k, [m['toon'], m['oro'], m[f'sol_{sol}']], pos, {'sol': sol})
    obj.rotation_euler = tuple(math.radians(a) for a in rot)
    return obj


def cofre(m, sol):
    """Cofre de piedra con el sol de su tercio al frente y la marca de tiza de Mateo; la tapa es otro
    objeto (gira sobre la bisagra de atrás) y es lo que se manipula con E. Dentro, el tercio acostado."""
    c = D.COFRE
    x, y, z = D.COFRES[sol]['pos']
    giro = mira_a(x, y, *D.COFRES[sol]['mira'])
    zc = c['zocalo']
    k = Constructor(PALETA, semilla=520 + D.SOLES.index(sol), variacion=0.05)
    k.agregar(caja_biselada(zc['ancho'], zc['fondo'], zc['alto'], 0.03), 'piedra_sombra', 'escenario',
              colocar((0, 0, zc['alto'] / 2)))
    k.agregar(caja_biselada(c['ancho'], c['fondo'], c['alto'], 0.04), tono_piedra, 'escenario',
              colocar((0, 0, zc['alto'] + c['alto'] / 2)))
    # Sol tallado del color del tercio (pintado con el material de cristal: brilla un poco)
    gl = c['glifo']
    temple_builder.glifo_sol(k, colocar((0, -c['fondo'] / 2 - 0.006, zc['alto'] + gl['z'])), gl['radio'], f'sol_{sol}',
                             material=1)
    # «M. S.» con tiza: trazos planos sobre el frente
    t = c['tiza']
    verts, caras = [], []
    ancho_trazo = 0.012
    esc = t['alto']
    for (a, b) in D.TRAZOS_M + D.TRAZOS_S:
        ax, az = t['x'] + a[0] * esc * 0.55, zc['alto'] + t['z'] + a[1] * esc
        bx, bz = t['x'] + b[0] * esc * 0.55, zc['alto'] + t['z'] + b[1] * esc
        largo = math.hypot(bx - ax, bz - az)
        nx, nz = -(bz - az) / largo * ancho_trazo, (bx - ax) / largo * ancho_trazo
        yf = -c['fondo'] / 2 - 0.004
        base = len(verts)
        verts += [Vector((ax - nx, yf, az - nz)), Vector((bx - nx, yf, bz - nz)), Vector((bx + nx, yf, bz + nz)),
                  Vector((ax + nx, yf, az + nz))]
        caras.append((base, base + 1, base + 2, base + 3))
    k.agregar((verts, orientar_hacia(verts, caras, (0, -1, 0))), 'tiza', 'escenario')
    obj = objeto_suelto(f'cofre_{sol}', k, [m['toon'], m[f'sol_{sol}']], (x, y, z), {'cofre': sol})
    obj.rotation_euler = (0, 0, math.radians(giro))
    hx, hy = _rotar((0, c['bisagra_y']), giro)
    alto = zc['alto'] + c['alto']
    caja_invisible(f'col_box_cofre_{sol}', (x - 0.55, y - 0.55, z), (x + 0.55, y + 0.55, z + alto + 0.1),
                   rot=(0, 0, 0))
    # Tapa: el origen está en la bisagra (borde de atrás, arriba); la geometría va hacia delante
    tp = c['tapa']
    kt = Constructor(PALETA, semilla=540 + D.SOLES.index(sol), variacion=0.05)
    kt.agregar(caja_biselada(tp['ancho'], tp['fondo'], tp['alto'], 0.04), 'piedra_luz', 'escenario',
               colocar((0, -tp['fondo'] / 2 + 0.02, tp['alto'] / 2)))
    rw, rf, ra = tp['remate']
    kt.agregar(caja_biselada(rw, rf, ra, 0.03), tono_piedra, 'escenario',
               colocar((0, -tp['fondo'] / 2 + 0.02, tp['alto'] + ra / 2)))
    temple_builder.glifo_sol(kt, colocar((0, -tp['fondo'] / 2 + 0.02, tp['alto'] + ra + 0.004), (-90, 0, 0)),
                             0.1, f'sol_{sol}')
    tapa = objeto_suelto(f'tapa_cofre_{sol}', kt, [m['toon']], (x + hx, y + hy, z + alto),
                         {'interactuable': 'cofre', 'sol': sol, 'etiqueta': 'Abrir el cofre', 'abre': c['abre']})
    tapa.rotation_euler = (0, 0, math.radians(giro))
    # El tercio, acostado dentro del cofre (frente hacia arriba), con su centro de masa en el centro del
    # cofre: así los rayos no atraviesan las paredes
    medio = math.radians(D.TERCIO[sol] + 60)
    ox, oy = _rotar((math.cos(medio) * 0.17, math.sin(medio) * 0.17), giro)
    objeto_tercio(m, sol, (x - ox, y - oy, z + zc['alto'] + c['alto'] * 0.55), (-90, 0, giro))
    # Haz de luz que sube del cofre cerrado
    h = D.HAZ
    kh = Constructor(PALETA, semilla=3, variacion=0)
    kh.agregar(prisma(8, h['radio'], h['alto'], radio_sup=h['radio_arriba'], tapas=False), 'oro_brillante', 'escenario',
               colocar((0, 0, h['alto'] / 2)))
    objeto_suelto(f'haz_cofre_{sol}', kh, [m['rayo']], (x, y, z + 0.4), {'efecto': 'rayo', 'cofre': sol})


def hueco(k, matriz, material_oro):
    """Disco oscuro donde encaja un tercio, con su aro de oro (en el plano XZ, frente hacia -Y de 'matriz')."""
    h = D.HUECO
    k.agregar(prisma(14, h['radio'] + 0.05, 0.02), 'oro_brillante', 'escenario',
              matriz @ colocar((0, 0.012, 0), (90, 0, 0)), material=material_oro)
    k.agregar(prisma(14, h['radio'], 0.03), 'piedra_oscura', 'escenario', matriz @ colocar((0, 0.0, 0), (90, 0, 0)))


def pedestal(k, m):
    """Pedestal de la cueva: columna, atril inclinado hacia la cueva y el hueco del sol de agua.
    El atril es objeto propio (se manipula con E para presentar la llave)."""
    p = D.PEDESTAL
    x, y, z = p['pos']
    giro = mira_a(x, y, *p['mira'])
    kp = Constructor(PALETA, semilla=560, variacion=0.05)
    kp.agregar(caja_biselada(0.8, 0.8, 0.16, 0.04), 'piedra_sombra', 'escenario', colocar((0, 0, 0.08)))
    kp.agregar(caja_biselada(0.46, 0.46, p['alto'] - 0.2, 0.04, conico=0.85), tono_piedra, 'escenario',
               colocar((0, 0, 0.16 + (p['alto'] - 0.2) / 2)))
    # Atril: placa inclinada hacia el frente (-Y local, que mira a la cueva)
    atril = colocar((0, 0, p['alto']), (-p['atril'], 0, 0))
    kp.agregar(caja_biselada(0.72, 0.62, 0.1, 0.03), 'piedra_luz', 'escenario', atril)
    # Hueco sobre el atril (su frente mira hacia arriba y a la cueva)
    hueco(kp, atril @ colocar((0, 0, 0.055), (-90, 0, 0)), 1)
    # Glifos de los tres soles grabados al frente de la columna: el pedestal pide la llave completa
    for i, sol in enumerate(D.SOLES):
        temple_builder.glifo_sol(kp, colocar(((i - 1) * 0.15, -0.222, 0.55)), 0.045, f'sol_{sol}')
    obj = objeto_suelto('pedestal_llave', kp, [m['toon'], m['oro']], (x, y, z),
                        {'interactuable': 'pedestal', 'etiqueta': 'Presentar la Llave del Sol'})
    obj.rotation_euler = (0, 0, math.radians(giro))
    caja_invisible('col_box_pedestal_llave', (x - 0.4, y - 0.4, z), (x + 0.4, y + 0.4, z + p['alto'] + 0.1))


def anclas():
    """Dónde queda cada tercio colocado: el juego lee la posición y el giro de estos vacíos."""
    for sol, s in D.SELLOS.items():
        x, y, z = s['pos']
        o = vacio(f'sello_{sol}', (x, y, z))
        o.rotation_euler = (math.radians(-s['inclinar']), 0, math.radians(mira_a(x, y, *s['mira'])))
