# 0.24 暖色绘本重绘提示词

## 陶土材质补充

原输出：exec-ca973c80-3c49-43db-9042-f3652c54550a.png；保存为 paint-clay-024.png；无参考图。

```text
Create a square hand-painted gouache material tile for a cozy storybook game's pottery renderer, matching muted warm matte storybook brushwork. Entire frame is a flat uniform off-white ivory clay surface. Visible soft broad layered irregular brush patches, subtle ceramic flecks and kiln speckling, gentle grey-beige undulations. Contrast moderate enough to see at small game icon size. No actual vessel, no object, no edges or horizon, no lighting gradient, no glaze designs, no wood grain, no writing, no symbols, no watermark. A neutral seamless-looking surface texture to clip and tint to arbitrary pottery silhouettes in code. Not photograph, not vector, not 3D. Square1024x1024.
```

2026-09-12；全部使用内置 image_gen，生成原件直接复制入 assets。没有第三方素材下载。第一批以 assets/caravan-town-023.png 为参考；后续环境与图集沿用该参考。白底修正以先前生成图为参考。生成图片的许可与软件代码 MIT 分开记录，参见 SOURCES.md。

实际输出包含非透明白底；显示时通过 art.js 内 SVG 颜色滤镜剔除近白背景，不更改原始 PNG。角色图集使用实测行边界，防止邻格残片。以下保留实际调用完整提示词，包含未达预期的透明底尝试。

## redraw024-jobs

### goods

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, delicately painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. PRODUCTION GAME SPRITE ATLAS, 4 equal columns by 4 equal rows, square image 1536x1536. Exactly 16 cells, each centered single isolated subject fully inside the middle 76 percent of its cell, with generous transparent gutter. Uniform equal cell boundaries, NO visible grid or cell frames. REAL transparent alpha background, no painted checkerboard, no ground or scenery, no cast shadows outside objects. Objects rendered with enough painterly detail for inventory closeups yet clearly readable. Read left to right each row. Subjects in exact order: green paper tea tin with tea leaves; ochre cloth spice pouch with red spices; fresh medicinal herb sprig; silver blue fresh fish; folded sage and rose silk fabrics; translucent blue ice crystal; round bronze wooden shield; warm brass candle lantern; red apple with leaf; blue floral porcelain vase; round scored travel bread; antique brass compass; amber honey jar; tied sandalwood logs; glazed amber hanging lamp; stack of gold coins. Preserve this exact order and count.
```

### treasures

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, delicately painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. PRODUCTION GAME SPRITE ATLAS, 4 equal columns by 4 equal rows, square image 1536x1536. Exactly 16 cells, each centered single isolated subject fully inside the middle 76 percent of its cell, with generous transparent gutter. Uniform equal cell boundaries, NO visible grid or cell frames. REAL transparent alpha background, no painted checkerboard, no ground or scenery, no cast shadows outside objects. Objects rendered with enough painterly detail for inventory closeups yet clearly readable. Read left to right each row. Subjects in exact order: wooden leaf seal stamp; pale moon-white tea sprig; turquoise feather; amber gem enclosing tiny bee; sea glass message bottle; turquoise glass fish ornament; spiral pink seashell; cream pearl in open oyster; terracotta toy horse; small gold bell; woven wheat crown; golden sunflower seed jewel; sleepy ginger cat; leather travel backpack; open leather journal; small covered wagon emblem. Preserve this exact order and count.
```

### caravan

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, delicately painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. A finished isolated game character sprite on REAL transparent alpha background. Entire side-view original horse-drawn merchant caravan facing RIGHT, canvas covered small oak wagon on LEFT with two large wooden wheels, a friendly young adult Chinese caravan driver on front bench in center wearing sage coat, terracotta scarf and rounded straw hat, brown horse on RIGHT attached by reins and shafts. Warm cream canvas, leaf green trim, wicker cargo boxes. Beautiful painterly cutout matching the reference, finely painted cloth and wood, gentle expressive face, readable at small size. All wheels, horse legs, tail, hat and reins fully visible. Horizontal composition, object occupies 88 percent width and 65 percent height, centered. No environment, no painted floor, no checkerboard, no lettering. 1536x1024.
```

### actors

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, delicately painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. PRODUCTION GAME SPRITE ATLAS, 4 equal columns by 4 equal rows, square image 1536x1536. Exactly 16 cells, each centered single isolated subject fully inside the middle 76 percent of its cell, with generous transparent gutter. Uniform equal cell boundaries, NO visible grid or cell frames. REAL transparent alpha background, no painted checkerboard, no ground or scenery, no cast shadows outside objects. Objects rendered with enough painterly detail for inventory closeups yet clearly readable. Read left to right each row. Subjects in exact order: friendly adult Chinese tea merchant in ochre apron standing three-quarter facing left; adult road traveler with sage cloak and bandaged arm seated on a rock facing left; nonviolent masked roadside toll bandit in charcoal clothes standing facing left, no weapon; adult customer in dusty blue robe standing facing right; ginger camp cat sitting; same ginger cat with sage scarf; same ginger cat with scarf resting on blue cushion; friendly caravan driver portrait sage coat terracotta scarf straw hat; white sail single-mast wooden model boat; tan sail twin-mast wooden model boat; blue sail lantern wooden model boat; top down horse and covered caravan facing TOP of cell; brass teapot with matching ivory cup on tray; ivory ceramic empty teacup with saucer; ivory teacup filled with green tea with saucer; wooden open display pedestal. Preserve this exact order and count.
```

## redraw024-batch2

### decor

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. PRODUCTION GAME ATLAS on SOLID PURE WHITE #ffffff background. NOT transparent, NO checkerboard, NO paper texture on the background. 4 equal columns and 4 equal rows, 1536x1536 square, exactly 16 cells. Each isolated object centered within middle 76 percent of its equal cell. Generous pure white gutters, no grid or labels, no scene beyond each object. Read left to right top to bottom, exact subjects: plain cream canvas camping tent three-quarter front view; same tent muted blue canvas; same tent honey gold canvas; same tent deep blue with small gold stars; festive cloth bunting hung between two thin wooden poles; warm lantern garland between two thin wooden poles; short winding stepping stone path elevated view; short winding path bordered by pink and cream wildflowers; small oval ornamental pond rocks reeds and two goldfish elevated view; small glass greenhouse with potted plants inside; empty wooden three-slot treasure display shelf; low wooden tea table with tea service; round low wooden boat model stand; small round pottery display stool; small terracotta flower pot with tiny green sprout; small wooden crate.
```

### botanical

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. PRODUCTION GAME ATLAS on SOLID PURE WHITE #ffffff background. NOT transparent, NO checkerboard, NO paper texture on the background. 4 equal columns and 4 equal rows, 1536x1536 square, exactly 16 cells. Each isolated object centered within middle 76 percent of its equal cell. Generous pure white gutters, no grid or labels, no scene beyond each object. Read left to right top to bottom, exact subjects: terracotta pot of pale yellow daisies; terracotta pot of white camellia flowers; terracotta pot of purple lavender; terracotta pot of coral pink bellflowers; terracotta pot of golden sunflowers; terracotta pot of rose sunset dahlias; terracotta pot with tiny new green seedling; terracotta pot with green leaves and unopened flower buds; grey ochre mossy rock game obstacle; small wooden crate tied with rope; cut tree stump; cluster of river reeds; antique brass cog gear; green leafy twig; distant mountain emblem on small carved wooden token; winding path emblem on small carved wooden token.
```

### road

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. Landscape 1536x1024. Original game event backdrop: quiet winding countryside road beside a river, distant rounded mountains, oak and pine clusters at sides, small empty rustic roadside tea stall on far RIGHT. Camera a little above eye level, broad empty sandy path occupies bottom 45 percent, room for code overlays of horse caravan centered left and roadside person at right. No people, animals, wagons, interface or text. Warm afternoon.
```

### home

```text
Match the supplied reference's original cozy warm gouache storybook painting: broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre and clay, soft upper-left daylight, painted edges NOT thick vector outlines, no photorealism, no 3D, no modern objects, no text, no labels, no watermark. Landscape 1536x1024. Original game HOME camp backdrop, bird's eye three-quarter view. Cozy woodland clearing near a little stream, trees framing both sides, distant rolling hills and soft morning light. Central lower two-thirds is broad empty pale grassy earth clearing with subtle soil shadows and a curved entrance path at lower left. Keep center and right EMPTY for modular tents, pond, greenhouse, cat and tables to be overlaid by game code. No tent, house, furniture, people, animal, sign, text or UI.
```

## redraw024-fix-jobs

### goods-white

参考：exec-c9b4d149-b279-4e1b-a61f-1e6e17f07cf5.png

```text
Edit the supplied game asset. Preserve every illustrated object, exact position, size, orientation, silhouette, brushwork, colors, and cell arrangement. Replace ONLY ALL the grey checkerboard background with solid flat pure white #FFFFFF, including all gaps between spokes, reins, leaves and objects. The whole background must be opaque uniform white. No transparency, checkerboard, paper texture, grey shadows or scenery. Do not add/remove/change any object. This is a production asset to blend into a game scene; keep edges clean. Same aspect ratio as reference.
```

### treasures-white

参考：exec-da519ca5-b40a-4391-81b4-de55a78ffa9e.png

```text
Edit the supplied game asset. Preserve every illustrated object, exact position, size, orientation, silhouette, brushwork, colors, and cell arrangement. Replace ONLY ALL the grey checkerboard background with solid flat pure white #FFFFFF, including all gaps between spokes, reins, leaves and objects. The whole background must be opaque uniform white. No transparency, checkerboard, paper texture, grey shadows or scenery. Do not add/remove/change any object. This is a production asset to blend into a game scene; keep edges clean. Same aspect ratio as reference.
```

### caravan-white

参考：exec-52737964-365d-43b1-83e3-a71207ef8341.png

```text
Edit the supplied game asset. Preserve every illustrated object, exact position, size, orientation, silhouette, brushwork, colors, and cell arrangement. Replace ONLY ALL the grey checkerboard background with solid flat pure white #FFFFFF, including all gaps between spokes, reins, leaves and objects. The whole background must be opaque uniform white. No transparency, checkerboard, paper texture, grey shadows or scenery. Do not add/remove/change any object. This is a production asset to blend into a game scene; keep edges clean. Same aspect ratio as reference.
```

## redraw024-batch3

### actors-white

参考：C:/Users/admin/.codex/generated_images/01a08984-f3c2-79a2-a050-77b5e7ce4acd/exec-0cddc509-34f0-4160-a6dd-7c9fc9da2ae5.png

```text
Edit this game sprite sheet. Preserve every object in its exact cell, size, position and colors. Replace ALL checkerboard with solid pure white #FFFFFF, including internal holes. No transparency, no checkerboard, no grey cast shadow. Also replace only the second row fourth portrait with the same young clean-shaven driver as our caravan: youthful adult, sage coat, terracotta scarf, rounded straw hat; keep portrait inside its existing cell. Everything else unchanged. Square 4x4 atlas.
```

### night

```text
Original cozy warm gouache storybook painting matching reference, broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre clay, soft light, painted edges NOT vector outlines, no photorealism, 3D, text, logos or watermark. Landscape1536x1024. Quiet forest roadside at dusk, deep teal blue woods, moonlight and warm faint fireflies, broad empty sandy path lower45%, misty rounded mountains in distance, branches at sides. Open foreground for caravan and lost crate code overlays. No people, horse, wagon, furniture, chest or UI. Painterly night storybook atmosphere, readable medium-dark values not black.
```

### water

```text
Original cozy warm gouache storybook painting matching reference, broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre clay, soft light, painted edges NOT vector outlines, no photorealism, 3D, text, logos or watermark. Square1536x1536 top-down view of a quiet teal woodland pond. Gentle broad water ripples, watery gouache, small rocks and reeds ONLY along outer 8 percent perimeter, center entirely open turquoise water for puzzle grid overlays. No fish, boat, bridge, buoy, dock, text or UI, no perspective horizon. Exact same painterly palette and texture as reference.
```

### table

```text
Original cozy warm gouache storybook painting matching reference, broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre clay, soft light, painted edges NOT vector outlines, no photorealism, 3D, text, logos or watermark. Square1536x1536 closeup top-down warm worn honey-brown wooden craft table filling entire image. Broad matte gouache brush planes, subtle wood grain and quiet hand-painted flecks. Mostly even illumination, low contrast, empty work surface for card game, pottery and tea workshop UI overlays. No objects, tools, cups, cards, borders, text or UI.
```

### drive

```text
Original cozy warm gouache storybook painting matching reference, broad matte brush planes, softly textured natural materials, muted sage forest teal cream ochre clay, soft light, painted edges NOT vector outlines, no photorealism, 3D, text, logos or watermark. Portrait1024x1536. Strict top-down view of broad straight sandy road running from bottom center to top center, no perspective vanishing point, road occupies central 90 percent width, muted sage grass, flowers and low bushes at extreme left and right edges only. Clear flat road for 3 code-controlled lanes with moving wagon and obstacles. No wagon, horse, people, rocks, coins, lane markings, text, UI or road bends. Warm gouache terrain.
```

## 最终文件对应

- assets/paint-goods-024.png ← exec-d1a84467-6701-4418-aff5-1d865378a66d.png
- assets/paint-treasures-024.png ← exec-a23f6f45-e68e-4f7c-b26a-ea0e30552734.png
- assets/paint-caravan-024.png ← exec-bdd04935-ed6c-4bf0-9e33-59f8ebb46b66.png
- assets/paint-decor-024.png ← exec-03974532-dc36-46e3-a7d1-c46eafa93c01.png
- assets/paint-botanical-024.png ← exec-20108dbf-8bf0-47d1-bcb9-29ccd87d2044.png
- assets/paint-road-024.png ← exec-3c661b0e-ea4d-43e9-a7e9-2ed81316c1a1.png
- assets/paint-home-024.png ← exec-9e3445dd-5f26-40df-82ea-13c9a088d511.png
- assets/paint-actors-024.png ← exec-d1097c09-0732-4724-8baa-5fe2e1f28274.png
- assets/paint-night-024.png ← exec-e093e59f-5883-47e8-ac98-21fb1c93f781.png
- assets/paint-water-024.png ← exec-47084330-bac1-4044-89a2-f5c34ac0117a.png
- assets/paint-table-024.png ← exec-bdcdc06b-e266-4a2f-9acc-8d7739114d91.png
- assets/paint-drive-024.png ← exec-f9820e5c-e66f-40e8-811c-b1206dff3ac5.png
- assets/paint-clay-024.png ← exec-ca973c80-3c49-43db-9042-f3652c54550a.png
