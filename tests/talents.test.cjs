// Original permanent-growth and migration tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js');
function experienced(){const s=G.fresh(13);s.collection.goods=Object.keys(G.GOODS);s.collection.treasures=Object.keys(G.TREASURES);s.collection.stamps=100;return s;}
test('full collection earns exactly enough points to complete every branch',()=>{const s=experienced();for(const key of Object.keys(G.TALENTS))G.learnTalent(s,key);assert.equal(G.talentPoints(s),0);assert.ok(G.restore(s));});
test('talents enforce budget and prerequisites and survive a fresh caravan',()=>{
 const s=G.fresh(13);assert.equal(G.talentPoints(s),1);assert.throws(()=>G.learnTalent(s,'salvage'));assert.throws(()=>G.learnTalent(s,'__proto__'));
 G.learnTalent(s,'keen');assert.equal(G.talentPoints(s),0);const before=JSON.stringify(s);assert.throws(()=>G.learnTalent(s,'keen'));assert.throws(()=>G.learnTalent(s,'journal'));assert.equal(JSON.stringify(s),before);
 const next=G.fresh(15,s.collection);assert.deepEqual(next.collection.talents,['keen']);assert.equal(G.talentPoints(next),0);assert.ok(G.restore(next));
});
test('v13 upgrades preserve progress and v14 rejects malformed talent data',()=>{
 const old=G.fresh(13);old.version=13;delete old.collection.talents;const raw=JSON.stringify(old),up=G.restore(raw);assert.equal(up.version,14);assert.deepEqual(up.collection.talents,[]);assert.deepEqual(up.items,old.items);assert.equal(JSON.stringify(old),raw);
 for(const talents of [null,['bad'],['keen','keen'],['salvage'],['keen','journal']]){const s=G.fresh(13);s.collection.talents=talents;assert.equal(G.restore(s),null);}
});
test('seeking talents improve rare odds, retain pity and double duplicate compensation',()=>{
 let improved=0;for(let seed=1;seed<=120;seed++){const a=G.fresh(seed),b=G.fresh(seed);G.learnTalent(b,'keen');const old=G.explore(a,'market'),next=G.explore(b,'market');if(!old.rare&&next.rare)improved++;if(old.rare)assert.ok(next.rare);}
 assert.ok(improved>0);const s=experienced();G.learnTalent(s,'keen');G.learnTalent(s,'salvage');s.collection.pity=2;const stamps=s.collection.stamps;assert.ok(G.explore(s,'market').rare);assert.equal(s.collection.stamps,stamps+2);
});
test('trade talents affect actual purchase costs and order rewards',()=>{
 const s=experienced();const original=G.purchasePrice(s,'tea'),base=G.orderBonus(s,s.board[0]);G.learnTalent(s,'bargain');G.learnTalent(s,'goodwill');assert.equal(G.purchasePrice(s,'tea'),Math.max(1,Math.round(original*.95)));
 const price=G.buyPrice(s,'tea'),gold=s.gold;G.buy(s,'tea');assert.equal(s.gold,gold-price);assert.equal(G.orderBonus(s,s.board[0]),base+3);
});
test('home talents reward new discoveries prospectively and charge the displayed decor cost',()=>{
 const a=G.fresh(13),b=G.fresh(13);G.learnTalent(b,'journal');G.explore(a,'market');G.explore(b,'market');assert.equal(b.collection.stamps,a.collection.stamps+1);
 const s=experienced();G.learnTalent(s,'journal');G.learnTalent(s,'homely');const key=Object.keys(G.DECOR)[0],price=G.decorCost(s,key),before=s.collection.stamps;assert.equal(price,Math.max(1,G.DECOR[key].cost-2));G.buyDecor(s,key);assert.equal(s.collection.stamps,before-price);assert.ok(G.restore(s));
});
