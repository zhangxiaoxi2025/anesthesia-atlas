/**
 * Reproducible, source-only right neck export. Uses the installed official
 * Three.js FBXLoader; executes no scripts from the anatomy repositories.
 * No mesh splitting by presumed root level, generated nerves or pose fitting.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/interscalene');
const cache = process.env.ANESTHESIA_ASSET_CACHE || '/private/tmp/anesthesia-atlas-source-cache';
const commit = '6c7f9016bd5899ac8edafd31b9900c151df42ed6';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const axillaryManifestPath = path.join(root, 'public/models/manifest.json');
const untouchedAxillaryHash = sha(fs.readFileSync(axillaryManifestPath));
const prior = JSON.parse(fs.readFileSync(axillaryManifestPath, 'utf8'));
assert.equal(prior.source.commit, commit);

// The source names below are exact FBXLoader names, including the side suffix.
// C5/C6/C7 nerves and the phrenic nerve are intentionally not invented here.
const selection = [
  ['z-nervous-system-100.fbx', 'Roots_of_brachial_plexusr', 'brachial-roots', '臂丛近端合并网格（未分节）', 'nerve'],
  ['z-nervous-system-100.fbx', 'Superior_trunk_of_brachial_plexusr', 'superior-trunk', '臂丛上干', 'nerve'],
  ['z-nervous-system-100.fbx', 'Middle_trunk_of_brachial_plexusr', 'middle-trunk', '臂丛中干', 'nerve'],
  ['z-nervous-system-100.fbx', 'Inferior_trunk_of_brachial_plexusr', 'inferior-trunk', '臂丛下干', 'nerve'],
  ['z-nervous-system-100.fbx', 'Anterior_division_of_superior_trunk_of_brachial_plexusr', 'superior-anterior-division', '臂丛上干前股', 'nerve', 'superior-trunk'],
  ['z-nervous-system-100.fbx', 'Posterior_division_of_superior_trunk_of_brachial_plexusr', 'superior-posterior-division', '臂丛上干后股', 'nerve', 'superior-trunk'],
  ['z-nervous-system-100.fbx', 'Anterior_division_of_middle_trunk_of_brachial_plexusr', 'middle-anterior-division', '臂丛中干前股', 'nerve', 'middle-trunk'],
  ['z-nervous-system-100.fbx', 'Posterior_division_of_middle_trunk_of_brachial_plexusr', 'middle-posterior-division', '臂丛中干后股', 'nerve', 'middle-trunk'],
  ['z-nervous-system-100.fbx', 'Anterior_division_of_inferior_trunk_of_brachial_plexusr', 'inferior-anterior-division', '臂丛下干前股', 'nerve', 'inferior-trunk'],
  ['z-nervous-system-100.fbx', 'Posterior_division_of_inferior_trunk_of_brachial_plexusr', 'inferior-posterior-division', '臂丛下干后股', 'nerve', 'inferior-trunk'],
  ['z-nervous-system-100.fbx', 'Posterior_cord_of_brachial_plexusr', 'posterior-cord', '臂丛后束（延续参考）', 'nerve'],
  ['z-nervous-system-100.fbx', 'Long_thoracic_nerver', 'long-thoracic-nerve', '胸长神经（邻近参考）', 'nerve'],
  ['z-nervous-system-100.fbx', 'Dorsal_scapular_nerver', 'dorsal-scapular-nerve', '肩胛背神经（邻近参考）', 'nerve'],
  ['z-muscular-system-100.fbx', 'Scalenus_anterior_muscler', 'anterior-scalene', '前斜角肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Scalenus_medius_muscler', 'middle-scalene', '中斜角肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Scalenus_posterior_muscler', 'posterior-scalene', '后斜角肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Sternocleidomastoid_muscler', 'sternocleidomastoid', '胸锁乳突肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Omohyoid_muscler', 'omohyoid', '肩胛舌骨肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Longus_colli_muscler', 'longus-colli', '颈长肌', 'muscle'],
  ['z-muscular-system-100.fbx', 'Levator_scapulaer', 'levator-scapulae', '肩胛提肌', 'muscle'],
  ['z-cardio-vascular-41.fbx', 'Right_common_carotid_artery', 'common-carotid-artery', '右颈总动脉', 'artery'],
  ['z-cardio-vascular-41.fbx', 'Internal_jugular_veinr', 'internal-jugular-vein', '右颈内静脉', 'vein'],
  ['z-cardio-vascular-41.fbx', 'External_jugular_veinr', 'external-jugular-vein', '右颈外静脉', 'vein'],
  ['z-cardio-vascular-41.fbx', 'Right_subclavian_artery', 'subclavian-artery', '右锁骨下动脉', 'artery'],
  ['z-cardio-vascular-41.fbx', 'Right_subclavian_vein', 'subclavian-vein', '右锁骨下静脉', 'vein'],
  ['z-cardio-vascular-41.fbx', 'Vertebral_arteryr', 'vertebral-artery', '右椎动脉', 'artery'],
  ['z-skeletal-system-100.fbx', 'Vertebra_C3', 'vertebra-c3', '第3颈椎', 'bone'],
  ['z-skeletal-system-100.fbx', 'Vertebra_C4', 'vertebra-c4', '第4颈椎', 'bone'],
  ['z-skeletal-system-100.fbx', 'Vertebra_C5', 'vertebra-c5', '第5颈椎', 'bone'],
  ['z-skeletal-system-100.fbx', 'Vertebra_C6', 'vertebra-c6', '第6颈椎', 'bone'],
  ['z-skeletal-system-100.fbx', 'Vertebra_C7', 'vertebra-c7', '第7颈椎', 'bone'],
  ['z-skeletal-system-100.fbx', 'Vertebra_T1', 'vertebra-t1', '第1胸椎', 'bone'],
  ['z-skeletal-system-100.fbx', 'First_ribr', 'first-rib', '右第1肋', 'bone'],
  ['z-skeletal-system-100.fbx', 'Clavicler', 'clavicle', '右锁骨', 'bone'],
  ['z-skeletal-system-100.fbx', 'Manubrium_of_sternum', 'manubrium', '胸骨柄', 'bone'],
];

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3; min[axis] = Math.min(min[axis], positions[i]); max[axis] = Math.max(max[axis], positions[i]);
  }
  return { min, max };
}
function extract(mesh) {
  // Deliberately transform only this mesh, not the bounding box of its children.
  const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).scale(.01, .01, .01);
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const order = g.index ? g.index.array : Array.from({ length: p.count }, (_, i) => i);
  const positions = [], normals = [], indices = [], tuples = new Map();
  for (const i of order) {
    const tuple = [p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i)];
    const key = tuple.join(','); let target = tuples.get(key);
    if (target === undefined) {
      target = positions.length / 3; tuples.set(key, target);
      positions.push(...tuple.slice(0, 3).map(v => Number(v.toFixed(8))));
      normals.push(...tuple.slice(3).map(v => Number(v.toFixed(6))));
    }
    indices.push(target);
  }
  g.dispose();
  assert(positions.every(Number.isFinite) && normals.every(Number.isFinite));
  assert.equal(indices.length % 3, 0);
  assert(indices.every(i => Number.isInteger(i) && i >= 0 && i < positions.length / 3));
  return { positions, normals, indices };
}
function connectedComponents(g) {
  const positions = new Map(), vertexMap = [];
  for (let i = 0; i < g.positions.length; i += 3) {
    const key = g.positions.slice(i, i + 3).join(',');
    if (!positions.has(key)) positions.set(key, positions.size);
    vertexMap.push(positions.get(key));
  }
  const parent = Array.from({ length: positions.size }, (_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < g.indices.length; i += 3) {
    const a = find(vertexMap[g.indices[i]]);
    parent[find(vertexMap[g.indices[i + 1]])] = a; parent[find(vertexMap[g.indices[i + 2]])] = a;
  }
  const grouped = new Map();
  for (let i = 0; i < vertexMap.length; i++) {
    const id = find(vertexMap[i]);
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(...g.positions.slice(i * 3, i * 3 + 3));
  }
  return [...grouped.values()].map(positions => ({ vertexCount: positions.length / 3, bounds: bounds(positions) }))
    .sort((a, b) => b.bounds.max[1] - a.bounds.max[1]);
}
function section(g, y) {
  const segments = [];
  for (let i = 0; i < g.indices.length; i += 3) {
    const vertices = g.indices.slice(i, i + 3).map(n => g.positions.slice(n * 3, n * 3 + 3));
    const points = [];
    for (let e = 0; e < 3; e++) {
      const a = vertices[e], b = vertices[(e + 1) % 3], da = a[1] - y, db = b[1] - y;
      if ((da < 0) === (db < 0) || Math.abs(da - db) < 1e-12) continue;
      const t = da / (da - db); points.push(a.map((v, k) => v + t * (b[k] - v)));
    }
    if (points.length === 2) segments.push(points);
  }
  return { segmentCount: segments.length, ...(segments.length ? { bounds: bounds(segments.flat(2)) } : {}) };
}

fs.mkdirSync(path.join(out, 'source'), { recursive: true });
const records = JSON.parse(fs.readFileSync(path.join(root, 'public/models/source/z-source-files.json'), 'utf8'));
const structures = [], geometries = new Map(), inventories = {}, sourceFiles = [];
for (const file of new Set(selection.map(s => s[0]))) {
  const bytes = fs.readFileSync(path.join(cache, file));
  const record = records.files.find(r => path.basename(r.cachePath ?? '') === file);
  assert(record, 'Missing source record: ' + file);
  assert.equal(sha(bytes), record.sha256, 'Source SHA mismatch: ' + file);
  assert.equal(bytes.length, record.bytes);
  assert(record.url.includes(commit));
  sourceFiles.push({ cacheFile: file, url: record.url, bytes: bytes.length, sha256: sha(bytes) });
  const scene = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true); const meshes = new Map();
  scene.traverse(o => { if (o.isMesh) meshes.set(o.name, o); });
  inventories[file] = [...meshes.values()].map(o => ({ name: o.name, sourceId: 'FBX:' + o.ID,
    sourceObjectId: o.ID, sourceVertexCount: o.geometry.attributes.position.count,
    isSkinnedMesh: !!o.isSkinnedMesh })).sort((a, b) => a.name.localeCompare(b.name));
  for (const [, objectName, id, name, kind, parentId] of selection.filter(s => s[0] === file)) {
    const mesh = meshes.get(objectName); assert(mesh, 'Missing selected source mesh: ' + objectName);
    const g = extract(mesh); geometries.set(id, g);
    const exported = Buffer.from(JSON.stringify(g)); fs.writeFileSync(path.join(out, id + '.json'), exported);
    const existing = prior.structures.find(s => s.sourceObjectIds.includes(mesh.ID));
    if (existing) assert.equal(sha(exported), existing.sha256, 'Overlapping source extraction changed: ' + id);
    structures.push({ id, name, nameEn: objectName.replace(/_/g, ' '), kind,
      side: kind === 'bone' && !['first-rib', 'clavicle'].includes(id) ? 'midline' : 'right',
      path: '/interscalene/' + id + '.json', sourceId: 'FBX:' + mesh.ID,
      sourceObjectIds: [mesh.ID], sourceObjectNames: [objectName], sourceFile: file,
      source: 'z-anatomy-pinned', sourceCommit: commit, license: 'CC-BY-SA-4.0',
      provenanceStatus: 'source-mesh-extracted', bounds: bounds(g.positions),
      vertexCount: g.positions.length / 3, triangleCount: g.indices.length / 3,
      bytes: exported.length, sha256: sha(exported),
      sourceChildMeshes: mesh.children.filter(o => o.isMesh).map(o => o.name),
      adaptations: ['Applied original source FBX matrixWorld, then uniform centimeter-to-meter scale 0.01.',
        'Deduplicated exact position+normal tuples; positions serialized to 8 decimal places; no geometric simplification.',
        'Preserved full selected source mesh; no invented connections, anatomical fitting or procedural pose deformation.'],
      ...(parentId ? { parentId } : {}),
      ...(kind === 'nerve' ? { topologyAudit: { method: 'position-welded triangle connectivity of exported source geometry',
        components: connectedComponents(g), interpretation: 'Topology only; components do not establish named spinal levels or biological completeness.' } } : {}),
      ...(id === 'brachial-roots' ? { semanticLimit: 'Source label is Roots of brachial plexus. It is a merged unsegmented proximal plexus mesh: no independent C5/C6/C7 level labels. Do not relabel it an intrathecal spinal root or infer individual ventral-ramus identities from component count.' } : {})
    });
  }
}

const sectionHeights = [1.44, 1.45, 1.46, 1.468, 1.475, 1.485, 1.495];
const sectionAudit = sectionHeights.map(y => ({ sourceY: y, structures: Object.fromEntries(
  ['brachial-roots', 'superior-trunk', 'middle-trunk', 'inferior-trunk', 'dorsal-scapular-nerve', 'anterior-scalene', 'middle-scalene',
    'sternocleidomastoid', 'common-carotid-artery', 'internal-jugular-vein', 'vertebral-artery']
    .map(id => [id, section(geometries.get(id), y)])) }));
const nerveNames = inventories['z-nervous-system-100.fbx'].map(o => o.name);
assert(!nerveNames.some(n => /phren|diaphragmatic.*nerve/i.test(n)), 'New phrenic candidate requires source audit');
assert(!nerveNames.some(n => /(?:^|_)[cC][567](?:_|$)/.test(n)), 'New cervical-level candidate requires source audit');

const licenseFiles = ['Z-UPSTREAM-LICENSE.txt', 'Z-MODEL-LICENSE.txt'];
const licenses = licenseFiles.map(file => {
  const bytes = fs.readFileSync(path.join(root, 'public/models/source', file));
  fs.writeFileSync(path.join(out, 'source', file), bytes);
  const record = records.files.find(r => (r.path ?? r.cachePath ?? '').endsWith(file));
  assert(record && record.sha256 === sha(bytes));
  return { path: '/interscalene/source/' + file, url: record.url, bytes: bytes.length, sha256: sha(bytes) };
});
fs.writeFileSync(path.join(out, 'source/mesh-inventory.json'), JSON.stringify({ sourceCommit: commit, inventories }, null, 2) + '\n');

const manifest = {
  schemaVersion: 1, module: 'right-interscalene-reference-anatomy',
  source: { id: 'z-anatomy-pinned', repository: 'https://github.com/LluisV/Z-Anatomy', commit,
    dataset: 'Original neutral Z-Anatomy source meshes; same fixed source and coordinate system as the axillary module',
    files: sourceFiles, licenses, attributionPath: '/interscalene/ATTRIBUTION.md',
    licensePath: '/interscalene/source/Z-UPSTREAM-LICENSE.txt', inventoryPath: '/interscalene/source/mesh-inventory.json' },
  license: 'CC-BY-SA-4.0',
  coordinateSystem: { ...prior.coordinateSystem,
    transform: 'Original FBX mesh matrixWorld, then uniform scale 0.01 cm to m. No source fitting, repositioning, clipping or nerve reconstruction.' },
  focus: { target: [-.038, 1.468, -.012], camera: [-.25, 1.51, .21], sliceY: 1.468,
    bounds: { min: [-.080, 1.43, -.070], max: [.005, 1.53, .055] },
    plane: { center: [-.038, 1.468, -.012], u: [0, 0, 1], v: [1, 0, 0], n: [0, 1, 0], width: .10, depth: .08,
      uMeaning: 'positive screen horizontal points anteriorly (+Z); left is posterior',
      vMeaning: 'positive image depth points medially (+X) from the right neck',
      nMeaning: 'plane normal points cranially (+Y); u cross v equals n; positive image depth is drawn downward',
      status: 'source-coordinate geometric reference only, not a validated clinical ultrasound scan plane',
      levelLimit: 'Source Y 1.468 lies within the C6 vertebra bounding Y range; this does not identify individual nerve branches as C6.' },
    suggestedSliceRange: { min: 1.44, max: 1.495, step: .001, units: 'm',
      meaning: 'Horizontal source-coordinate geometry exploration; not procedural positioning or clinical scan correspondence.' } },
  structures,
  missingStructures: [
    { id: 'c5-ventral-ramus', name: '独立C5脊神经前支', kind: 'nerve', status: 'no-independent-source-level-label', replacement: null },
    { id: 'c6-ventral-ramus', name: '独立C6脊神经前支', kind: 'nerve', status: 'no-independent-source-level-label', replacement: null },
    { id: 'c7-ventral-ramus', name: '独立C7脊神经前支', kind: 'nerve', status: 'no-independent-source-level-label', replacement: null },
    { id: 'phrenic-nerve', name: '膈神经', kind: 'nerve', status: 'no-named-mesh-found-in-fixed-source-inventory', replacement: null },
    { id: 'prevertebral-fascia', name: '椎前筋膜及可注药组织间隙', kind: 'fascia', status: 'not-validated-in-source', replacement: null },
    { id: 'pleural-dome', name: '胸膜顶', kind: 'organ', status: 'not-included-or-validated-for-this-export', replacement: null },
  ],
  sourceNerveAudit: { inventoryMeshCount: nerveNames.length,
    independentC5C6C7NamedMeshes: [], namedPhrenicCandidates: [],
    sourceProximalMesh: { sourceId: 'FBX:680949521', name: 'Roots_of_brachial_plexusr', segmentationStatus: 'merged-unsegmented' },
    spinalRootCandidatesNotSubstituted: nerveNames.filter(n => /^(Anterior|Posterior)_root_of_spinal_nerve/.test(n)),
    note: 'Anterior/posterior spinal root source meshes are separate multi-level structures, not substitutes for individually identified plexus-forming ventral rami. No neural component was assigned a cervical level.' },
  sectionAudit,
  limitations: [
    'Source geometry and named mesh presence are verified; clinical anatomical accuracy and completeness have not been independently validated.',
    'Brachial plexus roots are clinically plexus-forming anterior/ventral rami, distinct from intrathecal anterior/posterior spinal roots; this source proximal mesh is unsegmented.',
    'Independent named upper/middle/lower trunk meshes exist, but visual apposition and source hierarchy do not prove complete connected anatomy.',
    'C5/C6/C7 nerve selection, phrenic nerve, fascial sheath, injectable compartment, safe needle path and anesthetic spread are not supplied.',
    'The geometric plane uses original neutral anatomy. No patient-specific ultrasound registration, procedural pose or clinical scan-plane calibration was performed.',
    'Selected source meshes remain whole; the UI may restrict the right-neck ROI visually without altering anatomy. No mesh is created to fill a source gap.',
  ],
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const attribution = `# 右侧肌间沟区域参考模型：来源与署名\n\nBodyParts3D — The Database Center for Life Science.\nZ-Anatomy — The open source atlas of anatomy — CC BY-SA 4.0.\nFBX distribution: Lluís Vinent Juanico / Z-Anatomy; anatomical model work attributed upstream to Gauthier Kervyn and the BodyParts3D contributors.\n\nFixed source: https://github.com/LluisV/Z-Anatomy/tree/${commit}/Resources/Models/FBX\n\nLicense: Creative Commons Attribution-ShareAlike 4.0 International, https://creativecommons.org/licenses/by-sa/4.0/ . Upstream license and model attribution are preserved in source/Z-UPSTREAM-LICENSE.txt and source/Z-MODEL-LICENSE.txt. The upstream historical BodyParts3D CC-BY-SA 2.1 Japan attribution chain is retained; these Z adaptations and local geometry derivatives remain CC BY-SA 4.0.\n\nLocal adaptation (2026-10-24): selected named right-side neck and central skeletal meshes from four pinned source FBX files, applied original matrixWorld and uniform 0.01 centimeter-to-meter conversion, deduplicated exact position+normal tuples, serialized positions to eight decimal places. No source anatomy was moved, fitted, connected, split by assumed spinal level, or procedurally posed. Whole selected meshes are preserved; a right-neck display ROI is only a view aid. Original axillary-module geometry is not modified.\n\nSource label Roots of brachial plexus is retained as provenance for a merged, unsegmented proximal plexus mesh. This export does not identify individual C5/C6/C7 ventral rami and does not substitute intrathecal spinal root meshes. No phrenic nerve, fascia, injection space, patient-specific ultrasound registration or clinically calibrated scanning plane is generated.\n\nOnly named peripheral nerve and related muscular/vascular/skeletal reference meshes are exported. Brain white matter, cranial nerves, inner ear and kidney third-party examples are not included.\n\nPinned URLs, source IDs, hashes, geometry bounds, source inventory, adaptations and limitations are in manifest.json. Software integrity checks do not constitute clinical anatomical validation or approval of a block technique.\n`;
fs.writeFileSync(path.join(out, 'ATTRIBUTION.md'), attribution);
assert.equal(sha(fs.readFileSync(axillaryManifestPath)), untouchedAxillaryHash, 'Existing axillary manifest changed');
console.log(JSON.stringify({ status: 'EXPORTED_SOURCE_ONLY_REFERENCE_GEOMETRY', structures: structures.length,
  geometryBytes: structures.reduce((sum, s) => sum + s.bytes, 0), triangles: structures.reduce((sum, s) => sum + s.triangleCount, 0),
  roots: structures.find(s => s.id === 'brachial-roots'), focus: manifest.focus,
  sectionCounts: sectionAudit.map(({ sourceY, structures: parts }) => ({ sourceY,
    segments: Object.fromEntries(Object.entries(parts).map(([id, result]) => [id, result.segmentCount])) })),
  boundary: 'Source traceability and geometry only; no clinical anatomical or scan-plane validation.' }, null, 2));
