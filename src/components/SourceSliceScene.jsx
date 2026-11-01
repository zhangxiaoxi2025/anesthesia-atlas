import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { COLORS, nerveIdFor } from '../model-utils.js';
import clinical from '../data/clinical.json';
import { sectionComponents, shortSectionName } from '../section-label-utils.js';
import '../source-slice-scene.css';

const EMPTY_IDS = [], EMPTY_SECTIONS = [];
const DEFAULT_LAYERS = { nerve: true, artery: true, vein: true, muscle: true, bone: true, skin: false };
const TRUNK_COLORS = { c5: '#c58c19', c6: '#2f8a75', c7: '#397ca8', c8: '#9560ae', t1: '#a66f44', 'superior-trunk': '#2f8a75', 'middle-trunk': '#397ca8', 'inferior-trunk': '#a66f44' };
const DIRECTIONS = { oblique: [-.85, .22, 1], front: [0, 0, 1], right: [-1, 0, 0] };
const VIEW_NAMES = { oblique: '斜视', front: '前视', right: '右侧视' };
const AXILLARY_LABELS = [
  { id: 'musculocutaneous', name: '肌皮神经', side: 'left' },
  { id: 'ulnar', name: '尺神经', side: 'left' },
  { id: 'median', name: '正中神经', side: 'right' },
  { id: 'radial', name: '桡神经', side: 'right' },
];
const RECON_LABELS = [
  { id: 'c5', name: 'C5 前支', side: 'left' },
  { id: 'c6', name: 'C6 前支', side: 'left' },
  { id: 'c7', name: 'C7 前支', side: 'left' },
  { id: 'superior-trunk', name: '上干', side: 'right' },
  { id: 'middle-trunk', name: '中干', side: 'right' },
  { id: 'inferior-trunk', name: '下干', side: 'right' },
];
const NECK_LABELS = [
  { id: 'brachial-roots', name: '近端合并·未分节', side: 'left' },
  { id: 'inferior-trunk', name: '下干', side: 'left' },
  { id: 'superior-trunk', name: '上干', side: 'right' },
  { id: 'middle-trunk', name: '中干', side: 'right' },
];
// This fallback is a local neck-to-upper-arm crop, never full-source bounds.
const DEFAULT_ROI = { min: [-.29, 1.15, -.15], max: [.025, 1.50, .12] };
const DEFAULT_FRAME = { center: [-.038, 1.468, -.012], u: [0, 0, 1], v: [1, 0, 0], n: [0, 1, 0], width: .1, depth: .08 };
const SLICE_LIFT = 1.10;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const colorFor = structure => TRUNK_COLORS[structure.id] || COLORS[nerveIdFor(structure)] || COLORS[structure.kind] || '#b9ab86';
const nameFor = structure => structure.id === 'brachial-roots' ? '臂丛近端合并网格（前支未分节）' : structure.name;
const finite3 = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

function sourceGeometry(source) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.positions, 3));
  if (source.indices?.length) geometry.setIndex(source.indices);
  if (source.normals?.length === source.positions.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(source.normals, 3));
  else geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
function boxFromRoi(roi) {
  const valid = finite3(roi?.min) && finite3(roi?.max) && roi.min.every((value, index) => value < roi.max[index]);
  const box = valid ? roi : DEFAULT_ROI;
  return new THREE.Box3(new THREE.Vector3(...box.min), new THREE.Vector3(...box.max));
}
function boxCorners(box) {
  const points = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z));
  return points;
}
function readFrame(frame) {
  const valid = ['center', 'u', 'v', 'n'].every(key => finite3(frame?.[key]));
  const source = valid ? frame : DEFAULT_FRAME;
  return {
    center: new THREE.Vector3(...source.center), u: new THREE.Vector3(...source.u).normalize(),
    v: new THREE.Vector3(...source.v).normalize(), n: new THREE.Vector3(...source.n).normalize(),
    width: Number(source.width) > 0 ? Number(source.width) : .10,
    depth: Number(source.depth ?? source.height) > 0 ? Number(source.depth ?? source.height) : .08,
  };
}
function frameFitPose(f, aspect, fov = 34, minDistance = .045, maxDistance = 4) {
  const direction = f.n.clone().negate(), up = f.v.clone().negate();
  const target = f.center.clone().addScaledVector(up, f.depth * SLICE_LIFT / 2);
  const right = up.clone().cross(direction).normalize(), fitUp = direction.clone().cross(right).normalize();
  const tanY = Math.tan(THREE.MathUtils.degToRad(fov * .5)), tanX = tanY * Math.max(.2, aspect);
  let distance = .06;
  for (const lift of [0, SLICE_LIFT]) for (const x of [-.5, .5]) for (const y of [-.5, .5]) {
    const point = f.center.clone().addScaledVector(f.u, x * f.width).addScaledVector(f.v, (y - lift) * f.depth)
      .addScaledVector(direction, lift ? Math.min(f.width, f.depth) * .10 : 0);
    const relative = point.sub(target), front = relative.dot(direction);
    distance = Math.max(distance, front + Math.abs(relative.dot(right)) / tanX, front + Math.abs(relative.dot(fitUp)) / tanY);
  }
  distance = THREE.MathUtils.clamp(distance * 1.10, minDistance, maxDistance);
  return { position: target.clone().addScaledVector(direction, distance), target, up };
}
function layoutFaceNames(faces, width, height, reserved = []) {
  const small = width < 440, tagHeight = small ? 18 : 20, placed = [];
  if (!faces.length) return placed;
  const union = { x: Math.min(...faces.map(face => face.bounds.x)), y: Math.min(...faces.map(face => face.bounds.y)),
    right: Math.max(...faces.map(face => face.bounds.x + face.bounds.width)), bottom: Math.max(...faces.map(face => face.bounds.y + face.bounds.height)) };
  const intersects = (a, b, gap = 2) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  // Prefer the empty gap between the two actual faces, then their outer edges.
  // During the overlapping part of the peel, a compact side-edge tag can move
  // into a free gutter. It never replaces or removes a nerve label.
  for (const face of [...faces].sort((a, b) => a.id === 'copy' ? -1 : b.id === 'copy' ? 1 : 0)) {
    const tagWidth = face.id === 'copy' ? small ? 48 : 56 : small ? 40 : 46;
    const b = face.bounds, midX = b.x + b.width / 2;
    const top = { x: midX - tagWidth / 2, y: b.y - tagHeight - 2 };
    const bottom = { x: midX - tagWidth / 2, y: b.y + b.height + 2 };
    const topEdges = [{ x: b.x + b.width - tagWidth, y: top.y }, { x: b.x, y: top.y }];
    const edgeRows = [.25, .5, .75, .1, .9];
    const sideCandidates = edgeRows.flatMap(row => [
      { x: b.x + b.width + 3, y: b.y + b.height * row - tagHeight / 2 },
      { x: b.x - tagWidth - 3, y: b.y + b.height * row - tagHeight / 2 },
    ]);
    // If a narrow screen has no free side gutter during overlap, use the
    // outside edge of the union, retaining a leader to the real face corner.
    const unionEdges = Array.from({ length: 6 }, (_, index) => ({ x: width - tagWidth - 4 - index * (tagWidth + 6), y: union.bottom + 2 }));
    const adjacentTags = placed.flatMap(tag => [{ x: tag.x - tagWidth - 6, y: tag.y }, { x: tag.x + tag.width + 6, y: tag.y }]);
    const candidates = face.id === 'copy' ? [bottom, top, ...topEdges, ...sideCandidates, ...unionEdges] : [top, ...topEdges,
      { x: b.x + b.width - tagWidth, y: bottom.y }, bottom, ...sideCandidates, ...adjacentTags, ...unionEdges];
    const position = candidates.map(point => ({ ...point, width: tagWidth, height: tagHeight })).find(rect => rect.x >= 4 && rect.y >= 4
      && rect.x + rect.width <= width - 4 && rect.y + rect.height <= height - 4
      && !reserved.some(obstacle => intersects(rect, obstacle)) && !placed.some(obstacle => intersects(rect, obstacle))
      && !faces.some(other => intersects(rect, other.bounds)));
    if (!position) continue;
    const center = { x: position.x + position.width / 2, y: position.y + position.height / 2 };
    const anchor = [...face.corners].sort((a, b) => Math.hypot(a.x - center.x, a.y - center.y) - Math.hypot(b.x - center.x, b.y - center.y))[0];
    placed.push({ ...position, id: face.id, name: face.name, anchorX: anchor.x, anchorY: anchor.y });
  }
  return placed;
}

/** A source-coordinate display: anatomy buffers and mesh transforms never move. */
export default function SourceSliceScene({
  anatomy, route = 'interscalene', selectedIds = EMPTY_IDS, selectedNerve = null,
  onSelect, onInspect, layers = DEFAULT_LAYERS, opacity = .20, isolated = false,
  showLabels = true, showPlane, frame, roi, sections = EMPTY_SECTIONS, progress = 0,
  viewMode = 'oblique', viewVersion = 0, resetVersion = 0,
  captureVersion = 0, onCaptureView, revealCut,
}) {
  const host = useRef(null), api = useRef(null), current = useRef({});
  const [status, setStatus] = useState('loading'), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0), [activeView, setActiveView] = useState('oblique');
  const [inspected, setInspected] = useState(null);
  const [labels, setLabels] = useState([]);
  const [faceNames, setFaceNames] = useState([]);
  const [copyLabels, setCopyLabels] = useState([]);
  const structures = useMemo(() => (anatomy?.structures || []).filter(source => {
    const g = source.geometry;
    return Array.isArray(g?.positions) && g.positions.length >= 9 && g.positions.length % 3 === 0;
  }), [anatomy]);
  current.current = { route, selectedIds: Array.isArray(selectedIds) ? selectedIds : EMPTY_IDS, selectedNerve,
    onSelect, onInspect, onCaptureView, layers: layers || DEFAULT_LAYERS, opacity, isolated, showLabels, showPlane, frame, roi, sections,
    progress: clamp01(progress), revealCut: typeof revealCut === 'boolean' ? revealCut : clamp01(progress) > 0 };
  const selectedKey = (Array.isArray(selectedIds) ? selectedIds : EMPTY_IDS).join(' ');

  useEffect(() => {
    if (!anatomy || !host.current) return;
    if (!structures.length) { setStatus('error'); setError('源模型尚未完整载入；仍可查看上方真实网格截面。'); return; }
    const container = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setStatus('error'); setError('当前浏览器无法启用三维；上方真实网格截面与结构名称仍可使用。'); return; }
    setStatus('ready'); setError(''); setInspected(null);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0, 0); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.localClippingEnabled = true;
    const canvas = renderer.domElement;
    canvas.dataset.testid = 'source-slice-canvas'; canvas.dataset.sourceCoordinates = 'unchanged';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '右侧下颈至上臂中段原始解剖，可旋转、缩放和点选源结构；青色线框表示真实几何截面位置');
    container.prepend(canvas);
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .001, 10);
    let controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.screenSpacePanning = true; controls.minDistance = .045; controls.maxDistance = 4;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f8978, 2.3));
    const light = new THREE.DirectionalLight(0xfff8e9, 2.6); light.position.set(-1, 2, 3); scene.add(light);
    const fill = new THREE.DirectionalLight(0xd4e5ef, 1.5); fill.position.set(1, .6, -2); scene.add(fill);
    const clipping = Array.from({ length: 6 }, () => new THREE.Plane());
    // Display-only cutaway: discard the half-space between viewer and frame.
    // Source vertices, indices, transforms and the retained source half never move.
    const cutPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
    const displayClipping = [...clipping, cutPlane];
    const meshes = structures.map(structure => {
      const material = new THREE.MeshStandardMaterial({ color: colorFor(structure), roughness: .75,
        side: THREE.DoubleSide, transparent: true, clippingPlanes: displayClipping });
      const mesh = new THREE.Mesh(sourceGeometry(structure.geometry), material);
      mesh.userData = { structure, nerve: nerveIdFor(structure), info: {
        id: structure.id, name: nameFor(structure), kind: structure.kind, sourceId: structure.sourceId,
      } };
      mesh.renderOrder = structure.kind === 'nerve' ? 4 : ['artery', 'vein'].includes(structure.kind) ? 2 : 0;
      scene.add(mesh); return mesh;
    });
    const unitPlane = new THREE.PlaneGeometry(1, 1);
    const sourcePlane = new THREE.Group();
    const sourceOutline = new THREE.LineSegments(new THREE.EdgesGeometry(unitPlane), new THREE.LineBasicMaterial({
      color: '#258f8a', transparent: true, opacity: .95, depthWrite: false, depthTest: false,
    }));
    sourceOutline.renderOrder = 8; sourcePlane.add(sourceOutline); scene.add(sourcePlane);
    const liftedSlice = new THREE.Group();
    const plate = new THREE.Mesh(unitPlane, new THREE.MeshBasicMaterial({ color: '#f8f7ed', side: THREE.DoubleSide,
      transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
    plate.renderOrder = 9; liftedSlice.add(plate);
    const liftedOutline = new THREE.LineSegments(new THREE.EdgesGeometry(unitPlane), new THREE.LineBasicMaterial({
      color: '#268c84', transparent: true, opacity: .8, depthWrite: false, depthTest: false,
    }));
    liftedOutline.renderOrder = 10; liftedSlice.add(liftedOutline); scene.add(liftedSlice);
    const sectionGroup = new THREE.Group(); sectionGroup.position.z = -.00025; liftedSlice.add(sectionGroup);
    const originalSections = new THREE.Group(); originalSections.position.z = -.0003; sourcePlane.add(originalSections);
    let lastSections = null, region = boxFromRoi(current.current.roi), cropKey = '';
    let anchorKey = '', labelAnchors = [], lastLabelKey = '', lastFaceKey = '', lastCopyKey = '';
    let disposed = false, contextLost = false, hoverFrame = 0, sample = null, gesture = null;
    let hoverInfo = null, lockedInfo = null, interacting = false, transition = null, lastView = 'oblique';
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();

    function updateCrop() {
      const next = boxFromRoi(current.current.roi), key = [...next.min.toArray(), ...next.max.toArray()].join(',');
      if (key === cropKey) return;
      region = next; cropKey = key;
      clipping[0].set(new THREE.Vector3(1, 0, 0), -region.min.x);
      clipping[1].set(new THREE.Vector3(-1, 0, 0), region.max.x);
      clipping[2].set(new THREE.Vector3(0, 1, 0), -region.min.y);
      clipping[3].set(new THREE.Vector3(0, -1, 0), region.max.y);
      clipping[4].set(new THREE.Vector3(0, 0, 1), -region.min.z);
      clipping[5].set(new THREE.Vector3(0, 0, -1), region.max.z);
      for (const mesh of meshes) mesh.userData.insideRoi = region.intersectsBox(mesh.geometry.boundingBox);
    }
    function disposeSections() {
      for (const group of [sectionGroup, originalSections]) for (const child of [...group.children]) {
        group.remove(child); child.geometry.dispose(); child.material.dispose();
      }
    }
    function updateSections() {
      const state = current.current;
      if (lastSections === state.sections) return;
      lastSections = state.sections; disposeSections();
      for (const section of state.sections || []) {
        const positions = [];
        for (const segment of section.segments || []) {
          if (segment?.length !== 2 || segment.some(point => point?.length !== 2 || !point.every(Number.isFinite))) continue;
          positions.push(segment[0][0], segment[0][1], 0, segment[1][0], segment[1][1], 0);
        }
        if (!positions.length) continue;
        // Two independent display copies of the SAME source intersection edges:
        // one remains exactly at the cut, while only the detached copy moves.
        for (const group of [sectionGroup, originalSections]) {
          const geometry = new LineSegmentsGeometry(); geometry.setPositions(positions);
          const material = new LineMaterial({ color: section.color || colorFor(section), linewidth: section.kind === 'muscle' ? 1.35 : 2.1,
            transparent: true, opacity: .95, depthWrite: false, depthTest: false, worldUnits: false });
          material.resolution.set(container.clientWidth, container.clientHeight);
          const line = new LineSegments2(geometry, material); line.frustumCulled = false;
          line.userData.structure = section; line.renderOrder = group === originalSections ? 13 : 12; group.add(line);
        }
      }
    }
    function visibleStructure(structure) {
      const state = current.current;
      if (anatomy.comparisonIds && !anatomy.comparisonIds.includes(structure.id) && !anatomy.contextVisible) return false;
      const layerVisible = structure.kind === 'skin' ? state.layers.skin === true : state.layers[structure.kind] !== false;
      if (!layerVisible) return false;
      return !state.isolated || Boolean(state.selectedNerve) && nerveIdFor(structure) === state.selectedNerve;
    }
    function updatePlanes() {
      const state = current.current, f = readFrame(state.frame), amount = smooth((state.progress - .28) / .68);
      const basis = new THREE.Matrix4().makeBasis(f.u, f.v, f.n), rotation = new THREE.Quaternion().setFromRotationMatrix(basis);
      sourcePlane.position.copy(f.center); sourcePlane.quaternion.copy(rotation); sourceOutline.scale.set(f.width, f.depth, 1);
      sourcePlane.visible = state.progress > 0 || Boolean(state.showPlane);
      cutPlane.normal.copy(state.revealCut ? f.n : new THREE.Vector3(0, 1, 0));
      cutPlane.constant = state.revealCut ? -f.center.dot(f.n) : 10;
      // Only this detached display group moves. Its line vertices are genuine
      // source triangle/plane intersections in the supplied metric frame.
      // The extraction direction is fixed in the supplied frame. Orbiting the
      // camera must not make the detached geometry swivel or follow the eye.
      const screenUp = f.v.clone().negate(), towardCamera = f.n.clone().negate();
      liftedSlice.position.copy(f.center).addScaledVector(screenUp, f.depth * SLICE_LIFT * amount)
        .addScaledVector(towardCamera, Math.min(f.width, f.depth) * .10 * amount);
      liftedSlice.quaternion.copy(rotation); plate.scale.set(f.width, f.depth, 1); liftedOutline.scale.set(f.width, f.depth, 1);
      liftedSlice.visible = state.progress > .28;
      // This is a display carrier, not tissue. Its light background resolves
      // the detached real contours from anatomy behind it; fade it in during
      // the second half of the peel so the starting source face stays clear.
      plate.material.opacity = .90 * smooth((amount - .5) / .5); liftedOutline.material.opacity = .8;
      const selected = new Set(state.selectedIds);
      for (const line of [...sectionGroup.children, ...originalSections.children]) {
        const structure = line.userData.structure;
        line.visible = visibleStructure(structure);
        const highlighted = selected.has(structure.id) || (state.selectedNerve && nerveIdFor(structure) === state.selectedNerve);
        line.material.opacity = highlighted ? 1 : structure.kind === 'muscle' ? .8 : .95;
        line.material.linewidth = highlighted ? 3.2 : structure.kind === 'muscle' ? 1.35 : 2.1;
        line.material.resolution.set(container.clientWidth, container.clientHeight);
      }
      canvas.dataset.sourcePlaneVisible = String(sourcePlane.visible);
      canvas.dataset.liftedSliceVisible = String(liftedSlice.visible);
      canvas.dataset.sourceIntersectionCount = String(originalSections.children.length);
      canvas.dataset.cutaway = String(state.revealCut);
      canvas.dataset.liftAmount = amount.toFixed(4);
      canvas.dataset.copyCarrierOpacity = plate.material.opacity.toFixed(3);
    }
    function updateLabels() {
      const state = current.current, f = readFrame(state.frame);
      const key = [state.route, cropKey, state.revealCut, ...f.center.toArray(), ...f.u.toArray(), ...f.v.toArray(), ...f.n.toArray(), f.width, f.depth].join(',');
      if (key !== anchorKey) {
        anchorKey = key;
        labelAnchors = (state.route === 'axillary' ? AXILLARY_LABELS : anatomy.comparisonIds ? RECON_LABELS.filter(l=>anatomy.comparisonIds.includes(l.id)) : anatomy.reconstruction ? RECON_LABELS : NECK_LABELS).map(label => {
          const mesh = meshes.find(item => item.userData.structure.id === label.id);
          let anchor = null, best = Infinity;
          const positions = mesh?.geometry.attributes.position.array;
          for (let i = 0; positions && i < positions.length; i += 3) {
            const point = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            if (!region.containsPoint(point) || (state.revealCut && cutPlane.distanceToPoint(point) < -1e-7)) continue;
            const relative = point.clone().sub(f.center), u = relative.dot(f.u), v = relative.dot(f.v);
            if (state.revealCut && (Math.abs(u) > f.width * .55 || Math.abs(v) > f.depth * .55)) continue;
            const score = Math.abs(relative.dot(f.n)) + Math.hypot(u, v) * .025;
            if (score < best) { best = score; anchor = point; }
          }
          return { ...label, mesh, anchor };
        });
      }
      const width = container.clientWidth, height = container.clientHeight, badgeWidth = width < 440 ? 105 : 117;
      const rows = { left: 0, right: 0 };
      const next = state.showLabels ? labelAnchors.map(label => {
        const projected = label.anchor?.clone().project(camera), index = rows[label.side]++;
        const layerVisible = label.mesh && visibleStructure(label.mesh.userData.structure);
        const inView = Boolean(projected && layerVisible && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .97 && Math.abs(projected.y) < .90);
        const x = label.side === 'right' ? width - badgeWidth - 11 : 11;
        const y = Math.round(height * (anatomy.reconstruction ? state.progress >= .96 ? .70 + index * .08 : .30 + index * .21 : index ? .72 : .37));
        return { id: label.id, name: label.name, side: label.side, x, y, width: badgeWidth,
          color: colorFor(label.mesh?.userData.structure || { id: label.id, kind: 'nerve' }),
          anchorX: projected ? Math.round((projected.x * .5 + .5) * width) : 0,
          anchorY: projected ? Math.round((-projected.y * .5 + .5) * height) : 0,
          inView, status: !layerVisible ? state.layers.nerve === false ? '图层已关' : '单独观察外' : !inView ? '本视野外' : '',
          active: state.selectedIds.includes(label.id) || state.selectedNerve === label.id };
      }) : [];
      const serialized = JSON.stringify(next);
      if (serialized !== lastLabelKey) { lastLabelKey = serialized; setLabels(next); }
      return next;
    }
    function updateFaceNames(nerveLabels) {
      const state = current.current, f = readFrame(state.frame), width = container.clientWidth, height = container.clientHeight;
      const faces = [];
      scene.updateMatrixWorld(true);
      for (const [id, name, group] of [['source', '原位面', sourcePlane], ['copy', '抽出副本', liftedSlice]]) {
        if (!group.visible) continue;
        const corners = [];
        for (const x of [-.5, .5]) for (const y of [-.5, .5]) {
          const point = group.localToWorld(new THREE.Vector3(x * f.width, y * f.depth, 0)).project(camera);
          corners.push({ x: (point.x * .5 + .5) * width, y: (-point.y * .5 + .5) * height });
        }
        if (corners.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) continue;
        const xs = corners.map(point => point.x), ys = corners.map(point => point.y);
        faces.push({ id, name, corners, bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } });
      }
      const obstacles = nerveLabels.map(label => ({ x: label.x, y: label.y, width: label.width, height: 46 }));
      const containerRect = container.getBoundingClientRect();
      for (const selector of ['.sss-selected-card', '.sss-lift-note', '.sss-coordinate-note']) {
        const node = container.querySelector(selector);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        obstacles.push({ x: rect.left - containerRect.left, y: rect.top - containerRect.top, width: rect.width, height: rect.height });
      }
      const next = layoutFaceNames(faces, width, height, obstacles).map(label => Object.fromEntries(Object.entries(label)
        .map(([key, value]) => [key, typeof value === 'number' ? Math.round(value * 10) / 10 : value])));
      const serialized = JSON.stringify(next);
      if (serialized !== lastFaceKey) { lastFaceKey = serialized; setFaceNames(next); }
      canvas.dataset.facePixelSize = JSON.stringify(Object.fromEntries(faces.map(face => [face.id, Object.fromEntries(Object.entries(face.bounds).map(([key, value]) => [key, Math.round(value * 10) / 10]))])));
      canvas.dataset.faceLabelPositions = serialized;
      const copy = faces.find(face => face.id === 'copy');
      let items = [];
      if (copy && state.progress >= .96 && anatomy.reconstruction) {
        const prepared = state.sections.filter(s=>s.segments.length && visibleStructure(s)).map((s,i)=>({s,number:i+1,components:sectionComponents(s.segments)}));
        const mid = Math.ceil(prepared.length/2), counts=[mid,prepared.length-mid];
        items = prepared.map((entry,index)=>{
          const side=index<mid?0:1, row=side?index-mid:index;
          const labelWidth=Math.min(122,Math.max(84,width*.23));
          const x=side?width-labelWidth-5:5;
          const top=Math.max(91,copy.bounds.y), bottom=Math.min(height*.65,Math.max(copy.bounds.y+copy.bounds.height,height*.60));
          const y=top+row*Math.min(24,(bottom-top-22)/Math.max(1,counts[side]-1));
          const anchors=entry.components.map(component=>{
            const p=component.segments[0][0];const point=liftedSlice.localToWorld(new THREE.Vector3(p[0],p[1],0)).project(camera);
            return {x:(point.x*.5+.5)*width,y:(-point.y*.5+.5)*height};
          });
          return {id:entry.s.id,name:shortSectionName(entry.s),number:entry.number,x,y,width:labelWidth,anchors,color:colorFor(entry.s),active:state.selectedIds.includes(entry.s.id)};
        });
      }
      const copyKey=JSON.stringify(items);
      if(copyKey!==lastCopyKey){lastCopyKey=copyKey;setCopyLabels(items);}
      canvas.dataset.copyLabelIds=items.map(item=>item.id).join(' ');

    }
    function publishInspection() {
      const info = hoverInfo || lockedInfo;
      setInspected(info); current.current.onInspect?.(info);
      canvas.dataset.inspectedId = info?.id || ''; canvas.dataset.hoveredId = hoverInfo?.id || '';
    }
    function render() {
      if (disposed || contextLost) return;
      const state = current.current; updateCrop(); updateSections();
      const selected = new Set(state.selectedIds), contextOpacity = Math.max(.02, Math.min(.80, Number(state.opacity) || .20));
      for (const mesh of meshes) {
        const { structure, nerve, insideRoi } = mesh.userData;
        mesh.visible = insideRoi && visibleStructure(structure);
        const highlighted = selected.has(structure.id) || Boolean(state.selectedNerve && nerve === state.selectedNerve);
        const pointed = structure.id === hoverInfo?.id;
        mesh.material.opacity = highlighted ? 1 : structure.kind === 'muscle' ? contextOpacity : structure.kind === 'bone' ? .40
          : structure.kind === 'skin' ? Math.min(contextOpacity, .08) : structure.kind === 'nerve' ? .78 : .62;
        mesh.material.depthWrite = highlighted || ['nerve', 'artery', 'vein'].includes(structure.kind);
        mesh.material.emissive.set(highlighted || pointed ? mesh.material.color : '#000000');
        mesh.material.emissiveIntensity = pointed ? .38 : highlighted ? .23 : 0;
      }
      const visibleId = info => !info || meshes.some(mesh => mesh.visible && mesh.userData.structure.id === info.id);
      if (!visibleId(hoverInfo) || !visibleId(lockedInfo)) {
        if (!visibleId(hoverInfo)) hoverInfo = null;
        if (!visibleId(lockedInfo)) lockedInfo = null;
        publishInspection();
      }
      updatePlanes();
      // Projection is evaluated before renderer.render, which normally updates
      // the camera inverse. Refresh it here after a preset/seek so leaders do
      // not use the previous pose and falsely report every anchor off-screen.
      camera.updateMatrixWorld(true);
      const nerveLabels = updateLabels();
      updateFaceNames(nerveLabels);
      canvas.dataset.route = state.route; canvas.dataset.view = lastView; canvas.dataset.progress = state.progress.toFixed(4);
      canvas.dataset.selectedIds = state.selectedIds.join(' '); canvas.dataset.selectedNerve = state.selectedNerve || '';
      canvas.dataset.visibleSourceIds = meshes.filter(mesh => mesh.visible).map(mesh => mesh.userData.structure.id).join(' ');
      canvas.dataset.roi = cropKey; canvas.dataset.cameraPosition = camera.position.toArray().map(v => v.toFixed(6)).join(',');
      canvas.dataset.cameraTarget = controls.target.toArray().map(v => v.toFixed(6)).join(',');
      canvas.dataset.cameraDistance = camera.position.distanceTo(controls.target).toFixed(6);
      renderer.render(scene, camera);
    }
    function poseFor(preset) {
      updateCrop();
      const f = readFrame(current.current.frame), transverse = preset === 'transverse';
      // A close frame fit is deliberately independent of the broad C5–arm
      // overview ROI. The final, fully separated two-face union fits in view.
      if (transverse) return frameFitPose(f, camera.aspect, camera.fov, controls.minDistance, controls.maxDistance);
      const target = region.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(...(DIRECTIONS[preset] || DIRECTIONS.oblique)).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = up.clone().cross(direction).normalize(), fitUp = direction.clone().cross(right).normalize();
      const points = boxCorners(region);
      const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)), tanX = tanY * Math.max(.2, camera.aspect);
      let distance = .06;
      for (const point of points) {
        const relative = point.clone().sub(target), front = relative.dot(direction);
        distance = Math.max(distance, front + Math.abs(relative.dot(right)) / tanX, front + Math.abs(relative.dot(fitUp)) / tanY);
      }
      distance = THREE.MathUtils.clamp(distance * 1.08, controls.minDistance, controls.maxDistance);
      return { position: target.clone().addScaledVector(direction, distance), target, up };
    }
    function disposeControls() {
      controls.removeEventListener('change', render); controls.removeEventListener('start', controlStart); controls.removeEventListener('end', controlEnd);
      controls.dispose();
    }
    function rebuildControls() {
      // OrbitControls r159 caches its up-axis quaternion in the constructor.
      // Recreate only this input controller after changing camera.up; source
      // meshes, renderer, camera and source-coordinate scene remain intact.
      const target = controls.target.clone(), position = camera.position.clone();
      disposeControls();
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = false; controls.screenSpacePanning = true; controls.minDistance = .045; controls.maxDistance = 4;
      controls.target.copy(target); camera.position.copy(position); controls.update();
      controls.addEventListener('change', render); controls.addEventListener('start', controlStart); controls.addEventListener('end', controlEnd);
    }
    function applyPose(pose) {
      camera.position.copy(pose.position); camera.up.copy(pose.up); controls.target.copy(pose.target); camera.lookAt(pose.target);
    }
    function interruptTransition() {
      if (!transition) return;
      transition = null; rebuildControls();
    }
    function align(preset, animated = false) {
      clearHover();
      const destination = poseFor(preset); lastView = preset; setActiveView(preset);
      transition = animated ? { from: { position: camera.position.clone(), target: controls.target.clone(), up: camera.up.clone() }, to: destination } : null;
      if (animated) controls.enabled = false;
      else { applyPose(destination); rebuildControls(); }
      updateProgress();
    }
    function updateProgress() {
      if (transition) {
        const amount = smooth(current.current.progress / .22);
        // Keep the old controller inactive while up changes continuously. A
        // final controller is built with the settled axis before orbit resumes.
        applyPose({ position: transition.from.position.clone().lerp(transition.to.position, amount),
          target: transition.from.target.clone().lerp(transition.to.target, amount),
          up: transition.from.up.clone().lerp(transition.to.up, amount).normalize() });
        if (amount >= 1) { transition = null; rebuildControls(); }
      }
      render();
    }
    function cancelHoverFrame() { if (hoverFrame) { cancelAnimationFrame(hoverFrame); hoverFrame = 0; } }
    function clearHover() { cancelHoverFrame(); sample = null; if (hoverInfo) { hoverInfo = null; publishInspection(); render(); } }
    function pickAt(point) {
      const rect = canvas.getBoundingClientRect();
      if (!point || !rect.width || !rect.height || point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom) return null;
      pointer.set((point.x - rect.left) / rect.width * 2 - 1, -(point.y - rect.top) / rect.height * 2 + 1);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(meshes.filter(mesh => mesh.visible && mesh.material.opacity > 0), false)
        .filter(hit => displayClipping.every(plane => plane.distanceToPoint(hit.point) >= -1e-7));
      // Translucent context still has a visible source face; never prefer a
      // nerve hidden behind the actual nearest geometry.
      hits.sort((a, b) => Math.abs(a.distance - b.distance) < 1e-9 ? b.object.renderOrder - a.object.renderOrder : a.distance - b.distance);
      return hits[0]?.object.userData.info || null;
    }
    function pointerMove(event) {
      if (gesture) {
        if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) {
          gesture.moved = true;
          if (lastView !== 'free') { lastView = 'free'; setActiveView('free'); }
        }
        return;
      }
      if (interacting || event.buttons || event.pointerType === 'touch') return;
      sample = { x: event.clientX, y: event.clientY };
      if (!hoverFrame) hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        if (disposed || interacting || gesture) return;
        const info = pickAt(sample);
        if (info?.id !== hoverInfo?.id) { hoverInfo = info; publishInspection(); render(); }
      });
    }
    function pointerDown(event) {
      // Capture phase runs before OrbitControls: a drag can interrupt even a
      // paused alignment without leaving the controller disabled.
      interruptTransition(); clearHover();
      if (gesture) { gesture.primary = false; gesture.moved = true; return; }
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
        primary: event.isPrimary !== false && (event.pointerType === 'touch' || event.button === 0) };
    }
    function pointerUp(event) {
      if (gesture?.id !== event.pointerId) return;
      const prior = gesture; gesture = null;
      if (!prior.primary || prior.moved || Math.hypot(event.clientX - prior.x, event.clientY - prior.y) > 6) return;
      lockedInfo = pickAt({ x: event.clientX, y: event.clientY });
      if (event.pointerType !== 'touch') hoverInfo = lockedInfo;
      publishInspection();
      if (lockedInfo) current.current.onSelect?.(lockedInfo.id);
      render();
    }
    function pointerCancel() { gesture = null; interacting = false; clearHover(); }
    function controlStart() { interacting = true; clearHover(); }
    function controlEnd() {
      interacting = false;
      if (gesture?.moved) { lastView = 'free'; setActiveView('free'); }
    }
    function resize() {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height || disposed) return;
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      if (lastView === 'transverse') {
        const fitted = poseFor('transverse');
        if (transition) transition.to = fitted;
        else { applyPose(fitted); rebuildControls(); }
      }
      render();
    }
    function contextLostHandler(event) {
      event.preventDefault(); contextLost = true; cancelHoverFrame(); transition = null;
      setStatus('error'); setError('三维显示暂时中断；可重试三维，上方真实网格截面与结构名称仍可使用。');
    }
    controls.addEventListener('change', render); controls.addEventListener('start', controlStart); controls.addEventListener('end', controlEnd);
    canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerleave', clearHover);
    canvas.addEventListener('pointerdown', pointerDown, true); canvas.addEventListener('pointerup', pointerUp, true);
    canvas.addEventListener('pointercancel', pointerCancel, true); canvas.addEventListener('lostpointercapture', pointerCancel);
    canvas.addEventListener('webglcontextlost', contextLostHandler);
    const observer = new ResizeObserver(resize); observer.observe(container);
    api.current = { render, align, updateProgress, reset: () => { lockedInfo = null; publishInspection(); align('oblique'); },
      capture: () => {
        interruptTransition(); camera.updateMatrixWorld(true);
        // target-to-eye offset, screen up and screen right. The parent owns
        // selection of the plane center and maps v=-up, n=-direction.
        current.current.onCaptureView?.({ center: controls.target.toArray(), target: controls.target.toArray(), position: camera.position.toArray(),
          direction: camera.position.clone().sub(controls.target).normalize().toArray(),
          lookDirection: controls.target.clone().sub(camera.position).normalize().toArray(),
          up: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize().toArray(),
          right: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize().toArray() });
      },
      zoom: factor => {
        interruptTransition();
        const offset = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance); controls.update(); render();
      } };
    resize(); align(viewMode);
    return () => {
      disposed = true; cancelHoverFrame(); sample = null; gesture = null; transition = null; observer.disconnect();
      disposeControls();
      canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerleave', clearHover);
      canvas.removeEventListener('pointerdown', pointerDown, true); canvas.removeEventListener('pointerup', pointerUp, true);
      canvas.removeEventListener('pointercancel', pointerCancel, true); canvas.removeEventListener('lostpointercapture', pointerCancel);
      canvas.removeEventListener('webglcontextlost', contextLostHandler);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of object.material ? Array.isArray(object.material) ? object.material : [object.material] : []) materials.add(material);
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); api.current = null;
    };
  // Source buffers are uploaded once per anatomy, independently of selection,
  // opacity, layers, frame, and animation progress.
  }, [anatomy, structures, attempt]);

  useEffect(() => { api.current?.render(); }, [selectedKey, selectedNerve, layers, opacity, isolated, showLabels, showPlane, route, frame, roi, sections, revealCut]);
  useEffect(() => { api.current?.updateProgress(); }, [progress]);
  useEffect(() => { api.current?.align(viewMode, viewMode === 'transverse' && clamp01(progress) < .3); }, [viewMode, viewVersion]);
  useEffect(() => { if (resetVersion) api.current?.reset(); }, [resetVersion]);
  useEffect(() => { if (captureVersion) api.current?.capture(); }, [captureVersion]);

  const clinicalNerve = route === 'axillary' ? clinical.nerves.find(nerve => nerve.id === selectedNerve || selectedIds.includes(nerve.id)) : null;
  const selectedSource = structures.find(structure => selectedIds.includes(structure.id) && structure.kind === 'nerve') || structures.find(structure => selectedIds.includes(structure.id));
  const selectedName = clinicalNerve?.name || (selectedSource ? nameFor(selectedSource) : '选择源结构');
  const selectedColor = clinicalNerve ? COLORS[clinicalNerve.id] : selectedSource ? colorFor(selectedSource) : '#678a76';

  return <section className="source-slice-scene" data-render-status={status} data-route={route} aria-label="源坐标三维解剖与截面位置">
    <div className="sss-toolbar">
      <div className="sss-views" aria-label="源模型视角">{Object.entries(VIEW_NAMES).map(([id, name]) => <button key={id} type="button" disabled={status !== 'ready'} aria-pressed={activeView === id} onClick={() => api.current?.align(id)}>{name}</button>)}</div>
      <div className="sss-camera-actions" aria-label="源模型缩放与复位">
        <button type="button" disabled={status !== 'ready'} aria-label="放大源模型" title="放大" onClick={() => api.current?.zoom(.8)}><ZoomIn size={16}/></button>
        <button type="button" disabled={status !== 'ready'} aria-label="缩小源模型" title="缩小" onClick={() => api.current?.zoom(1.25)}><ZoomOut size={16}/></button>
        <button type="button" disabled={status !== 'ready'} className="sss-reset" onClick={() => api.current?.reset()}><RotateCcw size={14}/><span>复位</span></button>
      </div>
    </div>
    <div className="sss-canvas-host" ref={host}>
      {status !== 'ready' ? <div className="sss-state" role="status"><p>{status === 'error' ? error : '正在载入下颈至上臂源模型…'}</p>{status === 'error' ? <button type="button" onClick={() => setAttempt(value => value + 1)}>重试三维</button> : null}</div> : null}
      {showLabels && status === 'ready' ? <>
        <div className="sss-selected-card" style={{ '--source-color': selectedColor }} data-testid="source-selected-nerve">
          <span>{anatomy?.reconstruction ? '当前选择 · 参考重建' : '当前选择 · 源模型'}</span><strong><i/>{selectedName}</strong>
          <small>{clinicalNerve?.en || (selectedSource?.id === 'brachial-roots' ? '前支尚未分段核定' : selectedSource?.kind === 'nerve' ? anatomy?.reconstruction ? '来源具名 · 配准关系待核对' : '源已具名结构' : '点击结构名称可选择')}</small>
          {clinicalNerve ? <em>参考根源：{clinicalNerve.roots}</em> : null}
        </div>
        <div className="sss-persistent-labels" style={copyLabels.length && !anatomy?.reconstruction ? {visibility:'hidden'} : undefined} data-testid="source-persistent-labels">
          <svg aria-hidden="true" width="100%" height="100%">{labels.filter(label => label.inView).map(label => {
            const endX = label.side === 'right' ? label.x : label.x + label.width;
            const bendX = label.side === 'right' ? endX - 12 : endX + 12;
            return <g key={label.id}><path d={`M${label.anchorX},${label.anchorY} L${bendX},${label.y + 17} L${endX},${label.y + 17}`} stroke={label.color} strokeWidth={label.active ? 1.6 : 1} fill="none" opacity={label.active ? .95 : .7}/><circle cx={label.anchorX} cy={label.anchorY} r={label.active ? 3.2 : 2.3} fill={label.color}/></g>;
          })}</svg>
          {labels.map(label => <button key={label.id} type="button" className={`sss-source-label ${label.active ? 'active' : ''}`} style={{ left: label.x, top: label.y, width: label.width, '--source-color': label.color }} aria-label={label.name} aria-pressed={label.active} data-source-label={label.id} data-anchor-visible={label.inView} onClick={() => onSelect?.(label.id)}><span><i/>{label.name}</span>{label.status ? <small>{label.status}</small> : null}</button>)}
        </div>
      </> : null}
      {showLabels && copyLabels.length ? <div className="sss-copy-labels" aria-label="抽出截面中文名称">
        <svg width="100%" height="100%" aria-hidden="true">{copyLabels.flatMap(label=>label.anchors.map((p,i)=><g key={label.id+'-'+i}><path d={`M${p.x},${p.y} L${label.x<20?label.x+label.width:label.x},${label.y+10}`} fill="none" stroke={label.color} strokeWidth={label.active?1.7:.7} opacity={label.active?1:.55}/><circle cx={p.x} cy={p.y} r={label.active?3:1.8} fill={label.color}/></g>))}</svg>
        {copyLabels.map(label=><button key={label.id} className={label.active?'active':''} style={{left:label.x,top:label.y,width:label.width,'--label-color':label.color}} title={label.name} aria-label={'抽出面选择'+label.name} aria-pressed={label.active} data-copy-label={label.id} onClick={()=>onSelect?.(label.id)}>{label.number} · {label.name}</button>)}
      </div> : null}
      {status === 'ready' && faceNames.length ? <div className="sss-face-names" aria-label="原位与抽出截面的位置">
        <svg aria-hidden="true" width="100%" height="100%">{faceNames.map(label => <path key={label.id} d={`M${label.anchorX},${label.anchorY} L${label.x + label.width / 2},${label.y + label.height / 2}`} fill="none" stroke="#6c9f90" strokeWidth=".8" opacity=".65"/>)}</svg>
        {faceNames.map(label => <span key={label.id} data-face-name={label.id} style={{ left: label.x, top: label.y, width: label.width, height: label.height }}>{label.name}</span>)}
      </div> : null}
      <span className="sss-coordinate-note" aria-hidden="true">右侧 · 源中立位坐标<br/>青框：原位几何截面 · 非超声</span>
      {(typeof revealCut === 'boolean' ? revealCut : progress > 0) ? <span className="sss-lift-note" aria-hidden="true">局部剖切显示<br/>{progress > .28 ? '原位交线保留 · 副本缓慢抽出' : '对齐当前几何切面'}</span> : null}
    </div>
    {showLabels ? <div className="sss-name-dock" role="status" aria-live="polite" data-testid="source-slice-name-dock" data-structure-id={inspected?.id || ''} data-source-id={inspected?.sourceId || ''}>
      <span>{inspected ? '源结构' : '结构名称'}</span><strong>{inspected?.name || '悬停或点选三维结构查看名称'}</strong><small>{inspected?.sourceId || '名称来自源模型 · 旋转拖动不触发选择'}</small>
    </div> : null}
  </section>;
}
