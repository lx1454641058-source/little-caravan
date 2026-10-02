// Original free-travel and long-session regression tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js'),Save=require('../storage.js');
function graduate(seed=13) {
  const s=G.fresh(seed);s.gold=950;
  for(let chapter=1;chapter<=3;chapter++){G.finish(s);if(chapter<3)G.continueJourney(s);}
  return s;
}
function arrive(s,route='road',destination=(s.city+1)%3) {
  G.depart(s,destination,route);assert.ok(G.restore(s),'departure save');
  if(G.travelChallengePending(s))G.skipChallenge(s);
  while(s.phase==='event') {
    const choice=G.eventInfo(s).choices.find(c=>['commission-claim','barter-keep','rest','water','detour','leave'].includes(c.id));
    G.resolve(s,choice.id);assert.ok(G.restore(s),'event save');
  }
}

test('only a completed third chapter unlocks free travel, once and without replaying rewards',()=>{
  const start=G.fresh(13);assert.throws(()=>G.startFreeTravel(start));
  start.gold=950;G.finish(start);assert.throws(()=>G.startFreeTravel(start));
  const failed=graduate();failed.phase='market';failed.gold=0;failed.items=[];G.finish(failed);assert.throws(()=>G.startFreeTravel(failed));
  const s=graduate();s.explored=true;const before=structuredClone(s);G.startFreeTravel(s);
  assert.equal(s.mode,'free');assert.equal(s.phase,'market');assert.equal(s.final,null);
  for(const key of ['day','journeys','items','gold','collection','mods','rows','reputation','order','board','deal','explored','challenge'])assert.deepEqual(s[key],before[key],key);
  assert.throws(()=>G.startFreeTravel(s));assert.throws(()=>G.finish(s));assert.throws(()=>G.continueJourney(s));assert.deepEqual(G.restore(s),s);
});

test('free travel has no assessment deadline and cannot strand an empty, penniless caravan',()=>{
  const s=graduate();s.day=12;G.startFreeTravel(s);const ration=s.items.find(i=>i.kind==='ration');
  assert.equal(G.travelCost(s,'road'),0);assert.equal(G.roadFee(s),0);arrive(s);assert.equal(s.day,14);assert.ok(s.items.some(i=>i.id===ration.id));
  assert.throws(()=>G.installMod(s,'wheels'));assert.equal(s.mods.wheels,false);
  s.gold=0;s.items=[];s.forecast.trail='bandit';arrive(s,'trail');assert.equal(s.day,16);assert.equal(s.gold,0);assert.equal(s.board.length,3);
  assert.ok(G.canExplore(s));G.explore(s,'market');assert.ok(s.collection.treasures.length);assert.ok(G.restore(s));
  const story=G.fresh(13);story.day=12;assert.equal(G.canDepart(story,'road'),false);assert.throws(()=>G.depart(story,1,'road'));assert.equal(G.travelCost(story,'road'),5);
});

test('orders after day twelve can be delivered, expire normally and cannot pay twice',()=>{
  const s=graduate();s.day=12;G.startFreeTravel(s);arrive(s,'road',1);
  for(const item of [...s.items])G.sell(s,item.id);
  const order=s.board.find(o=>o.type===10);assert.ok(order.due>s.day);G.acceptOrder(s,order.id);G.buy(s,'wood');G.buy(s,'wood');
  arrive(s,'road',2);assert.equal(G.orderStatus(s).ready,true);const before=s.gold;const result=G.deliverOrder(s);
  assert.equal(s.gold,before+result.sale+result.bonus);assert.throws(()=>G.deliverOrder(s));
  const next=s.board[0];G.acceptOrder(s,next.id);const failed=s.failedOrders;
  while(s.order)arrive(s);assert.equal(s.failedOrders,failed+1);assert.ok(G.restore(s));
});

test('entering free travel preserves an accepted contract and already-used search',()=>{
  const s=graduate();s.phase='market';s.final=null;G.acceptOrder(s,s.board[0].id);G.explore(s,'market');G.finish(s);
  const before=structuredClone(s);G.startFreeTravel(s);assert.deepEqual(s.order,before.order);assert.equal(G.canExplore(s),false);assert.throws(()=>G.explore(s,'market'));assert.ok(G.restore(s));
});

test('1,200 consecutive trips, searches and expired contracts survive saving and file transfer',()=>{
  let s=graduate();G.startFreeTravel(s);const kinds=new Set(),ids=new Set();
  for(let trip=0;trip<1200;trip++) {
    if(G.canExplore(s))G.explore(s,'market');
    if(!s.order && !s.orderTaken && s.board.length)G.acceptOrder(s,s.board[0].id);
    G.depart(s,(s.city+1)%3,trip%2?'road':'trail');
    if(G.travelChallengePending(s)){kinds.add(s.challenge.kind);G.skipChallenge(s);}
    while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['commission-claim','barter-keep','rest','water','detour','leave'].includes(c.id)).id);
    assert.equal(s.board.length,3);for(const o of s.board){assert.ok(!ids.has(o.id));ids.add(o.id);}
    s=G.restore(s);assert.ok(s,`trip ${trip}`);
  }
  assert.equal(s.journeys,1200);assert.ok(s.day>1200);assert.ok(s.failedOrders>72);assert.equal(s.collection.searches,1200);assert.equal(kinds.size,5);assert.deepEqual(Save.parse(Save.pack(s,G),G),s);
});

test('long-session counts and balances beyond old caps can be saved without relaxing story deadlines',()=>{
  const s=graduate();G.startFreeTravel(s);Object.assign(s,{gold:100001,nextId:100001,completedOrders:37,failedOrders:73,day:100001,journeys:100001});
  s.collection.searches=100001;s.collection.stamps=100001;arrive(s);assert.ok(G.restore(s));
  G.buy(s,G.shopKinds(s)[0]);assert.ok(G.restore(s));
  for(const field of ['gold','nextId','day','journeys','completedOrders']){const bad=structuredClone(s);bad[field]=Number.MAX_SAFE_INTEGER;assert.equal(G.restore(bad),null,field);}
  const invalid=structuredClone(s);invalid.mode='story';assert.equal(G.restore(invalid),null);
  invalid.mode='free';invalid.chapter=1;assert.equal(G.restore(invalid),null);
});

test('version-eight graduates retain their exact source and can continue without resetting collection',()=>{
  const old=graduate();old.version=8;delete old.mode;delete old.collection.home;const raw=JSON.stringify(old),s=G.restore(raw);
  assert.ok(s);assert.equal(s.mode,'story');assert.equal(s.phase,'ended');assert.equal(JSON.stringify(old),raw);const {home,...previousCollection}=s.collection;assert.deepEqual(previousCollection,old.collection);assert.equal(home.guideHidden,true);
  G.startFreeTravel(s);assert.deepEqual(G.restore(s),s);
  const next=G.fresh(17,s.collection);assert.equal(next.mode,'story');assert.equal(next.chapter,1);assert.deepEqual(next.collection,s.collection);
});

test('postgame can finish all collections, home purchases, cat growth and nine friend chapters',()=>{
  let s=graduate();G.startFreeTravel(s);
  for(let stop=0;stop<100;stop++) {
    for(const kind of G.shopKinds(s))if(!s.collection.goods.includes(kind)){const item=G.buy(s,kind);G.sell(s,item.id);}
    const missing=Object.keys(G.TREASURES).find(k=>!G.isCommissionTreasure(k)&&!s.collection.treasures.includes(k)&&G.TREASURES[k].city===s.city&&(G.TREASURES[k].place==='market'||G.mapUnlocked(s)));
    if(missing)G.trackClue(s,missing);
    if(G.canExplore(s))G.explore(s,missing?G.TREASURES[missing].place:'market');
    if(G.canPetCat(s))G.petCat(s);
    for(const [key,goal] of Object.entries(G.KEEPSAKES))if(!s.collection.claimed.includes(key)&&G.keepsakeProgress(s,key)===goal.target)G.claimKeepsake(s,key);
    for(const [key,decor] of Object.entries(G.DECOR))if(!s.collection.owned.includes(key)&&G.collectionLevel(s)>=decor.level&&s.collection.stamps>=decor.cost)G.buyDecor(s,key);
    const visitor=G.visitorStatus(s);if(visitor.ready)G.visitFriend(s,s.city,visitor.stage);
    s=G.restore(s);assert.ok(s,`stop ${stop}`);
    if(s.collection.treasures.length===12&&s.collection.owned.length===10&&s.collection.trail.visitors.every(n=>n===3))break;
    // Exclusive relics require real, correctly loaded commissions, not ordinary searches.
    for(const item of [...s.items])G.sell(s,item.id);
    const offer=s.board.find(o=>o.type>=9);G.acceptOrder(s,offer.id);const type=G.ORDER_TYPES[offer.type],loaded=[];
    for(let n=0;n<offer.quantity;n++)loaded.push(G.buy(s,type.kind));
    if(type.rule==='herbal'){const herb=G.buy(s,'herb');G.move(s,herb.id,1,1,true);}
    if(type.rule==='lit'){G.move(s,loaded[1].id,3,0);const lamp=G.buy(s,'lantern');G.move(s,lamp.id,2,0);}
    arrive(s);G.deliverOrder(s);
  }
  assert.equal(s.collection.goods.length,15);assert.equal(s.collection.treasures.length,12);assert.equal(s.collection.owned.length,10);assert.equal(s.collection.claimed.length,6);assert.equal(s.collection.catBond,6);assert.deepEqual(s.collection.trail.visitors,[3,3,3]);assert.ok(s.day>12);
});
