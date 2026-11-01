import { useMemo } from 'react';
import { COLORS, intersectGeometry, nerveIdFor, structureVisible } from '../model-utils.js';

const MIN_X = -.255, MAX_X = -.065, MIN_Z = -.105, MAX_Z = .095;
const toScreen = ([x, z]) => [175 + (x - (MIN_X + MAX_X) / 2) * 1050, 127 - (z - (MIN_Z + MAX_Z) / 2) * 1050];

export default function CrossSection({ anatomy, level, setLevel, selected, onSelect, layers, showTarget, targetId }) {
  const cuts = useMemo(() => anatomy?.structures.map(s => ({ ...s, segments: intersectGeometry(s.geometry, level) })).filter(s => s.segments.length) || [], [anatomy, level]);
  const paths = cuts.filter(s => structureVisible(s, layers, false, selected)).sort((a, b) => ['bone', 'muscle', 'vein', 'artery', 'nerve'].indexOf(a.kind) - ['bone', 'muscle', 'vein', 'artery', 'nerve'].indexOf(b.kind));
  const selectedPresent = cuts.some(s => nerveIdFor(s) === selected);
  const vessels = paths.filter(s => ['artery', 'vein'].includes(s.kind)).map(s => s.name);
  return <div className="cross-section-content">
    <div className="section-svg-wrap">
      <svg viewBox="0 0 350 260" role="img" aria-label="源中立位右上臂Y水平截线，从足侧向头侧观察，非超声">
        <defs><clipPath id="slice-window"><rect x="22" y="14" width="306" height="226" rx="10" /></clipPath></defs>
        <rect x="22" y="14" width="306" height="226" rx="10" fill="#f2f1e9" />
        <path d="M175 28V225 M38 127H313" stroke="#dbdfd5" strokeDasharray="3 5" />
        <g clipPath="url(#slice-window)">{paths.map(s => {
          const nerve = nerveIdFor(s);
          const path = s.segments.map(segment => { const a = toScreen(segment[0]), b = toScreen(segment[1]); return `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`; }).join('');
          const emphasized = showTarget ? (targetId === 'musculocutaneous' ? nerve === 'musculocutaneous' : ['median', 'ulnar', 'radial'].includes(nerve)) : nerve === selected;
          return <path key={s.id} d={path} fill="none" stroke={COLORS[nerve] || COLORS[s.kind]} strokeWidth={nerve ? (emphasized ? 3 : 1.7) : s.kind === 'muscle' ? 1 : 2} opacity={s.kind === 'muscle' ? .55 : nerve && !emphasized ? .6 : 1} onClick={() => nerve && onSelect(nerve)} style={{ cursor: nerve ? 'pointer' : 'default' }}><title>{s.name}</title></path>;
        })}</g>
        <text x="175" y="10" textAnchor="middle" className="slice-direction">前 +Z</text>
        <text x="175" y="255" textAnchor="middle" className="slice-direction">后 −Z</text>
        <text x="11" y="132" textAnchor="middle" className="slice-direction">外</text>
        <text x="340" y="132" textAnchor="middle" className="slice-direction">内</text>
      </svg>
      {!anatomy && <span className="section-empty">等待模型加载</span>}
      {anatomy && (!layers.nerve || !selectedPresent) && <span className="section-note">{!layers.nerve ? '神经图层已隐藏' : '所选神经在此层面未相交，可调整切面位置'}</span>}
    </div>
    <div className="slice-slider"><span>远端</span><input aria-label="源中立位横断面Y坐标" type="range" min={1.27} max={1.39} step={.001} value={level} onChange={e => setLevel(Number(e.target.value))} /><span>近端</span></div>
    <p className="micro-note">源中立位 · Y={Number(level).toFixed(3)} m · 等比例网格截线<br />从足侧向头侧观察，左为右上臂外侧 · 非超声／非敬礼位<br />{vessels.length ? `本层面：${vessels.join('、')}` : '此层面无可见血管截线'}</p>
  </div>;
}
