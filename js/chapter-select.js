(function(root){
  'use strict';
  const P=root.DungeonProgression,W=root.DungeonWeapons,$=id=>document.getElementById(id);
  const lock='<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M5 9V6a5 5 0 0 1 10 0v3M3 9h14v11H3z"/><path d="M10 13v3"/></svg>';
  function scene(chapter){
    const blocks=Array.from({length:5},(_,i)=>`<path d="M0 ${i*40}h620M${i%2?60:0} ${i*40}v40m110-40v40m110-40v40m110-40v40m110-40v40m110-40v40"/>`).join('');
    if(chapter===1)return `<svg viewBox="0 0 620 230" role="img" aria-label="火光中的遗迹石门"><defs><linearGradient id="stone-glow" x2="0" y2="1"><stop stop-color="#544237"/><stop offset="1" stop-color="#211d28"/></linearGradient><radialGradient id="ember-light"><stop stop-color="#df9d4a" stop-opacity=".4"/><stop offset="1" stop-color="#c78036" stop-opacity="0"/></radialGradient></defs><path fill="url(#stone-glow)" d="M0 0h620v230H0z"/><g stroke="#15151d" stroke-width="3" opacity=".45">${blocks}</g><ellipse cx="310" cy="192" rx="220" ry="45" fill="#15141b"/><path d="M212 199V72l31-31h134l31 31v127z" fill="#685647" stroke="#ac8455" stroke-width="2"/><path d="M239 199V80l19-18h104l19 18v119" fill="#15151e" stroke="#3a3031" stroke-width="8"/><path d="M251 199V85l12-11h94l12 11v114" fill="#28212a"/><path d="M310 78v121M259 114h104M259 160h104" stroke="#47363a" stroke-width="5"/><path d="M270 189l40-27 40 27-40 26z" fill="#b7824d" opacity=".3"/><path d="M310 98l12 20-12 20-12-20z" fill="#d0a16a"/><g fill="#75604d" stroke="#2c252a" stroke-width="4"><path d="M194 201V36h23v165M403 201V36h23v165"/><path d="M183 48h46V28h-46zM391 48h46V28h-46z"/></g><g fill="url(#ember-light)"><circle cx="130" cy="145" r="95"/><circle cx="490" cy="145" r="95"/></g><g fill="#6a4a35"><path d="M110 185v-30h40v30M470 185v-30h40v30"/></g><g fill="#edb562"><path d="M115 154l7-22 6 10 8-27 9 39zM475 154l7-22 6 10 8-27 9 39z"/></g><g fill="#e2ac68"><circle cx="158" cy="85" r="2"/><circle cx="462" cy="56" r="1.5"/><circle cx="330" cy="35" r="1.5"/></g></svg>`;
    return `<svg viewBox="0 0 620 230" role="img" aria-label="冷蓝灯光中的工坊机械门"><defs><linearGradient id="metal-glow" x2="0" y2="1"><stop stop-color="#34454d"/><stop offset="1" stop-color="#1b202a"/></linearGradient></defs><path fill="url(#metal-glow)" d="M0 0h620v230H0z"/><g stroke="#71868a" opacity=".16">${blocks}</g><path d="M40 48h145v25H75v112M580 45H448v25h103v110" fill="none" stroke="#65747a" stroke-width="13"/><path d="M206 201V45h208v156" fill="#1a202b" stroke="#6a7676" stroke-width="10"/><path d="M228 195V65h164v130" fill="#30414b" stroke="#8b9b98" stroke-width="2"/><path d="M310 66v129M232 108h157M232 157h157" stroke="#18242e" stroke-width="5"/><path d="M260 124h100v18H260z" fill="#202a35"/><path d="M266 129h88v6h-88z" fill="#86c8cf"/><path d="M221 208h178l30 22H191z" fill="#466067" opacity=".4"/><g fill="none" stroke="#697b80" stroke-width="13"><circle cx="132" cy="137" r="33"/><circle cx="491" cy="137" r="33"/></g><g stroke="#718386" stroke-width="15"><path d="M132 91v17m0 58v17m-46-46h17m58 0h17m313-46v17m0 58v17m-46-46h17m58 0h17"/></g><g fill="#8ac8cf"><path d="M233 39h154v4H233zM84 185h24v5H84zM512 185h24v5h-24z"/></g><g fill="#d2a768"><path d="M219 51h9v15h-9M392 51h9v15h-9"/></g></svg>`;
  }
  class ChapterSelect{
    constructor({store,onEnter,onWarehouse,onImport,audio}){Object.assign(this,{store,onEnter,onWarehouse,onImport,audio});this.selection={chapter:1,difficulty:'normal'};$('chapter-enter').addEventListener('click',()=>{const s={...this.selection};if(P.canEnter(store.data.progress,s.chapter,s.difficulty))onEnter(s);});$('selection-warehouse').addEventListener('click',onWarehouse);$('selection-import').addEventListener('click',onImport);}
    render(){
      const progress=this.store.data.progress,s=this.selection;
      if(!P.canEnter(progress,s.chapter,s.difficulty))this.selection={chapter:1,difficulty:'normal'};
      const host=$('chapter-route');host.replaceChildren();
      for(const chapter of [1,2]){
        if(chapter===2){const arrow=document.createElement('div');arrow.className='chapter-arrow'+(progress[1].normal?' open':'');arrow.innerHTML='<span>→</span><small>通关普通<br>开启后路</small>';arrow.setAttribute('aria-hidden','true');host.append(arrow);}
        const card=document.createElement('article');card.className='chapter-card chapter-'+chapter+(P.canEnter(progress,chapter,'normal')?'':' sealed');
        card.innerHTML=`<div class="chapter-art">${scene(chapter)}<span class="chapter-roman">${chapter===1?'I':'II'}</span>${!P.canEnter(progress,chapter,'normal')?`<div class="chapter-seal">${lock}<span>通关第一章普通后解锁</span></div>`:''}</div><div class="chapter-card-body"><div class="chapter-card-title"><div><small>CHAPTER ${String(chapter).padStart(2,'0')}</small><h3>${chapter===1?'遗迹地牢':'失落工坊'}</h3></div><span>${chapter===1?'石门后的第一道试炼':'通往深处的机械迷城'}</span></div><div class="chapter-modes"></div></div>`;
        for(const difficulty of ['normal','hard']){
          const allowed=P.canEnter(progress,chapter,difficulty),cleared=progress[chapter][difficulty],selected=this.selection.chapter===chapter&&this.selection.difficulty===difficulty,button=document.createElement('button');
          button.type='button';button.dataset.chapter=chapter;button.dataset.difficulty=difficulty;button.className='chapter-mode'+(selected?' selected':'');button.disabled=!allowed;button.setAttribute('aria-pressed',String(selected));
          button.innerHTML=`<span class="mode-symbol">${!allowed?lock:cleared?'✓':difficulty==='hard'?'✦':'◇'}</span><span><strong>${difficulty==='hard'?'困难':'普通'}</strong><small>${!allowed?(chapter===2&&difficulty==='normal'?'通关第一章普通':'通关本章普通'):cleared?'已通关 · 可再挑战':difficulty==='hard'?'强化敌人 · 进阶挑战':'标准试炼 · 可挑战'}</small></span><b>${selected?'已选':'→'}</b>`;
          button.addEventListener('click',()=>{if(!P.canEnter(this.store.data.progress,chapter,difficulty))return;this.selection={chapter,difficulty};this.audio.play('select');this.render();document.querySelector(`[data-chapter="${chapter}"][data-difficulty="${difficulty}"]`).focus({preventScroll:true});});card.querySelector('.chapter-modes').append(button);
        }
        host.append(card);
      }
      this.preview();
    }
    preview(){
      const {chapter,difficulty}=this.selection,weapon=W.byId[this.store.data.equipped],kit=P.loadout(chapter);
      $('selection-name').textContent=`${chapter===1?'第一章 · 遗迹地牢':'第二章 · 失落工坊'} / ${difficulty==='hard'?'困难':'普通'}`;
      $('selection-weapon').innerHTML=W.icon(weapon.id);$('selection-weapon-name').textContent=weapon.name;
      $('selection-supplies').textContent=`生命 ${kit.health}/${kit.health} · ${kit.coins} 金币 · 单发伤害 ${Math.round(weapon.damage*kit.damage*100)/100}${weapon.pellets>1?' × '+weapon.pellets:''} · ${kit.perk?'特性1级':'基础装备'}`;
      $('selection-description').textContent=difficulty==='hard'?'困难：敌人生命 +35%，近战追击速度 +8%，敌方子弹速度 +10%。预警与机关伤害保持原值。':chapter===2?'独立开局提供固定补给，使用仓库武器；每次挑战重新发放，不累积上局战利品。':'通关后，同时解锁第一章困难与第二章普通；本次选关不会放弃暂停中的冒险。';
      $('chapter-enter').disabled=!P.canEnter(this.store.data.progress,chapter,difficulty);$('chapter-enter').textContent=`进入${chapter===1?'地牢':'工坊'} →`;
    }
  }
  root.DungeonChapterSelect=ChapterSelect;
})(globalThis);
