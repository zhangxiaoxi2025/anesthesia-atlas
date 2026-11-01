import { COLORS } from '../model-utils.js';

// Original, deliberately schematic silhouettes. Their regions are selected from
// the clinical mapping; the meshes do not infer innervation or block success.
const ARM = 'M76 18 C58 19 49 31 48 50 L45 108 C43 127 46 148 50 163 L54 221 L52 244 L42 264 Q38 272 44 274 L53 266 L51 296 Q52 303 58 298 L64 276 L61 307 Q63 313 68 308 L74 277 L73 307 Q76 313 81 306 L85 276 L88 297 Q92 304 96 297 L96 261 Q99 249 93 238 L91 220 L97 164 C102 142 104 124 101 108 L100 52 C98 31 93 20 76 18 Z';
const REGIONS = {
  median: {
    front: ['M53 241 L78 241 L79 271 L78 309 L73 309 L73 277 L69 309 L63 309 L64 277 L58 300 L51 299 L53 266 L44 274 L39 271 L43 263 L52 247 Z'],
    back: ['M52 286 L52 301 L59 301 L63 286 Z', 'M63 297 L63 312 L69 312 L73 297 Z', 'M73 297 L73 312 L78 312 L79 297 Z'],
  },
  ulnar: {
    front: ['M79 241 L94 243 L98 258 L96 299 L88 300 L85 277 L81 309 L78 309 L79 274 L77 260 Z'],
    back: ['M79 241 L94 243 L98 258 L96 299 L88 300 L85 277 L81 309 L78 309 L79 274 L77 260 Z'],
  },
  radial: {
    front: [],
    back: ['M53 240 L77 240 L79 260 L78 296 L73 296 L73 277 L71 294 L64 294 L64 276 L61 285 L53 285 L53 265 L47 270 L44 266 L51 252 Z'],
  },
  musculocutaneous: {
    front: ['M49 164 L64 162 L64 192 L61 229 L55 235 L54 218 Z'],
    back: ['M49 164 L63 163 L63 193 L60 229 L55 235 L54 218 Z'],
  },
};

const MUSCLES = {
  median: { front: ['M63 164 Q70 150 75 166 L76 211 L69 231 L64 208 Z', 'M73 169 Q80 158 84 171 L82 213 L76 228 Z', 'M54 245 L65 246 L63 261 L54 267 Z'], back: [] },
  ulnar: { front: ['M83 166 Q93 171 89 189 L84 226 L78 232 L80 200 Z', 'M80 249 L89 250 L92 269 L83 270 Z'], back: ['M61 249 L86 249 L85 270 L61 270 Z'] },
  radial: { front: [], back: ['M65 169 Q74 154 83 166 L85 207 L76 232 L68 213 Z'] },
  musculocutaneous: { front: ['M62 57 Q72 42 83 57 Q92 88 83 127 L74 143 L64 124 Q54 84 62 57 Z'], back: [] },
};

export default function CoverageMap({ selected, mode, setMode, nerve }) {
  const color = COLORS[selected];
  const region = REGIONS[selected] || REGIONS.median;
  return <div className="coverage-content">
    <div className="small-tabs" role="tablist" aria-label="功能分布图层"><button role="tab" aria-selected={mode === 'sensory'} className={mode === 'sensory' ? 'active' : ''} onClick={() => setMode('sensory')}>皮肤感觉</button><button role="tab" aria-selected={mode === 'motor'} className={mode === 'motor' ? 'active' : ''} onClick={() => setMode('motor')}>肌肉运动</button></div>
    <svg className="coverage-svg" viewBox="0 0 350 330" role="img" aria-label={`${nerve.name}典型${mode === 'sensory' ? '皮肤感觉' : '运动联系'}示意图`}>
      <defs><clipPath id="arm-front"><path d={ARM}/></clipPath><clipPath id="arm-back"><path d={ARM}/></clipPath></defs>
      {[{ x: 45, side: 'front', text: '右侧 · 掌面' }, { x: 196, side: 'back', text: '右侧 · 背面' }].map(({ x, side, text }) => <g key={side} transform={`translate(${x - 35},0)`}>
        <g transform={side === 'back' ? 'translate(148,0) scale(-1,1)' : undefined}>
        <path d={ARM} fill="#eae7de" stroke="#c9c7bb" strokeWidth="1.1" />
        <g clipPath={`url(#arm-${side})`}>{(mode === 'sensory' ? region[side] : MUSCLES[selected][side]).map((d, i) => <path key={i} d={d} fill={color} fillOpacity=".72" stroke={color} strokeWidth=".5" />)}</g>
        <path d="M52 163 Q75 174 98 163 M54 238 Q75 244 94 238" fill="none" stroke="#cbc8bd" strokeWidth="1" />
        </g>
        <text x="74" y="326" textAnchor="middle" className="map-caption">{text}</text>
      </g>)}
    </svg>
    <p className="micro-note">{mode === 'sensory' ? '典型外周神经感觉范围示意；边界重叠、个体有差异。' : '显示主要肌群与动作联系；需结合阻滞层面及已分出支。'}<br />{mode === 'sensory' ? '不等同皮节图，也不保证实际麻醉范围。' : '示意形状不代表肌肉的精确解剖轮廓。'}</p>
  </div>;
}
