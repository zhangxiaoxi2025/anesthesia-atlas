// This reference names only whole source vertebra meshes that actually intersect
// the current ROI plane. It does not identify a nerve root, interspace, vertebral
// body centre or transverse process, and is independent of display-layer state.
export const VERTEBRAL_IDS = Object.freeze([
  'vertebra-c3', 'vertebra-c4', 'vertebra-c5',
  'vertebra-c6', 'vertebra-c7', 'vertebra-t1',
]);

const EMPTY_LABEL = '当前平面未与已载入颈胸椎相交';
const codeFor = id => id.slice('vertebra-'.length).toUpperCase();

function referenceLabel(ids) {
  if (!ids.length) return EMPTY_LABEL;
  if (ids.every(id => id.startsWith('vertebra-c'))) {
    const numbers = ids.map(id => id.slice('vertebra-c'.length));
    return `第${numbers.join('、')}颈椎（${ids.map(codeFor).join('、')}）`;
  }
  return ids.map(id => {
    const code = codeFor(id), region = code.startsWith('C') ? '颈' : '胸';
    return `第${code.slice(1)}${region}椎（${code}）`;
  }).join('、');
}

export function vertebralReference(sections = []) {
  const structures = VERTEBRAL_IDS.map(id => sections.find(section =>
    section.id === id && Array.isArray(section.segments) && section.segments.length > 0,
  )).filter(Boolean);
  const ids = structures.map(structure => structure.id);
  return { ids, structures, label: referenceLabel(ids) };
}

