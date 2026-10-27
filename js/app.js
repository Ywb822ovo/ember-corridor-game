(function(){
  'use strict';
  const $=id=>document.getElementById(id),world=new DungeonCore.World(DungeonMaps),keys=new Set(),W=DungeonWeapons;
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const store=new DungeonProfile.Store(storage),audio=new DungeonAudio(store.data.settings);
  const screens={paused:$('pause-screen'),reward:$('reward-screen'),shop:$('shop-screen'),'chapter-intro':$('chapter-screen'),'chapter-complete':$('result-screen'),won:$('result-screen'),lost:$('result-screen'),error:$('error-screen')};
  const names={power:'伤害强化',rapid:'快速供能',repair:'应急治疗'},types={combat:'战',shop:'商',elite:'精',rest:'营',boss:'王'};
  let renderer,ready=false,last=0,previous='',noticeTimer=0,message='准备好后再继续。',recorded=false,menu,touch=null;
  const active=()=>['combat','cleared','safe'].includes(world.state),hasRun=()=>['combat','cleared','safe','paused','reward','shop','chapter-intro'].includes(world.state);
  const format=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function pause(reason){keys.clear();touch?.reset();if(world.pause()){message=reason||'准备好后再继续。';sync();}}
  function navigate(page){keys.clear();touch?.reset();if(page!=='game'&&active())pause();last=performance.now();}
  function start(selection={chapter:1,difficulty:'normal'}){if(!ready)return;if(!DungeonProgression.canEnter(store.data.progress,selection.chapter,selection.difficulty)){menu.toast('请先通关前置章节，再挑战这里。');return;}keys.clear();touch?.reset();if(!world.start(store.data.equipped,{...selection,progress:store.data.progress}))return;recorded=false;previous='';audio.unlock();menu.show('game');last=performance.now();notice(world.chapter===2?'工坊独立挑战：已发放固定补给，留意机械预警。':world.difficulty==='hard'?'困难试炼：敌人更耐打，利用掩体并保持走位。':'近战追得快，射手移动慢。保持走位，留意蓄力。',4);sync();}
  function resume(){keys.clear();touch?.reset();world.resume();menu.show('game');last=performance.now();sync();}
  menu=new DungeonMenu({store,audio,onNavigate:navigate,onNew:start,onContinue:()=>{if(world.state==='paused')world.resume();menu.show('game');last=performance.now();sync();},hasRun});
  touch=new DungeonTouch.Controller({onInteract:interact,onPause:()=>$('pause-button').click(),onPortrait:()=>{if(menu.page==='game')pause('请横屏游玩，准备好后点击继续。');},onGesture:()=>audio.unlock(),onHome:()=>menu.show('home')});
  for(let i=0;i<world.player.maxHp;i++){const h=document.createElement('span');h.className='heart';$('hearts').append(h);}
  let mapChapter=0;
  function chapterMap(){
    if(mapChapter===world.chapter)return;mapChapter=world.chapter;
    const ids=DungeonMaps.chapters.find(c=>c.id===world.chapter).rooms,container=$('map-nodes');container.replaceChildren();container.classList.toggle('branch-map',world.chapter===2);
    if(world.chapter===2){
      const positions={6:[50,87],7:[50,69],8:[20,49],9:[80,49],10:[50,31],11:[50,13]};
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
      for(const [a,b]of[[6,7],[7,8],[7,9],[8,10],[9,10],[10,11]]){const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',positions[a][0]);line.setAttribute('y1',positions[a][1]);line.setAttribute('x2',positions[b][0]);line.setAttribute('y2',positions[b][1]);svg.append(line);}container.append(svg);
      ids.forEach(i=>{const node=document.createElement('span');node.id=`map-room-${i}`;node.style.left=positions[i][0]+'%';node.style.top=positions[i][1]+'%';container.append(node);});
    }else ids.forEach(i=>{const node=document.createElement('span');node.id=`map-room-${i}`;container.append(node);});
    container.setAttribute('aria-label',`${world.chapter===2?'工坊分支':'地牢线性'}路线，六个房间`);
  }
  const descriptions={power:'所有武器伤害 +20%',rapid:'射击间隔缩短10%',repair:'恢复3点生命'};
  let shopKey='';
  function renderShop(){
    if(shopKey===world.activeShop)return;shopKey=world.activeShop;
    const options=$('shop-screen').querySelector('.shop-options');options.replaceChildren();
    world.shopItems.forEach(item=>{const button=document.createElement('button');button.dataset.buy=item.id;
      button.innerHTML=`${item.weaponId?`<span class="shop-gun">${W.icon(item.weaponId)}</span>`:`<span class="reward-icon">${item.icon||(item.effect==='shield'?'◇':item.id==='power'||item.effect==='power'?'↗':item.id==='rapid'||item.effect==='rapid'?'ϟ':'♥')}</span>`}<strong>${item.name}</strong><small>${item.weaponId?W.byId[item.weaponId].tag:item.description||descriptions[item.id]}</small><b>${item.price} 金币</b><em></em>`;
      button.addEventListener('click',()=>{if(world.buy(item.id))audio.play('select');sync();});options.append(button);});
    $('shop-heading').textContent=shopKey==='workshop'?'工坊补给 · 为总装监工整备。':shopKey==='late'?'最后一次整备，准备迎战守卫。':'为矿厅之行做好准备。';
    $('shop-screen').querySelector('.reward-footnote').textContent=shopKey==='workshop'?'本店库存独立限购；左侧维修站可免费恢复3点生命一次。':shopKey==='late'?'金币仅限本局；篝火免费恢复3点，补给商人可额外购买。':'换枪保留本局强化；每件商品限购一次，金币仅限本局。';
  }
  function renderRewards(){
    $('reward-heading').textContent=`${world.map.name}，清理完成。`;
    $('reward-screen').querySelector('p').textContent=`第 ${world.rewardedRooms.length+1} 次补给 · 三选一，效果保留到本局结束。`;
    const options=$('reward-screen').querySelector('.reward-options');options.replaceChildren();
    world.rewardOptions.forEach(item=>{const button=document.createElement('button');button.dataset.reward=item.id;button.disabled=Boolean(item.disabled);
      button.innerHTML=`<span class="reward-icon">${item.icon}</span><strong>${item.name}${item.rank?' · '+item.rank+'级':''}</strong><small>${item.disabled?(item.id==='repair'?'生命已满':'已达最高等级'):item.description}</small>`;
      button.addEventListener('click',()=>{if(world.chooseReward(item.id)){last=performance.now();notice(`${item.name}已生效。走近传送门按E继续。`,4);sync();}});options.append(button);});
  }
  function notice(text,seconds=2.5){$('room-notice').textContent=text;$('room-notice').hidden=false;noticeTimer=seconds;}
  function sync(){
    const p=world.player,state=world.state,safe=['shop','rest'].includes(world.map.type);
    chapterMap();const chapter=DungeonMaps.chapters.find(c=>c.id===world.chapter);
    while($('hearts').children.length<p.maxHp){const heart=document.createElement('span');heart.className='heart';$('hearts').append(heart);}while($('hearts').children.length>p.maxHp)$('hearts').lastElementChild.remove();
    $('hp-number').textContent=`${p.hp} / ${p.maxHp}`;[...$('hearts').children].forEach((h,i)=>h.classList.toggle('empty',i>=p.hp));$('hearts').setAttribute('aria-label',`生命值${p.hp}，共${p.maxHp}`);
    const burnTicks=p.burn>0?Math.max(0,Math.floor(p.burn-p.hazardClock+1e-6)+1):0;
    $('status-effect').hidden=!(p.onLava||p.burn>0);$('status-effect').textContent=p.onLava?(p.lavaContact<.6?`脚下岩浆 · 灼烧蓄积 ${Math.min(100,Math.floor(p.lavaContact/.6*100))}%`:'持续灼烧 · 立即离开'): `余焰 ${p.burn.toFixed(1)}秒 · 还会扣${burnTicks}血`;
    $('shield-status').hidden=!(p.shield>0);$('shield-status').textContent=`◇ 护盾 ${p.shield}次`;
    const perk=DungeonGrowth.traits[world.weapon.id],rank=world.perks[world.weapon.id];
    $('perk-status').hidden=!rank;$('perk-status').textContent=rank?`${perk.icon} ${perk.name} ${rank}级${p.haste>0&&world.weapon.id==='sidearm'?' · 加速 '+p.haste.toFixed(1)+'秒':''}`:'';
    $('coin-value').textContent=world.coins;$('upgrade-label').textContent=world.rewardedRooms.length?`已选 ${world.rewardedRooms.length} 项强化`:'基础装备';$('weapon-name').textContent=world.weapon.name;
    if($('weapon-art').dataset.weapon!==world.weapon.id){$('weapon-art').innerHTML=W.icon(world.weapon.id);$('weapon-art').dataset.weapon=world.weapon.id;}
    $('room-index').textContent=`第${world.chapter===1?'一':'二'}章 · ${chapter.name} · ${world.difficulty==='hard'?'困难':'普通'} · ${chapter.rooms.indexOf(world.roomIndex)+1}/6`;$('room-name').textContent=world.map.name;
    $('remaining-label').textContent=state==='title'?'准备进入':safe?'安全区域 · 可直接前往出口':world.completed[world.roomIndex]?'房间已清空':`剩余敌人 ${world.remaining}`;
    if(world.map.waveMode==='clear'&&state==='combat'){const wave=world.snapshot().wave;$('remaining-label').textContent=wave.waiting?`第 ${wave.next} / ${wave.total} 波即将到达 · 剩余 ${world.remaining}`:`第 ${wave.number} / ${wave.total} 波 · 本波 ${world.enemies.length+world.schedule.filter(s=>s.wave===world.waveIndex).length} 只 · 总剩余 ${world.remaining}`;}
    $('weapon-detail').textContent=`伤害 ${DungeonFeedback.format(world.weapon.damage)}${world.weapon.pellets>1?'×'+world.weapon.pellets:''} · ${world.weapon.interval.toFixed(2)}秒`;
    $('map-caption').textContent=`本章探索 ${chapter.rooms.filter(i=>world.visited[i]).length}/6 · ${safe?'整备中':world.completed[world.roomIndex]?'已清空':'战斗中'}`;
    chapter.rooms.forEach(i=>{const room=DungeonMaps.rooms[i],node=$(`map-room-${i}`),known=world.visited[i]||DungeonMaps.rooms.some((r,j)=>world.visited[j]&&r.exits?.some(e=>e.to===i));node.className=`map-node ${i===world.roomIndex?'current':world.completed[i]?'cleared':known?'discovered':'unknown'}`;node.textContent=world.completed[i]&&i!==world.roomIndex?'✓':known?(room.type==='rest'?'补':types[room.type]):'?';node.title=known?room.name:'未知房间';});
    const hint=$('interaction-hint');hint.classList.toggle('portal-ready',['cleared','safe'].includes(state));
    if(world.nearConsole)hint.textContent=world.completed[world.roomIndex]?'机关已断电':world.workshop.cooldown>0?`控制台冷却 ${Math.ceil(world.workshop.cooldown)}秒`:'E · 暂停本房机关4秒';
    else if(world.nearSupply)hint.innerHTML='<kbd>E</kbd> 战前补给 · 治疗 / 护盾 / 弹头';
    else if(world.nearService)hint.innerHTML=world.map.type==='shop'?'<kbd>E</kbd> 查看商店':world.restUsed?'已休息 · 前往蓝色传送门':p.hp===p.maxHp?'生命已满 · 可直接前进':`<kbd>E</kbd> ${world.chapter===2?'维修站':'篝火休息'} · 恢复3点生命`;
    else if(['cleared','safe'].includes(state))hint.innerHTML=world.nearPortal?`<kbd>E</kbd> ${world.exits.find(e=>Math.hypot(p.x-e.x,p.y-e.y)<=68)?.label||'前往下一间'}`:safe?`靠近${world.map.type==='shop'?'商人':world.chapter===2?'维修站或工坊商人':'篝火或右侧补给商人'}按E · 蓝色传送门可继续`:world.chapter===2?'房间已清空 · 可选带名称的不同出口':'房间已清空 · 寻找蓝色传送门';
    else hint.innerHTML='<kbd>WASD</kbd> 移动 <span>·</span> 躲开红色子弹';
    if(state==='combat'&&p.onLava)hint.textContent='正在踩岩浆！立即移到暗色石地';
    else if(state==='combat'&&p.burn>0)hint.textContent=`余焰灼烧 ${Math.ceil(p.burn)} 秒 · 避开岩浆，保持走位`;
    $('pause-button').disabled=!(active()||state==='paused');$('pause-button').innerHTML=state==='paused'?'继续 <kbd>Esc</kbd>':'暂停 <kbd>Esc</kbd>';
    const boss=world.enemies.find(e=>DungeonMachines.rank(e)==='boss');$('boss-hud').hidden=!boss;
    if(boss){$('boss-hud').querySelector('strong').textContent=boss.kind==='overseer'?'总装监工':'遗迹守卫';$('boss-health').textContent=`${DungeonFeedback.format(boss.hp)} / ${DungeonFeedback.format(boss.maxHp)}`;$('boss-fill').style.width=`${Math.max(0,boss.hp)/boss.maxHp*100}%`;$('boss-action').textContent=boss.phaseTimer>0?'第二阶段 · 守卫正在积蓄力量':boss.warmup>0?'守卫正在苏醒':`${boss.phase===2?'阶段Ⅱ · ':''}${boss.windup>0?(boss.pattern==='ring'?'环形弹幕 · 找空隙':'扇形射击 · 离开瞄准方向'):'观察预警，保持移动'}`;if(DungeonGuardian.is(world,boss))$('boss-action').textContent=DungeonGuardian.label(boss);if(boss.kind==='overseer')$('boss-action').textContent=boss.phaseTimer>0?'第二阶段 · 重新部署':`${boss.phase===2?'阶段Ⅱ · ':''}${DungeonWorkshop.label(boss)}${boss.mode==='core'?' · 全方向易伤':''}`;$('boss-hud').classList.toggle('phase-two',boss.phase===2);}
    if(state==='shop'){
      renderShop();$('shop-coins').textContent=world.coins;$('shop-feedback').textContent=world.feedback||'换枪保留本局强化；每种商品限购一次。';
      world.shopItems.forEach(item=>{const button=document.querySelector(`[data-buy="${item.id}"]`);button.disabled=!item.available;button.querySelector('em').textContent=item.sold?'已购买':item.weaponId===world.weapon.id?'当前装备':['repair','late-repair','workshop-repair'].includes(item.id)&&p.hp===p.maxHp?'生命已满':world.coins<item.price?'金币不足':'点击购买';});
    }
    if(['won','lost','chapter-complete'].includes(state)&&!recorded){recorded=true;store.record(world.snapshot());menu.renderStorage();}
    touch?.update(world,menu.page);
    if(touch?.mobile&&state==='combat'&&!world.nearConsole&&!world.nearSupply&&!world.nearService)hint.textContent='左摇杆移动 · 按住攻击自动瞄准';
    if(state===previous)return;
    keys.clear();touch?.reset();for(const screen of new Set(Object.values(screens)))screen.hidden=true;
    $('overlay').hidden=active()||state==='title';if(screens[state])screens[state].hidden=false;
    if(state==='paused')$('pause-message').textContent=message;
    if(state==='reward')renderRewards();
    if(state==='chapter-intro')$('chapter-loadout').textContent=`第二章 · 普通 · 连续闯关 · ${world.weapon.name} · 单发伤害 ${DungeonFeedback.format(world.weapon.damage)} · ${world.coins}金币 · 生命 ${p.hp}/${p.maxHp}`;
    if(['won','lost','chapter-complete'].includes(state)){
      $('result-kicker').textContent=state==='won'?'DUNGEON CLEARED':'JOURNEY ENDED';$('result-heading').textContent=state==='won'?'守卫倒下，遗迹已通关。':'冒险暂时结束。';
      $('result-message').textContent=(state==='won'?`走完${DungeonMaps.rooms.length}间房，迎来这次冒险的终点。`:'留意蓄力和弹幕间隙，整备后再出发。')+` 本局装备：${world.weapon.name}。`;
      if(state==='chapter-complete'){$('result-kicker').textContent='CHAPTER TWO COMPLETE';$('result-heading').textContent='总装监工已击败，升降梯仍缺少动力。';$('result-message').textContent='第二章试玩完成。前往地底炉心寻找能源的道路将在第三章开放，本次尚未逃离地下城。';}
      $('retry-chapter').hidden=!world.chapterCheckpoint;$('restart-button').innerHTML='重新选择章节 <span>→</span>';
      $('result-kills').textContent=world.kills;$('result-coins').textContent=world.coins;$('result-time').textContent=format(world.elapsed);
    }
    previous=state;
    const focus=state==='chapter-intro'?$('chapter-start'):state==='paused'?$('resume-button'):state==='reward'?document.querySelector('[data-reward]:not(:disabled)'):state==='shop'?$('shop-close'):['won','lost','chapter-complete'].includes(state)?$('restart-button'):null;if(focus&&menu.page==='game')focus.focus({preventScroll:true});
  }
  $('chapter-start').addEventListener('click',()=>{if(world.beginChapter()){last=performance.now();notice('工坊入口：先观察猎犬的扑击预警，再认识脉冲射手。',4);sync();}});
  $('retry-chapter').addEventListener('click',()=>{if(world.retryChapter()){recorded=false;previous='';last=performance.now();keys.clear();touch?.reset();menu.show('game');notice('已恢复进入工坊时的装备与补给，重新挑战第二章。',4);sync();}});
  $('restart-button').addEventListener('click',()=>menu.show('chapters'));$('pause-restart').addEventListener('click',()=>menu.confirm('重新开始？','当前冒险将被放弃。按本次起始章节和难度重开，使用仓库选定的武器。',()=>start({chapter:world.startChapter,difficulty:world.startingDifficulty})));$('resume-button').addEventListener('click',resume);
  $('pause-settings').addEventListener('click',()=>menu.show('settings','game'));$('pause-home').addEventListener('click',()=>menu.show('home'));
  $('pause-button').addEventListener('click',()=>world.state==='paused'?resume():pause());$('back-button').addEventListener('click',()=>menu.show('home'));
  $('shop-close').addEventListener('click',()=>{world.closeShop();last=performance.now();sync();});$('credits-button').addEventListener('click',()=>menu.show('credits','game'));
  function interact(){if(menu.page!=='game'||!active()||$('confirm-dialog').open)return;const room=world.roomIndex,changed=world.interact();if(world.state==='shop')keys.clear();touch?.reset();if(world.roomIndex!==room){keys.clear();touch?.reset();last=performance.now();notice(world.chapter===2?(world.map.type==='rest'?'左侧维修站免费恢复，右侧工坊商人提供补给。':world.roomIndex===7?'装配厅：电板也能伤敌，靠近控制台按E断电；清房后可选择左右出口。':world.roomIndex===9?'重装执卫：装甲减伤，躲过砸击后核心暴露。':world.roomIndex===11?'总装监工：留意电束通道与落锤，召集小兵期间本体停止攻击。':'机械攻击会先锁定范围，保持移动，注意地面倒计时。'):(world.map.type==='shop'?'靠近商人按E购物，也可直接前往出口。':world.map.type==='rest'?'篝火可免费恢复3点，右侧商人提供战前补给。':world.map.type==='boss'?'击败遗迹守卫后，出口通向第二章。':'绕开石柱，利用掩体躲避红弹和精英冲锋。'),4);}else if(world.feedback&&world.state!=='shop')notice(world.feedback);else if(!changed)notice(world.state==='combat'?'先击败房间内的全部敌人。':'靠近商人、篝火或蓝色传送门，再按E。');sync();}
  const moves=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  window.addEventListener('keydown',event=>{
    if($('confirm-dialog').open)return;
    if(menu.page!=='game'){if(event.code==='Escape'&&menu.page!=='home'){event.preventDefault();menu.show(menu.returnTo);}return;}
    if(moves.has(event.code)){event.preventDefault();if(active())keys.add(event.code);return;}
    if(event.code==='Escape'){event.preventDefault();if(event.repeat)return;if(world.state==='shop'){world.closeShop();last=performance.now();sync();}else if(world.state==='paused')resume();else pause();}
    if(event.code==='KeyE'&&!event.repeat){event.preventDefault();interact();}
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>pause('你离开了窗口，游戏已自动暂停。'));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('页面已隐藏，游戏自动暂停。');});
  function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    if(ready){if(touch?.portrait&&menu.page==='game'&&active())pause('请横屏游玩，准备好后点击继续。');if(menu.page==='game'&&!$('confirm-dialog').open){const axis=(positive,negative)=>Number(positive.some(k=>keys.has(k)))-Number(negative.some(k=>keys.has(k)));const movement=DungeonTouch.combine({x:axis(['KeyD','ArrowRight'],['KeyA','ArrowLeft']),y:axis(['KeyS','ArrowDown'],['KeyW','ArrowUp'])},touch?.axis||{x:0,y:0});world.tick(dt,{...movement,fire:!touch?.mobile||touch.attacking});if(noticeTimer>0&&active()){noticeTimer-=dt;if(noticeTimer<=0)$('room-notice').hidden=true;}}
      const events=world.events.splice(0);for(const event of events){if(event.type==='chapter-clear'&&store.clearChapter(event.chapter,event.difficulty)){menu.renderStorage();notice(event.chapter===1&&event.difficulty==='normal'?'已解锁：第一章困难 / 第二章普通':event.chapter===2&&event.difficulty==='normal'?'已解锁：第二章困难':'困难试炼已通关，记录已保存',5);}audio.play(event.type,world.weapon.id);if(event.type==='guardian-enrage')notice('守卫能量失控！预警后每0.5秒一轮，寻找弹幕间隙。',3);if(event.type==='guardian-summon'&&event.count>0)notice(`守卫召唤了${event.count}只骷髅，现身后会近战追击！`,3);if(event.type==='phase')notice(world.chapter===2?'总装监工进入第二阶段！':'守卫进入第二阶段！',2);if(event.type==='wave')notice(`${world.map.name} · 第 ${event.wave} / ${event.total} 波`,2);}
      renderer.settings=store.data.settings;sync();if(menu.page==='game')renderer.draw(world,now/1000);
    }requestAnimationFrame(frame);
  }
  const load=src=>{const image=new Image();image.src=src;return image.decode().then(()=>image);};
  Promise.all([load('assets/sprites.png'),...DungeonMaps.images.map(load)]).then(images=>{renderer=new DungeonRenderer($('game-canvas'),{sprites:images[0],rooms:images.slice(1)});ready=true;menu.ready();sync();requestAnimationFrame(frame);if(store.warning)menu.toast(store.warning);}).catch(()=>{menu.toast('资源未加载，请检查网络后刷新；离线版请完整解压。');});
  Object.defineProperty(window,'lastWaveStatus',{value:()=>world.snapshot(),writable:false});
  Object.defineProperty(window,'lastWaveDiagnostics',{value:()=>({page:menu.page,profile:JSON.parse(store.export()),persistence:store.available,audio:audio.diagnostic(),touch:touch?.snapshot()}),writable:false});
})();
