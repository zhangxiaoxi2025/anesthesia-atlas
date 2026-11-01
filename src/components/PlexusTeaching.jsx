import SourceSliceWorkbench from './SourceSliceWorkbench.jsx';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Expand, Pause, Play, RotateCcw } from 'lucide-react';
import teaching from '../data/plexus-teaching.json';
import hotspots from '../data/plexus-ultrasound-hotspots.json';
import sono from '../data/interscalene-ultrasound.json';
import { referenceMediaUrl } from '../model-utils.js';
import { getPlexusSelection, ROOT_TRUNK_COLORS } from '../plexus-teaching-utils.js';
import '../plexus-teaching.css';

const SEQUENCE = ['c5', 'c6', 'superior-trunk', 'c7', 'middle-trunk', 'inferior-trunk'];
const ROOT_Y = { c5: 48, c6: 108, c7: 168, c8: 228, t1: 288 };
const TRUNK_Y = { 'superior-trunk': 78, 'middle-trunk': 168, 'inferior-trunk': 258 };
const CONCEPT_MAP = new Map(teaching.concepts.map(item => [item.id, item]));

function RelationDiagram({ selection, onSelect }) {
  const active = new Set(selection.highlightConceptIds);
  const selectedRoot = selection.concept?.kind === 'root';
  return <div className="pt-relation" data-testid="plexus-relation" data-active-concept={selection.activeId}>
    <div className="pt-relation-heading"><strong>五条前支 → 三个干</strong><span>典型连接示意 · 不表示真实空间比例</span></div>
    <svg viewBox="0 0 600 340" role="group" aria-label="臂丛前支汇成三干的典型关系">
      <text x="104" y="18" className="pt-diagram-column">脊神经前支（臂丛根）</text><text x="397" y="18" className="pt-diagram-column">臂丛干</text>
      {teaching.connections.map(({ from, to }) => {
        const lit = active.has(from) && active.has(to);
        return <path key={`${from}-${to}`} d={`M 190 ${ROOT_Y[from]} C 280 ${ROOT_Y[from]}, 280 ${TRUNK_Y[to]}, 370 ${TRUNK_Y[to]}`} fill="none" stroke={lit ? ROOT_TRUNK_COLORS[to] : '#d4ddcf'} strokeWidth={lit ? 5 : 2} className={lit ? 'pt-edge-active' : ''}/>;
      })}
      {teaching.rootOrder.map(id => <g key={id} role="button" tabIndex={0} aria-label={`关系图选择${CONCEPT_MAP.get(id).label}`} aria-pressed={selection.activeId === id} className="pt-diagram-node" onClick={() => onSelect(id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); } }}>
        <rect x="27" y={ROOT_Y[id] - 21} width="163" height="42" rx="8" fill={active.has(id) ? '#ecf4e7' : '#fff'} stroke={selection.activeId === id ? '#28624e' : active.has(id) ? '#8eaf82' : '#dbe3d5'} strokeWidth={selection.activeId === id ? 2 : 1}/>
        <text x="108" y={ROOT_Y[id] + 6} textAnchor="middle" className="pt-diagram-label">{CONCEPT_MAP.get(id).shortLabel}</text>
        {selectedRoot && selection.activeId === id ? <circle cx="12" cy={ROOT_Y[id]} r="4" fill="#28624e"/> : null}
      </g>)}
      {teaching.trunkOrder.map(id => <g key={id} role="button" tabIndex={0} aria-label={`关系图选择${CONCEPT_MAP.get(id).label}`} aria-pressed={selection.activeId === id} className="pt-diagram-node" onClick={() => onSelect(id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); } }}>
        <rect x="370" y={TRUNK_Y[id] - 27} width="203" height="54" rx="9" fill={active.has(id) ? ROOT_TRUNK_COLORS[id] : '#f8faf3'} stroke={ROOT_TRUNK_COLORS[id]} strokeWidth={selection.activeId === id ? 3 : 1}/>
        <text x="471" y={TRUNK_Y[id] - 2} textAnchor="middle" className={`pt-diagram-label ${active.has(id) ? 'pt-light-label' : ''}`}>{CONCEPT_MAP.get(id).shortLabel}</text>
        <text x="471" y={TRUNK_Y[id] + 17} textAnchor="middle" className={`pt-diagram-small ${active.has(id) ? 'pt-light-label' : ''}`}>{CONCEPT_MAP.get(id).rootIds.map(root => root.toUpperCase()).join(' ＋ ')}</text>
      </g>)}
      <text x="300" y="330" textAnchor="middle" className="pt-diagram-note">C5 ＋ C6 → 上干　　C7 → 中干　　C8 ＋ T1 → 下干</text>
    </svg>
    <div className="pt-mobile-relations" aria-label="窄屏前支汇干关系">{teaching.trunkOrder.map(id => <div key={id} className="pt-mobile-relation"><div>{CONCEPT_MAP.get(id).rootIds.map(root => <button type="button" key={root} aria-pressed={selection.activeId === root} onClick={() => onSelect(root)} className={active.has(root) ? 'active' : ''}>{root.toUpperCase()} 前支</button>)}</div><ArrowRight size={16}/><button type="button" aria-pressed={selection.activeId === id} onClick={() => onSelect(id)} className={active.has(id) ? 'active' : ''}>{CONCEPT_MAP.get(id).shortLabel}</button></div>)}</div>
  </div>;
}

export function UltrasoundSelection({ selection, onSelect, onOpenSource, lockedPanelId }) {
  const clipId = `plexus-us-${useId().replace(/:/g, '')}`;
  const panel = hotspots.panels[lockedPanelId || selection.panelId];
  const targets=lockedPanelId && panel.comparisonTargets ? [...panel.targets,...panel.comparisonTargets] : panel.targets;
  const [left, top, right, bottom] = panel.crop;
  const scale = 460 / (right - left), imageX = 150, imageY = 25, imageHeight = (bottom - top) * scale;
  return <article className="pt-us-card" data-testid="plexus-ultrasound" data-panel-id={selection.panelId} data-target-id={selection.ultrasoundTargetId || ''}>
    <div className="pt-card-heading"><div><span className="pt-step">01 · 在声像中辨认</span><h3>{panel.title}</h3></div><button type="button" className="pt-icon-button" onClick={onOpenSource} aria-label="查看根与干超声完整原图及来源"><Expand size={17}/></button></div>
    {!lockedPanelId ? <div className="pt-panel-switch" role="group" aria-label="选择前支或干的声像层面"><button type="button" aria-pressed={selection.panelId === 'b'} onClick={() => onSelect('c5')}>前支：C5 / C6 / C7</button><button type="button" aria-pressed={selection.panelId === 'c'} onClick={() => onSelect('superior-trunk')}>干：上 / 中 / 下</button></div> : null}
    <div className="pt-us-scroll"><svg className="pt-us-svg" viewBox="0 0 760 465" role="group" aria-label={`${panel.title}中文外置标注`}>
      <defs><clipPath id={clipId}><rect x={imageX} y={imageY} width="460" height={imageHeight} rx="6"/></clipPath></defs>
      <rect x={imageX - 1} y={imageY - 1} width="462" height={imageHeight + 2} rx="7" fill="#111" stroke="#c4d0bc"/>
      <image href={referenceMediaUrl(sono.path)} x={imageX - left * scale} y={imageY - top * scale} width={sono.width * scale} height={sono.height * scale} clipPath={`url(#${clipId})`}/>
      {targets.map(target => {
        const x = imageX + (target.imagePoint[0] - left) * scale, y = imageY + (target.imagePoint[1] - top) * scale;
        const chosen = selection.ultrasoundTargetId === target.id;
        const labelX = target.side === 'left' ? 8 : 622, joinX = target.side === 'left' ? 138 : 622;
        const trunkId = CONCEPT_MAP.get(target.id)?.trunkIds[0], color = target.color || ROOT_TRUNK_COLORS[trunkId];
        return <g key={target.id} role="button" tabIndex={0} aria-label={`超声选择${(CONCEPT_MAP.get(target.id)?.label || target.label)}`} aria-pressed={chosen} className="pt-us-target" data-target-id={target.id} onClick={() => onSelect(target.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(target.id); } }}>
          <path d={`M ${joinX} ${target.labelY} L ${target.side === 'left' ? 145 : 615} ${target.labelY} L ${x} ${y}`} fill="none" stroke={chosen ? '#ffcf68' : '#cad6bd'} strokeWidth={chosen ? 2.2 : 1} opacity={chosen ? 1 : .7}/>
          <circle cx={x} cy={y} r={chosen ? 18 : 13} fill="none" stroke={chosen ? '#ffcf68' : '#dce5d2'} strokeWidth={chosen ? 2.5 : 1} opacity={chosen ? 1 : .7}/>
          <circle cx={x} cy={y} r="23" fill="transparent"/>
          <rect x={labelX} y={target.labelY - 21} width="130" height="42" rx="7" fill={chosen ? color : '#f8faf3'} stroke={chosen ? color : '#d6e0cd'}/>
          <text x={labelX + 65} y={target.labelY + 6} textAnchor="middle" className={`pt-us-label ${chosen ? 'pt-light-label' : ''}`}>{target.label}</text>
        </g>;
      })}
      <text x="380" y="459" textAnchor="middle" className="pt-us-svg-note">引线对准原作者标记处 · 名称置于图外</text>
    </svg></div>
    <p className="pt-scroll-hint">窄屏可左右滑动查看完整引线，也可使用上方名称按钮选择。</p>
    <div className="pt-us-abbreviations"><span>ASM 前斜角肌</span><span>MSM 中斜角肌</span>{selection.panelId === 'b' ? <><span>SCM 胸锁乳突肌</span><span>VA 椎动脉</span></> : null}</div>
    {selection.ultrasoundTargetId === null ? <p className="pt-local-gap">所选结构在这张原声像中没有独立作者标记；仅高亮有明确对应标记的 C5、C6、C7，不补造声像位置。</p> : <p className="pt-image-note">原作者的本图标注可确认所选名称。声像与右侧图谱来自不同资料，联动名称和典型关系，未做病例空间配准。</p>}
    <button type="button" className="pt-source-button" onClick={onOpenSource}><BookOpen size={14}/>Kumar 等 · 2023 · Figure 1 · 完整原图与许可<ArrowRight size={14}/></button>
  </article>;
}

export default function PlexusTeaching({ anatomy, sharedAnatomy, error = '', onOpenSource }) {
  const [activeId, setActiveId] = useState(teaching.defaultId), [playing, setPlaying] = useState(false);
  const sequenceIndex = useRef(0);
  const selection = useMemo(() => getPlexusSelection(activeId, teaching), [activeId]);
  const select = useCallback(id => { setPlaying(false); setActiveId(id); }, []);
  const openSource = useCallback(() => { setPlaying(false); onOpenSource(); }, [onOpenSource]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      sequenceIndex.current += 1;
      if (sequenceIndex.current >= SEQUENCE.length) { setPlaying(false); return; }
      setActiveId(SEQUENCE[sequenceIndex.current]);
    }, 3200);
    return () => clearInterval(timer);
  }, [playing]);
  function togglePlayback() {
    if (playing) { setPlaying(false); return; }
    sequenceIndex.current = 0; setActiveId(SEQUENCE[0]); setPlaying(true);
  }
  const concept = selection.concept;
  const trunk = CONCEPT_MAP.get(selection.highlightTrunkIds[0]);
  return <section className="plexus-teaching" aria-labelledby="plexus-teaching-title" data-testid="plexus-teaching" data-active-concept={selection.activeId}>
    <header className="pt-heading"><div><span className="pt-eyebrow">先辨认前支，再理解汇干</span><h2 id="plexus-teaching-title">C5、C6、C7 怎样接到上、中、下干？</h2><p>点一个名称，同时看声像标记、典型连接关系与有来源的三维结构。</p></div><button type="button" className="pt-play-button" onClick={togglePlayback}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? '暂停关系演示' : '演示汇干关系'}</button></header>
    <div className="pt-selector" role="group" aria-label="选择前支或臂丛干">{[...teaching.rootOrder, ...teaching.trunkOrder].map(id => <button type="button" key={id} aria-label={`学习${CONCEPT_MAP.get(id).label}`} aria-pressed={selection.activeId === id} onClick={() => select(id)} className={selection.activeId === id ? 'active' : ''}>{CONCEPT_MAP.get(id).shortLabel}</button>)}<button type="button" className="pt-reset" onClick={() => select(teaching.defaultId)}><RotateCcw size={13}/>回到 C5</button></div>
    <div className="pt-current" aria-live="polite"><div><span>当前学习</span><strong>{concept.label}</strong></div><ArrowRight size={18}/><div><span>{concept.kind === 'root' ? '典型汇合去向' : '典型前支来源'}</span><strong>{concept.kind === 'root' ? trunk?.label : concept.rootIds.map(id => id.toUpperCase()).join(' ＋ ')}</strong></div><p>{concept.explanation}</p></div>
    <RelationDiagram selection={selection} onSelect={select}/>
    <div className="pt-study-grid">
      <UltrasoundSelection selection={selection} onSelect={select} onOpenSource={openSource}/>
      <article className="pt-model-card" data-testid="plexus-model-card" data-model-status={selection.modelStatus}>
        <div className="pt-card-heading"><div><span className="pt-step">02 · 在三维中看去向</span><h3>{concept.kind === 'root' ? `典型去向：${trunk?.label || '待核对'}` : `${concept.label} · 源已具名`}</h3></div><span className={`pt-status ${concept.kind === 'root' ? 'pending' : ''}`}>{concept.kind === 'root' ? '前支本体待核定' : '高亮干本体'}</span></div>
        <SourceSliceWorkbench anatomy={sharedAnatomy} route="interscalene" selectedIds={selection.highlightTrunkIds} onSelect={id => { if (teaching.trunkOrder.includes(id)) select(id); }} error={error}/>
        <div className={`pt-model-message ${concept.kind === 'root' ? 'pt-root-message' : ''}`}><strong>{concept.kind === 'root' ? '本次三维亮的是汇合去向' : '本次三维亮的是该干本身'}</strong><p>{sharedAnatomy ? selection.modelMessage : error ? '颈部至上臂的同源模型暂未完整载入；原声像和连接关系仍可学习。' : '同源模型载入后显示具名干；原声像和连接关系已可学习。'}</p>{concept.kind === 'root' ? <p className="pt-current-gap"><b>当前还缺：</b>{concept.gap}</p> : null}</div>
        <p className="pt-image-note">旋转观察完整走行；点击三维中的上、中、下干，可反向联动左侧声像和上方关系图。切面只改变模型截线，原始身体网格不变形。</p>
      </article>
    </div>
    <div className="pt-teaching-takeaways"><article><strong>“根”在这里指什么？</strong><p>臂丛根指脊神经前支。前支、干、前后股和束属于不同层级；上、中、下是干的名称，前、后是各干分出的股。</p></article><article><strong>为什么不能按圆圈数编号？</strong><p>C6前支可分成多个声像结构；探头角度与观察位置也会改变外观。结合骨性标志和连续追踪辨认，不能把三个圆圈一律叫C5、C6、C7。</p></article></div>
    <section className="pt-evidence-gaps" aria-label="具体还缺哪些三维依据"><div className="pt-gap-heading"><h3>哪些已标清，哪些仍缺依据？</h3><span>按结构列出，不猜身份</span></div><p className="pt-confirmed">已能直接显示三维源具名结构：<strong>上干、中干、下干</strong>。C5、C6、C7在文献声像中有明确标注；它们在当前三维合并近端网格中的独立表面归属尚未核定。</p><div className="pt-gap-grid">{teaching.gaps.map(gap => <article key={gap.id}><strong>{gap.title}</strong><p>{gap.needed}</p><small>{gap.status}</small></article>)}</div><p className="pt-gap-footer">需要的是当前图谱中可连续核对的出口—前支—汇干分段，或具备该身份的可靠同源资产；再增加一张不同标本的截图，不能单独补足这个缺口。</p></section>
    <details className="pt-sources"><summary>本页的教材依据、原图来源与联动范围</summary><p>前支—干关系及声像辨认已对照提供的教材核读；本页实际展示的是既有授权原刊图，未把商业教材扫描图复制进软件。</p><div>{teaching.sources.map(source => <article key={source.id}><strong>{source.title}</strong><p>{source.where}</p>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">查看来源 ↗</a> : null}</article>)}</div><p>{hotspots.anchorMeaning}</p><p className="pt-attribution">{sono.license.attribution} Added external Chinese display labels and selection links; original JPEG bytes unchanged; overlay adaptation: CC BY-NC-SA 4.0.</p><p>三维来自固定 Z-Anatomy 同源网格，保留原坐标和身份。关系图表达典型组成，不表达真实比例；图片与三维之间联动名称和关系，没有同病例配准。</p></details>
  </section>;
}
