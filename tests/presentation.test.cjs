// Original presentation/transaction integration tests. SPDX-License-Identifier: MIT
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const G = require('../engine.js');
const Save = require('../storage.js');
const Diagnostics = require('../diagnostics.js');
function resolveSkippingChallenge(s, choice) { if (G.travelChallengePending(s)) G.skipChallenge(s); return G.resolve(s, choice); }

// Minimal DOM boundary: actual app handlers and actual game rules run unchanged.
// Controlled timers exercise skipping/reloading without relying on wall-clock sleeps.
function mount(initial, { off = false, reduced = false, legacy = false, raw = null, backup = null, desktop = false, desktopInfo = null, title = false } = {}) {
  const storage = new Map([[legacy === 8 ? 'caravan-save-v8' : legacy === 7 ? 'caravan-save-v7' : legacy === 6 ? 'caravan-save-v6' : legacy === 5 ? 'caravan-save-v5' : legacy === 3 ? 'caravan-save-v3' : legacy ? 'caravan-save-v2' : `caravan-save-v${G.VERSION}`, JSON.stringify(initial)], ['caravan-effects', off ? 'off' : 'on']]);
  const handlers = {}, nodes = new Map(), timers = new Map(); let now = 0, sequence = 0;
  if(raw!==null)storage.set(`caravan-save-v${G.VERSION}`,raw);
  if(backup)storage.set(`caravan-save-v${G.VERSION}-backup`,JSON.stringify(backup));
  let failWrites=false;
  const cues = [], audioSettings = {enabled: true, volume: .35, supported: true};
  const audio = {unlock() {}, play(name) {if (audioSettings.enabled) cues.push(name);}, stop() {cues.push('stop');}, settings: () => ({...audioSettings}), setEnabled(value) {audioSettings.enabled = value;}, setVolume(value) {audioSettings.volume = value;}};
  function element() {
    const classes = new Set();
    return { innerHTML: '', textContent: '', dataset: {}, open: false, scrollTop: 0, isConnected: false,
      classList: { add: (...v) => v.forEach(x => classes.add(x)), remove: (...v) => v.forEach(x => classes.delete(x)), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
      style: { setProperty() {} }, append() {}, remove() {}, setAttribute() {}, focus() {}, scrollIntoView() {},
      querySelectorAll: () => [], addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; }
    };
  }
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); };
  const document = { body: element(), activeElement: null, querySelector: get, querySelectorAll: () => [], createElement: element, addEventListener: (name, fn) => { handlers[name] = fn; } };
  const context = { document, window: { Caravan: G, CaravanStorage: Save, Art: { atlas: () => '<svg></svg>', atlasPoints:[[150,278],[430,366],[642,220]], potteryPiece: () => '<svg></svg>', sailboat: () => '<svg></svg>', icon: () => '<svg></svg>', map: () => '<svg></svg>', homeScene: () => '<svg></svg>', scene: kind => `<svg data-scene="${kind}"></svg>`, cartTop: () => '<svg></svg>', vase: () => '<svg></svg>' }, matchMedia: () => ({ matches: reduced, addEventListener() {} }) },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => {if(failWrites)throw new Error('quota');storage.set(k, v);} },
    setTimeout: (fn, delay) => { const id = ++sequence; timers.set(id, { at: now + delay, fn }); return id; }, clearTimeout: id => timers.delete(id)
  };
  context.window.Art.paint=()=>'<svg class="painted-sprite"></svg>';
  context.window.CaravanSound = audio;
  context.window.CaravanDiagnostics = Diagnostics;
  const desktopCalls={fullscreen:0,quit:0,notices:0};
  if(desktop)context.window.CaravanDesktop={toggleFullscreen:async()=>++desktopCalls.fullscreen,quit:async()=>++desktopCalls.quit,info:desktopInfo||async function(){return {version:'0.13.1',buildId:'123456789abc',electron:'44.3.0',chrome:'test',node:'test',platform:'win32',arch:'x64'};},notices:async()=>++desktopCalls.notices};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  // Existing gameplay cases enter through the new title screen first.
  if(!desktop&&!title&&get('#dialog').dataset.panel==='title')handlers.click({target:{closest:()=>({dataset:{action:'desktop-resume'},disabled:false})}});
  return {
    state: () => JSON.parse(storage.get(`caravan-save-v${G.VERSION}`)),
    dialog: get('#dialog'),
    html: () => get('#app').innerHTML,
    cues,
    desktopCalls,
    stored: key => storage.get(key),
    failWrites: value => {failWrites=value;},
    potteryWidth: (index,value) => handlers.input({target:{dataset:{potteryRange:String(index)},value:String(value)}}),
    externalSave: value => storage.set(`caravan-save-v${G.VERSION}`,JSON.stringify(value)),
    importFile: (text,size=String(text).length) => handlers.change({target:{id:'save-import-file',files:[{size,text:async()=>text}]}}),
    hide() { document.hidden = true; handlers.visibilitychange(); },
    key(key) { handlers.keydown({key,repeat:false,target:{tagName:'BODY'},preventDefault(){}}); },
    click(action, value) { const button = { dataset: { action, value }, disabled: false }; handlers.click({ target: { closest: selector => selector === '[data-action]' ? button : null } }); },
    tick(ms) { const end = now + ms; let count = 0; while (true) { const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]; if (!next || next[1].at > end) break; assert.ok(++count < 100, 'timer loop'); timers.delete(next[0]); now = next[1].at; next[1].fn(); } now = end; }
  };
}
// A no-challenge first road trip isolates the pre-existing cinematic regression cases.
test('every panel returns to its town or map entry without changing saved progress',()=>{
 const ui=mount(start()),before=ui.state();
 for(const origin of ['map','town'])for(const pane of ['inventory','market','route','orders','home','progress','settings']){
  ui.click('map-back');if(origin==='town')ui.click('pane','town');
  ui.click(pane==='route'?'visit':'pane',pane);
  assert.match(ui.html(),new RegExp(`data-action="pane-back">← 返回${origin==='town'?'城镇':'地图'}`));
  ui.click('pane-back');assert.match(ui.html(),new RegExp(`main data-pane="${origin}"`));
  ui.click('pane',pane);ui.key('Escape');assert.match(ui.html(),new RegExp(`main data-pane="${origin}"`));
 }assert.deepEqual(ui.state(),before);
});

test('nested navigation unwinds one page and dialogs do not consume page history',()=>{
 const ui=mount(start());ui.click('pane','town');ui.click('visit','market');ui.click('pane','inventory');ui.click('pane','inventory');
 ui.click('help');ui.click('close');assert.match(ui.html(),/main data-pane="inventory"/);
 ui.key('Escape');assert.match(ui.html(),/main data-pane="market"/);ui.click('pane-back');assert.match(ui.html(),/main data-pane="town"/);
 ui.click('pane','home');ui.click('pane','route');ui.click('pane-back');assert.match(ui.html(),/main data-pane="home"/);
 ui.click('map-back');ui.key('Escape');assert.match(ui.html(),/main data-pane="map"/);
 ui.click('pane','town');ui.click('pane','map');ui.key('Escape');assert.match(ui.html(),/main data-pane="map"/);
});

test('Escape clears cargo selection before returning and resets do not revive old pages',()=>{
 const ui=mount(start());ui.click('pane','town');ui.click('visit','market');ui.click('buy','herb');const bought=ui.state();
 ui.key('Escape');assert.match(ui.html(),/main data-pane="market"/);ui.key('Escape');assert.match(ui.html(),/main data-pane="town"/);assert.deepEqual(ui.state(),bought);
 ui.click('pane','home');ui.click('new-game');ui.key('Escape');assert.match(ui.html(),/main data-pane="map"/);
 ui.click('pane','town');ui.click('pane','settings');ui.click('save-before-new');ui.click('save-confirm');ui.key('Escape');assert.match(ui.html(),/main data-pane="map"/);assert.deepEqual(ui.state(),bought);
});

test('arrival clears navigation from the previous stop',()=>{
 const ui=mount(start(),{off:true});ui.click('pane','town');ui.click('visit','route');ui.click('depart');
 for(let step=0;ui.state().phase==='event';step++){assert.ok(step<5,'trip must finish');const s=ui.state();if(G.travelChallengePending(s))ui.click('challenge-skip');else ui.click('resolve',G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id)).id);}
 ui.click('close');ui.key('Escape');assert.match(ui.html(),/main data-pane="map"/);
 ui.click('pane','town');ui.click('pane','market');ui.click('pane-back');assert.match(ui.html(),/main data-pane="town"/);
});

test('title talent learning persists once and new journey backup can restore the previous run',()=>{
 const s=start();s.gold=140;const ui=mount(s,{title:true});assert.equal(ui.dialog.dataset.panel,'title');ui.click('talents');ui.failWrites(true);ui.click('talent-learn','keen');assert.deepEqual(ui.state(),s);ui.failWrites(false);ui.click('talent-learn','keen');const learned=ui.state();ui.click('talent-learn','keen');assert.deepEqual(ui.state(),learned);
 ui.click('close');assert.equal(ui.dialog.dataset.panel,'title');ui.click('restart');ui.click('close');assert.deepEqual(ui.state(),learned);
 ui.click('restart');ui.failWrites(true);ui.click('new-game');assert.deepEqual(ui.state(),learned);ui.failWrites(false);ui.click('new-game');assert.equal(ui.state().gold,100);assert.deepEqual(ui.state().collection.talents,['keen']);
 assert.deepEqual(JSON.parse(ui.stored('caravan-before-new-v14')).state,learned);ui.click('save-before-new');assert.match(ui.dialog.innerHTML,/140 G/);ui.click('save-confirm');assert.deepEqual(ui.state(),learned);
});
test('map is the home screen and page navigation never changes saved progress',()=>{
 const ui=mount(start()),before=ui.state();assert.match(ui.html(),/main data-pane="map"/);
 for(const pane of ['inventory','market','orders','home','progress','settings','town']){
  ui.click('pane',pane);assert.match(ui.html(),new RegExp(`main data-pane="${pane}"`));
  ui.click('map-back');assert.match(ui.html(),/main data-pane="map"/);assert.deepEqual(ui.state(),before);
 }
 ui.click('atlas-destination','2');assert.match(ui.html(),/main data-pane="route"/);assert.deepEqual(ui.state(),before);
 ui.click('map-back');ui.click('pane','invalid');assert.match(ui.html(),/main data-pane="map"/);
});
test('atlas destination selection is free and the skippable camera never repeats departure',()=>{
 const ui=mount(start()),before=ui.state();ui.click('pane','route');ui.click('atlas-destination','2');
 assert.deepEqual(ui.state(),before);assert.match(ui.html(),/可交互旅行地图/);assert.match(ui.html(),/柳溪镇 → 金穗城/);
 ui.click('depart');const departed=ui.state();assert.equal(departed.event.destination,2);assert.match(ui.dialog.innerHTML,/atlas-travel-shot/);
 ui.click('skip-scene');ui.click('skip-scene');ui.tick(3000);assert.deepEqual(ui.state(),departed);
});

test('unreadable progress without backup cannot be misrepresented or exported as a fresh game',async()=>{
 const ui=mount(G.fresh(13),{raw:'bad',desktop:true});assert.match(ui.dialog.innerHTML,/尚未读取到可用进度/);assert.doesNotMatch(ui.dialog.innerHTML,/100 G/);assert.match(ui.dialog.innerHTML,/data-action="save-export" disabled/);ui.click('save-export');assert.equal(ui.stored('caravan-save-v'+G.VERSION),'bad');
 ui.click('diagnostics');await new Promise(r=>setImmediate(r));assert.match(ui.dialog.innerHTML,/请到存档管理导入已有备份/);assert.doesNotMatch(ui.dialog.innerHTML,/管理导出当前进度/);
 const recovered=mount(G.fresh(13),{raw:'bad',backup:G.fresh(13)});assert.doesNotMatch(recovered.dialog.innerHTML,/data-action="save-export" disabled/);assert.match(recovered.dialog.innerHTML,/100 G/);
});

test('problem report reflects failed saves without exporting the original error or changing progress',()=>{
 const s=G.fresh(13),ui=mount(s);ui.failWrites(true);ui.click('buy','fruit');ui.click('diagnostics');
 assert.match(ui.dialog.innerHTML,/当前保存遇到问题/);assert.match(ui.dialog.innerHTML,/save-failed/);assert.match(ui.dialog.innerHTML,/无法完整保存诊断历史/);assert.doesNotMatch(ui.dialog.innerHTML,/quota/);assert.deepEqual(ui.state(),s);
 ui.failWrites(false);ui.click('save-retry');ui.click('diagnostics');assert.match(ui.dialog.innerHTML,/save-recovered/);assert.doesNotMatch(ui.dialog.innerHTML,/当前保存遇到问题/);assert.deepEqual(ui.state(),s);
});
test('late diagnostic info cannot reopen or replace another panel',async()=>{
 let resolveInfo;const ui=mount(G.fresh(13),{desktop:true,desktopInfo:()=>new Promise(r=>{resolveInfo=r;})});ui.click('diagnostics');ui.click('help');resolveInfo({version:'0.19.0',buildId:'123456789abc'});await new Promise(r=>setImmediate(r));assert.match(ui.dialog.innerHTML,/一只行囊/);assert.doesNotMatch(ui.dialog.innerHTML,/导出反馈文件/);
});
test('pottery draft cancellation, save failure and confirmed replacement preserve the right artwork',()=>{
  const s=G.fresh(13);G.depart(s,2,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id)).id);
  const ui=mount(s);ui.click('city-explore');assert.match(ui.dialog.innerHTML,/陶禾的陶作小院/);ui.click('pottery-open');ui.click('pottery-assist');ui.click('pottery-next');ui.click('pottery-glaze','jade');ui.click('pottery-pattern','wheat');assert.deepEqual(ui.state(),s);ui.click('pottery-review');assert.match(ui.dialog.innerHTML,/即将带回营地的作品/);ui.click('close');assert.deepEqual(ui.state(),s);
  ui.click('pottery-open');ui.click('pottery-next');assert.match(ui.dialog.innerHTML,/pottery-sliders/);ui.click('pottery-assist');ui.click('pottery-next');ui.click('pottery-glaze','jade');ui.click('pottery-pattern','wheat');ui.click('pottery-review');ui.failWrites(true);ui.click('pottery-fire');assert.deepEqual(ui.state(),s);assert.doesNotMatch(ui.dialog.innerHTML,/出窑了/);ui.failWrites(false);ui.click('pottery-fire');assert.equal(ui.state().collection.home.pottery.pieces.bowl.glaze,'jade');assert.equal(ui.state().collection.home.pottery.pieces.bowl.pattern,'wheat');const created=ui.state();ui.click('pottery-fire');assert.deepEqual(ui.state(),created);
  ui.click('pottery-home');ui.click('pottery-open');ui.potteryWidth(0,80);ui.click('pottery-next');ui.click('pottery-glaze','night');ui.click('pottery-review');assert.match(ui.dialog.innerHTML,/营地里的旧作/);assert.match(ui.dialog.innerHTML,/确认替换并烧成/);ui.click('close');assert.deepEqual(ui.state(),created);
  ui.click('pottery-open');ui.potteryWidth(0,80);ui.click('pottery-next');ui.click('pottery-glaze','night');ui.click('pottery-review');ui.click('pottery-fire');assert.equal(ui.state().collection.home.pottery.pieces.bowl.profile[0],80);assert.equal(ui.state().collection.home.pottery.pieces.bowl.glaze,'night');assert.equal(ui.state().collection.stamps,created.collection.stamps);
});
test('harbor preview is read-only, a saved voyage resumes, and failed docking can retry without duplicate rewards',()=>{
  const s=G.fresh(13);G.depart(s,1,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id)).id);
  const ui=mount(s);ui.click('city-explore');assert.match(ui.dialog.innerHTML,/洛舟的顺风试航/);ui.click('sailing-open');assert.deepEqual(ui.state(),s);ui.click('sailing-start');ui.click('sailing-move','east:0');const first=ui.state();assert.equal(first.collection.home.sailing.voyage.visited,2);ui.click('close');ui.click('sailing-open');assert.deepEqual(ui.state(),first);
  ui.click('sailing-hint');assert.match(ui.dialog.innerHTML,/提示不影响模型与奖励/);assert.deepEqual(ui.state(),first);
  const v=first.collection.home.sailing.voyage;for(const direction of G.sailingRoute(v.key,v.at,v.visited))ui.click('sailing-move',direction+':'+ui.state().collection.home.sailing.voyage.steps);const ready=ui.state();
  ui.failWrites(true);ui.click('sailing-finish');assert.deepEqual(ui.state(),ready);assert.doesNotMatch(ui.dialog.innerHTML,/新模型入藏/);ui.failWrites(false);ui.click('sailing-finish');assert.equal(ui.state().collection.stamps,ready.collection.stamps+2);assert.deepEqual(ui.state().collection.home.sailing.models,['skiff']);assert.match(ui.dialog.innerHTML,/新模型入藏/);ui.click('sailing-finish');assert.equal(ui.state().collection.stamps,ready.collection.stamps+2);
  ui.click('sailing-home');assert.equal(ui.dialog.open,false);assert.match(ui.html(),/港湾模型台 · 1\/3/);ui.click('sailing-display','skiff');assert.equal(ui.state().collection.home.sailing.display,null);
});
test('failed sailing movement restores position and retry crosses the same buoy once',()=>{
  const s=G.fresh(13);G.depart(s,1,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id)).id);
  const ui=mount(s);ui.click('sailing-open');ui.click('sailing-start');const start=ui.state();ui.failWrites(true);ui.click('sailing-move','east:0');assert.deepEqual(ui.state(),start);ui.failWrites(false);ui.click('sailing-move','east:0');assert.equal(ui.state().collection.home.sailing.voyage.steps,1);const moved=ui.state();ui.click('sailing-move','north:0');assert.deepEqual(ui.state(),moved);ui.click('sailing-undo');assert.equal(ui.state().collection.home.sailing.voyage.visited,0);ui.click('sailing-chart','trade');ui.click('sailing-start');assert.equal(ui.state().collection.home.sailing.voyage.key,'skiff');
});
test('tea draft is cancellable, failed save grants nothing, and retry places a persistent tea table',()=>{
  const s=G.fresh(13),ui=mount(s);ui.click('city-explore');assert.match(ui.dialog.innerHTML,/阿青的配茶工坊/);ui.click('tea-open');
  ui.click('tea-add','0');ui.click('tea-add','3');assert.deepEqual(ui.state(),s);ui.click('close');ui.click('tea-open');assert.match(ui.dialog.innerHTML,/空茶勺/);assert.doesNotMatch(ui.dialog.innerHTML,/取回第/);
  ui.click('tea-hint');assert.match(ui.dialog.innerHTML,/照着搭配也能得到完整奖励/);for(const n of [0,3,4])ui.click('tea-add',String(n));
  ui.failWrites(true);ui.click('tea-brew');assert.deepEqual(ui.state(),s);assert.doesNotMatch(ui.dialog.innerHTML,/新茶谱收好了/);
  ui.failWrites(false);ui.click('tea-brew');assert.equal(ui.state().collection.stamps,s.collection.stamps+2);assert.match(ui.dialog.innerHTML,/新茶谱收好了/);ui.click('tea-brew');assert.equal(ui.state().collection.stamps,s.collection.stamps+2);
  ui.click('tea-home');assert.equal(ui.dialog.open,false);assert.match(ui.html(),/茶谱 1\/3/);ui.click('tea-display','morning');assert.equal(ui.state().collection.home.tea.display,null);ui.click('tea-display','morning');assert.equal(ui.state().collection.home.tea.display,'morning');
});
test('tea recipe preview, practice and help leave the regular discovery opportunity intact',()=>{
  const s=G.fresh(13),ui=mount(s);ui.click('tea-open');ui.click('tea-recipe','home');ui.click('tea-add','0');assert.match(ui.dialog.innerHTML,/先调成前一张茶谱/);assert.deepEqual(ui.state(),s);
  ui.click('tea-recipe','morning');for(const n of [0,3,4])ui.click('tea-add',String(n));ui.click('tea-brew');ui.click('close');ui.click('city-explore');ui.click('explore','market');assert.equal(ui.state().collection.searches,1);assert.equal(ui.state().collection.home.tea.learned.length,1);
});
test('about screen identifies the build and opens notices without changing game progress',async()=>{
  const s=G.fresh(13),ui=mount(s,{desktop:true});ui.click('about');await new Promise(resolve=>setImmediate(resolve));assert.match(ui.dialog.innerHTML,/123456789abc/);assert.match(ui.dialog.innerHTML,/0.13.1/);assert.match(ui.dialog.innerHTML,/AI 辅助/);ui.click('desktop-notices');assert.equal(ui.desktopCalls.notices,1);assert.deepEqual(ui.state(),s);
  const browser=mount(s);browser.click('about');assert.match(browser.dialog.innerHTML,/browser/);assert.doesNotMatch(browser.dialog.innerHTML,/data-action="desktop-notices"/);
});
test('late version-info response cannot replace a newer help dialog or reopen a closed dialog',async()=>{
  for(const nextAction of ['help','close']){let resolveInfo;const pending=new Promise(resolve=>{resolveInfo=resolve;});const ui=mount(G.fresh(13),{desktop:true,desktopInfo:()=>pending});ui.click('about');assert.match(ui.dialog.innerHTML,/正在读取/);ui.click(nextAction);resolveInfo({version:'unexpected',buildId:'late'});await new Promise(resolve=>setImmediate(resolve));if(nextAction==='help')assert.match(ui.dialog.innerHTML,/一只行囊/);else assert.equal(ui.dialog.dataset.panel,'title');assert.doesNotMatch(ui.dialog.innerHTML,/unexpected/);}
});
test('garden UI commits planting, rolls back failed harvest, and can retry safely',()=>{
  const s=G.fresh(13);G.explore(s,'market');G.buyDecor(s,'flowerbed');const ui=mount(s);
  ui.click('garden-plant','0');assert.match(ui.dialog.innerHTML,/把哪座城的风景种下来/);ui.click('garden-seed','0:daisy');assert.equal(ui.dialog.open,false);assert.equal(ui.state().collection.home.beds[0].key,'daisy');
  const grown=ui.state();grown.collection.searches+=2;const ready=mount(grown);ready.failWrites(true);ready.click('garden-harvest','0');assert.deepEqual(ready.state(),grown);assert.match(ready.html(),/保存遇到问题/);
  ready.failWrites(false);ready.click('garden-harvest','0');assert.equal(ready.state().collection.home.beds[0],null);assert.deepEqual(ready.state().collection.home.flowers,['daisy']);const stamps=ready.state().collection.stamps;ready.click('garden-harvest','0');assert.equal(ready.state().collection.stamps,stamps);
});
test('exhibition selection is a cancellable draft and badge commits only on successful save',()=>{
  const s=G.fresh(13);s.collection.goods=Object.keys(G.GOODS);s.collection.treasures=['leafSeal','moonTea','feather'];s.collection.stamps=20;G.buyDecor(s,'showcase');const ui=mount(s);
  ui.click('exhibition-open');for(const key of s.collection.treasures)ui.click('exhibition-pick',key);assert.match(ui.dialog.innerHTML,/柳溪镇主题展/);assert.deepEqual(ui.state(),s);ui.click('close');ui.click('exhibition-open');assert.match(ui.dialog.innerHTML,/再选 3 件/);
  for(const key of s.collection.treasures)ui.click('exhibition-pick',key);ui.failWrites(true);ui.click('exhibition-save');assert.deepEqual(ui.state(),s);assert.equal(ui.dialog.open,true);
  ui.failWrites(false);ui.click('exhibition-save');assert.deepEqual(ui.state().collection.home.awarded,[0]);assert.equal(ui.state().collection.stamps,s.collection.stamps+5);assert.equal(ui.dialog.open,false);
});
test('new-player guidance responds to buying and skipping without modifying progress or rewards',()=>{
  const s=G.fresh(13),ui=mount(s);assert.match(ui.html(),/挑一件旅途货物/);ui.click('buy','fruit');assert.match(ui.html(),/把第一份远方带回家/);const before=ui.state();ui.click('guide-hide');assert.doesNotMatch(ui.html(),/第一趟远方 ·/);assert.equal(ui.state().gold,before.gold);ui.click('guide-show');assert.match(ui.html(),/第一趟远方 ·/);
});
function start() { const s = G.fresh(13); s.seed = 3; s.forecast.road = 'road'; return s; }
function travelFixture(kind) { for (let seed = 1; seed < 1000; seed++) { const s = G.fresh(seed); G.depart(s, 1, 'road'); if (s.challenge?.kind === kind) return s; } throw new Error('Missing travel fixture'); }

function finishedThirdChapter() {
  const s=start();s.gold=950;
  for(let n=1;n<=3;n++){G.finish(s);if(n<3)G.continueJourney(s);}
  return s;
}
test('desktop title menu continues the journey and exposes window controls only in desktop mode',()=>{
  const s=start(),ui=mount(s,{desktop:true});assert.match(ui.dialog.innerHTML,/继续旅途/);assert.match(ui.html(),/游戏菜单/);
  ui.click('desktop-fullscreen');assert.equal(ui.desktopCalls.fullscreen,1);ui.click('desktop-resume');assert.equal(ui.dialog.open,false);assert.deepEqual(ui.state(),s);
  ui.click('desktop-menu');assert.match(ui.dialog.innerHTML,/退出游戏/);ui.click('desktop-quit');assert.equal(ui.desktopCalls.quit,1);
  const browser=mount(s);assert.doesNotMatch(browser.html(),/游戏菜单/);assert.equal(browser.dialog.open,false);
});
test('desktop save-and-exit reports a competing save and prioritizes damaged-save recovery',()=>{
  const ui=mount(start(),{desktop:true}),other=ui.state();other.gold++;ui.externalSave(other);ui.click('desktop-quit');assert.equal(ui.desktopCalls.quit,0);assert.equal(ui.dialog.open,true);assert.deepEqual(ui.state(),other);
  const damaged=mount(start(),{desktop:true,raw:'bad',backup:start()});assert.match(damaged.dialog.innerHTML,/原始存档未被清空/);assert.doesNotMatch(damaged.dialog.innerHTML,/继续旅途/);
});
test('desktop title menu preserves an in-flight challenge and resumes it paused',()=>{
  const s=travelFixture('fishing');G.startChallenge(s);const ui=mount(s,{desktop:true});
  assert.match(ui.dialog.innerHTML,/继续旅途/);ui.tick(10000);assert.deepEqual(ui.state(),s);ui.click('desktop-resume');assert.match(ui.dialog.innerHTML,/河边钓鱼/);ui.tick(10000);assert.equal(ui.state().challenge.step,0);
});
test('third-chapter ending opens persistent free travel with correct route and collection UI',()=>{
  const s=finishedThirdChapter();s.day=12;const ui=mount(s,{off:true});
  assert.match(ui.dialog.innerHTML,/领取行旅证，继续自由旅行/);ui.click('free-travel');
  assert.equal(ui.state().mode,'free');assert.equal(ui.state().day,12);assert.equal(ui.state().gold,s.gold);assert.deepEqual(ui.state().collection,s.collection);
  ui.click('pane','route');assert.match(ui.html(),/没有考核期限/);assert.match(ui.html(),/不消耗行囊中的口粮/);assert.doesNotMatch(ui.html(),/考核时间到|结算本次旅程|本程目标完成/);assert.match(ui.html(),/下一份远方/);
  assert.match(ui.html(),/data-action="depart" >/);ui.click('depart');assert.equal(ui.state().day,14);assert.equal(ui.state().phase,'event');
  const reloaded=mount(ui.state(),{off:true});assert.equal(reloaded.state().mode,'free');assert.equal(reloaded.state().day,14);
});
test('failed save while unlocking free travel rolls back to the ending and can retry safely',()=>{
  const ui=mount(finishedThirdChapter()),before=ui.state();ui.failWrites(true);ui.click('free-travel');assert.deepEqual(ui.state(),before);assert.match(ui.dialog.innerHTML,/领取行旅证/);
  ui.failWrites(false);ui.click('free-travel');assert.equal(ui.state().mode,'free');const after=ui.state();ui.click('free-travel');assert.deepEqual(ui.state(),after);
});
test('version-eight completed save migrates without resetting and keeps its exact original key',()=>{
  const s=finishedThirdChapter();s.version=8;delete s.mode;const raw=JSON.stringify(s),ui=mount(s,{legacy:8});
  assert.equal(ui.stored('caravan-save-v8'),raw);assert.equal(ui.state().version,G.VERSION);assert.equal(ui.state().phase,'ended');
  ui.click('free-travel');assert.equal(ui.state().mode,'free');assert.equal(ui.stored('caravan-save-v8'),raw);
});

test('scene hotspots and desk tabs switch views without changing the caravan', () => {
  const ui = mount(start()), before = ui.state();
  for (const pane of ['market','orders','route','inventory']) {
    ui.click('visit', pane); assert.match(ui.html(), new RegExp(`main data-pane="${pane}"`));
    ui.click('pane', pane); assert.deepEqual(ui.state(), before);
  }
  ui.click('visit', 'invalid'); assert.match(ui.html(), /main data-pane="inventory"/);
});

test('damaged saves open recovery instead of replacing player bytes with a new game',()=>{
  const s=start(),raw='{broken',ui=mount(s,{raw,backup:s});assert.equal(ui.stored(`caravan-save-v${G.VERSION}`),raw);assert.match(ui.dialog.innerHTML,/原始存档未被清空/);
  ui.click('save-recover');assert.match(ui.dialog.innerHTML,/确认恢复这份进度/);assert.equal(ui.stored(`caravan-save-v${G.VERSION}`),raw);
  ui.click('save-confirm');assert.equal(ui.state().gold,s.gold);assert.deepEqual(ui.state().items,s.items);
});

test('failed or conflicting writes roll back purchases and do not announce successful trade',()=>{
  const ui=mount(start()),before=ui.state();ui.failWrites(true);ui.click('buy','fruit');assert.deepEqual(ui.state(),before);assert.match(ui.html(),/保存遇到问题/);assert.ok(!ui.cues.includes('buy'));
  ui.failWrites(false);ui.click('buy','fruit');assert.equal(ui.state().gold,before.gold-G.buyPrice(before,'fruit'));
  const other=ui.state();other.gold+=1;ui.externalSave(other);const external=ui.stored(`caravan-save-v${G.VERSION}`);ui.click('buy','ice');assert.equal(ui.stored(`caravan-save-v${G.VERSION}`),external);assert.match(ui.html(),/保存遇到问题/);
});

test('backup preview is non-destructive and confirmation restores a paid action only once',()=>{
  const ui=mount(start()),initial=ui.state();ui.click('buy','fruit');const bought=ui.state();ui.click('save-manager');ui.click('save-backup');assert.match(ui.dialog.innerHTML,/恢复这份旅程/);assert.deepEqual(ui.state(),bought);
  ui.click('save-confirm');assert.deepEqual(ui.state(),initial);const raw=ui.stored(`caravan-save-v${G.VERSION}`);ui.click('save-confirm');assert.equal(ui.stored(`caravan-save-v${G.VERSION}`),raw);assert.equal(JSON.parse(ui.stored(`caravan-save-v${G.VERSION}-backup`)).gold,bought.gold);
});

test('file imports validate then preview without changing progress until confirmation',async()=>{
  const ui=mount(start()),before=ui.state(),next=start();G.buy(next,'ice');ui.click('save-manager');
  await ui.importFile(Save.pack(next,G));assert.match(ui.dialog.innerHTML,/导入文件预览/);assert.deepEqual(ui.state(),before);
  ui.click('save-confirm');assert.deepEqual(ui.state(),next);assert.deepEqual(JSON.parse(ui.stored(`caravan-save-v${G.VERSION}-backup`)),before);
  await ui.importFile('{bad');assert.deepEqual(ui.state(),next);await ui.importFile('{}',Save.LIMIT+1);assert.deepEqual(ui.state(),next);
});

test('cancelling an in-flight file import prevents a stale preview from reopening',async()=>{
  const ui=mount(start()),before=ui.state();ui.click('save-manager');const reading=ui.importFile(Save.pack(before,G));ui.click('save-back');await reading;assert.equal(ui.dialog.open,false);assert.deepEqual(ui.state(),before);
});

test('late imports are ignored after resuming, returning to title or opening another dialog',async()=>{
 for(const action of ['desktop-resume','desktop-menu','help']){
  const ui=mount(start()),before=ui.state();ui.click('save-manager');const reading=ui.importFile(Save.pack(before,G));ui.click(action);const expected=ui.dialog.innerHTML;await reading;assert.equal(ui.dialog.innerHTML,expected);assert.deepEqual(ui.state(),before);assert.doesNotMatch(ui.dialog.innerHTML,/导入文件预览/);
 }
});
test('search reveal saves a collectible once and reloading cannot draw again at this stop',()=>{
  let ui=mount(start());ui.click('visit','home');assert.match(ui.html(),/远方有个家/);ui.click('explore','market');
  assert.equal(ui.state().collection.treasures.length,1);assert.match(ui.dialog.innerHTML,/永久收藏/);const stamps=ui.state().collection.stamps;
  ui=mount(ui.state());ui.click('visit','home');assert.match(ui.html(),/本次已寻访/);ui.click('explore','market');assert.equal(ui.state().collection.stamps,stamps);
});
test('buying and placing home decorations persist through restart without spending gold',()=>{
  const ui=mount(start());ui.click('visit','home');ui.click('book-tab','decor');ui.click('buy-decor','bunting');
  assert.equal(ui.state().gold,100);assert.equal(ui.state().collection.stamps,0);assert.equal(ui.state().collection.placed.banner,'bunting');
  ui.click('place-decor','bunting');assert.equal(ui.state().collection.placed.banner,null);ui.click('place-decor','bunting');
  const collection=ui.state().collection;ui.click('restart');assert.match(ui.dialog.innerHTML,/营地布置和已学天赋全部保留/);ui.click('new-game');assert.deepEqual(ui.state().collection,collection);assert.equal(ui.state().gold,100);
});
test('version five UI migration keeps its exact backup and registers owned goods once',()=>{
  const s=start();s.version=5;delete s.collection;delete s.explored;const raw=JSON.stringify(s),ui=mount(s,{legacy:5});
  assert.equal(ui.stored('caravan-save-v5'),raw);assert.equal(ui.state().version,G.VERSION);assert.equal(ui.state().gold,s.gold);assert.deepEqual(ui.state().items,s.items);
  assert.equal(ui.state().collection.goods.length,3);assert.deepEqual(mount(ui.state()).state().collection,ui.state().collection);
});

test('home wishes and cat bonding survive refresh with no duplicate reward or affection',()=>{
  const s=start();s.collection.treasures=['leafSeal','moonTea','feather'];s.collection.searches=3;
  let ui=mount(s);ui.click('visit','home');assert.match(ui.html(),/麦芽/);assert.match(ui.html(),/下一份小心愿/);
  const stamps=ui.state().collection.stamps;ui.click('claim-keepsake','friend');assert.equal(ui.state().collection.stamps,stamps+3);assert.match(ui.dialog.innerHTML,/有猫的归处/);
  ui.click('pet-cat');assert.equal(ui.state().collection.catBond,1);assert.match(ui.dialog.innerHTML,/呼噜/);
  ui=mount(ui.state());ui.click('claim-keepsake','friend');ui.click('pet-cat');assert.equal(ui.state().collection.stamps,stamps+3);assert.equal(ui.state().collection.catBond,1);
  ui.click('new-game');assert.equal(ui.state().collection.catBond,1);assert.ok(ui.state().collection.claimed.includes('friend'));
});

test('version six migration keeps the old save and existing decorations exactly',()=>{
  const s=start();G.buyDecor(s,'bunting');s.version=6;delete s.collection.claimed;delete s.collection.catBond;delete s.collection.catLastSearch;
  const raw=JSON.stringify(s),ui=mount(s,{legacy:6});assert.equal(ui.stored('caravan-save-v6'),raw);assert.equal(ui.state().version,G.VERSION);assert.equal(ui.state().collection.placed.banner,'bunting');assert.equal(ui.state().collection.stamps,0);assert.deepEqual(ui.state().items,s.items);
});

test('a tracked clue leads to discovery and a friend conversation, each persisting once',()=>{
  let ui=mount(start());ui.click('visit','home');ui.click('clue-board');assert.match(ui.dialog.innerHTML,/下一件，想找什么/);ui.click('track-clue','moonTea');assert.equal(ui.state().collection.trail.clue.key,'moonTea');
  ui.click('explore','market');assert.ok(ui.state().collection.treasures.includes('moonTea'));assert.equal(ui.state().collection.trail.clue,null);ui.click('close');ui.click('visitor-info');assert.match(ui.dialog.innerHTML,/一枚旧茶印/);
  const stamps=ui.state().collection.stamps;ui.click('visitor-talk','0:0');assert.equal(ui.state().collection.trail.visitors[0],1);assert.equal(ui.state().collection.stamps,stamps+2);
  ui=mount(ui.state());ui.click('visitor-talk','0:0');assert.equal(ui.state().collection.trail.visitors[0],1);assert.equal(ui.state().collection.stamps,stamps+2);
});

test('guaranteed clue bonus is shown separately and both discoveries survive the save',()=>{
  const s=start();G.trackClue(s,'leafSeal');s.collection.trail.clue.attempts=2;s.collection.pity=2;const ui=mount(s);ui.click('explore','market');assert.match(ui.dialog.innerHTML,/顺着线索，还找到了茶农木印/);assert.ok(ui.state().collection.treasures.includes('leafSeal'));assert.ok(ui.state().collection.treasures.includes('moonTea'));assert.equal(ui.state().collection.trail.clue,null);
});

test('version seven migration preserves exact source save and adds empty story progress',()=>{
  const s=start();s.version=7;delete s.collection.trail;const raw=JSON.stringify(s),ui=mount(s,{legacy:7});assert.equal(ui.stored('caravan-save-v7'),raw);assert.equal(ui.state().version,G.VERSION);assert.deepEqual(ui.state().collection.trail.visitors,[0,0,0]);assert.equal(ui.state().gold,s.gold);
});
test('illustrated product details retain rules and do not purchase or debit money', () => {
  const ui = mount(start()), before = ui.state(); ui.click('goods-info', 'ice');
  assert.match(ui.dialog.innerHTML, /恒温冰晶/); assert.ok(ui.dialog.innerHTML.includes(G.GOODS.ice.effect));
  assert.deepEqual(ui.state(), before); ui.click('close'); assert.equal(ui.dialog.open, false);
  ui.click('pane', 'market'); ui.click('buy', 'herb');
  assert.equal(ui.state().gold, before.gold - G.buyPrice(before, 'herb')); assert.equal(ui.state().items.length, before.items.length + 1);
  assert.match(ui.html(), /main data-pane="market"/); ui.click('pane','inventory'); assert.match(ui.html(), /main data-pane="inventory"/);
});
test('commission cards keep delivery conditions and accepting still selects its destination', () => {
  const ui = mount(start()), order = ui.state().board[0], type = G.ORDER_TYPES[order.type];
  ui.click('visit','orders'); assert.match(ui.html(), /交付条件/); ui.click('accept', String(order.id));
  assert.equal(ui.state().order.id, order.id); ui.click('visit','route');
  assert.ok(ui.html().includes(`柳溪镇 → ${G.CITIES[type.city].name}`));
  assert.match(ui.html(), /当前限时订单/);
});

test('travel offer survives reload; declining continues the original encounter with no extra departure cost', () => {
  const s = travelFixture('memory'), ui = mount(s), before = s.gold;
  assert.match(ui.dialog.innerHTML, /试试这个挑战/); assert.match(mount(ui.state()).dialog.innerHTML, /直接继续赶路/);
  ui.click('challenge-skip'); assert.equal(ui.state().gold, before); assert.equal(ui.state().phase, 'event');
  const choice = G.eventInfo(ui.state()).choices.find(c => ['rest','water'].includes(c.id));
  ui.click('resolve', choice.id); ui.tick(3000); assert.equal(ui.state().city, 1); assert.equal(ui.state().journeys, 1); assert.equal(ui.dialog.open, false);
});
test('memory UI reveals, matches and returns to the trip after a single reward', () => {
  let ui = mount(travelFixture('memory')); ui.click('challenge-start');
  const before = ui.state().gold, deck = G.memoryDeck(ui.state().challenge);
  for (let value = 0; value < 4; value++) {
    const pair = deck.flatMap((v, i) => v === value ? [i] : []), step = ui.state().challenge.step;
    ui.click('memory-pick', `${step}:${pair[0]}`); ui = mount(ui.state()); assert.match(ui.dialog.innerHTML, /revealed/);
    ui.click('memory-pick', `${step}:${pair[1]}`); if (value < 3) ui.click('memory-next');
  }
  assert.equal(ui.state().gold, before + 32); assert.match(ui.dialog.innerHTML, /继续这段旅途/);
  ui.click('challenge-return'); ui.tick(3000); assert.equal(ui.state().phase, 'event'); assert.equal(ui.state().gold, before + 32);
  assert.doesNotMatch(ui.dialog.innerHTML, /试试这个挑战/);
});
test('bridge interface keeps rotations through refresh and settles a connected route', () => {
  let ui = mount(travelFixture('bridge')); ui.click('challenge-start'); const before = ui.state().gold;
  for (const i of [3,0,1,2,5]) while (ui.state().challenge.turns[i] !== 0) { ui.click('bridge-turn', `${ui.state().challenge.step}:${i}`); ui = mount(ui.state()); }
  assert.match(ui.dialog.innerHTML, /桥已连通/); ui.click('bridge-submit'); ui.click('bridge-submit'); assert.equal(ui.state().gold, before + 32);
});
test('fishing pauses in settings and background, restores paused and stops at each timed-out cast', () => {
  let ui = mount(travelFixture('fishing')); ui.click('challenge-start'); ui.click('fish-resume'); ui.tick(1200);
  ui.click('fish-pause'); assert.equal(ui.state().challenge.ticks, 10); ui.tick(3000); assert.equal(ui.state().challenge.ticks, 10);
  ui = mount(ui.state()); ui.tick(3000); assert.equal(ui.state().challenge.ticks, 10); assert.match(ui.dialog.innerHTML, /开始 \/ 继续垂钓/);
  ui.click('fish-resume'); ui.click('audio-settings'); ui.tick(3000); assert.match(ui.dialog.innerHTML, /声音设置/);
  ui.click('audio-back'); ui.click('fish-resume'); ui.hide(); ui.tick(3000); assert.match(ui.dialog.innerHTML, /开始 \/ 继续垂钓/);
  ui = mount(ui.state()); ui.click('fish-resume'); ui.tick(9600); assert.equal(ui.state().challenge.step, 1); assert.deepEqual(ui.state().challenge.answers, [-1]);
  ui.tick(30000); assert.equal(ui.state().challenge.step, 1); ui.click('challenge-exit'); ui.tick(30000); assert.equal(ui.state().challenge.status, 'skipped'); assert.equal(ui.state().phase, 'event');
});
test('static fishing uses manual water layers and three catches credit once', () => {
  const ui = mount(travelFixture('fishing'), {off: true}), before = ui.state().gold; ui.click('challenge-start');
  for (let step = 0; step < 3; step++) { ui.click('fish-resume'); ui.tick(10000); assert.equal(ui.state().challenge.step, step); ui.click('fish-depth', String(G.fishingTarget(ui.state().challenge))); ui.click('fish-cast', String(step)); ui.click('fish-cast', String(step)); }
  assert.equal(ui.state().gold, before + 36); assert.equal(ui.state().challenge.status, 'done'); assert.equal(ui.state().phase, 'event');
});

test('transaction sound distinguishes a successful purchase from a rejected one', () => {
  const s = start(); s.gold = 8; const ui = mount(s); ui.click('buy', 'herb');
  assert.deepEqual(ui.cues, ['buy']); ui.click('buy', 'herb'); assert.deepEqual(ui.cues, ['buy', 'wrong']); assert.equal(ui.state().gold, 0);
});
test('sound settings pause active driving and return without exiting or advancing it', () => {
  const ui = mount(start()); ui.click('challenge-start'); ui.click('drive-resume'); ui.tick(1600);
  const step = ui.state().challenge.step; ui.click('audio-settings'); ui.tick(5000); assert.equal(ui.state().challenge.step, step);
  assert.match(ui.dialog.innerHTML, /声音设置/); ui.click('audio-toggle'); assert.match(ui.dialog.innerHTML, /音效：关闭/);
  ui.click('audio-back'); assert.match(ui.dialog.innerHTML, /开始 \/ 继续驾驶/); assert.equal(ui.state().challenge.status, 'active');
  ui.tick(5000); assert.equal(ui.state().challenge.step, step);
});
test('new chapter content renders goods, order requirements and rotating fair information', () => {
  const s = start(); s.gold = 400; G.finish(s); G.continueJourney(s); let ui = mount(s);
  assert.match(ui.html(), /药师的花蜜方/); assert.match(ui.html(), /每罐贴着药草/); assert.match(ui.html(), /购买山花蜜罐/);
  assert.ok(ui.html().indexOf('接下「药师的花蜜方」') < ui.html().indexOf('接下「山外的药箱」'));
  assert.ok(ui.html().indexOf('购买山花蜜罐') < ui.html().indexOf('购买云雾茶'));
  ui.click('chapters'); assert.match(ui.dialog.innerHTML, /彩釉花灯/);
  s.gold = 700; G.finish(s); G.continueJourney(s); ui = mount(s);
  assert.match(ui.html(), /巡回商会/); assert.match(ui.html(), /下次抵达时：柳溪镇/); assert.doesNotMatch(ui.html(), /undefined/);
});
test('version three UI migration keeps its old backup and credits the modification refund once', () => {
  const s = start(); s.version = 3; s.mods.wheels = true; s.gold = 55;
  const ui = mount(s, {legacy: 3}); assert.equal(ui.state().gold, 82); assert.equal(ui.state().version,G.VERSION);
  assert.equal(ui.stored('caravan-save-v3'), JSON.stringify(s)); assert.equal(mount(ui.state()).state().gold, 82);
});

test('departure is saved before animation; repeated skip never charges twice', () => {
  const ui = mount(start()); ui.click('depart');
  assert.equal(ui.state().phase, 'event'); assert.equal(ui.state().day, 3); assert.equal(ui.state().gold, 95);
  assert.match(ui.dialog.innerHTML, /跳过演出/);
  ui.click('skip-scene'); ui.click('skip-scene'); ui.tick(5000);
  assert.match(ui.dialog.innerHTML, /卖给茶商/); assert.equal(ui.state().gold, 95); assert.equal(ui.state().journeys, 1);
});
test('driving pauses on request, hidden page and reload; completion is credited only once', () => {
  let ui = mount(start()); ui.click('challenge-start'); ui.tick(5000); assert.equal(ui.state().challenge.step, 0);
  ui.click('drive-resume'); ui.tick(1600); assert.equal(ui.state().challenge.step, 1);
  ui.click('drive-pause'); ui.tick(5000); assert.equal(ui.state().challenge.step, 1);
  ui.click('drive-resume'); ui.hide(); ui.tick(5000); assert.equal(ui.state().challenge.step, 1);
  ui = mount(ui.state()); ui.tick(5000); assert.equal(ui.state().challenge.step, 1);
  ui.click('drive-resume'); ui.tick(24000); assert.equal(ui.state().challenge.status, 'done');
  const money = ui.state().gold; ui.click('close'); ui.click('drive-resume'); ui.tick(30000);
  assert.equal(ui.state().gold, money); assert.equal(mount(ui.state()).dialog.open, false);
});
test('exiting driving cancels its pending step and does not pay partial rewards', () => {
  const ui = mount(start()); ui.click('challenge-start'); ui.click('drive-resume'); ui.tick(1600);
  ui.click('challenge-exit'); ui.tick(30000); assert.equal(ui.state().challenge.step, 1);
  assert.equal(ui.state().gold, 100); assert.equal(ui.state().challenge.status, 'skipped'); assert.equal(ui.dialog.open, false);
});
test('both reduced motion modes use manual driving with no background steps', () => {
  for (const options of [{off: true}, {reduced: true}]) {
    const ui = mount(start(), options); ui.click('challenge-start'); ui.click('drive-resume'); ui.tick(30000);
    assert.equal(ui.state().challenge.step, 0); assert.match(ui.dialog.innerHTML, /通过这一段/);
    for (let n = 0; n < 15; n++) { ui.click('drive-lane', String(G.driveWave(ui.state().challenge).coin)); ui.click('drive-step'); }
    assert.equal(ui.state().gold, 136); assert.equal(ui.state().reputation, 1);
    ui.click('drive-step'); assert.equal(ui.state().gold, 136);
  }
});
test('appraisal UI preserves answers across reload and rejects double clicks from the old round', () => {
  const s = start(); s.journeys = 2;
  s.challenge = {...s.challenge, kind: 'appraise'};
  let ui = mount(s); ui.click('challenge-start');
  for (let n = 0; n < 3; n++) {
    const answer = `${n}:${G.appraisalRound(ui.state().challenge).target}`;
    ui.click('appraise-pick', answer); ui.click('appraise-pick', answer); assert.equal(ui.state().challenge.step, n + 1);
    if (n < 2) { ui = mount(ui.state()); assert.match(ui.dialog.innerHTML, /选择 A/); }
  }
  assert.equal(ui.state().gold, 132); assert.equal(ui.state().reputation, 1); assert.match(ui.dialog.innerHTML, /三轮中答对 3 轮/);
});
test('loading a legacy save keeps its original backup and persists the upgraded save', () => {
  const s = start(); s.version = 2; delete s.mods; delete s.chapter; delete s.reputation; delete s.challenge;
  const ui = mount(s, {legacy: true}); assert.equal(ui.state().version,G.VERSION); assert.equal(ui.state().gold, s.gold);
  assert.equal(ui.stored('caravan-save-v2'), JSON.stringify(s)); assert.deepEqual(ui.state().items, s.items);
});
test('reloading during departure resumes the committed encounter, with no second departure', () => {
  const ui = mount(start()); ui.click('depart'); const reloaded = mount(ui.state());
  assert.match(reloaded.dialog.innerHTML, /卖给茶商/); assert.doesNotMatch(reloaded.dialog.innerHTML, /跳过演出/);
  assert.equal(reloaded.state().gold, 95); assert.equal(reloaded.state().day, 3);
});
test('resolving then skipping reaction and arrival pays exactly once', () => {
  const ui = mount(start()); ui.click('depart'); ui.click('skip-scene'); ui.click('resolve', 'trade');
  assert.equal(ui.state().gold, 119); assert.equal(ui.state().city, 1); assert.equal(ui.state().phase, 'market');
  ui.click('resolve', 'trade'); // A stale double-click during the cinematic is ignored.
  ui.click('skip-scene'); assert.match(ui.dialog.innerHTML, /抵达松湾港/);
  ui.click('skip-scene'); ui.tick(10000);
  assert.equal(ui.dialog.open, false); assert.equal(ui.state().gold, 119);
  const reloaded = mount(ui.state()); assert.equal(reloaded.dialog.open, false); assert.equal(reloaded.state().gold, 119);
});
test('automatic timers reach the encounter and arrival without further input', () => {
  const ui = mount(start()); ui.click('depart'); ui.tick(2600); assert.match(ui.dialog.innerHTML, /卖给茶商/);
  ui.click('resolve', 'rest'); ui.tick(2500); assert.equal(ui.dialog.open, false); assert.equal(ui.state().gold, 100);
});
test('disabled motion and OS reduced motion skip interludes, but retain encounter artwork', () => {
  for (const options of [{ off: true }, { reduced: true }]) {
    const ui = mount(start(), options); ui.click('depart');
    assert.match(ui.dialog.innerHTML, /data-scene="road"/); assert.doesNotMatch(ui.dialog.innerHTML, /跳过演出/);
    ui.click('resolve', 'rest'); assert.equal(ui.dialog.open, false); assert.equal(ui.state().gold, 100);
  }
});
test('equipment sale remains a separate encounter across skip and reload', () => {
  const s = start(); G.buy(s, 'lantern'); const ui = mount(s); ui.click('depart'); ui.click('skip-scene');
  const before = ui.state().gold; ui.click('resolve', 'barter-sell');
  assert.equal(ui.state().gold, before + 34); assert.equal(ui.state().phase, 'event');
  const reloaded = mount(ui.state()); assert.match(reloaded.dialog.innerHTML, /卖给茶商/);
  ui.click('skip-scene'); ui.tick(4000); assert.match(ui.dialog.innerHTML, /卖给茶商/); assert.equal(ui.state().gold, before + 34);
});
test('delivery receipt is shown after payment; closing, waiting and reloading do not repeat it', () => {
  const s = start(); G.acceptOrder(s, s.board[0].id);
  while (s.items.filter(i => i.kind === 'herb').length < s.order.quantity) G.buy(s, 'herb');
  G.depart(s, 1, 'road'); resolveSkippingChallenge(s, 'rest');
  const expected = s.gold + G.orderItems(s).slice(0, s.order.quantity).reduce((n, i) => n + G.salePrice(s, i), 0) + s.order.bonus;
  const ui = mount(s); ui.click('deliver');
  assert.match(ui.dialog.innerHTML, /收好钱袋/); assert.equal(ui.state().gold, expected); assert.equal(ui.state().completedOrders, 1);
  ui.click('close'); ui.tick(10000); const reloaded = mount(ui.state());
  assert.equal(reloaded.state().gold, expected); assert.equal(reloaded.state().order, null); assert.equal(reloaded.dialog.open, false);
});

test('city discovery labels differ, opening is read-only and both entrances share one stop',()=>{
  for(const [city,name,wild]of [[0,'茶摊寻香','柳溪茶山'],[1,'港口拾忆','松湾潮滩'],[2,'陶市访匠','金穗古窑']]){
    const s=G.fresh(13);if(city!==0){G.depart(s,city,'road');while(s.phase==='event')resolveSkippingChallenge(s,s.event.key==='barter'?'barter-keep':s.event.key==='road'?'rest':'water');}const ui=mount(s);ui.click('city-explore');assert.match(ui.dialog.innerHTML,new RegExp(name));assert.match(ui.dialog.innerHTML,new RegExp(wild));if(city>0)assert.match(ui.dialog.innerHTML,/data-value="wild" disabled/);else assert.doesNotMatch(ui.dialog.innerHTML,/data-value="wild" disabled/);assert.deepEqual(ui.state(),s);
    ui.click('close');assert.deepEqual(ui.state(),s);ui.click('city-explore');ui.click('explore','market');const after=ui.state();assert.equal(after.collection.searches,s.collection.searches+1);assert.equal(after.gold,s.gold);assert.equal(after.day,s.day);assert.equal(G.TREASURES[after.collection.treasures.at(-1)].city,city);
    ui.click('close');ui.click('city-explore');assert.match(ui.dialog.innerHTML,/本次已经寻访过了/);ui.click('explore','wild');assert.deepEqual(ui.state(),after);ui.click('close');ui.click('pane','home');ui.click('explore','market');assert.deepEqual(ui.state(),after);
  }
});
test('direct city discovery rolls back failed saving and blocks locked wild searches',()=>{
  const s=G.fresh(13);G.depart(s,1,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['rest','water','barter-keep'].includes(c.id)).id);const ui=mount(s);ui.click('city-explore');ui.click('explore','wild');assert.deepEqual(ui.state(),s);
  ui.failWrites(true);ui.click('explore','market');assert.deepEqual(ui.state(),s);assert.match(ui.html(),/保存遇到问题/);ui.failWrites(false);ui.click('city-explore');ui.click('explore','market');assert.equal(ui.state().collection.searches,1);
});
test('chapter milestones describe the correct next stage and retain confirmed progress',()=>{
  const s=G.fresh(13);s.gold=950;
  for(const [chapter,title] of [[1,'商会执照到手了'],[2,'商路上，有人记得你'],[3,'把远方，走成自己的家']]){
    G.finish(s);const ui=mount(s),before=ui.state();assert.match(ui.dialog.innerHTML,new RegExp(title));assert.match(ui.dialog.innerHTML,/本程路段/);assert.match(ui.dialog.innerHTML,/累计委托/);assert.deepEqual(ui.state(),before);
    if(chapter===1){assert.match(ui.dialog.innerHTML,/花蜜与药草/);assert.doesNotMatch(ui.dialog.innerHTML,/data-action="free-travel"/);}
    if(chapter===2)assert.match(ui.dialog.innerHTML,/会场交单 \+15 G/);
    ui.failWrites(true);ui.click(chapter===3?'free-travel':'continue-journey');assert.deepEqual(ui.state(),before);ui.failWrites(false);ui.click(chapter===3?'free-travel':'continue-journey');
    assert.deepEqual(ui.state().collection,before.collection);assert.equal(ui.state().gold,before.gold);assert.equal(ui.state().chapter,chapter===3?3:chapter+1);assert.equal(ui.state().mode,chapter===3?'free':'story');
    if(chapter<3)G.continueJourney(s);
  }
  const failed=G.fresh(13);G.finish(failed);const ui=mount(failed);assert.match(ui.dialog.innerHTML,/暂未达标/);assert.doesNotMatch(ui.dialog.innerHTML,/journey-unlocks|data-action="continue-journey"|data-action="free-travel"/);
});

test('priority clues open the correct destination without spending a search or losing a target',()=>{
  const s=G.fresh(13);G.trackClue(s,'moonTea');const ui=mount(s);ui.click('pane','home');assert.ok(ui.html().indexOf('clue-priority')<ui.html().indexOf('手作茶席'));
  ui.click('clue-route');assert.match(ui.dialog.innerHTML,/柳溪镇 · 小小寻访/);assert.deepEqual(ui.state(),s);ui.click('close');ui.click('clue-board');assert.match(ui.dialog.innerHTML,/clue-target-art/);assert.match(ui.dialog.innerHTML,/aria-pressed="true"/);ui.click('close');assert.deepEqual(ui.state(),s);
  ui.click('clue-board');ui.failWrites(true);ui.click('track-clue','pearl');assert.deepEqual(ui.state(),s);ui.failWrites(false);ui.click('track-clue','pearl');const tracked=ui.state();ui.click('clue-route');assert.match(ui.html(),/data-pane="route"/);assert.deepEqual(ui.state(),tracked);
});

test('free-travel scene opens target selection directly and completed collections retire that prompt',()=>{
  const s=finishedThirdChapter();G.startFreeTravel(s);const ui=mount(s);ui.click('pane','town');const quest=ui.html().split('class="world-quest"')[1].split('</section>')[0];assert.match(quest,/data-action="clue-board"/);ui.click('clue-board');assert.deepEqual(ui.state(),s);ui.click('track-clue','pearl');ui.click('pane','town');assert.match(ui.html().split('class="world-quest"')[1].split('</section>')[0],/data-action="clue-route"/);
  const complete=G.fresh(13);complete.collection.treasures=Object.keys(G.TREASURES);complete.collection.searches=12;const done=mount(complete);done.click('pane','home');assert.match(done.html(),/三城珍藏都到家了/);assert.doesNotMatch(done.html(),/class="clue-invite/);done.click('visitor-info');assert.deepEqual(done.state(),complete);
});
