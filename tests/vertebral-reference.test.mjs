import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { intersectGeometry } from '../src/model-utils.js';
import { sourceSections, sliceFrame, SLICE_SIZE } from '../src/interscalene-utils.js';
import { VERTEBRAL_IDS, vertebralReference } from '../src/vertebral-reference.js';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const manifest = await readJson('../public/interscalene/manifest.json');
const anatomy = { ...manifest, structures: await Promise.all(manifest.structures.map(async structure => ({
  ...structure, geometry: await readJson(`../public${structure.path}`),
}))) };
const geometryHashes = () => anatomy.structures.map(s => createHash('sha256').update(JSON.stringify(s.geometry)).digest('hex'));
const initialGeometryHashes = geometryHashes();
const expectedOrder = ['vertebra-c3', 'vertebra-c4', 'vertebra-c5', 'vertebra-c6', 'vertebra-c7', 'vertebra-t1'];
const vertebrae = expectedOrder.map(id => anatomy.structures.find(s => s.id === id));
const planes = Array.from({ length: 71 }, (_, i) => {
  const level = (1435 + i) / 1000;
  return { level, sections: sourceSections(anatomy, level) };
});

// Independent ROI-presence oracle: intersect the original source-Y geometry,
// then test projected segment/rectangle edge crossings. It does not call the
// generic plane intersection or the Liang-Barsky clip used by sourceSections.
function touchesWindow([a, b]) {
  const inside = p => Math.abs(p[0]) <= SLICE_SIZE.width / 2 && Math.abs(p[1]) <= SLICE_SIZE.depth / 2;
  if (inside(a) || inside(b)) return true;
  const delta = [b[0] - a[0], b[1] - a[1]];
  for (const axis of [0, 1]) {
    if (Math.abs(delta[axis]) < 1e-14) continue;
    const halfSize = axis === 0 ? SLICE_SIZE.width / 2 : SLICE_SIZE.depth / 2;
    for (const edge of [-halfSize, halfSize]) {
      const t = (edge - a[axis]) / delta[axis];
      if (t < 0 || t > 1) continue;
      const otherAxis = 1 - axis;
      const cross = a[otherAxis] + t * delta[otherAxis];
      const otherHalf = otherAxis === 0 ? SLICE_SIZE.width / 2 : SLICE_SIZE.depth / 2;
      if (Math.abs(cross) <= otherHalf + 1e-12) return true;
    }
  }
  return false;
}

function independentPresence(level) {
  const frame = sliceFrame(level), wholeMeshIds = [], roiIds = [];
  for (const structure of vertebrae) {
    const full = intersectGeometry(structure.geometry, level);
    if (full.length) wholeMeshIds.push(structure.id);
    const inWindow = full.some(segment => touchesWindow(segment.map(([x, z]) => [z - frame.center[2], x - frame.center[0]])));
    if (inWindow) roiIds.push(structure.id);
  }
  return { wholeMeshIds, roiIds };
}

test('real reference planes report every intersected whole vertebra, including two-bone planes', () => {
  const expected = [
    [1.468, ['vertebra-c6'], '第6颈椎（C6）'],
    [1.463, ['vertebra-c6', 'vertebra-c7'], '第6、7颈椎（C6、C7）'],
    [1.480, ['vertebra-c5'], '第5颈椎（C5）'],
    [1.450, ['vertebra-c7', 'vertebra-t1'], '第7颈椎（C7）、第1胸椎（T1）'],
  ];
  for (const [level, ids, label] of expected) {
    const { sections } = planes.find(p => p.level === level);
    const result = vertebralReference(sections);
    assert.deepEqual(result.ids, ids);
    assert.equal(result.label, label);
    assert.deepEqual(result.structures.map(s => s.id), ids);
    result.structures.forEach(s => assert.strictEqual(s, sections.find(candidate => candidate.id === s.id)));
  }
});

test('all 71 supported planes use the actual ROI intersections rather than an estimated unique level', () => {
  const observedCounts = new Set();
  for (const { level, sections } of planes) {
    const { wholeMeshIds, roiIds } = independentPresence(level);
    const result = vertebralReference(sections);
    assert.deepEqual(result.ids, roiIds, `vertebral identities differ from independent source geometry at Y=${level}`);
    // This equality is a property of this pinned asset/window/range, not an
    // instruction to replace the helper's local-ROI contract with whole meshes.
    assert.deepEqual(roiIds, wholeMeshIds, `whole/local comparison changed at Y=${level}; reassess the documented ROI boundary`);
    observedCounts.add(result.ids.length);
    assert.doesNotMatch(result.label, /神经根|椎间隙|横突|唯一/, 'whole-bone identity must not become a clinical landmark claim');
  }
  assert.ok(observedCounts.has(1));
  assert.ok(observedCounts.has(2), 'a regression must not silently collapse two bones into one reference level');
});

test('reference selection accepts only nonempty actual sections, is ordered C3 to T1, and deduplicates source identity', () => {
  assert.deepEqual(VERTEBRAL_IDS, expectedOrder);
  const plane = planes.find(p => p.level === 1.463);
  const c6 = plane.sections.find(s => s.id === 'vertebra-c6');
  const c7 = plane.sections.find(s => s.id === 'vertebra-c7');
  const emptyC3 = { id: 'vertebra-c3', segments: [] };
  const noSegmentsC4 = { id: 'vertebra-c4' };
  const nonSpine = { id: 'clavicle', segments: c6.segments };
  const nerve = { id: 'brachial-roots', segments: c6.segments };
  const outsideScope = { id: 'vertebra-c2', segments: c6.segments };
  const reordered = Object.freeze([c7, emptyC3, nonSpine, c6, nerve, noSegmentsC4, c7, outsideScope]);
  const result = vertebralReference(reordered);
  assert.deepEqual(result.ids, ['vertebra-c6', 'vertebra-c7']);
  assert.deepEqual(result.structures, [c6, c7]);
  assert.strictEqual(result.structures[0], c6);
  assert.strictEqual(result.structures[1], c7);
});

test('an intersected source is retained even when hidden for display, without consulting a centroid or bounding box', () => {
  const source = planes.find(p => p.level === 1.468).sections.find(s => s.id === 'vertebra-c6');
  const hidden = { ...source, visible: false };
  for (const property of ['bbox', 'bounds', 'centroid']) Object.defineProperty(hidden, property, {
    get() { throw new Error('a geometric estimate cannot replace actual intersection segments'); },
  });
  const result = vertebralReference(Object.freeze([Object.freeze(hidden)]));
  assert.deepEqual(result.ids, ['vertebra-c6']);
  assert.strictEqual(result.structures[0], hidden);
  assert.equal(result.label, '第6颈椎（C6）');
});

test('empty sections have an explicit no-intersection label and cervical-only labels enumerate every bone', () => {
  const empty = { ids: [], structures: [], label: '当前平面未与已载入颈胸椎相交' };
  assert.deepEqual(vertebralReference(), empty);
  assert.deepEqual(vertebralReference([]), empty);
  assert.deepEqual(vertebralReference([{ id: 'vertebra-c6', segments: [] }]), empty);
  const segment = [[[0, 0], [.001, .001]]];
  const cervical = vertebralReference([
    { id: 'vertebra-c7', segments: segment },
    { id: 'vertebra-c3', segments: segment },
    { id: 'vertebra-c5', segments: segment },
  ]);
  assert.deepEqual(cervical.ids, ['vertebra-c3', 'vertebra-c5', 'vertebra-c7']);
  assert.equal(cervical.label, '第3、5、7颈椎（C3、C5、C7）', 'nonconsecutive bones must not be rewritten as a continuous range');
  assert.equal(vertebralReference([{ id: 'vertebra-t1', segments: segment }]).label, '第1胸椎（T1）');
});

test('reference creation leaves all actual source arrays and current sections unchanged', () => {
  for (const { sections } of planes) {
    const before = JSON.stringify(sections.map(({ id, name, segments }) => ({ id, name, segments })));
    for (const s of sections) {
      for (const segment of s.segments) { segment.forEach(Object.freeze); Object.freeze(segment); }
      Object.freeze(s.segments); Object.freeze(s);
    }
    Object.freeze(sections);
    const result = vertebralReference(sections);
    result.structures.forEach(s => assert.ok(sections.includes(s)));
    assert.equal(JSON.stringify(sections.map(({ id, name, segments }) => ({ id, name, segments }))), before);
  }
  assert.deepEqual(geometryHashes(), initialGeometryHashes);
});

