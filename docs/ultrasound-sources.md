# v0.2 腋路真实超声与体位参考素材

获取及像素核对日期：2026-10-23。授权范围：当前本地学习/审阅原型，不含部署。此次仅取得用户明确指定论文的正文 Figure 1 与版权/图注元数据，没有请求或下载 Supporting Information。

## 交付与已完成检查

- 原图：`public/ultrasound/source/BMRI2016-7094121.001.jpg`，JPEG，662×663，109,596 bytes。
- 腋路体位/探头面板 e：`public/ultrasound/axillary-position-vazin2016.png`，289×225。
- 腋路超声面板 f：`public/ultrasound/axillary-ultrasound-vazin2016.png`，372×225。
- 交互数据：`src/data/ultrasound.json`；四个热点以原作者神经标注中心为依据，不是神经轮廓分割。
- 已用 `view_image` 实际查看整图及两个裁图。面板 a/b 是锁骨上、c/d 是锁骨下；交互裁图只取 e/f，不能混入其他层面。
- 裁切没有重采样、镜像、增强、重绘、抹除或额外像素注释。输出 PNG 是对源 JPEG 解码后选定矩形的无损保存；原作者箭头、字母、虚线、Cephalad/Caudad 以及 e/f 面板字样均保留。
- 原图 SHA-256：`8eb74da265eec44507f4e7971a1e2137f8717515dc1f656ef5175a0cace82afc`。MD5：`089f8415c2d4384586b8a4e6e9f4c344`，与 NCBI 官方 metadata 的图像对象校验值一致。

## 正式来源与许可证据

Vazin M, Jensen K, Kristensen DL, et al. *Low-Volume Brachial Plexus Block Providing Surgical Anesthesia for Distal Arm Surgery Comparing Supraclavicular, Infraclavicular, and Axillary Approach: A Randomized Observer Blind Trial.* BioMed Research International. 2016;2016:7094121. DOI：[10.1155/2016/7094121](https://doi.org/10.1155/2016/7094121)。[PMC 文章](https://pmc.ncbi.nlm.nih.gov/articles/PMC5136641/)。

实际使用 NCBI 官方 PMC Cloud Service，依照[官方访问说明](https://pmc.ncbi.nlm.nih.gov/tools/pmcaws/)，读取单篇文章版本 `PMC5136641.1` 的明确对象：

- [正式 metadata JSON](https://pmc-oa-opendata.s3.amazonaws.com/PMC5136641.1/PMC5136641.1.json)
- [正式 JATS XML，含版权、许可证 URL 及 Figure 1 图注](https://pmc-oa-opendata.s3.amazonaws.com/PMC5136641.1/PMC5136641.1.xml)
- [正式 Figure 1 JPEG](https://pmc-oa-opendata.s3.amazonaws.com/PMC5136641.1/BMRI2016-7094121.001.jpg)

metadata 明确：`is_pmc_openaccess=true`、`is_manuscript=false`、`is_retracted=false`、`license_code="CC BY"`。下载的 JATS XML 进一步明确 `permissions/license/@xlink:href` 为 **https://creativecommons.org/licenses/by/4.0/**，因而此次可精确记录 **CC BY 4.0**，不再沿用先前只读网页时“版本未确认”的状态。版权主体为 **© 2016 Mojgan Vazin et al.**，Figure 1 的图注/JATS 元素未标单独第三方来源或排除条款。

本轮先前尝试的旧 `oa.fcgi` 返回 404。查阅当前 NCBI 官方说明后确认：旧 Article Dataset 分发服务已于 2026-08 退役。随后使用其明确开放、无需登录的官方 S3 替代服务，没有操作或绕过 CAPTCHA、没有使用代理或机构凭据，也没有批量抓取整个库。

建议在界面和交付署名中使用：

> Vazin M et al. BioMed Res Int. 2016;2016:7094121. doi:10.1155/2016/7094121. Figure 1(e/f), CC BY 4.0. Source: NCBI PubMed Central Cloud Service. Cropped from the original figure; no other pixel changes.

应署名原作者与 NLM/PMC 资源来源；不使用 PMC 标志，也不暗示 NLM、作者或期刊为本工具背书。

## 裁切框与像素核对

所有框均相对于 662×663 原图，左上为原点，采用 Pillow 半开区间 `[left, top, right, bottom)`：

| 面板 | 裁切框 | 输出尺寸 | 输出 SHA-256 |
| --- | --- | --- | --- |
| Figure 1(e) position | `[0,425,289,650)` | 289×225 | `4c6ce08e0a0f2b7323b88cec636142de42033379a2fd8434fb7549195420bddb` |
| Figure 1(f) ultrasound | `[290,425,662,650)` | 372×225 | `cb36a22bd99f09ea6c4fa84e6f832ebb4a9c0e57f2473bbd675758dc53668d38` |

热点百分比的参照是整个 **372×225** 超声 PNG，包含白边和原始 `(f)` 面板字样，不能另以内部黑色有效声像框为坐标系统。界面 `<img>` 和覆盖层应使用同一实际比例，不能以 `object-fit: cover` 裁掉白边后仍直接套该坐标。

| 交互 ID | 原图标签 | 原图检查中心 `(x,y)` | 裁图百分比 `(xPct,yPct)` |
| --- | --- | --- | --- |
| musculocutaneous | Mc | (373,482) | (22.312,25.333) |
| median | Me | (439,468) | (40.054,19.111) |
| ulnar | Ul | (535,491) | (65.860,29.333) |
| radial | Ra | (523,514) | (62.634,39.556) |

这些点是原作者虚线标注的中心附近，不是超声中已分割神经的精确几何中心。热点只应选择/说明同名神经，不能用于给药靶点、神经内外判定或针尖导航。AA 原标注明确是腋动脉；根据本轮任务，未另加血管热点。

## 已确认与 pending 的方向信息

| 问题 | 当前状态 |
| --- | --- |
| 是否腋路臂丛而非颈部/其他入路 | 已由 Figure 1(e/f) 图注、正文方法与实际像素对应确认。 |
| 四目标神经原始标签 | Mc/Me/Ul/Ra 已逐个实际查看确认，与原图图注一致。 |
| 腋动脉 | f 中可见 AA 标签。 |
| 腋静脉位置 | **未确认**。f 未见可据以可靠标定的 AV 标签。原整图 d 中的 AV 属锁骨下图，不得拿来给 f 添加静脉热点。 |
| 屏幕左/右方向 | f 原文字明确左 `Cephalad`（头侧）、右 `Caudad`（尾侧）。不是固定左内/右外或足侧向头侧横断面。 |
| 患者左/右侧 | **pending**，e/f 没有明确 L/R 标记。本轮未从照片外观补猜侧别。 |
| 物理探头标记端 | **pending**，e 中未能确认其标记点与屏幕标识的对应。 |
| 近场/深场 | 按超声屏幕深度方向，上缘为浅层/探头侧、向下为深部；不能自动换算到当前三维的固定世界坐标轴。 |
| 与当前右侧三维的侧别/空间配准 | **未建立**。只能宣称神经名称和教学主题对应，不能宣称同一患者、同一侧别或已配准联动。 |

正文方法说明腋路患者仰卧、肩外展约 90°并屈肘暴露腋窝。e 为局部探头/操作照，并未完整展示所有关节角度，不凭照片测量或声称精确肘角。当前素材不含完整三维摆位数据。

原作者的针道箭头保留作为原图内容；本工具不据此给出患者特定针尖位置、进针深度或安全性判定。图中个体神经排列也不能成为通用钟点答案。

## 复现与验证

在源文件已经存在时运行。本机实际验证使用已有的 Anaconda Python（含 Pillow），不需要安装项目运行依赖：

```sh
/opt/anaconda3/bin/python3 scripts/ultrasound-prepare.py
/opt/anaconda3/bin/python3 scripts/ultrasound-verify.py
```

只有在明确需要重新取得这三个正式对象时才使用 `/opt/anaconda3/bin/python3 scripts/ultrasound-prepare.py --download`。脚本固定官方对象与原图/XML 校验值；来源内容改变时会停止，需重新核查后才能更新记录。

精确像素复现需使用相同的 JPEG 解码环境。另一个 Python/Pillow 版本或不同 libjpeg 构建可能对彩色 JPEG 的 RGB 舍入略有差异；这种情况下仍先比对原文件与交付 PNG 的 SHA，不能静默重生成并替换已冻结的裁切图或校验值。本次 Anaconda 环境的精确裁切验证通过；Codex bundled Python 的彩色 JPEG 解码存在小幅像素差异，不能把该环境的像素差异当作原图文件被修改的证据。

本轮实际执行验证结果：`PASS_LOCAL_ULTRASOUND_SOURCE_AND_CROP`。它覆盖来源文件、明确许可、原图精确裁切、输出散列与热点坐标换算；不证明患者侧别、物理探头标记、三维配准、针尖安全或临床教学最终审核已完成。

此次不再加入其他候选：已取得主要 CC BY 4.0 配对素材，避免额外引入 NC/SA 图片或来源和侧别不明的动态片段。没有动态扫查素材、压力信息或跟踪坐标，不将两张静态图包装成动态/同步采集数据。
