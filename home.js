/* Original camp layout and companion controller. SPDX-License-Identifier: MIT. */
window.CaravanHome={create(options){
  'use strict';
  const G=window.Caravan,A=window.Art,clone=value=>JSON.parse(JSON.stringify(value));
  let draft=null,selected=null,drag=null,bindings=null,timer=null,active=false,ignoreClick=false;
  const cat={x:380,y:400,fromX:380,fromY:400,toX:380,toY:400,start:0,end:0,next:0,pose:'idle',face:1,frame:4,until:0,text:'麦芽在等你。'};
  const editing=()=>draft!==null,collection=()=>options.state().collection,layout=()=>draft||collection().home.layout||G.freshLayout();
  const items=()=>G.homeItems(collection(),layout()),chosen=()=>items().find(i=>i.id===selected);
  const allowed=()=>options.state().phase==='market'&&options.state().challenge?.status!=='active';
  function stop(){clearTimeout(timer);timer=null;bindings?.abort();bindings=null;active=false;drag=null;}
  function discard(){draft=null;selected=null;drag=null;}
  function cancel(){discard();options.render();}
  function html(){
    const c=collection(),edit=editing(),list=items(),item=chosen(),hasCat=G.catLevel(options.state())>0;
    return `<div class="camp-toolbar"><div><b>${edit?'布置我的营地':'把远方，摆成家的样子'}</b><small>${edit?'拖动物品，或选中后点空地放置；方向键可微调。':'装饰、收藏、手作，都可以摆到喜欢的位置。'}</small></div>${edit?'<button class="secondary" data-action="home-layout-cancel">取消</button><button class="primary" data-action="home-layout-save">保存布置</button>':`<button class="primary" data-action="home-layout-edit" ${allowed()?'':'disabled'}>✦ 自由布置</button>`}</div>
      <div class="home-scene ${edit?'home-editing':''}" id="camp-board">${A.homeScene(c,{items:list,edit,selected})}<span class="home-level">${edit?'正在布置 · 尚未保存':'收藏 Lv.'+G.collectionLevel(options.state())}</span>${hasCat&&!edit?`<button class="camp-cat-actor" type="button" data-action="home-cat-pet" aria-label="摸摸小猫麦芽" style="left:${cat.x/8}%;top:${cat.y/4.4}%"><span class="camp-cat-visual">${A.catFrame(cat.frame,c.catBond)}</span><span class="camp-cat-hearts" aria-hidden="true">♥</span></button><span class="camp-cat-toy" aria-hidden="true">${A.icon('feather')}</span>`:''}</div>
      ${edit?`<section class="camp-edit-tools" aria-label="营地布置工具"><div class="camp-selection"><b id="camp-selected-name">${item?'选中：'+item.label:'先点选画面中的物品'}</b><div class="camp-nudge" aria-label="微调位置">${[['left','←'],['up','↑'],['down','↓'],['right','→']].map(([dir,label])=>`<button class="secondary" data-action="home-layout-nudge" data-value="${dir}" aria-label="向${{left:'左',right:'右',up:'上',down:'下'}[dir]}移动" ${item?'':'disabled'}>${label}</button>`).join('')}</div><button class="text-button" data-action="home-layout-reset">恢复默认位置</button></div><div class="camp-object-list" aria-label="选择要移动的物品">${list.map(i=>`<button class="secondary" data-action="home-layout-select" data-value="${i.id}" aria-pressed="${selected===i.id}">${i.label}</button>`).join('')}</div><details class="camp-treasure-drawer" open><summary>摆放珍藏 · ${layout().treasures.length}/${G.ownedTreasures(c).length}</summary>${G.ownedTreasures(c).length?`<div class="camp-treasure-picker">${G.ownedTreasures(c).map(key=>`<button data-action="home-layout-treasure" data-value="${key}" aria-pressed="${layout().treasures.includes(key)}">${A.icon(key)}<span>${G.TREASURES[key].name}<small>${layout().treasures.includes(key)?'已摆放 · 点击收起':'点击摆到营地'}</small></span></button>`).join('')}</div>`:'<p>寻访获得珍藏后，就可以逐件摆进营地，不必先解锁展柜。</p>'}</details><p class="camp-layout-note">取消或离开页面会保留原布置；只有“保存布置”才写入进度。更换装饰样式，请先保存布置，再到下方收藏册选择。</p></section>`:hasCat?`<section class="camp-companion" aria-label="陪伴麦芽"><div><b>麦芽的小日子</b><p id="camp-cat-status" role="status" aria-live="polite">${cat.text}</p></div><div>${[['pet','摸摸它'],['call','招呼过来'],['play','逗猫棒'],['nap','休息一会儿']].map(([key,label])=>`<button class="secondary" data-action="home-cat-${key}">${label}</button>`).join('')}<button class="text-button" data-action="cat-info">陪伴记录 →</button></div><small>也可以点击小猫或营地空地。互动不消耗物资；新见闻仍按原规则增加好感。</small></section>`:''}`;
  }
  function moveSelection(x,y){if(!draft||!selected)return;draft.positions[selected]=G.homePosition(selected,x,y);}
  function point(board,e){const svg=board.querySelector('.home-landscape'),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  function bind(visible){
    // A dialog temporarily suspends input; only leaving the camp discards edits.
    stop();if(!visible)return;
    const board=document.querySelector('#camp-board');if(!board)return;active=true;bindings=new AbortController();const signal=bindings.signal;
    board.addEventListener('pointerdown',e=>{if(!draft||e.button!==0)return;const el=e.target.closest('[data-home-object]');if(!el)return;const item=items().find(i=>i.id===el.dataset.homeObject);if(!item)return;e.preventDefault();selected=item.id;const p=point(board,e);drag={id:e.pointerId,start:p,x:item.x,y:item.y,moved:false,el};board.setPointerCapture(e.pointerId);board.querySelectorAll('.home-object').forEach(n=>n.classList.toggle('selected',n.dataset.homeObject===selected));}, {signal});
    board.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(board,e);if(Math.abs(p.x-drag.start.x)+Math.abs(p.y-drag.start.y)>3)drag.moved=true;if(!drag.moved)return;e.preventDefault();moveSelection(drag.x+p.x-drag.start.x,drag.y+p.y-drag.start.y);const pos=draft.positions[selected];drag.el.setAttribute('transform',`translate(${pos.x} ${pos.y})`);const layer=board.querySelector('.home-props');for(const item of items()){const node=layer.querySelector('[data-home-object="'+item.id+'"]');if(node)layer.appendChild(node);}},{signal});
    const finish=(e,canceled)=>{if(!drag||drag.id!==e.pointerId)return;if(canceled)moveSelection(drag.x,drag.y);ignoreClick=true;drag=null;options.render();setTimeout(()=>{ignoreClick=false;},0);};
    board.addEventListener('pointerup',e=>finish(e,false),{signal});board.addEventListener('pointercancel',e=>finish(e,true),{signal});
    board.addEventListener('click',e=>{if(ignoreClick){ignoreClick=false;return;}if(e.target.closest('button,[data-home-object]'))return;const p=point(board,e);if(draft){const item=chosen();if(item){moveSelection(p.x-item.w/2,p.y-item.h/2);options.render();}}else if(G.catLevel(options.state()))walkTo(p.x,p.y,'麦芽朝你跑来了。');},{signal});
    cat.next=Date.now()+4500;paintCat();schedule();
  }
  function nudge(dx,dy){const item=chosen();if(item){moveSelection(item.x+dx,item.y+dy);options.render();}}
  function handle(action,value){
    if(!action.startsWith('home-layout-')&&!action.startsWith('home-cat-'))return false;
    if(action==='home-layout-edit'){if(allowed()){draft=clone(collection().home.layout||G.freshLayout());selected=null;options.render();}return true;}
    if(action.startsWith('home-layout-')){
      if(!draft)return true;
      if(action==='home-layout-cancel')cancel();
      if(action==='home-layout-save'&&options.saveLayout(clone(draft))){draft=null;selected=null;options.render();}
      if(action==='home-layout-reset'){draft.positions={};selected=null;options.render();}
      if(action==='home-layout-select'&&items().some(i=>i.id===value)){selected=value;options.render();}
      if(action==='home-layout-nudge'){const step={left:[-5,0],right:[5,0],up:[0,-5],down:[0,5]}[value];if(step)nudge(...step);}
      if(action==='home-layout-treasure'&&G.treasureCount(collection(),value)>0){if(draft.treasures.includes(value)){draft.treasures=draft.treasures.filter(k=>k!==value);if(selected==='treasure:'+value)selected=null;}else{draft.treasures.push(value);selected='treasure:'+value;}options.render();}
      return true;
    }
    if(!active||draft||!G.catLevel(options.state()))return true;
    if(action==='home-cat-pet'){options.pet();react('pet','呼噜……麦芽蹭了蹭你的手。',2500);options.sound('success');}
    if(action==='home-cat-play'){react('play','抓到啦！麦芽正追着羽毛玩。',4000);options.sound('buy');}
    if(action==='home-cat-nap')react('sleep','麦芽蜷成一团，在你身边安心打盹。',14000);
    if(action==='home-cat-call')walkTo(270+Math.random()*240,402,'麦芽听到你的声音，走过来蹭蹭你。');
    return true;
  }
  function key(e){if(!draft)return false;if(e.key==='Escape'){e.preventDefault();cancel();return true;}const object=e.target.closest?.('[data-home-object]');if(object&&['Enter',' '].includes(e.key)){e.preventDefault();selected=object.dataset.homeObject;options.render();return true;}const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(selected&&step&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){e.preventDefault();nudge(step[0]*(e.shiftKey?15:3),step[1]*(e.shiftKey?15:3));return true;}return false;}
  function paintCat(){
    const node=document.querySelector('.camp-cat-actor');if(!node)return;
    const animated=options.animate(),frame=cat.pose==='sleep'?5:cat.pose==='play'?6:cat.pose==='walk'&&animated?Math.floor(Date.now()/160)%4:4;
    cat.frame=frame;node.style.left=cat.x/8+'%';node.style.top=cat.y/4.4+'%';node.dataset.pose=cat.pose;
    const visual=node.querySelector('.camp-cat-visual');visual.style.transform=`scaleX(${cat.face})`;
    if(visual.dataset.frame!==String(frame)||visual.dataset.bond!==String(collection().catBond)){visual.innerHTML=A.catFrame(frame,collection().catBond);visual.dataset.frame=String(frame);visual.dataset.bond=String(collection().catBond);}
    const toy=document.querySelector('.camp-cat-toy');toy.style.left=(cat.x+cat.face*48)/8+'%';toy.style.top=(cat.y-35)/4.4+'%';toy.classList.toggle('visible',cat.pose==='play');
    const status=document.querySelector('#camp-cat-status');if(status&&status.textContent!==cat.text)status.textContent=cat.text;
  }
  function walkTo(x,y,text){if(!active||draft)return;cat.fromX=cat.x;cat.fromY=cat.y;cat.toX=Math.max(55,Math.min(745,x));cat.toY=Math.max(250,Math.min(418,y));cat.face=cat.toX>=cat.x?1:-1;cat.start=Date.now();cat.end=cat.start+Math.max(1200,Math.hypot(cat.toX-cat.x,cat.toY-cat.y)*22);cat.pose='walk';cat.text=text;if(!options.animate()){cat.x=cat.toX;cat.y=cat.toY;cat.pose='idle';}paintCat();schedule();}
  function react(pose,text,duration){cat.pose=pose;cat.text=text;cat.until=Date.now()+duration;cat.next=cat.until+5000;paintCat();schedule();}
  function schedule(){clearTimeout(timer);if(!active||draft||!G.catLevel(options.state())||!options.animate())return;timer=setTimeout(tick,160);}
  function tick(){
    if(!active||draft||!options.animate())return;const now=Date.now();
    if(cat.pose==='walk'){const t=Math.min(1,(now-cat.start)/(cat.end-cat.start));cat.x=cat.fromX+(cat.toX-cat.fromX)*t;cat.y=cat.fromY+(cat.toY-cat.fromY)*t;if(t===1){cat.pose='idle';cat.next=now+5000;}}
    else if(['pet','play','sleep'].includes(cat.pose)&&now>=cat.until){cat.pose='idle';cat.next=now+5000;cat.text='麦芽陪在你身边。';}
    else if(cat.pose==='idle'&&now>=cat.next){if(Math.random()<.3)react('sleep','麦芽找了个舒服的位置，打起小盹。',12000);else walkTo(100+Math.random()*600,375+Math.random()*35,'麦芽正在营地里散步。');}
    paintCat();schedule();
  }
  function reconcileTreasures(){if(!draft)return;draft.treasures=draft.treasures.filter(k=>G.treasureCount(collection(),k)>0);if(selected?.startsWith('treasure:')&&G.treasureCount(collection(),selected.slice(9))<1)selected=null;}
  return {html,bind,stop,discard,handle,key,editing,reconcileTreasures};
}};
