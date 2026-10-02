// Original wind-slide puzzle and save regression tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict'),G=require('../engine.js'),Save=require('../storage.js');
const directions=['north','east','south','west'];
function travel(s,city){G.depart(s,city,'road');if(G.travelChallengePending(s))G.skipChallenge(s);while(s.phase==='event'){const choice=G.eventInfo(s).choices.find(c=>['barter-keep','rest','water','detour','leave'].includes(c.id));G.resolve(s,choice.id);}}
function harbor(){const s=G.fresh(13);travel(s,1);return s;}
// Independent cell-list reference, rather than invoking the production stepper
// to decide what the expected crossed buoys and endpoint should be.
function reference(chart,at,visited,d){const row=Math.floor(at/5),col=at%5,scan=[];if(d==='east')for(let x=col+1;x<5;x++)scan.push(row*5+x);if(d==='west')for(let x=col-1;x>=0;x--)scan.push(row*5+x);if(d==='south')for(let y=row+1;y<5;y++)scan.push(y*5+col);if(d==='north')for(let y=row-1;y>=0;y--)scan.push(y*5+col);const crossed=[];for(const cell of scan){if(chart.reefs.includes(cell))break;crossed.push(cell);const buoy=chart.buoys.indexOf(cell);if(buoy>=0)visited|=2**buoy;}return {at:crossed.at(-1)??at,visited,crossed};}
function finish(s,key){G.startSailing(s,key);const v=s.collection.home.sailing.voyage,route=G.sailingRoute(key,v.at,v.visited);assert.ok(route);for(const direction of route){G.sail(s,direction,s.collection.home.sailing.voyage.steps);assert.ok(G.restore(s));}assert.equal(G.sailingComplete(s.collection.home.sailing.voyage),true);return G.finishSailing(s);}
test('all three charts are solvable from every reachable state and match independent movement rules',()=>{
  const counts=[];for(const [key,chart]of Object.entries(G.SAIL_CHARTS)){
    assert.equal(new Set([chart.start,chart.dock,...chart.reefs,...chart.buoys]).size,chart.reefs.length+chart.buoys.length+2);
    const queue=[{at:chart.start,visited:0}],seen=new Set([chart.start+':0']);for(let i=0;i<queue.length;i++){
      const p=queue[i],solution=G.sailingRoute(key,p.at,p.visited);assert.ok(solution,'every reachable state can finish');let end=p;for(const d of solution)end=reference(chart,end.at,end.visited,d);assert.equal(end.at,chart.dock);assert.equal(end.visited,2**chart.buoys.length-1);
      for(const d of directions){const next=reference(chart,p.at,p.visited,d);assert.deepEqual(G.sailingStep(key,p.at,p.visited,d),next);const id=next.at+':'+next.visited;if(!seen.has(id)){seen.add(id);queue.push(next);}}
    }counts.push(queue.length);
  }assert.deepEqual(counts,[16,81,32]);
});
test('first completed voyage gives a visible permanent model, pays once and never consumes cargo or discovery',()=>{
  const s=harbor(),before=JSON.parse(JSON.stringify(s));assert.deepEqual(finish(s,'skiff'),{key:'skiff',isNew:true,reward:2});assert.equal(s.collection.home.sailing.display,'skiff');assert.equal(s.collection.stamps,before.collection.stamps+2);
  for(const key of ['gold','day','items','stock','seed','explored'])assert.deepEqual(s[key],before[key]);assert.equal(s.collection.searches,before.collection.searches);assert.throws(()=>G.finishSailing(s));
  assert.deepEqual(finish(s,'skiff'),{key:'skiff',isNew:false,reward:0});assert.equal(s.collection.stamps,before.collection.stamps+2);assert.deepEqual(Save.parse(Save.pack(s,G),G),s);
});
test('actual discoveries and return trips unlock later models; practice does not postpone unlocks',()=>{
  const s=harbor();for(const [index,key]of Object.keys(G.SAIL_CHARTS).entries()){
    if(index){assert.equal(G.sailingStatus(s,key).ready,false);G.explore(s,'market');travel(s,0);G.explore(s,'market');assert.equal(G.sailingStatus(s,key).ready,false);travel(s,1);finish(s,'skiff');assert.equal(G.sailingStatus(s,key).ready,true);}
    finish(s,key);
  }assert.deepEqual(s.collection.home.sailing.models,Object.keys(G.SAIL_CHARTS));const newCaravan=G.fresh(20,s.collection);assert.deepEqual(newCaravan.collection.home.sailing,s.collection.home.sailing);G.displaySailing(newCaravan,'lantern');assert.equal(newCaravan.collection.home.sailing.display,null);G.displaySailing(newCaravan,'skiff');assert.equal(newCaravan.collection.home.sailing.display,'skiff');assert.ok(G.restore(newCaravan));
});
test('each move persists, undo restores its buoys, blocked and stale moves cannot mutate the voyage',()=>{
  const s=harbor();G.startSailing(s,'skiff');G.sail(s,'east',0);const moved=JSON.parse(JSON.stringify(s));assert.deepEqual(G.restore(s),moved);assert.equal(s.collection.home.sailing.voyage.visited,2);
  for(const action of [()=>G.sail(s,'east',1),()=>G.sail(s,'north',0),()=>G.sail(s,'__proto__',1),()=>G.finishSailing(s)]){assert.throws(action);assert.deepEqual(s,moved);}
  G.undoSailing(s);assert.equal(s.collection.home.sailing.voyage.at,20);assert.equal(s.collection.home.sailing.voyage.visited,0);assert.throws(()=>G.undoSailing(s));G.sail(s,'east',0);G.resetSailing(s);assert.equal(s.collection.home.sailing.voyage.steps,0);assert.ok(G.restore(s));
  G.sail(s,'east',0);const progress=JSON.parse(JSON.stringify(s.collection.home.sailing.voyage));travel(s,0);assert.throws(()=>G.sail(s,'north',1));assert.deepEqual(s.collection.home.sailing.voyage,progress);assert.ok(G.restore(s));travel(s,1);G.startSailing(s,'skiff');assert.deepEqual(s.collection.home.sailing.voyage,progress);
});
test('wrong city, active travel challenges and locked models reject state changes',()=>{
  const s=G.fresh(13);for(const key of ['skiff','trade','__proto__']){const before=JSON.stringify(s);assert.throws(()=>G.startSailing(s,key));assert.equal(JSON.stringify(s),before);}G.startChallenge(s);assert.throws(()=>G.startSailing(s,'skiff'));
  const dock=harbor();assert.throws(()=>G.startSailing(dock,'trade'));assert.throws(()=>G.displaySailing(dock,'skiff'));
});
test('v11 upgrade preserves tea and old save bytes without issuing model rewards',()=>{
  const old=G.fresh(13);G.brewTea(old,'morning',[0,3,4]);travel(old,1);old.version=11;delete old.collection.home.sailing;
  const raw=JSON.stringify(old),disk=new Map([['caravan-save-v11',raw]]),store=Save.create({getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},G),loaded=store.load();assert.equal(loaded.legacy,true);assert.equal(loaded.blocked,false);store.commit(loaded.state);assert.equal(disk.get('caravan-save-v11'),raw);
  const expected=JSON.parse(raw);expected.version=G.VERSION;expected.collection.home.sailing={models:[],lastSearch:null,display:null,voyage:null};assert.deepEqual(loaded.state,expected);
});
test('forged or unreachable voyage records cannot load',()=>{
  const mutators=[f=>f.models=['trade'],f=>f.models=['skiff','skiff'],f=>f.display='skiff',f=>f.lastSearch=0,f=>f.voyage={key:'__proto__'},f=>f.voyage={key:'trade',at:20,visited:0,steps:0,previous:null},f=>f.voyage={key:'skiff',at:1,visited:0,steps:0,previous:null},f=>f.voyage={key:'skiff',at:4,visited:3,steps:0,previous:null}];
  for(const mutate of mutators){const s=harbor();mutate(s.collection.home.sailing);assert.equal(G.restore(s),null);}
  const s=harbor();G.startSailing(s,'skiff');G.sail(s,'east',0);for(const modify of [v=>v.previous.steps=9,v=>v.visited=8,v=>v.previous.at=4,v=>v.at=12,v=>v.steps=-1]){const bad=JSON.parse(JSON.stringify(s));modify(bad.collection.home.sailing.voyage);assert.equal(G.restore(bad),null);}
});
