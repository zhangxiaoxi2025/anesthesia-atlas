/** Read-only integrity and source-coordinate checks, not clinical validation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { intersectGeometry, intersectGeometryPlane } from '../src/model-utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/interscalene');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bytes = fs.readFileSync(path.join(dir, 'manifest.json')), m = JSON.parse(bytes);
const axillary = JSON.parse(fs.readFileSync(path.join(root, 'public/models/manifest.json')));
assert.equal(m.source.commit, '6c7f9016bd5899ac8edafd31b9900c151df42ed6');
assert.equal(m.coordinateSystem.units, 'm'); assert.equal(m.coordinateSystem.up, '+Y');
assert.equal(m.coordinateSystem.anterior, '+Z'); assert.equal(m.coordinateSystem.right, '-X');
assert.equal(m.structures.length, 35);
const ids = new Set(), geometry = new Map(), sameSourceOverlaps = [];
for (const s of m.structures) {
  assert(!ids.has(s.id)); ids.add(s.id);
  assert.equal(s.source, 'z-anatomy-pinned'); assert.equal(s.sourceCommit, m.source.commit);
  assert.equal(s.license, 'CC-BY-SA-4.0'); assert.equal(s.provenanceStatus, 'source-mesh-extracted');
  assert(s.sourceObjectIds.length === 1 && Number.isSafeInteger(s.sourceObjectIds[0]));
  assert.equal(s.sourceId, 'FBX:' + s.sourceObjectIds[0]);
  const file = path.join(root, 'public', s.path);
  assert(file.startsWith(dir + path.sep));
  const b = fs.readFileSync(file); assert.equal(b.length, s.bytes); assert.equal(sha(b), s.sha256);
  const g = JSON.parse(b); geometry.set(s.id, g);
  assert(g.positions.length > 0 && g.positions.length % 3 === 0);
  assert(g.positions.every(Number.isFinite)); assert(g.normals.every(Number.isFinite));
  assert.equal(g.normals.length, g.positions.length); assert.equal(g.indices.length % 3, 0);
  assert(g.indices.every(i => Number.isInteger(i) && i >= 0 && i < g.positions.length / 3));
  assert.equal(g.positions.length / 3, s.vertexCount); assert.equal(g.indices.length / 3, s.triangleCount);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  g.positions.forEach((v, i) => { min[i % 3] = Math.min(min[i % 3], v); max[i % 3] = Math.max(max[i % 3], v); });
  assert.deepEqual({ min, max }, s.bounds);
  assert(min[1] > 1.15 && max[1] < 1.60); assert(min[0] > -.20 && max[0] < .06);
  const old = axillary.structures.find(x => x.sourceObjectIds.includes(s.sourceObjectIds[0]));
  if (old) {
    assert.equal(s.sha256, old.sha256); assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'public', old.path))), g);
    sameSourceOverlaps.push(s.id);
  }
}
const frame = m.focus.plane;
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
for (const v of [frame.u, frame.v, frame.n]) assert.equal(dot(v, v), 1);
assert.equal(dot(frame.u, frame.v), 0); assert.equal(dot(frame.u, frame.n), 0); assert.equal(dot(frame.v, frame.n), 0);
assert.deepEqual(cross(frame.u, frame.v), frame.n);
assert.equal(frame.center[1], m.focus.sliceY);
const cutCounts = {};
for (const [id, g] of geometry) {
  const cuts = intersectGeometry(g, m.focus.sliceY);
  const planeCuts = intersectGeometryPlane(g, frame);
  assert.equal(cuts.length, planeCuts.length, 'Generic plane and source-Y intersections disagree: ' + id);
  cutCounts[id] = cuts.length;
  const audited = m.sectionAudit.find(x => x.sourceY === m.focus.sliceY).structures[id];
  if (audited) assert.equal(cuts.length, audited.segmentCount);
  if (['brachial-roots', 'anterior-scalene', 'middle-scalene', 'sternocleidomastoid'].includes(id)) {
    assert(cuts.length > 0, 'Default plane misses a key source structure: ' + id);
    for (const [x, z] of cuts.flat()) {
      assert(x >= m.focus.bounds.min[0] && x <= m.focus.bounds.max[0]);
      assert(z >= m.focus.bounds.min[2] && z <= m.focus.bounds.max[2]);
      const horizontal = z - frame.center[2], depth = x - frame.center[0];
      assert(Math.abs(horizontal) <= frame.width / 2 && Math.abs(depth) <= frame.depth / 2);
    }
  }
}
assert.equal(m.structures.find(s => s.id === 'brachial-roots').sourceId, 'FBX:680949521');
assert.equal(m.structures.find(s => s.id === 'dorsal-scapular-nerve').sourceId, 'FBX:582201452');
assert.equal(m.structures.find(s => s.id === 'brachial-roots').topologyAudit.components.length, 7);
for (const missing of ['c5-ventral-ramus','c6-ventral-ramus','c7-ventral-ramus','phrenic-nerve']) {
  assert(!ids.has(missing)); assert(m.missingStructures.some(s => s.id === missing && s.replacement === null));
}
assert.equal(cutCounts['superior-trunk'], 0); assert.equal(cutCounts['middle-trunk'], 0); assert.equal(cutCounts['inferior-trunk'], 0);
const sourceChecks = [];
for (const record of [...m.source.files, ...m.source.licenses]) {
  assert(record.url.includes(m.source.commit));
  const file = record.cacheFile
    ? path.join(process.env.ANESTHESIA_ASSET_CACHE || '/private/tmp/anesthesia-atlas-source-cache', record.cacheFile)
    : path.join(root, 'public', record.path);
  if (!fs.existsSync(file)) { sourceChecks.push({ url: record.url, status: 'not-cached' }); continue; }
  const b = fs.readFileSync(file); assert.equal(b.length, record.bytes); assert.equal(sha(b), record.sha256);
  sourceChecks.push({ url: record.url, status: 'hash-matched' });
}
console.log(JSON.stringify({ status: 'PASS_LOCAL_INTERSCALENE_ASSET_INTEGRITY',
  manifestSha256: sha(bytes), structures: m.structures.length,
  geometryBytes: m.structures.reduce((sum, s) => sum + s.bytes, 0),
  triangles: m.structures.reduce((sum, s) => sum + s.triangleCount, 0),
  sameSourceOverlapsUnchanged: sameSourceOverlaps, frame, defaultSectionCounts: cutCounts, sourceChecks,
  boundary: 'Source traceability, unchanged geometry, local ROI and mathematical plane checks only; no clinical anatomical or ultrasound registration validation.' }, null, 2));
