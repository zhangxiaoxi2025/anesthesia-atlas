export const NERVE_IDS = ['median', 'ulnar', 'radial', 'musculocutaneous'];
export const COLORS = { median: '#d9a33a', ulnar: '#b674d5', radial: '#429ec0', musculocutaneous: '#6baf82', nerve: '#b9ab86', artery: '#d76d61', vein: '#688eb5', muscle: '#ce9c8f', bone: '#ece4d5', skin: '#baa58d' };

export function nerveIdFor(structure) {
  if (structure.kind !== 'nerve') return null;
  const identity = structure.parentId || structure.nerveId || structure.id;
  return NERVE_IDS.find(id => identity === id || identity?.startsWith(`${id}-`) || identity?.startsWith(`${id}_`)) || null;
}

export function structureVisible(structure, layers, isolated, selected) {
  const nerve = nerveIdFor(structure);
  if (isolated) return nerve === selected;
  return layers[structure.kind] !== false;
}

// Intersections come from source mesh triangles, not a fabricated ultrasound image.
export function intersectGeometry(geometry, level) {
  const p = geometry.positions;
  const indices = geometry.indices;
  const segments = [];
  const count = indices?.length || p.length / 3;
  for (let i = 0; i < count; i += 3) {
    const ids = indices ? [indices[i], indices[i + 1], indices[i + 2]] : [i, i + 1, i + 2];
    const v = ids.map(j => [p[j * 3], p[j * 3 + 1], p[j * 3 + 2]]);
    if (v.every(q => q[1] < level) || v.every(q => q[1] > level)) continue;
    const points = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      if ((a[1] < level) === (b[1] < level) || Math.abs(b[1] - a[1]) < 1e-10) continue;
      const t = (level - a[1]) / (b[1] - a[1]);
      points.push([a[0] + t * (b[0] - a[0]), a[2] + t * (b[2] - a[2])]);
    }
    if (points.length === 2) segments.push(points);
  }
  return segments;
}

// Local probe plane: u = horizontal, v = depth, n = longitudinal normal.
// Outputs metric coordinates in that plane; never an ultrasound simulation.
export function intersectGeometryPlane(geometry, frame) {
  const p = geometry.positions, indices = geometry.indices, segments = [];
  const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const local = q => { const d = q.map((x,i) => x-frame.center[i]); return [dot(d,frame.u),dot(d,frame.v)]; };
  const count = indices?.length || p.length / 3;
  for (let i=0; i<count; i+=3) {
    const ids = indices ? [indices[i],indices[i+1],indices[i+2]] : [i,i+1,i+2];
    const v = ids.map(j => [p[j*3],p[j*3+1],p[j*3+2]]);
    const distances = v.map(q => dot(q.map((x,k) => x-frame.center[k]),frame.n));
    if (distances.every(d=>d<0) || distances.every(d=>d>0)) continue;
    const points=[];
    for (let e=0;e<3;e++) {
      const j=(e+1)%3, a=distances[e], b=distances[j];
      if ((a<0)===(b<0) || Math.abs(a-b)<1e-10) continue;
      const t=a/(a-b); points.push(local(v[e].map((x,k)=>x+t*(v[j][k]-x))));
    }
    if (points.length===2) segments.push(points);
  }
  return segments;
}

// The offline payload is parsed once and shared by media and geometry loading.
// Published figures remain available when an unrelated HTTP mesh fails to load.
let embeddedAnatomy;
function readEmbeddedAnatomy() {
  if (embeddedAnatomy === undefined) {
    const element = document.getElementById('anatomy-data');
    embeddedAnatomy = element ? JSON.parse(element.textContent) : null;
  }
  return embeddedAnatomy;
}

export function referenceMediaUrl(mediaPath) {
  return readEmbeddedAnatomy()?.embeddedMedia?.[mediaPath] || mediaPath;
}

export async function loadInterscaleneAnatomy(signal) {
  const embedded = readEmbeddedAnatomy()?.embeddedInterscalene;
  if (embedded) return embedded;
  const response = await fetch('/interscalene/manifest.json', { signal });
  if (!response.ok) throw new Error(`颈部模型清单加载失败 (${response.status})`);
  const manifest = await response.json();
  const structures = await Promise.all(manifest.structures.map(async s => {
    const result = await fetch(s.path, { signal });
    if (!result.ok) throw new Error(`${s.name} 加载失败 (${result.status})`);
    return { ...s, geometry: await result.json() };
  }));
  return { ...manifest, structures };
}

export async function loadAnatomy(signal) {
  const embedded = readEmbeddedAnatomy();
  if (embedded) return embedded;
  const response = await fetch('/models/manifest.json', { signal });
  if (!response.ok) throw new Error(`模型清单加载失败 (${response.status})`);
  const manifest = await response.json();
  const structures = await Promise.all(manifest.structures.map(async s => {
    const url = s.path.startsWith('/') ? s.path : `/models/${s.path}`;
    const result = await fetch(url, { signal });
    if (!result.ok) throw new Error(`${s.name} 加载失败 (${result.status})`);
    const geometry = await result.json();
    return { ...s, geometry };
  }));
  return { ...manifest, structures };
}
