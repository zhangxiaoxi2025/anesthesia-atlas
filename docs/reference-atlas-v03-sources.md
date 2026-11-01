# v0.3 来源图谱素材记录

取得及目视核查日期：2026-10-24。范围仅为已批准的本地非商业学习/教学：下载 Han 2014 的原刊 Figure 1、Figure 4 及原页许可证据；NYSORA 和 Hadzic 教材只保留官方外链。未修改 App/CSS/打包脚本，没有购买、联系出版社或下载受限图片。

## 正式来源与取得方式

Han JH, Kim YJ, Kim JH, Kim DY, Lee GY, Kim CH. **Topographic pattern of the brachial plexus at the axillary fossa through real-time ultrasonography in Koreans.** *Korean Journal of Anesthesiology*. 2014;67(5):310–316. DOI [10.4097/kjae.2014.67.5.310](https://doi.org/10.4097/kjae.2014.67.5.310)，PMCID PMC4252342。

直接从 [KJA 期刊正式原页](https://ekja.org/journal/view.php?doi=10.4097/kjae.2014.67.5.310)取得 HTML，以及原页实际列出的两个 JPEG。HTTP 请求成功，未绕过 CAPTCHA、付费墙或登录限制。PMC 的通用网页访问遇浏览器检查，未继续该通道；没有将此失败写成 PMC 已下载。

| 文件 | 期刊实际原文件 | 尺寸/大小 | SHA-256 |
|---|---|---|---|
| `public/reference-atlas/han2014/han2014-figure1-original.jpg` | [Figure 1](https://ekja.org/upload//thumbnails/kjae-67-310-g001.jpg) | 647×461；51,227 B | `43ff11bd7e776f642c0b82867de6c7c73a47d24a9c3c17f109ebb6d4185ead55` |
| `public/reference-atlas/han2014/han2014-figure4-original.jpg` | [Figure 4](https://ekja.org/upload//thumbnails/kjae-67-310-g004.jpg) | 683×458；84,179 B | `c8bb24732f83cecfb6cc38819abff6da5af8b225694ed047a3820908d420445f` |
| `public/reference-atlas/han2014/source-article.html` | 完整期刊原页、原图图注和许可记录 | 111,660 B | `8d2f7c71a651f285745ab11f6a392648610ac103b32b841df98a337695cffbbe` |
| `public/reference-atlas/han2014/license-evidence.json` | 本地许可解释、原页 URL/hash/定位与逐图检查记录 | JSON | 由来源图谱验证脚本核对 |

这些图虽然位于期刊的 `thumbnails` 路径，却是本轮原页所列并成功取得的完整图文件。本记录不将其宣称为更高分辨率母版、原始超声 DICOM 或体数据。两 JPEG **按原始字节保留**，没有裁切、重采样、镜像、去标注、加标注、增强或 AI 编辑。

原页 HTML 是取证快照，不应作为 iframe 执行或当成本工具页面直接注入；界面中的许可说明使用 JSON 字段/转义文本，避免载入原站脚本、广告和追踪资源。

## 实际图像复核

对下载到本机的两张文件分别调用 `view_image` 查看实际像素，结果与原刊图注一致：

- **Figure 1**：中心红色 AA，外圈十二等分钟表。上方标 Anterior，下方 Posterior，左 Lateral，右 Medial；上方还有 Skin。它是用于记录位置的**示意图**，没有显示四神经本身，不是体位照片、真实超声或尸体横断面。
- **Figure 4**：上排 A 为多条腋静脉，下排 B 为双腋动脉。每排左侧原始声像，右侧原作者 AA/AV 标注，中央箭头连接。原来的圈、标签、面板字母和屏幕标记均保留。它适合讲血管个体变异，没有完整四神经标注，因此不为其添加神经、针尖或注药热点。

研究方法明确记载仰卧、肩外展 90°并外旋、肘屈 90°；这来自原文方法，不从照片猜角度，原文方法没有将肩外旋角度定义为 90°。Figure 1 的前后/内外方向属于该研究的图像记录约定，不可直接套到 Vazin 2016 原图头侧/尾侧或通用三维坐标。图 4 的具体患者左右侧、物理探头标记端没有在图注得到核实，保留 pending。

本次只说明图形内容，未把原文变异百分比引入界面，避免将有限人群研究、不同分母或特定采集压力条件误写成普遍发生率。

## 许可及署名

原页 HTML 第 749–751 行保留文章版权与明确许可，`license-evidence.json`记录原始定位。文章采用 [**CC BY-NC 3.0**](https://creativecommons.org/licenses/by-nc/3.0/)，版权为 Korean Society of Anesthesiologists 2014。Figure 1 和 Figure 4 对应图注/元素中未见单独第三方署名或排除条款。

当前批准的本地非商业学习、教学按此许可复用，须保留作者、题名/DOI、原图号、期刊来源、版权及许可链接。商业使用不由该 NC 许可授予；不能把这些素材标成 CC BY 4.0 或 CC BY-SA 4.0。工具内其他模型和 Vazin 图像仍分别适用各自许可。

界面可读署名已放在各 item 的 `license.attribution`。原图未修改；新增的中文说明位于图外。保留署名不能理解为作者或学会对本工具的推荐/背书。

## 接入元数据 contract

`src/data/reference-atlas.json`：

```text
{
  schemaVersion: 1,
  status, reviewStatus,
  items: [{
    id, title, type, path, width, height, figure, description,
    source: {authors, title, year, journal, doi, url, imageUrl,
             htmlPath, htmlSha256, retrievedDate, ...},
    license: {id, url, attribution, evidencePath, evidenceHtmlPath,
              copyright, verified, useScope},
    orientationNote, limitations: [], sha256, bytes, mimeType,
    changes, visualReview
  }],
  externalReferences: [{id, title, type, url, images?: [{figure,title,url}], ...}],
  notes: []
}
```

固定 item ID 为 `han2014-orientation`、`han2014-vascular-variants`；图类型分别为 `orientation-schematic`、`ultrasound-vascular-variation`。`path`为本地原 JPEG，mime 为 `image/jpeg`。完整原图应按各自长宽比显示，不用 `object-fit:cover` 裁掉方向和作者标注。不要让一个图的方位控件自动镜像或重排另一个图。

`externalReferences`中的 NYSORA/Hadzic **只能用于显式可点击外链**；不要把其 `images[].url` 放进 `<img>`、远程 iframe、图片代理或离线下载器。两项来源也不能当作独立病例数据集重复计数。

## 只保留外链的受限图源

- [NYSORA 腋路正式文章](https://nysora.com/regional-anesthesia/techniques/upper-extremity/axillary/ultrasound-guided-axillary-brachial-plexus-block/)，Figure 1 的 [横断面/超声原站图](https://www.nysora.com/wp-content/uploads/2018/09/regional-anesthesia-cross-sectional-anatomy-of-the-axillary-fossa-and-ultrasound-image-of-the-terminal-nerves-of-brachial-plexus-1030x333-2.jpg) 与 Figure 4 的 [体位/探头局部原站图](https://www.nysora.com/wp-content/uploads/2018/09/regional-anesthesia-patient-position-and-needle-insertion-for-ultrasound-guided-axillary-brachial-plexus-block-1030x561-1.jpg)。路径来自此前正常 Chrome 的原页 DOM，本轮没有下载或复制。没有将“网页可看”推定为获得应用再分发许可。
- [Hadzic 教材第二版 Chapter 32E](https://accessanesthesiology.mhmedical.com/content.aspx?bookid=2070&sectionid=157602228)，作者 Catherine Vandepitte、Ana M. Lopez、Hassanin Jalil。Figure 32E–2/32E–3 为正式图号参考；未下载/嵌入 McGraw Hill 图片。

## 验证与边界

运行 `node scripts/reference-atlas-verify.mjs`，无需安装图像库。脚本检查：固定官方 HTML/hash、明确 NC 许可和原图图注证据；两个原 JPEG 的固定 SHA/字节/尺寸；metadata 与证据一致；NYSORA/Hadzic 只有外链没有本地图像路径。它输出 `docs/reference-atlas-v03-integrity.json`。

已实际执行，结果 **PASS_REFERENCE_ATLAS_V03_SOURCE_INTEGRITY**。自动检查不替代上述 `view_image` 目视核查，也不验证患者侧别、物理探头标记、其他图源的同病例配准、临床操作安全或原生敬礼位三维资产。后续若进入离线包，还需独立核对最终包内 JPEG 与这两个源文件的字节/hash一致，并确保受限来源仍只作外链。
