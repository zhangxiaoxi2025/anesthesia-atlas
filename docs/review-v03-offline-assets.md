# v0.3 最终离线包：独立静态素材复核

复核日期：2026-10-24。结论：**PASS_INDEPENDENT_V03_OFFLINE_STATIC_RECHECK**。本次未发现需要重建离线包的素材、来源许可或旧姿态代码残留问题；没有修改代码，没有启动浏览器。

## 本次对应的具体交付文件

- 路径：`交付文件/腋路臂丛研习室-离线版.html`
- 字节：**8,823,256 B**
- SHA-256：**`fa238d647278f5b27a4555f75f46c19cc35fa1f041fb74b4e28635e752c7c083`**
- 文件修改时间：2026-10-24 13:12:19（Asia/Shanghai；UTC 05:12:19）。
- `交付文件/离线文件SHA256.txt` 与独立重算 hash 一致。

本报告只适用于上述 hash。后续若改变 HTML 内容，需要重算和重核；本轮仅更新文档不影响该文件 hash。

**旧快照说明：** 首次检查的包为 8,823,381 B、SHA-256 `592a69ef662a55cf88b2aa001755d70b914ffbcaca03f23f15baac17ed4243c4`，当时静态检查通过。随后根线程修复“参考图显示依赖三维 anatomy 加载成功”的代码耦合并重建；没有改动素材。该旧包记录保留作追溯，不能当作当前最终包的 hash。本报告已对上述 `fa238d…c083` 新包重新执行关键完整性及构建一致性检查。

## 四张图像逐字节核验

内嵌 `embeddedMedia` 恰好四项，没有多余医学图片；全部为完整 base64 data URL，解码后与本地冻结源文件逐字节一致。

| 图像 | 尺寸 | 字节 | SHA-256 | 许可 |
|---|---|---:|---|---|
| Vazin 2016 Figure 1(e)，体位/探头照片裁图 | 289×225 | 70,571 | `4c6ce08e0a0f2b7323b88cec636142de42033379a2fd8434fb7549195420bddb` | CC BY 4.0 |
| Vazin 2016 Figure 1(f)，腋路真实超声裁图 | 372×225 | 67,822 | `cb36a22bd99f09ea6c4fa84e6f832ebb4a9c0e57f2473bbd675758dc53668d38` | CC BY 4.0 |
| Han 2014 Figure 1，原刊方位示意 JPEG | 647×461 | 51,227 | `43ff11bd7e776f642c0b82867de6c7c73a47d24a9c3c17f109ebb6d4185ead55` | CC BY-NC 3.0 |
| Han 2014 Figure 4，原刊血管变异 JPEG | 683×458 | 84,179 | `c8bb24732f83cecfb6cc38819abff6da5af8b225694ed047a3820908d420445f` | CC BY-NC 3.0 |

PNG 签名、宽高和字节数通过；Han JPEG 已通过独立来源脚本的 JPEG 头尺寸、签名、固定 hash 检查。没有裁掉 Han 原图方向、AA/AV、A/B、箭头等内容；这由此前实际 `view_image` 目视检查和本次字节未变共同支持，不把自动尺寸检查当作新一轮图像视觉识别。

## 模型及姿态范围

独立比较 HTML 内的 47 个结构 ID、结构元数据及全部 geometry，与当前 `public/models/manifest.json` 及其 47 份本地 JSON 完全一致；47 个 ID 均唯一。固定源 commit 为 `6c7f9016bd5899ac8edafd31b9900c151df42ed6`。

当前源代码 `src/pose-utils.js` 已不在活动目录；App 没有 `poseAnatomy`、`getProbeFrame` 或该模块导入。离线实际脚本中没有此前教学姿态的标记、连续变形场、源关节锚点或估计体表探头重建标记。内嵌几何对应原始中立位源图谱，不能描述为原生敬礼位三维。没有在本次检查中重新变形、重建或改变源几何。

## 署名、许可和受限外链

- Vazin 的内嵌署名包含作者/版权、CC BY 4.0 标识及链接、文章/DOI、官方原图和 JATS 许可来源、原始图 hash、两裁图框/尺寸/hash、修改说明和未配准边界。
- Han 两项的 UI bundle 元数据和内嵌 `embeddedReferenceAttribution` 含作者、图号、文章、DOI、官方图片 URL、版权、**CC BY-NC 3.0**、许可链接、非商业使用条件、原图未修改说明、方向和局限。`embeddedReferenceEvidence` 与本地 `license-evidence.json` 完全一致，记录原刊 HTML 的固定 hash 与许可定位。未把 Han 错标为 CC BY 或 CC BY-SA。
- Han 正式源页快照 SHA 为 `8d2f7c71a651f285745ab11f6a392648610ac103b32b841df98a337695cffbbe`，来源验证脚本确认原页许可和 Figure 1/4 图注证据。取证原页 HTML 未作为远程 iframe 或本工具 HTML 执行。
- Z-Anatomy 的署名、CC BY-SA 4.0 许可文本及第三方软件许可内嵌文本，与本地交付源文件完全一致；图像许可与模型许可各自保留。
- `ReferenceAtlas.jsx` 对 NYSORA/Hadzic 文章和图像 URL 的用法为 `<a href>`，不是 `<img src>`、iframe 或代理。内嵌媒体只有上述四份获准图像，未出现 NYSORA/McGraw Hill 本地图像副本。本地引用目录仍只含 Han 两 JPEG、原页快照和许可证据；NYSORA/Hadzic 源网址在 bundle 中存在是外链，不等于复制受限图片。

## 离线封装检查

HTML 内联脚本与当前 `build-offline/app.js`（按打包器相同的 script 结束标签转义规则）完全一致，内联 CSS 与当前 build CSS 完全一致。因此本次并非仅检查旧包可解析，还核对了它确实封装当前构建输出。

- 外部 script 标签：0。
- 外部 stylesheet 标签：0。
- 内联 CSS 的远程 `@import` / `url(http...)`：0。
- 内嵌媒体的远程 URL：0。
- 内联 JavaScript：语法编译通过，未执行浏览器脚本。

最终修复后，主页面四张参考图和图谱放大弹窗直接使用 `referenceMediaUrl(path)`，不再等待 React 的三维 anatomy state 成功。该函数从本文件的 `anatomy-data` 读取、缓存内嵌媒体，几何载入使用同一缓存；HTTP 版在没有内嵌 payload 时使用本地 public 图片路径。已只读核对 helper 与两个组件，确认没有为了独立显示而改成远程医学图片 URL。外部来源链接由用户显式点击后才访问原站，这些链接本身需要网络。本项是源码和最终构建的静态复核，本轮未做浏览器故障注入测试。

## 实际执行

1. 对当前 `fa238d…c083` 包重新运行 `node scripts/verify-offline.mjs` → `PASS_OFFLINE_PACKAGE_INTEGRITY`，47 结构、4 媒体、对应 receipt/hash 一致，几何/四媒体/署名证据逐项仍与本地冻结素材一致。
2. 先前同一批未变素材运行 `node scripts/reference-atlas-verify.mjs` → `PASS_REFERENCE_ATLAS_V03_SOURCE_INTEGRITY`；本次没有重复下载或看图。
3. 先前同一批未变素材运行 `/opt/anaconda3/bin/python3 scripts/ultrasound-verify.py` → `PASS_LOCAL_ULTRASOUND_SOURCE_AND_CROP`；最终包四媒体字节/hash继续匹配该来源记录。
4. 对当前包重新运行独立只读 Node 检查 → 固定最终大小/hash、47 结构 ID/元数据、当前构建 JS/CSS、Han UI 字段与许可、旧姿态标记移除、外部图像仅作 anchor，全部通过；并额外核对新 media helper 不再依赖三维加载 state。

标准验证脚本刷新了对应的本地完整性 JSON 报告；未改变 HTML、receipt、构建输出、素材或代码。

## 结论的边界

这是静态包与素材来源完整性验收，不是临床验证、源模型准确性认证或浏览器运行测试。本轮未启动浏览器；`file://` 直接运行及物理 iPad 未在本轮验证。来源图、真实声像、不同受试者的变异示例和原始中立位模型保留各自坐标，不声称同病例空间配准，也没有证明已经取得原生敬礼位、可自由旋转的三维资产。Han NC 授权覆盖当前非商业本地学习教学，不能由本报告推定商业用途获准。
