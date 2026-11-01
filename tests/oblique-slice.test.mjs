import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { mergeSourceAnatomy } from '../src/slice-workbench-utils.js';
import {
  assertObliqueFrame, makeViewFrame, frameFromView, rotateFrame, moveFrame,
  getReferenceFrame, deriveSourceReferenceFrame, obliqueSections, focusFrameOnStructures,
} from '../src/oblique-slice-utils.js';

const load = async directory => {
  const manifest = JSON.parse(await readFile(new URL(`../public/${directory}/manifest.json`, import.meta.url)));
  return { ...manifest, structures: await Promise.all(manifest.structures.map(async structure => ({
    ...structure, geometry: JSON.parse(await readFile(new URL(`../public${structure.path}`, import.meta.url))),
  }))) };
};
const [neck, arm] = await Promise.all([load('interscalene'), load('models')]);
const anatomy = mergeSourceAnatomy(neck, arm);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const vectorClose = (actual, expected, tolerance) => { assert.equal(actual.length, expected.length); actual.forEach((value, i) => close(value, expected[i], tolerance)); };
const world = (frame, [u, v, n = 0]) => frame.center.map((value, i) => value + u * frame.u[i] + v * frame.v[i] + n * frame.n[i]);
const synthetic = (frame, id, points) => ({ id, name: id, sourceId: `synthetic:${id}`, kind: 'nerve',
  geometry: { positions: points.flatMap(point => world(frame, point)), indices: points.map((_, i) => i) } });

// An independent edge/boundary oracle: no production plane or clip function.
function expectedSegments(geometry, frame) {
  const { positions, indices } = geometry, segments = [], count = indices?.length || positions.length / 3;
  const toLocal = point => [frame.u, frame.v, frame.n].map(axis => dot(point.map((value, i) => value - frame.center[i]), axis));
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(j => { const index = indices ? indices[i + j] : i + j; return toLocal(positions.slice(index * 3, index * 3 + 3)); });
    const cuts = [];
    for (let edge = 0; edge < 3; edge++) {
      const a = triangle[edge], b = triangle[(edge + 1) % 3];
      if (a[2] * b[2] >= 0) continue;
      const ratio = -a[2] / (b[2] - a[2]);
      cuts.push([a[0] + ratio * (b[0] - a[0]), a[1] + ratio * (b[1] - a[1])]);
    }
    if (cuts.length !== 2) continue;
    const [a, b] = cuts, delta = b.map((value, k) => value - a[k]);
    const inside = point => Math.abs(point[0]) <= frame.width / 2 + 1e-12 && Math.abs(point[1]) <= frame.depth / 2 + 1e-12;
    const candidates = [];
    if (inside(a)) candidates.push({ t: 0, point: a });
    if (inside(b)) candidates.push({ t: 1, point: b });
    for (let axis = 0; axis < 2; axis++) for (const boundary of [-1, 1]) {
      if (Math.abs(delta[axis]) < 1e-12) continue;
      const half = [frame.width, frame.depth][axis] / 2, t = (boundary * half - a[axis]) / delta[axis];
      const point = a.map((value, k) => value + t * delta[k]);
      if (t >= 0 && t <= 1 && inside(point)) candidates.push({ t, point });
    }
    candidates.sort((first, second) => first.t - second.t);
    if (candidates.length) segments.push([candidates[0].point, candidates.at(-1).point]);
  }
  return segments;
}

function checkFrame(frame) {
  for (const key of ['u', 'v', 'n']) close(Math.hypot(...frame[key]), 1);
  close(dot(frame.u, frame.v), 0); close(dot(frame.u, frame.n), 0); close(dot(frame.v, frame.n), 0);
  vectorClose(cross(frame.u, frame.v), frame.n);
  vectorClose(frame.cameraOffsetDirection, frame.n.map(value => -value));
  vectorClose(frame.cameraDirection, frame.cameraOffsetDirection);
  vectorClose(frame.lookDirection, frame.n);
  vectorClose(frame.cameraUp, frame.v.map(value => -value));
}

test('camera capture yields screen-right u and screen-down v, verified by the actual Three.js camera projection', () => {
  const base = getReferenceFrame('axillary');
  const captured = frameFromView(base, { position: [-.48, 1.4, .27], target: base.center, up: [0, 1, .3] });
  checkFrame(captured);
  const camera = new THREE.PerspectiveCamera(34, 1.3, .001, 10);
  camera.position.fromArray(captured.center).addScaledVector(new THREE.Vector3(...captured.cameraOffsetDirection), .6);
  camera.up.fromArray(captured.cameraUp); camera.lookAt(new THREE.Vector3(...captured.center)); camera.updateMatrixWorld(true);
  const target = new THREE.Vector3(...captured.center).project(camera);
  const right = new THREE.Vector3(...world(captured, [.01, 0])).project(camera);
  const down = new THREE.Vector3(...world(captured, [0, .01])).project(camera);
  close(target.x, 0); close(target.y, 0);
  assert(right.x > 0); close(right.y, 0); assert(down.y < 0); close(down.x, 0);
  const same = frameFromView(base, { lookDirection: captured.n.map(value => value * 7), cameraUp: captured.cameraUp.map(value => value * 3) });
  vectorClose(same.u, captured.u); vectorClose(same.v, captured.v); vectorClose(same.n, captured.n);
  const pan = frameFromView(base, { position: [0, 0, 1], target: [0, 0, 0], up: [0, 1, 0] });
  assert.deepEqual(pan.center, base.center, 'capturing camera orientation must not silently place the cut at its target');
  assert.deepEqual(frameFromView(base, { lookDirection: [0, 0, -1], cameraUp: [0, 1, 0], center: [1, 2, 3] }).center, [1, 2, 3]);
});

test('intrinsic yaw, pitch and clockwise roll have explicit right-hand signs and preserve metric orthonormality', () => {
  const base = makeViewFrame({ center: [0, 0, 0], lookDirection: [0, 0, 1], cameraUp: [0, -1, 0], width: 2, depth: 2 });
  const before = hash(base);
  const yaw = rotateFrame(base, { yaw: 90 });
  vectorClose(yaw.n, [1, 0, 0]); vectorClose(yaw.u, [0, 0, -1]);
  const pitch = rotateFrame(base, { pitch: 90 });
  vectorClose(pitch.n, [0, -1, 0]); vectorClose(pitch.v, [0, 0, 1]);
  const roll = rotateFrame(base, { roll: 90 });
  vectorClose(roll.u, [0, 1, 0]); vectorClose(roll.v, [-1, 0, 0]);
  let frame = base;
  for (let i = 0; i < 500; i++) frame = rotateFrame(frame, { yaw: 1.7, pitch: -.9, roll: .3 });
  checkFrame(frame);
  vectorClose(rotateFrame(rotateFrame(base, { yaw: 17 }), { yaw: -17 }).n, base.n);
  assert.equal(hash(base), before, 'rotation leaves input frames unchanged');
});

test('oblique synthetic triangle cuts preserve true endpoints and clip only to the rotated frame rectangle', () => {
  const frame = rotateFrame(getReferenceFrame('interscalene'), { yaw: 17, pitch: -23, roll: 31 });
  const crossing = synthetic(frame, 'crossing', [[-.2, 0, -.01], [.2, 0, .01], [.2, .08, -.01]]);
  const outside = synthetic(frame, 'outside', [[1, 0, -.01], [1, .03, .01], [1.1, 0, -.01]]);
  const before = hash({ frame, crossing, outside }), sections = obliqueSections({ structures: [crossing, outside] }, frame);
  assert.deepEqual(sections.map(section => section.id), ['crossing']);
  assert.equal(sections[0].geometry, crossing.geometry);
  assert.equal(sections[0].sourceId, crossing.sourceId);
  vectorClose(sections[0].segments[0][0], [0, 0]);
  vectorClose(sections[0].segments[0][1], [.05, .01]);
  assert.equal(hash({ frame, crossing, outside }), before);
});

test('actual same-source mesh sections match an independent oblique triangle oracle across both routes without mutation', () => {
  const before = hash(anatomy);
  for (const [route, rotations] of [['interscalene', { yaw: 13, pitch: -19, roll: -37 }], ['axillary', { yaw: -24, pitch: 11, roll: 17 }]]) {
    const frame = getReferenceFrame(route, undefined, rotations), actual = obliqueSections(anatomy, frame);
    assert(Math.abs(frame.n[0]) > .01 || Math.abs(frame.n[2]) > .01, 'the cut must not regress to source world-Y');
    assert(actual.length > 5);
    for (const structure of anatomy.structures) {
      const expected = expectedSegments(structure.geometry, frame);
      const result = actual.find(section => section.id === structure.id)?.segments ?? [];
      assert.equal(result.length, expected.length, `${route}/${structure.id} has different true intersections`);
      result.forEach((segment, i) => segment.forEach((point, j) => {
        vectorClose(point, expected[i][j]);
        assert(Math.abs(point[0]) <= frame.width / 2 + 1e-12);
        assert(Math.abs(point[1]) <= frame.depth / 2 + 1e-12);
      }));
    }
    const reference = obliqueSections(anatomy, getReferenceFrame(route));
    assert.notEqual(hash(actual.map(section => section.segments)), hash(reference.map(section => section.segments)), 'changing the normal must change extracted geometry');
  }
  assert.equal(hash(anatomy), before, 'all source coordinates, triangles, labels and provenance must remain unchanged');
});

test('local movement follows the chosen oblique u/v/n basis, never an implicit world-Y slider', () => {
  const frame = getReferenceFrame('axillary', undefined, { yaw: 31, pitch: -22, roll: 8 });
  const before = hash(frame), moved = moveFrame(frame, { lateral: .01, depth: -.02, longitudinal: .03 });
  const delta = moved.center.map((value, i) => value - frame.center[i]);
  close(dot(delta, frame.u), .01); close(dot(delta, frame.v), -.02); close(dot(delta, frame.n), .03);
  vectorClose(moved.u, frame.u); vectorClose(moved.v, frame.v); vectorClose(moved.n, frame.n);
  assert.equal(hash(frame), before);
});

test('reference display convention is explicit, independent and uses actual ASM-left source intersections', () => {
  const frame = getReferenceFrame('interscalene'), sections = obliqueSections(neck, frame);
  vectorClose(frame.u, [0, 0, -1]); vectorClose(frame.v, [1, 0, 0]); vectorClose(frame.n, [0, -1, 0]);
  const meanHorizontal = id => { const points = sections.find(section => section.id === id).segments.flat(); return points.reduce((sum, point) => sum + point[0] / points.length, 0); };
  assert(meanHorizontal('anterior-scalene') < meanHorizontal('middle-scalene'));
  assert.match(frame.displayConvention, /unregistered/);
  assert.equal(getReferenceFrame('axillary', -100).center[1], 1.27);
  assert.equal(getReferenceFrame('interscalene', 100).center[1], 1.495);
  frame.u[0] = 7; frame.center[0] = 7;
  assert.deepEqual(getReferenceFrame('interscalene').u, [0, 0, -1]);
  assert.equal(getReferenceFrame('interscalene').center[0], -.038);
});

test('axillary focus derives actual four-nerve and vessel bounds while retaining source identities and cut plane', () => {
  const frame = getReferenceFrame('axillary');
  const ids = ['median', 'ulnar', 'radial', 'musculocutaneous', 'brachial-artery', 'brachial-vein'];
  const before = hash({ arm, frame });
  const focused = focusFrameOnStructures(arm, frame, ids, { padding: .01, fit: true });
  assert.deepEqual(focused.focus.intersectedIds, ids); assert.deepEqual(focused.focus.missingIds, []);
  assert.equal(focused.focus.contained, true);
  assert(focused.width < .12 && focused.depth < .10);
  const delta = focused.center.map((value, i) => value - frame.center[i]);
  close(dot(delta, frame.n), 0);
  vectorClose(focused.n, frame.n);
  const sections = obliqueSections(arm, focused);
  for (const id of ids) assert(sections.some(section => section.id === id), `${id} remains an actual named mesh intersection`);
  assert(!sections.some(section => section.id === 'axillary-artery'), 'the source brachial artery must retain its name');
  const centered = focusFrameOnStructures(arm, frame, ids);
  close(centered.width, frame.width); close(centered.depth, frame.depth);
  assert.equal(focusFrameOnStructures(arm, moveFrame(frame, { longitudinal: 2 }), ids), null);
  assert.equal(hash({ arm, frame }), before);
});

test('invalid camera, frame, angle, dimensions and source geometry fail closed', () => {
  const base = getReferenceFrame('interscalene');
  assert.deepEqual(obliqueSections(null, base), []);
  assert.throws(() => makeViewFrame({ ...base, lookDirection: [0, 0, 0] }), /nonzero/);
  assert.throws(() => makeViewFrame({ ...base, lookDirection: [0, 1, 0], cameraUp: [0, 2, 0] }), /nonzero/);
  assert.throws(() => frameFromView(base, { position: [1, 2, 3], target: [1, 2, 3], up: [0, 1, 0] }), /nonzero/);
  assert.throws(() => frameFromView(base, { lookDirection: [Infinity, 0, 0], cameraUp: [0, 1, 0] }), /finite/);
  assert.throws(() => assertObliqueFrame({ ...base, u: [0, 0, -2] }), /unit/);
  assert.throws(() => assertObliqueFrame({ ...base, n: base.n.map(value => -value) }), /right-handed/);
  assert.throws(() => assertObliqueFrame({ ...base, depth: 0 }), /positive/);
  assert.throws(() => rotateFrame(base, { yaw: NaN }), /finite/);
  assert.throws(() => moveFrame(base, { lateral: Infinity }), /finite/);
  assert.throws(() => getReferenceFrame('unknown'), /Unknown/);
  assert.throws(() => getReferenceFrame('axillary', NaN), /finite/);
  assert.throws(() => obliqueSections({ structures: [{ id: 'bad', geometry: { positions: [NaN] } }] }, base), /Invalid source positions/);
  assert.throws(() => obliqueSections({ structures: [{ id: 'bad', geometry: { positions: Array(9).fill(0), indices: [0, 1, 7] } }] }, base), /Invalid source indices/);
  assert.throws(() => focusFrameOnStructures(arm, getReferenceFrame('axillary'), ['unconfirmed:C5']), /Unknown source structure/);
  assert.throws(() => focusFrameOnStructures(arm, getReferenceFrame('axillary'), ['median', 'median']), /Unique explicit/);
  assert.throws(() => focusFrameOnStructures(arm, getReferenceFrame('axillary'), ['median'], { padding: -1 }), /nonnegative/);
});

test('source bone-axis references are actual oblique planes, retain provenance, and cannot claim C7 or neural identities from Y alone', () => {
  const before = hash(anatomy);
  for (const route of ['interscalene', 'axillary']) {
    const frame = deriveSourceReferenceFrame(anatomy, route);
    checkFrame(frame);
    assert(Math.abs(frame.n[0]) + Math.abs(frame.n[2]) > .1, `${route} source reference is not a world-Y cut`);
    assert.equal(frame.orientationSource, 'source-bone-axis-reference');
    assert.match(frame.referenceLabel, /模型骨性轴短轴参考.*未配准/);
    assert.equal(frame.sourceReference.sourceId, anatomy.source.id);
    assert.equal(frame.sourceReference.sourceCommit, anatomy.source.commit);
    assert.equal(frame.sourceReference.neuralShortAxisVerified, false);
    assert.equal(frame.sourceReference.clinicalRegistration, false);
    const [a, b] = frame.sourceReference.anchors;
    const delta = b.center.map((value, i) => value - a.center[i]), length = Math.hypot(...delta);
    vectorClose(frame.n, delta.map(value => value / length));
    const actual = obliqueSections(anatomy, frame);
    for (const section of actual) {
      const expected = expectedSegments(section.geometry, frame);
      assert.equal(section.segments.length, expected.length);
      section.segments.forEach((segment, i) => segment.forEach((point, j) => vectorClose(point, expected[i][j])));
    }
    if (route === 'interscalene') {
      close(frame.center[1], 1.463);
      assert(frame.n[1] < 0 && frame.u[2] < 0 && frame.v[0] > 0);
      assert.deepEqual(frame.sourceReference.anchors.map(anchor => anchor.id), ['vertebra-c5', 'vertebra-c7']);
      assert(actual.some(section => section.id === 'vertebra-c5'));
      assert(actual.some(section => section.id === 'vertebra-c6'));
      assert(!actual.some(section => section.id === 'vertebra-c7'), 'source Y=1.463 must not falsely imply C7 when the actual plane is oblique');
    } else {
      close(frame.center[1], 1.295);
      assert(frame.n[1] > 0 && frame.u[0] > 0 && frame.v[2] < 0);
      assert.deepEqual(frame.sourceReference.bounds.fractions, [.65, .85]);
      vectorClose(frame.sourceReference.bounds.sampleLevels, [1.2934507685, 1.3569671465]);
      for (const id of ['median', 'ulnar', 'radial', 'musculocutaneous', 'brachial-artery', 'brachial-vein']) {
        assert(actual.some(section => section.id === id), `${id} intersects the true humerus-axis reference plane`);
      }
    }
  }
  assert.equal(hash(anatomy), before);
});

const boneAnatomy = structures => ({ source: { ...neck.source }, coordinateSystem: { ...neck.coordinateSystem }, structures });
function bone(id, positions, indices) {
  return { id, sourceId: `synthetic-bone:${id}`, source: neck.source.id, side: 'right', kind: 'bone', geometry: { positions, ...(indices ? { indices } : {}) } };
}
function triangleAt([x, y, z], scale = 1) {
  return [[x - scale * .002, y - scale * .002, z], [x + scale * .002, y - scale * .002, z], [x, y + scale * .004, z]].flat();
}

test('bone-axis derivation is geometry-derived: area weighting and tilted humerus sections match analytic synthetic anchors', () => {
  // Two C5 patches have a 1:4 surface-area ratio. Vertex means would give the
  // wrong Z=-.02; the expected surface centroid is Z=-.014.
  const c5 = bone('vertebra-c5', [...triangleAt([0, 1.48, -.03]), ...triangleAt([0, 1.48, -.01], 2)]);
  const c7 = bone('vertebra-c7', triangleAt([0, 1.44, -.03]));
  const neckFrame = deriveSourceReferenceFrame(boneAnatomy([c5, c7]), 'interscalene');
  vectorClose(neckFrame.sourceReference.anchors[0].center, [0, 1.48, -.014]);
  vectorClose(neckFrame.sourceReference.anchors[1].center, [0, 1.44, -.03]);
  const expectedNeck = [0, -.04, -.016], neckLength = Math.hypot(...expectedNeck);
  vectorClose(neckFrame.n, expectedNeck.map(value => value / neckLength));

  const rings = [1, 1.4].flatMap(y => [[-.01, -.01], [.01, -.01], [.01, .01], [-.01, .01]]
    .flatMap(([x, z]) => [-.2 + .4 * (y - 1) + x, y, .2 * (y - 1) + z]));
  const indices = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; indices.push(i, j, i + 4, j, j + 4, i + 4); }
  const armFrame = deriveSourceReferenceFrame(boneAnatomy([bone('humerus', rings, indices)]), 'axillary');
  const expectedArm = [.4, 1, .2], armLength = Math.hypot(...expectedArm);
  vectorClose(armFrame.n, expectedArm.map(value => value / armLength));
  for (const anchor of armFrame.sourceReference.anchors) {
    const y = 1 + .4 * anchor.fraction;
    vectorClose(anchor.center, [-.2 + .4 * (y - 1), y, .2 * (y - 1)]);
  }
});

test('bone-axis derivation fails explicitly on missing, conflicting, foreign, degenerate or unsupported anchors', () => {
  const c5 = bone('vertebra-c5', triangleAt([0, 1.48, -.02]));
  const c7 = bone('vertebra-c7', triangleAt([0, 1.44, -.03]));
  const valid = boneAnatomy([c5, c7]);
  assert.throws(() => deriveSourceReferenceFrame(null, 'interscalene'), /loaded source anatomy/);
  assert.throws(() => deriveSourceReferenceFrame(valid, 'interscalene', 10), /within/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([c5]), 'interscalene'), /one same-source bone/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([c5, c5, c7]), 'interscalene'), /one same-source bone/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([{ ...c5, source: 'foreign' }, c7]), 'interscalene'), /same-source bone/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([{ ...c5, kind: 'nerve' }, c7]), 'interscalene'), /same-source bone/);
  assert.throws(() => deriveSourceReferenceFrame({ ...valid, coordinateSystem: { ...valid.coordinateSystem, anterior: '-Z' } }, 'interscalene'), /original metre/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([bone('vertebra-c5', Array(9).fill(0)), c7]), 'interscalene'), /nondegenerate bone surface/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([c7, { ...c5, id: 'vertebra-c7' }]), 'interscalene'), /one same-source bone/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([c5, bone('vertebra-c7', triangleAt([0, 1.49, -.03]))]), 'interscalene'), /C5 above source C7/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([{ ...bone('humerus', triangleAt([0, 1.3, 0])), side: 'left' }]), 'axillary'), /right humerus/);
  assert.throws(() => deriveSourceReferenceFrame(boneAnatomy([bone('humerus', triangleAt([0, 1.3, 0]))]), 'axillary'), /two nondegenerate actual humerus sections/);
});
