/* Original game rules for this project. SPDX-License-Identifier: MIT */
(function (root, factory) {
  const game = factory();
  if (typeof module === 'object' && module.exports) module.exports = game;
  else root.Caravan = game;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 14, COLS = 6, DEADLINE = 12, GOAL = 300, MAX_ROWS = 5, DRIVE_STEPS = 15;
  // Long-lived caravans must not inherit the old twelve-day save limits.
  const LONG_COUNT = 1000000000, LONG_BALANCE = 1000000000000;
  function isFreeTravel(s) { return s.mode === 'free'; }
  function canDepart(s, route) { return isFreeTravel(s) || s.day + (route === 'road' ? 2 : 1) <= DEADLINE; }
  const BOOK_LEVELS = [0, 5, 10, 16, 23];
  const TREASURES = {
    leafSeal: {name:'茶农木印', city:0, place:'market', rare:false, text:'盖过无数茶包的小木印，还留着春茶的香气。'},
    moonTea: {name:'月白茶芽', city:0, place:'market', rare:true, text:'茶农只在月圆后的清晨摘下这一芽，银白绒毛像一小片月光。'},
    feather: {name:'翠鸟羽翎', city:0, place:'wild', rare:false, text:'落在溪边苔石上的一根羽毛，转动时会泛出蓝绿色。'},
    amberBee: {name:'琥珀蜜蜂', city:0, place:'wild', rare:true, text:'透明树脂封住了一个微小的春天。'},
    bottle: {name:'漂流信瓶', city:1, place:'market', rare:false, text:'瓶里写着一句话：愿每一位远行的人都有归处。'},
    glassFish: {name:'琉璃小鱼', city:1, place:'market', rare:true, text:'老船匠用海玻璃磨出的小鱼，逆光时像正在游动。'},
    shell: {name:'回声螺壳', city:1, place:'wild', rare:false, text:'把它放在耳边，旅途中也能听到海潮。'},
    pearl: {name:'潮汐明珠', city:1, place:'wild', rare:true, text:'退潮时才会显露的圆润珍珠，泛着温暖的粉色光泽。'},
    clayHorse: {name:'赤陶小马', city:2, place:'market', rare:false, text:'陶匠给小马画了一双不太对称的眼睛，反而格外神气。'},
    goldenBell: {name:'鎏金风铃', city:2, place:'market', rare:true, text:'薄薄的金色铃片，风过时有清亮的回声。'},
    wheatCrown: {name:'麦穗花环', city:2, place:'wild', rare:false, text:'用收获季的麦穗和野花编成，像小小的太阳。'},
    sunSeed: {name:'日光种子', city:2, place:'wild', rare:true, text:'据说种下它的人，会在来年等到一朵金色的花。'}
  };
  // Discovery records are permanent; physical copies can be traded independently.
  const TREASURE_LIMIT=99;
  const EXPLORE_MAPS=[{name:'柳溪茶山',chapter:1,city:0},{name:'松湾潮滩',chapter:2,city:1},{name:'金穗古窑',chapter:3,city:2}];
  const COMMISSION_TREASURES=['amberBee','pearl','sunSeed'];
  function isCommissionTreasure(key){return COMMISSION_TREASURES.includes(key);}
  function mapUnlocked(s,city=s.city){return !!EXPLORE_MAPS[city]&&s.chapter>=EXPLORE_MAPS[city].chapter;}
  function treasureOffer(s,key){
    const t=Object.hasOwn(TREASURES,key)&&TREASURES[key];if(!t)return null;
    const locked=isCommissionTreasure(key)&&!s.collection.treasures.includes(key);
    return {...TREASURE_PRICES[key],gold:t.rare?null:TREASURE_PRICES[key].gold,locked};
  }
  function commissionChance(s){return Math.min(60,25+s.completedOrders*5);}
  const TREASURE_PRICES={leafSeal:{stamps:8,gold:90,sell:3},moonTea:{stamps:22,gold:260,sell:8},feather:{stamps:8,gold:80,sell:3},amberBee:{stamps:20,gold:240,sell:7},bottle:{stamps:10,gold:110,sell:4},glassFish:{stamps:24,gold:280,sell:9},shell:{stamps:9,gold:100,sell:3},pearl:{stamps:26,gold:310,sell:10},clayHorse:{stamps:12,gold:130,sell:5},goldenBell:{stamps:22,gold:250,sell:8},wheatCrown:{stamps:10,gold:120,sell:4},sunSeed:{stamps:28,gold:330,sell:11}};
  function treasureCount(c,key){return Object.hasOwn(TREASURES,key)?Object.hasOwn(c.treasureStock||{},key)?c.treasureStock[key]:Number(c.treasures.includes(key)):0;}
  function ownedTreasures(c){return c.treasures.filter(key=>treasureCount(c,key)>0);}
  function setTreasureCount(c,key,count){if(!c.treasureStock)c.treasureStock={};c.treasureStock[key]=count;}
  function buyTreasure(s,key,currency,expectedCount){
    market(s);const price=treasureOffer(s,key),c=s.collection,count=treasureCount(c,key);
    if(!price||!['gold','stamps'].includes(currency))throw new Error('请选择珍藏小铺里的有效藏品和付款方式。');
    if(price.locked)throw new Error('这件珍藏需要先在委托路途事件中发现。');
    if(price[currency]===null)throw new Error('特色珍藏仅用纪念章兑换。');
    if(expectedCount!==undefined&&expectedCount!==count)throw new Error('藏品数量已更新，请重新选择。');
    if(count>=TREASURE_LIMIT)throw new Error('这件藏品已收满 99 件，请先出售一些。');
    const cost=price[currency],balance=currency==='gold'?s.gold:c.stamps;if(balance<cost)throw new Error(currency==='gold'?'金币不足，先去做几笔生意吧。':'纪念章不足，可以出售藏品或继续旅行。');
    if(currency==='gold'&&s.gold-cost<travelCost(s,'trail'))throw new Error('请先留够下一次出发的补给金币，再购买珍藏。');
    if(currency==='gold')s.gold-=cost;else c.stamps-=cost;
    const isNew=discover(s,'treasures',key,false);setTreasureCount(c,key,count+1);
    if(c.trail.clue?.key===key)c.trail.clue=null;
    log(s,`用 ${cost} ${currency==='gold'?'金币':'枚纪念章'}购入${TREASURES[key].name}，现有 ${count+1} 件。`);
    return {key,currency,cost,isNew,count:count+1};
  }
  function sellTreasure(s,key,expectedCount){
    market(s);const c=s.collection,price=Object.hasOwn(TREASURE_PRICES,key)&&TREASURE_PRICES[key],count=treasureCount(c,key);
    if(!price||count<1)throw new Error('手边没有这件藏品，图鉴记录不能出售。');
    if(expectedCount!==undefined&&expectedCount!==count)throw new Error('藏品数量已更新，请重新确认出售。');
    if(c.stamps>LONG_BALANCE-price.sell)throw new Error('纪念章已达保存上限，请先兑换一些物品。');
    setTreasureCount(c,key,count-1);c.stamps+=price.sell;
    if(count===1){if(c.favorite===key)c.favorite=null;if(c.home.exhibition.includes(key))c.home.exhibition=[];if(c.home.layout)c.home.layout.treasures=c.home.layout.treasures.filter(k=>k!==key);}
    log(s,`出售${TREASURES[key].name}，获得 ${price.sell} 枚纪念章；图鉴与成长记录保留。`);
    return {key,reward:price.sell,count:count-1};
  }
  const DECOR = {
    bunting:{name:'欢迎旗串',slot:'banner',cost:3,level:1,icon:'silk'},
    flowerbed:{name:'野花小径',slot:'ground',cost:4,level:1,icon:'herb'},
    blueTent:{name:'海风蓝帐',slot:'tent',cost:6,level:2,icon:'ice'},
    pond:{name:'萤光小池',slot:'garden',cost:8,level:2,icon:'fish'},
    stonepath:{name:'卵石小径',slot:'ground',cost:6,level:2,icon:'road'},
    goldTent:{name:'蜜色篷帐',slot:'tent',cost:9,level:3,icon:'honey'},
    showcase:{name:'珍藏展柜',slot:'display',cost:8,level:3,icon:'porcelain'},
    sail:{name:'风帆灯旗',slot:'banner',cost:9,level:3,icon:'lantern'},
    greenhouse:{name:'草木花房',slot:'garden',cost:12,level:4,icon:'leaf'},
    starTent:{name:'星夜篷帐',slot:'tent',cost:15,level:5,icon:'compass'}
  };
  function collectionLevel(s) { const count=s.collection.goods.length+s.collection.treasures.length; return BOOK_LEVELS.filter(n=>count>=n).length; }
  const FLOWERS = {
    daisy:{name:'溪畔雏菊',city:0,rare:false,color:'#f4dfa0'},
    moonflower:{name:'月白茶花',city:0,rare:true,color:'#f7f0e6'},
    lavender:{name:'海风薰衣草',city:1,rare:false,color:'#b6a0d6'},
    coral:{name:'珊瑚风铃花',city:1,rare:true,color:'#f09286'},
    sunflower:{name:'金穗向日葵',city:2,rare:false,color:'#edb954'},
    sunset:{name:'落日大丽花',city:2,rare:true,color:'#d5798d'}
  };
  const GUIDE = ['buy','explore','decorate','travel','sell'];
  function freshTea() { return {learned:[],lastSearch:null,display:null}; }
  function freshLayout() { return {positions:{},treasures:[]}; }
  function freshHome(legacy=false) { return {beds:[null,null,null],flowers:[],bouquet:null,exhibition:[],awarded:[],guide:[],guideHidden:legacy,tea:freshTea(),sailing:freshSailing(),pottery:freshPottery(),layout:freshLayout()}; }
  // Coordinates refer to the fixed 800 x 440 painting, independent of window size.
  const HOME_SPACES={tent:[100,95,360,260],ground:[135,301,310,135],garden:[505,140,265,225],banner:[105,55,570,180],display:[523,285,215,145],favorite:[428,264,75,106],tea:[16,267,160,128],sailing:[170,300,145,122],pottery:[500,337,80,92],bouquet:[320,300,100,120]};
  function homeSpace(id) { return Object.hasOwn(HOME_SPACES,id)?HOME_SPACES[id]:typeof id==='string'&&id.startsWith('treasure:')&&Object.hasOwn(TREASURES,id.slice(9))?[370,220,64,76]:null; }
  function homePosition(id,x,y) {
    const space=homeSpace(id);if(!space||!Number.isFinite(x)||!Number.isFinite(y))throw new Error('请选择营地中的物品。');
    return {x:Math.max(0,Math.min(800-space[2],Math.round(x))),y:Math.max(40,Math.min(440-space[3],Math.round(y)))};
  }
  function validHomeLayout(c,layout) {
    if(!layout||typeof layout!=='object'||Array.isArray(layout)||Object.keys(layout).some(k=>!['positions','treasures'].includes(k)))return false;
    if(!Array.isArray(layout.treasures)||layout.treasures.length>12||new Set(layout.treasures).size!==layout.treasures.length||layout.treasures.some(k=>treasureCount(c,k)<1))return false;
    const positions=layout.positions;if(!positions||typeof positions!=='object'||Array.isArray(positions)||Object.keys(positions).length>22)return false;
    return Object.entries(positions).every(([id,p])=>{const box=homeSpace(id);return box&&(!id.startsWith('treasure:')||c.treasures.includes(id.slice(9)))&&p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length===2&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<=800-box[2]&&p.y>=40&&p.y<=440-box[3];});
  }
  function arrangeHome(s,layout) { market(s);if(!validHomeLayout(s.collection,layout))throw new Error('布置中有越界或尚未拥有的物品，原布置没有改变。');s.collection.home.layout=JSON.parse(JSON.stringify(layout)); }
  function homeItems(c,layout=c.home.layout||freshLayout()) {
    const p=c.placed,h=c.home,list=[];
    function add(id,key,label,kind='sprite') { const [x,y,w,height]=homeSpace(id),pos=layout.positions[id]||{x,y};list.push({id,key,label,kind,x:pos.x,y:pos.y,w,h:height}); }
    add('tent',p.tent||'plainTent',p.tent?DECOR[p.tent].name:'旅行篷帐');
    for(const id of ['ground','garden','banner','display'])if(p[id])add(id,p[id],DECOR[p[id]].name,id==='display'?'showcase':'sprite');
    add('favorite',c.favorite||'leaf',c.favorite?TREASURES[c.favorite].name:'旅行纪念台','favorite');
    if(h.tea.display)add('tea','teaTable','手作茶席');
    if(h.sailing.display)add('sailing',h.sailing.display,'港湾模型台','sailing');
    if(h.pottery.display)add('pottery',h.pottery.display,'手作陶器','pottery');
    if(h.bouquet)add('bouquet',h.bouquet,FLOWERS[h.bouquet].name);
    layout.treasures.forEach((key,i)=>{add('treasure:'+key,key,TREASURES[key].name,'treasure');const item=list.at(-1);if(!layout.positions[item.id]){item.x=370+i%4*76;item.y=160+Math.floor(i/4)*80;}});
    return list.sort((a,b)=>(a.id==='ground'?-100:a.y+a.h)-(b.id==='ground'?-100:b.y+b.h));
  }
  const TEA_INGREDIENTS = [
    {name:'春芽',icon:'leaf',tone:'#729c67',flavor:[2,0,0]},
    {name:'焙叶',icon:'tea',tone:'#b87b50',flavor:[0,2,0]},
    {name:'花瓣',icon:'herb',tone:'#c6829c',flavor:[0,0,2]},
    {name:'露叶',icon:'feather',tone:'#7faaa4',flavor:[1,1,0]},
    {name:'蜜蕊',icon:'honey',tone:'#dab965',flavor:[0,1,1]},
    {name:'青橘',icon:'fruit',tone:'#bbbf65',flavor:[1,0,1]}
  ];
  const TEA_RECIPES = {
    morning:{name:'溪畔早茶',cups:3,target:[3,2,1],color:'#a7bc75',text:'清香多一点，醇厚托住微微花甜。'},
    sunset:{name:'晚霞花茶',cups:4,target:[3,2,3],color:'#d9a477',text:'清香与花甜相伴，留下温和的余味。'},
    home:{name:'归途暖茶',cups:5,target:[3,4,3],color:'#c39079',text:'多一分醇厚，给远行的人暖暖手。'}
  };
  function teaBlend(picks) {
    if(!Array.isArray(picks)||picks.length>5||picks.some(i=>!Number.isInteger(i)||i<0||i>=TEA_INGREDIENTS.length))throw new Error('请选择茶盘上的茶材。');
    return picks.reduce((sum,i)=>sum.map((v,n)=>v+TEA_INGREDIENTS[i].flavor[n]),[0,0,0]);
  }
  function teaStatus(s,key) {
    if(!Object.hasOwn(TEA_RECIPES,key))return null;
    const tea=s.collection.home.tea,index=Object.keys(TEA_RECIPES).indexOf(key),known=tea.learned.includes(key);
    const remaining=tea.lastSearch===null?0:Math.max(0,2-(s.collection.searches-tea.lastSearch));
    const unlocked=known||(index===tea.learned.length&&remaining===0);
    return {known,remaining,unlocked,ready:unlocked&&s.city===0&&s.phase==='market'&&s.challenge?.status!=='active'};
  }
  function brewTea(s,key,picks) {
    market(s);const status=teaStatus(s,key),recipe=Object.hasOwn(TEA_RECIPES,key)&&TEA_RECIPES[key];
    if(!status?.ready)throw new Error(s.city!==0?'配茶工坊在柳溪镇，旅途中也能在营地欣赏已做好的茶。':'先完成前一张茶谱，并带回两次新的寻访见闻。');
    const blend=teaBlend(picks);
    if(picks.length!==recipe.cups||blend.some((n,i)=>n!==recipe.target[i]))throw new Error('香气还没调匀：对照三条香气刻度，换一份茶材再试试。');
    const tea=s.collection.home.tea,reward=status.known?0:2;
    if(!status.known){tea.learned.push(key);tea.lastSearch=s.collection.searches;s.collection.stamps+=reward;}
    tea.display=key;log(s,`调成「${recipe.name}」，摆进营地茶席${reward?'，获得 2 枚纪念章':'；熟悉的茶香又回来了'}。`);
    return {key,isNew:!status.known,reward};
  }
  function displayTea(s,key) { market(s);const tea=s.collection.home.tea;if(!tea.learned.includes(key))throw new Error('请先在柳溪工坊调成这款茶。');tea.display=tea.display===key?null:key; }
  // Original wind-slide puzzles. Sailing stops before reefs or the edge; it
  // visits every buoy crossed, including ones between the start and end cells.
  const SAIL_DIRECTIONS = {north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
  const SAIL_CHARTS = {
    skiff:{name:'白帆小艇',title:'初次出港',size:5,start:20,dock:4,reefs:[1,7,12,17,24],buoys:[9,22]},
    trade:{name:'双桅信风船',title:'岛间来信',size:5,start:20,dock:4,reefs:[7,8,10,18,23,24],buoys:[22,6,19]},
    lantern:{name:'归航灯船',title:'暮色归航',size:5,start:20,dock:4,reefs:[1,2,7,10,11,12,17],buoys:[8,16,24]}
  };
  function freshSailing() { return {models:[],lastSearch:null,display:null,voyage:null}; }
  function sailingStep(key,at,visited,direction) {
    const chart=Object.hasOwn(SAIL_CHARTS,key)&&SAIL_CHARTS[key],delta=Object.hasOwn(SAIL_DIRECTIONS,direction)&&SAIL_DIRECTIONS[direction];
    if(!chart||!delta||!Number.isInteger(at)||at<0||at>=25||chart.reefs.includes(at)||!Number.isInteger(visited)||visited<0||visited>=(1<<chart.buoys.length))throw new Error('请选择航图上的有效方向。');
    let x=at%5,y=Math.floor(at/5),mask=visited;const crossed=[];
    while(true){const nx=x+delta[0],ny=y+delta[1],n=ny*5+nx;if(nx<0||nx>4||ny<0||ny>4||chart.reefs.includes(n))break;x=nx;y=ny;crossed.push(n);const buoy=chart.buoys.indexOf(n);if(buoy>=0)mask|=1<<buoy;}
    return {at:y*5+x,visited:mask,crossed};
  }
  const sailingGraphs = new Map();
  function sailingGraph(key) {
    if(sailingGraphs.has(key))return sailingGraphs.get(key);
    const chart=SAIL_CHARTS[key],queue=[{at:chart.start,visited:0,steps:0}],distances=new Map([[chart.start+':0',0]]);
    for(let i=0;i<queue.length;i++)for(const direction of Object.keys(SAIL_DIRECTIONS)){const next=sailingStep(key,queue[i].at,queue[i].visited,direction),id=next.at+':'+next.visited;if(!distances.has(id)){distances.set(id,queue[i].steps+1);queue.push({...next,steps:queue[i].steps+1});}}
    sailingGraphs.set(key,distances);return distances;
  }
  function sailingRoute(key,at,visited) {
    if(!Object.hasOwn(SAIL_CHARTS,key)||!sailingGraph(key).has(at+':'+visited))return null;
    const chart=SAIL_CHARTS[key],queue=[{at,visited,route:[]}],seen=new Set([at+':'+visited]);
    for(let i=0;i<queue.length;i++){const current=queue[i];if(current.at===chart.dock&&current.visited===(1<<chart.buoys.length)-1)return current.route;
      for(const direction of Object.keys(SAIL_DIRECTIONS)){const next=sailingStep(key,current.at,current.visited,direction),id=next.at+':'+next.visited;if(!seen.has(id)){seen.add(id);queue.push({...next,route:[...current.route,direction]});}}
    }return null;
  }
  function sailingStatus(s,key) {
    if(!Object.hasOwn(SAIL_CHARTS,key))return null;
    const fleet=s.collection.home.sailing,known=fleet.models.includes(key),index=Object.keys(SAIL_CHARTS).indexOf(key);
    const remaining=fleet.lastSearch===null?0:Math.max(0,2-(s.collection.searches-fleet.lastSearch)),unlocked=known||(index===fleet.models.length&&remaining===0);
    return {known,remaining,unlocked,ready:unlocked&&s.city===1&&s.phase==='market'&&s.challenge?.status!=='active'};
  }
  function startSailing(s,key) {
    market(s);if(!sailingStatus(s,key)?.ready)throw new Error('请到松湾港，完成前一张航图并带回两次新的寻访见闻。');
    const fleet=s.collection.home.sailing;if(fleet.voyage?.key!==key)fleet.voyage={key,at:SAIL_CHARTS[key].start,visited:0,steps:0,previous:null};
  }
  function activeSailing(s) { market(s);const v=s.collection.home.sailing.voyage;if(!v||!sailingStatus(s,v.key)?.ready)throw new Error('先到松湾港选择一张航图。');return v; }
  function sail(s,direction,expectedStep) {
    const v=activeSailing(s);if(expectedStep!==v.steps)throw new Error('小船的位置已更新，请重新选择方向。');
    const next=sailingStep(v.key,v.at,v.visited,direction);if(next.at===v.at)throw new Error('这个方向被礁石或岸边挡住了，换个风向吧。');
    v.previous={at:v.at,visited:v.visited,steps:v.steps};v.at=next.at;v.visited=next.visited;v.steps++;
    return next;
  }
  function undoSailing(s) { const v=activeSailing(s);if(!v.previous)throw new Error('当前没有可以撤回的一步。');Object.assign(v,v.previous);v.previous=null; }
  function resetSailing(s) { const v=activeSailing(s);v.at=SAIL_CHARTS[v.key].start;v.visited=0;v.steps=0;v.previous=null; }
  function sailingComplete(v) { const c=v&&Object.hasOwn(SAIL_CHARTS,v.key)&&SAIL_CHARTS[v.key];return !!c&&v.at===c.dock&&v.visited===(1<<c.buoys.length)-1; }
  function finishSailing(s) {
    const v=activeSailing(s);if(!sailingComplete(v))throw new Error('经过所有浮标后，把小船送回金色码头。');
    const fleet=s.collection.home.sailing,key=v.key,isNew=!fleet.models.includes(key),reward=isNew?2:0;
    if(isNew){fleet.models.push(key);fleet.lastSearch=s.collection.searches;s.collection.stamps+=reward;}
    fleet.display=key;fleet.voyage=null;log(s,`完成「${SAIL_CHARTS[key].title}」，把${SAIL_CHARTS[key].name}模型摆进营地${reward?'，获得 2 枚纪念章':''}。`);return {key,isNew,reward};
  }
  function displaySailing(s,key) { market(s);const fleet=s.collection.home.sailing;if(!fleet.models.includes(key))throw new Error('请先完成这艘船的试航。');fleet.display=fleet.display===key?null:key; }
  function validSailing(fleet,searches) {
    const keys=Object.keys(SAIL_CHARTS),integer=n=>Number.isInteger(n)&&n>=0&&n<=LONG_COUNT;
    if(!fleet||!Array.isArray(fleet.models)||fleet.models.length>3||fleet.models.some((key,i)=>key!==keys[i])||(fleet.display!==null&&!fleet.models.includes(fleet.display)))return false;
    if(fleet.models.length?(!integer(fleet.lastSearch)||fleet.lastSearch>searches||fleet.lastSearch<(fleet.models.length-1)*2):fleet.lastSearch!==null)return false;
    const v=fleet.voyage;if(v===null)return true;
    if(!v||!Object.hasOwn(SAIL_CHARTS,v.key)||keys.indexOf(v.key)>fleet.models.length)return false;
    if(!fleet.models.includes(v.key)&&fleet.lastSearch!==null&&searches-fleet.lastSearch<2)return false;
    const graph=sailingGraph(v.key),valid=p=>p&&integer(p.at)&&integer(p.visited)&&integer(p.steps)&&graph.has(p.at+':'+p.visited)&&p.steps>=graph.get(p.at+':'+p.visited);
    if(!valid(v))return false;
    if(v.previous===null)return true;
    if(!valid(v.previous)||v.previous.steps+1!==v.steps)return false;
    return Object.keys(SAIL_DIRECTIONS).some(direction=>{const next=sailingStep(v.key,v.previous.at,v.previous.visited,direction);return next.at!==v.previous.at&&next.at===v.at&&next.visited===v.visited;});
  }

  const POTTERY_FORMS = {
    bowl:{name:'麦穗小碗',target:[34,54,64,72]},
    jar:{name:'圆肚陶罐',target:[42,66,60,42]},
    vase:{name:'细颈花瓶',target:[34,66,36,28]}
  };
  const POTTERY_GLAZES = {clay:{name:'暖陶',color:'#c58c6a'},jade:{name:'青瓷',color:'#8aafa0'},night:{name:'夜蓝',color:'#71899e'}};
  const POTTERY_PATTERNS = {plain:'素面',lines:'水波',dots:'星点',wheat:'麦穗'};
  function freshPottery() { return {learned:[],lastSearch:null,pieces:{bowl:null,jar:null,vase:null},display:null}; }
  function validPotteryPiece(piece) { return !!piece&&Array.isArray(piece.profile)&&piece.profile.length===4&&Array.from(piece.profile).every(n=>Number.isInteger(n)&&n>=15&&n<=80)&&Object.hasOwn(POTTERY_GLAZES,piece.glaze)&&Object.hasOwn(POTTERY_PATTERNS,piece.pattern); }
  function potteryFit(key,profile) { return Object.hasOwn(POTTERY_FORMS,key)&&Array.isArray(profile)&&profile.length===4&&Array.from(profile).every((n,i)=>Number.isInteger(n)&&n>=15&&n<=80&&Math.abs(n-POTTERY_FORMS[key].target[i])<=6); }
  function potteryStatus(s,key) {
    if(!Object.hasOwn(POTTERY_FORMS,key))return null;
    const studio=s.collection.home.pottery,known=studio.learned.includes(key),index=Object.keys(POTTERY_FORMS).indexOf(key);
    const remaining=studio.lastSearch===null?0:Math.max(0,2-(s.collection.searches-studio.lastSearch)),unlocked=known||(index===studio.learned.length&&remaining===0);
    return {known,remaining,unlocked,ready:unlocked&&s.city===2&&s.phase==='market'&&s.challenge?.status!=='active'};
  }
  function firePottery(s,key,piece,expectedPiece=null) {
    market(s);const status=potteryStatus(s,key),studio=s.collection.home.pottery;
    if(!status?.ready)throw new Error('请到金穗城，学会前一种器形并带回两次新的寻访见闻。');
    if(!validPotteryPiece(piece)||(!status.known&&!potteryFit(key,piece.profile)))throw new Error('先沿虚线完成器形，再选择釉色与花纹。');
    // Replacing an existing work requires the exact old piece shown in the
    // comparison. A stale dialog must never overwrite a newer saved design.
    if(status.known&&JSON.stringify(studio.pieces[key])!==JSON.stringify(expectedPiece))throw new Error('这件旧作已经变化，请重新打开预览再确认替换。');
    const reward=status.known?0:2;if(!status.known){studio.learned.push(key);studio.lastSearch=s.collection.searches;s.collection.stamps+=reward;}
    studio.pieces[key]={profile:[...piece.profile],glaze:piece.glaze,pattern:piece.pattern};studio.display=key;
    log(s,`烧成「${POTTERY_FORMS[key].name}」，${POTTERY_GLAZES[piece.glaze].name}釉配${POTTERY_PATTERNS[piece.pattern]}纹，已摆进营地${reward?'，获得 2 枚纪念章':''}。`);
    return {key,isNew:!status.known,reward};
  }
  function displayPottery(s,key) { market(s);const studio=s.collection.home.pottery;if(!studio.learned.includes(key))throw new Error('请先烧成这件陶器。');studio.display=studio.display===key?null:key; }
  function validPottery(studio,searches) {
    const keys=Object.keys(POTTERY_FORMS);
    if(!studio||!Array.isArray(studio.learned)||studio.learned.length>3||studio.learned.some((k,i)=>k!==keys[i])||(studio.display!==null&&!studio.learned.includes(studio.display)))return false;
    if(studio.learned.length?(!Number.isInteger(studio.lastSearch)||studio.lastSearch<(studio.learned.length-1)*2||studio.lastSearch>searches):studio.lastSearch!==null)return false;
    if(!studio.pieces||typeof studio.pieces!=='object'||Array.isArray(studio.pieces)||Object.keys(studio.pieces).length!==3)return false;
    return keys.every(key=>studio.learned.includes(key)?validPotteryPiece(studio.pieces[key]):studio.pieces[key]===null);
  }

  function markGuide(s,key) { const list=s.collection.home.guide;if(!list.includes(key))list.push(key); }
  function hideGuide(s,hidden=true) { market(s);s.collection.home.guideHidden=!!hidden; }
  function seedUnlocked(s,key) { const f=Object.hasOwn(FLOWERS,key)&&FLOWERS[key];return !!f&&s.collection.treasures.some(k=>TREASURES[k].city===f.city&&(!f.rare||TREASURES[k].rare)); }
  // Facilities remain available once owned, so changing the visual decor never
  // destroys a growing plant or forces a particular appearance on the player.
  function gardenBeds(s) { return s.collection.owned.includes('greenhouse')?3:s.collection.owned.includes('flowerbed')?1:0; }
  function plantFlower(s,index,key) {
    market(s);const home=s.collection.home;
    if(!Number.isInteger(index)||index<0||index>=gardenBeds(s)||home.beds[index]!==null||!seedUnlocked(s,key))throw new Error('请选择已开放的空花圃和已获得的花种。');
    home.beds[index]={key,planted:s.collection.searches};log(s,`种下${FLOWERS[key].name}；再完成两次寻访就会盛开。`);
  }
  function flowerGrowth(s,index) { const bed=s.collection.home.beds[index];return bed?Math.min(2,s.collection.searches-bed.planted):0; }
  function harvestFlower(s,index) {
    market(s);const home=s.collection.home;
    if(!Number.isInteger(index)||index<0||index>=gardenBeds(s)||!home.beds[index]||flowerGrowth(s,index)<2)throw new Error('花还没盛开，再带回一些旅途见闻吧。');
    const key=home.beds[index].key,isNew=!home.flowers.includes(key);home.beds[index]=null;
    if(isNew)home.flowers.push(key);home.bouquet=key;const reward=isNew?2:1;s.collection.stamps+=reward;
    log(s,`收获${FLOWERS[key].name}，摆进营地花瓶，获得 ${reward} 枚纪念章。`);return {key,isNew,reward};
  }
  function chooseBouquet(s,key) { market(s);if(!s.collection.home.flowers.includes(key))throw new Error('请先培育出这朵花。');s.collection.home.bouquet=key; }
  function exhibitionTheme(keys) { if(!Array.isArray(keys)||keys.length!==3||new Set(keys).size!==3||keys.some(k=>!Object.hasOwn(TREASURES,k)))return null;const city=TREASURES[keys[0]].city;return keys.every(k=>TREASURES[k].city===city)?city:null; }
  function arrangeExhibition(s,keys) {
    market(s);const c=s.collection,h=c.home;
    if(!c.owned.includes('showcase')||!Array.isArray(keys)||keys.length!==3||new Set(keys).size!==3||keys.some(k=>treasureCount(c,k)<1))throw new Error('展柜需要三件不同的现有珍藏。');
    const city=exhibitionTheme(keys),first=city!==null&&!h.awarded.includes(city);h.exhibition=[...keys];
    if(first){h.awarded.push(city);c.stamps+=5;}log(s,city===null?'三件旅途回忆在展柜里相遇了。':`布置「${CITIES[city].name}」主题展${first?'，获得主题徽章和 5 枚纪念章':''}。`);return {city,first};
  }
  const KEEPSAKES = {
    first:{name:'第一份远方',target:1,reward:2,icon:'bottle'},
    friend:{name:'有猫的归处',target:3,reward:3,icon:'cat'},
    willow:{name:'茶山来信',city:0,target:4,reward:5,icon:'moonTea'},
    harbor:{name:'潮声入梦',city:1,target:4,reward:5,icon:'pearl'},
    goldfield:{name:'麦田晚风',city:2,target:4,reward:5,icon:'goldenBell'},
    all:{name:'把远方带回家',target:12,reward:10,icon:'compass'}
  };
  function keepsakeProgress(s,key) {
    if(!Object.hasOwn(KEEPSAKES,key))return 0;
    const goal=KEEPSAKES[key];return Math.min(goal.target,s.collection.treasures.filter(k=>goal.city===undefined||TREASURES[k].city===goal.city).length);
  }
  function claimKeepsake(s,key) {
    market(s);const c=s.collection,goal=Object.hasOwn(KEEPSAKES,key)&&KEEPSAKES[key];
    if(!goal||c.claimed.includes(key)||keepsakeProgress(s,key)<goal.target)throw new Error('请先完成这份收藏心愿，奖励只能领取一次。');
    c.claimed.push(key);c.stamps+=goal.reward;log(s,`完成「${goal.name}」，收到 ${goal.reward} 枚纪念章。`);
    return goal.reward;
  }
  function catLevel(s) { return s.collection.treasures.length<3 ? 0 : s.collection.catBond>=6 ? 3 : s.collection.catBond>=3 ? 2 : 1; }
  function canPetCat(s) { const c=s.collection;return s.phase==='market'&&s.challenge?.status!=='active'&&catLevel(s)>0&&c.searches>c.catLastSearch; }
  function petCat(s) {
    market(s);if(!canPetCat(s))throw new Error('完成一次新的寻访，再来陪小猫分享见闻。');
    const c=s.collection,previous=c.catBond;c.catLastSearch=c.searches;c.catBond=Math.min(6,c.catBond+1);
    log(s,previous===2?'小猫麦芽戴上了你的旅行围巾。':previous===5?'麦芽有了自己的软垫，这里越来越像家了。':'麦芽蹭了蹭你的手，听你讲起今天的远方。');
    return catLevel(s);
  }
  const VISITORS = [
    {name:'阿青',role:'柳溪茶农',icon:'visitorTea',card:'茶山的第一封信',chapters:[
      ['一枚旧茶印','阿青认出了你带回的茶山小物。她说，母亲以前也走过这条商路，总在回家后把旅途见闻讲给她听。','把这一路的见闻讲给她'],
      ['可以歇脚的地方','阿青坐在你布置好的营地里，拿出一张还没写完的信纸。她想告诉远方的母亲，镇里的新茶又发芽了。','陪她写完这封信'],
      ['风把信送回来了','母亲的回信里夹着一幅茶山速写。阿青把它送给你：你替我看过山外，我也想让你记得这里。','收下茶山明信片']
    ]},
    {name:'洛舟',role:'松湾船匠',icon:'visitorSail',card:'不再漂流的小船',chapters:[
      ['听潮的人','洛舟听见你的海边藏品碰在一起的声音。他修了一辈子船，却一直没敢给自己造一艘。','听听他的小船计划'],
      ['借一盏归航灯','在营地的灯下，洛舟把船的草图铺开。他说不必走得很远，能在傍晚回到有灯的地方就好。','为小船画一盏归航灯'],
      ['第一次出港','洛舟带来一张画着小帆船的明信片：今天终于出港了，绕了一个小小的弯，又平安回家。','收下归航明信片']
    ]},
    {name:'陶禾',role:'金穗陶匠',icon:'visitorClay',card:'留给远方的一盏灯',chapters:[
      ['不太整齐的小马','陶禾说，自己总捏不好小马的眼睛。他看见你把旅途小物认真收好，第一次觉得瑕疵也能被喜欢。','告诉他你喜欢的小细节'],
      ['屋檐下的晚饭','陶禾在你的营地歇脚，看着一件件不同地方的纪念品。他决定给每位远行的朋友烧一只不同的碗。','一起挑选陶碗的花纹'],
      ['一桌装得下的远方','新碗出窑那天，陶禾画下大家围坐吃饭的样子。他把画送给你：下次路过，留一个晚上吧。','收下晚饭明信片']
    ]}
  ];
  function trackClue(s,key) {
    market(s);if(key===null){s.collection.trail.clue=null;return;}
    if(!Object.hasOwn(TREASURES,key)||s.collection.treasures.includes(key))throw new Error('请选择还没有发现的珍藏。');
    if(s.collection.trail.clue?.key!==key)s.collection.trail.clue={key,attempts:0};
  }
  function visitorStatus(s,city=s.city) {
    if(!Number.isInteger(city)||city<0||city>2)return null;
    const c=s.collection,stage=c.trail.visitors[city],count=c.treasures.filter(k=>TREASURES[k].city===city).length;
    const required=[1,2,4][stage]||4,wait=c.searches<=c.trail.visitorSearch[city];
    const hint=stage===3?'故事已完成，明信片留在营地。':count<required?`再收集 ${required-count} 件${CITIES[city].name}珍藏`:stage>=1&&c.owned.length===0?'先兑换一件营地装饰':wait?'完成一次新的寻访，再来分享见闻':'可以坐下来聊聊';
    return {stage,count,required,hint,ready:stage<3&&count>=required&&(stage===0||c.owned.length>0)&&!wait&&s.city===city&&s.phase==='market'&&s.challenge?.status!=='active'};
  }
  function visitFriend(s,city,expectedStage) {
    market(s);const status=visitorStatus(s,city);
    if(!status?.ready||status.stage!==expectedStage)throw new Error('来客还在等待新的旅途见闻，或这段故事已经讲过。');
    const c=s.collection,reward=[2,3,5][status.stage];c.trail.visitors[city]++;c.trail.visitorSearch[city]=c.searches;c.stamps+=reward;
    log(s,`与${VISITORS[city].name}分享旅途，获得 ${reward} 枚纪念章${status.stage===2?`和「${VISITORS[city].card}」明信片`:''}。`);
    return {reward,postcard:status.stage===2};
  }
  const TALENTS = {
    keen:{name:'寻宝眼光',branch:'寻宝',icon:'compass',cost:1,parent:null,text:'寻访稀有珍藏的基础概率从 35% 提高到 45%；原有保底仍有效。'},
    salvage:{name:'旧物新意',branch:'寻宝',icon:'porcelain',cost:2,parent:'keen',text:'重复珍藏的补偿从 1 枚提高到 2 枚纪念章。'},
    bargain:{name:'熟客议价',branch:'商旅',icon:'coin',cost:1,parent:null,text:'集市基础进货价降低 5%，四舍五入，最低 1 G；特惠继续生效。'},
    goodwill:{name:'商会信任',branch:'商旅',icon:'cart',cost:2,parent:'bargain',text:'每次整单交付额外获得 3 G 赏金。'},
    journal:{name:'珍藏手记',branch:'营地',icon:'book',cost:1,parent:null,text:'首次登记新货物或新珍藏时，额外获得 1 枚纪念章。'},
    homely:{name:'巧手布置',branch:'营地',icon:'leaf',cost:2,parent:'journal',text:'购买营地装饰少花 2 枚纪念章，最低 1 枚。'}
  };
  const hasTalent=(s,key)=>s.collection.talents.includes(key);
  function talentPoints(s){return collectionLevel(s)+Math.floor(s.collection.treasures.length/3)-s.collection.talents.reduce((sum,k)=>sum+TALENTS[k].cost,0);}
  function learnTalent(s,key){
    market(s);const talent=Object.hasOwn(TALENTS,key)&&TALENTS[key];
    if(!talent||hasTalent(s,key))throw new Error('天赋不存在或已经解锁。');
    if(talent.parent&&!hasTalent(s,talent.parent))throw new Error('请先解锁前置天赋。');
    if(talentPoints(s)<talent.cost)throw new Error('天赋点不足，提升收藏等级或收集更多珍藏。');
    s.collection.talents.push(key);log(s,`学会「${talent.name}」，消耗 ${talent.cost} 点天赋；新旅途也会保留。`);
  }
  function decorCost(s,key){return Math.max(1,DECOR[key].cost-(hasTalent(s,'homely')?2:0));}
  function freshCollection() { return {talents:[],goods:[],treasures:[],stamps:0,owned:[],placed:{tent:null,banner:null,ground:null,garden:null,display:null},favorite:null,pity:0,searches:0,claimed:[],catBond:0,catLastSearch:0,trail:{clue:null,visitors:[0,0,0],visitorSearch:[0,0,0]},home:freshHome()}; }
  function discover(s, group, key, reward=true) {
    const oldLevel=collectionLevel(s), list=s.collection[group];
    if(list.includes(key)) return false;
    list.push(key); if(reward)s.collection.stamps += (group==='goods' ? 1 : TREASURES[key].rare ? 3 : 2)+(hasTalent(s,'journal')?1:0);
    const level=collectionLevel(s); if(level>oldLevel) { s.collection.stamps += (level-oldLevel)*3; log(s,`收藏等级升到 Lv.${level}，获得 ${(level-oldLevel)*3} 枚纪念章，营地解锁了新布置。`); }
    return true;
  }
  function canExplore(s) { return s.phase==='market' && s.challenge?.status!=='active' && !s.explored; }
  function explore(s, place) {
    market(s); if(!canExplore(s)) throw new Error('本次停靠已经寻访过，抵达下一城后再来。');
    if(!['market','wild'].includes(place))throw new Error('请选择集市或寻宝地图。');
    if(place==='wild'&&!mapUnlocked(s))throw new Error(`第 ${s.city+1} 程开放${EXPLORE_MAPS[s.city].name}。`);
    const c=s.collection, rare=c.pity>=2 || random(s)<(hasTalent(s,'keen')?.45:.35);
    const key=Object.keys(TREASURES).find(k=>TREASURES[k].city===s.city && TREASURES[k].place===(rare?'market':place) && TREASURES[k].rare===rare);
    const count=treasureCount(c,key),isNew=discover(s,'treasures',key);if(!isNew)c.stamps+=hasTalent(s,'salvage')?2:1;
    const overflow=count>=TREASURE_LIMIT;if(overflow)c.stamps+=TREASURE_PRICES[key].sell;else setTreasureCount(c,key,count+1);
    // Clue completion is an extra discovery, so it never cancels the normal rare guarantee.
    let bonus=null;const clue=c.trail.clue;
    if(clue){const wanted=TREASURES[clue.key];if(c.treasures.includes(clue.key))c.trail.clue=null;
      else if(!isCommissionTreasure(clue.key)&&wanted.city===s.city&&wanted.place===place){clue.attempts++;if(clue.attempts===3){bonus=clue.key;discover(s,'treasures',bonus);c.trail.clue=null;log(s,`顺着线索终于找到${TREASURES[bonus].name}，额外收进珍藏册。`);}}
    }
    c.pity=rare?0:c.pity+1; c.searches++; s.explored=true; if(!c.favorite)c.favorite=key;markGuide(s,'explore');
    log(s,`寻访发现${TREASURES[key].name}${overflow?'，数量已满，按回收价换成纪念章':isNew?'，收进珍藏册':`，实物已收好，并获得 ${hasTalent(s,'salvage')?2:1} 枚纪念章`}。`);
    return {key,isNew,rare,bonus,overflow};
  }
  function buyDecor(s,key) {
    market(s); const d=Object.hasOwn(DECOR,key)&&DECOR[key], c=s.collection;
    if(!d || c.owned.includes(key))throw new Error('该装饰不存在或已经拥有。');
    if(collectionLevel(s)<d.level)throw new Error(`收藏 Lv.${d.level} 解锁这件装饰。`);
    const cost=decorCost(s,key);if(c.stamps<cost)throw new Error('纪念章不足，发现新货物、寻访、完成委托或小游戏都能获得。');
    c.stamps-=cost;c.owned.push(key);c.placed[d.slot]=key;markGuide(s,'decorate');log(s,`用 ${cost} 枚纪念章换得${d.name}，已布置在营地。`);
  }
  function placeDecor(s,key) { market(s);const d=Object.hasOwn(DECOR,key)&&DECOR[key];if(!d||!s.collection.owned.includes(key))throw new Error('请先获得这件装饰。');s.collection.placed[d.slot]=s.collection.placed[d.slot]===key?null:key; }
  function favoriteTreasure(s,key) { market(s);if(treasureCount(s.collection,key)<1)throw new Error('手边没有这件珍藏，可以在珍藏小铺买回。');s.collection.favorite=key; }
  const CHALLENGES = {
    drive: {name: '山路驾驶', icon: 'cart', intro: '驿站车夫邀你试一段山道，接金币、避石头。', detail: '约 24 秒 · 换道反应'},
    appraise: {name: '古物鉴定', icon: 'porcelain', intro: '流动古玩摊摆出三件藏品，请你按线索找出真品。', detail: '三轮观察 · 不计时'},
    memory: {name: '营地翻牌', icon: 'bag', intro: '营地伙计把货签扣在桌上，翻开两张相同货签即可配成一对。', detail: '四对货签 · 最多八次配对'},
    bridge: {name: '修桥铺路', icon: 'road', intro: '旧栈桥的桥板转乱了。旋转桥板，把左岸入口连接到右岸出口。', detail: '九格旋转拼图 · 最多十六次旋转'},
    fishing: {name: '河边钓鱼', icon: 'fish', intro: '河边钓客借你一根鱼竿。鱼漂进入绿色鱼群区时收竿。', detail: '三次收竿 · 可暂停'}
  };
  const TRAVEL_CHANCE = 65;
  const MODS = {
    wheels: { name: '铁箍车轮', price: 18, reputation: 0, icon: 'compass', text: '官道路费减少 2 G，最低 1 G。不带罗盘走 9 次官道可省回费用；可跨程使用。' },
    cold: { name: '保鲜货柜', price: 45, reputation: 2, icon: 'ice', text: '全车鲜鱼旅行不掉品质，空出冰晶的位置。与防震货架二选一。' },
    padding: { name: '防震货架', price: 45, reputation: 2, icon: 'silk', text: '全车陶瓶、彩釉灯走山路不掉品质。特殊订单仍需搭配装载；与保鲜货柜二选一。' }
  };
  function goal(s) { return GOAL * s.chapter; }
  function rank(s) { return s.reputation >= 6 ? { name: '口碑商队', bonus: 8 } : s.reputation >= 2 ? { name: '可靠商人', bonus: 0 } : { name: '见习商人', bonus: 0 }; }
  const CHAPTERS = [null, { name: '初出茅庐', text: '学会装载与贸易，取得商会执照。' }, { name: '匠人与远客', text: '解锁花蜜、香木、彩釉灯及三份专属委托。' }, { name: '巡回商会', text: '每两次抵达更换会场；在会场交单额外获得 15 G。' }];
  function fairCity(s, arrivals = 0) { return s.chapter === 3 ? Math.floor((s.journeys + arrivals) / 2) % 3 : null; }
  function orderBonus(s, order) { return order.bonus + rank(s).bonus + (fairCity(s) === ORDER_TYPES[order.type].city ? 15 : 0)+(hasTalent(s,'goodwill')?3:0); }
  function shopKinds(s) { return [...(s.chapter >= 2 ? [['honey'], ['wood'], ['glass', 'lantern']][s.city] : []), ...CITIES[s.city].stock]; }
  function cityDemand(s, city = s.city) { return CITIES[city].demand + (s.chapter >= 2 ? ` / ${['彩釉灯', '花蜜', '香木'][city]}` : ''); }
  function roadFee(s) { return isFreeTravel(s) ? 0 : Math.max(1, (has(s, 'compass') ? 1 : 5) - (s.mods.wheels ? 2 : 0)); }
  function protectedCargo(s, item) { return item.kind === 'fish' ? s.mods.cold || near(s, item, 'ice') : ['porcelain', 'glass'].includes(item.kind) ? s.mods.padding || near(s, item, 'silk') : false; }
  function combo(s, item) { const partner = { tea: 'spice', honey: 'herb', glass: 'lantern' }[item.kind]; return !!partner && near(s, item, partner); }
  const GOODS = {
    tea: { name: '云雾茶', category: '货物', w: 1, h: 2, base: 16, color: 'green', desc: '柳溪出产的春茶。在金穗城卖得更好。', effect: '与香料相邻，售价 +25%。' },
    spice: { name: '暖风香料', category: '货物', w: 1, h: 1, base: 22, color: 'orange', desc: '远方运来的香料，一小袋便足够香气满车。', effect: '让相邻的云雾茶售价 +25%。' },
    herb: { name: '山野药草', category: '补给', w: 1, h: 2, base: 12, color: 'green', desc: '松湾港的药师正在收购。也可用于帮助旅人。', effect: '旅途中可消耗一份，完成救助事件。' },
    fish: { name: '银鳞鲜鱼', category: '货物', w: 2, h: 1, base: 15, color: 'blue', desc: '松湾港的特产，在金穗城很受欢迎。', effect: '每次旅行品质 −35%；紧邻冰晶可保鲜。' },
    silk: { name: '暮色绸缎', category: '货物', w: 2, h: 2, base: 34, color: 'pink', desc: '产自金穗城的绸缎，在柳溪镇身价更高。', effect: '占用四格行囊，适合长线贸易。' },
    ice: { name: '恒温冰晶', category: '装备', w: 1, h: 2, base: 24, color: 'blue', desc: '不会融化的冰晶，是运送鲜鱼的好帮手。', effect: '保护上下左右相邻的鲜鱼，旅行不掉品质。' },
    shield: { name: '橡木圆盾', category: '装备', w: 2, h: 2, base: 28, color: 'brown', desc: '商队的护身符。卖掉它，就要独自面对山路。', effect: '携带时，可无损通过山路的拦路事件。' },
    lantern: { name: '铜制风灯', category: '装备', w: 1, h: 2, base: 20, color: 'orange', desc: '照亮林间岔路，也照亮被遗忘的货箱。', effect: '携带时，可在夜路事件中找到 18 金币。' },
    fruit: { name: '蜜心苹果', category: '货物', w: 1, h: 1, base: 8, color: 'pink', desc: '柳溪镇的果园收成正好，适合填满空余格子。', effect: '松湾港的收购价更高。' },
    porcelain: { name: '青花陶瓶', category: '货物', w: 1, h: 2, base: 26, color: 'blue', desc: '金穗城的工匠作品，柳溪收藏家求之不得。', effect: '走山路时品质 −25%；紧邻绸缎可防震。' },
    ration: { name: '旅行口粮', category: '补给', w: 2, h: 1, base: 6, color: 'brown', desc: '一包扎实的干粮，足够商队走完一段路。', effect: '经营考核期间每次出发消耗一包；没有则付 8 G。自由旅行不消耗。' },
    compass: { name: '黄铜罗盘', category: '装备', w: 1, h: 1, base: 24, color: 'orange', desc: '老领航员留下的小物件，指针仍然很准。', effect: '经营考核期间，官道通行费由 5 G 降低为 1 G。自由旅行已免路费。' },
    honey: { name: '山花蜜罐', chapter: 2, category: '货物', w: 2, h: 1, base: 26, color: 'orange', desc: '第二程开放。柳溪蜂农的花蜜，松湾药师用它调制药膏。', effect: '紧邻药草，售价 +20%；药蜜委托要求每罐贴着药草。' },
    wood: { name: '沉香木料', chapter: 2, category: '货物', w: 1, h: 3, base: 40, color: 'brown', desc: '第二程开放。松湾运来的长条香木，金穗工匠正在收购。', effect: '占连续三格，可旋转横放。不会因旅行损耗。' },
    glass: { name: '彩釉花灯', chapter: 2, category: '货物', w: 2, h: 2, base: 50, color: 'pink', desc: '第二程开放。金穗匠人的彩釉灯，柳溪灯会高价收购。', effect: '紧邻风灯售价 +20%；山路品质 −25%，绸缎或防震货架可保护。' }
  };
  const CITIES = [
    { id: 'willow', name: '柳溪镇', title: '风从茶山来', subtitle: '清晨的集市刚刚苏醒，装上春茶，去看看山的另一边。', specialty: '云雾茶 · 药草 · 苹果', demand: '绸缎 / 陶瓶', mult: { tea: .72, herb: .7, fruit: .75, silk: 1.6, porcelain: 1.55 }, stock: ['tea', 'herb', 'fruit', 'ration', 'spice', 'ice', 'shield', 'lantern', 'compass'] },
    { id: 'harbor', name: '松湾港', title: '潮水带来好生意', subtitle: '帆船归港，鱼市热闹起来。药师在找药草，船员想念甜苹果。', specialty: '鲜鱼 · 香料', demand: '药草 / 苹果', mult: { fish: .65, spice: .75, herb: 1.8, fruit: 1.8, tea: 1.3 }, stock: ['fish', 'spice', 'ice', 'ration', 'herb', 'lantern', 'shield'] },
    { id: 'goldfield', name: '金穗城', title: '把远方装进行囊', subtitle: '晚霞掠过城楼，商人们交换一天的见闻，也期待你带来的好货。', specialty: '绸缎 · 陶瓶', demand: '春茶 / 鲜鱼', mult: { silk: .68, porcelain: .65, tea: 1.85, fish: 2.15, spice: 1.45 }, stock: ['silk', 'porcelain', 'ration', 'compass', 'tea', 'shield', 'spice'] }
  ];
  // Each city offers three different trade-offs; the quantities and deadlines vary by visit.
  const ORDER_TYPES = [
    { origin: 0, city: 1, kind: 'herb', title: '山外的药箱', rule: 'plain', quality: 1, days: 2, bonus: 32, hint: '救助旅人会消耗订单里的药草。多带一份，还是留格子赚钱？' },
    { origin: 0, city: 2, kind: 'tea', title: '闻香识春茶', rule: 'scent', quality: 1, days: 3, bonus: 43, hint: '交付的每份茶叶都必须贴着香料。相邻格子比总空间更重要。' },
    { origin: 0, city: 1, kind: 'fruit', title: '赶潮的甜苹果', rule: 'plain', quality: 1, days: 1, bonus: 35, hint: '明天收货，必须走山路。遇到拦路者时，绕行会错过期限。' },
    { origin: 1, city: 2, kind: 'fish', title: '鲜鱼不能等', rule: 'plain', quality: 1, days: 1, bonus: 48, hint: '只收全新鲜鱼；全部贴近冰晶，还得赶过山路。' },
    { origin: 1, city: 0, kind: 'spice', title: '香料铺的补货', rule: 'plain', quality: 1, days: 3, bonus: 26, hint: '货物小、时限宽松，但回程香料售价不高。' },
    { origin: 1, city: 2, kind: 'fish', title: '码头家常宴', rule: 'plain', quality: .65, days: 2, bonus: 26, hint: '接受一次轻微损耗。可以省下冰晶，把空间留给更多货物。' },
    { origin: 2, city: 0, kind: 'porcelain', title: '一箱完好的茶具', rule: 'padded', quality: 1, days: 2, bonus: 44, hint: '交付时每只陶瓶都要贴着绸缎。绸缎占四格，也能卖钱。' },
    { origin: 2, city: 1, kind: 'silk', title: '赶船的绸缎', rule: 'plain', quality: 1, days: 1, bonus: 40, hint: '占地大的绸缎挤走护具，赶船又不能绕路。' },
    { origin: 2, city: 0, kind: 'porcelain', title: '收藏家的慢生意', rule: 'plain', quality: .75, days: 3, bonus: 26, hint: '接受轻微磕碰，赏金较少；稳稳送达也不失为好生意。' },
    { origin: 0, city: 1, kind: 'honey', chapter: 2, title: '药师的花蜜方', rule: 'herbal', quality: 1, days: 3, bonus: 50, hint: '每罐花蜜都要贴着药草。帮助旅人可能用掉搭配药草，建议留一份备用。' },
    { origin: 1, city: 2, kind: 'wood', chapter: 2, title: '木匠的长料单', rule: 'plain', quality: 1, days: 3, bonus: 50, hint: '两根香木各占连续三格；可旋转横放，给回程的四格花灯预留空间。' },
    { origin: 2, city: 0, kind: 'glass', chapter: 2, title: '点亮柳溪的夜', rule: 'lit', quality: 1, days: 3, bonus: 62, hint: '两盏花灯各占四格，都需贴着风灯。官道保品质；途中卖掉风灯就不满足委托。' }
  ];
  Object.assign(CITIES[0].mult, { honey: .7, wood: 1.1, glass: 1.75 });
  Object.assign(CITIES[1].mult, { honey: 1.8, wood: .65, glass: 1 });
  Object.assign(CITIES[2].mult, { honey: 1.1, wood: 1.75, glass: .65 });
  const EVENTS = {
    road: { title: '路边的小茶摊', text: '一位茶商招呼你歇脚。他愿意花高价买一份春茶，也可以给你讲讲前方的行情。', choices: [ { id: 'trade', text: '卖给茶商一份春茶', detail: '消耗 1 份云雾茶，获得 24 金币', kind: 'tea' }, { id: 'rest', text: '坐下来交换见闻', detail: '获得 5 金币的带路酬谢' } ] },
    traveler: { title: '需要帮助的旅人', text: '一名旅人在路旁扭伤了脚。他摸出钱袋，请你帮忙找些药草。', choices: [ { id: 'help', text: '用药草包扎伤口', detail: '消耗 1 份药草，获得 28 金币', kind: 'herb' }, { id: 'water', text: '留下水，指明回镇的方向', detail: '不消耗货物，继续旅程' } ] },
    bandit: { title: '山口的拦路者', text: '狭窄的山道上，有人拦住商车索要过路钱。一面结实的盾牌，也许足以让他们知难而退。', choices: [ { id: 'guard', text: '举起圆盾，护住货物', detail: '需要橡木圆盾；保留装备，无损通过', kind: 'shield' }, { id: 'pay', text: '付钱通过', detail: '支付 12 金币', gold: 12 }, { id: 'detour', text: '折返绕行', detail: '额外花费 1 天，不损失金币' } ] },
    night: { title: '树林里的微光', text: '一只货箱落在林间旧路上。天色已暗，带着风灯才能安全地找回它。', choices: [ { id: 'search', text: '提灯拾回货箱', detail: '需要铜制风灯；保留装备，获得 18 金币', kind: 'lantern' }, { id: 'leave', text: '记下位置，继续赶路', detail: '不冒险，平安到达' } ] },
    barter: { title: '一个难以拒绝的出价', text: '半路遇见的商人看中了你的装备。金币现在就能到手，但前方的路还没有走完。', choices: [] }
  };
  function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
  function dimensions(item) { const g = GOODS[item.kind]; return item.rotated ? [g.h, g.w] : [g.w, g.h]; }
  function fits(s, item, x, y, ignoreId) {
    const [w, h] = dimensions(item);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + w > COLS || y + h > s.rows) return false;
    return !s.items.some(other => { if (other.id === ignoreId) return false; const [ow, oh] = dimensions(other); return x < other.x + ow && x + w > other.x && y < other.y + oh && y + h > other.y; });
  }
  function findSpace(s, kind) { for (const rotated of [false, true]) { const item = { kind, rotated }; for (let y = 0; y < s.rows; y++) for (let x = 0; x < COLS; x++) if (fits(s, item, x, y)) return { x, y, rotated }; } return null; }
  function adjacent(a, b) { const [aw, ah] = dimensions(a), [bw, bh] = dimensions(b); return ((a.x + aw === b.x || b.x + bw === a.x) && a.y < b.y + bh && a.y + ah > b.y) || ((a.y + ah === b.y || b.y + bh === a.y) && a.x < b.x + bw && a.x + aw > b.x); }
  function near(s, item, kind) { return s.items.some(other => other.kind === kind && other.id !== item.id && adjacent(item, other)); }
  function has(s, kind) { return s.items.some(i => i.kind === kind); }
  function purchasePrice(s, kind) { return Math.max(1, Math.round(GOODS[kind].base * (CITIES[s.city].mult[kind] || 1)*(hasTalent(s,'bargain')?.95:1))); }
  function salePrice(s, item) { return Math.max(1, Math.floor(purchasePrice(s, item.kind) * .72 * item.quality * (combo(s, item) ? item.kind === 'tea' ? 1.25 : 1.2 : 1))); }
  function worth(s) { return s.gold + s.items.reduce((sum, i) => sum + salePrice(s, i), 0); }
  function log(s, text) { s.log.unshift({ day: s.day, text }); s.log = s.log.slice(0, 30); }
  function restock(s) {
    s.explored = false;
    s.stock = {}; shopKinds(s).forEach(k => s.stock[k] = GOODS[k].category === '装备' || k === 'spice' ? 2 : 4);
    s.board = ORDER_TYPES.flatMap((t, type) => {
      if (t.origin !== s.city || (!isFreeTravel(s) && s.day >= DEADLINE)) return [];
      if ((t.chapter || 1) > s.chapter || (s.chapter >= 2 && [2, 5, 8].includes(type))) return [];
      const quantity = t.chapter || ['spice', 'silk'].includes(t.kind) ? 2 : 2 + Math.floor(random(s) * 2);
      const extraDay = t.days > 1 && random(s) > .5 ? 1 : 0;
      const due = s.day + t.days + extraDay;
      return [{ id: s.journeys * 20 + type + 1, type, quantity, due: isFreeTravel(s) ? due : Math.min(DEADLINE, due), bonus: t.bonus + (quantity - 2) * 8 }];
    });
    s.orderTaken = false;
    s.forecast = { road: random(s) < .5 ? 'road' : 'traveler', trail: random(s) < .5 ? 'bandit' : 'night', offer: Math.floor(random(s) * 4) };
    const gear = CITIES[s.city].stock.filter(k => GOODS[k].category === '装备');
    s.deal = { kind: gear[Math.floor(random(s) * gear.length)], used: false };
    // Challenges occur on departure now; arrival never creates a second interruption.
    if (s.journeys === 0) s.challenge = newChallenge(s);
  }
  function addItem(s, kind, position) { const p = position || findSpace(s, kind); if (!p) return null; const item = { id: s.nextId++, kind, ...p, quality: 1 }; s.items.push(item); return item; }
  function fresh(seed = Date.now(), collection = null) {
    if (collection && !validCollection(collection)) throw new Error('收藏数据异常，未重置商队。');
    const s = { version: VERSION, seed: Number(seed) >>> 0, day: 1, city: 0, rows: 3, gold: 100, nextId: 1, items: [], stock: {}, phase: 'market', event: null, journeys: 0, board: [], order: null, orderTaken: false, completedOrders: 0, failedOrders: 0, forecast: null, deal: null, log: [], final: null, chapter: 1, reputation: 0, mods: { wheels: false, cold: false, padding: false }, challenge: null, lastChallenge: null };
    s.mode = 'story';
    s.collection = collection ? JSON.parse(JSON.stringify(collection)) : freshCollection();
    addItem(s, 'ration', { x: 0, y: 0, rotated: false }); addItem(s, 'herb', { x: 3, y: 0, rotated: false }); addItem(s, 'tea', { x: 1, y: 1, rotated: false });
    s.items.forEach(i=>discover(s,'goods',i.kind));
    restock(s); s.explored = !!collection && collection.searches > 0;
    log(s, '带着 100 金币和三份行李，从柳溪镇启程。'); return s;
  }
  function market(s) { if (s.phase !== 'market' || s.challenge?.status === 'active') throw new Error('请先完成或退出当前事件挑战。'); }
  function installMod(s, kind) {
    market(s); const mod = Object.hasOwn(MODS, kind) && MODS[kind];
    if (!mod || s.mods[kind]) throw new Error('这项改装不存在或已经安装。');
    if (isFreeTravel(s) && kind === 'wheels') throw new Error('行旅证已经免除路费，无需再购买减免路费的车轮。');
    if (s.reputation < mod.reputation) throw new Error('完成订单或挑战，先提升商会信誉。');
    if ((kind === 'cold' && s.mods.padding) || (kind === 'padding' && s.mods.cold)) throw new Error('本商队只能选择一种货舱专长。');
    if (s.gold < mod.price) throw new Error('金币不足，暂时无法改装。');
    s.gold -= mod.price; s.mods[kind] = true; log(s, `安装${mod.name}，花费 ${mod.price} G；可带往下一程。`);
  }
  function buyPrice(s, kind) { const p = purchasePrice(s, kind); return s.deal.kind === kind && !s.deal.used ? Math.max(1, Math.ceil(p * .75)) : p; }
  function buy(s, kind) {
    market(s); if (!GOODS[kind] || !s.stock[kind]) throw new Error('这件商品暂时售罄了。');
    const price = buyPrice(s, kind); if (s.gold < price) throw new Error('金币不足，试着卖出一些货物。');
    const spot = findSpace(s, kind); if (!spot) throw new Error('行囊放不下了。整理、旋转物品或扩容后再试。');
    const item = addItem(s, kind, spot); s.gold -= price; s.stock[kind]--; if (s.deal.kind === kind) s.deal.used = true; discover(s,'goods',kind); markGuide(s,'buy');log(s, `购入${GOODS[kind].name}，花费 ${price} 金币。`); return item;
  }
  function move(s, id, x, y, rotated) { market(s); const item = s.items.find(i => i.id === id); if (!item) throw new Error('请先选中行囊里的物品。'); const next = { ...item, rotated: rotated === undefined ? item.rotated : rotated }; if (!fits(s, next, x, y, id)) throw new Error('这里放不下，请留出完整的空位。'); Object.assign(item, { x, y, rotated: next.rotated }); }
  function sell(s, id) {
    market(s); const item = s.items.find(i => i.id === id); if (!item) throw new Error('请先选中要出售的物品。');
    const value = salePrice(s, item); s.gold += value; s.items = s.items.filter(i => i.id !== id); markGuide(s,'sell');log(s, `售出${GOODS[item.kind].name}，收入 ${value} 金币。`);
    return value;
  }
  function upgradeCost(s) { return s.rows === 3 ? 45 : 70; }
  function upgrade(s) { market(s); if (s.rows >= MAX_ROWS) throw new Error('行囊已经扩到最大。'); const cost = upgradeCost(s); if (s.gold < cost) throw new Error('金币不足，暂时无法扩容。'); s.gold -= cost; s.rows++; log(s, `花费 ${cost} 金币，行囊增加一行。`); }
  function acceptOrder(s, id) {
    market(s); if (s.order || s.orderTaken) throw new Error('本次停靠只能接一单。抵达下一座城后再挑新单。');
    const offer = s.board.find(o => o.id === id); if (!offer || offer.due <= s.day) throw new Error('这份订单已经无法接受。');
    s.order = { ...offer }; s.orderTaken = true; log(s, `接下「${ORDER_TYPES[offer.type].title}」，第 ${offer.due} 天结束前交付。`);
  }
  function orderItems(s) {
    if (!s.order) return [];
    const t = ORDER_TYPES[s.order.type];
    const partner = { scent: 'spice', padded: 'silk', herbal: 'herb', lit: 'lantern' }[t.rule];
    return s.items.filter(i => i.kind === t.kind && i.quality + .0001 >= t.quality && (!partner || near(s, i, partner)));
  }
  function orderStatus(s) {
    if (!s.order) return null;
    const t = ORDER_TYPES[s.order.type], items = orderItems(s), enough = items.length >= s.order.quantity;
    return { ready: s.phase === 'market' && s.city === t.city && s.day <= s.order.due && enough, count: items.length, text: s.day > s.order.due ? '已超时' : !enough ? `合格货物 ${items.length} / ${s.order.quantity}` : s.city !== t.city ? `装载就绪，送往${CITIES[t.city].name}` : '可以整单交付' };
  }
  function deliverOrder(s) {
    market(s); const status = orderStatus(s); if (!status || !status.ready) throw new Error('地点、期限或货物要求尚未满足。请检查订单。');
    const goods = orderItems(s).slice(0, s.order.quantity), sale = goods.reduce((n, i) => n + salePrice(s, i), 0), bonus = orderBonus(s, s.order);
    // Snapshot prices before removing any goods so adjacency cannot change halfway through delivery.
    const ids = new Set(goods.map(i => i.id)); s.items = s.items.filter(i => !ids.has(i.id)); s.gold += sale + bonus;
    log(s, `交付「${ORDER_TYPES[s.order.type].title}」：货款 ${sale} + 赏金 ${bonus} 金币，信誉 +2，纪念章 +2。`); s.completedOrders++; s.reputation = Math.min(99, s.reputation + 2); s.collection.stamps+=2; s.order = null; return { sale, bonus };
  }
  function abandonOrder(s) { market(s); if (!s.order) throw new Error('没有正在进行的订单。'); log(s, `放弃「${ORDER_TYPES[s.order.type].title}」，货物保留，无金币罚款。`); s.failedOrders++; s.order = null; }
  function expireOrder(s) { if (s.order && s.day > s.order.due) { log(s, `「${ORDER_TYPES[s.order.type].title}」已超时，失去赏金，货物仍可出售。`); s.failedOrders++; s.order = null; } }
  function barterOffer(s) {
    const gear = s.items.filter(i => GOODS[i.kind].category === '装备'); if (!gear.length) return null;
    const item = gear[s.forecast.offer % gear.length]; return { itemId: item.id, kind: item.kind, price: Math.round(GOODS[item.kind].base * 1.7) };
  }
  function riskText(s, destination, route) {
    const messages = [], arrival = s.day + (route === 'road' ? 2 : 1), t = s.order && ORDER_TYPES[s.order.type];
    if (t) { if (destination !== t.city) messages.push('这不是订单目的地'); if (arrival > s.order.due) messages.push('按这条路线到达时订单会超时'); if (route === 'trail' && s.forecast.trail === 'bandit' && !has(s, 'shield') && arrival === s.order.due) messages.push('绕行会让订单超时：需留 12 G 或带盾'); }
    const fish = s.items.filter(i => i.kind === 'fish' && !protectedCargo(s, i)).length;
    const fragile = s.items.filter(i => ['porcelain', 'glass'].includes(i.kind) && !protectedCargo(s, i)).length;
    if (fish) messages.push(`${fish} 份鲜鱼未受保鲜保护`); if (route === 'trail' && fragile) messages.push(`${fragile} 件陶瓶或花灯缺少防震保护`);
    return messages;
  }
  function travelCost(s, route) { return isFreeTravel(s) ? 0 : (has(s, 'ration') ? 0 : 8) + (route === 'road' ? roadFee(s) : 0); }
  function depart(s, destination, route) {
    market(s); if (![0, 1, 2].includes(destination) || destination === s.city) throw new Error('请选择另一座城镇。'); if (!['road', 'trail'].includes(route)) throw new Error('请选择有效路线。');
    const duration = route === 'road' ? 2 : 1; if (!canDepart(s, route)) throw new Error('剩余时间不够走这条路线，请换条路或结算旅程。');
    const cost = travelCost(s, route); if (s.gold < cost) throw new Error(`本次出发需要 ${cost} 金币，请先出售货物。`);
    const offer = barterOffer(s);
    const ration = !isFreeTravel(s) && s.items.find(i => i.kind === 'ration'); if (ration) s.items = s.items.filter(i => i.id !== ration.id);
    s.gold -= cost; s.day += duration; s.journeys++;markGuide(s,'travel');
    const key = s.forecast[route];
    s.phase = 'event'; s.event = { key: offer ? 'barter' : key, destination, route, nextKey: offer ? key : null, offer }; log(s, `沿${route === 'road' ? '官道' : '山路'}前往${CITIES[destination].name}，${isFreeTravel(s) ? '商会行旅证承担路费与补给' : `花费 ${cost} 金币${ration ? '和一包口粮' : '（含补给）'}`}。`);
    // One persisted roll per properly loaded, on-time commission. Reloads and detours cannot reroll it.
    if(s.order&&!s.order.relicChecked&&ORDER_TYPES[s.order.type].city===destination&&s.day<=s.order.due&&orderItems(s).length>=s.order.quantity){
      s.order.relicChecked=true;
      const missed=s.collection.commissionMisses||0;
      if(missed>=3||mix(s.seed^Math.imul(s.order.id+s.chapter*397,2246822519))%100<commissionChance(s)){
        s.event.commissionFind=COMMISSION_TREASURES[destination];s.collection.commissionMisses=0;
        log(s,`委托收货人介绍了一位路上的老朋友，或许能遇到${TREASURES[s.event.commissionFind].name}。`);
      }else s.collection.commissionMisses=missed+1;
    }
    const draw = mix(s.seed ^ Math.imul(s.journeys + s.chapter * 41, 2654435761));
    s.challenge = null;
    if (draw % 100 < TRAVEL_CHANCE) {
      const pool = Object.keys(CHALLENGES).filter(k => k !== s.lastChallenge);
      const kind = pool[mix(draw + 17) % pool.length];
      s.challenge = makeChallenge(kind, mix(draw + 31), 'travel'); s.lastChallenge = kind;
      log(s, `途中遇见「${CHALLENGES[kind].name}」，可以参加或直接继续赶路。`);
    }
  }
  function eventInfo(s) {
    if(s.event?.commissionFind){const t=TREASURES[s.event.commissionFind];return {title:['林间养蜂人的回礼','守潮人的秘密','古窑旁的种子'][t.city],text:`运送委托的介绍信让你结识了一位当地人。对方取出${t.name}，愿把这份远方的故事交给你。`,choices:[{id:'commission-claim',text:'收下这份旅途纪念',detail:`获得${t.name} · 不消耗货物、金币和天数`},{id:'commission-leave',text:'道谢，继续赶路',detail:'放弃本次发现，下一份委托仍可能遇到'}]};}
    if (!s.event) return null; if (s.event.key !== 'barter') return EVENTS[s.event.key];
    const o = s.event.offer; return { ...EVENTS.barter, choices: [
      { id: 'barter-sell', text: `卖掉${GOODS[o.kind].name}`, detail: `立得 ${o.price} G；后半程失去它的作用`, kind: o.kind },
      { id: 'barter-keep', text: '留住装备，按原计划走', detail: '不改变装载，继续处理前方事件' }
    ] };
  }
  function available(s, choice) { return (!choice.kind || has(s, choice.kind)) && (!choice.gold || s.gold >= choice.gold); }
  function resolve(s, choiceId) {
    if (s.phase !== 'event' || !s.event) throw new Error('当前没有旅途事件。');
    if (travelChallengePending(s)) throw new Error('请先完成或跳过途中挑战。');
    const choice = eventInfo(s).choices.find(c => c.id === choiceId); if (!choice || !available(s, choice)) throw new Error('当前不满足这个选项的条件。');
    if(s.event.commissionFind){
      const key=s.event.commissionFind;delete s.event.commissionFind;
      if(choiceId==='commission-claim'){
        const c=s.collection,count=treasureCount(c,key),isNew=discover(s,'treasures',key);
        if(count<TREASURE_LIMIT)setTreasureCount(c,key,count+1);else c.stamps+=TREASURE_PRICES[key].sell;
        if(c.trail.clue?.key===key)c.trail.clue=null;
        log(s,`在委托路途中发现${TREASURES[key].name}${count<TREASURE_LIMIT?'，收进珍藏册':'，实物数量已满，换成纪念章'}。`);
        return {key,isNew,rare:true,commission:true,overflow:count>=TREASURE_LIMIT};
      }
      log(s,'向老朋友道谢，继续运送委托。');return;
    }
    if (s.event.key === 'barter') {
      if (choiceId === 'barter-sell') { const o = s.event.offer; s.items = s.items.filter(i => i.id !== o.itemId); s.gold += o.price; log(s, `途中卖掉${GOODS[o.kind].name}，获得 ${o.price} 金币；后半程不再受它保护。`); }
      else log(s, '拒绝高价收购，保留装备继续赶路。');
      s.event.key = s.event.nextKey; s.event.nextKey = null; s.event.offer = null; return;
    }
    const consume = kind => { const item = s.items.find(i => i.kind === kind); s.items = s.items.filter(i => i.id !== item.id); };
    if (choiceId === 'trade') { consume('tea'); s.gold += 24; }
    if (choiceId === 'rest') s.gold += 5;
    if (choiceId === 'help') { consume('herb'); s.gold += 28; }
    if (choiceId === 'pay') s.gold -= 12;
    if (choiceId === 'detour') s.day++;
    if (choiceId === 'search') s.gold += 18;
    const changes = s.items.filter(i => (i.kind === 'fish' && !protectedCargo(s, i)) || (['porcelain', 'glass'].includes(i.kind) && s.event.route === 'trail' && !protectedCargo(s, i)));
    changes.forEach(i => { i.quality = Math.max(.1, Math.round((i.quality - (i.kind === 'fish' ? .35 : .25)) * 100) / 100); });
    if (changes.length) log(s, `${changes.length} 件货物因失去保护降低了品质。`);
    log(s, choice.text + '。'); s.city = s.event.destination; s.event = null; s.phase = 'market'; expireOrder(s); restock(s); log(s, `抵达${CITIES[s.city].name}，新的订单和装备折扣已公布。`);
  }
  function finish(s) { market(s); if (isFreeTravel(s)) throw new Error('自由旅行没有考核期限，可以随时保存并继续。'); const total = worth(s); s.final = { total, success: total >= goal(s), days: s.day, contracts: s.completedOrders }; s.phase = 'ended'; log(s, `第 ${s.chapter} 程结算，金币与货物价值合计 ${total}。`); return s.final; }
  function continueJourney(s) {
    if (s.phase !== 'ended' || worth(s) < goal(s) || s.chapter >= 3) throw new Error('本程达标后才能继续，最多三程。');
    s.chapter++; s.day = 1; s.journeys = 0; s.phase = 'market'; s.final = null; s.order = null; restock(s);
    log(s, `开启第 ${s.chapter} 程：资金、货物、信誉与马车全部保留，新目标 ${goal(s)} G。`);
  }

  function startFreeTravel(s) {
    if (isFreeTravel(s) || s.phase !== 'ended' || s.chapter !== 3 || worth(s) < goal(s)) throw new Error('完成第三程考核后，才能领取商会行旅证。');
    // Keep the calendar, cargo, collection and existing order. Entering free travel
    // does not refresh a stop or grant a second search, discount or reward.
    s.mode = 'free'; s.phase = 'market'; s.final = null;
    log(s, '领取商会行旅证：考核已完成，路费与补给由商会承担。继续收藏、探望朋友，把远方带回家。');
  }

  // Deterministic challenges do not reroll on reload and never use cargo as a failure penalty.
  function mix(n) { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; }
  function newChallenge(s) {
    if (s.journeys % 2 || (!isFreeTravel(s) && s.day >= DEADLINE)) return null;
    return makeChallenge((Math.floor(s.journeys / 2) + s.chapter - 1) % 2 ? 'appraise' : 'drive', mix(s.seed ^ (s.journeys + s.chapter * 71)), 'town');
  }
  function makeChallenge(kind, seed, origin) {
    const c = {kind, seed, origin, status: 'offered', step: 0, lane: 1, coins: 0, hits: 0, answers: []};
    if (kind === 'memory') Object.assign(c, {open: null, review: false});
    if (kind === 'bridge') { c.turns = Array.from({length: 9}, (_, i) => mix(seed + i * 71) % 4); if (bridgeSolved(c)) c.turns[3] = (c.turns[3] + 1) % 4; }
    if (kind === 'fishing') Object.assign(c, {meter: 0, ticks: 0});
    return c;
  }
  function challengeContext(s) { return s.challenge && (s.challenge.origin === 'travel' ? s.phase === 'event' && !!s.event : s.phase === 'market'); }
  function travelChallengePending(s) { return s.phase === 'event' && s.challenge?.origin === 'travel' && ['offered', 'active'].includes(s.challenge.status); }
  function startChallenge(s) { if (!challengeContext(s) || s.challenge.status !== 'offered') throw new Error('本次挑战已结束，下一次机会再来。'); s.challenge.status = 'active'; log(s, `参加${CHALLENGES[s.challenge.kind].name}，不额外消耗旅程天数。`); }
  function activeChallenge(s, kind) { if (!challengeContext(s) || s.challenge.kind !== kind || s.challenge.status !== 'active') throw new Error('当前没有进行这项挑战。'); return s.challenge; }
  function driveWave(c) { const n = mix(c.seed + c.step * 97), rock = n % 3; return { rock, coin: (rock + 1 + ((n >>> 9) % 2)) % 3 }; }
  function steer(s, lane) { const c = activeChallenge(s, 'drive'); if (!Number.isInteger(lane) || lane < 0 || lane > 2) throw new Error('请选择有效车道。'); c.lane = lane; }
  function challengeResult(c) {
    if (c.kind === 'drive') return { gold: 6 + c.coins * 2, reputation: c.coins >= 5 && c.hits <= 4 ? 1 : 0, correct: c.coins };
    if (c.kind === 'memory') { const correct = memoryMatched(c).length / 2; return {gold: correct * 6 + (correct === 4 ? 8 : 0), reputation: correct === 4 ? 1 : 0, correct}; }
    if (c.kind === 'bridge') { const correct = Number(bridgeSolved(c)); return {gold: correct ? 32 : 0, reputation: correct, correct}; }
    if (c.kind === 'fishing') { const catches = c.answers.map((pos, step) => pos < 0 ? 0 : Math.abs(pos - fishingTarget({...c, step})) <= 2 ? 10 : Math.abs(pos - fishingTarget({...c, step})) <= 4 ? 5 : 0), correct = catches.filter(n => n === 10).length; return {gold: catches.reduce((a, b) => a + b, 0) + (correct === 3 ? 6 : 0), reputation: correct >= 2 ? 1 : 0, correct}; }
    const correct = c.answers.reduce((n, answer, step) => n + Number(answer === appraisalRound({ ...c, step }).target), 0);
    return { gold: correct * 8 + (correct === 3 ? 8 : 0), reputation: correct >= 2 ? 1 : 0, correct };
  }
  function completeChallenge(s) {
    const c = s.challenge, result = challengeResult(c); c.status = 'done';
    s.collection.stamps++;
    s.gold += result.gold; s.reputation = Math.min(99, s.reputation + result.reputation);
    log(s, `${CHALLENGES[c.kind].name}完成：奖励 ${result.gold} G、信誉 +${result.reputation}。`); return result;
  }
  function advanceDrive(s) {
    const c = activeChallenge(s, 'drive'), wave = driveWave(c);
    if (c.lane === wave.rock) c.hits++; else if (c.lane === wave.coin) c.coins++;
    c.step++; if (c.step === DRIVE_STEPS) return completeChallenge(s); return null;
  }
  const APPRAISAL_FEATURES = { rim: ['单圈口沿', '双圈口沿', '锯齿口沿'], pattern: ['波浪纹', '菱形纹', '圆点纹'], mark: ['梅花底印', '方形底印', '三角底印'] };
  function appraisalRound(c) {
    const n = mix(c.seed + c.step * 313), target = n % 3, keys = [['rim', 'pattern'], ['pattern', 'mark'], ['rim', 'mark']][c.step % 3];
    const genuine = { rim: (n >>> 3) % 3, pattern: (n >>> 7) % 3, mark: (n >>> 11) % 3 };
    const candidates = Array.from({ length: 3 }, (_, index) => { const item = { ...genuine }; if (index !== target) { const offset = (index - target + 3) % 3; const key = keys[offset - 1]; item[key] = (item[key] + 1 + ((n >>> 15) % 2)) % 3; } return item; });
    return { target, candidates, clues: keys.map(key => APPRAISAL_FEATURES[key][genuine[key]]) };
  }
  function appraise(s, index, expectedStep) { const c = activeChallenge(s, 'appraise'); if (!Number.isInteger(index) || index < 0 || index > 2) throw new Error('请选择一件古物。'); if (expectedStep !== undefined && expectedStep !== c.step) throw new Error('这一轮已经作答，请查看下一轮。'); const round = appraisalRound(c); c.answers.push(index); c.step++; const result = { correct: index === round.target, target: round.target, clues: round.clues }; if (c.step === 3) completeChallenge(s); return result; }
  function skipChallenge(s) { if (!challengeContext(s) || !['offered', 'active'].includes(s.challenge.status)) throw new Error('没有可退出的挑战。'); s.challenge.status = 'skipped'; log(s, '放过这次挑战，金币和货物全部保留。'); }
  function memoryDeck(c) { const deck = [0, 0, 1, 1, 2, 2, 3, 3]; for (let i = 7; i > 0; i--) { const j = mix(c.seed + i * 137) % (i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; } return deck; }
  function memoryMatched(c) { const deck = memoryDeck(c), matched = []; for (let i = 0; i < c.answers.length; i += 2) if (deck[c.answers[i]] === deck[c.answers[i + 1]]) matched.push(c.answers[i], c.answers[i + 1]); return matched; }
  function memoryPick(s, index, expectedStep) {
    const c = activeChallenge(s, 'memory');
    if (!Number.isInteger(index) || index < 0 || index > 7 || expectedStep !== c.step || c.review || index === c.open || memoryMatched(c).includes(index)) throw new Error('这张牌不能翻，请继续当前配对。');
    if (c.open === null) { c.open = index; return; }
    c.answers.push(c.open, index); c.open = null; c.review = true; c.step++;
    if (memoryMatched(c).length === 8 || c.step === 8) completeChallenge(s);
  }
  function memoryContinue(s) { const c = activeChallenge(s, 'memory'); c.review = false; }
  function bridgeMask(c, index) { let mask = [6, 10, 12, 9, 10, 3, 3, 10, 9][index]; for (let n = 0; n < c.turns[index]; n++) mask = ((mask << 1) & 15) | (mask >> 3); return mask; }
  function bridgePath(c) {
    if (!(bridgeMask(c, 3) & 8)) return [];
    const seen = new Set([3]), queue = [3];
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], mask = bridgeMask(c, i);
      for (const [dx, dy, bit, opposite] of [[0,-1,1,4],[1,0,2,8],[0,1,4,1],[-1,0,8,2]]) {
        const x = i % 3 + dx, y = Math.floor(i / 3) + dy, j = y * 3 + x;
        if (x >= 0 && x < 3 && y >= 0 && y < 3 && (mask & bit) && (bridgeMask(c, j) & opposite) && !seen.has(j)) { seen.add(j); queue.push(j); }
      }
    }
    return [...seen];
  }
  function bridgeSolved(c) { return !!(bridgeMask(c, 5) & 2) && bridgePath(c).includes(5); }
  function rotateBridge(s, index, expectedStep) { const c = activeChallenge(s, 'bridge'); if (!Number.isInteger(index) || index < 0 || index > 8 || expectedStep !== c.step) throw new Error('请点击当前桥板。'); c.turns[index] = (c.turns[index] + 1) % 4; c.step++; if (c.step === 16) completeChallenge(s); }
  function submitBridge(s) { activeChallenge(s, 'bridge'); return completeChallenge(s); }
  function fishingTarget(c) { return [5, 10, 15][mix(c.seed + c.step * 173) % 3]; }
  function fishingPosition(c) { return c.meter <= 20 ? c.meter : 40 - c.meter; }
  function setFishingDepth(s, value) { const c = activeChallenge(s, 'fishing'); if (![5, 10, 15].includes(value)) throw new Error('请选择浅、中、深水层。'); c.meter = value; }
  function castFishing(s, expectedStep) { const c = activeChallenge(s, 'fishing'); if (expectedStep !== c.step) throw new Error('这一竿已经结算。'); c.answers.push(c.ticks >= 80 ? -1 : fishingPosition(c)); c.step++; c.meter = 0; c.ticks = 0; if (c.step === 3) completeChallenge(s); }
  function tickFishing(s) { const c = activeChallenge(s, 'fishing'); c.meter = (c.meter + 1) % 40; c.ticks++; if (c.ticks === 80) castFishing(s, c.step); }
  // Save files are untrusted input: validate bounded fields, item layout and phase consistency.
  function validCollection(c) {
    const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
    const list=(a,source)=>Array.isArray(a)&&a.length<=Object.keys(source).length&&new Set(a).size===a.length&&a.every(k=>Object.hasOwn(source,k));
    if(!c||!list(c.goods,GOODS)||!list(c.treasures,TREASURES)||!list(c.owned,DECOR)||!integer(c.stamps,LONG_BALANCE)||!integer(c.pity,2)||!integer(c.searches,LONG_COUNT))return false;
    if(Object.hasOwn(c,'treasureStock')&&(!c.treasureStock||typeof c.treasureStock!=='object'||Array.isArray(c.treasureStock)||Object.entries(c.treasureStock).some(([key,count])=>!c.treasures.includes(key)||!integer(count,TREASURE_LIMIT))))return false;
    if(Object.hasOwn(c,'commissionMisses')&&!integer(c.commissionMisses,3))return false;
    if(!list(c.talents,TALENTS)||c.talents.some(k=>TALENTS[k].parent&&!c.talents.includes(TALENTS[k].parent))||talentPoints({collection:c})<0)return false;
    if(!list(c.claimed,KEEPSAKES)||c.claimed.some(k=>keepsakeProgress({collection:c},k)<KEEPSAKES[k].target)||!integer(c.catBond,6)||!integer(c.catLastSearch,c.searches)||c.catBond>c.catLastSearch||(c.treasures.length<3&&(c.catBond>0||c.catLastSearch>0)))return false;
    const trail=c.trail;
    if(!trail||!Array.isArray(trail.visitors)||trail.visitors.length!==3||!Array.isArray(trail.visitorSearch)||trail.visitorSearch.length!==3)return false;
    if(trail.clue!==null&&(!trail.clue||!Object.hasOwn(TREASURES,trail.clue.key)||c.treasures.includes(trail.clue.key)||!integer(trail.clue.attempts,2)))return false;
    if(trail.visitors.some((stage,city)=>!integer(stage,3)||!integer(trail.visitorSearch[city],c.searches)||(stage===0?trail.visitorSearch[city]!==0:trail.visitorSearch[city]<stage||c.treasures.filter(k=>TREASURES[k].city===city).length<[1,2,4][stage-1]||stage>=2&&c.owned.length===0)))return false;
    if(c.favorite!==null&&treasureCount(c,c.favorite)<1)return false;
    const h=c.home,snapshot={collection:c};
    if(h&&Object.hasOwn(h,'layout')&&!validHomeLayout(c,h.layout))return false;
    if(!h||typeof h.guideHidden!=='boolean'||!Array.isArray(h.guide)||new Set(h.guide).size!==h.guide.length||h.guide.some(k=>!GUIDE.includes(k)))return false;
    if(!validSailing(h.sailing,c.searches)||!validPottery(h.pottery,c.searches))return false;
    const tea=h.tea,recipes=Object.keys(TEA_RECIPES);
    if(!tea||!list(tea.learned,TEA_RECIPES)||tea.learned.some((key,i)=>key!==recipes[i])||(tea.display!==null&&!tea.learned.includes(tea.display)))return false;
    if(tea.learned.length?(!integer(tea.lastSearch,c.searches)||tea.lastSearch<(tea.learned.length-1)*2):tea.lastSearch!==null)return false;
    if(!list(h.flowers,FLOWERS)||h.flowers.some(k=>!seedUnlocked(snapshot,k))||(h.bouquet!==null&&!h.flowers.includes(h.bouquet)))return false;
    if(!Array.isArray(h.beds)||h.beds.length!==3||h.beds.some((bed,i)=>bed!==null&&(!bed||i>=gardenBeds(snapshot)||!seedUnlocked(snapshot,bed.key)||!integer(bed.planted,c.searches))))return false;
    if(h.flowers.length&&!gardenBeds(snapshot))return false;
    if(!list(h.exhibition,TREASURES)||![0,3].includes(h.exhibition.length)||h.exhibition.some(k=>treasureCount(c,k)<1)||(h.exhibition.length&&!c.owned.includes('showcase')))return false;
    if(!Array.isArray(h.awarded)||h.awarded.length>3||new Set(h.awarded).size!==h.awarded.length||h.awarded.some(city=>!integer(city,2)||!c.owned.includes('showcase')||c.treasures.filter(k=>TREASURES[k].city===city).length<3))return false;
    const level=collectionLevel({collection:c});
    if(c.owned.some(k=>DECOR[k].level>level)||!c.placed||typeof c.placed!=='object'||Array.isArray(c.placed))return false;
    return ['tent','banner','ground','garden','display'].every(slot=>c.placed[slot]===null||(c.owned.includes(c.placed[slot])&&DECOR[c.placed[slot]].slot===slot));
  }
  function restore(raw) {
    try {
      const s = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));
      const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
      if (s && s.version === 2) {
        s.version = 3; s.chapter = 1; s.reputation = Math.min(99, s.completedOrders * 2);
        s.mods = { wheels: false, cold: false, padding: false }; s.challenge = newChallenge(s);
      }
      const previousPricing = s && s.version === 3;
      if (previousPricing) {
        s.version = 4;
        // Preserve this stop's existing stock and orders; new goods arrive with the next restock.
        if (s.chapter >= 2 && s.chapter <= 3 && s.city >= 0 && s.city <= 2 && s.stock) {
          shopKinds(s).forEach(k => { if (!Object.hasOwn(s.stock, k)) s.stock[k] = 0; });
        }
      }
      if (s && s.version === 4) {
        s.version = 5; s.lastChallenge = null;
        if (s.challenge) s.challenge.origin = 'town';
      }
      if (s && s.version === 5) {
        s.version=6;s.collection=freshCollection();s.explored=false;
        for(const kind of new Set(['ration','herb','tea',...(Array.isArray(s.items)?s.items.map(i=>i.kind):[])])) {
          if(!Object.hasOwn(GOODS,kind))return null;discover(s,'goods',kind);
        }
        if(!Number.isInteger(s.completedOrders)||s.completedOrders<0||s.completedOrders>36)return null;
        s.collection.stamps+=s.completedOrders*2;
      }
      // Add home goals without replaying discovery rewards or replacing the old save.
      if(s&&s.version===6&&s.collection) {
        s.version=7;s.collection.claimed=[];s.collection.catBond=0;s.collection.catLastSearch=0;
      }
      if(s&&s.version===7&&s.collection){s.version=8;s.collection.trail={clue:null,visitors:[0,0,0],visitorSearch:[0,0,0]};}
      if(s&&s.version===8){s.version=9;s.mode='story';}
      if(s&&s.version===9&&s.collection){s.version=10;s.collection.home=freshHome(true);}
      if(s&&s.version===10&&s.collection?.home){s.version=11;s.collection.home.tea=freshTea();}
      if(s&&s.version===11&&s.collection?.home){s.version=12;s.collection.home.sailing=freshSailing();}
      if(s&&s.version===12&&s.collection?.home){s.version=13;s.collection.home.pottery=freshPottery();}
      if(s&&s.version===13&&s.collection){s.version=14;s.collection.talents=[];}
      // Optional v14 extension: old copies remain readable and keep their original bytes.
      if(s?.version===14&&s.collection?.home&&!Object.hasOwn(s.collection.home,'layout'))s.collection.home.layout=freshLayout();
      if (!s || s.version !== VERSION || !['story','free'].includes(s.mode) || (isFreeTravel(s) && (s.chapter !== 3 || s.phase === 'ended')) || !int(s.seed, 0, 4294967295) || !int(s.day, 1, isFreeTravel(s) ? LONG_COUNT : 13) || !int(s.city, 0, 2) || !int(s.rows, 3, MAX_ROWS) || !int(s.gold, 0, LONG_BALANCE) || !int(s.nextId, 1, LONG_BALANCE) || !int(s.journeys, 0, isFreeTravel(s) ? LONG_COUNT : 12) || !['market', 'event', 'ended'].includes(s.phase)) return null;
      if(!validCollection(s.collection)||typeof s.explored!=='boolean')return null;
      if (!Array.isArray(s.items) || s.items.length > 30 || !int(s.completedOrders, 0, isFreeTravel(s) ? LONG_COUNT : 36) || !int(s.failedOrders, 0, isFreeTravel(s) ? LONG_COUNT : 72) || typeof s.orderTaken !== 'boolean') return null;
      if (!int(s.chapter, 1, 3) || !int(s.reputation, 0, 99) || !s.mods || Object.keys(MODS).some(k => typeof s.mods[k] !== 'boolean') || (s.mods.cold && s.mods.padding)) return null;
      if (s.lastChallenge !== null && !Object.hasOwn(CHALLENGES, s.lastChallenge)) return null;
      if (s.challenge !== null) {
        const c = s.challenge;
        const limit = {drive: DRIVE_STEPS, appraise: 3, memory: 8, bridge: 16, fishing: 3}[c?.kind];
        if (!c || !Object.hasOwn(CHALLENGES, c.kind) || !['town', 'travel'].includes(c.origin) || !['offered', 'active', 'done', 'skipped'].includes(c.status) || !int(c.seed, 0, 4294967295) || !int(c.step, 0, limit) || !int(c.lane, 0, 2) || !int(c.coins, 0, c.step) || !int(c.hits, 0, c.step) || c.coins + c.hits > c.step || !Array.isArray(c.answers)) return null;
        if (c.kind !== 'drive' && (c.coins !== 0 || c.hits !== 0)) return null;
        if (['drive', 'bridge'].includes(c.kind) && c.answers.length !== 0) return null;
        if (c.kind === 'appraise' && (c.answers.length !== c.step || c.answers.some(a => !int(a, 0, 2)))) return null;
        if (c.kind === 'memory') {
          if (c.answers.length !== c.step * 2 || c.answers.some(a => !int(a, 0, 7)) || (c.open !== null && !int(c.open, 0, 7)) || typeof c.review !== 'boolean' || (c.review && (c.step === 0 || c.open !== null))) return null;
          const deck = memoryDeck(c), matched = new Set();
          for (let n = 0; n < c.answers.length; n += 2) { const a = c.answers[n], b = c.answers[n + 1]; if (a === b || matched.has(a) || matched.has(b)) return null; if (deck[a] === deck[b]) { matched.add(a); matched.add(b); } }
          if (matched.has(c.open)) return null;
        }
        if (c.kind === 'bridge' && (!Array.isArray(c.turns) || c.turns.length !== 9 || c.turns.some(n => !int(n, 0, 3)))) return null;
        if (c.kind === 'fishing' && (c.answers.length !== c.step || c.answers.some(a => !int(a, -1, 20)) || !int(c.meter, 0, 39) || !int(c.ticks, 0, 79))) return null;
        const finished = c.step === limit || (c.kind === 'memory' && memoryMatched(c).length === 8);
        if ((c.kind !== 'bridge' && (c.status === 'done') !== finished) || (c.kind === 'bridge' && c.step === limit && c.status !== 'done') || (c.status === 'offered' && c.step !== 0) || (c.status === 'active' && !challengeContext(s)) || (c.origin === 'travel' && c.status === 'offered' && s.phase !== 'event')) return null;
      }
      const validOrder = o => o && (!Object.hasOwn(o,'relicChecked') || typeof o.relicChecked==='boolean') && int(o.type, 0, ORDER_TYPES.length - 1) && (ORDER_TYPES[o.type].chapter || 1) <= s.chapter && int(o.id, 1, isFreeTravel(s) ? LONG_COUNT * 20 + ORDER_TYPES.length : 252) && int(o.quantity, 2, ORDER_TYPES[o.type].chapter ? 2 : 3) && int(o.due, 2, isFreeTravel(s) ? LONG_COUNT + 5 : DEADLINE) && o.bonus === ORDER_TYPES[o.type].bonus + (o.quantity - 2) * 8;
      if (!Array.isArray(s.board) || ![0, 3].includes(s.board.length) || s.board.some(o => !validOrder(o) || ORDER_TYPES[o.type].origin !== s.city) || new Set(s.board.map(o => o.id)).size !== s.board.length || (s.order !== null && !validOrder(s.order))) return null;
      if (!s.forecast || !['road', 'traveler'].includes(s.forecast.road) || !['bandit', 'night'].includes(s.forecast.trail) || !int(s.forecast.offer, 0, 3)) return null;
      if (!s.deal || !CITIES[s.city].stock.includes(s.deal.kind) || GOODS[s.deal.kind].category !== '装备' || typeof s.deal.used !== 'boolean') return null;
      const ids = new Set(); for (const i of s.items) { if (!i || !Object.hasOwn(GOODS, i.kind) || !int(i.id, 1, s.nextId - 1) || ids.has(i.id) || typeof i.rotated !== 'boolean' || !Number.isFinite(i.quality) || i.quality < .1 || i.quality > 1) return null; ids.add(i.id); if (!fits(s, i, i.x, i.y, i.id)) return null; }
      if (!s.stock || typeof s.stock !== 'object' || Array.isArray(s.stock) || Object.entries(s.stock).some(([k, v]) => !shopKinds(s).includes(k) || !int(v, 0, 4)) || shopKinds(s).some(k => !Object.hasOwn(s.stock, k))) return null;
      if (s.phase === 'event' && (!s.event || !Object.hasOwn(EVENTS, s.event.key) || !int(s.event.destination, 0, 2) || s.event.destination === s.city || !['road', 'trail'].includes(s.event.route))) return null;
      if (s.phase === 'event') {
        const e = s.event, expected = s.forecast[e.route];
        if(Object.hasOwn(e,'commissionFind')&&(!isCommissionTreasure(e.commissionFind)||TREASURES[e.commissionFind].city!==e.destination||!s.order?.relicChecked||ORDER_TYPES[s.order.type].city!==e.destination||s.day>s.order.due))return null;
        if (e.key === 'barter') { const o = e.offer, item = o && s.items.find(i => i.id === o.itemId); if (!item || item.kind !== o.kind || GOODS[item.kind].category !== '装备' || o.price !== Math.round(GOODS[item.kind].base * 1.7) || e.nextKey !== expected) return null; }
        else if (e.key !== expected || e.nextKey !== null || e.offer !== null) return null;
      }
      if (s.phase !== 'event' && s.event !== null) return null;
      if (!Array.isArray(s.log) || s.log.length > 30 || s.log.some(l => !l || !int(l.day, 1, isFreeTravel(s) ? LONG_COUNT : 13) || typeof l.text !== 'string' || l.text.length > 200)) return null;
      if (previousPricing) {
        const refund = Math.min(100000 - s.gold, (s.mods.wheels ? 27 : 0) + (s.mods.cold || s.mods.padding ? 20 : 0));
        if (refund) { s.gold += refund; log(s, `改装价格调整，补回旧版购买差价 ${refund} G。`); }
      }
      if (s.phase === 'ended') { const total = worth(s); s.final = { total, success: total >= goal(s), days: s.day, contracts: s.completedOrders }; } else s.final = null;
      return s;
    } catch { return null; }
  }
  return { EXPLORE_MAPS, mapUnlocked, COMMISSION_TREASURES, isCommissionTreasure, commissionChance, TREASURE_LIMIT, TREASURE_PRICES, treasureOffer, treasureCount, ownedTreasures, buyTreasure, sellTreasure, freshLayout, homePosition, homeItems, arrangeHome, TALENTS, talentPoints, learnTalent, decorCost, POTTERY_FORMS, POTTERY_GLAZES, POTTERY_PATTERNS, potteryFit, potteryStatus, firePottery, displayPottery, SAIL_CHARTS, SAIL_DIRECTIONS, sailingStep, sailingRoute, sailingStatus, startSailing, sail, undoSailing, resetSailing, sailingComplete, finishSailing, displaySailing, TEA_INGREDIENTS, TEA_RECIPES, teaBlend, teaStatus, brewTea, displayTea, FLOWERS, GUIDE, hideGuide, seedUnlocked, gardenBeds, plantFlower, flowerGrowth, harvestFlower, chooseBouquet, exhibitionTheme, arrangeExhibition, isFreeTravel, canDepart, startFreeTravel, VISITORS, trackClue, visitorStatus, visitFriend, BOOK_LEVELS, TREASURES, DECOR, KEEPSAKES, keepsakeProgress, claimKeepsake, catLevel, canPetCat, petCat, collectionLevel, canExplore, explore, buyDecor, placeDecor, favoriteTreasure, CHALLENGES, TRAVEL_CHANCE, travelChallengePending, memoryDeck, memoryMatched, memoryPick, memoryContinue, bridgeMask, bridgePath, bridgeSolved, rotateBridge, submitBridge, fishingTarget, fishingPosition, setFishingDepth, castFishing, tickFishing, cityDemand, CHAPTERS, shopKinds, fairCity, combo, MODS, DRIVE_STEPS, APPRAISAL_FEATURES, goal, rank, orderBonus, roadFee, protectedCargo, installMod, continueJourney, startChallenge, driveWave, steer, advanceDrive, appraisalRound, appraise, skipChallenge, challengeResult, VERSION, COLS, DEADLINE, GOAL, MAX_ROWS, GOODS, CITIES, ORDER_TYPES, EVENTS, fresh, dimensions, fits, findSpace, adjacent, near, has, purchasePrice, buyPrice, salePrice, worth, buy, move, sell, upgradeCost, upgrade, acceptOrder, orderStatus, orderItems, deliverOrder, abandonOrder, barterOffer, riskText, eventInfo, travelCost, depart, available, resolve, finish, restore };
});
