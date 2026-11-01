import { useState } from 'react';
import { BookOpen, Crosshair, Link2, ScanLine } from 'lucide-react';
import ultrasound from '../data/ultrasound.json';
import { COLORS, referenceMediaUrl } from '../model-utils.js';

export default function UltrasoundWorkbench({ selected, onSelect, onSource }) {
  const [overlay, setOverlay] = useState(true);
  const position = ultrasound.panels.find(p => p.id === 'position');
  const sono = ultrasound.panels.find(p => p.id === 'ultrasound');
  const media = p => referenceMediaUrl(p.path);
  return <section className="ultrasound-panel" aria-label="真实腋路超声参考">
    <div className="viewer-top"><div className="viewer-title"><ScanLine size={16}/><strong>真实超声 · 结构识别</strong></div><span className="view-tag">论文原图</span></div>
    <div className="posture-reference">
      <div className="posture-photo"><img src={media(position)} width={position.width} height={position.height} alt="原论文腋路体位与探头放置的局部照片"/><small>原图 1(e) · 探头摆放</small></div>
      <div><span className="eyebrow">01 / POSITION</span><h3>文献中的体位与探头</h3><p>参考体位为外展、外旋并屈肘；约90°的肩外展与屈肘见 Han 2014 方法。此照仅显示局部。</p><button onClick={onSource}>查看体位依据<BookOpen size={12}/></button></div>
    </div>
    <div className="sono-heading"><div><span className="eyebrow">02 / SHORT-AXIS VIEW</span><h3>从熟悉的短轴声像开始</h3></div><div className="small-tabs"><button className={!overlay ? 'active' : ''} onClick={() => setOverlay(false)}>原图</button><button className={overlay ? 'active' : ''} onClick={() => setOverlay(true)}>联动标记</button></div></div>
    <div className="sono-depth"><span>浅层 · 探头侧</span><span>原图 1(f)</span></div>
    <div className="sono-image" style={{ aspectRatio: `${sono.width}/${sono.height}` }}>
      <img src={media(sono)} width={sono.width} height={sono.height} alt="真实腋路短轴超声，原图标有肌皮、正中、尺、桡神经和腋动脉"/>
      {overlay && ultrasound.hotspots.map(h => <button key={h.id} className={`sono-hotspot ${h.id === selected ? 'active' : ''}`} style={{ left: `${h.xPct}%`, top: `${h.yPct}%`, '--hotspot-color': COLORS[h.id] }} aria-label={`超声选中${h.name}`} aria-pressed={h.id === selected} title={`${h.sourceLabel} · ${h.name}`} onClick={() => onSelect(h.id)}><span/></button>)}
    </div>
    <div className="sono-orientation"><span>← 头侧 Cephalad</span><span>深层 ↓</span><span>Caudad 尾侧 →</span></div>
    <div className="sono-legend" aria-label="超声神经联动选择">{ultrasound.hotspots.map(h => <button key={h.id} onClick={() => onSelect(h.id)} className={h.id === selected ? 'active' : ''} style={{ '--nerve-color': COLORS[h.id] }}><i/><span>{h.name}</span><small>{h.sourceLabel}</small><Link2 size={12}/></button>)}</div>
    <div className="sono-link-note"><Crosshair size={16}/><p><strong>点一条神经，追踪同名走行与功能</strong><span>色圈只切换同名结构。三维保留原始中立位；原图的针道与标签予以保留。</span></p></div>
    <div className="sono-evidence"><p><strong>方向依据</strong>原图明确标出图左头侧、图右尾侧；患者左右侧及物理探头标记端未核实。</p><p><strong>对照方式</strong>三维是原始图谱中立位，声像来自临床操作体位；两者仅联动同名结构，未经空间配准。模型切面不对应本帧超声。</p><p><strong>血管识别</strong>AA 为原图腋动脉。此帧未核实静脉位置，可在三维打开静脉图层理解邻近关系。</p></div>
    <button className="sono-source" onClick={onSource}>Vazin 等 · 2016 · CC BY 4.0 · 裁切使用<BookOpen size={13}/></button>
  </section>;
}
