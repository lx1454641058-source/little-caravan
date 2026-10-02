// Original pottery progression and preservation tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js'),Save=require('../storage.js'),fs=require('node:fs'),vm=require('node:vm');
const piece=(key,glaze='jade',pattern='wheat')=>({profile:[...G.POTTERY_FORMS[key].target],glaze,pattern});
function travel(s,city){G.depart(s,city,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id)).id);}
function studio(){const s=G.fresh(13);travel(s,2);return s;}
test('first fired pottery preserves exact authored profile, glaze and pattern without consuming cargo',()=>{
  const s=studio(),before=JSON.parse(JSON.stringify(s)),draft=piece('bowl');draft.profile[1]+=5;
  assert.deepEqual(G.firePottery(s,'bowl',draft),{key:'bowl',isNew:true,reward:2});assert.deepEqual(s.collection.home.pottery.pieces.bowl,draft);assert.equal(s.collection.home.pottery.display,'bowl');assert.equal(s.collection.stamps,before.collection.stamps+2);for(const key of ['items','gold','day','seed','explored','stock'])assert.deepEqual(s[key],before[key]);
  draft.profile[0]=15;assert.notEqual(s.collection.home.pottery.pieces.bowl.profile[0],15);assert.deepEqual(Save.parse(Save.pack(s,G),G),s);const stable=JSON.stringify(s);assert.throws(()=>G.firePottery(s,'bowl',piece('bowl')));assert.equal(JSON.stringify(s),stable);
});
test('learned forms allow free shaping only after confirming the exact previous piece',()=>{
  const s=studio();G.firePottery(s,'bowl',piece('bowl'));const old=JSON.parse(JSON.stringify(s.collection.home.pottery.pieces.bowl)),balance=s.collection.stamps,last=s.collection.home.pottery.lastSearch;
  const free={profile:[15,80,15,80],glaze:'night',pattern:'dots'};assert.deepEqual(G.firePottery(s,'bowl',free,old),{key:'bowl',isNew:false,reward:0});assert.deepEqual(s.collection.home.pottery.pieces.bowl,free);assert.equal(s.collection.stamps,balance);assert.equal(s.collection.home.pottery.lastSearch,last);assert.ok(G.restore(s));
  const stable=JSON.stringify(s);assert.throws(()=>G.firePottery(s,'bowl',piece('bowl'),old));assert.equal(JSON.stringify(s),stable);
});
test('real trips and discoveries unlock all three forms; changing the displayed item keeps crafted pieces',()=>{
  const s=studio();for(const [index,key]of Object.keys(G.POTTERY_FORMS).entries()){
    if(index){assert.equal(G.potteryStatus(s,key).ready,false);G.explore(s,'market');travel(s,0);G.explore(s,'market');assert.equal(G.potteryStatus(s,key).ready,false);travel(s,2);assert.equal(G.potteryStatus(s,key).ready,true);}
    G.firePottery(s,key,piece(key));assert.ok(G.restore(s));
  }const before=JSON.parse(JSON.stringify(s.collection.home.pottery));G.displayPottery(s,'vase');assert.equal(s.collection.home.pottery.display,null);G.displayPottery(s,'bowl');assert.deepEqual(s.collection.home.pottery.pieces,before.pieces);const restarted=G.fresh(19,s.collection);assert.deepEqual(restarted.collection,s.collection);assert.ok(G.restore(restarted));
});
test('range edges, non-numeric profiles, missing slots and invalid names are rejected without mutation',()=>{
  const s=studio();for(const profile of [[34,54,64,79],[14,54,64,72],[34,54,64,81],[34,54,64,72.5],[34,54,64,NaN],Array(4),[],null]){const before=JSON.stringify(s);assert.throws(()=>G.firePottery(s,'bowl',{profile,glaze:'jade',pattern:'wheat'}));assert.equal(JSON.stringify(s),before);}
  for(const bad of [{...piece('bowl'),glaze:'__proto__'},{...piece('bowl'),pattern:'missing'}])assert.throws(()=>G.firePottery(s,'bowl',bad));assert.throws(()=>G.firePottery(s,'jar',piece('jar')));assert.throws(()=>G.firePottery(s,'__proto__',piece('bowl')));
  const origin=G.fresh(13);assert.throws(()=>G.firePottery(origin,'bowl',piece('bowl')));G.startChallenge(origin);assert.throws(()=>G.firePottery(origin,'bowl',piece('bowl')));
  assert.equal(G.potteryFit('bowl',[28,60,58,78]),true);assert.equal(G.potteryFit('bowl',[27,60,58,78]),false);
});
test('v12 migration preserves tea and a paused voyage, without replacing old save bytes',()=>{
  const old=G.fresh(13);G.brewTea(old,'morning',[0,3,4]);travel(old,1);G.startSailing(old,'skiff');G.sail(old,'east',0);old.version=12;delete old.collection.home.pottery;
  const raw=JSON.stringify(old),disk=new Map([['caravan-save-v12',raw]]),store=Save.create({getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},G),loaded=store.load();assert.equal(loaded.legacy,true);assert.equal(loaded.blocked,false);store.commit(loaded.state);assert.equal(disk.get('caravan-save-v12'),raw);
  const expected=JSON.parse(raw);expected.version=G.VERSION;expected.collection.home.pottery={learned:[],lastSearch:null,pieces:{bowl:null,jar:null,vase:null},display:null};assert.deepEqual(loaded.state,expected);
});
test('malformed pottery archives cannot replace valid progress',()=>{
  const s=studio();G.firePottery(s,'bowl',piece('bowl'));for(const mutate of [p=>p.learned=['jar'],p=>p.learned=['bowl','bowl'],p=>p.lastSearch=-1,p=>p.lastSearch=99,p=>p.pieces.bowl=null,p=>p.pieces.jar=piece('jar'),p=>p.pieces.bowl.profile[2]=0,p=>p.pieces.bowl.pattern='__proto__',p=>p.display='vase',p=>delete p.pieces.vase]){const bad=JSON.parse(JSON.stringify(s));mutate(bad.collection.home.pottery);assert.equal(G.restore(bad),null);}
});
test('pottery artwork responds to custom profiles and all glaze/pattern combinations; clip ids are unique',()=>{
  const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../art.js'),'utf8'),context);const Art=context.window.Art,ids=new Set();
  for(const key of Object.keys(G.POTTERY_FORMS))for(const glaze of Object.keys(G.POTTERY_GLAZES))for(const pattern of Object.keys(G.POTTERY_PATTERNS)){const svg=Art.potteryPiece(key,piece(key,glaze,pattern));assert.ok(svg.includes(G.POTTERY_GLAZES[glaze].color));assert.doesNotMatch(svg,/NaN|undefined/);const id=svg.match(/id="(pottery-clip-\d+)"/)[1];assert.equal(ids.has(id),false);ids.add(id);}
  const a=Art.potteryPiece('vase',piece('vase')),custom=piece('vase');custom.profile[1]=20;const b=Art.potteryPiece('vase',custom);assert.notEqual(a.match(/<path d="([^"]+)"/)[1],b.match(/<path d="([^"]+)"/)[1]);assert.equal(ids.size,36);
});
