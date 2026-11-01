import { useId, useMemo } from 'react';
import { INTERSCALENE_COLORS } from '../interscalene-utils.js';
import { layoutSectionLabels, SECTION_PLOT, sectionPath, shortSectionName } from '../section-label-utils.js';
import '../section-labels.css';

const NO_LAYERS = Object.freeze({});

// One Chinese source identity per structure; every display component has its own
// leader. No connected contour is interpreted as a spinal root or nerve fascicle.
export default function SectionLabels({
  sections = [], selected, hoveredId, onSelect, onHover, layers = NO_LAYERS,
  progress = 0, expanded = false, referenceIds = [],
}) {
  const titleId = useId(), noteId = useId();
  const layout = useMemo(() => layoutSectionLabels(sections, layers), [sections, layers]);
  const { entries, height, plotTop, componentCount } = layout;
  const activeId = hoveredId || selected;
  const active = entries.find(e => e.section.id === activeId);
  const select = id => onSelect?.(id);
  const hover = id => onHover?.(id);
  function keySelect(event, id) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(id); }
  }
  return <div className={`sl-wrapper ${expanded ? 'sl-expanded' : ''}`} data-revealed={progress >= .5}>
    <div className="sl-summary"><strong>中文轮廓标注</strong><span>{entries.length} 个结构 · {componentCount} 组截线</span></div>
    <p className="sl-scroll-hint">左右滑动可看完整标注；下方中文索引可直接点选。</p>
    <div className="sl-diagram-scroll">
      <svg className="sl-diagram" viewBox={`0 0 640 ${height}`} role="group" aria-labelledby={titleId} aria-describedby={noteId}>
        <title id={titleId}>源网格真实截线及中文外置标注。右为前，左为后，下为内侧；不是超声。</title>
        <rect className="sl-plot" x={SECTION_PLOT.x} y={plotTop} width={SECTION_PLOT.width} height={SECTION_PLOT.depth * SECTION_PLOT.scale} rx="4"/>
        <text className="sl-direction" x={SECTION_PLOT.x} y={plotTop - 13}>后 −Z</text>
        <text className="sl-direction" x={SECTION_PLOT.x + SECTION_PLOT.width} y={plotTop - 13} textAnchor="end">前 +Z</text>
        <text className="sl-direction" x="320" y={plotTop + SECTION_PLOT.depth * SECTION_PLOT.scale + 23} textAnchor="middle">向下：内侧 +X · 10 × 8 cm</text>
        {entries.map(entry => {
          const { section, components, number } = entry, activeNow = section.id === activeId;
          const color = INTERSCALENE_COLORS[section.kind] || '#7c8275';
          return <g key={section.id} className={`sl-contour-group ${activeNow ? 'sl-active' : ''} ${referenceIds.includes(section.id)?'sl-bone-reference':''}`} role="button" tabIndex="0"
            aria-label={`${number}，${section.name}，本面${components.length}组截线`} aria-pressed={section.id === selected}
            onPointerEnter={() => hover(section.id)} onPointerLeave={() => hover(null)}
            onFocus={() => hover(section.id)} onBlur={() => hover(null)}
            onClick={() => select(section.id)} onKeyDown={event => keySelect(event, section.id)}>
            <title>{`${number} · ${section.name}；${components.length}组截线均属于同一源结构`}</title>
            {components.map((part, index) => <g key={index} data-source-id={section.id} data-component={index + 1}>
              <path className="sl-hit-contour" d={sectionPath(part.segments, plotTop)}/>
              <path className="sl-source-contour" d={sectionPath(part.segments, plotTop)} stroke={color}/>
            </g>)}
          </g>;
        })}
        <g className="sl-leaders" aria-hidden="true">
          {entries.map(entry => {
            const activeNow = entry.section.id === activeId, color = INTERSCALENE_COLORS[entry.section.kind] || '#7c8275';
            const endX = entry.side === 'left' ? 153 : 487, elbowX = entry.side === 'left' ? 158 : 482;
            return <g key={entry.section.id} className={activeNow ? 'sl-active' : ''} stroke={color}>
              {entry.anchors.map((anchor, index) => <g key={index} data-leader-source={entry.section.id} data-leader-component={index + 1}>
                <path d={`M${anchor[0]},${anchor[1]}L${elbowX},${entry.labelY}L${endX},${entry.labelY}`}/>
                <circle cx={anchor[0]} cy={anchor[1]} r={activeNow ? 2.8 : 1.8} fill={color}/>
              </g>)}
            </g>;
          })}
        </g>
        {entries.map(entry => {
          const { section, number, side, labelY } = entry, activeNow = section.id === activeId;
          const x = side === 'left' ? 4 : 487, color = INTERSCALENE_COLORS[section.kind] || '#7c8275';
          return <g key={section.id} className={`sl-label ${activeNow ? 'sl-active' : ''} ${referenceIds.includes(section.id)?'sl-bone-reference':''}`} onPointerEnter={() => hover(section.id)}
            onPointerLeave={() => hover(null)} onClick={() => select(section.id)} aria-hidden="true">
            <rect x={x} y={labelY - 14} width="149" height="28" rx="5"/>
            <circle cx={x + 14} cy={labelY} r="10" fill={color}/>
            <text className="sl-label-number" x={x + 14} y={labelY} textAnchor="middle" dominantBaseline="central">{number}</text>
            <text className="sl-label-name" x={x + 29} y={labelY} dominantBaseline="central">{shortSectionName(section)}</text>
          </g>;
        })}
      </svg>
    </div>
    {entries.length ? <p className="sl-active-description">{active ? <><span className="sl-current-badge">{active.number}</span><strong>{active.section.name}</strong><span>本面 {active.components.length} 组截线</span></> : '点击轮廓或中文名称，联动观察同一源结构。'}</p> : <p className="sl-empty">当前层面和图层没有可见相交结构；请调整高度或打开图层。</p>}
    <div className="sl-index-heading"><strong>完整中文索引</strong><span>编号仅用于本次显示</span></div>
    <div className="sl-index" role="group" aria-label="本面所有可见相交结构的中文索引">
      {entries.map(({ section, number, components }) => <button type="button" key={section.id}
        className={`${section.id === activeId ? 'sl-index-active' : ''} ${referenceIds.includes(section.id)?'sl-bone-reference':''}`} aria-pressed={section.id === selected}
        onClick={() => select(section.id)} onPointerEnter={() => hover(section.id)} onPointerLeave={() => hover(null)}
        onFocus={() => hover(section.id)} onBlur={() => hover(null)}>
        <span className="sl-index-number" style={{ background: INTERSCALENE_COLORS[section.kind] }}>{number}</span>
        <span><strong>{section.name}</strong><small>{components.length > 1 ? `同源 ${components.length} 组截线 · 共用名称` : '1 组截线'}</small></span>
      </button>)}
    </div>
    <p id={noteId} className="sl-footnote">每条引线指向实际轮廓；同名多分量仍属同一源结构，可能包含窗口裁断的开截线。编号随层面或图层改变，不代表神经根节段；臂丛近端合并网格未分节。此图与右侧文献声像未配准。</p>
  </div>;
}

