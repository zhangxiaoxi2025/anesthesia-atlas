# v0.4.4 中干近端候选走行：源面掩膜与工程核验

本轮按照已批准的第一条候选审阅试点，建立一份静态源面掩膜与只读高亮 helper。没有修改模型、源名称或当前 manifest，没有移动／焊接／补线，没有赋予任何神经节段身份，也没有完成骨性出口或临床专家审阅。

## 候选及精确来源

候选名称：**中干近端候选走行**；`identityStatus=unconfirmed`、`reviewStatus=unreviewed`。临时审计 G5 只表示按最高源 Y 降序排列的第 5 个精确位置连通分量，不是临床名称。

- 固定来源：`LluisV/Z-Anatomy@6c7f9016bd5899ac8edafd31b9900c151df42ed6`。
- 近端源：`brachial-roots`，`FBX:680949521`，2,388 个位置、4,608 个三角形。
- 参考中干：`middle-trunk`，`FBX:373690407`，156 个位置、288 个三角形。
- 掩膜：当前原始提取文件 `public/interscalene/brachial-roots.json` 中 **从 0 开始的三角面序号 1440–2015，共 576 面**；候选 JSON 显式保存所有序号，不依据运行时上下顺序猜选。
- 被这些面引用的源位置共 300 个；原始位置和法线数组保持不变。
- bounds（m）：min `[-0.05283565,1.44044316,-0.02731237]`；max `[-0.01520662,1.45868957,-0.01861129]`。

面序号的含义是已固定、可校验的源提取 JSON 中第 t 个三角形，即 `indices[3*t..3*t+2]`，不是新建神经的顶点序列，也不是原始 FBX 全文件的全局多边形编号。每个被选面的索引和位置直接来自该文件。

## 摘要验证分为两种

原文件 SHA-256 用于来源追溯：

```text
brachial-roots.json
d682b44671d16a32f908b67a2626c53cfb2360484839a71c0e4808160b92219d

middle-trunk.json
7d69f6804344bdada9848f75d81aa754e5339bea1adfc1d88cdc91e262ec45ae
```

为避免 HTTP／离线加载对象重序列化时的空白、键顺序或尾换行影响，另定义实际缓冲规范摘要。算法为：

```js
SHA256(UTF8(JSON.stringify({
  positions: geometry.positions,
  indices: geometry.indices,
  normals: geometry.normals ?? null
})))
```

键按上面固定顺序，无额外空白或尾换行；读取真实 positions／indices／normals，忽略对象本身的属性排列顺序。原文件摘要与该规范摘要不混用。固定规范 SHA-256：

```text
brachial-roots
4341375d808b1c9d9d6d7512f655cf475d1f6c77e8d43465bed72f955d642b57

middle-trunk
fd784ff275bf1448879eb32af67593d9304b29bb07a12a27d99008f8cea3a4a2
```

## Helper 与界面契约

实现：`src/root-annotation.js`；静态记录：`src/data/root-annotation-candidate.json`。

```js
import {
  ROOT_ANNOTATION_CANDIDATE,
  buildRootCandidateOverlay,
  verifyRootCandidateSource,
} from '../root-annotation.js';

const checked = await verifyRootCandidateSource(anatomy);
if (checked.ok) {
  const overlay = buildRootCandidateOverlay(anatomy);
  // overlay.status === 'ready' 才可使用 geometry；
  // 这一高亮仍是候选，不代表神经节段身份已核定。
}
```

`buildRootCandidateOverlay()` 同步检查源提交、源 ID、manifest 原文件摘要、全部缓冲计数／索引合法性、候选面序号的唯一有序性、候选引用位置数、真实 bounds 和采样点记录。失败返回 `status:'unavailable'`、`code`、中文 `reason`，不返回 geometry。成功只说明结构和元数据符合记录；`audit.hashVerification` 明示此时实际缓冲尚未完成异步摘要验证。

`verifyRootCandidateSource()` 对实际近端和实际中干缓冲分别计算规范 SHA-256；两者全部匹配才返回 `ok:true`。缺少 SHA API、摘要失败、来源不匹配、缓冲改变均为 `ok:false`，不得因此显示“验证通过”的候选高亮。界面需等待实际验证结果，并在载入对象切换时撤销旧结果。

高亮 geometry 的 positions／normals 是原数组引用，indices 是从原面序号读取出的新索引数组；源数组不改写、不压缩、不焊接。**缓冲仍保留全部 2,388 个源位置，真正绘制的只有 576 个原面。**需要候选聚焦时应使用返回的 `bounds`；直接对全 position 缓冲计算包围盒，会包含未引用的其他近端分量。

## 中干邻接记录的含义

对候选引用位置与中干原位置穷举最小采样顶点距离：

```text
候选源顶点索引 1034：[-0.05266478,1.44288850,-0.02491661] m
中干源顶点索引    4：[-0.05270896,1.44296229,-0.02504045] m
距离：0.1507752701871586 mm
```

它只记录两个真实采样点，不能解释成已确认汇合、精确表面间距、纤维连续或已识别的神经节段。当前候选的骨性出口、跨视图身份依据、变异解释和专家复核仍未完成。真正中干保持原始中干身份，候选不改写其名称。

## 本轮实际测试

命令：`node --test tests/root-annotation.test.mjs`，**7／7 通过**。

- 使用独立广度优先邻接图遍历重算 7 个精确位置连通分量，核对静态面集合恰好是原 G5，所有面只出现一次。
- 冻结源数组后仍可提取与摘要验证；源位置、法线和索引逐项摘要不变；重复提取确定且不会共用新建 indices。
- 原文件摘要和规范摘要分别核对；对象属性重排仍可正确验证，真实缓冲改变则失败。
- 独立穷举候选与中干全部位置，重现保存的最近点对；同时核对身份状态仍未确认，没有根名字段。
- 缺源、错误源 ID／提交／摘要、缺少摘要、面序号越界／重复、计数／bounds／采样点错误均拒绝返回候选。
- 实际源或中干缓冲改变但伪保留 manifest 摘要／数量时，异步实际摘要仍拒绝。
- SHA API 不支持或调用失败均明确失败，不能假通过。

这些是面集合、源完整性和计算逻辑的工程核验，不是临床解剖身份核验。UI 布局、点击交互、实际离线装载与跨视图视觉呈现由集成验收另行记录。
