# 腋路臂丛原型：临床内容与证据记录

核查日期：2026-10-23（Asia/Shanghai）。状态：`awaiting_clinician_review`。适用文件：`src/data/clinical.json`。

本内容用于成人参考解剖的中文学习和投屏教学。它解释结构、皮肤感觉与运动之间的联系，不是患者个体化阻滞预测或进针处方。源文中的剂量、浓度、针具、深度及操作参数均未转入本工具。上臂参考横断面来自图谱中立位几何场景；本版没有真实超声病例、已验证筋膜鞘或流体、药理仿真的证据。

## 当前资产层面与教学概念的区别

已只读核对本项目`public/models/manifest.json`与`docs/model-audit.md`：当前47个结构来自同一固定版本Z-Anatomy（commit `6c7f9016bd5899ac8edafd31b9900c151df42ed6`），本临床记录不重新证明其几何正确性。图谱为中立位、手臂邻近躯干，没有变形为腋路常用外展体位。

默认Y=1.295m的参考切面可以显示四条神经，但切面内血管按来源命名属于**肱动脉与肱静脉段**。来源腋动脉网格在更近端（Y约1.3634–1.4143m）；肌皮神经源网格近端止于Y约1.3109m，未人为补长。因此该面只能称“上臂参考横断面”，不能因为工具主题是腋路就把肱动脉改名腋动脉，或称为外展操作位标准超声面。

本版是本地解剖审阅原型。预设结构关系演示仅强调源模型中真实存在的神经、血管等结构组合，不绘制可注射位置。教材层面可解释局麻药作用于神经周围的神经外组织；本版未重建或验证腋部筋膜鞘、神经周围组织层及可注药空间，须待专项补建和审阅。因此结构高亮不表示安全进针路径、注药点、针尖位置或真实扩散。

## 来源与实际查阅范围

下列编号与JSON中的`sourceIds`一致。所有图形应由项目自行绘制或使用独立许可的模型，来源链接并不授权复制教材或期刊图片。

| ID | 原始来源与定位 | 采用范围 / 查阅限制 |
| --- | --- | --- |
| `hadzic-axillary` | Vandepitte, Lopez & Jalil. Hadzic’s Textbook of Regional Anesthesia and Acute Pain Management, 2e. Chapter 32E: [Ultrasound-Guided Axillary Brachial Plexus Block](https://accessanesthesiology.mhmedical.com/content.aspx?bookid=2070&sectionid=157602228)，公开的 Ultrasound Anatomy 部分。 | 公开正文可见腋动静脉、三神经、肌肉和变异。章节后文截断；不声称已阅读全文。公开页面未确认出版年，JSON保留`null`。未复制图片。 |
| `axillary-variation` | [Assessment of topographic brachial plexus nerves variations at the axilla using ultrasonography](https://doi.org/10.1093/bja/aep207). BJA. 2009;103:606–612. [PMID 19700445](https://pubmed.ncbi.nlm.nih.gov/19700445/)。 | 官方期刊检索摘要：153例，最常见排列65%，肌皮神经位置可变。本次正文网页有403，PubMed打开有空正文，故不使用未读方法细节或图像。 |
| `afp-upper-limb` | Yurgil JL, Hulsopple CD, Leggit JC. [Nerve Blocks: Part I. Upper Extremity](https://www.aafp.org/afp/2020/0601/p654). AFP. 2020;101:654–664；各神经 Anatomy 小节及 Figure 1说明。 | 官方全文可读。采用根源、走行和手部感觉边界。其肘腕部技术与腋路层面不同，未移植操作步骤。感觉图是典型分布，不是个体精确边界。 |
| `afp-function` | Silver S, Ledford CC, Vogel KJ, Arnold JJ. [Peripheral Nerve Entrapment and Injury in the Upper Extremity](https://www.aafp.org/afp/2021/0301/p275). AFP. 2021;103:275–285；Table 1、Table 2及Axillary Nerve小节。 | 官方全文可读。核对相关肌肉动作及腋神经三角肌/小圆肌、肩外侧感觉；只用解剖/功能，不移植损伤诊疗。 |
| `ucsf-axillary` | UCSF Pain Management Education. [Axillary Brachial Plexus Block](https://pain.ucsf.edu/peripheral-nerve-blocks/axillary-brachial-plexus-block)，Overview、Clinical Use和Block Duration下解剖说明。 | 官方全文可读。采用四神经、肌皮分离、腋神经与上臂内侧皮支覆盖限制；不采用“invariably”“complete”等绝对措辞，不复制药量或操作说明。无可确认的内容年份。 |
| `wfsa-intercostobrachial` | Kusre S, McEwen A, Matthew G. [Ultrasound-Guided Supraclavicular Brachial Plexus Block](https://resources.wfsahq.org/wp-content/uploads/384_english-1.pdf). WFSA ATOTW 384, 24 July 2018；PDF第1、3页。 | 仅用其对肋间臂神经的T2来源、非臂丛属性与止血带痛边界说明；不将锁骨上入路技术移植为腋路方法。PDF有CC BY-NC-ND声明，未复制或改编其图文。 |
| `anatomy-musculocutaneous` | Desai SS, Arbor TC, Varacallo MA. [Anatomy, Shoulder and Upper Limb, Musculocutaneous Nerve](https://www.ncbi.nlm.nih.gov/books/NBK534199/). StatPearls / NCBI Bookshelf；可见检索摘录标明2023-09-04更新。 | 公开检索摘录可核对根源、穿喙肱肌、肱二头肌/肱肌间走行、前臂外侧皮神经和肌群。直接正文遇验证页；不是全文审阅。 |
| `anatomy-median` | [Anatomy, Shoulder and Upper Limb, Median Nerve](https://www.ncbi.nlm.nih.gov/books/NBK448084/). StatPearls / NCBI Bookshelf；Structure and Function / Muscles公开摘录。 | 核对前臂与手内肌分工；正文验证页，更新年份未确认。未用其复杂感觉措辞取代AFP的指端边界说明。 |
| `anatomy-radial` | [Anatomy, Shoulder and Upper Limb, Radial Nerve](https://www.ncbi.nlm.nih.gov/books/NBK534840/). StatPearls / NCBI Bookshelf；Nerves / Muscles公开摘录。 | 核对近端皮支、浅深分支和伸肌。正文验证页，年份未确认。肌肉列表说明神经支配，不等于腋路效果。 |
| `anatomy-ulnar` | Becker RE, Manna B. [Anatomy, Shoulder and Upper Limb, Ulnar Nerve](https://www.ncbi.nlm.nih.gov/books/NBK499892/). StatPearls / NCBI Bookshelf；Nerves / Muscles公开摘录。 | 仅采用走行与肌群；其Structure and Function中将medial forearm写入感觉范围，与独立皮神经解剖及AFP典型图不一致，本项目不采用这条表述。正文验证页，年份未确认。 |
| `anatomy-medial-cutaneous` | [Anatomy, Medial Antebrachial Cutaneous Nerve](https://www.ncbi.nlm.nih.gov/books/NBK551638/). StatPearls / NCBI Bookshelf；Introduction / Nerves公开摘录。 | 前臂内侧皮肤属于前臂内侧皮神经，区别尺神经和上臂内侧皮神经。正文验证页，年份未确认。 |

检索路径：已按`nature-academic-search`的multi-source-search读取router、manifest、core与wf1。PubMed MCP返回`PubMed email not configured`；未添加虚构邮箱或改用户配置，转用官方PubMed网页、出版社、学会和医学中心页面。上述验证页或403限制均按实际可读范围记录，不能把检索摘录当全文精读。

## 关键主张与实现边界

| Claim | JSON / 图形落点 | 证据依据与限制 |
| --- | --- | --- |
| C01：腋路主要辨认正中、尺、桡、肌皮四神经。 | `nerves`、教学步骤01/02 | `hadzic-axillary`、`ucsf-axillary`。四神经清单不是所有上肢皮支清单。 |
| C02：肌皮神经常离开血管周围区域，其远端续为前臂外侧皮神经。 | 肌皮走行、独立结构关系演示、题1 | `ucsf-axillary`、`anatomy-musculocutaneous`。典型走行有变异。前臂外侧不能误写为上臂外侧。 |
| C03：手部感觉应分掌背与近远端。 | 正中/尺/桡`sensory`、题2 | `afp-upper-limb`、`anatomy-median`、`anatomy-radial`。指端甲床与近端指背不是同一块；边界并非每个体一致。 |
| C04：前臂内侧皮肤不随尺神经整片高亮。 | 尺`limitations`、`medial-cutaneous`、题4 | `anatomy-medial-cutaneous`与`afp-upper-limb`。对`anatomy-ulnar`的来源冲突作了明确取舍。 |
| C05：感觉与肌肉动作分开，支配图不等于阻滞图。 | 独立`sensory`/`motor`；题5 | 各神经解剖专章和`afp-upper-limb`。神经连续性推理：较远端阻滞不能自动覆盖近端已离开主干的分支；不提供该效应的成功率。 |
| C06：肋间臂神经主要来自T2，不属臂丛。 | `intercostobrachial`、题3 | `wfsa-intercostobrachial`、`ucsf-axillary`。止血带痛存在其他机制，不能保证由皮肤区覆盖消除。 |
| C07：腋路名称不意味着覆盖腋神经。 | `axillary`边界 | `ucsf-axillary`明确其覆盖不可靠；`afp-function`Table 2核对三角肌/小圆肌和肩外侧感觉。当前未将其做成四神经交互靶点。 |
| C08：图谱参考模型没有通用钟点方位。 | `variation`、局部模型及切面标记 | `axillary-variation`、`hadzic-axillary`。153例/65%是特定研究结果，不是全民解剖变异率；本版体位与临床扫描体位也有区别。 |
| C09：预设结构关系演示不标定可注药空间。 | `targets`、题6 | 教材层面的神经周围组织概念依据`hadzic-axillary`、`ucsf-axillary`；交互仅强调源模型结构组合，不绘制可注药位置。筋膜鞘及注药空间尚待专项补建，不表示安全进针、注药点或真实扩散。 |
| C10：皮肤、运动、深部关节感觉不能彼此替代。 | `coverage`边界与`scope` | 本版只给典型皮肤与相关动作，未建立关节支模型或手术麻醉预测。根源只是来源标签，本版未做皮节图。 |

## 供感觉SVG制作的标注建议

必须有明确的侧别、拇指方向和“掌侧/背侧”两个视图；左右镜像后仍要正确标注桡侧与尺侧。标题用“典型外周神经皮肤支配示意”，不要用“保证阻滞区”或“皮节”。绘制原创轮廓，不能临摹/搬运来源插图。

| 神经ID | 建议色区 | 必须保留的边界 |
| --- | --- | --- |
| `median` | 掌侧桡侧手掌与拇、示、中、环指桡侧半；背侧可另列示/中/环指桡侧半的远端及甲床小区。 | 不扩展成整片掌侧前臂；腕管远端病变的“鱼际皮肤保留”不能误套到腋部神经支配。拇指背面边界存在差异，首版可用标签而非整指硬涂。 |
| `ulnar` | 小指、环指尺侧半及邻近尺侧手掌/手背。 | 环指需纵向分桡/尺侧；不把整条前臂内侧染色。 |
| `radial` | 背侧桡侧手部与第一指蹼，延向桡侧手指近端背面。 | 排除示/中/环指桡侧远端甲床的正中小区；掌侧视图不能用桡神经铺满拇指掌面。后前臂若显示，应画成“该皮支系统，腋路覆盖依层面”虚线区，不能与远端手背同义。 |
| `musculocutaneous` | 前臂外侧，自肘外侧延向腕部，掌侧与背外侧均可画细长色区。 | 在腕附近收束，不跨入整片手掌或拇指；不覆盖肩部三角肌皮区。 |

重叠边界宜用浅色渐变或虚线，使用图例说明“典型分布；存在重叠与个体差异”。没有足够空间画指节时，宁可缩减为代表区与文字，也不要把整个手背涂成桡神经。感觉多边形用于教学标注，不是患者精确坐标数据。

上臂内侧、前臂内侧、肩外侧可以用中性灰/虚线分别标“肋间臂/上臂内侧皮支”“前臂内侧皮神经”“腋神经”；灰色表示本四神经图未自动覆盖，不表示该区域没有感觉神经。

## 模型与结构关系演示的必要核对

- 三条神经、动脉及静脉应分别建模；静脉不能因剖面或透明度设置而从教学关系中消失。腋动脉与其肱动脉延续保留来源身份，上臂参考切面不改标血管段名称。
- 肌皮神经应从血管周围区域分离并与喙肱肌、肱二头肌/肱肌关系一致。若模型资源只含近端短段，不应伪称已显示真实全程。
- 桡神经应向后方绕行，而非与正中、尺神经一直平行到手；神经远端曲线若为手工引导，需标为简化教学走行。
- 预设结构关系演示只强调源模型神经和血管等结构，不绘制可注射位置。肌皮神经可有肌内段与肌间段，应说明显示层面。筋膜鞘与可注药空间尚未重建或标定，结构高亮不表示安全进针、注药点或“注射成功”；不设置由距离直接决定的临床成功判定。
- 本版默认剖面标题使用“上臂参考横断面”，标明中立位图谱及肱动静脉。无合法真实超声病例来源时，不得用“真实超声”“超声已验证”等标签，也不将其称为临床腋路针尖定位图。

## 待临床审阅项与完成边界

当前完成的是可追溯内容初稿及六道理解题，不是临床验证。交由具区域麻醉经验的审阅者确认：四神经局部层面与方向；手掌/背侧指端边界；前臂外侧和内侧皮支；近端已分支的皮支与肌支；腋神经/肋间臂神经遗漏区；预设结构关系演示是否被误读为安全进针、注药位置或真实扩散。确认前保留`awaiting_clinician_review`。

特别需要二次原文核对的条目：NCBI仅检索摘录部分、模型对应的肌皮与桡神经分支层面。术语/事实校验和模型视觉校验应分别记录；本地JSON格式有效或页面可运行不代表临床内容已被审定。
