import candidateData from './data/root-annotation-candidate.json' with { type: 'json' };

const SHA256=/^[a-f0-9]{64}$/;
const close=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<=1e-10;
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const ROOT_ANNOTATION_CANDIDATE=freeze(candidateData);

// This explicit serialization is separate from the raw source-file SHA.
// It is stable after HTTP/offline JSON parsing, regardless of object key order.
export function canonicalRootGeometry(geometry){
  return JSON.stringify({positions:geometry.positions,indices:geometry.indices,normals:geometry.normals??null});
}

function failure(code,reason,candidate){return {status:'unavailable',code,reason,candidateId:candidate?.id};}

/** Validate the mask and source metadata. Actual buffer hashes are checked asynchronously below. */
export function buildRootCandidateOverlay(anatomy,candidate=ROOT_ANNOTATION_CANDIDATE){
  if(!candidate||candidate.schemaVersion!==1||candidate.identityStatus!=='unconfirmed')return failure('invalid-candidate','候选审阅状态或版本不匹配。',candidate);
  const source=anatomy?.structures?.find(s=>s.id===candidate.sourceStructureId);
  const reference=anatomy?.structures?.find(s=>s.id===candidate.referenceStructureId);
  if(!source?.geometry||!reference?.geometry)return failure('missing-source','候选所需的原始近端网格或中干尚未就绪。',candidate);
  if(anatomy.source?.commit!==candidate.sourceCommit||source.sourceId!==candidate.sourceId||reference.sourceId!==candidate.referenceSourceId)return failure('source-identity-mismatch','候选与当前模型的固定来源身份不一致。',candidate);
  for(const [structure,rawHash,canonicalHash,vertices,triangles] of [
    [source,candidate.sourceGeometrySha256,candidate.sourceGeometryCanonicalSha256,candidate.sourceVertexCount,candidate.sourceTriangleCount],
    [reference,candidate.referenceGeometrySha256,candidate.referenceGeometryCanonicalSha256,candidate.referenceVertexCount,candidate.referenceTriangleCount],
  ]){
    if(!SHA256.test(rawHash??'')||!SHA256.test(canonicalHash??'')||structure.sha256!==rawHash)return failure('source-hash-metadata-mismatch','候选与当前模型的来源摘要不一致或缺失。',candidate);
    const g=structure.geometry;
    if(!Array.isArray(g.positions)||!Array.isArray(g.indices)||g.positions.length!==vertices*3||g.indices.length!==triangles*3||!g.positions.every(Number.isFinite)||!g.indices.every(i=>Number.isInteger(i)&&i>=0&&i<vertices)||(g.normals!==undefined&&(!Array.isArray(g.normals)||g.normals.length!==g.positions.length||!g.normals.every(Number.isFinite))))return failure('invalid-source-buffer','原始几何的顶点、三角面或法线数据不符合候选记录。',candidate);
  }
  const faces=candidate.triangleIndices,g=source.geometry;
  if(!Array.isArray(faces)||faces.length!==candidate.triangleCount||!faces.length||faces.some((t,i)=>!Number.isInteger(t)||t<0||t>=candidate.sourceTriangleCount||(i>0&&t<=faces[i-1])))return failure('invalid-triangle-mask','候选面索引必须是原网格中有序且不重复的三角面序号。',candidate);
  const indices=faces.flatMap(t=>g.indices.slice(t*3,t*3+3)),vertices=new Set(indices);
  if(vertices.size!==candidate.vertexCount)return failure('candidate-count-mismatch','候选引用的源顶点数量与记录不一致。',candidate);
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(const i of vertices)for(let a=0;a<3;a++){const p=g.positions[i*3+a];bounds.min[a]=Math.min(bounds.min[a],p);bounds.max[a]=Math.max(bounds.max[a],p);}
  if(!candidate.bounds||!['min','max'].every(side=>Array.isArray(candidate.bounds[side])&&candidate.bounds[side].length===3&&candidate.bounds[side].every((p,a)=>close(p,bounds[side][a]))))return failure('candidate-bounds-mismatch','候选边界与所选原始三角面不一致。',candidate);
  const pair=candidate.nearestReference;
  if(!pair||!Number.isInteger(pair.sourceVertexIndex)||!vertices.has(pair.sourceVertexIndex)||!Number.isInteger(pair.referenceVertexIndex)||pair.referenceVertexIndex<0||pair.referenceVertexIndex>=candidate.referenceVertexCount||!Array.isArray(pair.sourcePoint)||!Array.isArray(pair.referencePoint)||pair.sourcePoint.length!==3||pair.referencePoint.length!==3||!pair.sourcePoint.every((p,a)=>close(p,g.positions[pair.sourceVertexIndex*3+a]))||!pair.referencePoint.every((p,a)=>close(p,reference.geometry.positions[pair.referenceVertexIndex*3+a]))||!close(pair.distanceMm,Math.hypot(...pair.sourcePoint.map((p,a)=>p-pair.referencePoint[a]))*1000))return failure('candidate-point-mismatch','候选与中干的几何采样点记录不一致。',candidate);
  return {status:'ready',id:candidate.id,label:candidate.label,identityStatus:candidate.identityStatus,sourceId:source.sourceId,bounds,
    geometry:{positions:g.positions,indices,...(g.normals?{normals:g.normals}:{})},
    audit:{sourceGeometrySha256:candidate.sourceGeometrySha256,sourceGeometryCanonicalSha256:candidate.sourceGeometryCanonicalSha256,referencedVertexCount:vertices.size,triangleCount:faces.length,triangleIndices:faces,positionBufferScope:'unchanged-full-source-array',hashVerification:'metadata-only-until-async-verification',interpretation:'Original source face mask only; proximity does not establish connection or segment identity.'}};
}

/** Fail closed when SHA support, source buffers or either canonical digest differ. */
export async function verifyRootCandidateSource(anatomy,candidate=ROOT_ANNOTATION_CANDIDATE){
  const checked=buildRootCandidateOverlay(anatomy,candidate);
  if(checked.status!=='ready')return {ok:false,code:checked.code,reason:checked.reason};
  if(!globalThis.crypto?.subtle||typeof TextEncoder==='undefined')return {ok:false,code:'sha256-unavailable',reason:'当前环境不支持源几何摘要验证，候选高亮暂不可用。'};
  try{
    const digest=async geometry=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalRootGeometry(geometry))))).map(v=>v.toString(16).padStart(2,'0')).join('');
    const source=anatomy.structures.find(s=>s.id===candidate.sourceStructureId),reference=anatomy.structures.find(s=>s.id===candidate.referenceStructureId);
    const [actual,referenceActual]=await Promise.all([digest(source.geometry),digest(reference.geometry)]);
    const expected=candidate.sourceGeometryCanonicalSha256,referenceExpected=candidate.referenceGeometryCanonicalSha256;
    const ok=actual===expected&&referenceActual===referenceExpected;
    return {ok,expected,actual,referenceExpected,referenceActual,...(ok?{}:{code:'actual-geometry-hash-mismatch',reason:'实际源几何摘要与候选固定记录不一致，候选高亮已停用。'})};
  }catch{return {ok:false,code:'sha256-failed',reason:'源几何摘要验证失败，候选高亮暂不可用。'};}
}
