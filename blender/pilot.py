"""Blender 2D motion-graphics engine pilot: deterministic scene, no external assets."""
import bpy, math, os
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='FLAT'
scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=False
scene.display.shading.show_cavity=False
scene.render.resolution_x=480
scene.render.resolution_y=854
scene.render.resolution_percentage=100
scene.render.fps=24
scene.frame_start=1
scene.frame_end=72
scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.abspath('output/blender-frames/frame_')
scene.render.film_transparent=False
scene.render.image_settings.color_mode='RGB'
scene.world.color=(0.015,0.022,0.042)

def material(name, rgb):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*rgb,1)
    m.use_nodes=True
    nodes=m.node_tree.nodes
    bsdf=nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value=(*rgb,1)
        bsdf.inputs['Roughness'].default_value=1
        if 'Emission Color' in bsdf.inputs: bsdf.inputs['Emission Color'].default_value=(*rgb,1)
        elif 'Emission' in bsdf.inputs: bsdf.inputs['Emission'].default_value=(*rgb,1)
        if 'Emission Strength' in bsdf.inputs: bsdf.inputs['Emission Strength'].default_value=1
    return m

navy=material('midnight blue',(0.015,.035,.085))
teal=material('teal sea',(.07,.36,.38))
green=material('land',(.15,.55,.40))
gold=material('route gold',(.92,.59,.22))
cream=material('text',(.88,.92,.91))

def disc(name,loc,r,mat,vertices=96):
    verts=[(r*math.cos(2*math.pi*i/vertices),r*math.sin(2*math.pi*i/vertices),0) for i in range(vertices)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],[tuple(range(vertices))])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj.location=loc
    obj.data.materials.append(mat)
    return obj

def line(name,coords,mat,width=.035):
    curve=bpy.data.curves.new(name,'CURVE')
    curve.dimensions='3D'
    curve.bevel_depth=width
    curve.bevel_resolution=2
    spline=curve.splines.new('POLY')
    spline.points.add(len(coords)-1)
    for p,xyz in zip(spline.points,coords):
        p.co=(*xyz,1)
    ob=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

def title(value,loc,size,mat):
    curve=bpy.data.curves.new('Text','FONT')
    curve.body=value
    curve.size=size
    curve.align_x='CENTER'
    obj=bpy.data.objects.new(value,curve)
    bpy.context.collection.objects.link(obj)
    obj.location=loc
    obj.data.materials.append(mat)
    return obj

# Flat 2D illustration on XY plane with layered depth.
disc('backdrop',(0,0,-.8),8,navy)
planet=disc('animated planet',(0,.4,0),2.15,teal)
for i,(x,y,r) in enumerate([(-.65,.9,.65),(.65,1.1,.46),(.35,-.4,.72),(-1.1,-.55,.34)]):
    island=disc('continent '+str(i),(x,y,.07),r,green,7)
    island.parent=planet
    island.location=(x,y,.07)
route=line('animated route',[(-1.9,-1.3,.2),(-1.2,-.6,.2),(-.3,-.9,.2),(.55,-.2,.2),(1.4,.65,.2)],gold,.045)
for i,(x,y) in enumerate([(-1.9,-1.3),(-.3,-.9),(1.4,.65)]):
    marker=disc('pin '+str(i),(x,y,.25),.11,gold)
    marker.scale=(.01,.01,.01)
    marker.keyframe_insert(data_path='scale',frame=1+i*12)
    marker.scale=(1,1,1)
    marker.keyframe_insert(data_path='scale',frame=12+i*12)
heading=title('DIE WELT IN BEWEGUNG',(0,3.05,.35),.30,cream)
sub=title('EINE GESCHICHTE IN 2D',(0,-3.05,.35),.20,cream)
for obj in [heading,sub]:
    obj.scale=(.85,.85,.85)
    obj.keyframe_insert(data_path='scale',frame=1)
    obj.scale=(1,1,1)
    obj.keyframe_insert(data_path='scale',frame=24)
planet.rotation_euler.z=0
planet.keyframe_insert(data_path='rotation_euler',frame=1)
planet.rotation_euler.z=.23
planet.keyframe_insert(data_path='rotation_euler',frame=72)
camera_data=bpy.data.cameras.new('2D orthographic camera')
camera=bpy.data.objects.new('Camera',camera_data)
bpy.context.collection.objects.link(camera)
camera.location=(0,0,12)
camera_data.type='ORTHO'
camera_data.ortho_scale=8
scene.camera=camera
camera_data.ortho_scale=8.4
camera_data.keyframe_insert(data_path='ortho_scale',frame=1)
camera_data.ortho_scale=7.8
camera_data.keyframe_insert(data_path='ortho_scale',frame=72)
scene.render.image_settings.color_mode='RGB'
scene.camera.data.lens=35
bpy.ops.render.render(animation=True)
