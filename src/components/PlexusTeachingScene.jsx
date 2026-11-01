import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import '../plexus-teaching-scene.css';

const EMPTY_IDS = [];
const TRUNKS = [
  { id: 'superior-trunk', name: '上干', color: '#2f8a75' },
  { id: 'middle-trunk', name: '中干', color: '#397ca8' },
  { id: 'inferior-trunk', name: '下干', color: '#a66f44' },
];
const TRUNK_IDS = TRUNKS.map(s => s.id);
const BONE_IDS = ['vertebra-c4', 'vertebra-c5', 'vertebra-c6', 'vertebra-c7', 'vertebra-t1'];
const MUSCLE_IDS = ['anterior-scalene', 'middle-scalene'];
const SOURCE_IDS = new Set(['brachial-roots', ...TRUNK_IDS, ...BONE_IDS, ...MUSCLE_IDS]);
const DIRECTIONS = { front: [0, 0, 1], right: [-1, 0, 0], oblique: [-.85, .16, 1] };
const VIEW_NAMES = { front: '前视', right: '右侧视', oblique: '斜视' };

function usableGeometry(g) {
  return Array.isArray(g?.positions) && g.positions.length >= 9 && g.positions.length % 3 === 0
    && g.positions.every(Number.isFinite) && Array.isArray(g.indices) && g.indices.length >= 3
    && g.indices.length % 3 === 0 && g.indices.every(i => Number.isInteger(i) && i >= 0 && i < g.positions.length / 3);
}
function sourceBuffer(g) {
  const buffer = new THREE.BufferGeometry();
  buffer.setAttribute('position', new THREE.Float32BufferAttribute(g.positions, 3));
  buffer.setIndex(g.indices);
  if (g.normals?.length === g.positions.length) buffer.setAttribute('normal', new THREE.Float32BufferAttribute(g.normals, 3));
  else buffer.computeVertexNormals();
  buffer.computeBoundingBox(); buffer.computeBoundingSphere();
  return buffer;
}

/** Source meshes stay in their original coordinates. Only named trunks are selectable. */
export default function PlexusTeachingScene({ anatomy, selectedTrunkIds = EMPTY_IDS, onSelectTrunk }) {
  const host = useRef(null), api = useRef(null), current = useRef({});
  const [showBones, setShowBones] = useState(true), [showMuscles, setShowMuscles] = useState(false);
  const [preset, setPreset] = useState('oblique'), [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading'), [error, setError] = useState('');
  const [pointed, setPointed] = useState(null), [inspected, setInspected] = useState(null);
  const structures = useMemo(() => (anatomy?.structures || []).filter(s => SOURCE_IDS.has(s.id) && usableGeometry(s.geometry)), [anatomy]);
  const availableIds = useMemo(() => new Set(structures.map(s => s.id)), [structures]);
  const highlightedIds = TRUNK_IDS.filter(id => availableIds.has(id) && Array.isArray(selectedTrunkIds) && selectedTrunkIds.includes(id));
  const highlightedKey = highlightedIds.join(' ');
  current.current = { showBones, showMuscles, highlightedIds, onSelectTrunk };
  const visibleInfo = info => info?.anatomy === anatomy && availableIds.has(info.id)
    && (!BONE_IDS.includes(info.id) || showBones) && (!MUSCLE_IDS.includes(info.id) || showMuscles) ? info : null;
  const pointedInfo = visibleInfo(pointed), inspectedInfo = visibleInfo(inspected), named = pointedInfo || inspectedInfo;
  const highlightedNames = TRUNKS.filter(s => highlightedIds.includes(s.id)).map(s => s.name);

  useEffect(() => {
    if (!host.current || !anatomy) { setStatus('loading'); return; }
    if (!['brachial-roots', ...TRUNK_IDS].every(id => availableIds.has(id))) {
      setStatus('error'); setError('原始近端网格或具名三干未完整载入，三维教学暂不可用。'); return;
    }
    const container = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setStatus('error'); setError('浏览器暂不能启用三维，仍可用下方三干按钮联动教学。'); return; }
    setStatus('ready'); setError(''); setPointed(null); setInspected(null); setPreset('oblique');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;
    const canvas = renderer.domElement;
    canvas.dataset.testid = 'plexus-teaching-canvas'; canvas.dataset.sourceCoordinates = 'unchanged';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '右侧臂丛近端原网格和源已具名三干，未将近端原网格识别为逐根前支；可用外置按钮切换视角和选择三干');
    container.prepend(canvas);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .001, 3);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.screenSpacePanning = true;
    controls.minDistance = .035; controls.maxDistance = 1;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8b8670, 2.2));
    const keyLight = new THREE.DirectionalLight(0xfffbee, 2.5); keyLight.position.set(-1, 2, 3); scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xdceafa, 1.4); fillLight.position.set(1, .5, -2); scene.add(fillLight);
    const meshes = [], focus = new THREE.Box3();
    for (const source of structures) {
      const trunk = TRUNKS.find(t => t.id === source.id), roots = source.id === 'brachial-roots';
      const bone = BONE_IDS.includes(source.id), muscle = MUSCLE_IDS.includes(source.id);
      const geometry = sourceBuffer(source.geometry);
      // Geometry boundingBox is this mesh's own buffer; children never enlarge it.
      if (roots || trunk) focus.union(geometry.boundingBox);
      const material = new THREE.MeshStandardMaterial({
        color: trunk?.color || (roots ? '#b8ab7c' : muscle ? '#c69c8d' : '#c1c7b7'),
        roughness: .8, side: THREE.DoubleSide, transparent: !trunk,
        opacity: trunk ? 1 : roots ? .26 : muscle ? .13 : .15, depthWrite: Boolean(trunk),
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { id: source.id, trunk: Boolean(trunk), roots, bone, muscle, info: {
        id: source.id, name: roots ? '近端原网格（前支尚未分段核定）' : trunk ? `${trunk.name}（源已具名）` : source.name,
        sourceId: source.sourceId, kind: source.kind, anatomy,
      } };
      mesh.renderOrder = trunk ? 3 : roots ? 2 : 0; meshes.push(mesh); scene.add(mesh);
    }
    // Context is locally displayed around the right neck. The roots and three
    // trunks are never clipped, rescaled, connected or posed.
    const contextBox = focus.clone().expandByScalar(.018);
    contextBox.max.x = Math.min(contextBox.max.x, .005);
    const clipPlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -contextBox.min.x),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), contextBox.max.x),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -contextBox.min.y),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), contextBox.max.y),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -contextBox.min.z),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), contextBox.max.z),
    ];
    meshes.filter(m => m.userData.bone || m.userData.muscle).forEach(m => { m.material.clippingPlanes = clipPlanes; });
    const fitBox = focus.clone().expandByScalar(.008), center = fitBox.getCenter(new THREE.Vector3());
    const corners = [];
    for (const x of [fitBox.min.x, fitBox.max.x]) for (const y of [fitBox.min.y, fitBox.max.y]) for (const z of [fitBox.min.z, fitBox.max.z]) corners.push(new THREE.Vector3(x, y, z).sub(center));
    let disposed = false, contextLost = false, interacting = false, gesture = null, hoverId = null;
    let hoverFrame = 0, pointerSample = null, inspectedId = null, lastPreset = 'oblique';
    const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();

    function cancelHoverFrame() { if (hoverFrame) { cancelAnimationFrame(hoverFrame); hoverFrame = 0; } }
    function publishHover(info) {
      if (disposed || hoverId === (info?.id || null)) return;
      hoverId = info?.id || null; setPointed(info); canvas.dataset.hoveredId = hoverId || ''; render();
    }
    function clearHover() { cancelHoverFrame(); pointerSample = null; publishHover(null); }
    function pickAt(sample) {
      const rect = canvas.getBoundingClientRect();
      if (!sample || !rect.width || !rect.height || sample.x < rect.left || sample.x > rect.right || sample.y < rect.top || sample.y > rect.bottom) return null;
      pointer.set((sample.x - rect.left) / rect.width * 2 - 1, -(sample.y - rect.top) / rect.height * 2 + 1);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes.filter(m => m.visible && m.material.opacity > 0), false)
        .filter(hit => !(hit.object.material.clippingPlanes || []).some(plane => plane.distanceToPoint(hit.point) < -1e-7));
      // Respect front-to-back geometry, including translucent context. Only an
      // effectively coincident source-face tie uses the actual draw order.
      hits.sort((a, b) => Math.abs(a.distance - b.distance) < 1e-9 ? b.object.renderOrder - a.object.renderOrder : a.distance - b.distance);
      return hits[0]?.object.userData.info || null;
    }
    function move(event) {
      if (gesture) {
        if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) {
          gesture.moved = true;
          if (lastPreset !== 'free') { lastPreset = 'free'; setPreset('free'); }
        }
        return;
      }
      if (event.pointerType === 'touch' || event.buttons || interacting) return;
      pointerSample = { x: event.clientX, y: event.clientY };
      if (!hoverFrame) hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0; if (!disposed && !gesture && !interacting) publishHover(pickAt(pointerSample));
      });
    }
    function down(event) {
      clearHover();
      if (gesture) { gesture.primary = false; gesture.moved = true; return; }
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
        primary: event.isPrimary !== false && (event.pointerType === 'touch' || event.button === 0) };
    }
    function up(event) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const prior = gesture; gesture = null;
      if (!prior.primary || prior.moved || Math.hypot(event.clientX - prior.x, event.clientY - prior.y) > 6) return;
      const info = pickAt({ x: event.clientX, y: event.clientY });
      inspectedId = info?.id || null; setInspected(info); canvas.dataset.inspectedId = inspectedId || '';
      if (info && TRUNK_IDS.includes(info.id)) current.current.onSelectTrunk?.(info.id);
      if (event.pointerType !== 'touch') publishHover(info);
      render();
    }
    function cancelPointer() { gesture = null; interacting = false; clearHover(); }
    function startControls() { interacting = true; clearHover(); }
    function endControls() { interacting = false; }
    function render() {
      if (disposed || contextLost) return;
      const state = current.current;
      for (const mesh of meshes) {
        if (mesh.userData.bone) mesh.visible = state.showBones;
        if (mesh.userData.muscle) mesh.visible = state.showMuscles;
      }
      if (hoverId && !meshes.some(m => m.visible && m.userData.id === hoverId)) { hoverId = null; setPointed(null); }
      if (inspectedId && !meshes.some(m => m.visible && m.userData.id === inspectedId)) { inspectedId = null; setInspected(null); }
      const selected = new Set(state.highlightedIds);
      for (const mesh of meshes) {
        const hover = mesh.userData.id === hoverId, highlighted = mesh.userData.trunk && selected.has(mesh.userData.id);
        mesh.material.emissive.set(hover || highlighted ? mesh.material.color : '#000000');
        mesh.material.emissiveIntensity = hover ? .4 : highlighted ? .24 : 0;
      }
      canvas.dataset.hoveredId = hoverId || ''; canvas.dataset.inspectedId = inspectedId || '';
      canvas.dataset.highlightedTrunkIds = state.highlightedIds.join(' ');
      canvas.dataset.selectedId = state.highlightedIds[0] || '';
      canvas.dataset.view = lastPreset; canvas.dataset.visibleSourceIds = meshes.filter(m => m.visible).map(m => m.userData.id).join(' ');
      renderer.render(scene, camera);
    }
    function fitView(presetName = 'oblique', directionOverride = null) {
      const direction = directionOverride?.clone().normalize() || new THREE.Vector3(...(DIRECTIONS[presetName] || DIRECTIONS.oblique)).normalize();
      const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize(), upAxis = direction.clone().cross(right).normalize();
      const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanHorizontal = tanVertical * camera.aspect;
      let distance = .06;
      for (const corner of corners) {
        const towardCamera = corner.dot(direction);
        distance = Math.max(distance, towardCamera + Math.abs(corner.dot(upAxis)) / tanVertical, towardCamera + Math.abs(corner.dot(right)) / tanHorizontal);
      }
      distance = THREE.MathUtils.clamp(distance * 1.10, controls.minDistance, controls.maxDistance);
      controls.target.copy(center); camera.position.copy(center).addScaledVector(direction, distance);
      camera.up.set(0, 1, 0); camera.lookAt(center); controls.update(); render();
    }
    function resize() {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      const direction = camera.position.clone().sub(controls.target);
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
      fitView(lastPreset, direction.lengthSq() > 1e-8 ? direction : null);
    }
    function loseContext(event) {
      event.preventDefault(); contextLost = true; cancelHoverFrame();
      setStatus('error'); setError('三维显示暂时中断，可重试；下方三干按钮仍可使用。');
    }
    controls.addEventListener('change', render); controls.addEventListener('start', startControls); controls.addEventListener('end', endControls);
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', clearHover);
    canvas.addEventListener('pointerdown', down, true); canvas.addEventListener('pointerup', up, true);
    canvas.addEventListener('pointercancel', cancelPointer, true); canvas.addEventListener('lostpointercapture', cancelPointer);
    canvas.addEventListener('webglcontextlost', loseContext);
    const observer = new ResizeObserver(resize); observer.observe(container);
    api.current = {
      render,
      clearInspection: () => { inspectedId = null; setInspected(null); canvas.dataset.inspectedId = ''; },
      setView: next => { clearHover(); lastPreset = next; setPreset(next); fitView(next); },
      reset: () => { clearHover(); inspectedId = null; setInspected(null); lastPreset = 'oblique'; setPreset('oblique'); fitView('oblique'); },
      zoom: factor => {
        const offset = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance); controls.update(); render();
      },
    };
    resize(); fitView('oblique');
    return () => {
      disposed = true; cancelHoverFrame(); pointerSample = null; gesture = null; observer.disconnect();
      controls.removeEventListener('change', render); controls.removeEventListener('start', startControls); controls.removeEventListener('end', endControls); controls.dispose();
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', clearHover);
      canvas.removeEventListener('pointerdown', down, true); canvas.removeEventListener('pointerup', up, true);
      canvas.removeEventListener('pointercancel', cancelPointer, true); canvas.removeEventListener('lostpointercapture', cancelPointer); canvas.removeEventListener('webglcontextlost', loseContext);
      meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); api.current = null;
    };
  }, [anatomy, structures, availableIds, attempt]);

  useEffect(() => { api.current?.render(); }, [showBones, showMuscles]);
  useEffect(() => { api.current?.clearInspection(); api.current?.render(); }, [highlightedKey]);

  return <section className="plexus-teaching-scene" aria-label="臂丛原模型三干教学窗" data-highlighted-trunk-ids={highlightedKey} data-render-status={status}>
    <div className="pts-toolbar">
      <div className="pts-presets" aria-label="三维视角预设">{Object.entries(VIEW_NAMES).map(([id, name]) => <button key={id} type="button" aria-pressed={preset === id} disabled={status !== 'ready'} onClick={() => api.current?.setView(id)}>{name}</button>)}</div>
      <div className="pts-camera-actions" aria-label="三维缩放和复位">
        <button type="button" aria-label="放大臂丛三维" title="放大" disabled={status !== 'ready'} onClick={() => api.current?.zoom(.8)}><ZoomIn size={17}/></button>
        <button type="button" aria-label="缩小臂丛三维" title="缩小" disabled={status !== 'ready'} onClick={() => api.current?.zoom(1.25)}><ZoomOut size={17}/></button>
        <button type="button" className="pts-reset" disabled={status !== 'ready'} onClick={() => api.current?.reset()}><RotateCcw size={14}/><span>复位</span></button>
      </div>
    </div>
    <div className="pts-context-options" aria-label="原模型背景显示">
      <label><input type="checkbox" checked={showBones} disabled={!BONE_IDS.some(id => availableIds.has(id))} onChange={event => setShowBones(event.target.checked)}/>骨性背景</label>
      <label><input type="checkbox" checked={showMuscles} disabled={!MUSCLE_IDS.some(id => availableIds.has(id))} onChange={event => setShowMuscles(event.target.checked)}/>前／中斜角肌</label>
      <span>背景局部裁显 · 神经原形保留</span>
    </div>
    <div className="pts-canvas-host" ref={host}>
      {status !== 'ready' ? <div className="pts-render-state" role="status"><p>{status === 'error' ? error : '正在载入近端原网格与具名三干…'}</p>{status === 'error' ? <button type="button" onClick={() => setAttempt(value => value + 1)}>重试三维</button> : null}</div> : null}
      <span className="pts-coordinate-note" aria-hidden="true">右侧 · 源中立位坐标<br/>＋Y 头侧 · ＋Z 前方</span>
    </div>
    <div className="pts-name-dock" role="status" aria-live="polite" data-testid="plexus-teaching-name-dock" data-structure-id={named?.id || ''} data-source-id={named?.sourceId || ''}>
      <span>{pointedInfo ? '鼠标所指' : inspectedInfo ? '当前查看' : highlightedNames.length ? '联动高亮' : '结构名称'}</span>
      <strong>{named?.name || (highlightedNames.length ? `${highlightedNames.join('、')}（源已具名）` : '悬停或轻触查看，点击三干可联动教学')}</strong>
      <small>{named?.id === 'brachial-roots' ? '不据其外观分配神经节段名' : named?.kind === 'muscle' ? '关闭肌肉背景可查看深部结构' : named && !TRUNK_IDS.includes(named.id) ? '背景仅供定位；点击不改变教学选择' : '名称显示在图外'}</small>
    </div>
    <div className="pts-trunk-index" aria-label="选择源已具名三干">{TRUNKS.map(trunk => <button key={trunk.id} type="button" style={{ '--pts-trunk-color': trunk.color }} disabled={!availableIds.has(trunk.id)} aria-pressed={highlightedIds.includes(trunk.id)} data-structure-id={trunk.id} onClick={() => { setInspected(null); api.current?.clearInspection(); current.current.onSelectTrunk?.(trunk.id); }}><i aria-hidden="true"/><strong>{trunk.name}</strong><span>源已具名</span></button>)}</div>
    <p className="pts-help">拖动旋转 · 滚轮或双指缩放。近端原网格低透明显示，前支尚未分段核定；图中位置保持来源坐标。</p>
  </section>;
}
