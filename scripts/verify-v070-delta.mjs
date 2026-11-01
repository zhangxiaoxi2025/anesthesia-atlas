import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const baseline = JSON.parse(await readFile('docs/source-baseline-v070.json', 'utf8'));
for (const [path, expected] of Object.entries(baseline.files)) {
  assert.equal(sha(await readFile(path)), expected, `Source asset changed: ${path}`);
}
const currentPath = '交付文件/麻醉解剖双入路切面联动-v0.7.0.html';
const current = await readFile(currentPath, 'utf8');
const extract = html => JSON.parse(html.match(/<script id="anatomy-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const after = extract(current), expected = baseline.embeddedDataFieldSha256;
assert.deepEqual(Object.keys(after).sort(), Object.keys(expected).sort());
for (const key of Object.keys(expected)) assert.equal(sha(JSON.stringify(after[key])), expected[key], `Embedded data changed: ${key}`);
assert.notEqual(sha(current), baseline.previous.sha256, 'Current HTML must contain updated application code');
assert.equal(current, await readFile('交付文件/腋路臂丛研习室-离线版.html', 'utf8'));
const result = {
  date: '2026-10-31', version: '0.7.0',
  unchangedSourceFiles: Object.keys(baseline.files).length,
  unchangedEmbeddedDataFields: Object.keys(expected).length,
  previous: baseline.previous,
  current: { path: currentPath, bytes: Buffer.byteLength(current), sha256: sha(current) },
  changes: 'Application code, camera, cut-plane calculations, labels and presentation only.',
  boundary: 'Unchanged assets do not establish clinical identity, probe calibration or spatial registration.',
};
await writeFile('docs/offline-delta-v070.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
