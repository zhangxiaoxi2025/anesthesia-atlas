import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Crosshair, Expand, Eye, EyeOff, Focus, GraduationCap, Info, Layers3, Link2, Maximize2, MousePointer2, PanelLeftClose, Play, RotateCcw, ScanLine, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import clinical from './data/clinical.json';
import clinicalV3 from './data/clinical-v3.json';
import referenceAtlas from './data/reference-atlas.json';
import ReferenceAtlas from './components/ReferenceAtlas.jsx';
import ultrasound from './data/ultrasound.json';
import UltrasoundWorkbench from './components/UltrasoundWorkbench.jsx';
import { COLORS, loadAnatomy, loadInterscaleneAnatomy, nerveIdFor, referenceMediaUrl } from './model-utils.js';
import CrossSection from './components/CrossSection.jsx';
import SourceSliceWorkbench from './components/SourceSliceWorkbench.jsx';
import { mergeSourceAnatomy } from './slice-workbench-utils.js';
import InnervationPanel from './components/InnervationPanel.jsx';
import './innervation.css';
const InterscaleneModule = lazy(() => import('./components/InterscaleneModule.jsx'));

const DEFAULT_LAYERS = { nerve: true, artery: true, vein: true, muscle: true, bone: true, skin: false };

function Toggle({ label, checked, onChange, color, description }) {
  return <button className="layer-row" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)}><span className="layer-swatch" style={{ background: color }} /><span>{label}{description && <small>{description}</small>}</span><span className={`switch ${checked ? 'on' : ''}`}><i /></span></button>;
}

function Modal({ title, children, onClose, wide = false }) {
  useEffect(() => {
    const previous = document.activeElement;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector('[role="dialog"]');
    const focusable = () => [...dialog.querySelectorAll('button,a[href],input,select,summary,[tabindex="0"]')].filter(el => !el.disabled);
    focusable()[0]?.focus();
    const trap = e => {
      if (e.key !== 'Tab') return;
      const list = focusable(), first = list[0], last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    dialog.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', handler); dialog.removeEventListener('keydown', trap); document.body.style.overflow = ''; previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onClick={onClose}><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ANESTHESIA ANATOMY STUDIO</span><h2>{title}</h2></div><button className="icon-button" aria-label="关闭对话框" onClick={onClose}><X size={21}/></button></div>{children}</section></div>;
}

function Quiz({ onClose }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const question = clinical.quiz[index];
  const chosen = answers[question.id];
  const complete = Object.keys(answers).length === clinical.quiz.length;
  const score = clinical.quiz.filter(q => answers[q.id] === q.answer).length;
  return <Modal title="腋路识别练习" onClose={onClose}>
    <div className="quiz-progress"><span>问题 {index + 1} / {clinical.quiz.length}</span><span>{complete ? `已完成 · ${score} 题正确` : '每题作答后查看解析'}</span></div>
    <div className="progress-track"><i style={{ width: `${(index + 1) / clinical.quiz.length * 100}%` }}/></div>
    <h3 className="quiz-question">{question.question}</h3>
    <div className="quiz-options">{question.options.map((option, n) => <button key={option} disabled={chosen !== undefined} className={`${chosen === n ? 'chosen' : ''} ${chosen !== undefined && n === question.answer ? 'correct' : ''} ${chosen === n && n !== question.answer ? 'incorrect' : ''}`} onClick={() => setAnswers(a => ({ ...a, [question.id]: n }))}><span>{String.fromCharCode(65 + n)}</span>{option}{chosen !== undefined && n === question.answer && <Check size={19}/>}</button>)}</div>
    {chosen !== undefined && <div className="quiz-explanation"><strong>{chosen === question.answer ? '回答正确' : '再看一下这个边界'}</strong><p>{question.explanation}</p></div>}
    <div className="modal-foot"><button className="secondary-button" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ChevronLeft size={16}/>上一题</button>{index < clinical.quiz.length - 1 ? <button className="primary-button" disabled={chosen === undefined} onClick={() => setIndex(i => i + 1)}>下一题<ArrowRight size={16}/></button> : complete ? <button className="primary-button" onClick={onClose}>完成练习<Check size={16}/></button> : <button className="secondary-button" onClick={() => setIndex(clinical.quiz.findIndex(q => answers[q.id] === undefined))}>继续未答题<ArrowRight size={16}/></button>}</div>
  </Modal>;
}

function LicenseText({ anatomy, kind }) {
  const [text, setText] = useState('正在载入…');
  useEffect(() => {
    const embedded = kind === 'license' ? anatomy?.embeddedLicense : kind === 'software' ? anatomy?.embeddedSoftwareNotices : anatomy?.embeddedAttribution ? anatomy.embeddedAttribution + '\n\n' + (anatomy.embeddedInterscaleneAttribution || '') : null;
    if (embedded) { setText(embedded); return; }
    const path = kind === 'license' ? '/models/source/Z-UPSTREAM-LICENSE.txt' : kind === 'software' ? '/THIRD_PARTY_NOTICES.txt' : '/models/ATTRIBUTION.md';
    const abort = new AbortController();
    Promise.all((kind === 'attribution' ? [path, '/interscalene/ATTRIBUTION.md'] : [path]).map(url => fetch(url, { signal: abort.signal }).then(r => { if (!r.ok) throw new Error(); return r.text(); }))).then(parts => setText(parts.join('\n\n'))).catch(e => { if (e.name !== 'AbortError') setText('文件未载入，请参阅项目 docs/ASSET-LICENSES.md。'); });
    return () => abort.abort();
  }, [anatomy, kind]);
  return <pre className="license-text">{text}</pre>;
}

export default function App() {
  const [activeModule, setActiveModule] = useState('interscalene');
  const [anatomy, setAnatomy] = useState(null);
  const [neckAnatomy, setNeckAnatomy] = useState(null);
  const [neckError, setNeckError] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [selected, setSelected] = useState('median');
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [opacity, setOpacity] = useState(.25);
  const [isolated, setIsolated] = useState(false);
  const [labels, setLabels] = useState(true);
  const [showTarget, setShowTarget] = useState(false);
  const [targetId, setTargetId] = useState('perivascular');
  const [level, setLevel] = useState(1.295);
  const [showPlane, setShowPlane] = useState(false);
  const [view, setView] = useState('arm');
  const [viewVersion, setViewVersion] = useState(0);
  const [coverage, setCoverage] = useState('sensory');
  const [detailTab, setDetailTab] = useState('sensory');
  const [modal, setModal] = useState(null);
  const [teaching, setTeaching] = useState(false);
  const [step, setStep] = useState(0);
  const [presentation, setPresentation] = useState(false);
  const [inspected, setInspected] = useState('');
  const [mobileControls, setMobileControls] = useState(false);
  const nerve = clinical.nerves.find(n => n.id === selected) || clinical.nerves[0];
  const closeModal = () => setModal(null);

  useEffect(() => {
    if (anatomy) return;
    const abort = new AbortController();
    loadAnatomy(abort.signal).then(setAnatomy).catch(e => { if (e.name !== 'AbortError') setLoadError(e.message); });
    return () => abort.abort();
  }, [anatomy]);
  useEffect(() => { const abort = new AbortController(); loadInterscaleneAnatomy(abort.signal).then(setNeckAnatomy).catch(e => { if (e.name !== 'AbortError') setNeckError(e.message); }); return () => abort.abort(); }, []);
  const sharedModels = useMemo(() => { if (!anatomy || !neckAnatomy) return { anatomy: null, error: loadError || neckError }; try { return { anatomy: mergeSourceAnatomy(neckAnatomy, anatomy), error: '' }; } catch (e) { return { anatomy: null, error: '同源模型校验未通过：' + e.message }; } }, [anatomy, neckAnatomy, loadError, neckError]);

  function selectNerve(id) { setSelected(id); setInspected(''); setMobileControls(false); }
  function chooseView(next) { setView(next); setViewVersion(v => v + 1); }
  function reset() { setSelected('median'); setLayers(DEFAULT_LAYERS); setOpacity(.25); setIsolated(false); setLabels(true); setShowTarget(false); setTargetId('perivascular'); setCoverage('sensory'); setDetailTab('sensory'); setShowPlane(false); setLevel(1.295); chooseView('arm'); setTeaching(false); setStep(0); setInspected(''); }
  function goStep(index) {
    const i = Math.max(0, Math.min(clinicalV3.steps.length - 1, index));
    setStep(i); setLevel(1.295);
    const s = clinicalV3.steps[i];
    if (s.nerveId) selectNerve(s.nerveId);
    setIsolated(false); setLayers(DEFAULT_LAYERS); setShowTarget(false);
    setShowPlane(false);
    if (s.stage === 'function') { setCoverage('sensory'); setDetailTab('sensory'); }
    chooseView(s.stage === 'anatomy' ? 'axilla' : 'arm');
    if (s.stage === 'variation') document.getElementById('reference-atlas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function startTeaching() { setTeaching(true); goStep(0); }
  const target = clinical.targets.find(t => t.id === targetId) || clinical.targets[0];
  const stepData = clinicalV3.steps[step];

  return <div className={`app ultrasound-mode sourced-mode ${presentation ? 'presentation' : ''}`}>
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); reset(); }} aria-label="麻醉解剖研习室首页"><div className="brand-mark"><Activity size={23} strokeWidth={1.7}/></div><div><strong>麻醉解剖<span>研习室</span></strong><small>ANESTHESIA ANATOMY STUDIO</small></div></a>
      <nav className="top-nav" aria-label="主导航"><button className={activeModule === 'interscalene' ? 'active' : ''} onClick={() => { setActiveModule('interscalene'); setTeaching(false); }}><ScanLine size={16}/>肌间沟 · 三维与切面</button><button className={activeModule === 'axillary' ? 'active' : ''} onClick={() => setActiveModule('axillary')}><Layers3 size={16}/>腋路 · 超声与三维</button><button onClick={() => document.getElementById('full-innervation')?.scrollIntoView({ behavior: 'smooth' })}><BookOpen size={16}/>感觉与运动</button></nav>
      <div className="top-actions"><span className="local-status"><i/>本地学习版</span><button className={`secondary-button presentation-button ${presentation ? 'selected' : ''}`} onClick={() => setPresentation(v => !v)}><Maximize2 size={15}/>{presentation ? '退出投屏' : '投屏模式'}</button></div>
    </header>

    <main>
      <div className="module-selector narrow-module-selector" aria-label="专题切换"><button className={activeModule === 'interscalene' ? 'active' : ''} onClick={() => setActiveModule('interscalene')}>肌间沟 · 联动</button><button className={activeModule === 'axillary' ? 'active' : ''} onClick={() => setActiveModule('axillary')}>腋路 · 超声</button><button onClick={() => document.getElementById('full-innervation')?.scrollIntoView({ behavior: 'smooth' })}>感觉与运动</button></div>
      {activeModule === 'interscalene' ? <Suspense fallback={<p className="modal-intro">正在准备肌间沟研习室…</p>}><InterscaleneModule anatomy={neckAnatomy} sharedAnatomy={sharedModels.anatomy} loadError={neckError || sharedModels.error}/></Suspense> : <>
      <div className="page-heading"><div><div className="breadcrumb"><span>区域麻醉</span><ChevronRight size={12}/><span>上肢神经阻滞</span><ChevronRight size={12}/><strong>腋路臂丛</strong></div><div className="title-row"><h1>腋路臂丛神经阻滞</h1><span className="module-badge">专题 01 · v0.8.4</span></div><p>用有出处的体位与真实超声识别结构，用原始三维图谱追踪神经走行。</p></div><button className="primary-button lesson-button" onClick={startTeaching}><Play size={15} fill="currentColor"/>开始分步教学<ArrowRight size={16}/></button></div>

      <div className="learning-path"><span>01 文献体位与探头</span><ArrowRight size={14}/><span>02 真实超声识别</span><ArrowRight size={14}/><span>03 原始图谱走行</span><ArrowRight size={14}/><span>04 感觉与运动</span></div>
      <div className="study-layout">
        <aside className={`control-panel ${mobileControls ? 'mobile-open' : ''}`}>
          <div className="panel-title"><span><SlidersHorizontal size={16}/>探索设置</span><button className="icon-button mobile-close" aria-label="关闭探索设置" onClick={() => setMobileControls(false)}><X size={17}/></button><span className="tiny-label desktop-only">右侧 · 成人</span></div>
          <div className="control-section"><div className="section-label"><span>选择神经</span><span>04</span></div><div className="nerve-buttons">{clinical.nerves.map((n, i) => <button key={n.id} className={`nerve-button ${selected === n.id ? 'active' : ''}`} style={{ '--nerve-color': COLORS[n.id] }} onClick={() => selectNerve(n.id)}><span className="nerve-dot"/><span><strong>{n.name}</strong><small>{n.en}</small></span><span className="nerve-number">0{i + 1}</span>{selected === n.id && <ChevronRight size={15}/>}</button>)}</div></div>
          <div className="control-section layers"><div className="section-label"><span>解剖图层</span><Layers3 size={14}/></div>{[{ id: 'nerve', label: '神经', color: '#d4af51' }, { id: 'artery', label: '动脉', color: COLORS.artery }, { id: 'vein', label: '静脉', color: COLORS.vein }, { id: 'muscle', label: '肌肉', color: COLORS.muscle }, { id: 'bone', label: '骨骼', color: '#d9d3c1' }, { id: 'skin', label: '体表参考', color: '#c6b8a8' }].map(l => <Toggle key={l.id} label={l.label} color={l.color} checked={layers[l.id]} onChange={v => setLayers(s => ({ ...s, [l.id]: v }))}/>)}<div className="opacity-control"><div><span>肌肉透明度</span><strong>{Math.round(opacity * 100)}%</strong></div><input aria-label="肌肉透明度" type="range" min="0.05" max="0.8" step="0.05" value={opacity} onChange={e => setOpacity(Number(e.target.value))}/></div></div>
          <div className="control-section display-options"><div className="section-label"><span>显示辅助</span></div><Toggle label="结构名称" color="#6c8a80" checked={labels} onChange={setLabels}/><Toggle label="模型参考切面" color="#52928c" checked={showPlane} onChange={setShowPlane}/><button className={`isolate-button ${isolated ? 'active' : ''}`} onClick={() => setIsolated(v => !v)}><Focus size={15}/>{isolated ? '恢复周围结构' : '单独观察所选神经'}<ChevronRight size={14}/></button></div>
          <button className="source-card" onClick={() => setModal('models')}><ShieldCheck size={22}/><span><strong>模型与资料可追溯</strong><small>查看结构来源与使用边界</small></span><ArrowDownRight size={15}/></button>
        </aside>

        <UltrasoundWorkbench selected={selected} onSelect={selectNerve} onSource={() => setModal('ultrasound')}/>
        <section className="viewer-panel slice-viewer-panel">
          <div className="viewer-top"><div className="viewer-title"><span className="live-dot"/><strong>颈部至上臂 · 三维与切面</strong><span className="view-tag neutral-pose-tag">源图谱中立位</span></div><div className="viewer-tools"><button className="icon-button mobile-settings" aria-label="打开探索设置" onClick={() => setMobileControls(true)}><SlidersHorizontal size={17}/></button><button className="icon-button" aria-label="重置腋路研习室" onClick={reset}><RotateCcw size={16}/></button></div></div>
          <SourceSliceWorkbench anatomy={sharedModels.anatomy} route="axillary" selectedNerve={selected} selectedIds={showTarget ? target.nerveIds : undefined} onSelect={id => { const structure = sharedModels.anatomy?.structures.find(s => s.id === id); const nerveId = structure && nerveIdFor(structure); if (nerveId) selectNerve(nerveId); if (structure) setInspected(structure.name); }} layers={layers} opacity={opacity} isolated={isolated} showLabels={labels} level={level} onLevelChange={setLevel} showPlane={showPlane} onShowPlaneChange={setShowPlane} externalResetVersion={viewVersion} error={sharedModels.error}/>
          <p className="ssw-axillary-notes"><strong>左侧保留实际声像。</strong>上方示意图与下方三维来自同一原始模型；图谱中立位与论文操作体位不同。血管按源名显示，不能把肱动脉改称声像中的AA。</p>
        </section>

        <aside className="nerve-panel" style={{ '--nerve-color': COLORS[selected] }}>
          <div className="nerve-card-top"><span className="eyebrow">STRUCTURE NOTES</span><span className="nerve-index">0{clinical.nerves.findIndex(n => n.id === selected) + 1} / 04</span></div><div className="nerve-card-title"><span className="large-nerve-dot"/><div><h2>{nerve.name}</h2><p>{nerve.en}</p></div></div><div className="root-tag">神经根来源 <strong>{nerve.roots}</strong></div><p className="nerve-summary">{nerve.summary}</p>
          <div className="course-block"><div className="section-label"><span><Link2 size={14}/>走行与局部关系</span></div><ol>{nerve.course.map((text, i) => <li key={text}><span>{i + 1}</span><p>{text}</p></li>)}</ol></div>
          <div className="detail-tabs" role="tablist" aria-label="神经功能说明"><button role="tab" aria-selected={detailTab === 'sensory'} className={detailTab === 'sensory' ? 'active' : ''} onClick={() => { setDetailTab('sensory'); setCoverage('sensory'); }}>感觉范围</button><button role="tab" aria-selected={detailTab === 'motor'} className={detailTab === 'motor' ? 'active' : ''} onClick={() => { setDetailTab('motor'); setCoverage('motor'); }}>运动联系</button></div><ul className="function-list">{nerve[detailTab].map(text => <li key={text}><span style={{ background: COLORS[selected] }}/>{text}</li>)}</ul><div className="boundary-callout"><Info size={15}/><div><strong>注意阻滞层面</strong><p>{nerve.limitations[0]}</p><button onClick={() => setModal('boundaries')}>查看覆盖边界<ArrowRight size={13}/></button></div></div>
        </aside>

        <ReferenceAtlas onInspect={id => setModal(`atlas:${id}`)}/>
        <div className="bottom-grid"><section className="study-card section-card"><div className="study-card-head"><div><span className="card-number">01</span><h2>中立位模型截线</h2></div><button className={`text-button ${showPlane ? 'active' : ''}`} onClick={() => setShowPlane(v => !v)}><ScanLine size={14}/>{showPlane ? '已联动位置' : '显示位置'}</button></div><CrossSection anatomy={anatomy} level={level} setLevel={value => { setLevel(value); setShowPlane(true); }} selected={selected} onSelect={selectNerve} layers={layers} showTarget={showTarget} targetId={targetId}/></section>
        <section className="study-card distribution-card"><div className="study-card-head"><div><span className="card-number">02</span><h2>远端功能分布</h2></div><span className="schematic-tag">典型范围示意</span></div><div className="coverage-link-card"><strong>从上臂、前臂看到手</strong><p>四条神经的皮肤区、其他皮支及逐肌肉运动清单已合并到下方完整面板。这里的神经本体支配与腋路实际覆盖分开说明。</p><button className="secondary-button" onClick={() => document.getElementById('full-innervation')?.scrollIntoView({ behavior: 'smooth' })}>查看完整感觉与运动<ArrowRight size={14}/></button></div></section>
        <section className="study-card target-card"><div className="study-card-head"><div><span className="card-number">03</span><h2>理解靶区概念</h2></div><Crosshair size={17}/></div><p className="target-intro">辨认相关神经与血管，配合文字理解靶区概念。</p><label className="target-select-label" htmlFor="target-select">观察场景</label><div className="select-wrap"><select id="target-select" value={targetId} onChange={e => { setTargetId(e.target.value); setShowTarget(true); setIsolated(false); selectNerve(clinical.targets.find(t => t.id === e.target.value).nerveIds[0]); setLevel(1.295); chooseView('axilla'); }}>{clinical.targets.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select><ChevronDown size={14}/></div><p className="target-description">{target.summary}</p><div className="affected-nerves"><span>关注神经</span><div>{target.nerveIds.map(id => <button style={{ '--nerve-color': COLORS[id] }} key={id} onClick={() => selectNerve(id)}><i/>{clinical.nerves.find(n => n.id === id)?.name}</button>)}</div></div><button className={`target-button ${showTarget ? 'active' : ''}`} onClick={() => { setShowTarget(v => !v); setIsolated(false); if (!showTarget) { if (!target.nerveIds.includes(selected)) selectNerve(target.nerveIds[0]); chooseView('axilla'); } }}><Eye size={16}/>{showTarget ? '退出关系演示' : '强调相关结构'}<ArrowRight size={16}/></button><p className="target-caution"><Info size={13}/>{target.caution}</p></section></div>
      </div>

      {teaching && <section className="teaching-bar" aria-label="分步教学"><div className="teaching-progress"><span>分步教学</span><strong>{String(step + 1).padStart(2, '0')}<small> / {String(clinicalV3.steps.length).padStart(2, '0')}</small></strong></div><div className="teaching-step"><h3>{stepData.title}</h3><p>{stepData.description}</p></div><div className="teaching-actions"><button className="icon-button" aria-label="上一步" disabled={step === 0} onClick={() => goStep(step - 1)}><ChevronLeft size={20}/></button>{step < clinicalV3.steps.length - 1 ? <button className="primary-button" onClick={() => goStep(step + 1)}>下一步<ArrowRight size={16}/></button> : <button className="primary-button" onClick={() => { setTeaching(false); setModal('quiz'); }}>进入练习<GraduationCap size={17}/></button>}<button className="icon-button" aria-label="结束分步教学" onClick={() => setTeaching(false)}><X size={17}/></button></div></section>}
      <div className="learning-strip"><div><div className="learning-icon"><GraduationCap size={23}/></div><div><strong>看懂了，再试着认一认。</strong><p>用几个临床解剖问题，检查感觉范围、神经走行和覆盖边界。</p></div></div><button className="secondary-button" onClick={() => setModal('quiz')}>进入识别练习<ArrowRight size={16}/></button></div>
      </>}
      <div className="global-innervation-wrap" id="full-innervation"><InnervationPanel selected={selected} onSelect={selectNerve} mode={coverage} setMode={mode => { setCoverage(mode); setDetailTab(mode); }} blockType={activeModule}/></div>
      <footer className="page-footer"><span>麻醉解剖研习室 / 肌间沟与腋路 · v0.8.4</span><div><span><i/>教学内容待临床审阅</span></div></footer>
    </main>

    {modal === 'quiz' && <Quiz onClose={closeModal}/>}
    {modal === 'sources' && <Modal title="资料与证据来源" wide onClose={closeModal}><p className="modal-intro">每个模块把解剖事实、阻滞层面和覆盖边界分别核对。下列为当前内容的文字依据；Vazin 的体位/超声裁图按 CC BY 4.0 使用，Han 的原刊图按 CC BY-NC 3.0 用于非商业教学；具体来源、图号和许可在来源图库中逐一列出。NYSORA及教材图片仅提供原站链接。</p><div className="asset-source-actions"><button onClick={() => setModal('ultrasound')}>体位与超声来源 ↗</button></div><div className="source-list">{clinical.sources.map((s, i) => <a key={s.id} href={s.url} target="_blank" rel="noreferrer"><span>{String(i + 1).padStart(2, '0')}</span><div><small>{s.type} {s.year ? `· ${s.year}` : ''}</small><h3>{s.title}</h3><p>{s.usage}</p></div><ArrowDownRight size={18}/></a>)}</div><div className="modal-notice"><ShieldCheck size={18}/><p>软件验证和文献核对已分开记录。临床内容仍需麻醉医生审阅，模型参考解剖不代表患者个体情况。</p></div></Modal>}
    {modal === 'boundaries' && <Modal title="覆盖边界与变异" wide onClose={closeModal}><div className="boundary-list">{clinical.boundaries.map(b => <article key={b.id}><Info size={18}/><div><h3>{b.name}</h3><p>{b.summary}</p></div></article>)}</div><h3 className="modal-subtitle">当前所选：{nerve.name}</h3><ul className="modal-bullets">{nerve.limitations.map(l => <li key={l}>{l}</li>)}</ul><div className="modal-notice"><Info size={18}/><p>本工具用于理解解剖，不给出剂量、患者个体效果预测或临床操作处方。关系演示只强调已有结构；筋膜和可注药空间尚未建模。</p></div></Modal>}
    {modal === 'models' && <Modal title="模型来源与解剖范围" wide onClose={closeModal}><div className="model-summary"><div><strong>{sharedModels.anatomy?.structures.length || '—'}</strong><span>合并同源结构池</span></div><div><strong>右侧</strong><span>成人参考解剖</span></div><div><strong>中立位</strong><span>源模型姿势</span></div></div><p className="modal-intro">当前结构池由颈部35份与上肢47份记录合并，6份完全相同的源结构去重，共76个神经、血管、肌肉和骨骼对象。均取自同一固定版本的 Z-Anatomy，保持源网格坐标和图谱中立位；新窗口裁显下颈至上臂中段，池中部分对象可能在裁显区域外。本版已撤下自行变形的敬礼位及三维探头。三维用于追踪原始解剖走行；临床体位、探头放置和声像以文献资料为依据，二者不作空间配准。human-atlas 作为交互设计参考；两套源模型实测存在差异，本版未混合拼接。局部裁切和转换记录见模型审计文件。</p><p className="asset-attribution">Z-Anatomy · Gauthier Kervyn 等；衍生模型按 CC BY-SA 4.0 提供，原始贡献和修改记录见署名文件。</p><div className="asset-source-actions"><a href="https://github.com/LluisV/Z-Anatomy/tree/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models" target="_blank" rel="noreferrer">固定版本模型来源 ↗</a><button onClick={() => setModal('attribution')}>完整署名与修改记录 ↗</button><button onClick={() => setModal('license')}>CC BY-SA 4.0 许可 ↗</button><button onClick={() => setModal('software')}>第三方软件许可 ↗</button></div><div className="model-source-links"><a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">human-atlas · 交互参考<ArrowDownRight size={16}/></a><a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">Z-Anatomy 神经模型<ArrowDownRight size={16}/></a><a href="https://github.com/TUANZIDING/orthopaedic-trauma-atlas" target="_blank" rel="noreferrer">骨创图谱 · 教学组织参考<ArrowDownRight size={16}/></a></div><div className="modal-notice"><Info size={18}/><p>这里的横断面来自表面网格截线，不是 CT、MRI 或真实超声。感觉图和运动图为原创概念示意，不能代表个人实际阻滞范围。</p></div><details className="asset-details"><summary>查看当前结构列表与来源状态</summary><div>{sharedModels.anatomy?.structures.map(s => <p key={s.id}><span>{s.name}</span><small>{s.sourceId || s.provenanceStatus || s.kind}</small></p>)}</div></details></Modal>}
    {['license', 'attribution', 'software'].includes(modal) && <Modal title={modal === 'license' ? '模型许可 · CC BY-SA 4.0' : modal === 'software' ? '第三方软件许可' : '模型署名与修改记录'} wide onClose={closeModal}><LicenseText anatomy={anatomy} kind={modal}/></Modal>}
    {modal === 'ultrasound' && <Modal title="如何把来源图谱与三维一起看" wide onClose={closeModal}><p className="modal-intro">临床图像负责说明操作体位与声像；三维保持原始图谱中立位，负责追踪走行。同名结构可以联动，形状、坐标和体位不能视为一一对应。</p><h3 className="modal-subtitle">{clinicalV3.pose.title}</h3><p className="modal-intro">{clinicalV3.pose.description}</p><ul className="modal-bullets">{clinicalV3.pose.points.map(t=><li key={t}>{t}</li>)}</ul><h3 className="modal-subtitle">{clinicalV3.probe.title}</h3><p className="modal-intro">{clinicalV3.probe.description}</p><ul className="modal-bullets">{clinicalV3.probe.points.map(t => <li key={t}>{t}</li>)}</ul><h3 className="modal-subtitle">已内嵌的真实体位照片与超声</h3><p className="asset-attribution">{ultrasound.license.attribution}</p><div className="asset-source-actions"><a href={ultrasound.source.articleUrl} target="_blank" rel="noreferrer">Vazin 原论文与 Figure 1</a><a href={ultrasound.license.url} target="_blank" rel="noreferrer">CC BY 4.0</a></div><ul className="modal-bullets">{clinicalV3.notes.map(t=><li key={t}>{t}</li>)}</ul><h3 className="modal-subtitle">体位与解剖依据</h3><div className="source-list">{clinicalV3.sources.map((s,i)=><a key={s.id} href={s.url} target="_blank" rel="noreferrer"><span>{String(i+1).padStart(2,'0')}</span><div><h3>{s.title}</h3><p>{s.usage}</p></div><ArrowDownRight size={15}/></a>)}</div></Modal>}
    {modal?.startsWith('atlas:') && (()=>{ const item=referenceAtlas.items.find(i=>i.id===modal.slice(6)); return item ? <Modal title={item.title} wide onClose={closeModal}><figure className="source-figure"><img src={referenceMediaUrl(item.path)} width={item.width} height={item.height} alt={item.description}/><figcaption>{item.description}</figcaption></figure><p className="modal-intro">{item.orientationNote}</p><ul className="modal-bullets">{item.limitations.map(t=><li key={t}>{t}</li>)}</ul><p className="asset-attribution">{item.license.attribution}</p><div className="asset-source-actions"><a href={item.source.url} target="_blank" rel="noreferrer">原文 · {item.figure}</a><a href={item.license.url} target="_blank" rel="noreferrer">{item.license.id} 许可</a></div></Modal> : null; })()}
    {modal === 'help' && <Modal title="怎样使用研习室" onClose={closeModal}><div className="help-steps"><article><MousePointer2/><div><h3>先选一条神经</h3><p>点击真实超声的神经色圈、选择按钮，或三维神经。结构说明和远端功能图会同步更新。</p></div></article><article><Layers3/><div><h3>逐层理解空间关系</h3><p>开关肌肉、血管和骨骼，调节肌肉透明度。拖动旋转，滚轮或双指缩放；右键拖动可平移。</p></div></article><article><ScanLine/><div><h3>把三维与横断面连起来</h3><p>拖动横断面滑杆，观察同一层面的真实网格截线。切面由原始中立位网格直接求交，用于理解图谱层面。它不代表敬礼位操作切面，也没有与真实超声配准。</p></div></article><article><Crosshair/><div><h3>看结构关系，再看覆盖边界</h3><p>选择预设结构组合；结合四神经及已分出支理解典型感觉、运动和遗漏区域。</p></div></article></div></Modal>}
  </div>;
}
