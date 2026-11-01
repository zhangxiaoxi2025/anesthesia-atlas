# v0.3 独立代码与离线产物复核

日期：2026-10-24。审查人：独立子任务`repo_feasibility`。本轮只读检查根任务修改的页面与打包代码，没有修改实现源码、重复构建或占用浏览器。

## 范围与结论

静态检查：`src/App.jsx`、`src/components/UltrasoundWorkbench.jsx`、`src/components/ReferenceAtlas.jsx`、`scripts/package-offline.mjs`、`scripts/verify-offline.mjs`；为判断关联与许可边界，同时读取`clinical-v3.json`、`ultrasound.json`、`reference-atlas.json`、图片显示样式及既有来源记录。

实际执行：初审独立以只读Node程序解析离线HTML，逐项比较内嵌47个geometry与源JSON、解码4张图片比较本地文件及SHA-256、统计外部脚本／样式标签、检查撤回实验代码特征，并仅编译内联JS语法。修复复核实际调用媒体解析与模型加载函数，分别模拟HTTP网格404和离线共享缓存；另外重读最终HTML核对字节数与SHA-256。没有执行页面脚本、重建产物、访问浏览器、测试真机或重新判定临床解剖／图片许可。

初审未发现P0／P1问题。发现的1项P2功能失败路径和1项P3键盘访问问题均已修复；本审查已完成修改后的静态与函数运行复核。根任务报告的浏览器故障注入结果单独列示。当前范围没有未闭环的实质代码发现。

## 初审发现与处置状态

### P2：真实参考素材显示错误地依赖全部三维网格成功加载

初审位置：`UltrasoundWorkbench.jsx`第14、20行，`ReferenceAtlas.jsx`第9行；结合`App.jsx`的`loadAnatomy(...).then(setAnatomy).catch(...)`以及`loadAnatomy`内的47网格`Promise.all`。

可触发条件：HTTP模式下任意一个三维geometry文件返回404或网络错误。`loadAnatomy`整体拒绝，`anatomy`保持null。虽然Vazin体位照、真实超声以及Han的本地JPEG独立存在，Workbench的两个`anatomy && / anatomy ?`条件不生成图片，参考图库内联卡也一直显示加载占位。四个超声热点依然生成，使未加载的图像区域与可点击热点不一致。

影响：v0.3优先用于学习的真实图像被3D辅助功能的故障阻断；正常首次加载时也要等待全部模型成功后才显示图片。Han卡片的放大按钮仍可打开独立图片模态，这仅是部分绕行，不能解决Workbench主图缺失。

建议：媒体解析与模型几何加载分开，HTTP图片直接使用本地path；离线模式从同一个缓存内嵌JSON取`embeddedMedia`，避免为显示图片重复解析整个模型，或先尝试错误的`file:///ultrasound/...`路径。

根任务已增加共享的`readEmbeddedAnatomy()`／`referenceMediaUrl()`，取消图片的anatomy gate，并在图片放大模态使用相同解析函数。**状态：已闭环。** 本审查重新读取源码并实际执行HTTP失败路径和离线缓存函数检查，结果见下文；浏览器故障注入由根任务执行，未被混记成本审查亲自操作。

### P3：来源模态的焦点循环漏掉原生details/summary入口

初审位置：`App.jsx`的`Modal`第27行左右`querySelectorAll('button,a[href],input,select,[tabindex="0"]')`，以及模型来源模态末尾的`<details><summary>查看当前结构列表与来源状态</summary>`。

原生summary可以通过键盘聚焦，但没有纳入自定义focusable列表。模型模态最后一个被收录的外链按Tab时，trap直接跳到第一个按钮，使其后面的summary不能按正常Tab顺序抵达；使用键盘的用户因而无法展开结构列表。

建议把summary等实际可聚焦元素纳入循环，保持Escape／遮罩关闭与关闭后的焦点恢复。根任务已在focusable选择器补`summary`。**状态：代码问题已闭环。** 本审查重新核对选择器与现有事件逻辑，未冒充实际屏幕阅读器或键盘端到端验证。

## 其余重点检查

- App直接把`anatomy`传给三维及中立位横断组件，未导入或调用实验姿态函数；不存在敬礼位切换或三维探头状态。源说明与帮助文案明确保留中立位。
- Vazin图的四个热点只调用`onSelect(h.id)`，从名称关联到3D和功能卡，不传原图坐标或探头frame。原图头侧／尾侧、患者侧别与物理探头标记端的核实范围分开说明。
- ReferenceAtlas的两个Han item分别标示“方位示意”和“真实超声血管变异”，不为该图造四神经热点。图与放大模态都保留完整长宽比，图片样式为contain。
- `onInspect(item.id)`→`setModal('atlas:'+id)`→`modal.slice(6)`的ID路由与实际metadata一致，两个item都能走到原图、说明、署名和许可内容。无未知item被静默替换为另一幅图的路径。
- Vazin图许可为CC BY 4.0，Han图单独标为CC BY-NC 3.0／非商业本地教学；NYSORA与Hadzic只有显式`<a href>`外链，未进入任何`<img src>`、iframe或图片代理逻辑。打包只遍历两个Vazin panel与两个本地Han item，不遍历受限外部图片列表。
- package脚本对Vazin PNG校验magic、尺寸、hash，对Han JPEG校验magic、字节数、hash，并带入许可证据、可读署名和修改说明。verify脚本校验exact四媒体键、图片原字节、许可说明、47源geometry以及撤回代码特征；其PASS声明范围明确为静态包完整性。
- 模态状态分支互斥，遮罩点击、内容stopPropagation、Escape关闭和关闭按钮均存在。未发现来源ID关联、条件分支或关闭回调上的阻断性逻辑错误；实际点击、焦点顺序与离线运行留给根任务浏览器QA。

## 初审离线完整性检查

审查时文件：`交付文件/腋路臂丛研习室-离线版.html`。

下表为修复前已经存在的8,823,381 bytes初审快照实际检查结果；该文件已由最终构建替换。最终文件标识以文末修复闭环记录为准，不能把下表自动当作对新文件重复执行全部检查的证明。

实际独立检查结果：

| 项目 | 本轮结果 |
| --- | --- |
| 内嵌源geometry | 47/47与源JSON逐值相同 |
| Vazin体位PNG | 70,571 bytes，inline原字节/hash匹配 |
| Vazin超声PNG | 67,822 bytes，inline原字节/hash匹配 |
| Han Figure 1 JPEG | 51,227 bytes，inline原字节/hash匹配 |
| Han Figure 4 JPEG | 84,179 bytes，inline原字节/hash匹配 |
| 内嵌媒体数量 | 恰为4 |
| 外部script／stylesheet标签 | 0／0 |
| 旧敬礼位／探头重建特征字符串 | 均未检出 |
| 内联JavaScript | Node vm.Script仅语法编译通过，未执行 |
| 新来源图库UI字串 | 已在此离线包脚本中检出 |

## 修复闭环与最终文件标识

本审查对修改后源码确认：Workbench与ReferenceAtlas四张内联图片均直接解析各自媒体path，不再依赖`anatomy`是否成功加载；原图放大也使用`referenceMediaUrl(item.path)`。`readEmbeddedAnatomy()`缓存一次解析的内嵌对象，由媒体与模型加载共享。HTTP页面没有内嵌JSON时返回原始图片path。Modal选择器已经纳入原生`summary`，初审指出的Tab绕过入口原因已消除。

本审查独立执行的只读Node函数检查均通过：

- 模拟清单加载成功、单个geometry返回404，`loadAnatomy()`按预期拒绝；失败前后4个`referenceMediaUrl()`仍返回可独立加载的本地path。此检查验证函数行为，未声称Node加载了浏览器图片。
- 以4张本地源图片建立内嵌媒体对象，4个返回值逐值匹配；媒体与两次`loadAnatomy()`共享同一解析对象，`getElementById('anatomy-data')`只调用一次，期间没有发起fetch。
- `public/models/median.json`已经恢复，其实际SHA-256与源manifest记录一致。
- 静态断言两个组件无图片`anatomy`条件门，放大图片使用共享helper，focusable选择器包含`summary`。

根任务报告的实际浏览器检查：暂时移开`median.json`造成单网格失败后，界面显示三维加载／解析失败且canvas数量为0；4张参考图片均`complete === true`且`naturalWidth > 0`。随后已恢复模型文件。该项为根任务直接执行的浏览器故障注入结果，本审查没有重复执行或占用浏览器。

最终文件仍为`交付文件/腋路臂丛研习室-离线版.html`。本审查重新读取文件独立确认：**8,823,256 bytes，SHA-256 `fa238d647278f5b27a4555f75f46c19cc35fa1f041fb74b4e28635e752c7c083`**，与根任务提供的最终构建标识一致。按协作分工，本审查未重复最终包的全部媒体解码核验，由另一独立子任务承担。根任务另报告`npm test` 9/9、常规构建、离线构建、`verify-offline`及源模型校验通过；这些构建与命令结果没有冒记为本审查再次执行。

## 复核边界

该报告不把源码分析等同浏览器实测，不把包内图片与源文件相同等同临床内容正确，也不把名称联动等同超声与三维空间配准。默认模型原始姿态、来源差异、非商业图片限制及资料尚待临床教学审阅的边界应继续保留。
