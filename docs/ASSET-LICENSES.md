# 解剖资产许可与复用记录

更新日期：2026-10-31。当前功能版本v0.7.0继续保持源中立位，已撤下v0.2自行变形体位；本次未新增第三方模型或图像。64项软件测试、桌面/窄屏和打包单文件HTTP运行及静态完整性均已检查；常规/离线构建及最终HTML完整性以docs/verification-v070.md的实际记录为准。这里记录本地实际选用的资产及各版历史，不将仓库顶层代码许可套用到所有数据上，也不以本许可清单代替最终产物完整性核验、临床专家审阅或空间配准。

| 范围 | 来源与固定版本 | 许可 | 本地使用 |
| --- | --- | --- | --- |
| 腋路47个解剖结构 | [LluisV/Z-Anatomy](https://github.com/LluisV/Z-Anatomy/tree/6c7f9016bd5899ac8edafd31b9900c151df42ed6)，commit `6c7f9016bd5899ac8edafd31b9900c151df42ed6` | CC BY-SA 4.0；保留BodyParts3D、Z-Anatomy与FBX分发作者署名 | 只抽取右上肢及邻近胸部的参考几何，保持原始同源坐标；颈部35份见下方v0.4记录 |
| human-atlas备用来源的应用代码 | [ashemag/human-atlas](https://github.com/ashemag/human-atlas/tree/1c38bf35c254a891200d3cedecfd57abebe83d8d)，commit `1c38bf35c254a891200d3cedecfd57abebe83d8d` | MIT | 审阅格式与原数据读取逻辑；未执行其仓库代码；不是当前解剖几何来源 |
| human-atlas备用来源的数据 | BodyParts3D 4.0；[官方当前数据库许可](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)；[human-atlas具体署名](https://github.com/ashemag/human-atlas/blob/1c38bf35c254a891200d3cedecfd57abebe83d8d/public/ATTRIBUTION.md) | 独立CC BY 4.0；不能据此重标Z-Anatomy的后续改编 | 保留清单和授权文档用于资产缺口审计；当前场景不混用其网格 |
| Three.js与FBXLoader | 本地安装的官方`three`包，使用`three/addons/loaders/FBXLoader.js` | MIT | 仅作本地FBX解析和几何变换；不执行第三方解剖仓库附带的Unity/Python脚本 |
| 本地解剖几何改编 | 本目录的JSON模型与体表区域组合 | CC BY-SA 4.0 | 原始署名、固定版本、改编说明与同许可随资产保留；不要将其改标成应用原创代码的许可 |

完整随附署名位于`public/models/ATTRIBUTION.md`；上游许可原文位于`public/models/source/Z-UPSTREAM-LICENSE.txt`和`Z-MODEL-LICENSE.txt`。逐文件下载URL、字节数和SHA-256位于`public/models/manifest.json`的`source.files`。

上游`Resources/Models/License.txt`另列内耳、肾脏及其他第三方模型的不同许可。这次只抽取周围神经与相关上肢肌骨血管、体表分区，没有导出上述内耳、肾脏、脑白质或颅神经结构，也没有将整个Z包概括成可随意改许可的材料。

本地原创教学文字、交互代码、示意覆盖层与上述来源模型应分别标注归属。所用资料中的医学概念与解剖关系不能被误写为已获得作者对本工具的认可。引用教科书或文章不意味着有权复制其图片、页面或全文；本次模型导出未复制这些内容。v0.2另行选用了下述开放许可论文裁图。

原始FBX缓存保留在`/private/tmp/anesthesia-atlas-source-cache/`，不需要随浏览器页面加载。该临时目录可能被系统清理，届时可按清单中的固定URL和校验值重新下载。已导出的JSON与许可文件均随本地项目保存。

## v0.2 超声图与体位照片

Vazin M et al. BioMed Res Int. 2016;2016:7094121，DOI10.1155/2016/7094121，Figure1(e/f)，Copyright ©2016 Mojgan Vazin et al.。原文JATS的license链接实证为 CC BY4.0，图注及figure元素没有另列第三方排除。只裁切腋路面板，PNG像素与原JPEG指定裁框一致，原标签和针道保留；交互色圈为代码独立覆盖层。原图/JATS、署名、裁框和hash在 public/ultrasound 与 docs/ultrasound-sources.md。离线版嵌入两张PNG和完整来源署名。

v0.2曾尝试运行时体位变形，现已撤下，相关代码仅以文本保留于 docs/history/v02-experimental/，不进入活动路径。v0.3直接使用源中立位网格，不再显示自建操作体位或三维探头。


## v0.3 原刊方位示意与真实血管变异

Han JH et al. Topographic pattern of the brachial plexus at the axillary fossa through real-time ultrasonography in Koreans. Korean J Anesthesiol. 2014;67(5):310–316. DOI 10.4097/kjae.2014.67.5.310。Figure 1为方位示意，Figure 4为真实超声血管变异。Copyright © Korean Society of Anesthesiologists 2014；官方原页明确 [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/)。

本版使用两张原刊JPEG，未改像素，保留原文字、箭头与方向，界面说明和按钮独立呈现。当前用于非商业个人学习及科室教学，不将NC许可扩张为商业再分发授权。署名保留作者、期刊、年份、图号、DOI、原站、许可及未修改说明，原作者未为本工具背书。

图片、来源页证据和许可记录在 public/reference-atlas/han2014/；散列、尺寸和方向限制见 src/data/reference-atlas.json、docs/reference-atlas-v03-sources.md。离线版内嵌两张JPEG、署名及许可证据，不执行或嵌套来源页HTML。

NYSORA腋路章节和Hadzic第32E章只链接原站，不将其解剖切片、体位照或教材页复制、热链或代理嵌入工具。可阅读与复制授权分别核对。

## v0.4 肌间沟模型与真实超声

新增35份右颈/中央骨性源结构，仍取同一固定Z-Anatomy版本，按原matrixWorld转成米，源姿态不变，不按臆定C5/C6/C7拆分合并神经。肩胛背、胸长神经按真实命名网格保留；膈神经缺口明确记录。署名及模型许可独立位于public/interscalene/ATTRIBUTION.md、manifest.json及source/许可文本，离线版内嵌完整记录，衍生模型仍CC BY-SA4.0。与旧47结构有6个同源重叠记录，不能将47+35称82个唯一解剖结构。

Kumar A et al. Anaesthesiol Intensive Ther. 2023;55(5):372–373，DOI10.5114/ait.2023.134278，Figure1。官方JATS明确CC BY-NC-SA4.0，©Polish Society of Anaesthesiology and Intensive Therapy。原JPEG未改像素，页面用CSS视窗切换A/B/C且可看完整原图；保留署名、许可、修改/展示说明和非商业范围。来源与原始证据见docs/interscalene-ultrasound-sources.md。图像改编若再分发须遵循其SA条件；此声明不把NC-SA套到其他来源资产或整个应用。

新全上肢感觉分区为明确标记的原创概念示意，医学事实逐项中文归纳自正规来源，不复制大学图表或受限教材插图。逐肌肉清单的依据和阅读层次见docs/clinical-v04-evidence.md。

## v0.4.4 候选原面与完整Hsu标本图

“中干近端候选走行”是同一固定Z-Anatomy近端合并网格的一组原三角面索引mask，共576面；原顶点/法线和原坐标保持不变，没有补线、焊接或摆放新神经。它不是新增的第36个颈部源结构，也不是一根已核定神经。候选衍生显示仍保留模型CC BY-SA4.0及原署名链；不将其重新标为应用原创几何。

候选记录固定保留 `identityStatus: unconfirmed`、`reviewStatus: unreviewed`。软件来源摘要、原面可复现和35项测试通过均不构成C5–T1身份、神经孔出口、解剖连接或临床有效性核定。候选数据及摘要方法见src/data/root-annotation-candidate.json、src/root-annotation.js和docs/root-candidate-geometry-v044.md。

Hsu PC, Chang KV, Mezian K, Naňka O, Wu WT, Yang YC, Meng S, Ricci V, Özçakar L. Sonographic Pearls for Imaging the Brachial Plexus and Its Pathologies. Diagnostics. 2020;10(5):324. DOI [10.3390/diagnostics10050324](https://doi.org/10.3390/diagnostics10050324)，完整Figure1 A–D。©2020 authors。正式JATS permissions明确 [CC BY4.0](https://creativecommons.org/licenses/by/4.0/)；所核Figure1图注/attrib没有另列第三方版权排除。

本地采用NCBI官方OA Cloud提供的完整原JPEG：714×578、179,045 B，SHA-256 `85bc3d77862fbfd5b54c7a0b93d7377c36edd38ecba25d607443c756a9bcbd10`，保留全部A–D、原英文与数字标记；未裁切、缩放、镜像、注释、增强或AI重绘。界面的缩略/放大显示不修改原始像素文件。完整作者、期刊、年份、图号、DOI、官方原图URL、许可及未修改说明随来源JSON保留，不暗示原作者认可候选身份或本工具。

- 活动文件：public/root-reference/hsu2020-figure1-original.jpg与hsu2020-figure1-source.json；界面元数据src/data/root-reference.json。
- 原图：[官方NCBI OA Cloud](https://pmc-oa-opendata.s3.amazonaws.com/PMC7277999.1/diagnostics-10-00324-g001.jpg)。
- 许可证据：[正式EuropePMC JATS](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC7277999/fullTextXML)，83,410 B，SHA-256 `50d690b317c178f947db6fed0a5773b45d086825b19a544bd53d2fcebc7aa58a`。
- 本轮此前原图目视/来源记录另存docs/source-guided-root-assets/及docs/2d-plexus-atlas-sources-20261027.md，保留作追溯。

A为移除前斜角肌后的标本，B是非空间比例拓扑图；Hsu标本与Z-Anatomy不同且未配准。原图的C5–T1标签不能直接转为现有候选的分段身份、精确坐标或骨孔出口标签。

既有打包范围合计6张媒体：Vazin两PNG（CC BY4.0）、Han两JPEG（CC BY-NC3.0）、Kumar一JPEG（CC BY-NC-SA4.0）、Hsu一完整JPEG（CC BY4.0）。每份保留各自许可；Hsu的开放许可不解除其它图像的NC/SA条件。旧版本逐项完整性记录见docs/offline-integrity.json及对应版本验证；v0.7.0最终产物的媒体、署名、证据和字节一致性另以docs/verification-v070.md为准。

Singh2023 BJR图、NYSORA/Hadzic、UBC等补充原站仅作资料查阅或外链；本轮没有把其可读/可看权限当成本软件复制许可。Hsu资料的明确CC BY4.0不能套用到这些受限图源。

## v0.5.0 根干关系与声像中文标注

沿用原Kumar完整JPEG，不改变原像素。新组件通过SVG视窗呈现原B/C面板，并以外置中文名称、引线和圈点连接原作者标签；这属于组合显示的矢量改编，保留CC BY-NC-SA4.0、原作者署名、原图与修改说明，未声称原作者认可本工具。锚点只是作者标签位置，不是神经分割、进针点或病例配准。

Hadzic第三版和Gray第二版用于核读解剖事实、文字归纳及页码追溯，未复制其扫描页、插图或全文入交付包。典型连接关系与模型身份分开：五个前支sourceMeshId均null，三干使用原已具名资产。模型、旧媒体和署名许可的字节不变性另由docs/offline-delta-v050.json核验。

## 历史：v0.6.0 两入路同源三维／切片联动

本轮不引入新第三方模型或图片。现有35颈部与47上肢记录按同源ID及全部几何值核对后去重6项，运行时共76源对象；名称、身份、姿态、米制坐标保留。默认显示以实际C5最高点和肱骨源Y范围中点作裁显上下界，材料裁显和相机观察不修改源网格。截面来自实际三角面求交，仅移动独立截线／显示平面，不形变身体、不补根、不生成超声纹理或临床配准；派生几何显示保留CC BY-SA4.0与源署名。

Kumar与Vazin的原图及旧标注层仍独立显示，新增模型切片不来源于商业扫描书页。当前截图／组合显示按各自原媒体许可保留，不能把模型的CC BY-SA扩大成对Han或Kumar的商业图像授权。各许可仍独立。

## v0.7.0 真实斜切、近景与原位副本

本次继续使用同一固定来源与已有6张媒体，未修改源神经坐标、网格拓扑或原图像素。恢复常驻四神经彩色标签和选择卡、调整局部相机取景、重算可倾斜切面的真实三角交线，并以15秒动画先转正放近、再缓慢移出显示副本。原位交线与副本均保留；原位解剖网格不随副本移动。显示派生仍保留模型CC BY-SA4.0与原署名链。

默认参考轴由同源骨几何计算；“按当前观察方向取面”与角度／位置微调属于模型显示控制，未从教材或用户图片恢复未知探头角度，也不构成神经短轴、临床体位或超声空间配准。肌间沟初始定位基点Y=1.455 m实际与C6/C7完整源骨相交，不能将整个C7骨网格改称已独立核定的C7横突。

最新用户腋路截图仅作为观察方向参考，替代此前截图的方向参考；不采其黑灰配色、不将该截图复制为新增素材。原神经分色、动脉红、静脉蓝继续使用。Hadzic教材所示ASM在左，现有Kumar原声像方向相反，二者各保留原方向；未为画面一致而镜像原图，也未把商业教材扫描页或插图加入交付包。

当前入口为交付文件/麻醉解剖双入路切面联动-v0.7.0.html，兼容入口随新版同步打包。软件测试、构建与最新视觉/离线QA的实际证据见docs/verification-v070.md；规格边界见docs/review-v070-spec.md及docs/v070-clinical-plane-evidence.md。逐根身份、体位与空间配准仍未完成，各版历史许可/完整性通过不能代替本次产物核验。
