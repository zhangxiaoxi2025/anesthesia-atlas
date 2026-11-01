import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { intersectGeometry, NERVE_IDS } from '../src/model-utils.js';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = await readJson('../public/models/manifest.json');
const sourceFiles = await Promise.all(manifest.structures.map(async s => {
  const bytes = await readFile(new URL(`../public${s.path}`, import.meta.url));
  return { structure: s, bytes, geometry: JSON.parse(bytes) };
}));

test('the delivered geometry remains the pinned neutral source rather than a baked experimental pose', () => {
  assert.equal(manifest.structures.length, 47);
  assert.equal(manifest.source.commit, '6c7f9016bd5899ac8edafd31b9900c151df42ed6');
  assert.match(manifest.coordinateSystem.pose, /neutral/);
  assert.equal(manifest.coordinateSystem.units, 'm');
  for (const { structure: s, bytes, geometry: g } of sourceFiles) {
    assert.equal(sha256(bytes), s.sha256, `${s.id} no longer matches its source extraction hash`);
    assert.equal(g.positions.length / 3, s.vertexCount);
    assert.equal(g.indices.length / 3, s.triangleCount);
    const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    g.positions.forEach((x, i) => {
      assert.ok(Number.isFinite(x));
      bounds.min[i % 3] = Math.min(bounds.min[i % 3], x);
      bounds.max[i % 3] = Math.max(bounds.max[i % 3], x);
    });
    assert.deepEqual(bounds, s.bounds, `${s.id} source bounds changed`);
    assert.equal(s.provenanceStatus, s.kind === 'skin' ? 'source-surface-regions-combined' : 'source-mesh-extracted');
  }
});

test('source-Y sections preserve all source arrays and show real level-dependent nerve availability', () => {
  const snapshots = sourceFiles.map(({ geometry }) => sha256(JSON.stringify(geometry)));
  const byId = new Map(sourceFiles.map(({ structure, geometry }) => [structure.id, geometry]));
  for (const level of [1.27, 1.295, 1.31, 1.34, 1.39]) {
    for (const { geometry } of sourceFiles) {
      for (const segment of intersectGeometry(geometry, level)) {
        assert.equal(segment.length, 2);
        assert.ok(segment.flat().every(Number.isFinite));
      }
    }
  }
  for (const id of NERVE_IDS) assert.ok(intersectGeometry(byId.get(id), 1.295).length, `${id} must appear at the default source level`);
  assert.equal(intersectGeometry(byId.get('musculocutaneous'), 1.34).length, 0, 'do not invent proximal musculocutaneous geometry');
  assert.equal(intersectGeometry(byId.get('radial'), 1.39).length, 0, 'do not extend the radial source mesh beyond its real bound');
  assert.equal(intersectGeometry(byId.get('axillary-artery'), 1.295).length, 0, 'the default source section contains the brachial segment, not the axillary segment');
  assert.ok(intersectGeometry(byId.get('brachial-artery'), 1.295).length);
  sourceFiles.forEach(({ geometry }, i) => assert.equal(sha256(JSON.stringify(geometry)), snapshots[i], 'intersection mutated source geometry'));
});

test('the active application and source-slice components use source geometry without experimental pose or probe paths', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const viewer = await readFile(new URL('../src/components/AnatomyViewer.jsx', import.meta.url), 'utf8');
  const section = await readFile(new URL('../src/components/CrossSection.jsx', import.meta.url), 'utf8');
  const sourceScene = await readFile(new URL('../src/components/SourceSliceScene.jsx', import.meta.url), 'utf8');
  const workbench = await readFile(new URL('../src/components/SourceSliceWorkbench.jsx', import.meta.url), 'utf8');
  for (const [name, code] of [['App', app], ['AnatomyViewer', viewer], ['CrossSection', section], ['SourceSliceScene', sourceScene], ['SourceSliceWorkbench', workbench]]) {
    assert.doesNotMatch(code, /\b(?:poseAnatomy|getProbeFrame|transformPosePoint|probeFrame|showProbe|applyFrame)\b/, `${name} reconnected experimental pose/probe behavior`);
    assert.doesNotMatch(code, /(?:from\s*|import\s*\()\s*['"][^'"]*(?:pose-utils|pose-audit|experimental-pose)/, `${name} imports historical pose code`);
  }
  assert.match(app, /mergeSourceAnatomy\(neckAnatomy, anatomy\)/);
  assert.match(app, /<SourceSliceWorkbench\b[^>]*\banatomy=\{sharedModels\.anatomy\}/s);
  assert.match(sourceScene, /Float32BufferAttribute\(source\.positions,\s*3\)/);
  assert.doesNotMatch(sourceScene, /(?:mesh\.position|mesh\.rotation|mesh\.scale)\.(?:set|copy|multiply|add)/);
  assert.match(workbench, /obliqueSections\(anatomy, frame\)/);
  assert.match(app, /<CrossSection\b[^>]*\banatomy=\{anatomy\}/s);
  assert.match(viewer, /Float32BufferAttribute\(s\.geometry\.positions,\s*3\)/);
  assert.doesNotMatch(viewer, /BoxGeometry|makeBasis|setRotationFromMatrix|poseMetadata/);
  assert.doesNotMatch(section, /intersectGeometryPlane|\bframe\b|\bstation\b|setStation/);
  assert.match(section, /segments:\s*intersectGeometry\(s\.geometry,\s*level\)/);
  assert.match(section, /min=\{1\.27\}/);
  assert.match(section, /max=\{1\.39\}/);
  assert.match(section, /源中立位/);
  assert.match(section, /非超声／非敬礼位/);
});

test('the real ultrasound reference retains source pixels, attribution and name-only mapping limits', async () => {
  const u = await readJson('../src/data/ultrasound.json');
  assert.deepEqual(u.hotspots.map(h => h.id).sort(), [...NERVE_IDS].sort());
  assert.equal(u.orientation.side, 'unconfirmed');
  assert.equal(u.orientation.matchesCurrent3DSide, false);
  assert.equal(u.license.id, 'CC-BY-4.0');
  const panel = u.panels.find(p => p.id === 'ultrasound');
  for (const p of u.panels) {
    const bytes = await readFile(new URL(`../public${p.path}`, import.meta.url));
    assert.equal(sha256(bytes), p.sha256, `${p.id} original-reference crop was changed`);
  }
  for (const h of u.hotspots) {
    assert.equal(h.panelId, panel.id);
    const expectedX = (h.sourcePixelX - panel.crop.left) / panel.width * 100;
    const expectedY = (h.sourcePixelY - panel.crop.top) / panel.height * 100;
    assert.ok(Math.abs(h.xPct - expectedX) < .001, `${h.id} does not map to its original author-label X`);
    assert.ok(Math.abs(h.yPct - expectedY) < .001, `${h.id} does not map to its original author-label Y`);
    assert.match(h.meaning, /不是针尖/);
  }
});
