# v0.7.0 三维切面联动实现复核

复核日期：2026-10-31，含同日修复复读。复核范围：`src/components/SourceSliceScene.jsx`、`src/components/SourceSliceWorkbench.jsx`，并查看其 CSS、实际安装的 Three.js 0.159.0 OrbitControls 及父组件传参。修复轮另复核 `src/workbench-frame-state.js`、对应三项回归测试及 Workbench 的接入。

本轮是实现代码的独立复核：审查者没有编写以上两个组件，但参与编写了 `oblique-slice-utils.js` 及其测试。因此，本报告将 helper 输出作为组件输入夹具，不把对 helper 的调用、已有测试或本报告当成 helper 几何真实性、临床正确性或独立医学审查。没有控制浏览器；4178 的真实页面、可读性与实际交互验收由主线程另行完成。

## 结论

**修复复读完成：初始 2 项 P2 均已修复并关闭；本报告范围内没有尚未解决的 P1/P2。** 两项原始问题均位于 Workbench 的状态到切面构造一致性。修复后，搜索候选与最终呈现使用同一纯构造函数；捕获朝向显式保留当前完整 XYZ，后续定位高度按捕获时的 level 增量移动。三项新增回归测试全部通过，并以初始复现条件另行重跑。

Scene 的 React 依赖、单次捕获回调、防止标签状态自循环、动态 up 的 OrbitControls 重建与清理、原位/副本尺寸、15 秒时序，在本报告所述静态检查和非浏览器模拟范围内没有发现阻断问题。浏览器、实际 GPU 和设备验证仍由主线程单独验收。

以下保留原始发现及复现数据，以便追溯，并记录逐项关闭依据。

## P2-1（已关闭）：查找命中的切面与最终应用的切面不同

位置：`SourceSliceWorkbench.jsx` 审查时第 118–121 行，相关最终构造在第 81–94 行。

`findSelectedCut()` 在当前已经旋转、平移后的 `frame` 上，仅替换中心 Y 来搜索交线。命中后，它调用 `changeLevel(match)`。最终渲染却重新从基准 frame 构造，再次施加 `normalOffset`；腋路还会重新计算局部聚焦中心。因此，搜索时验证过的切面不一定是最终呈现的切面，成功提示可能与真实交线不符。

使用实际载入的源几何，逐句复现该函数及父级 frame 构造，得到：

| 条件 | 搜索结果 | 最终结果 |
|---|---|---|
| 肌间沟，定位 level=1.455，法线偏移 +30 mm，目标 `brachial-roots` | y=1.455 的候选面有交线 | 最终中心 Y=1.4274709798458889，目标交线为 0 |
| 同一条件，目标 `middle-trunk` | y=1.4420000000000002 的候选面有交线 | 最终中心 Y=1.414470979845889，目标交线为 0 |
| 同一条件，目标 `inferior-trunk` | y=1.4420000000000002 的候选面有交线 | 最终中心 Y=1.414470979845889，目标交线为 0 |

建议将“最终 state → frame”的逻辑收为同一个候选构造函数，逐个验证最终会应用的 frame；或将命中的完整 frame 原样应用，并一致更新相关定位状态。成功提示必须依据最终应用的实际交线。

修复复读：`workbench-frame-state.js` 第 7–21 行提供 `buildWorkbenchFrame()`，第 37–45 行的 `findWorkbenchPlaneForStructure()` 对每个候选调用同一个构造函数，包含角度、法线偏移、腋路聚焦和捕获后的 level 增量。当前 `SourceSliceWorkbench.jsx` 第 81–83 行直接使用该构造输出呈现及求交，第 106–108 行使用该搜索结果更新 level，没有保留旧的“直接覆盖当前中心 Y”的搜索分支。

按原始 level=1.455、法线偏移 +30 mm 重跑，结果如下。每项均检查命中 frame 与最终重新构造 frame 的中心、法线完全相同，并确认最终具名源网格存在交线：

| 目标 | 命中 level | 最终中心 Y | 最终目标截线数 | 搜索/最终 frame |
|---|---|---|---|---|
| `brachial-roots` | 1.457 | 1.429470979845889 | 47 | 相同 |
| `middle-trunk` | 1.455 | 1.4274709798458889 | 28 | 相同 |
| `inferior-trunk` | 1.455 | 1.4274709798458889 | 26 | 相同 |

关闭依据是最终实际交线与状态构造一致，不是只根据成功提示或测试函数返回命中对象。

## P2-2（已关闭）：捕获方向时中心跳动，与“定位点保留”的提示不符

位置：`SourceSliceScene.jsx` 审查时第 441–450 行；`SourceSliceWorkbench.jsx` 第 92、123–125 行。

Scene 将 `center: controls.target` 连同相机方向一并回传。Workbench 直接将整个 capture 传给 `frameFromView()`，因而接受了该新中心；随后最终 frame 又只把中心 Y 覆盖为旧的 `level`，留下相机 target 的 X/Z。这是两个定位来源的混合，既不是保留原定位点，也不是完整采用相机 target。

实际默认颈部整体视角的可复现数值：

```text
原切面中心：      [-0.038, 1.455, -0.012]
相机整体取景目标：[-0.08749186695900035, 1.3686037025, -0.014487525]
最终混合中心：    [-0.08749186695900035, 1.455, -0.014487525]
中心位移：        49.554 mm
沿捕获法线位移：  -29.743 mm
```

在同一捕获朝向下，混合中心切面没有神经交线；保留原切面中心则仍有 `brachial-roots`、`middle-trunk` 和 `long-thoracic-nerve` 的真实交线。

按钮文案是“按当前观察方向取面”，成功提示是“定位点保留”，因此建议显式使用 `frameFromView(frame, { ...capture, center: frame.center })`。如果产品确实希望同时采用相机 target，则应一致采用完整 XYZ、同步定位状态，并相应改变提示。

修复复读：`workbench-frame-state.js` 第 26–27 行的 `captureWorkbenchFrame()` 显式传入 `center: [...frame.center]`，不再接受 Scene 为取景留空而设置的 target 中心。第 16–19 行保存 `levelAtCapture` 并只把后续 level 的增量加在捕获时的实际中心 Y；没有重新以旧 level 硬覆盖实际 Y。Workbench 第 111–114 行接入该函数，捕获后归零角度和额外法线偏移，当前实际朝向及位移已经保存在捕获 frame 内，不会再次叠加。

另行重跑了带有既存角度（yaw=7°、pitch=−4°、roll=19°）及 +12 mm 法线位移的颈部捕获，而不是仅测试未移动的中心：

```text
捕获前实际中心：[-0.03716292242085603, 1.444676888072538, -0.018060747582566535]
捕获后最终中心：[-0.03716292242085603, 1.444676888072538, -0.018060747582566535]
中心位移：0 m
随后 level 从 1.455 改至 1.460：实际中心增量 [0, 0.005, 0] m（浮点误差内）
```

原始的约 49.6 mm 意外跳动不再出现。捕获 effect 仍只依赖 `captureVersion`，新增 `level` 回调依赖不会构成反复捕获循环。P2-2 关闭。

## 其余已核对项

| 关注项 | 审查证据与结论 |
|---|---|
| React 初始化依赖 | Scene 的 GPU 初始化 effect 依赖 `[anatomy, structures, attempt]`；`structures` 使用 `[anatomy]` memo，不由动画、标签、frame 或选中项重建源缓冲。默认空数组/图层常量定义在组件外，没有默认参数每次分配导致的初始化循环。 |
| 捕获回调的 state 循环 | `captureView` 会因 `frame` 变化而换身份，但 Scene 把它放入 `current.current`，捕获 effect 仅依赖 `[captureVersion]`。没有把回调身份或新 frame 加入该 effect，因此一次点击不会因回调 setState 自行再次捕获。 |
| 标签 setState | `updateLabels()` 对完整标签结果 JSON 序列化后比较 `lastLabelKey`，只有数值/状态实际改变才 `setLabels()`。单纯由该 setter 引起的 render 不会无限产生不同结果。没有仅凭代码发现 MaximumUpdateDepth 路径；这不是浏览器运行证据。 |
| 15 秒动画时序 | Workbench `DURATION=15000`，阶段边界为 `.22/.28/.96`；Scene 相机转正使用 `.22`，副本位移使用 `smooth((progress-.28)/.68)`。对应 0–3.3 秒转正、3.3–4.2 秒停留、4.2–14.4 秒移副本、最后 0.6 秒保留。父子边界一致。 |
| 三维、原位与二维共用 frame | Workbench 在正常渲染路径仅生成一个 `frame`，同一 frame 传给 `obliqueSections`、`SliceDiagram` 和 Scene。原位与副本均由同一 `sections` 数组建立线顶点；差异仅是显示组位置。已修复的两项 P2 是状态变换入口的问题；当前搜索也复用最终 frame 工厂。 |
| 源结构显示裁显 | ROI 及切面半空间只进入 material clipping planes 和 raycast 过滤；源 mesh 没有被旋转、移动或改写源顶点。截线材质不继承源 mesh 的裁显半空间，原位和副本可持续显示。 |
| 原位尺寸不被重复缩放 | `sourcePlane` 本身不按窗口宽高 scale；只有 `sourceOutline` 缩放。原位的 `originalSections` 保留米制截线坐标。副本的 plate/outline 各自缩放，`sectionGroup` 同样保留截线坐标。没有把米制截线再次乘 width/depth 的问题。 |
| 原位与副本可见性 | 原位组在 sourcePlane 内，progress>0 时始终可见；副本从 progress>.28 起持续保留到 1，没有旧版尾段淡出。原位、副本分别拥有显示线资源，并使用 `depthTest:false`。 |
| 放近与线宽 | 转正 pose 根据原位及最终副本四角拟合，与整体 ROI 取景分开；`LineMaterial` 使用 `worldUnits:false`，每次 render/resize 写入分辨率，普通线宽 2.1 px，选中 3.2 px。对实际参考 frame 的相机消费者投影检查见下表。 |
| persistent labels | 四个名称按钮由固定路线列表映射，无论 anchor 是否在屏幕内均保留；在视野外只隐藏 leader，并用“本视野外/图层已关/单独观察外”说明，不删除名称按钮。`showLabels=false` 为明确关闭。 |
| 动态 up 与 OrbitControls | 安装的 r159 在构造时缓存 up 到 +Y 的四元数。组件改变 camera.up 后 dispose 并重新构造 controls，随后恢复 target/position 再 update，符合该版本机制。捕获方向使用 camera quaternion 的实际屏幕 up。 |
| 事件与资源清理 | controls 的 change/start/end listener 在重建前删除，controls.dispose 删除其 DOM listener。组件卸载还取消 hover RAF、断开 ResizeObserver、移除自有 pointer/context 事件、去重 dispose geometry/material、释放 renderer 并移除 canvas。 |

## 非浏览器验证记录

使用实际安装的 `THREE.PerspectiveCamera`，将组件 `poseFor('transverse')` 的相机输出投影回 NDC，核对原位和最终副本窗口四角。helper 仅提供与产品一致的输入夹具；该检查验证相机消费者的拟合关系，不重复认证 helper 的医学含义。

| 路径 / 视口 | 原位窗口投影 | 最终副本投影 | 四角检查 |
|---|---|---|---|
| 肌间沟 / 560×470 | 约 248×248 px | 约 257×257 px | 全部在视野内 |
| 肌间沟 / 330×430 | 约 227×227 px | 约 235×235 px | 全部在视野内 |
| 腋路 / 560×470 | 约 214×250 px | 约 220×257 px | 全部在视野内 |
| 腋路 / 330×430 | 约 196×228 px | 约 201×235 px | 全部在视野内 |

另用最小 DOM 事件桩驱动真正的 `OrbitControls`，模拟 50 次在 +X/+Z/+Y 动态 up 之间切换、销毁重建、恢复 target/position 并进行 pointerdown/move/up 拖动。50 次均保持有限相机位置，每次拖动只产生 1 个 change；最终 dispose 后 DOM listener 数为 0。

修复轮独立执行 `node --test tests/workbench-frame-state.test.mjs`：**3/3 通过**，覆盖实际腋路聚焦中心的捕获保留/后续高度增量、带法线位移的实际源目标搜索，以及施加 yaw/pitch 后的参考标签。另执行了上述三个原始颈部目标的最终 frame/交线检查及带原有角度和偏移的捕获复现；没有修改实现或测试文件。

未执行浏览器操作、真实 GPU context 丢失/恢复、触屏/iPad 手势或最终文件打包验收。本报告不能代替这些实际运行检查。
