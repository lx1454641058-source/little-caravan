# 0.24 全部不一致美术重绘

完成日期：2026-09-12。Windows 候选 0.24.0 / 699f4841fdb4。本次为美术与材质更新，不修改经营规则及 v14 存档。

## 做了什么与原因

- 新增 13 张生成图片：5 张图集、1 张主角马车、道路/营地/夜景/水面/木桌/陶土 6 种背景和材质，共 80 个图集插画单元。图集指把多个独立物品排在一张图片中供游戏取用。
- 主角与马车、商人/旅人/路人、货物和珍藏、小猫三种成长外观、营地十件装饰、花卉、船只、障碍物和程序图标均改用暖色绘本插画；世界地图和三城保留已统一的 0.23 底图。
- 驾驶、鉴定、翻牌、修桥、钓鱼、配茶、试航、陶作均接入新图或手绘材质。鉴定纹样、桥板连接、玩家捏出的器形继续准确反映规则与进度；基础按钮、箭头、文字和交互提示保留程序绘制，避免图片细节影响辨识。
- 重做白底图片的显示处理与角色图集裁切，修正深色底栏图标过暗、插画白底、邻格鞋子残片；世界中的鱼、石头不显示界面图标底牌。
- 修改 art.js、app.js、styles.css、index.html、serve.cjs、desktop/policy.cjs、desktop/branding.cjs、desktop/render-icon.cjs、desktop/build.cjs、版本文件与相关测试。没有升级依赖。

## 实际验证

- `node --check art.js`、`node --check app.js`：语法检查通过。
- `node --test tests/*.test.cjs`：215 项全部通过。报告 work/tests-repaint-024.txt。
- `node work/repaint-check-024.cjs`：21 个截图检查点，覆盖地图、城镇、交易、行囊、营地/装饰、全部八种小游戏、六种旅途画面与 400 像素窄屏交易页；实际执行小游戏的一步操作。页面异常及缺失资源均为零。报告 work/repaint-024-browser.json。
- `node work/navigation-check-024.cjs`：两种宽度、地图与城镇两个入口，共 28 组返回检查通过；覆盖按钮、Esc、选中物品取消、手记关闭和存档未误改。
- `node desktop/build.cjs`：Windows 包成功，111 个清单文件，429414134 字节。
- `node work/repaint-native-024.cjs output/LittleCaravan-0.24.0-win-x64-699f4841fdb4`：最终打包程序通过，17 张 PNG 全部加载，检查标题、地图、城镇、营地及配茶操作。使用独立临时存档。开始界面截图在淡入动画结束后复核。报告 work/repaint-024-native.json。
- `node work/navigation-check-024.cjs output/LittleCaravan-0.24.0-win-x64-699f4841fdb4`：最终 Windows 包的 14 组返回检查通过。报告 work/nav-024-native.json。
- `pwsh -NoProfile -File work/package-playtest-024.ps1`：压缩包 116 个文件逐项读回并核对 SHA256；包含既有许可证及源码附件，不含个人或测试存档。

验证过程中新增营地测试最初未满足收藏等级要求，已修正测试样本。图标渲染最初被沙箱阻止本地窗口加载，导致旧图标一致性检查失败；使用已有 Electron 完成渲染后，215 项重新运行全部通过。未跳过失败测试。

## 本地交付

- 运行：output/LittleCaravan-0.24.0-win-x64-699f4841fdb4/LittleCaravan.exe
- 压缩包：output/LittleCaravan-0.24.0-Windows-Playtest-20260912-160914.zip
- 压缩包大小：208067696 字节，约 198.4 MiB。
- SHA256：ce543b4ca1617b631fbd5d0e742418d6cb86ef4841ecee39db5ecf55b9180163
- 预览：http://127.0.0.1:4173/?v=0.24.0

完整解压后启动 LittleCaravan.exe。旧版本与旧素材仍保留；现有 v14 存档可继续读取。本次没有上传或对外发送文件。

## 来源与范围限制

图片来自内置 image_gen，保留全部原始输出，项目中 PNG 与原件一致；来源、尺寸和 SHA256 见 assets/SOURCES.md，完整提示词见 assets/ART-PROMPTS-024.md。没有新增第三方素材、字体、图标包、依赖或运行时 AI 调用。原创代码沿用项目 MIT；生成图片的来源记录不证明独占版权。

本次通过不代表覆盖所有电脑，也不代表 Steam 提审或正式发行通过。既有 FFmpeg 对应源码、补丁/Windows 构建材料与其他适用分发义务核验仍未完成，详见包内“分发材料状态.txt”；Steamworks 账号及实际发布步骤仍待处理。此次不重做先前视频，不将旧宣传素材标成 0.24 实录。
