import bpy, math, os
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(root,'交付文件','Blender臂丛示意')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
world=bpy.context.scene.world; world.color=(0.82,0.85,0.79)
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1);return m
nerve=mat('神经 示意金色',(0.89,0.63,0.19)); ink=mat('文字 深绿',(0.06,0.18,0.17)); paper=mat('背景',(0.95,0.96,0.92))
def strand(name,coords,r=.055):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=24;curve.bevel_depth=r;curve.bevel_resolution=5
 s=curve.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for p,co in zip(s.bezier_points,coords):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(nerve)
font=bpy.data.fonts.load('/System/Library/Fonts/STHeiti Light.ttc')
def label(text,x,y,size=.27):
 data=bpy.data.curves.new(text,'FONT');data.body=text;data.font=font;data.size=size
 obj=bpy.data.objects.new(text,data);bpy.context.collection.objects.link(obj);obj.location=(x,y,.16);obj.data.materials.append(ink)
for n,y in [('C5',2.0),('C6',1.0),('C7',0),('C8',-1),('T1',-2)]:
 end=1.5 if n in ('C5','C6') else (-1.5 if n in ('C8','T1') else 0)
 strand(n+' anterior ramus', [(-2.5,y,0),(-1.5,y,0),(-.35,end,0),(.35,end,0)])
 label(n+' 前支',-3.75,y-.10,.28)
for name,y in [('上干',1.5),('中干',0),('下干',-1.5)]:
 strand(name,[(.35,y,0),(1.3,y,0),(2.2,y,0)],.075);label(name,2.4,y-.1,.29)
label('臂丛前支汇成三干',-3.8,3.05,.42)
label('三维关系示意 · 非人体空间定位 / 非超声配准',-3.8,2.57,.19)
label('C5 + C6 → 上干    C7 → 中干    C8 + T1 → 下干',-3.8,-2.8,.20)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.3));bpy.context.object.name='教学背景';bpy.context.object.data.materials.append(paper)
bpy.ops.object.light_add(type='AREA',location=(0,0,8));bpy.context.object.data.energy=1000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=10
bpy.ops.object.camera_add(location=(0,0,12));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=10.4;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene['scope']='Conceptual topology only; not patient anatomy, source mesh registration, ultrasound or needle planning.'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'臂丛前支与三干-概念示意.blend'))
scene.render.filepath=os.path.join(out,'臂丛前支与三干-概念示意.png');bpy.ops.render.render(write_still=True)
