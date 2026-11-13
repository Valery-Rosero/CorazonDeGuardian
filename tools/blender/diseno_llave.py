"""La Llave del Sol (tablero docs/previews/llave_tablero.png): los tres cofres de la selva, los tres soles
y sus cerraduras (el pedestal de la cueva, la losa de las ruinas y la puerta del pórtico).

Python puro: lo leen el constructor (build_zona_1_selva.llave_del_sol y props_builder) y el script del
tablero (tools/disenos/tablero_llave.py). El juego lee los mismos nombres (src/config/llave.js).

La historia: el pueblo del sol partió la Llave del Sol en tres y escondió cada tercio en un cofre de la
selva. Cada tercio abre uno de los tres pasos: el agua, el portal de la cascada; el jade, la losa de las
ruinas; el oro, la puerta del santuario. El portal solo despierta con la llave completa: los tres tercios se
juntan sobre el pedestal, las runas se encienden y el de agua se queda. Hace siete años Mateo abrió los
mismos cofres (su marca de tiza, «M. S.», sigue en la piedra); cuando la gema lo tomó, el templo se cerró
y los soles volvieron a su sitio.

Coordenadas de Blender (metros): Z arriba, el recorrido avanza hacia -Y.
"""

# Orden de las cerraduras: el portal, la losa y la puerta
SOLES = ('agua', 'jade', 'oro')
COLOR = {'agua': '#38D0E0', 'jade': '#3FC07A', 'oro': '#FFB531'}
NOMBRE = {'agua': 'Sol de agua', 'jade': 'Sol de jade', 'oro': 'Sol de oro'}

# ---------------- Cofre de piedra (medidas en metros; el frente mira a -Y local)
COFRE = dict(
    ancho=1.1, fondo=0.72, alto=0.56,        # cuerpo
    zocalo=dict(ancho=1.22, fondo=0.84, alto=0.12),
    tapa=dict(ancho=1.18, fondo=0.8, alto=0.16, remate=(0.86, 0.5, 0.08)),   # tapa escalonada
    bisagra_y=0.36,                          # la tapa gira sobre el borde de atrás
    abre=-112.0,                             # grados que gira la tapa al abrirse (hacia atrás)
    glifo=dict(z=0.3, radio=0.15),           # sol del frente, del color de su tercio
    tiza=dict(x=-0.36, z=0.16, alto=0.12),   # «M. S.» de Mateo, abajo a la izquierda del frente
)

# ---------------- Tercio de la llave: un disco solar partido en tres (origen en el centro del disco)
SOL = dict(
    radio=0.24,           # disco
    hueco=0.07,           # agujero del centro
    grosor=0.05,
    rayos=3,              # por tercio (9 en la llave completa, uno cada 40°)
    rayo=(0.26, 0.37),    # de dónde a dónde llega cada rayo
    gema=0.15,            # radio de la banda de cristal de color
)
# Ángulo donde empieza cada tercio (grados, sentido antihorario mirando el frente): juntos cierran el círculo
TERCIO = {'agua': 90.0, 'jade': 210.0, 'oro': 330.0}

# ---------------- Haz de luz sobre cada cofre: se ve entre los árboles y se apaga al abrirlo
HAZ = dict(radio=0.55, radio_arriba=0.25, alto=9.0)

# ---------------- Dónde están: pos (x, y, z del suelo) y punto hacia el que mira el frente
COFRES = {
    # Al pie de la cabeza de piedra del cruce, a la vista desde el sendero
    'jade': dict(pos=(-15.3, -25.0, 0.0), mira=(-6.0, -14.0)),
    # Escondido detrás de la ceiba del este (arbol_15, en 9.7, -44.6), lejos del sendero
    'oro': dict(pos=(11.4, -43.3, 0.0), mira=(6.0, -57.0)),
    # En una repisa del risco, junto a la cortina de agua: se llega saltando por las piedras de la poza
    'agua': dict(pos=(-6.4, -83.3, 3.0), mira=(-2.0, -78.0)),
}

# Repisa del risco oeste (caja: mínimo y máximo) y las dos piedras nuevas que llevan hasta ella desde la
# segunda piedra de la poza (-1,2, -75, 0,9): cada salto sube menos de 0,8 m
REPISA = ((-7.6, -84.1, 0.0), (-4.7, -81.7, 3.0))
PIEDRAS = ((-3.3, -78.3, 1.6), (-4.2, -80.6, 2.3))   # x, y, altura

# ---------------- Cerraduras
# Pedestal de la cueva, a la derecha del arco de runas: atril inclinado con el hueco del sol de agua
PEDESTAL = dict(pos=(2.6, -88.8, 0.0), mira=(0.0, -88.8), alto=1.0, atril=35.0)
# Dónde queda cada tercio colocado (centro del disco), hacia dónde mira su frente (punto en el plano XY) y
# cuánto se inclina hacia arriba (90° = acostado mirando al cielo)
SELLOS = {
    # Sobre el atril del pedestal: el atril se inclina 35° hacia la cueva, así que el tercio mira 55° hacia arriba
    'agua': dict(pos=(2.546, -88.8, 1.08), mira=(0.0, -88.8), inclinar=55.0),
    # Cara de la losa que mira al puente (y = -142,6), a 1,2 m de la terraza
    'jade': dict(pos=(0.0, -142.52, 15.6), mira=(0.0, -120.0), inclinar=0.0),
    # Puerta del pórtico, cara que mira al atrio (y = -156,1), a 1,4 m de la terraza
    'oro': dict(pos=(0.0, -156.02, 15.8), mira=(0.0, -120.0), inclinar=0.0),
}
HUECO = dict(radio=0.36, fondo=0.04)   # disco oscuro donde encaja el tercio, con su aro de oro

# Rango de la marca de tiza: dos letras con trazos rectos
TRAZOS_M = (((0.0, 0.0), (0.0, 1.0)), ((0.0, 1.0), (0.35, 0.45)), ((0.35, 0.45), (0.7, 1.0)), ((0.7, 1.0), (0.7, 0.0)))
TRAZOS_S = (((1.45, 1.0), (1.0, 1.0)), ((1.0, 1.0), (1.0, 0.5)), ((1.0, 0.5), (1.45, 0.5)), ((1.45, 0.5), (1.45, 0.0)),
            ((1.45, 0.0), (1.0, 0.0)))
