// Original diagnostic privacy, persistence and save-separation tests. SPDX-License-Identifier: MIT.
const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../diagnostics.js'),G=require('../engine.js'),Save=require('../storage.js');
test('an unreadable save reports unknown progress instead of the temporary fresh state',()=>{
 const s=G.fresh(13),r=D.report({state:s,storage:{blocked:true,source:'none'}});assert.equal(r.progress.available,false);for(const [key,value]of Object.entries(r.progress))if(key!=='available')assert.equal(value,null,key);
 assert.equal(D.report({state:s,storage:{blocked:true,source:'backup'}}).progress.available,true);assert.equal(D.report({state:s,storage:{blocked:false,source:'current'}}).progress.day,1);
});
test('reports allowlist fields and reject injected messages, paths and raw progress',()=>{
 const secret='PRIVATE_DATA_SENTINEL',state=G.fresh(13);state.secret=secret;state.items[0].note=secret;
 const r=D.report({info:{version:'0.19.0',buildId:'b2d86a84586d',electron:'44.3.0',chrome:'152.0.7977.78',node:'24.20.0',platform:'win32',arch:'x64',path:secret},state,storage:{warning:true,error:secret,source:secret},history:{persistent:true,events:[{code:'save-failed',at:100,message:secret},{code:secret,at:100}]},view:{width:1280,height:720,pixelRatio:1.25,url:secret}});
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE_DATA_SENTINEL|"items"|"seed"|"gold"|"state"/);assert.equal(r.progress.mode,state.mode);assert.equal(r.progress.day,state.day);assert.equal(r.build.electron,'44.3.0');assert.equal(r.events.length,1);assert.equal(r.saving.source,null);
 assert.throws(()=>Save.parse(JSON.stringify(r),G),/不是可识别/);
 for(const kind of Object.keys(G.CHALLENGES)){state.challenge={kind,status:'active'};assert.equal(D.report({state}).progress.challenge,kind);}
 const bad=D.report({info:{version:secret,buildId:secret},view:{width:Infinity,pixelRatio:-1},state:{day:NaN,phase:secret}});assert.equal(bad.build.version,null);assert.equal(bad.build.id,null);assert.equal(bad.view.width,null);assert.equal(bad.progress.phase,null);
});
test('event history is bounded and persistent without storing supplied unknown fields',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};let time=100;
 const d=D.create(storage,()=>time++);for(let n=0;n<30;n++)d.record('save-failed');d.record('private message');
 assert.equal(d.history().events.length,D.MAX_EVENTS);assert.equal(map.size,1);assert.equal(d.history().events[0].at,114);assert.deepEqual(D.create(storage).history(),d.history());
 map.set(D.KEY,JSON.stringify([{code:'save-failed',at:100,stack:'private'}]));const loaded=D.create(storage);assert.doesNotMatch(JSON.stringify(loaded.history()),/private/);
});
test('blocked storage and malformed diagnostic history never damage game data',()=>{
 const d=D.create({getItem:()=>{throw Error('no storage');},setItem:()=>{throw Error('quota');}},()=>100);assert.equal(d.history().persistent,false);assert.doesNotThrow(()=>d.record('save-failed'));assert.equal(d.history().events.length,1);assert.equal(d.history().persistent,false);
 const malformed=D.create({getItem:()=>'{bad',setItem(){}},()=>100);assert.equal(malformed.history().persistent,false);malformed.record('save-recovered');assert.equal(malformed.history().persistent,true);
});
