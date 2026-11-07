(function(){
  'use strict';
  const $=id=>document.getElementById(id),world=new DungeonCore.World(DungeonMaps,{exploration:true,workshopV2:true,workshopPressure:true}),keys=new Set(),W=DungeonWeapons;
  let storage;try{storage=window.localStorage;}catch{storage=null;}
  const store=new DungeonProfile.Store(storage),audio=new DungeonAudio(store.data.settings);
  const viewport=new DungeonViewport.Stage($('game-window'));
  const finePointer=matchMedia('(any-pointer: fine)').matches,desktopFire=!viewport.mobile||finePointer;
  const aimMode=()=>DungeonAiming.resolveMode(store.data.settings.aimMode,viewport.mobile,finePointer);
  const screens={paused:$('pause-screen'),reward:$('reward-screen'),shop:$('shop-screen'),'chapter-intro':$('chapter-screen'),'chapter-complete':$('result-screen'),won:$('result-screen'),lost:$('result-screen'),error:$('error-screen')};
  const names={power:'伤害强化',rapid:'快速供能',repair:'应急治疗'};
  let renderer,ready=false,last=0,previous='',noticeTimer=0,message='准备好后再继续。',recorded=false,menu,touch=null,aim=null;
  const assets=new DungeonAssets.Loader(),roomImages=Array(DungeonMaps.images.length);
  let loadRequest=0,lastSelection=null;
  const active=()=>['combat','cleared','safe'].includes(world.state),hasRun=()=>['combat','cleared','safe','paused','reward','shop','chapter-intro'].includes(world.state);
  const format=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function pause(reason){keys.clear();touch?.reset();aim?.reset();if(world.pause()){message=reason||'准备好后再继续。';sync();}}
  function updateAudio(page=menu?.page||'home'){
    audio.setScene({page,state:world.state,resumeState:world.resumeState,chapter:world.chapter,roomType:world.map.type,completed:Boolean(world.completed[world.roomIndex])});
  }
  function navigate(page){if($('traveler-dialog').open)closeConversation();keys.clear();touch?.reset();aim?.reset();if(page!=='game'&&active())pause();last=performance.now();updateAudio(page);}
  function closeLoading(){
    $('asset-loader').hidden=true;$('front-shell').inert=false;$('front-shell').removeAttribute('aria-busy');
  }
  function cancelLoading(){loadRequest++;closeLoading();menu.show('chapters');}
  async function start(selection={chapter:1,difficulty:'normal'}){
    if(!DungeonProgression.canEnter(store.data.progress,selection.chapter,selection.difficulty)){menu.toast('请先通关前置章节，再挑战这里。');return;}
    const request=++loadRequest;lastSelection={...selection};keys.clear();touch?.reset();audio.unlock();
    $('asset-loader').hidden=false;$('asset-retry').hidden=true;$('asset-heading').textContent='点亮旅途';
    $('asset-message').textContent='正在准备冒险所需的素材…';$('asset-progress').value=0;
    $('front-shell').inert=true;$('front-shell').setAttribute('aria-busy','true');$('asset-cancel').focus();
    try{
      const indices=selection.chapter===1?[1]:[];
      const images=await assets.prepare(['assets/sprites.png',...indices.map(index=>DungeonMaps.images[index])],(done,total)=>{
        if(request!==loadRequest)return;
        $('asset-progress').max=total;$('asset-progress').value=done;$('asset-message').textContent=`正在准备关卡素材 ${done} / ${total}`;
      });
      if(request!==loadRequest)return;
      indices.forEach((index,i)=>roomImages[index]=images[i+1]);
      if(!renderer)renderer=new DungeonRenderer($('game-canvas'),{sprites:images[0],rooms:roomImages});
      ready=true;closeLoading();
      // Only replace the previous adventure after every required image is ready.
      if(!world.start(store.data.equipped,{...selection,progress:store.data.progress})){menu.show('chapters');return;}
      recorded=false;previous='';menu.show('game');last=performance.now();
      notice(world.chapter===2?'目标：取得动力核心，为升降井供能。传送带会推怪，机关也能伤敌。':world.difficulty==='hard'?'困难试炼：敌人更耐打，利用掩体并保持走位。':'近战追得快，射手移动慢。保持走位，留意蓄力。',4);sync();
    }catch(error){
      if(request!==loadRequest)return;
      loadRequest++; // Ignore remaining image completions after this attempt has failed.
      $('asset-heading').textContent='旅途暂未就绪';$('asset-message').textContent=error.message;
      $('asset-retry').hidden=false;$('asset-retry').focus();
    }
  }
  function resume(){keys.clear();touch?.reset();world.resume();menu.show('game');last=performance.now();sync();}
  menu=new DungeonMenu({store,audio,onNavigate:navigate,onNew:start,onContinue:()=>{if(world.state==='paused')world.resume();menu.show('game');last=performance.now();sync();},hasRun,getAimMode:aimMode});
  touch=new DungeonTouch.Controller({onInteract:interact,onPause:()=>$('pause-button').click(),viewport,onGesture:()=>audio.unlock()});
  aim=new DungeonAiming.Pointer({canvas:$('game-canvas'),viewport,renderer:()=>renderer,enabled:()=>menu.page==='game'&&active()&&!$('confirm-dialog').open});
  $('asset-cancel').addEventListener('click',cancelLoading);
  $('asset-retry').addEventListener('click',()=>start(lastSelection));
  for(let i=0;i<world.player.maxHp;i++){const h=document.createElement('span');h.className='heart';$('hearts').append(h);}
  const journeyMap=new DungeonJourneyMap.View($('map-nodes'));
  let conversation=null;
  function chapterMap(){if(world.state!=='title')journeyMap.update(world);}
  const descriptions={power:'所有武器伤害 +20%',rapid:'射击间隔缩短10%',repair:'恢复3点生命'};
  let shopKey='';
  function renderShop(){
    const kind=world.activeShop,key=kind+'|'+world.shopItems.map(item=>item.id).join('|');if(shopKey===key)return;shopKey=key;
    const options=$('shop-screen').querySelector('.shop-options');options.replaceChildren();
    world.shopItems.forEach(item=>{const button=document.createElement('button');button.dataset.buy=item.id;
      button.innerHTML=`${item.weaponId?`<span class="shop-gun">${W.icon(item.weaponId)}</span>`:`<span class="reward-icon">${item.icon||(item.effect==='shield'?'◇':item.id==='power'||item.effect==='power'?'↗':item.id==='rapid'||item.effect==='rapid'?'ϟ':'♥')}</span>`}<strong>${item.name}</strong><small>${item.weaponId?W.byId[item.weaponId].tag:item.description||descriptions[item.id]}</small><b>${item.price} ${item.currency==='parts'?'零件':'金币'}</b><em></em>`;
      button.addEventListener('click',()=>{if(world.buy(item.id))audio.play('select');sync();});options.append(button);});
    $('shop-heading').textContent=kind==='workshop'?'工坊补给 · 零件改造与金币补给。':kind==='late'?'最后一次整备，准备迎战守卫。':'为矿厅之行做好准备。';
    $('shop-screen').querySelector('.reward-footnote').textContent=kind==='workshop'?'改造件需装备对应武器，使用零件购买，本局第二章有效；每件限购一次。维修站免费恢复3点一次。':kind==='late'?'金币仅限本局；篝火免费恢复3点，补给商人可额外购买。':'换枪保留本局强化；每件商品限购一次，金币仅限本局。';
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
    const manual=aimMode()==='manual';$('game-window').classList.toggle('manual-aim',manual&&menu?.page==='game'&&active());
    document.querySelector('.weapon-auto').textContent=manual?'鼠标':'自动';
    chapterMap();const chapter={...DungeonMaps.chapters.find(c=>c.id===world.chapter),rooms:world.chapterRoomIds};
    while($('hearts').children.length<p.maxHp){const heart=document.createElement('span');heart.className='heart';$('hearts').append(heart);}while($('hearts').children.length>p.maxHp)$('hearts').lastElementChild.remove();
    $('hp-number').textContent=`${p.hp} / ${p.maxHp}`;[...$('hearts').children].forEach((h,i)=>h.classList.toggle('empty',i>=p.hp));$('hearts').setAttribute('aria-label',`生命值${p.hp}，共${p.maxHp}`);
    const burnTicks=p.burn>0?Math.max(0,Math.floor(p.burn-p.hazardClock+1e-6)+1):0;
    $('status-effect').hidden=!(p.onLava||p.burn>0);$('status-effect').textContent=p.onLava?(p.lavaContact<.6?`脚下岩浆 · 灼烧蓄积 ${Math.min(100,Math.floor(p.lavaContact/.6*100))}%`:'持续灼烧 · 立即离开'): `余焰 ${p.burn.toFixed(1)}秒 · 还会扣${burnTicks}血`;
    $('shield-status').hidden=!(p.shield>0);$('shield-status').textContent=`◇ 护盾 ${p.shield}次`;
    const perk=DungeonGrowth.traits[world.weapon.id],rank=world.perks[world.weapon.id];
    $('perk-status').hidden=!rank;$('perk-status').textContent=rank?`${perk.icon} ${perk.name} ${rank}级${p.haste>0&&world.weapon.id==='sidearm'?' · 加速 '+p.haste.toFixed(1)+'秒':''}`:'';
    $('workshop-status').hidden=world.chapter!==2||!world.cfg.workshopV2;const wr=world.workshopRun;$('workshop-status').textContent=`⚙ 零件 ${wr.parts} · 工牌${wr.badge?'已取得':'未取得'}${wr.components.includes('stabilizer')?' · 稳压部件':''}${wr.components.includes('booster')?' · 增压部件':''}${wr.modifications.includes('mod-'+world.weapon.id)?' · '+DungeonWorkshopMods.catalog.find(m=>m.targetWeapon===world.weapon.id).name:''}`;
    $('coin-value').textContent=world.coins;$('upgrade-label').textContent=world.rewardedRooms.length?`已选 ${world.rewardedRooms.length} 项强化`:'基础装备';$('weapon-name').textContent=world.weapon.name;
    if($('weapon-art').dataset.weapon!==world.weapon.id){$('weapon-art').innerHTML=W.icon(world.weapon.id);$('weapon-art').dataset.weapon=world.weapon.id;}
    $('room-index').textContent=`第${world.chapter===1?'一':'二'}章 · ${chapter.name} · ${world.difficulty==='hard'?'困难':'普通'} · ${chapter.rooms.indexOf(world.roomIndex)+1}/${chapter.rooms.length}`;$('room-name').textContent=world.map.name;
    $('remaining-label').textContent=state==='title'?'准备进入':safe?'安全区域 · 可直接前往出口':world.completed[world.roomIndex]?'房间已清空':`剩余敌人 ${world.remaining}`;
    if(world.map.waveMode==='timed'&&state==='combat'){const wave=world.snapshot().wave;$('remaining-label').textContent=`${wave.number?'第 '+wave.number+' / '+wave.total+' 波':'首波准备'} · 在场 ${world.enemies.length}/${world.map.enemyLimit}${wave.next?' · 下波 '+wave.delay.toFixed(1)+'秒':' · 最后一波'}${wave.queued?' · 待入场 '+wave.queued:''}`;}
    if(world.map.waveMode==='clear'&&state==='combat'){const wave=world.snapshot().wave;$('remaining-label').textContent=wave.waiting?`第 ${wave.next} / ${wave.total} 波即将到达 · 剩余 ${world.remaining}`:`第 ${wave.number} / ${wave.total} 波 · 本波 ${world.enemies.length+world.schedule.filter(s=>s.wave===world.waveIndex).length} 只 · 总剩余 ${world.remaining}`;}
    $('weapon-detail').textContent=`伤害 ${DungeonFeedback.format(world.weapon.damage)}${world.weapon.pellets>1?'×'+world.weapon.pellets:''} · ${world.weapon.interval.toFixed(2)}秒`;
    $('run-seed').textContent=world.runSeed===null?'—':String(world.runSeed);$('seed-tools').hidden=!world.layout;
    $('map-caption').textContent=`探索 ${chapter.rooms.filter(i=>world.visited[i]).length}/${chapter.rooms.length}`;
    const hint=$('interaction-hint');hint.classList.toggle('portal-ready',['cleared','safe'].includes(state));
    if(world.nearConsole)hint.textContent=world.completed[world.roomIndex]?'机关已断电':world.workshop.cooldown>0?`控制台冷却 ${Math.ceil(world.workshop.cooldown)}秒`:'E · 暂停本房机关4秒';
    else if(world.nearSupply)hint.innerHTML='<kbd>E</kbd> 交谈';
    else if(world.nearService)hint.innerHTML='<kbd>E</kbd> 交谈';
    else if(['cleared','safe'].includes(state))hint.innerHTML=world.nearPortal?`<kbd>E</kbd> ${world.exits.find(e=>Math.hypot(p.x-e.x,p.y-e.y)<=68)?.label||'前往下一间'}`:safe?'前方的灯火还亮着':world.chapter===2?'房间已清空 · 可选带名称的不同出口':'房间已清空 · 寻找蓝色传送门';
    else hint.innerHTML=manual?'<kbd>WASD</kbd> 移动 <span>·</span> 鼠标瞄准 · 自动开火':'<kbd>WASD</kbd> 移动 <span>·</span> 自动瞄准射击';
    hint.hidden=safe&&!world.nearSupply&&!world.nearService&&!world.nearPortal;
    if(state==='combat'&&p.onLava)hint.textContent='正在踩岩浆！立即移到暗色石地';
    else if(state==='combat'&&p.burn>0)hint.textContent=`余焰灼烧 ${Math.ceil(p.burn)} 秒 · 避开岩浆，保持走位`;
    $('pause-button').disabled=!(active()||state==='paused');$('pause-button').innerHTML=state==='paused'?'继续 <kbd>Esc</kbd>':'暂停 <kbd>Esc</kbd>';
    const boss=world.enemies.find(e=>DungeonMachines.rank(e)==='boss');$('boss-hud').hidden=!boss;
    if(boss){$('boss-hud').querySelector('strong').textContent=boss.kind==='overseer'?'总装监工':'遗迹守卫';$('boss-health').textContent=`${DungeonFeedback.format(boss.hp)} / ${DungeonFeedback.format(boss.maxHp)}`;$('boss-fill').style.width=`${Math.max(0,boss.hp)/boss.maxHp*100}%`;$('boss-action').textContent=boss.phaseTimer>0?'第二阶段 · 守卫正在积蓄力量':boss.warmup>0?'守卫正在苏醒':`${boss.phase===2?'阶段Ⅱ · ':''}${boss.windup>0?(boss.pattern==='ring'?'环形弹幕 · 找空隙':'扇形射击 · 离开瞄准方向'):'观察预警，保持移动'}`;if(DungeonGuardian.is(world,boss))$('boss-action').textContent=DungeonGuardian.label(boss);if(boss.kind==='overseer')$('boss-action').textContent=`${DungeonWorkshop.label(boss)}${boss.phaseTimer>0?'':boss.mode==='core'?' · 承伤150%':' · 承伤50%'}`;$('boss-hud').classList.toggle('phase-two',boss.phase===2);}
    if(state==='shop'){
      renderShop();$('shop-parts-balance').hidden=!world.cfg.workshopV2||world.chapter!==2;$('shop-parts').textContent=world.workshopRun.parts;$('shop-coins').textContent=world.coins;$('shop-feedback').textContent=world.feedback||'换枪保留本局强化；每种商品限购一次。';
      world.shopItems.forEach(item=>{const button=document.querySelector(`[data-buy="${item.id}"]`);button.disabled=!item.available;button.querySelector('em').textContent=item.sold?'已购买':item.targetWeapon&&item.targetWeapon!==world.weapon.id?'装备对应武器后购买':item.currency==='parts'&&world.workshopRun.parts<item.price?'零件不足':item.weaponId===world.weapon.id?'当前装备':['repair','late-repair','workshop-repair'].includes(item.id)&&p.hp===p.maxHp?'生命已满':item.currency!=='parts'&&world.coins<item.price?'金币不足':'点击购买';});
    }
    if(['won','lost','chapter-complete'].includes(state)&&!recorded){recorded=true;store.record(world.snapshot());menu.renderStorage();}
    touch?.update(world,menu.page);
    if(!desktopFire&&state==='combat'&&!world.nearConsole&&!world.nearSupply&&!world.nearService)hint.textContent=manual?'鼠标瞄准需连接鼠标 · 按住攻击':'左摇杆移动 · 按住攻击自动瞄准';
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
  $('copy-seed').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(String(world.runSeed));menu.toast('种子已复制，可在选关页输入复现。');}catch{menu.toast('本局种子：'+world.runSeed);}});
  $('chapter-start').addEventListener('click',()=>{if(world.beginChapter()){last=performance.now();notice('工坊入口：先观察猎犬的扑击预警，再认识脉冲射手。',4);sync();}});
  $('retry-chapter').addEventListener('click',()=>{if(world.retryChapter()){recorded=false;previous='';last=performance.now();keys.clear();touch?.reset();menu.show('game');notice('已恢复进入工坊时的装备与补给，重新挑战第二章。',4);sync();}});
  $('restart-button').addEventListener('click',()=>menu.show('chapters'));$('pause-restart').addEventListener('click',()=>menu.confirm('重新开始？','当前冒险将被放弃。按本次起始章节和难度重开，使用仓库选定的武器。',()=>start({chapter:world.startChapter,difficulty:world.startingDifficulty,...(world.requestedSeed!==null?{seed:world.requestedSeed}:{})})));$('resume-button').addEventListener('click',resume);
  $('pause-settings').addEventListener('click',()=>menu.show('settings','game'));$('pause-home').addEventListener('click',()=>menu.show('home'));
  $('pause-button').addEventListener('click',()=>world.state==='paused'?resume():pause());$('back-button').addEventListener('click',()=>menu.show('home'));
  $('shop-close').addEventListener('click',()=>{world.closeShop();last=performance.now();sync();});$('credits-button').addEventListener('click',()=>menu.show('credits','game'));
  function interact(){if(menu.page!=='game'||!active()||$('confirm-dialog').open)return;if(DungeonWayfarers.near(world)){openConversation();return;}const room=world.roomIndex,changed=world.interact();if(world.state==='shop')keys.clear();touch?.reset();if(world.roomIndex!==room){keys.clear();touch?.reset();last=performance.now();notice(world.chapter===2?(world.roomIndex===14?world.feedback:world.map.type==='rest'?'灯下还有人守着，去打个招呼吧。':world.roomIndex===7?'装配厅：电板也能伤敌，靠近控制台按E断电；清房后可选择左右出口。':world.roomIndex===9?(world.map.batches.some(b=>b.kinds.includes('mother'))?'装配母机会持续制造近战小机器人，优先处理母体；清房获得工牌。':world.map.workshopPressure?'重装冲锋锁定直线：引它撞墙，趁2秒眩晕输出；清房获得工牌。':'优先处理修理无人机；借冲床打穿重装执卫，清房获得工牌。'):world.roomIndex===11?'总装监工：观察奇偶列预警，每招后抓住核心暴露；33%血时断电并进入核心过载。':'观察机关节拍：引怪上电板，避开蒸汽和锯片。'):(world.map.type==='shop'?'有人在灯下整理行囊。':world.map.type==='rest'?'火还暖着，旁边有人在等你。':world.map.type==='boss'?'击败遗迹守卫后，出口通向第二章。':'绕开石柱，利用掩体躲避红弹和精英冲锋。'),4);}else if(world.feedback&&world.state!=='shop')notice(world.feedback);else if(!changed)notice(world.state==='combat'?'先击败房间内的全部敌人。':'靠近商人、篝火或蓝色传送门，再按E。');sync();}
  function openConversation(){
    const npc=DungeonWayfarers.near(world);if(!npc||$('traveler-dialog').open)return;
    conversation=npc;keys.clear();touch?.reset();aim?.reset();world.player.moving=false;
    $('traveler-speaker').textContent=npc.speaker;$('traveler-greeting').textContent=npc.greeting;$('traveler-detail').textContent=npc.detail;
    $('traveler-action').textContent=npc.action;$('traveler-action').disabled=!npc.available;
    const c=$('traveler-portrait').getContext('2d');c.clearRect(0,0,96,96);DungeonWayfarers.portrait(c,npc);
    $('traveler-dialog').showModal();audio.play('select');(!npc.available?$('traveler-close'):$('traveler-action')).focus();
  }
  function closeConversation(){
    conversation=null;$('traveler-dialog').close();keys.clear();touch?.reset();aim?.reset();last=performance.now();sync();
  }
  $('traveler-close').addEventListener('click',closeConversation);
  $('traveler-dialog').addEventListener('cancel',event=>{event.preventDefault();closeConversation();});
  $('traveler-action').addEventListener('click',()=>{
    const current=DungeonWayfarers.near(world);if(!conversation||!current||current.id!==conversation.id||!current.available){closeConversation();return;}
    closeConversation();const changed=world.interact();if(world.feedback&&world.state!=='shop')notice(world.feedback);if(changed)audio.play('select');last=performance.now();sync();
  });
  const moves=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
  window.addEventListener('keydown',event=>{
    if(!$('asset-loader').hidden){
      if(event.code==='Escape'){event.preventDefault();cancelLoading();}
      if(event.code==='Tab'){
        event.preventDefault();const buttons=[$('asset-cancel'),$('asset-retry')].filter(button=>!button.hidden);
        const index=buttons.indexOf(document.activeElement);buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
      }
      return;
    }
    if($('confirm-dialog').open||$('traveler-dialog').open)return;
    if(menu.page!=='game'){if(event.code==='Escape'&&menu.page!=='home'){event.preventDefault();menu.show(menu.returnTo);}return;}
    if(moves.has(event.code)){event.preventDefault();if(active())keys.add(event.code);return;}
    if(event.code==='Escape'){event.preventDefault();if(event.repeat)return;if(world.state==='shop'){world.closeShop();last=performance.now();sync();}else if(world.state==='paused')resume();else pause();}
    if(event.code==='KeyE'&&!event.repeat){event.preventDefault();interact();}
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>{pause('你离开了窗口，游戏已自动暂停。');audio.setInactive(true);});
  window.addEventListener('focus',()=>{if(!document.hidden)audio.setInactive(false);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('页面已隐藏，游戏自动暂停。');audio.setInactive(document.hidden||!document.hasFocus());});
  window.addEventListener('pagehide',()=>audio.setInactive(true));
  function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    if(ready){if(menu.page==='game'&&!$('confirm-dialog').open&&!$('traveler-dialog').open){const axis=(positive,negative)=>Number(positive.some(k=>keys.has(k)))-Number(negative.some(k=>keys.has(k)));const movement=DungeonTouch.combine({x:axis(['KeyD','ArrowRight'],['KeyA','ArrowLeft']),y:axis(['KeyS','ArrowDown'],['KeyW','ArrowUp'])},touch?.axis||{x:0,y:0});world.tick(dt,{...movement,fire:desktopFire||touch.attacking,aimMode:aimMode(),aimPoint:aim.point()});if(noticeTimer>0&&active()){noticeTimer-=dt;if(noticeTimer<=0)$('room-notice').hidden=true;}}
      const events=world.events.splice(0);for(const event of events){if(event.type==='chapter-clear'&&store.clearChapter(event.chapter,event.difficulty)){menu.renderStorage();notice(event.chapter===1&&event.difficulty==='normal'?'已解锁：第一章困难 / 第二章普通':event.chapter===2&&event.difficulty==='normal'?'已解锁：第二章困难':'困难试炼已通关，记录已保存',5);}audio.play(event.type,world.weapon.id,event);if(event.type==='guardian-enrage')notice('守卫能量失控！预警后每0.5秒一轮，寻找弹幕间隙。',3);if(event.type==='guardian-summon'&&event.count>0)notice(`守卫召唤了${event.count}只骷髅，现身后会近战追击！`,3);if(event.type==='phase')notice(world.chapter===2?(event.stage==='blackout'?'工厂断电 · 高压装置已停止':event.stage==='restart'?'核心过载 · 全厂设备重启！':'总装监工进入第二阶段！'):'守卫进入第二阶段！',2);if(event.type==='wave')notice(`${world.map.name} · 第 ${event.wave} / ${event.total} 波`,2);}
      renderer.settings=store.data.settings;sync();if(menu.page==='game')renderer.draw(world,now/1000);
    }updateAudio();requestAnimationFrame(frame);
  }
  menu.ready();sync();requestAnimationFrame(frame);if(store.warning)menu.toast(store.warning);
  Object.defineProperty(window,'lastWaveStatus',{value:()=>world.snapshot(),writable:false});
  Object.defineProperty(window,'lastWaveDiagnostics',{value:()=>({page:menu.page,profile:JSON.parse(store.export()),persistence:store.available,audio:audio.diagnostic(),touch:touch?.snapshot(),aim:{mode:aimMode(),choice:store.data.settings.aimMode,desktopFire,shots:world.nextVolley-1,pointer:aim.client?{...aim.client}:null,point:aim.point(),view:renderer?.view?{...renderer.view}:null}}),writable:false});
})();
