import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ROOT_ANNOTATION_CANDIDATE as candidate,buildRootCandidateOverlay,canonicalRootGeometry,verifyRootCandidateSource} from '../src/root-annotation.js';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const manifest=await readJson('../public/interscalene/manifest.json');
const files=await Promise.all(['brachial-roots','middle-trunk','superior-trunk','inferior-trunk'].map(async id=>{
  const structure=manifest.structures.find(s=>s.id===id),bytes=await readFile(new URL('../public'+structure.path,import.meta.url));
  return {structure,bytes,geometry:JSON.parse(bytes)};
}));
const anatomy={...manifest,structures:files.map(({structure,geometry})=>({...structure,geometry}))};
const source=anatomy.structures.find(s=>s.id==='brachial-roots');
const digest=value=>createHash('sha256').update(value).digest('hex');

// Independent graph oracle: breadth-first traversal of exact-coordinate vertex
// neighbours. Production code only applies a static face mask; it does not run
// this component traversal or select a component by an inferred clinical name.
function sourceComponents(geometry){
  const keys=new Map(),vertexKeys=[];
  for(let i=0;i<geometry.positions.length;i+=3){const key=geometry.positions.slice(i,i+3).join(',');if(!keys.has(key))keys.set(key,keys.size);vertexKeys.push(keys.get(key));}
  const neighbours=Array.from({length:keys.size},()=>new Set());
  for(let i=0;i<geometry.indices.length;i+=3){const t=geometry.indices.slice(i,i+3).map(v=>vertexKeys[v]);for(let a=0;a<3;a++)for(let b=0;b<3;b++)if(a!==b)neighbours[t[a]].add(t[b]);}
  const unseen=new Set(neighbours.map((_,i)=>i)),components=[];
  while(unseen.size){const seed=unseen.values().next().value,seen=new Set([seed]),queue=[seed];unseen.delete(seed);
    for(let cursor=0;cursor<queue.length;cursor++)for(const next of neighbours[queue[cursor]])if(unseen.delete(next)){seen.add(next);queue.push(next);}
    const vertices=vertexKeys.flatMap((key,i)=>seen.has(key)?[i]:[]);
    const faces=Array.from({length:geometry.indices.length/3},(_,i)=>i).filter(t=>geometry.indices.slice(t*3,t*3+3).every(v=>seen.has(vertexKeys[v])));
    components.push({vertices,faces,maxY:Math.max(...vertices.map(v=>geometry.positions[v*3+1]))});
  }
  return components.sort((a,b)=>b.maxY-a.maxY);
}

test('the candidate mask is exactly the fifth source component by maximum Y, with every original triangle retained once',()=>{
  const components=sourceComponents(source.geometry);
  assert.equal(components.length,7);
  assert.deepEqual(candidate.triangleIndices,components[4].faces);
  assert.equal(candidate.vertexCount,components[4].vertices.length);
  assert.equal(candidate.vertexCount,300);assert.equal(candidate.triangleCount,576);
  assert.equal(new Set(candidate.triangleIndices).size,576);
  const overlay=buildRootCandidateOverlay(anatomy);
  assert.equal(overlay.status,'ready');
  assert.deepEqual(overlay.geometry.indices,components[4].faces.flatMap(t=>source.geometry.indices.slice(t*3,t*3+3)));
  for(const side of ['min','max'])for(let axis=0;axis<3;axis++){
    const expected=Math[side](...components[4].vertices.map(v=>source.geometry.positions[v*3+axis]));
    assert.equal(overlay.bounds[side][axis],expected);
  }
});

test('overlay extraction shares untouched source positions and normals and works with frozen source buffers',async()=>{
  const before=anatomy.structures.map(s=>digest(JSON.stringify(s.geometry)));
  anatomy.structures.forEach(s=>{Object.values(s.geometry).forEach(Object.freeze);Object.freeze(s.geometry);});
  const first=buildRootCandidateOverlay(anatomy),second=buildRootCandidateOverlay(anatomy);
  assert.equal(first.geometry.positions,source.geometry.positions);
  assert.equal(first.geometry.normals,source.geometry.normals);
  assert.notEqual(first.geometry.indices,source.geometry.indices);
  assert.notEqual(first.geometry.indices,second.geometry.indices);
  assert.deepEqual(first.geometry.indices,second.geometry.indices);
  assert((await verifyRootCandidateSource(anatomy)).ok);
  anatomy.structures.forEach((s,i)=>assert.equal(digest(JSON.stringify(s.geometry)),before[i]));
});

test('raw provenance and explicit canonical digests both match current files, independently of object property order',async()=>{
  const rootsFile=files.find(f=>f.structure.id==='brachial-roots'),referenceFile=files.find(f=>f.structure.id==='middle-trunk');
  assert.equal(digest(rootsFile.bytes),candidate.sourceGeometrySha256);
  assert.equal(digest(referenceFile.bytes),candidate.referenceGeometrySha256);
  for(const [g,expected] of [[rootsFile.geometry,candidate.sourceGeometryCanonicalSha256],[referenceFile.geometry,candidate.referenceGeometryCanonicalSha256]]){
    const independent=JSON.stringify({positions:g.positions,indices:g.indices,normals:g.normals??null});
    assert.equal(digest(independent),expected);
    assert.equal(canonicalRootGeometry({normals:g.normals,indices:g.indices,positions:g.positions}),independent);
  }
  const reordered={...anatomy,structures:anatomy.structures.map(s=>({...s,geometry:{normals:s.geometry.normals,indices:s.geometry.indices,positions:s.geometry.positions}}))};
  const checked=await verifyRootCandidateSource(reordered);
  assert.equal(checked.ok,true);assert.equal(checked.actual,candidate.sourceGeometryCanonicalSha256);
  assert.equal(checked.referenceActual,candidate.referenceGeometryCanonicalSha256);
});

test('independent exhaustive nearest-vertex check reproduces the middle-trunk point pair without assigning root identity',()=>{
  const overlay=buildRootCandidateOverlay(anatomy),vertices=[...new Set(overlay.geometry.indices)],middle=anatomy.structures.find(s=>s.id==='middle-trunk').geometry;
  let minimum=Infinity,pair;
  for(const v of vertices)for(let w=0;w<middle.positions.length/3;w++){
    const a=source.geometry.positions.slice(v*3,v*3+3),b=middle.positions.slice(w*3,w*3+3),distance=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])*1000;
    if(distance<minimum){minimum=distance;pair={v,w,a,b};}
  }
  assert(Math.abs(minimum-candidate.nearestReference.distanceMm)<1e-10);
  assert.equal(pair.v,candidate.nearestReference.sourceVertexIndex);assert.equal(pair.w,candidate.nearestReference.referenceVertexIndex);
  assert.deepEqual(pair.a,candidate.nearestReference.sourcePoint);assert.deepEqual(pair.b,candidate.nearestReference.referencePoint);
  assert.equal(overlay.identityStatus,'unconfirmed');assert.equal(candidate.reviewStatus,'unreviewed');
  assert.equal(candidate.label,'中干近端候选走行');
  assert(!('rootName' in candidate));assert(!('rootLevel' in candidate));assert(!('rootName' in overlay));
  assert(!/\b(?:C[4-8]|T[12])\b/.test(candidate.label));
  assert.match(candidate.nearestReference.method,/not exact surface distance or connectivity/);
});

test('bad source identity, missing digests and invalid masks fail closed before overlay rendering',()=>{
  const cases=[
    [{...anatomy,source:{...anatomy.source,commit:'different'}},candidate,'source-identity-mismatch'],
    [{...anatomy,structures:[]},candidate,'missing-source'],
    [anatomy,{...candidate,sourceGeometryCanonicalSha256:null},'source-hash-metadata-mismatch'],
    [anatomy,{...candidate,sourceId:'FBX:0'},'source-identity-mismatch'],
    [anatomy,{...candidate,triangleIndices:[]},'invalid-triangle-mask'],
    [anatomy,{...candidate,triangleIndices:[...candidate.triangleIndices.slice(0,-1),candidate.triangleIndices[0]]},'invalid-triangle-mask'],
    [anatomy,{...candidate,triangleIndices:[...candidate.triangleIndices.slice(0,-1),candidate.sourceTriangleCount]},'invalid-triangle-mask'],
    [anatomy,{...candidate,vertexCount:candidate.vertexCount+1},'candidate-count-mismatch'],
    [anatomy,{...candidate,bounds:{...candidate.bounds,min:[0,0,0]}},'candidate-bounds-mismatch'],
    [anatomy,{...candidate,nearestReference:{...candidate.nearestReference,distanceMm:0}},'candidate-point-mismatch'],
    [anatomy,{...candidate,identityStatus:'confirmed'},'invalid-candidate'],
  ];
  for(const [input,mask,code] of cases){const result=buildRootCandidateOverlay(input,mask);assert.equal(result.status,'unavailable');assert.equal(result.code,code);assert(!result.geometry);}
});

test('actual source or reference buffer changes are rejected even when manifest hashes and counts stay unchanged',async()=>{
  for(const id of ['brachial-roots','middle-trunk']){
    const changed=structuredClone(anatomy),structure=changed.structures.find(s=>s.id===id);
    structure.geometry.normals[0]+=.000001;
    assert.equal(buildRootCandidateOverlay(changed).status,'ready','synchronous stage only validates metadata, never pretends it hashed actual buffers');
    const result=await verifyRootCandidateSource(changed);
    assert.equal(result.ok,false);assert.equal(result.code,'actual-geometry-hash-mismatch');
  }
});

test('unavailable or failed SHA support cannot report a verified candidate',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  try{
    Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});
    assert.equal((await verifyRootCandidateSource(anatomy)).code,'sha256-unavailable');
    Object.defineProperty(globalThis,'crypto',{value:{subtle:{digest:async()=>{throw new Error('simulated digest failure');}}},configurable:true});
    const failed=await verifyRootCandidateSource(anatomy);assert.equal(failed.ok,false);assert.equal(failed.code,'sha256-failed');
  }finally{if(original)Object.defineProperty(globalThis,'crypto',original);else delete globalThis.crypto;}
});
