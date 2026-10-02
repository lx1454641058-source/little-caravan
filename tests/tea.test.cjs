// Original tea progression, persistence and boundary tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js'),Save=require('../storage.js');
const recipes={morning:[0,3,4],sunset:[0,2,3,4],home:[0,1,2,3,4]};
function travel(s,city){G.depart(s,city,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event'){const choice=G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id));assert.ok(choice);G.resolve(s,choice.id);}}
test('first local recipe creates a permanent tea table without consuming cargo, currency or exploration',()=>{
  const s=G.fresh(13),before=JSON.parse(JSON.stringify(s));assert.equal(G.teaStatus(s,'morning').ready,true);
  assert.deepEqual(G.brewTea(s,'morning',recipes.morning),{key:'morning',isNew:true,reward:2});assert.equal(s.collection.home.tea.display,'morning');assert.equal(s.collection.stamps,before.collection.stamps+2);
  for(const key of ['gold','day','items','explored','seed','stock'])assert.deepEqual(s[key],before[key]);
  assert.equal(s.collection.searches,0);assert.deepEqual(Save.parse(Save.pack(s,G),G),s);
  const last=s.collection.home.tea.lastSearch;assert.equal(G.brewTea(s,'morning',recipes.morning).reward,0);assert.equal(s.collection.stamps,before.collection.stamps+2);assert.equal(s.collection.home.tea.lastSearch,last);
});
test('actual trips and discoveries unlock three recipes; practice never delays the next recipe',()=>{
  const s=G.fresh(13);
  for(const [index,key]of Object.keys(recipes).entries()){
    if(index){assert.equal(G.teaStatus(s,key).ready,false);G.explore(s,'market');travel(s,1);G.explore(s,'market');assert.equal(G.teaStatus(s,key).ready,false);assert.throws(()=>G.brewTea(s,key,recipes[key]));travel(s,0);G.brewTea(s,'morning',recipes.morning);assert.equal(G.teaStatus(s,key).ready,true);}
    G.brewTea(s,key,recipes[key]);assert.ok(G.restore(s));
  }
  assert.deepEqual(s.collection.home.tea.learned,Object.keys(recipes));const next=G.fresh(14,s.collection);assert.deepEqual(next.collection.home.tea,s.collection.home.tea);
  for(const key of Object.keys(recipes)){G.displayTea(next,key);assert.equal(next.collection.home.tea.display,key);G.displayTea(next,key);assert.equal(next.collection.home.tea.display,null);}
});
test('invalid mixtures, blocked phases and locked recipes do not change state',()=>{
  const s=G.fresh(13);for(const picks of [null,[],[0,0,0],[0,3,NaN],[-1,3,4],[6,3,4],[0.1,3,4],Array(6).fill(0)]){const before=JSON.stringify(s);assert.throws(()=>G.brewTea(s,'morning',picks));assert.equal(JSON.stringify(s),before);}
  for(const key of ['__proto__','home','sunset']){const before=JSON.stringify(s);assert.throws(()=>G.brewTea(s,key,recipes.home));assert.equal(JSON.stringify(s),before);}
  G.startChallenge(s);const before=JSON.stringify(s);assert.throws(()=>G.brewTea(s,'morning',recipes.morning));assert.throws(()=>G.displayTea(s,'morning'));assert.equal(JSON.stringify(s),before);
});
test('v10 upgrade preserves original bytes and every prior progress field',()=>{
  const old=G.fresh(13);G.explore(old,'market');G.buyDecor(old,'flowerbed');G.plantFlower(old,0,'daisy');old.version=10;delete old.collection.home.tea;
  const raw=JSON.stringify(old),disk=new Map([['caravan-save-v10',raw]]),store=Save.create({getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},G);
  const loaded=store.load();assert.equal(loaded.legacy,true);assert.equal(loaded.blocked,false);store.commit(loaded.state);assert.equal(disk.get('caravan-save-v10'),raw);
  const expected=JSON.parse(raw);expected.version=G.VERSION;expected.collection.home.tea={learned:[],lastSearch:null,display:null};assert.deepEqual(loaded.state,expected);assert.deepEqual(G.restore(loaded.state),expected);
});
test('impossible tea records are rejected, including premature progress and duplicate rewards',()=>{
  for(const mutate of [t=>t.learned=['sunset'],t=>t.learned=['morning','morning'],t=>t.learned=['__proto__'],t=>t.display='morning',t=>t.lastSearch=0,t=>t.learned=null]){const s=G.fresh(13);mutate(s.collection.home.tea);assert.equal(G.restore(s),null);}
  const s=G.fresh(13);G.brewTea(s,'morning',recipes.morning);for(const n of [-1,1,NaN,null]){const bad=JSON.parse(JSON.stringify(s));bad.collection.home.tea.lastSearch=n;assert.equal(G.restore(bad),null);}
  const early=JSON.parse(JSON.stringify(s));early.collection.home.tea.learned.push('sunset');assert.equal(G.restore(early),null);
});
