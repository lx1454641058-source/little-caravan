/* Original offline save protection and portable archives. SPDX-License-Identifier: MIT */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CaravanStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const LIMIT=500000;
  function parse(text,game){
    if(typeof text!=='string'||text.length>LIMIT)throw new Error('请选择小于 500 KB 的行囊与远方存档。');
    let data;try{data=JSON.parse(text);}catch{throw new Error('文件不是有效的 JSON 存档，当前进度没有改变。');}
    if(data&&Object.hasOwn(data,'format')){
      if(data.game!=='a-little-caravan'||data.format!==1)throw new Error('这不是可识别的行囊与远方备份。');
      data=data.state;
    }
    const state=game.restore(data);if(!state)throw new Error('存档版本或内容无法读取，当前进度没有改变。');return state;
  }
  function pack(state,game){const valid=game.restore(state);if(!valid)throw new Error('当前数据未通过检查，不能导出。');return JSON.stringify({game:'a-little-caravan',format:1,version:game.VERSION,state:valid},null,2);}
  function create(storage,game){
    const key=`caravan-save-v${game.VERSION}`,backup=key+'-backup',previous=key+'-previous';
    let expected=null,blocked=true,source=null,error='',opened=false;
    const restore=raw=>{try{return raw?game.restore(raw):null;}catch{return null;}};
    function load(){
      let state=null;source=null;blocked=false;error='';opened=true;
      try{
        expected=storage.getItem(key);state=restore(expected);
        if(state)source=key;
        else{
          if(expected!==null){blocked=true;error='主存档无法读取，已保护原始数据。请检查备份或导入存档。';}
          const candidates=[backup,previous,...Array.from({length:game.VERSION-2},(_,i)=>`caravan-save-v${game.VERSION-1-i}`)];
          for(const candidate of candidates){const raw=storage.getItem(candidate);if(raw===null)continue;const valid=restore(raw);
            if(valid){state=valid;source=candidate;if(candidate===backup||candidate===previous){blocked=true;error='已找到自动备份，请确认恢复后继续。';}break;}
            blocked=true;error='发现无法读取的存档，已保留原始数据。可以导入备份恢复。';
          }
        }
      }catch{blocked=true;error='当前无法读取本地存储。请保留页面，并检查浏览器存储权限。';}
      return {state:state||game.fresh(),source,blocked,error,legacy:!!source&&!source.includes('-backup')&&!source.includes('-previous')&&source!==key};
    }
    function check(){if(!opened)throw new Error('请先读取存档。');if(storage.getItem(key)!==expected)throw new Error('另一个窗口已更新存档。请导出本页备份，再刷新读取最新进度。');}
    function write(state,recovery=false){
      if(blocked&&!recovery)throw new Error(error||'存档保护中，请先恢复进度。');
      const valid=game.restore(state);if(!valid)throw new Error('进度未通过检查，本次操作未保存。');
      check();const raw=JSON.stringify(valid);if(raw===expected&&!blocked)return true;
      // Never destroy unreadable bytes. If archiving or backup fails, the main write is not attempted.
      if(expected!==null&&!restore(expected)){
        let archive=key+'-damaged-'+Date.now(),n=0;
        while(storage.getItem(archive)!==null){archive=key+'-damaged-'+Date.now()+'-'+(++n);if(n>100)throw new Error('无法创建原始存档保护副本。');}
        storage.setItem(archive,expected);
      }else if(expected!==null){
        const older=storage.getItem(backup);if(restore(older))storage.setItem(previous,older);
        storage.setItem(backup,expected);
      }
      storage.setItem(key,raw);expected=raw;blocked=false;error='';source=key;return true;
    }
    function commit(state){try{return write(state);}catch(e){error=e.message||'保存失败';throw e;}}
    function replace(state){try{return write(state,true);}catch(e){error=e.message||'恢复失败';throw e;}}
    function backupState(){return restore(storage.getItem(backup))||restore(storage.getItem(previous));}
    return {load,commit,replace,backupState,pack:state=>pack(state,game),parse:text=>parse(text,game),status:()=>({key,source,blocked,error})};
  }
  return {create,pack,parse,LIMIT};
});
