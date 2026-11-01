import { intersectGeometryPlane } from './model-utils.js';
import { clipSection } from './interscalene-utils.js';
import { getWorkbenchConfig } from './slice-workbench-utils.js';

const EPSILON = 1e-10;
const FRAME_TOLERANCE = 1e-6;
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const negate = vector => vector.map(value => value === 0 ? 0 : -value);

function vector(value, name) {
  if ((!Array.isArray(value) && !ArrayBuffer.isView(value)) || value.length !== 3 || !Array.from(value).every(Number.isFinite)) {
    throw new RangeError(`${name} must be a finite three-component vector`);
  }
  return Array.from(value);
}

function unit(value, name) {
  const result = vector(value, name), length = Math.hypot(...result);
  if (length < EPSILON) throw new RangeError(`${name} must have nonzero length`);
  return result.map(component => component === 0 ? 0 : component / length);
}

function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be finite and positive`);
  return value;
}

function withCamera(frame) {
  return { ...frame, cameraDirection: negate(frame.n), cameraOffsetDirection: negate(frame.n),
    lookDirection: [...frame.n], cameraUp: negate(frame.v) };
}

/** Reject skewed, left-handed or non-metric frames instead of changing their cut. */
export function assertObliqueFrame(frame) {
  if (!frame || typeof frame !== 'object') throw new TypeError('A slice frame is required');
  const center = vector(frame.center, 'Frame center');
  const axes = ['u', 'v', 'n'].map(name => vector(frame[name], `Frame ${name}`));
  for (const axis of axes) if (Math.abs(Math.hypot(...axis) - 1) > FRAME_TOLERANCE) {
    throw new RangeError('Slice frame axes must have unit length');
  }
  const [u, v, n] = axes;
  if (Math.max(Math.abs(dot(u, v)), Math.abs(dot(u, n)), Math.abs(dot(v, n))) > FRAME_TOLERANCE ||
      Math.hypot(...cross(u, v).map((value, i) => value - n[i])) > FRAME_TOLERANCE) {
    throw new RangeError('Slice frame must be orthonormal and right-handed: u cross v = n');
  }
  return withCamera({ ...frame, center, u, v, n, width: positive(frame.width, 'Frame width'), depth: positive(frame.depth, 'Frame depth') });
}

/**
 * A camera's eye-to-target direction is the plane normal +n. Project cameraUp
 * onto the plane, then derive screen-right u and screen-down v. The target-to-eye
 * camera offset is -n. Names are explicit to avoid confusing the two directions.
 */
export function makeViewFrame({ center, lookDirection, cameraUp, width, depth }) {
  const n = unit(lookDirection, 'Eye-to-target lookDirection'), up = unit(cameraUp, 'Camera up');
  const u = unit(cross(n, up), 'Camera up projected onto the viewing plane');
  const v = unit(cross(n, u), 'Screen-down axis');
  return withCamera({ center: vector(center, 'Frame center'), u, v, n,
    width: positive(width, 'Frame width'), depth: positive(depth, 'Frame depth') });
}

/**
 * Capture an existing camera orientation without moving source geometry.
 * Accepts {lookDirection,cameraUp} or {position,target,up}; view.center optionally
 * selects a different focal point. A camera target alone never silently moves
 * the slice center, because panning the camera is distinct from placing a cut.
 */
export function frameFromView(baseFrame, view) {
  const base = assertObliqueFrame(baseFrame);
  if (!view || typeof view !== 'object') throw new TypeError('A captured camera view is required');
  let lookDirection = view.lookDirection, cameraUp = view.cameraUp ?? view.up;
  if (lookDirection === undefined) {
    const eye = vector(view.position, 'Camera position'), target = vector(view.target, 'Camera target');
    lookDirection = target.map((value, i) => value - eye[i]);
  }
  return { ...base, ...makeViewFrame({ center: view.center ?? base.center, lookDirection, cameraUp,
    width: base.width, depth: base.depth }), orientationSource: 'captured-camera' };
}

function rotateVector(value, axis, degrees) {
  const angle = degrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle), perpendicular = cross(axis, value);
  return value.map((component, i) => component * c + perpendicular[i] * s + axis[i] * dot(axis, value) * (1 - c));
}

/**
 * Intrinsic right-hand rotations in degrees, applied in this exact order:
 * yaw about current screen-down v; pitch about the resulting screen-right u;
 * roll about the resulting look-normal n. Positive roll is clockwise on screen.
 * These are model viewing controls; no angle is a claimed clinical probe pose.
 */
export function rotateFrame(baseFrame, { yaw = 0, pitch = 0, roll = 0 } = {}) {
  const frame = assertObliqueFrame(baseFrame);
  for (const [name, value] of Object.entries({ yaw, pitch, roll })) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} rotation must be finite`);
  }
  let { u, v, n } = frame;
  for (const [key, degrees] of [['v', yaw], ['u', pitch], ['n', roll]]) {
    const axis = { u, v, n }[key];
    [u, v, n] = [u, v, n].map(value => rotateVector(value, axis, degrees));
  }
  // Rebuild from optical axes to remove accumulated floating-point drift.
  return { ...frame, ...makeViewFrame({ center: frame.center, lookDirection: n, cameraUp: negate(v),
    width: frame.width, depth: frame.depth }) };
}

/** Move in metres along screen-right u, screen-down v and look-normal n. */
export function moveFrame(baseFrame, { lateral = 0, depth = 0, longitudinal = 0 } = {}) {
  const frame = assertObliqueFrame(baseFrame);
  for (const [name, value] of Object.entries({ lateral, depth, longitudinal })) {
    if (!Number.isFinite(value)) throw new RangeError(`${name} movement must be finite`);
  }
  return withCamera({ ...frame, center: frame.center.map((value, i) =>
    value + lateral * frame.u[i] + depth * frame.v[i] + longitudinal * frame.n[i]) });
}

/**
 * Neutral-source reset references, with optional explicit viewing rotations.
 * The interscalene convention puts anterior (+Z) to screen-left, matching the
 * requested ASM-left comparison. It is a display convention, not registration
 * to a published sonogram. Zero rotations remain a source transverse reference;
 * callers choose/capture an oblique view and must label any chosen model angle.
 */
export function getReferenceFrame(route, level, rotations = {}) {
  const config = getWorkbenchConfig(route), requested = level ?? config.initialLevel;
  if (!Number.isFinite(requested)) throw new RangeError('Slice level must be finite');
  const center = [config.center[0], Math.max(config.min, Math.min(config.max, requested)), config.center[2]];
  const reference = route === 'interscalene'
    ? { u: [0, 0, -1], v: [1, 0, 0], n: [0, -1, 0] }
    : { u: [...config.u], v: [...config.v], n: [...config.n] };
  return { ...rotateFrame({ center, ...reference, width: config.width, depth: config.depth }, rotations),
    route, orientationSource: 'source-model-reference',
    displayConvention: route === 'interscalene' ? 'anterior-screen-left; source model, unregistered' : 'source-right-arm-reference; unregistered',
    referenceRotations: { yaw: rotations.yaw ?? 0, pitch: rotations.pitch ?? 0, roll: rotations.roll ?? 0 } };
}

function requiredSourceBone(anatomy, id) {
  const matches = anatomy.structures.filter(structure => structure.id === id);
  if (matches.length !== 1 || matches[0].kind !== 'bone' || matches[0].source !== anatomy.source.id) {
    throw new Error(`Bone-axis reference requires one same-source bone: ${id}`);
  }
  assertGeometry(matches[0]);
  return matches[0];
}

function surfaceCentroid(geometry) {
  const { positions, indices } = geometry, count = indices?.length || positions.length / 3;
  let area = 0;
  const weighted = [0, 0, 0];
  for (let i = 0; i < count; i += 3) {
    const vertices = [0, 1, 2].map(j => {
      const index = indices ? indices[i + j] : i + j;
      return Array.from(positions.slice(index * 3, index * 3 + 3));
    });
    const edges = [1, 2].map(j => vertices[j].map((value, k) => value - vertices[0][k]));
    const weight = Math.hypot(...cross(edges[0], edges[1])) / 2;
    area += weight;
    for (let k = 0; k < 3; k++) weighted[k] += weight * vertices.reduce((sum, point) => sum + point[k], 0) / 3;
  }
  if (!Number.isFinite(area) || area <= EPSILON * EPSILON) throw new Error('Bone-axis reference requires a nondegenerate bone surface');
  return { center: weighted.map(value => value / area), surfaceArea: area };
}

function horizontalSectionCentroid(geometry, level) {
  const frame = { center: [0, level, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] };
  const segments = intersectGeometryPlane(geometry, frame), weighted = [0, 0];
  let length = 0;
  for (const [a, b] of segments) {
    const weight = Math.hypot(b[0] - a[0], b[1] - a[1]);
    length += weight;
    for (let k = 0; k < 2; k++) weighted[k] += weight * (a[k] + b[k]) / 2;
  }
  if (segments.length < 3 || !Number.isFinite(length) || length <= EPSILON) {
    throw new Error('Bone-axis reference requires two nondegenerate actual humerus sections');
  }
  return { center: [weighted[0] / length, level, weighted[1] / length], segmentCount: segments.length, sectionLength: length };
}

/**
 * A reproducible model-derived oblique short-axis reference, not a recovered
 * clinical scan pose. Neck: surface-area-weighted C5/C7 bone centroids define
 * caudal n, and source +X (medial on this right side) projects into screen-down v.
 * Arm: actual humerus section line centroids at 65%/85% of its source-Y extent
 * define proximal n; source -Z (posterior) projects into screen-down v. Those
 * two fractions avoid source end caps but are display rules, not shaft landmarks.
 * The center retains the route's local source focus at the requested source Y.
 *
 * Bounds: only the existing metre/+Y-up/+Z-anterior/-X-right neutral source is
 * supported; missing/conflicting/degenerate anchors throw without a guessed
 * fallback. A bone longitudinal axis is not a nerve axis, root segmentation,
 * ultrasound registration, a procedural posture or a validated probe angle.
 */
export function deriveSourceReferenceFrame(anatomy, route, level) {
  const config = getWorkbenchConfig(route), requested = level ?? (route === 'interscalene' ? 1.463 : config.initialLevel);
  if (!Number.isFinite(requested) || requested < config.min || requested > config.max) {
    throw new RangeError(`Bone-axis reference level must be within ${config.min}–${config.max} source metres`);
  }
  if (!Array.isArray(anatomy?.structures) || !anatomy.source?.id) throw new TypeError('Bone-axis reference requires loaded source anatomy and source identity');
  const coordinates = anatomy.coordinateSystem;
  if (coordinates?.units !== 'm' || coordinates.up !== '+Y' || coordinates.anterior !== '+Z' || coordinates.right !== '-X' ||
      coordinates.pose !== 'source neutral standing anatomy with arm alongside trunk') {
    throw new Error('Bone-axis reference requires the original metre/+Y-up/+Z-anterior/-X-right neutral source coordinates');
  }
  const center = [config.center[0], requested, config.center[2]];
  let anchors, n, depthDirection, bounds;
  if (route === 'interscalene') {
    anchors = ['vertebra-c5', 'vertebra-c7'].map(id => {
      const bone = requiredSourceBone(anatomy, id);
      return { id, sourceId: bone.sourceId, ...surfaceCentroid(bone.geometry), definition: 'triangle surface-area-weighted source bone centroid' };
    });
    if (anchors[0].center[1] <= anchors[1].center[1] + EPSILON) throw new Error('Bone-axis reference requires source C5 above source C7');
    n = unit(anchors[1].center.map((value, i) => value - anchors[0].center[i]), 'C5-to-C7 caudal bone axis');
    depthDirection = [1, 0, 0];
    bounds = { minY: anchors[1].center[1], maxY: anchors[0].center[1],
      meaning: 'axis derived only between C7/C5 geometric surface centroids; source Y is not a neural level' };
  } else {
    const bone = requiredSourceBone(anatomy, 'humerus');
    if (bone.side !== 'right') throw new Error('Bone-axis reference requires the existing right humerus source');
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < bone.geometry.positions.length; i += 3) {
      minY = Math.min(minY, bone.geometry.positions[i]); maxY = Math.max(maxY, bone.geometry.positions[i]);
    }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || maxY - minY <= EPSILON) throw new Error('Bone-axis reference requires nonzero humerus source-Y extent');
    const fractions = [.65, .85];
    anchors = fractions.map(fraction => ({ id: bone.id, sourceId: bone.sourceId, fraction,
      ...horizontalSectionCentroid(bone.geometry, minY + (maxY - minY) * fraction),
      definition: 'length-weighted centroid of actual source triangle/source-Y-plane segments' }));
    n = unit(anchors[1].center.map((value, i) => value - anchors[0].center[i]), 'Lower-to-upper proximal humerus axis');
    depthDirection = [0, 0, -1];
    bounds = { minY, maxY, fractions, sampleLevels: anchors.map(anchor => anchor.center[1]),
      meaning: '65%/85% of source-Y extent avoid end caps as a geometric display rule; not anatomical shaft landmarks' };
  }
  const v = unit(depthDirection.map((value, i) => value - dot(depthDirection, n) * n[i]), 'Source direction projected into bone-axis plane');
  const u = unit(cross(v, n), 'Bone-axis screen-right direction');
  const frame = assertObliqueFrame({ center, u, v, n, width: config.width, depth: config.depth });
  return { ...frame, route, orientationSource: 'source-bone-axis-reference',
    referenceLabel: '模型骨性轴短轴参考 · 未配准', referenceRotations: { yaw: 0, pitch: 0, roll: 0 },
    displayConvention: route === 'interscalene' ? 'projected-medial-down; posterior-right; unregistered' : 'projected-posterior-down; medial-right; unregistered',
    sourceReference: { sourceId: anatomy.source.id, sourceCommit: anatomy.source.commit ?? null, anchors, bounds,
      projectedDepthDirection: depthDirection, normalMeaning: route === 'interscalene' ? 'C5-to-C7 caudal bone axis' : 'lower-to-upper proximal humerus axis',
      neuralShortAxisVerified: false, clinicalRegistration: false,
      boundary: '模型骨性轴短轴参考、未配准；骨性纵轴不等于神经短轴，未确认临床探头角度、体位或逐根身份。' } };
}

function assertGeometry(structure) {
  const positions = structure?.geometry?.positions, indices = structure?.geometry?.indices;
  if ((!Array.isArray(positions) && !ArrayBuffer.isView(positions)) || positions.length < 9 || positions.length % 3 ||
      !Array.from(positions).every(Number.isFinite)) throw new RangeError(`Invalid source positions: ${structure?.id}`);
  if (indices !== undefined && ((!Array.isArray(indices) && !ArrayBuffer.isView(indices)) || indices.length < 3 || indices.length % 3 ||
      !Array.from(indices).every(index => Number.isInteger(index) && index >= 0 && index < positions.length / 3))) {
    throw new RangeError(`Invalid source indices: ${structure?.id}`);
  }
  if (indices === undefined && positions.length % 9) throw new RangeError(`Incomplete source triangles: ${structure?.id}`);
}

/** True source triangle/plane intersections, expressed in u/v and ROI-clipped. */
export function obliqueSections(anatomy, inputFrame) {
  const frame = assertObliqueFrame(inputFrame);
  if (!anatomy) return [];
  if (!Array.isArray(anatomy.structures)) throw new TypeError('Source anatomy must contain structures');
  return anatomy.structures.map(structure => {
    assertGeometry(structure);
    return { ...structure, segments: intersectGeometryPlane(structure.geometry, frame)
      .map(segment => clipSection(segment, frame.width, frame.depth)).filter(Boolean) };
  }).filter(structure => structure.segments.length);
}

/**
 * Recenter the window on the full, true plane intersections of explicitly named
 * source structures. Plane orientation and normal position do not change.
 * `fit` optionally derives window size from their actual bounds plus padding
 * per side; it does not infer anatomy or a clinically appropriate field of view.
 * Returns null when none of the requested meshes intersects this plane.
 */
export function focusFrameOnStructures(anatomy, inputFrame, structureIds, { padding = 0, fit = false } = {}) {
  const frame = assertObliqueFrame(inputFrame);
  if (!Array.isArray(anatomy?.structures)) throw new TypeError('Source anatomy must contain structures');
  if (!Array.isArray(structureIds) || !structureIds.length || structureIds.some(id => typeof id !== 'string' || !id) ||
      new Set(structureIds).size !== structureIds.length) throw new TypeError('Unique explicit source structure IDs are required');
  if (!Number.isFinite(padding) || padding < 0) throw new RangeError('Focus padding must be finite and nonnegative');
  if (typeof fit !== 'boolean') throw new TypeError('Focus fit must be boolean');
  const selected = structureIds.map(id => {
    const structure = anatomy.structures.find(candidate => candidate.id === id);
    if (!structure) throw new RangeError(`Unknown source structure: ${id}`);
    return structure;
  });
  const min = [Infinity, Infinity], max = [-Infinity, -Infinity], intersectedIds = [], missingIds = [];
  for (const structure of selected) {
    assertGeometry(structure);
    const segments = intersectGeometryPlane(structure.geometry, frame);
    if (!segments.length) { missingIds.push(structure.id); continue; }
    intersectedIds.push(structure.id);
    for (const point of segments.flat()) for (let i = 0; i < 2; i++) {
      min[i] = Math.min(min[i], point[i]); max[i] = Math.max(max[i], point[i]);
    }
  }
  if (!intersectedIds.length) return null;
  const result = moveFrame(frame, { lateral: (min[0] + max[0]) / 2, depth: (min[1] + max[1]) / 2 });
  const extent = max.map((value, i) => value - min[i]);
  if (fit) { result.width = positive(extent[0] + padding * 2, 'Focused width'); result.depth = positive(extent[1] + padding * 2, 'Focused depth'); }
  return { ...result, focus: { requestedIds: [...structureIds], intersectedIds, missingIds, bounds: { min, max },
    contained: extent[0] <= result.width && extent[1] <= result.depth } };
}
