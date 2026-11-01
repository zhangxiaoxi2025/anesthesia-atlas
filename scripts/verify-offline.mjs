import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { verifyRootCandidateSource } from '../src/root-annotation.js';
import { mergeSourceAnatomy, workbenchROI } from '../src/slice-workbench-utils.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const file = join(root, '交付文件/腋路臂丛研习室-离线版.html');
const html = await readFile(file, 'utf8');
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
assert.equal(await readFile(join(root, `交付文件/麻醉解剖双入路切面联动-v${version}.html`), 'utf8'), html, 'preferred versioned entry must equal legacy entry');
assert.equal((html.match(/<script[^>]+\bsrc=/gi) || []).length, 0);
assert.equal((html.match(/<link[^>]+rel=["']stylesheet/gi) || []).length, 0);
const match = html.match(/<script id="anatomy-data" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(match, 'embedded model data missing');
const embedded = JSON.parse(match[1]);
const manifest = JSON.parse(await readFile(join(root, 'public/models/manifest.json'), 'utf8'));
assert.equal(embedded.structures.length, manifest.structures.length);
for (const s of embedded.structures) {
  const local = JSON.parse(await readFile(join(root, 'public', s.path), 'utf8'));
  assert.deepEqual(s.geometry, local, `${s.id} differs from source delivery`);
}
for (const [key, path] of [['embeddedAttribution', 'public/models/ATTRIBUTION.md'], ['embeddedLicense', 'public/models/source/Z-UPSTREAM-LICENSE.txt'], ['embeddedSoftwareNotices', 'public/THIRD_PARTY_NOTICES.txt']]) {
  assert.equal(embedded[key], await readFile(join(root, path), 'utf8'), `${key} is stale`);
}
const ultrasound = JSON.parse(await readFile(join(root, 'src/data/ultrasound.json'), 'utf8'));
assert.equal(ultrasound.license.id, 'CC-BY-4.0');
assert.equal(ultrasound.license.verified, true);
assert.deepEqual(ultrasound.panels.map(p => p.id).sort(), ['position', 'ultrasound']);
assert.ok(embedded.embeddedMedia && typeof embedded.embeddedMedia === 'object', 'embedded ultrasound media missing');
const referenceAtlas = JSON.parse(await readFile(join(root, 'src/data/reference-atlas.json'), 'utf8'));
const interscaleneUltrasound = JSON.parse(await readFile(join(root, 'src/data/interscalene-ultrasound.json'), 'utf8'));
const rootReference = JSON.parse(await readFile(join(root, 'src/data/root-reference.json'), 'utf8'));
assert.deepEqual(Object.keys(embedded.embeddedMedia).sort(), [...ultrasound.panels.map(p=>p.path),...referenceAtlas.items.map(i=>i.path),interscaleneUltrasound.path,rootReference.path].sort(), 'all six exact source figures must be embedded');
const media = [];
for (const panel of ultrasound.panels) {
  const dataUrl = embedded.embeddedMedia[panel.path];
  assert.match(dataUrl, /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/, `${panel.id} must be a complete inline PNG, not a remote/file URL`);
  const bytes = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  const local = await readFile(join(root, 'public', panel.path));
  assert.deepEqual(bytes, local, `${panel.id} inline bytes differ from original delivered PNG`);
  assert.equal(bytes.length, panel.bytes);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), panel.width);
  assert.equal(bytes.readUInt32BE(20), panel.height);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, panel.sha256, `${panel.id} inline SHA differs from source record`);
  media.push({ id: panel.id, path: panel.path, width: panel.width, height: panel.height, bytes: bytes.length, sha256 });
}
assert.ok(typeof embedded.embeddedUltrasoundAttribution === 'string');
for (const required of [ultrasound.license.copyright, ultrasound.license.attribution, ultrasound.license.id, ultrasound.license.url, ultrasound.source.articleUrl, ultrasound.source.doi, ultrasound.source.imageUrl, ultrasound.source.xmlUrl, ultrasound.source.originalSha256, ...ultrasound.panels.map(p => p.sha256)]) {
  assert.ok(embedded.embeddedUltrasoundAttribution.includes(required), 'ultrasound source/license/changes attribution is incomplete: ' + required);
}
assert.equal(referenceAtlas.items.length,2);
for (const item of referenceAtlas.items) {
  assert.equal(item.license.id,'CC-BY-NC-3.0');
  const dataUrl = embedded.embeddedMedia[item.path];
  assert.match(dataUrl,/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/);
  const bytes=Buffer.from(dataUrl.slice('data:image/jpeg;base64,'.length),'base64');
  assert.deepEqual(bytes,await readFile(join(root,'public',item.path)), `${item.id} differs from official JPEG`);
  assert.equal(bytes.length,item.bytes);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256,item.sha256);
  const evidence=JSON.parse(await readFile(join(root,'public',item.license.evidencePath),'utf8'));
  assert.deepEqual(embedded.embeddedReferenceEvidence[item.license.evidencePath],evidence);
  for(const required of [item.title,item.figure,item.source.authors,item.source.doi,item.source.url,item.source.imageUrl,item.sha256,item.license.id,item.license.url,item.license.attribution,item.changes])
    assert.ok(embedded.embeddedReferenceAttribution.includes(required),`missing Han reference attribution ${required}`);
  media.push({id:item.id,path:item.path,width:item.width,height:item.height,bytes:bytes.length,sha256});
}
const interscaleneManifest = JSON.parse(await readFile(join(root,'public/interscalene/manifest.json'),'utf8'));
assert.equal(embedded.embeddedInterscalene.structures.length,interscaleneManifest.structures.length);
assert.deepEqual(embedded.embeddedInterscalene.structures.map(({geometry,...s})=>s),interscaleneManifest.structures);
for(const s of embedded.embeddedInterscalene.structures) {
  const bytes=await readFile(join(root,'public',s.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),s.sha256);
  assert.deepEqual(s.geometry,JSON.parse(bytes));
}
assert.equal(embedded.embeddedInterscaleneAttribution,await readFile(join(root,'public/interscalene/ATTRIBUTION.md'),'utf8'));
for(const record of interscaleneManifest.source.licenses)assert.equal(embedded.embeddedInterscaleneLicenses[record.path],await readFile(join(root,'public',record.path),'utf8'));
assert.equal(interscaleneUltrasound.license.id,'CC-BY-NC-SA-4.0');
const usData=embedded.embeddedMedia[interscaleneUltrasound.path];
assert.match(usData,/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/);
const usBytes=Buffer.from(usData.slice('data:image/jpeg;base64,'.length),'base64');
assert.deepEqual(usBytes,await readFile(join(root,'public',interscaleneUltrasound.path)));
assert.equal(createHash('sha256').update(usBytes).digest('hex'),interscaleneUltrasound.sha256);
assert.equal(embedded.embeddedInterscaleneUltrasoundEvidence,await readFile(join(root,'public',interscaleneUltrasound.license.evidencePath),'utf8'));
assert.equal(createHash('sha256').update(embedded.embeddedInterscaleneUltrasoundEvidence).digest('hex'),interscaleneUltrasound.license.xmlSha256);
for(const required of [interscaleneUltrasound.license.attribution,interscaleneUltrasound.license.url,interscaleneUltrasound.source.doi,interscaleneUltrasound.source.imageUrl,interscaleneUltrasound.source.xmlUrl,interscaleneUltrasound.changes])assert.ok(embedded.embeddedInterscaleneUltrasoundAttribution.includes(required));
media.push({id:interscaleneUltrasound.id,path:interscaleneUltrasound.path,width:interscaleneUltrasound.width,height:interscaleneUltrasound.height,bytes:usBytes.length,sha256:interscaleneUltrasound.sha256});
assert.equal(rootReference.license.id,'CC-BY-4.0');
assert.equal(rootReference.license.verified,true);
const rootReferenceData=embedded.embeddedMedia[rootReference.path];
assert.match(rootReferenceData,/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/);
const rootReferenceBytes=Buffer.from(rootReferenceData.slice('data:image/jpeg;base64,'.length),'base64');
assert.deepEqual(rootReferenceBytes,await readFile(join(root,'public',rootReference.path)));
assert.equal(rootReferenceBytes.length,rootReference.bytes);
assert.equal(createHash('sha256').update(rootReferenceBytes).digest('hex'),rootReference.sha256);
assert.deepEqual(embedded.embeddedRootReferenceEvidence,JSON.parse(await readFile(join(root,'public',rootReference.license.evidencePath),'utf8')));
for(const required of [rootReference.license.attribution,rootReference.license.url,rootReference.source.imageUrl,rootReference.source.jatsUrl,rootReference.sha256,rootReference.changes])assert.ok(embedded.embeddedRootReferenceAttribution.includes(required));
const rootCandidate=JSON.parse(await readFile(join(root,'src/data/root-annotation-candidate.json'),'utf8'));
assert.deepEqual(embedded.embeddedRootAnnotationCandidate,rootCandidate);
assert.equal(rootCandidate.identityStatus,'unconfirmed');
assert.equal(rootCandidate.reviewStatus,'unreviewed');
assert.equal((await verifyRootCandidateSource(embedded.embeddedInterscalene,rootCandidate)).ok,true,'embedded source buffers must match the unconfirmed candidate mask');
const combined = mergeSourceAnatomy(embedded.embeddedInterscalene, embedded);
assert.equal(combined.structures.length, 76);
assert.equal(combined.mergeAudit.duplicates.length, 6);
const workbenchBounds = workbenchROI(combined);
assert.equal(workbenchBounds.anchors.upper.id, 'vertebra-c5');
assert.equal(workbenchBounds.anchors.lower.id, 'humerus');
const teaching=JSON.parse(await readFile(join(root,'src/data/plexus-teaching.json'),'utf8'));
const teachingHotspots=JSON.parse(await readFile(join(root,'src/data/plexus-ultrasound-hotspots.json'),'utf8'));
assert.deepEqual(embedded.embeddedPlexusTeaching,teaching);
assert.deepEqual(embedded.embeddedPlexusUltrasoundHotspots,teachingHotspots);
assert.equal(teaching.concepts.filter(item=>item.kind==='root').length,5);
assert.ok(teaching.concepts.filter(item=>item.kind==='root').every(item=>item.sourceMeshId===null));
assert.equal(teachingHotspots.sourceFigureId,interscaleneUltrasound.id);
assert.deepEqual(teachingHotspots.panels.b.targets.map(item=>item.id).sort(),['c5','c6','c7']);
assert.deepEqual(teachingHotspots.panels.c.targets.map(item=>item.id).sort(),['inferior-trunk','middle-trunk','superior-trunk']);
media.push({id:rootReference.id,path:rootReference.path,width:rootReference.width,height:rootReference.height,bytes:rootReferenceBytes.length,sha256:rootReference.sha256});
assert.ok(Object.keys(embedded.embeddedMedia).every(p=>p.startsWith('/ultrasound/')||p.startsWith('/reference-atlas/')||p===interscaleneUltrasound.path||p===rootReference.path),'no restricted external atlas image is embedded');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert.equal(inline.length, 1);
assert.ok(!inline[0].includes('fixed-reference-teaching-reconstruction-unvalidated'), 'withdrawn pose code in active offline bundle');
assert.ok(!inline[0].includes('estimated-reference-surface-offset'), 'withdrawn probe reconstruction in active offline bundle');
assert.ok(!inline[0].includes('process.env.NODE_ENV'), 'unresolved Node environment variable');
new Script(inline[0], { filename: 'offline-inline.js' }); // syntax compilation only; no browser execution
const hash = createHash('sha256').update(html).digest('hex');
const receipt = await readFile(join(root, '交付文件/离线文件SHA256.txt'), 'utf8');
assert.ok(receipt.startsWith(hash));
const result = { status: 'PASS_OFFLINE_PACKAGE_INTEGRITY', structures: embedded.structures.length, interscaleneStructures: embedded.embeddedInterscalene.structures.length, bytes: Buffer.byteLength(html), sha256: hash, externalScriptTags: 0, externalStylesheetTags: 0, embeddedMedia: media.length, embeddedMediaExternalUrls: 0, media, embeddedUltrasoundAttribution: true, embeddedReferenceAttribution: true, embeddedInterscaleneAttribution: true, embeddedInterscaleneUltrasoundAttribution: true, embeddedRootReferenceAttribution: true, embeddedRootReferenceEvidence: true, embeddedRootAnnotationCandidate: true, candidateSourceHashes: 'MATCH', candidateIdentityStatus: rootCandidate.identityStatus, candidateReviewStatus: rootCandidate.reviewStatus, combinedWorkbenchStructures: combined.structures.length, duplicateSourceRecords: combined.mergeAudit.duplicates.length, workbenchBounds: {min:workbenchBounds.min,max:workbenchBounds.max}, preferredEntry: `麻醉解剖双入路切面联动-v${version}.html`, sourcePose: 'original-neutral-unmodified', inlineSyntax: 'PARSE_OK', boundary: 'Static package integrity only. file:// browser runtime and physical iPad not verified. Clinical source images and original neutral atlas are different poses and datasets; no ultrasound-to-3D registration is claimed.' };
await writeFile(join(root, 'docs/offline-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
