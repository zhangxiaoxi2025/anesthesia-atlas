import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { INTERSCALENE_COLORS, SLICE_SIZE, sliceFrame, smoothRange } from '../interscalene-utils.js';

export default function InterscaleneScene({ anatomy, sections, level, progress, selected, hoveredId, layers, resetVersion, onHover, onSelect, levelAdjusting=false, referenceText='骨性参照载入中', referenceIds=[] }) {
  const host=useRef(null), api=useRef(null), props=useRef({});
  const planeGuide=useRef(null), guideRail=useRef(null), guideMarker=useRef(null), guideTailLabel=useRef(null), guideLink=useRef(null), guideAnchor=useRef(null);
  const [error,setError]=useState('');
  const [hitKind,setHitKind]=useState(null);
  props.current={sections,level,progress,selected,hoveredId,layers,onHover,onSelect,levelAdjusting,referenceIds};
  const namedStructure=anatomy?.structures.find(s=>s.id===(hoveredId||selected)&&layers[s.kind]!==false);
  const isHoverName=Boolean(namedStructure&&namedStructure.id===hoveredId);
  useEffect(()=>{
    if(!anatomy || !host.current) return;
    const container=host.current;
    let renderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch { setError('当前浏览器无法启用三维；仍可查看二维截线和真实超声。'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.setClearColor(0,0); renderer.localClippingEnabled=true;
    container.prepend(renderer.domElement); renderer.domElement.setAttribute('role','img'); renderer.domElement.setAttribute('aria-label','原始右颈三维和参考截面；鼠标查看结构中文名，点击锁定结构');
    renderer.domElement.dataset.testid='interscalene-canvas';
    renderer.domElement.style.cursor='grab';
    const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(34,1,.001,5);
    const center=new THREE.Vector3(...sliceFrame().center);
    const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=false; controls.minDistance=.10;controls.maxDistance=.8;
    scene.add(new THREE.HemisphereLight(0xffffff,0x968577,2.6)); const light=new THREE.DirectionalLight(0xfffaf3,2.8);light.position.set(-1,2,2);scene.add(light);
    const clip=[new THREE.Plane(new THREE.Vector3(1,0,0),.085),new THREE.Plane(new THREE.Vector3(-1,0,0),.012),new THREE.Plane(new THREE.Vector3(0,1,0),-1.418),new THREE.Plane(new THREE.Vector3(0,-1,0),1.54),new THREE.Plane(new THREE.Vector3(0,0,1),.075),new THREE.Plane(new THREE.Vector3(0,0,-1),.065)];
    const meshes=[];
    for(const s of anatomy.structures) {
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(s.geometry.positions,3));g.setIndex(s.geometry.indices);
      if(s.geometry.normals?.length===s.geometry.positions.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(s.geometry.normals,3));else g.computeVertexNormals();
      const material=new THREE.MeshStandardMaterial({color:INTERSCALENE_COLORS[s.kind],transparent:true,roughness:.8,side:THREE.DoubleSide,clippingPlanes:clip,depthWrite:s.kind!=='muscle'});
      const mesh=new THREE.Mesh(g,material);mesh.userData=s;mesh.renderOrder=s.kind==='nerve'?4:0;meshes.push(mesh);scene.add(mesh);
    }
    const sourcePlane=new THREE.Group(), extracted=new THREE.Group();scene.add(sourcePlane,extracted);
    const planeMaterial=new THREE.MeshBasicMaterial({color:'#35b9a0',transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});
    const planeGeo=new THREE.PlaneGeometry(SLICE_SIZE.width,SLICE_SIZE.depth);
    sourcePlane.add(new THREE.Mesh(planeGeo,planeMaterial));
    const extractedBackground=new THREE.Mesh(planeGeo.clone(),new THREE.MeshBasicMaterial({color:'#fcfbf5',transparent:true,opacity:.97,side:THREE.DoubleSide,depthWrite:false}));extractedBackground.renderOrder=6;extracted.add(extractedBackground);
    const border=new THREE.EdgesGeometry(planeGeo);
    const sourceBorder=new THREE.LineSegments(border,new THREE.LineBasicMaterial({color:'#159a80',transparent:true,opacity:.95,depthTest:false,depthWrite:false}));
    sourceBorder.renderOrder=12;sourcePlane.add(sourceBorder);
    // Small L-shaped reference markers remain legible even on WebGL platforms
    // whose native line width is fixed to one pixel. They are display helpers,
    // excluded from both anatomy-mesh and extracted-line pick collections.
    const cornerMarkers=[];
    for(const sx of [-1,1])for(const sy of [-1,1]){
      for(const horizontal of [true,false]){
        const length=.009,thickness=.0009;
        const marker=new THREE.Mesh(new THREE.PlaneGeometry(horizontal?length:thickness,horizontal?thickness:length),
          new THREE.MeshBasicMaterial({color:'#159a80',transparent:true,opacity:.95,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
        marker.position.set(sx*(SLICE_SIZE.width/2-(horizontal?length/2:0)),sy*(SLICE_SIZE.depth/2-(horizontal?0:length/2)),.0003);
        marker.renderOrder=13;cornerMarkers.push(marker);sourcePlane.add(marker);
      }
    }
    extracted.add(new THREE.LineSegments(border.clone(),new THREE.LineBasicMaterial({color:'#528d80'})));
    const lines=new THREE.Group();extracted.add(lines);
    let lineSections=null;
    const f=sliceFrame(), basis=new THREE.Matrix4().makeBasis(new THREE.Vector3(...f.u),new THREE.Vector3(...f.v).negate(),new THREE.Vector3(...f.n).negate());
    const sourceRotation=new THREE.Quaternion().setFromRotationMatrix(basis);
    const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
    // Source coordinates are meters: a 1.5 mm line radius makes thin, real
    // section lines selectable without granting nerves priority over muscles.
    raycaster.params.Line.threshold=.0015;
    let disposed=false, hoverRequest=0, pointerSample=null, gesture=null, interacting=false;
    let emittedHover=null, lastHitKind=null;

    function cancelHoverRequest(){if(hoverRequest){cancelAnimationFrame(hoverRequest);hoverRequest=0;}}
    function publishHover(id,kind=null){
      if(disposed)return;
      const s=anatomy.structures.find(s=>s.id===id&&props.current.layers[s.kind]!==false);
      const next=s?.id||null;
      renderer.domElement.dataset.hoveredId=next||'';
      renderer.domElement.dataset.hitKind=next?kind||'linked':'';
      renderer.domElement.style.cursor=gesture||interacting?'grabbing':next?'pointer':'grab';
      const nextKind=next?kind:null;
      if(nextKind!==lastHitKind)setHitKind(nextKind);
      lastHitKind=nextKind;
      if(next===emittedHover&&next===(props.current.hoveredId||null))return;
      emittedHover=next;props.current.onHover?.(next);
    }
    function notClipped(hit){
      const material=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex||0]:hit.object.material;
      return !(material.clippingPlanes||[]).some(plane=>plane.distanceToPoint(hit.point)<-1e-7);
    }
    function pickAt(sample){
      if(!sample)return null;
      const rect=renderer.domElement.getBoundingClientRect();
      if(!rect.width||!rect.height||sample.x<rect.left||sample.x>rect.right||sample.y<rect.top||sample.y>rect.bottom)return null;
      pointer.set((sample.x-rect.left)/rect.width*2-1,-(sample.y-rect.top)/rect.height*2+1);
      // Camera and extracted-plane transforms may have changed since the last
      // pointer event, so raycast only after refreshing world matrices.
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(pointer,camera);
      const bodyHits=raycaster.intersectObjects(meshes.filter(mesh=>mesh.visible&&mesh.material.opacity>0&&props.current.layers[mesh.userData.kind]!==false),false).filter(notClipped);
      const body=bodyHits[0];
      // The rectangle is also a bounds test for real lines at the origin.
      // A hidden, not-yet-extracted background must not occlude the body.
      const paperWindow=extracted.visible?raycaster.intersectObject(extractedBackground,false)[0]:null;
      const paper=extractedBackground.visible&&extractedBackground.material.opacity>0?paperWindow:null;
      const lineHits=extracted.visible?raycaster.intersectObjects(lines.children.filter(line=>line.visible&&props.current.layers[line.userData.kind]!==false),false):[];
      // All extracted lines share one plane: within that plane prefer the line
      // closest to the ray, then use actual ray distance as a stable tie-break.
      lineHits.sort((a,b)=>raycaster.ray.distanceSqToPoint(a.point)-raycaster.ray.distanceSqToPoint(b.point)||a.distance-b.distance);
      const line=lineHits[0];
      // The extracted diagram is an explicit graphic layer: its real lines
      // are rendered last with depthTest=false. Pick that visible foreground
      // line only within the actual paper window, never the whole paper.
      if(line&&paperWindow)return {id:line.object.userData.id,kind:'section'};
      // Match the paper's normal depth test for blank areas. Transparent
      // muscles do not write depth; a nearer depth-writing body can hide paper.
      const paperVisible=paper&&!bodyHits.some(hit=>hit.object.material.depthWrite&&hit.distance<paper.distance-1e-7);
      if(paperVisible)return null;
      // In the original body all visible materials, including transparent
      // muscle, retain nearest-hit priority. No anatomical-kind shortcut.
      if(body)return {id:body.object.userData.id,kind:'mesh'};
      return null;
    }
    function queueHover(){
      if(disposed||hoverRequest||!pointerSample||gesture||interacting)return;
      hoverRequest=requestAnimationFrame(()=>{
        hoverRequest=0;if(disposed||gesture||interacting||!pointerSample)return;
        const hit=pickAt(pointerSample);publishHover(hit?.id||null,hit?.kind);
      });
    }
    function pointerMove(event){
      if(gesture){
        if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>6)gesture.moved=true;
        return;
      }
      if(event.pointerType==='touch')return;
      pointerSample={x:event.clientX,y:event.clientY};
      if(event.buttons){clearPointer();return;}
      queueHover();
    }
    function pointerDown(event){
      cancelHoverRequest();publishHover(null);
      if(gesture){gesture.moved=true;gesture.primary=false;return;}
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,
        primary:event.isPrimary!==false&&(event.pointerType==='touch'||event.button===0)};
      pointerSample=event.pointerType==='touch'?null:{x:event.clientX,y:event.clientY};
      renderer.domElement.style.cursor='grabbing';
    }
    function pointerUp(event){
      const currentGesture=gesture;
      if(!currentGesture||currentGesture.id!==event.pointerId)return;
      gesture=null;
      const moved=currentGesture.moved||Math.hypot(event.clientX-currentGesture.x,event.clientY-currentGesture.y)>6;
      if(currentGesture.primary&&!moved){
        const hit=pickAt({x:event.clientX,y:event.clientY});
        if(hit)props.current.onSelect?.(hit.id);
        if(event.pointerType!=='touch')publishHover(hit?.id||null,hit?.kind);
      }
      renderer.domElement.style.cursor=props.current.hoveredId?'pointer':'grab';
    }
    function clearPointer(){cancelHoverRequest();pointerSample=null;publishHover(null);}
    function pointerCancel(){gesture=null;interacting=false;clearPointer();}
    function controlStart(){interacting=true;cancelHoverRequest();publishHover(null);renderer.domElement.style.cursor='grabbing';}
    function controlEnd(){interacting=false;renderer.domElement.style.cursor=props.current.hoveredId?'pointer':'grab';}
    function rebuildLines(sections) {
      while(lines.children.length){const child=lines.children[0];lines.remove(child);child.geometry.dispose();child.material.dispose();}
      for(const s of sections){const vertices=s.segments.flatMap(pair=>pair.flatMap(p=>[p[0],-p[1],.00015]));const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:INTERSCALENE_COLORS[s.kind],transparent:true,opacity:1,depthTest:false}));line.userData=s;line.renderOrder=10;lines.add(line);}
      lineSections=sections;
    }
    function updatePlaneGuide(){
      const svg=planeGuide.current;if(!svg)return;
      const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight),top=29,bottom=Math.max(top+1,height-31);
      svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
      const markerY=bottom-Math.max(0,Math.min(1,(sourcePlane.position.y-1.435)/(1.505-1.435)))*(bottom-top);
      guideRail.current?.setAttribute('y2',String(bottom));guideMarker.current?.setAttribute('cy',String(markerY));guideTailLabel.current?.setAttribute('y',String(height-12));
      // Project an actual source-plane corner, never the extracted paper.
      // Prefer the visible left edge to keep the connecting guide short.
      const candidates=[];
      for(const sx of [-1,1])for(const sy of [-1,1]){
        const point=new THREE.Vector3(sx*SLICE_SIZE.width/2,sy*SLICE_SIZE.depth/2,0).applyMatrix4(sourcePlane.matrixWorld).project(camera);
        if(point.z>=-1&&point.z<=1&&Math.abs(point.x)<=1&&Math.abs(point.y)<=1)candidates.push(point);
      }
      candidates.sort((a,b)=>a.x-b.x);
      const point=candidates[0],visible=Boolean(point);
      guideLink.current?.setAttribute('visibility',visible?'visible':'hidden');guideAnchor.current?.setAttribute('visibility',visible?'visible':'hidden');
      svg.dataset.anchorVisible=String(visible);
      if(point){
        const x=(point.x+1)*width/2,y=(1-point.y)*height/2;
        guideLink.current?.setAttribute('d',`M16 ${markerY} H27 L${x} ${y}`);
        guideAnchor.current?.setAttribute('cx',String(x));guideAnchor.current?.setAttribute('cy',String(y));
        svg.dataset.anchorX=x.toFixed(2);svg.dataset.anchorY=y.toFixed(2);
      }else{delete svg.dataset.anchorX;delete svg.dataset.anchorY;}
    }
    function render(){
      const state=props.current;
      if((state.hoveredId||null)!==emittedHover){
        // A linked 2D pointer/keyboard focus owns this update. Do not let the
        // last, stationary 3D pointer position immediately steal it back.
        cancelHoverRequest();pointerSample=null;lastHitKind=null;setHitKind(null);emittedHover=state.hoveredId||null;
        renderer.domElement.dataset.hoveredId=emittedHover||'';renderer.domElement.dataset.hitKind=emittedHover?'linked':'';
      }
      if(lineSections!==state.sections)rebuildLines(state.sections);
      const move=smoothRange(state.progress,.12,.52), turn=smoothRange(state.progress,.35,.75);
      const origin=new THREE.Vector3(...sliceFrame(state.level).center), right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion), up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
      sourcePlane.position.copy(origin);sourcePlane.quaternion.copy(sourceRotation);
      planeMaterial.opacity=state.levelAdjusting ? .21 : .12;
      sourceBorder.material.color.set(state.levelAdjusting?'#007b64':'#159a80');
      for(const marker of cornerMarkers){marker.material.color.set(state.levelAdjusting?'#007b64':'#159a80');marker.material.opacity=state.levelAdjusting?1:.95;}
      extracted.position.copy(origin).addScaledVector(right,.058*move).addScaledVector(up,.012*move);extracted.quaternion.copy(sourceRotation).slerp(camera.quaternion,turn);
      extracted.visible=state.sections.length>0;
      const paperReveal=smoothRange(state.progress,.12,.34);
      extractedBackground.visible=extracted.visible&&paperReveal>0;extractedBackground.material.opacity=.97*paperReveal;
      for(const mesh of meshes){
        const s=mesh.userData,active=s.id===state.selected,hover=s.id===state.hoveredId,reference=state.referenceIds.includes(s.id);
        mesh.visible=state.layers[s.kind]!==false;
        mesh.material.opacity=s.kind==='muscle' ? (active ? .55 : hover ? .34 : .16) : s.kind==='bone' ? (active||hover ? .62 : reference ? .54 : .23) : active||hover ? 1 : .68;
        mesh.material.color.set(reference?'#7eac97':INTERSCALENE_COLORS[s.kind]);
        mesh.material.emissive.set(hover?'#6d6b24':active?'#6c5020':reference?'#185340':'#000000');mesh.material.emissiveIntensity=hover ? .28 : active ? .16 : reference ? .18 : 0;
      }
      for(const line of lines.children){line.visible=state.layers[line.userData.kind]!==false;line.material.opacity=line.userData.id===state.hoveredId||line.userData.id===state.selected?1:.62;}
      const hovered=anatomy.structures.find(s=>s.id===state.hoveredId);
      if(state.hoveredId&&(!hovered||(lastHitKind&&state.layers[hovered.kind]===false)||(lastHitKind==='section'&&!lines.children.some(line=>line.visible&&line.userData.id===state.hoveredId))))publishHover(null);
      renderer.domElement.dataset.sourcePlaneY=String(sourcePlane.position.y);renderer.domElement.dataset.progress=String(state.progress);
      renderer.domElement.dataset.extractedPaperVisible=String(extractedBackground.visible);renderer.domElement.dataset.extractedPaperOpacity=String(extractedBackground.material.opacity);
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);updatePlaneGuide();
      renderer.render(scene,camera);queueHover();
    }
    function fitView(resetOrientation=false){
      const direction=resetOrientation?new THREE.Vector3(-.24,.11,.16).normalize():camera.position.clone().sub(controls.target).normalize();
      if(direction.lengthSq()<.5)direction.set(-.24,.11,.16).normalize();
      const visibleHeight=Math.max(.215,.23/Math.max(camera.aspect,.35));
      const distance=visibleHeight/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
      controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);
      const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      controls.target.addScaledVector(right,.022);camera.position.addScaledVector(right,.022);controls.update();render();
    }
    function reset(){fitView(true);}
    function resize(){renderer.setSize(Math.max(1,container.clientWidth),Math.max(1,container.clientHeight));camera.aspect=Math.max(1,container.clientWidth)/Math.max(1,container.clientHeight);camera.updateProjectionMatrix();fitView();}
    const canvas=renderer.domElement;
    canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerleave',clearPointer);
    canvas.addEventListener('pointerdown',pointerDown,true);canvas.addEventListener('pointerup',pointerUp,true);canvas.addEventListener('pointercancel',pointerCancel,true);
    const observer=new ResizeObserver(resize);observer.observe(container);
    controls.addEventListener('change',render);controls.addEventListener('start',controlStart);controls.addEventListener('end',controlEnd);
    api.current={render,reset};resize();reset();
    return()=>{
      cancelHoverRequest();props.current.onHover?.(null);disposed=true;pointerSample=null;gesture=null;
      observer.disconnect();controls.removeEventListener('change',render);controls.removeEventListener('start',controlStart);controls.removeEventListener('end',controlEnd);controls.dispose();
      canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerleave',clearPointer);
      canvas.removeEventListener('pointerdown',pointerDown,true);canvas.removeEventListener('pointerup',pointerUp,true);canvas.removeEventListener('pointercancel',pointerCancel,true);
      scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();canvas.remove();api.current=null;
    };
  },[anatomy]);
  useEffect(()=>{api.current?.render();},[sections,level,progress,selected,hoveredId,layers,levelAdjusting,referenceIds]);
  useEffect(()=>{api.current?.reset();},[resetVersion]);
  return <div className="is-scene-wrap" data-source-plane-y={level} data-progress={progress} data-adjusting={levelAdjusting}>
    <div className="is-scene" ref={host}>{error&&<p className="is-render-error">{error}</p>}{!anatomy&&!error&&<p className="is-render-error">正在加载有来源的颈部网格…</p>}
      <svg className="is-plane-guide" ref={planeGuide} role="img" aria-label="源模型切面高度指示，头侧为源Y正向，连接点为真实参考面角点投影" data-testid="source-plane-guide" data-adjusting={levelAdjusting} style={{pointerEvents:'none'}}>
        <text x="16" y="16" textAnchor="middle">头侧</text><line ref={guideRail} x1="16" y1="29" x2="16" y2="329" stroke="currentColor" strokeWidth="1.5"/>
        <text ref={guideTailLabel} x="16" y="348" textAnchor="middle">足侧</text><circle ref={guideMarker} cx="16" cy="180" r="4.5" fill="currentColor"/>
        <path ref={guideLink} fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3"/>
        <circle ref={guideAnchor} r="4" fill="#fff" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
      <div className="is-scene-corner">右颈 · 源中立位<br/>拖动旋转 · 滚轮缩放</div>
    </div>
    <div className="is-plane-readout" role="status" aria-live="polite" data-testid="source-plane-readout" data-adjusting={levelAdjusting}>
      <span>骨性参照</span><strong>{referenceText}</strong><small>{levelAdjusting?'正在调节切面':'青绿色框标出模型水平面'}</small>
    </div>
    <div className="is-scene-name-dock" role="status" aria-live="polite" data-testid="is-structure-dock" data-structure-id={namedStructure?.id||''} data-source-id={namedStructure?.sourceId||''}>
      <span className="is-scene-name-kind">{isHoverName?'鼠标所指':namedStructure?'已选结构':'结构名称'}</span><strong className="is-scene-name-label">{namedStructure?.name||'移到结构上查看中文名称'}</strong><span className="is-scene-name-hint">{isHoverName?(hitKind==='mesh'&&namedStructure.kind==='muscle'?'关闭肌肉图层可查看深部结构；点击可锁定':'点击可锁定；同名二维截线同步提示'):'拖动旋转 · 点击或轻触结构可选中'}</span>
    </div>
  </div>;
}
