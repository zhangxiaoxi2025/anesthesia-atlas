import { useMemo, useState } from 'react';
import { UltrasoundSelection } from './PlexusTeaching.jsx';
import SourceSliceWorkbench from './SourceSliceWorkbench.jsx';
import teaching from '../data/plexus-teaching.json';
import { getPlexusSelection } from '../plexus-teaching-utils.js';
import { makeReferenceReconstruction, fixedRootComparisonFrame, reconstructionSource, ULTRASOUND_COMPARISON_IDS } from '../reconstructed-anatomy.js';

export default function ReferenceReconstruction({ base, onOpenSource }) {
  const [simplified,setSimplified] = useState(false);
  const anatomy = useMemo(() => {const a=makeReferenceReconstruction(base);return a?{...a,comparisonIds:simplified?ULTRASOUND_COMPARISON_IDS:null}:null;}, [base,simplified]);
  const [selected, setSelected] = useState('c5');
  const frame = useMemo(() => fixedRootComparisonFrame(), []);
  const selection = useMemo(() => { const known=teaching.concepts.some(c=>c.id===selected); const s=getPlexusSelection(known ? selected : 'c5',teaching); return {...s,panelId:'b',ultrasoundTargetId:ULTRASOUND_COMPARISON_IDS.includes(selected)?selected:null}; }, [selected]);
  function choose(id) {
    if (!anatomy?.structures.some(s => s.id === id)) return;
    setSelected(id);
  }
  return <section className="plexus-teaching reference-reconstruction" aria-label="肌间沟参考重建" data-testid="reference-reconstruction" data-selected={selected}>
    <header className="pt-heading"><div><span className="pt-eyebrow">Z-Anatomy 主体 · Open3DModel 神经补充</span><h2>肌间沟参考重建 · 分别查看 C5、C6、C7</h2><p>沿用 v0.8.0 的观察方向，固定一个教学参考面；为同时切到三根，切面微调约 3.4°。选择结构只切换高亮。默认保留完整神经走行与周围结构，原图已标名的七项作为主要对照。</p></div><span className="pt-status pending">参考重建 · 待专业核对</span></header>
    <div className="pt-selector" role="group" aria-label="原超声对应结构">{(anatomy?.structures || []).filter(s=>ULTRASOUND_COMPARISON_IDS.includes(s.id)).map(s => <button key={s.id} data-comparison-id={s.id} aria-pressed={selected === s.id} onClick={() => choose(s.id)}>{s.name.replace('（参考重建）','')}</button>)}</div>
    <div className="pt-selector" role="group" aria-label="神经走行与邻近结构">{(anatomy?.structures || []).filter(s=>!ULTRASOUND_COMPARISON_IDS.includes(s.id)).map(s=><button key={s.id} data-context-id={s.id} aria-pressed={selected===s.id} onClick={()=>choose(s.id)}>{s.name.replace('（参考重建）','')}</button>)}</div>
    <label className="pt-context-switch"><input type="checkbox" checked={simplified} onChange={e=>setSimplified(e.target.checked)}/>简化显示：只看原超声已标出的七项</label><p className="pt-image-note">默认保留 C5–T1、上中下干及周围肌肉、血管、骨性标志。二维和抽出副本标出本固定面实际切到的全部结构；没切到的神经仍可在三维选择，不补画二维轮廓。左侧原图只联动作者明确标出的七项；其他选择显示“原声像未单独标注”。</p>
    <p className="pt-current-gap"><b>阅读边界：</b>神经名称来自 Open3DModel；位置经颈椎和锁骨刚体配准。肌肉、骨和血管以 Z-Anatomy 为主。已知两来源血管局部仍有差异，跨来源毗邻尚未核定；本页不显示安全进针点或药液空间。左侧原超声与此重建未配准。</p>
    <div className="pt-study-grid"><UltrasoundSelection lockedPanelId="b" selection={selection} onSelect={choose} onOpenSource={onOpenSource}/><article className="pt-model-card"><div className="pt-card-heading"><h3>{anatomy?.structures.find(s=>s.id===selected)?.name || '参考位置'}</h3></div><SourceSliceWorkbench anatomy={anatomy} selectedIds={[selected]} onSelect={choose} route="interscalene" fixedFrame={frame}/></article></div>
    <details className="pt-sources"><summary>底座、补充来源与尚未核定的部分</summary><p>主体：项目固定 Z-Anatomy 网格；神经：Open3DModel July 2025 右上肢来源具名对象，经同一刚体变换置入参考位置。没有人为画线接上神经缺口，也没有把原 Z 合并神经改名为 C5–T1。选择根时高亮其来源具名模型，不再只亮下游的干。</p><p>两本提供的区域麻醉教材用于解释典型前支—汇干及斜角肌之间的关系；静态教材不能验证本重建的精确三维位置。原超声方向保留。C8/T1在当前原声像没有单独作者标签。</p><p>当前配准仅为整骨中心拟合；血管局部交线差异、神经汇合归属、前支与斜角肌的接触或穿行仍需专业复核。一般解剖理解不等同于个体定位。</p><p>{reconstructionSource.credit}</p><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">补充及改编几何：CC BY-SA 4.0 ↗</a></details>
  </section>;
}
