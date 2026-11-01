# v0.2 独立代码质量复核

审查日期：2026-10-23。范围：`src/App.jsx`、`src/components/AnatomyViewer.jsx`、`src/components/CrossSection.jsx`、`src/components/UltrasoundWorkbench.jsx`，以及直接关联的 `model-utils.js`、`pose-utils.js`、两份 Node 测试与离线打包/校验脚本。本次只读实现；没有修改 UI、体位或临床数据。

## 结论

`PASS_LOCAL_CODE_QUALITY_STATIC`。未发现本次范围内未解决的 P1/P2 交互、资源释放或离线媒体外链问题。发现的一条来源窗口 P2 文案矛盾已经修复并完成源码复核。本结论是本地软件与静态包验收，不是临床体位、软组织变形或操作安全认证。

## 已修复问题

**[P2，已修复] 资料与证据来源窗口曾宣称未使用文章图片。** 本版已按 CC BY 4.0 许可使用 Vazin 2016 Figure 1(e/f) 的真实裁切图，旧的“教材和文章的图片未直接复制到工具”绝对表述与素材事实矛盾。最终源码已说明本窗口列出文字依据、真实图像按 CC BY 4.0 裁切，并增加打开 `ultrasound` 来源窗口的按钮。署名与许可仍在该窗口内完整呈现。主线程报告已在浏览器验证入口与署名；本审查者复核了实现。

主线程还将三维探头主体、接触面和模型 A 端改为半透明材质，并设置 `depthWrite:false`，缓解腋窝局部观察时的探头遮挡。源码复核确认仅材质的 transparent/opacity/depthWrite 发生变化，三个 BoxGeometry 的尺寸、位置和姿态变换没有改变；该调整不改变模型截线几何，也不增加皮肤真实接触的主张。

## 已核实的软件行为

- 选择链路共用 `selected`：超声四个热点和同名列表、左侧神经按钮、三维命中及截线选择均调用同一选择函数，临床说明和感觉/运动图读取相同 ID。切面滑杆只更新模型参考平面，没有把静态原图伪装成动态扫描。
- `posed` 与 `probeFrame` 分别依赖原模型/体位和 station，避免每次神经选择重复计算软组织变形。姿态结果展开保留源对象属性，原始几何未原地修改；体位回切从 WeakMap 中保存的源对象产生，不把变形二次累积。
- 首次三维场景先执行 `resize()` 建立实际相机比例，再执行 `setView(view)`；全览使用变形后的上肢骨段边界，局部使用当前探头平面的中心与基向量。体位切换导致 `anatomy` 引用改变，从而重新建立匹配的场景和相机。此项为代码检查，未由本审查者接管浏览器测量各屏幕的实际构图。
- Scene cleanup 断开 ResizeObserver，释放 OrbitControls，移除原生 pointer 事件，遍历释放几何体/材质，销毁 renderer 并移除 canvas；未使用连续 requestAnimationFrame，因此没有遗留动画循环。切面与探头几何均纳入同一 scene 释放。
- 切面使用同一 `frame.center/u/v/n` 与实际变形网格求交，横向和深向均为 1900 SVG px/m，属于等比平面截线。它不是超声合成。浅/深和模型 A/B 标签没有宣称是原论文物理探头端或病例左右侧。
- 独立抽查 neutral、salute 两体位，各 station 0–1 每 0.05 一档（共 42 个平面）均返回有限坐标、无异常。默认 station .64 的四神经相交由已有测试验证；近端部分层面只有三条神经是源肌皮近端缺失的真实限制，界面有未相交提示，没有自动补线。
- 离线初次 render 在 anatomy 尚未加载时不创建两张 `<img>`；载入后优先读取 `embeddedMedia[path]`。传给超声组件的是包含该字段的原 anatomy，避免姿态引用误用。图片容器长宽比与原 PNG 相同，`object-fit: contain`，热点基于完整图坐标，未使用会裁切内容的 cover。
- 离线读取模型先检查内嵌 `anatomy-data`；模型、两 PNG、模型许可/署名和第三方软件许可均已内嵌。来源网址只作为显式链接，不会主动联网获取图像。离线图像逐字节等于交付的本地 PNG，47 份几何也与本地源文件一致。

## 实际执行的核验

- `npm test`：8/8 PASS，含斜切平面旋转不变性、源几何不变、默认四神经相交、引用/热点 ID 与来源约束。
- `/opt/anaconda3/bin/python3 scripts/ultrasound-verify.py`：`PASS_LOCAL_ULTRASOUND_SOURCE_AND_CROP`。原 JPEG、JATS XML、开放许可、两裁切图 SHA、精确解码裁切像素及热点坐标算术均通过。
- `node scripts/verify-offline.mjs`：`PASS_OFFLINE_PACKAGE_INTEGRITY`，47 结构、2 PNG，外部 script 标签 0，外部 stylesheet 标签 0，内嵌媒体外部 URL 0，内联 JavaScript 语法通过。
- 离线文件版本和 SHA 以最终 `交付文件/离线文件SHA256.txt` 及 `docs/offline-integrity.json` 为准，本报告不固定写入中间包 hash。任何后续源码修复后均需重建并重跑离线完整性，不能把前一包的 PASS 用于新包。

图像核验环境说明：`/opt/anaconda3/bin/python3` 是本次可复现的 Pillow/JPEG 解码环境。Codex bundled Python 虽有 Pillow，但其 JPEG 解码器对彩色原图产生轻微不同的 RGB 舍入值，会令精确像素比较失败；原文件 SHA 和 PNG SHA 不变。不要因默认 Python 缺少 PIL 而安装或替换项目运行依赖。

## 边界与待验证项

主线程负责常规本地 HTTP 的浏览器操作验收，本审查没有争用其页面。`file://` 直接启动此前被浏览器协议策略拒绝，尚未证明运行通过；未绕过限制。物理 iPad、原图患者侧别、物理探头标记端、原图与右侧模型配准均未验证。姿态的数值变形、组织接触和筋膜等由单独姿态审计与临床审阅处理；数学连续和源网格可查不能证明真实操作体位中的解剖关系。
