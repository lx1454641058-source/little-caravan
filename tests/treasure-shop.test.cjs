// Original collectible economy and commission regressions. SPDX-License-Identifier: MIT
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js');
function rich(seed=13){const s=G.fresh(seed);s.gold=2000;s.collection.stamps=500;return s;}
function clear(s){for(const i of [...s.items])G.sell(s,i.id);}
function settle(s){if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event'){const choice=G.eventInfo(s).choices.find(c=>['commission-claim','barter-keep','rest','water','leave','detour'].includes(c.id));G.resolve(s,choice.id);assert.ok(G.restore(s));}}
function loaded(seed=13){const s=rich(seed);clear(s);const o=s.board.find(o=>o.type===0);G.acceptOrder(s,o.id);for(let i=0;i<o.quantity;i++)G.buy(s,'herb');return s;}
test('common collectibles accept either currency without paying discovery stamps; all stamp round trips lose value',()=>{
  const s=rich();G.buyTreasure(s,'leafSeal','gold',0);assert.equal(s.collection.stamps,500);assert.equal(G.treasureCount(s.collection,'leafSeal'),1);
  G.sellTreasure(s,'leafSeal',1);assert.equal(G.treasureCount(s.collection,'leafSeal'),0);const before=s.collection.stamps;
  G.buyTreasure(s,'leafSeal','stamps',0);G.sellTreasure(s,'leafSeal',1);assert.equal(s.collection.stamps,before-5);
  for(const [key,t] of Object.entries(G.TREASURES)){assert.ok(G.TREASURE_PRICES[key].stamps>G.TREASURE_PRICES[key].sell);if(t.rare)assert.throws(()=>G.buyTreasure(s,key,'gold'));}assert.ok(G.restore(s));
});
test('shop selection is never gated by chapter; only first discovery of event relics is gated',()=>{
  const s=rich();G.buyTreasure(s,'wheatCrown','gold');G.buyTreasure(s,'goldenBell','stamps');
  for(const key of G.COMMISSION_TREASURES){const before=JSON.stringify(s);assert.throws(()=>G.buyTreasure(s,key,'gold'));assert.throws(()=>G.buyTreasure(s,key,'stamps'));assert.equal(JSON.stringify(s),before);}
  s.collection.treasures.push('sunSeed');G.buyTreasure(s,'sunSeed','stamps');assert.equal(G.treasureCount(s.collection,'sunSeed'),2);assert.ok(G.restore(s));
});
test('last copy sale removes physical displays while preserving book, earned talents, companion and awards',()=>{
  const s=rich();s.collection.treasures=Object.keys(G.TREASURES);G.buyDecor(s,'showcase');G.arrangeExhibition(s,['leafSeal','moonTea','feather']);G.favoriteTreasure(s,'leafSeal');G.arrangeHome(s,{positions:{'treasure:leafSeal':{x:300,y:200}},treasures:['leafSeal']});
  const level=G.collectionLevel(s),points=G.talentPoints(s),cat=G.catLevel(s);G.sellTreasure(s,'leafSeal',1);
  assert.equal(s.collection.favorite,null);assert.deepEqual(s.collection.home.exhibition,[]);assert.deepEqual(s.collection.home.layout.treasures,[]);assert.equal(s.collection.home.awarded.length,1);
  assert.equal(G.collectionLevel(s),level);assert.equal(G.talentPoints(s),points);assert.equal(G.catLevel(s),cat);assert.ok(G.restore(s));assert.equal(G.treasureCount(G.fresh(3,s.collection).collection,'leafSeal'),0);
  assert.throws(()=>G.favoriteTreasure(s,'leafSeal'));assert.throws(()=>G.arrangeExhibition(s,['leafSeal','moonTea','feather']));assert.throws(()=>G.arrangeHome(s,{positions:{},treasures:['leafSeal']}));
  G.buyTreasure(s,'leafSeal','stamps',0);assert.deepEqual(s.collection.home.layout.positions['treasure:leafSeal'],{x:300,y:200});
});
test('legacy saves imply one physical copy without altering the source or creating rewards',()=>{const s=rich();s.collection.treasures=['leafSeal'];const raw=JSON.stringify(s),r=G.restore(raw);assert.equal(JSON.stringify(s),raw);assert.equal(G.treasureCount(r.collection,'leafSeal'),1);assert.equal(r.collection.stamps,s.collection.stamps);G.sellTreasure(r,'leafSeal');assert.equal(G.treasureCount(G.restore(r).collection,'leafSeal'),0);});
test('bad inventory, balances, stale counts and over-cap actions cannot mutate a valid game',()=>{
  const s=rich();G.buyTreasure(s,'leafSeal','stamps');for(const stock of [null,[],{bogus:1},{leafSeal:-1},{leafSeal:100},{leafSeal:.5},{pearl:1}]){const bad=structuredClone(s);bad.collection.treasureStock=stock;assert.equal(G.restore(bad),null);}
  for(const fn of [()=>G.buyTreasure(s,'leafSeal','stamps',0),()=>G.sellTreasure(s,'leafSeal',0),()=>G.buyTreasure(s,'__proto__','gold'),()=>G.buyTreasure(s,'leafSeal','bad')]){const before=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),before);}
  s.collection.treasureStock.leafSeal=99;assert.throws(()=>G.buyTreasure(s,'leafSeal','stamps'));s.collection.stamps=0;assert.throws(()=>G.buyTreasure(s,'feather','stamps'));
});
test('gold purchases leave enough for the next departure and never consume cargo',()=>{const s=rich();clear(s);s.gold=90;const before=JSON.stringify(s);assert.throws(()=>G.buyTreasure(s,'leafSeal','gold'));assert.equal(JSON.stringify(s),before);s.gold=98;G.buyTreasure(s,'leafSeal','gold');assert.equal(s.gold,8);G.depart(s,1,'trail');assert.ok(G.restore(s));});
test('each town exploration map follows its chapter and has a distinct common find; events never drop from searches or clues',()=>{
  for(let city=0;city<3;city++){const s=rich();s.city=city;assert.equal(G.mapUnlocked(s),city===0);if(city>0)assert.throws(()=>G.explore(s,'wild'));s.chapter=city+1;G.trackClue(s,G.COMMISSION_TREASURES[city]);
    for(let n=0;n<12;n++){s.explored=false;const r=G.explore(s,n%2?'wild':'market');assert.equal(G.TREASURES[r.key].city,city);assert.equal(G.isCommissionTreasure(r.key),false);assert.equal(r.bonus,null);}assert.equal(s.collection.trail.clue.attempts,0);
  }
});
test('guaranteed commission encounter persists through reload, respects the challenge, and gives a single real relic',()=>{
  const s=loaded();s.collection.commissionMisses=3;G.depart(s,1,'road');assert.equal(s.event.commissionFind,'pearl');assert.equal(s.order.relicChecked,true);assert.equal(s.collection.commissionMisses,0);let r=G.restore(s);assert.ok(r);assert.deepEqual(r,s);
  if(G.travelChallengePending(r)){assert.throws(()=>G.resolve(r,'commission-claim'));G.skipChallenge(r);}const gold=r.gold,cargo=JSON.stringify(r.items),day=r.day;G.resolve(r,'commission-claim');assert.equal(G.treasureCount(r.collection,'pearl'),1);assert.equal(r.gold,gold);assert.equal(JSON.stringify(r.items),cargo);assert.equal(r.day,day);assert.throws(()=>G.resolve(r,'commission-claim'));assert.ok(G.restore(r));settle(r);G.deliverOrder(r);G.sellTreasure(r,'pearl');G.buyTreasure(r,'pearl','stamps');assert.equal(G.treasureCount(r.collection,'pearl'),1);
});
test('empty, expired and wrong-destination orders do not roll; repeat departures on the same commission cannot roll again',()=>{
  for(const mode of ['empty','late','wrong']){const s=loaded();s.collection.commissionMisses=3;if(mode==='empty')clear(s);if(mode==='late')s.order.due=2;G.depart(s,mode==='wrong'?2:1,'road');assert.equal(s.event.commissionFind,undefined);assert.equal(s.order.relicChecked,undefined);assert.equal(s.collection.commissionMisses,3);}
  const s=loaded();s.collection.commissionMisses=3;G.depart(s,1,'road');if(G.travelChallengePending(s))G.skipChallenge(s);G.resolve(s,'commission-leave');assert.equal(s.event.commissionFind,undefined);settle(s);assert.equal(s.order.relicChecked,true);
});
test('event chance grows with completed commissions and always guarantees the fourth eligible miss',()=>{
  let hits=0;for(let seed=1;seed<=400;seed++){const s=loaded(seed);G.depart(s,1,'road');if(s.event.commissionFind)hits++;else assert.equal(s.collection.commissionMisses,1);const g=loaded(seed);g.collection.commissionMisses=3;G.depart(g,1,'road');assert.equal(g.event.commissionFind,'pearl');}
  assert.ok(hits>70&&hits<135,`25 percent sample ${hits}/400`);const s=loaded();s.completedOrders=10;assert.equal(G.commissionChance(s),60);
});
test('forged commission metadata is rejected without loosening existing travel checks',()=>{const s=loaded();s.collection.commissionMisses=3;G.depart(s,1,'road');for(const change of [t=>t.event.commissionFind='leafSeal',t=>t.event.commissionFind='sunSeed',t=>t.order.relicChecked=false,t=>t.order.relicChecked='yes',t=>t.collection.commissionMisses=4]){const bad=structuredClone(s);change(bad);assert.equal(G.restore(bad),null);}assert.ok(G.restore(s));});
