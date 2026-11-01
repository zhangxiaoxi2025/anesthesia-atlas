// Label helpers operate on actual clipped intersection segments only.
// Connected display components are geometric groups, never anatomical subdivisions.
export const SECTION_PLOT = Object.freeze({ x: 164, width: 304, scale: 3040, depth: .08 });
const DEFAULT_LAYERS = Object.freeze({});

export function sectionComponents(segments, tolerance = 1e-6) {
  if (!segments?.length) return [];
  const parents = segments.map((_, i) => i), bins = new Map();
  const find = i => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
  const join = (a, b) => { parents[find(a)] = find(b); };
  segments.forEach((segment, index) => segment.forEach(point => {
    const cell = point.map(v => Math.floor(v / tolerance));
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const neighbors = bins.get(`${cell[0] + dx},${cell[1] + dy}`);
      for (const other of neighbors || []) {
        if (Math.hypot(point[0] - other.point[0], point[1] - other.point[1]) <= tolerance) join(index, other.index);
      }
    }
    const key = cell.join(',');
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push({ point, index });
  }));
  const groups = new Map();
  segments.forEach((segment, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(segment);
  });
  return [...groups.values()].map(group => {
    let sumX = 0, sumY = 0, length = 0;
    for (const [a, b] of group) {
      const weight = Math.hypot(b[0] - a[0], b[1] - a[1]);
      sumX += (a[0] + b[0]) / 2 * weight;
      sumY += (a[1] + b[1]) / 2 * weight;
      length += weight;
    }
    return { segments: group, center: length ? [sumX / length, sumY / length] : [...group[0][0]], length };
  }).sort((a, b) => a.center[1] - b.center[1] || a.center[0] - b.center[0]);
}

export function shortSectionName(section) {
  if (section.id === 'brachial-roots') return '臂丛近端·未分节';
  return section.name.replace(/（[^）]*）/g, '').replace(/^右/, '');
}

export function projectSectionPoint(point, plotTop) {
  return [SECTION_PLOT.x + (point[0] + .05) * SECTION_PLOT.scale, plotTop + (point[1] + .04) * SECTION_PLOT.scale];
}

// Pick a point on an actual segment, rather than a center inside an unmodelled space.
export function componentAnchor(component, side, plotTop) {
  let anchor = component.segments[0][0];
  for (const segment of component.segments) for (const point of segment) {
    if (side === 'left' ? point[0] < anchor[0] : point[0] > anchor[0]) anchor = point;
  }
  return projectSectionPoint(anchor, plotTop);
}

function spreadLabels(entries, min, max, gap) {
  const sorted = [...entries].sort((a, b) => a.desiredY - b.desiredY || a.number - b.number);
  if (!sorted.length) return sorted;
  const step = Math.min(gap, (max - min) / Math.max(1, sorted.length - 1));
  const positions = sorted.map((entry, i) => Math.max(entry.desiredY, i ? min + i * step : min));
  for (let i = 1; i < positions.length; i++) positions[i] = Math.max(positions[i], positions[i - 1] + step);
  if (positions.at(-1) > max) {
    positions[positions.length - 1] = max;
    for (let i = positions.length - 2; i >= 0; i--) positions[i] = Math.min(positions[i], positions[i + 1] - step);
  }
  return sorted.map((entry, i) => ({ ...entry, labelY: positions[i] }));
}

export function layoutSectionLabels(sections, layers = DEFAULT_LAYERS) {
  const visible = sections.filter(s => layers[s.kind] !== false && s.segments?.length);
  const height = Math.max(440, Math.ceil(visible.length / 2) * 33 + 94);
  const plotTop = (height - SECTION_PLOT.depth * SECTION_PLOT.scale) / 2;
  const prepared = visible.map((section, index) => {
    const components = sectionComponents(section.segments);
    const length = components.reduce((sum, c) => sum + c.length, 0);
    const centerX = length ? components.reduce((sum, c) => sum + c.center[0] * c.length, 0) / length : components[0].center[0];
    return { section, number: index + 1, components, centerX };
  });
  // Balanced columns prevent a crowded half from collapsing the label spacing.
  const horizontalOrder = [...prepared].sort((a, b) => a.centerX - b.centerX || a.number - b.number);
  const leftIds = new Set(horizontalOrder.slice(0, Math.ceil(prepared.length / 2)).map(e => e.section.id));
  const entries = prepared.map(entry => {
    const side = leftIds.has(entry.section.id) ? 'left' : 'right';
    const anchors = entry.components.map(c => componentAnchor(c, side, plotTop));
    const desiredY = anchors.reduce((sum, a) => sum + a[1], 0) / anchors.length;
    return { ...entry, side, anchors, desiredY };
  });
  const laidOut = [
    ...spreadLabels(entries.filter(e => e.side === 'left'), 52, height - 52, 33),
    ...spreadLabels(entries.filter(e => e.side === 'right'), 52, height - 52, 33),
  ].sort((a, b) => a.number - b.number);
  return { entries: laidOut, height, plotTop, componentCount: laidOut.reduce((n, e) => n + e.components.length, 0) };
}

export function sectionPath(segments, plotTop) {
  return segments.map(pair => {
    const a = projectSectionPoint(pair[0], plotTop), b = projectSectionPoint(pair[1], plotTop);
    return `M${a[0].toFixed(3)},${a[1].toFixed(3)}L${b[0].toFixed(3)},${b[1].toFixed(3)}`;
  }).join(' ');
}

