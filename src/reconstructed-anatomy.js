import fixedPlane from './data/fixed-root-plane.json' with { type: 'json' };
import supplement from './data/reconstructed-plexus.json' with { type: 'json' };
export const reconstructionSource = supplement;
/** Derived copy only: source anatomy arrays are never mutated or spliced. */
export function makeReferenceReconstruction(base) {
  if (!base) return null;
  return { ...base, reconstruction: true, reconstructionCredit: supplement.credit,
    structures: [...base.structures.filter(s => s.kind !== 'nerve'), ...supplement.structures] };
}
export function referenceLevel(id) {
  const s = supplement.structures.find(s => s.id === id);
  if (!s) return null;
  const ys = s.geometry.positions.filter((_, i) => i % 3 === 1);
  return (Math.min(...ys) + Math.max(...ys)) / 2;
}

/** Fixed geometric comparison plane; display compactness is not clinical optimality. */
export function fixedRootComparisonFrame() {
  const f=fixedPlane.frame;
  return {...f,center:[...f.center],u:[...f.u],v:[...f.v],n:[...f.n],status:'single model comparison plane; not clinical probe registration'};
}

export const ULTRASOUND_COMPARISON_IDS = Object.freeze(['c5','c6','c7','anterior-scalene','middle-scalene','sternocleidomastoid','vertebral-artery']);
export function ultrasoundComparisonSections(sections){ return sections.filter(s=>ULTRASOUND_COMPARISON_IDS.includes(s.id)); }
