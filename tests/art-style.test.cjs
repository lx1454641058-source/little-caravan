// Original rendering contract checks. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),G=require('../engine.js');
function art(){const context={window:{Caravan:G}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../art.js'),'utf8'),context);return context.window.Art;}
test('shared storybook lighting uses unique gradient references across repeated icons and scenes',()=>{
 const a=art(),rendered=[a.icon('tea'),a.icon('tea'),a.scene('camp',{city:0,items:[]}),a.atlas(0,2),a.homeScene(G.fresh(13).collection)];
 const seen=new Set();for(const svg of rendered){assert.match(svg,/<image/);const local=new Set([...svg.matchAll(/id="(paint-[^"]+)"/g)].map(m=>m[1]));for(const id of local){assert.ok(!seen.has(id));seen.add(id);}for(const ref of svg.matchAll(/url\(#(paint-[^)]+)\)/g))assert.ok(local.has(ref[1]),'Every fill resolves within its rendered SVG');assert.doesNotMatch(svg,/undefined|NaN/);}
});
test('map and travel reuse the protagonist and face the destination without changing route geometry',()=>{
 const a=art();for(const [from,to] of [[0,2],[2,0]]){const svg=a.atlas(from,to,'road',true);assert.match(svg,/person-driver/);assert.match(svg,/scene-horse/);assert.ok(svg.includes(a.atlasPath(from,to)));assert.ok(svg.includes(from>to?'scale(-0.28 .28)':'scale(0.28 .28)'));}
});

test('every painted atlas crop stays inside its packaged image and resolves its own filter',()=>{
 const a=art(),files=require('../desktop/policy.cjs').FILES,ids=new Set();
 assert.equal(a.spriteKeys.length,80);
 for(const key of a.spriteKeys){const svg=a.paint(key);const [x,y,w,h]=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1536&&y+h<=1536.001,key);const file=svg.match(/href="([^"]+)"/)[1];assert.ok(files['/'+file],key);assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',file)));const id=svg.match(/<filter id="([^"]+)"/)[1];assert.ok(!ids.has(id));ids.add(id);assert.ok(svg.includes('filter="url(#'+id+')"'));}
});

test('home decoration, cat bonding and handmade pottery still change the rendered artwork',()=>{
 const a=art(),c=G.fresh(13).collection,base=a.homeScene(c);
 for(const key of Object.keys(G.DECOR)){const s=G.fresh(13);s.collection.stamps=100;s.collection.treasures=Object.keys(G.TREASURES);s.collection.goods=Object.keys(G.GOODS);const before=a.homeScene(s.collection).replaceAll(/(?:cutout|paint)-\d+/g,'render');G.buyDecor(s,key);const after=a.homeScene(s.collection).replaceAll(/(?:cutout|paint)-\d+/g,'render');assert.notEqual(after,before,key);}
 c.treasures=['leafSeal','moonTea','feather'];c.catBond=6;assert.match(a.catFrame(5,c.catBond),/paint-actors/);
 const piece={profile:[40,40,40,40],glaze:'clay',pattern:'plain'},changed={...piece,profile:[40,54,32,40]};assert.notEqual(a.potteryPiece('bowl',piece).match(/<path d="([^"]+)"/)[1],a.potteryPiece('bowl',changed).match(/<path d="([^"]+)"/)[1]);
});

test('mounting pottery preserves every authored silhouette without the workshop floor shadow',()=>{
 const a=art();for(const form of Object.keys(G.POTTERY_FORMS))for(const profile of [[15,15,15,15],[80,80,80,80],[15,80,15,80],G.POTTERY_FORMS[form].target]){
  const piece={profile,glaze:'jade',pattern:'lines'},workshop=a.potteryPiece(form,piece,{handles:true}),mounted=a.potteryPiece(form,piece,{mounted:true});
  assert.equal(mounted.match(/<path d="([^"]+)"/)[1],workshop.match(/<path d="([^"]+)"/)[1]);
  assert.match(workshop,/cy="304"/);assert.doesNotMatch(mounted,/cy="304"|data-pottery-handle/);assert.match(workshop,/data-pottery-handle="3"/);
  assert.doesNotMatch(mounted,/undefined|NaN/);
 }
});

test('moving the tent carries its postcards without changing their local placement or save data',()=>{
 const a=art(),c=G.fresh(13).collection;c.trail.visitors=[3,3,3];const before=JSON.stringify(c),original=a.homeScene(c),items=G.homeItems(c);items.find(i=>i.id==='tent').x=350;items.find(i=>i.id==='tent').y=80;
 const moved=a.homeScene(c,{items}),cardFragment=svg=>svg.match(/<g class="tent-postcards">([\s\S]*?)<\/svg><\/g><\/g><\/g>/)[1].replaceAll(/(?:cutout|paint)-\d+/g,'render');
 assert.equal(cardFragment(original),cardFragment(moved));assert.equal(JSON.stringify(c),before);assert.match(moved,/data-home-object="tent" transform="translate\(350 80\)"/);
});
