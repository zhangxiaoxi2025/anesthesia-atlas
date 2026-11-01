# 敬礼位来源核查与路线纠正（2026-10-23）

用户当前要求：不要自行把中立位模型变形为敬礼位；优先已有书籍、原始文章和有明确出处的三维资源。此要求优先于此前v0.2的工程实现。当前研究不修改App、不继续变形、不采购或联系第三方。

## 纠正既有判断

v0.2的自建姿态只通过工程几何检查，非ROI存在明显非生理形变。它不能作为准确操作体位图谱的依据。本轮不再推荐这条路线；下一次功能修改应移除其教学主图地位。原始中立位源几何可继续用于明确标注体位的走行参考。

来源筛选必须分别核：

1. 正式作者/机构/书籍或论文身份。
2. 体位是否在方法或原图中明确，区分完整敬礼位与只看见外展上臂的局部照片。
3. 内容到底是解剖图、真实超声、体积图、3D渲染视频，还是可旋转/可导出的模型。
4. 神经血管来自实际标本/影像还是绘制；未说明时不凭视觉猜测。
5. 能阅读不等于能复制到离线工具，个人订阅不等于模型再分发许可。

## 本轮根线程核验

### Hadzic教材

- 出版社：McGraw Hill，Hadzic's Textbook of Regional Anesthesia and Acute Pain Management, 2e，Chapter32E。
- 官方URL：https://accessanesthesiology.mhmedical.com/content.aspx?bookid=2070&sectionid=157602228
- 作者：Catherine Vandepitte、Ana M. Lopez、Hassanin Jalil。
- 已读官方公开正文/图注：Figure32E-2为腋部解剖横断面与超声对照；Figure32E-3为常见排列变异。上臂短轴、胸大肌止点远侧的文字依据明确。
- 页面公开正文随后截断，不能据此宣称看过所有后续原图。未发现开放复制许可；版权为McGraw Hill。
- NYSORA网页有对应内容，但不能把同作者体系的重复图当独立病例验证。

### Han等2014，Korean J Anesthesiol

- DOI10.4097/kjae.2014.67.5.310，PMID25473459。
- 题名：Topographic pattern of the brachial plexus at the axillary fossa through real-time ultrasonography in Koreans。
- 方法检索可读内容：131名入组患者，仰卧、肩外展90并外旋、肘屈90。支持对应体位采集的真实声像，而非假设变形。
- 公开索引版权声明为CC BY-NC3.0；应在实际嵌入前保留原文许可及第三方图注核查。
- 根线程访问PMC正文遇浏览器检查页，出版社PDF返回403；未解决验证页。子线程随后用正常Chrome成功访问期刊官方完整原页，实际核看许可和Figure4原图。Figure1是钟表方位示意，Figure4是A/B真实超声血管变异，不能误记为Figure1 A/B真实US。本文没有配套完整体位照片/标本切面，不能称三联图谱。
- 正常可访问原页：https://ekja.org/journal/view.php?doi=10.4097/kjae.2014.67.5.310 。Figure4原图：https://ekja.org/upload//thumbnails/kjae-67-310-g004.jpg 。
- 官方PDF：https://ekja.org/upload/pdf/kjae-67-310.pdf

### Ramanujam等2023，Anesthesiology and Pain Medicine

- DOI10.5812/aapm-134797，题名Three-Dimensional Imaging of Commonly Performed Peripheral Blocks: Using a Handheld Point-of-Care Ultrasound System。
- 官方PDF已读全文：https://brieflands.com/journals/aapm/articles/134797.pdf
- 全研究10例不同阻滞；其中Table1仅1例左腋路。Figure2B报告该例二维超声与药液分布的三维图。
- 重建对象主要是液体轮廓。它不是完整神经、动静脉、肌肉可分层mesh，也不是可下载的标准敬礼位图谱。方法未明确腋路肩/肘角度，不能补猜。
- PDF明确CC BY-NC4.0。适合解释已发表的实际三维药液成像研究，不能直接替换完整操作体位模型。
- 根线程已读PDF文字与图注；web PDF截图失败，不声称根线程完成图像视觉审计。

### 明确排除的假匹配

1. Kjelstrup等，The relationship of the musculocutaneous nerve to the brachial plexus evaluated by MRI，DOI10.1007/s10877-015-9807-3。原文索引限制段明确因闭合扫描器采用上臂内收，不能据此当敬礼位MRI。
2. O’Sullivan等2014，BMC Anesthesiology，DOI10.1186/1471-2253-14-110。官方全文已读：MRI只生成皮肤和骨，腋动脉与3神经为按典型位置人工加入；相关肌肉肌腱等欠缺，研究因原型保真度不足而停止。不能因‘有论文’就当作适合本工具的准确模型。
3. 商业模型市场的Human Axilla Anatomy卖家自行宣称标本扫描，不提供可核查机构/标本制备/验证来源；未列为可靠候选。
4. 其他部位的颈丛免费3D演示，不能证明腋路模型已验证可用。

## 检索方式与访问限制

- nature-academic-search技能，multi-source-search路线。
- 检索词围绕axillary brachial plexus + arm position / abducted / externally rotated / elbow flexed / 3D / MRI / cadaver，而非只搜中文‘敬礼位’。
- academic-search MCP的PubMed检索因PUBMED_EMAIL未配置失败，CrossRef返回候选后使用期刊/出版社/作者官网与PubMed网页核查；未把CrossRef宽泛总数当作本课题证据量。
- 未下载盗版书、解验证码、购买订阅、联系作者或复制受版权保护的教材图进入App。

## 当前结论

存在可明确引用的腋路体位/解剖横断面/真实超声资料，以及现成3D视频和商业交互课程。尚未确认满足‘原生敬礼位、完整四神经与周围血管肌肉、可追溯数据、可导出并获再使用许可’全部条件的开放三维模型。未找到不等于不存在。

下一版宜优先采用来源明确的原图及声像对照；3D操作位部分必须等待来源与授权同时核实。不得用新的自行变形或AI生成解剖来填补来源缺口。

## 子线程实际看图补核

NYSORA实际可访问文章URL：https://nysora.com/regional-anesthesia/techniques/upper-extremity/axillary/ultrasound-guided-axillary-brachial-plexus-block/ 。Figure1为作者提供的解剖横断面与US对照，Figure4为探头/外展上臂局部照片。未看到供体制备或同体位配准说明，不能称完整同一敬礼位标本；照片没有显示完整肘部角度。出版社Hadzic32E中对应图号为32E2，不能混用网页Figure1与书籍图号。
