"""Blender 2D character-action pilot: walk to a market shelf, reach for an apple, pick it up.
Run with: blender -b -t 2 --python-exit-code 1 --python blender/character_market.py
The scene is a deterministic geometry prototype, not AI-generated character animation.
"""
import bpy, math, os
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene
sc.render.engine='BLENDER_WORKBENCH'
sc.display.shading.light='FLAT'
sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=False
sc.render.resolution_x=720
sc.render.resolution_y=1280
sc.render.resolution_percentage=100
sc.render.fps=24
sc.frame_start=1
sc.frame_end=144
sc.render.image_settings.file_format='PNG'
sc.render.filepath=os.path.abspath('output/character-frames/frame_')
def material(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);return m
navy=material('midnight blue',(.035,.055,.09))
wall=material('market wall',(.14,.20,.26))
shelf=material('shelf wood',(.48,.30,.18))
floor=material('floor',(.16,.20,.24))
skin=material('skin',(.86,.59,.39))
shirt=material('jacket',(.14,.58,.68))
pants=material('trousers',(.09,.14,.24))
red=material('apple red',(.91,.13,.12))
green=material('leaf',(.23,.65,.29))
white=material('white',(.94,.95,.95))
def rectangle(name,x,y,w,h,z,mat,parent=None):
 mesh=bpy.data.meshes.new(name)
 mesh.from_pydata([(-w/2,-h/2,0),(w/2,-h/2,0),(w/2,h/2,0),(-w/2,h/2,0)],[],[(0,1,2,3)])
 mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 ob.location=(x,y,z);ob.data.materials.append(mat)
 if parent:ob.parent=parent
 return ob
def disc(name,x,y,r,z,mat,parent=None):
 verts=[(r*math.cos(i*math.tau/40),r*math.sin(i*math.tau/40),0) for i in range(40)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[tuple(range(40))]);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob)
 ob.location=(x,y,z);ob.data.materials.append(mat)
 if parent:ob.parent=parent
 return ob
def keyloc(ob,frame,x=None,y=None):
 if x is not None:ob.location.x=x
 if y is not None:ob.location.y=y
 ob.keyframe_insert(data_path='location',frame=frame)
def rotate(ob,frame,angle):
 ob.rotation_euler.z=angle;ob.keyframe_insert(data_path='rotation_euler',frame=frame)
rectangle('background',0,0,8,14,-1,navy)
rectangle('market wall',0,.3,8,7,-.9,wall)
rectangle('floor',0,-3.2,8,2,-.8,floor)
for y in [-1.4,-.3,.8]:
 rectangle('shelf',1.7,y,3.3,.17,-.15,shelf)
 for i in range(5):
  rectangle('product',.55+i*.55,y+.25,.29,.39,-.1,green if i%2 else red)
# Character rig, moving left to right. Body parts are parented to root.
root=bpy.data.objects.new('character_root',None);bpy.context.collection.objects.link(root)
root.location=(-2.25,-1.65,0)
body=rectangle('torso',0,.6,.75,1.2,.4,shirt,root)
head=disc('head',0,1.52,.35,.5,skin,root)
disc('left eye',-.12,1.57,.025,.55,pants,root)
disc('right eye',.12,1.57,.025,.55,pants,root)
leg_l=rectangle('left leg',-.20,-.36,.22,.82,.36,pants,root)
leg_r=rectangle('right leg',.20,-.36,.22,.82,.35,pants,root)
arm_l=rectangle('left arm',-.48,.48,.20,.9,.39,skin,root)
arm_r=rectangle('right arm',.48,.48,.20,.9,.40,skin,root)
# Apple starts on a lower display, then follows the hand after pickup.
apple=disc('apple',1.65,-.92,.19,.6,red)
apple_leaf=disc('apple leaf',1.73,-.73,.065,.65,green)
for frame,x in [(1,-2.25),(20,-1.5),(40,-.8),(60,.05),(75,.45),(144,.45)]:
 keyloc(root,frame,x=x)
for frame,angle in [(1,-.3),(12,.3),(24,-.3),(36,.3),(48,-.3),(60,.3),(75,0)]:
 rotate(leg_l,frame,angle);rotate(leg_r,frame,-angle)
 rotate(arm_l,frame,-angle*.55)
for frame,angle in [(1,0),(75,0),(88,-1.15),(105,-1.15),(124,-.25),(144,-.25)]:
 rotate(arm_r,frame,angle)
for frame,x,y in [(1,1.65,-.92),(104,1.65,-.92),(124,1.12,-.82),(144,.94,-.75)]:
 keyloc(apple,frame,x,y)
 keyloc(apple_leaf,frame,x+.08,y+.19)
# Layered visual detail pass for the character and supermarket.
cream=material('cream highlights',(.97,.85,.62))
hair=material('dark hair',(.13,.09,.12))
glass=material('window glass',(.46,.77,.83))
gold=material('warm accent',(.98,.68,.22))
for yy in [-2.7,-2.15]:
 rectangle('floor tile seam',0,yy,4.7,.018,-.72,wall)
rectangle('store header',0,2.45,4.6,.72,-.55,navy)
for x in [-1.85,-1.48,-1.11]:
 disc('ceiling light',x,2.4,.09,-.45,gold)
rectangle('window pane',-1.5,.95,.75,1.75,-.47,glass)
rectangle('window frame',-1.5,.95,.07,1.75,-.42,cream)
rectangle('counter edge',1.65,-1.7,2.4,.18,-.03,cream)
for yy in [-1.4,-.3,.8]:
 for xx in [.55,1.1,1.65,2.2,2.75]:
  rectangle('packaging label',xx,yy+.26,.17,.09,.04,cream)
disc('hair silhouette',0,1.75,.31,.57,hair,root)
rectangle('hair fringe',-.04,1.83,.48,.15,.6,hair,root)
rectangle('neck',0,1.14,.16,.22,.48,skin,root)
rectangle('shirt collar',0,1.12,.44,.12,.51,cream,root)
rectangle('belt',0,.08,.69,.12,.49,hair,root)
for yy in [.35,.65,.95]:
 disc('jacket button',.16,yy,.035,.52,cream,root)
disc('ear',-.34,1.48,.095,.52,skin,root)
rectangle('mouth',.06,1.32,.13,.025,.58,hair,root)
for side in [-1,1]:
 rectangle('shoe',side*.2,-.79,.4,.18,.5,hair,root)
# Hide duplicate decorative leaf after the apple is picked up.
# The pilot tests a visible reach and object motion, not precise hand tracking.
camdata=bpy.data.cameras.new('camera');cam=bpy.data.objects.new('Camera',camdata)
bpy.context.collection.objects.link(cam)
cam.location=(0,0,12);camdata.type='ORTHO';camdata.ortho_scale=8.3;sc.camera=cam
bpy.ops.render.render(animation=True)
