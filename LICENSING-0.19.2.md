# 0.19.2 对应源码附件补充

2026-09-11。本轮已取得并整理三份既有 Chromium 组件目录，共 18 个源文件、许可证和元数据文件。它们在固定 Chromium 152.0.7977.78 的 README 中均标记随软件分发：

| 组件 | 目录 | 本次采用的许可 |
| --- | --- | --- |
| NSPR 时间解析代码 | `base/third_party/nspr` | MPL-2.0 |
| URL 解析代码 | `url/third_party/mozilla` | BSD-3-Clause、MPL-1.1 |
| Windows 辅助功能接口 ISimpleDOM | `third_party/isimpledom` | MPL-1.1 |

本次取得的是 Chromium 实际使用的改写文件，而非早期上游原始版本。逐文件验证官方 GitHub API 的 Git blob、字节数和 SHA256；读取了两个相关构建声明，原始记录在 `work/license-components-1789114587816/fetch-report.json`。具体官方 URL 随每个文件记录保存。

复用已核验的 Electron 44.3.0 完整 182 个 Chromium 补丁的路径记录，并重新核对其官方源码归档的 SHA256；没有补丁修改上述三个组件目录。`base/BUILD.gn` 有一份 macOS 相关补丁，已在报告列出，未宣称整个构建目录无修改。三个组件 LICENSE 与当前候选的相应声明逐一一致，比较仅忽略换行及首尾空白。README 的 Shipped 标记和构建声明不是独立二进制链接清单。

本地附件：[Chromium-covered-source-0192-1789115051781.zip](output/Chromium-covered-source-0192-1789115051781.zip)，2,716,853 字节，SHA256：`ed29ba8830ce09c5dbbe0a66f4c9a35c2cef73da28a3e90dec2fe7194cbb755d`。包含 18 份原文件、完整原始 `LICENSES.chromium.html`、范围说明和来源记录，共 21 项。完整声明保留 Chromium 的 BSD 告知及其他原始许可；其汇总范围大于本附件的三个组件，不能据此声称已覆盖全部组件源码。

18 份源文件在 ZIP 中逐项读回核对通过。核对记录：[covered-source-0.19.2.json](licensing/covered-source-0.19.2.json)。旧附件与旧候选未覆盖；此前 Mozilla Windows Cert code 的附件仍见 [LICENSING-0.19.1.md](LICENSING-0.19.1.md)。现在共有四个组件的本地源码附件，不是整体许可完成率。

实际执行 `pwsh -NoProfile -NonInteractive -File work/fetch-license-components-0192.ps1`，官方只读网络请求经自动审批后成功；随后执行 `pwsh -NoProfile -NonInteractive -File work/package-license-components-0192.ps1`，附件与记录生成、源文件读回通过。脚本最初输出摘要对 PowerShell 字典直接使用 Select-Object，导致终端摘要显示 null；实际 JSON 记录和附件正确。已修正摘要的对象转换，未重新打包或覆盖原记录。

收集和打包工具为原创 MIT；上游文件保留各自许可，未改为游戏 MIT。原头部的可选 GPL/LGPL 文本保留，本附件选择 MPL 路径。这是为既有运行组件准备源码，不是新增游戏依赖，没有升级依赖、下载执行代码、访问受限 FFmpeg 页面或对外发布。

**剩余实际发行事项仍包括 FFmpeg 对应源码及构建配置、其他适用组件的义务，以及最终接收者获取方式。** 本次附件未合并覆盖上一份本地发行草稿，也未上传；下一次组装最终发行材料时一并附带。首发范围与步骤以 [STEAM-FIRST-RELEASE.md](STEAM-FIRST-RELEASE.md) 为准，不因本次取得附件就标记可发售。
