// Original collection and home progression regressions. SPDX-License-Identifier: MIT
const test=require('node:test'), assert=require('node:assert/strict'), G=require('../engine.js');
function arrive(s){ G.depart(s,(s.city+1)%3,'road'); if(G.travelChallengePending(s))G.skipChallenge(s); while(s.phase==='event')G.resolve(s,G.eventInfo(s).choices.find(c=>['rest','water','barter-keep'].includes(c.id)).id); }
function collector(){const s=G.fresh(13);s.collection.goods=Object.keys(G.GOODS);s.collection.treasures=Object.keys(G.TREASURES);s.collection.stamps=100;s.collection.searches=12;return s;}
test('first ownership grants stamps once and five discoveries unlock level two',()=>{
  const s=G.fresh(13); assert.equal(s.collection.goods.length,3);assert.equal(s.collection.stamps,3);
  G.buy(s,'fruit');assert.equal(s.collection.stamps,4);G.buy(s,'fruit');assert.equal(s.collection.stamps,4);
  G.buy(s,'ice');assert.equal(G.collectionLevel(s),2);assert.equal(s.collection.stamps,8);assert.ok(G.restore(s));
  s.gold=0;const before=JSON.stringify(s);assert.throws(()=>G.buy(s,'shield'));assert.equal(JSON.stringify(s),before);
});
test('a visit allows one search without changing cash, time or cargo; reload cannot retry it',()=>{
  let s=G.fresh(13);const money=s.gold,day=s.day,items=JSON.stringify(s.items);const result=G.explore(s,'market');
  assert.ok(s.collection.treasures.includes(result.key));assert.equal(s.gold,money);assert.equal(s.day,day);assert.equal(JSON.stringify(s.items),items);
  s=G.restore(s);const saved=JSON.stringify(s);assert.throws(()=>G.explore(s,'market'));assert.equal(JSON.stringify(s),saved);
  arrive(s);assert.ok(G.canExplore(s));assert.ok(G.restore(s));
});
test('all six destinations have a distinct common and rare collectible and rare pity is guaranteed',()=>{
  for(let city=0;city<3;city++)for(const place of ['market','wild']){
    const s=collector();s.city=city;s.chapter=3;s.collection.pity=2;const r=G.explore(s,place);assert.equal(G.TREASURES[r.key].city,city);assert.equal(G.TREASURES[r.key].place,'market');assert.equal(G.isCommissionTreasure(r.key),false);assert.equal(r.rare,true);assert.equal(s.collection.pity,0);
    const pool=Object.values(G.TREASURES).filter(t=>t.city===city&&t.place===place);assert.equal(pool.length,2);assert.equal(pool.filter(t=>t.rare).length,1);
  }
  let rare=0;for(let seed=1;seed<=500;seed++){const s=G.fresh(seed);if(G.explore(s,'market').rare)rare++;}
  assert.ok(rare>130&&rare<220,`35% sample ${rare}/500`);
});
test('duplicates turn into a stamp without inflating discovery count; wild maps unlock by chapter',()=>{
  const low=G.fresh(1);low.city=1;const raw=JSON.stringify(low);assert.throws(()=>G.explore(low,'wild'));assert.equal(JSON.stringify(low),raw);
  const s=collector(),count=s.collection.treasures.length,before=s.collection.stamps;const r=G.explore(s,'market');assert.equal(r.isNew,false);assert.equal(s.collection.stamps,before+1);assert.equal(s.collection.treasures.length,count);
});
test('decorations cost stamps once, equip by slot and preserve money, bag and chapter',()=>{
  const s=collector(),money=s.gold;G.buyDecor(s,'blueTent');assert.equal(s.collection.stamps,94);assert.equal(s.collection.placed.tent,'blueTent');
  const before=JSON.stringify(s);assert.throws(()=>G.buyDecor(s,'blueTent'));assert.equal(JSON.stringify(s),before);
  G.buyDecor(s,'starTent');assert.equal(s.collection.placed.tent,'starTent');G.placeDecor(s,'blueTent');assert.equal(s.collection.placed.tent,'blueTent');G.placeDecor(s,'blueTent');assert.equal(s.collection.placed.tent,null);
  G.favoriteTreasure(s,'pearl');assert.equal(s.collection.favorite,'pearl');assert.equal(s.gold,money);assert.ok(G.restore(s));
  const low=G.fresh(1);assert.throws(()=>G.buyDecor(low,'starTent'));G.buyDecor(low,'bunting');assert.equal(low.collection.stamps,0);assert.throws(()=>G.buyDecor(low,'flowerbed'));
});
test('new caravans keep collections and home without sharing references or farming starting searches',()=>{
  const s=G.fresh(13);G.explore(s,'market');G.buyDecor(s,'bunting');const raw=JSON.stringify(s.collection);
  const next=G.fresh(14,s.collection);assert.equal(JSON.stringify(next.collection),raw);assert.equal(next.gold,100);assert.equal(next.day,1);assert.equal(G.canExplore(next),false);
  G.placeDecor(next,'bunting');assert.equal(JSON.stringify(s.collection),raw);arrive(next);assert.ok(G.canExplore(next));assert.ok(G.restore(next));
});
test('chapter transitions preserve home while opening a new search; ended or active games cannot search',()=>{
  const s=G.fresh(13);G.buyDecor(s,'bunting');s.gold=400;const collection=JSON.stringify(s.collection);G.finish(s);assert.throws(()=>G.explore(s,'market'));G.continueJourney(s);assert.equal(JSON.stringify(s.collection),collection);assert.ok(G.canExplore(s));
  G.startChallenge(s);assert.throws(()=>G.explore(s,'market'));assert.throws(()=>G.placeDecor(s,'bunting'));
});
test('version five migration preserves the full caravan and grants legacy book rewards once',()=>{
  const s=G.fresh(13);G.buy(s,'ice');s.completedOrders=2;s.version=5;delete s.collection;delete s.explored;const raw=JSON.stringify(s);
  const next=G.restore(s);assert.ok(next);assert.equal(next.version,G.VERSION);assert.equal(next.gold,s.gold);assert.deepEqual(next.items,s.items);assert.deepEqual(next.board,s.board);assert.equal(next.collection.goods.length,4);assert.equal(next.collection.stamps,8);
  assert.deepEqual(G.restore(next),next);assert.equal(JSON.stringify(s),raw);
});
test('invalid collections and impossible decoration placements are rejected',()=>{
  for(const change of [s=>s.collection.goods.push('tea'),s=>s.collection.treasures.push('__proto__'),s=>s.collection.stamps=-1,s=>s.collection.pity=3,s=>s.collection.favorite='pearl',s=>s.collection.owned.push('starTent'),s=>s.collection.placed.tent='bunting',s=>delete s.explored]){const s=G.fresh(13);change(s);assert.equal(G.restore(s),null);}
});
test('completed challenges award one stamp and stale input or quitting cannot repeat it',()=>{
  const s=G.fresh(13),before=s.collection.stamps;G.startChallenge(s);for(let i=0;i<G.DRIVE_STEPS;i++)G.advanceDrive(s);assert.equal(s.collection.stamps,before+1);assert.throws(()=>G.advanceDrive(s));assert.equal(s.collection.stamps,before+1);
  const t=G.fresh(13);G.startChallenge(t);G.skipChallenge(t);assert.equal(t.collection.stamps,3);
});

test('keepsakes require unique discoveries, city sets count their own pieces, rewards only pay once',()=>{
  const s=G.fresh(13),before=JSON.stringify(s);assert.throws(()=>G.claimKeepsake(s,'first'));assert.throws(()=>G.claimKeepsake(s,'__proto__'));assert.equal(JSON.stringify(s),before);
  G.explore(s,'market');const stamps=s.collection.stamps;assert.equal(G.claimKeepsake(s,'first'),2);assert.equal(s.collection.stamps,stamps+2);assert.equal(s.gold,100);
  const saved=G.restore(s);assert.throws(()=>G.claimKeepsake(saved,'first'));assert.equal(saved.collection.stamps,stamps+2);
  s.collection.treasures=['leafSeal','moonTea','feather','bottle'];assert.equal(G.keepsakeProgress(s,'willow'),3);assert.equal(G.keepsakeProgress(s,'harbor'),1);assert.throws(()=>G.claimKeepsake(s,'willow'));
  s.collection.treasures.push('amberBee');G.claimKeepsake(s,'willow');assert.ok(G.restore(s));
});

test('cat unlocks at three treasures and bonding waits for another search, not a reload or restart',()=>{
  const s=G.fresh(13);assert.equal(G.catLevel(s),0);assert.throws(()=>G.petCat(s));
  s.collection.treasures=['leafSeal','moonTea','feather'];s.collection.searches=3;
  const money=s.gold,stamps=s.collection.stamps,day=s.day,items=JSON.stringify(s.items);assert.equal(G.catLevel(s),1);G.petCat(s);assert.equal(s.collection.catBond,1);
  const restored=G.restore(s),raw=JSON.stringify(restored);assert.equal(G.canPetCat(restored),false);assert.throws(()=>G.petCat(restored));assert.equal(JSON.stringify(restored),raw);
  const next=G.fresh(14,s.collection);assert.equal(G.canPetCat(next),false);assert.equal(next.collection.catBond,1);
  for(let n=2;n<=7;n++){s.collection.searches++;G.petCat(s);assert.equal(G.catLevel(s),n>=6?3:n>=3?2:1);}
  assert.equal(s.collection.catBond,6);assert.equal(s.gold,money);assert.equal(s.collection.stamps,stamps);assert.equal(s.day,day);assert.equal(JSON.stringify(s.items),items);assert.ok(G.restore(s));
});

test('home rewards and cat care respect travel, ended and active challenge phases',()=>{
  for(const phase of ['travel','ended','challenge']){
    const s=collector();if(phase==='travel')G.depart(s,1,'road');else if(phase==='ended')G.finish(s);else G.startChallenge(s);
    const before=JSON.stringify(s);assert.throws(()=>G.claimKeepsake(s,'all'));assert.throws(()=>G.petCat(s));assert.equal(G.canPetCat(s),false);assert.equal(JSON.stringify(s),before);
  }
});

test('version six migration preserves collections and does not award discovery rewards again',()=>{
  const s=collector();G.buyDecor(s,'starTent');s.version=6;delete s.collection.claimed;delete s.collection.catBond;delete s.collection.catLastSearch;
  const raw=JSON.stringify(s),next=G.restore(s);assert.ok(next);assert.equal(next.version,G.VERSION);assert.equal(next.collection.stamps,s.collection.stamps);assert.deepEqual(next.collection.placed,s.collection.placed);assert.deepEqual(next.collection.treasures,s.collection.treasures);assert.equal(next.explored,s.explored);assert.equal(JSON.stringify(s),raw);
  G.claimKeepsake(next,'all');G.petCat(next);assert.deepEqual(G.restore(next),next);assert.deepEqual(G.fresh(15,next.collection).collection,next.collection);
});

test('corrupt claims and companion data cannot inflate milestones or repeat interactions',()=>{
  for(const change of [s=>s.collection.claimed=['unknown'],s=>s.collection.claimed=['first','first'],s=>s.collection.claimed=['all'],s=>s.collection.catBond=7,s=>s.collection.catBond=-1,s=>s.collection.catLastSearch=1,s=>s.collection.catBond=1,s=>delete s.collection.catBond]){
    const s=G.fresh(13);change(s);assert.equal(G.restore(s),null);
  }
  const s=collector();s.collection.claimed=['all'];s.collection.catBond=3;s.collection.catLastSearch=3;assert.ok(G.restore(s));
});
