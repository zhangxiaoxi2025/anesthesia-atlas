import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { intersectGeometry } from '../src/model-utils.js';
import {
  mergeSourceAnatomy, getWorkbenchConfig, workbenchFrame, workbenchSections,
  workbenchPhase, workbenchROI, findWorkbenchTargetLevel,
} from '../src/slice-workbench-utils.js';

const load = async directory => {
  const manifest = JSON.parse(await readFile(new URL(`../public/${directory}/manifest.json`, import.meta.url)));
  return { ...manifest, structures: await Promise.all(manifest.structures.map(async structure => ({
    ...structure, geometry: JSON.parse(await readFile(new URL(`../public${structure.path}`, import.meta.url))),
  }))) };
};
const [neck, arm] = await Promise.all([load('interscalene'), load('models')]);
const anatomy = mergeSourceAnatomy(neck, arm);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const vectorClose = (actual, expected) => actual.forEach((value, index) => close(value, expected[index]));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Independent rectangle-edge oracle, rather than the production clipSection.
function boundaryClip([a, b], width, depth) {
  const inside = point => Math.abs(point[0]) <= width / 2 + 1e-12 && Math.abs(point[1]) <= depth / 2 + 1e-12;
  const delta = b.map((value, index) => value - a[index]), candidates = [];
  if (inside(a)) candidates.push({ t: 0, point: a });
  if (inside(b)) candidates.push({ t: 1, point: b });
  for (const [axis, half] of [[0, width / 2], [1, depth / 2]]) {
    if (Math.abs(delta[axis]) < 1e-12) continue;
    for (const edge of [-half, half]) {
      const t = (edge - a[axis]) / delta[axis], point = a.map((value, index) => value + t * delta[index]);
      if (t >= 0 && t <= 1 && inside(point)) candidates.push({ t, point });
    }
  }
  candidates.sort((a, b) => a.t - b.t);
  return candidates.length ? [candidates[0].point, candidates.at(-1).point] : null;
}

function triangleStructure(route, id, localVertices) {
  const frame = workbenchFrame(route);
  return {
    id, sourceId: `synthetic:${id}`, source: neck.source.id, name: id, nameEn: id,
    kind: 'nerve', provenanceStatus: 'synthetic-test-only',
    geometry: { positions: localVertices.flatMap(([u, v, y]) => frame.center.map((value, axis) =>
      axis === 1 ? y : value + u * frame.u[axis] + v * frame.v[axis])), indices: localVertices.map((_, i) => i) },
  };
}

test('same-source merge deduplicates six exact meshes and preserves original source names and unsegmented identities', () => {
  assert.equal(neck.structures.length, 35); assert.equal(arm.structures.length, 47);
  assert.equal(anatomy.structures.length, 76); assert.equal(anatomy.mergeAudit.duplicates.length, 6);
  assert.equal(new Set(anatomy.structures.map(structure => structure.id)).size, anatomy.structures.length);
  assert.deepEqual(anatomy.mergeAudit.routes, ['interscalene', 'axillary']);
  assert.deepEqual(anatomy.mergeAudit.coordinateSystems.map(system => system.transform), [neck.coordinateSystem.transform, arm.coordinateSystem.transform]);
  for (const structure of anatomy.structures) {
    const original = [...neck.structures, ...arm.structures].find(candidate => candidate.id === structure.id);
    assert.equal(structure.name, original.name); assert.equal(structure.nameEn, original.nameEn);
    assert.deepEqual(structure.sourceObjectNames, original.sourceObjectNames);
    assert.equal(structure.geometry, original.geometry, 'the source geometry must be shared, never resampled or repositioned');
  }
  const roots = anatomy.structures.find(structure => structure.id === 'brachial-roots');
  assert.equal(roots.sourceId, 'FBX:680949521'); assert.match(roots.name, /未分节/);
  assert.deepEqual(roots.workbenchRoutes, ['interscalene', 'axillary']);
  assert(!anatomy.structures.some(structure => /^c[5-8]-(root|ventral)/.test(structure.id)));
  for (const id of ['axillary-artery', 'axillary-vein', 'brachial-artery', 'brachial-vein']) {
    const original = arm.structures.find(structure => structure.id === id);
    assert.equal(anatomy.structures.find(structure => structure.id === id).nameEn, original.nameEn);
  }
  assert.equal(mergeSourceAnatomy(null, null), null);
  assert.equal(mergeSourceAnatomy(neck, null).structures.length, 35);
});

test('merge fails closed on geometry, source name, provenance, coordinate, partial source overlap and ID conflicts', () => {
  const duplicate = arm.structures.find(structure => structure.id === 'brachial-roots');
  const armWith = changed => ({ ...arm, structures: [changed] });
  const changedGeometry = { ...duplicate.geometry, positions: [...duplicate.geometry.positions] };
  changedGeometry.positions[0] += 1e-8;
  assert.throws(() => mergeSourceAnatomy(neck, armWith({ ...duplicate, geometry: changedGeometry })), /Conflicting source geometry/);
  assert.throws(() => mergeSourceAnatomy(neck, armWith({ ...duplicate, sourceObjectNames: ['C5 root'] })), /provenance/);
  assert.throws(() => mergeSourceAnatomy(neck, armWith({ ...duplicate, kind: 'bone' })), /provenance/);
  assert.throws(() => mergeSourceAnatomy(neck, { ...arm, source: { ...arm.source, commit: 'other' } }), /Source commit conflict/);
  assert.throws(() => mergeSourceAnatomy(neck, { ...arm, coordinateSystem: { ...arm.coordinateSystem, right: '+X' } }), /coordinate system/);
  assert.throws(() => mergeSourceAnatomy(neck, armWith({ ...duplicate, sourceId: [duplicate.sourceId, 'synthetic:another'] })), /overlapping source/);
  assert.throws(() => mergeSourceAnatomy(neck, armWith({ ...duplicate, sourceId: 'synthetic:another' })), /display identity/);
  assert.throws(() => mergeSourceAnatomy(neck, armWith({ ...duplicate, sourceId: null })), /Missing source/);
});

test('transverse camera offset is -n, look is +n and up is -v, preserving screen-right u and screen-down v', () => {
  for (const route of ['interscalene', 'axillary']) {
    const config = getWorkbenchConfig(route), frame = workbenchFrame(route);
    vectorClose(cross(frame.u, frame.v), frame.n);
    vectorClose(frame.cameraOffsetDirection, frame.n.map(value => -value));
    vectorClose(frame.cameraDirection, frame.cameraOffsetDirection);
    vectorClose(frame.lookDirection, frame.n);
    vectorClose(frame.cameraUp, frame.v.map(value => -value));
    vectorClose(cross(frame.lookDirection, frame.cameraUp), frame.u);
    vectorClose(frame.cameraUp.map(value => -value), frame.v);
    assert.equal(frame.center[1], config.initialLevel);
    assert.equal(workbenchFrame(route, -10).center[1], config.min);
    assert.equal(workbenchFrame(route, 10).center[1], config.max);
    assert.throws(() => workbenchFrame(route, NaN), /finite/);
    config.u[0] = 999; config.directionLabels.left = 'changed';
    assert.notEqual(getWorkbenchConfig(route).u[0], 999);
    assert.notEqual(getWorkbenchConfig(route).directionLabels.left, 'changed');
  }
  assert.equal(getWorkbenchConfig('interscalene').min, 1.36);
  assert.deepEqual(getWorkbenchConfig('axillary').range, { min: 1.27, max: 1.39, step: .001 });
  assert.throws(() => getWorkbenchConfig('unknown'), /Unknown/);
});

test('synthetic real triangle crossings are clipped in the selected frame and outside triangles are excluded', () => {
  for (const route of ['interscalene', 'axillary']) {
    const { initialLevel, width } = getWorkbenchConfig(route);
    const crossing = triangleStructure(route, 'crossing', [[-.2, 0, initialLevel - .01], [.2, 0, initialLevel + .01], [.2, .03, initialLevel - .01]]);
    const outside = triangleStructure(route, 'outside', [[1, 0, initialLevel - .01], [1, .03, initialLevel + .01], [1.1, 0, initialLevel - .01]]);
    const result = workbenchSections({ structures: [crossing, outside] }, route);
    assert.deepEqual(result.map(structure => structure.id), ['crossing']);
    assert.equal(result[0].sourceId, crossing.sourceId);
    assert.equal(result[0].segments.length, 1);
    result[0].segments.flat().forEach(point => assert(Math.abs(point[0]) <= width / 2 + 1e-12));
  }
});

test('actual source sections equal an independent Y-plane projection and rectangle-edge clipping oracle across both routes', () => {
  const before = hash({ neck, arm });
  for (const route of ['interscalene', 'axillary']) {
    const config = getWorkbenchConfig(route);
    for (const level of [config.min, (config.min + config.max) / 2, config.initialLevel, config.max]) {
      const frame = workbenchFrame(route, level), actual = workbenchSections(anatomy, route, level);
      for (const structure of anatomy.structures) {
        const expected = intersectGeometry(structure.geometry, level).map(segment => segment.map(([x, z]) => {
          const delta = [x - frame.center[0], 0, z - frame.center[2]];
          return [frame.u, frame.v].map(axis => axis.reduce((sum, value, i) => sum + value * delta[i], 0));
        })).map(segment => boundaryClip(segment, config.width, config.depth)).filter(Boolean);
        const result = actual.find(section => section.id === structure.id)?.segments ?? [];
        assert.equal(result.length, expected.length, `${route}/${structure.id} differs at ${level}`);
        result.forEach((segment, i) => segment.forEach((point, j) => {
          vectorClose(point, expected[i][j]);
          assert(Math.abs(point[0]) <= config.width / 2 + 1e-12 && Math.abs(point[1]) <= config.depth / 2 + 1e-12);
        }));
      }
    }
  }
  assert.equal(hash({ neck, arm }), before, 'section extraction must not mutate source geometry or metadata');
  const axillary = workbenchSections(anatomy, 'axillary').map(structure => structure.id);
  for (const id of ['median', 'ulnar', 'radial', 'musculocutaneous', 'brachial-artery', 'humerus']) assert(axillary.includes(id));
  assert(!axillary.includes('axillary-artery'), 'do not rename the brachial artery to fill a source gap at default Y');
});

test('selected named source targets resolve only to verified in-frame cuts, including narrow crossings without in-frame vertices', () => {
  for (const id of ['brachial-roots', 'superior-trunk', 'middle-trunk', 'inferior-trunk']) {
    const structure = anatomy.structures.find(candidate => candidate.id === id);
    const level = findWorkbenchTargetLevel(anatomy, 'interscalene', structure.sourceId);
    assert(Number.isFinite(level), `${id} should have a real neck ROI cut`);
    assert(workbenchSections({ structures: [structure] }, 'interscalene', level).length);
  }
  const narrow = triangleStructure('axillary', 'narrow', [
    [-.2, 0, 1.279], [.2, 0, 1.281], [.2, .001, 1.281],
    [1, 0, 1.27], [1.1, .01, 1.39], [1.1, 0, 1.39],
  ]);
  assert.equal(workbenchSections({ structures: [narrow] }, 'axillary', 1.33).length, 0);
  const level = findWorkbenchTargetLevel({ structures: [narrow] }, 'axillary', narrow.sourceId);
  assert(level > 1.279 && level < 1.281);
  assert(workbenchSections({ structures: [narrow] }, 'axillary', level).length);
  const outside = triangleStructure('axillary', 'outside', [[1, 0, 1.27], [1, .01, 1.39], [1.1, 0, 1.39]]);
  assert.equal(findWorkbenchTargetLevel({ structures: [outside] }, 'axillary', outside.sourceId), null);
  assert.equal(findWorkbenchTargetLevel(anatomy, 'interscalene', 'unconfirmed:C5'), null);
});

test('ROI anchors use actual C5 and humerus coordinates, true in-slab bone bounds, and never manifest bound guesses or deformations', () => {
  const before = hash(anatomy), roi = workbenchROI(anatomy);
  close(roi.max[1], 1.49139392); close(roi.min[1], (1.08702254 + 1.40460443) / 2);
  vectorClose(roi.min, [-.2388286939180007, 1.245813485, -.13780737]);
  vectorClose(roi.max, [.06384496, 1.49139392, .10883232]);
  roi.size.forEach(size => assert(size > 0));
  assert.equal(roi.anchors.upper.sourceId, 'FBX:842742587');
  assert.equal(roi.anchors.lower.sourceId, 'FBX:182055279');
  assert.equal(roi.anchors.transverseMargin, .025);
  assert.match(roi.boundary, /中立位/); assert.match(roi.anchors.lower.meaning, /not anatomical midshaft/);
  const badBounds = { ...anatomy, structures: anatomy.structures.map(structure => ({ ...structure, bounds: { min: [-99, -99, -99], max: [99, 99, 99] } })) };
  assert.deepEqual(workbenchROI(badBounds), roi, 'ROI derives geometry coordinates independently of metadata bounds');
  assert.equal(hash(anatomy), before);
  assert.throws(() => workbenchROI(neck), /C5 vertebra and humerus/);
  assert.throws(() => workbenchROI({ ...anatomy, structures: anatomy.structures.map(structure => structure.id === 'humerus' ? { ...structure, source: 'other' } : structure) }), /same-source/);
});

test('phase channels and four stages are finite, bounded, monotonic and have stable endpoint behavior', () => {
  assert.deepEqual([0, .179999, .18, .499999, .5, .779999, .78, 1].map(value => workbenchPhase(value).stage), [0, 0, 1, 1, 2, 2, 3, 3]);
  let previous = workbenchPhase(0);
  for (let i = 0; i <= 1000; i++) {
    const phase = workbenchPhase(i / 1000);
    for (const channel of ['progress', 'align', 'extract', 'lift']) {
      assert(Number.isFinite(phase[channel]) && phase[channel] >= previous[channel] && phase[channel] >= 0 && phase[channel] <= 1);
    }
    assert(phase.stage >= previous.stage); previous = phase;
  }
  for (const value of [-Infinity, -1, NaN]) assert.deepEqual(workbenchPhase(value), workbenchPhase(0));
  for (const value of [Infinity, 2]) assert.deepEqual(workbenchPhase(value), workbenchPhase(1));
});
