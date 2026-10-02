/* Original local, allowlisted problem reports. SPDX-License-Identifier: MIT */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CaravanDiagnostics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='caravan-diagnostics-v1',MAX_EVENTS=16;
  const CODES=Object.freeze({'save-protected':'读取进度时进入保护模式','save-failed':'保存操作未完成','save-recovered':'保存恢复正常','import-rejected':'导入文件未通过检查','import-failed':'恢复进度未完成','script-error':'界面脚本异常','promise-error':'异步操作异常'});
  const number=(v,max)=>Number.isFinite(v)&&v>=0&&v<=max?v:null;
  const choice=(v,values)=>values.includes(v)?v:null;
  const version=v=>typeof v==='string'&&/^\d{1,3}(?:\.\d{1,5}){1,3}$/.test(v)?v:null;
  function cleanEvents(value){return Array.isArray(value)?value.filter(e=>e&&Object.hasOwn(CODES,e.code)&&Number.isSafeInteger(e.at)&&e.at>=0&&e.at<8640000000000000).slice(-MAX_EVENTS).map(e=>({code:e.code,at:e.at})):[];}
  function create(storage,clock=Date.now){
    let events=[],persistent=true;
    try{const raw=storage.getItem(KEY);if(raw!==null){const parsed=JSON.parse(raw);events=cleanEvents(parsed);persistent=Array.isArray(parsed)&&events.length===parsed.length;}}catch{persistent=false;}
    function record(code){
      if(!Object.hasOwn(CODES,code))return;
      events=cleanEvents([...events,{code,at:clock()}]);
      try{storage.setItem(KEY,JSON.stringify(events));persistent=true;}catch{persistent=false;}
    }
    return {record,history:()=>({persistent,events:events.map(e=>({...e}))})};
  }
  function report({info={},state={},storage={},history={},view={},audio={},effects=false,reduced=false}={}){
    const available=!(storage.blocked===true&&storage.source==='none');
    if(!available)state={};
    const collection=state.collection||{},home=collection.home||{};
    const count=(v,max)=>Array.isArray(v)?number(v.length,max):null;
    // Reconstruct every field. Never serialize arbitrary objects, messages or stacks.
    return {game:'a-little-caravan',format:'diagnostic-v1',createdAt:new Date().toISOString(),
      build:{version:version(info.version),id:typeof info.buildId==='string'&&/^(?:[a-f0-9]{12}|browser|development)$/.test(info.buildId)?info.buildId:null,electron:version(info.electron),chromium:version(info.chrome),node:version(info.node),platform:choice(info.platform,['win32','linux','darwin']),arch:choice(info.arch,['x64','arm64'])},
      view:{width:number(view.width,32768),height:number(view.height,32768),pixelRatio:number(view.pixelRatio,16),effects:effects===true,reducedMotion:reduced===true,audioEnabled:audio.enabled===true,volume:number(audio.volume,1)},
      progress:{available,saveVersion:number(state.version,1000),mode:choice(state.mode,['story','free']),chapter:number(state.chapter,3),day:number(state.day,1000000),city:number(state.city,2),phase:choice(state.phase,['market','event','ended']),challenge:choice(state.challenge?.kind,['drive','appraise','memory','bridge','fishing']),challengeStatus:choice(state.challenge?.status,['offered','active','done','skipped']),orderActive:available?!!state.order:null,treasures:count(collection.treasures,12),goods:count(collection.goods,15),decor:count(collection.owned,10),flowers:count(home.flowers,6)},
      saving:{warning:storage.warning===true,protected:storage.blocked===true,source:choice(storage.source,['current','backup','legacy','none']),diagnosticHistoryPersistent:history.persistent===true},
      events:cleanEvents(history.events).map(e=>({code:e.code,at:new Date(e.at).toISOString(),description:CODES[e.code]}))};
  }
  return {KEY,MAX_EVENTS,CODES,create,report};
});
