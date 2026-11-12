"""Cinematic BLACKOUT-style 2D motion graphics pilot. Blender 3.6+ / headless Workbench."""
import bpy, math, os, json
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
sc=bpy.context.scene
sc.render.engine='BLENDER_WORKBENCH'
sc.display.shading.light='FLAT'
sc.display.shading.color_type='MATERIAL'
sc.display.shading.show_shadows=False
sc.display.shading.show_cavity=False
sc.render.resolution_x=720
sc.render.resolution_y=1280
sc.render.resolution_percentage=100
sc.render.fps=24
sc.frame_start=1
sc.frame_end=240
sc.render.image_settings.file_format='PNG'
sc.render.image_settings.color_mode='RGB'
sc.render.filepath=os.path.abspath('output/blender-frames/frame_')
sc.render.film_transparent=False
sc.world.color=(.01,.015,.028)
# The three scene families are rendered in the order requested by the planner.
# Unsupported content is rejected by CI instead of silently showing unrelated visuals.
plan_path=os.environ.get('BLENDER_SCENE_PLAN')
order=['city','phone','map']
if plan_path:
 with open(plan_path,encoding='utf-8') as handle:
  plan=json.load(handle)
 scenes=plan.get('scenes',[])
 if len(scenes)!=3 or not all(scene.get('supported') for scene in scenes):
  raise ValueError('Pilot needs exactly three supported sentences (city, phone, map).')
 order=[scene['visual'] for scene in scenes]
 if sorted(order)!=sorted(['city','phone','map']):
  raise ValueError('Pilot requires one city, one phone, and one map scene.')
print('Rendering scenes in requested order:',order,flush=True)
original_ranges={'city':(1,72),'phone':(73,144),'map':(145,240)}
new_ranges={kind:(i*80+1,(i+1)*80) for i,kind in enumerate(order)}
def remap_frame(frame):
 kind='city' if frame<=72 else 'phone' if frame<=144 else 'map'
 a,b=original_ranges[kind];c,d=new_ranges[kind]
 return round(c+(max(a,min(frame,b))-a)*(d-c)/max(1,b-a))
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
steel=mat('steel blue',(.10,.17,.23))
soft=mat('soft grey',(.54,.64,.70))
shadow=mat('silhouette',(.025,.046,.068))
road=mat('street surface',(.11,.19,.23))
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

def segment(name,ax,ay,bx,by,z,width,material):
 dx,dy=bx-ax,by-ay
 ob=rect(name,(ax+bx)/2,(ay+by)/2,math.hypot(dx,dy),width,z,material)
 ob.rotation_euler.z=math.atan2(dy,dx)
 return ob

def headline(s,x,y,size,color,a,b):
 ob=label(s,x,y,.85,size,color);show(ob,a,b);scale_in(ob,a,min(a+12,b));return ob
def show(ob,a,b):
 a,b=remap_frame(a),remap_frame(b)
 ob.hide_render=True;ob.keyframe_insert(data_path='hide_render',frame=1)
 ob.hide_render=False;ob.keyframe_insert(data_path='hide_render',frame=a)
 ob.hide_render=True;ob.keyframe_insert(data_path='hide_render',frame=b+1)
def scale_in(ob,a,b):
 a,b=remap_frame(a),remap_frame(b)
 ob.scale=(.02,.02,.02);ob.keyframe_insert(data_path='scale',frame=a)
 ob.scale=(1,1,1);ob.keyframe_insert(data_path='scale',frame=b)
def move(ob,axis,start,end,a,b):
 a,b=remap_frame(a),remap_frame(b)
 setattr(ob.location,axis,start);ob.keyframe_insert(data_path='location',frame=a)
 setattr(ob.location,axis,end);ob.keyframe_insert(data_path='location',frame=b)
# 0–3 sec: atmospheric city, dozens of actual architectural details.
rect('night sky',0,0,12,22,-2,bg)
for i in range(6):
 halo=circle('moon atmospheric halo',1.8,3.1,.52+i*.14,-1.2+i*.012,deep if i%2 else steel);show(halo,1,72)
moon=circle('moon',1.8,3.1,.43,-.6,white)
show(moon,1,72)
for i in range(46):
 x=((i*73)%101)/101*6-3;y=((i*47)%97)/97*7-3
 if y>0:
  star=circle('distant star',x,y,.008+(i%3)*.006,-.45,soft,12);show(star,1,72)
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
 x=-2.3+i*1.1
 ob=rect('street lamp pole '+str(i),x,-1.7,.025,.9,.1,steel);show(ob,1,72)
 bulb=circle('street lamp bulb',x,-1.22,.065,.15,gold);show(bulb,1,72)
 for j in range(3):
  glow=circle('street lamp glow',x,-1.22,.12+j*.08,.12-j*.01,deep);show(glow,1,72)
for i in range(3):
 band=rect('foreground pavement',0,-3.35+i*.09,7,.025,.2,steel);show(band,1,72)
for i in range(10):
 x=-2.8+i*.61
 roof=rect('roof silhouette',x,-.95+((i*5)%3)*.19,.29,.08,.16,shadow);show(roof,1,72)
t=label('BLACKOUT',0,1.15,.5,.68,white);show(t,1,72);scale_in(t,1,17)
bar=rect('headline accent',0,.96,2.9,.028,.6,red);show(bar,12,72)
t2=label('WENN DIE STADT VERSTUMMT',0,.55,.5,.19,cyan);show(t2,1,72)
# 3–6 sec: phone alert with interface and pulsing emergency symbol.
for i in range(5):
 ring=circle('phone radial atmosphere',0,0,2.6+i*.36,.1+i*.01,deep if i%2 else steel);show(ring,73,144)
phone=rect('phone chassis',0,0,2.85,5.5,.8,steel);show(phone,73,144);scale_in(phone,73,89)
screen=rect('phone dark glass',0,0,2.65,5.25,.85,black);show(screen,73,144);scale_in(screen,73,89)
top=rect('red emergency bar',0,1.5,2.35,.68,.9,red);show(top,73,144);scale_in(top,73,89)
notch=rect('speaker notch',0,2.48,.52,.055,.97,soft);show(notch,73,144)
clock=label('23:47',-.78,2.14,1,.16,white);show(clock,73,144)
status=label('LTE   98%',.78,2.14,1,.13,white);show(status,73,144)
for i in range(3):
 pulse=circle('alert pulse',0,1.48,.20+i*.06,.92-i*.01,red);show(pulse,88+i*9,99+i*9)
ex=label('!',0,1.26,1,.58,white);show(ex,73,144)
tx=label('NOTFALLWARNUNG',0,.45,1,.205,white);show(tx,73,144)
tx2=label('STROMAUSFALL',0,-.05,1,.33,gold);show(tx2,73,144)
tx3=label('BLEIB RUHIG',0,-.65,1,.22,cyan);show(tx3,73,144)
for i in range(3):
 ln=rect('notification text line',0,-1.25-i*.34,1.9-i*.3,.065,1,mid);show(ln,73,144)
# 6–10 sec: top-down road map with illuminated escape route.
for i in range(9):
 y=-3.2+i*.8
 ob=segment('map winding east-west road',-3.6,y-.25*math.sin(i),3.6,y+.18*math.cos(i),-.2,.14,road);show(ob,145,240)
for i in range(7):
 x=-2.7+i*.9
 ob=segment('map north-south road',x-.32,-4,x+.28,4,-.15,.13,road);show(ob,145,240)
for i in range(7):
 for j in range(8):
  if (i+j)%3!=0:
   x=-2.6+i*.88;y=-2.9+j*.78
   ob=rect('city parcel',x,y,.40+(i%3)*.06,.34+(j%3)*.04,0,deep if (i+j)%2 else steel);show(ob,145,240)
   roof=rect('roof detail',x+.07,y+.04,.13,.08,.08,mid);show(roof,145,240)
for i in range(2):
 river=segment('diagonal waterway',-3.4,-1.8+i*.14,3.4,2.3+i*.14,-.08,.075,steel);show(river,145,240)
route=[(-2.2,-2.6),(-1.3,-2.6),(-1.3,-.2),(.5,-.2),(.5,1.5),(1.4,1.5)]
for i in range(len(route)-1):
 a,b=route[i],route[i+1]
 x,y=(a[0]+b[0])/2,(a[1]+b[1])/2
 ob=segment('route segment',a[0],a[1],b[0],b[1],.4,.095,cyan)
 show(ob,145+i*9,240)
for i,(x,y) in enumerate([route[0],route[-1]]):
 pin=circle('map marker',x,y,.18,.5,gold if i else red);show(pin,145+i*48,240);scale_in(pin,145+i*48,155+i*48)
cap=label('FINDE EINEN SICHEREN WEG',0,3.15,.8,.27,white);show(cap,145,240)
# Orthographic camera, subtle movement per scene.
camdata=bpy.data.cameras.new('orthographic');cam=bpy.data.objects.new('Camera',camdata);bpy.context.collection.objects.link(cam)
cam.location=(0,0,14);camdata.type='ORTHO';camdata.ortho_scale=10.3;sc.camera=cam
# Camera timing follows the same scene permutation as visible objects.
# Inserting keyframes in chronological order avoids unintended cross-scene interpolation.
zoom_by_kind={'city':(10.3,9.8),'phone':(10.2,9.8),'map':(10.3,9.6)}
for index,kind in enumerate(order):
 first,last=new_ranges[kind]
 zoom_start,zoom_end=zoom_by_kind[kind]
 camdata.ortho_scale=zoom_start
 camdata.keyframe_insert(data_path='ortho_scale',frame=first)
 camdata.ortho_scale=zoom_end
 camdata.keyframe_insert(data_path='ortho_scale',frame=last)
print('Camera and scene sequence:',[(kind,new_ranges[kind]) for kind in order],flush=True)
bpy.ops.render.render(animation=True)
