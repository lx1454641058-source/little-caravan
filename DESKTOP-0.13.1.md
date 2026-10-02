# 0.13.1 桌面识别与声明

2026-09-10。内部桌面候选，尚未达到 Steam 提审标准。朋友首次试玩继续使用 `PLAYTEST.md` 指定的 0.13.0 压缩包，避免混用版本。0.13.1 的玩法与 v10 存档结构保持原样。

## 完成内容

- `desktop/branding.cjs`、`render-icon.cjs` 与 `assets/caravan-icon.*`：用原有马车图形制作七尺寸 Windows 图标，无新增素材服务或依赖。
- `desktop/stamp-windows.ps1`、`build.cjs`：仅向新建候选中的 exe 写入图标、中文名称与版本，已有清单的候选拒绝改写。构建编号纳入工具与运行环境内容，包内保留具体构建信息。
- 桌面桥、`app.js`、`styles.css`：关于与制作页面显示版本及构建编号；完整运行环境声明可离线打开，使用本地阅读样式而不修改声明原文。声明窗口没有游戏桌面操作接口。
- 品牌、桌面及展示测试：验证图标结构、版本字段、声明地址边界及关于页面异步返回不会覆盖后来打开的页面。
- `THIRD-PARTY.md`、`assets/SOURCES.md`：记录来源、对应运行环境版本及尚未完成的许可核验。

候选：`output/LittleCaravan-0.13.1-win-x64-d9b386814a0f/`，清单 92 个文件、389,151,144 字节（清单自身另计）。运行环境 Electron 44.3.0 / Chromium 152.0.7977.78 / Node.js 24.20.0。

## 已执行验证

```powershell
npm test
npm run build:win
node work/desktop-branding-0131.cjs output/LittleCaravan-0.13.1-win-x64-d9b386814a0f
node work/desktop-regression-0131.cjs output/LittleCaravan-0.13.1-win-x64-d9b386814a0f
```

13 个测试文件共 160 项通过、0 失败。12 个运行/构建 JavaScript 文件通过 `node --check`，PowerShell 解析器检查通过，资源写入工具已在真实构建中执行。日志为 `work/tests-branding-0131.txt`。

实际 Windows 程序验证：关于信息与构建相符，制作声明可展开，声明完整且可离线阅读，重复打开声明复用窗口；第二次启动退出并恢复原窗口，进度字节不变。记录为 `work/desktop-branding-0131.json`。exe 的七幅图标资源与原素材一致，Windows `System.Drawing.Icon.ExtractAssociatedIcon` 实际提取到游戏图标，结果为 `work/native-extracted-icon.png`；Electron 的 `getFileIcon` 截图返回通用图标，未用该截图证明外壳显示正确。

桌面回归包括买卖、旅行、寻访、F11、两种分辨率、音量与动态设置、导出真实文件、导入预览/取消/确认/坏文件保护及退出续玩；92 个文件大小和 SHA256 全部匹配，普通流程页面错误记录为空。记录为 `work/desktop-qa-0131.json`。全部采用独立工作区进度，未修改玩家浏览器或默认桌面存档。系统文件选择器由测试指定路径，不能等同人工点击验收。

最初构建调用旧版 Windows PowerShell 时受其脚本执行策略阻止；构建工具改用本机已配置的 PowerShell 7 后通过，没有修改执行策略。失败候选原样保留，未向其中补写成品。构建仍要求已有 PowerShell 7；玩家运行不需要它。

## 尚未完成

真实玩家是否愿意继续玩、干净电脑与更多硬件、系统文件对话框人工操作、商店展示素材、运行环境正式分发义务及 Steam 账户/提审条件仍待完成。新增实现沿用项目 MIT，无新增第三方依赖；保留声明不等于全部许可义务已核验。exe 未进行发布者代码签名。未上传或发布。
