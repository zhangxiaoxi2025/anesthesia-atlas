# v0.4.2 切面位置反馈核验

日期：2026-10-26。用户范围：拖动模型水平面时看不出哪里调节。本轮只修切面控制与位置显示，不改变源模型、临床内容或文献图像。

## 修复

1. 单一高度滑杆从下方结构区移至三维上方，名为“切面上下移动”；足侧→头侧、1毫米步进、相对初始参考面读数，另有±1mm与回初始层面。原位置提供返回三维的快捷入口，立即滚动并聚焦滑杆。
2. 调节时暂停播放、progress=0、清hover，人体网格和相机保持其原位置。二维与源平面共享level。
3. 源平面增加青绿色边框/L角标，左侧高度导轨与真实角点投影相连，中文说明位于画布外。导轨/角标不参与解剖拾取。
4. 修复起点共面白底遮住源绿色面的根因：progress=0白底隐藏且opacity0，抽出后渐显。拾取也按白底实际显示处理，不让隐藏白底挡身体命中。

## 实际浏览器检查

本地HTTP200，使用CUA进行原生指针拖动与键盘检查；默认1440×1000，另验390×844模拟窄屏，临时视口已恢复。

- 真实拖动从1.468到1.486：滑杆=1.486，实际sourcePlane.position.y=1.486，显示“较初始向头侧18mm”，progress0、paperVisible=false；真实投影角点屏幕Y从183.36变成154.30（三维画布相对坐标）。二维从15结构18组截线变为13结构18组。画面明确看见青绿色平面相对人体向头侧移动。
- 已抽出/转正阶段progress1、paperVisible=true，ArrowLeft调节立即回progress0、paperVisible=false，位移改变1mm。
- Home→足侧33mm/1.435，足侧按钮disabled；End→头侧37mm/1.505，头侧按钮disabled。回初始层面恢复1.468。
- 返回三维快捷入口聚焦is-plane-level，控件top19.8px、canvas bottom557.1px，滑杆与三维可同屏。旧smooth滚动会捕获途中位置，最终改为立即滚动并重验。
- 390像素模拟窄屏无横向溢出，1mm按钮、真实planeY及导轨投影正常。未声称触屏或iPad实机验证。
- 最终刷新后再次原生拖动到1.486核对一致；控制台warn/error为空。

截图：preview-v042-plane-initial.png、preview-v042-plane-head.png、preview-v042-plane-control.png、preview-v042-mobile.png。

## 自动检查和实现审阅

Scene实现者实际运行npm test：22/22通过，JSX编译通过。另执行生产pickAt隔离检查，确认隐藏白底不挡body、可见白底空白挡body、真实线仅在矩形窗内拾取；min/default/max共12个实际角点Y均等于level。常规构建、离线构建和verify-offline全部通过。

命名/方向审阅代理的静态反馈未发现P1/P2，源+Y=头侧、毫米差值及参考面语义保持；已采纳“正在调节切面”的文案建议。代理在消息后因模型容量结束，详见主线程补记的review-v042-plane-control.md，不冒称独立临床认证。

与保存的v0.4.1离线文件比较，整个anatomy-data JSON逐项相等：源模型、五图、署名、许可及证据均未改变（offline-delta-v042.json）。直接file协议运行及物理iPad仍未验证；运行检查针对本地HTTP，离线版为静态完整性核验。

当前离线HTML：11,921,784 bytes，SHA256 `be2624cee39b7b720b093663bf988e70ff0cb11e86e1ef47d2e4444a7112b5bd`。ZIP CRC与内含HTML一致性见外部打包回执review-package-v042.json。
