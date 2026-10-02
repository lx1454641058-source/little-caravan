# 0.8 场景素材来源

## 暖色绘本统一（0.23）

世界地图新增 `caravan-atlas-023.png`，以新柳溪镇与本游戏地图截图为参考生成地形；城镇坐标、路线计算、马车移动仍由原创代码控制。完整提示词见 `ART-PROMPTS-023.md`，同属预生成 AI 美术。

2026-09-12，三城底图改用 `caravan-town-023.png`、`caravan-harbor-023.png`、`caravan-harvest-023.png`。均使用内置 image_gen，以本项目旧素材和新柳溪镇为参考，生成后直接复制；旧文件保留。完整提示词、参考顺序与原输出文件见 `ART-PROMPTS-023.md`。没有外部素材下载、第三方角色或新增依赖。生成图片属于预生成 AI 美术，继续需要在发行内容调查中披露；MIT 软件许可不证明生成图片的独占版权。

`art.js` 的原创人物、地图树木与马车轮廓更新，统一柔和光照；地图、城镇、旅途复用同一主角马车。道具、营地和程序图标同步采用相同光照，图标由现有 Electron 本地渲染。新增图形代码沿用 MIT；没有引入图标包、字体或实时 AI 服务。存档格式及经营规则不变。

## 开始界面与天赋树（0.22）

开始界面复用本项目三城插画，根据当前城镇显示背景；标题、布局、镜头动画、天赋树节点与规则为本项目原创 MIT 代码。没有下载或生成新素材，没有引入第三方依赖或运行时 AI 服务。

## 花卉与程序图标（0.13 / 0.13.1）

六种花卉继续由 `art.js` 内的原创 SVG 形状绘制，未引入外部图片。`caravan-icon.svg` 从同文件的马车图形衍生，加入项目内编写的背景、边框与太阳；源生成器为 `desktop/branding.cjs`。`caravan-icon.png` 和七尺寸 `caravan-icon.ico` 由 `desktop/render-icon.cjs` 使用已有 Electron 本地渲染，未调用付费图像服务。图形代码沿用项目 MIT；这属于 AI 辅助预生成美术，发行内容调查应如实披露。没有引入第三方图标包，不代表已完成名称或商标检索。

## 后续 AI 辅助内容记录（0.11）

`art.js` 的物品、营地、小猫和来客肖像为通过 AI 辅助编写的 SVG 图形；`engine.js`、`app.js` 的规则说明与来客短故事也由本任务 AI 辅助制作并在项目内校验。没有临摹指定第三方角色、引入第三方素材包或运行时生成服务。软件代码沿用项目 MIT；此记录不证明独占版权或商标可用性。提交 Steam 内容调查时，应披露实际发给玩家消费的预生成 AI 辅助美术与文字，不能仅写“只有代码使用 AI”。来源与最终发行文件仍需在发布前逐项复核。

## caravan-town-08.png

- 用途：可交互城镇主画面的底图，前景马车、货物、地点按钮和特效由代码单独绘制。
- 生成日期：2026-09-10。
- 生成方式：内置 `image_gen.imagegen`，不是 CLI/API 回退；没有输入参考图片，没有外部素材下载。
- 尺寸：1536 × 1024，PNG。保存为项目本地文件，运行时不调用图片服务。
- 原始生成文件：`exec-b1afba19-f56e-4d53-9169-d337fff249ac.png`；工作区资产为该输出的直接副本。
- 来源分类：为本项目生成的 AI 插画。没有附带第三方素材包许可证；项目 MIT 软件许可证不应被视为这张生成图片的独占版权证明。未开展相似性或商标检索。

完整生成提示词：

> Use case: stylized-concept. Create a finished game environment background for an original cozy Chinese-language caravan trading indie game, not a UI mockup. Very wide landscape 1536x1024 or widest available. A richly detailed hand-painted storybook diorama of a small pre-industrial riverside trading town, elevated three-quarter view, warm late afternoon sunlight, painterly gouache textures, crisp appealing silhouettes and warm earthy colors. Left third: peaceful teal river with a small wooden fishing dock, little sailing boat and waterside blue-roof houses. Center: lively compact market square with sage green and terracotta striped awnings, crates of apples, tea sacks, hanging lanterns and a stone fountain, several tiny original villagers. Right third: warm honey stone town gate with ochre towers, beyond it golden wheat fields, windmill, winding road towards hazy green mountains. Foreground lower quarter: open curving sandy road through grass and flowers, enough room to overlay a caravan game sprite; do NOT paint a horse or caravan vehicle there. Tall foliage at the corners frames the scene. Soft atmospheric depth, sophisticated natural green, teal, amber and ivory palette; charming playable strategy-game environment with visible objects, no excessive blur, no photorealism, no pixel art. Fill entire frame, no borders, no text, no letters, no UI, no logo, no watermark. This is a production background asset to be cropped responsively; keep river, market and gate visible in the central horizontal 65% of the composition.

## 动态地图与镜头（0.20）

0.21 将地图作为首页，功能通过地图入口切换至独立页面；设置齿轮、手记书本图标与导航样式为本项目原创代码，沿用 MIT。继续使用已有三城插画，没有新增外部资源或依赖。

- `art.js` 新增原创 SVG 地形、河流、商路、城镇轮廓、云与飞鸟；复用原有马车和船图形。`styles.css` 新增原创地图与旅行镜头动画，`app.js` 负责实际路线和目的地展示。新增代码沿用项目 MIT。
- 三城地图缩略图、目的地卡片与抵达镜头复用下列已有插画，没有生成或下载新图片、视频，没有新增依赖或运行时模型调用。既有 AI 素材来源和披露要求保持。

## 三城独立场景（0.14）

- `caravan-town-08.png` 继续用于柳溪镇，原文件未修改。
- `caravan-harbor-014.png`：松湾港，1536×1024。内置 image_gen 生成，原输出 `exec-44f3823b-570d-425c-831a-822bc659dd9f.png`。直接复制到项目，无像素修改。
- `caravan-harvest-014.png`：金穗城，1536×1024。内置 image_gen 生成，原输出 `exec-58f925fe-b7a9-499d-8c90-afdb245513ff.png`。直接复制到项目，无像素修改。
- 生成日期：2026-09-11。两次均仅以本项目 `caravan-town-08.png` 作为画风参考，没有上传第三方角色、素材包或个人照片，没有外部下载。
- 提示词约束：新的实际游戏环境底图，沿用故事书水粉质感和俯视斜角；松湾港突出海面、帆船、蓝白鱼市、松林海岸；金穗城突出麦田、陶器市集、陶窑和钟楼，不画海港。中央保留互动建筑，底部留空道路给代码马车；不生成文字、界面、标志或水印。
- 本次本地环境生成图归为预生成 AI 美术，继续纳入 Steam 内容调查。没有引入第三方素材包许可证；项目 MIT 代码许可证不证明 AI 图片的独占版权或商标可用性。没有新增运行时模型调用或第三方软件依赖。
- `app.js` 的城市描述、寻访地点说明与 `styles.css` 的海面微光、麦田浮尘为本任务 AI 辅助原创代码/文字，代码沿用项目 MIT。城市寻访复用现有规则，不增加存档字段。

## 全部插画重绘（0.24）

2026-09-12。新增13张内置 image_gen 生成 PNG：5张图集含80个插画单元，主角马车，以及道路、营地、夜景、水面、木桌、陶土六种环境/材质。图片原件直接复制，完整提示词见 ART-PROMPTS-024.md。没有第三方素材下载或新增依赖；代码沿用项目 MIT。生成素材单独记录为预生成 AI 美术，不将 MIT 当作独占版权证明。

角色、道具、珍藏、装饰、花卉、船和障碍物使用同一暖色绘本笔触。已有三城与世界地图023插画保留。界面基础符号与玩法决定的陶器轮廓、纹样、桥板连接仍由原创代码绘制；陶器叠加新陶土材质，桥板使用新木纹。白底图集使用运行时SVG滤镜、角色专用行裁切；没有更改玩家存档或经营规则。程序图标由新版马车徽章经现有 Electron 渲染。

|项目文件|原生成文件|尺寸|SHA256|
|---|---|---|---|
|paint-goods-024.png|exec-d1a84467-6701-4418-aff5-1d865378a66d.png|1254×1254|81f846dedbc5075963bb10c2af9c2a8afcf6a395f0924be350e1662d7b958cec|
|paint-treasures-024.png|exec-a23f6f45-e68e-4f7c-b26a-ea0e30552734.png|1254×1254|d815616477185ee03778889122e2fbefa250dd7c1343765e30ae28641081ba93|
|paint-caravan-024.png|exec-bdd04935-ed6c-4bf0-9e33-59f8ebb46b66.png|1536×1024|a4763ac16d98ccb29333e792238867477c5d46208b408c73c8b10087693d26b3|
|paint-decor-024.png|exec-03974532-dc36-46e3-a7d1-c46eafa93c01.png|1254×1254|9aeb9722d1d1451b772917a6aaa9717431f706bb490686ca1d93f90abfcff82f|
|paint-botanical-024.png|exec-20108dbf-8bf0-47d1-bcb9-29ccd87d2044.png|1254×1254|908987ee4c1ea48d784253fae2f71cc58103d2695ad76a6053815e3359d09fbc|
|paint-road-024.png|exec-3c661b0e-ea4d-43e9-a7e9-2ed81316c1a1.png|1536×1024|25eed5927349e617159ef0690cfa9544bd6a35ddde2d40db90287a3d2a6ff9e4|
|paint-home-024.png|exec-9e3445dd-5f26-40df-82ea-13c9a088d511.png|1536×1024|331ea865984f2359f3e1f513dfea5a166a200aa01d49af5bb2cf5016e2c5cbcd|
|paint-actors-024.png|exec-d1097c09-0732-4724-8baa-5fe2e1f28274.png|1254×1254|77c67726dfff3abd7a126dff762214b2eb161a666860e618ba8c4577a37b5faa|
|paint-night-024.png|exec-e093e59f-5883-47e8-ac98-21fb1c93f781.png|1536×1024|a11afb59bae35a8e5abfbabf7b66d5ba9ff585e6f006f90e82a456c5dc0e63fa|
|paint-water-024.png|exec-47084330-bac1-4044-89a2-f5c34ac0117a.png|1254×1254|2ab7b455975f1c290a3634d82a656975e4758e933c17f9a45940f4c771aacbb3|
|paint-table-024.png|exec-bdcdc06b-e266-4a2f-9acc-8d7739114d91.png|1254×1254|4da72169f1450a3eb4a535c7307583ce0a19451cb46c8ea5337f182f884847cd|
|paint-drive-024.png|exec-f9820e5c-e66f-40e8-811c-b1206dff3ac5.png|1024×1536|0af146188d84b24fd0125b1f242341bc10e0076284d3c72268620ae46535af08|
|paint-clay-024.png|exec-ca973c80-3c49-43db-9042-f3652c54550a.png|1254×1254|6733ac38977e22ddbfa08d62deb14776879a0cb6394bf5cac120cf370d2f45eb|

## 自由布置与动态小猫（0.25）

2026-09-12，新增 cat-motion-025.png，1536×1024，原输出 exec-570237d9-c072-4257-811d-be9fba6499e3.png。内置 image_gen，以本项目 paint-actors-024.png 为参考，原件直接复制。SHA256：da726b8edae3b35ba0eb270348a1227087f076bfd5c315502980e15944776234。完整提示词见 ART-PROMPTS-025.md。无外部素材下载或新增依赖。

营地布置、动作切换与互动由新增 home.js 和既有 engine.js/art.js/app.js 中的原创代码实现，沿用项目 MIT。图片单独记录为预生成 AI 美术，不代表独占版权。运行时不调用 AI。原有围巾与软垫插画复用。
