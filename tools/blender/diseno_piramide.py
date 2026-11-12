"""Diseño de la gran pirámide de la selva (tablero docs/previews/piramide_tablero.png).

Python puro (sin Blender): lo leen el constructor (temple_builder.piramide) y el script que dibuja el
tablero (tools/disenos/tablero_piramide.py), así el modelo sale exactamente del dibujo.
Medidas en metros, en el sistema de la pirámide: x a la derecha, y hacia el jugador (el frente), z arriba.
"""

BASE = 96.0            # lado del primer cuerpo (la huella de siempre: no toca la meseta)
ALTO = 84.0            # hasta el sol de la crestería: asoma sobre el risco de la cascada (26 m)
CUERPOS = 7
PASO = 11.0            # cada cuerpo es 11 m más angosto que el de abajo: terrazas de 4,4 m
ALTO_TEMPLO = 13.0
ALTO_CUERPO = (ALTO - ALTO_TEMPLO) / CUERPOS

# Perfil de cada cuerpo, de abajo arriba (fracciones de su altura): talud inclinado, tablero vertical
# con un friso de soles y una cornisa que vuela y dibuja una línea de sombra
TALUD, TABLERO, CORNISA = 0.36, 0.52, 0.12
RETRANQUEO = 1.4       # el talud se mete 1,4 m por lado
VUELO = 0.3            # la cornisa sale 0,3 m sobre el tablero
SOL_CADA = 7.0         # un disco solar cada 7 m del friso

# Escalinata única del suelo al templo, con alfardas y dos cabezas solares al pie
ESCALERA_ANCHO = 13.0
ESCALERA_PIE = 8.0     # sale 8 m por delante del primer cuerpo
PELDANO = 0.6          # contrahuella
ALFARDA = 2.0

# Templo de la cima: tres puertas (la central, de oro), friso, techo escalonado y crestería con el sol
TEMPLO = dict(ancho=18.0, fondo=12.0, atras=2.0, zocalo=0.8, muro=6.0, friso=1.2, techo=(0.8, 0.8), cresta=4.0,
              puerta_central=3.2, puerta_lateral=2.2, radio_sol=1.7)


def cuerpos():
    """[(i, lado de la base, z de la base, talud, tablero, cornisa)] de cada cuerpo."""
    out = []
    for i in range(CUERPOS):
        lado = BASE - i * PASO
        out.append((i, lado, i * ALTO_CUERPO, ALTO_CUERPO * TALUD, ALTO_CUERPO * TABLERO, ALTO_CUERPO * CORNISA))
    return out


def lado_cornisa(i):
    return BASE - i * PASO - 2 * RETRANQUEO + 2 * VUELO


def escalera():
    """Pie (y, z), cima (y, z), número de peldaños, huella y contrahuella."""
    y_pie = BASE / 2 + ESCALERA_PIE
    y_cima = lado_cornisa(CUERPOS - 1) / 2
    z_cima = ALTO - ALTO_TEMPLO
    n = round(z_cima / PELDANO)
    return (y_pie, 0.0), (y_cima, z_cima), n, (y_pie - y_cima) / n, z_cima / n
