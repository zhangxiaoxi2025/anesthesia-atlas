import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sourceSections, SLICE_SIZE } from '../src/interscalene-utils.js';
import { layoutSectionLabels, projectSectionPoint, sectionComponents, SECTION_PLOT, shortSectionName } from '../src/section-label-utils.js';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const manifest = await readJson('../public/interscalene/manifest.json');
const anatomy = { ...manifest, structures: await Promise.all(manifest.structures.map(async structure => ({
  ...structure, geometry: await readJson(`../public${structure.path}`),
}))) };
const sourceSnapshot = sections => JSON.stringify(sections.map(({ id, name, kind, segments }) => ({ id, name, kind, segments })));
const planes = Array.from({ length: 71 }, (_, index) => {
  const level = (1435 + index) / 1000, sections = sourceSections(anatomy, level);
  const before = sourceSnapshot(sections);
  // Layout must work with immutable actual inputs; a regression that nudges a
  // contour or appends label coordinates to source data should fail immediately.
  for (const section of sections) {
    for (const segment of section.segments) {
      segment.forEach(Object.freeze); Object.freeze(segment);
    }
    Object.freeze(section.segments); Object.freeze(section);
  }
  Object.freeze(sections);
  return { level, sections, before };
});
const defaultPlane = planes.find(p => p.level === 1.468);
const layerCases = [
  {}, { nerve: false }, { muscle: false }, { artery: false, vein: false, bone: false },
  { nerve: false, muscle: false, artery: false, vein: false, bone: false },
];

// A separate graph traversal oracle for representative actual contours. Unlike
// production's endpoint bins/union-find, it examines every segment pair directly.
function connectedGroupsByTraversal(segments, tolerance = 1e-6) {
  const remaining = new Set(segments.map((_, i) => i)), groups = [];
  while (remaining.size) {
    const initial = remaining.values().next().value, indices = [initial], queue = [initial];
    remaining.delete(initial);
    while (queue.length) {
      const current = queue.shift();
      for (const candidate of [...remaining]) {
        const touches = segments[current].some(a => segments[candidate].some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tolerance));
        if (touches) { remaining.delete(candidate); indices.push(candidate); queue.push(candidate); }
      }
    }
    groups.push(indices.sort((a, b) => a - b));
  }
  return groups.sort((a, b) => a[0] - b[0]);
}

function squaredDistanceToSegment(point, [a, b]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared)) : 0;
  return (point[0] - a[0] - t * dx) ** 2 + (point[1] - a[1] - t * dy) ** 2;
}

test('every actual plane/layer combination labels exactly its visible source identities, without retaining hidden or previous-plane labels', () => {
  for (const { level, sections, before } of planes) {
    for (const layers of layerCases) {
      const result = layoutSectionLabels(sections, layers);
      const expected = sections.filter(s => layers[s.kind] !== false);
      assert.deepEqual(result.entries.map(e => e.section.id).sort(), expected.map(s => s.id).sort(), `source identities differ at Y=${level}`);
      assert.equal(new Set(result.entries.map(e => e.section.id)).size, expected.length);
      for (const entry of result.entries) {
        assert.strictEqual(entry.section, sections.find(s => s.id === entry.section.id), 'a label must retain the actual source object and name');
        assert.equal(entry.anchors.length, entry.components.length, 'every component needs its own leader');
      }
      assert.equal(sourceSnapshot(sections), before, `layout mutated source segments at Y=${level}`);
    }
  }
  assert.deepEqual(layoutSectionLabels([], {}).entries, []);
  const last = planes.at(-1), first = planes[0];
  assert.deepEqual(layoutSectionLabels(last.sections).entries.map(e => e.section.id).sort(), last.sections.map(s => s.id).sort());
  assert.deepEqual(layoutSectionLabels(first.sections).entries.map(e => e.section.id).sort(), first.sections.map(s => s.id).sort());
});

test('every component preserves each actual source segment exactly once and its leader lands on that component, across all 71 real planes', () => {
  for (const { level, sections, before } of planes) {
    const result = layoutSectionLabels(sections);
    for (const entry of result.entries) {
      const sourceIndices = new Map(entry.section.segments.map((segment, i) => [segment, i]));
      const assigned = entry.components.flatMap(component => component.segments.map(segment => {
        assert.ok(sourceIndices.has(segment), 'display grouping introduced a fabricated segment');
        return sourceIndices.get(segment);
      })).sort((a, b) => a - b);
      assert.deepEqual(assigned, entry.section.segments.map((_, i) => i), 'no source segment may disappear or belong to two components');
      entry.anchors.forEach((anchor, index) => {
        assert(anchor.every(Number.isFinite));
        // Invert the specified metric viewport, then independently measure
        // point-to-segment distance; do not call the production anchor picker.
        const metricPoint = [
          (anchor[0] - SECTION_PLOT.x) / SECTION_PLOT.scale - SLICE_SIZE.width / 2,
          (anchor[1] - result.plotTop) / SECTION_PLOT.scale - SLICE_SIZE.depth / 2,
        ];
        const distanceSquared = Math.min(...entry.components[index].segments.map(segment => squaredDistanceToSegment(metricPoint, segment)));
        assert.ok(distanceSquared <= 1e-20, `${entry.section.id} leader is off its true contour at Y=${level}`);
      });
    }
    assert.equal(sourceSnapshot(sections), before);
  }
});

test('disconnected actual contours retain their common source name, with geometric grouping checked by an independent traversal', () => {
  assert.equal(defaultPlane.sections.length, 15);
  const layout = layoutSectionLabels(defaultPlane.sections);
  assert.equal(layout.componentCount, 18);
  for (const { section, components } of layout.entries) {
    const expected = connectedGroupsByTraversal(section.segments);
    const actual = components.map(component => component.segments.map(segment => section.segments.indexOf(segment)).sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(actual, expected, `${section.id} component attribution differs from the actual endpoint graph`);
  }
  const roots = layout.entries.find(e => e.section.id === 'brachial-roots');
  assert.equal(roots.components.length, 2);
  assert.equal(roots.section.name, '臂丛近端合并网格（未分节）');
  assert.match(shortSectionName(roots.section), /未分节/);
  assert.doesNotMatch(shortSectionName(roots.section), /C[567]|第[五六七567].*根/);
  const vertebra = layout.entries.find(e => e.section.id === 'vertebra-c6');
  assert.equal(vertebra.components.length, 2);
  assert.equal(shortSectionName(vertebra.section), '第6颈椎');
  assert.equal(layout.entries.find(e => e.section.id === 'anterior-scalene').components.length, 2);
});

test('visible Chinese label boxes remain separated and inside both columns for every supported plane/layer combination', () => {
  // The actual SVG name box is 28 units tall. Test readable non-overlap rather
  // than reproducing the production sort, balancing or 33-unit spacing policy.
  const halfLabelHeight = 14;
  for (const { level, sections } of planes) for (const layers of layerCases) {
    const { entries, height } = layoutSectionLabels(sections, layers);
    for (const side of ['left', 'right']) {
      const column = entries.filter(e => e.side === side).sort((a, b) => a.labelY - b.labelY);
      for (const entry of column) {
        assert(Number.isFinite(entry.labelY));
        assert(entry.labelY - halfLabelHeight >= 0 && entry.labelY + halfLabelHeight <= height);
        assert.ok(shortSectionName(entry.section).length > 0);
      }
      for (let i = 1; i < column.length; i++) {
        assert.ok(column[i - 1].labelY + halfLabelHeight < column[i].labelY - halfLabelHeight, `Chinese labels overlap at Y=${level}, ${side}`);
      }
    }
  }
});

test('metric projection preserves the specified directions and isotropic 10 by 8 cm viewport', () => {
  const origin = projectSectionPoint([0, 0], 60);
  const anterior = projectSectionPoint([.01, 0], 60), medial = projectSectionPoint([0, .01], 60);
  assert.ok(anterior[0] > origin[0]); assert.equal(anterior[1], origin[1]);
  assert.ok(medial[1] > origin[1]); assert.equal(medial[0], origin[0]);
  assert.ok(Math.abs(anterior[0] - origin[0] - (medial[1] - origin[1])) < 1e-10, 'the viewport must not stretch one direction');
  const topLeft = projectSectionPoint([-.05, -.04], 60), bottomRight = projectSectionPoint([.05, .04], 60);
  assert.ok(Math.abs((bottomRight[0] - topLeft[0]) / (bottomRight[1] - topLeft[1]) - 10 / 8) < 1e-10);
});

test('display grouping keeps nearby separate contours apart and accepts a clipped open line without inventing a closed contour', () => {
  const first = [[0, 0], [.001, 0]], adjacent = [[.0010004, 0], [.002, 0]], separate = [[.00202, 0], [.003, 0]];
  const groups = sectionComponents([first, adjacent, separate]);
  assert.deepEqual(groups.map(g => g.segments.length).sort(), [1, 2]);
  const open = [[[0, 0], [.001, 0]], [[.001, 0], [.002, .001]]];
  const components = sectionComponents(open);
  assert.equal(components.length, 1);
  assert.deepEqual(components[0].segments, open);
});

