import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { sliceFrame, SLICE_SIZE } from '../interscalene-utils.js';

const VIEW_DIRECTIONS = {
  front: [0, 0, 1], back: [0, 0, -1], right: [-1, 0, 0], oblique: [-.85, .25, 1],
};
const BONE_IDS = ['vertebra-c5', 'vertebra-c6', 'vertebra-c7', 'vertebra-t1'];
const SCALENE_IDS = ['anterior-scalene', 'middle-scalene'];

function bufferGeometry(source) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.positions, 3));
  geometry.setIndex(source.indices);
  if (source.normals?.length === source.positions.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(source.normals, 3));
  else geometry.computeVertexNormals();
  return geometry;
}

// The caller supplies an overlay only after asynchronous source-buffer SHA
// verification. Anatomy meshes and overlay vertices keep their source coordinates.
export default function RootCandidateScene({
  anatomy, overlay, showCandidate = true, showScalenes = false, showBones = true, view = 'oblique',
  resetVersion = 0, sectionLevel = 1.450,
}) {
  const host = useRef(null), api = useRef(null), current = useRef({});
  const [renderError, setRenderError] = useState('');
  const [pointed, setPointed] = useState(null), [locked, setLocked] = useState(null);
  current.current = { showCandidate, showScalenes, showBones, sectionLevel };
  const visibleInfo = info => info && info.anatomy === anatomy && (info.kind !== 'candidate' || overlay && showCandidate) && (info.kind !== 'muscle' || showScalenes) && (info.kind !== 'bone' || showBones) ? info : null;
  const pointedInfo = visibleInfo(pointed), lockedInfo = visibleInfo(locked), named = pointedInfo || lockedInfo;
  useEffect(() => {
    if (!anatomy?.structures || !host.current) return;
    const container = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setRenderError('当前浏览器无法启用三维，仍可查看右侧完整原图与核对说明。'); return; }
    setRenderError(''); setPointed(null); setLocked(null);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '原始近端合并网格、中干和未核定候选原面，可通过视角和缩放按钮观察');
    canvas.dataset.testid = 'root-candidate-canvas';
    container.prepend(canvas);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(33, 1, .001, 5);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.minDistance = .045; controls.maxDistance = .9;
    controls.screenSpacePanning = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x857868, 2.5));
    const light = new THREE.DirectionalLight(0xfff9eb, 2.8); light.position.set(-1, 2, 3); scene.add(light);
    const rim = new THREE.DirectionalLight(0xd8e8df, 1.4); rim.position.set(1, 1, -2); scene.add(rim);
    const sourceIds = new Set(['brachial-roots', 'middle-trunk', ...BONE_IDS, ...SCALENE_IDS]);
    const meshes = [];
    for (const structure of anatomy.structures.filter(s => sourceIds.has(s.id))) {
      const isRoots = structure.id === 'brachial-roots', isMiddle = structure.id === 'middle-trunk', isMuscle = SCALENE_IDS.includes(structure.id);
      const material = new THREE.MeshStandardMaterial({
        color: isRoots ? '#b8ab7c' : isMiddle ? '#2f8293' : isMuscle ? '#c69c8d' : '#b4c1b3',
        transparent: true, opacity: isRoots ? .36 : isMiddle ? .94 : isMuscle ? .18 : .20,
        roughness: .8, side: THREE.DoubleSide, depthWrite: isMiddle,
      });
      const mesh = new THREE.Mesh(bufferGeometry(structure.geometry), material);
      mesh.userData = { id: structure.id, isMuscle, isBone: BONE_IDS.includes(structure.id), info: {
        id: structure.id, name: isMiddle ? '中干（源已具名）' : structure.name,
        kind: structure.kind, anatomy,
      } };
      mesh.renderOrder = isRoots ? 3 : isMiddle ? 4 : 1;
      meshes.push(mesh); scene.add(mesh);
    }
    let candidateMesh = null;
    if (overlay?.status === 'ready' && overlay.geometry) {
      const geometry = bufferGeometry(overlay.geometry);
      // The position array intentionally still contains every original vertex.
      // Bounds use referenced candidate faces rather than the full buffer.
      const box = new THREE.Box3(new THREE.Vector3(...overlay.bounds.min), new THREE.Vector3(...overlay.bounds.max));
      geometry.boundingBox = box; geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      candidateMesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        color: '#e16b40', emissive: '#8e3115', emissiveIntensity: .20,
        roughness: .65, side: THREE.DoubleSide, transparent: true, opacity: 1,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false,
      }));
      candidateMesh.userData.info = { id: overlay.id, name: '中干近端候选走行（节段未核定）', kind: 'candidate', anatomy };
      candidateMesh.renderOrder = 7; scene.add(candidateMesh);
    }
    const frame = sliceFrame(sectionLevel), basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(...frame.u), new THREE.Vector3(...frame.v), new THREE.Vector3(...frame.n),
    );
    const plane = new THREE.Group(), planeGeometry = new THREE.PlaneGeometry(SLICE_SIZE.width, SLICE_SIZE.depth);
    plane.add(new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({
      color: '#42a98f', side: THREE.DoubleSide, transparent: true, opacity: .075, depthWrite: false,
    })));
    plane.add(new THREE.LineSegments(new THREE.EdgesGeometry(planeGeometry), new THREE.LineBasicMaterial({
      color: '#268975', transparent: true, opacity: .7, depthWrite: false,
    })));
    plane.quaternion.setFromRotationMatrix(basis); scene.add(plane);

    const source = anatomy.structures.find(s => s.id === 'brachial-roots');
    const middle = anatomy.structures.find(s => s.id === 'middle-trunk');
    const focus = new THREE.Box3();
    if (overlay?.status === 'ready') focus.set(new THREE.Vector3(...overlay.bounds.min), new THREE.Vector3(...overlay.bounds.max));
    else if (source?.bounds) focus.set(new THREE.Vector3(...source.bounds.min), new THREE.Vector3(...source.bounds.max));
    if (middle?.bounds) focus.union(new THREE.Box3(new THREE.Vector3(...middle.bounds.min), new THREE.Vector3(...middle.bounds.max)));
    if (focus.isEmpty()) focus.set(new THREE.Vector3(-.09, 1.42, -.05), new THREE.Vector3(-.01, 1.50, .01));
    focus.expandByScalar(.017);
    const center = focus.getCenter(new THREE.Vector3()), sphere = focus.getBoundingSphere(new THREE.Sphere());
    let disposed = false, contextLost = false, hoveredInfo = null, selectedInfo = null;
    let hoverRequest = 0, pointerSample = null, gesture = null, interacting = false;
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const pickMeshes = [...meshes, ...(candidateMesh ? [candidateMesh] : [])];
    function publishHover(info) {
      if (disposed || hoveredInfo?.id === info?.id) return;
      hoveredInfo = info; setPointed(info);
      canvas.dataset.hoveredId = info?.id || ''; render();
    }
    function selectInfo(info) { selectedInfo = info; setLocked(info); canvas.dataset.selectedId = info?.id || ''; render(); }
    function cancelHover() { if (hoverRequest) { cancelAnimationFrame(hoverRequest); hoverRequest = 0; } }
    function pickAt(sample) {
      if (!sample) return null;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || sample.x < rect.left || sample.x > rect.right || sample.y < rect.top || sample.y > rect.bottom) return null;
      pointer.set((sample.x - rect.left) / rect.width * 2 - 1, -(sample.y - rect.top) / rect.height * 2 + 1);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickMeshes.filter(mesh => mesh.visible && mesh.material.opacity > 0), false);
      // The overlay repeats exact source faces: at equal ray distance, its
      // visible draw order resolves that tie. There is no nerve-kind priority.
      hits.sort((a, b) => Math.abs(a.distance - b.distance) < 1e-9 ? b.object.renderOrder - a.object.renderOrder : a.distance - b.distance);
      return hits[0]?.object.userData.info || null;
    }
    function queueHover() {
      if (disposed || hoverRequest || !pointerSample || gesture || interacting) return;
      hoverRequest = requestAnimationFrame(() => { hoverRequest = 0; if (!disposed && !gesture && !interacting) publishHover(pickAt(pointerSample)); });
    }
    function pointerMove(event) {
      if (gesture) { if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true; return; }
      if (event.pointerType === 'touch') return;
      pointerSample = { x: event.clientX, y: event.clientY }; queueHover();
    }
    function pointerDown(event) {
      cancelHover(); pointerSample = null; publishHover(null);
      if (gesture) { gesture.moved = true; gesture.primary = false; return; }
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
        primary: event.isPrimary !== false && (event.pointerType === 'touch' || event.button === 0) };
    }
    function pointerUp(event) {
      const prior = gesture;
      if (!prior || prior.id !== event.pointerId) return;
      gesture = null;
      if (prior.primary && !prior.moved && Math.hypot(event.clientX - prior.x, event.clientY - prior.y) <= 6) {
        const hit = pickAt({ x: event.clientX, y: event.clientY }); selectInfo(hit);
        if (event.pointerType !== 'touch') publishHover(hit);
      }
    }
    function clearPointer() { cancelHover(); pointerSample = null; publishHover(null); }
    function pointerCancel() { gesture = null; interacting = false; clearPointer(); }
    function controlStart() { interacting = true; clearPointer(); }
    function controlEnd() { interacting = false; }
    function render() {
      if (disposed || contextLost) return;
      for (const mesh of meshes) {
        if (mesh.userData.isMuscle) mesh.visible = current.current.showScalenes;
        if (mesh.userData.isBone) mesh.visible = current.current.showBones;
      }
      if (candidateMesh) candidateMesh.visible = current.current.showCandidate;
      const stillVisible = info => !info || pickMeshes.some(mesh => mesh.visible && mesh.userData.info.id === info.id);
      if (!stillVisible(hoveredInfo)) { hoveredInfo = null; setPointed(null); canvas.dataset.hoveredId = ''; }
      if (!stillVisible(selectedInfo)) { selectedInfo = null; setLocked(null); canvas.dataset.selectedId = ''; }
      const active = hoveredInfo || selectedInfo;
      for (const mesh of pickMeshes) {
        const candidate = mesh === candidateMesh, emphasized = mesh.userData.info.id === active?.id;
        mesh.material.emissive.set(emphasized ? (candidate ? '#8e3115' : '#5b6f29') : candidate ? '#8e3115' : '#000000');
        mesh.material.emissiveIntensity = emphasized ? .36 : candidate ? .20 : 0;
      }
      plane.visible = Boolean(overlay?.status === 'ready');
      plane.position.set(...sliceFrame(current.current.sectionLevel).center);
      canvas.dataset.candidateVisible = String(Boolean(candidateMesh?.visible));
      canvas.dataset.sectionLevel = String(current.current.sectionLevel);
      renderer.render(scene, camera);
    }
    function fitView(preset = 'oblique', preserveDirection = false) {
      const direction = preserveDirection ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(...(VIEW_DIRECTIONS[preset] || VIEW_DIRECTIONS.oblique)).normalize();
      if (direction.lengthSq() < .5) direction.set(...VIEW_DIRECTIONS.oblique).normalize();
      const fitAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
      const distance = THREE.MathUtils.clamp(sphere.radius / Math.sin(fitAngle) * 1.06, .06, .85);
      controls.target.copy(center); camera.position.copy(center).addScaledVector(direction, distance);
      camera.up.set(0, 1, 0); camera.lookAt(center); controls.update(); render();
    }
    function resize() {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height, false); fitView(view, true);
    }
    function loseContext(event) {
      event.preventDefault(); contextLost = true;
      setRenderError('三维显示暂时中断，可收起后重新打开；完整原图仍可查看。');
    }
    controls.addEventListener('change', render);
    controls.addEventListener('start', controlStart); controls.addEventListener('end', controlEnd);
    canvas.addEventListener('webglcontextlost', loseContext);
    canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerleave', clearPointer);
    canvas.addEventListener('pointerdown', pointerDown, true); canvas.addEventListener('pointerup', pointerUp, true); canvas.addEventListener('pointercancel', pointerCancel, true);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    api.current = {
      render, setView: preset => { clearPointer(); fitView(preset); }, reset: () => fitView('oblique'), clearSelection: () => selectInfo(null),
      zoom: factor => {
        const offset = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance); controls.update(); render();
      },
    };
    resize(); fitView(view);
    return () => {
      disposed = true; cancelHover(); pointerSample = null; gesture = null; observer.disconnect();
      controls.removeEventListener('change', render); controls.removeEventListener('start', controlStart); controls.removeEventListener('end', controlEnd); controls.dispose();
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerleave', clearPointer);
      canvas.removeEventListener('pointerdown', pointerDown, true); canvas.removeEventListener('pointerup', pointerUp, true); canvas.removeEventListener('pointercancel', pointerCancel, true);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) materials.add(material);
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); api.current = null;
    };
  }, [anatomy, overlay]);
  useEffect(() => { api.current?.render(); }, [showCandidate, showScalenes, showBones, sectionLevel]);
  useEffect(() => { api.current?.setView(view); }, [view, resetVersion]);
  return <div className="rar-scene-wrap">
    <div className="rar-scene" ref={host}>
      {renderError ? <p className="rar-render-error" role="status">{renderError}</p> : null}
      <div className="rar-scene-direction">右颈 · 源图谱坐标<br/>青框为几何参考面 · 非超声</div>
      <div className="rar-zoom" aria-label="候选三维缩放">
        <button type="button" aria-label="放大候选三维" title="放大" onClick={() => api.current?.zoom(.8)}><ZoomIn size={18}/></button>
        <button type="button" aria-label="缩小候选三维" title="缩小" onClick={() => api.current?.zoom(1.25)}><ZoomOut size={18}/></button>
      </div>
    </div>
    <div className="rar-name-dock" role="status" aria-live="polite" data-testid="root-candidate-name-dock" data-structure-id={named?.id || ''}>
      <span>{pointedInfo ? '鼠标所指' : lockedInfo ? '已选结构' : '结构名称'}</span><strong>{named?.name || '移到结构上，或轻触结构查看中文名称'}</strong>
      {lockedInfo ? <button type="button" onClick={() => api.current?.clearSelection()}>清除选中</button> : <small>名称显示在图外</small>}
    </div>
    <p className="rar-view-help">拖动旋转 · 滚轮或双指缩放；也可使用上方视角和缩放按钮。</p>
  </div>;
}

