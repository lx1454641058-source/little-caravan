/* Original collectible interaction scenes; existing project art. SPDX-License-Identifier: MIT */
(function(){
  'use strict';
  const scenes={
    leafSeal:{verb:'盖一枚茶印',cue:'hit',ending:'春茶印记留在了信纸上。',layer:'<span class="seal-print">春<br>茶</span>'},
    moonTea:{verb:'唤醒茶芽',cue:'tea',ending:'茶芽舒展开来，露珠映着月光。',layer:'<i class="tea-leaf left"></i><i class="tea-leaf right"></i><span class="tea-steam">〰<br>〰</span>'},
    feather:{verb:'轻轻吹一口气',cue:'sail',ending:'羽毛沿着清风划出一道弧线。',layer:'<span class="wind-trail">﹏ ﹏ ﹏</span>'},
    amberBee:{verb:'迎着阳光看看',cue:'success',ending:'蜂影透过琥珀，映出一个金色的春天。',layer:'<span class="amber-light"></span><span class="bee-shadow"><svg viewBox="0 0 50 40" aria-hidden="true"><g fill="currentColor"><ellipse cx="24" cy="24" rx="13" ry="8"/><circle cx="37" cy="21" r="5"/><ellipse cx="20" cy="11" rx="7" ry="11" transform="rotate(-25 20 11)" opacity=".6"/><ellipse cx="31" cy="12" rx="6" ry="10" transform="rotate(25 31 12)" opacity=".6"/></g></svg></span>'},
    bottle:{verb:'打开漂流信',cue:'buy',ending:'“愿每一位远行的人都有归处。”',layer:'<span class="bottle-cork"></span><span class="bottle-letter">愿每一位远行的人<br>都有归处</span>'},
    glassFish:{verb:'放进小水池',cue:'sail',ending:'琉璃鱼游过水面，荡起一圈涟漪。',layer:'<span class="water-pool"></span><i class="fish-bubble b1"></i><i class="fish-bubble b2"></i>'},
    shell:{verb:'听听海潮',cue:'sail',ending:'螺壳里传来一层又一层的潮声。',layer:'<i class="echo-ring r1"></i><i class="echo-ring r2"></i><i class="echo-ring r3"></i>'},
    pearl:{verb:'托起潮汐明珠',cue:'upgrade',ending:'明珠缓缓升起，亮起一片细碎星光。',layer:'<span class="pearl-stars">✧　✦　✧</span><span class="pearl-halo"></span>'},
    clayHorse:{verb:'让小马跑一圈',cue:'hoof',ending:'小马扬起一串细尘，又跑回你的手边。',layer:'<span class="horse-dust">· • · • ·</span>'},
    goldenBell:{verb:'拨一下风铃',cue:'success',ending:'铃片轻摆，清亮的回声慢慢散去。',layer:'<span class="bell-line"></span><i class="echo-ring r1"></i><i class="echo-ring r2"></i>'},
    wheatCrown:{verb:'转动麦穗花环',cue:'coin',ending:'麦穗转过一圈，落下几粒金色谷子。',layer:'<span class="wheat-grain">❧　❧　❧</span>'},
    sunSeed:{verb:'洒下一束阳光',cue:'upgrade',ending:'种子抽出嫩芽，开成一朵小小太阳花。',layer:'<span class="seed-sprout"><i></i><b>✿</b></span>'}
  };
  function html(key){const s=scenes[key];if(!s)return '';return `<button class="treasure-stage fx-${key}" data-action="treasure-play" data-value="${key}" aria-label="${s.verb}"><span class="treasure-floor"></span>${s.layer}<span class="treasure-hero">${window.Art.icon(key)}</span><span class="treasure-touch">${s.verb} ↗</span></button>`;}
  function play(key){const s=scenes[key],stage=document.querySelector('.treasure-stage.fx-'+key);if(!s||!stage)return;stage.classList.remove('playing');void stage.offsetWidth;stage.classList.add('playing');const caption=document.querySelector('#treasure-caption');if(caption)caption.textContent=s.ending;window.CaravanSound?.play(s.cue);}
  window.TreasureFX={scenes,html,play};
})();
