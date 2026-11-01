#!/usr/bin/env python3
"""Local integrity/crop verification; does not certify clinical interpretation."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'src/data/ultrasound.json').read_text())
asset = ROOT / 'public'
source_path = asset / data['source']['originalPath'].lstrip('/')
raw = source_path.read_bytes()
assert hashlib.sha256(raw).hexdigest() == data['source']['originalSha256']
assert hashlib.md5(raw).hexdigest() == data['source']['originalMd5']
metadata = json.loads((asset / 'ultrasound/source/PMC5136641.1.json').read_text())
assert metadata['license_code'] == 'CC BY' and metadata['doi'] == data['source']['doi']
assert metadata['is_pmc_openaccess'] and not metadata['is_retracted'] and not metadata['is_manuscript']
xml_raw = (asset / 'ultrasound/source/PMC5136641.1.xml').read_bytes()
assert hashlib.sha256(xml_raw).hexdigest() == data['source']['xmlSha256']
xml = ET.fromstring(xml_raw)
lic = xml.find('.//permissions/license')
assert lic.get('{http://www.w3.org/1999/xlink}href') == data['license']['url'] == 'https://creativecommons.org/licenses/by/4.0/'
original = Image.open(source_path)
assert original.size == (data['source']['originalWidth'], data['source']['originalHeight'])
report = []
for panel in data['panels']:
    path = asset / panel['path'].lstrip('/')
    content = path.read_bytes()
    assert hashlib.sha256(content).hexdigest() == panel['sha256']
    assert len(content) == panel['bytes']
    delivered = Image.open(path)
    assert delivered.size == (panel['width'], panel['height'])
    c = panel['crop']
    expected = original.crop((c['left'], c['top'], c['right'], c['bottom']))
    assert ImageChops.difference(delivered.convert('RGB'), expected.convert('RGB')).getbbox() is None
    report.append({'id': panel['id'], 'size': list(delivered.size), 'cropPixels': 'exact-source-crop', 'sha256': panel['sha256']})
us = next(p for p in data['panels'] if p['id'] == 'ultrasound')
assert {h['id'] for h in data['hotspots']} == {'median', 'ulnar', 'radial', 'musculocutaneous'}
assert len(data['hotspots']) == 4
for h in data['hotspots']:
    assert h['panelId'] == 'ultrasound' and 0 <= h['xPct'] <= 100 and 0 <= h['yPct'] <= 100
    recovered_x = h['xPct'] * us['width'] / 100 + us['crop']['left']
    recovered_y = h['yPct'] * us['height'] / 100 + us['crop']['top']
    assert abs(recovered_x - h['sourcePixelX']) < 0.01
    assert abs(recovered_y - h['sourcePixelY']) < 0.01
assert data['orientation']['side'] == 'unconfirmed'
assert data['orientation']['matchesCurrent3DSide'] is False
print(json.dumps({'status': 'PASS_LOCAL_ULTRASOUND_SOURCE_AND_CROP', 'panels': report,
                  'hotspots': 4, 'license': data['license']['id'],
                  'boundary': 'Verifies source files, explicit license, exact crops and coordinate arithmetic. Does not establish patient side, physical probe marker, 3D registration, needle safety or clinical validity.'}, ensure_ascii=False, indent=2))
