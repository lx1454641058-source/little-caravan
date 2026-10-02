# 0.17 运行环境来源核验

日期：2026-09-11。对象：`output/LittleCaravan-0.17.0-win-x64-d45dcb037f18/`。本轮完成文件来源与版本追溯，**没有完成全部再分发义务，不作为上架许可通过证明**。游戏程序、存档及既有试玩压缩包没有改变。

## 已核对的实际文件

新增 `desktop/audit-runtime.cjs`，只读检查候选目录和已安装运行环境，输出 `licensing/runtime-0.17.0-d45dcb037f18.json`：

- 94 个清单文件均存在，长度及 SHA256（文件内容指纹）一致，目录没有未登记的额外文件。
- 71 个运行环境文件与 `node_modules/electron/dist` 逐字节一致，包括 `LICENSE`、`LICENSES.chromium.html`、`ffmpeg.dll`、DirectX 与 Vulkan 库及语言文件。
- `LittleCaravan.exe` 来自 electron.exe，曾由项目构建工具改名并写入图标/版本资源，已单列为修改文件，未称其与官方程序逐字节相同。
- 项目包内文件和生成的启动说明单独归类；没有用 Electron 的 MIT 许可覆盖所有内容。
- 完整声明解析为 780 个条目。45 个条目包含需继续人工核对的 LGPL/MPL 等文字信号，**不等于 45 个实际链接组件，更不代表这些条目已判定采用该许可**。跨平台汇总、双许可、其他软件转引都需要进一步判断。

所有运行环境比较以本机已安装副本为参照。它证明本次打包没有漏拷或改写上述文件，不替代独立核验上游二进制来源。没有删减官方许可汇总来隐藏多平台条目。

## 固定源码追溯

读取官方 GitHub API 的文件内容，分别重算 Git blob 标识和 SHA256，与 API 返回值一致。可复核记录：`licensing/upstream-0.17.json`。

| 层级 | 实际证据 | 结论与范围 |
| --- | --- | --- |
| Electron | [v44.3.0 DEPS](https://github.com/electron/electron/blob/v44.3.0/DEPS) | 指定 Chromium 152.0.7977.78、Node v24.20.0，与前期实机版本记录一致 |
| Chromium | [152.0.7977.78 DEPS](https://github.com/chromium/chromium/blob/152.0.7977.78/DEPS) | FFmpeg 固定为 `2b68d2babae73714846961fb0ee47e3b3d2e39a9`；SwiftShader 固定为 `5b0479bd2d15058aaa9eb490e364f920ff824a8c` |
| Electron 对 FFmpeg 的补丁 | [补丁目录](https://github.com/electron/electron/tree/v44.3.0/patches/ffmpeg)及目录内 link_with_loader_path.patch | 目录列出补丁顺序文件与一份补丁；所见差异修改 macOS 条件内的链接参数，不能据此证明 Windows 的完整编译配置 |
| 构建默认值 | [all.gn](https://github.com/electron/electron/blob/v44.3.0/build/args/all.gn) | 含 Chrome 品牌与专有编解码器开关；不是启用/禁用 GPL 的完整证据 |

原始读取文件在 `work/license-upstream-017/`，不复制到游戏资源。首轮直接请求部分超时，后续官方 GitHub API 成功；没有将超时当作文件不存在。FFmpeg 官方源码站的配置与 README 页面被浏览工具 URL 策略拒绝，未绕过该拒绝；没有声称已读取这两个文件。

## 发行前还需完成

FFmpeg 官方建议核对二进制所对应的源码、构建方式及向接收者提供源码的方式；仅保存许可文本和一个上游首页不能作为本项目完成这些工作的证据。[FFmpeg 官方说明](https://www.ffmpeg.org/legal.html)

MPL 涉及实际覆盖文件及源码获取告知；转发完整程序与只分发部分库的情况可能不同。需要按本包实际组成检查，不能从词语出现次数判断义务已履行。[Mozilla 官方 FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)

下一步可直接沿固定版本追溯：取得对应 FFmpeg 源码及构建配置；逐项明确实际 Windows 组成、其他覆盖源码的获取方式与告知；准备与二进制匹配的本地源码材料并验证接收者可取得。当前未准备完整对应源码包，未验证重新链接或替换兼容性，也未上传或发布源码。T09/G5 继续开放。

## 执行与许可证

实际执行：`node --check desktop/audit-runtime.cjs` 和 `node desktop/audit-runtime.cjs output/LittleCaravan-0.17.0-win-x64-d45dcb037f18`，均成功；`node work/record-license-sources-017.cjs` 的三个 Git blob 内容校验成功。当前轮不修改游戏逻辑，未重跑或冒称新增游戏测试；0.17 的游戏验证仍见 POTTERY-0.17.md。

审计工具为项目原创 MIT，无新增依赖、安装、素材或费用。记录索引不取代上游原文，也不改变原组件许可。本次提供可核对的技术事实，未代替发行人作权利声明。
