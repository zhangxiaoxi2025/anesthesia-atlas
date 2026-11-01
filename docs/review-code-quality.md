# 独立代码质量审查

日期：2026-10-23。顺序：先完成 `review-spec.md` 的冻结候选规格复核并记录 `PASS_LOCAL_SPEC_STATIC`，随后开始本轮质量审查。方式：只读 React/Three.js 代码、事件生命周期、模型投影、状态转换、测试与离线打包脚本；没有操作主线程浏览器，也没有修改 UI、数据或脚本。

本轮参考本地 `vercel-react-best-practices` 技能中有关副作用依赖、事件订阅清理、并发请求和瞬时交互状态的规则。没有以风格重构或未测量的微小性能问题作为缺陷。

## 最终复核结论

结论：**PASS_LOCAL_CODE_QUALITY_STATIC**。本轮没有发现新的 P1，初审 4 个 P2 均已修复并完成受影响项的只读复核；没有遗留的已识别代码质量阻断项。下文保留发现与闭环历史。

| 项目 | 最终受影响项复核 |
| --- | --- |
| Q01 软件许可 | `generate-notices.mjs` 从实际安装的 react、react-dom、scheduler、three、lucide-react 获取版本与完整 LICENSE；最终单 HTML 内嵌正文与本地 notices 完全相同。对五个包逐一比较，原 LICENSE 全文均被保留。界面新增“第三方软件许可”可读入口。 |
| Q02 完整离线构建 | package.json 新增 `build:offline`，依次生成 notices、使用 `vite.offline.config.js` 从当前 `src/main.jsx` 编译 IIFE，再运行 packager。独立配置清楚给出 outDir、IIFE、production 与 CSS 合并；不再只靠手工旧 bundle 进行构建。主线程已实际执行新命令，本审查不重复该写入型构建。 |
| Q03 截线颜色 | COLORS 增加通用 nerve 与 skin，三维/切面共用；独立实算 Y=1.295 与 Y=1.39，所有相交结构的 stroke fallback 缺失数均为 0。对照神经仍未误归四主干。 |
| Q04 教学层面 | `goStep` 显式设置 1.295，包含教学开始与后续步骤；切面根据所选神经本层面实际有无截线决定缺席提示，并区分神经层被隐藏。根源几何没有延长或移动。 |

浏览器和物理触摸设备验证应由实际执行者单独记录。本审查确认的是源码行为和单 HTML 静态完整性，不把“file:// 双击运行”或 iPad 实机表现标为通过。主线程报告 file:// 导航受浏览器协议策略阻止，未绕过；常规本地 HTTP 已作运行验证。平板 viewport 调整未生效时，也不得声称平板已通过。

## 初审发现与闭环历史

### Q01 — [P2] 单 HTML 未保留实际打包的第三方软件许可正文

位置：`scripts/package-offline.mjs` 第 11–20 行，以及产出的单 HTML。

包中实际包含 React、ReactDOM、Three.js、Lucide 等软件，但 packager 只显式嵌入 Z-Anatomy 的 CC BY-SA 资产许可和资产署名。初审的 8,390,085 字节 HTML 中没有 MIT 授权正文 `Permission is hereby granted, free of charge`。资产许可不能代替软件依赖的许可和版权通知。

建议：从实际安装/实际打包的依赖获取对应版本许可，生成 `THIRD_PARTY_NOTICES` 并随单 HTML 内嵌或附加可读取的全文；包含必要的版权、授权与免责声明，不只列一个 SPDX 名称或外链。资产许可、原创应用代码与第三方软件仍分开记录。

最终状态：已修复，通过 Q01 受影响项复核。

### Q02 — [P2] 离线打包依赖手工产生的旧 bundle，缺少完整可重复命令

位置：`scripts/package-offline.mjs` 第 16–18 行与 `package.json.scripts`。

packager 直接读取 `build-offline/app.js` 和该目录里的 CSS；package.json 只提供 Vite 普通 build，没有一个命令说明如何先从当前源码生成单文件可用的 IIFE。源码修复后单独重跑 packager，可能把新模型和许可与旧应用代码混合交付，SHA 只证明那一份旧包完整，无法发现其不是当前候选。

建议：增加 `build:offline`，按顺序先清理并编译当前源码为自包含 IIFE/CSS，再打包模型与许可并计算 SHA；使用项目中明确列出的构建依赖/配置，而不是仅依赖一次性的 shell 历史。记录当前构建命令，修复后从该命令重建一次。

最终状态：已修复，通过 Q02 受影响项复核。

### Q03 — [P2] 非四主神经与体表截线缺少颜色 fallback，真实截线被画成不可见

位置：`src/components/CrossSection.jsx` 的 `stroke={COLORS[nerve] || COLORS[s.kind]}` 与 `src/model-utils.js.COLORS`。

`COLORS` 没有通用 `nerve` 或 `skin` 键。非四主神经的对照结构不映射到某条主神经，其 SVG path 因此 `stroke` 缺失；同时 `fill="none"`，导致截线不可见。体表层打开时也一样。

独立从实际交付几何求交：Y=1.295 的臂内侧皮神经有 24 条、体表有 234 条截线，但按当前表达式均无 stroke；Y=1.39 的后束 26 条、腋神经 24 条、臂内侧皮神经 26 条、体表 173 条均如此。这和几何缺失不同，会让学习者以为对照结构或该图层不在本层面。

建议：给通用神经、体表设置明确 fallback 色，与三维图例统一；保证它们仍作为对照结构而非可选四主神经。验证打开相应图层后，有实际截线的 path 均有可见颜色。

最终状态：已修复，通过 Q03 受影响项复核。

### Q04 — [P2] 从任意探索切面开始教学，肌皮步骤继承了不相交层面

位置：`src/App.jsx` 的 `startTeaching` / `goStep`；`CrossSection` 的缺席提示。

状态路径：用户先把切面拖到 Y=1.39，再开始分步教学。`startTeaching`/`goStep` 重置了相机、神经选择、图层等，但未重置 `level`；第 02 步选择肌皮神经并令 `showPlane=true`。源肌皮主干最高 Y=1.31090331，此时无任何肌皮截线。横断面提示仅判断“所有目标神经的总数为零”，因正中/尺神经仍相交，不会解释所选肌皮为何缺席。

建议：教学开始时设置经过验证的参考层面 1.295，或在各教学步骤声明需要的参考层面；允许用户继续探索时，增加“所选神经本层面未相交”的真实状态提示。不要延长或移动源神经来满足界面。

最终状态：已修复，通过 Q04 受影响项复核。

## 已检查且未发现阻断问题的方面

- anatomy 加载使用一个 AbortController，实际结构请求在取得 manifest 后并发执行；卸载时中止。单 HTML 则优先读取内嵌 JSON，核心功能不要求访问远程模型。
- WebGL 构造失败有可见信息，模型 HTTP/解析失败会进入 App 错误状态；当前源码未暗中替换成生成神经或空模型并声称完成。
- ResizeObserver、原生 pointer 监听、OrbitControls、几何/材质和 WebGLRenderer 在 effect cleanup 中释放。没有持续 RAF 或定时轮询；控制器变化时才 render。
- 标签锚点由实际顶点取得并投影到相机，侧边标签避免互相紧贴。当前投影筛选和观察方向不等同完整遮挡检测，属于显示限制，不作为未证明的 P1。
- 关系演示不再构造额外的注射空间、实体环或流体几何；其高亮逻辑作用于已有源结构。
- 切面计算由 `useMemo` 随模型/层面变化，切换选择或图层不重新解所有三角形；SVG 点坐标使用有限精度。没有仅因未使用某项 React 优化而要求重构。
- 模态框具 Escape、焦点循环和清理逻辑；表单控制使用原生按钮、select、range，具有可读的 aria 名称。未把这段静态实现冒充全部键盘场景已通过。
- packager 对嵌入 JSON 转义 `<`，对脚本结束串转义，避免数据或 bundle 提前关闭 script 元素；没有外部 `<script src>` 或 stylesheet 依赖。

## 单 HTML 的独立静态核对记录

初审时文件为 `交付文件/腋路臂丛研习室-离线版.html`：8,390,085 bytes；47 个嵌入结构；每个 `geometry` 与对应 `public/models/*.json` 完全相同；嵌入资产许可 20,554 字符、资产署名 2,790 字符；外部 script 标签数 0、外部 stylesheet 标签数 0。

当时文件 SHA-256 为 `6176f838a3e1c0709ba0354e93652355a1803c75ae847b186b17fe301aa58cb9`，与当时 `离线文件SHA256.txt` 一致。修复后重建会改变这些数值，应以最终回执为准，不把本历史快照当成最终文件认证。

## 最终单 HTML 静态复核记录

最终受检文件：`交付文件/腋路臂丛研习室-离线版.html`，**8,399,639 bytes**；SHA-256：`a50efb970773b59fc14ac10700d7459b4fbec39b4a580f6e0911b4761cfe3a32`，与当时最终 `离线文件SHA256.txt` 一致。

- JSON 可解析，含 47 个结构；每个内嵌 geometry 与对应交付 `public/models/*.json` 完全相同，无不一致项。
- 内嵌 Z 资产署名、资产许可与第三方软件 notices 分别与本地对应文件完全一致。
- React、ReactDOM、scheduler、Three.js、lucide-react 五份实际安装版本的完整 LICENSE 均在 notices 中保留。
- 外部 script 标签数为 0；外部 stylesheet 标签数为 0。
- 从 HTML 抽取的实际内联 JavaScript 经 `vm.Script` 只编译不执行，结果 `PARSE_OK`。该项证明语法可解析，不证明浏览器 WebGL 或 file:// 协议运行。
- 源模型参考姿势、可注药空间未建模、非真实超声、非患者效果预测与待临床审阅的边界没有在质量修复中被扩大。


## 最终交付包刷新记录

主线程在独立复核后补齐重置按钮的关系场景/感觉与运动标签复位，并用同一build:offline命令重新构建。最终交付HTML为8,399,684 bytes，SHA-256见docs/offline-integrity.json（26e70538e2c7512d105f41d307189218de653a370d88c958bcd4527ace741613）。最终静态完整性与5项测试重新通过；此处旧包哈希是独立审查时的历史记录，不能替代最终回执。
