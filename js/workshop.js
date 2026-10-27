(function(root){
  'use strict';
  const {distance,clamp}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const {center}=typeof module!=='undefined'?require('./combat.js'):root.DungeonCombat;
  const T=typeof module!=='undefined'?require('./tactics.js'):root.DungeonTactics;
  const M=typeof module!=='undefined'?require('./machines.js'):root.DungeonMachines;
  const P=typeof module!=='undefined'?require('./progression.js'):root.DungeonProgression;
  function create(map){return {pads:(map.mechanisms||[]).map(p=>({...p,state:'waiting',timer:p.delay??3,hitIds:[],hitPlayer:false})),offFor:0,cooldown:0,dangerUntil:0,owner:null,shotUntil:0};}
  function reserve(w,duration,owner='enemy'){
    if(w.roomTime+1e-7<w.workshop.dangerUntil)return false;
    w.workshop.dangerUntil=w.roomTime+duration;w.workshop.owner=owner;return true;
  }
  function inside(body,area){
    if(area.shape==='circle')return distance(body,area)<=area.radius+(body.radius||13);
    let x=body.x,y=body.y;
    if(area.shape==='box'){const dx=x-area.x,dy=y-area.y,a=area.angle||0;x=dx*Math.cos(a)+dy*Math.sin(a);y=-dx*Math.sin(a)+dy*Math.cos(a);return Math.hypot(x-clamp(x,0,area.w),y-clamp(y,-area.h/2,area.h/2))<(body.radius||13);}
    return Math.hypot(x-clamp(x,area.x,area.x+area.w),y-clamp(y,area.y,area.y+area.h))<(body.radius||13);
  }
  function threat(w,area){w.threats.push({...area,id:w.nextId++,remaining:area.warning,phase:'warning',hitPlayer:false});w.events.push({type:'warning'});}
  function control(w){
    if(w.completed[w.roomIndex]){w.feedback='房间已清空，机关已经断电。';return false;}
    if(w.workshop.cooldown>0){w.feedback=`控制台冷却中：${Math.ceil(w.workshop.cooldown)}秒`;return false;}
    w.workshop.offFor=4;w.workshop.cooldown=10;
    if(w.workshop.owner==='mechanism')w.workshop.dangerUntil=w.roomTime;
    for(const p of w.workshop.pads){p.state='waiting';p.timer=0;p.hitIds=[];p.hitPlayer=false;}
    w.feedback='机关已关闭4秒。恢复后会重新预警。';w.events.push({type:'poweroff'});return true;
  }
  function tick(w,dt){
    if(w.map.chapter!==2)return;
    const s=w.workshop;s.cooldown=Math.max(0,s.cooldown-dt);const off=s.offFor>0;s.offFor=Math.max(0,s.offFor-dt);
    if(!off)for(const p of s.pads){
      p.timer=Math.max(0,p.timer-dt);
      if(p.state==='waiting'&&p.timer===0&&reserve(w,1.2+(p.type==='press'?.2:.8)+.35,'mechanism')){p.state='warning';p.timer=1.2;p.hitIds=[];p.hitPlayer=false;w.events.push({type:'warning'});}
      else if(p.state==='warning'&&p.timer===0){p.state='active';p.timer=p.type==='press'?.2:.8;w.events.push({type:'mechanism'});}
      else if(p.state==='active'&&p.timer===0){p.state='waiting';p.timer=3;}
      if(p.state==='active'){
        if(!p.hitPlayer&&inside(w.player,p)){p.hitPlayer=true;w.hurt(p.type==='press'?2:1);}
        for(const e of w.enemies)if(e.hp>0&&e.warmup<=0&&!p.hitIds.includes(e.id)&&inside(e,p)){p.hitIds.push(e.id);w.damageEnemy(e,p.type==='press'?2000:1200,{kind:'hazard',weaponId:'mechanism',volley:'pad-'+p.id+'-'+w.roomTime});}
      }
    }
    for(const t of w.threats){
      if(t.cancelOnDeath&&!w.enemies.some(e=>e.id===t.ownerId&&e.hp>0)){t.phase='done';continue;}
      if(t.delay>0){t.delay=Math.max(0,t.delay-dt);continue;}
      t.remaining=Math.max(0,t.remaining-dt);
      if(t.phase==='warning'&&t.remaining===0){t.phase='active';t.remaining=t.active??.2;w.events.push({type:'mechanism'});}
      else if(t.phase==='active'&&t.remaining===0)t.phase='done';
      if(t.phase==='active'&&!t.hitPlayer&&inside(w.player,t)){t.hitPlayer=true;w.hurt(t.damage??1);}
    }
    w.threats=w.threats.filter(t=>t.phase!=='done');
  }
  function shot(w,e){const a=Math.atan2(e.aim.y-e.shotOrigin.y,e.aim.x-e.shotOrigin.x),speed=195*P.rules(w.difficulty).projectile;w.hostile.push({...e.shotOrigin,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,radius:10});w.events.push({type:'enemyshot'});}
  function hound(w,e,dt){
    e.mode??='chase';
    if(e.mode==='recover'){e.recover=Math.max(0,e.recover-dt);if(!e.recover)e.mode='chase';return;}
    if(e.mode==='charge'){
      const plan=e.chargePlan,remaining=distance(e,plan.end),travel=Math.min(remaining,330*dt);e.x+=Math.cos(plan.angle)*travel;e.y+=Math.sin(plan.angle)*travel;e.charge=Math.max(0,(remaining-travel)/330);
      if(e.charge<1e-7){e.x=plan.end.x;e.y=plan.end.y;e.charge=0;e.mode='recover';e.recover=.9;e.cooldown=.4;}return;
    }
    if(e.mode==='windup'){e.windup=Math.max(0,e.windup-dt);if(!e.windup){e.mode='charge';e.charge=e.chargePlan.length/330;e.aim=null;if(!e.charge){e.mode='recover';e.recover=.9;}}return;}
    e.cooldown=Math.max(0,e.cooldown-dt);w.moveEnemy(e,w.player,dt);
    if(!e.cooldown&&distance(e,w.player)<230&&w.geometry.visible(e,w.player,e.radius)&&reserve(w,2.25)){
      e.mode='windup';e.windup=.8;e.aim={x:w.player.x,y:w.player.y};e.chargePlan=T.chargePlan(w.geometry,e,e.aim,165);w.events.push({type:'warning'});
    }
  }
  function pulse(w,e,dt){
    e.mode??='move';
    if(e.mode==='burst'){
      e.burstClock-=dt;
      if(e.burstClock<=0){shot(w,e);e.burstLeft--;e.burstClock+=.22;if(!e.burstLeft){e.mode='move';e.cooldown=1.8;e.aim=null;e.shotOrigin=null;}}return;
    }
    if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(!e.windup){e.mode='burst';e.burstLeft=3;e.burstClock=0;}return;}
    e.cooldown=Math.max(0,e.cooldown-dt);const d=distance(e,w.player),visible=w.geometry.visible(center(e),center(w.player),10);
    if(d>340||!visible)w.moveEnemy(e,w.player,dt);
    else if(d<190){const targets=w.geometry.floor.filter(p=>distance(p,w.player)>d+60);if(targets.length)w.moveEnemy(e,targets.reduce((a,b)=>distance(a,e)<distance(b,e)?a:b),dt);}
    if(!e.cooldown&&d<500&&visible&&w.roomTime>=w.workshop.shotUntil){e.windup=.9;e.aim=center(w.player);e.shotOrigin=center(e);w.workshop.shotUntil=w.roomTime+1.5;w.events.push({type:'warning'});}
  }
  function grenadier(w,e,dt){
    e.cooldown=Math.max(0,e.cooldown-dt);
    const d=distance(e,w.player),visible=w.geometry.visible(e,w.player,3);
    if(d>360||!visible)w.moveEnemy(e,w.player,dt);
    if(!e.cooldown&&d<420&&visible&&!w.threats.some(t=>t.kind==='grenade')&&reserve(w,1.55)){
      threat(w,{kind:'grenade',shape:'circle',x:w.player.x,y:w.player.y,radius:70,warning:1.2,active:.2,damage:1,origin:center(e),ownerId:e.id});e.cooldown=3.8;
    }
  }
  function warden(w,e,dt){
    e.mode??='armored';
    if(e.mode==='open'){e.openTimer=Math.max(0,e.openTimer-dt);if(!e.openTimer){e.mode='armored';e.cooldown=2;}return;}
    if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(!e.windup){e.mode='open';e.openTimer=2;e.aim=null;}return;}
    e.cooldown=Math.max(0,e.cooldown-dt);w.moveEnemy(e,w.player,dt);
    if(!e.cooldown&&distance(e,w.player)<250&&w.geometry.visible(e,w.player,e.radius)&&reserve(w,3.4)){
      e.windup=1;e.aim={x:w.player.x,y:w.player.y};e.mode='windup';const angle=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);
      threat(w,{kind:'warden-slam',shape:'box',x:e.x,y:e.y,angle,w:160,h:80,warning:1,active:.2,damage:2,ownerId:e.id,cancelOnDeath:true});
    }
  }
  function overseer(w,e,dt){
    e.mode??='idle';e.attackIndex??=0;e.summonPhases??=[];
    if(e.phaseTimer>0){e.phaseTimer=Math.max(0,e.phaseTimer-dt);return;}
    if(e.mode==='summon'){
      if(!w.enemies.some(p=>p.summonerId===e.id&&p.hp>0)){e.mode='core';e.openTimer=2;w.events.push({type:'core'});}return;
    }
    if(e.mode==='core'){e.openTimer=Math.max(0,e.openTimer-dt);if(!e.openTimer){e.mode='idle';e.cooldown=1;}return;}
    if(e.actionTimer>0){e.actionTimer=Math.max(0,e.actionTimer-dt);e.windup=Math.max(0,e.windup-dt);if(!e.actionTimer){e.mode='idle';e.cooldown=e.phase===2?.9:1.3;e.windup=0;}return;}
    e.cooldown=Math.max(0,e.cooldown-dt);if(distance(e,w.player)>260)w.moveEnemy(e,w.player,dt);if(e.cooldown>0)return;
    let action=e.attackIndex++%3;if(action===2&&e.summonPhases.includes(e.phase))action=0;
    if(action===0){
      if(!reserve(w,2.4)){e.attackIndex--;return;}e.mode='beams';e.actionTimer=2.1;e.windup=1.3;
      const size=w.map.tileSize,width=w.map.cols*size;
      for(const x of [width/3-32,width*2/3-32])threat(w,{kind:'beam',shape:'rect',x,y:size,w:64,h:(w.map.rows-2)*size,warning:1.3,active:.6,damage:1,ownerId:e.id,cancelOnDeath:true});
    }else if(action===1){
      if(!reserve(w,3.25)){e.attackIndex--;return;}e.mode='hammers';e.actionTimer=2.9;e.windup=1.2;e.hammersLeft=3;e.hammerClock=0;
    }else{
      e.mode='summon';e.summonPhases.push(e.phase);e.windup=0;
      for(let i=0;i<2;i++)if(w.spawn('hound'))w.enemies.at(-1).summonerId=e.id;
      w.events.push({type:'summon'});
    }
  }
  function update(w,e,dt){
    if(!M.is(e))return false;
    if(e.kind==='hound')hound(w,e,dt);
    if(e.kind==='pulse')pulse(w,e,dt);
    if(e.kind==='grenadier')grenadier(w,e,dt);
    if(e.kind==='warden')warden(w,e,dt);
    if(e.kind==='overseer'){
      overseer(w,e,dt);
      if(e.mode==='hammers'&&e.hammersLeft>0){e.hammerClock-=dt;if(e.hammerClock<=0){threat(w,{kind:'hammer',shape:'circle',x:w.player.x,y:w.player.y,radius:75,warning:1.2,active:.2,damage:2,ownerId:e.id,cancelOnDeath:true});e.hammerClock+=.55;e.hammersLeft--;}}
    }
    return true;
  }
  function afterTick(w){
    for(const e of w.enemies)if(e.kind==='overseer'&&e.hp>0&&e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;e.phaseTimer=1.5;e.mode=w.enemies.some(p=>p.summonerId===e.id&&p.hp>0)?'summon':'idle';e.actionTimer=0;e.windup=0;e.cooldown=0;e.attackIndex=0;e.hammersLeft=0;w.threats=[];w.hostile=[];w.workshop.dangerUntil=w.roomTime+1.5;w.events.push({type:'phase'});}
  }
  function separate(w,dt){
    for(const e of w.enemies)if(M.is(e)&&e.warmup<=0&&!e.windup&&!e.charge&&e.mode!=='burst')for(const other of w.enemies){
      if(other.id>=e.id||other.warmup>0||other.windup||other.charge||other.mode==='burst')continue;
      const d=distance(e,other),r=Math.min(38,e.radius+other.radius);if(d>0&&d<r)w.geometry.move(e,(e.x-other.x)/d*22*dt,(e.y-other.y)/d*22*dt);
    }
  }
  function multiplier(e,source){if(source.kind==='hazard')return 1;if(e.kind==='warden')return e.mode==='open'?1.5:.6;if(e.kind==='overseer'&&e.mode==='core')return 1.5;return 1;}
  function label(e){return e.kind==='warden'?(e.mode==='open'?'核心暴露 · 易伤':e.windup>0?'液压砸击蓄力':'装甲开启 · 减伤'):e.kind==='overseer'?(e.mode==='core'?'核心暴露':e.mode==='summon'?'维修召集':e.mode==='beams'?'轨道电束':e.mode==='hammers'?'三连落锤':'总装监工'):e.kind==='hound'?(e.windup>0?'扑击蓄力':e.recover>0?'扑空停顿':'齿轮猎犬'):e.kind==='pulse'?(e.mode==='burst'?'脉冲三连发':'脉冲射手'):'投雷工匠';}
  const api={create,reserve,inside,threat,control,tick,update,afterTick,separate,multiplier,label};root.DungeonWorkshop=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
