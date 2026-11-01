# v0.3 临床内容与图源边界

日期：2026-10-24（Asia/Shanghai）。状态：**本地教学审阅候选，待独立医学/界面规格审查及麻醉医生审阅**。本次只新增 `src/data/clinical-v3.json` 与本记录，不修改旧版 `clinical.json` 或 UI。

## 版本范围

v0.3 以现成局部体位照、真实超声和正规图谱外链为教学入口。停止自行将 Z-Anatomy 模型变成敬礼位，也不保留三维探头、短轴探头联动或由网格切面模拟真实扫描的含义。

三维保持来源中立位，用于同名结构选择和沿走行追踪；模型参考切面也保持中立位。当前参考层面按来源名称显示肱动脉、肱静脉，不能因为页面讨论腋路就改标腋血管。超声与模型来自不同数据、姿势不同；没有同病例几何、图像跟踪或探头坐标链，不能称空间配准或同步扫描。

四神经的走行、皮肤感觉、肌肉运动和功能边界继续沿用 `clinical.json` 与 `clinical-evidence.md`，本文件不扩展剂量、进针、注药定位、筋膜空间或药液扩散预测。

## 来源、实际查阅层次与使用范围

| 来源 ID | 正式来源与证据位置 | 本版采用与限制 |
| --- | --- | --- |
| `vazin-2016` | Vazin M, Jensen K, Kristensen DL, et al. BioMed Res Int. 2016;2016:7094121. [DOI 10.1155/2016/7094121](https://doi.org/10.1155/2016/7094121)；[PMC 原文](https://pmc.ncbi.nlm.nih.gov/articles/PMC5136641/)。已取得并查看官方 Figure 1 与 e/f 裁图，官方 JATS 明确 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。图像来源、散列、裁切框及原作者热点对应见 `docs/ultrasound-sources.md`。 | e 为腋路局部体位/探头照片，f 为四神经真实 US。只采用腋路 e/f，不混用锁骨上 a/b 或锁骨下 c/d。照片不完整呈现所有关节角度；没有证明 e/f 为同一受试者或同步采集，不能将论文中配对教学面板称同病例配准。 |
| `han-2014` | Han JH, Kim YJ, Kim JH, Kim DY, Lee GY, Kim CH. Korean J Anesthesiol. 2014;67(5):310–316. [DOI 10.4097/kjae.2014.67.5.310](https://doi.org/10.4097/kjae.2014.67.5.310)；[期刊完整原页](https://ekja.org/journal/view.php?doi=10.4097/kjae.2014.67.5.310)。2026-10-23 正常浏览器实际读取原页、方法和许可，并查看 Figure 1/4 图片，非仅检索摘要。 | 方法明确仰卧、肩外旋、肩外展 90°、肘屈 90°；肩外旋角度未规定为 90°。Figure 1 是方位钟表示意；Figure 4 才是 A/B 真实超声血管变异，分别为多条腋静脉与双腋动脉。原页 [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/)，使用应保留原作者、文章、图号、来源、许可和修改说明；不能把 NC 许可扩为商业再分发授权。 |
| `hadzic-axillary` | Vandepitte C, Lopez AM, Jalil H. Hadzic’s Textbook of Regional Anesthesia and Acute Pain Management, 2e. [Chapter 32E](https://accessanesthesiology.mhmedical.com/content.aspx?bookid=2070&sectionid=157602228)。出版社公开正文及 Figure 32E–2/3 图注已核查。 | 公开文字支持胸大肌止点远侧、相对上臂短轴取景与局部结构关系。32E–2 为横断面/US，32E–3 为排列变异。只提供外链，不复制受限图；未将出版图的可看或可下载入口当成应用再分发许可。 |
| `nysora-axillary` | [NYSORA 同题官方章节](https://nysora.com/regional-anesthesia/techniques/upper-extremity/axillary/ultrasound-guided-axillary-brachial-plexus-block/)。2026-10-23 正常 Chrome 实际查看 Figure 1 与 Figure 4；见 `docs/sourced-pose-atlas-books.md`。 | Figure 1 A 为作者提供的解剖横断面、B 为 US；Figure 4 为局部体位照片。A 未核实标本来源、切片姿态和与 B 同病例关系，不称“同一敬礼位标本”。与 Hadzic 属同图源家族，不计作独立数据集。只外链，不复制。 |
| `bowness-plan-a` | Bowness JS, Pawa A, Turbitt L, et al. Reg Anesth Pain Med. 2022;47:106–112. [DOI 10.1136/rapm-2021-103004](https://doi.org/10.1136/rapm-2021-103004)；[ESRA 正式 PDF](https://esraeurope.org/wp-content/uploads/2022/09/Bowness-anatomical-structures-PlanA.pdf)。此前已核 Table 1 和方向扫描/观察界面小节。 | 支持四神经、动静脉、联合腱及相关肌肉的识别框架。推荐识别结构不代表 Vazin f 已同时显示所有结构，也不证明本项目热点、配准、姿态形变或临床靶点有效。 |
| `z-anatomy-models` | [Z-Anatomy 原仓库](https://github.com/Z-Anatomy/Models-of-human-anatomy)；本项目的来源文件记录 `public/models/source/z-source-files.json` 与 `docs/model-audit.md`。 | 工程来源与本版能力声明：保留来源中立位，不作敬礼位姿态变换。此来源不为真实 US 的患者侧别、姿态、扫描层面或临床操作位置提供证据；模型自身的许可与衍生署名继续按既有来源记录保留。 |

本轮以已实际核查的原页、图像与本地来源审计转为简洁文案，未扩大文献检索。原图关系、方法采用的体位、临床成功和模型工程能力是不同类型的结论，互不替代。

## 主张到字段的映射

| 主张 | 字段 | 依据与边界 |
| --- | --- | --- |
| 仰卧、肩外展约 90°并外旋、肘屈约 90°为文献参考姿势。 | `pose`、步骤 01 | `han-2014` 原始 Methods 直接支持。Vazin e 是局部照片，不能凭照片量出完整角度；这些方法不能证明唯一最佳体位。 |
| 胸大肌止点远侧、相对上臂长轴短轴是来源图谱的取景概念。 | `probe.description` | `hadzic-axillary`。该解释不为中立位模型生成真实探头或扫描面。 |
| Vazin f 屏幕左标头侧、右标尾侧。 | `probe.points`、步骤 02 | 原图文字 Cephalad/Caudad。患者侧别、物理探头标记端未核实；不能改为固定内外侧或推导与模型的空间关系。 |
| 四神经选择只依据已核原作者标签。 | 步骤 03–07 | Vazin f：Me/Ul/Ra/Mc；选择点是标签中心附近，不是分割轮廓、神经内外界面或注药位置。f 没有已核实 AV 标签，不添加 AV 热点。 |
| 不同人血管/神经关系有变异。 | 步骤 08 | Han 2014 方法和 Figure 4 的多静脉/双动脉实例。该图不提供四神经完整标注，不用两例推断总体发生率。 |
| 三维只作中立位走行追踪，模型切面不是 US 或腋路操作面。 | 步骤 09、`notes` | 本版工程范围与已有模型来源审计，不伪装成文献验证结果。来源层面肱动/静脉名称保持一致。 |
| 功能卡不由超声热点或模型切面自动计算。 | 步骤 10、`notes` | 原版 `clinical.json` / `clinical-evidence.md`。保留肌皮—前臂外侧皮神经、内侧皮支、指端、腋神经/肋间臂神经和近端分支边界。 |

## 十步教学内容

01 体位来源 → 02 原图方向 → 03 原图标志 → 04 正中神经 → 05 尺神经 → 06 桡神经 → 07 肌皮神经 → 08 真实血管变异 → 09 中立位走行 → 10 感觉与运动。

四神经步骤可以同步选择原图热点、三维同名结构和原功能卡，但“同步选择”只表示同一个解剖名称，不代表空间重合或采集同步。

## 冻结后医学/界面规格审查红线

1. 主入口使用现成体位和真实超声；清除自行重建的敬礼位、三维探头和探头短轴联动，不能只改文字而继续显示有相同含义的几何。
2. Vazin 原裁图保持原始方向、字母、作者箭头与方向标记，不静默镜像；AA、Me、Ul、Ra、Mc 依据原图。未核实 AV、患者侧别和物理探头标记端明确保留未知。
3. Han Figure 1 明确为示意，Figure 4 明确为真实 US 血管变异；不能把 Figure 1 称为真实超声、标本截面或敬礼位照片。图 4 不应擅自增添四神经识别热点。
4. Vazin 图像应显示 CC BY 4.0 署名和裁切说明；Han 图像应显示 CC BY-NC 3.0 署名和修改说明。NYSORA/Hadzic 仅外链，不将其受限图片打入离线包。
5. 三维和模型参考切面明确保持中立位，来源血管名不为适配教学主题而改写；没有探头坐标链、病例配准、操作面、针尖/注药位置或精度承诺。
6. 进入功能页后仍区分皮肤感觉、肌肉运动、皮节和深部关节感觉；保留近端已分支及额外皮支边界。高亮四神经不能变成整条上肢确定麻醉范围。
7. 首次来源/能力说明应能在界面找到；不得只在证据文件里承认限制、在主界面继续称“配准”“同一姿态”“安全靶区”或“临床验证”。

此记录是内容和实现规格依据。JSON 格式校验、测试通过、图像散列一致与界面可运行均不能转成医学专家认证或临床验证结论；冻结候选后再对实际界面独立审查。
