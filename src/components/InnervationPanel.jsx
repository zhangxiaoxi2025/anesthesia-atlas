import { useId, useState } from 'react';
import { ArrowUpRight, BookOpen, Info, ListChecks, ScanLine, ZoomIn } from 'lucide-react';
import innervation from '../data/innervation-v4.json';
import { COLORS } from '../model-utils.js';

// Original concept silhouette and deliberately broad peripheral-nerve zones.
// These are not anatomy meshes, dermatomes, patient maps or block simulations.
// All clinical names, branch/level notes, muscle lists and citations come from
// the source-checked data file. Unmapped skin remains neutral.
const ARM_OUTLINE = 'M88 20 C64 20 51 36 51 61 L49 144 C47 163 52 182 57 197 L62 273 L61 292 L59 307 L45 327 Q38 338 43 343 Q47 348 54 341 L64 328 L62 379 Q62 392 68 392 Q75 392 75 379 L77 345 L78 400 Q78 411 85 411 Q92 411 92 400 L93 345 L96 395 Q96 405 103 405 Q109 405 109 394 L108 346 L113 377 Q114 389 120 389 Q126 388 125 375 L124 330 Q124 315 117 307 L115 291 L117 274 L125 197 C130 180 134 161 131 145 L129 61 C128 36 113 20 88 20 Z';
const REGIONS = {
  'median-palmar-hand': {
    front: ['M60 299 L91 299 L96 316 L97 343 L103 352 L103 404 L96 404 L94 345 L92 345 L92 411 L78 411 L77 345 L75 345 L75 392 L62 392 L63 329 L54 341 Q47 348 42 343 L40 338 L49 324 L58 308 Z'],
    back: [],
  },
  'median-dorsal-tips': {
    front: [],
    back: ['M40 335 L50 333 L56 339 L49 347 L42 344 Z', 'M61 377 L76 377 L76 394 L61 394 Z', 'M77 395 L93 395 L93 413 L77 413 Z', 'M95 389 L103 389 L103 407 L95 407 Z'],
  },
  'ulnar-hand': {
    front: ['M91 299 L117 299 L126 326 L127 390 L113 390 L110 348 L110 407 L103 407 L103 348 L96 336 Z'],
    back: ['M91 299 L117 299 L126 326 L127 390 L113 390 L110 348 L110 407 L103 407 L103 348 L96 336 Z'],
  },
  'radial-posterior-arm': {
    front: [],
    back: ['M62 92 Q88 106 124 92 L127 145 Q131 170 123 192 L60 196 Q51 173 51 148 Z'],
  },
  'radial-inferolateral-arm': {
    front: ['M49 131 L64 133 L71 178 L66 196 L57 198 Q48 173 49 151 Z'],
    back: ['M49 131 L64 133 L71 178 L66 196 L57 198 Q48 173 49 151 Z'],
  },
  'radial-posterior-forearm': {
    front: [],
    back: ['M77 195 L100 195 L98 239 L93 291 L77 292 L74 243 Z'],
  },
  'radial-dorsolateral-hand': {
    front: [],
    back: ['M60 299 L91 299 L97 316 L97 343 L103 349 L103 391 L96 391 L94 345 L92 345 L92 397 L78 397 L77 345 L75 345 L75 378 L62 378 L63 329 L54 341 L49 335 L44 335 L50 324 L58 308 Z'],
  },
  'mc-lateral-forearm': {
    front: ['M57 197 L76 197 L76 236 L70 276 L64 292 L60 291 L61 272 Z'],
    back: ['M57 197 L76 197 L76 236 L70 276 L64 292 L60 291 L61 272 Z'],
  },
};
const NERVE_ENGLISH = { median: 'Median', ulnar: 'Ulnar', radial: 'Radial', musculocutaneous: 'Musculocutaneous' };
const SOURCES = new Map(innervation.sources.map(source => [source.id, source]));
const sourceList = ids => [...new Set(ids || [])].map(id => SOURCES.get(id)).filter(Boolean);
const textOf = value => Array.isArray(value) ? value.join('；') : value;

function SourceLinks({ ids }) {
  const sources = sourceList(ids);
  return sources.length ? <span className="innervation-inline-sources">{sources.map((source, index) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" title={source.title} aria-label={'查看来源：' + source.title}>依据 {index + 1}<ArrowUpRight size={10}/></a>)}</span> : null;
}

function ArmDiagram({ selected, overview, focus, surface }) {
  const uid = useId().replace(/:/g, '');
  const clipId = 'innervation-clip-' + uid;
  const patternId = 'innervation-neutral-' + uid;
  const hand = focus === 'hand';
  const posterior = surface === 'back';
  const caption = posterior ? '右上肢 · 后面 / 手背' : '右上肢 · 前面 / 掌面';
  return <figure className={'innervation-figure ' + (hand ? 'hand-focus' : '')}>
    <svg viewBox={hand ? '31 290 108 128' : '26 8 125 415'} role="img" aria-label={caption + '，外周神经皮肤感觉概念示意'}>
      <title>{caption}</title>
      <desc>概念示意，颜色表示神经本身的典型皮肤支配，不是皮节、精确边界或实际阻滞范围。后面为同一右上肢的背面方向，拇指位于另一侧。</desc>
      <defs>
        <clipPath id={clipId}><path d={ARM_OUTLINE}/></clipPath>
        <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#d9d7cc" strokeWidth=".55"/></pattern>
      </defs>
      <g transform={posterior ? 'translate(176 0) scale(-1 1)' : undefined}>
        <path d={ARM_OUTLINE} fill="#ece9df" stroke="#bdbfb1" strokeWidth="1.35"/>
        <path d={ARM_OUTLINE} fill={'url(#' + patternId + ')'} opacity=".55"/>
        <g clipPath={'url(#' + clipId + ')'}>
          {innervation.nerves.filter(nerve => overview || nerve.id === selected).map(nerve => {
            const keys = [...new Set(nerve.sensoryRegions.map(region => region.regionKey))];
            return <g key={nerve.id} data-nerve={nerve.id} fill={COLORS[nerve.id]} fillOpacity={nerve.id === selected ? .84 : .30} stroke={COLORS[nerve.id]} strokeOpacity={nerve.id === selected ? 1 : .65} strokeWidth={nerve.id === selected ? 1.1 : .6}>
              <title>{nerve.name + '：' + nerve.sensoryRegions.map(region => region.name).join('、')}</title>
              {keys.flatMap(key => (REGIONS[key]?.[surface] || []).map((d, index) => <path key={key + '-' + index} d={d} data-region-key={key}/>))}
            </g>;
          })}
        </g>
        <path d="M55 194 Q88 203 126 194 M61 297 Q88 302 117 297" stroke="#9eaa98" strokeWidth="1" strokeDasharray="3 3" fill="none"/>
        {hand ? null : <path d="M64 317 Q87 327 116 317" stroke="#d3d1c6" strokeWidth=".7" fill="none"/>}
      </g>
    </svg>
    <figcaption>{caption}</figcaption>
  </figure>;
}

function SensoryPanel({ selected, nerve, blockType }) {
  const [overview, setOverview] = useState(true);
  const [focus, setFocus] = useState('upperlimb');
  const hasHand = nerve.sensoryRegions.some(region => region.region === 'hand');
  return <div className="innervation-sensory-layout">
    <div className="innervation-map-card">
      <div className="innervation-map-controls">
        <div className="innervation-segmented" role="group" aria-label="感觉图观察范围"><button aria-pressed={focus === 'upperlimb'} onClick={() => setFocus('upperlimb')}>全上肢</button><button aria-pressed={focus === 'hand'} onClick={() => setFocus('hand')}><ZoomIn size={13}/>手部放大</button></div>
        <button className={'innervation-overview-toggle ' + (overview ? 'active' : '')} aria-pressed={overview} onClick={() => setOverview(value => !value)}>{overview ? '四神经总览' : '仅所选神经'}</button>
      </div>
      <div className="innervation-body-levels" aria-hidden="true">{focus === 'upperlimb' ? <><span>上臂</span><span>前臂</span><span>手</span></> : <span>手部细看</span>}</div>
      <div className="innervation-figures"><ArmDiagram selected={selected} overview={overview} focus={focus} surface="front"/><ArmDiagram selected={selected} overview={overview} focus={focus} surface="back"/></div>
      <div className="innervation-map-key"><span><i style={{ background: COLORS[selected] }}/><strong>{nerve.name}</strong>加深</span><span><i className="neutral"/>中性色：其他皮支 / 未分区</span></div>
      <p className="innervation-diagram-note">原创概念示意 · 宽泛区域帮助定位，边界有重叠和个体差异。灰色不代表没有感觉，也不代表阻滞失败。</p>
      {focus === 'hand' && !hasHand ? <p className="innervation-no-hand"><Info size={14}/>所选神经的清单没有手部主要皮区；返回“全上肢”查看其前臂区域。</p> : null}
    </div>
    <div className="innervation-region-list">
      <div className="innervation-list-title"><ScanLine size={16}/><h3>{nerve.name} · 皮肤区域与分支</h3></div>
      {nerve.sensoryRegions.map(region => <article className="innervation-region" key={region.id}>
        <div className="innervation-region-heading"><span className="innervation-region-dot"/><h4>{region.name}</h4><span>{region.region === 'arm' ? '上臂' : region.region === 'forearm' ? '前臂' : '手部'}</span></div>
        <p>{region.description}</p><dl><div><dt>皮支</dt><dd>{region.branch}</dd></div><div><dt>层面</dt><dd>{region.levelNote}</dd></div></dl>
        <SourceLinks ids={region.sourceIds}/>
      </article>)}
      <BlockBoundary nerve={nerve} blockType={blockType}/>
    </div>
  </div>;
}

function BlockBoundary({ nerve, blockType }) {
  const notes = nerve.blockNotes?.[blockType] || [];
  return <aside className="innervation-block-boundary">
    <div><Info size={16}/><strong>{blockType === 'interscalene' ? '肌间沟入路：支配与效果分开' : '腋路入路：近端分支要分开'}</strong></div>
    <p>上图和清单展示神经本身的支配。能否被当前入路涉及，取决于分支位置和实际阻滞层面，不能由颜色推定成功。</p>
    {notes.length ? <ul>{notes.map(note => <li key={textOf(note)}>{textOf(note)}</li>)}</ul> : null}
  </aside>;
}

function MotorPanel({ nerve, blockType }) {
  return <div className="innervation-motor-panel">
    <div className="innervation-motor-intro"><ListChecks size={20}/><div><h3>{nerve.name} · 逐肌肉支配清单</h3><p>{nerve.motor.length} 个支配条目，部分按肌头或肌腹分开。动作由多肌协同；不以肌肉色团代替解剖依据。</p></div></div>
    <BlockBoundary nerve={nerve} blockType={blockType}/>
    <div className="innervation-table-wrap" role="region" aria-label={nerve.name + '肌肉、动作、分支及层面列表'} tabIndex="0">
      <table className="innervation-motor-table"><caption>{nerve.name}的肌肉联系；神经支配不等于当前入路一定覆盖</caption><thead><tr><th scope="col">肌肉 / 分部</th><th scope="col">主要动作</th><th scope="col">神经分支</th><th scope="col">层面与边界</th></tr></thead><tbody>
        {nerve.motor.map(muscle => <tr key={muscle.id}><th scope="row" data-label="肌肉"><strong>{muscle.name}</strong>{muscle.en ? <small>{muscle.en}</small> : null}<SourceLinks ids={muscle.sourceIds}/></th><td data-label="主要动作">{textOf(muscle.action)}</td><td data-label="神经分支">{muscle.branch}</td><td data-label="层面与边界">{muscle.levelNote}</td></tr>)}
      </tbody></table>
    </div>
    {nerve.variationNotes?.length ? <div className="innervation-variation-notes"><h4>交通支与变异</h4><ul>{nerve.variationNotes.map(note => <li key={textOf(note)}>{textOf(note)}</li>)}</ul></div> : null}
    <OtherMotor/>
  </div>;
}

function OtherMotor() {
  const groups = innervation.motorOther || [];
  if (!groups.length) return null;
  return <details className="innervation-other-motor"><summary><ListChecks size={16}/><span><strong>肩部与肩带：另一些神经的肌肉支配</strong><small>{groups.length} 组神经 · 不包含在四终末神经清单中，不能据四神经高亮推断覆盖</small></span><span className="innervation-detail-plus" aria-hidden="true">＋</span></summary>
    <div className="innervation-other-motor-groups">{groups.map(group => <article key={group.id}><h4>{group.name}</h4><p>来源：{group.origin}</p><div className="innervation-table-wrap" role="region" aria-label={group.name + '肌肉支配清单'} tabIndex="0"><table className="innervation-motor-table"><thead><tr><th scope="col">肌肉 / 分部</th><th scope="col">主要动作</th><th scope="col">神经分支</th><th scope="col">层面与边界</th></tr></thead><tbody>{group.motor.map(muscle => <tr key={muscle.id}><th scope="row"><strong>{muscle.name}</strong>{muscle.en ? <small>{muscle.en}</small> : null}<SourceLinks ids={muscle.sourceIds}/></th><td>{textOf(muscle.action)}</td><td>{muscle.branch}</td><td>{muscle.levelNote}</td></tr>)}</tbody></table></div></article>)}</div>
  </details>;
}

function OtherCutaneous() {
  return <details className="innervation-other-cutaneous"><summary><span className="innervation-neutral-dot"/><span><strong>其他皮神经也需要单独认识</strong><small>四神经不能代表全部上肢皮肤；展开看灰色区域的主要来源</small></span><span className="innervation-detail-plus" aria-hidden="true">＋</span></summary>
    <div className="innervation-other-grid">{innervation.cutaneousOther.map(item => <article key={item.id}><h4>{item.name}</h4><dl><div><dt>来源</dt><dd>{item.origin}</dd></div><div><dt>区域</dt><dd>{textOf(item.regions)}</dd></div><div><dt>腋路边界</dt><dd>{item.axillaryBoundary}</dd></div></dl><SourceLinks ids={item.sourceIds}/></article>)}</div>
  </details>;
}

export default function InnervationPanel({ selected = 'median', onSelect, mode = 'sensory', setMode, blockType = 'axillary', onSources }) {
  const uid = useId().replace(/:/g, '');
  const nerve = innervation.nerves.find(item => item.id === selected) || innervation.nerves[0];
  const activeMode = mode === 'motor' ? 'motor' : 'sensory';
  const activeBlock = blockType === 'interscalene' ? 'interscalene' : 'axillary';
  const relatedSources = sourceList(nerve.sourceIds);
  const chooseMode = value => setMode?.(value);
  function moveTab(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'sensory' : event.key === 'End' ? 'motor' : activeMode === 'sensory' ? 'motor' : 'sensory';
    chooseMode(next);
    event.currentTarget.parentElement.querySelector('[data-mode="' + next + '"]')?.focus();
  }
  return <section className="innervation-panel" style={{ '--innervation-color': COLORS[nerve.id] }} aria-labelledby={'innervation-title-' + uid}>
    <header className="innervation-heading"><div><span className="innervation-eyebrow">FROM NERVE TO FUNCTION</span><h2 id={'innervation-title-' + uid}>上肢感觉与肌肉支配</h2><p>四条终末神经逐区、逐肌学习，另列肩带神经与其他皮支。</p></div><span className="innervation-schematic-badge">概念示意 · 非阻滞预测</span></header>
    <div className="innervation-nerve-picker" role="group" aria-label="选择要学习支配范围的神经">{innervation.nerves.map(item => <button key={item.id} aria-pressed={item.id === nerve.id} className={item.id === nerve.id ? 'active' : ''} style={{ '--choice-color': COLORS[item.id] }} onClick={() => onSelect?.(item.id)}><i/><span><strong>{item.name}</strong><small>{NERVE_ENGLISH[item.id]}</small></span>{item.id === nerve.id ? <span className="innervation-selected-word">已选</span> : null}</button>)}</div>
    <div className="innervation-toolbar"><div className="innervation-mode-tabs" role="tablist" aria-label="选择感觉或肌肉支配">{[{ id: 'sensory', label: '皮肤感觉', icon: ScanLine }, { id: 'motor', label: '肌肉 · 动作清单', icon: ListChecks }].map(item => <button key={item.id} id={'innervation-tab-' + item.id + '-' + uid} role="tab" aria-selected={activeMode === item.id} aria-controls={'innervation-content-' + uid} tabIndex={activeMode === item.id ? 0 : -1} data-mode={item.id} onKeyDown={moveTab} onClick={() => chooseMode(item.id)}><item.icon size={15}/>{item.label}</button>)}</div><span className="innervation-route-label">当前入路：{activeBlock === 'interscalene' ? '肌间沟' : '腋路'}</span></div>
    <div id={'innervation-content-' + uid} role="tabpanel" aria-labelledby={'innervation-tab-' + activeMode + '-' + uid} className="innervation-tab-content">{activeMode === 'sensory' ? <SensoryPanel selected={nerve.id} nerve={nerve} blockType={activeBlock}/> : <MotorPanel nerve={nerve} blockType={activeBlock}/>}</div>
    <OtherCutaneous/>
    <footer className="innervation-footer"><p><strong>支配、皮节和麻醉覆盖是三个概念。</strong>图示不是皮节图；没有显示深部关节、筋膜或止血带痛的完整传入，也不预测患者个体效果。</p>{onSources ? <button className="innervation-source-button" onClick={() => onSources(nerve.sourceIds)}><BookOpen size={14}/>查看教学来源</button> : null}</footer>
    <details className="innervation-references"><summary><BookOpen size={14}/>核对{nerve.name}的正式来源（{relatedSources.length}）</summary><ol>{relatedSources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={13}/></a>{source.usage ? <p>{source.usage}</p> : null}</li>)}</ol></details>
  </section>;
}
