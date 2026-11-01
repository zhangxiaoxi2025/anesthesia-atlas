import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Layers3, Pause, Play, RotateCcw } from 'lucide-react';
import { COLORS, nerveIdFor } from '../model-utils.js';
import { sectionComponents, shortSectionName } from '../section-label-utils.js';
import { getWorkbenchConfig, workbenchROI } from '../slice-workbench-utils.js';
import { obliqueSections } from '../oblique-slice-utils.js';
import { buildWorkbenchFrame, captureWorkbenchFrame, findWorkbenchPlaneForStructure, workbenchModeLabel } from '../workbench-frame-state.js';
import { vertebralReference } from '../vertebral-reference.js';
import '../source-slice-workbench.css';

const Scene = lazy(() => import('./SourceSliceScene.jsx'));
const EMPTY = Object.freeze([]);
const DEFAULT_LAYERS = Object.freeze({ nerve: true, artery: true, vein: true, muscle: true, bone: true, skin: false });
const TRUNK_COLORS = { c5: '#c58c19', c6: '#2f8a75', c7: '#397ca8', c8: '#9560ae', t1: '#a66f44', 'superior-trunk': '#2f8a75', 'middle-trunk': '#397ca8', 'inferior-trunk': '#a66f44' };
const DURATION = 15000;
const colorFor = s => TRUNK_COLORS[s.id] || COLORS[nerveIdFor(s)] || COLORS[s.kind] || '#849583';

function SliceDiagram({ sections, frame, config, selectedIds, selectedNerve, inspectedId, onInspect, onSelect }) {
  const uid = useId().replace(/:/g, '');
  const layout = useMemo(() => {
    const scale = Math.min(302 / frame.width, 270 / frame.depth);
    const height = Math.max(360, Math.ceil(sections.length / 2) * 29 + 90);
    const top = (height - frame.depth * scale) / 2;
    const project = p => [320 + p[0] * scale, top + (p[1] + frame.depth / 2) * scale];
    const entries = sections.map((s, index) => ({ s, number: index + 1, components: sectionComponents(s.segments) }));
    const order = [...entries].sort((a, b) => a.components[0].center[0] - b.components[0].center[0]);
    const leftIds = new Set(order.slice(0, Math.ceil(order.length / 2)).map(e => e.s.id));
    for (const side of ['left', 'right']) {
      const group = entries.filter(e => leftIds.has(e.s.id) === (side === 'left')).sort((a, b) => a.components[0].center[1] - b.components[0].center[1]);
      group.forEach((e, i) => { e.side = side; e.labelY = height / 2 + (i - (group.length - 1) / 2) * 29; });
    }
    return { entries, height, top, scale, project, width: frame.width * scale, depth: frame.depth * scale };
  }, [sections, frame]);
  const active = s => s.id === inspectedId || selectedIds.includes(s.id) || (selectedNerve && nerveIdFor(s) === selectedNerve);
  const choose = s => { onInspect(s); onSelect?.(s.id); };
  return <div className="ssw-diagram" data-testid="source-slice-diagram">
    <div className="ssw-diagram-scroll"><svg viewBox={`0 0 640 ${layout.height}`} role="group" aria-label={`${config.label}模型横断面中文示意图`}>
      <defs><clipPath id={uid}><rect x={320 - layout.width / 2} y={layout.top} width={layout.width} height={layout.depth}/></clipPath></defs>
      <rect x={320 - layout.width / 2} y={layout.top} width={layout.width} height={layout.depth} rx="4" fill="#f6f5ec" stroke="#becfc1"/>
      <text className="ssw-axis" x={320 - layout.width / 2} y={layout.top - 12}>{config.directionLabels.left}</text>
      <text className="ssw-axis" x={320 + layout.width / 2} y={layout.top - 12} textAnchor="end">{config.directionLabels.right}</text>
      <text className="ssw-axis" x="320" y={layout.top + layout.depth + 20} textAnchor="middle">{config.directionLabels.bottom} · {Math.round(frame.width * 100)} × {Math.round(frame.depth * 100)} cm</text>
      <g clipPath={`url(#${uid})`}>{layout.entries.map(({ s }) => <g key={s.id}>
        <path d={s.segments.map(pair => { const a = layout.project(pair[0]), b = layout.project(pair[1]); return `M${a[0].toFixed(2)},${a[1].toFixed(2)}L${b[0].toFixed(2)},${b[1].toFixed(2)}`; }).join(' ')} fill="none" stroke={colorFor(s)} strokeWidth={active(s) ? 3 : s.kind === 'muscle' ? 1 : 1.6} opacity={active(s) ? 1 : .67}/>
      </g>)}</g>
      {layout.entries.map(entry => {
        const { s, number, side, labelY } = entry, x = side === 'left' ? 4 : 490, end = side === 'left' ? 150 : 490;
        return <g key={s.id} className={`ssw-diagram-label ${active(s) ? 'active' : ''}`} role="button" tabIndex={0} aria-label={`截面查看${s.name}`} aria-pressed={active(s)} onClick={() => choose(s)} onPointerEnter={() => onInspect(s)} onPointerLeave={() => onInspect(null)} onFocus={() => onInspect(s)} onBlur={() => onInspect(null)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(s); } }}>
          {entry.components.map((component, i) => {
            const points = component.segments.flat(), anchor = points.reduce((a, p) => side === 'left' ? p[0] < a[0] ? p : a : p[0] > a[0] ? p : a, points[0]);
            const a = layout.project(anchor);
            return <g key={i} pointerEvents="none"><path d={`M${a[0]},${a[1]}L${side === 'left' ? 158 : 482},${labelY}L${end},${labelY}`} fill="none" stroke={colorFor(s)} strokeWidth={active(s) ? 1.6 : .7} opacity={active(s) ? .95 : .45}/><circle cx={a[0]} cy={a[1]} r={active(s) ? 2.5 : 1.3} fill={colorFor(s)}/></g>;
          })}
          <rect x={x} y={labelY - 12} width="146" height="24" rx="5"/>
          <text x={x + 8} y={labelY + 4} fill={colorFor(s)}>{number}</text><text x={x + 27} y={labelY + 4}>{shortSectionName(s)}</text><title>{s.name} · {entry.components.length}组真实截线</title>
        </g>;
      })}
    </svg></div>
    <details open className="ssw-index"><summary>本面完整中文索引 · {sections.length} 个源结构</summary><div>{layout.entries.map(({ s, number }) => <button key={s.id} type="button" aria-pressed={active(s)} onClick={() => choose(s)}><i style={{ background: colorFor(s) }}/>{number} · {s.name}</button>)}</div></details>
  </div>;
}

const ZERO_ANGLES = Object.freeze({ yaw: 0, pitch: 0, roll: 0 });
function axisText(vector) {
  const positive = ['内侧', '头侧', '前'], negative = ['外侧', '足侧', '后'];
  return vector.map((value, index) => ({ value, index })).filter(item => Math.abs(item.value) > .25).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 2).map(item => item.value > 0 ? positive[item.index] : negative[item.index]).join('／') || '面内方向';
}

/** Camera, retained cut and peeled copy share one genuinely oblique source frame. */
export default function SourceSliceWorkbench({ anatomy, route, selectedIds = EMPTY, selectedNerve = null, onSelect, layers = DEFAULT_LAYERS, opacity = .18, isolated = false, showLabels = true, level: controlledLevel, onLevelChange, showPlane, onShowPlaneChange, externalResetVersion = 0, error = '', fixedFrame = null }) {
  const config = useMemo(() => getWorkbenchConfig(route), [route]);
  const initialLevel = route === 'interscalene' ? 1.455 : config.initialLevel;
  const [ownLevel, setOwnLevel] = useState(initialLevel), [progress, setProgress] = useState(0), [playing, setPlaying] = useState(false);
  const [viewMode, setViewMode] = useState('oblique'), [viewVersion, setViewVersion] = useState(0), [resetVersion, setResetVersion] = useState(0);
  const [inspected, setInspected] = useState(null), [localLayers, setLocalLayers] = useState({ muscle: true, bone: true }), [targetNotice, setTargetNotice] = useState('');
  const [mode, setMode] = useState('bone-axis'), [angles, setAngles] = useState(ZERO_ANGLES), [normalOffset, setNormalOffset] = useState(0), [capturedFrame, setCapturedFrame] = useState(null), [captureVersion, setCaptureVersion] = useState(0);
  const cursor = useRef(0), workbenchHost = useRef(null); cursor.current = progress;
  const focusScene = useCallback(() => workbenchHost.current?.querySelector('.sss-canvas-host')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), []);
  const diagramReady = true;
  
  const roi = useMemo(() => anatomy ? workbenchROI(anatomy) : null, [anatomy]);
  const minLevel = Math.max(config.min, roi?.min[1] ?? config.min), maxLevel = Math.min(config.max, roi?.max[1] ?? config.max);
  const level = Math.max(minLevel, Math.min(maxLevel, controlledLevel ?? ownLevel));
  const baseResult = useMemo(() => buildWorkbenchFrame({ anatomy, route, level, mode, captured: capturedFrame, angles, normalOffset }), [anatomy, route, level, mode, capturedFrame, angles, normalOffset]);
  const frame = fixedFrame || baseResult.frame;
  const allSections = useMemo(() => obliqueSections(anatomy, frame), [anatomy, frame]);
  const effectiveLayers = useMemo(() => Object.fromEntries(Object.keys(DEFAULT_LAYERS).map(key => [key, layers[key] !== false && localLayers[key] !== false])), [layers, localLayers]);
  const sections = useMemo(() => allSections.filter(s => (!anatomy?.comparisonIds || anatomy.comparisonIds.includes(s.id)) && effectiveLayers[s.kind] !== false && (!isolated || nerveIdFor(s) === selectedNerve)), [allSections, effectiveLayers, isolated, selectedNerve, anatomy]);
  const bones = useMemo(() => vertebralReference(allSections), [allSections]);
  const isSelected = s => selectedIds.includes(s.id) || (selectedNerve && nerveIdFor(s) === selectedNerve);
  const selectedIntersects = allSections.some(isSelected), selectedPresent = sections.some(isSelected);
  const directions = useMemo(() => ({ ...config, directionLabels: { left: '朝' + axisText(frame.u.map(v => -v)), right: '朝' + axisText(frame.u), bottom: '向下：朝' + axisText(frame.v) } }), [config, frame]);
  const modeName = fixedFrame ? '固定教学参考面（未与原超声空间配准）' : workbenchModeLabel(mode, angles, Boolean(baseResult.notice));
  useEffect(() => { setPlaying(false); setProgress(0); cursor.current = 0; setViewMode('oblique'); setResetVersion(v => v + 1); setInspected(null); setAngles(ZERO_ANGLES); setNormalOffset(0); setCapturedFrame(null); setMode('bone-axis'); }, [externalResetVersion]);
  useEffect(() => {
    if (!playing) return;
    let request, previous = performance.now();
    const tick = now => { const next = Math.min(1, cursor.current + (now - previous) / DURATION); previous = now; cursor.current = next; setProgress(next); if (next < 1) request = requestAnimationFrame(tick); else setPlaying(false); };
    request = requestAnimationFrame(tick); return () => cancelAnimationFrame(request);
  }, [playing]);
  function markAdjustment() { setPlaying(false); setProgress(0); cursor.current = 0; setInspected(null); onShowPlaneChange?.(true); setTargetNotice(''); }
  function changeLevel(value) { if (!Number.isFinite(value)) return; markAdjustment(); const next = Math.max(minLevel, Math.min(maxLevel, value)); if (onLevelChange) onLevelChange(next); else setOwnLevel(next); }
  function start() { setProgress(0); cursor.current = 0; onShowPlaneChange?.(true); setViewMode('transverse'); setViewVersion(v => v + 1); setPlaying(true); requestAnimationFrame(focusScene); }
  function reset() { setPlaying(false); setProgress(0); cursor.current = 0; onShowPlaneChange?.(false); setViewMode('oblique'); setResetVersion(v => v + 1); setInspected(null); }
  function seek(value) { setPlaying(false); if (value > 0) { onShowPlaneChange?.(true); setViewMode('transverse'); } setProgress(value); }
  function findSelectedCut() {
    const structure = anatomy?.structures.find(s => s.id === (selectedIds[0] || selectedNerve));
    if (!structure) { setTargetNotice('当前没有可核的高亮源结构。'); return; }
    const match = findWorkbenchPlaneForStructure({ anatomy, route, level, mode, captured: capturedFrame, angles, normalOffset }, structure.id, minLevel, maxLevel);
    if (!match) setTargetNotice('高亮源结构在当前方向和窗口内没有可核交线；可以调整切面角度，不能补造轮廓。');
    else { changeLevel(match.level); setTargetNotice('已按当前斜面方向移至高亮源结构实际相交的位置；原超声保持不变。'); }
  }

  const captureView = useCallback(capture => {
    try { const next = captureWorkbenchFrame(frame, capture, level); setCapturedFrame(next); setMode('captured'); setAngles(ZERO_ANGLES); setNormalOffset(0); setPlaying(false); setProgress(0); onShowPlaneChange?.(true); setTargetNotice('已用当前观察朝向设置切面，定位点保留。可再调角度和位置，随后点近看按钮。'); }
    catch { setTargetNotice('此视角暂不能建立有效切面；请调整三维朝向后再取面。'); }
  }, [frame, level, onShowPlaneChange]);
  const selectedSourceIds = inspected?.id ? [...selectedIds, inspected.id] : selectedIds;
  const stage = progress < .22 ? 0 : progress < .28 ? 1 : progress < .96 ? 2 : 3;
  return <section ref={workbenchHost} className="source-slice-workbench" data-testid={`slice-workbench-${route}`} data-progress={progress.toFixed(3)} data-stage={stage} data-duration-ms={DURATION} data-plane-mode={mode} data-plane-center={frame.center.join(',')} data-plane-normal={frame.n.join(',')} aria-label={`${config.label}三维与模型截面联动`}>
    <div className="ssw-actions"><button type="button" className="ssw-align" disabled={!anatomy} onClick={start}><ArrowUpRight size={18}/>{progress > 0 ? '重新近看并缓慢抽离' : '近看切面并缓慢抽离'}</button><button type="button" className="ssw-icon" aria-label={`${config.label}${playing ? '暂停' : '继续'}切面动画`} disabled={!anatomy || progress === 0 || progress >= 1} onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button><button type="button" className="ssw-icon" aria-label={`${config.label}回到整体三维`} onClick={reset}><RotateCcw size={16}/></button></div>
    <p className="ssw-direction-boundary"><strong>{modeName}。</strong>先放近转正，原位面保留，缓慢移出同一截线的副本。与左侧原超声未配准。</p>
    {!fixedFrame ? <><div className="ssw-plane-picker"><button type="button" disabled={!anatomy} onClick={() => { markAdjustment(); setCaptureVersion(v => v + 1); }}>按当前观察方向取面</button><button type="button" onClick={() => { markAdjustment(); setMode('bone-axis'); setCapturedFrame(null); setAngles(ZERO_ANGLES); setNormalOffset(0); }}>回骨性轴参考</button><button type="button" onClick={() => { markAdjustment(); setMode('horizontal'); setCapturedFrame(null); setAngles(ZERO_ANGLES); setNormalOffset(0); }}>源水平参考</button></div>
    <details className="ssw-angle-controls"><summary>调整真实切面角度与位置 · {modeName}</summary><p>改变的是切面本身，会重新求交。角度是模型设置，不能当成教材或患者探头标定。</p>{[['yaw', '侧向倾角', -60, 60], ['pitch', '头足倾角', -60, 60], ['roll', '画内旋转', -180, 180]].map(([id, label, min, max]) => <label key={id}><span>{label} <strong>{angles[id]}°</strong></span><input aria-label={`${config.label}${label}`} type="range" min={min} max={max} step="1" value={angles[id]} onChange={e => { markAdjustment(); setAngles(a => ({ ...a, [id]: Number(e.target.value) })); }}/></label>)}<label><span>沿切面法线移位 <strong>{normalOffset} mm</strong></span><input aria-label={`${config.label}沿切面法线移位`} type="range" min="-30" max="30" step="1" value={normalOffset} onChange={e => { markAdjustment(); setNormalOffset(Number(e.target.value)); }}/></label></details></> : null}
    {fixedFrame ? <p className="ssw-clinical-reference">固定模型参考面同时经过 C5、C6、C7；与左侧原图按名称对照，尚未恢复原图的探头位置和声束角度。选择结构不移动此面。</p> : route === 'interscalene' ? <p className="ssw-clinical-reference">教材常见肌间沟图需要横向探查并倾斜探头，不能用固定Y水平面冒充。此处用同源骨性轴建立可调斜面；骨轴不等于已核神经短轴。教材图ASM在左，现有Kumar原图方向相反，各自保留原方向。</p> : <p className="ssw-clinical-reference">以你最新图片作为观察方向参考，可旋转到所需朝向后取面。旧颜色保留：神经分色、动脉红、静脉蓝；源模型仍是中立位。</p>}
    {baseResult.notice ? <p className="ssw-missing">{baseResult.notice}</p> : null}
    <div className={`ssw-extracted ${diagramReady ? 'revealed' : ''}`} data-testid="extracted-source-slice" data-revealed={diagramReady}>
      <div className="ssw-panel-heading"><span><Layers3 size={15}/>上方二维对照</span><strong>按当前模型切面实时更新 · 点名称查看同源结构</strong></div>
      <p className="ssw-clinical-reference">引线连接模型交线与中文名称；同一结构可能出现多个轮廓。点击名称可高亮模型中对应的源结构。左侧超声与模型未配准，不能逐圈一一对应。</p><SliceDiagram sections={sections} frame={frame} config={directions} selectedIds={selectedIds} selectedNerve={selectedNerve} inspectedId={inspected?.id} onInspect={setInspected} onSelect={onSelect}/>{route === 'interscalene' && !anatomy?.reconstruction ? <p className="ssw-missing">模型的近端臂丛未分出可核定的 C5、C6、C7：左侧原超声可按作者标注查看；这里的“近端合并·未分节”不能按圆圈顺序推定节段。</p> : null}
      {diagramReady && !selectedPresent ? <p className="ssw-missing">{selectedIntersects ? '所选结构有真实交线，但当前图层或单独观察模式未显示。' : '所选结构在当前斜面中未相交，三维仍可看其走行；不补造轮廓或根名。'}</p> : null}
    </div>
    <Suspense fallback={<div className="ssw-loading">正在准备颈部至上臂三维…</div>}><Scene anatomy={anatomy} route={route} selectedIds={selectedSourceIds} selectedNerve={selectedNerve} onSelect={onSelect} onInspect={setInspected} layers={effectiveLayers} opacity={opacity} isolated={isolated} showLabels={showLabels} showPlane={showPlane ?? true} frame={frame} roi={roi} sections={sections} progress={progress} viewMode={viewMode} viewVersion={viewVersion} resetVersion={resetVersion} captureVersion={captureVersion} onCaptureView={captureView}/></Suspense>
    {!fixedFrame ? <div className="ssw-level"><div><label htmlFor={`ssw-level-${route}`}>{route === 'interscalene' ? '实际相交骨性参照' : '模型定位基点'}</label><strong>{route === 'interscalene' && anatomy ? bones.label : '原始中立位 · 右上臂'}</strong></div><div className="ssw-level-row"><button type="button" aria-label={`${config.label}切面向足侧1毫米`} onClick={() => changeLevel(level - .001)}>−</button><input id={`ssw-level-${route}`} aria-label={`${config.label}模型截面高度`} type="range" min={minLevel} max={maxLevel} step={config.step || .001} value={level} onChange={e => changeLevel(Number(e.target.value))}/><button type="button" aria-label={`${config.label}切面向头侧1毫米`} onClick={() => changeLevel(level + .001)}>＋</button></div><small>斜面没有唯一水平高度；定位基点 Y={frame.center[1].toFixed(3)} m</small><button type="button" className="ssw-find-cut" disabled={!anatomy} onClick={findSelectedCut}>查看高亮结构的相交层面</button>{targetNotice ? <p className="ssw-same-source" role="status">{targetNotice}</p> : null}</div> : null}
    <div className="ssw-layer-switches" aria-label={`${config.label}联动窗背景开关`}>{[['muscle', '肌肉背景'], ['bone', '骨性背景']].map(([id, label]) => <label key={id}><input type="checkbox" checked={localLayers[id]} onChange={e => setLocalLayers(s => ({ ...s, [id]: e.target.checked }))}/>{label}</label>)}</div>
    {!anatomy ? <p className="ssw-missing">{error || '正在载入同一来源的颈部与上臂结构；真实超声可独立查看。'}</p> : null}
    <div className="ssw-timeline"><input aria-label={`${config.label}切面抽出进度`} type="range" min="0" max="1" step=".01" value={progress} onChange={e => seek(Number(e.target.value))}/><span>{['放近并转正', '原面面向你', '缓慢抽离副本', '原面与副本保留'][stage]}</span></div>
    <p className="ssw-crop-note">整体定位范围：C5附近至上臂中段；近看只拟合当前局部面。{anatomy?.reconstruction ? '补充神经按来源名称显示；跨来源空间关系待核对。' : '源结构和配色保持，未核前支不补名。'}</p>
  </section>;
}
