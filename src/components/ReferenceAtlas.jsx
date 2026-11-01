import { ArrowUpRight, BookOpen, Expand, FileCheck2 } from 'lucide-react';
import atlas from '../data/reference-atlas.json';
import { referenceMediaUrl } from '../model-utils.js';

export default function ReferenceAtlas({ onInspect }) {
  return <section className="reference-atlas" id="reference-atlas" aria-label="有出处的图谱与变异资料">
    <div className="reference-atlas-heading"><div><span className="eyebrow">PUBLISHED REFERENCE FIGURES</span><h2>有出处的图谱与真实变异</h2><p>保留论文原图、图号与方向；用不同病例理解变异。</p></div><span className="source-verified-badge"><FileCheck2 size={14}/>来源与许可已核对</span></div>
    <div className="reference-figure-grid">{atlas.items.map(item => <article className="reference-figure-card" key={item.id}>
      <div className="reference-figure-title"><div><span>{item.figure} · {item.type === 'orientation-schematic' ? '原刊方位示意' : '原刊真实超声'}</span><h3>{item.title}</h3></div><button className="icon-button" aria-label={`放大${item.title}`} onClick={() => onInspect(item.id)}><Expand size={16}/></button></div>
      <button className="reference-image-button" onClick={() => onInspect(item.id)} aria-label={`查看${item.title}原图与来源`}><img src={referenceMediaUrl(item.path)} width={item.width} height={item.height} alt={item.description}/></button>
      <p className="reference-figure-description">{item.description}</p>
      <div className="reference-figure-foot"><span>Han 等 · 2014 · CC BY-NC 3.0</span><button onClick={() => onInspect(item.id)}>图号、方向与许可<BookOpen size={12}/></button></div>
    </article>)}</div>
    <div className="external-atlas-heading"><h3>解剖横断面与正式教材</h3><span>原站查阅 · 需联网 · 本地未复制教材图片</span></div>
    <div className="external-atlas-grid">{atlas.externalReferences.map(r => <article key={r.id}><BookOpen size={21}/><div><a className="external-reference-title" href={r.url} target="_blank" rel="noreferrer">{r.id.startsWith('nysora') ? 'NYSORA · 腋路解剖图谱' : 'Hadzic · 正式教材第32E章'}<ArrowUpRight size={15}/></a><p>{r.id.startsWith('nysora') ? 'Figure 1 解剖横断面／超声对照，Figure 4 体位与探头局部照片。' : 'Figure 32E–2 横断面／超声，Figure 32E–3 常见排列与变异。'}</p>{r.images && <div className="external-figure-links">{r.images.map(i=><a key={i.figure} href={i.url} target="_blank" rel="noreferrer">{i.figure} 原站图<ArrowUpRight size={11}/></a>)}</div>}</div></article>)}</div>
    <p className="reference-atlas-note">论文方位示意、真实声像与中立位三维各保留自身坐标；它们不是同一病例的空间配准。Han 原图完整保留，按非商业教学许可使用。</p>
  </section>;
}
