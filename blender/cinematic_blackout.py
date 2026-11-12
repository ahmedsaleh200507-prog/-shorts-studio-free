"""Cinematic BLACKOUT-style 2D motion graphics pilot. Blender 3.6+ / headless Workbench."""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene
sc.render.engine='BLENDER_WORKBENCH'
sc.display.shading.light='FLAT'
sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=False
sc.display.shading.show_cavity=False
sc.render.resolution_x=540
sc.render.resolution_y=960
sc.render.resolution_percentage=100
sc.render.fps=24
sc.frame_start=1
sc.frame_end=240
sc.render.image_settings.file_format='PNG'
sc.render.image_settings.color_mode='RGB'
sc.render.filepath=os.path.abspath('output/blender-frames/frame_')
sc.render.film_transparent=False
sc.world.color=(.01,.015,.028)
def mat(name,rgb):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);return m
bg=mat('midnight',(.012,.023,.043))
deep=mat('distant buildings',(.035,.075,.11))
mid=mat('foreground buildings',(.055,.115,.16))
lit=mat('warm windows',(.98,.68,.28))
cyan=mat('electric cyan',(.12,.85,.92))
red=mat('alert red',(.96,.16,.18))
white=mat('white',(.92,.95,.96))
black=mat('device screen',(.018,.03,.05))
gold=mat('warm yellow',(.98,.79,.22))
def rect(name,x,y,w,h,z,material):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([(-w/2,-h/2,0),(w/2,-h/2,0),(w/2,h/2,0),(-w/2,h/2,0)],[],[(0,1,2,3)]);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=(x,y,z);obj.data.materials.append(material);return obj
def circle(name,x,y,r,z,material,n=64):
 verts=[(r*math.cos(i*2*math.pi/n),r*math.sin(i*2*math.pi/n),0) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[tuple(range(n))]);mesh.update()
 ob=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(ob);ob.location=(x,y,z);ob.data.materials.append(material);return ob
def label(s,x,y,z,size,material):
 font=bpy.data.curves.new('type','FONT');font.body=s;font.size=size;font.align_x='CENTER'
 ob=bpy.data.objects.new(s,font);bpy.context.collection.objects.link(ob);ob.location=(x,y,z);ob.data.materials.append(material);return ob
def show(ob,a,b):
 ob.hide_render=True;ob.keyframe_insert(data_path='hide_render',frame=1)
 ob.hide_render=False;ob.keyframe_insert(data_path='hide_render',frame=a)
 ob.hide_render=True;ob.keyframe_insert(data_path='hide_render',frame=b+1)
def scale_in(ob,a,b):
 ob.scale=(.02,.02,.02);ob.keyframe_insert(data_path='scale',frame=a)
 ob.scale=(1,1,1);ob.keyframe_insert(data_path='scale',frame=b)
def move(ob,axis,start,end,a,b):
 setattr(ob.location,axis,start);ob.keyframe_insert(data_path='location',frame=a)
 setattr(ob.location,axis,end);ob.keyframe_insert(data_path='location',frame=b)
# 0–3 sec: atmospheric city, dozens of actual architectural details.
rect('night sky',0,0,12,22,-2,bg)
moon=circle('moon',1.8,3.1,.42,-.6,white)
show(moon,1,72)
for i in range(15):
 x=-3.2+i*.45
 h=1.6+((i*7)%9)*.23
 ob=rect('skyline '+str(i),x,-2.8+h/2,.43,h,-.3,deep if i%3 else mid)
 show(ob,1,72)
 for row in range(int(h/.38)):
  if (row*3+i*5)%4!=0:
   win=rect('window',x,-2.55+row*.36,.085,.15,-.15,lit if (row+i)%3 else cyan)
   show(win,1,72)
for i in range(5):
 ob=rect('lamp glow '+str(i),-2.3+i*1.1,-1.6,.018,.7,.1,cyan)
 show(ob,1,72)
t=label('BLACKOUT',0,1.15,.5,.76,white);show(t,1,72);scale_in(t,1,17)
t2=label('WENN DIE STADT VERSTUMMT',0,.55,.5,.19,cyan);show(t2,1,72)
# 3–6 sec: phone alert with interface and pulsing emergency symbol.
phone=rect('phone chassis',0,0,2.85,5.5,.8,white);show(phone,73,144);scale_in(phone,73,89)
screen=rect('phone dark glass',0,0,2.65,5.25,.85,black);show(screen,73,144);scale_in(screen,73,89)
top=rect('red emergency bar',0,1.5,2.35,.68,.9,red);show(top,73,144);scale_in(top,73,89)
ex=label('!',0,1.26,1,.58,white);show(ex,73,144)
tx=label('NOTFALLWARNUNG',0,.45,1,.28,white);show(tx,73,144)
tx2=label('STROMAUSFALL',0,-.05,1,.33,gold);show(tx2,73,144)
tx3=label('BLEIB RUHIG',0,-.65,1,.22,cyan);show(tx3,73,144)
for i in range(3):
 ln=rect('notification text line',0,-1.25-i*.34,1.9-i*.3,.065,1,mid);show(ln,73,144)
# 6–10 sec: top-down road map with illuminated escape route.
for i in range(9):
 y=-3.2+i*.8
 ob=rect('map horizontal road',0,y,8,.10,-.2,mid);show(ob,145,240)
for i in range(7):
 x=-2.7+i*.9
 ob=rect('map vertical road',x,0,.10,11,-.15,mid);show(ob,145,240)
for i in range(7):
 for j in range(8):
  if (i+j)%3!=0:
   ob=rect('map block',-2.6+i*.88,-2.9+j*.78,.58,.5,0,deep);show(ob,145,240)
route=[(-2.2,-2.6),(-1.3,-2.6),(-1.3,-.2),(.5,-.2),(.5,1.5),(1.4,1.5)]
for i in range(len(route)-1):
 a,b=route[i],route[i+1]
 x,y=(a[0]+b[0])/2,(a[1]+b[1])/2
 ob=rect('route segment',x,y,max(.08,abs(a[0]-b[0])),max(.08,abs(a[1]-b[1])),.4,cyan)
 show(ob,145+i*9,240)
for i,(x,y) in enumerate([route[0],route[-1]]):
 pin=circle('map marker',x,y,.18,.5,gold if i else red);show(pin,145+i*48,240);scale_in(pin,145+i*48,155+i*48)
cap=label('FINDE EINEN SICHEREN WEG',0,3.15,.8,.27,white);show(cap,145,240)
# Orthographic camera, subtle movement per scene.
camdata=bpy.data.cameras.new('orthographic');cam=bpy.data.objects.new('Camera',camdata);bpy.context.collection.objects.link(cam)
cam.location=(0,0,14);camdata.type='ORTHO';camdata.ortho_scale=10.3;sc.camera=cam
for frame,zoom in [(1,10.3),(72,9.8),(73,10.2),(144,9.8),(145,10.3),(240,9.6)]:
 camdata.ortho_scale=zoom;camdata.keyframe_insert(data_path='ortho_scale',frame=frame)
bpy.ops.render.render(animation=True)
