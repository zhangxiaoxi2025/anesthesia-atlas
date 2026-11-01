import { intersectGeometryPlane } from './model-utils.js';

export const SLICE_SIZE = { width: .10, depth: .08 };
export const SLICE_LEVELS = [1.45, 1.468, 1.485];
export const INTERSCALENE_COLORS = { nerve: '#d9a33a', muscle: '#bf8f7f', artery: '#ca6658', vein: '#648eaf', bone: '#aaab9c' };
export function sliceFrame(level = 1.468) {
  return { center: [-.038, level, -.012], u: [0, 0, 1], v: [1, 0, 0], n: [0, 1, 0] };
}
// Liang-Barsky clipping preserves the actual source triangle/plane intersection.
export function clipSection(segment, width = SLICE_SIZE.width, depth = SLICE_SIZE.depth) {
  const [a,b] = segment, dx=b[0]-a[0], dy=b[1]-a[1];
  let lo=0, hi=1;
  const p=[-dx,dx,-dy,dy], q=[a[0]+width/2,width/2-a[0],a[1]+depth/2,depth/2-a[1]];
  for(let i=0;i<4;i++) {
    if(Math.abs(p[i])<1e-12) { if(q[i]<0) return null; }
    else { const r=q[i]/p[i]; if(p[i]<0) lo=Math.max(lo,r); else hi=Math.min(hi,r); if(lo>hi) return null; }
  }
  return [[a[0]+lo*dx,a[1]+lo*dy],[a[0]+hi*dx,a[1]+hi*dy]];
}
export function sourceSections(anatomy, level) {
  if(!anatomy) return [];
  const frame=sliceFrame(level);
  return anatomy.structures.map(s=>({...s, segments:intersectGeometryPlane(s.geometry,frame).map(segment=>clipSection(segment)).filter(Boolean)})).filter(s=>s.segments.length);
}
export function animationStage(progress) { return progress < .18 ? 0 : progress < .5 ? 1 : progress < .78 ? 2 : 3; }
export function smoothRange(value, start, end) { const t=Math.max(0,Math.min(1,(value-start)/(end-start))); return t*t*(3-2*t); }
