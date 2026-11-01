import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLORS, nerveIdFor, structureVisible } from '../model-utils.js';

const DEFAULT_TARGET = [-0.171, 1.305, -0.021];
const CAMERAS = {
  axilla: { direction: [-.38, .14, .91], target: DEFAULT_TARGET, height: .33, width: .20 },
  anterior: { direction: [0, .025, 1], target: [-.176, 1.29, -.025], height: .34, width: .20 },
  posterior: { direction: [0, .025, -1], target: [-.176, 1.29, -.035], height: .34, width: .20 },
  arm: { direction: [-.17, .04, 1], target: [-.19, 1.105, 0], height: .94, width: .37 },
};

export default function AnatomyViewer({ anatomy, selected, onSelect, layers, opacity, isolated, showLabels, showTarget, targetId, level, showPlane, view, viewVersion, onInspect }) {
  const host = useRef(null);
  const api = useRef(null);
  const props = useRef({});
  const [labels, setLabels] = useState([]);
  const [error, setError] = useState(null);
  props.current = { selected, onSelect, onInspect, layers, opacity, isolated, showLabels, showTarget, targetId, level, showPlane };

  useEffect(() => {
    if (!anatomy || !host.current) return;
    const container = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { setError('当前浏览器无法启用三维显示，请开启硬件加速后重新打开。'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.prepend(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '源中立位右侧腋窝与上肢三维解剖，可旋转并选择神经');
    renderer.domElement.setAttribute('role', 'img');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .001, 10);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = .07;
    controls.maxDistance = 2;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9c8879, 2.2));
    const key = new THREE.DirectionalLight(0xfff8ed, 2.7); key.position.set(-1, 2, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xc9dfed, 1.5); rim.position.set(1, 1, -2); scene.add(rim);
    const model = new THREE.Group(); scene.add(model);
    const meshes = [];
    const labelAnchors = [];
    for (const s of anatomy.structures) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(s.geometry.positions, 3));
      if (s.geometry.indices?.length) g.setIndex(s.geometry.indices);
      if (s.geometry.normals?.length === s.geometry.positions.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(s.geometry.normals, 3));
      else g.computeVertexNormals();
      const nerve = nerveIdFor(s);
      const material = new THREE.MeshStandardMaterial({ color: COLORS[nerve] || COLORS[s.kind] || '#c1b4a0', roughness: .65, metalness: 0, side: THREE.DoubleSide, transparent: true });
      const mesh = new THREE.Mesh(g, material);
      mesh.userData = { structure: s, nerve };
      mesh.renderOrder = s.kind === 'nerve' ? 5 : (s.kind === 'artery' || s.kind === 'vein' ? 3 : 0);
      model.add(mesh); meshes.push(mesh);
      if (nerve && s.id === nerve) {
        const p = s.geometry.positions;
        let best = Infinity, anchor = null;
        for (let i = 0; i < p.length; i += 3) {
          const d = Math.abs(p[i + 1] - props.current.level) + Math.abs(p[i] - DEFAULT_TARGET[0]) * .04;
          if (d < best) { best = d; anchor = new THREE.Vector3(p[i], p[i + 1], p[i + 2]); }
        }
        if (anchor) labelAnchors.push({ id: nerve, position: anchor, vertices: p });
      }
    }

    // Source Y is the only section coordinate. This plane displays a horizontal
    // mesh intersection; it is not a probe, sound beam or reconstructed pose.
    const slice = new THREE.Mesh(new THREE.PlaneGeometry(.19, .20), new THREE.MeshBasicMaterial({ color: '#3a8d8b', transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false }));
    slice.rotation.x = -Math.PI / 2; slice.position.set(-.16, props.current.level, -.005); scene.add(slice);
    const sliceBorder = new THREE.LineSegments(new THREE.EdgesGeometry(slice.geometry), new THREE.LineBasicMaterial({ color: '#3c8f8b', transparent: true, opacity: .6 }));
    slice.add(sliceBorder);
    let labelLevel = props.current.level;

    function render() {
      const state = props.current;
      for (const mesh of meshes) {
        const { structure: s, nerve } = mesh.userData;
        mesh.visible = structureVisible(s, state.layers, state.isolated, state.selected);
        const selectedNerve = state.showTarget ? (state.targetId === 'musculocutaneous' ? nerve === 'musculocutaneous' : ['median', 'ulnar', 'radial'].includes(nerve)) : nerve === state.selected;
        mesh.material.opacity = s.kind === 'muscle' ? (state.showTarget ? Math.min(state.opacity, .14) : state.opacity) : s.kind === 'bone' ? .58 : nerve ? (selectedNerve ? 1 : .58) : .85;
        mesh.material.depthWrite = !['muscle', 'bone'].includes(s.kind);
        mesh.material.emissive.set(selectedNerve ? COLORS[nerve] : '#000000');
        mesh.material.emissiveIntensity = selectedNerve ? .25 : 0;
      }
      slice.visible = state.showPlane;
      slice.position.y = state.level;
      if (state.level !== labelLevel) {
        for (const anchor of labelAnchors) {
          const p = anchor.vertices;
          let best = Infinity;
          for (let i = 0; i < p.length; i += 3) {
            const d = Math.abs(p[i + 1] - state.level) + Math.abs(p[i] - DEFAULT_TARGET[0]) * .04;
            if (d < best) { best = d; anchor.position.set(p[i], p[i + 1], p[i + 2]); }
          }
        }
        labelLevel = state.level;
      }
      renderer.render(scene, camera);
      const rect = container.getBoundingClientRect();
      const next = state.showLabels ? labelAnchors.filter(a => state.layers.nerve && (!state.isolated || a.id === state.selected)).map(a => {
        const v = a.position.clone().project(camera);
        const side = ['median', 'radial'].includes(a.id) ? 'right' : 'left';
        const anchorX = (v.x * .5 + .5) * rect.width, anchorY = (-v.y * .5 + .5) * rect.height;
        return { id: a.id, anchorX, anchorY, x: side === 'right' ? rect.width - 110 : 18, y: Math.max(130, Math.min(rect.height - 110, anchorY)), side, visible: Math.abs(v.x) < .95 && Math.abs(v.y) < .87 && v.z > -1 && v.z < 1 };
      }) : [];
      for (const side of ['left', 'right']) {
        const group = next.filter(a => a.side === side).sort((a, b) => a.y - b.y);
        group.forEach((a, i) => { if (i) a.y = Math.max(a.y, group[i - 1].y + 42); });
        const overflow = Math.max(0, (group.at(-1)?.y || 0) - (rect.height - 90));
        if (overflow) group.forEach(a => { a.y -= overflow; });
      }
      setLabels(next);
    }
    function setView(key) {
      const preset = CAMERAS[key] || CAMERAS.axilla;
      const visibleHeight = Math.max(preset.height, preset.width / Math.max(camera.aspect, .3));
      const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      controls.target.fromArray(preset.target);
      camera.position.copy(controls.target).addScaledVector(new THREE.Vector3(...preset.direction).normalize(), distance);
      camera.lookAt(controls.target); controls.update(); render();
    }
    function resize() {
      const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
    }
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = null;
    function pointerDown(e) { down = [e.clientX, e.clientY]; }
    function pointerUp(e) {
      const start = down; down = null;
      if (!start || e.button !== 0 || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes.filter(m => m.visible));
      const nerveHit = hits.find(h => h.object.userData.nerve);
      const hit = nerveHit || hits.find(h => ['artery', 'vein'].includes(h.object.userData.structure.kind)) || hits[0];
      if (hit) {
        if (hit.object.userData.nerve) props.current.onSelect(hit.object.userData.nerve);
        props.current.onInspect?.(hit.object.userData.structure.name);
      }
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    controls.addEventListener('change', render);
    const observer = new ResizeObserver(resize); observer.observe(container);
    api.current = { render, setView, zoom(factor) { camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target); controls.update(); render(); } };
    resize(); setView(view);
    return () => {
      observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      scene.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose(); renderer.domElement.remove(); api.current = null;
    };
  }, [anatomy]);

  useEffect(() => { api.current?.render(); }, [selected, layers, opacity, isolated, showLabels, showTarget, targetId, level, showPlane]);
  useEffect(() => { api.current?.setView(view); }, [view, viewVersion]);

  const names = { median: '正中神经', ulnar: '尺神经', radial: '桡神经', musculocutaneous: '肌皮神经' };
  return <div className="anatomy-canvas" ref={host}>
    {error && <div className="canvas-error">{error}</div>}
    {!anatomy && !error && <div className="canvas-loading"><span className="loading-orbit" />正在加载解剖模型<span>首次打开需载入本地模型资源</span></div>}
    <div className="canvas-labels"><svg className="label-connectors" width="100%" height="100%">{labels.filter(l => l.visible).map(l => <g key={l.id}><path d={`M${l.anchorX},${l.anchorY} L${l.side === 'right' ? l.x : l.x + 80},${l.y + 14}`} stroke={COLORS[l.id]} strokeWidth=".8" opacity=".65" fill="none"/><circle cx={l.anchorX} cy={l.anchorY} r="2" fill={COLORS[l.id]}/></g>)}</svg>{labels.filter(l => l.visible).map(l => <button key={l.id} className={`anatomy-label ${l.id === selected ? 'active' : ''}`} style={{ left: l.x, top: l.y, '--label-color': COLORS[l.id] }} onClick={() => onSelect(l.id)}><span />{names[l.id]}</button>)}</div>
    <div className="orientation"><span>源模型中立位 · 原始坐标</span><div><i>R</i><span>右侧</span></div><span>Y 水平截面 · 非超声／非操作体位</span></div>
    <div className="canvas-zoom"><button aria-label="放大模型" onClick={() => api.current?.zoom(.8)}>＋</button><button aria-label="缩小模型" onClick={() => api.current?.zoom(1.25)}>−</button></div>
  </div>;
}
