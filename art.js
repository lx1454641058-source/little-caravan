/* Original SVG illustrations drawn for this project. SPDX-License-Identifier: MIT */
window.Art = (() => {
  // One restrained top-left lighting treatment for every original vector asset.
  // Per-render IDs keep gradient references local even when many item icons coexist.
  let paintSequence = 0;
  function storybook(svg) {
    const colors=[...new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map(m=>m[1]))];
    const prefix=`paint-${++paintSequence}-`;
    const mix=(hex,target,amount)=>'#'+[1,3,5].map((start,i)=>Math.round(parseInt(hex.slice(start,start+2),16)*(1-amount)+target[i]*amount).toString(16).padStart(2,'0')).join('');
    const definitions=colors.map((color,i)=>`<linearGradient id="${prefix+i}" x1="0" y1="0" x2=".35" y2="1"><stop stop-color="${mix(color,[250,239,212],.18)}"/><stop offset=".48" stop-color="${color}"/><stop offset="1" stop-color="${mix(color,[73,79,54],.12)}"/></linearGradient>`).join('');
    const painted=svg.replace(/fill="(#[0-9a-f]{6})"/gi,(_,color)=>`fill="url(#${prefix+colors.indexOf(color)})"`);
    return painted.replace(/(<svg\b[^>]*>)/,`$1<defs>${definitions}</defs>`);
  }
  const shapes = {
    gear:'<path d="m26 7 12 0 2 8 7 4 8-2 6 10-6 6v8l6 6-6 10-8-2-7 4-2 7H26l-2-7-7-4-8 2-6-10 6-6v-8l-6-6 6-10 8 2 7-4z" fill="#c3af76"/><circle cx="32" cy="33" r="11" fill="#faf0ce"/><circle cx="32" cy="33" r="4" fill="#6f8965"/>',
    book:'<path d="M8 12q12-6 24 1 12-7 24-1v42q-12-5-24 1-12-6-24-1z" fill="#f2dfae"/><path d="M32 13v42M14 23h11m-11 9h11m-11 9h11m14-18h11m-11 9h11m-11 9h11" stroke="#8b8762" stroke-width="2"/>',
    cat:'<path class="cat-tail" d="M42 48q20 9 16-10" fill="none" stroke="#c28a54" stroke-width="7"/><ellipse cx="31" cy="44" rx="17" ry="15" fill="#d9ac72"/><path d="M15 23 13 7l14 9h9L49 7l-1 17q5 18-16 18T15 23" fill="#e8bd80"/><path d="m16 12 8 7-7 4m28-11-8 7 8 4" fill="#d19c86" stroke="none"/><path d="M25 25v3m14-3v3m-8 6 2 2 2-2m-13-3-10-2m10 5-10 2m31-5 10-2m-10 5 10 2" fill="none" stroke="#655443" stroke-width="2"/><path d="M26 17h3m6 0h3M23 48v7m15-7v7" stroke="#bc8a54" stroke-width="3"/>',
    leafSeal:'<path d="M18 29h28v24H18z" fill="#b8874d"/><path d="M14 48h36v10H14z" fill="#8b6440"/><path d="M25 28V16q7-13 14 0v12" fill="#d0a25d"/><path d="M26 40q0-8 13-7-1 11-13 7" fill="#729164"/>',
    moonTea:'<path d="M8 49q23 18 48 0v9H8z" fill="#ae9e79"/><path d="M31 50V16" stroke="#81996a" stroke-width="3"/><path d="M31 34Q12 35 15 16q16 0 16 18m1-6Q31 7 47 7q3 18-15 21m-1 18Q43 28 54 34q-5 17-23 12" fill="#eaf3d5"/><path d="M49 9h8m-4-4v8" stroke="#d4b265"/>',
    feather:'<path d="M14 54Q9 17 48 6q10 30-30 44" fill="#6ca7a5"/><path d="m13 59 31-42m-21 29-8-13m16 2-9-15m14 8 13-4m-27 22 14-2" fill="none" stroke="#365f66" stroke-width="2"/>',
    amberBee:'<path d="m19 8 28 3 10 24-13 24-26-5L8 29z" fill="#e3b260"/><path d="m20 14 22 4 7 16-10 16-18-4-6-17z" fill="#f4d48c"/><ellipse cx="32" cy="34" rx="12" ry="8" fill="#b88243"/><path d="m27 28 1 12m7-12 1 12" stroke="#634b38" stroke-width="3"/><path d="M30 28q-18-13-15-1l15 4m3-4q4-19 12-9l-10 11" fill="#fff3c2"/>',
    bottle:'<path d="M25 8h14v19q15 8 13 26-21 11-40 0-2-18 13-26z" fill="#a9c9bd"/><path d="M24 5h16v10H24z" fill="#ab8c56"/><path d="m22 31 20 3-3 17-20-3z" fill="#f4e5be"/><path d="m24 36 12 2m-13 4 10 2" stroke="#8e8768"/>',
    glassFish:'<path d="m12 32 16-19 28 17-25 21-19-14-8 10V21z" fill="#8dbdc0"/><path d="m28 13 5 18 23-1-25 21 2-20-21 1" fill="#d1e7d7"/><circle cx="45" cy="29" r="2" fill="#547381"/><path d="M12 9h9m-5-4v9m34 33h9m-5-4v9" stroke="#edc966" stroke-width="2"/>',
    shell:'<path d="M10 43Q2 14 27 8q28-4 30 22 3 25-25 28l-6-13q-14 10-16-2" fill="#deb9a2"/><path d="M23 45q-13-23 9-26 20 2 12 22-13 7-16-4-1-10 8-8" fill="none" stroke="#b58679" stroke-width="3"/><path d="m31 47 4 9m4-10 5 6" stroke="#f7e0bf"/>',
    pearl:'<path d="M7 45q-4-35 24-9 34-28 28 9-24 19-52 0" fill="#c3a8af"/><path d="m11 45 20-9 24 9" fill="#eadbd2"/><circle cx="33" cy="36" r="16" fill="#f7e7db"/><circle cx="28" cy="30" r="5" fill="#fffbed" stroke="none"/><path d="M50 8v12m-6-6h12" stroke="#d7b467" stroke-width="2"/>',
    clayHorse:'<path d="M10 25h26l8-16h9v22l-10 8v17h-7V40H21v16h-7V36l-5 7-5-4z" fill="#bb795b"/><path d="m43 10 2-7 6 6m-14 4-6 12" fill="#d69c6b"/><circle cx="48" cy="17" r="2" fill="#533f32"/><path d="M18 26h15v11H18z" fill="#e0b282"/>',
    goldenBell:'<path d="M29 10V6h7v8M32 47v11" fill="none" stroke="#b79353" stroke-width="3"/><path d="M15 43q5-7 5-21 12-18 24 0 0 14 6 21z" fill="#e0b967"/><path d="M13 43h39v7H13z" fill="#b88a43"/><path d="m31 21 5 7-5 7-5-7z" fill="#f9e6a6"/><path d="m27 56 5 5 5-5" fill="#a88a58"/>',
    wheatCrown:'<path d="M15 16Q-3 45 31 56 64 48 49 16" fill="none" stroke="#aa9a57" stroke-width="5"/><path d="m16 17-9-8 3 17-6 1 9 10m35-20 9-8-3 17 6 1-9 10m-33 6-11 1 15 9m25-10 11 1-15 9" fill="#ddbd67" stroke="#b19a50" stroke-width="3"/><circle cx="32" cy="52" r="6" fill="#c68270"/>',
    sunSeed:'<path d="M10 47q22-9 44 0l-7 11H17z" fill="#be9460"/><path d="M31 47V30m0 6q-18-14-19-2 9 8 19 5m1-9q17-17 19-5-4 9-19 9" fill="#8eaa6c" stroke="#6f8c54" stroke-width="2"/><path d="m32 6 5 8 10-2-4 10 6 8-11 1-6 9-5-9-11-1 6-8-4-10 10 2z" fill="#e8c66c"/><circle cx="32" cy="23" r="8" fill="#b29351"/>',
    honey: '<path fill="#d4a657" d="M17 23h31l3 29q-18 12-37 0z"/><path fill="#b08b56" d="M18 13h29v10H18z"/><path fill="#f0dfad" d="M17 32h32v14H17z"/><path fill="#dfa745" d="M33 31q-16 16 0 14 12-2 0-14"/><path fill="none" d="M22 18h20M19 49q14 7 28 0"/>',
    wood: '<path fill="#aa8158" d="m20 8 25 5-3 43-25-5z"/><ellipse cx="32" cy="11" rx="13" ry="6" fill="#d4b786"/><ellipse cx="32" cy="11" rx="7" ry="3" fill="none"/><path fill="none" d="m24 20-1 24m7-21-1 26m8-28-1 14m-18 2 24 5"/><path stroke="#708763" stroke-width="4" d="m18 39 25 5"/>',
    glass: '<path fill="none" stroke-width="3" d="M26 11q6-13 13 0"/><path fill="#b79966" d="m19 15 13-7 15 7-5 5H23zM19 51h27v7H19z"/><path fill="#b7c9c0" d="M23 20h19l8 26-8 6H23l-8-6z"/><path fill="#cfaaa6" d="m23 20 8 10-10 10-6 6z"/><path fill="#e7d196" d="m31 30 11-10 8 26-8 6z"/><path fill="none" d="m23 20-2 20 2 12m19-32-5 20 5 12m-21-12h16"/>',
    tea: '<path fill="#69865d" d="M18 24h29l-3 32H21z"/><path fill="#b6c496" d="M18 22h29v8H18z"/><path fill="#e2d6b0" d="M22 36h21v12H22z"/><path fill="none" d="M27 43q4-11 11-5-2 8-11 5m4-4 1 9"/><path fill="#83966c" d="M26 20q-11-14 2-12l5 11q0-17 12-12 1 10-12 13"/>',
    spice: '<path fill="#ad714a" d="m22 23-6 23q-2 12 16 12t16-12l-7-23z"/><path fill="#d7975a" d="m23 10 5 10h11l5-10-11 4z"/><path fill="none" d="M21 24h22m-20 5h18"/><path fill="#f5d496" d="m33 34 2 6 7-1-5 5 3 6-7-3-5 4 1-8-5-4 7 1z"/>',
    herb: '<path fill="none" stroke-width="3" d="m30 54 2-37m-1 27 15-20m-14 9L20 18"/><path fill="#86a171" d="M31 24Q14 24 17 12q13 1 14 12m2 9q-1-20 14-18-1 16-14 18M28 42Q8 42 13 29q11-1 15 13m7 3q4-17 19-12-5 15-19 12"/><path stroke="#c49965" stroke-width="5" d="m24 49 15-3"/>',
    fish: '<path fill="#8aa7a8" d="M13 31Q30 7 53 30 33 54 13 35L4 44V23z"/><path fill="#bed0c4" d="M16 33q17 12 34-1-18 18-34 1"/><path fill="none" d="M39 19q-7 11 0 23m-17-9 8-5m-7 11 9-5"/><circle cx="44" cy="29" r="2" fill="#343f39"/>',
    silk: '<path fill="#b77377" d="M13 21q-3-10 10-10h23q9 0 8 10v25q-3 10-13 7L17 40z"/><path fill="#d19a91" d="M18 17q-8 4 0 11h22v24L12 42V24q0-8 6-7"/><path fill="none" d="M18 22h28m0-9q-10 8 0 13m-27 8 15 6m-15 0 15 6"/>',
    ice: '<path fill="#9bbdbb" d="m31 5 16 16-5 32-14 7-13-21z"/><path fill="#d2e3d8" d="m31 5 3 25 13-9zm3 25-6 30-13-21z"/><path fill="none" d="m31 5 3 25 8 23m-8-23-19 9"/><path stroke="#f6fbf0" d="m49 5 0 10m-5-5h10M9 49v8m-4-4h8"/>',
    shield: '<path fill="#ab8558" d="M10 13 32 6l22 7v21Q53 49 32 59 11 49 10 34z"/><path fill="#c1a078" d="m17 18 15-5 15 5v16q-3 12-15 18-12-6-15-18z"/><path fill="none" d="M25 17v31m14-31v31"/><circle fill="#d2c3a2" cx="32" cy="32" r="9"/>',
    lantern: '<path fill="none" stroke-width="3" d="M24 16V9q8-10 16 0v7"/><path fill="#af8a54" d="M19 18h26l5 37H14z"/><path fill="#f1c679" d="M23 24h18l3 25H19z"/><path fill="#f8e9b6" d="M33 30q-15 17 0 15 8-3 0-15"/><path fill="none" d="M17 20h30M13 55h38M32 22v30"/>',
    fruit: '<path fill="#b97462" d="M32 24q-16-15-22 3-4 14 10 28 6 5 13 1 9 5 16-7 15-24 0-29-10-3-17 4"/><path fill="none" stroke-width="3" d="m32 25 2-17"/><path fill="#79916a" d="M35 16q0-15 17-11-4 13-17 11"/><path stroke="#dfaa8b" stroke-width="4" d="M19 28q-5 5-3 10"/>',
    porcelain: '<path fill="#d6e1d3" d="M24 8h17v12q-1 7 10 15 11 22-19 23Q4 57 14 35q11-8 10-15z"/><path fill="#7e9da5" d="M23 8h19v7H23z"/><path fill="none" stroke="#7799a0" stroke-width="3" d="M15 36q10 5 17-1t17 1M15 47q8-9 17 0t17 0m-28 5 4-17m17 17-5-17"/>',
    ration: '<path fill="#c79f63" d="M6 43q1-21 23-24 25-4 29 21 0 14-27 14Q7 54 6 43"/><path fill="#e1c28c" d="M7 40q4-23 24-22 17 0 25 19-23 10-49 3"/><path fill="none" stroke="#94724e" stroke-width="3" d="m21 22-4 12m18-14-4 14m16-8-3 8"/><path fill="none" d="M8 43q23 9 48-2"/>',
    compass: '<circle cx="32" cy="34" r="23" fill="#b99a61"/><circle cx="32" cy="34" r="18" fill="#e4d7b2"/><path fill="none" d="M29 9V4h7v6m-4 8v4m0 25v4M15 34h4m26 0h4"/><path fill="#a55c4d" d="m39 21-3 17-11 8 4-17z"/><path fill="#f5edda" d="m36 38-11 8 4-17z"/>',
    coin: '<circle cx="32" cy="32" r="23" fill="#dbb563"/><circle cx="32" cy="32" r="17" fill="none" stroke="#a48347"/><path fill="none" stroke-width="3" d="M38 22H28q-7 6 4 10t4 10H25m7-25v30"/>',
    bag: '<path fill="none" stroke-width="4" d="M23 14V9q9-8 18 0v5"/><rect x="12" y="13" width="40" height="46" rx="12" fill="#ae885b"/><path fill="#d0ae76" d="M12 20q0-8 12-8h16q12 0 12 8v12H12z"/><rect x="19" y="39" width="26" height="14" rx="4" fill="#c5a16b"/><path fill="#8e7755" d="M28 25h8v14h-8z"/>',
    cart: '<path fill="#b69261" d="M8 23h39l-5 25H14z"/><path fill="#e6d8b5" d="M11 25V17q1-13 16-13t17 13v8z"/><path fill="none" d="M20 7v18m14-19v19m-22 4h31m-29 9h27m4-9 10-8"/><circle cx="19" cy="51" r="7" fill="#6c7153"/><circle cx="39" cy="51" r="7" fill="#6c7153"/>',
    leaf: '<path fill="#81926a" d="M13 49Q1 15 52 10 54 51 13 49"/><path fill="none" d="m12 53 30-31m-17 18-2-15m9 8 12 1"/>',
    mountain: '<path fill="#b6b49a" d="m3 51 20-35 13 22 9-27 17 40z"/><path fill="#ece5d0" d="m16 28 7-12 7 12-7-3zm24-1 5-16 8 20-8-5z"/>',
    road: '<path fill="#c7b894" d="M24 5h13l-2 20 19 34H8l19-34z"/><path fill="none" stroke="#faf4e4" stroke-width="3" stroke-dasharray="5 5" d="M31 9v18L30 56"/>',
    check: '<path fill="none" stroke="#657853" stroke-width="5" d="m15 32 11 11 25-25"/>'
  };
  // Three original friend portraits with distinct dress and silhouettes.
  [['visitorTea','#809864','#bd9670'],['visitorSail','#6f98a1','#a47d61'],['visitorClay','#bd886c','#886a55']].forEach(([key,coat,hair],i)=>{shapes[key]=`<path d="M9 60q0-24 23-24t23 24" fill="${coat}"/><path d="m25 38 7 13 8-14" fill="#ead8b0"/><ellipse cx="32" cy="25" rx="15" ry="18" fill="#e7c39b"/><path d="M17 25V14q13-20 30 0v11l-8-12-12 9-5-8z" fill="${hair}"/><path d="M26 27v2m12-2v2m-10 7q4 3 8 0" stroke="#655343" stroke-width="2" fill="none"/>${i===0?'<path d="M8 16Q32-3 56 16l-8 5H16z" fill="#c6b177"/>':i===1?'<path d="M14 15h36l-4-9H18z" fill="#e6e2c5"/><path d="M15 16h34" stroke="#5b7d8b" stroke-width="5"/>':'<path d="M22 43h21l3 17H18z" fill="#e2c797"/><path d="M26 48h13v9H26z" fill="#b89c77"/>'}`;});

  // Atlas cells are clipped during rendering; the original generated files stay intact.
  const sheets = {
    goods:['tea','spice','herb','fish','silk','ice','shield','lantern','fruit','porcelain','ration','compass','honey','wood','glass','coin'],
    treasures:['leafSeal','moonTea','feather','amberBee','bottle','glassFish','shell','pearl','clayHorse','goldenBell','wheatCrown','sunSeed','cat','bag','book','cart'],
    actors:['merchant','traveler','bandit','buyer','catPlain','catScarf','catCushion','driver','skiff','trade','boatLantern','cartTop','teaService','cupEmpty','cupFull','pedestal'],
    decor:['plainTent','blueTent','goldTent','starTent','bunting','sail','stonepath','flowerbed','pond','greenhouse','showcase','teaTable','boatStand','potteryStand','sproutPot','crate'],
    botanical:['daisy','moonflower','lavender','coral','sunflower','sunset','seedling','bud','rock','cargoCrate','stump','reeds','gear','leaf','mountain','road']
  };
  const sprites=Object.fromEntries(Object.entries(sheets).flatMap(([sheet,keys])=>keys.map((key,index)=>[key,{sheet,index}])));
  // The image tool supplies white-backed paintings. Key only near-white pixels
  // during SVG rendering so solid brushwork stays opaque over scenery.
  let cutoutSequence=0;
  function cutout(id,x,y,width,height){return '<defs><filter id="'+id+'" filterUnits="userSpaceOnUse" x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 -10 -10 -10 0 27"/></filter></defs>';}
  function paint(key,x=0,y=0,width=64,height=64) {
    const {sheet,index}=sprites[key]||sprites.bag,id='cutout-'+(++cutoutSequence);
    const row=Math.floor(index/4),left=index%4*384,rows=sheet==='actors'?[0,370,678,1000,1254].map(y=>y*1536/1254):[0,384,768,1152,1536],top=rows[row],cropHeight=rows[row+1]-top;
    return '<svg class="painted-sprite" x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" viewBox="'+left+' '+top+' 384 '+cropHeight+'" overflow="hidden">'+cutout(id,left,top,384,cropHeight)+'<image filter="url(#'+id+')" href="assets/paint-'+sheet+'-024.png" width="1536" height="1536"/></svg>';
  }
  for(const key of Object.keys(shapes))if(sprites[key])shapes[key]=paint(key);

  function icon(name, cls = '', label = '') {
    const illustrated = ['tea', 'spice', 'herb', 'fish', 'silk', 'ice', 'shield', 'lantern', 'fruit', 'porcelain', 'ration', 'compass', 'honey', 'wood', 'glass'].includes(name);
    return `<svg class="icon ${illustrated ? 'item-illustration' : ''} ${cls}" viewBox="0 0 64 64" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} fill="none" stroke="#655c47" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${illustrated ? '<ellipse cx="32" cy="59" rx="20" ry="3" fill="#493d2d" stroke="none" opacity=".13"/>' : ''}<g class="illustration-body">${sprites[name] ? paint(name) : shapes[name] || shapes.bag}</g></svg>`;
  }
  const tree = (x, y, n = 1) => `<g transform="translate(${x} ${y}) scale(${n})"><ellipse cy="29" rx="19" ry="4" fill="#416657" opacity=".1"/><path d="M0 4v25" stroke="#8b7753" stroke-width="3" stroke-linecap="round"/><path d="M0-28Q-4-28-11-12l-6 10q-2 4 7 4L-22 20q-3 5 22 5t22-5L10 2q9 0 7-4l-6-10Q4-28 0-28Z" fill="#8fa779"/><path d="M0-24Q-5-11-10-5h9l-11 18q5 4 12 3Z" fill="#b0bd8a"/></g>`;
  function map(city) { return `<svg class="landscape" viewBox="0 0 780 230" aria-label="商旅地图：柳溪镇、松湾港、金穗城" role="img">
    <defs><pattern id="water" width="28" height="17" patternUnits="userSpaceOnUse"><path d="M3 9q5 3 10 0" fill="none" stroke="#91aca4" stroke-width="1" opacity=".5"/></pattern><linearGradient id="map-sky" x2="0" y2="1"><stop stop-color="#e2ece0"/><stop offset="1" stop-color="#f4efd9"/></linearGradient><radialGradient id="map-sun"><stop stop-color="#fff3b5" stop-opacity=".9"/><stop offset="1" stop-color="#fff3b5" stop-opacity="0"/></radialGradient></defs>
    <path d="M0 0h780v230H0z" fill="url(#map-sky)"/>
    <circle cx="585" cy="31" r="86" fill="url(#map-sun)"/>
    <circle cx="585" cy="31" r="17" fill="#efcb7c" opacity=".6"/>
    <g class="map-cloud cloud-one" fill="#fffaf0" opacity=".8"><path d="M137 41q-7-13 7-16 3-15 19-9 11-8 19 5 18-1 15 17z"/></g>
    <g class="map-cloud cloud-two" fill="#fffaf0" opacity=".65"><path d="M460 31q-3-12 11-12 8-17 23-8 13-3 17 12 10 0 12 8z"/></g>
    <path d="M0 188Q85 119 155 155T341 123T514 145T780 111V230H0Z" fill="#dfe0c7"/>
    <path d="M359 0Q336 38 395 69T431 119Q414 149 463 168T511 230H570Q495 177 484 148T461 93Q360 47 417 0Z" fill="#bbd0c5"/>
    <path d="M359 0Q336 38 395 69T431 119Q414 149 463 168T511 230H570Q495 177 484 148T461 93Q360 47 417 0Z" fill="url(#water)"/>
    <g stroke="#b7b69b" stroke-width="1.4"><path d="m208 98 49-81 50 81z" fill="#d1d1b9"/><path d="m265 98 47-91 61 91z" fill="#cbcbb4"/><path d="m244 38 13-21 14 24-13-6zM299 33l13-26 19 29-18-10z" fill="#f7f1df"/></g>
    <path d="M112 151Q200 211 326 168T603 116" fill="none" stroke="#b6a680" stroke-width="13" opacity=".25"/>
    <path d="M112 151Q200 211 326 168T603 116" fill="none" stroke="#faf1d6" stroke-width="9"/>
    <path class="map-route" d="M112 151Q200 211 326 168T603 116" fill="none" stroke="#ad9470" stroke-width="1.8" stroke-dasharray="3 7"/>
    <path d="M112 151Q225 66 344 138T603 116" fill="none" stroke="#a69875" stroke-width="1.8" stroke-dasharray="4 6" opacity=".7"/>
    ${[[42,114,.9],[73,81,.75],[177,115,.75],[200,144,.5],[248,205,.6],[290,131,.65],[547,88,.7],[706,119,1],[665,178,.7],[606,192,.6],[38,214,.7],[743,68,.7]].map(t => tree(...t)).join('')}
    <g transform="translate(94 100)" stroke="#82785b" stroke-width="1.5"><path fill="#ded2ad" d="M0 21h43v33H0z"/><path fill="#a88d69" d="m-7 22 28-26 31 26z"/><path fill="#acac80" d="M8 34h9v20H8zm20-3h9v10h-9"/><path fill="#c5b48a" d="M33 6V-9h6v22"/></g>
    <g transform="translate(350 139)" stroke="#7b8170" stroke-width="1.5"><path fill="#ccbb91" d="M-5 36h65v6H-5zM3 39v15m43-15v16"/><path fill="#d8d4b6" d="M1 7h28v27H1z"/><path fill="#829b95" d="m-5 8 20-19L37 8z"/><path fill="#ddd8b9" d="m37 24 22 0-5 9H40z"/><path d="M47 22V-8l16 24H48" fill="#f6f0dc"/></g>
    <g transform="translate(582 65)" stroke="#958164" stroke-width="1.5"><path fill="#d4c59d" d="M0 13h17v43H0zm40 0h17v43H40zM16 28h25v28H16z"/><path fill="#b09568" d="m-4 14 12-21 13 21zm40 0L49-7l13 21z"/><path fill="#867e60" d="M22 56V41q7-13 14 0v15"/><path d="M27 26V3h17l-6 5 6 5H27" fill="#b87960"/></g>
    <g font-size="12" fill="#7b8064" font-family="serif"><text x="228" y="117">青 脊 山</text><text x="478" y="73" transform="rotate(16 478 73)">松 湾 河</text><text x="63" y="47">北 境 商 路</text></g>
    <g transform="translate(700 14)" stroke="#9d9477" fill="none"><path d="M0 4v35m-15-18h30"/><path fill="#9d9477" d="m0 8-4 13h8z"/><text x="-4" y="0" fill="#9d9477" stroke="none" font-size="9">N</text></g>
    <g transform="translate(${[113, 370, 610][city]} ${[155, 181, 120][city]})"><ellipse cy="6" rx="16" ry="5" fill="#69744c" opacity=".2"/><circle class="map-beacon" r="14" fill="none" stroke="#718352" stroke-width="2"/><circle r="8" fill="#657650" stroke="#fff8e4" stroke-width="3"/><circle r="3" fill="#f5df9b"/></g>
    ${['柳溪镇', '松湾港', '金穗城'].map((name, n) => `<g class="map-place" transform="translate(${[113, 370, 610][n]} ${[179, 209, 146][n]})"><rect x="-29" y="-11" width="58" height="21" rx="4" fill="${n === city ? '#496a4e' : '#fcf6df'}" stroke="#bfc9a9"/><text text-anchor="middle" y="3" font-size="12" font-family="serif" fill="${n === city ? '#fff9e9' : '#546548'}">${name}</text></g>`).join('')}
  </svg>`; }
  // Original illustrated atlas. Coordinates drive both routes and HTML city pins.
  const atlasPoints = [[150,278],[430,366],[642,220]];
  function atlasPath(from,to,route='road') {
    const [x,y]=atlasPoints[from], [endX,endY]=atlasPoints[to];
    return `M${x} ${y} Q${(x+endX)/2} ${Math.min(y,endY)+(route==='trail'?-135:110)} ${endX} ${endY}`;
  }
  function atlas(from,to,route='road',travel=false) {
    const selected=atlasPath(from,to,route),[x,y]=atlasPoints[from];
    return `<svg class="living-atlas" viewBox="0 0 780 500" role="img" aria-label="三城商路：茶山、港湾与麦田，${route==='trail'?'山径':'官道'}已标亮" xmlns="http://www.w3.org/2000/svg">
      <rect width="780" height="500" fill="#c9dbc1"/><image class="atlas-painted-terrain" href="assets/caravan-atlas-023.png" width="780" height="500" preserveAspectRatio="none"/>
      ${[[0,1],[1,2],[0,2]].map(([a,b])=>`<path d="${atlasPath(a,b)}" fill="none" stroke="#827d56" stroke-width="12" opacity=".22"/><path d="${atlasPath(a,b)}" fill="none" stroke="#ece0b7" stroke-width="8"/>`).join('')}
      <path d="${selected}" fill="none" stroke="#385e4e" stroke-width="16" opacity=".25"/><path d="${selected}" fill="none" stroke="#fff1b4" stroke-width="8"/><path class="atlas-route-flow" d="${selected}" fill="none" stroke="#c48b40" stroke-width="3" stroke-dasharray="5 10"/>
      <g fill="#f9f7e8" class="atlas-clouds"><path d="M58 91q-9-23 18-25 13-29 40-9 25-9 32 16 28-4 29 18Z"/><path d="M496 112q-6-16 12-21 18-30 41-6 28-9 37 27Z" opacity=".75"/></g>
      <g class="atlas-boat" transform="translate(485 255) scale(.55)">${sailboat('harbor')}</g>
      <g class="atlas-landmarks">${atlasPoints.map(([px,py],n)=>`<g transform="translate(${px-25} ${py-48})"><rect x="-3" y="-3" width="56" height="42" rx="6" fill="#f1e3be"/><image href="assets/caravan-${['town','harbor','harvest'][n]}-023.png" width="50" height="36" preserveAspectRatio="xMidYMid slice"/></g>`).join('')}</g>
      <g class="atlas-settlement-label" font-size="13" font-family="serif" fill="#365843" text-anchor="middle">${atlasPoints.map(([px,py],n)=>`<text x="${px}" y="${py+27}">${['柳溪镇','松湾港','金穗城'][n]}</text>`).join('')}</g>
      <g fill="none" stroke="#567c6a" stroke-width="3" class="atlas-birds"><path d="M300 68q9-10 18 0 9-10 18 0m-9 23q7-8 14 0 7-8 14 0"/></g>
      <g transform="translate(${x} ${y})"><circle class="atlas-location-pulse" r="29" fill="none" stroke="#fff5b8" stroke-width="3"/><circle r="9" fill="#365b45" stroke="#fff5d5" stroke-width="3"/></g>
      <g class="atlas-wagon ${travel?'atlas-wagon-moving':''}" style="offset-path:path('${selected}');offset-rotate:0deg"><g transform="translate(${atlasPoints[to][0]<x?35:-35} -18) scale(${atlasPoints[to][0]<x?-.28:.28} .28)">${caravan([], {})}</g></g>
      <g fill="#4c715d" font-family="serif" font-size="14" letter-spacing="4" opacity=".65"><text x="195" y="179">青脊茶山</text><text x="520" y="416">松湾海</text><text x="578" y="308">金色麦田</text></g>
      <g transform="translate(723 76)" stroke="#5f7e68" fill="none"><circle r="23"/><path d="M0-31v62m-31-31h62"/><path d="m0-22-6 22h12Z" fill="#5f7e68"/><text y="-37" text-anchor="middle" stroke="none" fill="#5f7e68" font-size="12">N</text></g>
    </svg>`;
  }
  // Original, reusable scene actors. Visual state never changes the game rules.
  function person(x,y,role='merchant') {
    return '<g class="actor-anchor" transform="translate('+x+' '+y+')"><g class="scene-person person-'+role+'">'+paint(role,-57,-90,114,145)+'</g></g>';
  }

  function caravan(items,mods={}) {
    const id='cutout-'+(++cutoutSequence);
    return '<g class="scene-caravan">'+cutout(id,-15,-90,285,190)+'<ellipse cx="132" cy="75" rx="137" ry="9" fill="#735936" opacity=".15"/><g class="wagon-bob scene-horse person-driver"><image filter="url(#'+id+')" href="assets/paint-caravan-024.png" x="-15" y="-90" width="285" height="190"/>'+items.slice(0,3).map((item,n)=>paint(item.kind,25+n*20,18,19,19)).join('')+(mods.cold||mods.padding?'<g><rect x="40" y="-12" width="66" height="22" rx="5" fill="'+(mods.cold?'#98bab2':'#c5a7a8')+'"/><text x="73" y="3" text-anchor="middle" font-size="12" fill="#314b3d">'+(mods.cold?'保鲜':'防震')+'</text></g>':'')+(mods.wheels?'<path d="M30 61h66" stroke="#b7c6b2" stroke-width="4"/>':'')+'</g><g class="road-dust" fill="#dfc89d" opacity=".4"><ellipse cx="20" cy="77" rx="20" ry="5"/><ellipse cx="-8" cy="75" rx="10" ry="3"/></g></g>';
  }

  function stall(city) {
    const colors = ['#66846c', '#688e9c', '#b18458'], goods = [['tea', 'herb', 'fruit'], ['fish', 'spice', 'ice'], ['silk', 'porcelain', 'tea']][city];
    return `<g class="scene-stall" transform="translate(98 156)" stroke="#75664c" stroke-width="2">
      <path d="M2 39v119m208-119v119" stroke-width="7"/><path d="M-12 41 18-2h167l38 43z" fill="${colors[city]}"/>
      <path d="m22 0-12 42h28L48 0m31 0-2 42h29V0m30 0 6 42h28L161 0" fill="#f1e4c3" stroke="none"/>
      <path d="M-12 42h235v13q-14 17-29 0-15 17-30 0-15 17-30 0-15 17-30 0-15 17-30 0-15 17-30 0-15 17-30 0-15 17-26 0z" fill="${colors[city]}"/>
      <path d="M-1 111h216v48H-1z" fill="#b39765"/><path d="M8 120h198v31H8z" fill="#cbb286"/><path d="M55 121v29m52-29v29m52-29v29" stroke="#a58b62"/>
      ${goods.map((k, n) => `<svg x="${19 + n * 62}" y="67" width="47" height="47" viewBox="0 0 64 64"><g fill="none" stroke="#655c47" stroke-width="1.6">${shapes[k]}</g></svg>`).join('')}
      <path d="M10 29h58v22H10z" fill="#f5e8c9"/><text x="39" y="44" text-anchor="middle" font-size="12" fill="#586746" stroke="none">${['茶山集', '鲜鱼市', '锦绣坊'][city]}</text>
    </g>`;
  }
  function scene(kind,options={}) {
    const city=[0,1,2].includes(options.city)?options.city:0,items=options.items||[],outcome=options.outcome||'';
    if(kind==='camp')return '<svg class="camp-portrait" viewBox="-15 -90 285 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+caravan(items,options.mods)+'</svg>';
    const town=['town','arrival','delivery'].includes(kind),night=kind==='night',back=town?'caravan-'+['town','harbor','harvest'][city]+'-023':night?'paint-night-024':'paint-road-024';
    let overlay='';
    if(['road','barter','traveler','bandit'].includes(kind))overlay='<g class="encounter-npc">'+person(745,253,{road:'merchant',barter:'merchant',traveler:'traveler',bandit:'bandit'}[kind])+'</g>';
    if(kind==='night')overlay='<g class="lost-chest">'+paint('cargoCrate',690,232,100,100)+'</g>';
    if(outcome==='guard')overlay+='<g class="raised-shield">'+paint('shield',534,190,74,74)+'</g>';
    if(['pay','trade','barter-sell','help'].includes(outcome)||kind==='delivery')overlay+='<g class="scene-coins">'+paint('coin',615,191,62,62)+'</g>';
    if(outcome==='help')overlay+='<g class="healing-mark"><path d="M746 173h12v35h-12zm-12 12h35v12h-35z" fill="#f6edd4"/></g>';
    if(outcome==='search')overlay+='<ellipse class="lantern-beam" cx="739" cy="281" rx="84" ry="58" fill="#f6da8c" opacity=".24"/>';
    if(kind==='delivery')overlay+='<g class="unloading-cargo">'+paint(options.unloaded?.[0]?.kind||'cargoCrate',390,245,70,70)+'</g>';
    return '<svg class="world-scene scene-'+kind+' '+(outcome?'outcome-'+outcome:'')+'" viewBox="0 0 960 360" role="img" aria-label="绘本商旅场景" xmlns="http://www.w3.org/2000/svg"><image href="assets/'+back+'.png" width="960" height="360" preserveAspectRatio="xMidYMid slice"/><g transform="translate('+(town?440:270)+' 253) scale(.94)">'+caravan(items,options.mods)+'</g>'+overlay+'</svg>';
  }

  function sailboat(key) {
    return '<svg class="sailing-mini" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="手作帆船模型" xmlns="http://www.w3.org/2000/svg">'+paint(key==='lantern'?'boatLantern':key==='trade'?'trade':'skiff',0,0,100,100)+'</svg>';
  }

  function potteryLevels(form) { return form==='bowl'?[275,239,207,177]:form==='jar'?[275,225,145,110]:[275,220,132,73]; }
  let potteryDrawing=0;
  // Generated clay brushwork stays clipped to the exact player-shaped silhouette.
  function clayGrain(id,body,width,height) {
    return '<defs><clipPath id="'+id+'-surface"><path d="'+body+'"/></clipPath></defs><g clip-path="url(#'+id+'-surface)" style="mix-blend-mode:multiply" opacity=".78"><image href="assets/paint-clay-024.png" width="'+width+'" height="'+height+'" preserveAspectRatio="xMidYMid slice"/></g>';
  }
  function potteryPath(form,profile) {
    const ys=potteryLevels(form),x=(i,side)=>150+side*profile[i]*1.2;
    let path=`M${x(3,-1)} ${ys[3]}`;
    for(let i=2;i>=0;i--){const mid=(ys[i]+ys[i+1])/2;path+=`C${x(i+1,-1)} ${mid} ${x(i,-1)} ${mid} ${x(i,-1)} ${ys[i]}`;}
    path+=`Q150 ${ys[0]+14} ${x(0,1)} ${ys[0]}`;
    for(let i=1;i<=3;i++){const mid=(ys[i]+ys[i-1])/2;path+=`C${x(i-1,1)} ${mid} ${x(i,1)} ${mid} ${x(i,1)} ${ys[i]}`;}return path+'Z';
  }
  function potteryPiece(form,piece,options={}) {
    const colors={clay:'#c58c6a',jade:'#8aafa0',night:'#71899e'},ys=potteryLevels(form),body=potteryPath(form,piece.profile),id='pottery-clip-'+(++potteryDrawing),mid=(ys[3]+ys[0])/2;
    const pattern=piece.pattern==='lines'?`<path d="M30 ${mid-12}Q90 ${mid+7} 150 ${mid-12}T270 ${mid-12}M30 ${mid+8}Q90 ${mid+27} 150 ${mid+8}T270 ${mid+8}" fill="none" stroke="#f6e8c5" stroke-width="5"/>`:piece.pattern==='dots'?Array.from({length:14},(_,i)=>`<circle cx="${80+i%7*23}" cy="${mid-14+Math.floor(i/7)*27}" r="4" fill="#f7e9c8"/>`).join(''):piece.pattern==='wheat'?`<path d="M150 ${mid+29}v-54${[-1,1].flatMap(side=>[0,1,2].map(i=>`M150 ${mid+14-i*13}q${side*21}-2 ${side*19}-15`)).join('')}" fill="none" stroke="#f5dfac" stroke-width="5" stroke-linecap="round"/>`:'';
    return `<svg class="pottery-piece" viewBox="${options.mounted?'0 60 300 230':'0 0 300 340'}" width="${options.mounted?68:300}" height="${options.mounted?52:340}" role="img" aria-label="${{bowl:'手作小碗',jar:'圆肚陶罐',vase:'细颈花瓶'}[form]}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs>${options.mounted?'':'<ellipse cx="150" cy="304" rx="124" ry="18" fill="#6f6650" opacity=".16"/>'}${options.wheel?'<ellipse cx="150" cy="294" rx="118" ry="18" fill="#b29b75" stroke="#847658" stroke-width="3"/><ellipse cx="150" cy="291" rx="87" ry="12" fill="none" stroke="#d7c7a4" stroke-width="3"/>':''}<path d="${body}" fill="${colors[piece.glaze]}" stroke="#856e57" stroke-width="3"/>${clayGrain(id,body,300,340)}<g clip-path="url(#${id})">${pattern}<path d="M${150-piece.profile[2]*.65} ${ys[2]}q-12 36 2 69" fill="none" stroke="#fff9e6" stroke-width="11" stroke-linecap="round" opacity=".18"/></g><ellipse cx="150" cy="${ys[3]}" rx="${piece.profile[3]*1.2}" ry="8" fill="#9e8165" stroke="#e6c9a2" stroke-width="4"/>${options.target?`<path d="${potteryPath(form,options.target)}" fill="none" stroke="#526a52" stroke-width="2.5" stroke-dasharray="6 6" opacity=".8"/>`:''}${options.handles?ys.map((y,i)=>`<g><path d="M${150+piece.profile[i]*1.2} ${y}h14" stroke="#657957" stroke-width="2"/><circle data-pottery-handle="${i}" cx="${164+piece.profile[i]*1.2}" cy="${y}" r="9" fill="#f7ebc4" stroke="#69835c" stroke-width="3"/><text x="${164+piece.profile[i]*1.2}" y="${y+3}" text-anchor="middle" font-size="10" fill="#547148">↔</text></g>`).join(''):''}</svg>`;
  }

  // Surface anchors are in the furniture's local coordinates. Align actual
  // painted feet, not the atlas rectangle (which includes white margins).
  function mountedTreasure(key,cx,baseline,size) {
    const foot={leafSeal:.96,moonTea:.99,feather:.97,amberBee:.96,bottle:.98,glassFish:.97,shell:.94,pearl:.94,clayHorse:.92,goldenBell:.91,wheatCrown:.90,sunSeed:.92}[key]||.95;
    return '<g class="mounted-treasure" data-surface-y="'+baseline+'">'+paint(key,cx-size/2,baseline-size*foot,size,size)+'</g>';
  }
  function homeScene(c,options={}) {
    const items=options.items||window.Caravan.homeItems(c,options.layout),h=c.home;
    const postcards=(c.trail?.visitors||[]).map((stage,i)=>stage===3?'<g transform="translate('+(55+i*60)+' 160) rotate('+(i%2?6:-5)+')"><rect width="49" height="38" fill="#f5e9c8"/>'+paint(['moonTea','glassFish','clayHorse'][i],8,0,32,32)+'</g>':'').join('');
    const props=items.map(item=>{const {id,key,x,y,w,h:height,kind,label}=item;let drawing='';
      if(kind==='favorite')drawing=paint('pedestal',0,20,w,height-20)+mountedTreasure(key,w/2,52,48);
      else if(kind==='showcase')drawing=paint('showcase',0,0,w,height)+(h.exhibition.length?h.exhibition:window.Caravan.ownedTreasures(c).slice(0,3)).map((k,i)=>mountedTreasure(k,70+i*29,93+i*2,30)).join('');
      else if(kind==='sailing')drawing=paint('boatStand',0,39,w,83)+'<g class="mounted-boat" transform="translate('+((w-70)/2)+' 0) scale(.7)">'+sailboat(key)+'</g>';
      // All shapes share the same physical base y=282. Cropping only the
      // workshop's empty margins keeps custom profiles intact and on the stool.
      else if(kind==='pottery')drawing=paint('potteryStand',0,32,w,60)+'<g class="mounted-pottery" transform="translate(6 0)">'+potteryPiece(key,h.pottery.pieces[key],{mounted:true})+'</g>';
      else drawing=paint(key,0,0,w,height);
      if(id==='tent')drawing+='<g class="tent-postcards">'+postcards+'</g>';
      // Ignore empty atlas margins when picking furniture; the cabinet's
      // transparent sides must not steal clicks from the neighboring stool.
      const hit=kind==='showcase'?[42,25,130,100]:kind==='pottery'?[12,0,56,80]:[Math.max(0,(w-height)/2),Math.max(0,(height-w)/2),Math.min(w,height),Math.min(w,height)];
      if(kind==='sailing'||kind==='favorite'){hit[0]=0;hit[1]=0;hit[2]=w;hit[3]=height;}
      const interactive=!options.edit&&['treasure','favorite'].includes(kind)&&window.Caravan.treasureCount(c,key)>0;
      return '<g class="home-object'+(options.selected===id?' selected':'')+'" data-home-object="'+id+'" transform="translate('+x+' '+y+')"'+(options.edit?' role="button" tabindex="0" aria-label="移动'+label+'"':interactive?' role="button" tabindex="0" aria-label="把玩'+label+'" data-action="treasure-view" data-value="'+key+':camp"':'')+'>'+drawing+(options.edit||interactive?'<rect class="home-object-hit" x="'+hit[0]+'" y="'+hit[1]+'" width="'+hit[2]+'" height="'+hit[3]+'" rx="10"/>':'')+'</g>';
    }).join('');
    return '<svg viewBox="0 0 800 440" class="home-landscape" role="group" aria-label="我的营地'+(options.edit?'，布置模式':'')+'" xmlns="http://www.w3.org/2000/svg"><image href="assets/paint-home-024.png" width="800" height="440" preserveAspectRatio="xMidYMid slice"/><g class="home-props">'+props+'</g>'+(c.placed.tent==='starTent'?'<rect width="800" height="440" fill="#263c58" opacity=".15" pointer-events="none"/>':'')+'</svg>';
  }
  function catFrame(frame=4,bond=0) {
    if(frame===5&&bond>=6)return '<svg viewBox="0 0 100 100">'+paint('catCushion',0,0,100,100)+'</svg>';
    if(frame===4&&bond>=3)return '<svg viewBox="0 0 100 100">'+paint('catScarf',0,0,100,100)+'</svg>';
    const index=Math.max(0,Math.min(7,frame)),id='cutout-'+(++cutoutSequence),x=index%4*384,y=Math.floor(index/4)*512;
    return '<svg viewBox="'+x+' '+y+' 384 512" xmlns="http://www.w3.org/2000/svg">'+cutout(id,x,y,384,512)+'<image href="assets/cat-motion-025.png" width="1536" height="1024" filter="url(#'+id+')"/></svg>';
  }

  function cartTop() { return '<svg viewBox="0 0 100 100" aria-label="你的马车" role="img">'+paint('cartTop',0,0,100,100)+'</svg>'; }

  function vase(v) {
    const rims = ['<path d="M52 43h56"/>', '<path d="M52 40h56m-56 7h56"/>', '<path d="m52 43 7-5 7 10 7-10 7 10 7-10 7 10 7-10 7 5"/>'];
    const patterns = ['<path d="M39 97q10-12 20 0t20 0 20 0 20 0m-80 15q10-12 20 0t20 0 20 0 20 0"/>', '<path d="m42 99 10-10 10 10-10 10zm28 0 10-10 10 10-10 10zm28 0 10-10 10 10-10 10z"/>', '<g fill="#648c9a" stroke="none"><circle cx="47" cy="96" r="4"/><circle cx="68" cy="96" r="4"/><circle cx="90" cy="96" r="4"/><circle cx="111" cy="96" r="4"/><circle cx="59" cy="112" r="4"/><circle cx="80" cy="112" r="4"/><circle cx="101" cy="112" r="4"/></g>'];
    const marks = ['<path d="M80 165q-11-13-12-1-15 1-4 11-5 13 8 9 8 12 13-1 14 0 5-11 4-13-10-7z"/>', '<rect x="69" y="166" width="22" height="22" rx="2"/>', '<path d="m80 163 14 24H66z"/>'];
    return `<svg class="antique-vase" viewBox="0 0 160 205" role="img" aria-label="陶器口沿、纹样与放大底印"><ellipse cx="80" cy="149" rx="50" ry="7" fill="#8d9d7b" opacity=".2"/><path d="M56 30h48v31q-1 13 14 26 29 55-38 61-65-5-38-61 15-13 14-26z" fill="#e1ece0" stroke="#78959a" stroke-width="2"/>${clayGrain('antique-'+(++potteryDrawing),'M56 30h48v31q-1 13 14 26 29 55-38 61-65-5-38-61 15-13 14-26z',160,205)}<path d="M58 54h44m-45 76q25 8 46 0" stroke="#a4bab4" fill="none"/><g fill="none" stroke="#5d8398" stroke-width="3" stroke-linejoin="round">${rims[v.rim]}${patterns[v.pattern]}</g><circle cx="80" cy="177" r="23" fill="#f1ecdc" stroke="#b4b99f" stroke-dasharray="3 3"/><g fill="none" stroke="#6f8590" stroke-width="2.5">${marks[v.mark]}</g><text x="112" y="185" fill="#7f8b72" font-size="9">底印</text></svg>`;
  }
  const painted=fn=>(...args)=>storybook(fn(...args));
  return { catFrame, paint, spriteKeys:Object.keys(sprites), atlas:painted(atlas), atlasPoints, atlasPath, potteryPiece:painted(potteryPiece), potteryLevels, sailboat:painted(sailboat), icon:painted(icon), map:painted(map), scene:painted(scene), cartTop:painted(cartTop), vase:painted(vase), homeScene:painted(homeScene) };
})();
