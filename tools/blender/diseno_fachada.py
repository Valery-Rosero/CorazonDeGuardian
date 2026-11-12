"""Diseño del pórtico del santuario en la meseta (tablero docs/previews/fachada_tablero.png).

Python puro: lo leen el constructor (temple_builder.fachada_santuario y el atrio de build_zona_1_selva)
y el script del tablero (tools/disenos/tablero_fachada.py). Mismo lenguaje que la gran pirámide:
talud, tablero con friso de soles, cornisa clara, dintel escalonado, crestería con el sol.
Medidas en metros, relativas al centro de la fachada sobre la terraza: x a la derecha, y hacia el
jugador (el frente mira al puente), z hacia arriba desde el suelo de la terraza.
"""

ANCHO = 24.0          # de x = -12 a 12 (la terraza)
FONDO = 3.0           # grosor del muro (de y = +1,5 a -1,5)
HUECO = 2.2           # media anchura de la puerta (la puerta mide 4,4 × 6,4 y se hunde con la Manipulación)
ALTO_PUERTA = 6.4
ALTO_MURO = 8.0
TALUD = dict(alto=1.4, salida=1.2)          # zócalo inclinado al pie de los muros, a los lados de la puerta
FRISO = dict(z=3.0, alto=3.2, margen=0.7)   # panel oscuro con dos soles por lado
SOLES_X = (5.6, 9.0)                        # centros de los soles (a cada lado)
RADIO_SOL = 0.85
CORNISA = dict(alto=0.8, vuelo=0.35)
JAMBA = dict(ancho=0.8, salida=0.35)        # marco de la puerta
DINTEL = ((6.0, 0.8), (7.4, 0.5))           # (ancho, alto) de los dos escalones del dintel
CRESTA = dict(ancho=10.0, alto=3.6, fondo=1.0, radio_sol=1.15)
ALMENAS = dict(cada=2.0, ancho=1.0, alto=0.8)
COLUMNAS_X = 3.8                            # columnas del pórtico delante de la puerta
COLUMNAS_Y = 1.5                            # cuánto salen por delante del muro
VIGA = dict(z=6.4, alto=0.8, fondo=1.2)     # viga sobre las columnas, con tres soles pequeños
ANTORCHAS_X = 10.2                          # antorchas delante del friso
PASILLO = 4.4                               # losas claras del atrio, de la losa a la puerta
ESTATUAS = dict(x=7.4, y=4.0, alto=4.2)     # sacerdotes del sol a los lados, en la terraza

ATRIO_FONDO = 154.5 - 142.6                 # de la cara de la fachada al borde delantero de la terraza (la losa)

# El atrio: un muro bajo en el borde delantero de la terraza con la losa como portón (no se rodea)
ATRIO = dict(alto=2.4, fondo=0.8, desde_x=6.0, hasta_x=12.0, remate=0.25)
# Barandas invisibles en los costados de la terraza: ni saltando desde los tambores caídos se sube
BARRERA_ALTO = 4.0
