#!/usr/bin/env python3
"""Extract a right upper-limb teaching subset from pinned human-atlas data.

This script is independently written. No code from the source repository runs.
The original geometry is retained, except the explicitly labelled skin crop.
"""
import argparse
import concurrent.futures
import gzip
import hashlib
import json
import math
import pathlib
import struct
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models'
GEOMETRY_OUT = OUT / 'candidates/bodyparts3d'
SOURCE = OUT / 'source'
CACHE = pathlib.Path('/private/tmp/anesthesia-atlas-source-cache/bodyparts3d')
COMMIT = '1c38bf35c254a891200d3cedecfd57abebe83d8d'
BASE = f'https://raw.githubusercontent.com/ashemag/human-atlas/{COMMIT}/'
SELECTION = {
    'FJ2268': ('axillary-artery', '腋动脉', 'artery'),
    'FJ2269': ('axillary-vein', '腋静脉', 'vein'),
    'FJ2271': ('brachial-artery', '肱动脉', 'artery'),
    'FJ2341': ('brachial-vein', '肱静脉（源模型内侧支）', 'vein'),
    'FJ2270': ('basilic-vein', '贵要静脉', 'vein'),
    'FJ2272': ('cephalic-vein', '头静脉', 'vein'),
    'FJ2277': ('deep-brachial-artery', '肱深动脉', 'artery'),
    'FJ2294': ('radial-artery', '桡动脉', 'artery'),
    'FJ2310': ('ulnar-artery', '尺动脉', 'artery'),
    'FJ1488': ('coracobrachialis', '喙肱肌', 'muscle'),
    'FJ1478': ('biceps-long-head', '肱二头肌长头', 'muscle'),
    'FJ1512': ('biceps-short-head', '肱二头肌短头', 'muscle'),
    'FJ1477': ('triceps-lateral-head', '肱三头肌外侧头', 'muscle'),
    'FJ1479': ('triceps-long-head', '肱三头肌长头', 'muscle'),
    'FJ1480': ('triceps-medial-head', '肱三头肌内侧头', 'muscle'),
    'FJ1486': ('brachialis', '肱肌', 'muscle'),
    'FJ1446': ('pectoralis-major-abdominal', '胸大肌腹部', 'muscle'),
    'FJ1447': ('pectoralis-major-clavicular', '胸大肌锁骨部', 'muscle'),
    'FJ1464': ('pectoralis-major-sternocostal', '胸大肌胸肋部', 'muscle'),
    'FJ1456': ('pectoralis-minor', '胸小肌', 'muscle'),
    'FJ1467': ('deltoid-acromial', '三角肌肩峰部', 'muscle'),
    'FJ1468': ('deltoid-clavicular', '三角肌锁骨部', 'muscle'),
    'FJ1513': ('deltoid-spinal', '三角肌肩胛冈部', 'muscle'),
    'FJ1504': ('subscapularis', '肩胛下肌', 'muscle'),
    'FJ1507': ('teres-major', '大圆肌', 'muscle'),
    'FJ1508': ('teres-minor', '小圆肌', 'muscle'),
    'FJ1459': ('serratus-anterior', '前锯肌', 'muscle'),
    'FJ3368': ('humerus', '肱骨', 'bone'),
    'FJ3384': ('scapula', '肩胛骨', 'bone'),
    'FJ3362': ('clavicle', '锁骨', 'bone'),
    'FJ3349': ('radius', '桡骨', 'bone'),
    'FJ3391': ('ulna', '尺骨', 'bone'),
    'FJ2810': ('skin-right-arm-crop', '右上肢皮肤（显示裁切）', 'skin'),
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def download(relative, dest):
    url = BASE + relative
    if dest.exists():
        raw = dest.read_bytes()
    else:
        req = urllib.request.Request(url, headers={'User-Agent': 'Anesthesia-Atlas-Asset-Audit'})
        with urllib.request.urlopen(req, timeout=90) as response:
            raw = response.read()
        dest.write_bytes(raw)
    location = {'path': str(dest.relative_to(OUT))} if dest.is_relative_to(OUT) else {'cachePath': str(dest)}
    return {'url': url, **location, 'bytes': len(raw), 'sha256': sha(raw)}


def unpack(raw, offset, code, count):
    return list(struct.unpack_from('<' + str(count) + code, raw, offset))


def bounds_of(positions):
    return {'min': [min(positions[i::3]) for i in range(3)],
            'max': [max(positions[i::3]) for i in range(3)]}


def crop_skin(positions, normals, indices):
    # A display crop, deliberately open at the clipping boundary, not a new
    # anatomical segmentation. Keep complete triangles whose vertices lie in ROI.
    low, high = [-0.35, 0.73, -0.16], [-0.045, 1.47, 0.16]
    inside = [all(low[d] <= positions[i * 3 + d] <= high[d] for d in range(3))
              for i in range(len(positions) // 3)]
    kept = [indices[i:i + 3] for i in range(0, len(indices), 3)
            if all(inside[j] for j in indices[i:i + 3])]
    used = sorted({j for triangle in kept for j in triangle})
    mapping = {old: new for new, old in enumerate(used)}
    return ([positions[j * 3 + d] for j in used for d in range(3)],
            [normals[j * 3 + d] for j in used for d in range(3)],
            [mapping[j] for triangle in kept for j in triangle], {'min': low, 'max': high})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true', help='Allow downloading pinned public source files.')
    args = parser.parse_args()
    SOURCE.mkdir(parents=True, exist_ok=True)
    GEOMETRY_OUT.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    atlas = json.loads((SOURCE / 'atlas.json').read_text())
    parts = {p['id']: p for p in atlas['parts']}
    assert all(p in parts for p in SELECTION)
    chunks = sorted({parts[p]['chunk'] for p in SELECTION})
    records = []
    for name, dest in [('public/models/atlas.json', 'atlas.json'), ('public/ATTRIBUTION.md', 'ATTRIBUTION.md'), ('LICENSE', 'LICENSE-MIT.txt')]:
        if not args.download and not (SOURCE / dest).exists():
            raise RuntimeError('Missing source file: ' + dest)
        records.append(download(name, SOURCE / dest))
    def acquire(ci):
        item = atlas['chunks'][ci]
        relative = item['gzip'].lstrip('/')
        dest = CACHE / pathlib.Path(relative).name
        if not args.download and not dest.exists():
            raise RuntimeError('Missing chunk; use --download: ' + relative)
        record = download('public/' + relative, dest)
        raw = gzip.decompress(dest.read_bytes())
        assert len(raw) == item['bytes'], (ci, len(raw), item['bytes'])
        record['decompressedBytes'] = len(raw)
        record['decompressedSha256'] = sha(raw)
        return ci, raw, record
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        acquired = list(pool.map(acquire, chunks))
    buffers = {ci: raw for ci, raw, record in acquired}
    records.extend(record for ci, raw, record in acquired)
    structures = []
    for source_id, (semantic_id, zh, kind) in SELECTION.items():
        p = parts[source_id]
        raw = buffers[p['chunk']]
        positions = unpack(raw, p['positions'], 'f', p['vertexCount'] * 3)
        normals = [max(-1., v / 32767) for v in unpack(raw, p['normals'], 'h', p['vertexCount'] * 3)]
        indices = unpack(raw, p['indices'], 'I', p['indexCount'])
        assert all(math.isfinite(v) for v in positions + normals)
        assert len(indices) % 3 == 0 and min(indices) >= 0 and max(indices) < p['vertexCount']
        measured = bounds_of(positions)
        # Upstream manifest bounds precede simplification. Preserve both instead
        # of mistaking metadata bounds for the actual simplified mesh extent.
        bounds_delta = max(abs(measured[side][d] - p['bounds'][si][d]) for si, side in enumerate(['min', 'max']) for d in range(3))
        assert bounds_delta < 0.002, (source_id, bounds_delta)
        adaptations = ['Extracted one existing mesh from source binary chunk; original coordinates retained.']
        status = 'source-mesh-extracted'
        crop = None
        if source_id == 'FJ2810':
            positions, normals, indices, crop = crop_skin(positions, normals, indices)
            status = 'source-mesh-display-cropped'
            adaptations += ['Open display crop using ROI triangle inclusion, not an anatomical skin subdivision.']
        geometry = {'positions': positions, 'indices': indices, 'normals': normals}
        dest = GEOMETRY_OUT / (semantic_id + '.json')
        payload = json.dumps(geometry, separators=(',', ':')).encode()
        dest.write_bytes(payload)
        structures.append({'id': semantic_id, 'name': zh, 'nameEn': p['name'], 'kind': kind,
            'side': 'right', 'path': '/models/' + str(dest.relative_to(OUT)), 'sourceId': source_id, 'conceptId': p['conceptId'],
            'bounds': bounds_of(positions), 'sourceMetadataBounds': {'min': p['bounds'][0], 'max': p['bounds'][1]},
            'boundsDeltaM': bounds_delta, 'vertexCount': len(positions) // 3, 'triangleCount': len(indices) // 3,
            'sha256': sha(payload), 'bytes': len(payload), 'source': 'human-atlas-bodyparts3d',
            'license': 'CC-BY-4.0', 'provenanceStatus': status, 'adaptations': adaptations,
            **({'cropBounds': crop} if crop else {})})
    missing = []
    for semantic_id, en, zh in [('median', 'median nerve', '正中神经'), ('ulnar', 'ulnar nerve', '尺神经'),
                                ('radial', 'radial nerve', '桡神经'), ('musculocutaneous', 'musculocutaneous', '肌皮神经')]:
        assert not any(en in p['name'].lower() for p in atlas['parts'])
        missing.append({'id': semantic_id, 'name': zh, 'kind': 'nerve', 'status': 'not-present-in-human-atlas',
                        'reason': 'No matching independent mesh or concept in pinned human-atlas manifest.'})
    manifest = {'schemaVersion': 1, 'module': 'right-axillary-brachial-plexus',
        'source': {'id': 'human-atlas-bodyparts3d', 'repository': 'https://github.com/ashemag/human-atlas',
            'commit': COMMIT, 'dataset': 'BodyParts3D 4.0', 'attributionPath': '/models/source/ATTRIBUTION.md',
            'files': records}, 'license': 'CC-BY-4.0',
        'coordinateSystem': {'units': 'm', 'up': '+Y', 'anterior': '+Z', 'right': '-X',
            'pose': 'source neutral standing anatomy, arm alongside trunk', 'transform': 'identity'},
        'focus': {'target': [-0.158, 1.325, -0.015], 'camera': [-0.40, 1.43, 0.40],
            'bounds': {'min': [-0.25, 1.20, -0.11], 'max': [-0.08, 1.44, 0.09]}},
        'structures': structures, 'missingStructures': missing,
        'limitations': ['No target limb nerve meshes in human-atlas source.',
            'Source is a single adult male reference, not patient-specific anatomy.',
            'No source arm abduction pose; do not imply procedural positioning.',
            'No source fascial sheath or injectable tissue plane has been validated.']}
    (GEOMETRY_OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'structures': len(structures), 'triangles': sum(s['triangleCount'] for s in structures),
        'exportBytes': sum(s['bytes'] for s in structures), 'downloadedChunks': chunks,
        'missingNerves': [s['id'] for s in missing]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
