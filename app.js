/* Original UI implementation for this project. SPDX-License-Identifier: MIT */
(() => {
  'use strict';
  const G = window.Caravan, { icon } = window.Art;
  const scene = (kind, options) => window.Art.scene(kind, { ...options, mods: state.mods });
  const saves = window.CaravanStorage.create({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},G);
  const audio = window.CaravanSound;
  const sound = name => { audio?.play(name); };
  const app = document.querySelector('#app'), dialog = document.querySelector('#dialog');
  const initialSave = saves.load();
  const diagnostics=window.CaravanDiagnostics.create({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
  let diagnosticPreview=null,diagnosticSequence=0;
  if(initialSave.blocked)diagnostics.record('save-protected');
  window.addEventListener?.('error',()=>diagnostics.record('script-error'));
  window.addEventListener?.('unhandledrejection',()=>diagnostics.record('promise-error'));
  let saveWarning = initialSave.blocked, saveMessage = initialSave.error, pendingImport = null, importSequence = 0, dialogGeneration = 0;
  let state = initialSave.state, selected = null, destination = (state.city + 1) % 3, route = 'road', filter = '全部';
  let savedSnapshot = JSON.stringify(state);
  let moving = false, toastTimer, lastFocus = null, mobilePane = 'map', effectsEnabled = true;
  // Navigation belongs to this view session, never to the player's saved progress.
  const paneHistory = [];
  const paneNames = {map:'地图',town:'城镇',inventory:'行囊',market:'集市',route:'出发准备',orders:'委托',home:'营地',progress:'旅程',settings:'设置'};
  function openPane(pane) {
    if (!Object.hasOwn(paneNames,pane) || pane===mobilePane) return;
    if (pane==='map') paneHistory.length=0;
    else paneHistory.push(mobilePane);
    mobilePane=pane;selected=null;moving=false;
  }
  function resetPanes(pane='map') { paneHistory.length=0;mobilePane='map';selected=null;moving=false;openPane(pane); }
  function backPane() { mobilePane=paneHistory.pop()||'map';selected=null;moving=false; }
  function focusPane() {
    const selector=['map','town'].includes(mobilePane)?'.map-dock button':'.page-heading button';
    document.querySelector(selector)?.focus({preventScroll:true});
  }
  const deskScroll = {inventory: 0, market: 0, route: 0, orders: 0, home: 0};
  let atTitle = false;
  let bookTab = 'treasures', exhibitionDraft = [];
  let teaRecipe = 'morning', teaPicks = [], teaHint = false;
  let sailingChart = 'skiff', sailingHint = false;
  let potteryForm='bowl',potteryStage='shape',potteryDraft={profile:[35,35,35,35],glaze:'clay',pattern:'plain'},potteryReviewOld=null,potteryDrag=null;
  let sceneTimer = null, sceneDone = null;
  let driveTimer = null, drivePaused = true, driveMessage = '';
  let fishTimer = null, fishPaused = true;
  const DRIVE_INTERVAL = 1600;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  try { effectsEnabled = localStorage.getItem('caravan-effects') !== 'off'; } catch {}
  function syncMotion() { document.body.classList.toggle('motion-off', !effectsEnabled || reducedMotion.matches); }
  syncMotion(); reducedMotion.addEventListener('change', syncMotion);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const coins = n => `<span class="coins">${icon('coin')} ${n}</span>`;
  const homeUI=window.CaravanHome?.create({state:()=>state,render:()=>render(),saveLayout:value=>act(()=>G.arrangeHome(state,value),'营地布置已保存。'),pet:()=>{if(G.canPetCat(state))act(()=>G.petCat(state),'和麦芽分享了新的见闻。');},sound,animate:()=>effectsEnabled&&!reducedMotion.matches&&!document.hidden});
  reducedMotion.addEventListener('change',()=>homeUI?.bind(mobilePane==='home'&&!atTitle&&!dialog.open));
  const selectedItem = () => state.items.find(i => i.id === selected);
  function save() {
    try { saves.commit(state);savedSnapshot=JSON.stringify(state);if(saveWarning)diagnostics.record('save-recovered');saveWarning=false;saveMessage='';return true; }
    catch(e) { diagnostics.record('save-failed');state=JSON.parse(savedSnapshot);saveWarning=true;saveMessage=e.message||'存储空间不足或权限受限';drivePaused=true;fishPaused=true;clearTimeout(driveTimer);clearTimeout(fishTimer);toast('本次操作未保存：'+saveMessage);return false; }
  }
  function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3600); }
  function downloadSave() {
    if(!hasReadableProgress()){toast('尚未读取到可用进度，请先导入已有备份。');return;}
    try { const blob=new Blob([saves.pack(state)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`行囊与远方-${G.isFreeTravel(state) ? "自由旅行" : `第${state.chapter}程`}-第${state.day}天.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(window.CaravanDesktop ? '请选择存档文件的保存位置。' : '备份已交给浏览器下载，请保管好这个文件。'); }
    catch(e){toast(e.message);}
  }
  function hasReadableProgress(){const status=saves.status();return !(status.blocked&&!status.source);}
  function saveSummary(s) { if(s===state&&!hasReadableProgress())return '尚未读取到可用进度。请导入已有备份；原始数据仍被保留。';return `${G.isFreeTravel(s) ? "自由旅行" : `第 ${s.chapter} 程`} · 第 ${s.day} 天 · ${G.CITIES[s.city].name} · ${s.gold} G<br>珍藏 ${s.collection.treasures.length}/12 · 装饰 ${s.collection.owned.length}/10 · 小猫陪伴 ${s.collection.catBond} 次`; }
  async function showDiagnostics(){
    const request=++diagnosticSequence;diagnosticPreview=null;
    drivePaused=true;fishPaused=true;pendingImport=null;importSequence++;
    openDialog('<h2 id="dialog-title">问题反馈</h2><p>正在整理本机信息…</p><button class="secondary full" data-action="save-back">返回游戏</button>');dialog.dataset.panel='diagnostics';
    let info={version:'0.26.0',buildId:'browser'};
    try{if(window.CaravanDesktop?.info)info=await window.CaravanDesktop.info();}catch{info.buildId=null;}
    if(request!==diagnosticSequence||!dialog.open||dialog.dataset.panel!=='diagnostics')return;
    const status=saves.status(),source=status.source===status.key?'current':status.source?.endsWith('-backup')||status.source?.endsWith('-previous')?'backup':status.source?'legacy':'none';
    diagnosticPreview=JSON.stringify(window.CaravanDiagnostics.report({info,state,storage:{warning:saveWarning,blocked:status.blocked,source},history:diagnostics.history(),view:{width:window.innerWidth,height:window.innerHeight,pixelRatio:window.devicePixelRatio},audio:audio?.settings()||{},effects:effectsEnabled,reduced:reducedMotion.matches}),null,2);
    openDialog(`<section class="diagnostic-panel"><span class="eyebrow">帮这趟旅程找到问题</span><h2 id="dialog-title">问题反馈</h2><p class="dialog-copy">导出下面的信息后，请连同「当时做了什么、希望发生什么、实际发生什么」一起交给邀请你试玩的人。</p>${saveWarning?`<p class="save-alert" role="alert">${hasReadableProgress()?'当前保存遇到问题。请保留游戏窗口，并到存档管理导出当前进度；反馈文件不能恢复存档。':'当前还没有可读取的进度。请到存档管理导入已有备份；反馈文件不能恢复存档。'}</p>`:''}<p class="dialog-fineprint">包含版本、窗口设置、进度概况及最近 16 条固定错误记录；不包含个人路径、完整存档、原始报错或截图。只在本机生成，不会自动发送。${diagnostics.history().persistent?'':'本机无法完整保存诊断历史，重开后可能缺少记录。'}</p><details><summary>查看将要导出的全部内容</summary><pre class="diagnostic-preview" tabindex="0" aria-label="反馈文件完整内容">${esc(diagnosticPreview)}</pre></details><button class="primary full" data-action="diagnostic-export">导出反馈文件</button><div class="dialog-buttons"><button class="secondary" data-action="save-manager">存档与备份</button><button class="secondary" data-action="save-back">返回游戏</button></div></section>`);dialog.dataset.panel='diagnostics';
  }
  function exportDiagnostics(){
    if(!diagnosticPreview||!dialog.open||dialog.dataset.panel!=='diagnostics')return;
    try{const url=URL.createObjectURL(new Blob([diagnosticPreview],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`caravan-diagnostic-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('请选择反馈文件的保存位置；保存后由你决定是否提供。');}catch{toast('暂时无法导出，请展开预览并手动复制内容。');}
  }
  async function showAbout() {
    drivePaused=true;fishPaused=true;clearTimeout(driveTimer);clearTimeout(fishTimer);
    openDialog('<h2 id="dialog-title">关于行囊与远方</h2><p class="dialog-copy">正在读取版本信息…</p><button class="secondary full" data-action="close">返回游戏</button>');dialog.dataset.panel='about';
    let info={version:'0.26.0',buildId:'browser'};
    try{if(window.CaravanDesktop?.info)info=await window.CaravanDesktop.info();}catch{info.buildId='版本信息暂不可用';}
    if(!dialog.open||dialog.dataset.panel!=='about')return;
    openDialog(`<div class="desktop-title-art">${icon('cart')}<span>A LITTLE CARAVAN</span></div><h2 id="dialog-title">关于行囊与远方</h2><p class="dialog-copy">带着行囊，去看看远方。<br>旅行、交易、收集，还有一个会慢慢改变的家。</p><dl class="about-details"><dt>游戏版本</dt><dd>${esc(info.version)}</dd><dt>构建编号</dt><dd>${esc(info.buildId)}</dd>${info.platform?`<dt>运行平台</dt><dd>${esc(info.platform)} · ${esc(info.arch)}</dd>`:''}<dt>保存格式</dt><dd>v${G.VERSION}</dd></dl><p class="dialog-fineprint">反馈问题时可以附上版本与构建编号。此处不包含账户或个人路径。</p><button class="secondary full" data-action="diagnostics">问题反馈</button><details class="about-credits"><summary>制作与许可</summary><p>本游戏包含 AI 辅助制作的美术与文字；运行时不调用 AI 服务。项目代码采用 MIT 许可。桌面运行环境的各组件适用各自许可证。</p>${info.electron?`<p>Electron ${esc(info.electron)} · Chromium ${esc(info.chrome)} · Node.js ${esc(info.node)}</p>`:''}</details>${window.CaravanDesktop?.notices?'<button class="secondary full" data-action="desktop-notices">查看完整第三方软件声明</button>':''}<button class="primary full" data-action="${window.CaravanDesktop?'desktop-menu':'close'}">${window.CaravanDesktop?'返回游戏菜单':'返回游戏'}</button>`);dialog.dataset.panel='about';
  }
  function showSaves() {
    drivePaused=true;fishPaused=true;pendingImport=null;importSequence++;
    let backup=null;try{backup=saves.backupState();}catch{}
    openDialog(`<span class="eyebrow">把每一段远方，好好收起来</span><h2 id="dialog-title">读取存档与备份</h2><p class="collection-reward">${saveSummary(state)}</p>${saveWarning?`<p class="save-alert" role="alert">${esc(saveMessage)}<br>原始存档未被清空；请选择可用备份或导入文件。</p>`:'<p class="dialog-copy">进度自动保存，并保留最近两次有效备份。更新前可以额外导出一份到电脑。</p>'}<button class="secondary full" data-action="diagnostics">遇到问题？整理反馈信息</button><div class="save-controls"><button class="secondary full" data-action="desktop-resume" ${hasReadableProgress()?'':'disabled'}>读取当前自动存档</button><button class="secondary full" data-action="save-before-new">查看新旅途前保留的进度</button><button class="primary full" data-action="save-export" ${hasReadableProgress()?'':'disabled'}>${hasReadableProgress()?'导出当前进度':'尚无可导出的有效进度'}</button><label class="save-file">导入备份文件<input type="file" id="save-import-file" accept=".json,application/json" aria-label="选择要导入的存档文件"></label><button class="secondary full" data-action="save-backup" ${backup?'':'disabled'}>查看自动备份并恢复</button>${initialSave.blocked&&initialSave.source&&saves.status().blocked?'<button class="secondary full" data-action="save-recover">恢复当前找到的进度</button>':''}<button class="secondary full" data-action="save-retry">重试保存当前进度</button></div><p class="dialog-fineprint">导入会先显示内容，再由你确认替换；不会直接删除旧进度。不同浏览器和桌面版需要通过文件转移。</p><button class="text-button full" data-action="save-back">返回游戏</button>`);
  }
  function previewImport(next,label) {
    pendingImport=next;
    openDialog(`<span class="eyebrow">${label}</span><h2 id="dialog-title">恢复这份旅程？</h2><p class="dialog-copy">将恢复以下进度，替换本页当前旅程。已有有效进度会保留为自动备份；无法读取的原始数据会另存保护副本。</p><p class="collection-reward">${saveSummary(next)}</p><p class="dialog-fineprint">如果两份存档进度不同，建议先取消并导出当前进度；导入不会合并两份收藏。</p><div class="dialog-buttons"><button class="secondary" data-action="save-manager">取消</button><button class="primary" data-action="save-confirm">确认恢复这份进度</button></div>`);
  }
  function showDesktopMenu() {
    if(homeUI?.editing()){homeUI.discard();render();}
    atTitle=true;drivePaused=true;fishPaused=true;clearTimeout(driveTimer);clearTimeout(fishTimer);
    openDialog(`<section class="title-screen city-${state.city}"><div class="title-landscape" aria-hidden="true"></div><div class="title-copy"><span class="eyebrow">A LITTLE CARAVAN</span><h2 id="dialog-title">行囊与远方</h2><p>装进行囊的，是货物。<br>留在心里的，是远方。</p><span class="title-version">离线单人 · 0.26.0</span></div><div class="title-menu"><span class="eyebrow">下一段故事，等你出发</span><div class="title-save">${saveSummary(state)}</div><button class="primary" data-action="desktop-resume" ${hasReadableProgress()?'':'disabled'}>${icon('cart')}继续旅途 <span>→</span></button><button class="secondary" data-action="restart">${icon('sunSeed')}新的旅途</button><button class="secondary" data-action="save-manager">${icon('book')}读取存档</button><button class="secondary" data-action="talents">${icon('leaf')}天赋树 <small>${G.talentPoints(state)} 点可用</small></button><div class="title-small"><button data-action="title-settings">设置</button><button data-action="help">玩法说明</button><button data-action="about">关于与制作</button>${window.CaravanDesktop?'<button data-action="desktop-quit">退出游戏</button>':''}</div><p>收藏与天赋，会陪你走进每一段新旅途。</p></div></section>`,true);dialog.dataset.panel='title';
  }
  function showTitleSettings(){openDialog(`<h2 id="dialog-title">游戏设置</h2><div class="title-settings"><button class="secondary" data-action="audio-settings">音效与音量</button><button class="secondary" data-action="title-effects">动态效果：${effectsEnabled?'开启':'关闭'}</button>${window.CaravanDesktop?'<button class="secondary" data-action="desktop-fullscreen">窗口 / 全屏 · F11</button>':''}<button class="secondary" data-action="diagnostics">问题反馈</button></div><button class="primary full" data-action="desktop-menu">返回开始界面</button>`);}
  function showTalents(){
    const points=G.talentPoints(state),ready=state.phase==='market'&&state.challenge?.status!=='active'&&!saveWarning;
    openDialog(`<section class="talent-tree"><header><span class="eyebrow">把走过的路，变成自己的本领</span><h2 id="dialog-title">行旅天赋树</h2><strong>${points} <small>点可用</small></strong></header><p>初始 1 点；收藏每升一级 +1 点，每集齐 3 件珍藏再 +1 点。天赋永久保留，先选最喜欢的方向。</p><div class="talent-branches">${['寻宝','商旅','营地'].map(branch=>`<section class="talent-branch"><h3>${branch}</h3>${Object.entries(G.TALENTS).filter(([,t])=>t.branch===branch).map(([key,t])=>{const learned=state.collection.talents.includes(key),parent=!t.parent||state.collection.talents.includes(t.parent);return `<article class="talent-node ${learned?'learned':''}">${icon(t.icon)}<h4>${t.name}</h4><p>${t.text}</p><button class="${learned?'secondary':'primary'}" data-action="talent-learn" data-value="${key}" ${ready&&!learned&&parent&&points>=t.cost?'':'disabled'}>${learned?'已解锁 ✓':!parent?'先学 '+G.TALENTS[t.parent].name:points<t.cost?'还需 '+(t.cost-points)+' 点':t.cost+' 点 · 解锁'}</button></article>`;}).join('')}</section>`).join('')}</div>${!ready?'<p class="warning">请先处理存档问题，或继续旅途完成当前事件；在城镇停靠时可以学习天赋。</p>':''}<p class="talent-note">天赋影响之后发生的交易与收集；已获得的奖励不会重复补发。当前不提供重置点数。</p><button class="secondary full" data-action="close">${atTitle?'返回开始界面':'返回旅程'}</button></section>`);dialog.dataset.panel='talents';
  }
  function resumeView() { if(atTitle){showDesktopMenu();return;}if(state.challenge?.status==='active')showChallenge();else if(state.phase==='event')showEvent();else if(state.phase==='ended')showFinal();else closeDialog(); }
  document.addEventListener('change',async e=>{
    if(e.target.id!=='save-import-file')return;
    const file=e.target.files?.[0],sequence=++importSequence,generation=dialogGeneration;if(!file)return;
    // Reading may finish after the player has closed or replaced this dialog.
    try { if(file.size>window.CaravanStorage.LIMIT)throw new Error('存档文件过大，请选择小于 500 KB 的备份。');const text=await file.text();if(sequence!==importSequence||generation!==dialogGeneration||!dialog.open)return;previewImport(saves.parse(text),'导入文件预览'); }
    catch(error){diagnostics.record('import-rejected');toast(error.message||'无法读取文件，当前进度未改变。');}
  });
  function linkedIds() { return state.items.filter(i => G.combo(state, i) || G.protectedCargo(state, i)).map(i => i.id); }
  // Effects only observe successful rule changes; no animation can delay or repeat a transaction.
  function feedback(before) {
    if (G.collectionLevel(state)>before.collectionLevel) { sound('upgrade'); if(effectsEnabled&&!reducedMotion.matches) document.querySelector('.collection-strip')?.classList.add('collection-level-up'); }
    if (state.chapter !== before.chapter || Object.values(state.mods).filter(Boolean).length > before.mods) sound('upgrade');
    else if (state.completedOrders > before.completed) sound('success');
    else if (state.phase === 'event' && before.phase === 'market') sound('hoof');
    else if (state.gold > before.gold) sound('coin');
    else if (state.items.some(i => !before.items.includes(i.id))) sound('buy');
    if (!effectsEnabled || reducedMotion.matches) return;
    const delta = state.gold - before.gold;
    if (delta) {
      const label = document.createElement('span'); label.className = `money-float ${delta > 0 ? 'gain' : 'spend'}`;
      label.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta)} G`; label.setAttribute('aria-hidden', 'true');
      document.querySelector('.wallet')?.append(label); setTimeout(() => label.remove(), 1200);
      if (delta > 0) { const reward = document.createElement('span'); reward.className = 'world-sale'; reward.setAttribute('aria-hidden', 'true'); reward.innerHTML = `${icon('coin')} +${delta}`; document.querySelector('.town-stage')?.append(reward); setTimeout(() => reward.remove(), 1300); }
    }
    const added = state.items.find(i => !before.items.includes(i.id));
    if (added) {
      document.querySelector(`[data-item="${added.id}"]`)?.classList.add('item-arrived');
      const stage = document.querySelector('.town-stage');
      if (stage) { const parcel = document.createElement('span'); parcel.className = 'loading-parcel'; parcel.setAttribute('aria-hidden', 'true'); parcel.innerHTML = icon(added.kind); stage.append(parcel); stage.classList.add('is-loading'); setTimeout(() => { parcel.remove(); stage.classList.remove('is-loading'); }, 1200); }
    }
    for (const id of linkedIds()) if (!before.linked.includes(id)) document.querySelector(`[data-item="${id}"]`)?.classList.add('combo-awake');
    if (state.city !== before.city) document.querySelector('.journey-banner')?.classList.add('arrival-glow');
    if (state.completedOrders > before.completed) {
      const section = document.querySelector('.orders-section');
      section?.classList.add('delivery-success');
      // A small, bounded particle burst is removed after use, including on rapid repeated input.
      const burst = document.createElement('div'); burst.className = 'celebration'; burst.setAttribute('aria-hidden', 'true');
      for (let n = 0; n < 14; n++) { const p = document.createElement('i'); p.style.setProperty('--n', n); burst.append(p); }
      section?.append(burst); setTimeout(() => burst.remove(), 1400);
    }
  }
  function act(fn, message) { try { const before = { collectionLevel: G.collectionLevel(state), gold: state.gold, items: state.items.map(i => i.id), linked: linkedIds(), completed: state.completedOrders, city: state.city, phase: state.phase, chapter: state.chapter, mods: Object.values(state.mods).filter(Boolean).length }; const result = fn(); if(!save()){render();return false;} render(); feedback(before); if (message) toast(typeof message === 'function' ? message(result) : message); return true; } catch (e) { sound('wrong'); toast(e.message); return false; } }
  function openDialog(html, locked = false, wide = false) { dialogGeneration++;homeUI?.stop(); clearTimeout(sceneTimer); clearTimeout(driveTimer); clearTimeout(fishTimer); sceneDone = null; lastFocus = document.activeElement; dialog.classList.toggle('scene-dialog', wide); dialog.innerHTML = html; dialog.dataset.locked = String(locked);dialog.dataset.panel=''; if (!dialog.open) dialog.showModal(); }
  function closeDialog() { dialogGeneration++;if(atTitle){showDesktopMenu();return;}clearTimeout(driveTimer); clearTimeout(fishTimer); dialog.close();homeUI?.bind(mobilePane==='home'&&!atTitle); if (lastFocus?.isConnected) lastFocus.focus(); }
  function finishScene() { const done = sceneDone; sceneDone = null; clearTimeout(sceneTimer); if (done) done(); }
  // Rules and saves are committed BEFORE an interlude. Skipping only advances presentation.
  function playScene(kind, options, title, caption, done, duration = 1700) {
    if (!effectsEnabled || reducedMotion.matches) { done(); return; }
    const visual=kind==='travel'?`<div class="atlas-shot-plane">${window.Art.atlas(options.city,options.destination,options.route,true)}</div><span class="shot-destination">${G.CITIES[options.city].name} → ${G.CITIES[options.destination].name}</span>`:kind==='arrival'?`<div class="arrival-paint city-${options.city}"></div><div class="arrival-cart-layer">${scene(kind,{...options,items:state.items})}</div>`:scene(kind,{...options,items:state.items});
    openDialog(`<div class="scene-screen ${kind==='travel'?'atlas-travel-shot':kind==='arrival'?'painted-arrival-shot':''}" style="--shot-duration:${duration}ms">${visual}<div class="scene-letterbox"></div></div><div class="scene-interlude-copy"><span class="eyebrow">第 ${state.day} 天 · 商旅途中</span><h2 id="dialog-title">${esc(title)}</h2><p>${esc(caption)}</p><div class="scene-progress" style="--duration:${duration}ms"><i></i></div><button class="secondary" data-action="skip-scene">跳过演出 →</button></div>`, true, true);
    sceneDone = done; sceneTimer = setTimeout(finishScene, duration);
  }
  function showArrival() {
    playScene('arrival', { city: state.city }, `抵达${G.CITIES[state.city].name}`, state.order && G.ORDER_TYPES[state.order.type].city === state.city ? '马车已停稳，检查货物后就可以交付订单。' : '城门已开，去集市看看下一笔生意。', () => { closeDialog(); toast(`已抵达${G.CITIES[state.city].name}，货物与进度已保存。`); }, 1400);
  }
  function showDelivery(receipt, title, cargo) {
    openDialog(`<div class="scene-screen">${scene('delivery', { city: state.city, items: state.items, unloaded: cargo })}<span class="delivery-seal">已交付</span></div><div class="scene-interlude-copy"><span class="eyebrow">商会收货凭证</span><h2 id="dialog-title">${esc(title)}，交货完成</h2><p>货物已卸下，买家确认收货。</p><div class="delivery-receipt"><span>货款 <b>${receipt.sale} G</b></span><span>赏金 <b>+${receipt.bonus} G</b></span><strong>入袋 ${receipt.sale + receipt.bonus} G</strong></div><button class="primary" data-action="close">收好钱袋，继续逛集市 →</button></div>`, false, true);
  }
  dialog.addEventListener('cancel', e => { if(atTitle){e.preventDefault();showDesktopMenu();return;}importSequence++; pendingImport=null; if (state.challenge?.status === 'active') { e.preventDefault(); if (state.challenge.kind === 'drive') { drivePaused = true; showDrive(); } else if (state.challenge.kind === 'fishing') { fishPaused = true; showFishing(); } } else if (sceneDone) { e.preventDefault(); finishScene(); } else if (dialog.dataset.locked === 'true') e.preventDefault(); else {e.preventDefault();if((dialog.dataset.panel==='treasure-view'&&treasureReturn==='shop')||dialog.dataset.panel==='treasure-sale')showTreasureShop(true);else if(dialog.dataset.panel==='explore-map')showExploreMaps();else closeDialog();} });
  function render() {
    // Clear drafts before creating HTML, so a discarded edit never leaves dead controls.
    if(mobilePane!=='home'||atTitle)homeUI?.discard();
    const previousDesk = document.querySelector('.workspace');
    if (previousDesk?.dataset.pane) deskScroll[previousDesk.dataset.pane] = previousDesk.scrollTop;
    const shopScroll = document.querySelector('.shop-list')?.scrollTop || 0;
    const city = G.CITIES[state.city], space = state.items.reduce((n, i) => { const [w, h] = G.dimensions(i); return n + w * h; }, 0);
    const free = G.isFreeTravel(state), wealth = G.worth(state), days = Math.max(0, G.DEADLINE - state.day);
    app.innerHTML = `
      <header class="topbar"><a class="brand" href="#" data-action="map-back" aria-label="行囊与远方首页">${icon('cart')}<span><strong>行囊与远方</strong><small>A LITTLE CARAVAN</small></span></a>
        <div class="top-stats"><div class="stat wallet">${icon('coin')}<span><small>随身金币</small><b data-testid="gold">${state.gold}<em> G</em></b></span></div><div class="stat"><span class="sun-symbol">☼</span><span><small>${free ? "自由旅行" : "旅程日历"}</small><b>第 ${state.day} <em>${free ? "天" : `/ ${G.DEADLINE} 天`}</em></b></span></div><div class="stat goal-stat">${icon('bag')}<span><small>${free ? "旅途珍藏" : `第 ${state.chapter} 程目标`}</small><b>${free ? state.collection.treasures.length : wealth} <em>${free ? "/ 12 件" : `/ ${G.goal(state)} G`}</em></b></span><div class="mini-progress"><i style="width:${free ? state.collection.treasures.length / 12 * 100 : Math.min(100, wealth / G.goal(state) * 100)}%"></i></div></div></div>
        <button class="icon-button" data-action="help" aria-label="打开玩法说明" title="玩法说明">?</button><button class="text-button start-menu-button" data-action="desktop-menu">开始菜单</button>
      </header>
      <main data-pane="${mobilePane}" class="map-shell">
        <div class="game-layout"><div class="world-column">${mobilePane==='town'?townHTML():atlasWorldHTML()}${mapDockHTML()}</div><div class="desk-column"><header class="page-heading"><button class="secondary" data-action="pane-back">← 返回${paneNames[paneHistory.at(-1)||'map']}</button><h1>${({inventory:"我的行囊",market:"城镇集市",route:"准备出发",orders:"委托板",home:"我的营地",progress:"商队旅程",settings:"游戏设置"})[mobilePane]||"旅途"}</h1><span>${G.CITIES[state.city].name}</span></header>
        <nav class="workspace-tabs" aria-label="操作区域">${[['inventory', 'bag', '行囊'], ['market', 'coin', '集市'], ['route', 'road', '出发'], ['orders', 'porcelain', '委托'], ['home', 'leaf', '营地']].map(([pane, symbol, name]) => `<button data-action="pane" data-value="${pane}" aria-pressed="${mobilePane === pane}">${icon(symbol)}${name}</button>`).join('')}</nav>
        <div class="workspace" data-pane="${mobilePane}" aria-label="商旅操作台">
          <aside class="left-column">
            <section class="panel route-panel"><div class="panel-heading"><h2>下一站，去哪里</h2><span class="section-number">01</span></div>${routeMapHTML()}<p class="muted small">${free ? '行旅证已生效 · 没有考核期限，目的地由你决定' : `${days ? `距商会考核还有 ${days} 天` : '考核日已到，出售货物后结算'} · 本局目标 ${G.goal(state)} G`}</p>
              <div class="destinations visual-destinations">${G.CITIES.map((c, n) => n === state.city ? '' : `<button class="destination city-${n} ${destination === n ? 'active' : ''}" data-action="destination" data-value="${n}" aria-pressed="${destination===n}"><span class="destination-portrait" aria-hidden="true"></span><span><b>${c.name}</b><small>收购 ${G.cityDemand(state, n)}</small></span><span class="arrow">${destination===n?'✓':'↗'}</span></button>`).join('')}</div>
              <div class="route-label">选择路线 <span>${free ? "商会承担路费与补给" : "每段消耗 1 包口粮"}</span></div>
              <button class="route-choice ${route === 'road' ? 'active' : ''}" data-action="route" data-value="road">${icon('road')}<span><b>河畔官道</b><small>2 天 · ${G.roadFee(state)} G 路费</small></span><span class="route-tag">安稳</span></button>
              <button class="route-choice ${route === 'trail' ? 'active' : ''}" data-action="route" data-value="trail">${icon('mountain')}<span><b>青脊山径</b><small>1 天 · 无路费</small></span><span class="route-tag risky">有风险</span></button>
              <div class="travel-note">${free ? '凭行旅证免费通行，不消耗行囊中的口粮。' : !G.has(state, 'ration') ? '<span class="warning">没有口粮，需另付 8 G 补给。</span>' : '已备好口粮。'}<br>路线预告：<b>${G.EVENTS[state.forecast[route]].title}</b>${G.riskText(state, destination, route).map(t => `<p class="warning">⚑ ${t}</p>`).join('')}${G.barterOffer(state) ? `<p>途中收购：${G.GOODS[G.barterOffer(state).kind].name} <b>${G.barterOffer(state).price} G</b><br>出售后，后半程失去装备作用。</p>` : ''}</div>
              <button class="primary depart" data-action="depart" ${G.canDepart(state, route) ? '' : 'disabled'}>${icon('cart')}整装出发 <span>→</span></button>
              <button class="settle-button" data-action="${free ? 'journal' : 'finish'}">${free ? '翻阅旅途手记 ↗' : `${days === 0 ? '考核时间到 · ' : ''}结算本次旅程 ↗`}</button>
            </section>
            <details class="panel contract-panel"><summary>商旅手册 <span>已交付 ${state.completedOrders} 单</span></summary><div class="contract"><p>先选订单，再决定装什么。货物按整单交付，普通出售不会完成订单。</p><p>超时只失去赏金，不没收货物。可以随时放弃；同一停靠不能反复换单。</p><small>已完成 ${state.completedOrders} 单 · 未完成 ${state.failedOrders} 单</small></div></details>
          </aside>
          <section class="panel inventory-panel"><div class="panel-heading"><div><h2>我的行囊 <span class="soft-label">${space} / ${state.rows * G.COLS} 格</span></h2><p class="muted small">${state.order ? G.orderStatus(state).text : '只有 18 格起步，每一件都要值得。'}</p></div><button class="text-button upgrade" data-action="upgrade" ${state.rows >= G.MAX_ROWS ? 'disabled' : ''}>＋ 扩容 ${state.rows >= G.MAX_ROWS ? '已满' : `${G.upgradeCost(state)} G`}</button></div>
            <div class="bag-frame"><span class="bag-stitch left"></span><span class="bag-stitch right"></span><div class="bag-buckle"></div><div class="inventory-grid ${moving ? 'moving' : ''}" role="group" aria-label="背包，六列，可拖动物品或选中后移动" style="--rows:${state.rows}">
              ${Array.from({ length: state.rows * G.COLS }, (_, n) => `<button class="cell" data-cell="${n}" data-x="${n % G.COLS}" data-y="${Math.floor(n / G.COLS)}" aria-label="背包第${Math.floor(n / G.COLS) + 1}行第${n % G.COLS + 1}列" style="grid-column:${n % G.COLS + 1};grid-row:${Math.floor(n / G.COLS) + 1}"><span>＋</span></button>`).join('')}
              ${state.items.map(itemHTML).join('')}
            </div><div class="bag-caption">${moving ? '选择空格作为物品左上角 · Esc 取消' : '拖动整理 · 点击查看 · R 旋转'}</div></div>
            <div class="synergy-strip">${icon('leaf')}<span>${synergyText()}</span></div>
            <div class="item-inspector" aria-live="polite">${inspectorHTML()}</div>
            <div class="inventory-footer"><span>${icon('coin')}货物估值 <b>${wealth - state.gold} G</b></span><span>按当前城镇售价计算</span></div>
          </section>
          <aside class="right-column"><section class="panel market-panel"><div class="panel-heading"><div><h2>${city.name}集市</h2><p class="muted small">买下好货，带去需要它的地方。</p></div><span class="market-symbol">✧</span></div>
            <div class="filter-tabs" role="group" aria-label="商品分类">${['全部', '货物', '装备', '补给'].map(f => `<button data-action="filter" data-value="${f}" class="${filter === f ? 'active' : ''}" aria-pressed="${filter === f}">${f}</button>`).join('')}</div>
            <div class="shop-list">${G.shopKinds(state).filter(k => filter === '全部' || G.GOODS[k].category === filter).map(shopHTML).join('')}</div>
            <div class="market-footnote">本次特惠：${G.GOODS[state.deal.kind].name} ${state.deal.used ? '已购' : '首件 7.5 折'} · 抵达后换新</div>
          </section></aside>
          <section class="orders-pane">${ordersHTML()}</section><section class="home-pane">${homeHTML()}</section><section class="progress-pane"><button class="primary full" data-action="talents">行旅天赋树 · ${G.talentPoints(state)} 点可用</button>${guideHTML()}${growthHTML()}${chapterHTML()}${collectionStrip()}</section><section class="settings-pane" aria-label="游戏设置">${window.CaravanDesktop ? '<button class="secondary desktop-menu-button" data-action="desktop-menu">游戏菜单</button>' : ''}<span><i class="save-dot ${saveWarning ? 'unsaved' : ''}"></i>${saveWarning ? '保存遇到问题 · 请打开存档管理' : '进度已自动保存 · 保留最近备份'}</span><button class="text-button motion-toggle" data-action="effects" aria-pressed="${effectsEnabled}">动态效果：${effectsEnabled ? reducedMotion.matches ? '跟随系统减少' : '开启' : '关闭'}</button><button class="text-button" data-action="audio-settings">音效与音量</button><button class="text-button" data-action="save-manager">存档与备份</button><button class="text-button" data-action="about">关于与制作</button><span>行囊与远方 <b>·</b> 会开花的家 0.26.0</span></section>
        </div></div></div>

      </main>`;
    bindDrag();homeUI?.bind(mobilePane==='home'&&!atTitle&&!dialog.open);
    document.querySelector('.shop-list').scrollTop = shopScroll;
    document.querySelector('.workspace').scrollTop = deskScroll[mobilePane] || 0;
  }
  // City presentation is cosmetic; every discovery still uses G.explore.
  const CITY_VIEWS = [
    {alt:'柳溪镇的溪流、茶摊与青山',weather:'☀ 茶香沿溪，树影轻摇',market:'茶摊寻香',wild:'茶山溪谷',marketText:'沿着旧茶摊翻看茶农留下的小物，找一份带着茶香的回忆。',wildText:'去溪边与茶山走走，留意翠鸟羽毛和清晨茶芽。',symbol:'leaf'},
    {alt:'松湾港的海面、帆船、鱼市与松林海岸',weather:'≈ 海风拂帆，潮光闪动',market:'港口拾忆',wild:'退潮海滩',marketText:'听船匠说一段海上旧事，在港口寻找漂流瓶与琉璃小鱼。',wildText:'沿退潮后的沙滩慢慢走，看看海潮留下了什么。',symbol:'shell'},
    {alt:'金穗城的麦田、陶器市集、窑火与钟楼',weather:'☀ 麦浪翻金，窑火正暖',market:'陶市访匠',wild:'金色麦田',marketText:'逛逛陶匠的摊位，寻找小马和会随风轻响的铃片。',wildText:'走进城外的麦田，把收获季的一点金色带回营地。',symbol:'sunSeed'}
  ];
  function teaCup(key,filled=true) {
    const r=G.TEA_RECIPES[key];return '<svg class="tea-cup" viewBox="0 0 300 210" role="img" aria-label="'+(filled?r.name:'等待调配的茶盏')+'">'+window.Art.paint(filled?'cupFull':'cupEmpty',45,0,210,210)+(filled?'<path class="tea-steam" d="M122 51q-12-14 0-28m25 21q-10-13 0-27m27 34q12-14 0-28" fill="none" stroke="#f9f1d8" stroke-width="4"/>':'')+'</svg>';
  }

  function teaHomeHTML() {
    const tea=state.collection.home.tea;
    return `<section class="tea-home" aria-label="手作茶席"><div><b>手作茶席 · 茶谱 ${tea.learned.length}/3</b><small>${tea.learned.length?'亲手调成的茶，随商队一直保留':'去柳溪的配茶工坊，带回第一盏茶'}</small></div>${tea.learned.length?`<div class="tea-display-options">${tea.learned.map(k=>`<button class="secondary" data-action="tea-display" data-value="${k}" aria-pressed="${tea.display===k}">${G.TEA_RECIPES[k].name}${tea.display===k?' ✓':''}</button>`).join('')}</div>`:''}${state.city===0?'<button class="secondary" data-action="tea-open">去配茶工坊 →</button>':'<small>柳溪镇 · 当地手艺</small>'}</section>`;
  }
  function teaSuggestion(recipe) {
    // Optional assistance solves the same visible recipe; no hidden bonus or penalty.
    function seek(picks,start){if(picks.length===recipe.cups)return G.teaBlend(picks).every((v,i)=>v===recipe.target[i])?picks:null;for(let i=start;i<6;i++){const found=seek([...picks,i],i);if(found)return found;}return null;}
    const result=seek([],0);return result?result.map(i=>G.TEA_INGREDIENTS[i].name).join(' + '):'';
  }
  function showTea(result=null) {
    const focusAction=document.activeElement?.dataset?.action,focusValue=document.activeElement?.dataset?.value;
    const recipe=G.TEA_RECIPES[teaRecipe],status=G.teaStatus(state,teaRecipe),tea=state.collection.home.tea;
    const blend=G.teaBlend(teaPicks),matched=teaPicks.length===recipe.cups&&blend.every((v,i)=>v===recipe.target[i]);
    const locked=!status.ready;
    const waiting=state.city!==0?'配茶需要回到柳溪镇。':Object.keys(G.TEA_RECIPES).indexOf(teaRecipe)>tea.learned.length?'先调成前一张茶谱。':`再完成 ${status.remaining} 次寻访，带着见闻回来研究新茶。已会的茶可以随时重做。`;
    openDialog(`<div class="tea-workshop"><header><span class="eyebrow">柳溪镇 · 阿青的配茶工坊</span><h2 id="dialog-title">留一盏茶，给归途</h2><p>轻松调配 · 不计时 · 不消耗货物与金币</p></header><nav class="tea-recipes" aria-label="选择茶谱">${Object.entries(G.TEA_RECIPES).map(([k,r],i)=>`<button data-action="tea-recipe" data-value="${k}" aria-pressed="${k===teaRecipe}"><small>${G.teaStatus(state,k).known?'已学会 ✓':G.teaStatus(state,k).unlocked?'可以研制':`第 ${i+1} 张 · 待解锁`}</small><b>${r.name}</b></button>`).join('')}</nav><div class="tea-bench">${teaCup(teaRecipe,matched||!!result)}<div><h3>${recipe.name}</h3><p>${recipe.text}</p><small>放入 ${recipe.cups} 份茶材，同种可重复；点击杯旁的小勺取回。</small></div></div>${result?`<div class="tea-success" role="status"><b>${result.isNew?'新茶谱收好了！':'熟悉的茶香回来了'}</b><p>${result.isNew?'纪念章 +2 · ':''}茶席已摆进营地${tea.learned.length===3?'，三张茶谱全部学会了。':'。下一张茶谱需要两次新的寻访见闻。'}</p><button class="primary" data-action="tea-home">回营地看看我的茶席 →</button></div>`:`<div class="tea-aromas" aria-live="polite">${['清香','醇厚','花甜'].map((label,i)=>`<div class="tea-aroma ${blend[i]===recipe.target[i]?'matched':blend[i]>recipe.target[i]?'over':''}"><span>${label}<b>${blend[i]} / ${recipe.target[i]}</b></span><div class="tea-meter" aria-label="${label}当前 ${blend[i]}，目标 ${recipe.target[i]}"><i style="width:${Math.min(100,blend[i]/10*100)}%"></i><em style="left:${recipe.target[i]*10}%"></em></div><small>${blend[i]===recipe.target[i]?'刚刚好':blend[i]>recipe.target[i]?`多了 ${blend[i]-recipe.target[i]} 格`:`还差 ${recipe.target[i]-blend[i]} 格`}</small></div>`).join('')}</div><div class="tea-spoons" aria-label="已选茶材">${Array.from({length:recipe.cups},(_,n)=>`<button data-action="tea-remove" data-value="${n}" ${teaPicks[n]===undefined?'disabled':''} aria-label="${teaPicks[n]===undefined?'空茶勺':`取回第 ${n+1} 份${G.TEA_INGREDIENTS[teaPicks[n]].name}`}">${teaPicks[n]===undefined?'<span>＋</span><small>空茶勺</small>':`${icon(G.TEA_INGREDIENTS[teaPicks[n]].icon)}<small>${G.TEA_INGREDIENTS[teaPicks[n]].name} ×</small>`}</button>`).join('')}</div>${locked?`<p class="tea-wait" role="status">${waiting}</p>`:''}<div class="tea-ingredients">${G.TEA_INGREDIENTS.map((item,i)=>`<button data-action="tea-add" data-value="${i}" style="--tea-tone:${item.tone}" ${locked||teaPicks.length>=recipe.cups?'disabled':''}>${icon(item.icon)}<b>${item.name}</b><small>${item.flavor.map((v,n)=>v?['清香','醇厚','花甜'][n]+' '+v:'').filter(Boolean).join(' · ')}</small></button>`).join('')}</div><div class="tea-controls"><button class="secondary" data-action="tea-clear" ${teaPicks.length?'':'disabled'}>倒回茶盘</button><button class="primary" data-action="tea-brew" ${!locked&&matched?'':'disabled'}>${matched?'香气刚好，冲泡这盏茶':'搭配到三种香气都刚好'}</button></div><div class="tea-help"><button class="text-button" data-action="tea-hint">请阿青帮忙配一盏</button>${teaHint?`<p>${teaSuggestion(recipe)}。照着搭配也能得到完整奖励。</p>`:''}</div>`}<button class="text-button full" data-action="close">先回城镇 · 已调好的茶会保留</button></div>`,false,true);
    dialog.dataset.panel='tea';
    // Keep keyboard navigation on the ingredient/recipe just used after repainting.
    if(result)document.querySelector('#dialog [data-action="tea-home"]')?.focus({preventScroll:true});
    else if(['tea-add','tea-remove','tea-clear','tea-hint','tea-recipe'].includes(focusAction)){
      const target=document.querySelector(`#dialog [data-action="${focusAction}"]${focusValue===undefined?'':`[data-value="${focusValue}"]`}`);
      if(target&&!target.disabled)target.focus({preventScroll:true});
      else (document.querySelector('#dialog [data-action="tea-brew"]:enabled')||document.querySelector('#dialog [data-action="tea-clear"]:enabled'))?.focus({preventScroll:true});
    }
  }

  const SAIL_LABELS={north:'向上',east:'向右',south:'向下',west:'向左'},SAIL_ARROWS={north:'↑',east:'→',south:'↓',west:'←'};
  function sailingHomeHTML() {
    const fleet=state.collection.home.sailing;
    return `<section class="fleet-home" aria-label="港湾模型台"><div><b>港湾模型台 · ${fleet.models.length}/3</b><small>${fleet.models.length?'亲自试航的小船，停在自己的港湾':'去松湾港帮洛舟试航，带回第一艘模型'}</small></div>${fleet.models.length?`<div class="fleet-models">${fleet.models.map(key=>`<button data-action="sailing-display" data-value="${key}" aria-pressed="${fleet.display===key}">${window.Art.sailboat(key)}<small>${G.SAIL_CHARTS[key].name}${fleet.display===key?' ✓':''}</small></button>`).join('')}</div>`:''}${state.city===1?'<button class="secondary" data-action="sailing-open">去港口试航 →</button>':'<small>松湾港 · 顺风试航</small>'}</section>`;
  }
  function sailingBoard(key,v) {
    const c=G.SAIL_CHARTS[key],cx=n=>n%5*100+50,cy=n=>Math.floor(n/5)*100+50;
    return `<svg class="sailing-board" viewBox="0 0 500 500" role="img" aria-label="${c.title}航图，小船在第 ${Math.floor(v.at/5)+1} 行第 ${v.at%5+1} 列；码头在右上角"><image href="assets/paint-water-024.png" width="500" height="500"/><g fill="none" stroke="#d7e8da" stroke-width="2" opacity=".6">${[1,2,3,4].map(n=>`<path d="M${n*100} 8v484M8 ${n*100}h484"/>`).join('')}</g>${Array.from({length:25},(_,n)=>c.reefs.includes(n)?window.Art.paint('rock',cx(n)-44,cy(n)-44,88,88):`<path class="sailing-wave" d="M${cx(n)-22} ${cy(n)+24}q10 6 20 0t20 0" fill="none" stroke="#deeee1" stroke-width="3" style="animation-delay:${n%4*-.4}s"/>`).join('')}<g transform="translate(${cx(c.dock)} ${cy(c.dock)})"><rect x="-38" y="-38" width="76" height="76" rx="12" fill="#e9c98a" stroke="#b39564" stroke-width="3"/><path d="M-31 22h62m-47-52v60m31-60v60" stroke="#c6a977" stroke-width="3"/><path d="M-7-12h14v30H-7z" fill="#fbf3d8"/><path d="m-14-12 14-12 14 12z" fill="#b27365"/><circle cy="-4" r="4" fill="#e1b862"/><text y="36" text-anchor="middle" font-size="12" fill="#766044">码头</text></g>${c.buoys.map((n,i)=>`<g transform="translate(${cx(n)} ${cy(n)})"><ellipse cy="22" rx="25" ry="8" fill="#699e99" opacity=".5"/><circle r="25" fill="${v.visited&(1<<i)?'#efd999':'#f8f1d6'}" stroke="${v.visited&(1<<i)?'#a8874c':'#578c84'}" stroke-width="4"/><text y="7" text-anchor="middle" font-size="21" font-weight="bold" fill="#426d67">${v.visited&(1<<i)?'✓':i+1}</text></g>`).join('')}${v.previous?`<path d="M${cx(v.previous.at)} ${cy(v.previous.at)}L${cx(v.at)} ${cy(v.at)}" fill="none" stroke="#fff8db" stroke-width="5" stroke-dasharray="7 8" opacity=".8"/>`:''}<g transform="translate(${cx(v.at)-38} ${cy(v.at)-42}) scale(.76)"><g class="fleet-bob">${window.Art.sailboat(key)}</g></g><rect x="3" y="3" width="494" height="494" rx="24" fill="none" stroke="#598d84" stroke-width="6"/></svg>`;
  }
  function showSailing(result=null) {
    const focusAction=document.activeElement?.dataset?.action;
    const focusDirection=document.activeElement?.dataset?.value?.split(':')[0];
    const fleet=state.collection.home.sailing,key=sailingChart,c=G.SAIL_CHARTS[key],status=G.sailingStatus(state,key);
    const active=fleet.voyage?.key===key,v=result?{key,at:c.dock,visited:(1<<c.buoys.length)-1,steps:0,previous:null}:active?fleet.voyage:{key,at:c.start,visited:0,steps:0,previous:null},complete=G.sailingComplete(v);
    const next=sailingHint?G.sailingRoute(key,v.at,v.visited)?.[0]:null;
    const count=c.buoys.filter((_,i)=>v.visited&(1<<i)).length;
    const waiting=state.city!==1?'试航需要回到松湾港。':Object.keys(G.SAIL_CHARTS).indexOf(key)>fleet.models.length?'先完成前一张航图。':`再完成 ${status.remaining} 次寻访，带着见闻来试航下一艘船。`;
    openDialog(`<div class="sailing-workshop"><header><span class="eyebrow">松湾港 · 洛舟的顺风试航</span><h2 id="dialog-title">让小船，找到归途</h2><p>每阵风会把船推到礁石或岸边；经过全部浮标，再停到金色码头。</p></header><nav class="sailing-charts" aria-label="选择航图">${Object.entries(G.SAIL_CHARTS).map(([k,chart])=>`<button data-action="sailing-chart" data-value="${k}" aria-pressed="${key===k}"><small>${G.sailingStatus(state,k).known?'模型已收藏 ✓':G.sailingStatus(state,k).unlocked?'可以试航':'见闻解锁'}</small><b>${chart.title}</b></button>`).join('')}</nav><div class="sailing-desk"><div>${sailingBoard(key,v)}<div class="sailing-buoys" aria-live="polite">${c.buoys.map((_,i)=>`<span class="${v.visited&(1<<i)?'done':''}">${v.visited&(1<<i)?'✓':'○'} 浮标 ${i+1}</span>`).join('')}<b>${count}/${c.buoys.length}</b></div></div><aside>${result?`<div class="fleet-prize">${window.Art.sailboat(result.key)}<h3>${c.name}</h3><p>${result.isNew?'新模型入藏 · 纪念章 +2':'再次平安归港 · 模型已摆好'}</p><button class="primary full" data-action="sailing-home">去营地看看 →</button></div>`:`<h3>${c.title}</h3><p class="sailing-summary" role="status">${complete?'浮标全部经过，小船已经归港。':active?`已经顺风航行 ${v.steps} 次。经过浮标就会点亮，不需要停在浮标上。`:'先放船下水，再用四个风向按钮或键盘方向键试航。'}</p>${!status.ready?`<p class="sailing-wait">${waiting}</p>`:!active?`<button class="primary full" data-action="sailing-start">${fleet.voyage?'换这张图，从起点试航':'放船下水 →'}</button>${fleet.voyage?'<small>当前未完成的试航会重新开始；已收藏模型保留。</small>':''}`:complete?'<button class="primary full" data-action="sailing-finish">收好小船模型 →</button>':''}<div class="wind-controls" aria-label="选择推动小船的方向">${['north','west','east','south'].map(direction=>{const moved=G.sailingStep(key,v.at,v.visited,direction).at!==v.at;return `<button class="wind-${direction} ${next===direction?'hinted':''}" data-action="sailing-move" data-value="${direction}:${v.steps}" aria-label="${SAIL_LABELS[direction]}吹风" ${active&&status.ready&&!complete&&moved?'':'disabled'}><b>${SAIL_ARROWS[direction]}</b><small>${SAIL_LABELS[direction]}</small></button>`;}).join('')}<span>风向</span></div><div class="sailing-tools"><button class="secondary" data-action="sailing-undo" ${active&&v.previous?'':'disabled'}>撤回一步</button><button class="secondary" data-action="sailing-reset" ${active&&v.steps?'':'disabled'}>重新试航</button></div><button class="text-button full" data-action="sailing-hint" ${active&&!complete?'':'disabled'}>请洛舟指个方向</button>${next?`<p class="sailing-tip" role="status">试试${SAIL_LABELS[next]}吹风 ${SAIL_ARROWS[next]}。提示不影响模型与奖励。</p>`:''}<div class="sailing-model-preview">${window.Art.sailboat(key)}<small>试航成功带回<br><b>${c.name}</b></small></div>`}</aside></div><div class="sailing-footer"><small>不计时 · 不扣金币与货物 · 每一步自动保存</small><button class="text-button" data-action="close">收起航图，稍后再来</button></div></div>`,false,true);
    dialog.dataset.panel='sailing';
    if(result)document.querySelector('#dialog [data-action="sailing-home"]')?.focus({preventScroll:true});
    else if(complete)document.querySelector('#dialog [data-action="sailing-finish"]')?.focus({preventScroll:true});
    else if(focusAction==='sailing-move'){
      const same=document.querySelector(`#dialog [data-action="sailing-move"][data-value="${focusDirection}:${v.steps}"]:enabled`);
      (same||document.querySelector('#dialog [data-action="sailing-move"]:enabled'))?.focus({preventScroll:true});
    }else if(['sailing-start','sailing-reset','sailing-undo','sailing-hint'].includes(focusAction))document.querySelector(`#dialog [data-action="${focusAction}"]:enabled, #dialog [data-action="sailing-move"]:enabled`)?.focus({preventScroll:true});
  }

  const POTTERY_PARTS=['底足','肚身','肩部','口沿'];
  function potteryHomeHTML() {
    const studio=state.collection.home.pottery;
    return `<section class="pottery-home" aria-label="我的手作陶器"><div><b>我的手作陶器 · ${studio.learned.length}/3</b><small>${studio.learned.length?'器形、釉色与花纹，都留下你的选择':'去金穗城，捏一件属于自己的陶器'}</small></div>${studio.learned.length?`<div class="pottery-shelf">${studio.learned.map(key=>`<button data-action="pottery-display" data-value="${key}" aria-pressed="${studio.display===key}">${window.Art.potteryPiece(key,studio.pieces[key])}<small>${G.POTTERY_FORMS[key].name}${studio.display===key?' ✓':''}</small></button>`).join('')}</div>`:''}${state.city===2?'<button class="secondary" data-action="pottery-open">去陶作小院 →</button>':'<small>金穗城 · 陶禾的陶作小院</small>'}</section>`;
  }
  function beginPottery(key) {
    potteryForm=key;potteryStage='shape';potteryReviewOld=null;potteryDrag=null;
    const existing=state.collection.home.pottery.pieces[key];potteryDraft=existing?JSON.parse(JSON.stringify(existing)):{profile:[35,35,35,35],glaze:'clay',pattern:'plain'};
  }
  function potteryReady() { const status=G.potteryStatus(state,potteryForm);return status.ready&&(status.known||G.potteryFit(potteryForm,potteryDraft.profile)); }
  function potteryShapeNote() { const status=G.potteryStatus(state,potteryForm);if(status.known)return '器形已经学会，可以自由调整宽窄。';const matched=potteryDraft.profile.filter((n,i)=>Math.abs(n-G.POTTERY_FORMS[potteryForm].target[i])<=6).length;return matched===4?'四处轮廓都合适了，可以去上釉。':`已有 ${matched}/4 处贴近虚线，拖动陶坯右侧圆点，或调整旁边滑杆。`; }
  function updatePotteryPreview() {
    if(!dialog.open||dialog.dataset.panel!=='pottery'||potteryStage!=='shape')return;
    const status=G.potteryStatus(state,potteryForm),preview=document.querySelector('#pottery-preview');
    if(preview)preview.innerHTML=window.Art.potteryPiece(potteryForm,potteryDraft,{wheel:true,handles:status.ready,target:status.known?null:G.POTTERY_FORMS[potteryForm].target});
    document.querySelectorAll('[data-pottery-range]').forEach(input=>{const index=Number(input.dataset.potteryRange);input.value=potteryDraft.profile[index];});
    document.querySelectorAll('[data-pottery-output]').forEach(output=>{const i=Number(output.dataset.potteryOutput),diff=potteryDraft.profile[i]-G.POTTERY_FORMS[potteryForm].target[i];output.textContent=status.known?String(potteryDraft.profile[i]):Math.abs(diff)<=6?'轮廓合适 ✓':diff>0?'稍微收窄':'稍微撑开';});
    const note=document.querySelector('#pottery-fit');if(note)note.textContent=potteryShapeNote();
    const next=document.querySelector('[data-action="pottery-next"]');if(next)next.disabled=!potteryReady();
  }
  function shapePottery(index,value) { if(potteryStage!=='shape'||!G.potteryStatus(state,potteryForm).ready||!Number.isInteger(index)||index<0||index>3||!Number.isFinite(value))return;potteryDraft.profile[index]=Math.max(15,Math.min(80,Math.round(value)));updatePotteryPreview(); }
  document.addEventListener('pointerdown',e=>{
    if(!dialog.open||dialog.dataset.panel!=='pottery'||potteryStage!=='shape'||e.button!==0)return;
    const handle=e.target.closest('[data-pottery-handle]');if(!handle||!G.potteryStatus(state,potteryForm).ready)return;
    const preview=document.querySelector('#pottery-preview');potteryDrag={index:Number(handle.dataset.potteryHandle),pointer:e.pointerId};preview.setPointerCapture(e.pointerId);e.preventDefault();
  });
  document.addEventListener('pointermove',e=>{
    if(!potteryDrag||e.pointerId!==potteryDrag.pointer||!dialog.open||dialog.dataset.panel!=='pottery')return;
    const svg=document.querySelector('#pottery-preview svg');if(!svg)return;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());shapePottery(potteryDrag.index,(local.x-164)/1.2);e.preventDefault();
  });
  for(const type of ['pointerup','pointercancel'])document.addEventListener(type,()=>{potteryDrag=null;});
  function showPottery(result=null) {
    const focusAction=document.activeElement?.dataset?.action,focusValue=document.activeElement?.dataset?.value;
    const key=potteryForm,form=G.POTTERY_FORMS[key],status=G.potteryStatus(state,key),studio=state.collection.home.pottery;
    const waiting=state.city!==2?'陶作需要到金穗城。':Object.keys(G.POTTERY_FORMS).indexOf(key)>studio.learned.length?'先学会前一种器形。':`再完成 ${status.remaining} 次寻访，回来向陶禾学下一种器形。`;
    const artwork=(piece,options={})=>window.Art.potteryPiece(key,piece,options);
    openDialog(`<div class="pottery-workshop ${result?'kiln-glow':''}"><header><span class="eyebrow">金穗城 · 陶禾的陶作小院</span><h2 id="dialog-title">把喜欢的样子，捏进泥土</h2><p>不计时 · 不消耗金币或货物 · 烧好的作品会留在营地</p></header><nav class="pottery-forms" aria-label="选择器形">${Object.entries(G.POTTERY_FORMS).map(([k,f])=>`<button data-action="pottery-form" data-value="${k}" aria-pressed="${k===key}"><small>${G.potteryStatus(state,k).known?'已学会 · 自由改形':G.potteryStatus(state,k).unlocked?'可以学习':'见闻解锁'}</small><b>${f.name}</b></button>`).join('')}</nav>${result?`<div class="pottery-prize">${artwork(studio.pieces[key])}<div><h3>${result.isNew?'第一件'+form.name+'出窑了':'新作品已经换上展台'}</h3><p>${G.POTTERY_GLAZES[studio.pieces[key].glaze].name}釉 · ${G.POTTERY_PATTERNS[studio.pieces[key].pattern]}纹${result.reward?` · 纪念章 +${result.reward}`:''}</p><button class="primary" data-action="pottery-home">回营地看看我的作品 →</button></div></div>`:potteryStage==='review'?`<div class="pottery-review"><h3>${status.known?'这次要用新作替换旧作吗？':'准备送进小窑炉'}</h3><div class="pottery-compare">${status.known?`<div><b>营地里的旧作</b>${artwork(potteryReviewOld)}</div>`:''}<div><b>${status.known?'本次新作':'即将带回营地的作品'}</b>${artwork(potteryDraft)}</div></div><p>${status.known?'确认后会替换同一器形的旧作；取消可保留原作，重做不重复发奖。':'造型、釉色与花纹将完整保留，首次烧成获得 2 枚纪念章。'}</p><div class="pottery-actions"><button class="secondary" data-action="pottery-back">再调整一下</button><button class="primary" data-action="pottery-fire" ${potteryReady()?'':'disabled'}>${status.known?'确认替换并烧成':'确认烧成，带回营地'}</button></div></div>`:`<div class="pottery-desk"><div class="pottery-wheel" id="pottery-preview">${artwork(potteryDraft,{wheel:true,handles:potteryStage==='shape'&&status.ready,target:potteryStage==='shape'&&!status.known?form.target:null})}</div><aside><div class="pottery-steps"><b class="${potteryStage==='shape'?'active':''}">1 塑形</b><span>→</span><b class="${potteryStage==='decorate'?'active':''}">2 上釉</b><span>→</span><b>3 入窑</b></div><h3>${form.name}</h3>${!status.ready?`<p class="pottery-wait">${waiting}</p>`:''}${potteryStage==='shape'?`<p id="pottery-fit" class="pottery-note" aria-live="polite">${potteryShapeNote()}</p><div class="pottery-sliders">${[3,2,1,0].map(i=>`<label><span>${POTTERY_PARTS[i]}<output data-pottery-output="${i}">${status.known?potteryDraft.profile[i]:Math.abs(potteryDraft.profile[i]-form.target[i])<=6?'轮廓合适 ✓':potteryDraft.profile[i]>form.target[i]?'稍微收窄':'稍微撑开'}</output></span><input data-pottery-range="${i}" type="range" min="15" max="80" step="1" value="${potteryDraft.profile[i]}" aria-label="${POTTERY_PARTS[i]}宽窄" ${status.ready?'':'disabled'}></label>`).join('')}</div><button class="text-button full" data-action="pottery-assist" ${status.ready?'':'disabled'}>${status.known?'恢复初学轮廓':'请陶禾帮我扶正轮廓'}</button><button class="primary full" data-action="pottery-next" ${potteryReady()?'':'disabled'}>器形好了，去上釉 →</button>`:`<p class="pottery-note">挑一种釉色，再画上喜欢的花纹。</p><div class="pottery-glazes" aria-label="选择釉色">${Object.entries(G.POTTERY_GLAZES).map(([k,g])=>`<button data-action="pottery-glaze" data-value="${k}" aria-pressed="${potteryDraft.glaze===k}"><i style="background:${g.color}"></i>${g.name}</button>`).join('')}</div><div class="pottery-patterns" aria-label="选择花纹">${Object.entries(G.POTTERY_PATTERNS).map(([k,name])=>`<button data-action="pottery-pattern" data-value="${k}" aria-pressed="${potteryDraft.pattern===k}">${artwork({...potteryDraft,pattern:k})}<small>${name}</small></button>`).join('')}</div><button class="text-button full" data-action="pottery-back">回去调整器形</button><button class="primary full" data-action="pottery-review" ${potteryReady()?'':'disabled'}>查看入窑预览 →</button>`}</aside></div>`}<footer><small>未烧成的草稿关闭后不保留</small><button class="text-button" data-action="close">先回城镇</button></footer></div>`,false,true);
    dialog.dataset.panel='pottery';
    if(result)document.querySelector('[data-action="pottery-home"]')?.focus({preventScroll:true});
    else if(potteryStage==='review')document.querySelector('[data-action="pottery-fire"]')?.focus({preventScroll:true});
    else if(['pottery-glaze','pottery-pattern','pottery-form'].includes(focusAction))document.querySelector(`#dialog [data-action="${focusAction}"][data-value="${focusValue}"]`)?.focus({preventScroll:true});
  }

  function showCityVisit() {
    const view=CITY_VIEWS[state.city],can=G.canExplore(state),level=G.collectionLevel(state);
    openDialog(`<div class="city-visit-banner city-${state.city}"><span>在这一站，留下一份回忆</span><h2 id="dialog-title">${G.CITIES[state.city].name} · 小小寻访</h2></div><p class="dialog-copy">${can?'本次停靠任选一处寻访，不花金币和天数。发现也会推动营地花卉成长。':'本次已经寻访过了；到达下一座城后，再找一份新的回忆。'}</p><div class="city-visit-options">${['market','wild'].map(place=>`<button class="city-visit-card" data-action="explore" data-value="${place}" ${can&&(place==='market'||G.mapUnlocked(state))?'':'disabled'}>${icon(place==='market'?'compass':view.symbol)}<span><b>${place==='wild'?G.EXPLORE_MAPS[state.city].name:view[place]}</b><small>${view[place+'Text']}</small><em>${place==='wild'&&!G.mapUnlocked(state)?`第 ${state.city+1} 程开放地图`:missingAt(place)}</em></span><strong>→</strong></button>`).join('')}</div>${state.city===0?`<button class="tea-invite" data-action="tea-open">${icon('tea')}<span><b>阿青的配茶工坊</b><small>亲手搭配茶材 · 将茶席带回营地</small></span><strong>→</strong></button>`:''}${state.city===1?`<button class="sailing-invite" data-action="sailing-open">${icon('visitorSail')}<span><b>洛舟的顺风试航</b><small>让小船顺风绕过浮标，带回帆船模型</small></span><strong>→</strong></button>`:''}${state.city===2?`<button class="pottery-invite" data-action="pottery-open">${icon('visitorClay')}<span><b>陶禾的陶作小院</b><small>亲手塑形、上釉，带回自己的陶器</small></span><strong>→</strong></button>`:''}<p class="dialog-fineprint">与营地的寻访入口共用本次机会。重复珍藏保留实物，可在小铺出售；图鉴记录永久保留。</p><button class="secondary full" data-action="close">回到城镇</button>`);
  }
  // Scene hotspots and the desk share the same actions; switching views never changes a save.
  function townHTML() {
    const city = G.CITIES[state.city], free = G.isFreeTravel(state), wealth = G.worth(state), progress = free ? Math.round(state.collection.treasures.length / 12 * 100) : Math.min(100, Math.round(wealth / G.goal(state) * 100));
    const view=CITY_VIEWS[state.city];
    const task = state.order ? G.ORDER_TYPES[state.order.type].title : '去委托板，找一笔新生意';
    const clue=state.collection.trail.clue,clueTarget=clue&&G.TREASURES[clue.key];
    const questAction=free&&!state.order?(clue?'clue-route':state.collection.treasures.length<12?'clue-board':'visit'):'visit';
    return `<section class="town-stage illustrated-town city-${state.city}" aria-label="${city.name}，可交互城镇场景"><div class="painted-world" role="img" aria-label="${view.alt}"></div><div class="world-light" aria-hidden="true"></div><div class="world-motes" aria-hidden="true">${Array.from({length: 9}, (_, n) => `<i style="--n:${n}"></i>`).join('')}</div><div class="town-caption"><span class="eyebrow">第 ${state.journeys + 1} 站 · 北境商路</span><h1>${city.name}</h1><span class="town-weather">${view.weather}</span></div><button class="world-journal" data-action="journal" aria-label="打开旅途手记">☷<span>手记</span></button><div class="town-hotspots">${[['market','coin',state.city===0?'逛茶市':state.city===1?'逛港市':'逛陶市','货物上新'],['orders','porcelain','委托板',state.order ? '查看订单' : '三选一'],['inventory','bag','我的马车',`${state.items.length} 件行李`],['route','compass','城门出发','选择下一站']].map(([pane,symbol,label,hint]) => `<button class="world-pin pin-${pane}" data-action="visit" data-value="${pane}" aria-pressed="${mobilePane === pane}"><span class="pin-symbol">${icon(symbol)}</span><b>${label}</b><small>${hint}</small></button>`).join('')}<button class="world-pin pin-explore" data-action="city-explore" aria-label="${city.name}当地寻访"><span class="pin-symbol">${icon(view.symbol)}</span><b>当地寻访</b><small>${G.canExplore(state)?'选一处逛逛':'本次已寻访'}</small></button></div><div class="camp-caravan" aria-hidden="true">${scene('camp', {city: state.city, items: state.items})}</div><div class="world-quest"><span class="quest-medallion" style="--progress:${progress}%" aria-label="${free ? "珍藏收集" : "本程目标完成"} ${progress}%">${icon((free ? state.collection.treasures.length === 12 : wealth >= G.goal(state)) ? 'check' : 'compass')}</span><button data-action="${questAction}" data-value="${free && !state.order ? 'home' : 'orders'}"><small>${state.order ? '当前委托' : free ? '下一份远方' : '下一步'}</small><b>${free && !state.order ? clueTarget ? `寻找${clueTarget.name} · ${G.CITIES[clueTarget.city].name}` : state.collection.treasures.length < 12 ? '挑一件缺失的珍藏，为它出发' : '回到营地，探望朋友、布置新家' : task}</b></button><span class="quest-total">${free ? state.collection.treasures.length : wealth}<small>${free ? '/ 12 珍藏' : `/ ${G.goal(state)} G`}</small></span></div></section>`;
  }
  function collectionStrip() {
    const c=state.collection, level=G.collectionLevel(state), count=c.goods.length+c.treasures.length, next=G.BOOK_LEVELS[level];
    return `<button class="collection-strip" data-action="visit" data-value="home">${icon(c.favorite||'leaf')}<span><b>收藏 Lv.${level} · 我的营地</b><small>${next?`再发现 ${next-count} 种，解锁下一阶段`:'收藏大师 · 继续布置你的归处'}</small></span><strong>${Object.entries(G.KEEPSAKES).some(([k,g])=>!c.claimed.includes(k)&&G.keepsakeProgress(state,k)===g.target)?'心愿可领奖 ✦':G.canExplore(state)?'可寻访 ✦':`${count} / 27`}</strong></button>`;
  }
  const GUIDE_COPY = {
    buy:['挑一件旅途货物','到集市买一件货物；春茶是柳溪的特产，带到港口看看售价。','market','coin'],
    explore:['把第一份远方带回家','去营地免费寻访一次，得到珍藏、花种和纪念章。','home','leaf'],
    decorate:['让营地第一次改变','兑换「野花小径」便能种花；也可以挑选喜欢的其他装饰。','home','herb'],
    travel:['带着期待，启程','选择目的地和路线；花会随着新的寻访成长。旅途小游戏可以跳过。','route','cart'],
    sell:['完成第一笔买卖','点击行囊里的货物查看售价，再决定卖出哪一件。口粮和装备可留着赶路。','inventory','coin']
  };
  function guideHTML() {
    const h=state.collection.home;if(h.guideHidden||state.phase!=='market'||state.challenge?.status==='active')return '';
    const key=G.GUIDE.find(k=>!h.guide.includes(k)),step=GUIDE_COPY[key];
    return `<section class="first-steps" aria-label="新手旅程"><div class="first-steps-top"><span>第一趟远方 · ${h.guide.length}/${G.GUIDE.length}</span><button class="text-button" data-action="guide-hide">${key?'跳过引导':'收好旅程指南'}</button></div><div class="guide-dots" aria-hidden="true">${G.GUIDE.map(k=>`<i class="${h.guide.includes(k)?'done':''}"></i>`).join('')}</div><h3>${key?step[0]:'你已经会独自旅行了'}</h3><p>${key?step[1]:'接下来选一条收藏线索，收集花种、布置主题展，或者接一份合适的委托。'}</p>${key?`<button class="secondary full" data-action="guide-go" data-value="${key}">${icon(step[3])}去${{market:'集市',home:'营地',route:'选路线',inventory:'行囊'}[step[2]]} →</button>`:''}</section>`;
  }
  // Original vector flowers, shared by seed cards, growing beds and the bouquet.
  function flowerHead(key,color) { return window.Art.paint(key,0,0,100,100); }

  function flowerSVG(key,growth=2) { return '<svg class="garden-flower" viewBox="0 0 100 110" aria-hidden="true">'+window.Art.paint(growth===2?key:growth===1?'bud':'seedling',0,0,100,110)+'</svg>'; }

  function facilitiesHTML() {
    const h=state.collection.home,beds=G.gardenBeds(state),enabled=state.phase==='market'&&state.challenge?.status!=='active',display=state.collection.owned.includes('showcase');
    return `<section class="home-facilities" aria-label="营地设施"><div class="facility-heading"><h3>会开花的家</h3><span>${h.flowers.length}/6 花卉 · ${h.awarded.length}/3 主题徽章</span></div>${beds?`<div class="garden-beds">${h.beds.slice(0,beds).map((bed,i)=>{const growth=G.flowerGrowth(state,i);return `<button class="garden-bed ${growth===2?'blooming':''}" data-action="${bed?growth===2?'garden-harvest':'garden-info':'garden-plant'}" data-value="${i}" ${enabled?'':'disabled'}>${flowerSVG(bed?.key,growth)}<b>${bed?G.FLOWERS[bed.key].name:'种下一份远方'}</b><small>${bed?growth===2?'盛开了 · 点击收花':`再寻访 ${2-growth} 次盛开`:'选择花种 ＋'}</small></button>`;}).join('')}</div><p class="facility-note">旅行中完成寻访，花就会成长；不会枯萎，也不必在线等候。${beds===1?'草木花房开放三处花圃。':''}</p>`:`<button class="facility-unlock" data-action="facility-decor" data-value="flowerbed">${flowerSVG('daisy')}<span><b>一条小径，也是第一块花圃</b><small>野花小径 · 4 枚纪念章 · 解锁种花</small><em>去布置营地 →</em></span></button>`}${h.flowers.length?`<div class="bouquet-shelf" aria-label="挑选营地花束">${h.flowers.map(key=>`<button data-action="garden-bouquet" data-value="${key}" aria-pressed="${h.bouquet===key}" aria-label="摆放${G.FLOWERS[key].name}" ${enabled?'':'disabled'}>${flowerSVG(key)}<small>${G.FLOWERS[key].name}</small></button>`).join('')}</div>`:''}<div class="exhibition-preview"><div class="exhibit-plinths">${(h.exhibition.length?h.exhibition:[null,null,null]).map(key=>`<span>${icon(key||'porcelain')}<small>${key?G.TREASURES[key].name:'待展出'}</small></span>`).join('')}</div><button class="secondary full" data-action="${display?'exhibition-open':'facility-decor'}" data-value="showcase" ${enabled?'':'disabled'}>${display?'布置我的三件珍藏':'珍藏展柜 · Lv.3 解锁主题展'} →</button><p class="facility-note">同城三件不同珍藏组成主题展，首次各得 5 章与一枚徽章；珍藏会保留。</p>${h.awarded.length?`<div class="exhibit-badges">${h.awarded.map(city=>`<span>✦ ${G.CITIES[city].name}</span>`).join('')}</div>`:''}</div></section>`;
  }
  function showSeeds(index) {
    openDialog(`<span class="eyebrow">花圃 ${index+1} · 免费播种</span><h2 id="dialog-title">把哪座城的风景种下来？</h2><p class="dialog-copy">获得当地任意珍藏可用普通花种，稀有珍藏解锁特别花种。种下后再寻访两次就会盛开。</p><div class="seed-grid">${Object.entries(G.FLOWERS).map(([key,f])=>`<button class="seed-card" data-action="garden-seed" data-value="${index}:${key}" ${G.seedUnlocked(state,key)?'':'disabled'}>${flowerSVG(key)}<b>${f.name}</b><small>${G.CITIES[f.city].name} · ${G.seedUnlocked(state,key)?'可以播种':f.rare?'需要当地稀有珍藏':'需要当地任意珍藏'}</small></button>`).join('')}</div><button class="text-button full" data-action="close">先不种，返回营地</button>`);
  }
  function showExhibition() {
    const city=G.exhibitionTheme(exhibitionDraft),c=state.collection;
    openDialog(`<span class="eyebrow">三件珍藏，一个故事</span><h2 id="dialog-title">布置小小主题展</h2><div class="exhibition-selection">${[0,1,2].map(i=>`<span>${icon(exhibitionDraft[i]||'porcelain')}<small>${exhibitionDraft[i]?G.TREASURES[exhibitionDraft[i]].name:'选择一件'}</small></span>`).join('')}</div><p class="collection-reward">${exhibitionDraft.length<3?`再选 ${3-exhibitionDraft.length} 件不同珍藏`:city===null?'自由组合 · 把喜欢的回忆摆在一起':`${G.CITIES[city].name}主题展 · ${c.home.awarded.includes(city)?'徽章已获得':'首次布展获得徽章与 5 章'}`}</p><div class="dialog-buttons exhibition-actions"><button class="secondary" data-action="close">取消</button><button class="primary" data-action="exhibition-save" ${exhibitionDraft.length===3?'':'disabled'}>摆进展柜</button></div><div class="exhibit-picker">${G.ownedTreasures(c).map(key=>`<button data-action="exhibition-pick" data-value="${key}" aria-pressed="${exhibitionDraft.includes(key)}">${icon(key)}<b>${G.TREASURES[key].name}</b><small>${G.CITIES[G.TREASURES[key].city].name}</small></button>`).join('')}</div><p class="dialog-fineprint">点选三件；再次点击可撤下。不消耗珍藏，确认前不会改变营地。</p>`);
  }
  function homeHTML() {
    const c=state.collection, level=G.collectionLevel(state), count=c.goods.length+c.treasures.length, next=G.BOOK_LEVELS[level], can=G.canExplore(state);
    const view=CITY_VIEWS[state.city];
    return `<div class="home-heading"><span><small>每一段旅途，都有留下的东西</small><h2>远方有个家</h2></span><b>✦ ${c.stamps}<small>纪念章</small></b><button class="secondary" data-action="treasure-shop">珍藏小铺 ↗</button></div>${homeUI?homeUI.html():window.Art.homeScene(c)}${clueHTML()}${teaHomeHTML()}${sailingHomeHTML()}${potteryHomeHTML()}${facilitiesHTML()}${catHTML()}${visitorHTML()}<div class="collection-progress"><span>${count} / 27 种发现</span><span>${next?`下一级 ${next} 种 · 奖励 3 章`:'已达收藏最高等级'}</span><i><b style="width:${next?Math.min(100,count/next*100):100}%"></b></i></div>${keepsakeHTML()}<div class="explore-area"><div><b>${G.CITIES[state.city].name} · 小小寻访</b><small>${can?'本次停靠可寻访一次，不耗天数与金币':'本次已寻访；抵达下一座城恢复机会'}</small></div><div class="explore-buttons"><button class="secondary" data-action="explore" data-value="market" ${can?'':'disabled'}>${icon('porcelain')}<span>${view.market}<small>${missingAt('market')}</small></span></button><button class="secondary" data-action="explore" data-value="wild" ${can&&G.mapUnlocked(state)?'':'disabled'}>${icon(state.city===1?'shell':'leaf')}<span>${G.mapUnlocked(state)?G.EXPLORE_MAPS[state.city].name:`第 ${state.city+1} 程开放地图`}<small>${missingAt('wild')}</small></span></button></div><p>稀有发现基础概率 35% · 连续两次普通发现后，下次必出稀有${c.pity?`（当前 ${c.pity}/2）`:''}</p></div><nav class="book-tabs" aria-label="收藏册分类">${[['treasures','珍藏',`${c.treasures.length}/12`],['goods','货物图鉴',`${c.goods.length}/15`],['decor','布置营地',`${c.owned.length}/10`]].map(([key,name,total])=>`<button data-action="book-tab" data-value="${key}" aria-pressed="${bookTab===key}">${name}<small>${total}</small></button>`).join('')}</nav>${bookTab==='decor'?decorHTML():albumHTML(bookTab)}<details class="collection-guide"><summary>纪念章怎么获得？哪些东西会保留？</summary><p>以下为基础奖励，已学天赋会额外加成。首次登记货物 +1；新普通珍藏 +2、稀有珍藏 +3；重复珍藏 +1；收藏升级 +3；完成委托 +2；完成小游戏 +1；收藏心愿另有一次性奖励。中途退出挑战不发章。</p><p>15 种货物需要实际拥有才会登记；珍藏不占背包，实物可在珍藏小铺回收成纪念章。图鉴、珍藏、纪念章、已领取心愿、营地与小猫感情跨程、跨新商队保留，仅保存在当前浏览器。重新开局不能刷新已用过的免费寻访。</p></details>`;
  }
  function missingAt(place) {
    const missing=Object.keys(G.TREASURES).filter(k=>G.TREASURES[k].city===state.city&&G.TREASURES[k].place===place&&!G.isCommissionTreasure(k)&&!state.collection.treasures.includes(k));
    return missing.length?`还缺 ${missing.length} 件${missing.length===1?G.TREASURES[missing[0]].rare?' · 稀有':' · 普通':''}`:'已集齐 · 可收藏重复实物';
  }
  function clueHTML() {
    const clue=state.collection.trail.clue,missing=Object.entries(G.TREASURES).filter(([key])=>!state.collection.treasures.includes(key));
    if(!missing.length)return `<section class="clue-complete">${icon('check')}<div><b>三城珍藏都到家了 · 12/12</b><small>回忆收好了，再去看看老朋友。</small></div><button class="secondary" data-action="visitor-info">坐下来聊聊 →</button></section>`;
    if(!clue){const local=missing.filter(([,t])=>t.city===state.city);return `<button class="clue-invite clue-priority" data-action="clue-board">${icon('compass')}<span><b>${local.length?`这一站，还缺 ${local.length} 件珍藏`:'下一站，去找尚未相遇的珍藏'}</b><small>普通线索可寻访追踪 · 奇遇珍藏要接委托</small></span><strong>挑选目标 →</strong></button>`;}
    const t=G.TREASURES[clue.key],local=t.city===state.city;
    if(G.isCommissionTreasure(clue.key))return `<section class="clue-trail clue-priority"><div>${icon(clue.key)}<span><small>委托奇遇 · 追踪中</small><b>${t.name}</b><small>前往${G.CITIES[t.city].name}的委托路途</small></span></div><p>带齐合格货物并按时前往委托目的地。每单一次判定；已连续未遇 ${state.collection.commissionMisses||0}/3 单，三次未遇后的下一单必遇。</p><button class="primary" data-action="pane" data-value="orders">去接一份委托 →</button><button class="text-button" data-action="clue-board">更换目标</button></section>`;

    return `<section class="clue-trail clue-priority" aria-label="追踪中的旅行线索"><div>${icon(clue.key)}<span><small>这一趟，为它出发</small><b>${t.name}</b><small>${G.CITIES[t.city].name} · ${t.place==='market'?'集市':'城外'}${t.place==='wild'&&!G.mapUnlocked(state,t.city)?` · 第 ${t.city+1} 程开放地图`:''}</small></span><strong>${clue.attempts}/3</strong></div><ol class="clue-footsteps" aria-label="已完成 ${clue.attempts} 次对应寻访">${[0,1,2].map(n=>`<li class="${n<clue.attempts?'found':''}">${n<clue.attempts?'✓':n+1}</li>`).join('')}<li class="clue-goal">${icon(clue.key)}</li></ol><p>再寻访对应地点 ${3-clue.attempts} 次，最迟就能找到。${local&&!G.canExplore(state)?'本站机会已用完，下一次抵达再继续。':'其他地点不消耗追踪进度。'}</p><div class="clue-actions"><button class="primary" data-action="clue-route">${local?'查看当地寻访':'规划前往 '+G.CITIES[t.city].name} →</button><button class="text-button" data-action="clue-board">更换目标</button></div></section>`;
  }
  function showClues() {
    const missing=Object.entries(G.TREASURES).filter(([key])=>!state.collection.treasures.includes(key));
    const cities=[state.city,...[0,1,2].filter(n=>n!==state.city)];
    openDialog(`<section class="clue-board"><span class="eyebrow">把期待写进旅行手记</span><h2 id="dialog-title">下一件，想找什么？</h2><p class="dialog-copy">寻访珍藏最多三次对应寻访找到；委托奇遇须带齐合格货物，按时前往委托目的地。追踪免费，不会绕过发现条件。</p>${missing.length?cities.map(city=>{const list=missing.filter(([,t])=>t.city===city);return `<section class="clue-city"><h3>${G.CITIES[city].name}<small>${city===state.city?'就在这里 · ':''}${list.length?`还缺 ${list.length} 件`:'已集齐 ✓'}</small></h3><div class="clue-targets">${list.map(([key,t])=>`<button data-action="track-clue" data-value="${key}" aria-pressed="${state.collection.trail.clue?.key===key}" ${state.phase==='market'?'':'disabled'}><span class="clue-target-art">${icon(key)}</span><b>${t.name}</b><small>${G.isCommissionTreasure(key)?'委托路途事件':t.place==='market'?'集市寻访':G.EXPLORE_MAPS[t.city].name}${!G.isCommissionTreasure(key)&&t.place==='wild'&&!G.mapUnlocked(state,t.city)?` · 第 ${t.city+1} 程开放地图`:''}</small><em>${state.collection.trail.clue?.key===key?'正在追踪 ✓':'追踪这件 →'}</em></button>`).join('')}</div></section>`;}).join(''):'<p class="collection-reward">你已集齐所有地方珍藏。去营地看看老朋友吧。</p>'}<button class="secondary full" data-action="close">合上旅行手记</button></section>`);
  }
  function visitorHTML() {
    const v=G.VISITORS[state.city],status=G.visitorStatus(state);
    return `<button class="visitor-invite ${status.ready?'ready':''}" data-action="visitor-info">${icon(v.icon)}<span><b>${v.name} · ${v.role}</b><small>${status.hint}</small></span><strong>${status.stage===3?'明信片 ✓':status.ready?'来客等你 ↗':`${status.stage}/3`}</strong></button>`;
  }
  function showVisitor(result=null) {
    const v=G.VISITORS[state.city],status=G.visitorStatus(state),chapter=v.chapters[Math.min(2,status.stage)];
    openDialog(`<div class="collection-reveal visitor-reveal">${icon(v.icon)}<span>${v.role} · ${v.name}</span></div><span class="eyebrow">${status.stage===3?'来自老朋友的明信片':`营地来客 · 第 ${status.stage+1} 次相逢`}</span><h2 id="dialog-title">${result?.postcard?v.card:result?'下次路过，再来坐坐':status.stage===3?v.card:chapter[0]}</h2><p class="dialog-copy">${result?result.postcard?v.chapters[2][1]:'这段旅途已经写进了你们共同的记忆。下一次新的寻访后，带着更多当地珍藏和营地故事，再来见面吧。':status.ready||status.stage===3?chapter[1]:status.hint+'。他会记得这次约定。'}</p>${result?`<p class="collection-reward">纪念章 +${result.reward}${result.postcard?' · 明信片已挂进营地，重新启程也会保留。':''}</p>`:status.ready?`<button class="primary full" data-action="visitor-talk" data-value="${state.city}:${status.stage}">${chapter[2]}</button>`:''}<button class="secondary full" data-action="close">回到营地</button>`);
  }
  function keepsakeHTML() {
    const c=state.collection,entries=Object.entries(G.KEEPSAKES);
    const pending=entries.filter(([key])=>!c.claimed.includes(key));
    const next=pending.find(([key,g])=>G.keepsakeProgress(state,key)===g.target)||pending[0];
    const card=([key,g])=>{
      const count=G.keepsakeProgress(state,key),claimed=c.claimed.includes(key),ready=count===g.target;
      const pieces=Object.keys(G.TREASURES).filter(k=>g.city===undefined||G.TREASURES[k].city===g.city);
      return `<article class="keepsake-card ${ready?'ready':''} ${claimed?'claimed':''}"><div class="keepsake-title">${icon(g.icon)}<span><b>${g.name}</b><small>${g.city!==undefined?`${G.CITIES[g.city].name} · 当地寻访 3 件 · 委托奇遇 1 件`:key==='friend'?'集齐 3 件不同珍藏，小猫自动入住':`收集 ${g.target} 件不同珍藏`}</small></span><strong>${count}/${g.target}</strong></div>${g.city!==undefined?`<div class="set-pieces" aria-label="套组藏品进度">${pieces.map(k=>`<span class="${c.treasures.includes(k)?'found':''}" title="${c.treasures.includes(k)?G.TREASURES[k].name:`${G.TREASURES[k].place==='market'?'集市':'城外'} · ${G.TREASURES[k].rare?'稀有':'普通'}`}">${c.treasures.includes(k)?icon(k):'?'}</span>`).join('')}</div>`:''}<div class="keepsake-reward"><span>✦ ${g.reward} 枚纪念章</span><button class="secondary" data-action="claim-keepsake" data-value="${key}" aria-label="领取${g.name}奖励" ${ready&&!claimed&&state.phase==='market'?'':'disabled'}>${claimed?'已收藏纪念':ready?'领取奖励':'继续发现'}</button></div></article>`;
    };
    return `<section class="keepsake-board" aria-label="收藏心愿"><div class="keepsake-heading"><b>${next?'下一份小心愿':'所有心愿已完成'}</b><span>${c.claimed.length}/${entries.length} 已领奖</span></div>${next?card(next):'<p class="album-complete">✦ 三座城的风景，都留在了你的营地。</p>'}<details><summary>三城套组与全部心愿</summary><div class="keepsake-grid">${entries.filter(([key])=>key!==next?.[0]).map(card).join('')}</div></details></section>`;
  }
  function catHTML() {
    const level=G.catLevel(state),c=state.collection;
    if(!level)return `<div class="cat-locked">${icon('cat')}<span>留一个位置，等一位小伙伴<small>再发现 ${3-c.treasures.length} 件不同珍藏，小猫就会入住。</small></span></div>`;
    return `<button class="cat-status" data-action="cat-info">${icon('cat')}<span><b>麦芽 · ${['','初次相伴','熟悉的朋友','安心的家人'][level]}</b><small>${level===3?'围巾与软垫都在，回来坐坐吧。':`陪伴 ${c.catBond}/${level===1?3:6} 次 · ${level===1?'解锁旅行围巾':'解锁专属软垫'}`}</small></span><strong>${G.canPetCat(state)?'陪伴 ♥':'等下次见闻'}</strong></button>`;
  }
  function showCat(petted=false,oldLevel=G.catLevel(state)) {
    const level=G.catLevel(state);if(!level)return;
    const upgraded=level>oldLevel;
    const message=upgraded?(level===2?'麦芽终于愿意戴上你的小围巾。以后每次回来，都能认出这位老朋友。':'麦芽在新软垫上蜷成一团，把这里当成了安心的家。'):petted?['麦芽把脑袋轻轻靠过来，呼噜声盖过了远处的风声。','你把今天的见闻讲给麦芽听，它认真地晃了晃尾巴。','麦芽蹭了蹭你的手，然后安静地陪你看了一会儿天空。'][state.collection.searches%3]:'它循着旅途纪念品的气味来到营地，决定在这里住下来。';
    openDialog(`<div class="collection-reveal cat-reveal ${petted?'petted':''}">${icon('cat')}<span>${petted?'♥  呼噜，呼噜  ♥':'营地的新家人'}</span></div><span class="eyebrow">麦芽 · ${['','初次相伴','熟悉的朋友','安心的家人'][level]}</span><h2 id="dialog-title">${upgraded?level===2?'一条属于麦芽的围巾':'终于有了自己的小窝':petted?'今天也辛苦啦':'回来啦，旅行家'}</h2><p class="dialog-copy">${message}</p><p class="collection-reward">${level===3?'成长已完成，之后仍可回来陪伴。':`已陪伴 ${state.collection.catBond} 次；3 次获得围巾，6 次获得软垫。`}<br>每完成一次新的寻访，可陪伴一次；不消耗物资，离开多久也不会掉好感。</p><button class="primary full" data-action="pet-cat" ${G.canPetCat(state)?'':'disabled'}>${G.canPetCat(state)?'摸摸麦芽，分享见闻':'下次寻访后再来陪它'}</button><button class="secondary full" data-action="close">回到营地</button>`);
  }
  function albumHTML(group) {
    const source=group==='goods'?G.GOODS:G.TREASURES, owned=state.collection[group];
    return `<div class="album-grid">${Object.entries(source).map(([key,item])=>{const found=owned.includes(key);return `<button class="album-card ${found?'found':'undiscovered'} ${item.rare?'rare':''}" data-action="collection-item" data-value="${group}:${key}" aria-label="${found?item.name:'未发现藏品'}，${group==='goods'?'货物':`${G.CITIES[item.city].name} · ${item.rare?'稀有':'普通'}`}">${found?icon(key):'<span class="unknown-art">?</span>'}<b>${found?item.name:group==='goods'?'待登记':`${G.CITIES[item.city].name}珍藏`}</b><small>${group==='goods'?(found?'已登记':'实际拥有后解锁'):`${G.isCommissionTreasure(key)?'委托奇遇':item.place==='market'?'集市':'寻宝地图'} · 实物 ${G.treasureCount(state.collection,key)} 件`}</small>${state.collection.favorite===key?'<em>营地展示中</em>':''}</button>`;}).join('')}</div>`;
  }
  function decorHTML() {
    const c=state.collection,level=G.collectionLevel(state),enabled=state.phase==='market';
    return `<div class="decor-grid">${Object.entries(G.DECOR).map(([key,d])=>{const owned=c.owned.includes(key),placed=c.placed[d.slot]===key;return `<article class="decor-card ${placed?'placed':''}">${icon(key)}<h3>${d.name}</h3><small>${key==='flowerbed'?'解锁 1 处花圃 · ':key==='greenhouse'?'花圃扩为 3 处 · ':key==='showcase'?'解锁主题展 · ':''}${{tent:'篷帐',banner:'旗饰',ground:'地面',garden:'庭院',display:'展台'}[d.slot]} · 收藏 Lv.${d.level}</small><button class="secondary" data-action="${owned?'place-decor':'buy-decor'}" data-value="${key}" aria-label="${owned?(placed?'收起':'布置'):'换取'}${d.name}${owned?'':`，${G.decorCost(state,key)} 枚纪念章`}" ${enabled&&(owned||level>=d.level&&c.stamps>=G.decorCost(state,key))?'':'disabled'}>${owned?placed?'收起装饰':'摆到营地':level<d.level?`Lv.${d.level} 解锁`:`${G.decorCost(state,key)} 章 · 换取并布置`}</button></article>`;}).join('')}</div>`;
  }
  let treasureFilter='all',treasureReturn='shop',treasureShopScroll=0;
  function treasureSource(key){const t=G.TREASURES[key];return G.isCommissionTreasure(key)?`委托路途事件 · 前往${G.CITIES[t.city].name}`:t.place==='wild'?`${G.EXPLORE_MAPS[t.city].name} · 寻访`:`${G.CITIES[t.city].name} · ${t.rare?'集市或寻宝地图':'集市寻访'}`;} 
  function showTreasureShop(keepScroll=false){
    const c=state.collection,enabled=state.phase==='market'&&state.challenge?.status!=='active';
    const keys=Object.keys(G.TREASURES).filter(k=>treasureFilter==='all'||treasureFilter==='owned'&&G.treasureCount(c,k)>0||treasureFilter==='event'&&G.isCommissionTreasure(k)||String(G.TREASURES[k].city)===treasureFilter);
    openDialog(`<div class="treasure-shop"><header class="treasure-shop-head"><div><span class="eyebrow">把生意，变成生活里的小欢喜</span><h2 id="dialog-title">远方珍藏小铺</h2></div><button class="secondary" data-action="close">返回</button></header><div class="treasure-wallet"><span>${icon('coin')}<b>${state.gold}<small>金币 · 经营 / 普通珍藏</small></b></span><span>${icon('compass')}<b>${c.stamps}<small>纪念章 · 珍藏 / 营地</small></b></span></div><nav class="treasure-filters" aria-label="珍藏筛选">${[['all','全部'],['0','柳溪'],['1','松湾'],['2','金穗'],['event','委托奇遇'],['owned','我的实物']].map(([key,label])=>`<button class="secondary" data-action="treasure-filter" data-value="${key}" aria-pressed="${treasureFilter===key}">${label}</button>`).join('')}</nav><div class="treasure-shop-grid">${keys.map(key=>{const t=G.TREASURES[key],offer=G.treasureOffer(state,key),count=G.treasureCount(c,key),room=count<G.TREASURE_LIMIT,canBuy=enabled&&!offer.locked&&room;return `<article class="treasure-product ${t.rare?'rare':''}" data-treasure="${key}"><button class="treasure-product-art" data-action="treasure-view" data-value="${key}:shop">${icon(key)}<span>${offer.locked?'未发现 · 委托奇遇':t.rare?'特色珍藏 ✦':'旅途小物'}</span></button><h3>${t.name}<small>实物 × ${count}</small></h3><p>${treasureSource(key)}</p>${offer.locked?'<div class="treasure-locked">先在委托途中发现<br><small>发现后开放纪念章兑换</small></div>':`<div class="treasure-purchase">${offer.gold!==null?`<button class="secondary" data-action="treasure-buy" data-value="${key}:gold:${count}" ${canBuy&&state.gold>=offer.gold+G.travelCost(state,'trail')?'':'disabled'}>${offer.gold} 金币购买</button>`:''}<button class="primary" data-action="treasure-buy" data-value="${key}:stamps:${count}" ${canBuy&&c.stamps>=offer.stamps?'':'disabled'}>${offer.stamps} 章兑换</button></div>`}<button class="text-button full" data-action="treasure-sell" data-value="${key}:${count}" ${enabled&&count>0?'':'disabled'}>出售一件 · 得 ${offer.sell} 章</button><button class="text-button full" data-action="treasure-view" data-value="${key}:shop">${offer.locked?'查看发现线索':'拿起来把玩 ↗'}</button></article>`;}).join('')||'<p class="dialog-copy">目前没有实物。图鉴记录仍然保留，可以重新兑换喜欢的藏品。</p>'}</div><details class="treasure-rules"><summary>金币、纪念章与珍藏的流转规则</summary><p>金币来自经商和委托，用于货物、扩容、改装与普通珍藏。纪念章来自见闻、委托、挑战及藏品回收，用于特色珍藏与营地装饰。普通藏品也能用纪念章换；金币购买时自动留够下一次出发的补给。</p><p>委托奇遇藏品必须先发现，之后仅可用纪念章换回。买入价高于回收价；实物最多各 99 件，图鉴与成长永远保留。出售最后一件会撤下相关摆设；交易自动保存。</p></details></div>`,false,true);
    dialog.dataset.panel='treasure-shop';dialog.scrollTop=keepScroll?treasureShopScroll:0;
  }
  function showTreasure(key,origin='album'){
    if(!Object.hasOwn(G.TREASURES,key))return;treasureReturn=origin;
    const t=G.TREASURES[key],c=state.collection,found=c.treasures.includes(key),count=G.treasureCount(c,key),locked=G.treasureOffer(state,key).locked;
    openDialog(`<section class="treasure-view"><span class="eyebrow">${G.CITIES[t.city].name} · ${G.isCommissionTreasure(key)?'委托奇遇':'旅途珍藏'}</span><h2 id="dialog-title">${t.name}</h2>${locked?`<div class="collection-reveal">${icon(key)}</div>`:window.TreasureFX?.html(key)||`<div class="collection-reveal">${icon(key)}</div>`}<p id="treasure-caption" class="treasure-caption" role="status">${locked?'这份故事，要亲自上路才能打开。':t.text}</p><p class="dialog-copy">${treasureSource(key)}${G.isCommissionTreasure(key)?'。带齐合格货物，按时前往委托目的地，每单判定一次。连续三单未遇到后，下一单必遇。':'。商品不按章节上锁；章节开放新的寻宝地图。'}</p><p class="collection-reward">${found?`图鉴已记录 · 当前实物 ${count} 件`:'图鉴尚未记录'}${found&&!count?' · 售出实物不会失去成长':''}</p><div class="dialog-buttons">${!locked?`<button class="primary" data-action="treasure-play" data-value="${key}">${window.TreasureFX?.scenes[key]?.verb||'把玩珍藏'}</button>`:''}${count>0?`<button class="secondary" data-action="favorite-treasure" data-value="${key}" ${state.phase==='market'?'':'disabled'}>摆到纪念台</button>`:''}<button class="secondary" data-action="${origin==='shop'?'treasure-shop-back':'close'}">${origin==='shop'?'返回小铺':'合上这一页'}</button></div></section>`);
    dialog.dataset.panel='treasure-view';
  }
  function confirmTreasureSale(key,count){
    if(!Object.hasOwn(G.TREASURES,key)||count!==G.treasureCount(state.collection,key)||count<1)return;
    openDialog(`<h2 id="dialog-title">出售${G.TREASURES[key].name}？</h2><div class="collection-reveal">${icon(key)}</div><p class="dialog-copy">出售 1 件，获得 <b>${G.TREASURE_PRICES[key].sell} 枚纪念章</b>；卖出后剩余 ${count-1} 件。${count===1?'这是最后一件实物：对应营地摆设会撤下，若它在主题展中，展柜将恢复默认陈列。图鉴、主题徽章、天赋与小猫成长保留。':''}</p><div class="dialog-buttons"><button class="secondary" data-action="treasure-shop-back">留着它</button><button class="primary" data-action="treasure-sell-confirm" data-value="${key}:${count}">确认出售 · +${G.TREASURE_PRICES[key].sell} 章</button></div>`);dialog.dataset.panel='treasure-sale';
  }
  function showExploreMaps(){
    openDialog(`<span class="eyebrow">商路常开，风景随旅程展开</span><h2 id="dialog-title">远方寻宝地图</h2><p class="dialog-copy">第一、二、三程分别开放一张地图。抵达当地后可以寻访，与集市共用每站一次机会。</p><div class="exploration-maps">${G.EXPLORE_MAPS.map((m,city)=>`<button class="exploration-map city-${city} ${G.mapUnlocked(state,city)?'':'locked'}" data-action="explore-map" data-value="${city}" ${G.mapUnlocked(state,city)?'':'disabled'}><span><small>${G.mapUnlocked(state,city)?city===state.city?'你在这里':'已开放':`第 ${m.chapter} 程开放`}</small><b>${m.name}</b><em>${Object.entries(G.TREASURES).filter(([k,t])=>t.city===city&&!G.isCommissionTreasure(k)&&(t.place==='wild'||t.rare)).map(([,t])=>t.name).join(' · ')}</em></span></button>`).join('')}</div><button class="secondary full" data-action="close">返回</button>`,false,true);
    dialog.dataset.panel='explore-maps';
  }
  function showExploreMap(city){
    const m=G.EXPLORE_MAPS[city];if(!m||!G.mapUnlocked(state,city))return;
    openDialog(`<div class="discovery-map city-${city}"><header><span class="eyebrow">第 ${m.chapter} 程 · ${G.CITIES[city].name}</span><h2 id="dialog-title">${m.name}</h2></header><button class="discovery-hotspot" data-action="${city===state.city?'explore':'explore-map-route'}" data-value="${city===state.city?'wild':city}" ${city===state.city&&!G.canExplore(state)?'disabled':''}>${icon(['feather','shell','wheatCrown'][city])}<b>${city!==state.city?'规划前往路线':G.canExplore(state)?'走近看看':'本次已经寻访'}</b><small>${city===state.city?'当地独有珍藏 · 不耗金币与天数':'抵达当地后即可寻访'}</small></button><span class="discovery-wind">✧　　✧　　✧</span></div><div class="dialog-buttons"><button class="secondary" data-action="explore-maps">返回地图册</button><button class="secondary" data-action="close">回到旅途</button></div>`,false,true);
    dialog.dataset.panel='explore-map';
  }

  function showCollectionItem(value) {
    const [group,key]=String(value).split(':'),source=group==='goods'?G.GOODS:group==='treasures'?G.TREASURES:null;
    if(!source||!Object.hasOwn(source,key))return;if(group==='treasures'){showTreasure(key,'album');return;} const item=source[key],found=state.collection[group].includes(key);
    openDialog(`<div class="collection-reveal ${item.rare?'rare':''}">${found?icon(key):'<span class="unknown-art">?</span>'}</div><span class="eyebrow">${group==='goods'?'货物图鉴':`${G.CITIES[item.city].name} · ${item.rare?'稀有珍藏':'旅途纪念'}`}</span><h2 id="dialog-title">${found?item.name:'还有一份惊喜等你发现'}</h2><p class="dialog-copy">${found?(group==='goods'?item.effect:item.text):group==='goods'?'买入并实际装入行囊，即可永久登记；第二程还会开放新商品。':`在${G.CITIES[item.city].name}的${item.place==='market'?'集市':'城外'}寻访有机会发现。${item.place==='wild'?'城外寻访需要收藏 Lv.2。':''}`}</p>${!found&&group==='treasures'?`<p class="collection-reward">${item.city===state.city?'你就在这座城，返回营地选择对应寻访地点即可。':`下一站可以前往${G.CITIES[item.city].name}，${item.place==='market'?'集市':'城外'}还有未发现的珍藏。`}</p>`:''}${found&&group==='treasures'?`<button class="primary full" data-action="favorite-treasure" data-value="${key}" ${state.phase==='market'?'':'disabled'}>放在营地纪念台</button>`:''}<button class="secondary full" data-action="close">合上这一页</button>`);
  }
  function showDiscovery(result) {
    const item=G.TREASURES[result.key];
    openDialog(`<div class="collection-reveal ${result.rare?'rare':''}">${icon(result.key)}<span>${result.rare?'✦ 稀有发现 ✦':'一份旅途小惊喜'}</span></div><span class="eyebrow">${result.isNew?'首次发现 · 永久收藏':`再次遇见 · 纪念章 +${state.collection.talents.includes('salvage')?2:1}`}</span><h2 id="dialog-title">${item.name}</h2><p class="dialog-copy">${item.text}</p><p class="collection-reward">${result.isNew?`已收入珍藏册 · +${(result.rare?3:2)+(state.collection.talents.includes('journal')?1:0)} 枚纪念章`:`重复实物已收好，现有 ${G.treasureCount(state.collection,result.key)} 件；可摆放或在小铺出售。`}</p>${result.isNew&&state.collection.treasures.length===3?'<p class="collection-reward">♥ 小猫麦芽已经来到营地，回家看看它吧。</p>':Object.entries(G.KEEPSAKES).some(([k,g])=>!state.collection.claimed.includes(k)&&G.keepsakeProgress(state,k)===g.target)?'<p class="collection-reward">✦ 一份收藏心愿已经完成，回营地可以领奖。</p>':''}${result.bonus?`<div class="clue-bonus">${icon(result.bonus)}<span><b>顺着线索，还找到了${G.TREASURES[result.bonus].name}</b><small>额外珍藏已入册 · +${G.TREASURES[result.bonus].rare?3:2} 枚纪念章</small></span></div>`:''}<button class="primary full" data-action="treasure-view" data-value="${result.key}:album">把玩这份远方的礼物 ↗</button><button class="secondary full" data-action="close">收好</button>`);
  }
  function routeMapHTML() {
    return `<div class="route-trip-strip" aria-label="${G.CITIES[state.city].name} → ${G.CITIES[destination].name}">${icon('cart')}<span>${G.CITIES[state.city].name}</span><i>··· → ···</i><b>${G.CITIES[destination].name}</b></div>`;
  }
  // Navigation is presentation-only: opening pages never writes game progress.
  function mapDockHTML() {
    return `<nav class="map-dock" aria-label="地图功能入口">${[['inventory','bag','行囊'],['market','coin','集市'],['orders','porcelain','委托'],['home','leaf','营地'],['progress','compass','旅程'],['settings','gear','设置']].map(([pane,symbol,label])=>`<button data-action="pane" data-value="${pane}">${icon(symbol)}<span>${label}</span></button>`).join('')}</nav><div class="map-tools"><button data-action="treasure-shop">${icon('porcelain')}珍藏小铺</button><button data-action="explore-maps">${icon('compass')}寻宝地图</button><button data-action="pane" data-value="${mobilePane==='town'?'map':'town'}">${icon(mobilePane==='town'?'compass':'cart')}${mobilePane==='town'?'世界地图':'进入'+G.CITIES[state.city].name}</button><button data-action="journal" aria-label="打开旅途手记">${icon('book')}手记</button></div>${saveWarning?'<button class="map-save-alert" data-action="save-manager">保存遇到问题 · 打开存档管理</button>':''}`;
  }
  function atlasWorldHTML() {
    return `<section class="atlas-world" aria-label="可交互旅行地图"><header><span class="eyebrow">把下一站，点在地图上</span><h1>山海之间，下一站</h1><p class="atlas-purpose">${state.order?`当前限时订单 · 第 ${state.order.due} 天前交付`:G.isFreeTravel(state)?'下一份远方 · 寻珍藏，探望朋友':'带上行囊，寻找下一笔生意'}</p><span class="atlas-route-pill">${icon(route==='trail'?'mountain':'road')}${route==='trail'?'青脊山径 · 1 天':`河畔官道 · 2 天`}</span></header><div class="atlas-board"><div class="atlas-camera">${window.Art.atlas(state.city,destination,route).replace('<svg ', '<svg preserveAspectRatio="none" ')}${G.CITIES.map((c,n)=>{const [x,y]=window.Art.atlasPoints[n];return `<button class="atlas-city city-${n} ${n===state.city?'here':n===destination?'chosen':''}" data-action="${n===state.city?'pane':'atlas-destination'}" data-value="${n===state.city?'town':n}" style="left:${x/780*100}%;top:${y/500*100}%" aria-label="${n===state.city?'进入当前城镇：':'选择目的地：'}${c.name}" aria-pressed="${n===destination}" ><span class="atlas-city-portrait" aria-hidden="true"></span><b>${c.name}</b><small>${n===state.city?'进入城镇 ↗':n===destination?'下一站 ↗':`${state.collection.treasures.filter(k=>G.TREASURES[k].city===n).length}/4 珍藏`}</small></button>`;}).join('')}</div></div><footer><span><i class="atlas-legend-dot"></i>马车所在</span><span><i class="atlas-legend-line"></i>已选商路</span><span>点城镇准备旅行 · 点当前城镇进城</span></footer></section>`;
  }
  function growthHTML() {
    const c = state.challenge, offered = c?.status === 'offered' && c.origin === 'town' && state.phase === 'market', installed = Object.values(state.mods).filter(Boolean).length;
    return `<section class="growth-strip" aria-label="商队成长与可选挑战"><button class="guild-summary" data-action="guild">${icon('cart')}<span><b>${G.rank(state).name}</b><small>信誉 ${state.reputation} · ${installed} 项改装</small></span><span class="guild-arrow">＋</span></button><div class="challenge-invite"><div class="challenge-tokens" aria-hidden="true">${['compass','porcelain','tea','road','fish'].map(k => icon(k)).join('')}</div><span><b>${offered ? G.CHALLENGES[c.kind].name : '旅途奇遇'}</b><small>${offered ? '启程前，热热身' : '每次出发 65% · 五种挑战'}</small></span>${offered ? '<button class="secondary" data-action="challenge-start">开始</button><button class="text-button" data-action="challenge-skip">略过</button>' : ''}</div></section>`;
  }
  function chapterHTML() {
    if (G.isFreeTravel(state)) return `<section class="chapter-strip free-travel-strip" aria-label="自由旅行行旅证"><div class="travel-pass">${icon("compass")}</div><div><b>商会行旅证 · 自由的远方</b><small>三程已完成 · 免费通行 · 当前会场：${G.CITIES[G.fairCity(state)].name}</small></div><button class="text-button" data-action="pane" data-value="home">回营地看看 ↗</button></section>`;
    const chapter = G.CHAPTERS[state.chapter];
    return `<section class="chapter-strip" aria-label="本程新玩法"><div class="chapter-trail" aria-label="当前第 ${state.chapter} 程">${[1,2,3].map(n => `<span class="${n <= state.chapter ? 'reached' : ''}">${n < state.chapter ? '✓' : n}</span>`).join('')}</div><div><b>${chapter.name}</b><small>${state.chapter === 3 ? `当前会场：${G.CITIES[G.fairCity(state)].name} · 下次抵达时：${G.CITIES[G.fairCity(state, 1)].name}` : `第 ${state.chapter} 程 · 达标后解锁新货与新委托`}</small></div><button class="text-button" data-action="chapters">成长图鉴 ↗</button></section>`;
  }
  function showChapters() {
    openDialog(`<span class="eyebrow">每一程都有新的生意</span><h2 id="dialog-title">商队的远方</h2><div class="chapter-cards">${G.CHAPTERS.slice(1).map((c, n) => `<article class="${state.chapter === n + 1 ? 'current' : ''}"><span>第 ${n + 1} 程 · ${300 * (n + 1)} G${state.chapter === n + 1 ? ' · 当前' : state.chapter > n + 1 ? ' · 已走过' : ' · 待解锁'}</span><h3>${c.name}</h3><p>${c.text}</p></article>`).join('')}</div><div class="new-goods-preview">${['honey', 'wood', 'glass'].map(k => `<div>${icon(k)}<b>${G.GOODS[k].name}</b><small>${G.GOODS[k].w} × ${G.GOODS[k].h} 格</small></div>`).join('')}</div><p class="dialog-fineprint">第二程起每城保留两份熟悉的委托，并加入一份当地新委托。第三程达标后，可领取商会行旅证，继承商队开启自由旅行：没有经营考核期限，路费与补给免费。</p><button class="primary full" data-action="close">继续我的旅程</button>`);
  }
  function showAudio() {
    if (state.challenge?.status === 'active' && state.challenge.kind === 'drive') { drivePaused = true; clearTimeout(driveTimer); }
    if (state.challenge?.status === 'active' && state.challenge.kind === 'fishing') { fishPaused = true; clearTimeout(fishTimer); }
    const settings = audio?.settings() || {enabled: false, volume: 0, supported: false};
    openDialog(`<span class="eyebrow">听见商旅的声音</span><h2 id="dialog-title">声音设置</h2><p class="dialog-copy">购买、金币入袋、马蹄、挑战反馈和改装都有短音效。没有循环背景音乐。</p>${!settings.supported ? '<p class="warning">当前浏览器不支持音效，游戏仍可正常进行。</p>' : ''}<div class="audio-settings"><button class="secondary" data-action="audio-toggle" aria-pressed="${settings.enabled}" ${settings.supported ? '' : 'disabled'}>音效：${settings.enabled ? '开启' : '关闭'}</button><label for="sound-volume">音量 <output>${Math.round(settings.volume * 100)}%</output></label><input id="sound-volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}" aria-label="音效音量" ${settings.supported ? '' : 'disabled'}><button class="secondary" data-action="audio-preview" ${settings.supported && settings.enabled ? '' : 'disabled'}>试听金币声</button></div><p class="dialog-fineprint">设置自动保存；切到后台立即停止音效。动态效果开关独立于声音。</p><button class="primary full" data-action="audio-back">保存并返回</button>`);
  }
  function showGuild() {
    openDialog(`<span class="eyebrow">${G.isFreeTravel(state) ? "自由旅行 · 商会考核已完成" : `第 ${state.chapter} 程 · 目标 ${G.goal(state)} G`}</span><h2 id="dialog-title">让每一趟，走得更远</h2><p class="dialog-copy">${G.rank(state).name} · 信誉 <b>${state.reputation}</b>。交付订单 +2，优秀挑战 +1。信誉 2 开放货舱专长，信誉 6 起每单赏金额外 +8 G。</p><div class="guild-levels"><span class="${state.reputation >= 2 ? 'unlocked' : ''}">2 · 货舱专长</span><span class="${state.reputation >= 6 ? 'unlocked' : ''}">6 · 口碑加价</span></div><div class="mod-cards">${Object.entries(G.MODS).map(([key, mod]) => { const installed = state.mods[key], other = key === 'cold' ? state.mods.padding : key === 'padding' ? state.mods.cold : false; return `<article>${icon(mod.icon)}<div><h3>${mod.name}</h3><p>${mod.text}</p><small>${mod.reputation ? `信誉 ${mod.reputation} 解锁` : '现在即可改装'} · 不占背包格</small></div><button class="secondary" data-action="install-mod" data-value="${key}" ${installed || (G.isFreeTravel(state) && key === 'wheels') || other || state.gold < mod.price || state.reputation < mod.reputation || state.phase !== 'market' ? 'disabled' : ''}>${installed ? '已安装' : G.isFreeTravel(state) && key === 'wheels' ? '行旅证已免路费' : other ? '已选另一专长' : `${mod.price} G 安装`}</button></article>`; }).join('')}</div><p class="dialog-fineprint">货舱专长二选一，本商队内不能更换。改装费用不计入资产估值。每程 12 天，达标结算后可携带资金、货物、信誉和升级进入下一程；三程目标依次为 300 / 600 / 900 G。通关后可领取行旅证，自由旅行不设考核期限、免路费与补给。重新启程会重置经营商队，图鉴与营地会保留。</p><button class="primary full" data-action="close">回到集市</button>`);
  }
  function manualDrive() { return !effectsEnabled || reducedMotion.matches; }
  function showChallenge() { const kind = state.challenge.kind; if (kind === 'drive') { drivePaused = true; showDrive(); } else if (kind === 'appraise') showAppraisal(); else if (kind === 'memory') showMemory(); else if (kind === 'bridge') showBridge(); else { fishPaused = true; showFishing(); } }
  function showDrive() {
    const c = state.challenge, wave = G.driveWave(c);
    openDialog(`<div class="mini-heading"><span class="eyebrow">可选挑战 · 主货物始终安全</span><h2 id="dialog-title">山路驾驶</h2><p>${manualDrive() ? '静态模式：选好车道，再点击「通过这一段」。' : '← / → 或 A / D 换道，也可点击车道按钮。接金币，避开石头。'}</p><div class="drive-score"><span>路段 ${c.step + 1} / ${G.DRIVE_STEPS}</span><span>金币 ${c.coins}</span><span>擦碰 ${c.hits}</span></div></div><div class="drive-track ${drivePaused ? 'drive-paused' : ''} ${manualDrive() ? 'drive-static' : ''}" aria-label="三车道山路"><div class="lane-lines"></div><span class="drive-object rock" style="left:${(wave.rock + .5) / 3 * 100}%" aria-label="${['左', '中', '右'][wave.rock]}车道有石头">${icon('rock')}</span><span class="drive-object pickup" style="left:${(wave.coin + .5) / 3 * 100}%" aria-label="${['左', '中', '右'][wave.coin]}车道有金币">${icon('coin')}</span><div class="driving-car" style="left:${(c.lane + .5) / 3 * 100}%">${window.Art.cartTop()}</div>${drivePaused ? '<div class="drive-pause-cover"><strong>准备好再出发</strong><span>失误只少拿奖励，不扣钱、不掉货。</span><button class="primary" data-action="drive-resume">开始 / 继续驾驶</button></div>' : ''}</div><div class="mini-controls"><div class="lane-buttons">${['左车道', '中车道', '右车道'].map((name, n) => `<button class="secondary" data-action="drive-lane" data-value="${n}" aria-pressed="${n === c.lane}">${name}</button>`).join('')}</div><p class="drive-feedback" role="status">${driveMessage || '每接一枚金币 +2 G，跑完全程另得 6 G。'}</p><div class="mini-bottom">${manualDrive() && !drivePaused ? '<button class="primary" data-action="drive-step">通过这一段 →</button>' : '<button class="secondary" data-action="drive-pause">暂停（Esc）</button>'}<button class="text-button" data-action="audio-settings">声音</button><button class="text-button" data-action="challenge-exit">退出挑战，保留货物</button></div></div>`, true, true);
    if (!drivePaused && !manualDrive()) {
      const step = c.step;
      driveTimer = setTimeout(() => {
        if (state.challenge !== c || c.status !== 'active' || c.step !== step || drivePaused) return;
        if (document.hidden) { drivePaused = true; showDrive(); return; }
        stepDrive();
      }, DRIVE_INTERVAL);
    }
  }
  function steerDrive(lane) {
    if (drivePaused || state.challenge?.status !== 'active' || state.challenge.kind !== 'drive') return;
    G.steer(state, Math.max(0, Math.min(2, lane))); if(!save()){render();showDrive();return;}
    document.querySelector('.driving-car')?.style.setProperty('left', `${(state.challenge.lane + .5) / 3 * 100}%`);
    dialog.querySelectorAll('[data-action="drive-lane"]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.value) === state.challenge.lane)));
  }
  function stepDrive() {
    if (drivePaused || state.challenge?.status !== 'active' || state.challenge.kind !== 'drive') return;
    const c = state.challenge, before = c.hits, coinsBefore = c.coins;
    G.advanceDrive(state); if(!save()){render();showDrive();return;} driveMessage = c.hits > before ? '擦到石头了，车上货物没有损伤。' : c.coins > coinsBefore ? '接住金币！奖励累积 +2 G。' : '平稳通过，再接再厉。';
    sound(c.status === 'done' ? 'success' : c.hits > before ? 'hit' : c.coins > coinsBefore ? 'coin' : 'hoof');
    if (c.status === 'done') { render(); showChallengeResult(); } else { showDrive(); const track = document.querySelector('.drive-track'); if (effectsEnabled && !reducedMotion.matches) track?.classList.add(c.hits > before ? 'drive-impact' : c.coins > coinsBefore ? 'drive-caught' : 'drive-clear'); }
  }
  function showAppraisal(feedback) {
    const c = state.challenge, round = G.appraisalRound(c);
    openDialog(`<div class="mini-heading appraisal-heading"><span class="eyebrow">古物鉴定 · 第 ${feedback ? c.step : c.step + 1} / 3 轮 · 不计时</span><h2 id="dialog-title">哪一件才是商会藏品？</h2><p>同时符合两条线索的才是真品。每轮只能选一次，选错不扣金币。</p></div>${feedback ? `<div class="appraisal-feedback"><h3>${feedback.correct ? '眼力不错，鉴定正确！' : `这次看走眼了，真品是 ${'ABC'[feedback.target]}。`}</h3><p>依据：${feedback.clues.join(' ＋ ')}。下一轮还有机会。</p><button class="primary" data-action="appraise-next">继续鉴定 →</button></div>` : `<div class="appraisal-clues">${round.clues.map((clue, n) => `<span><b>线索 ${n + 1}</b>${clue}</span>`).join('')}</div><div class="antique-candidates">${round.candidates.map((vase, n) => `<button data-action="appraise-pick" data-value="${c.step}:${n}"><span class="antique-letter">${'ABC'[n]}</span>${window.Art.vase(vase)}<span class="antique-details">${Object.keys(G.APPRAISAL_FEATURES).map(k => G.APPRAISAL_FEATURES[k][vase[k]]).join(' · ')}</span><b>选择 ${'ABC'[n]}</b></button>`).join('')}</div>`}<div class="mini-controls"><p class="dialog-fineprint">完成三轮后结算：答对一轮 +8 G，全对另加 8 G；答对至少两轮，信誉 +1。图案下方也有文字说明。</p><button class="text-button" data-action="audio-settings">声音</button><button class="text-button" data-action="challenge-exit">退出挑战，保留货物</button></div>`, true, true);
  }
  function showChallengeResult() {
    const c = state.challenge, result = G.challengeResult(c);
    const summary = c.kind === 'drive' ? `接到 ${c.coins} 枚金币 · 擦碰 ${c.hits} 次` : c.kind === 'appraise' ? `三轮中答对 ${result.correct} 轮` : c.kind === 'memory' ? `配成 ${result.correct} 对货签 · 用了 ${c.step} 次配对` : c.kind === 'bridge' ? result.correct ? '栈桥连通，两岸重新通行！' : '桥面还没有连通，下次再来试试。' : `三次收竿中有 ${result.correct} 次正中鱼群`;
    openDialog(`<div class="challenge-medal">${icon(result.reputation ? 'check' : G.CHALLENGES[c.kind].icon)}</div><div class="scene-interlude-copy"><span class="eyebrow">${G.CHALLENGES[c.kind].name} · 挑战结束</span><h2 id="dialog-title">${result.gold ? '带上收获，继续向前' : '休息够了，再次上路'}</h2><p>${summary} · 原有金币和货物没有损失</p><div class="delivery-receipt"><span>额外收入 <b>+${result.gold} G</b></span><strong>信誉 +${result.reputation}</strong></div><button class="primary" data-action="challenge-return">${state.phase === 'event' ? '继续这段旅途 →' : '回到集市 →'}</button></div>`, true, true);
  }
  function returnFromChallenge() { if (state.phase === 'event') showEvent(); else closeDialog(); }
  function miniFooter(copy) { return `<div class="mini-controls"><p class="dialog-fineprint">${copy} · 不扣原有钱货，不额外耗天数。</p><div class="mini-bottom"><button class="text-button" data-action="audio-settings">声音</button><button class="text-button" data-action="challenge-exit">退出挑战，继续赶路</button></div></div>`; }
  function showChallengeOffer() {
    const c = state.challenge, meta = G.CHALLENGES[c.kind];
    openDialog(`<div class="encounter-banner encounter-${c.kind}"><div class="encounter-orbit">${icon(meta.icon)}</div><span>旅途奇遇</span><div class="encounter-dots">✧ · ✧ · ✧</div></div><div class="encounter-copy"><span class="eyebrow">前往${G.CITIES[state.event.destination].name}的路上 · 第 ${state.day} 天</span><h2 id="dialog-title">${meta.name}</h2><p class="dialog-copy">${meta.intro}</p><p class="challenge-spec">${meta.detail} · 奖励最高 ${c.kind === 'fishing' || c.kind === 'drive' ? 36 : 32} G</p><p class="dialog-fineprint">自愿参加，不额外花费天数。失误不扣原有钱货；中途退出不发未结算奖励。之后继续原本的旅途事件。</p><div class="dialog-buttons"><button class="secondary" data-action="challenge-skip">直接继续赶路</button><button class="primary" data-action="challenge-start">试试这个挑战 →</button></div></div>`, true, true);
  }
  function showMemory() {
    const c = state.challenge, deck = G.memoryDeck(c), matched = G.memoryMatched(c), names = ['春茶', '鲜鱼', '苹果', '风灯'], symbols = ['tea', 'fish', 'fruit', 'lantern'];
    const pair = c.review ? c.answers.slice(-2) : [], hit = pair.length && deck[pair[0]] === deck[pair[1]];
    openDialog(`<div class="mini-heading"><span class="eyebrow">营地翻牌 · 记忆挑战</span><h2 id="dialog-title">把成对的货签找回来</h2><p>一次翻开两张，记住位置，再找相同的图案。</p><div class="drive-score"><span>已配 ${matched.length / 2} / 4 对</span><span>剩余 ${8 - c.step} 次配对</span></div></div><div class="memory-table">${deck.map((value, index) => { const visible = matched.includes(index) || c.open === index || pair.includes(index); return `<button class="memory-card ${visible ? 'revealed' : ''} ${matched.includes(index) ? 'paired' : ''}" data-action="memory-pick" data-value="${c.step}:${index}" aria-label="第 ${index + 1} 张货签${visible ? `：${names[value]}` : '，未翻开'}" ${matched.includes(index) || c.open === index || c.review ? 'disabled' : ''}>${visible ? `${icon(symbols[value])}<span>${names[value]}</span>` : `<span class="card-back">${icon('leafSeal')}</span><small>${index + 1}</small>`}</button>`; }).join('')}</div><div class="mini-controls memory-feedback" role="status">${c.review ? `<p>${hit ? '配成一对！这两张会留在桌面上。' : '这两张不同，记住位置，再试一次。'}</p><button class="secondary" data-action="memory-next">继续翻牌 →</button>` : `<p>${c.open === null ? '先翻开一张货签。' : '再选一张，看看是否相同。'}</p>`}</div>${miniFooter('完成后每对 +6 G，全配齐再 +8 G、信誉 +1')}`, true, true);
  }
  function showBridge() {
    const c = state.challenge, path = G.bridgePath(c), solved = G.bridgeSolved(c);
    openDialog(`<div class="mini-heading"><span class="eyebrow">修桥铺路 · 旋转拼图</span><h2 id="dialog-title">接起两岸的栈桥</h2><p>点击桥板顺时针转动。发亮的桥板与左岸相连；接通右岸后提交。</p><div class="drive-score"><span>剩余旋转 ${16 - c.step} 次</span><span>${solved ? '已连通右岸！' : '寻找一条相连的道路'}</span></div></div><div class="bridge-scene"><span class="bridge-bank bank-left">入口 →</span><div class="bridge-grid">${Array.from({length: 9}, (_, index) => { const mask = G.bridgeMask(c, index), directions = [[1,'上','M50 50V0'],[2,'右','M50 50H100'],[4,'下','M50 50V100'],[8,'左','M50 50H0']].filter(([bit]) => mask & bit); return `<button class="bridge-tile ${path.includes(index) ? 'connected' : ''}" data-action="bridge-turn" data-value="${c.step}:${index}" aria-label="第 ${Math.floor(index / 3) + 1} 行第 ${index % 3 + 1} 列，连接${directions.map(d => d[1]).join('和')}，点击顺时针旋转"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="bridge-wood-${c.step}-${index}" width="100" height="100" patternUnits="userSpaceOnUse"><image href="assets/paint-table-024.png" width="100" height="100"/></pattern></defs>${directions.map(d => `<path d="${d[2]}" style="stroke:url(#bridge-wood-${c.step}-${index})"/>`).join('')}<circle cx="50" cy="50" r="12"/></svg></button>`; }).join('')}</div><span class="bridge-bank bank-right">→ 出口</span></div><div class="bridge-submit"><button class="${solved ? 'primary' : 'secondary'}" data-action="bridge-submit">${solved ? '桥已连通，领取奖励 →' : '提交当前桥面并结束'}</button></div>${miniFooter('连通后 +32 G、信誉 +1；未连通也能继续原路线')}`, true, true);
  }
  function showFishing() {
    const c = state.challenge, target = G.fishingTarget(c), pos = G.fishingPosition(c), manual = manualDrive();
    openDialog(`<div class="mini-heading"><span class="eyebrow">河边钓鱼 · 第 ${c.step + 1} / 3 竿</span><h2 id="dialog-title">等鱼漂游进绿色区域</h2><p>${manual ? '静态模式：观察绿色鱼群所在水层，选择浅、中、深水，再收竿。' : '点击开始后鱼漂来回游动，进入绿色区域时点击收竿或按空格。每竿最多 9.6 秒，可暂停。'}</p></div><div class="fishing-pond"><div class="pond-reeds"></div><div class="pond-fish">${icon('fish')}${icon('fish')}</div><div class="pond-float">●<i></i></div><span class="pond-caption">浅水 · 中水 · 深水</span></div><div class="fishing-zone"><div class="fishing-track" role="img" aria-label="鱼群在${{5:'浅水',10:'中水',15:'深水'}[target]}区"><span class="fish-target" style="left:${(target - 2) * 5}%;width:20%"></span><span class="fish-marker" style="left:${pos * 5}%"></span></div><div class="fishing-labels"><span>浅水</span><span>中水</span><span>深水</span></div></div><div class="mini-controls"><p class="fish-status" role="status">${fishPaused ? '准备好再开始，三次收竿后统一结算。' : manual ? '选好水层，再收竿。' : `剩余 ${Math.ceil((80 - c.ticks) * .12)} 秒`}</p>${fishPaused ? '<button class="primary full" data-action="fish-resume">开始 / 继续垂钓</button>' : `${manual ? `<div class="depth-buttons">${[[5,'浅水'],[10,'中水'],[15,'深水']].map(([value,label]) => `<button class="secondary" data-action="fish-depth" data-value="${value}" aria-pressed="${pos === value}">${label}</button>`).join('')}</div>` : ''}<div class="dialog-buttons"><button class="secondary" data-action="fish-pause">暂停</button><button class="primary" data-action="fish-cast" data-value="${c.step}">收竿！</button></div>`}<p class="fish-history">已收竿 ${c.step} / 3 · ${c.answers.map((p, step) => p < 0 ? '等待超时' : Math.abs(p - G.fishingTarget({...c, step})) <= 2 ? '正中鱼群' : Math.abs(p - G.fishingTarget({...c, step})) <= 4 ? '小有收获' : '空竿').join(' · ') || '鱼群正等着你'}</p></div>${miniFooter('正中鱼群每竿 +10 G，附近 +5 G，全中另 +6 G；至少两次正中信誉 +1')}`, true, true);
    if (!fishPaused && !manual) scheduleFish();
  }
  function scheduleFish() {
    const c = state.challenge, step = c.step;
    fishTimer = setTimeout(() => {
      if (state.challenge !== c || c.status !== 'active' || c.step !== step || fishPaused) return;
      if (document.hidden) { fishPaused = true; showFishing(); return; }
      G.tickFishing(state);
      if (c.step !== step) { if(!save()){render();showFishing();return;} render(); fishPaused = true; sound('wrong'); if (c.status === 'done') showChallengeResult(); else showFishing(); return; }
      document.querySelector('.fish-marker')?.style.setProperty('left', `${G.fishingPosition(c) * 5}%`);
      const status = document.querySelector('.fish-status'); if (status) status.textContent = `剩余 ${Math.ceil((80 - c.ticks) * .12)} 秒`;
      scheduleFish();
    }, 120);
  }
  function fishingCast(expectedStep) {
    if (fishPaused || state.challenge?.kind !== 'fishing' || state.challenge.status !== 'active') return;
    const before = G.fishingPosition(state.challenge), target = G.fishingTarget(state.challenge);
    if (act(() => G.castFishing(state, expectedStep))) { fishPaused = true; sound(Math.abs(before - target) <= 4 ? 'coin' : 'wrong'); if (state.challenge.status === 'done') showChallengeResult(); else showFishing(); }
  }
  document.addEventListener('visibilitychange', () => { document.body.classList.toggle('page-hidden', document.hidden);if(document.hidden)homeUI?.stop();else homeUI?.bind(mobilePane==='home'&&!atTitle&&!dialog.open); if (document.hidden) { audio?.stop(); if (state.challenge?.status === 'active') { if (state.challenge.kind === 'drive') { drivePaused = true; showDrive(); } else if (state.challenge.kind === 'fishing') { fishPaused = true; showFishing(); } } } });
  document.addEventListener('input', e => {
    if(e.target.dataset?.potteryRange!==undefined&&dialog.open&&dialog.dataset.panel==='pottery'){shapePottery(Number(e.target.dataset.potteryRange),Number(e.target.value));return;}
    if (e.target.id !== 'sound-volume') return;
    audio?.setVolume(Number(e.target.value) / 100);
    const output = document.querySelector('.audio-settings output'); if (output) output.textContent = `${Math.round((audio?.settings().volume || 0) * 100)}%`;
  });
  function orderRequirement(o) { const t = G.ORDER_TYPES[o.type]; return `${G.GOODS[t.kind].name} × ${o.quantity} · 品质 ≥ ${Math.round(t.quality * 100)}%${t.rule === 'scent' ? ' · 每份贴着香料' : t.rule === 'padded' ? ' · 每只贴着绸缎' : t.rule === 'herbal' ? ' · 每罐贴着药草' : t.rule === 'lit' ? ' · 每盏贴着风灯' : ''}`; }
  function ordersHTML() {
    if (state.order) {
      const o = state.order, t = G.ORDER_TYPES[o.type], status = G.orderStatus(state);
      return `<section class="orders-section active-order" aria-label="当前限时订单"><div class="order-art">${icon(t.kind)}</div><div class="active-order-copy"><span class="eyebrow">正在运送 · ${G.CITIES[t.city].name} · 第 ${o.due} 天前（含当天）</span><h2>${t.title}<span class="order-reward">赏金 +${G.orderBonus(state, o)} G</span></h2><p>${orderRequirement(o)}</p><details class="order-details"><summary>装载提示</summary><small>${t.hint}</small></details></div><p class="commission-note">委托奇遇：带齐合格货物按时前往目的地，有 ${G.commissionChance(state)}% 概率遇见专属珍藏。连续未遇 ${state.collection.commissionMisses||0}/3 单；每单一次判定，不额外耗时。</p><div class="delivery-controls"><b>${status.text}</b><button class="primary" data-action="deliver" ${status.ready ? '' : 'disabled'}>整单交付 →</button><button class="text-button" data-action="abandon">放弃订单，保留货物</button></div></section>`;
    }
    if (state.orderTaken || !state.board.length) return `<section class="orders-section order-empty"><h2>${state.orderTaken ? '这一单告一段落。' : '今天不再收新订单。'}</h2><p>${state.orderTaken ? '继续自由贸易，下一次抵达城镇后会出现三份新订单。' : '处理剩余货物，结算本次商旅。'} 已完成 ${state.completedOrders} 单。</p></section>`;
    return `<section class="orders-section" aria-label="三选一订单板"><div class="orders-heading"><div><span class="eyebrow">商会悬赏</span><h2>挑一份远方的委托</h2></div><span>每站一份 · 完成更多委托，奇遇概率更高</span></div><div class="order-cards">${[...state.board].sort((a, b) => Number(!!G.ORDER_TYPES[b.type].chapter) - Number(!!G.ORDER_TYPES[a.type].chapter)).map(o => { const t = G.ORDER_TYPES[o.type]; return `<article class="order-card"><div class="order-card-top">${icon(t.kind)}<span class="order-deadline ${o.due - state.day === 1 ? 'urgent' : ''}">${o.due - state.day === 1 ? '急件 · ' : ''}${o.due - state.day} 天内</span><span class="order-reward">+${G.orderBonus(state, o)} G</span></div><h3>${t.title}<span>→ ${G.CITIES[t.city].name}</span></h3><div class="order-cargo">${icon(t.kind)}<strong>× ${o.quantity}</strong><span>${G.CITIES[t.city].name}<small>${o.due - state.day} 天内送达</small></span></div><details class="order-details"><summary>交付条件 · 品质 ≥ ${Math.round(t.quality * 100)}%</summary><p>${orderRequirement(o)}</p><small>${t.hint}</small></details><button class="secondary" data-action="accept" data-value="${o.id}">接下「${t.title}」 →</button></article>`; }).join('')}</div></section>`;
  }
  function itemHTML(i) { const g = G.GOODS[i.kind], [w, h] = G.dimensions(i); const linked = G.combo(state, i) || G.protectedCargo(state, i);
    return `<button class="bag-item ${g.color} ${selected === i.id ? 'selected' : ''} ${linked ? 'linked' : ''}" draggable="true" data-item="${i.id}" style="grid-column:${i.x + 1} / span ${w};grid-row:${i.y + 1} / span ${h}" aria-label="${g.name}，品质${Math.round(i.quality * 100)}%，售价${G.salePrice(state, i)}金币" title="${g.name}：${g.effect}">${linked ? '<span class="link-badge" title="组合或改装保护生效">✧</span>' : ''}${icon(i.kind)}${w > 1 || h > 1 ? `<span class="item-label">${g.name}</span>` : ''}${i.quality < 1 ? `<span class="quality">${Math.round(i.quality * 100)}%</span>` : ''}</button>`;
  }
  function synergyText() { const linked = state.items.filter(i => G.combo(state, i) || G.protectedCargo(state, i)).length; return linked ? `<b>${linked} 件物品的组合或保护已生效</b> · 发光边框表示加成或保护有效` : '<b>摆在一起，会有好事发生。</b> 香料 + 茶叶，冰晶 + 鲜鱼'; }
  function inspectorHTML() { const i = selectedItem(); if (!i) return `<div class="inspector-placeholder">${icon('bag')}<div><b>你的下一笔好生意，藏在行囊里。</b><p>点击一件物品，查看用途、组合效果与当地售价。</p></div></div>`;
    const g = G.GOODS[i.kind]; return `<div class="inspector-top"><span class="inspect-icon ${g.color}">${icon(i.kind)}</span><div><h3>${g.name}<span>${g.category}</span></h3><p>${g.desc}</p></div></div><p class="effect-text">✧ ${g.effect} <span>品质 ${Math.round(i.quality * 100)}%</span>${state.order && G.ORDER_TYPES[state.order.type].kind === i.kind ? '<br><strong class="warning">这是订单货物；普通出售不计入交付。</strong>' : ''}</p><div class="item-actions"><button class="secondary" data-action="move">${moving ? '取消移动' : '移动'}</button><button class="secondary" data-action="rotate">旋转 <kbd>R</kbd></button><button class="sell-button" data-action="sell">出售 ${coins(G.salePrice(state, i))}</button></div>`;
  }
  function shopHTML(k) {
    const g = G.GOODS[k], price = G.buyPrice(state, k), stock = state.stock[k], affordable = state.gold >= price;
    const badge = g.chapter ? '二程新货' : state.deal.kind === k && !state.deal.used ? '首件7.5折' : (G.CITIES[state.city].mult[k] || 1) < 1 ? '本地特产' : g.category;
    return `<article class="shop-item"><button class="shop-display ${g.color}" data-action="goods-info" data-value="${k}" aria-label="查看${g.name}用途"><span class="local-tag">${badge}</span>${icon(k)}<span class="goods-footprint" aria-label="占 ${g.w} 乘 ${g.h} 格" style="--w:${g.w}">${Array.from({length:g.w*g.h},()=>'<i></i>').join('')}</span></button><div class="shop-info"><h3>${g.name}</h3><span class="stock-count">余 ${stock}</span></div><button class="buy-button" data-action="buy" data-value="${k}" aria-label="购买${g.name}，${price}金币" ${!stock || !affordable ? 'disabled' : ''}>${stock ? coins(price) : '售罄'}<small>${stock ? '＋ 购入' : '等待补货'}</small></button></article>`;
  }
  function showGoods(k) {
    const g = G.GOODS[k]; if (!g) return;
    openDialog(`<div class="goods-detail-art ${g.color}">${icon(k)}</div><span class="eyebrow">${g.category} · 占 ${g.w} × ${g.h} 格</span><h2 id="dialog-title">${g.name}</h2><p class="dialog-copy">${g.desc}</p><p class="goods-rule">✧ ${g.effect}</p><p class="dialog-copy">当前售价 <b>${G.buyPrice(state,k)} G</b> · 剩余 ${state.stock[k]} 件</p><button class="primary full" data-action="close">回到货架</button>`);
  }
  function showEvent() {
    if (G.travelChallengePending(state)) { if (state.challenge.status === 'active') showChallenge(); else showChallengeOffer(); return; }
    const event = G.eventInfo(state);
    openDialog(`<div class="scene-screen">${state.event.commissionFind?window.TreasureFX?.html(state.event.commissionFind)||icon(state.event.commissionFind):scene(state.event.key, { city: state.city, route: state.event.route, items: state.items })}<span class="scene-location">${state.event.route === 'trail' ? '青脊山径' : '河畔官道'} · 第 ${state.day} 天</span></div><div class="encounter-copy"><span class="eyebrow">停下马车，做一个选择</span><h2 id="dialog-title">${event.title}</h2><p class="dialog-copy">${event.text}</p>${state.order ? `<p class="event-order-note">运送「${G.ORDER_TYPES[state.order.type].title}」 · 第 ${state.order.due} 天前交付<br>${orderRequirement(state.order)}</p>` : ''}<div class="event-choices">${event.choices.map(c => `<button data-action="resolve" data-value="${c.id}" ${G.available(state, c) ? '' : 'disabled'}><span class="choice-symbol">${icon(({ 'commission-claim':'compass','commission-leave':'road', guard: 'shield', pay: 'coin', detour: 'road', help: 'herb', water: 'leaf', trade: 'tea', rest: 'leaf', search: 'lantern', leave: 'road', 'barter-sell': 'coin', 'barter-keep': 'bag' })[c.id])}</span><span><b>${c.text}<span>→</span></b><small>${c.detail}</small></span></button>`).join('')}</div><p class="dialog-fineprint">${state.event.commissionFind?'本次奇遇不额外耗时，之后继续原路事件':state.event.key === 'barter' ? `前方还有：${G.EVENTS[state.event.nextKey].title}` : `选择后抵达${G.CITIES[state.event.destination].name}`} · 进度已自动存档</p></div>`, true, true);
  }
  function showFinal() {
    const f=state.final,chapter=state.chapter;
    const chapters=[null,
      {title:'商会执照到手了',badge:'第一枚商会印记',symbol:'cart',next:'下一程 · 匠人与远客',text:'带上执照，去接触新的货物和更讲究的委托。',cards:[['honey','花蜜与药草','邻接搭配的甜香'],['wood','沉香木料','港口的新生意'],['glass','彩釉花灯','用风灯点亮价值']]},
      {title:'商路上，有人记得你',badge:'第二枚商会印记',symbol:'porcelain',next:'下一程 · 巡回商会',text:'商会邀请你追随会场，让熟悉的商队走向更大的集市。',cards:[['compass','会场会移动','每两次抵达轮换'],['coin','会场交单 +15 G','在当前会场交付'],['bag','熟悉的商队','保留资金与改装']]},
      {title:'把远方，走成自己的家',badge:'三程纪念 · 商会行旅证',symbol:'compass',next:'接下来 · 自由的远方',text:'三程考核已完成。领取行旅证，带着整个商队继续收藏、手作和探望朋友。',cards:[['road','自由通行','路费与补给由商会承担'],['leaf','慢慢收集','没有经营考核期限'],['visitorTea','老朋友与家','藏品和营地全部保留']]}
    ],copy=chapters[chapter];
    openDialog(`<section class="journey-finale ${f.success?'achieved':'unfinished'}"><div class="journey-badge">${icon(f.success?copy.symbol:'cart')}<span>${f.success?['','I','II','III'][chapter]:'↻'}</span></div><span class="eyebrow">${f.success?copy.badge:`第 ${chapter} 程 · 暂未达标`}</span><h2 id="dialog-title">${f.success?copy.title:'每段旅途，都有收获'}</h2><ol class="journey-stamps" aria-label="三程进度">${[1,2,3].map(n=>`<li class="${n<chapter||n===chapter&&f.success?'earned':''}"><span>${n<chapter||n===chapter&&f.success?'✓':n}</span><small>${G.CHAPTERS[n].name}</small></li>`).join('')}</ol>${f.success?`<p class="journey-intro">${copy.text}</p><div class="journey-next"><b>${copy.next}</b><div class="journey-unlocks">${copy.cards.map(([symbol,title,text])=>`<div>${icon(symbol)}<strong>${title}</strong><small>${text}</small></div>`).join('')}</div></div>`:`<p class="journey-intro">离本程目标还差 <b>${G.goal(state)-f.total} G</b>。这一程收好的珍藏与营地装饰，会陪你开启新商队。</p>`}<div class="final-stats"><div><small>最终资产</small><b>${f.total}<em> G</em></b></div><div><small>本程路段</small><b>${state.journeys}<em> 段</em></b></div><div><small>累计委托</small><b>${f.contracts}<em> 单</em></b></div></div><p class="journey-carry">${f.success?'资金、货物、信誉、改装与收藏全部保留。':'重新建队会重置经营进度，保留收藏与营地。'}资产含当前城镇货物估值。${chapter===3&&f.success?'自由旅行中的委托期限与货物损耗照常。':''}</p><div class="journey-actions">${f.success?`<button class="primary full" data-action="${chapter===3?'free-travel':'continue-journey'}">${chapter===3?'领取行旅证，继续自由旅行':`保留商队，开启第 ${chapter+1} 程`} →</button>`:''}<button class="${f.success?'text-button':'primary'} full" data-action="restart">重新建立商队</button><button class="text-button full" data-action="view-ended">查看本局行囊与记录</button></div></section>`,true);
  }
  function help() { openDialog(`<span class="eyebrow">给第一次上路的你</span><h2 id="dialog-title">一只行囊，如何走向远方？</h2><p class="dialog-copy">你有 100 金币、18 格背包和几份行李。在第 12 天前，通过贸易与委托让总资产达到 <b>300 金币</b>，取得商会执照。</p><ol class="help-list"><li><b>低价买，高价卖。</b>柳溪买春茶与药草，港口买鲜鱼，金穗买绸缎与陶瓶。从地图进入集市买货，从行囊选择物品出售。</li><li><b>让货物互相照应。</b>上下左右贴边才算相邻；冰晶保护鲜鱼、绸缎保护陶瓶、香料提升茶叶售价。</li><li><b>为每段路留一包口粮。</b>没有口粮需付 8 G。官道较慢但安稳，山路更快但有意外；圆盾和风灯能帮忙。</li><li><b>每次停靠三选一接单。</b>看清期限、品质与装载要求，再买货。在目的地点击「整单交付」，普通出售不算交付。期限包含当天，超时只失去赏金。</li><li><b>途中收购要想清楚。</b>卖出冰晶后，鲜鱼在抵达时会变质；卖盾后，拦路事件就无法举盾通过。路线预告提前给出，可以按风险装货。</li><li><b>歇脚时换换玩法。</b>每次出发有 65% 概率遇见一种挑战：驾驶、鉴定、翻牌、修桥或钓鱼；不会连续遇到同一种。可以略过；中途退出不发挑战奖励，也不扣原有钱货。</li><li><b>让商队逐步成长。</b>订单提升信誉，解锁货舱专长；在「商队成长」花金币改装。达标结算后可以保留商队进入下一程，三程目标为 300 / 600 / 900 G。第二程开放花蜜、香木、彩釉灯；第三程追随巡回商会交单可多拿 15 G。通关后领取行旅证，可继续自由旅行，免路费与补给。自愿接下的委托仍需按时交付。</li></ol><div class="help-tip">操作：拖拽物品整理；也可选中物品后点「移动」，再点目标格。按 R 旋转，Esc 取消选择。进度自动保存，关闭后可继续。</div><button class="secondary full" data-action="guide-show">重新显示操作引导</button><button class="primary full" data-action="close">明白了，开始做生意 →</button>`); }
  function confirmRestart() { openDialog(`<span class="eyebrow">重新开始</span><h2 id="dialog-title">开始一段新的旅程？</h2><p class="dialog-copy">当前旅程会先保留一份专用备份，可在读取存档中找回。金币、订单与商队改装会重新开始；货物图鉴、旅途珍藏、纪念章、营地布置和已学天赋全部保留。你将重新获得 100 金币与初始行李，并从第一程经营考核开始；当前行旅证不会带入新商队。</p><div class="dialog-buttons"><button class="secondary" data-action="close">继续当前旅程</button><button class="primary" data-action="new-game">确认重新启程</button></div>`); }
  function startNew() {
    if(saveWarning){showSaves();return;}
    try{localStorage.setItem('caravan-before-new-v14',saves.pack(state));}catch{toast('未能保存旧旅程备份，本次没有开始新游戏。');return;}
    state=G.fresh(undefined,state.collection);selected=null;destination=1;route='road';filter='全部';moving=false;resetPanes();
    if(!save()){render();showSaves();return;}atTitle=false;closeDialog();render();toast('新的旅途，从柳溪镇开始；旧旅程备份已保留。');
  }
  function handleAction(action, value) {
    if(homeUI?.handle(action,value))return;
    if(action==='treasure-shop'){treasureShopScroll=0;showTreasureShop();return;}
    if(action==='treasure-filter'){if(['all','0','1','2','event','owned'].includes(value))treasureFilter=value;showTreasureShop();return;}
    if(action==='treasure-shop-back'){showTreasureShop(true);return;}
    if(action==='treasure-play'){window.TreasureFX?.play(value);return;}
    if(action==='treasure-view'){const [key,origin]=String(value).split(':');if(origin==='shop')treasureShopScroll=dialog.scrollTop;showTreasure(key,origin);return;}
    if(action==='treasure-buy'){const [key,currency,count]=String(value).split(':');treasureShopScroll=dialog.scrollTop;if(act(()=>G.buyTreasure(state,key,currency,Number(count)),'珍藏已收好，可在营地摆放。')){sound('buy');showTreasureShop(true);}return;}
    if(action==='treasure-sell'){const [key,count]=String(value).split(':');treasureShopScroll=dialog.scrollTop;confirmTreasureSale(key,Number(count));return;}
    if(action==='treasure-sell-confirm'){const [key,count]=String(value).split(':');if(act(()=>G.sellTreasure(state,key,Number(count)),'实物已售出，图鉴和成长记录保留。')){homeUI?.reconcileTreasures();render();sound('coin');showTreasureShop(true);}return;}
    if(action==='explore-maps'){showExploreMaps();return;}
    if(action==='explore-map'){showExploreMap(Number(value));return;}
    if(action==='explore-map-route'){const city=Number(value);if(G.mapUnlocked(state,city)&&city!==state.city){destination=city;closeDialog();openPane('route');render();}return;}

    if(action==='restart'){confirmRestart();return;}
    if(action==='new-game'){startNew();return;}
    if(action==='talents'){showTalents();return;}
    if(action==='talent-learn'){if(act(()=>G.learnTalent(state,value),'天赋已解锁，今后的旅途会生效。'))showTalents();return;}
    if(action==='title-settings'){showTitleSettings();return;}
    if(action==='title-effects'){handleAction('effects');showTitleSettings();return;}
    if(action==='save-before-new'){try{const raw=localStorage.getItem('caravan-before-new-v14');if(raw)previewImport(saves.parse(raw),'新旅途前保留的进度');else toast('还没有新旅途前的备份。');}catch{toast('这份备份无法读取，当前进度未改变。');}return;}
    if(action==='diagnostics'){showDiagnostics();return;}
    if(action==='diagnostic-export'){exportDiagnostics();return;}
    if(action==='save-manager'){showSaves();return;}
    if(action==='save-export'){downloadSave();return;}
    if(action==='save-back'){importSequence++;pendingImport=null;resumeView();return;}
    if(action==='save-backup'){try{const next=saves.backupState();if(next)previewImport(next,'自动备份预览');else toast('没有可用的自动备份。');}catch{toast('暂时无法读取自动备份。');}return;}
    if(action==='save-recover'){previewImport(state,'找到的旧进度');return;}
    if(action==='save-retry'){if(save()){render();showSaves();toast('当前进度已保存。');}else showSaves();return;}
    if(action==='save-confirm'){
      if(!pendingImport)return;
      try{saves.replace(pendingImport);if(saveWarning)diagnostics.record('save-recovered');state=pendingImport;pendingImport=null;importSequence++;savedSnapshot=JSON.stringify(state);saveWarning=false;saveMessage='';selected=null;moving=false;destination=(state.city+1)%3;route='road';atTitle=false;resetPanes();render();resumeView();toast('旅程已恢复，旧进度已保留。');}catch(e){diagnostics.record('import-failed');toast('未能恢复：'+e.message);}return;
    }
    if (action === 'audio-settings') { showAudio(); return; }
    if (action === 'audio-toggle') { audio?.setEnabled(!audio.settings().enabled); showAudio(); return; }
    if (action === 'audio-preview') { sound('coin'); return; }
    if (action === 'audio-back') { if(atTitle){showTitleSettings();return;}if (state.challenge?.status === 'active') showChallenge(); else closeDialog(); return; }
    if (action === 'desktop-menu') { showDesktopMenu();return; }
    if (action === 'desktop-resume') { atTitle=false;resumeView();return; }
    if (action === 'desktop-fullscreen' && window.CaravanDesktop) { window.CaravanDesktop.toggleFullscreen().catch(()=>toast('暂时无法切换全屏，可用 F11 重试。'));return; }
    if (action === 'desktop-quit' && window.CaravanDesktop) { if(save())window.CaravanDesktop.quit().catch(()=>toast('退出失败，可以使用窗口关闭按钮。'));return; }
    if (action === 'skip-scene') { finishScene(); return; }
    if (sceneDone) return;
    if (action === 'challenge-return') { if (state.challenge?.status !== 'active') returnFromChallenge(); return; }
    if (action === 'memory-pick') { const [step, index] = String(value).split(':').map(Number); if (act(() => G.memoryPick(state, index, step))) { sound(state.challenge.review ? 'coin' : 'buy'); if (state.challenge.status === 'done') showChallengeResult(); else showMemory(); } return; }
    if (action === 'memory-next') { if (act(() => G.memoryContinue(state))) showMemory(); return; }
    if (action === 'bridge-turn') { const [step, index] = String(value).split(':').map(Number); if (act(() => G.rotateBridge(state, index, step))) { sound('buy'); if (state.challenge.status === 'done') showChallengeResult(); else showBridge(); } return; }
    if (action === 'bridge-submit') { if (act(() => G.submitBridge(state))) showChallengeResult(); return; }
    if (action === 'fish-resume' && state.challenge?.kind === 'fishing' && state.challenge.status === 'active') { fishPaused = false; showFishing(); return; }
    if (action === 'fish-pause' && state.challenge?.kind === 'fishing' && state.challenge.status === 'active') { fishPaused = true; save(); showFishing(); return; }
    if (action === 'fish-depth' && manualDrive()) { if (act(() => G.setFishingDepth(state, Number(value)))) showFishing(); return; }
    if (action === 'fish-cast') { fishingCast(Number(value)); return; }
    if (action === 'drive-lane') { steerDrive(Number(value)); return; }
    if (action === 'drive-resume' && state.challenge?.status === 'active' && state.challenge.kind === 'drive') { drivePaused = false; showDrive(); return; }
    if (action === 'drive-pause' && state.challenge?.status === 'active' && state.challenge.kind === 'drive') { drivePaused = true; showDrive(); return; }
    if (action === 'drive-step' && manualDrive()) { stepDrive(); return; }
    if (action === 'challenge-exit') { if (act(() => G.skipChallenge(state))) returnFromChallenge(); return; }
    if (action === 'appraise-pick') { let feedback; if (act(() => { const [step, index] = String(value).split(':').map(Number); feedback = G.appraise(state, index, step); })) { sound(feedback.correct ? 'success' : 'wrong'); if (state.challenge.status === 'done') showChallengeResult(); else showAppraisal(feedback); } return; }
    if (action === 'appraise-next' && state.challenge?.status === 'active' && state.challenge.kind === 'appraise') { showAppraisal(); return; }
    if (state.challenge?.status === 'active') { showChallenge(); return; }
    if (action === 'guild') { showGuild(); return; }
    if (action === 'book-tab') { if (['goods','treasures','decor'].includes(value)) { bookTab=value;render(); } return; }
    if (action === 'guide-hide' || action === 'guide-show') { if(act(()=>G.hideGuide(state,action==='guide-hide'))&&action==='guide-show')closeDialog();return; }
    if (action === 'guide-go') { const step=GUIDE_COPY[value];if(step){openPane(step[2]);if(value==='decorate')bookTab='decor';render();document.querySelector('.desk-column')?.scrollIntoView({behavior:'instant',block:'start'});}return; }
    if (action === 'facility-decor') { bookTab='decor';render();document.querySelector('.decor-grid')?.scrollIntoView({behavior:'instant',block:'nearest'});return; }
    if (action === 'garden-plant') { showSeeds(Number(value));return; }
    if (action === 'garden-seed') { const [index,key]=String(value).split(':');if(act(()=>G.plantFlower(state,Number(index),key),'花种已种下，带它看看下一段远方。')){sound('success');closeDialog();}return; }
    if (action === 'garden-info') { toast(`再完成 ${2-G.flowerGrowth(state,Number(value))} 次寻访即可盛开；收起装饰也不会失去花圃。`);return; }
    if (action === 'garden-harvest') { if(act(()=>G.harvestFlower(state,Number(value)),r=>`${G.FLOWERS[r.key].name}盛开了！${r.isNew?'花卉册 +1 · ':''}纪念章 +${r.reward}`))sound('upgrade');return; }
    if (action === 'garden-bouquet') { act(()=>G.chooseBouquet(state,value),'营地换上了你喜欢的花。');return; }
    if (action === 'exhibition-open') { exhibitionDraft=[...state.collection.home.exhibition];showExhibition();return; }
    if (action === 'exhibition-pick') { if(G.treasureCount(state.collection,value)<1)return;if(exhibitionDraft.includes(value))exhibitionDraft=exhibitionDraft.filter(k=>k!==value);else if(exhibitionDraft.length<3)exhibitionDraft.push(value);else toast('先撤下一件，再挑选新的珍藏。');showExhibition();return; }
    if (action === 'exhibition-save') { if(act(()=>G.arrangeExhibition(state,exhibitionDraft),r=>r.first?'主题展完成 · 新徽章与 5 枚纪念章！':'珍藏已经摆进展柜。')){sound('upgrade');closeDialog();}return; }
    if (action === 'cat-info') { showCat();return; }
    if(action==='clue-board'){showClues();return;}
    if(action==='track-clue'){if(act(()=>G.trackClue(state,value),'旅行线索已记下。')){closeDialog();openPane('home');render();}return;}
    if(action==='clue-route'){const clue=state.collection.trail.clue;if(clue){const t=G.TREASURES[clue.key];if(t.city!==state.city){destination=t.city;openPane('route');}else {showCityVisit();return;}render();}return;}
    if(action==='visitor-info'){showVisitor();return;}
    if(action==='visitor-talk'){const [city,stage]=String(value).split(':').map(Number);let result;if(act(()=>{result=G.visitFriend(state,city,stage);})){sound('success');showVisitor(result);}return;}
    if (action === 'pet-cat') { const level=G.catLevel(state);if(act(()=>G.petCat(state))){sound('success');showCat(true,level);}return; }
    if (action === 'claim-keepsake') { let reward;if(act(()=>{reward=G.claimKeepsake(state,value);},'收藏心愿已完成，纪念章已收好。')){sound('success');openDialog(`<div class="collection-reveal rare">${icon(G.KEEPSAKES[value].icon)}<span>✦ 完成收藏心愿 ✦</span></div><h2 id="dialog-title">${G.KEEPSAKES[value].name}</h2><p class="collection-reward">纪念章 +${reward} · 可以去「布置营地」兑换新装饰。</p><button class="primary full" data-action="close">收下这份纪念</button>`);}return; }
    if (action === 'collection-item') { showCollectionItem(value);return; }
    if (action === 'pottery-open') { beginPottery(Object.keys(G.POTTERY_FORMS).find(k=>!G.potteryStatus(state,k).known&&G.potteryStatus(state,k).unlocked)||'bowl');showPottery();return; }
    if (action === 'pottery-form') { if(Object.hasOwn(G.POTTERY_FORMS,value)){beginPottery(value);showPottery();}return; }
    if (action === 'pottery-assist') { if(potteryStage==='shape'&&G.potteryStatus(state,potteryForm).ready){potteryDraft.profile=[...G.POTTERY_FORMS[potteryForm].target];updatePotteryPreview();}return; }
    if (action === 'pottery-next') { if(potteryStage==='shape'&&potteryReady()){potteryStage='decorate';showPottery();}return; }
    if (action === 'pottery-glaze') { if(potteryStage==='decorate'&&Object.hasOwn(G.POTTERY_GLAZES,value)){potteryDraft.glaze=value;showPottery();}return; }
    if (action === 'pottery-pattern') { if(potteryStage==='decorate'&&Object.hasOwn(G.POTTERY_PATTERNS,value)){potteryDraft.pattern=value;showPottery();}return; }
    if (action === 'pottery-review') { if(potteryStage==='decorate'&&potteryReady()){potteryStage='review';potteryReviewOld=JSON.parse(JSON.stringify(state.collection.home.pottery.pieces[potteryForm]));showPottery();}return; }
    if (action === 'pottery-back') { if(potteryStage==='review')potteryStage='decorate';else if(potteryStage==='decorate')potteryStage='shape';showPottery();return; }
    if (action === 'pottery-fire') { if(potteryStage!=='review')return;let result;if(act(()=>{result=G.firePottery(state,potteryForm,potteryDraft,potteryReviewOld);})){potteryStage='result';sound('success');showPottery(result);}return; }
    if (action === 'pottery-display') { act(()=>G.displayPottery(state,value));return; }
    if (action === 'pottery-home') { closeDialog();openPane('home');render();return; }
    if (action === 'sailing-open') { const fleet=state.collection.home.sailing;sailingChart=fleet.voyage?.key||Object.keys(G.SAIL_CHARTS).find(k=>!G.sailingStatus(state,k).known&&G.sailingStatus(state,k).unlocked)||'skiff';sailingHint=false;showSailing();return; }
    if (action === 'sailing-chart') { if(Object.hasOwn(G.SAIL_CHARTS,value)){sailingChart=value;sailingHint=false;showSailing();}return; }
    if (action === 'sailing-start') { if(act(()=>G.startSailing(state,sailingChart))){sailingHint=false;showSailing();}return; }
    if (action === 'sailing-move') { const [direction,step]=value.split(':');if(act(()=>G.sail(state,direction,Number(step)))){sound('sail');sailingHint=false;showSailing();}return; }
    if (action === 'sailing-undo') { if(act(()=>G.undoSailing(state))){sailingHint=false;showSailing();}return; }
    if (action === 'sailing-reset') { if(act(()=>G.resetSailing(state))){sailingHint=false;showSailing();}return; }
    if (action === 'sailing-hint') { sailingHint=true;showSailing();return; }
    if (action === 'sailing-finish') { let result;if(act(()=>{result=G.finishSailing(state);})){sound('success');showSailing(result);}return; }
    if (action === 'sailing-display') { act(()=>G.displaySailing(state,value));return; }
    if (action === 'sailing-home') { closeDialog();openPane('home');render();return; }
    if (action === 'tea-open') { teaRecipe=Object.keys(G.TEA_RECIPES).find(k=>!G.teaStatus(state,k).known&&G.teaStatus(state,k).unlocked)||'morning';teaPicks=[];teaHint=false;showTea();return; }
    if (action === 'tea-recipe') { if(Object.hasOwn(G.TEA_RECIPES,value)){teaRecipe=value;teaPicks=[];teaHint=false;showTea();}return; }
    if (action === 'tea-add') { const n=Number(value);if(G.teaStatus(state,teaRecipe).ready&&teaPicks.length<G.TEA_RECIPES[teaRecipe].cups&&Number.isInteger(n)&&n>=0&&n<6){teaPicks.push(n);sound('tea');showTea();}return; }
    if (action === 'tea-remove') { const n=Number(value);if(Number.isInteger(n)&&n>=0&&n<teaPicks.length){teaPicks.splice(n,1);showTea();}return; }
    if (action === 'tea-clear') { teaPicks=[];showTea();return; }
    if (action === 'tea-hint') { teaHint=true;showTea();return; }
    if (action === 'tea-brew') { let result;if(act(()=>{result=G.brewTea(state,teaRecipe,teaPicks);})){sound('success');showTea(result);}return; }
    if (action === 'tea-display') { act(()=>G.displayTea(state,value));return; }
    if (action === 'tea-home') { closeDialog();openPane('home');render();return; }
    if (action === 'city-explore') { showCityVisit();return; }
    if (action === 'explore') { let result; if(act(()=>{result=G.explore(state,value);})) {sound(result.rare?'success':'coin');showDiscovery(result);}return; }
    if (action === 'buy-decor') { if(act(()=>G.buyDecor(state,value),'新装饰已经摆进营地。'))sound('upgrade');return; }
    if (action === 'place-decor') { act(()=>G.placeDecor(state,value));return; }
    if (action === 'favorite-treasure') { if(act(()=>G.favoriteTreasure(state,value),'珍藏已经摆在营地纪念台。'))closeDialog();return; }
    if (action === 'goods-info') { showGoods(value); return; }
    if (action === 'chapters') { showChapters(); return; }
    if (action === 'install-mod') { if (act(() => G.installMod(state, value), '改装完成，马车已经焕然一新。')) showGuild(); return; }
    if (action === 'challenge-start') { if (act(() => G.startChallenge(state))) { driveMessage = ''; showChallenge(); } return; }
    if (action === 'challenge-skip') { if (act(() => G.skipChallenge(state), '略过本次挑战，继续正常商旅。')) returnFromChallenge(); return; }
    if (G.travelChallengePending(state)) { showEvent(); return; }
    if (action === 'free-travel') { if (act(() => G.startFreeTravel(state))) { closeDialog(); selected = null; moving = false; resetPanes('home'); destination = (state.city + 1) % 3; route = 'road'; render(); sound('upgrade'); toast('行旅证已生效。带着熟悉的商队，去寻找还没见过的远方。'); } return; }
    if (action === 'continue-journey') { if (act(() => G.continueJourney(state))) { closeDialog(); destination = (state.city + 1) % 3; route = 'road'; resetPanes(); render(); toast(`第 ${state.chapter} 程开始，${G.CHAPTERS[state.chapter].name}：${G.CHAPTERS[state.chapter].text}`); } return; }
    if (action === 'map-back' || action === 'pane-back') { if(action==='map-back')resetPanes();else backPane();render();window.scrollTo?.(0,0);focusPane();return; }
    if (action === 'visit' || action === 'pane') { if (!['map', 'town', 'inventory', 'market', 'route', 'orders', 'home', 'progress', 'settings'].includes(value)) return; openPane(value); render();window.scrollTo?.(0,0); focusPane(); if (action === 'visit' && window.matchMedia('(max-width: 900px)').matches) document.querySelector('.desk-column')?.scrollIntoView({ behavior: effectsEnabled && !reducedMotion.matches ? 'smooth' : 'instant', block: 'start' }); return; }
    if (action === 'effects') { effectsEnabled = !effectsEnabled; try { localStorage.setItem('caravan-effects', effectsEnabled ? 'on' : 'off'); } catch {} syncMotion(); render(); document.querySelector('[data-action="effects"]')?.focus({ preventScroll: true }); return; }
    if (action === 'close') return closeDialog();
    if (action === 'help') return help();
    if (action === 'about') return showAbout();
    if (action === 'desktop-notices') { window.CaravanDesktop?.notices().catch(()=>toast('声明文件无法打开，请检查游戏文件夹是否完整。'));return; }
    if (action === 'restart') return confirmRestart();
    if (action === 'new-game') return startNew();
    if (action === 'view-ended') { closeDialog(); render(); return; }
    if (action === 'journal') return openDialog(`<span class="eyebrow">每一笔生意，都有来处</span><h2 id="dialog-title">旅途手记</h2><div class="full-journal">${state.log.map(l => `<p><span>第 ${l.day} 天</span>${esc(l.text)}</p>`).join('')}</div><button class="primary full" data-action="close">合上手记</button>`);
    if (state.phase === 'ended') { showFinal(); return; }
    if (action === 'resolve') {
      const previous = state.event && { ...state.event, city: state.city }, choice = G.eventInfo(state)?.choices.find(c => c.id === value);
      if (act(() => {
        G.resolve(state, value);
        if (state.phase !== 'event') {
          destination = state.order ? G.ORDER_TYPES[state.order.type].city : (state.city + 1) % 3;
          if (destination === state.city) destination = (state.city + 1) % 3;
          resetPanes(); route = !G.isFreeTravel(state) && state.day >= 11 ? 'trail' : route;
        }
      })) {
        if(previous.commissionFind){showEvent();return;}
        playScene(previous.key, { city: previous.city, route: previous.route, outcome: value }, choice.text, choice.detail, () => { if (state.phase === 'event') showEvent(); else showArrival(); }, 1100);
      }
      return;
    }
    if (state.phase === 'event') { showEvent(); return; }
    if (action === 'accept') act(() => { G.acceptOrder(state, Number(value)); destination = G.ORDER_TYPES[state.order.type].city; route = state.order.due - state.day < 2 ? 'trail' : 'road'; }, '已接单。按订单要求装货，留意期限和路线预告。');
    if (action === 'deliver') {
      const order = state.order, cargo = G.orderItems(state).slice(0, order?.quantity || 0); let receipt;
      if (act(() => { receipt = G.deliverOrder(state); selected = null; moving = false; })) showDelivery(receipt, G.ORDER_TYPES[order.type].title, cargo);
    }
    if (action === 'abandon') openDialog(`<h2 id="dialog-title">放弃这份订单？</h2><p class="dialog-copy">货物和金币全部保留，但失去本单赏金。同一次停靠不能重新接单，抵达下一座城后才会换新。</p><div class="dialog-buttons"><button class="secondary" data-action="close">继续运送</button><button class="primary" data-action="confirm-abandon">确认放弃订单</button></div>`);
    if (action === 'confirm-abandon') { if (act(() => G.abandonOrder(state))) closeDialog(); }
    if (action === 'filter') { filter = value; render(); }
    if (action === 'destination' || action==='atlas-destination') { const next=Number(value);if(!Number.isInteger(next)||!G.CITIES[next]||next===state.city)return;destination=next;if(action==='atlas-destination')openPane('route');render();if(action==='atlas-destination')document.querySelector('.page-heading button')?.focus({preventScroll:true}); }
    if (action === 'route') { route = value; render(); }
    if (action === 'buy') act(() => { const item = G.buy(state, value); selected = item.id; moving = false; return item; }, i => `${G.GOODS[i.kind].name}已装进行囊。`);
    if (action === 'sell') act(() => { const v = G.sell(state, selected); selected = null; moving = false; return v; }, v => `交易完成，售货收入 ${v} 金币。`);
    if (action === 'move') { if (!selectedItem()) return; moving = !moving; render(); }
    if (action === 'rotate') { const i = selectedItem(); if (i) act(() => G.move(state, i.id, i.x, i.y, !i.rotated), '物品已旋转。'); }
    if (action === 'upgrade') act(() => G.upgrade(state), '行囊多了一行，可以装下更多远方。');
    if (action === 'depart') { if (act(() => G.depart(state, destination, route))) { selected = null; moving = false; playScene('travel', { city: state.city, route, destination }, `前往${G.CITIES[destination].name}`, route === 'trail' ? '车轮碾过山石，前方的山口渐渐清晰。' : '沿着河岸前进，把这一车货带去远方。', showEvent, 2600); } }
    if (action === 'finish' && !G.isFreeTravel(state)) openDialog(`<span class="eyebrow">商会考核</span><h2 id="dialog-title">结束这段旅程？</h2><p class="dialog-copy">你的金币与货物估值合计 <b>${G.worth(state)} G</b>，目标是 ${G.goal(state)} G。${state.day < G.DEADLINE ? `距离截止还有 ${G.DEADLINE - state.day} 天，你也可以继续贸易。` : '本日仍可以交易、完成委托，然后再来结算。'}</p><div class="dialog-buttons"><button class="secondary" data-action="close">再想一想</button><button class="primary" data-action="confirm-finish">确认结算</button></div>`);
    if (action === 'confirm-finish') { if (act(() => G.finish(state))) showFinal(); }
  }
  document.addEventListener('click', e => {
    audio?.unlock();
    const button = e.target.closest('[data-action]'); if (button && !button.disabled) { handleAction(button.dataset.action, button.dataset.value); return; }
    const itemEl = e.target.closest('[data-item]'); if (itemEl && state.phase === 'market') { selected = Number(itemEl.dataset.item); moving = false; render(); return; }
    const cell = e.target.closest('[data-cell]'); if (cell && moving && selectedItem()) { if (act(() => { G.move(state, selected, Number(cell.dataset.x), Number(cell.dataset.y)); moving = false; })) toast('物品已放好。'); }
    if (e.target.closest('.brand')) e.preventDefault();
  });
  document.addEventListener('keydown', e => {
    if(dialog.open&&dialog.dataset.panel==='sailing'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){
      const direction={ArrowUp:'north',ArrowRight:'east',ArrowDown:'south',ArrowLeft:'west'}[e.key],v=state.collection.home.sailing.voyage;
      if(direction){e.preventDefault();if(!e.repeat&&v?.key===sailingChart&&G.sailingStatus(state,sailingChart).ready&&!G.sailingComplete(v))handleAction('sailing-move',direction+':'+v.steps);return;}
    }
    if (e.key === 'F11' && window.CaravanDesktop) { e.preventDefault(); if(!e.repeat)handleAction('desktop-fullscreen'); return; }
    if (!e.repeat) audio?.unlock();
    if(atTitle)return;
    if (state.challenge?.status === 'active' && state.challenge.kind === 'fishing') {
      if (e.key === 'Escape') { e.preventDefault(); fishPaused = true; save(); showFishing(); }
      if (e.key === ' ' && !fishPaused && dialog.querySelector('[data-action="fish-cast"]')) { e.preventDefault(); if (!e.repeat) fishingCast(state.challenge.step); }
      return;
    }
    if (state.challenge?.status === 'active' && state.challenge.kind === 'drive') {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) { e.preventDefault(); steerDrive(state.challenge.lane + (['ArrowLeft', 'a', 'A'].includes(e.key) ? -1 : 1)); }
      if (e.key === 'Escape' || (e.key === ' ' && !drivePaused)) { e.preventDefault(); drivePaused = true; showDrive(); }
      return;
    }
    if (dialog.open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const treasureObject=e.target.closest?.('g[data-action="treasure-view"]');if(treasureObject&&['Enter',' '].includes(e.key)){e.preventDefault();handleAction('treasure-view',treasureObject.dataset.value);return;}
    if(homeUI?.key(e))return;
    if (e.key.toLowerCase() === 'r' && selectedItem()) { e.preventDefault(); handleAction('rotate'); }
    if (e.key === 'Escape') { if(selected || moving){selected=null;moving=false;render();}else handleAction('pane-back'); }
  });
  function bindDrag() {
    const grid = document.querySelector('.inventory-grid'); let dragId = null, offsetX = 0, offsetY = 0;
    grid.querySelectorAll('[data-item]').forEach(el => {
      el.addEventListener('dragstart', e => { if (state.phase !== 'market') { e.preventDefault(); return; } dragId = Number(el.dataset.item); selected = dragId; const rect = el.getBoundingClientRect(), i = selectedItem(), [w, h] = G.dimensions(i); offsetX = Math.min(w - 1, Math.floor((e.clientX - rect.left) / (rect.width / w))); offsetY = Math.min(h - 1, Math.floor((e.clientY - rect.top) / (rect.height / h))); e.dataTransfer.setData('text/plain', String(dragId)); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
      el.addEventListener('dragend', () => { dragId = null; el.classList.remove('dragging'); grid.querySelectorAll('.drop-good,.drop-bad').forEach(c => c.classList.remove('drop-good', 'drop-bad')); });
    });
    function coordinates(e) { const rect = grid.getBoundingClientRect(); return { x: Math.floor((e.clientX - rect.left) / (rect.width / G.COLS)) - offsetX, y: Math.floor((e.clientY - rect.top) / (rect.height / state.rows)) - offsetY }; }
    grid.addEventListener('dragover', e => { if (dragId === null) return; e.preventDefault(); const p = coordinates(e), item = state.items.find(i => i.id === dragId), good = G.fits(state, item, p.x, p.y, dragId), [w, h] = G.dimensions(item); grid.querySelectorAll('[data-cell]').forEach(c => { c.classList.remove('drop-good', 'drop-bad'); const x = Number(c.dataset.x), y = Number(c.dataset.y); if (x >= p.x && x < p.x + w && y >= p.y && y < p.y + h) c.classList.add(good ? 'drop-good' : 'drop-bad'); }); e.dataTransfer.dropEffect = good ? 'move' : 'none'; });
    grid.addEventListener('drop', e => { e.preventDefault(); if (dragId === null) return; const p = coordinates(e); act(() => G.move(state, dragId, p.x, p.y), '行囊整理好了。'); });
  }
  if(!initialSave.blocked)save(); render();
  if (state.challenge?.status === 'active') showChallenge(); else if (state.phase === 'event') showEvent(); else if (state.phase === 'ended') showFinal();
  if (initialSave.blocked) showSaves();
  else showDesktopMenu();
  if (initialSave.legacy) toast('旧存档已兼容升级，原始进度和收藏均已保留。');
})();
