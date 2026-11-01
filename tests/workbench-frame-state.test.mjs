import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeSourceAnatomy } from '../src/slice-workbench-utils.js';
import { buildWorkbenchFrame, captureWorkbenchFrame, findWorkbenchPlaneForStructure, workbenchModeLabel } from '../src/workbench-frame-state.js';
import { obliqueSections } from '../src/oblique-slice-utils.js';
async function load(path) { const m = JSON.parse(await readFile(new URL(path, import.meta.url))); m.structures = await Promise.all(m.structures.map(async s => ({ ...s, geometry: JSON.parse(await readFile(new URL('../public' + s.path, import.meta.url))) }))); return m; }
const anatomy = mergeSourceAnatomy(await load('../public/interscalene/manifest.json'), await load('../public/models/manifest.json'));
const close = (a,b) => a.forEach((value,i) => assert(Math.abs(value-b[i]) < 1e-10));

test('current-view orientation capture retains the complete actual focused center and moves later by delta', () => {
  const initial = buildWorkbenchFrame({ anatomy, route: 'axillary', level: 1.295 }).frame;
  const captured = captureWorkbenchFrame(initial, { position:[.8,1.4,.4],target:[0,1.5,0],up:[0,1,0] }, 1.295);
  close(captured.frame.center,initial.center);
  const same = buildWorkbenchFrame({ anatomy, route:'axillary',level:1.295,mode:'captured',captured }).frame;
  close(same.center,initial.center);
  const moved = buildWorkbenchFrame({ anatomy, route:'axillary',level:1.300,mode:'captured',captured }).frame;
  close(moved.center,[initial.center[0],initial.center[1]+.005,initial.center[2]]);
});

test('a searched oblique plane includes the selected source after applying the same normal offset and rotation state', () => {
  const options={anatomy,route:'interscalene',level:1.455,normalOffset:30,angles:{yaw:0,pitch:0,roll:0}};
  const hit=findWorkbenchPlaneForStructure(options,'brachial-roots',1.36,1.491);
  assert(hit);
  const final=buildWorkbenchFrame({...options,level:hit.level}).frame;
  close(final.center,hit.frame.center);close(final.n,hit.frame.n);
  const source=anatomy.structures.find(s=>s.id==='brachial-roots');
  assert(obliqueSections({structures:[source]},final).length);
});

test('source-horizontal and bone-axis labels explicitly disclose actual added tilt', () => {
  assert.equal(workbenchModeLabel('horizontal',{yaw:0,pitch:0,roll:30}),'源水平参考');
  assert.match(workbenchModeLabel('horizontal',{yaw:10,pitch:0,roll:0}),/自选斜面/);
  assert.match(workbenchModeLabel('bone-axis',{yaw:0,pitch:-10,roll:0}),/自选斜面/);
  assert.match(workbenchModeLabel('captured',{yaw:0,pitch:0,roll:0}),/观察方向/);
});
