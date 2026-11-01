# v0.2 腋路教学入口：体位、真实超声与三维对应

日期：2026-10-23（Asia/Shanghai）。状态：内容初稿，待独立医学/界面规格审查及麻醉医生审阅。范围为`src/data/clinical-v2.json`；不修改原版`clinical.json`，不增加剂量、进针方法、阻滞范围或临床效果承诺。

本版拟以常用敬礼位参考与真实超声作为学习入口，再用通用三维解释结构。这里的“对应”是结构名称与局部关系的教学对应，不能称为同一病例配准。参考姿势也不等于内部软组织形态、注药空间或临床靶点已被验证。

## 四项主要依据与实际查阅范围

| JSON来源ID | 正式出处与链接 | 核对位置、采用内容与限制 |
| --- | --- | --- |
| `hadzic-axillary` | Vandepitte C, Lopez AM, Jalil H. Hadzic’s Textbook of Regional Anesthesia and Acute Pain Management, 2e. [Chapter 32E: Ultrasound-Guided Axillary Brachial Plexus Block](https://accessanesthesiology.mhmedical.com/content.aspx?bookid=2070&sectionid=157602228)。作者团队的[同题公开教学版本](https://nysora.com/regional-anesthesia/techniques/upper-extremity/axillary/ultrasound-guided-axillary-brachial-plexus-block/)。 | 出版社公开At a Glance及Ultrasound Anatomy核对相对上臂短轴、胸大肌止点远侧和典型局部关系；后续章节截断，不称全文审阅。公开教学版本的Ultrasound Anatomy、Landmarks and Patient Positioning、声像说明核对肱二头肌、喙肱肌、背阔肌/大圆肌联合腱、神经变异及动脉后方声学增强可能误认。未复制其图像。 |
| `ambi-2015` | Ambi U, Bhanupriya PVV, Hulkund SY, Prakashappa DS. [Comparison between perivascular and perineural ultrasound-guided axillary brachial plexus block using levobupivacaine: A prospective, randomised clinical study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4645355/). Indian J Anaesth. 2015;59:658–663. DOI [10.4103/0019-5049.167476](https://doi.org/10.4103/0019-5049.167476)，[PMID26644614](https://pubmed.ncbi.nlm.nih.gov/26644614/)。 | 原始试验Methods的官方全文检索内容可见仰卧、肩外展90°并外旋、肘屈90°，以及腋部短轴取景。直接PMC打开遇验证页，未声称本次下载全文。只将其作为该常用体位的直接原始记录；不是比较此体位优越性的研究。不带入药量、针具或注射技术。 |
| `frkovic-2015` | Frkovic V, Ward C, Preckel B, et al. [Influence of arm position on ultrasound visibility of the axillary brachial plexus](https://pubmed.ncbi.nlm.nih.gov/26090566/). Eur J Anaesthesiol. 2015;32(11):771–780. DOI [10.1097/EJA.0000000000000293](https://doi.org/10.1097/EJA.0000000000000293)；[作者单位出版记录](https://pure.amsterdamumc.nl/en/publications/influence-of-arm-position-on-ultrasound-visibility-of-the-axillar/)。 | 已核实正式原始文献身份和PubMed摘要：20名志愿者双侧，四种肩/肘体位与两个扫描层面。桡神经可见性未因体位显著改善；某姿势总体可见性较有利不能直接转成临床成功率或唯一最佳体位。与作者团队2013学位论文中较早章节区别记录，不把论文前身当2015最终全文。 |
| `bowness-plan-a` | Bowness JS, Pawa A, Turbitt L, et al. [International consensus on anatomical structures to identify on ultrasound for the performance of basic blocks in ultrasound-guided regional anesthesia](https://esraeurope.org/wp-content/uploads/2022/09/Bowness-anatomical-structures-PlanA.pdf). Reg Anesth Pain Med. 2022;47:106–112. DOI [10.1136/rapm-2021-103004](https://doi.org/10.1136/rapm-2021-103004)，2021-09-22线上发表。 | 正式全文Table1及Orientation scanning and block view小节。腋路核心结构包括四神经、动静脉、背阔肌/大圆肌联合腱；肱二头肌短头、喙肱肌等有相应推荐等级。该共识支持识别框架，不验证任何模型变形、US—3D配准或临床靶点。 |

本轮按已核查来源转为界面文案，未扩大检索。原始研究中的可见性、方法采用的体位和临床阻滞成功是不同层面的结论，不能互相替代。

## 主张到界面字段的映射

| 主张 | 字段 | 证据与边界 |
| --- | --- | --- |
| 采用仰卧、肩外展约90°并外旋、屈肘约90°的参考姿势。 | `pose`、步骤01 | `ambi-2015`直接方法记录，`hadzic-axillary`支持外展取景背景。肩外旋没有被规定成90°；不能把参考姿势称为适用于所有人的唯一最佳。 |
| 取景相对上臂短轴，参考在胸大肌止点远侧。 | `probe`、步骤02 | `hadzic-axillary`。这是局部轴概念，不是固定世界坐标水平面。模型中立位已有切面不能直接充当敬礼位扫描。 |
| 先用血管、肌肉/肌腱定位，再核对四神经。 | 步骤03–07 | `bowness-plan-a`与`hadzic-axillary`。静止帧未显示的结构应标未显示，不按模板补出“已识别”结论。 |
| 不固定屏幕钟点位置，不根据神经点位反推图像左右。 | `probe.points`、步骤04/05 | 典型位置存在变异，见`hadzic-axillary`、`frkovic-2015`。本轮主要来源没有统一指定所有腋路图像的标记端方向；采用原图探头标记与屏幕标记的实际对应是本工具的规格要求。 |
| US与通用三维只作结构对应。 | 步骤08、`notes` | 产品能力边界：通用图谱不是该超声病例的三维数据。未建立同病例几何或探头坐标链，就不能宣称逐像素/逐点配准。 |
| 感觉/运动沿用原版，不由US色标计算效果。 | 步骤09、`notes` | 原四神经功能卡和`clinical-evidence.md`继续有效；本文件不扩大解剖支配、手术麻醉或注药内容。 |

## 超声联动的验收红线

1. **入口必须区分真实超声与模型画面。** 真正的病例超声应有来源与可用权依据；合成灰度截面、图谱剖面或渲染截图不能标为真实超声。图片原始标记、比例/深度信息与遮挡情况应保留。
2. **方向须可核查。** 原图侧别、姿势、探头标记端和屏幕标记侧能核对时再标注；缺少信息写明未核实。屏幕左右不能由模型方便摆放或期望神经位置决定。若有明确方向变换，应标记变换并同步全部图层，不能静默镜像原图。
3. **只联动经核对的结构。** 每个US标注区都需有真实可见依据，且与源结构ID一致。原图未显示某神经、静脉或肌腱时，可转三维解释它，但不能在US上补一个确定热点充作识别结果。
4. **结构对应不能冒充病例配准。** 通用模型与真实US可同步选中同名神经、显示标签和走行，必须保留“参考对应，非同一病例配准”。不画一个无证据的精确投影点，不显示毫米误差、像素级重合或定位精度等未经验证的量。
5. **体位形变必须另验。** 不得仅旋转骨头或将整条上肢刚性转动后，宣称神经、血管和肌肉已正确变为敬礼位。应核对关节、肌腱附着、肌肉形态、跨肩神经血管连续性及穿插；未验证时仅称姿态示意，保留来源图谱对照。
6. **不新增注药或安全定位含义。** 高亮源结构可以帮助认识神经血管关系，但不能恢复实体靶区环、针道、药液填充或自动安全位置。筋膜、神经周围层和可注药空间未标定前，不提供注药定位和扩散预测。
7. **功能边界不能随体位或热点放大。** 四神经的感觉/运动内容沿用原版，保留肌皮—前臂外侧皮神经、前臂内侧皮支、指端和肋间臂/腋神经边界；US上选中结构不等于证明实际阻滞成功。

## 敬礼位三维的最低解释要求

以下是基于体位研究和模型连续性的工程推论，不是上述论文已验证过本项目形变算法的结果：肩外展/外旋与肘屈曲会改变局部肌肉、神经、血管关系；上肢短轴应跟随局部肱骨方向，而非保持世界Y切面。骨骼、肌腱、肌肉与跨关节神经血管需要有一致约束。纯体表姿态插画可用于解释摆位；内部结构未经逐项审阅时，不能以摆位外观代替解剖形变验证。

数据与UI完成后，应冻结两个界面状态供独立检查：常用参考体位＋真实US入口，以及原始图谱参考视图。审查者分别核对医学事实、图像方向/来源、热点身份与能力声明；格式校验和页面可运行都不代表已完成临床审定。
