"""Objetos de juego que se repiten en todas las zonas: pilares solares (checkpoints), flores solares y
páginas del diario. Cada función crea el objeto, su trigger y su colisionador con los nombres que lee
el juego (sección 4.4)."""
import foliage_builder
import rock_builder
from common import Constructor, caja_biselada, caja_invisible, casco, colocar, objeto_suelto, prisma, vacio
from palette import PALETA
from rock_builder import tono_piedra


def pilar_checkpoint(m, n, pos, nombre, salida=(1.8, -0.6)):
    """Pilar solar con su disco dorado, trigger radial de 4 m y punto de reaparición a un lado."""
    x, y, z = pos
    p = Constructor(PALETA, semilla=60 + n, variacion=0.03)
    p.agregar(caja_biselada(0.9, 0.9, 0.3, 0.06), tono_piedra, 'escenario', colocar((0, 0, 0.15)))
    p.agregar(caja_biselada(0.55, 0.55, 2.2, 0.06, conico=0.7), tono_piedra, 'escenario', colocar((0, 0, 1.4)))
    p.agregar(prisma(12, 0.34, 0.08), 'oro_brillante', 'escenario', colocar((0, 0, 2.75), (90, 0, 0)), material=1)
    objeto_suelto(f'pilar_checkpoint_{n}', p, [m['toon'], m['disco']], (x, y, z), {'checkpoint': n})
    vacio(f'trg_rad_checkpoint_{n}', (x, y, z), props={'radio': 4.0, 'evento': 'checkpoint', 'checkpoint': n, 'nombre': nombre})
    vacio(f'spawn_checkpoint_{n}', (x + salida[0], y + salida[1], z))
    caja_invisible(f'col_box_pilar_{n}', (x - 0.45, y - 0.45, z), (x + 0.45, y + 0.45, z + 2.6))


def flor(m, n, pos):
    """Flor solar que cura 25 al pasar (trigger radial de 1,3 m)."""
    x, y, z = pos
    f = Constructor(PALETA, semilla=80 + n, variacion=0.04)
    foliage_builder.flor_solar(f)
    objeto_suelto(f'flor_{n}', f, [m['toon']], (x, y, z), {'cura': 25})
    vacio(f'trg_rad_flor_{n}', (x, y, z), props={'radio': 1.3, 'evento': 'flor', 'flor': n})


def pagina(m, n, pos, giro, rnd):
    """Página del diario: hoja con una piedrita encima; se lee con la Manipulación (E)."""
    p = Constructor(PALETA, semilla=90 + n, variacion=0.04)
    p.agregar(caja_biselada(0.32, 0.42, 0.012, 0.004), 'papel', 'escenario', colocar((0, 0, 0.006), (0, 0, giro)))
    p.agregar(caja_biselada(0.3, 0.06, 0.014, 0.004), 'papel_sombra', 'escenario', colocar((0.01, -0.12, 0.012), (0, 0, giro)))
    p.agregar(casco(rock_builder.puntos_roca((0.06, 0.08, 0.04), 0.07, rnd)), tono_piedra, 'escenario')
    objeto_suelto(f'pagina_{n}', p, [m['toon']], pos, {'interactuable': 'pagina', 'pagina': n, 'etiqueta': 'Leer la página'})
