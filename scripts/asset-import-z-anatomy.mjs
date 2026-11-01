/**
 * Independently authored asset extraction using the installed official Three.js
 * FBXLoader. No application code from the upstream repositories is executed.
 * All visible anatomy in the active manifest comes from one pinned Z release.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/models');
const sourceDir = path.join(out, 'source');
const cache = process.env.ANESTHESIA_ASSET_CACHE || '/private/tmp/anesthesia-atlas-source-cache';
const commit = '6c7f9016bd5899ac8edafd31b9900c151df42ed6';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const selection = [
  ['z-nervous-system-100.fbx', 'Median_nerver', 'median', '正中神经', 'nerve'],
  ['z-nervous-system-100.fbx', 'Ulnar_nerver', 'ulnar', '尺神经', 'nerve'],
  ['z-nervous-system-100.fbx', 'Radial_nerver', 'radial', '桡神经', 'nerve'],
  ['z-nervous-system-100.fbx', 'Musculocutaneous_nerver', 'musculocutaneous', '肌皮神经', 'nerve'],
  ['z-nervous-system-100.fbx', 'Posterior_cord_of_brachial_plexusr', 'posterior-cord', '臂丛后束', 'nerve'],
  ['z-nervous-system-100.fbx', 'Roots_of_brachial_plexusr', 'brachial-roots', '臂丛根（源模型合并网格）', 'nerve'],
  ['z-nervous-system-100.fbx', 'Superior_trunk_of_brachial_plexusr', 'superior-trunk', '臂丛上干', 'nerve'],
  ['z-nervous-system-100.fbx', 'Middle_trunk_of_brachial_plexusr', 'middle-trunk', '臂丛中干', 'nerve'],
  ['z-nervous-system-100.fbx', 'Inferior_trunk_of_brachial_plexusr', 'inferior-trunk', '臂丛下干', 'nerve'],
  ['z-nervous-system-100.fbx', 'Axillary_nerver', 'axillary-nerve', '腋神经（对照结构）', 'nerve'],
  ['z-nervous-system-100.fbx', 'Lateral_antebrachial_cutaneous_nerver', 'musculocutaneous-lateral-antebrachial-cutaneous', '前臂外侧皮神经', 'nerve', 'musculocutaneous'],
  ['z-nervous-system-100.fbx', 'Superficial_branch_of_radial_nerver', 'radial-superficial', '桡神经浅支', 'nerve', 'radial'],
  ['z-nervous-system-100.fbx', 'Deep_branch_of_radial_nerver', 'radial-deep', '桡神经深支', 'nerve', 'radial'],
  ['z-nervous-system-100.fbx', 'Medial_brachial_cutaneous_nerver', 'medial-brachial-cutaneous', '臂内侧皮神经（对照结构）', 'nerve'],
  ['z-cardio-vascular-41.fbx', 'Axillary_arteryr', 'axillary-artery', '腋动脉', 'artery'],
  ['z-cardio-vascular-41.fbx', 'Axillary_veinr', 'axillary-vein', '腋静脉', 'vein'],
  ['z-cardio-vascular-41.fbx', 'Brachial_arteryr', 'brachial-artery', '肱动脉', 'artery'],
  ['z-cardio-vascular-41.fbx', 'Brachial_veinsr', 'brachial-vein', '肱静脉（源模型复数网格）', 'vein'],
  ['z-cardio-vascular-41.fbx', 'Basilic_veinr', 'basilic-vein', '贵要静脉', 'vein'],
  ['z-cardio-vascular-41.fbx', 'Cephalic_veinr', 'cephalic-vein', '头静脉', 'vein'],
  ['z-cardio-vascular-41.fbx', 'Deep_brachial_arteryr', 'deep-brachial-artery', '肱深动脉', 'artery'],
  ['z-cardio-vascular-41.fbx', 'Radial_arteryr', 'radial-artery', '桡动脉', 'artery'],
  ['z-cardio-vascular-41.fbx', 'Ulnar_arteryr', 'ulnar-artery', '尺动脉', 'artery'],
  ['z-muscular-system-100.fbx', 'Coracobrachialis_muscler', 'coracobrachialis', '喙肱肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Long_head_of_biceps_brachiir', 'biceps-long-head', '肱二头肌长头', 'muscle'],
  ['z-muscular-system-100.fbx', 'Short_head_of_biceps_brachiir', 'biceps-short-head', '肱二头肌短头', 'muscle'],
  ['z-muscular-system-100.fbx', 'Lateral_head_of_triceps_brachiir', 'triceps-lateral-head', '肱三头肌外侧头', 'muscle'],
  ['z-muscular-system-100.fbx', 'Long_head_of_triceps_brachiir', 'triceps-long-head', '肱三头肌长头', 'muscle'],
  ['z-muscular-system-100.fbx', 'Medial_head_of_triceps_brachiir', 'triceps-medial-head', '肱三头肌内侧头', 'muscle'],
  ['z-muscular-system-100.fbx', 'Brachialis_muscler', 'brachialis', '肱肌', 'muscle'],
  ['z-muscular-system-100.fbx', '(Abdominal_part_of_pectoralis_major_muscle)r', 'pectoralis-major-abdominal', '胸大肌腹部', 'muscle'],
  ['z-muscular-system-100.fbx', 'Clavicular_head_of_pectoralis_major_muscler', 'pectoralis-major-clavicular', '胸大肌锁骨部', 'muscle'],
  ['z-muscular-system-100.fbx', 'Sternocostal_head_of_pectoralis_major_muscler', 'pectoralis-major-sternocostal', '胸大肌胸肋部', 'muscle'],
  ['z-muscular-system-100.fbx', 'Pectoralis_minor_muscler', 'pectoralis-minor', '胸小肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Acromial_part_of_deltoid_muscler', 'deltoid-acromial', '三角肌肩峰部', 'muscle'],
  ['z-muscular-system-100.fbx', 'Clavicular_part_of_deltoid_muscler', 'deltoid-clavicular', '三角肌锁骨部', 'muscle'],
  ['z-muscular-system-100.fbx', 'Scapular_spinal_part_of_deltoid_muscler', 'deltoid-spinal', '三角肌肩胛冈部', 'muscle'],
  ['z-muscular-system-100.fbx', 'Subscapularis_muscler', 'subscapularis', '肩胛下肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Teres_major_muscler', 'teres-major', '大圆肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Teres_minor_muscler', 'teres-minor', '小圆肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Serratus_anterior_muscler', 'serratus-anterior', '前锯肌', 'muscle'],
  ['z-skeletal-system-100.fbx', 'Humerusr', 'humerus', '肱骨', 'bone'],
  ['z-skeletal-system-100.fbx', 'Scapular', 'scapula', '肩胛骨', 'bone'],
  ['z-skeletal-system-100.fbx', 'Clavicler', 'clavicle', '锁骨', 'bone'],
  ['z-skeletal-system-100.fbx', 'Radiusr', 'radius', '桡骨', 'bone'],
  ['z-skeletal-system-100.fbx', 'Ulnar', 'ulna', '尺骨', 'bone'],
];
const surfaceNames = ['Anterior_region_of_armr', 'Posterior_region_of_armr',
  'Deltoid_regionr', 'Anterior_region_of_forearmr', 'Posterior_region_of_forearmr',
  'Lateral_border_of_forearmr', 'Medial_border_of_forearmr',
  'Anterior_region_of_elbowr', 'Posterior_region_of_elbowr',
  'Anterior_region_of_wristr', 'Posterior_region_of_wristr', 'Palmr', 'Dorsum_of_handr',
  'Palmar_surfaces_of_digits_of_handr', 'Dorsal_surfaces_of_digits_of_handr',
  'Pectoral_regionr', 'Mammary_regionr', 'Infraclavicular_fossar',
  'Deltopectoral_triangler', 'Lateral_region_of_thoraxr', 'Scapular_regionr'];

function load(file) {
  const bytes = fs.readFileSync(path.join(cache, file));
  const scene = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true);
  const meshes = new Map();
  scene.traverse(object => { if (object.isMesh) meshes.set(object.name, object); });
  return { meshes, bytes, scene };
}
function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  positions.forEach((v, i) => { const d = i % 3; min[d] = Math.min(v, min[d]); max[d] = Math.max(v, max[d]); });
  return { min, max };
}
function extract(mesh) {
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).scale(0.01, 0.01, 0.01);
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
  const order = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: p.count }, (_, i) => i);
  const positions = [], normals = [], indices = [], vertices = new Map();
  // Only deduplicate exactly equal transformed position+normal tuples. No
  // geometric simplification, curve generation, rescaling by anatomy or fitting.
  for (const old of order) {
    const tuple = [p.getX(old), p.getY(old), p.getZ(old), n.getX(old), n.getY(old), n.getZ(old)];
    const key = tuple.join(',');
    let index = vertices.get(key);
    if (index === undefined) {
      index = positions.length / 3; vertices.set(key, index);
      positions.push(...tuple.slice(0, 3).map(x => Number(x.toFixed(8))));
      normals.push(...tuple.slice(3).map(x => Number(x.toFixed(6))));
    }
    indices.push(index);
  }
  if (!positions.every(Number.isFinite) || !normals.every(Number.isFinite) || indices.length % 3 !== 0
      || indices.some(i => i < 0 || i >= positions.length / 3)) throw new Error('Invalid geometry: ' + mesh.name);
  return { positions, normals, indices };
}
function writeGeometry(id, name, nameEn, kind, geometry, sourceMeshes, sourceFile, parentId) {
  const file = id + '.json'; const bytes = Buffer.from(JSON.stringify(geometry));
  fs.writeFileSync(path.join(out, file), bytes);
  return { id, name, nameEn, kind, side: 'right', path: '/models/' + file,
    sourceId: sourceMeshes.length === 1 ? 'FBX:' + sourceMeshes[0].ID : sourceMeshes.map(m => 'FBX:' + m.ID),
    sourceObjectNames: sourceMeshes.map(m => m.name), sourceObjectIds: sourceMeshes.map(m => m.ID),
    sourceFile, source: 'z-anatomy-pinned', license: 'CC-BY-SA-4.0',
    provenanceStatus: kind === 'skin' ? 'source-surface-regions-combined' : 'source-mesh-extracted',
    bounds: bounds(geometry.positions), vertexCount: geometry.positions.length / 3,
    triangleCount: geometry.indices.length / 3, bytes: bytes.length, sha256: hash(bytes),
    adaptations: ['Applied the original FBX scene matrixWorld, then centimeter-to-meter scale 0.01.',
      'Deduplicated exact position+normal tuples; geometry positions serialized to 8 decimal places.',
      ...(kind === 'skin' ? ['Combined named body-surface region patches; these are not nerve innervation fields or fascial layers.'] : [])],
    ...(parentId ? { parentId } : {}) };
}

const files = new Map();
for (const file of new Set([...selection.map(s => s[0]), 'z-body-regions-100.fbx'])) files.set(file, load(file));
const structures = [];
for (const [file, objectName, id, name, kind, parentId] of selection) {
  const object = files.get(file).meshes.get(objectName);
  if (!object) throw new Error('Missing explicitly selected upstream mesh: ' + objectName);
  structures.push(writeGeometry(id, name, objectName.replace(/_/g, ' '), kind,
    extract(object), [object], file, parentId));
}
const surfaceMeshes = surfaceNames.map(name => {
  const mesh = files.get('z-body-regions-100.fbx').meshes.get(name);
  if (!mesh) throw new Error('Missing body region: ' + name);
  return mesh;
});
const surface = { positions: [], normals: [], indices: [] };
for (const mesh of surfaceMeshes) {
  const g = extract(mesh), offset = surface.positions.length / 3;
  surface.positions.push(...g.positions); surface.normals.push(...g.normals);
  surface.indices.push(...g.indices.map(i => i + offset));
}
structures.push(writeGeometry('skin-right-arm-crop', '右上肢与邻近胸部体表分区（参考表面）',
  'Combined right upper-limb and adjacent thoracic surface regions', 'skin', surface, surfaceMeshes, 'z-body-regions-100.fbx'));

// Cross-source audit only; never fit or mix geometries to conceal differences.
const previous = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const comparisons = ['axillary-artery', 'axillary-vein', 'coracobrachialis', 'biceps-short-head', 'humerus'].map(id => {
  const old = previous.structures.find(s => s.id === id), current = structures.find(s => s.id === id);
  const prior = previous.crossSourceAudit?.comparisons?.find(item => item.id === id);
  const reference = old?.source === 'human-atlas-bodyparts3d' ? old.bounds : prior?.humanAtlasBounds;
  return { id, humanAtlasBounds: reference,
    zAnatomyBounds: current.bounds, maxBoundsEndpointDifferenceMm: reference
      ? Math.max(...['min', 'max'].flatMap(side => current.bounds[side].map((x, i) => Math.abs(x - reference[side][i]) * 1000))) : undefined };
});
const zSources = JSON.parse(fs.readFileSync(path.join(sourceDir, 'z-source-files.json'), 'utf8'));
const nerveAvailability = structures.filter(s => ['median', 'ulnar', 'radial', 'musculocutaneous'].includes(s.id)).map(s => ({
  id: s.id, name: s.name, sourceObjectId: s.sourceObjectIds[0], sourceObjectName: s.sourceObjectNames[0],
  vertexCount: s.vertexCount, triangleCount: s.triangleCount, bounds: s.bounds,
  status: 'independent source mesh exists; full distal branch coverage and source anatomical accuracy are not implied' }));
const manifest = {
  schemaVersion: 1, module: 'right-axillary-brachial-plexus',
  source: { id: 'z-anatomy-pinned', repository: 'https://github.com/LluisV/Z-Anatomy', commit,
    dataset: 'Z-Anatomy FBX reference models at pinned commit', files: zSources.files,
    attributionPath: '/models/ATTRIBUTION.md', licensePath: '/models/source/Z-UPSTREAM-LICENSE.txt' },
  license: 'CC-BY-SA-4.0',
  coordinateSystem: { units: 'm', up: '+Y', anterior: '+Z', right: '-X',
    pose: 'source neutral standing anatomy with arm alongside trunk',
    transform: 'each original FBX mesh matrixWorld applied, then uniform scale 0.01 cm to m; no cross-source registration or anatomy-based fitting' },
  focus: { target: [-0.174, 1.295, -0.020], camera: [-0.40, 1.43, 0.40], sliceY: 1.295,
    bounds: { min: [-0.25, 1.20, -0.11], max: [-0.075, 1.445, 0.095] } },
  structures, missingStructures: [
    { id: 'axillary-fascial-sheath', name: '腋部筋膜鞘／可注射组织间隙', status: 'not-validated-in-source', kind: 'fascia' },
    { id: 'lateral-medial-cord', name: '臂丛外侧束／内侧束连续独立网格', status: 'not-confirmed-as-independent-mesh', kind: 'nerve' }
  ],
  nerveAvailability,
  crossSourceAudit: { comparedWith: 'ashemag/human-atlas@1c38bf35c254a891200d3cedecfd57abebe83d8d',
    decision: 'Use only the pinned Z-Anatomy source for all active anatomy; the two sources differ and were not registered or mixed.', comparisons },
  limitations: [
    'Imported reference meshes, not patient-derived anatomy or independently anatomically validated meshes.',
    'Source neutral arm position is not the abducted procedural position for an axillary block.',
    'Independent target nerve meshes exist; continuity of every root, cord, branch and cutaneous field is not assured.',
    'Body-surface patches are reference anatomy and must not be treated as nerve sensory territories.',
    'No fascia, injectable compartment, needle path or spread simulation is represented by these source meshes.',
    'No generated nerve curves, manual nerve displacement or cross-source fitting was performed.'
  ]
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ structures: structures.length, triangles: structures.reduce((n, s) => n + s.triangleCount, 0),
  geometryBytes: structures.reduce((n, s) => n + s.bytes, 0), nerveAvailability, crossSourceAudit: manifest.crossSourceAudit }, null, 2));
