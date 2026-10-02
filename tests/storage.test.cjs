// Original save fault-injection tests. SPDX-License-Identifier: MIT
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js'),Save=require('../storage.js');
const KEY=`caravan-save-v${G.VERSION}`;
function disk(entries=[]){const map=new Map(entries);let fail=null;return {map,getItem:k=>{if(fail==='read')throw Error('denied');return map.get(k)??null;},setItem:(k,v)=>{if(fail==='all'||fail===k)throw Error('quota');map.set(k,v);},fail:k=>{fail=k;}};}
test('new and existing saves rotate two valid backups without changing the game data',()=>{
  const d=disk(),store=Save.create(d,G),s=store.load().state;store.commit(s);const first=d.map.get(KEY);
  G.buy(s,'fruit');store.commit(s);assert.equal(d.map.get(KEY+'-backup'),first);const second=d.map.get(KEY);
  G.buy(s,'fruit');store.commit(s);assert.equal(d.map.get(KEY+'-previous'),first);assert.equal(d.map.get(KEY+'-backup'),second);assert.deepEqual(Save.create(d,G).load().state,s);
  store.commit(s);assert.equal(d.map.get(KEY+'-backup'),second,'unchanged saves do not rotate history');
});
test('corrupt primary save is never replaced just by opening or playing',()=>{
  const raw='{broken',s=G.fresh(13),d=disk([[KEY,raw],[KEY+'-backup',JSON.stringify(s)]]),store=Save.create(d,G),loaded=store.load();
  assert.equal(loaded.blocked,true);assert.deepEqual(loaded.state,s);assert.throws(()=>store.commit(s));assert.equal(d.map.get(KEY),raw);
  store.replace(s);assert.equal(store.status().blocked,false);assert.ok([...d.map].some(([k,v])=>k.includes('-damaged-')&&v===raw));assert.deepEqual(G.restore(d.map.get(KEY)),s);
});
test('invalid backup falls back to older snapshot; recovery needs explicit replace',()=>{
  const s=G.fresh(13),d=disk([[KEY,'bad'],[KEY+'-backup','also bad'],[KEY+'-previous',JSON.stringify(s)]]),store=Save.create(d,G);
  assert.deepEqual(store.load().state,s);assert.deepEqual(store.backupState(),s);assert.throws(()=>store.commit(s));assert.equal(d.map.get(KEY),'bad');
});
test('invalid only save is preserved even when no recovery source exists',()=>{
  const d=disk([[KEY,'bad']]),store=Save.create(d,G),loaded=store.load();assert.equal(loaded.blocked,true);assert.equal(loaded.source,null);assert.throws(()=>store.commit(loaded.state));assert.equal(d.map.get(KEY),'bad');
});
test('legacy migration creates a new key but keeps the exact original and does not replay rewards',()=>{
  const s=G.fresh(13);s.version=6;delete s.collection.claimed;delete s.collection.catBond;delete s.collection.catLastSearch;
  const raw=JSON.stringify(s),d=disk([['caravan-save-v6',raw]]),store=Save.create(d,G),loaded=store.load();assert.equal(loaded.legacy,true);store.commit(loaded.state);assert.equal(d.map.get('caravan-save-v6'),raw);assert.equal(G.restore(d.map.get(KEY)).collection.stamps,s.collection.stamps);
});
test('a stale second window cannot silently overwrite the first window',()=>{
  const d=disk([[KEY,JSON.stringify(G.fresh(13))]]),a=Save.create(d,G),b=Save.create(d,G),one=a.load().state,two=b.load().state;
  G.buy(one,'fruit');a.commit(one);const raw=d.map.get(KEY);G.buy(two,'ice');assert.throws(()=>b.commit(two),/另一个窗口/);assert.equal(d.map.get(KEY),raw);assert.throws(()=>b.replace(two));
});
test('failed primary write retains the original save and can be retried',()=>{
  const d=disk([[KEY,JSON.stringify(G.fresh(13))]]),store=Save.create(d,G),s=store.load().state,raw=d.map.get(KEY);G.buy(s,'fruit');d.fail(KEY);assert.throws(()=>store.commit(s));assert.equal(d.map.get(KEY),raw);assert.equal(d.map.get(KEY+'-backup'),raw);d.fail(null);store.commit(s);assert.deepEqual(G.restore(d.map.get(KEY)),s);
});
test('failed backup or archive prevents overwrite of the only existing bytes',()=>{
  const d=disk([[KEY,JSON.stringify(G.fresh(13))]]),store=Save.create(d,G),s=store.load().state,raw=d.map.get(KEY);G.buy(s,'fruit');d.fail(KEY+'-backup');assert.throws(()=>store.commit(s));assert.equal(d.map.get(KEY),raw);
  const bad=disk([[KEY,'bad']]),recovery=Save.create(bad,G);recovery.load();bad.fail('all');assert.throws(()=>recovery.replace(s));assert.equal(bad.map.get(KEY),'bad');
});
test('portable archives round trip active events, collection and settings-independent progress',()=>{
  const s=G.fresh(13);G.explore(s,'market');G.depart(s,1,'road');assert.deepEqual(Save.parse(Save.pack(s,G),G),s);assert.deepEqual(Save.parse(JSON.stringify(s),G),s);
});
test('malformed, excessive, wrong-game and invalid imported states are rejected before any write',()=>{
  const s=G.fresh(13);for(const raw of ['',null,'[]','null','x'.repeat(Save.LIMIT+1),JSON.stringify({game:'other',format:1,state:s}),JSON.stringify({...s,gold:-1}),JSON.stringify({game:'a-little-caravan',format:2,state:s})])assert.throws(()=>Save.parse(raw,G));
  const d=disk([[KEY,JSON.stringify(s)]]),store=Save.create(d,G);store.load();const before=[...d.map];assert.throws(()=>store.replace({...s,gold:-1}));assert.deepEqual([...d.map],before);
});
test('unavailable storage enters protection and does not advertise a saved game',()=>{
  const d=disk();d.fail('read');const store=Save.create(d,G),loaded=store.load();assert.equal(loaded.blocked,true);assert.match(loaded.error,/无法读取/);assert.throws(()=>store.commit(loaded.state));assert.equal(d.map.size,0);
});
