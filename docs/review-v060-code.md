# v0.6.0 独立组件与调用代码复核

审查范围：`SourceSliceScene.jsx`、`SourceSliceWorkbench.jsx`，以及
`App.jsx` → `InterscaleneModule.jsx` → `PlexusTeaching.jsx` 的调用接线。
审查者没有修改上述实现文件。工具层由本审查者编写，因此本报告**不把
`slice-workbench-utils.js` 的几何真实性、来源去重或 ROI 正确性列为独立审查结论**。

## 结论与初审记录

未发现 P1。初审发现的 3 项 P2 已由实现作者修复，本审查者对实际修复函数与
接线作了独立复核，未见这三项问题继续存在。未发现其他需要阻断本地验证的
P1/P2。浏览器交互与响应式观察项仍按下述边界由主线程完成。
规范审查另已报出的隐藏图层提示、滑条上界越过裁剪盒和模型总数问题，不重复记为
本次新增发现。

| 严重度 | 组件位置（初审快照） | 可复现问题 | 所需结果 |
| --- | --- | --- | --- |
| P2 | `SourceSliceScene.jsx:87`、`:235` | `OrbitControls` 构造后缓存初始 `camera.up=+Y`；对齐时只改 `camera.up=-v`，未更新控制器的内部旋转轴。最终眼位靠近其旧轴的极点，横向拖动近乎不旋转。 | 在最终相机 up 改变后重建或正确同步控制器；保持源场景和网格不重建，并清理旧监听。 |
| P2 | `App.jsx:147`、`:154`；`SourceSliceScene.jsx:164` | “模型参考切面”和底部“显示位置”只改 `showPlane`，初审时未传入工作台；原位框仅依赖动画进度。开关没有控制实际三维框。 | 将开关接到场景可见性；开启动画时明确与开关状态同步。 |
| P2 | `SourceSliceWorkbench.jsx:11`、`:73`、`:110` | `effectiveLayers` 同时受外部和本地开关约束，而本地 `skin=false` 且没有体表开关。App 的“体表参考”即使改为 true，也始终被本地默认值挡住。 | 本地只约束其实际提供的肌肉/骨骼开关，或使本地体表默认值允许外部开关生效。 |

## 独立事件重现：OrbitControls 的 up 缓存

使用项目安装的 Three.js `0.159.0` 与真实 `OrbitControls`，在 Node 中提供最小 DOM
事件目标并直接调用注册的 `pointerdown/pointermove/pointerup` 回调。复现采用与场景
相同的顺序：先以 `camera.up=+Y` 创建控制器，再把相机放到 `center-0.8*n`，
改 `camera.up=-v`，执行 `lookAt` 和 `controls.update()`。

画布设为 640×410，水平拖动 100 px。肌间沟最终相机位置变化仅
`0.000001109516659701306 m`；观察方向仍几乎为 `+Y`，旋转约百万分之一弧度。
`OrbitControls.js:177–178` 在构造时形成闭包中的 `quat/quatInverse`，后续
`object.up` 改变不会刷新它们。这确认了交互故障，独立于 helper 测试结果。

对齐最终的静态投影本身方向正确。使用实际 PerspectiveCamera、`lookAt` 与
`OrbitControls.update()` 后，把中心、中心加 `u*0.01`、中心加 `v*0.01`
分别投影到 NDC，得到：

| 路线 | `u` 的 NDC ΔX | `v` 的 NDC ΔY |
| --- | ---: | ---: |
| 肌间沟 | +0.0408856582 | −0.0408856577 |
| 腋窝 | +0.0408856577 | −0.0408856572 |

即 `u` 朝画面右方，`v` 朝画面下方。该结论只验证组件调用与投影方向，
不验证这些基底是否属于临床探头方向。

## React 与 Three.js 生命周期检查

- 场景创建 effect 的依赖为 anatomy、由 anatomy 派生且 memo 化的 structures、
  retry attempt。选中、悬停、图层、透明度、切面和进度通过 ref 与独立更新 effect
  进入场景；未发现选择变化导致源网格或 WebGLRenderer 重建的路径。
- 每个源 mesh 的 info 对象在创建时固定。悬停仅在结构 ID 改变时发布；使用
  `selectedKey` 而非新数组引用触发样式更新。未发现由 `onInspect → setInspected`
  引起的无界 React 更新循环。
- 工作台动画的 RAF 在 effect 清理时取消；场景悬停 RAF 在卸载、拖动、离开与
  WebGL context lost 时取消。ResizeObserver、canvas 事件和 controls 事件均有
  对应清理。场景遍历以 Set 去重后 dispose geometry/material，再 dispose
  renderer、释放 context 并移除 canvas。
- 切面交线改变时只替换 sectionGroup 的线几何；原始 source meshes 没有被用于
  平移动画。提取组采用传入的局部 `[u,v]`，再以 `makeBasis(u,v,n)` 定向；
  SVG 采用 `x += u*scale`、`y += v*scale`。组件层未发现二维和三维间单独翻转
  某个坐标轴的代码。
- 三维点选通过真实 mesh Raycaster，过滤隐藏结构、透明度为零的对象和显示裁剪盒
  外的命中；按实际最近交点选择。鼠标拖动阈值、右键和多点手势不会当作结构点击。
  悬停按 RAF 合并；选择结果使用 ref 中的最新回调。该判断为代码与事件路径复核，
  不是浏览器可达性/像素命中验证。
- App 只在两份来源模型均成功且合并校验成功后提供共同工作台 anatomy。原文
  超声仍由既有组件读取，肌间沟原文与典型关系选择没有随模型 Y 值自动换帧。
  C5 等概念仍通过典型去向高亮源具名干，没有从点击合并近端网格推导独立前支身份。

## 保留观察项与验证边界

场景 resize 更新 renderer 尺寸和相机 aspect，但没有自动重新 fit 当前预设。
以 ROI 角点计算，640 px 缩至 320 px 时最外侧角点可离开 NDC；角点可能没有实际
源表面，因此本报告没有仅凭这个计算把它判为源结构被裁掉的 P2。
浏览器需补查窄窗切换、设备转向及手动旋转后的可读性。

未执行部署、资源修改、临床正确性审查或解剖专家审查。主线程已报告的全量测试与
build 结果归主线程验证；本报告不把他人报告直接当作本审查者独立执行的结果。

## 修复后复核

已重新读取作者交付的实际组件，独立执行以下检查；没有使用作者的验证脚本。

1. 从实际 `SourceSliceScene.jsx` 抽取 `disposeControls`、`rebuildControls`、
   `applyPose`、`interruptTransition` 和 `pointerDown` 函数，连同项目中真实
   `OrbitControls` 执行。新代码在动画期间停止旧控制器，只手动更新相机；
   完成、预设切换和中断时按照当前 up 重建输入控制器。场景、源 mesh 与 renderer
   没有参与重建。
2. 两条路线横断对齐后水平拖动 100 px，相机位移都为
   `1.1094920012675864 m`，恢复了可见的绕转；同样输入在旧实现中仅移动约
   1.11 微米。重建后的两路线投影仍保持 `ΔX(u)>0`、`ΔY(v)<0`。
3. 另以捕获、冒泡分阶段的最小 DOM 事件目标模拟中途拖动：实际场景的捕获阶段
   `pointerDown` 先移除旧 disabled 控制器并注册新控制器，随后同一 pointerdown
   进入新控制器的冒泡回调。水平拖动 100 px 的实际位移为
   `0.948911791793259 m`，最终 controls.enabled 为 true。
   这验证了组件调用与 DOM 分阶段派发路径；它不是完整浏览器自动化结果。
4. 连续重建控制器 8 次，DOM 监听保持 5 个（4 个控制器监听 + 1 个场景捕获监听）；
   dispose 控制器并移除场景监听后为 0，没有随重建累积。
5. 直接抽取实际 `effectiveLayers` 表达式与 `visibleStructure` 函数验证：本地
   背景 state 已仅包含 muscle/bone，外部 skin=false/true 能完整传递；神经图层
   关闭时，单独观察模式也不会把它重新显示。
6. 抽取实际平面可见性表达式验证 progress=0、0.5、1：明确的 showPlane=false
   始终隐藏、true 始终显示；未传入时按动画进度回退。重新检查了
   `App → SourceSliceWorkbench → SourceSliceScene` 的 props 及启动/复位回调，
   均已接通。

因此三项初审 P2 在本轮独立代码与事件验证范围内均已关闭。未再次审查 helper
实现或把自己的工具层测试包装成独立医学、解剖或数据真实性验证。
