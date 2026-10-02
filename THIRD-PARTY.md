# 第三方运行环境与开发依赖

更新：2026-09-10。本文件记录实际来源及检查范围，不替代各组件原始许可证。

游戏规则、界面、桌面桥和构建脚本为本项目原创实现，沿用根目录 MIT。浏览器版本没有第三方运行库；Windows 桌面包新增官方 Electron 44.3.0。

## Electron

- npm 来源：`https://registry.npmjs.org/electron`，版本固定为 44.3.0，npm 完整性校验值保存在 `package-lock.json`。
- Windows 二进制：[官方 v44.3.0 发布](https://github.com/electron/electron/releases/tag/v44.3.0)。压缩包已核对官方 npm 包内 SHA256。
- Electron 本体：[MIT 原文](https://github.com/electron/electron/blob/v44.3.0/LICENSE)。发行包根目录保留官方 `LICENSE`，项目自身的 MIT 在 `resources/app/LICENSE`。
- Chromium、Node.js、FFmpeg 等运行时组件的原始声明完整保留在包内 `LICENSES.chromium.html`；它们并非全部采用 MIT，不将 Electron 的 MIT 声明扩大到所有内置组件。

已检查告知文件中的 GPL 关键词不能直接当作采用 GPL 的证据。例如 Checker Qual 条目明确将 annotations/utility 列为 MIT，JSZip 提供 MIT 或 GPLv3 双许可，本项目选择 MIT；部分 MPL 文本提及 GPL 是条款中的可选次级许可，不代表已选择 GPL。没有引入外部 GPL/AGPL 素材包或业务代码。

运行环境包含多平台汇总声明及 LGPL/MPL 等条款，正式分发前仍需核对 Windows 实际组成、对应源码与再分发义务。这项检查留在主计划 T09/G5，不能仅凭关键词扫描或“保留声明”宣称完整发行合规已完成。目前仅构建本地测试候选，未对外上传。

## npm 开发依赖检查

### 0.13.1 对应版本证据

实际桌面程序报告 Chromium 152.0.7977.78、Node.js 24.20.0，与 [Electron v44.3.0 的 DEPS](https://github.com/electron/electron/blob/v44.3.0/DEPS) 一致。[该版本构建默认值](https://github.com/electron/electron/blob/v44.3.0/build/args/all.gn) 包含 `ffmpeg_branding = "Chrome"` 与 `proprietary_codecs = true`；这不是 FFmpeg 的 GPL 开关证明，也不能替代 Windows 二进制的完整配置核对。[FFmpeg 官方许可说明](https://www.ffmpeg.org/legal.html) 指出基础许可与可选组件的区别及源码分发要求。具体对应源码、补丁、构建配置及再分发履行仍待核验，不将上游链接视为本项目已完成这些义务。

0.13.1 在「关于与制作」提供离线原始运行环境声明入口；仅加本地阅读样式，包内 `LICENSES.chromium.html` 保持官方原文。新增程序图标和 Windows 元数据工具为项目原创 MIT 代码，使用系统 API 与已有 Electron，无新增依赖。当前 exe 未进行发布者代码签名，未宣称具备数字签名。

本轮安装了 13 个包；版本、来源与完整性由锁文件固定。它们用于取得运行环境，`node_modules` 不复制到玩家的 `resources/app`。

| 包 | 已安装版本 | 包声明许可证 |
| --- | --- | --- |
| electron | 44.3.0 | MIT |
| @electron/get | 5.1.0 | MIT |
| @electron-internal/extract-zip | 1.0.5 | BSD-2-Clause |
| @types/node | 24.13.4 | MIT |
| debug | 4.4.3 | MIT |
| env-paths | 3.0.0 | MIT |
| graceful-fs | 4.2.11 | ISC |
| ms | 2.1.3 | MIT |
| progress | 2.0.3 | MIT |
| semver | 7.8.5 | ISC |
| sumchecker | 3.0.1 | Apache-2.0 |
| undici | 7.29.1 | MIT |
| undici-types | 7.18.2 | MIT |

本地桌面验证使用 Codex 工作环境已提供的 Playwright，没有将其添加到发行包。未新增第三方字体、音乐或图像资源；原有 AI 生成插画和代码图形来源见 `assets/SOURCES.md`。
