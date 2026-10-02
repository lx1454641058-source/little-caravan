// Original local desktop resource policy. SPDX-License-Identifier: MIT.
'use strict';
const FILES={
  '/':['index.html','text/html'], '/index.html':['index.html','text/html'],
  '/styles.css':['styles.css','text/css'],
  ...Object.fromEntries(['engine','storage','diagnostics','art','sound','home','treasure','app'].map(name=>['/'+name+'.js',[name+'.js','text/javascript']])),
  ...Object.fromEntries(['caravan-town-023','caravan-harbor-023','caravan-harvest-023','caravan-atlas-023','cat-motion-025',...['goods','treasures','actors','decor','botanical','caravan','road','home','night','water','table','drive','clay'].map(name=>'paint-'+name+'-024')].map(name=>['/assets/'+name+'.png',['assets/'+name+'.png','image/png']]))
};
const ENTRY='caravan://game/index.html';
const NOTICE_ENTRY='caravan://game/third-party-notices.html';
function isNotice(url,method='GET') {try{const u=new URL(url);return ['GET','HEAD'].includes(method)&&u.protocol==='caravan:'&&u.host==='game'&&!u.username&&!u.password&&u.pathname==='/third-party-notices.html'&&!u.search;}catch{return false;}}
function resource(url,method='GET') {
  try {const u=new URL(url);return ['GET','HEAD'].includes(method)&&u.protocol==='caravan:'&&u.host==='game'&&!u.username&&!u.password&&!u.search?FILES[u.pathname]||null:null;}catch{return null;}
}
function isEntry(url) {try{const u=new URL(url);return u.protocol==='caravan:'&&u.host==='game'&&u.pathname==='/index.html'&&!u.search&&!u.username&&!u.password;}catch{return false;}}
function settings(raw) {
  const n=(value,min,max,fallback)=>Number.isInteger(value)&&value>=min&&value<=max?value:fallback;
  return {width:n(raw?.width,960,3840,1280),height:n(raw?.height,640,2160,800),fullscreen:raw?.fullscreen===true};
}
function windowSizing(raw,area) {
  const config=settings(raw);
  const available=(value,fallback)=>Number.isFinite(value)&&value>=1?Math.floor(value):fallback;
  const width=available(area?.width,1280),height=available(area?.height,800);
  // Minimum dimensions must fit too: Windows can otherwise enlarge a clamped
  // window beyond a small work area (for example at high display scaling).
  return {width:Math.min(config.width,width),height:Math.min(config.height,height),minWidth:Math.min(960,width),minHeight:Math.min(640,height)};
}
module.exports={FILES,ENTRY,NOTICE_ENTRY,resource,isEntry,isNotice,settings,windowSizing};
