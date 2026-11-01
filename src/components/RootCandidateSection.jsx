import { useId, useMemo, useState } from 'react';
import { sourceSections, sliceFrame, clipSection } from '../interscalene-utils.js';
import { intersectGeometryPlane } from '../model-utils.js';
import { vertebralReference } from '../vertebral-reference.js';
import { layoutSectionLabels, SECTION_PLOT, sectionPath } from '../section-label-utils.js';
import '../root-candidate-section.css';

const BASE_IDS=new Set(['brachial-roots','middle-trunk','vertebra-c5','vertebra-c6','vertebra-c7','vertebra-t1']);
const MUSCLE_IDS=new Set(['anterior-scalene','middle-scalene']);
const CANDIDATE_ID='root-candidate-emphasis';
const colorFor=s=>s.id===CANDIDATE_ID?'#e16b40':s.id==='middle-trunk'?'#2f8293':s.id==='brachial-roots'?'#b8ab7c':s.kind==='muscle'?'#ad7f75':'#939b7e';
const shortFor=s=>s.id===CANDIDATE_ID?'候选层·未核定':s.id==='brachial-roots'?'近端原网格':s.id==='middle-trunk'?'已具名中干':s.name;

// The emphasis is the exact same source faces used by the 3D review. It is an
// annotation layer, not an additional nerve or an independent source identity.
export default function RootCandidateSection({anatomy,overlay,level,onLevelChange,showCandidate=true,showScalenes=false,showBones=true}) {
  const titleId=useId(),noteId=useId();
  const [activeId,setActiveId]=useState(null);
  const allSections=useMemo(()=>sourceSections(anatomy,level),[anatomy,level]);
  const candidateSegments=useMemo(()=>overlay?.status==='ready'?intersectGeometryPlane(overlay.geometry,sliceFrame(level)).map(s=>clipSection(s)).filter(Boolean):[],[overlay,level]);
  const sections=useMemo(()=>{
    const context=allSections.filter(s=>(BASE_IDS.has(s.id)&&(showBones||s.kind!=='bone'))||(showScalenes&&MUSCLE_IDS.has(s.id)));
    if(showCandidate&&candidateSegments.length)context.push({id:CANDIDATE_ID,name:'中干近端候选走行（强调层，节段未核定）',kind:'annotation',segments:candidateSegments});
    return context;
  },[allSections,candidateSegments,showCandidate,showScalenes,showBones]);
  const layout=useMemo(()=>layoutSectionLabels(sections),[sections]);
  const boneReference=useMemo(()=>vertebralReference(allSections),[allSections]);
  const change=value=>{if(Number.isFinite(value))onLevelChange?.(Number(Math.max(1.435,Math.min(1.465,value)).toFixed(3)));};
  return <section className="rc-section" aria-label="候选走行局部几何切面" data-testid="root-candidate-section" data-source-plane-y={level} data-candidate-intersects={candidateSegments.length?'true':'false'} data-candidate-shown={showCandidate?'true':'false'}>
    <div className="rc-section-heading"><div><h3>再用同一高度的截面核对</h3><p>局部几何切面 · 10 × 8 cm · 非超声</p></div><span className="rc-section-status">节段未核定</span></div>
    <div className="rc-level"><div><span>当前局部切面经过</span><strong>{boneReference.label}</strong></div><label htmlFor={`${titleId}-level`}>审阅切面高度<small>仅调节本审阅窗口</small></label><div className="rc-level-row"><button type="button" aria-label="审阅切面向足侧移动1毫米" disabled={level<=1.435} onClick={()=>change(level-.001)}>−</button><input id={`${titleId}-level`} type="range" min="1.435" max="1.465" step=".001" value={level} aria-label="候选审阅切面上下移动" aria-valuetext={`${boneReference.label}；源Y ${level.toFixed(3)}米`} onChange={e=>change(Number(e.target.value))}/><button type="button" aria-label="审阅切面向头侧移动1毫米" disabled={level>=1.465} onClick={()=>change(level+.001)}>+</button></div><p>← 足侧 <span>每格 1 mm</span> 头侧 →</p></div>
    <div className="rc-section-grid"><div className="rc-section-scroll"><svg className="rc-section-svg" viewBox={`0 0 640 ${layout.height}`} role="group" aria-labelledby={titleId} aria-describedby={noteId}>
      <title id={titleId}>原网格真实截线与候选重复强调层；所有中文名称置于绘图区外</title>
      <rect x={SECTION_PLOT.x} y={layout.plotTop} width={SECTION_PLOT.width} height={SECTION_PLOT.depth*SECTION_PLOT.scale} rx="5" className="rc-section-plot"/>
      <text x={SECTION_PLOT.x} y={layout.plotTop-13}>后 −Z</text><text x={SECTION_PLOT.x+SECTION_PLOT.width} y={layout.plotTop-13} textAnchor="end">前 +Z</text>
      <text x="320" y={layout.plotTop+SECTION_PLOT.depth*SECTION_PLOT.scale+24} textAnchor="middle">向下：内侧 +X</text>
      {layout.entries.map(entry=><g key={entry.section.id} className={activeId===entry.section.id?'rc-active':''} data-section-id={entry.section.id}>
        <title>{entry.section.name}</title>
        {entry.components.map((part,i)=><path key={i} d={sectionPath(part.segments,layout.plotTop)} stroke={colorFor(entry.section)} strokeWidth={entry.section.id===CANDIDATE_ID?3.1:activeId===entry.section.id?2.8:1.6} fill="none" opacity={activeId&&activeId!==entry.section.id ? .5 : 1}/>)}
        {entry.anchors.map((anchor,i)=><g key={i} aria-hidden="true"><path d={`M${anchor[0]},${anchor[1]}L${entry.side==='left'?158:482},${entry.labelY}L${entry.side==='left'?153:487},${entry.labelY}`} stroke={colorFor(entry.section)} strokeWidth=".9" fill="none" opacity=".6"/><circle cx={anchor[0]} cy={anchor[1]} r="1.8" fill={colorFor(entry.section)}/></g>)}
        <g className="rc-section-label" role="button" tabIndex="0" aria-label={entry.section.name} onPointerEnter={()=>setActiveId(entry.section.id)} onPointerLeave={()=>setActiveId(null)} onFocus={()=>setActiveId(entry.section.id)} onBlur={()=>setActiveId(null)} onClick={()=>setActiveId(entry.section.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActiveId(entry.section.id);}}}>
          <rect x={entry.side==='left'?4:487} y={entry.labelY-14} width="149" height="28" rx="5"/>
          <circle cx={(entry.side==='left'?4:487)+12} cy={entry.labelY} r="3.5" fill={colorFor(entry.section)}/>
          <text x={(entry.side==='left'?4:487)+22} y={entry.labelY} dominantBaseline="central">{shortFor(entry.section)}</text>
        </g>
      </g>)}
    </svg></div><aside className="rc-section-index"><strong>本面图层索引</strong><p>候选层重复强调原网格的一部分，不增加神经数量。</p>{layout.entries.map(({section,components})=><button type="button" key={section.id} onPointerEnter={()=>setActiveId(section.id)} onPointerLeave={()=>setActiveId(null)} onFocus={()=>setActiveId(section.id)} onBlur={()=>setActiveId(null)} onClick={()=>setActiveId(section.id)} className={activeId===section.id?'active':''}><i style={{background:colorFor(section)}}/><span>{section.name}<small>{components.length} 组截线</small></span></button>)}<p className="rc-section-presence">{!showCandidate?'候选强调已隐藏。':candidateSegments.length?'本面与候选原表面相交。':'本面没有候选截线；不补画圆圈。'}</p></aside></div>
    <p id={noteId} className="rc-section-note">橙色线是原近端网格同一批三角面的重复强调，不是另一根神经。青绿色参考面与此图使用同一源高度；骨性相交、截线形状和邻近中干均不能单独确定节段、孔出口或汇接。</p>
  </section>;
}
