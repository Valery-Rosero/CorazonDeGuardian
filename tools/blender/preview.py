"""Renders de revisión con un sombreado toon parecido al del juego (3 tonos, sombra teñida).
Solo sirven para revisar el diseño: no se exportan ni afectan al .glb."""
import math

import bpy
from mathutils import Vector

from common import hex_a_lineal

RAMPA = [(0.00, (0.42, 0.35, 0.45)), (0.22, (0.74, 0.68, 0.68)), (0.50, (1.00, 0.97, 0.93))]


def _rampa(nt, entrada):
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = RAMPA[0][0], (*RAMPA[0][1], 1)
    els[1].position, els[1].color = RAMPA[1][0], (*RAMPA[1][1], 1)
    e = els.new(RAMPA[2][0])
    e.color = (*RAMPA[2][1], 1)
    nt.links.new(entrada, ramp.inputs['Fac'])
    return ramp


def material_toon_preview(nombre, color_fijo=None):
    m = bpy.data.materials.new(nombre)
    try:
        m.use_nodes = True
    except AttributeError:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    salida = nt.nodes.new('ShaderNodeOutputMaterial')
    difuso = nt.nodes.new('ShaderNodeBsdfDiffuse')
    a_rgb = nt.nodes.new('ShaderNodeShaderToRGB')
    nt.links.new(difuso.outputs['BSDF'], a_rgb.inputs['Shader'])
    ramp = _rampa(nt, a_rgb.outputs['Color'])
    mult = nt.nodes.new('ShaderNodeVectorMath')
    mult.operation = 'MULTIPLY'
    nt.links.new(ramp.outputs['Color'], mult.inputs[0])
    if color_fijo is None:
        vc = nt.nodes.new('ShaderNodeVertexColor')
        vc.layer_name = 'Color'
        nt.links.new(vc.outputs['Color'], mult.inputs[1])
    else:
        mult.inputs[1].default_value = color_fijo[:3]
    emision = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(mult.outputs['Vector'], emision.inputs['Color'])
    nt.links.new(emision.outputs['Emission'], salida.inputs['Surface'])
    return m


def material_brillo_preview(nombre, hexa, fuerza=2.5):
    m = bpy.data.materials.new(nombre)
    try:
        m.use_nodes = True
    except AttributeError:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    salida = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = hex_a_lineal(hexa)
    em.inputs['Strength'].default_value = fuerza
    nt.links.new(em.outputs['Emission'], salida.inputs['Surface'])
    return m


def preparar(objetos_toon, gema_hex):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    try:
        sc.eevee.taa_render_samples = 24
    except AttributeError:
        pass
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = False
    mundo = bpy.data.worlds.new('mundo_preview')
    sc.world = mundo
    try:
        mundo.use_nodes = True
        fondo = mundo.node_tree.nodes.get('Background')
        fondo.inputs[0].default_value = (0.02, 0.017, 0.014, 1)
        fondo.inputs[1].default_value = 1.0
    except AttributeError:
        mundo.color = (0.02, 0.017, 0.014)

    toon = material_toon_preview('preview_toon')
    gema = material_brillo_preview('preview_gema', gema_hex)
    for obj in objetos_toon:
        for i, slot in enumerate(obj.material_slots):
            slot.material = gema if 'gema' in (slot.material.name if slot.material else '') else toon

    # Suelo
    me = bpy.data.meshes.new('suelo_preview')
    t = 3.0
    me.from_pydata([(-t, -t, 0), (t, -t, 0), (t, t, 0), (-t, t, 0)], [], [(0, 1, 2, 3)])
    suelo = bpy.data.objects.new('suelo_preview', me)
    sc.collection.objects.link(suelo)
    me.materials.append(material_toon_preview('preview_suelo', hex_a_lineal('#4A443D')))

    def sol(nombre, energia, color, rot):
        luz = bpy.data.lights.new(nombre, 'SUN')
        luz.energy = energia
        luz.color = color
        luz.angle = math.radians(2)
        o = bpy.data.objects.new(nombre, luz)
        sc.collection.objects.link(o)
        o.rotation_euler = [math.radians(a) for a in rot]
        return o

    sol('sol_clave', 3.2, (1.0, 0.93, 0.82), (52, 0, -38))
    sol('sol_relleno', 0.9, (0.75, 0.85, 1.0), (70, 0, 150))

    cam_datos = bpy.data.cameras.new('camara_preview')
    cam = bpy.data.objects.new('camara_preview', cam_datos)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def disparar(cam, ruta, pos, objetivo, escala, res=(800, 1100), ajuste='AUTO', lejos=50):
    """ajuste='VERTICAL': 'escala' es la altura visible (para encuadrar igual que el boceto)."""
    sc = bpy.context.scene
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(objetivo) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.sensor_fit = ajuste
    cam.data.ortho_scale = escala
    cam.data.clip_start = 0.05
    cam.data.clip_end = lejos
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.filepath = ruta
    bpy.ops.render.render(write_still=True)
    print(f'[preview] {ruta}')
