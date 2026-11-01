import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeReferenceReconstruction, referenceLevel, reconstructionSource, fixedRootComparisonFrame, ULTRASOUND_COMPARISON_IDS, ultrasoundComparisonSections } from '../src/reconstructed-anatomy.js';
import { buildWorkbenchFrame } from '../src/workbench-frame-state.js';
import { obliqueSections } from '../src/oblique-slice-utils.js';
const manifest = JSON.parse(fs.readFileSync(new URL('../public/interscalene/manifest.json',import.meta.url)));
const base = { ...manifest, structures: manifest.structures.map(s=>({...s,geometry:JSON.parse(fs.readFileSync(new URL('../public'+s.path,import.meta.url)))})) };
test('reference anatomy contains distinct roots; removes competing old nerves; leaves base byte-equivalent',()=>{
 const before=JSON.stringify(base), result=makeReferenceReconstruction(base);
 assert.equal(JSON.stringify(base),before);assert.equal(result.reconstruction,true);
 for(const id of ['c5','c6','c7','c8','t1','superior-trunk','middle-trunk','inferior-trunk'])assert.equal(result.structures.filter(s=>s.id===id).length,1);
 assert.ok(!result.structures.some(s=>s.id==='brachial-roots'));
 for(const id of ['anterior-scalene','middle-scalene','vertebral-artery'])assert.equal(result.structures.find(s=>s.id===id),base.structures.find(s=>s.id===id));
});
test('each source-named neural mesh intersects its auto-selected real oblique plane',()=>{
 const result=makeReferenceReconstruction(base);
 for(const s of reconstructionSource.structures){
  const level=referenceLevel(s.id);assert.ok(level>1.36&&level<1.495);
  assert.ok(s.geometry.positions.every(Number.isFinite));
  const {frame}=buildWorkbenchFrame({anatomy:result,route:'interscalene',level});
  assert.ok(obliqueSections(result,frame).some(x=>x.id===s.id),s.id+' absent from selected cut');
 }
});

test('fixed comparison plane has real C5 C6 C7 contours simultaneously',()=>{
 const frame=fixedRootComparisonFrame();const result=makeReferenceReconstruction(base);const sections=obliqueSections(result,frame);
 for(const id of ['c5','c6','c7','anterior-scalene','middle-scalene','vertebral-artery'])assert.ok(sections.some(s=>s.id===id),id);
 const before=JSON.stringify(frame);for(const id of ['c5','c6','c7']){assert.ok(result.structures.some(s=>s.id===id));assert.equal(JSON.stringify(frame),before);}
});

test('fixed plane retains v080 viewing side and screen-right direction',()=>{
 const f=fixedRootComparisonFrame();const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
 assert.ok(dot(f.n,[0,-.917634005137,-.397426512221])>.998);
 assert.ok(dot(f.u,[0,.397426512221,-.917634005137])>.998);
});

test('ultrasound comparison contains exactly seven source-labelled structures and real contours',()=>{
 const result=makeReferenceReconstruction(base);const sections=ultrasoundComparisonSections(obliqueSections(result,fixedRootComparisonFrame()));
 assert.deepEqual(sections.map(s=>s.id).sort(),[...ULTRASOUND_COMPARISON_IDS].sort());
 const hotspots=JSON.parse(fs.readFileSync(new URL('../src/data/plexus-ultrasound-hotspots.json',import.meta.url)));const panel=hotspots.panels.b;
 assert.deepEqual([...panel.targets,...panel.comparisonTargets].map(x=>x.id).sort(),[...ULTRASOUND_COMPARISON_IDS].sort());
 for(const item of [...panel.targets,...panel.comparisonTargets]){const [x,y]=item.imagePoint;assert.ok(x>=panel.crop[0]&&x<panel.crop[2]&&y>=panel.crop[1]&&y<panel.crop[3]);}
 assert.ok(!sections.some(s=>s.kind==='bone'||s.kind==='vein'));
});
