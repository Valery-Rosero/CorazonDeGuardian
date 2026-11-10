"""Inspecciona un .glb sin Blender: nodos, huesos, mallas, formas de cara, colores y triángulos.
Uso: python tools/verificar_glb.py public/models/victoria.glb
"""
import json
import struct
import sys


def leer(ruta):
    with open(ruta, 'rb') as f:
        datos = f.read()
    magia, version, _ = struct.unpack_from('<4sII', datos, 0)
    assert magia == b'glTF' and version == 2, 'no es un GLB 2.0'
    largo, tipo = struct.unpack_from('<I4s', datos, 12)
    assert tipo == b'JSON'
    return json.loads(datos[20:20 + largo]), len(datos)


def main(ruta):
    g, tam = leer(ruta)
    print(f'archivo: {ruta} ({tam / 1024:.1f} KB)')
    skins = g.get('skins', [])
    for s in skins:
        nombres = [g['nodes'][j]['name'] for j in s['joints']]
        print(f'esqueleto: {len(nombres)} huesos -> {", ".join(nombres)}')
    acc = g['accessors']
    total = 0
    llamadas = 0
    for m in g['meshes']:
        nombres = m.get('extras', {}).get('targetNames', [])
        for p in m['primitives']:
            llamadas += 1
            n = acc[p['indices']]['count'] // 3 if 'indices' in p else acc[p['attributes']['POSITION']]['count'] // 3
            total += n
            mat = g['materials'][p['material']]['name'] if 'material' in p else '-'
            print(f'malla {m["name"]}: {n} tri, material={mat}, atributos={sorted(p["attributes"])}, '
                  f'formas={len(p.get("targets", []))}')
        if nombres:
            print(f'  formas de {m["name"]}: {", ".join(nombres)}')
            pesos = m.get('weights', [0] * len(nombres))
            activas = [n for n, w in zip(nombres, pesos) if w != 0]
            print(f'  pesos iniciales distintos de 0: {activas or "ninguno (cara neutra)"}')
    print(f'TOTAL: {total} triángulos, {llamadas} llamadas de dibujo')
    for n in g['nodes']:
        if 'extras' in n:
            print(f'extras de {n["name"]}: {n["extras"]}')


if __name__ == '__main__':
    main(sys.argv[1])
