import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { intersectGeometry, nerveIdFor } from '../src/model-utils.js';

const clinical = JSON.parse(await readFile(new URL('../src/data/clinical.json', import.meta.url)));
const manifest = JSON.parse(await readFile(new URL('../public/models/manifest.json', import.meta.url)));

test('a plane intersects a known triangle at the expected two points', () => {
  const triangle = { positions: [0, 0, 0, 2, 2, 0, 0, 2, 2], indices: [0, 1, 2] };
  const result = intersectGeometry(triangle, 1);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0], [[1, 0], [0, 1]]);
  assert.deepEqual(intersectGeometry(triangle, 3), []);
});

test('default reference level contains all four source nerves and the correctly named vessels', async () => {
  const level = manifest.focus.sliceY;
  assert.equal(level, 1.295);
  for (const id of ['median', 'ulnar', 'radial', 'musculocutaneous', 'brachial-artery', 'brachial-vein']) {
    const s = manifest.structures.find(s => s.id === id);
    assert.ok(s, `${id} must exist as actual source geometry`);
    const g = JSON.parse(await readFile(new URL(`../public${s.path}`, import.meta.url)));
    assert.ok(intersectGeometry(g, level).length > 0, `${id} must cross the reference plane`);
  }
  const axillary = manifest.structures.find(s => s.id === 'axillary-artery');
  assert.ok(axillary.bounds.min[1] > level, 'this upper arm plane must not be relabeled as axillary artery');
});

test('real distal source branches inherit their parent nerve identity', () => {
  for (const id of ['musculocutaneous-lateral-antebrachial-cutaneous', 'radial-superficial', 'radial-deep']) {
    const s = manifest.structures.find(s => s.id === id);
    assert.ok(s, `${id} source branch missing`);
    assert.equal(nerveIdFor(s), id.startsWith('radial') ? 'radial' : 'musculocutaneous');
  }
  assert.equal(nerveIdFor({ id: 'axillary-nerve', kind: 'nerve' }), null);
  for (const s of manifest.structures.filter(s => s.kind !== 'nerve')) {
    assert.equal(nerveIdFor(s), null, `${s.id} is ${s.kind}, not a nerve`);
  }
});

test('clinical claims, steps and quizzes refer to existing sources and valid targets', () => {
  const sources = new Set(clinical.sources.map(s => s.id));
  const nerves = new Set(clinical.nerves.map(n => n.id));
  const targets = new Set(clinical.targets.map(t => t.id));
  for (const item of [...clinical.nerves, ...clinical.targets, ...clinical.boundaries, ...clinical.quiz]) {
    assert.ok(item.sourceIds.length, `${item.id} needs evidence`);
    for (const id of item.sourceIds) assert.ok(sources.has(id), `unknown source ${id}`);
  }
  for (const target of clinical.targets) for (const id of target.nerveIds) assert.ok(nerves.has(id));
  for (const step of clinical.teachingSteps) {
    for (const id of step.focusIds) assert.ok(nerves.has(id));
    if (step.targetId) assert.ok(targets.has(step.targetId));
  }
  for (const q of clinical.quiz) assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length);
  assert.equal(clinical.reviewStatus, 'awaiting_clinician_review');
});

test('active source geometry is one pinned model version with independent four nerve meshes', () => {
  assert.equal(manifest.source.commit, '6c7f9016bd5899ac8edafd31b9900c151df42ed6');
  for (const id of ['median', 'ulnar', 'radial', 'musculocutaneous']) {
    const s = manifest.structures.find(s => s.id === id);
    assert.equal(s.provenanceStatus, 'source-mesh-extracted');
    assert.equal(s.license, 'CC-BY-SA-4.0');
    assert.ok(s.sourceObjectIds?.length || s.sourceObjectId);
  }
  assert.ok(manifest.missingStructures.some(s => s.kind === 'fascia'));
});
