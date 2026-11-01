# 右侧腋窝教学模型：来源与署名

## 本次实际显示的解剖模型

BodyParts3D — The Database Center for Life Science.

Z-Anatomy — The open source atlas of anatomy — CC BY-SA 4.0.

FBX distribution: Lluís Vinent Juanico / Z-Anatomy; anatomical model work attributed upstream to Gauthier Kervyn and the BodyParts3D contributors.

Fixed source: <https://github.com/LluisV/Z-Anatomy/tree/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models/FBX>

License: **Creative Commons Attribution-ShareAlike 4.0 International**.

License text: <https://creativecommons.org/licenses/by-sa/4.0/>; upstream license and model attribution are preserved in `source/Z-UPSTREAM-LICENSE.txt` and `source/Z-MODEL-LICENSE.txt`.

The upstream model attribution also preserves the historical label “BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan”. We retain that attribution chain. The imported Z-Anatomy adaptations and their local derivatives are provided under CC BY-SA 4.0, rather than relabelled with the newer independent BodyParts3D database license.

## Local adaptations / 本地改编

Selected **right-side** upper-limb nerves, vessels, muscles and bones from the five pinned FBX files recorded in `manifest.json`. Applied each mesh's original FBX world transform and converted centimeters to meters with a uniform scale of 0.01. Deduplicated exactly equal position-and-normal tuples, without anatomical fitting or geometric simplification. Serialized transformed positions to 8 decimal places in meters.

Combined named body-surface region patches into a single display layer. These patches are surface reference regions; they are not source-validated nerve sensory territories, skin thickness, fascia, or an injectable tissue compartment.

No model from another source was fitted into the active scene. No nerve centerline was drawn, generated, stretched or displaced. Needle, local-anesthetic target, spread and sensory-coverage annotations, if displayed by the application, are separate educational overlays and do not originate in these reference meshes.

Mesh names, object IDs, download URLs, pinned commit, SHA-256 checksums, transformations and limitations are recorded in `manifest.json`. Local asset adaptation date: 2026-10-23.

Only peripheral nerve and related upper-limb reference structures were extracted. The upstream package's third-party inner-ear, kidney, white-matter and cranial-nerve examples are not included in these exports.

## 备用来源审计

The separately audited ashemag/human-atlas project is not the source of the active anatomical geometry. Its BodyParts3D 4.0 metadata is retained in `source/atlas.json`, with its original `source/ATTRIBUTION.md` and MIT application-code license, to document why it was not used for target limb nerves. Its geometry was not mixed into the active scene.

## v0.2 参考体位教学重建（2026-10-23）

原始47份网格与固定版本保持不变。运行时增加参考敬礼位：骨段刚体变换；所有神经、血管、肌肉和体表使用共同连续旋转流。无新增神经连接、筋膜或可注药空间。此衍生形态按 CC BY-SA 4.0 提供；未作临床体位软组织、肩带运动或同病例超声配准验证。算法及几何检查见 src/pose-utils.js 与 docs/pose-audit.md。

真实超声图与体位照片来自 Vazin M et al. BioMed Res Int. 2016;2016:7094121. Figure 1(e/f). DOI:10.1155/2016/7094121. Copyright 2016 Mojgan Vazin et al., CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). 仅裁切原图，未镜像、增强或AI编辑；界面交互色圈为单独覆盖层。来源与裁框见 docs/ultrasound-sources.md。

## v0.3 来源路线纠正（2026-10-24）

撤下v0.2自行变形敬礼位和三维探头，运行时代码直接使用原始中立位47份网格，未改变源几何坐标。v0.2姿态代码仅作为撤回的历史文本留存，不是当前活动模型，也不作为操作体位依据。

Han JH et al. Korean J Anesthesiol. 2014;67(5):310–316. DOI10.4097/kjae.2014.67.5.310. Figure1/4 ©Korean Society of Anesthesiologists2014, CC BY-NC3.0 (https://creativecommons.org/licenses/by-nc/3.0/)，按原始JPEG保留，无像素修改，供非商业本地教学。图像与源中立位模型只作主题/同名结构关联，不是同病例配准。NYSORA/Hadzic图片仅为原站外链，未复制进交付内容。
