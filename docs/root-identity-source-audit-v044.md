# v0.4.4 臂丛根身份固定源只读审计

审计日期：2026-10-27。范围仅为当前固定 Z-Anatomy 来源、原始 FBX 元数据、现有导入脚本和导出清单；未修改实现、源几何、manifest 或标签。未进行临床扫描定位或新的医学文献判断。

## 结论

**当前固定源没有可追溯到独立 C5、C6、C7、C8、T1 的具名脊神经前支对象；扩展检查 C4–T2 也没有发现独立节段身份。近端合并状态已经存在于原始 FBX，并非本项目导入时把五个具名神经合并。**

当前可按真实独立对象标出的臂丛主体包括上／中／下三干、六股及后束；外侧束／内侧束没有对应的独立具名解剖 mesh。源中的“外侧束分支／内侧束分支”分组不是束本体。当前合并近端对象只能保留为“臂丛近端合并网格（未分节）”，不能据局部椎骨高度、椎间孔外观、截圈数、连通分量、上下顺序或标准根干关系给其分块补上 C5–T1 标签。

## 固定来源及实际读取范围

- 仓库：[LluisV/Z-Anatomy 固定版本](https://github.com/LluisV/Z-Anatomy/tree/6c7f9016bd5899ac8edafd31b9900c151df42ed6)。
- 提交：`6c7f9016bd5899ac8edafd31b9900c151df42ed6`。
- 原始文件：[Resources/Models/FBX/NervousSystem100.fbx](https://github.com/LluisV/Z-Anatomy/blob/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models/FBX/NervousSystem100.fbx)。
- 文件长度：53,887,724 bytes；SHA-256：`3ea1aad64956cad27348a27b8fb50494b7cc307c6bc77bee0810ec2a67dff2b1`，与本地已记录来源 hash 一致。
- Git blob SHA-1：`4ec6e3cb2a1ba821aca02c1d523ac614fdf41a02`。固定树中 `Z-Anatomy PC/Assets/Models/1.0 Models/NervousSystem100.fbx` 具有相同长度和 blob SHA，属于同一文件的副本，未发现另一份具节段分割的神经系统模型文件。
- 本轮实际请求[固定递归 Git 树](https://api.github.com/repos/LluisV/Z-Anatomy/git/trees/6c7f9016bd5899ac8edafd31b9900c151df42ed6?recursive=1)：25,708 项，`truncated=false`；没有带 C4–C8／T1–T2 节段名的 neural/root/ramus/plexus 路径。目录扫描不等于逐读所有描述、Unity prefab 或另一版本的 Blender 数据，故不据此声称整个 Z-Anatomy 生态永远不存在节段模型。
- 资产许可仍为当前固定来源的 CC BY-SA 4.0；本轮不引入新资产或新许可。

## 原始 FBX 与导入过程交叉核对

直接按 binary FBX 7400 节点结构读取 `Objects`、`Connections` 和所有字符串属性，跳过数值数组载荷，不运行上游脚本；另外使用本项目已安装的官方 Three.js `FBXLoader` 只读解析同一个文件。

| 核查项目 | 实际结果 |
| --- | --- |
| 原始 Objects 数 | 1,614 |
| 原始 Model 数 | 845：712 个 `Mesh`，133 个 `Null` |
| 原始 Geometry 数 | 600；Model 与 Geometry 可以复用，因此数量不必一致 |
| 原始节段身份名 | Objects 名称及字符串元数据中未检出独立 C1–C8／T1–T2，或英文第几颈／胸神经节段名 |
| 官方 loader 实际 Mesh 数 | 712，与 `source/mesh-inventory.json` 一致；清单中没有 loader 漏失的 mesh ID |
| 右侧近端 Model | `680949521`，原名 `Roots of brachial plexus.r`，类型 `Mesh` |
| 该 Model 的 Geometry | 唯一 `761284076`，原名 `Roots of brachial plexus` |
| 该 Model 子 Model | 0；只有该 Geometry 和一个 `Nerve` 材质连接，没有五个已命名根子对象 |
| 该 Model 的父级 | `845557070`，`Supraclavicular part of brachial plexus.g`，类型 `Null` |
| loader 中同 ID 对象 | `Roots_of_brachial_plexusr`，13,824 个非索引顶点条目，`groups=[]`；只有 position／normal／uv 属性，无节段命名分组 |
| 本地导出 | 专用脚本直接按上述单一名称取 mesh，应用原 matrixWorld 和 0.01 统一换算；未将多个近端神经对象合并 |

左侧对应也是单一 Model：`750578364`，原名 `Roots of brachial plexus.l`，Geometry `769598294`。这进一步说明合并命名不是右侧导出遗漏。以上计数和层级只证明文件中的身份与对象状态，不证明源解剖形态的临床正确性。

现有 `brachial-roots.json` 导出 SHA-256 为 `d682b44671d16a32f908b67a2626c53cfb2360484839a71c0e4808160b92219d`。此前记录的 7 个位置焊接连通分量没有具名节段身份；本轮未根据它们作分根推断。

## 可真正标在右侧 3D 的干、股、束

以下均在原始 FBX 具有独立 `Mesh` Model ID，并已分别导出到 `public/interscalene/`，本轮未新增或修改。表中英文为原始 FBX 名称，loader 会把空格改为下划线、去掉侧别前的句点。

| 中文名称 | 原始 FBX 名称 | sourceId | 当前结构 id |
| --- | --- | --- | --- |
| 臂丛上干 | `Superior trunk of brachial plexus.r` | `FBX:443613078` | `superior-trunk` |
| 臂丛中干 | `Middle trunk of brachial plexus.r` | `FBX:373690407` | `middle-trunk` |
| 臂丛下干 | `Inferior trunk of brachial plexus.r` | `FBX:208648482` | `inferior-trunk` |
| 上干前股 | `Anterior division of superior trunk of brachial plexus.r` | `FBX:420017778` | `superior-anterior-division` |
| 上干后股 | `Posterior division of superior trunk of brachial plexus.r` | `FBX:350342407` | `superior-posterior-division` |
| 中干前股 | `Anterior division of middle trunk of brachial plexus.r` | `FBX:680798551` | `middle-anterior-division` |
| 中干后股 | `Posterior division of middle trunk of brachial plexus.r` | `FBX:828702681` | `middle-posterior-division` |
| 下干前股 | `Anterior division of inferior trunk of brachial plexus.r` | `FBX:413748403` | `inferior-anterior-division` |
| 下干后股 | `Posterior division of inferior trunk of brachial plexus.r` | `FBX:150925922` | `inferior-posterior-division` |
| 臂丛后束 | `Posterior cord of brachial plexus.r` | `FBX:978614789` | `posterior-cord` |

三干各自的两股在原始 `Connections` 中直接作为对应干的子 Model 存在；该层级可追溯来源，但不等于已验证各表面无缝连接。三干与近端合并网格是同一 `Supraclavicular part…g` 分组的同级对象；没有 C5／C6 子对象可追踪到上干。

## 容易误当成缺失根或束的源对象

| 源对象／分组 | sourceId | 实际可证状态与不能替代的内容 |
| --- | --- | --- |
| `Anterior root of spinal nerve.r` | `FBX:67860681` | 独立但不具节段名的脊神经前根总合对象；不能当作独立 C5–T1 前支。左侧 `922291677`。 |
| `Posterior root of spinal nerve.r` | `FBX:836986210` | 独立但不具节段名的脊神经后根总合对象；不能替代臂丛形成前支。左侧 `64151471`。 |
| `Spinal ganglion.r` | `FBX:352741008` | 具名脊神经节对象，但无 C5–T1 分节身份。左侧 `229509708`。 |
| `Cervical nerves.g` | `FBX:474056423` | Null 分组，子 Model 只有双侧副神经与 `Cervical nerves.j`；未藏有 C5／C6 等独立根。 |
| `Cervical nerves.j` | `FBX:75495990` | 36 个 loader 顶点条目，即 12 个三角形的小型分组辅助对象；没有节段身份，不用于替代具名神经。 |
| `Branches of lateral cord of brachial plexus.g` | `FBX:982881954` | Null 分组，子对象含肌皮神经、胸外侧神经及 `.j` 辅助对象；不代表有外侧束本体 mesh。 |
| `Branches of lateral cord of brachial plexus.j` | `FBX:473797114` | 36 个 loader 顶点条目的辅助对象；不能标成外侧束走行。 |
| `Branches of medial cord of brachial plexus.g` | `FBX:510025546` | Null 分组，包含尺神经、皮神经、胸内侧神经等；不代表有内侧束本体 mesh。 |
| `Branches of medial cord of brachial plexus.j` | `FBX:332154380` | 36 个 loader 顶点条目的辅助对象；不能标成内侧束走行。 |

“脊神经根”“脊神经”“脊神经前支／臂丛根”在此不互相替代。源文件只提供上述对象名时，软件不能自行跨越这个身份缺口。

## 交付边界

当前资源足以增强真实三干、六股和后束的来源标签与选择；尚不足以满足“在椎间孔外逐根辨认 C5–T1、再追踪汇合”的完整 3D 身份需求。要实现后一项，需要另一份带逐根可信身份、可核许可和与相关骨／肌一致坐标的源资产，或由有资质人员基于可追溯来源进行独立分割与审阅。不能通过给合并网格猜色分段、按切面高度自动命名或补造神经线来宣称实现。

本轮仅写本审计文档，源模型、实现及现有 3D 标签均未改动。证据达到问题所需范围后停止，没有继续下载大型模型或检索其他版本。
