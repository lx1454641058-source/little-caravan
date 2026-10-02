# 0.19.1 Windows 证书组件源码附件

2026-09-11。完成一个实际运行环境组件的源码追溯及本地附件准备，整体分发许可仍未通过。游戏、已有候选包、玩家进度及商店材料未改动。

## 查明的区别

当前候选声明中的 **Mozilla Windows Cert code** 来自 Chromium 的 `net/third_party/mozilla_win`。固定版本 README 将其列为 MPL-2.0、随软件分发，并说明为适配 Chromium 做过较大改写。因此，原声明链接指向的 Mozilla 上游文件，不能单独替代 Chromium 实际改写后的源码。

已读取 [Chromium 152.0.7977.78 的组件元数据](https://api.github.com/repos/chromium/chromium/contents/net/third_party/mozilla_win/README.chromium?ref=152.0.7977.78) 与该目录全部文件。Mozilla 原始修订为 `0fec57c05d3996cc00c55a66f20dd5793a9bfb5d`；本次提供的是 Chromium 固定版本下的两份代码文件和五份许可、来源等配套文件，没有拿上游原始文件替换改写文件。

[Mozilla 官方 FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) 区分完整程序转发与部分库分发，并要求核对接收者能取得受覆盖源码及相应告知。本次只完成本地附件，没有配置或发布接收者下载渠道，也不代替完整许可判断。

## 实际来源与检查

- 官方 GitHub API 递归读取组件目录七个文件及 `net/BUILD.gn`；逐项验证字节数、Git blob 标识和 SHA256。原始记录 `work/mozilla-source-1789112024705/fetch-report.json`。
- 构建声明的 Windows 条件中列出 `win_util.cc`、`win_util.h`；这证明源码选择规则，不等于取得最终二进制的链接清单。
- 从既有 Electron v44.3.0 发布记录指定的官方归档入口下载源码，21,304,419 字节；SHA256 `7700233d0d269e8a535a99a2ba0853153c7dce0a2d7ff3048615fe58f5f3a65f`。只是读取，没有安装、构建或执行上游源码。
- 归档 DEPS 和补丁配置与此前固定版本 API 内容相同。完整核对 182 个 Chromium 补丁及其顺序清单，解析修改路径；没有补丁修改本组件目录或 `net/BUILD.gn`。
- 组件源码 LICENSE 与当前游戏完整声明中的对应条目一致，比较时只忽略换行差异和首尾空白。原许可证与代码内声明全部保留。

完整证据及补丁路径列表：[mozilla-win-0.19.1.json](licensing/mozilla-win-0.19.1.json)。本地附件：[源码 ZIP](output/Mozilla-Windows-Cert-source-152.0.7977.78-1789112209786.zip)，9,471 字节，SHA256 `ccc82c324dad38fb9534534510d7501913439aa990309771f65cfa24d705ab1a`。归档含七份原组件文件及一份范围说明；实际读回七份来源文件，字节数及内容指纹一致。

## 执行与范围

实际执行 `pwsh -NoProfile -NonInteractive -File work/fetch-mozilla-source-0191.ps1` 和 `pwsh -NoProfile -NonInteractive -File work/package-mozilla-source-0191.ps1`。首次普通网络请求受沙箱限制，留下失败记录；只读网络请求经自动审批后成功。源码收集、补丁核对和归档读回通过。未改游戏，无需重跑玩法测试。

本项目新增收集和打包脚本为原创 MIT；附件中的第三方代码保持 **MPL-2.0**，不套用游戏 MIT。它是既有运行组件的源码材料，没有引入新的游戏依赖。没有访问此前被拒绝的 FFmpeg 页面，也没有通过这份 Electron 归档获取其替代副本。

## 仍未完成

这份附件只覆盖 Mozilla Windows Cert code。FFmpeg 对应源码与配置、其他实际组件的覆盖源码和告知、接收者取得材料的渠道，仍需完成。附件未上传、外发或并入发行候选；本机准备不等于发布许可已通过。此前文档中的“所有对应源码均未取得”类概括应按本项证据细化，但不能据此关闭 T09/G5。
