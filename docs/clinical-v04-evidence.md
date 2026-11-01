# v0.4 上肢支配补全、肌间沟与切面动画的医学依据

日期：2026-10-24（Asia/Shanghai）。内容状态：**待临床审阅**。本轮新增 `src/data/innervation-v4.json`、`src/data/interscalene.json` 和本文件；未修改 App、CSS、组件或模型。这里是内容核查与实现规格，不是对尚未冻结的界面或临床效果的通过认证。

## 结论与范围

四终末神经的旧概念图确需补足桡神经上/前臂皮支和肌皮神经的外侧前臂，并将逐肌肉文字清单作为运动信息主体。正中、尺神经没有主要上臂/前臂皮肤分布，不应为了填满示意图补色。肩顶、近端外侧上臂与内侧上/前臂另有皮支，不能全部归入四终末神经。

`innervation-v4.json` 包含 4 条终末神经、8 个典型皮区、46 条肌肉/头/功能分部记录、5 组其他皮支，以及 8 组其他运动神经下的 14 条肩带肌肉。46 条中肱肌在肌皮与桡神经下分别记录两种贡献，不是两块独立肌肉；指深屈肌按桡/尺部、拇短屈肌按浅/深头记录。骨间肌和蚓状肌逐项列出。此清单是常规解剖框架与重要变异提示，不能声称涵盖每个人的全部交通支、罕见额外头或全部颈部肌肉。

`interscalene.json` 提供肌间沟根/干、肌肉、血管和边界的文字内容，以及“定位切面→提取截线→整体转向二维→并排参照真实US”的动画规格。它不证明所需网格或合法US已经全部取得，也不提供剂量、针道、针尖或注药点。

## 检索与实际核查层次

采用 `nature-academic-search` 的 multi-source-search 路径，读其 manifest、core 与 wf1；既有 PubMed MCP 已知因邮箱未配置失败，不改配置、不重复该失败。直接使用官方 PubMed、出版社正文、大学医学院/放射科与学会网页。未使用二手百科或非授权书站作为依据。

已读取下列官方公开全文/教学表或原始摘要。PMC 的拇短屈肌页面遇验证页，未绕过；改读同文的正式出版社 PDF。USRA 页面连续超时，未将搜索摘要当全文，最终不纳入数据来源。McGraw 肌间沟章节本次遇验证页，也不把它列为全文核查依据。既有 Hadzic 腋路章节仅沿用先前公开内容记录。

## 来源与主张映射

| 来源 | 实际采用位置 | 对应内容及限度 |
| --- | --- | --- |
| [UAMS Nerves of the Upper Limb](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/nerve-tables/nerves-of-the-upper-limb/) | 官方完整神经表 | 四神经皮支、额外皮支、脊神经前支—上/中/下干及肩带神经来源。根来源、皮节和外周皮区不同；不照搬该表的过度概括。 |
| [UAMS Muscles of the Upper Limb](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/) | 官方逐肌肉表 | 动作及主要神经清单；手内肌、FDP分部、肩带肌背景。肱肌双源、FPB分头及ECRL分支另核，不把全表视为无误标准。 |
| [University of Utah, Foreman, Upper limb nerves](https://anatomy.med.utah.edu/diganat/SOM/unit_4/lec/Dry_Lab_UE_08_F.pdf) | PDF第19–20页（零基页18–19）文字清单 | 四终末神经的分支级核对：AIN、返支、指神经、尺浅/深支及桡系分支。PDF含受限Netter图，未复制其图。 |
| [WVU Median Nerve](https://anatomyresources.hsc.wvu.edu/nm_deficits/Median_Nerve.html)、[Ulnar Nerve](https://anatomyresources.hsc.wvu.edu/nm_deficits/Ulnar_Nerve.html)、[Radial Nerve](https://anatomyresources.hsc.wvu.edu/nm_deficits/Radial_Nerve.html)、[Elbow Flexion](https://anatomyresources.hsc.wvu.edu/nm_deficits/Elbow_Flexion.html) | 各官方教学页的分布/动作条目 | 正中、尺的手部与指端；桡后臂/后前臂/手背；肌皮外侧前臂及屈肘。WVU桡神经页“所有肘下损伤无皮肤损害”的概括未采用；也不把神经损伤表型等同局麻阻滞效果。 |
| [UW ECRL](https://rad.uw.edu/muscle-atlas/extensor-carpi-radialis-longus)、[ECRB](https://rad.uw.edu/muscle-atlas/extensor-carpi-radialis-brevis)、[Supinator](https://rad.uw.edu/muscle-atlas/supinator) | 官方动作/支配文字 | 桡侧腕长伸肌为桡神经，短伸肌典型深支，旋后肌深支。UW图片明确需书面许可，本轮没有复制。 |
| Mahakkanukrauh P, Somsarp V. *Dual innervation of the brachialis muscle*. Clin Anat. 2002;15:206–209. [PMID11948956](https://pubmed.ncbi.nlm.nih.gov/11948956/), DOI [10.1002/ca.10014](https://doi.org/10.1002/ca.10014) | 原始研究PubMed摘要 | 肱肌肌皮主支配与常见桡神经贡献。该研究的样本比例不转换为个体概率，也不直接推断腋路阻滞效果。 |
| Caetano EB et al. *Flexor Pollicis Brevis Muscle. Anatomical Study and Clinical Implications*. Open Orthop J. 2017;11:1321–1329. [出版社全文PDF](https://openorthopaedicsjournal.com/VOLUME/11/PAGE/1321/PDF/), [PMID29290870](https://pubmed.ncbi.nlm.nih.gov/29290870/), DOI [10.2174/1874325001711011321](https://doi.org/10.2174/1874325001711011321) | 60手原始解剖研究，Table1及Discussion | 拇短屈肌经典浅/深头分工之外可有双支配和深头缺如。不写总体发生率：原文摘要/正文比例、分母和缺如表述存在不一致，不能将其混合成单一数值。 |
| Sawyer FK, Stefanik JJ, Lufler RS. *The Branching and Innervation Pattern of the Radial Nerve in the Forearm*. Diagnostics. 2020;10:366. [PMID32498404](https://pubmed.ncbi.nlm.nih.gov/32498404/), [PMC全文](https://pmc.ncbi.nlm.nih.gov/articles/PMC7345276/), DOI [10.3390/diagnostics10060366](https://doi.org/10.3390/diagnostics10060366) | 原始35标本研究，Methods定义及Results3.3 | ECRB肌支来源可来自本干、深支或浅支；本表以常规深支为教学入口并保留变异。深支穿出旋后肌后称PIN，不能把不同教材命名差当不同神经。摘要/全文本身有小比例差异，未引用比例。 |
| [PMID38441620](https://pubmed.ncbi.nlm.nih.gov/38441620/)：2024年双侧四头肱肌异常支配报告 | 原始单标本摘要 | 只说明肌皮—正中交通、肌皮缺如及异常肌肉支配确有报告，不用于“常见”频率判断。 |
| [NYSORA肌间沟官方章节](https://nysora.com/regional-anesthesia/techniques/ultrasound-guided-interscalene-brachial-plexus-block/) | 正文、Figure2/9/10/11图注 | 前/中斜角肌、SCM、颈血管；C6/C7分束、C5肌内变异、肩胛背/胸长神经与膈神经。只用事实归纳/外链，不复制受限图；不采用操作及药量段落。 |
| [ACEP Sonoguide Interscalene Nerve Block](https://www.acep.org/sonoguide/nerve-blocks/interscalene-nerve-block)（2025-01-20） | Pre-scan/Sonographic Anatomy与Pearls/Pitfalls | 根/干的层面、下干不全、膈神经、喉返/交感及椎间孔/椎管边界。不带入剂量、路径、固定角度或深度。 |

每条皮区、每条肌肉和每个其他皮支都有 `sourceIds`；主要跨项结论另列于 `claims`。肌间沟各解剖项/边界也有来源列表。动画的几何与能力限制是工程规格，不伪装成论文已验证的动画或配准技术。

## 感觉图应如何补全

| 神经 | 应呈现的典型皮区 | 不应补入/应保留的边界 |
| --- | --- | --- |
| 正中 | 桡侧手掌、桡侧3.5指掌侧，相应远端背面/甲床。 | 不补主要上臂/前臂皮区；不等于整片手背，指背边界有重叠。 |
| 尺 | 尺侧手掌/手背、小指与环指尺侧半，包括相应指端。 | 前臂内侧皮肤是独立的前臂内侧皮神经，不能随尺神经着色。 |
| 桡 | 后上臂、上臂下外侧、后前臂、桡侧手背与近端指背。 | 不涂整个前臂前面或所有指端；后臂等近端皮支不保证在某个腋路层面都受阻。 |
| 肌皮 | 经前臂外侧皮神经前/后支联系前外侧和后外侧前臂。 | 不是上臂外侧、拇指或手掌；图中只着色手腕/手掌属于遗漏或错位。 |

另外必须能辨认：腋神经的上臂近端外侧皮区、上臂内侧皮神经、前臂内侧皮神经、主要T2肋间臂神经及C3–C4锁骨上神经。概念图可以用旁边独立图例说明这些区域，不必为了显示全部皮支而伪造个体边界。肩顶和上臂的前后表面不是由一条终末神经完整占满。

## 运动清单的关键校正

- 肌皮：喙肱肌、肱二头肌、肱肌主体；桡神经可同时支配肱肌较小外侧部分。屈肘不是肌皮神经专属，肱桡肌经桡神经参与。
- 正中：前臂主要屈肌/旋前肌；AIN支配FPL、PQ和FDP桡侧部；鱼际主要肌及第1、2蚓状肌。蚓状肌不是返支肌群。
- 尺：FCU、FDP尺侧部，多数手内肌；掌短肌为浅支，其他列出的手内肌主要深支。骨间掌侧肌3块、背侧肌4块及第3、4蚓状肌逐项列出。
- 桡：肱三头、肘肌、肱桡、ECRL，典型深支ECRB/旋后肌，PIN系伸肌。动作包括屈肘、旋后和伸腕/指，不是“桡神经只伸展”。
- 拇短屈肌按头呈现经典分工并注明双源，不能把整个肌肉永远染成正中或尺神经颜色。指深屈肌也按桡、尺部分开。
- 肩带清单单列腋、肩胛上、肩胛下、胸背、胸内/外侧、胸长、肩胛背及锁骨下肌神经；不把三角肌/冈上肌等塞进四终末神经。该清单仍不等于肌间沟的确定覆盖图。

近端皮支/肌支与作用层面的关系必须继续显示，尤其桡神经近端皮支与肱三头肌支、肌皮神经较近端的喙肱肌支。神经的完整支配知识不能被直接呈现为某一次腋路或肌间沟阻滞的实测效果。

## 发现的来源差异及处理

UAMS肌肉表把ECRL列为deep radial，和Utah/UW及原始桡神经研究不一致；数据采用后者的桡神经本干。UAMS/部分UW把FPB笼统列为正中，未细分双支配；数据用原始FPB研究补正。Utah把旋后肌放在PIN系清单下，其他教材把深支穿出旋后肌后才称PIN；数据明确采用后一命名，并保留差异说明。没有因为来源是大学网站就忽略这些差异。

## 肌间沟与动画的验收要求

1. **入路身份正确。** Vazin2016 Figure1(b)是锁骨上，不可标为肌间沟。合法且正确入路的US未取得时，只能外链或留未载入状态，不能用AI重绘或别的入路冒充真实US。
2. **根/干不能靠圆数命名。** 臂丛根指脊神经前支；C5+C6构成上干，C7续中干，C8+T1构下干，纵向合并关系要清楚。低回声结节可为分束。源资产若只有合并根网格，应按其真实身份显示，不人为命名独立C5/C6/C7。
3. **肌肉/血管和缺失项如实呈现。** 前/中斜角肌、SCM、颈动脉/IJV是核心关系。膈神经、椎动脉或其他近邻未有源网格时，用文字边界，不补造确定曲线。单帧缺失结构不能解释为空白安全区。
4. **同一切面展开。** 动画中的3D求交线、脱离模型的截线和最终二维图必须来自同一网格、同一平面与同一标识；只能整体移动/旋转，不为贴近US逐结构变形。方向标志随平面同步变化，不能从原点忘记带过去。
5. **网格图与US保持两种身份。** 二维网格图保留“模型截线”，真实US保留原图方向、病例及来源；未配准的并排参照不得做渐变重合、像素定位或精度宣称。模型平面不是回声、压力或各向异性的模拟。
6. **覆盖边界可见。** C8–T1不全、膈神经/呼吸、颈丛锁骨上皮区与其他邻近神经须能查到。不提供药量/进针，也不由模型或颜色决定手术麻醉范围。
7. **功能图诚实标示。** 典型皮区与动作清单不是个体测量；动作由多肌多神经共同完成。若轮廓只是前臂大色块，应标为概念区，逐肌肉列表为主体，不称逐肌分割图。

## 资料可信度与图像权利分别记录

本轮使用大学/学会/原始研究核对文字事实，未下载或复制它们的版权图像、Netter表图、UW插图或NYSORA图。阅读正文能支持某一解剖主张，不等于该图允许嵌入软件。图像来源、图号、入路、原始标记、许可和第三方排除条款必须由素材审计另核。

已有Vazin腋路e/f与Han图1/4的许可继续各自适用，但不能拿来为新增肌间沟素材授权。新模块的合法素材、实际显示、求交平面和动画同一性仍需在实现冻结后单独审查。本轮内容文件通过格式/来源引用校验也不等于临床审定。
