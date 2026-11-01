import bpy,os,json,hashlib
base=os.getcwd();f=base+'/research/open3dmodel-audit';bpy.ops.wm.open_mainfile(filepath=f+'/试验配准-神经肌肉血管-未核定.blend');bpy.context.view_layer.update()
items=[('c5','C5_root.r','C5 前支'),('c6','C6_root.r','C6 前支'),('c7','C7_root.r','C7 前支'),('c8','C8_root.r','C8 前支'),('t1','T1_root.r','T1 前支'),('superior-trunk','Superior_trunk_of_brachial_plexus.r','臂丛上干'),('middle-trunk','Middle_trunk_of_brachial_plexus.r','臂丛中干'),('inferior-trunk','Inferior_trunk_of_brachial_plexus.r','臂丛下干')]
structures=[]
for id,n,name in items:
 o=bpy.data.objects[n];o.data.calc_loop_triangles();p=[]
 for v in o.data.vertices:
  q=o.matrix_world@v.co;p.extend([round(q.x,9),round(q.z,9),round(-q.y,9)])
 ix=[i for t in o.data.loop_triangles for i in t.vertices]
 structures.append({'id':id,'name':name+'（参考重建）','nameEn':n,'kind':'nerve','sourceId':n,'side':'right','geometry':{'positions':p,'indices':ix},'provenance':{'source':'Open3DModel via Ana3D','status':'source-named; rigidly registered reference reconstruction; not clinically reviewed'}})
out={'reconstruction':True,'source':{'id':'z-base-open3d-reference','license':'CC-BY-SA-4.0','url':'https://ana3d.app/en/atlas/o3d-upper-limb/'},'registration':json.load(open(f+'/rigid-registration-audit.json')),'credit':json.load(open(f+'/manifest.json'))['credit'],'structures':structures}
open(base+'/src/data/reconstructed-plexus.json','w').write(json.dumps(out,separators=(',',':'),ensure_ascii=False))
print('exported',len(structures),len(json.dumps(out)))
