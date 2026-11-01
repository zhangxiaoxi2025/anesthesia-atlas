// Typical root-to-trunk teaching links are concept links, not assignments of
// individual ventral-ramus identities to the merged source mesh.
export const ROOT_TRUNK_COLORS = Object.freeze({
  'superior-trunk': '#2f8a75',
  'middle-trunk': '#397ca8',
  'inferior-trunk': '#a66f44',
});
const ROOT_IDS = Object.freeze(['c5', 'c6', 'c7', 'c8', 't1']);
const TRUNK_IDS = Object.freeze(Object.keys(ROOT_TRUNK_COLORS));
const supported = concept => concept && (ROOT_IDS.includes(concept.id) || TRUNK_IDS.includes(concept.id));
const displayName = concept => concept.name || concept.label || concept.id;

export function getPlexusSelection(id, data) {
  const concepts = Array.isArray(data?.concepts) ? data.concepts : [];
  const find = target => concepts.find(concept => supported(concept) && concept.id === target);
  const concept = find(id) || find(data?.defaultId) || concepts.find(supported) || null;
  if (!concept) return {
    activeId: null, concept: null, highlightConceptIds: [], highlightTrunkIds: [],
    panelId: 'b', ultrasoundTargetId: null, modelStatus: 'unavailable',
    modelMessage: '根与干的教学资料尚未就绪，暂不指定三维结构。',
  };
  const isRoot = ROOT_IDS.includes(concept.id);
  const destinations = isRoot ? concepts.filter(entry =>
    TRUNK_IDS.includes(entry.id) && Array.isArray(entry.rootIds) && entry.rootIds.includes(concept.id),
  ) : [concept];
  const trunk = destinations.length === 1 ? destinations[0] : null;
  const hasNamedTrunk = trunk && trunk.sourceMeshId === trunk.id && TRUNK_IDS.includes(trunk.id);
  const roots = !isRoot && Array.isArray(concept.rootIds) ? concept.rootIds.filter(root => ROOT_IDS.includes(root) && find(root)) : [];
  const highlightConceptIds = isRoot ? [concept.id, ...(trunk ? [trunk.id] : [])] : [...new Set([...roots, concept.id])];
  const panelId = isRoot && ['c5', 'c6', 'c7'].includes(concept.id) ? 'b' : 'c';
  // Panel C labels trunks, not separate C8/T1 anterior rami. Selecting a lower
  // root may show its usual destination, but must never place a root hotspot there.
  const ultrasoundTargetId = isRoot ? panelId === 'b' ? concept.id : null : concept.id;
  let modelStatus, modelMessage;
  if (!hasNamedTrunk) {
    modelStatus = 'unavailable';
    modelMessage = isRoot
      ? `${displayName(concept)}的根本体三维身份尚未核定；典型去向的源具名干暂不可用，不替代为根本体。`
      : `${displayName(concept)}的源具名三维记录暂不可用，暂不指定模型高亮。`;
  } else if (isRoot) {
    modelStatus = 'root-unconfirmed';
    modelMessage = `${displayName(concept)}的根本体三维身份尚未核定；当前三维只高亮典型去向“${displayName(trunk)}”，不是该根本体。`;
    if (panelId === 'c') modelMessage += `图C只用于观察干的去向，不定位${displayName(concept)}本体。`;
  } else {
    modelStatus = 'source-named';
    modelMessage = `${displayName(concept)}已有源具名三维网格；当前高亮该干本身。`;
  }
  return {
    activeId: concept.id, concept, highlightConceptIds,
    highlightTrunkIds: hasNamedTrunk ? [trunk.id] : [],
    panelId, ultrasoundTargetId, modelStatus, modelMessage,
  };
}

