import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { intersectGeometry, intersectGeometryPlane } from '../src/model-utils.js';
import { animationStage, clipSection, sliceFrame, SLICE_SIZE, smoothRange, sourceSections } from '../src/interscalene-utils.js';

const readJson = async file => JSON.parse(await readFile(new URL(file, import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = await readJson('../public/interscalene/manifest.json');
const files = await Promise.all(manifest.structures.map(async structure => {
  const bytes = await readFile(new URL(`../public${structure.path}`, import.meta.url));
  return { structure, bytes, geometry: JSON.parse(bytes) };
}));
const anatomy = { ...manifest, structures: files.map(({ structure, geometry }) => ({ ...structure, geometry })) };
const sono = await readJson('../src/data/interscalene-ultrasound.json');
const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const pointClose = (a, b) => { assert.equal(a.length, b.length); a.forEach((v, i) => close(v, b[i])); };

// Independent boundary-intersection oracle: gather endpoints and rectangle-edge
// crossings, then order by the original segment parameter. Not Liang-Barsky.
function boundaryClip([a, b], width, depth) {
  const dx = b[0] - a[0], dy = b[1] - a[1], candidates = [];
  const inside = p => Math.abs(p[0]) <= width / 2 + 1e-12 && Math.abs(p[1]) <= depth / 2 + 1e-12;
  if (inside(a)) candidates.push({ t: 0, point: a });
  if (inside(b)) candidates.push({ t: 1, point: b });
  for (const x of [-width / 2, width / 2]) {
    if (Math.abs(dx) < 1e-12) continue;
    const t = (x - a[0]) / dx, point = [x, a[1] + t * dy];
    if (t >= 0 && t <= 1 && inside(point)) candidates.push({ t, point });
  }
  for (const y of [-depth / 2, depth / 2]) {
    if (Math.abs(dy) < 1e-12) continue;
    const t = (y - a[1]) / dy, point = [a[0] + t * dx, y];
    if (t >= 0 && t <= 1 && inside(point)) candidates.push({ t, point });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.t - b.t);
  return [candidates[0].point, candidates.at(-1).point];
}

test('the 35 neck assets retain pinned source hashes and do not invent individually identified roots or phrenic nerve', () => {
  assert.equal(manifest.structures.length, 35);
  assert.equal(manifest.source.commit, '6c7f9016bd5899ac8edafd31b9900c151df42ed6');
  assert.equal(manifest.coordinateSystem.units, 'm');
  assert.match(manifest.coordinateSystem.pose, /neutral/);
  for (const { structure, bytes, geometry } of files) {
    assert.equal(hash(bytes), structure.sha256, `${structure.id} changed after source extraction`);
    assert.equal(structure.provenanceStatus, 'source-mesh-extracted');
    assert.equal(geometry.positions.length / 3, structure.vertexCount);
    assert.equal(geometry.indices.length / 3, structure.triangleCount);
    assert(geometry.indices.every(i => Number.isInteger(i) && i >= 0 && i < structure.vertexCount));
  }
  const roots = manifest.structures.find(s => s.id === 'brachial-roots');
  assert.equal(roots.sourceId, 'FBX:680949521');
  assert.equal(roots.sha256, 'd682b44671d16a32f908b67a2626c53cfb2360484839a71c0e4808160b92219d');
  assert.equal(roots.topologyAudit.components.length, 7);
  assert.equal(manifest.structures.find(s => s.id === 'dorsal-scapular-nerve').sourceId, 'FBX:582201452');
  assert.equal(manifest.structures.find(s => s.id === 'dorsal-scapular-nerve').sha256, '7c45928611505d5c96155e61e6eeae53bb68ed3baa8eb5b17280fe452e3d6141');
  for (const id of ['c5-ventral-ramus','c6-ventral-ramus','c7-ventral-ramus','phrenic-nerve']) {
    assert(!manifest.structures.some(s => s.id === id));
    assert(manifest.missingStructures.some(s => s.id === id && s.replacement === null));
  }
});

test('the local frame points right/anterior and down/medial, and source-Y intersections equal the clipped plane projection without mutating source', () => {
  const original = files.map(({ geometry }) => hash(JSON.stringify(geometry)));
  for (const { geometry } of files) {
    Object.freeze(geometry.positions); Object.freeze(geometry.normals); Object.freeze(geometry.indices); Object.freeze(geometry);
  }
  assert.deepEqual(sliceFrame().u, [0,0,1]);
  assert.deepEqual(sliceFrame().v, [1,0,0]);
  assert.deepEqual(sliceFrame().n, [0,1,0]);
  assert.equal(manifest.focus.plane.width, SLICE_SIZE.width);
  assert.equal(manifest.focus.plane.depth, SLICE_SIZE.depth);
  for (const level of [1.435, 1.45, 1.468, 1.485, 1.505]) {
    const frame = sliceFrame(level), actual = sourceSections(anatomy, level);
    for (const { structure, geometry } of files) {
      const raw = intersectGeometry(geometry, level);
      const expected = raw.map(segment => segment.map(([x,z]) => [z-frame.center[2],x-frame.center[0]]))
        .map(segment => boundaryClip(segment, SLICE_SIZE.width, SLICE_SIZE.depth)).filter(Boolean);
      const generic = intersectGeometryPlane(geometry, frame);
      assert.equal(generic.length, raw.length);
      const result = actual.find(s => s.id === structure.id)?.segments ?? [];
      assert.equal(result.length, expected.length, `${structure.id} differs at Y=${level}`);
      result.forEach((segment, i) => segment.forEach((point, j) => pointClose(point, expected[i][j])));
    }
  }
  const defaultIds = sourceSections(anatomy, 1.468).map(s => s.id);
  for (const id of ['brachial-roots','anterior-scalene','middle-scalene','sternocleidomastoid']) assert(defaultIds.includes(id));
  for (const id of ['superior-trunk','middle-trunk','inferior-trunk']) assert(!defaultIds.includes(id), 'do not move a lower source structure into the default plane');
  files.forEach(({ geometry }, i) => assert.equal(hash(JSON.stringify(geometry)), original[i], 'section extraction mutated the source arrays'));
});

test('ROI clipping keeps true crossing segments and boundary contacts while rejecting outside lines', () => {
  const cases = [
    [[[-.01,-.02],[.02,.03]],[[-.01,-.02],[.02,.03]]],
    [[[-.1,0],[.1,0]],[[-.05,0],[.05,0]]],
    [[[-.1,.06],[.1,.06]],null],
    [[[-.1,-.1],[.1,.1]],[[-.04,-.04],[.04,.04]]],
    [[[.05,-.1],[.05,.1]],[[.05,-.04],[.05,.04]]],
    [[[0,0],[0,0]],[[0,0],[0,0]]],
    [[[.1,.1],[.1,.1]],null],
  ];
  for (const [segment, expected] of cases) {
    const clipped = clipSection(segment, .10, .08);
    if (expected === null) assert.equal(clipped, null);
    else clipped.forEach((point, i) => pointClose(point, expected[i]));
  }
  let seed = 0x5ca1e;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let i = 0; i < 2000; i++) {
    const segment = Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => (random()-.5)*.4));
    const expected = boundaryClip(segment, .10, .08), actual = clipSection(segment, .10, .08);
    assert.equal(actual === null, expected === null);
    if (actual) actual.forEach((point, j) => pointClose(point, expected[j]));
  }
});

test('the four animation stages have stable boundaries and translation/rotation easing remains bounded and monotone', () => {
  assert.deepEqual([0,.179999,.18,.499999,.5,.779999,.78,1].map(animationStage), [0,0,1,1,2,2,3,3]);
  for (const [start,end] of [[.12,.52],[.35,.75]]) {
    assert.equal(smoothRange(0,start,end),0); assert.equal(smoothRange(1,start,end),1);
    close(smoothRange((start+end)/2,start,end),.5);
    let previous = 0;
    for (let i=0;i<=1000;i++) {
      const value = smoothRange(i/1000,start,end);
      assert(value >= previous && value >= 0 && value <= 1); previous=value;
    }
  }
});

test('neck loading succeeds independently of failed axillary assets, and a failed neck mesh cannot gate the reference media URL', async t => {
  const priorDocument = globalThis.document, priorFetch = globalThis.fetch;
  t.after(() => { globalThis.document=priorDocument; globalThis.fetch=priorFetch; });
  globalThis.document={ getElementById: () => null };
  const byPath=new Map(files.map(({structure,geometry})=>[structure.path,geometry]));
  let missingNeckMesh=false;
  globalThis.fetch=async url=>{
    if(url==='/models/manifest.json') return {ok:false,status:404};
    if(url==='/interscalene/manifest.json') return {ok:true,json:async()=>manifest};
    if(byPath.has(url) && !(missingNeckMesh&&url.endsWith('/brachial-roots.json'))) return {ok:true,json:async()=>byPath.get(url)};
    return {ok:false,status:404};
  };
  const loader=await import('../src/model-utils.js?interscalene-test-http');
  const results=await Promise.allSettled([loader.loadAnatomy(),loader.loadInterscaleneAnatomy()]);
  assert.equal(results[0].status,'rejected'); assert.equal(results[1].status,'fulfilled');
  assert.equal(results[1].value.structures.length,35);
  missingNeckMesh=true;
  assert.equal(loader.referenceMediaUrl(sono.path),sono.path);
  await assert.rejects(loader.loadInterscaleneAnatomy(),/404/);
  assert.equal(loader.referenceMediaUrl(sono.path),sono.path);
});

test('offline neck geometry and real ultrasound share one embedded parse without any HTTP request', async t => {
  const priorDocument = globalThis.document, priorFetch = globalThis.fetch;
  t.after(() => { globalThis.document=priorDocument; globalThis.fetch=priorFetch; });
  const image=await readFile(new URL(`../public${sono.path}`,import.meta.url));
  const media=`data:image/jpeg;base64,${image.toString('base64')}`;
  const payload={structures:[],embeddedInterscalene:anatomy,embeddedMedia:{[sono.path]:media}};
  let reads=0;
  globalThis.document={ getElementById: id => {assert.equal(id,'anatomy-data');reads++;return{textContent:JSON.stringify(payload)};} };
  globalThis.fetch=async()=>{throw new Error('offline source loading attempted HTTP');};
  const loader=await import('../src/model-utils.js?interscalene-test-offline');
  assert.equal(loader.referenceMediaUrl(sono.path),media);
  const neck=await loader.loadInterscaleneAnatomy(), again=await loader.loadInterscaleneAnatomy();
  assert.equal(neck,again); assert.equal(neck.structures.length,35);
  const base=await loader.loadAnatomy(); assert.equal(base.embeddedInterscalene,neck);
  assert.equal(reads,1);
});

test('the independent ultrasound remains the unchanged Kumar Figure 1 with bounded display crops and explicit original-source limitations', async () => {
  const image=await readFile(new URL(`../public${sono.path}`,import.meta.url));
  const xml=await readFile(new URL(`../public${sono.license.evidencePath}`,import.meta.url));
  assert.equal(hash(image),sono.sha256); assert.equal(image.length,sono.bytes);
  assert.equal(hash(xml),sono.license.xmlSha256);
  assert.equal(sono.source.pmcid,'PMC10801454'); assert.equal(sono.license.id,'CC-BY-NC-SA-4.0');
  assert(xml.toString().includes(sono.license.url));
  assert(xml.toString().includes('AIT-55-52229-g001.jpg'));
  assert.match(sono.orientationNote,/未核实/);
  assert(sono.limitations.some(text=>/不做.*空间配准/.test(text)));
  assert(sono.limitations.some(text=>/不据此.*C5.*C6.*C7/.test(text)));
  assert.deepEqual(sono.panels.map(panel=>panel.id),['a','b','c']);
  for(const panel of sono.panels) {
    const [left,top,right,bottom]=panel.crop;
    assert(left>=0&&top>=0&&right>left&&bottom>top&&right<=sono.width&&bottom<=sono.height);
    assert.match(panel.description,/原作者/);
  }
});
