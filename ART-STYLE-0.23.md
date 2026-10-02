# 0.23 暖色绘本画风统一

完成日期：2026-09-12。最终内部候选 `0.23.0 / 3b171501dacd`。本次统一美术，没有调整经营规则或 v14 存档结构。

## 内容

- 四张 1536×1024 原创项目 AI 插画：世界地图、柳溪镇、松湾港、金穗城；统一水粉绘本质感、暖光与绿/青/赭色系，保留旧素材。
- `art.js` 的主角新增圆顶帽、围巾、面部与服装细节；马车、道具、营地统一轻量渐变光照，重复图标的渐变引用各自独立。地图与旅行复用同一主角马车。
- 世界地图使用插画地形，真实城镇坐标、可点击入口、路线和马车动画由代码叠加。旅行城镇缩略图也复用新版背景。
- `styles.css` 调整任务条和马车位置，修复主角被遮挡以及帽子被裁切；增加地图标题、导航和标签对比度。
- `desktop/policy.cjs`、`serve.cjs` 接入本地资源白名单，`desktop/build.cjs` 随包附带完整提示词。原有程序图标同步本地渲染，版本号更新到 0.23.0。

## 实际检查

- `node --test tests/*.test.cjs`：209/209 通过，日志 `work/tests-art-023.txt`。
- `node --check art.js`、`node --check app.js`：通过。
- `node work/art-style-check-023.cjs`：1280 与 400 宽度检查通过，四图加载、交易扣款、渐变引用与真实马车动画正常，没有页面脚本异常。已查看地图、城镇、市场和旅行截图。窄屏虽可操作，但地图仍按现有布局压缩，正式支持目标为 Windows 桌面。
- `node work/title-check-023.cjs` 及带最终构建路径的同命令：浏览器与实际桌面包的开始菜单、六天赋、旧存档迁移、新旅途备份恢复、交易和关闭续玩通过。
- `node work/art-native-023.cjs`：最终桌面包四图离线加载、主角与任务条不相交、地图和城镇截图检查通过。
- 初次美术检查遇到图片尚未生成、图标尚未重渲染和测试字符串小数格式不符；均已解决。一次界面检查因购买后第一次 Esc 只取消选中而超时，改用实际“返回地图”按钮后通过，未修改游戏既有键盘行为。
- `node desktop/build.cjs`：最终构建成功，97 文件。
- `node desktop/audit-runtime.cjs output/LittleCaravan-0.23.0-win-x64-3b171501dacd`：运行环境来源与包内文件校验通过，分发许可审核仍未完成。
- PowerShell 执行 `work/package-playtest-023.ps1`：ZIP 102 文件逐个读回校验通过，未包含制作者存档，也未上传。

## 交付

- Windows 程序：`output/LittleCaravan-0.23.0-win-x64-3b171501dacd/LittleCaravan.exe`。
- ZIP：`output/LittleCaravan-0.23.0-Windows-Playtest-20260912-114217.zip`，177,387,208 字节。
- SHA256：`93941743ec7b542ec05f8213194a5335878c82bae2dab090d7ebee8ed4d0eb12`。
- 截图：`output/playwright/art-023-native-map.png`、`art-023-native-town.png`、`art-023-market-1280.png`。
- 来源与完整提示词：`assets/SOURCES.md`、`assets/ART-PROMPTS-023.md`。使用内置 image_gen；无外部素材下载、新增依赖或运行时 AI。

新增代码沿用项目 MIT，生成图片并不因软件许可证而自动获得独占版权证明。仍需披露预生成 AI 美术。已有 FFmpeg 对应源码/补丁/Windows 构建资料等分发材料缺口尚未解决；本次美术更新与打包不代表已经达到正式上架标准。旧版本、旧视频和旧存档保留，本次没有续做已取消的视频转换。
