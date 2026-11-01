import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPlexusSelection, ROOT_TRUNK_COLORS } from '../src/plexus-teaching-utils.js';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const teaching = await readJson('../src/data/plexus-teaching.json');
const manifest = await readJson('../public/interscalene/manifest.json');
const ultrasound = await readJson('../src/data/interscalene-ultrasound.json');
const find = id => teaching.concepts.find(concept => concept.id === id);

// Explicit teaching expectations independent of the production graph traversal.
const rootCases = [
  { id: 'c5', trunk: 'superior-trunk', panel: 'b', target: 'c5' },
  { id: 'c6', trunk: 'superior-trunk', panel: 'b', target: 'c6' },
  { id: 'c7', trunk: 'middle-trunk', panel: 'b', target: 'c7' },
  { id: 'c8', trunk: 'inferior-trunk', panel: 'c', target: null },
  { id: 't1', trunk: 'inferior-trunk', panel: 'c', target: null },
];
const trunkCases = [
  { id: 'superior-trunk', roots: ['c5', 'c6'] },
  { id: 'middle-trunk', roots: ['c7'] },
  { id: 'inferior-trunk', roots: ['c8', 't1'] },
];
const sorted = values => [...values].sort();

test('five root selections teach their independent expected trunk destination without assigning a root mesh identity', () => {
  for (const { id, trunk, panel, target } of rootCases) {
    const result = getPlexusSelection(id, teaching);
    assert.equal(result.activeId, id);
    assert.strictEqual(result.concept, find(id));
    assert.equal(result.concept.sourceMeshId, null);
    assert.deepEqual(sorted(result.highlightConceptIds), sorted([id, trunk]));
    assert.deepEqual(result.highlightTrunkIds, [trunk]);
    assert.equal(result.panelId, panel); assert.equal(result.ultrasoundTargetId, target);
    assert.equal(result.modelStatus, 'root-unconfirmed');
    assert.match(result.modelMessage, /根本体.*未核定/);
    assert.match(result.modelMessage, /典型去向/);
    assert.match(result.modelMessage, /不是.*根本体/);
  }
});

test('selecting a trunk highlights its contributing anterior-ramus concepts and only its existing named source mesh', () => {
  for (const { id, roots } of trunkCases) {
    const result = getPlexusSelection(id, teaching);
    assert.strictEqual(result.concept, find(id));
    assert.equal(result.concept.sourceMeshId, id);
    assert.deepEqual(sorted(result.highlightConceptIds), sorted([...roots, id]));
    assert.deepEqual(result.highlightTrunkIds, [id]);
    assert.equal(result.panelId, 'c'); assert.equal(result.ultrasoundTargetId, id);
    assert.equal(result.modelStatus, 'source-named');
    assert.match(result.modelMessage, /源具名.*网格/);
    const actualSource = manifest.structures.find(structure => structure.id === id);
    assert(actualSource, 'a teaching trunk must exist in the source manifest');
    assert.equal(actualSource.kind, 'nerve');
    assert.match(actualSource.sourceId, /^FBX:/);
  }
});

test('panel B targets only the three author-labelled roots, while panel C never substitutes a lower trunk target for C8 or T1', () => {
  const results = teaching.concepts.map(concept => getPlexusSelection(concept.id, teaching));
  const labelledRoots = results.filter(r => r.panelId === 'b').map(r => r.ultrasoundTargetId);
  assert.deepEqual(sorted(labelledRoots), ['c5', 'c6', 'c7']);
  const sourcePanels = new Set(ultrasound.panels.map(panel => panel.id));
  for (const result of results) {
    assert(sourcePanels.has(result.panelId), 'a teaching link must use an existing published-image viewport');
    if (result.panelId === 'b') assert(['c5', 'c6', 'c7'].includes(result.ultrasoundTargetId));
    else {
      assert.equal(result.panelId, 'c');
      assert(result.ultrasoundTargetId === null || ['superior-trunk', 'middle-trunk', 'inferior-trunk'].includes(result.ultrasoundTargetId));
    }
  }
  for (const id of ['c8', 't1']) {
    const result = getPlexusSelection(id, teaching);
    assert.equal(result.ultrasoundTargetId, null);
    assert.deepEqual(result.highlightTrunkIds, ['inferior-trunk']);
    assert.match(result.modelMessage, /图C.*不定位/);
  }
});

test('unknown, merged-mesh and vertebral identifiers fall back to the configured teaching default, without creating a root identifier', () => {
  const expected = getPlexusSelection(teaching.defaultId, teaching);
  assert.ok(expected.concept);
  for (const input of [undefined, null, '', 'not-a-concept', 'brachial-roots', 'vertebra-c7', '__proto__', 'C7']) {
    const actual = getPlexusSelection(input, teaching);
    assert.deepEqual(actual, expected);
    assert.strictEqual(actual.concept, find(teaching.defaultId));
  }
  const unavailable = getPlexusSelection('c7', { defaultId: 'c7', concepts: [] });
  assert.equal(unavailable.activeId, null); assert.equal(unavailable.concept, null);
  assert.equal(unavailable.modelStatus, 'unavailable');
  assert.deepEqual(unavailable.highlightTrunkIds, []); assert.equal(unavailable.ultrasoundTargetId, null);
});

test('clinical data retains all eight concepts, explicit typical contributions and traceable sources, without independently mapped roots', () => {
  const expectedIds = [...rootCases.map(c => c.id), ...trunkCases.map(c => c.id)];
  assert.deepEqual(sorted(teaching.concepts.map(concept => concept.id)), sorted(expectedIds));
  assert.equal(new Set(teaching.concepts.map(concept => concept.id)).size, 8);
  assert(expectedIds.includes(teaching.defaultId));
  for (const { id } of rootCases) {
    assert.equal(find(id).sourceMeshId, null);
    assert.deepEqual(find(id).rootIds, [id]);
  }
  for (const { id, roots } of trunkCases) {
    assert.equal(find(id).sourceMeshId, id);
    assert.deepEqual(sorted(find(id).rootIds), sorted(roots));
  }
  assert(Array.isArray(teaching.sources) && teaching.sources.length > 0);
  const sourceIds = new Set(teaching.sources.map(source => source.id));
  assert.equal(sourceIds.size, teaching.sources.length);
  for (const source of teaching.sources) {
    assert.equal(typeof source.id, 'string');
    assert.match(source.url, /^https:\/\//, 'source references must have inspectable original URLs');
  }
  function inspectReferences(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'sourceIds') {
        assert(Array.isArray(entry) && entry.length > 0);
        entry.forEach(id => assert(sourceIds.has(id), 'unresolved source reference: ' + id));
      } else if (entry && typeof entry === 'object') inspectReferences(entry);
    }
  }
  teaching.concepts.forEach(concept => {
    assert(Array.isArray(concept.sourceIds) && concept.sourceIds.length > 0, 'each concept needs evidence');
    inspectReferences(concept);
  });
  inspectReferences(teaching);
});

test('missing or ambiguous destination records cannot produce an unsupported model highlight or promote a root to a confirmed source identity', () => {
  const missingTrunk = { ...teaching, concepts: teaching.concepts.filter(concept => concept.id !== 'superior-trunk') };
  const missing = getPlexusSelection('c5', missingTrunk);
  assert.equal(missing.modelStatus, 'unavailable');
  assert.deepEqual(missing.highlightTrunkIds, []);
  const ambiguous = { ...teaching, concepts: teaching.concepts.map(concept => concept.id === 'middle-trunk' ? { ...concept, rootIds: [...concept.rootIds, 'c5'] } : concept) };
  assert.deepEqual(getPlexusSelection('c5', ambiguous).highlightTrunkIds, []);
  const falselyMappedRoot = { ...teaching, concepts: teaching.concepts.map(concept => concept.id === 'c7' ? { ...concept, sourceMeshId: 'brachial-roots' } : concept) };
  const safe = getPlexusSelection('c7', falselyMappedRoot);
  assert.equal(safe.modelStatus, 'root-unconfirmed');
  assert.deepEqual(safe.highlightTrunkIds, ['middle-trunk']);
  assert(!safe.highlightTrunkIds.includes('brachial-roots'));
});

test('selection works with deeply frozen data, returns original concept references, and leaves all teaching records unchanged', () => {
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  const before = JSON.stringify(teaching);
  freeze(teaching);
  for (const concept of teaching.concepts) {
    const result = getPlexusSelection(concept.id, teaching);
    assert.strictEqual(result.concept, concept);
    result.highlightConceptIds.push('caller-local');
    result.highlightTrunkIds.length = 0;
  }
  assert.equal(JSON.stringify(teaching), before);
  assert.deepEqual(ROOT_TRUNK_COLORS, {
    'superior-trunk': '#2f8a75', 'middle-trunk': '#397ca8', 'inferior-trunk': '#a66f44',
  });
});

