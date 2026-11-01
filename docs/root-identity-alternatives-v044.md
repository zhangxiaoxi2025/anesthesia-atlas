# 逐根 C5–T1：替代三维来源的有限核查（v0.4.4）

日期：2026-10-27。范围：只读核查用户指定的两个候选仓库，另查两个机构模型线索；未下载大型几何、未运行候选仓库代码、未购买或联系作者、未改应用代码。

**结论：本轮没有证实可以直接替换当前近端网格、同时满足“C5–T1 五根分别可追溯命名 + 可合法取得并再分发几何”的模型。** UBC 标本三维确有部分根、干、股、束的原作者在线标注，可作为注明范围的原站补充；它不是完整五根替代，也不是可打包素材。AnatomyTOOL Open3DModel 是值得后续核验的机构线索，尚未通过逐根身份和官方下载许可核验。

## 用户两个仓库：当前提交与实际范围

### ashemag/human-atlas

- [固定提交仓库](https://github.com/ashemag/human-atlas/tree/1c38bf35c254a891200d3cedecfd57abebe83d8d)
- [实际 atlas.json](https://github.com/ashemag/human-atlas/blob/1c38bf35c254a891200d3cedecfd57abebe83d8d/public/models/atlas.json)
- [数据署名与来源](https://github.com/ashemag/human-atlas/blob/1c38bf35c254a891200d3cedecfd57abebe83d8d/public/ATTRIBUTION.md)
- [代码 MIT 许可](https://github.com/ashemag/human-atlas/blob/1c38bf35c254a891200d3cedecfd57abebe83d8d/LICENSE)

本轮官方 GitHub API 核得 main 仍为上述 commit，递归树完整。实际读取1,335,285 B模型清单，SHA-256为 `c359f4bcd2cba90b7411d66d5e9fc04dc81294d46cd5c1e8b212c824f2e5bbee`，含2,234 parts与3,432 concepts。

parts/concepts 没有臂丛、脊神经前支、颈神经或上/中/下干与内/外束的匹配身份，也没有正中、尺、桡、肌皮神经。出现的第五、第六、第七颈部结构是椎骨/椎间盘等，不能当作对应神经。concept中的“root of nose”也不是神经根。故该版本不能提供本轮需要的五根；只读README宣称可搜索解剖概念并不足以补足几何。

代码 MIT 与 BodyParts3D 数据 CC BY 4.0 是不同层面的许可；本轮未下载约33MB压缩几何，因为清单身份已不足。

### TUANZIDING/orthopaedic-trauma-atlas

- [本轮固定提交](https://github.com/TUANZIDING/orthopaedic-trauma-atlas/tree/dad981475c652161c9c42bab243401343b1ca33b)
- [README 模块范围](https://github.com/TUANZIDING/orthopaedic-trauma-atlas/blob/dad981475c652161c9c42bab243401343b1ca33b/README.md)
- [根署名文件](https://github.com/TUANZIDING/orthopaedic-trauma-atlas/blob/dad981475c652161c9c42bab243401343b1ca33b/ATTRIBUTION.md)
- [颅骨牵引模块署名](https://github.com/TUANZIDING/orthopaedic-trauma-atlas/blob/dad981475c652161c9c42bab243401343b1ca33b/neurovascular-v2/cranial-traction/ATTRIBUTION.md)
- [代码/数据许可区分](https://github.com/TUANZIDING/orthopaedic-trauma-atlas/blob/dad981475c652161c9c42bab243401343b1ca33b/LICENSE)

本轮官方 API 核得上述 main commit及完整文件树。模块以骨科操作和筋膜室教学为主，没有证实独立C5–T1原始网格。更关键的是，颅骨牵引的来源说明明确把新增神经、脊髓和浅颞动脉归为原创示意几何，而非患者分割或可验证逐根神经源资产。其基础解剖来源仍指向相同 human-atlas/BodyParts3D 链，不能把示意风险线升级为真实逐根替代。

原应用代码MIT，来源数据与图示改编另保留CC BY4.0；许可允许某些复用并不证明模型满足逐根身份或椎间孔关系准确性。没有下载/执行其模型或将其示意神经接入本工具。

## 额外机构模型候选（2项）

| 候选 | 本轮实际证实 | 未证实/限制 | 适用决定 |
|---|---|---|---|
| [AnatomyTOOL Open3DModel](https://anatomytool.org/open3dmodel)、[学习入口](https://anatomytool.org/open3dmodel-learn) | 可定位官方项目入口，是高校解剖团队的来源线索。 | 主站本轮Web请求502、独立小网页请求SSL EOF，未成功读到作者发布版的逐根结构清单、下载记录和完整资产许可。第三方转发模型的说明不能代替官方逐根身份核验。 | **待证实**。未认定其有独立C5–T1，更未认定已取得可打包几何。下一步若继续，应只先取得官方版本/清单/许可。 |
| [UBC Clinical Anatomy 标本三维](https://www.clinicalanatomy.ca/upperlimb/brachialplexus3D.html)、[官方Sketchfab模型](https://sketchfab.com/3d-models/brachial-plexus-932dbecba80541ce9168cef085fc15fa)、[官方embed](https://sketchfab.com/models/932dbecba80541ce9168cef085fc15fa/embed) | 官方公开metadata归属UBC Faculty of Medicine / HIVE，Claudia Krebs、Ishan Dixit、Connor Dunne；塑化解剖标本，Artec扫描。embed页面公开教学metadata确有20个annotations。 | 下载开关false；许可对象为空，没有本工具复制/再分发几何的许可。annotations只独立标C5、C6，并非五根齐全。未确认其提供可独立选择的分割神经网格、椎间孔全部关系或与当前模型配准。 | 可作为**原站在线补充参考**，明确部分根/干/股/束范围；不作为离线模型、不宣称完整五根或本工具逐根功能已经完成。官方嵌入的运行与平台条款仍需接入前核查，本轮只核文本，没有实施iframe。 |

### UBC annotations 的最后核查

本轮访问 [Sketchfab 官方公开模型 API](https://api.sketchfab.com/v3/models/932dbecba80541ce9168cef085fc15fa)，得到：

- `isDownloadable: false`
- `license: {}`
- 作者账户 `ubcmedvid`，显示UBC Faculty of Medicine。
- 来源描述包含HIVE团队及上述标本扫描信息。

猜测的独立 annotations API 路径返回404，不能据此判定“没有标注”。随后读取官方embed HTML（132,831 B），在页面自身隐藏的公开 `js-dom-data-prefetched-data` HTML注释JSON中成功定位20个原作者annotations，没有获取模型几何：

- **独立标注已证实**：C5根、C6根；上干、下干；上干前股、中干前股；后束、外侧束、内侧束，以及部分末支和血管。
- **独立标注未出现**：C7根、C8根、T1根；中干，以及其它四股的完整逐项标注。
- C8/T1在下干文字说明中被提及，不能因此称为两根各有独立三维定位。
- 本次只核页面作者给出的名称/metadata，不把文字热点等同于独立网格，也不把可观看等同于可复制许可。没有将20段说明复制进产品。

因此“原作者在线三维有C5/C6与部分干股束”可以成立；“已有逐根C5–T1完整可下载模型”不成立。

## 与当前源缺口的关系

当前固定Z-Anatomy的原始Objects/Connections核查由并行源审计完成，见 `docs/root-identity-source-audit-v044.md`：近端在原FBX即为一个合并Mesh，未找到逐根C5–T1身份，不能归因于本地导入将独立根误合并。已知三干、六股、后束与近端合并网格的来源身份，不能外推成五根与三束都具备。

本轮停止于上述有限证据，不继续泛搜，不从网格连通分量、椎骨高度或外观猜根编号，不用概念图冒充已实现的源三维逐根标注。未向用户宣称全球不存在其它模型；未证实的是本次候选满足当前完整需求。

