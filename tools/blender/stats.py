"""Presupuesto de triángulos: el script falla si un recurso se pasa del límite."""


def contar_triangulos(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def verificar_presupuesto(nombre, objetos, limite):
    total = sum(contar_triangulos(o) for o in objetos)
    detalle = ', '.join(f'{o.name}={contar_triangulos(o)}' for o in objetos)
    print(f'[stats] {nombre}: {total} triángulos (límite {limite}) -> {detalle}')
    if total > limite:
        raise SystemExit(f'[stats] {nombre} supera el presupuesto: {total} > {limite}')
    return total
