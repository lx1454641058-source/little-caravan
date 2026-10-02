// Original deterministic clues and persistent friend stories. SPDX-License-Identifier: MIT
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js');
function explorer(){const s=G.fresh(13);s.collection.goods=Object.keys(G.GOODS);return s;}
test('ordinary discovery clues complete within three matching searches without spending gold or cargo',()=>{
  for(const [key,t] of Object.entries(G.TREASURES)){
    if(G.isCommissionTreasure(key))continue;let s=explorer();s.city=t.city;s.chapter=3;const gold=s.gold,items=JSON.stringify(s.items);G.trackClue(s,key);
    for(let attempt=1;attempt<=3;attempt++){
      s.explored=false;s.collection.pity=t.rare?0:2;s.seed=1000;const result=G.explore(s,t.place);
      if(attempt<3){assert.equal(result.bonus,null);assert.equal(s.collection.trail.clue.attempts,attempt);}
      else {assert.equal(result.bonus,key);assert.equal(s.collection.trail.clue,null);assert.ok(s.collection.treasures.includes(key));}
    }
    assert.equal(s.gold,gold);assert.equal(JSON.stringify(s.items),items);assert.equal(s.collection.searches,3);
  }
});
test('clues respect location, complete naturally, preserve rare pity and cannot be re-claimed',()=>{
  const s=explorer();G.trackClue(s,'pearl');G.explore(s,'market');assert.equal(s.collection.trail.clue.attempts,0);assert.ok(G.restore(s));
  G.trackClue(s,'leafSeal');s.collection.trail.clue.attempts=2;s.collection.pity=2;s.explored=false;const before=s.collection.stamps;
  const r=G.explore(s,'market');assert.equal(r.rare,true);assert.equal(r.bonus,'leafSeal');assert.equal(s.collection.pity,0);assert.equal(s.collection.stamps,before+(r.isNew?3:1)+2);assert.throws(()=>G.trackClue(s,'leafSeal'));assert.ok(G.restore(s));
  const natural=explorer();G.trackClue(natural,'moonTea');natural.collection.pity=2;assert.equal(G.explore(natural,'market').bonus,null);assert.equal(natural.collection.trail.clue,null);
});
test('tracking the same target keeps progress; changing it starts over; invalid input does not mutate',()=>{
  const s=explorer();G.trackClue(s,'moonTea');s.collection.trail.clue.attempts=1;G.trackClue(s,'moonTea');assert.equal(s.collection.trail.clue.attempts,1);
  const raw=JSON.stringify(s);assert.throws(()=>G.trackClue(s,'__proto__'));assert.equal(JSON.stringify(s),raw);G.trackClue(s,'pearl');assert.equal(s.collection.trail.clue.attempts,0);G.trackClue(s,null);assert.equal(s.collection.trail.clue,null);
});
test('every friend has three gated chapters and gives a postcard once, surviving reload and restart',()=>{
  for(let city=0;city<3;city++){
    const s=explorer();s.city=city;const keys=Object.keys(G.TREASURES).filter(k=>G.TREASURES[k].city===city);s.collection.treasures=keys.slice(0,1);s.collection.searches=1;
    assert.equal(G.visitorStatus(s).ready,true);const stamps=s.collection.stamps;G.visitFriend(s,city,0);assert.equal(s.collection.stamps,stamps+2);
    const raw=JSON.stringify(s);assert.throws(()=>G.visitFriend(s,city,0));assert.equal(JSON.stringify(s),raw);
    s.collection.treasures=keys.slice(0,2);s.collection.searches=2;assert.equal(G.visitorStatus(s).ready,false);G.buyDecor(s,'bunting');assert.equal(G.visitorStatus(s).ready,true);G.visitFriend(s,city,1);
    s.collection.treasures=keys;assert.equal(G.visitorStatus(s).ready,false);s.collection.searches=3;const result=G.visitFriend(s,city,2);assert.equal(result.postcard,true);assert.equal(G.visitorStatus(s).stage,3);assert.equal(G.visitorStatus(s).ready,false);assert.throws(()=>G.visitFriend(s,city,2));
    // Rebuild current-city stock so this fixture's full saved caravan is also valid.
    if(city===0)assert.deepEqual(G.restore(s),s);assert.deepEqual(G.fresh(15,s.collection).collection,s.collection);
  }
});
test('friend visits and clues cannot bypass phase, city, challenge, or stale story-token guards',()=>{
  const s=explorer();s.collection.treasures=Object.keys(G.TREASURES);s.collection.searches=12;
  assert.throws(()=>G.visitFriend(s,1,0));G.startChallenge(s);assert.throws(()=>G.visitFriend(s,0,0));assert.throws(()=>G.trackClue(s,'pearl'));G.skipChallenge(s);G.finish(s);assert.throws(()=>G.visitFriend(s,0,0));
});
test('version seven migrates without changing money, collections, explored stop or claimed rewards',()=>{
  const s=explorer();G.explore(s,'market');G.claimKeepsake(s,'first');s.version=7;delete s.collection.trail;const raw=JSON.stringify(s),next=G.restore(s);
  assert.ok(next);assert.equal(next.version,G.VERSION);assert.equal(next.gold,s.gold);assert.equal(next.explored,s.explored);assert.deepEqual(next.collection.claimed,s.collection.claimed);assert.equal(next.collection.stamps,s.collection.stamps);assert.equal(JSON.stringify(s),raw);assert.deepEqual(G.restore(next),next);
});
test('corrupted clue or impossible friend history is rejected',()=>{
  for(const change of [s=>s.collection.trail.clue={key:'fake',attempts:0},s=>s.collection.trail.clue={key:'pearl',attempts:3},s=>s.collection.trail.visitors=[1,0,0],s=>s.collection.trail.visitors=[4,0,0],s=>s.collection.trail.visitorSearch=[0,0,100],s=>delete s.collection.trail]){const s=explorer();change(s);assert.equal(G.restore(s),null);}
});
