import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Expand, Layers3, Pause, Play, RotateCcw, ScanLine, X } from 'lucide-react';
import content from '../data/interscalene.json';
import sono from '../data/interscalene-ultrasound.json';
import { referenceMediaUrl } from '../model-utils.js';
import { animationStage, INTERSCALENE_COLORS, sourceSections } from '../interscalene-utils.js';
import SectionLabels from './SectionLabels.jsx';
import SpineLocator from './SpineLocator.jsx';
import RootCandidateSection from './RootCandidateSection.jsx';
import PlexusTeaching from './PlexusTeaching.jsx';
import ReferenceReconstruction from './ReferenceReconstruction.jsx';
import { vertebralReference } from '../vertebral-reference.js';
import '../interscalene.css';
const Scene = lazy(()=>import('./InterscaleneScene.jsx'));
const RootReview = lazy(()=>import('./RootAnnotationReview.jsx'));
const MAIN_IDS=['brachial-roots','anterior-scalene','middle-scalene','sternocleidomastoid','common-carotid-artery','internal-jugular-vein','vertebral-artery','superior-trunk','middle-trunk','inferior-trunk','long-thoracic-nerve','dorsal-scapular-nerve'];
const STAGE_POSITIONS=[0,.32,.65,1];
const LEVEL_MIN=1.435, LEVEL_MAX=1.505, LEVEL_INITIAL=1.468, LEVEL_STEP=.001;

function levelDescription(level) {
  const mm=Math.round((level-LEVEL_INITIAL)*1000);
  return mm===0?'初始参考切面':`较初始向${mm>0?'头侧':'足侧'} ${Math.abs(mm)} mm`;
}

function LabelDialog({ onClose, children }) {
  const close=useRef(null);
  useEffect(()=>{
    const before=document.activeElement, previous=document.body.style.overflow;
    close.current?.focus();document.body.style.overflow='hidden';
    const key=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=previous;before?.focus();};
  },[onClose]);
  return <div className="modal-backdrop" onClick={onClose}><section className="modal wide is-label-dialog" role="dialog" aria-modal="true" aria-label="放大二维中文标注" onClick={e=>e.stopPropagation()} onKeyDown={e=>{
    if(e.key!=='Tab')return;
    const list=[...e.currentTarget.querySelectorAll('button,a[href],[tabindex="0"]')];
    if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1)?.focus();}
    else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0]?.focus();}
  }}><div className="modal-head"><div><span className="eyebrow">SAME SOURCE · CHINESE LABELS</span><h2>二维切面 · 中文结构标注</h2><p>名称放在轮廓外；悬停强调，点击保留选中。</p></div><button ref={close} className="icon-button" aria-label="关闭二维标注放大图" onClick={onClose}><X/></button></div>{children}</section></div>;
}

function SourceDialog({ onClose }) {
  const close=useRef(null);
  useEffect(()=>{const before=document.activeElement;close.current?.focus();const key=e=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',key);const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=previous;before?.focus();};},[onClose]);
  return <div className="modal-backdrop" onClick={onClose}><section className="modal wide is-source-dialog" role="dialog" aria-modal="true" aria-label="肌间沟真实超声原图与来源" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key!=='Tab')return;const list=[...e.currentTarget.querySelectorAll('button,a[href]')];if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0].focus();}}}>
    <div className="modal-head"><div><span className="eyebrow">PUBLISHED SONOANATOMY</span><h2>肌间沟真实超声 · Figure 1</h2></div><button ref={close} className="icon-button" aria-label="关闭肌间沟来源" onClick={onClose}><X/></button></div>
    <img className="is-full-figure" src={referenceMediaUrl(sono.path)} width={sono.width} height={sono.height} alt="Kumar2023原始Figure1：A为C6水平，B为C7水平，C为上干形成后；所有作者标注保持原样"/>
    <p>{sono.orientationNote}</p><ul>{sono.limitations.map(t=><li key={t}>{t}</li>)}</ul><p className="asset-attribution">{sono.license.attribution}</p><div className="asset-source-actions"><a href={sono.source.publisherUrl} target="_blank" rel="noreferrer">期刊原文 ↗</a><a href={sono.license.url} target="_blank" rel="noreferrer">CC BY-NC-SA 4.0 ↗</a></div>
  </section></div>;
}

export default function InterscaleneModule({ anatomy, sharedAnatomy, loadError = '' }) {
  const [level,setLevel]=useState(1.468), [progress,setProgress]=useState(0), [playing,setPlaying]=useState(false);
  const [selected,setSelected]=useState('brachial-roots'), [panelId,setPanelId]=useState('b'), [sourceOpen,setSourceOpen]=useState(false),[resetVersion,setResetVersion]=useState(0);
  const [hoveredId,setHoveredId]=useState(null), [labelsOpen,setLabelsOpen]=useState(false);
  const [levelAdjusting,setLevelAdjusting]=useState(false);
  const [layers,setLayers]=useState({nerve:true,muscle:true,artery:true,vein:true,bone:true});
  const [lesson,setLesson]=useState(-1);
  const [geometryOpen,setGeometryOpen]=useState(false);
  const [originalOpen,setOriginalOpen]=useState(false);
  const current=useRef(progress);current.current=progress;
  const levelControl=useRef(null), levelTimer=useRef(null);
  useEffect(()=>()=>clearTimeout(levelTimer.current),[]);
  const closeSource=useCallback(()=>setSourceOpen(false),[]);
  const openSource=useCallback(()=>{setPlaying(false);setHoveredId(null);setLabelsOpen(false);setSourceOpen(true);},[]);
  const closeLabels=useCallback(()=>{setHoveredId(null);setLabelsOpen(false);},[]);
  const openLabels=useCallback(()=>{setPlaying(false);setHoveredId(null);setSourceOpen(false);setLabelsOpen(true);},[]);
  const onHover=useCallback(id=>setHoveredId(id),[]);
  useEffect(()=>setHoveredId(null),[level,layers]);
  useEffect(()=>{
    if(!playing)return;
    let request,last=performance.now();
    const tick=now=>{const next=Math.min(1,current.current+(now-last)/12000);last=now;current.current=next;setProgress(next);if(next<1)request=requestAnimationFrame(tick);else setPlaying(false);};
    request=requestAnimationFrame(tick);return()=>cancelAnimationFrame(request);
  },[playing]);
  const sections=useMemo(()=>sourceSections(anatomy,level),[anatomy,level]);
  const boneReference=useMemo(()=>vertebralReference(sections),[sections]);
  const bonePositionText=anatomy?boneReference.label:loadError?'骨性参照暂不可用':'骨性参照载入中';
  const stage=animationStage(progress), panel=sono.panels.find(p=>p.id===panelId), [left,top,right,bottom]=panel.crop, panelWidth=right-left;
  const focus=anatomy?.structures.find(s=>s.id===(hoveredId||selected)&&layers[s.kind]!==false);
  const labelProps={sections,selected,hoveredId,onSelect:setSelected,onHover,layers,progress,referenceIds:boneReference.ids};
  const positionText=levelDescription(level);
  function beginLevelAdjustment(){clearTimeout(levelTimer.current);setPlaying(false);setProgress(0);setHoveredId(null);setLevelAdjusting(true);}
  function settleLevelAdjustment(){clearTimeout(levelTimer.current);levelTimer.current=setTimeout(()=>setLevelAdjusting(false),900);}
  function changeLevel(value){
    if(!Number.isFinite(value))return;
    beginLevelAdjustment();
    setLevel(Number(Math.max(LEVEL_MIN,Math.min(LEVEL_MAX,value)).toFixed(3)));
    settleLevelAdjustment();
  }
  function showLevelControl(){levelControl.current?.scrollIntoView({behavior:'auto',block:'start'});levelControl.current?.querySelector('input')?.focus({preventScroll:true});}
  function seek(value){setPlaying(false);setProgress(value);}
  function start(){if(progress>=1)setProgress(0);setPlaying(v=>!v);}
  function reset(){clearTimeout(levelTimer.current);setLevelAdjusting(false);setPlaying(false);setProgress(0);setLevel(LEVEL_INITIAL);setResetVersion(v=>v+1);}
  function goLesson(index){const i=Math.max(0,Math.min(content.steps.length-1,index));setGeometryOpen(true);setLesson(i);setPlaying(false);if(i===1)setSelected('anterior-scalene');if(i===2)setSelected('brachial-roots');if(i===3)setSelected('superior-trunk');if(i===4)setProgress(1);}
  return <section className="interscalene-module" aria-label="肌间沟入路研习室">
    <div className="page-heading"><div><div className="breadcrumb"><span>区域麻醉</span><ArrowRight size={12}/><span>臂丛 · 颈部</span></div><div className="title-row"><h1>{content.title}</h1><span className="module-badge">专题 02 · v0.8.4</span></div><p>先辨前支，再追汇干：声像、典型关系与有来源的三维联动。</p></div><button className="secondary-button" onClick={()=>goLesson(0)}><BookOpen size={16}/>进阶：切面动画与分步讲解</button></div>
    <ReferenceReconstruction base={sharedAnatomy} onOpenSource={openSource}/><details className="is-geometry-explorer" onToggle={e=>setOriginalOpen(e.currentTarget.open)}><summary>原始同源图谱 · 查看未经组合的走行与身份缺口</summary>{originalOpen ? <PlexusTeaching anatomy={anatomy} sharedAnatomy={sharedAnatomy} error={loadError} onOpenSource={openSource}/> : null}</details>
    <details className="is-geometry-explorer" open={geometryOpen} onToggle={event=>{setGeometryOpen(event.currentTarget.open);if(!event.currentTarget.open)setPlaying(false);}}><summary>进阶：从原始图谱抽取几何切面，观察骨性定位与更多邻近结构</summary>
    {geometryOpen ? <div className="is-explorer-body">
    <div className="is-learning-path" aria-label="动画步骤">{content.animation.stages.map((s,i)=><button key={s.id} className={stage===i?'active':''} aria-current={stage===i?'step':undefined} onClick={()=>seek(STAGE_POSITIONS[i])}><span>0{i+1}</span>{s.title}<ArrowRight size={14}/></button>)}</div>
    <section className="is-animation-card">
      <div className="is-animation-toolbar"><div><ScanLine size={18}/><strong>三维 → 同一切面 → 二维 → 真实超声参照</strong><span>12秒 · 可暂停、拖动</span></div><div><button className="secondary-button" onClick={reset}><RotateCcw size={14}/>复位</button><button className="primary-button" onClick={start} disabled={!anatomy}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'暂停动画':progress>=1?'重播动画':'播放动画'}</button></div></div>
      <div className="is-study-grid">
        <article className="is-model-column"><div className="is-column-title"><span>01</span><strong>原始颈部三维</strong><small>{anatomy?`${anatomy.structures.length}个源结构`:'来源网格'}</small></div><section ref={levelControl} className={`is-plane-control ${levelAdjusting?'is-adjusting':''}`} aria-label="切面位置调节">
          <div className="is-plane-control-heading"><label htmlFor="is-plane-level"><ScanLine size={15}/>颈椎骨性定位</label><button className="text-button" onClick={()=>changeLevel(LEVEL_INITIAL)} disabled={!anatomy}>回默认骨性参考</button></div>
          <span className="is-bone-position-caption">当前局部切面经过</span><output className="is-plane-position is-bone-position" htmlFor="is-plane-level" data-testid="vertebral-position" data-reference-ids={boneReference.ids.join(',')}>{bonePositionText}</output>
          <div className="is-bone-control-layout"><SpineLocator anatomy={anatomy} error={loadError} level={level} referenceIds={boneReference.ids} selected={selected} hoveredId={hoveredId} onHover={onHover} onSelect={setSelected}/><div className="is-bone-fine-control">
          <label htmlFor="is-plane-level">附近微调</label><output className="is-plane-offset" htmlFor="is-plane-level">{positionText}</output>
          <div className="is-plane-slider-row"><button type="button" aria-label="向足侧移动1毫米" title="向足侧移动1毫米" disabled={!anatomy||level<=LEVEL_MIN} onClick={()=>changeLevel(level-LEVEL_STEP)}>−</button><input id="is-plane-level" aria-label="肌间沟切面上下移动" aria-valuetext={`${bonePositionText}；${positionText}`} type="range" min={LEVEL_MIN} max={LEVEL_MAX} step={LEVEL_STEP} value={level} disabled={!anatomy} onPointerDown={beginLevelAdjustment} onPointerUp={settleLevelAdjustment} onPointerCancel={settleLevelAdjustment} onChange={e=>changeLevel(Number(e.target.value))}/><button type="button" aria-label="向头侧移动1毫米" title="向头侧移动1毫米" disabled={!anatomy||level>=LEVEL_MAX} onClick={()=>changeLevel(level+LEVEL_STEP)}>+</button></div>
          <div className="is-plane-direction"><span>← 足侧</span><span>1 mm</span><span>头侧 →</span></div>
          <p>绿色线对应同一切面；亮色椎骨表示当前相交。点击编号可联动查看骨骼名称。</p>
          </div></div>
          <p className="is-bone-limits">骨性位置用于定位参照；相邻两块骨相交时同时列出，不据此判定椎间隙或神经根编号。</p>
        </section><Suspense fallback={<div className="is-scene">正在准备三维…</div>}><Scene anatomy={anatomy} sections={sections} level={level} progress={progress} selected={selected} hoveredId={hoveredId} onHover={onHover} onSelect={setSelected} layers={layers} resetVersion={resetVersion} levelAdjusting={levelAdjusting} referenceText={bonePositionText} referenceIds={boneReference.ids}/></Suspense>{loadError&&<p className="is-render-error">颈部模型暂未载入：{loadError}。请刷新；右侧文献图仍可查看。</p>}<p className="is-small-note">绿色为图谱几何参考平面；动画只移动、转动截线平面，原始身体网格保持原样。</p></article>
        <article className="is-slice-column"><div className="is-column-title"><span>02</span><strong>同一截面的二维投影</strong><small>非超声</small></div><button className="secondary-button is-expand-labels" onClick={openLabels}><Expand size={14}/>放大中文标注</button><div className={`is-slice-position ${levelAdjusting?'is-adjusting':''}`}><i/><span>与三维青绿色平面同步</span><strong>{bonePositionText}</strong></div><SectionLabels {...labelProps}/><div className="is-coordinate-note"><strong>外侧 −X → 内侧 +X</strong><p>二维右前、左后；这是模型的方向，不为右侧原图建立空间映射。</p></div></article>
        <article className={`is-ultrasound-column ${stage===3?'is-comparing':''}`}><div className="is-column-title"><span>03</span><strong>文献中的真实超声</strong><button className="icon-button" aria-label="放大肌间沟超声原图" onClick={openSource}><Expand size={15}/></button></div><div className="small-tabs is-us-tabs" aria-label="真实超声层面">{sono.panels.map(p=><button key={p.id} className={panelId===p.id?'active':''} onClick={()=>setPanelId(p.id)}>{p.label}</button>)}</div><button className="is-us-viewport" style={{aspectRatio:`${panelWidth}/${bottom-top}`}} onClick={openSource} aria-label={`查看${panel.label}原图和来源`}><img src={referenceMediaUrl(sono.path)} width={sono.width} height={sono.height} alt={panel.description} style={{width:`${sono.width/panelWidth*100}%`,left:`${-left/panelWidth*100}%`,top:`${-top/(bottom-top)*100}%`}}/></button><p className="is-small-note">{panel.description}</p><p className="is-reference-boundary">另一资料的静态声像 · 未配准<br/>未将三维渐变成这张超声</p><button className="sono-source" onClick={openSource}>Kumar 等 · 2023 · Figure 1<br/>CC BY-NC-SA 4.0 · 原图未改<BookOpen size={13}/></button></article>
      </div>
      <div className="is-timeline"><label htmlFor="is-progress">动画进度</label><input id="is-progress" type="range" min="0" max="1" step=".005" value={progress} onChange={e=>seek(Number(e.target.value))}/><output>{Math.round(progress*12)} / 12秒</output></div>
      <div className="is-stage-explanation"><strong>{content.animation.stages[stage].title}</strong><p>{content.animation.stages[stage].description}</p></div>
    </section>
    <Suspense fallback={<p className="is-small-note">正在准备逐根标注审阅入口…</p>}><RootReview anatomy={anatomy} error={loadError} renderSection={props=><RootCandidateSection anatomy={anatomy} {...props}/>}/></Suspense>
    <details className="is-vertebral-teaching"><summary>超声中怎样根据骨性标志辨认 C6、C7？</summary><div>
      <p><strong>C6：</strong>横突前结节通常较突出，后结节较小，相应神经可见于两结节之间。<strong>C7：</strong>通常后结节突出，前结节缺如或较小；向头侧观察C5时，前、后结节的大小通常较接近。</p>
      <p>结合头足方向连续追踪确认层次；前后结节存在解剖变异，单张图的外观不能作为绝对规则。本模型的骨性相交结果与文献超声各保留自己的方向，未做病例配准。</p>
      <p className="is-bone-limits">当前源骨网格没有逐部件确认的横突结节标注，近端臂丛仍是未分节合并网格；这里说明识别依据，不给模型中的黄色小圈补写C5、C6或C7。</p>
      <div className="is-bone-source-links"><a href="https://asra.com/news-publications/asra-updates/blog-landing/legacy-b-blog-posts/2019/08/06/ultrasound-sonoanatomy-and-associated-interventional-procedures-for-axial-structures" target="_blank" rel="noreferrer">ASRA · 2019 · Fig.7–10 ↗</a><a href="https://www.jstage.jst.go.jp/article/ssrr/9/6/9_2025-0115/_article" target="_blank" rel="noreferrer">Kadono等 · 2025 · 骨性标志变异 ↗</a></div>
    </div></details>
    <div className="is-controls-and-notes"><section className="is-controls-card"><div className="is-mini-heading"><Layers3 size={17}/><h2>辨认切面中的结构</h2></div><div className="is-layer-controls">{Object.entries({nerve:'神经',muscle:'肌肉',artery:'动脉',vein:'静脉',bone:'骨'}).map(([id,name])=><label key={id}><input type="checkbox" checked={layers[id]} onChange={e=>setLayers(s=>({...s,[id]:e.target.checked}))}/><i style={{background:INTERSCALENE_COLORS[id]}}/>{name}</label>)}</div><button className="is-plane-jump" onClick={showLevelControl}><ScanLine size={16}/><span>骨性参照：<strong>{bonePositionText}</strong></span><span>回三维调节 ↑</span></button><div className="is-structure-buttons">{anatomy?.structures.filter(s=>MAIN_IDS.includes(s.id)).map(s=><button key={s.id} aria-pressed={selected===s.id} className={selected===s.id?'active':''} onClick={()=>setSelected(s.id)}><i style={{background:INTERSCALENE_COLORS[s.kind]}}/>{s.name}<small>{sections.some(x=>x.id===s.id)?'本面相交':'此面未相交'}</small></button>)}</div><p className="is-selected-structure">{hoveredId?'鼠标所指':'当前选中'}：{focus?.name||'该结构的主图图层已关闭'}{focus&&<small>{sections.some(s=>s.id===focus.id)?'本切面相交 · 同源联动':'本切面未相交 · 二维不显示此结构'}</small>}<span>上/中/下干随源走行位于更尾侧，不会为凑同一层面而移动。</span></p></section>
      <aside className="is-source-limit"><span className="eyebrow">READ THE SOURCE LIMITS</span><h2>先分清“根”、干和声像结节</h2><p>{content.summary}</p><div className="is-notice"><strong>当前源模型没有独立的C5、C6、C7标签</strong><p>近端网格保持原合并身份；不按形状或连通分量拆出并命名。固定源中未找到可确认的膈神经命名网格，保留文字说明；肩胛背、胸长神经已按真实源网格纳入邻近参考。</p></div><p>超声中一个圆形结节不必然等于一整根；需沿程追踪，根水平与干水平也不同。图中“臂丛根”指脊神经前支。</p><details><summary>查看源网格署名、清单与缺口</summary><p>BodyParts3D — The Database Center for Life Science；Z-Anatomy — Gauthier Kervyn等；FBX分发 — Lluís Vinent Juanico。固定commit 6c7f9016…，衍生资产按CC BY-SA 4.0提供。选取源结构、应用原矩阵并将厘米转米；未改变解剖姿态，局部显示仅相机/裁切。</p><a href="https://github.com/LluisV/Z-Anatomy/tree/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models" target="_blank" rel="noreferrer">固定版本来源 ↗</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0许可 ↗</a><ul>{anatomy?.missingStructures?.map((s,i)=><li key={i}>{typeof s==='string'?s:s.reason||s.name||s.id}</li>)}</ul></details></aside>
    </div>
    {lesson>=0&&<section className="is-lesson" aria-label="肌间沟分步教学"><span>{lesson+1} / {content.steps.length}</span><h2>{content.steps[lesson].title}</h2><p>{content.steps[lesson].description}</p><div><button className="secondary-button" disabled={lesson===0} onClick={()=>goLesson(lesson-1)}>上一步</button><button className="primary-button" disabled={lesson===content.steps.length-1} onClick={()=>goLesson(lesson+1)}>下一步</button><button className="text-button" onClick={()=>setLesson(-1)}>结束教学</button></div></section>}
    <section className="is-boundaries"><h2>把解剖关系与阻滞覆盖分开理解</h2><div>{content.boundaries.map(b=><article key={b.id}><h3>{b.name}</h3><p>{b.summary}</p></article>)}</div></section>
    <details className="is-sources"><summary>正规资料、原文与动画能力说明</summary><p>本动画从真实源网格求交，只解释三维到二维的观察方式。网格没有声学属性，不能生成声影、回声和各向异性，也没有与真实病例配准。</p>{content.sources.map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer"><BookOpen size={15}/><span><strong>{s.title}</strong><small>{s.usage}</small></span><ArrowRight size={14}/></a>)}<a href={sono.source.publisherUrl} target="_blank" rel="noreferrer"><BookOpen size={15}/><span><strong>Kumar 等 · 2023 · Figure 1</strong><small>原刊肌间沟根/干声像，已核官方JATS与CC BY-NC-SA4.0，仅用于图像解剖。</small></span><ArrowRight size={14}/></a></details>
    </div> : null}</details>
    {sourceOpen&&<SourceDialog onClose={closeSource}/>}
    {labelsOpen&&<LabelDialog onClose={closeLabels}><SectionLabels {...labelProps} expanded/></LabelDialog>}
  </section>;
}
