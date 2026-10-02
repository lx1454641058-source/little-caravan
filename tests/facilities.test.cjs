// Original home progression and migration regression tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js'),Save=require('../storage.js');
function collector(){const s=G.fresh(13);s.collection.treasures=Object.keys(G.TREASURES);s.collection.goods=Object.keys(G.GOODS);s.collection.stamps=100;s.collection.searches=12;return s;}
function travel(s,destination){G.depart(s,destination,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event'){const choice=G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id));assert.ok(choice);G.resolve(s,choice.id);}}
test('new players unlock the first garden from a real first discovery with no setup grants',()=>{
  const s=G.fresh(13);assert.equal(G.gardenBeds(s),0);assert.equal(s.collection.home.guideHidden,false);
  const before=JSON.stringify(s);assert.throws(()=>G.plantFlower(s,0,'daisy'));assert.equal(JSON.stringify(s),before);
  G.buy(s,'fruit');G.explore(s,'market');G.buyDecor(s,'flowerbed');assert.equal(G.gardenBeds(s),1);G.plantFlower(s,0,'daisy');assert.equal(G.flowerGrowth(s,0),0);
  assert.throws(()=>G.harvestFlower(s,0));assert.throws(()=>G.plantFlower(s,0,'daisy'));assert.throws(()=>G.plantFlower(s,1,'daisy'));
  travel(s,1);G.explore(s,'market');assert.equal(G.flowerGrowth(s,0),1);const resumed=G.restore(s);assert.ok(resumed);travel(resumed,2);G.explore(resumed,'market');
  assert.equal(G.flowerGrowth(resumed,0),2);const money=resumed.gold,stamps=resumed.collection.stamps;
  assert.deepEqual(G.harvestFlower(resumed,0),{key:'daisy',isNew:true,reward:2});assert.equal(resumed.gold,money);assert.equal(resumed.collection.stamps,stamps+2);assert.equal(resumed.collection.home.bouquet,'daisy');
  assert.throws(()=>G.harvestFlower(resumed,0));assert.deepEqual(G.restore(resumed),resumed);
});
test('local seeds follow discovered cities and rarity; invalid actions leave state intact',()=>{
  const s=G.fresh(13);G.explore(s,'market');G.buyDecor(s,'flowerbed');assert.equal(G.seedUnlocked(s,'daisy'),true);assert.equal(G.seedUnlocked(s,'lavender'),false);
  s.collection.treasures=['leafSeal'];assert.equal(G.seedUnlocked(s,'moonflower'),false);s.collection.treasures.push('moonTea');assert.equal(G.seedUnlocked(s,'moonflower'),true);
  for(const [index,key]of [[-1,'daisy'],[3,'daisy'],[0,'__proto__'],[0,'coral']]){const before=JSON.stringify(s);assert.throws(()=>G.plantFlower(s,index,key));assert.equal(JSON.stringify(s),before);}
});
test('greenhouse grows all six flowers; decor changes and new caravans retain growing beds',()=>{
  const s=collector();G.buyDecor(s,'flowerbed');G.buyDecor(s,'greenhouse');assert.equal(G.gardenBeds(s),3);
  const keys=Object.keys(G.FLOWERS);
  for(let batch=0;batch<2;batch++){for(let i=0;i<3;i++)G.plantFlower(s,i,keys[batch*3+i]);G.placeDecor(s,'greenhouse');s.collection.searches+=2;for(let i=0;i<3;i++){assert.equal(G.harvestFlower(s,i).isNew,true);assert.ok(G.restore(s));}}
  assert.deepEqual(s.collection.home.flowers,keys);G.chooseBouquet(s,'daisy');G.plantFlower(s,1,'daisy');s.collection.searches+=200;assert.equal(G.flowerGrowth(s,1),2);
  const next=G.fresh(8,s.collection);assert.deepEqual(next.collection,s.collection);assert.equal(G.harvestFlower(next,1).reward,1);assert.deepEqual(Save.parse(Save.pack(next,G),G),next);
});
test('three unique owned treasures form exhibitions; badges pay once per city, not arrangement',()=>{
  const s=collector();const before=JSON.stringify(s);assert.throws(()=>G.arrangeExhibition(s,['leafSeal','moonTea','feather']));assert.equal(JSON.stringify(s),before);G.buyDecor(s,'showcase');const goods=JSON.stringify(s.items),treasures=[...s.collection.treasures];
  for(let city=0;city<3;city++){const keys=treasures.filter(k=>G.TREASURES[k].city===city),stamps=s.collection.stamps;assert.deepEqual(G.arrangeExhibition(s,keys.slice(0,3)),{city,first:true});assert.equal(s.collection.stamps,stamps+5);assert.deepEqual(G.arrangeExhibition(s,keys.slice(1)),{city,first:false});assert.equal(s.collection.stamps,stamps+5);assert.ok(G.restore(s));}
  assert.deepEqual(G.arrangeExhibition(s,['leafSeal','bottle','clayHorse']),{city:null,first:false});assert.deepEqual(s.collection.treasures,treasures);assert.equal(JSON.stringify(s.items),goods);
  const stable=JSON.stringify(s);for(const keys of [[],['leafSeal','leafSeal','moonTea'],['leafSeal','bottle','__proto__']]){assert.throws(()=>G.arrangeExhibition(s,keys));assert.equal(JSON.stringify(s),stable);}
});
test('guide follows actual actions, can be hidden and reopened, and cannot farm rewards',()=>{
  const s=G.fresh(13),money=s.gold,stamps=s.collection.stamps;G.hideGuide(s);G.hideGuide(s,false);assert.equal(s.gold,money);assert.equal(s.collection.stamps,stamps);assert.deepEqual(s.collection.home.guide,[]);
  const fruit=G.buy(s,'fruit');G.explore(s,'market');G.buyDecor(s,'flowerbed');travel(s,1);G.sell(s,fruit.id);assert.deepEqual(s.collection.home.guide,G.GUIDE);assert.deepEqual(G.restore(s),s);
});
test('legacy v9 keeps original bytes, all progress and free-travel mode, with guide hidden',()=>{
  const old=collector();old.gold=950;for(let chapter=1;chapter<=3;chapter++){G.finish(old);if(chapter<3)G.continueJourney(old);}G.startFreeTravel(old);old.day=46;old.version=9;delete old.collection.home;const raw=JSON.stringify(old),disk=new Map([['caravan-save-v9',raw]]);
  const store=Save.create({getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},G),loaded=store.load();assert.equal(loaded.legacy,true);assert.equal(loaded.blocked,false);store.commit(loaded.state);assert.equal(disk.get('caravan-save-v9'),raw);
  const {home,...collection}=loaded.state.collection;assert.deepEqual(collection,old.collection);assert.equal(loaded.state.mode,'free');assert.equal(loaded.state.day,46);assert.equal(home.guideHidden,true);assert.equal(home.bouquet,null);assert.equal(G.seedUnlocked(loaded.state,'sunset'),true);
});
test('malformed facility saves and phase bypasses are rejected',()=>{
  const mutators=[h=>h.beds=[],h=>h.beds[0]={key:'daisy',planted:-1},h=>h.beds[0]={key:'daisy',planted:9999},h=>h.beds[0]={key:'__proto__',planted:0},h=>h.flowers=['missing'],h=>h.bouquet='daisy',h=>h.exhibition=['leafSeal'],h=>h.awarded=[0,0],h=>h.guide=['fake'],h=>h.guideHidden='true'];
  for(const mutate of mutators){const s=collector();G.buyDecor(s,'flowerbed');mutate(s.collection.home);assert.equal(G.restore(s),null);}
  const s=collector();G.buyDecor(s,'flowerbed');G.buyDecor(s,'showcase');G.startChallenge(s);const before=JSON.stringify(s);for(const fn of [()=>G.plantFlower(s,0,'daisy'),()=>G.harvestFlower(s,0),()=>G.arrangeExhibition(s,['leafSeal','moonTea','feather']),()=>G.hideGuide(s)])assert.throws(fn);assert.equal(JSON.stringify(s),before);
});
