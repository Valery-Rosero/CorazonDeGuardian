"""Puente colgante: tablas sueltas (cada una es un objeto dinámico dyn_tabla_N) y cuerdas."""
import math

from mathutils import Vector

from common import Constructor, caja_biselada, colocar, objeto_suelto, prisma, segmento


def tablas(paleta, material, y_inicio, y_fin, z_tope, ancho, rnd):
    """Crea las tablas como objetos sueltos. Propiedades: tipo cinemático hasta que se pisan."""
    largo = abs(y_fin - y_inicio)
    n = int(round(largo / 1.0))
    paso = (y_fin - y_inicio) / n
    objetos = []
    for i in range(n):
        y = y_inicio + paso * (i + 0.5)
        k = Constructor(paleta, semilla=100 + i, variacion=0.08)
        # Rendija pequeña (3 cm) y sin inclinación lateral: el colisionador sale de la caja de la tabla
        k.agregar(caja_biselada(ancho + rnd.uniform(-0.08, 0.08), abs(paso) * 0.97, 0.1, 0.025), 'madera_tabla', 'escenario',
                  colocar((0, 0, 0), (0, 0, rnd.uniform(-2, 2))))
        k.agregar(caja_biselada(0.06, abs(paso) * 0.92, 0.04, 0.01), 'madera_tabla_oscura', 'escenario',
                  colocar((ancho * 0.36, 0, -0.06)))
        k.agregar(caja_biselada(0.06, abs(paso) * 0.92, 0.04, 0.01), 'madera_tabla_oscura', 'escenario',
                  colocar((-ancho * 0.36, 0, -0.06)))
        obj = objeto_suelto(f'dyn_tabla_{i + 1}', k, [material], (rnd.uniform(-0.03, 0.03), y, z_tope - 0.05),
                            {'masa': 4.0, 'tipo': 'cinematico', 'material': 'tabla', 'cae_al_pisar': 1})
        objetos.append(obj)
    return objetos


def cuerdas(k, y_inicio, y_fin, z_tope, ancho, hueso='escenario'):
    """Postes en los extremos y cuerdas laterales con comba."""
    for y in (y_inicio, y_fin):
        for s in (1, -1):
            x = s * (ancho / 2 + 0.25)
            k.agregar(prisma(6, 0.13, 1.6, radio_sup=0.1), 'madera_tabla_oscura', hueso, colocar((x, y, z_tope + 0.6)))
    tramos = 12
    for s in (1, -1):
        x = s * (ancho / 2 + 0.25)
        for altura in (0.95, 0.45):
            prev = None
            for i in range(tramos + 1):
                t = i / tramos
                y = y_inicio + (y_fin - y_inicio) * t
                z = z_tope + altura - math.sin(t * math.pi) * 0.55
                p = Vector((x, y, z))
                if prev is not None:
                    m, largo = segmento(prev, p)
                    k.agregar(prisma(4, 0.035, largo * 1.02), 'cuerda', hueso, m)
                prev = p
        # tirantes verticales
        for i in range(1, tramos):
            t = i / tramos
            y = y_inicio + (y_fin - y_inicio) * t
            za = z_tope + 0.95 - math.sin(t * math.pi) * 0.55
            m, largo = segmento((x, y, z_tope - 0.02), (x, y, za))
            k.agregar(prisma(4, 0.02, largo), 'cuerda', hueso, m)
