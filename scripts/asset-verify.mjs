/** Verify the delivered assets and their provenance, independently of the UI. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/models');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const m = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const expected = { median: 874085510, ulnar: 649745495, radial: 41491164, musculocutaneous: 122786892 };
const ids = new Set(), report = [];
for (const s of m.structures) {
  assert(!ids.has(s.id), 'Duplicate semantic ID: ' + s.id); ids.add(s.id);
  assert.equal(s.source, 'z-anatomy-pinned');
  assert.equal(s.license, 'CC-BY-SA-4.0');
  assert(s.sourceObjectIds.length && s.sourceObjectIds.every(Number.isSafeInteger));
  assert(s.sourceObjectNames.length === s.sourceObjectIds.length);
  const file = path.join(root, 'public', s.path);
  assert(file.startsWith(path.join(root, 'public/models') + path.sep));
  const bytes = fs.readFileSync(file);
  assert.equal(sha(bytes), s.sha256, 'Geometry SHA mismatch: ' + s.id);
  assert.equal(bytes.length, s.bytes);
  const g = JSON.parse(bytes), n = g.positions.length / 3;
  assert(Number.isInteger(n) && n > 0 && g.normals.length === g.positions.length);
  assert(g.positions.every(Number.isFinite) && g.normals.every(Number.isFinite));
  assert(g.indices.length % 3 === 0 && g.indices.every(i => Number.isInteger(i) && i >= 0 && i < n));
  assert.equal(n, s.vertexCount); assert.equal(g.indices.length / 3, s.triangleCount);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < g.positions.length; i++) {
    min[i % 3] = Math.min(min[i % 3], g.positions[i]);
    max[i % 3] = Math.max(max[i % 3], g.positions[i]);
  }
  assert.deepEqual(min, s.bounds.min); assert.deepEqual(max, s.bounds.max);
  // A wrong scale/axis/laterality would fail these broad dimensional bounds.
  assert(min[0] > -0.6 && max[0] < 0.04 && min[1] > 0.4 && max[1] < 1.65);
  if (s.id in expected) {
    assert.equal(s.sourceObjectIds[0], expected[s.id]);
    assert.equal(s.provenanceStatus, 'source-mesh-extracted');
    const positions = new Map(), vertexToPosition = [];
    for (let i = 0; i < n; i++) {
      const key = g.positions.slice(i * 3, i * 3 + 3).join(',');
      if (!positions.has(key)) positions.set(key, positions.size);
      vertexToPosition.push(positions.get(key));
    }
    const parent = Array.from({ length: positions.size }, (_, i) => i);
    const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    for (let i = 0; i < g.indices.length; i += 3) {
      const a = vertexToPosition[g.indices[i]], b = vertexToPosition[g.indices[i + 1]], c = vertexToPosition[g.indices[i + 2]];
      parent[find(b)] = find(a); parent[find(c)] = find(a);
    }
    report.push({ id: s.id, sourceObjectId: s.sourceObjectIds[0], triangles: s.triangleCount,
      positionConnectedComponents: new Set(parent.map((_, i) => find(i))).size, bounds: s.bounds });
  }
}
assert.equal(Object.keys(expected).filter(id => ids.has(id)).length, 4);
assert.equal(m.source.commit, '6c7f9016bd5899ac8edafd31b9900c151df42ed6');
assert.equal(m.coordinateSystem.units, 'm');
const originals = [];
for (const record of m.source.files) {
  const local = record.cachePath ?? path.join(dir, record.path);
  if (fs.existsSync(local)) {
    const bytes = fs.readFileSync(local); assert.equal(sha(bytes), record.sha256, 'Source SHA mismatch: ' + local);
    originals.push({ path: local, status: 'verified', bytes: bytes.length });
  } else originals.push({ url: record.url, status: 'not-cached-download-from-pinned-url' });
  assert(record.url.includes(m.source.commit));
}
console.log(JSON.stringify({ status: 'PASS_LOCAL_ASSET_INTEGRITY', structures: m.structures.length,
  triangles: m.structures.reduce((n, s) => n + s.triangleCount, 0), geometryBytes: m.structures.reduce((n, s) => n + s.bytes, 0),
  nerves: report, sourceFiles: originals,
  boundary: 'Verifies local geometry and source traceability; does not validate clinical anatomy, technique or safety.' }, null, 2));
