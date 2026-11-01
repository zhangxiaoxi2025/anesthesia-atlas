import { deriveSourceReferenceFrame, getReferenceFrame, rotateFrame, moveFrame, frameFromView, focusFrameOnStructures, obliqueSections } from './oblique-slice-utils.js';

const ARM_IDS = ['median', 'ulnar', 'radial', 'musculocutaneous', 'brachial-artery', 'brachial-vein'];
const NO_ANGLES = Object.freeze({ yaw: 0, pitch: 0, roll: 0 });

// One constructor is shared by the visible plane and every searched candidate.
export function buildWorkbenchFrame({ anatomy, route, level, mode = 'bone-axis', captured = null, angles = NO_ANGLES, normalOffset = 0 }) {
  let base, notice = '', referenceType = mode;
  try { base = anatomy && mode !== 'horizontal' ? deriveSourceReferenceFrame(anatomy, route, level) : getReferenceFrame(route, level); }
  catch (error) { base = getReferenceFrame(route, level); notice = '骨性参照未建立，暂用源水平参考：' + error.message; referenceType = 'horizontal'; }
  if (route === 'axillary' && anatomy) {
    const focused = focusFrameOnStructures(anatomy, base, ARM_IDS, { fit: true, padding: .018 });
    if (focused) base = { ...focused, width: Math.max(.06, Math.min(.12, focused.width)), depth: Math.max(.07, Math.min(.12, focused.depth)) };
  } else base = { ...base, width: .08, depth: .08 };
  let input = base;
  if (mode === 'captured' && captured) {
    const delta = level - captured.levelAtCapture;
    input = { ...captured.frame, center: [captured.frame.center[0], captured.frame.center[1] + delta, captured.frame.center[2]] };
    referenceType = 'captured'; notice = '';
  }
  return { frame: moveFrame(rotateFrame(input, angles), { longitudinal: normalOffset / 1000 }), notice, referenceType };
}

// Capture the viewing ORIENTATION through the current plane center. The scene's
// camera target may be offset to make room for the copy; it is not a cut point.
export function captureWorkbenchFrame(frame, view, level) {
  return { frame: frameFromView(frame, { position: view.position, target: view.target, up: view.up, center: [...frame.center] }), levelAtCapture: level };
}

export function workbenchModeLabel(mode, angles, fallback = false) {
  if (mode === 'captured') return '按当前观察方向选定的模型面';
  const tilted = Math.abs(angles.yaw || 0) > 1e-9 || Math.abs(angles.pitch || 0) > 1e-9;
  const horizontal = mode === 'horizontal' || fallback;
  return tilted ? horizontal ? '基于源水平参考的自选斜面' : '基于骨性轴的自选斜面' : horizontal ? '源水平参考' : '骨性轴斜切参考';
}

export function findWorkbenchPlaneForStructure(options, sourceDisplayId, min, max) {
  const structure = options.anatomy?.structures.find(item => item.id === sourceDisplayId);
  if (!structure) return null;
  const levels = Array.from({ length: Math.floor((max - min) / .001) + 1 }, (_, i) => min + i * .001);
  levels.push(options.level);
  levels.sort((a, b) => Math.abs(a - options.level) - Math.abs(b - options.level));
  for (const level of levels) {
    const candidate = buildWorkbenchFrame({ ...options, level });
    if (obliqueSections({ structures: [structure] }, candidate.frame).length) return { level, frame: candidate.frame };
  }
  return null;
}
