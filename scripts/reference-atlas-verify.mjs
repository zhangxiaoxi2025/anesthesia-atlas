import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const data = JSON.parse(await readFile(join(root, 'src/data/reference-atlas.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const local = path => join(root, 'public', path);
const pinned = {
  'han2014-orientation': { width: 647, height: 461, bytes: 51227, sha256: '43ff11bd7e776f642c0b82867de6c7c73a47d24a9c3c17f109ebb6d4185ead55' },
  'han2014-vascular-variants': { width: 683, height: 458, bytes: 84179, sha256: 'c8bb24732f83cecfb6cc38819abff6da5af8b225694ed047a3820908d420445f' },
};
const htmlPath = '/reference-atlas/han2014/source-article.html';
const htmlSha = '8d2f7c71a651f285745ab11f6a392648610ac103b32b841df98a337695cffbbe';
const htmlBytes = await readFile(local(htmlPath));
assert.equal(sha(htmlBytes), htmlSha, 'official article snapshot changed');
const html = htmlBytes.toString('utf8');
for (const text of ['10.4097/kjae.2014.67.5.310', 'http://creativecommons.org/licenses/by-nc/3.0/', 'permits unrestricted non-commercial use', 'provided the original work is properly cited.', 'F1-kjae-67-310', 'F4-kjae-67-310', 'multiple axillary veins', 'double axillary arteries']) {
  assert.ok(html.includes(text), 'missing source/license/caption evidence: ' + text);
}

// Parse only the JPEG header; no image decoder installation is required.
function jpegSize(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'expected JPEG SOI');
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let p = 2;
  while (p < bytes.length) {
    assert.equal(bytes[p++], 0xff, 'invalid JPEG marker');
    while (bytes[p] === 0xff) p++;
    const marker = bytes[p++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(p);
    assert.ok(length >= 2 && p + length <= bytes.length, 'invalid JPEG segment length');
    if (sof.has(marker)) return { height: bytes.readUInt16BE(p + 3), width: bytes.readUInt16BE(p + 5) };
    p += length;
  }
  throw new Error('JPEG dimensions not found');
}

assert.equal(data.schemaVersion, 1);
assert.deepEqual(data.items.map(i => i.id).sort(), Object.keys(pinned).sort());
const images = [];
for (const item of data.items) {
  assert.ok(item.path.startsWith('/reference-atlas/han2014/') && !item.path.includes('..'));
  assert.equal(item.source.doi, '10.4097/kjae.2014.67.5.310');
  assert.equal(item.source.htmlPath, htmlPath);
  assert.equal(item.source.htmlSha256, htmlSha);
  assert.ok(item.source.imageUrl.startsWith('https://ekja.org/upload//thumbnails/'));
  assert.ok(html.includes(new URL(item.source.imageUrl).pathname), 'image URL must occur in official article');
  assert.equal(item.license.id, 'CC-BY-NC-3.0');
  assert.equal(item.license.url, 'https://creativecommons.org/licenses/by-nc/3.0/');
  assert.equal(item.license.verified, true);
  assert.equal(item.license.evidenceHtmlPath, htmlPath);
  assert.ok(item.license.attribution.includes('Han JH') && item.license.attribution.includes(item.source.doi));
  const evidence = JSON.parse(await readFile(local(item.license.evidencePath), 'utf8'));
  assert.equal(evidence.localHtmlSha256, htmlSha);
  assert.equal(evidence.licenseId, item.license.id);
  assert.equal(evidence.licenseUrl, item.license.url);
  const bytes = await readFile(local(item.path)), dimensions = jpegSize(bytes), hash = sha(bytes);
  assert.equal(hash, item.sha256);
  assert.equal(hash, pinned[item.id].sha256, 'figure differs from manually viewed original');
  assert.equal(bytes.length, item.bytes);
  assert.equal(bytes.length, pinned[item.id].bytes);
  assert.deepEqual(dimensions, { width: item.width, height: item.height });
  assert.deepEqual(dimensions, { width: pinned[item.id].width, height: pinned[item.id].height });
  assert.equal(item.mimeType, 'image/jpeg');
  assert.equal(item.visualReview.status, 'reviewed-original-pixels');
  assert.ok(item.orientationNote && item.limitations.length >= 3);
  images.push({ id: item.id, path: item.path, ...dimensions, bytes: bytes.length, sha256: hash, license: item.license.id });
}
assert.deepEqual(data.externalReferences.map(x => x.id).sort(), ['hadzic-chapter-32e', 'nysora-axillary-reference']);
for (const ref of data.externalReferences) {
  assert.ok(ref.type.endsWith('external-only'));
  assert.ok(ref.url.startsWith('https://'));
  assert.equal(ref.path, undefined, 'restricted reference must not have a copied local asset');
  for (const image of ref.images || []) {
    assert.ok(image.url.startsWith('https://www.nysora.com/'));
    assert.equal(image.path, undefined, 'NYSORA image must remain a link');
  }
}
const result = {
  status: 'PASS_REFERENCE_ATLAS_V03_SOURCE_INTEGRITY',
  images, officialArticleSha256: htmlSha,
  externalReferences: data.externalReferences.length,
  boundary: 'Verifies the retained official source/license snapshot, original JPEG bytes/dimensions and link-only restricted references. Visual identity was separately checked with view_image. Does not certify clinical interpretation, patient-side/probe-marker orientation, same-patient registration or a native salute-pose 3D asset.',
};
await writeFile(join(root, 'docs/reference-atlas-v03-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
