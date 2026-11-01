import { intersectGeometryPlane } from './model-utils.js';
import { clipSection } from './interscalene-utils.js';

// These frames use the existing neutral-pose source meshes in metres. They are
// geometric references, not calibrated ultrasound planes or procedural poses.
const CONFIGS = {
  interscalene: {
    route: 'interscalene', label: '肌间沟',
    center: [-.038, 1.468, -.012], u: [0, 0, 1], v: [1, 0, 0], n: [0, 1, 0],
    width: .10, depth: .08, min: 1.36, max: 1.495, step: .001, initialLevel: 1.468,
    directionLabels: { left: '后', right: '前', top: '外侧', bottom: '内侧' },
    boundary: '原始中立位模型的横断几何参照；椎骨相交不等于神经根身份，近端合并网格未分节。',
  },
  axillary: {
    route: 'axillary', label: '腋窝',
    center: [-.16, 1.295, -.005], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0],
    width: .19, depth: .20, min: 1.27, max: 1.39, step: .001, initialLevel: 1.295,
    directionLabels: { left: '外侧', right: '内侧', top: '前', bottom: '后' },
    boundary: '原始上肢贴体中立位的横断几何参照；未模拟临床腋窝阻滞体位，血管沿用源名称。',
  },
};

/** Return an independent configuration object for either supported route. */
export function getWorkbenchConfig(route) {
  const config = CONFIGS[route];
  if (!config) throw new RangeError(`Unknown slice workbench route: ${route}`);
  return {
    ...config, center: [...config.center], u: [...config.u], v: [...config.v], n: [...config.n],
    range: { min: config.min, max: config.max, step: config.step },
    plane: { width: config.width, depth: config.depth },
    directionLabels: { ...config.directionLabels },
  };
}

/**
 * Local [u,v] maps to screen-right and screen-down. cameraDirection is the
 * target-to-eye offset (-n), NOT the eye's forward/look direction (+n).
 */
export function workbenchFrame(route, level) {
  const config = getWorkbenchConfig(route);
  const requested = level === undefined ? config.initialLevel : level;
  if (!Number.isFinite(requested)) throw new RangeError('Slice level must be finite');
  const boundedLevel = Math.max(config.min, Math.min(config.max, requested));
  return {
    center: [config.center[0], boundedLevel, config.center[2]],
    u: config.u, v: config.v, n: config.n,
    width: config.width, depth: config.depth,
    cameraDirection: config.n.map(value => value === 0 ? 0 : -value),
    cameraOffsetDirection: config.n.map(value => value === 0 ? 0 : -value),
    lookDirection: [...config.n],
    cameraUp: config.v.map(value => value === 0 ? 0 : -value),
  };
}

function sourceIds(structure) {
  const ids = Array.isArray(structure.sourceId) ? structure.sourceId : [structure.sourceId];
  if (!ids.length || ids.some(id => typeof id !== 'string' || !id)) {
    throw new Error(`Missing source identity: ${structure.id ?? '(unnamed)'}`);
  }
  if (new Set(ids).size !== ids.length) throw new Error(`Repeated source identity: ${structure.id}`);
  return [...ids].sort();
}

function sameValue(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const aSequence = Array.isArray(a) || ArrayBuffer.isView(a);
  const bSequence = Array.isArray(b) || ArrayBuffer.isView(b);
  if (aSequence || bSequence) {
    return aSequence && bSequence && a.length === b.length &&
      Array.from(a).every((value, i) => sameValue(value, b[i]));
  }
  const aKeys = Object.keys(a).sort(), bKeys = Object.keys(b).sort();
  return aKeys.length === bKeys.length && aKeys.every((key, i) => key === bKeys[i] && sameValue(a[key], b[key]));
}

function assertGeometry(structure) {
  const geometry = structure.geometry;
  const positions = geometry?.positions;
  if (!positions || positions.length < 9 || positions.length % 3 ||
      !Array.from(positions).every(Number.isFinite)) {
    throw new Error(`Invalid source positions: ${structure.id}`);
  }
  if (geometry.indices && (geometry.indices.length % 3 || !Array.from(geometry.indices).every(index =>
    Number.isInteger(index) && index >= 0 && index < positions.length / 3))) {
    throw new Error(`Invalid source indices: ${structure.id}`);
  }
  if (!geometry.indices && positions.length % 9) throw new Error(`Incomplete source triangles: ${structure.id}`);
}

/**
 * Merge two already-loaded same-source manifests without modifying either.
 * Source identity alone is insufficient for deduplication: every geometry value,
 * original source name, kind, side and provenance field must also match. Chinese
 * presentation names may differ; neck-first metadata is retained verbatim.
 */
export function mergeSourceAnatomy(neck, arm) {
  const inputs = [{ route: 'interscalene', anatomy: neck }, { route: 'axillary', anatomy: arm }]
    .filter(input => input.anatomy);
  if (!inputs.length) return null;
  const base = inputs[0].anatomy;
  for (const { anatomy } of inputs) {
    if (!Array.isArray(anatomy.structures)) throw new Error('Source manifest has no structures');
    for (const field of ['id', 'commit']) {
      if (!anatomy.source?.[field] || anatomy.source[field] !== base.source?.[field]) throw new Error(`Source ${field} conflict`);
    }
    // The extraction manifests describe their common transform with different
    // prose. Validate their explicit coordinate/pose fields and keep both prose
    // descriptions in the audit rather than equating the strings to geometry.
    if (['units', 'up', 'anterior', 'right', 'pose'].some(field =>
      !anatomy.coordinateSystem?.[field] || anatomy.coordinateSystem[field] !== base.coordinateSystem?.[field])) {
      throw new Error('Source coordinate system conflict');
    }
  }
  const structures = [], bySource = new Map(), byId = new Map(), sourceOwners = new Map();
  const duplicates = [];
  for (const { route, anatomy } of inputs) {
    for (const structure of anatomy.structures) {
      assertGeometry(structure);
      if (structure.source !== anatomy.source.id) throw new Error(`Structure source conflict: ${structure.id}`);
      const ids = sourceIds(structure), key = JSON.stringify(ids);
      if (ids.some(id => sourceOwners.has(id) && sourceOwners.get(id) !== key)) {
        throw new Error(`Partially overlapping source identities: ${structure.id}`);
      }
      const existing = bySource.get(key);
      if (existing) {
        const provenance = ['nameEn', 'sourceObjectNames', 'sourceObjectIds', 'sourceFile', 'source', 'kind', 'side', 'license', 'provenanceStatus'];
        if (!sameValue(existing.geometry, structure.geometry) || provenance.some(field => !sameValue(existing[field], structure[field]))) {
          throw new Error(`Conflicting source geometry or provenance: ${ids.join(', ')}`);
        }
        existing.workbenchRoutes.push(route);
        duplicates.push({ sourceId: structure.sourceId, retainedId: existing.id, duplicateId: structure.id, route });
        continue;
      }
      if (!structure.id || byId.has(structure.id)) throw new Error(`Conflicting display identity: ${structure.id}`);
      const merged = { ...structure, workbenchRoutes: [route] };
      structures.push(merged); bySource.set(key, merged); byId.set(structure.id, merged);
      ids.forEach(id => sourceOwners.set(id, key));
    }
  }
  return {
    ...base, module: 'source-slice-workbench', structures,
    mergeAudit: {
      routes: inputs.map(input => input.route), inputCount: inputs.reduce((sum, input) => sum + input.anatomy.structures.length, 0),
      outputCount: structures.length, duplicates,
      coordinateSystems: inputs.map(({ route, anatomy }) => ({ route, ...anatomy.coordinateSystem })),
      boundary: 'Only identical same-source geometry was deduplicated; all surviving source names and coordinate values are unchanged.',
    },
  };
}

/** Return only true source triangle/plane segments clipped to this route's ROI. */
export function workbenchSections(anatomy, route, level) {
  const frame = workbenchFrame(route, level);
  if (!anatomy) return [];
  return anatomy.structures.map(structure => ({
    ...structure,
    segments: intersectGeometryPlane(structure.geometry, frame)
      .map(segment => clipSection(segment, frame.width, frame.depth)).filter(Boolean),
  })).filter(structure => structure.segments.length);
}

// Clip the original triangle to the infinite-Y rectangular viewing prism. This
// finds candidate Y intervals even when none of a triangle's vertices is inside
// the ROI, so a narrow real intersection cannot be missed by a fixed-step scan.
function prismPolygon(vertices, frame) {
  let polygon = vertices;
  const component = (point, axis) => point.reduce((sum, value, i) => sum + (value - frame.center[i]) * axis[i], 0);
  for (const [axis, limit, sign] of [[frame.u, frame.width / 2, 1], [frame.u, frame.width / 2, -1],
    [frame.v, frame.depth / 2, 1], [frame.v, frame.depth / 2, -1]]) {
    const next = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = limit - sign * component(a, axis), db = limit - sign * component(b, axis);
      if (da >= 0) next.push(a);
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        next.push(a.map((value, k) => value + t * (b[k] - value)));
      }
    }
    polygon = next;
    if (!polygon.length) break;
  }
  return polygon;
}

/**
 * Find a real in-frame geometric cut through a selected source mesh. Returns
 * source Y or null, and never derives a spinal/root identity or ultrasound cut.
 */
export function findWorkbenchTargetLevel(anatomy, route, sourceId) {
  const config = getWorkbenchConfig(route), frame = workbenchFrame(route);
  const structure = anatomy?.structures?.find(candidate =>
    (Array.isArray(candidate.sourceId) ? candidate.sourceId : [candidate.sourceId]).includes(sourceId));
  if (!structure) return null;
  assertGeometry(structure);
  const bounds = geometryBounds(structure.geometry);
  const low = Math.max(config.min, bounds.min[1]), high = Math.min(config.max, bounds.max[1]);
  if (low > high) return null;
  const midpoint = (low + high) / 2, candidates = [midpoint];
  const { positions, indices } = structure.geometry, count = indices?.length || positions.length / 3;
  for (let i = 0; i < count; i += 3) {
    const ids = indices ? [indices[i], indices[i + 1], indices[i + 2]] : [i, i + 1, i + 2];
    const polygon = prismPolygon(ids.map(index => Array.from(positions.slice(index * 3, index * 3 + 3))), frame);
    if (!polygon.length) continue;
    const minY = Math.max(low, Math.min(...polygon.map(point => point[1])));
    const maxY = Math.min(high, Math.max(...polygon.map(point => point[1])));
    if (maxY >= minY) candidates.push((minY + maxY) / 2);
  }
  candidates.sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint));
  for (const level of new Set(candidates)) {
    if (workbenchSections({ structures: [structure] }, route, level).length) return level;
  }
  return null;
}

const smooth = (value, start, end) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

/** Pure bounded progress channels; source meshes are never deformed by a phase. */
export function workbenchPhase(progress = 0) {
  const bounded = Number.isNaN(progress) ? 0 : Math.max(0, Math.min(1, Number(progress) || 0));
  return {
    progress: bounded,
    stage: bounded < .18 ? 0 : bounded < .5 ? 1 : bounded < .78 ? 2 : 3,
    align: smooth(bounded, .05, .5),
    extract: smooth(bounded, .5, .78),
    lift: smooth(bounded, .78, 1),
  };
}

function geometryBounds(geometry) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < geometry.positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis++) {
      const value = geometry.positions[i + axis];
      min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max };
}

/**
 * Display-only source-coordinate box, C5-near neck through mid-upper-arm.
 * Its upper Y bound is the C5 mesh maximum; lower Y is halfway between the
 * humerus mesh's source-Y extrema. This is a neutral-pose viewing crop, not an
 * anatomical midshaft landmark. X/Z bounds use bones actually crossing the Y
 * slab plus a 25 mm viewing margin. Full source meshes remain untouched.
 */
export function workbenchROI(anatomy) {
  if (!anatomy?.structures) throw new Error('Workbench ROI requires loaded source geometry');
  const c5 = anatomy.structures.find(structure => structure.id === 'vertebra-c5');
  const humerus = anatomy.structures.find(structure => structure.id === 'humerus');
  if (!c5 || !humerus) throw new Error('Workbench ROI requires the source C5 vertebra and humerus');
  if (c5.kind !== 'bone' || humerus.kind !== 'bone' || c5.source !== humerus.source ||
      c5.source !== anatomy.source?.id) throw new Error('Workbench ROI anchors must be same-source bones');
  assertGeometry(c5); assertGeometry(humerus);
  const c5Bounds = geometryBounds(c5.geometry), humerusBounds = geometryBounds(humerus.geometry);
  const low = (humerusBounds.min[1] + humerusBounds.max[1]) / 2, high = c5Bounds.max[1];
  if (!(low < high)) throw new Error('Workbench ROI anchor heights conflict');
  const min = [Infinity, low, Infinity], max = [-Infinity, high, -Infinity];
  const include = point => {
    for (const axis of [0, 2]) {
      min[axis] = Math.min(min[axis], point[axis]); max[axis] = Math.max(max[axis], point[axis]);
    }
  };
  const boneSources = [];
  for (const structure of anatomy.structures.filter(candidate => candidate.kind === 'bone')) {
    if (structure.source !== c5.source) throw new Error(`Mixed source bone in workbench ROI: ${structure.id}`);
    assertGeometry(structure);
    const bounds = geometryBounds(structure.geometry);
    if (bounds.max[1] < low || bounds.min[1] > high) continue;
    boneSources.push({ id: structure.id, sourceId: structure.sourceId });
    const positions = structure.geometry.positions;
    for (let i = 0; i < positions.length; i += 3) {
      if (positions[i + 1] >= low && positions[i + 1] <= high) include(positions.slice(i, i + 3));
    }
    // Include exact triangle crossings of both crop boundaries; vertex-only
    // bounds can miss triangles spanning the entire slab.
    for (const level of [low, high]) {
      const frame = { center: [0, level, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] };
      for (const segment of intersectGeometryPlane(structure.geometry, frame)) {
        segment.forEach(([x, z]) => include([x, level, z]));
      }
    }
  }
  const margin = .025;
  for (const axis of [0, 2]) { min[axis] -= margin; max[axis] += margin; }
  return {
    min, max, center: min.map((value, axis) => (value + max[axis]) / 2), size: min.map((value, axis) => max[axis] - value),
    anchors: {
      upper: { id: c5.id, sourceId: c5.sourceId, y: high, meaning: 'C5 source mesh maximum Y' },
      lower: { id: humerus.id, sourceId: humerus.sourceId, y: low, meaning: 'midpoint of humerus source-Y extent; not anatomical midshaft' },
      boneSources, transverseMargin: margin,
    },
    boundary: '同源中立位显示裁剪：上界为C5骨网格最高点，下界为肱骨源Y范围中点；不改变网格、姿势或结构名称，不代表临床定位。',
  };
}
