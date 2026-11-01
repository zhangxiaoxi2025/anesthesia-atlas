import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import '../spine-locator.css';

const BONE_IDS=['vertebra-c3','vertebra-c4','vertebra-c5','vertebra-c6','vertebra-c7','vertebra-t1'];
const EMPTY_IDS=[];
const codeFor=id=>id.replace('vertebra-','').toUpperCase();

/** Fixed right-side view of complete, unchanged source meshes; no level presets. */
export default function SpineLocator({ anatomy, level, referenceIds=EMPTY_IDS, onHover, onSelect, selected, hoveredId, error='' }) {
  const host=useRef(null), api=useRef(null), current=useRef({});
  const levelMarker=useRef(null);
  const [status,setStatus]=useState('loading'),[labelLayout,setLabelLayout]=useState([]);
  const bones=useMemo(()=>BONE_IDS.flatMap(id=>{
    const s=anatomy?.structures.find(s=>s.id===id);
    return s?.geometry?.positions?.length&&s.geometry.indices?.length?[s]:[];
  }),[anatomy]);
  const references=bones.filter(s=>referenceIds.includes(s.id)).map(s=>s.id);
  current.current={level,referenceIds,references,selected,hoveredId,onHover,onSelect};

  useEffect(()=>{
    if(!bones.length||!host.current){setStatus('loading');setLabelLayout([]);return;}
    const container=host.current;
    let renderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
    catch{setStatus('fallback');setLabelLayout([]);return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0,0);
    const canvas=renderer.domElement;
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label','同源C3至T1完整骨网格右侧视图，绿色线是主窗口当前切面高度');
    canvas.dataset.testid='spine-locator-canvas';container.prepend(canvas);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.08,.08,.08,-.08,.001,1);
    scene.add(new THREE.HemisphereLight(0xffffff,0x9a9787,2.4));
    const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(-1,1,.8);scene.add(light);
    const bounds=new THREE.Box3(),meshes=[];
    for(const s of bones){
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(s.geometry.positions,3));g.setIndex(s.geometry.indices);
      if(s.geometry.normals?.length===s.geometry.positions.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(s.geometry.normals,3));else g.computeVertexNormals();
      g.computeBoundingBox();bounds.union(g.boundingBox);
      const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#d9d7c8',roughness:.85,side:THREE.DoubleSide}));
      mesh.userData=s;scene.add(mesh);meshes.push(mesh);
    }
    const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    // Looking from the patient's right (-X) toward +X: +Y is screen up and
    // +Z is screen right. This camera never follows changes in level.
    camera.position.set(bounds.min.x-.24,center.y,center.z);camera.up.set(0,1,0);camera.lookAt(0,center.y,center.z);
    const lineGeometry=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bounds.min.x-.003,0,bounds.min.z-.005),
      new THREE.Vector3(bounds.min.x-.003,0,bounds.max.z+.005),
    ]);
    const heightLine=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:'#138f77',depthTest:false,depthWrite:false}));
    heightLine.renderOrder=10;scene.add(heightLine);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
    let hoverRequest=0,sample=null,gesture=null,disposed=false,emittedHover=null;

    function publish(id){
      if(disposed)return;
      canvas.dataset.hoveredId=id||'';canvas.style.cursor=id?'pointer':'default';
      if(id===emittedHover&&id===(current.current.hoveredId||null))return;
      emittedHover=id;current.current.onHover?.(id);
    }
    function pick(point){
      const rect=canvas.getBoundingClientRect();
      if(!point||!rect.width||!rect.height||point.x<rect.left||point.x>rect.right||point.y<rect.top||point.y>rect.bottom)return null;
      pointer.set((point.x-rect.left)/rect.width*2-1,-(point.y-rect.top)/rect.height*2+1);
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
      return raycaster.intersectObjects(meshes,false)[0]?.object.userData.id||null;
    }
    function cancelHover(){if(hoverRequest){cancelAnimationFrame(hoverRequest);hoverRequest=0;}}
    function clearHover(){cancelHover();sample=null;publish(null);}
    function move(event){
      if(gesture){if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>6)gesture.moved=true;return;}
      if(event.pointerType==='touch'||event.buttons)return;
      sample={x:event.clientX,y:event.clientY};
      if(!hoverRequest)hoverRequest=requestAnimationFrame(()=>{hoverRequest=0;if(!disposed&&sample&&!gesture)publish(pick(sample));});
    }
    function down(event){
      clearHover();
      if(gesture){gesture.moved=true;gesture.primary=false;return;}
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,primary:event.isPrimary!==false&&(event.pointerType==='touch'||event.button===0)};
    }
    function up(event){
      if(!gesture||gesture.id!==event.pointerId)return;
      const g=gesture;gesture=null;
      if(g.primary&&!g.moved&&Math.hypot(event.clientX-g.x,event.clientY-g.y)<=6){
        const id=pick({x:event.clientX,y:event.clientY});if(id)current.current.onSelect?.(id);
        if(event.pointerType!=='touch')publish(id);
      }
    }
    function cancel(){gesture=null;clearHover();}
    function render(){
      const state=current.current,referenceSet=new Set(state.referenceIds);
      for(const mesh of meshes){
        const id=mesh.userData.id,reference=referenceSet.has(id),active=id===state.selected,hover=id===state.hoveredId;
        // Every intersected bone keeps the same base emphasis, even when a
        // different bone is selected. Selection does not mean intersection.
        mesh.material.color.set(reference?'#a9cdb6':'#d9d7c8');
        mesh.material.emissive.set(hover?'#39775f':active?'#345b64':reference?'#39775f':'#000000');
        mesh.material.emissiveIntensity=hover ? .28 : active ? .20 : reference ? .12 : 0;
      }
      heightLine.position.y=state.level;
      canvas.dataset.sourcePlaneY=String(heightLine.position.y);canvas.dataset.referenceIds=state.references.join(' ');
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      const projected=new THREE.Vector3(bounds.min.x-.003,state.level,center.z).project(camera);
      if(levelMarker.current){levelMarker.current.style.top=`${(1-projected.y)*container.clientHeight/2}px`;levelMarker.current.style.visibility=Math.abs(projected.y)<=1?'visible':'hidden';}
      renderer.render(scene,camera);
    }
    function resize(){
      const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight),aspect=width/height;
      const viewHeight=Math.max(size.y+.014,(size.z+.018)/aspect),viewWidth=viewHeight*aspect;
      camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
      renderer.setSize(width,height);camera.updateMatrixWorld(true);
      const raw=meshes.map(mesh=>{
        const b=mesh.geometry.boundingBox,midY=(b.min.y+b.max.y)/2,p=mesh.geometry.attributes.position;
        // A real right-side source vertex anchors each external number. This
        // labels the whole source bone, not a named anatomical subpart.
        let score=Infinity,anchor=new THREE.Vector3();
        for(let i=0;i<p.count;i++){
          if(p.getX(i)>0)continue;
          const candidate=Math.abs(p.getY(i)-midY)+.2*Math.abs(p.getZ(i)-b.max.z);
          if(candidate<score){score=candidate;anchor.set(p.getX(i),p.getY(i),p.getZ(i));}
        }
        anchor.project(camera);
        return{id:mesh.userData.id,anchorX:(anchor.x+1)*width/2,anchorY:(1-anchor.y)*height/2,y:(1-anchor.y)*height/2};
      });
      // Keep external buttons readable when a narrow viewport increases the
      // camera's vertical extent; leaders still end at actual source vertices.
      for(let i=0;i<raw.length;i++)raw[i].y=Math.max(raw[i].y,i?raw[i-1].y+20:11);
      for(let i=raw.length-1;i>=0;i--)raw[i].y=Math.min(raw[i].y,i<raw.length-1?raw[i+1].y-20:height-11);
      setLabelLayout(raw.map(r=>({...r,width,height})));render();
    }
    canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',cancel);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);
    const observer=new ResizeObserver(resize);observer.observe(container);api.current={render};resize();setStatus('ready');
    return()=>{
      cancelHover();current.current.onHover?.(null);disposed=true;sample=null;gesture=null;observer.disconnect();
      canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',cancel);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);
      scene.traverse(object=>{object.geometry?.dispose();object.material?.dispose();});renderer.dispose();canvas.remove();api.current=null;
    };
  },[bones]);
  useEffect(()=>{api.current?.render();},[level,referenceIds,selected,hoveredId]);

  const ready=status==='ready',sourceUnavailable=Boolean(error)&&!bones.length,layoutById=new Map(labelLayout.map(item=>[item.id,item]));
  return <section className={`spine-locator ${ready?'is-ready':'is-fallback'}`} aria-label="颈椎骨性定位小窗" aria-busy={!ready&&!sourceUnavailable&&status!=='fallback'} data-testid="spine-locator" data-source-plane-y={level} data-reference-ids={references.join(' ')} data-load-state={sourceUnavailable?'error':status}>
    <div className="spine-locator-heading"><h3>骨性定位</h3><span>独立骨性定位层</span></div>
    <div className="spine-locator-body">
      <div className="spine-locator-viewport" ref={host}>
        {!ready&&<p className="spine-locator-fallback">{sourceUnavailable?'骨性定位暂不可用，请刷新后重试。':status==='fallback'?'三维窗口暂不可用，仍可按右侧骨编号选择。':'正在准备原始骨网格…'}</p>}
        <span className="spine-locator-head" aria-hidden="true">头侧 ↑</span><span className="spine-locator-foot" aria-hidden="true">↓ 足侧</span>
        <span className="spine-locator-direction" aria-hidden="true">后 −Z ←　→ 前 +Z</span>
        <span className="spine-locator-level-marker" ref={levelMarker} aria-hidden="true" style={{visibility:'hidden'}}>›</span>
        {ready&&labelLayout[0]&&<svg className="spine-locator-leaders" viewBox={`0 0 ${labelLayout[0].width} ${labelLayout[0].height}`} aria-hidden="true">{labelLayout.map(item=><path key={item.id} className={references.includes(item.id)?'is-intersected':''} d={`M${item.anchorX} ${item.anchorY} L${item.width-3} ${item.y}`}/>)}</svg>}
      </div>
      <div className="spine-locator-index" aria-label="同源椎骨编号索引">
        {bones.map(s=>{const position=layoutById.get(s.id),reference=references.includes(s.id),active=s.id===selected,hover=s.id===hoveredId;return <button key={s.id} type="button" className={`${reference?'is-intersected ':''}${active?'is-selected ':''}${hover?'is-hovered':''}`} style={ready&&position?{top:position.y}:undefined} data-structure-id={s.id} data-source-id={s.sourceId} aria-label={`选择${s.name} ${codeFor(s.id)}${reference?'，与当前局部切面相交':''}`} aria-pressed={active} title={`${s.name} · ${reference?'与当前局部切面相交':'完整骨参考'}；点击仅选择结构`} onPointerEnter={()=>onHover?.(s.id)} onPointerLeave={()=>onHover?.(null)} onFocus={()=>onHover?.(s.id)} onBlur={()=>onHover?.(null)} onClick={()=>onSelect?.(s.id)}><strong>{codeFor(s.id)}</strong><span>{s.name}</span></button>;})}
      </div>
    </div>
    <div className="spine-locator-note"><span><i/>亮色＝主窗口局部切面相交</span><small>侧面骨性参照 · 同源完整网格。绿线与主图同高；点击仅选结构。</small></div>
  </section>;
}
