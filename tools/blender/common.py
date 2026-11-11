"""Utilidades compartidas para generar personajes y escenarios en Blender por código.

Todo es determinista: la misma semilla produce siempre la misma geometría y los mismos colores.
Convenciones de Blender: Z arriba, el personaje mira hacia -Y (el exportador lo convierte a +Z en glTF).
"""
import math
import random

import bpy
import bmesh
from mathutils import Euler, Matrix, Vector


# ---------------------------------------------------------------------------
# Color
# ---------------------------------------------------------------------------

def hex_a_lineal(h):
    """'#RRGGBB' (sRGB) -> (r, g, b, 1) en espacio lineal, como espera glTF en COLOR_0."""
    h = h.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

    def lin(x):
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4

    return (lin(r), lin(g), lin(b), 1.0)


# ---------------------------------------------------------------------------
# Escena
# ---------------------------------------------------------------------------

def limpiar_escena():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coleccion in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.cameras,
                      bpy.data.lights, bpy.data.actions, bpy.data.worlds):
        for dato in list(coleccion):
            try:
                coleccion.remove(dato)
            except (RuntimeError, ReferenceError):
                pass


# ---------------------------------------------------------------------------
# Transformaciones
# ---------------------------------------------------------------------------

def colocar(pos=(0, 0, 0), rot=(0, 0, 0), escala=(1, 1, 1)):
    """Matriz de traslación, rotación (grados, XYZ) y escala."""
    t = Matrix.Translation(Vector(pos))
    r = Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4()
    s = Matrix.Diagonal((escala[0], escala[1], escala[2], 1.0))
    return t @ r @ s


def segmento(a, b, giro=0.0):
    """Matriz que lleva una primitiva orientada en Z al tramo a-b (centrada). Devuelve (matriz, largo)."""
    a, b = Vector(a), Vector(b)
    d = b - a
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    r = q.to_matrix().to_4x4() @ Matrix.Rotation(math.radians(giro), 4, 'Z')
    return Matrix.Translation((a + b) / 2) @ r, d.length


# ---------------------------------------------------------------------------
# Orientación de caras
# ---------------------------------------------------------------------------

def normal_cara(verts, cara):
    """Normal de Newell (robusta para polígonos de cualquier número de lados)."""
    n = Vector((0.0, 0.0, 0.0))
    for i in range(len(cara)):
        p, q = verts[cara[i]], verts[cara[(i + 1) % len(cara)]]
        n.x += (p.y - q.y) * (p.z + q.z)
        n.y += (p.z - q.z) * (p.x + q.x)
        n.z += (p.x - q.x) * (p.y + q.y)
    return n


def _centro(verts, cara):
    return sum((verts[i] for i in cara), Vector()) / len(cara)


def orientar_hacia_afuera(verts, caras, centro=(0, 0, 0)):
    """Para figuras convexas: cada cara apunta en sentido contrario al centro."""
    c = Vector(centro)
    out = []
    for cara in caras:
        if normal_cara(verts, cara).dot(_centro(verts, cara) - c) < 0:
            cara = tuple(reversed(cara))
        out.append(tuple(cara))
    return out


def orientar_radial(verts, caras):
    """Para superficies alrededor del eje Z (poncho): normales hacia afuera en horizontal."""
    out = []
    for cara in caras:
        fc = _centro(verts, cara)
        if normal_cara(verts, cara).dot(Vector((fc.x, fc.y, 0.0))) < 0:
            cara = tuple(reversed(cara))
        out.append(tuple(cara))
    return out


def orientar_hacia(verts, caras, direccion):
    d = Vector(direccion)
    out = []
    for cara in caras:
        if normal_cara(verts, cara).dot(d) < 0:
            cara = tuple(reversed(cara))
        out.append(tuple(cara))
    return out


# ---------------------------------------------------------------------------
# Primitivas (devuelven (verts, caras) centradas en el origen)
# ---------------------------------------------------------------------------

def caja_biselada(ancho, fondo, alto, bisel=0.01, conico=1.0, conico_y=None):
    """Caja con aristas biseladas en un segmento: el bloque básico del estilo 'juguete tallado'.

    conico: escala de la cara superior respecto a la inferior (1 = recta).
    """
    a, b, c = ancho / 2, fondo / 2, alto / 2
    r = max(1e-4, min(bisel, a * 0.45, b * 0.45, c * 0.45))
    verts, idx = [], {}
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                for eje in 'xyz':
                    if eje == 'x':
                        p = (sx * a, sy * (b - r), sz * (c - r))
                    elif eje == 'y':
                        p = (sx * (a - r), sy * b, sz * (c - r))
                    else:
                        p = (sx * (a - r), sy * (b - r), sz * c)
                    idx[(sx, sy, sz, eje)] = len(verts)
                    verts.append(Vector(p))
    caras = []
    lados = (-1, 1)
    esquinas = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    for s in lados:
        caras.append(tuple(idx[(s, y, z, 'x')] for y, z in esquinas))
        caras.append(tuple(idx[(x, s, z, 'y')] for x, z in esquinas))
        caras.append(tuple(idx[(x, y, s, 'z')] for x, y in esquinas))
    for y in lados:
        for z in lados:
            caras.append((idx[(-1, y, z, 'y')], idx[(1, y, z, 'y')], idx[(1, y, z, 'z')], idx[(-1, y, z, 'z')]))
    for x in lados:
        for z in lados:
            caras.append((idx[(x, -1, z, 'x')], idx[(x, 1, z, 'x')], idx[(x, 1, z, 'z')], idx[(x, -1, z, 'z')]))
    for x in lados:
        for y in lados:
            caras.append((idx[(x, y, -1, 'x')], idx[(x, y, 1, 'x')], idx[(x, y, 1, 'y')], idx[(x, y, -1, 'y')]))
    for x in lados:
        for y in lados:
            for z in lados:
                caras.append((idx[(x, y, z, 'x')], idx[(x, y, z, 'y')], idx[(x, y, z, 'z')]))
    cy = conico if conico_y is None else conico_y
    if conico != 1.0 or cy != 1.0:
        for v in verts:
            t = (v.z + c) / (2 * c)
            v.x *= 1 + (conico - 1) * t
            v.y *= 1 + (cy - 1) * t
    return verts, orientar_hacia_afuera(verts, caras)


def prisma(lados, radio, alto, radio_sup=None, escala_y=1.0, giro=0.0, tapas=True):
    """Prisma o tronco de pirámide de n lados sobre el eje Z. tapas=False ahorra las caras de los extremos
    cuando quedan ocultas (tambores apilados, troncos enterrados)."""
    rs = radio if radio_sup is None else radio_sup
    verts = []
    for z, r in ((-alto / 2, radio), (alto / 2, rs)):
        for i in range(lados):
            ang = math.radians(giro) + 2 * math.pi * i / lados
            verts.append(Vector((math.cos(ang) * r, math.sin(ang) * r * escala_y, z)))
    n = lados
    caras = [tuple(range(n)), tuple(range(n, 2 * n))] if tapas else []
    caras += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    return verts, orientar_hacia_afuera(verts, caras)


# Dirección hacia el sol del juego (config/level.js: elevación 34°, azimut 115°) en coordenadas de Blender:
# arriba a la izquierda de la cámara que mira por el sendero (hacia -Y), como en las hojas de diseño.
# Con ella cada cara lleva el tono del dibujo: izquierda y arriba claras, frente medio, derecha oscura.
SOL = Vector((0.75, 0.35, 0.56)).normalized()


def tres_tonos(luz, medio, sombra, fondo=None, umbral_luz=0.45, umbral_sombra=-0.2):
    """Función de color por cara: claro hacia el sol, oscuro del lado contrario y 'fondo' en las caras de abajo."""
    def fn(_c, n):
        if fondo and n.z < -0.45:
            return fondo
        d = n.dot(SOL)
        if d > umbral_luz:
            return luz
        if d < umbral_sombra:
            return sombra
        return medio
    return fn


def elipsoide(rx, ry, rz, segmentos=8, anillos=5):
    """Esfera de pocas caras, deformada."""
    verts = [Vector((0, 0, -rz))]
    for j in range(1, anillos):
        phi = -math.pi / 2 + math.pi * j / anillos
        for i in range(segmentos):
            th = 2 * math.pi * i / segmentos
            verts.append(Vector((math.cos(phi) * math.cos(th) * rx,
                                 math.cos(phi) * math.sin(th) * ry,
                                 math.sin(phi) * rz)))
    verts.append(Vector((0, 0, rz)))
    s = segmentos
    tope = len(verts) - 1
    caras = [(0, 1 + (i + 1) % s, 1 + i) for i in range(s)]
    for j in range(anillos - 2):
        b = 1 + j * s
        caras += [(b + i, b + (i + 1) % s, b + s + (i + 1) % s, b + s + i) for i in range(s)]
    b = 1 + (anillos - 2) * s
    caras += [(b + i, b + (i + 1) % s, tope) for i in range(s)]
    return verts, orientar_hacia_afuera(verts, caras)


def casco(puntos, juntar_coplanares=True):
    """Envolvente convexa de una nube de puntos: la forma tallada más flexible."""
    bm = bmesh.new()
    for p in puntos:
        bm.verts.new(Vector(p))
    res = bmesh.ops.convex_hull(bm, input=bm.verts[:], use_existing_faces=False)
    sobrantes = list({g for g in res['geom_interior'] + res['geom_unused'] if isinstance(g, bmesh.types.BMVert)})
    if sobrantes:
        bmesh.ops.delete(bm, geom=sobrantes, context='VERTS')
    if juntar_coplanares:
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts[:], edges=bm.edges[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    verts = [v.co.copy() for v in bm.verts]
    caras = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, caras


# ---------------------------------------------------------------------------
# Constructor de mallas: acumula piezas con color por cara y hueso por vértice
# ---------------------------------------------------------------------------

class Constructor:
    def __init__(self, paleta, semilla=1, variacion=0.03):
        self.paleta = paleta
        self.v = []          # posiciones (Vector, espacio del personaje)
        self.f = []          # caras (tuplas de índices)
        self.fcol = []       # color lineal por cara
        self.fmat = []       # índice de material por cara
        self.vhueso = []     # nombre del hueso de cada vértice (peso rígido = 1)
        self.etiquetas = {}  # nombre -> lista de índices de vértices
        self.meta = {}       # índice -> datos extra (p. ej. coordenadas de la boca)
        self.rnd = random.Random(semilla)
        self.variacion = variacion

    def _color(self, nombre):
        hexa = nombre if nombre.startswith('#') else self.paleta[nombre]
        r, g, b, _ = hex_a_lineal(hexa)
        k = 1.0 + self.rnd.uniform(-self.variacion, self.variacion)
        return (r * k, g * k, b * k, 1.0)

    def agregar(self, geo, color, hueso, matriz=None, etiqueta=None, material=0):
        """color: nombre de la paleta, lista (uno por cara) o función (centro, normal) -> nombre.
        hueso: nombre o función (índice_local, posición) -> nombre."""
        verts, caras = geo
        m = matriz if matriz is not None else Matrix.Identity(4)
        base = len(self.v)
        for i, p in enumerate(verts):
            w = m @ Vector(p)
            self.v.append(w)
            self.vhueso.append(hueso(i, w) if callable(hueso) else hueso)
        for j, cara in enumerate(caras):
            g = tuple(base + i for i in cara)
            self.f.append(g)
            self.fmat.append(material)
            if isinstance(color, list):
                nombre = color[j]
            elif callable(color):
                nombre = color(_centro(self.v, g), normal_cara(self.v, g).normalized())
            else:
                nombre = color
            self.fcol.append(self._color(nombre))
        indices = list(range(base, len(self.v)))
        if etiqueta:
            self.etiquetas.setdefault(etiqueta, []).extend(indices)
        return indices

    def triangulos(self):
        return sum(len(c) - 2 for c in self.f)


# ---------------------------------------------------------------------------
# Materiales
# ---------------------------------------------------------------------------

def _nodos(material):
    try:
        material.use_nodes = True
    except AttributeError:
        pass
    return material.node_tree


def material_toon(nombre):
    """Material base para glTF: color por vértice como color base. En Three.js se reemplaza por
    MeshToonMaterial con vertexColors; aquí solo tiene que exportar el atributo COLOR_0."""
    m = bpy.data.materials.new(nombre)
    nt = _nodos(m)
    bsdf = nt.nodes.get('Principled BSDF') or nt.nodes.new('ShaderNodeBsdfPrincipled')
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.85
    return m


def material_emisivo(nombre, hexa, fuerza=3.0):
    m = bpy.data.materials.new(nombre)
    nt = _nodos(m)
    bsdf = nt.nodes.get('Principled BSDF') or nt.nodes.new('ShaderNodeBsdfPrincipled')
    col = hex_a_lineal(hexa)
    bsdf.inputs['Base Color'].default_value = col
    bsdf.inputs['Emission Color'].default_value = col
    bsdf.inputs['Emission Strength'].default_value = fuerza
    bsdf.inputs['Roughness'].default_value = 0.2
    return m


# ---------------------------------------------------------------------------
# Objetos
# ---------------------------------------------------------------------------

def objeto_suelto(nombre, k, materiales, ubicacion=(0, 0, 0), props=None):
    """Malla independiente del escenario (sin huesos) construida en coordenadas locales:
    el origen del objeto queda en 'ubicacion' (origen a la geometría, como pide la semana 8)."""
    obj = crear_malla(nombre, k, materiales, grupos=False)
    obj.location = ubicacion
    for clave, valor in (props or {}).items():
        obj[clave] = valor
    return obj


def crear_malla(nombre, k, materiales, armadura=None, grupos=True):
    me = bpy.data.meshes.new(nombre)
    me.from_pydata([tuple(v) for v in k.v], [], [list(c) for c in k.f])
    me.update()
    for mat in materiales:
        me.materials.append(mat)
    me.polygons.foreach_set('material_index', k.fmat)
    me.polygons.foreach_set('use_smooth', [False] * len(k.f))
    attr = me.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    datos = []
    for poly in me.polygons:
        c = k.fcol[poly.index]
        for _ in range(poly.loop_total):
            datos.extend(c)
    attr.data.foreach_set('color', datos)
    try:
        me.color_attributes.active_color = attr
    except (AttributeError, TypeError):
        pass
    obj = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(obj)
    for hueso in sorted(set(k.vhueso)) if grupos else []:
        vg = obj.vertex_groups.new(name=hueso)
        vg.add([i for i, h in enumerate(k.vhueso) if h == hueso], 1.0, 'REPLACE')
    if armadura is not None:
        obj.parent = armadura
        mod = obj.modifiers.new('Armadura', 'ARMATURE')
        mod.object = armadura
    return obj


def crear_armadura(nombre, huesos):
    """huesos: lista de (nombre, cabeza, cola, padre) con los padres antes que los hijos."""
    datos = bpy.data.armatures.new(nombre)
    arm = bpy.data.objects.new(nombre, datos)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for n, cabeza, cola, padre in huesos:
        eb = datos.edit_bones.new(n)
        eb.head = Vector(cabeza)
        eb.tail = Vector(cola)
        eb.roll = 0.0
        eb.use_deform = True
        if padre:
            eb.parent = datos.edit_bones[padre]
            eb.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm


def agregar_formas(obj, formas):
    """formas: dict nombre -> dict índice_vértice -> Vector (posición nueva)."""
    obj.shape_key_add(name='Basis', from_mix=False)
    for nombre, cambios in formas.items():
        sk = obj.shape_key_add(name=nombre, from_mix=False)
        for i, co in cambios.items():
            sk.data[i].co = co
        # Blender 5.x puede crear la forma ya activa; el exportador guarda este valor como peso
        # inicial en el .glb, así que debe quedar en 0 (cara neutra al cargar).
        sk.value = 0.0


def caja_invisible(nombre, minimo, maximo, rot=(0, 0, 0), props=None):
    """Colisionador o trigger: caja de 8 vértices entre 'minimo' y 'maximo' (coordenadas de Blender)."""
    c = [(a + b) / 2 for a, b in zip(minimo, maximo)]
    sx, sy, sz = ((b - a) / 2 for a, b in zip(minimo, maximo))
    v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
         (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(nombre)
    me.from_pydata(v, [], f)
    obj = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = c
    obj.rotation_euler = [math.radians(a) for a in rot]
    for clave, valor in (props or {}).items():
        obj[clave] = valor
    return obj


def vacio(nombre, pos, rot_z=0.0, props=None):
    """Objeto vacío: puntos de aparición, emisores, luces, triggers radiales y puntos de interés."""
    obj = bpy.data.objects.new(nombre, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (0, 0, math.radians(rot_z))
    for clave, valor in (props or {}).items():
        obj[clave] = valor
    return obj


def exportar_glb(ruta, objetos):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objetos:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objetos[0]
    bpy.ops.export_scene.gltf(
        filepath=ruta,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_skins=True,
        export_morph=True,
        export_morph_normal=False,
        export_vertex_color='ACTIVE',
        export_all_vertex_colors=False,
        export_animations=False,
        export_extras=True,
        export_texcoords=False,
        export_materials='EXPORT',
        export_leaf_bone=False,
        export_cameras=False,
        export_lights=False,
    )
