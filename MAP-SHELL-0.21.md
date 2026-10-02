# 0.21 地图首页与独立操作页

按用户要求，移除首页右侧常驻操作台与下方成长、收藏、手记面板；地图成为默认首页。

## 交互

- 点其他城镇：打开准备出发页面，选择路线并确认出发。点当前城镇或右上入口：进入当地场景，场景热点继续可用。
- 地图底部六个图标分别打开行囊、集市、委托、营地、旅程、设置。每次只展示一个操作页；地图不再与操作页并排。
- 原下方引导、商队升级、挑战、章节与收藏入口收进旅程页；声音、动态效果、存档等收进设置页。手记从地图按钮打开。
- 操作页提供置顶的“返回地图”，Esc 也可返回；整理行囊时首次 Esc 先取消物品选择，避免误退出。游戏对话框与挑战继续使用原有 Esc 规则。
- 抵达后回到地图；新启动也进入地图。页签切换不提交存档，不改变金币或天数。保存异常仍直接显示在地图上。

## 文件与来源

修改 app.js、styles.css、art.js、tests/presentation.test.cjs、package.json、package-lock.json 与 assets/SOURCES.md。地图布局、齿轮和书本图标为本项目原创 MIT 代码；插画复用既有来源，无新增依赖、视频、下载或 AI 运行时费用。保存格式仍为 v13，经营规则未修改。

## 实际验证

- `node --check app.js`：通过。
- `node --test tests/*.test.cjs`：200 项通过，0 失败。报告 `work/tests-map-shell-021.txt`。新增地图首页、只导航不修改存档、目的地跳转及无效入口保护测试。原城镇收藏测试改为先进入城镇再检查城镇提示；初次失败日志保留于 `work/tests-map-shell-021-initial.txt`。
- `node work/map-shell-check.cjs`：独立 Edge 浏览器在 1280、840、400 像素宽度验证六个操作页仅一个可见、地图与操作页不同时显示、返回、城镇进入、目的地预选、Esc、无横向溢出及导航不改变存档。页面错误为空。报告 `work/map-shell-check-021.json`；已查看 `output/playwright/map-shell-1280-021.png`、`map-shell-400-021.png`、`map-shell-market-021.png`，发现并修复手机顶部信息遮挡，重新截图确认。
- `node work/desktop-map-shell-021.cjs output/LittleCaravan-0.21.0-win-x64-d7e6839e860c`：使用独立测试存档，六页往返、买入再售出、地图选目的地、切换路线、实际旅行事件、抵达回地图、城镇进入/返回及重启后进度一致均通过。报告 `work/desktop-map-shell-021.json`。此专项关闭动态效果以检查交互路径，0.20 镜头证据保留原版本归属。
- `node desktop/audit-runtime.cjs output/LittleCaravan-0.21.0-win-x64-d7e6839e860c`：95 项包清单、71 个未改变的运行时文件与保留的软件告知检查通过。报告 `licensing/runtime-0.21.0-d7e6839e860c.json`；不代表所有分发义务已完成。

## 本地候选

`output/LittleCaravan-0.21.0-win-x64-d7e6839e860c/LittleCaravan.exe`，保留整个文件夹运行。95 个文件，396,597,594 字节（不含清单）。旧包与玩家进度保留，未发布或上传。

本轮为界面导航调整，未重跑此前全部长流程、设备或导入导出专项。不声称已达到 Steam 发布标准，发行剩余事项继续见 STEAM-FIRST-RELEASE.md。
