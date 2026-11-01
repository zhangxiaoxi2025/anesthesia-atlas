# v0.4 最终离线包：独立静态素材与封装复核

复核日期：2026-10-24。结论：**PASS_INDEPENDENT_V04_OFFLINE_STATIC_REVIEW**。未发现需要重建本次冻结包的实质问题。本轮没有修改代码、图像、HTML、构建输出或 receipt，没有启动浏览器；标准验证脚本仅刷新本地完整性 JSON 报告。

## 对应交付文件

- 路径：`交付文件/腋路臂丛研习室-离线版.html`
- 实测字节数：**11,894,089 B**
- 实测 SHA-256：**`d8bce0d0756e239c8bc8869d993d53ce08a3d578e58edd9719ae600c4fee7381`**
- 文件修改时间：2026-10-24 15:28:37.932（Asia/Shanghai；UTC 07:28:37.932）。
- `交付文件/离线文件SHA256.txt` 与独立重算 hash 一致。

本报告只适用于该 hash。v0.3 报告中的旧 hash 是历史快照，不代表当前 v0.4 文件。

## 模型清单与许可

离线 JSON 中包含腋路模块 **47 个源结构条目**和独立的颈部模块 **35 个源结构条目**。两个清单各自 ID 唯一，元数据及全部 geometry 与各自本地 manifest/JSON 完全一致；35 个颈部源 JSON 的原文件 SHA 也逐项匹配。

两个清单共享以下 **6 个 ID**：`posterior-cord`、`brachial-roots`、`superior-trunk`、`middle-trunk`、`inferior-trunk`、`clavicle`。因此不能称为“82 个唯一结构”。本报告按模块分别报告数量，不把跨清单的条目总数当作唯一解剖结构数量或对两清单几何完全相同的认证。

两组模型均来自 Z-Anatomy 同一固定 commit：

`6c7f9016bd5899ac8edafd31b9900c151df42ed6`

颈部 `embeddedInterscalene` 包含完整 manifest、35 份 geometry 及来源元数据；`embeddedInterscaleneAttribution` 和两份 `embeddedInterscaleneLicenses` 与本地署名/许可文件逐字一致。保留 BodyParts3D — The Database Center for Life Science、Z-Anatomy、Gauthier Kervyn、FBX 分发者 Lluís Vinent Juanico 的署名链，Z 衍生模型按 **CC BY-SA 4.0** 提供，上游历史 BodyParts3D CC BY-SA 2.1 Japan 归属没有被删除。

腋路旧模型、上游许可、软件第三方许可内嵌文本继续与本地文件一致。图像的 NC/SA 条件和模型许可分别保存，未把一种许可套用于全部资产。

## 五项媒体逐字节核验

`embeddedMedia` **恰好 5 项**；全部为完整 PNG/JPEG base64 data URL，解码字节与冻结本地源文件相同，未嵌入远程图片 URL。

| 图像 | 尺寸 | 字节 | SHA-256 | 许可 |
|---|---|---:|---|---|
| Vazin 2016 Figure 1(e)，体位/探头照片裁图 | 289×225 | 70,571 | `4c6ce08e0a0f2b7323b88cec636142de42033379a2fd8434fb7549195420bddb` | CC BY 4.0 |
| Vazin 2016 Figure 1(f)，腋路真实超声裁图 | 372×225 | 67,822 | `cb36a22bd99f09ea6c4fa84e6f832ebb4a9c0e57f2473bbd675758dc53668d38` | CC BY 4.0 |
| Han 2014 Figure 1，原刊方位示意 JPEG | 647×461 | 51,227 | `43ff11bd7e776f642c0b82867de6c7c73a47d24a9c3c17f109ebb6d4185ead55` | CC BY-NC 3.0 |
| Han 2014 Figure 4，原刊血管变异 JPEG | 683×458 | 84,179 | `c8bb24732f83cecfb6cc38819abff6da5af8b225694ed047a3820908d420445f` | CC BY-NC 3.0 |
| Kumar 2023 Figure 1，原刊完整 JPEG | 779×699 | 114,793 | `2b001460c873ab77033ce04976834416a4bef9b2a7f3253acf9a6bfe4950b143` | CC BY-NC-SA 4.0 |

旧四项媒体仍与此前来源记录对应；本轮没有重新下载、重画或看图。Vazin 只保留已记录的 e/f 裁图，Han 两原 JPEG 未改变像素。Kumar 嵌入的是完整原 JPEG，A/B/C 的 CSS 视窗只改变可见窗口，没有生成新像素图像或镜像改图。本次静态字节检查不替代此前图像目视识别，也不宣称对其做了新一轮临床图像判读。

## Kumar 2023 及 JATS 许可证据

来源：Kumar A, Sinha C, Kumar A, Singh K. *Refining the drug injection site during ultrasound-guided interscalene brachial plexus block: root or trunk?* Anaesthesiol Intensive Ther. 2023;55(5):372–373. DOI **10.5114/ait.2023.134278**，PMCID **PMC10801454**。

新增 `embeddedInterscaleneUltrasoundAttribution` 包含作者、期刊/年份/页码、DOI、Figure 1、版权方 Polish Society of Anaesthesiology and Intensive Therapy、**CC BY-NC-SA 4.0** 及链接、官方 NCBI PMC Cloud 图像/XML URL、图像 hash、原 JPEG 未修改/CSS 视窗说明、方向未核实和未配准局限。

嵌入的 `embeddedInterscaleneUltrasoundEvidence` 与本地官方 JATS 文件逐字相同：

- 本地路径：`public/interscalene/ultrasound/source/PMC10801454.1.xml`
- SHA-256：`598797fda9827186990525060740569525c8cda7e52c8258a05c2ccba5b3827c`
- 许可证据位于 `permissions/license` 内，既有 ALI `license_ref`，也有许可段落和 `ext-link`，明确 **CC BY-NC-SA 4.0** 及 `https://creativecommons.org/licenses/by-nc-sa/4.0/`。
- 官方 JATS 中可定位包含 C6/C7 的 Figure 1 图注；未凭 XML 元素外层缺少 xlink 属性而误判没有许可。

该 XML 作为 JSON 字符串保存于 `type="application/json"` 的 `anatomy-data`，打包时所有 `<` 已转成字面量 `\u003c`；不作为 DOM、脚本、iframe 或图片文档执行。Vazin 的本地 JATS 同样只作来源证据，当前显示组件没有加载或解析其 XML。Han 原页快照和许可证据也没有作为执行页面嵌入。应用源码没有把这些取证资料送入 `dangerouslySetInnerHTML`、`innerHTML`、`DOMParser` 或远程图像加载器。

## 离线读取与图片独立显示

对最终 payload 和当前 `src/model-utils.js` 做了独立 Node helper 检查，模拟 `anatomy-data` DOM，并将 `fetch` 替换为一调用即报错的函数：

1. 在调用任何模型 loader **之前**，依次解析五项 `referenceMediaUrl(path)`，全部返回对应完整内嵌 data URL。
2. `loadInterscaleneAnatomy()` 直接返回内嵌的 35 结构。
3. `loadAnatomy()` 直接返回内嵌的 47 结构。
4. 整个过程 `fetch` 调用 **0 次**，`anatomy-data` 读取 **1 次**。

只读检查 `UltrasoundWorkbench.jsx`、`ReferenceAtlas.jsx`、`App.jsx` 放大弹窗和 `InterscaleneModule.jsx`：图像地址均通过该独立 helper 取得；参考图、颈部原图放大窗和 A/B/C 视窗不以 anatomy 加载成功为显示条件。颈部加载失败时保留“右侧文献图仍可查看”的 UI 路径。这证明素材地址不依赖模型 Promise 成功；本轮未做浏览器故障注入。

NYSORA/Hadzic 的文章及原图地址仅进入 `<a href>`。没有将这些网址用为 `<img src>`、iframe、CSS 背景或代理地址；5 项嵌入图片中没有其受限图片副本。点击来源外链仍需网络，不能把外链可见性算作离线内容。

## 当前构建与姿态代码

最终 HTML 内联 JS 与当前 `build-offline/app.js` 按相同 script 结束标签转义规则逐字一致，内联 CSS 与当前构建的 `anesthesia-atlas-axillary.css` 逐字一致。

- 最新 `src` 下 JS/JSX/CSS/JSON 源文件是 `src/App.jsx`，修改时间 UTC 07:28:36.578，早于 `build-offline/app.js` 的 UTC 07:28:37.769。
- 真正 HTML 元素解析得到 2 个 script：1 个 application/json 数据块、1 个内联程序；没有外部 script 或 stylesheet。
- 内联 CSS 没有远程 `@import` / `url(http...)`。
- 全部医学图片通过本地内嵌媒体提供，XML 内的图像引用仅是取证字符串。
- 内联 JS 语法编译通过；本轮没有执行浏览器 JS。

`src/pose-utils.js` 不在活动目录，源码和实际离线 bundle 没有 `poseAnatomy`、`getProbeFrame` 或已撤回姿态/探头重建标记。两个三维组件从冻结 geometry 建立网格，没有在运行时对解剖网格加关节姿态变形。颈部动画移动/旋转的是参考平面及其真实求交截线，原始神经、肌肉、血管网格保持源坐标；相机和显示裁切不等于解剖重建。不能称该包含原生敬礼位可旋转人体，或声像与中立位模型已经配准。

## 实际执行与结论边界

- `node scripts/verify-offline.mjs`：**PASS_OFFLINE_PACKAGE_INTEGRITY**，47/35 结构、5 媒体、hash/receipt、几何、署名/许可及 JATS 均一致。
- 独立 Node 断言：**PASS_INDEPENDENT_STATIC_HELPERS_AND_BUILD** 和 **PASS_MANIFEST_METADATA**。
- 独立 Python HTMLParser / ElementTree：**PASS_HTML_STRUCTURE_AND_JATS**。
- 标准检查刷新 `docs/offline-integrity.json`；本报告新增为 `docs/review-v04-offline-assets.md`，没有重建交付文件。

这是静态封装、来源记录和许可条件完整性检查。它不代表临床解剖认证、阻滞有效性认证、同病例空间配准、真实超声模拟或进针/注药定位验证。图像按各自 NC/SA 条件用于当前非商业本地学习教学；本报告不能赋予 NYSORA/教材复制权限或推定商业复用获准。本轮没有启动浏览器，未验证 `file://` 运行、真实 iPad 或网络完全切断后的浏览器交互。

