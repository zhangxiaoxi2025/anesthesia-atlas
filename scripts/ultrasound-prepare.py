#!/usr/bin/env python3
"""Reproduce the two main-text axillary panels; no SI, AI editing or inference."""
import argparse
import hashlib
import json
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'ultrasound'
SOURCE = OUT / 'source'
BASE = 'https://pmc-oa-opendata.s3.amazonaws.com/PMC5136641.1/'
FILES = {
    'PMC5136641.1.json': None,
    'PMC5136641.1.xml': '8fa144d1c680980c67a76e9ddacd4554be5d41b84b8be4e72526d15449191bf5',
    'BMRI2016-7094121.001.jpg': '8eb74da265eec44507f4e7971a1e2137f8717515dc1f656ef5175a0cace82afc',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Fetch only the 3 explicit official OA objects above.')
    args = parser.parse_args()
    SOURCE.mkdir(parents=True, exist_ok=True)
    if args.download:
        for name, expected in FILES.items():
            with urllib.request.urlopen(BASE + name, timeout=45) as response:
                raw = response.read()
            if expected and sha(raw) != expected:
                raise ValueError(f'Official file changed: {name}; review before updating the pinned evidence.')
            (SOURCE / name).write_bytes(raw)

    for name, expected in FILES.items():
        raw = (SOURCE / name).read_bytes()
        if expected and sha(raw) != expected:
            raise ValueError('Local source checksum mismatch: ' + name)
    metadata = json.loads((SOURCE / 'PMC5136641.1.json').read_text())
    assert metadata['pmcid'] == 'PMC5136641' and metadata['license_code'] == 'CC BY'
    assert metadata['is_pmc_openaccess'] and not metadata['is_manuscript'] and not metadata['is_retracted']
    xml = ET.parse(SOURCE / 'PMC5136641.1.xml')
    permissions = xml.find('.//permissions')
    license_node = permissions.find('license')
    license_url = license_node.get('{http://www.w3.org/1999/xlink}href')
    assert license_url == 'https://creativecommons.org/licenses/by/4.0/'
    fig = xml.find('.//fig[@id="fig1"]')
    caption_original = ''.join(fig.find('caption').itertext())
    assert fig.find('graphic').get('{http://www.w3.org/1999/xlink}href') == 'BMRI2016-7094121.001.jpg'
    image = Image.open(SOURCE / 'BMRI2016-7094121.001.jpg')
    assert image.format == 'JPEG' and image.size == (662, 663)

    panels = []
    specs = [
        ('position', 'axillary-position-vazin2016.png', (0, 425, 289, 650), '1(e)',
         '原论文 Figure 1(e)：腋路体位、探头与平面内操作照片；保留原图，仅裁切。原图未明确标出左/右侧与探头标记端。',
         'patient-side-and-probe-marker-unconfirmed'),
        ('ultrasound', 'axillary-ultrasound-vazin2016.png', (290, 425, 662, 650), '1(f)',
         '原论文 Figure 1(f)：真实腋路短轴超声。原标注 Mc=肌皮、Me=正中、Ul=尺、Ra=桡神经，AA=腋动脉；图左 Cephalad、图右 Caudad。',
         'screen-cephalad-caudad-confirmed-patient-side-unconfirmed'),
    ]
    for ident, filename, box, source_panel, caption, orientation_status in specs:
        crop = image.crop(box)
        crop.save(OUT / filename, format='PNG')
        raw = (OUT / filename).read_bytes()
        panels.append({
            'id': ident, 'path': '/ultrasound/' + filename,
            'width': crop.width, 'height': crop.height,
            'caption': caption, 'orientationStatus': orientation_status,
            'sourcePanel': source_panel,
            'crop': {'left': box[0], 'top': box[1], 'right': box[2], 'bottom': box[3],
                     'coordinates': 'original 662x663 image; origin top-left; half-open [left,top,right,bottom)'},
            'sha256': sha(raw), 'bytes': len(raw),
            'changes': 'Lossless PNG serialization of an unscaled crop from the source JPEG; no pixel annotation, mirroring, enhancement or AI editing.',
        })

    # Points are the centers of the source author's dashed labels, manually
    # checked in the actual original pixels. They are not segmentation masks.
    crop_left, crop_top = 290, 425
    crop_width, crop_height = 372, 225
    centers = [
        ('musculocutaneous', '肌皮神经', 'Mc', 373, 482),
        ('median', '正中神经', 'Me', 439, 468),
        ('ulnar', '尺神经', 'Ul', 535, 491),
        ('radial', '桡神经', 'Ra', 523, 514),
    ]
    hotspots = [{
        'id': ident, 'name': name, 'panelId': 'ultrasound', 'sourceLabel': label,
        'xPct': round((x - crop_left) / crop_width * 100, 3),
        'yPct': round((y - crop_top) / crop_height * 100, 3),
        'sourcePixelX': x, 'sourcePixelY': y,
        'status': 'source-label-center-visually-checked',
        'meaning': '识别用热点，位于原作者标注中心附近；不是针尖、给药点、神经边界分割或安全区域。',
    } for ident, name, label, x, y in centers]
    record = {
        'schemaVersion': 1,
        'id': 'vazin2016-axillary-ef',
        'title': '腋路体位与真实超声参考 · Vazin 等 2016 Figure 1(e/f)',
        'source': {
            'authors': 'Mojgan Vazin et al.', 'year': 2016, 'journal': 'BioMed Research International',
            'title': metadata['title'], 'doi': metadata['doi'], 'pmcid': metadata['pmcid'],
            'articleUrl': 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5136641/',
            'figure': 'Figure 1, axillary panels (e) and (f) only',
            'metadataUrl': BASE + 'PMC5136641.1.json',
            'xmlUrl': BASE + 'PMC5136641.1.xml',
            'imageUrl': BASE + 'BMRI2016-7094121.001.jpg',
            'originalPath': '/ultrasound/source/BMRI2016-7094121.001.jpg',
            'originalWidth': 662, 'originalHeight': 663,
            'originalSha256': FILES['BMRI2016-7094121.001.jpg'],
            'originalMd5': '089f8415c2d4384586b8a4e6e9f4c344',
            'xmlSha256': FILES['PMC5136641.1.xml'],
            'retrievedDate': '2026-10-23',
            'retrievalRoute': 'NCBI PMC official world-readable Cloud Service on AWS; exact article-version objects only.',
            'scope': 'Main-text Figure 1 only; no Supporting Information requested or downloaded.',
            'originalFigureCaption': caption_original,
        },
        'license': {
            'id': 'CC-BY-4.0', 'url': license_url, 'verified': True,
            'evidence': '/ultrasound/source/PMC5136641.1.xml — article/front/article-meta/permissions/license/@xlink:href',
            'copyright': 'Copyright © 2016 Mojgan Vazin et al.',
            'attribution': 'Vazin M et al. BioMed Res Int. 2016;2016:7094121. doi:10.1155/2016/7094121. Figure 1(e/f), CC BY 4.0. Source: NCBI PubMed Central Cloud Service. Cropped from the original figure; no other pixel changes.',
            'thirdPartyFigureNotice': 'No separate third-party credit or exclusion is present in the Figure 1 caption or its JATS figure element.',
        },
        'panels': panels,
        'hotspots': hotspots,
        'orientation': {
            'side': 'unconfirmed',
            'status': 'screen-anatomical-direction-confirmed-patient-side-and-physical-probe-marker-pending',
            'screenLeft': 'Cephalad / 头侧（原图文字）',
            'screenRight': 'Caudad / 尾侧（原图文字）',
            'nearField': '图像上缘为浅层/探头侧；这是超声屏幕深度方向，不等同当前三维模型的固定世界轴。',
            'probeMarker': '原照片未能确认物理探头标记端，不补猜。',
            'matchesCurrent3DSide': False,
        },
        'notes': [
            '这是成人论文中的真实腋路超声与对应探头照片，非颈部、锁骨上或锁骨下数据；原大图其他面板已从交互用裁图中排除。',
            '原文方法说明腋路为仰卧、肩外展约90°并屈肘暴露腋窝；照片与图注不是个体三维配准数据。',
            '原图 f 明确有 AA 与四神经标注；本次没有确认腋静脉可可靠识别的位置，故不创建 AV 热点。大图面板 d 的 AV 属锁骨下示例，不能移到本腋路面板。',
            '保留原作者针道箭头和原标签，供阅读原图；它们不能作为当前学习者或患者的进针方向、深度或安全位置建议。',
            '四个热点只用于选中同名神经，标的是原作者虚线标注中心，不是神经轮廓或可注药区域。',
            '原图含作者选定的局部视图与解剖排列，不能当成所有人固定钟点关系。',
            '本素材是两张静态图片，没有动态扫查、跟踪坐标、探头压力、三维体数据或患者级标定。',
            '与三维仅建立名称和教学主题对应；真实超声与三维之间的空间/姿势配准尚未完成。',
            '来源图为662×663整图，腋路超声有效像素有限，界面可放大显示但不得声称新增分辨率或结构细节。',
        ],
    }
    (ROOT / 'src/data/ultrasound.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'id': record['id'], 'panels': panels, 'hotspots': hotspots, 'license': license_url}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
