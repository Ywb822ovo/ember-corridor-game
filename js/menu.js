(function(root){
  'use strict';
  const $=id=>document.getElementById(id),W=root.DungeonWeapons;
  const time=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  class Menu{
    constructor({store,audio,onNavigate,onNew,onContinue,hasRun}){
      Object.assign(this,{store,audio,onNavigate,onNew,onContinue,hasRun});this.page='home';this.returnTo='home';this.selected=store.data.equipped;this.confirmAction=null;this.chapterSelect=new root.DungeonChapterSelect({store,audio,onImport:()=>{this.show('settings','chapters');$('import-file').click();},onWarehouse:()=>this.show('warehouse','chapters'),onEnter:selection=>{if(hasRun())this.confirm('开始新的冒险？','进入所选章节会放弃当前暂停的冒险。章节解锁和历史记录会保留。',()=>onNew(selection));else onNew(selection);}});
      document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{audio.unlock();audio.play('select');this.show(button.dataset.page);}));
      $('brand-home').addEventListener('click',event=>{event.preventDefault();this.show('home');});$('front-back').addEventListener('click',()=>this.show(this.returnTo));
      $('start-button').addEventListener('click',()=>{audio.unlock();this.show('chapters');});
      $('continue-button').addEventListener('click',()=>{audio.unlock();onContinue();});
      $('equip-button').addEventListener('click',()=>{store.equip(this.selected);audio.unlock();audio.play('select');this.renderWarehouse();this.renderHome();this.toast(`已装备${W.byId[this.selected].name}，下一局生效。`);this.renderStorage();});
      for(const [key,id]of[['master','master-volume'],['sfx','sfx-volume']])$(id).addEventListener('input',()=>{audio.unlock();store.setting(key,Number($(id).value)/100);audio.apply(store.data.settings);$(`${key}-output`).textContent=$(id).value+'%';this.renderStorage();});
      for(const key of ['mute','shake','particles'])$(`setting-${key}`).addEventListener('change',()=>{store.setting(key,$(`setting-${key}`).checked);audio.unlock();audio.apply(store.data.settings);audio.play('select');this.renderStorage();});
      $('fullscreen-button').hidden=!document.fullscreenEnabled;
      $('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{this.toast('当前窗口无法进入全屏，可继续使用普通窗口。');}});
      document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').textContent=document.fullscreenElement?'退出全屏':'进入全屏';});
      $('export-button').addEventListener('click',()=>this.export());$('import-button').addEventListener('click',()=>$('import-file').click());
      $('import-file').addEventListener('change',async()=>{const file=$('import-file').files[0];$('import-file').value='';if(!file)return;try{if(file.size>200000)throw new Error('请选择小于200KB的记录文件。');const data=store.preview(await file.text());this.confirm('导入这份记录？',`将覆盖出战选择、设置、章节解锁与冒险记录。\n出战武器：${W.byId[data.equipped].name}\n累计通关：${data.stats.wins}；最近记录：${data.stats.runs.length}条\n当前暂停中的战斗保持原样。`,()=>{store.import(data);this.selected=data.equipped;audio.apply(data.settings);this.render();$('data-feedback').textContent='记录已导入。';});}catch(error){$('data-feedback').textContent=error.message;this.toast(error.message);}});
      $('reset-profile-button').addEventListener('click',()=>this.confirm('清除本地记录？','将清除设置、出战选择、章节解锁与全部历史战绩，恢复短枪。\n当前暂停中的冒险和游戏文件不会被删除。',()=>{store.clear();this.selected=store.data.equipped;audio.apply(store.data.settings);this.render();$('data-feedback').textContent='本地记录已重置。';}));
      $('confirm-cancel').addEventListener('click',()=>this.closeConfirm());$('confirm-dialog').addEventListener('cancel',()=>{this.confirmAction=null;});
      $('confirm-accept').addEventListener('click',()=>{const action=this.confirmAction;this.closeConfirm();action?.();});
      this.render();this.show('home');
    }
    ready(){this.loaded=true;$('start-button').disabled=false;$('start-button').innerHTML='<span class="action-number">01</span><strong>开始游戏</strong><span>→</span>';}
    show(page,returnTo='home'){
      if(!['home','chapters','warehouse','settings','guide','records','credits','game'].includes(page))return;
      this.page=page;this.returnTo=returnTo;this.onNavigate(page);
      if(page==='game'){clearTimeout(this.toastTimer);$('toast').hidden=true;}
      $('front-shell').hidden=page==='game';$('front-shell').classList.toggle('home-cover',page==='home');$('game-window').classList.toggle('menu-open',page!=='game');
      for(const name of ['home','chapters','warehouse','settings','guide','records','credits'])$(`front-${name}`).hidden=name!==page;
      $('front-back').hidden=page==='home';$('front-back').textContent=returnTo==='game'?'← 返回冒险':'← 返回';
      this.render();if(page==='warehouse')this.renderWarehouse();if(page==='settings')this.renderSettings();if(page==='records')this.renderRecords();
      if(page!=='game')requestAnimationFrame(()=>{const focus=page==='home'?$('start-button'):$('front-back');focus.focus({preventScroll:true});});
    }
    render(){this.renderHome();this.renderStorage();if(this.page==='chapters')this.chapterSelect.render();if(this.page==='settings')this.renderSettings();if(this.page==='warehouse')this.renderWarehouse();if(this.page==='records')this.renderRecords();}
    renderHome(){const weapon=W.byId[this.store.data.equipped];$('home-held-gun').innerHTML=W.icon(weapon.id);$('home-weapon-icon').innerHTML=W.icon(weapon.id);$('home-weapon-name').textContent=weapon.name;$('home-weapon-tag').textContent=weapon.tag;$('continue-button').hidden=!this.hasRun();}
    renderWarehouse(){
      const weapon=W.byId[this.selected],equipped=this.store.data.equipped;
      $('warehouse-list').replaceChildren();W.list.forEach(w=>{const button=document.createElement('button');button.className='weapon-choice'+(w.id===this.selected?' selected':'');button.dataset.weapon=w.id;button.setAttribute('aria-pressed',String(w.id===this.selected));button.innerHTML=`${W.icon(w.id)}<div><strong>${w.name}</strong><small>${w.tag}</small>${w.id===equipped?'<span class="choice-equipped">下一局已装备</span>':''}</div>`;button.addEventListener('click',()=>{this.selected=w.id;this.audio.play('select');this.renderWarehouse();});$('warehouse-list').append(button);});
      $('warehouse-art').innerHTML=W.icon(weapon.id);$('warehouse-name').textContent=weapon.name;$('warehouse-tag').textContent=weapon.tag;$('warehouse-status').textContent=equipped===weapon.id?'下一局已装备':'可装备';$('warehouse-damage').textContent=weapon.id==='shotgun'?`${weapon.damage} × ${weapon.pellets}颗`:weapon.id==='piercer'?`${weapon.damage} / 每目标`:String(weapon.damage);$('warehouse-interval').textContent=weapon.interval.toFixed(2)+' 秒';$('warehouse-range').textContent=weapon.range+' / '+(weapon.range<=240?'近':weapon.range>=600?'远':'中');$('warehouse-description').textContent=weapon.description;$('equip-button').disabled=equipped===weapon.id;$('equip-button').textContent=equipped===weapon.id?'已装备出战':'装备出战';
    }
    renderSettings(){const s=this.store.data.settings;for(const key of ['master','sfx']){$(key+'-volume').value=Math.round(s[key]*100);$(key+'-output').textContent=Math.round(s[key]*100)+'%';}for(const key of ['mute','shake','particles'])$('setting-'+key).checked=s[key];}
    renderStorage(){const okay=this.store.available;$('front-status').textContent=okay?'记录保存在当前浏览器 · 可导出转移':'记录仅在本次打开期间有效 · 可导出备份';$('storage-note').classList.toggle('unavailable',!okay);$('storage-note').textContent=okay?'本地记录可用。换环境前可导出一份备份。':'当前无法持久保存。可继续试玩，并导出备份。';}
    renderRecords(){
      const stats=this.store.data.stats;$('record-wins').textContent=stats.chapterClears||0;const stageTimes=stats.runs.filter(r=>r.result==='chapter-complete'&&(r.startChapter??1)===1&&(r.difficulty??'normal')==='normal').map(r=>r.elapsed);$('record-best').textContent=stageTimes.length?time(Math.min(...stageTimes)):'—';$('record-count').textContent=stats.runs.length+' / 5';$('record-empty').hidden=stats.runs.length>0;$('record-list').hidden=!stats.runs.length;$('record-list').replaceChildren();
      stats.runs.forEach(r=>{const row=document.createElement('article');row.className='record-row '+r.result;const date=new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(r.date));const text=[[(r.result==='chapter-complete'?'第二章完成':r.result==='won'?'旧版通关':'冒险结束'),date],[W.byId[r.startingWeaponId].name,r.startingWeaponId!==r.weaponId?'结束装备：'+W.byId[r.weaponId].name:'全程同一武器'],[(r.roomCount===12?'第'+(r.room<6?'一':'二')+'章 · 房间'+(r.room%6+1):'第'+(r.room+1)+' / '+r.roomCount+'间')+' · 击败'+r.kills+'只','结余 '+r.coins+' 金币'],[time(r.elapsed),'有效游戏时间']];text.forEach((parts,i)=>{const cell=document.createElement(i===0?'div':'span');if(i===3)cell.className='record-end';const top=document.createElement(i===0?'strong':'span'),small=document.createElement('small');top.textContent=parts[0];small.textContent=parts[1];cell.append(top,small);row.append(cell);});if(r.difficulty){const scope=document.createElement('small');scope.className='record-scope';scope.textContent=`${r.startChapter===2?'第二章独立':'两章连续'} · ${r.difficulty==='hard'?'困难':'普通'}${r.endDifficulty&&r.endDifficulty!==r.difficulty?' → 普通':''}`;row.children[1].append(scope);}$('record-list').append(row);});
    }
    export(){const blob=new Blob([this.store.export()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='余烬回廊_本地记录.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('data-feedback').textContent='记录备份已导出。';}
    confirm(title,message,action){this.confirmAction=action;$('confirm-heading').textContent=title;$('confirm-message').textContent=message;$('confirm-dialog').showModal();$('confirm-cancel').focus();}
    closeConfirm(){this.confirmAction=null;$('confirm-dialog').close();}
    toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
  }
  root.DungeonMenu=Menu;
})(globalThis);
