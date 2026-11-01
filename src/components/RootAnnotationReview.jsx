import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Expand, RotateCcw, ScanLine, X } from 'lucide-react';
import candidate from '../data/root-annotation-candidate.json';
import reference from '../data/root-reference.json';
import { buildRootCandidateOverlay, verifyRootCandidateSource } from '../root-annotation.js';
import { referenceMediaUrl } from '../model-utils.js';
import '../root-annotation-review.css';

const Scene = lazy(() => import('./RootCandidateScene.jsx'));
const FIGURE_PATH = reference.path;
const ARTICLE_URL = reference.source.articleUrl;
const LICENSE_URL = reference.license.url;
const ATTRIBUTION = reference.license.attribution;
const VIEWS = [['front', '前方'], ['back', '后方'], ['right', '右侧'], ['oblique', '斜视']];
const CHECKS = [
  { name: '骨性出口', text: '核对候选近端与神经孔、骨性背景的对应；当前尚未核定。' },
  { name: '沿程走行', text: '在多个视角与局部切面中逐段追踪，检查身份依据是否连续。' },
  { name: '与中干的衔接', text: '核对来源连续性与汇接证据；空间接近本身不能确认连接。' },
];

function FigureDialog({ onClose }) {
  const closeButton = useRef(null), titleId = useId();
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    closeButton.current?.focus(); document.body.style.overflow = 'hidden';
    const key = event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, [onClose]);
  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll('button,a[href]')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <div className="rar-lightbox-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="rar-lightbox" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={trapFocus}>
      <header><div><span className="rar-eyebrow">PUBLISHED ANATOMY · COMPLETE FIGURE</span><h2 id={titleId}>Hsu 等 2020 · 完整 Figure 1</h2></div><button ref={closeButton} type="button" className="rar-icon-button" aria-label="关闭完整臂丛原图" onClick={onClose}><X size={20}/></button></header>
      <img src={referenceMediaUrl(FIGURE_PATH)} width={reference.width} height={reference.height} alt="Hsu2020完整Figure1 A–D：A为移除前斜角肌后的C5至T1标本总览，B为根干股束拓扑示意，C和D为近远端标本结构"/>
      <p className="rar-caption"><strong>A：</strong>移除了前斜角肌。<strong>B：</strong>拓扑关系示意，未按真实空间比例绘制。<strong>C/D：</strong>标本近端与末支；保留原作者全部字母和编号。</p>
      <p className="rar-caption">这是与三维图谱不同的标本，未配准；原图中的节段标签不能自动赋给亮色候选。当前候选的骨性出口、沿程和中干汇接均未完成专业核定。</p>
      <p className="rar-attribution">{ATTRIBUTION}</p>
      <div className="rar-source-links"><a href={ARTICLE_URL} target="_blank" rel="noreferrer">原文与图注 ↗</a><a href={LICENSE_URL} target="_blank" rel="noreferrer">CC BY 4.0 许可 ↗</a></div>
    </section>
  </div>;
}

export default function RootAnnotationReview({ anatomy, error = '', renderSection }) {
  const [open, setOpen] = useState(false), [figureOpen, setFigureOpen] = useState(false);
  const [showCandidate, setShowCandidate] = useState(true), [showScalenes, setShowScalenes] = useState(false);
  const [showBones, setShowBones] = useState(true);
  const [view, setView] = useState('oblique'), [resetVersion, setResetVersion] = useState(0);
  const [reviewLevel, setReviewLevel] = useState(1.450);
  const [verification, setVerification] = useState({ anatomy: null, status: 'idle', reason: '' });
  const contentId = useId(), headingId = useId();
  const closeFigure = useCallback(() => setFigureOpen(false), []);
  useEffect(() => {
    if (!open || !anatomy) return;
    let active = true;
    setVerification({ anatomy, status: 'checking', reason: '' });
    verifyRootCandidateSource(anatomy, candidate).then(result => {
      if (active) setVerification({ anatomy, status: result.ok === true ? 'passed' : 'failed', reason: result.reason || '' });
    }).catch(() => {
      if (active) setVerification({ anatomy, status: 'failed', reason: '候选所需的原始几何来源暂未通过校验。' });
    });
    return () => { active = false; };
  }, [anatomy, open]);
  const overlayResult = useMemo(() => {
    if (!open || !anatomy || verification.anatomy !== anatomy || verification.status !== 'passed') return null;
    try { return buildRootCandidateOverlay(anatomy, candidate); }
    catch { return { status: 'unavailable', reason: '候选原面暂不可用，请先查看原图与核对说明。' }; }
  }, [open, anatomy, verification]);
  const overlay = overlayResult?.status === 'ready' ? overlayResult : null;
  const unavailableReason = verification.anatomy === anatomy && verification.status === 'failed' ? verification.reason : overlayResult?.status === 'unavailable' ? overlayResult.reason : '';
  function toggleOpen() { if (open) setFigureOpen(false); setOpen(value => !value); }
  function reset() { setShowCandidate(true); setShowScalenes(false); setShowBones(true); setView('oblique'); setReviewLevel(1.450); setResetVersion(value => value + 1); }
  return <section className="root-annotation-review" aria-labelledby={headingId}>
    <header className="rar-heading">
      <div><span className="rar-eyebrow">SOURCE-GUIDED REVIEW · 审阅试点</span><h2 id={headingId}>中干近端候选走行</h2><p>把原图谱中的一组既有面单独点亮，与完整标本原图核对。</p></div>
      <button type="button" className="rar-open-button" aria-expanded={open} aria-controls={contentId} onClick={toggleOpen}><ScanLine size={17}/>{open ? '收起候选核对' : '打开候选走行核对'}{open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
    </header>
    <div className="rar-pending-status"><span/>中干近端候选走行 · 节段未核定</div>
    {open ? <div id={contentId} className="rar-content">
      <div className="rar-review-notice"><strong>目前只标出候选原面，尚未确认是哪一根前支。</strong><p>原始近端合并网格保持完整，源已具名的中干用蓝色对照；亮色范围不表示已确认的神经节段或解剖连接。</p></div>
      <div className="rar-study-grid">
        <article className="rar-model-card">
          <div className="rar-card-heading"><h3>原网格 · 多视角核对</h3><button type="button" className="rar-reset-button" onClick={reset}><RotateCcw size={14}/>回默认</button></div>
          <div className="rar-view-buttons" role="group" aria-label="候选三维观察方向">{VIEWS.map(([id, name]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setResetVersion(value => value + 1); }}>{name}</button>)}</div>
          <div className="rar-display-options">
            <label><input type="checkbox" checked={showCandidate} disabled={!overlay} onChange={event => setShowCandidate(event.target.checked)}/>显示候选原面</label>
            <label><input type="checkbox" checked={showScalenes} onChange={event => setShowScalenes(event.target.checked)}/>前 / 中斜角肌</label>
            <label><input type="checkbox" checked={showBones} onChange={event => setShowBones(event.target.checked)}/>骨性参考</label>
          </div>
          {anatomy ? <Suspense fallback={<div className="rar-scene-placeholder" role="status">正在准备原网格视图…</div>}><Scene anatomy={anatomy} overlay={overlay} showCandidate={showCandidate} showScalenes={showScalenes} showBones={showBones} view={view} resetVersion={resetVersion} sectionLevel={reviewLevel}/></Suspense> : <div className="rar-scene-placeholder" role="status">{error ? '颈部源网格暂未载入，右侧原图仍可查看。' : '正在等待有来源的颈部网格；右侧原图可先查看。'}</div>}
          <div className="rar-source-status" role="status">{overlay ? '原始面来源已核对；节段身份仍未核定。' : unavailableReason || (anatomy ? '正在核对原始几何来源，暂不显示候选原面。' : '源网格就绪后才核对候选原面。')}</div>
          <ul className="rar-legend" aria-label="三维参考颜色">
            <li><i className="rar-color-roots"/>近端合并网格（未分节）</li><li><i className="rar-color-middle"/>中干（源已具名）</li><li><i className="rar-color-candidate"/>候选原面（未核定）</li><li><i className="rar-color-bone"/>第5–7颈椎、第1胸椎（透明）</li>
          </ul>
        </article>
        <article className="rar-figure-card">
          <div className="rar-card-heading"><h3>标本与关系图 · 完整原图</h3><button type="button" className="rar-reset-button" onClick={() => setFigureOpen(true)}><Expand size={14}/>放大</button></div>
          <button type="button" className="rar-figure-button" onClick={() => setFigureOpen(true)} aria-label="放大Hsu2020完整Figure1并查看来源许可"><img src={referenceMediaUrl(FIGURE_PATH)} width={reference.width} height={reference.height} alt="完整Figure1 A–D：含C5至T1标本与根干股束关系图，点击放大查看原文标签"/><span><Expand size={14}/>点击查看完整原图与许可</span></button>
          <p className="rar-caption"><strong>A：</strong>已移除前斜角肌；<strong>B：</strong>拓扑示意，非空间比例。图谱与标本不同、未配准，不能把图中根编号直接套给当前候选。</p>
          <p className="rar-attribution">Hsu 等 · Diagnostics 2020 · Figure 1<br/>©2020 authors · CC BY 4.0 · 完整原图未修改</p>
          <div className="rar-source-links"><a href={ARTICLE_URL} target="_blank" rel="noreferrer">原文与图注 ↗</a><a href={LICENSE_URL} target="_blank" rel="noreferrer">许可 ↗</a></div>
        </article>
      </div>
      {overlay && renderSection ? <div className="rar-section-slot">{renderSection({ overlay, level: reviewLevel, onLevelChange: setReviewLevel, showCandidate, showScalenes, showBones })}</div> : null}
      <div className="rar-knowledge"><strong>教材关系，单独理解</strong><p>典型解剖中，C7脊神经前支续为臂丛中干。这是一条需要核对的连接关系，不表示本次亮色候选已经获得C7身份。</p></div>
      <section className="rar-checklist" aria-label="待专业审阅的核对要点"><div className="rar-checklist-heading"><h3>人工核对要点</h3><span>尚未专业核定</span></div><ol>{CHECKS.map((item, index) => <li key={item.name}><span className="rar-step-number">{index + 1}</span><div><strong>{item.name}</strong><p>{item.text}</p></div><small>待核对</small></li>)}</ol></section>
      <details className="rar-provenance"><summary>候选来源与显示边界</summary><p>候选只引用原近端合并网格中已有的三角面；原坐标、原始身体网格不变。没有为候选焊接、补线或重新摆放神经。显示颜色不代表注射位置、神经节段或专业核定。</p><dl><div><dt>源结构</dt><dd>臂丛近端合并网格（未分节）</dd></div><div><dt>来源身份</dt><dd>{candidate.sourceId}</dd></div><div><dt>固定源版本</dt><dd>{candidate.sourceCommit?.slice(0, 12)}</dd></div><div><dt>模型许可</dt><dd>CC BY-SA 4.0 · 保留原署名链</dd></div></dl></details>
    </div> : null}
    {open && figureOpen ? <FigureDialog onClose={closeFigure}/> : null}
  </section>;
}

