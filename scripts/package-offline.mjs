import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const project = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(project, '交付文件');
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile(join(project, 'public/models/manifest.json'), 'utf8'));
const structures = await Promise.all(manifest.structures.map(async s => ({ ...s, geometry: JSON.parse(await readFile(join(project, 'public', s.path), 'utf8')) })));
const interscaleneManifest = JSON.parse(await readFile(join(project, 'public/interscalene/manifest.json'), 'utf8'));
const interscaleneStructures = await Promise.all(interscaleneManifest.structures.map(async s => {
  assert.ok(s.path.startsWith('/interscalene/') && !s.path.includes('..'));
  const bytes = await readFile(join(project, 'public', s.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), s.sha256);
  return { ...s, geometry: JSON.parse(bytes) };
}));
const ultrasound = JSON.parse(await readFile(join(project, 'src/data/ultrasound.json'), 'utf8'));
assert.equal(ultrasound.license.id, 'CC-BY-4.0');
assert.equal(ultrasound.license.verified, true);
assert.deepEqual(ultrasound.panels.map(p => p.id).sort(), ['position', 'ultrasound']);
const embeddedMedia = Object.fromEntries(await Promise.all(ultrasound.panels.map(async panel => {
  assert.ok(panel.path.startsWith('/ultrasound/') && !panel.path.includes('..'));
  const bytes = await readFile(join(project, 'public', panel.path));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${panel.id} is not PNG`);
  assert.equal(bytes.readUInt32BE(16), panel.width);
  assert.equal(bytes.readUInt32BE(20), panel.height);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), panel.sha256, `${panel.id} source PNG changed`);
  return [panel.path, `data:image/png;base64,${bytes.toString('base64')}`];
})));
const referenceAtlas = JSON.parse(await readFile(join(project, 'src/data/reference-atlas.json'), 'utf8'));
const referenceEvidence = {};
for (const item of referenceAtlas.items) {
  assert.equal(item.license.id, 'CC-BY-NC-3.0');
  assert.equal(item.license.verified, true);
  assert.ok(item.path.startsWith('/reference-atlas/') && !item.path.includes('..'));
  const bytes = await readFile(join(project, 'public', item.path));
  assert.equal(bytes.subarray(0,2).toString('hex'), 'ffd8', `${item.id} is not JPEG`);
  assert.equal(bytes.length,item.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);
  embeddedMedia[item.path] = `data:image/jpeg;base64,${bytes.toString('base64')}`;
  referenceEvidence[item.license.evidencePath] = JSON.parse(await readFile(join(project,'public',item.license.evidencePath),'utf8'));
}
const embeddedReferenceAttribution = referenceAtlas.items.map(item => [
  item.title, item.figure, item.source.title, item.source.authors,
  `Article: ${item.source.url}`, `DOI: ${item.source.doi}`,
  `Official image: ${item.source.imageUrl}`, `SHA-256: ${item.sha256}`,
  item.license.copyright, item.license.attribution,
  `License: ${item.license.id} — ${item.license.url}`,
  item.license.useScope, `Changes: ${item.changes}`,
  item.orientationNote, ...item.limitations,
].join('\n')).join('\n\n');
const interscaleneUltrasound = JSON.parse(await readFile(join(project,'src/data/interscalene-ultrasound.json'),'utf8'));
assert.equal(interscaleneUltrasound.license.id,'CC-BY-NC-SA-4.0');
assert.equal(interscaleneUltrasound.license.verified,true);
const interscaleneImage = await readFile(join(project,'public',interscaleneUltrasound.path));
assert.equal(createHash('sha256').update(interscaleneImage).digest('hex'),interscaleneUltrasound.sha256);
assert.equal(interscaleneImage.length,interscaleneUltrasound.bytes);
embeddedMedia[interscaleneUltrasound.path] = `data:image/jpeg;base64,${interscaleneImage.toString('base64')}`;
const interscaleneEvidence = await readFile(join(project,'public',interscaleneUltrasound.license.evidencePath),'utf8');
assert.equal(createHash('sha256').update(interscaleneEvidence).digest('hex'),interscaleneUltrasound.license.xmlSha256);
const embeddedInterscaleneAttribution = await readFile(join(project,'public/interscalene/ATTRIBUTION.md'),'utf8');
const embeddedInterscaleneLicenses = Object.fromEntries(await Promise.all(interscaleneManifest.source.licenses.map(async l=>[l.path,await readFile(join(project,'public',l.path),'utf8')])));
const embeddedInterscaleneUltrasoundAttribution = [interscaleneUltrasound.license.attribution,interscaleneUltrasound.license.url,interscaleneUltrasound.source.imageUrl,interscaleneUltrasound.source.xmlUrl,interscaleneUltrasound.sha256,interscaleneUltrasound.changes,interscaleneUltrasound.orientationNote,...interscaleneUltrasound.limitations].join('\n\n');
const rootReference = JSON.parse(await readFile(join(project,'src/data/root-reference.json'),'utf8'));
assert.equal(rootReference.license.id,'CC-BY-4.0');
assert.equal(rootReference.license.verified,true);
assert.ok(rootReference.path.startsWith('/root-reference/')&&!rootReference.path.includes('..'));
const rootReferenceBytes = await readFile(join(project,'public',rootReference.path));
assert.equal(rootReferenceBytes.length,rootReference.bytes);
assert.equal(createHash('sha256').update(rootReferenceBytes).digest('hex'),rootReference.sha256);
embeddedMedia[rootReference.path] = `data:image/jpeg;base64,${rootReferenceBytes.toString('base64')}`;
const embeddedRootReferenceEvidence = JSON.parse(await readFile(join(project,'public',rootReference.license.evidencePath),'utf8'));
assert.equal(embeddedRootReferenceEvidence.sha256,rootReference.sha256);
const embeddedRootReferenceAttribution = [rootReference.license.attribution,rootReference.license.url,rootReference.source.articleUrl,rootReference.source.imageUrl,rootReference.source.jatsUrl,rootReference.sha256,rootReference.changes,rootReference.orientationNote,...rootReference.limitations].join('\n\n');
const embeddedRootAnnotationCandidate = JSON.parse(await readFile(join(project,'src/data/root-annotation-candidate.json'),'utf8'));
assert.equal(embeddedRootAnnotationCandidate.identityStatus,'unconfirmed');
assert.equal(embeddedRootAnnotationCandidate.reviewStatus,'unreviewed');
const embeddedPlexusTeaching = JSON.parse(await readFile(join(project,'src/data/plexus-teaching.json'),'utf8'));
const embeddedPlexusUltrasoundHotspots = JSON.parse(await readFile(join(project,'src/data/plexus-ultrasound-hotspots.json'),'utf8'));
assert.ok(embeddedPlexusTeaching.concepts.filter(item=>item.kind==='root').every(item=>item.sourceMeshId===null));
assert.equal(embeddedPlexusUltrasoundHotspots.sourceFigureId,interscaleneUltrasound.id);
const embeddedUltrasoundAttribution = [
  ultrasound.title,
  ultrasound.license.copyright,
  ultrasound.license.attribution,
  `License: ${ultrasound.license.id} — ${ultrasound.license.url}`,
  `Article: ${ultrasound.source.articleUrl}`,
  `DOI: ${ultrasound.source.doi}`,
  `Official source image: ${ultrasound.source.imageUrl}`,
  `Official source/license evidence: ${ultrasound.source.xmlUrl}`,
  `Original image SHA-256: ${ultrasound.source.originalSha256}`,
  'Local adaptations: only the two Figure 1(e/f) panels were cropped, without resampling, mirroring, enhancement, pixel annotations or AI editing. Original arrows, letters and screen directions are retained.',
  ...ultrasound.panels.map(p => `${p.sourcePanel}: ${p.path}; ${p.width}×${p.height}; crop [${p.crop.left},${p.crop.top},${p.crop.right},${p.crop.bottom}); SHA-256 ${p.sha256}`),
  'Scope: main-text figures only; no Supporting Information downloaded. NLM/PMC is the resource provider and does not endorse this application.',
  'Orientation: the original ultrasound labels screen-left Cephalad and screen-right Caudad. Patient left/right side and the physical probe marker remain unconfirmed. The ultrasound is not spatially registered to the 3D reference model.',
  'Clinical boundary: reference images and label-center hotspots are for structure recognition, not needle positioning, drug deposition, a safe injection space or patient-specific block prediction.',
].join('\n\n');
const embedded = {
  ...manifest, structures,
  embeddedMedia,
  embeddedUltrasoundAttribution,
  embeddedReferenceAttribution,
  embeddedReferenceEvidence: referenceEvidence,
  embeddedInterscalene: {...interscaleneManifest,structures:interscaleneStructures},
  embeddedInterscaleneAttribution,
  embeddedInterscaleneLicenses,
  embeddedInterscaleneUltrasoundAttribution,
  embeddedInterscaleneUltrasoundEvidence: interscaleneEvidence,
  embeddedRootReferenceAttribution,
  embeddedRootReferenceEvidence,
  embeddedRootAnnotationCandidate,
  embeddedPlexusTeaching,
  embeddedPlexusUltrasoundHotspots,
  embeddedAttribution: await readFile(join(project, 'public/models/ATTRIBUTION.md'), 'utf8'),
  embeddedLicense: await readFile(join(project, 'public/models/source/Z-UPSTREAM-LICENSE.txt'), 'utf8'),
  embeddedSoftwareNotices: await readFile(join(project, 'public/THIRD_PARTY_NOTICES.txt'), 'utf8'),
};
const js = await readFile(join(project, 'build-offline/app.js'), 'utf8');
const cssNames = (await readdir(join(project, 'build-offline'))).filter(n => n.endsWith('.css'));
const css = (await Promise.all(cssNames.map(n => readFile(join(project, 'build-offline', n), 'utf8')))).join('\n');
const data = JSON.stringify(embedded).replace(/</g, '\\u003c');
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#112e34"><title>麻醉解剖研习室 · 肌间沟与腋路（离线版）</title><style>${css}</style></head><body><div id="root"></div><script id="anatomy-data" type="application/json">${data}</script><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
const file = join(output, '腋路臂丛研习室-离线版.html');
await writeFile(file, html);
const { version } = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
const aliasName = `麻醉解剖双入路切面联动-v${version}.html`;
await writeFile(join(output, aliasName), html);
const hash = createHash('sha256').update(html).digest('hex');
await writeFile(join(output, '离线文件SHA256.txt'), `${hash}  腋路臂丛研习室-离线版.html\n${hash}  ${aliasName}\n`);
console.log(JSON.stringify({ file, bytes: Buffer.byteLength(html), sha256: hash, structures: structures.length, interscaleneStructures: interscaleneStructures.length, embeddedLicenses: true, embeddedMedia: Object.keys(embeddedMedia).length, embeddedUltrasoundAttribution: true, embeddedReferenceItems: referenceAtlas.items.length }, null, 2));
