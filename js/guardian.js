(function(root){
  'use strict';
  const C=typeof module!=='undefined'?require('./combat.js'):root.DungeonCombat;
  const P=typeof module!=='undefined'?require('./progression.js'):root.DungeonProgression;
  const is=(w,e)=>Boolean(w.data.guardianRevamp&&w.chapter===1&&e.kind==='boss');
  const rooted=e=>Boolean(e.enraged||e.windup>0||e.recover>0||e.phaseTimer>0);
  function canStand(w,e,x,y){const origin=C.center({...e,x,y,bob:0});return w.geometry.canStand(x,y,e.radius)&&w.geometry.canStand(origin.x,origin.y,12);}
  function move(w,e,dx,dy){if(canStand(w,e,e.x+dx,e.y))e.x+=dx;if(canStand(w,e,e.x,e.y+dy))e.y+=dy;}
  function initialize(e){e.guardianMode??='idle';e.nextPattern??='fan';e.summonPhases??=[];e.attacksThisPhase??=0;e.burstCount??=0;}
  function shotAngles(e,difficulty='normal'){
    const origin=e.shotOrigin||C.center(e),aim=e.aim||origin,a=Math.atan2(aim.y-origin.y,aim.x-origin.x),hard=difficulty==='hard';
    if(e.pattern==='enrage'){const n=hard?24:18,start=(e.burstAngle||0)+(e.burstCount||0)*Math.PI/48;return Array.from({length:n},(_,i)=>start+i*Math.PI*2/n);}
    if(e.pattern==='ring'){const n=hard?16:12,start=a+.15+(e.phase===2?(Math.floor(e.attackCount/2)%2)*Math.PI/n:0);return Array.from({length:n},(_,i)=>start+i*Math.PI*2/n);}
    const half=(e.phase===2?3:2)+(hard?1:0),step=e.phase===2?.15:.22;return Array.from({length:half*2+1},(_,i)=>a+(i-half)*step);
  }
  function emit(w,e){
    const origin=e.shotOrigin||C.center(e),angles=shotAngles(e,w.difficulty),speed=(e.pattern==='fan'?175:140)*P.rules(w.difficulty).projectile;
    for(const a of angles)w.hostile.push({...origin,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:6,radius:e.enraged?7:10,energy:true,enraged:Boolean(e.enraged),ownerId:e.id});
    w.events.push({type:'guardian-shot',pattern:e.pattern,count:angles.length,phase:e.phase,time:w.elapsed});
  }
  function summon(w,e){
    if(e.hp<=0||w.player.hp<=0||w.state!=='combat')return 0;
    initialize(e);const cap=w.difficulty==='hard'?5:3,alive=w.enemies.filter(a=>a.kind==='skeleton'&&a.summonerId===e.id&&a.hp>0).length;let count=0;
    for(let i=alive;i<cap;i++)if(w.spawn('skeleton')){const a=w.enemies.at(-1);a.summonerId=e.id;a.warmup=1;count++;}
    w.events.push({type:'guardian-summon',count,phase:e.phase,time:w.elapsed});return count;
  }
  function transition(w,e){
    if(e.hp<=0||w.player.hp<=0)return false;
    if(e.hp<=e.maxHp*.2&&!e.enraged){
      initialize(e);e.enraged=true;e.phase=2;e.phaseTimer=0;e.windup=1;e.recover=0;e.cooldown=0;e.pattern='enrage';e.guardianMode='enrage-warning';e.enrageClock=1;e.shotOrigin=C.center(e);e.aim=C.center(w.player);e.burstAngle=Math.atan2(e.aim.y-e.shotOrigin.y,e.aim.x-e.shotOrigin.x);e.burstCount=0;w.hostile=[];w.events.push({type:'guardian-enrage',time:w.elapsed});return true;
    }
    if(e.hp<=e.maxHp*.5&&e.phase===1){e.phase=2;e.phaseTimer=1.2;e.windup=0;e.recover=0;e.cooldown=0;e.guardianMode='transition';e.aim=null;e.shotOrigin=null;e.nextPattern='fan';e.attacksThisPhase=0;w.hostile=[];w.events.push({type:'phase'});return true;}
    return false;
  }
  function update(w,e,dt){
    if(!is(w,e))return false;if(e.hp<=0||w.player.hp<=0)return true;initialize(e);if(transition(w,e))return true;
    if(e.phaseTimer>0){e.phaseTimer=Math.max(0,e.phaseTimer-dt);if(!e.phaseTimer)e.guardianMode='idle';return true;}
    if(e.enraged){
      e.enrageClock=Math.max(0,e.enrageClock-dt);
      if(e.guardianMode==='enrage-warning')e.windup=e.enrageClock;
      if(e.enrageClock<1e-7){e.windup=0;e.guardianMode='enrage';emit(w,e);e.burstCount++;e.enrageClock+=.5;}
      return true;
    }
    e.cooldown=Math.max(0,e.cooldown-dt);
    if(e.recover>0){e.recover=Math.max(0,e.recover-dt);if(e.recover<1e-7){e.recover=0;e.guardianMode='idle';}return true;}
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup<1e-7){
        e.windup=0;
        if(e.pattern==='summon'){summon(w,e);e.summonPhases.push(e.phase);}
        else{emit(w,e);e.nextPattern=e.pattern==='fan'?'ring':'fan';e.attacksThisPhase++;e.attackCount++;}
        e.recover=e.phase===2?.5:1;e.cooldown=e.phase===2?1.2:1.6;e.guardianMode='recover';e.aim=null;e.shotOrigin=null;
      }
      return true;
    }
    const origin=C.center(e),aim=C.center(w.player),visible=w.geometry.visible(origin,aim,10);
    if(Math.hypot(e.x-w.player.x,e.y-w.player.y)>210||!visible)w.moveEnemy(e,w.player,dt);
    const next=e.attacksThisPhase>=2&&!e.summonPhases.includes(e.phase)?'summon':e.nextPattern;
    if(e.cooldown<1e-7&&(next==='summon'||w.geometry.visible(C.center(e),C.center(w.player),10))){
      e.pattern=next;e.windup=next==='summon'?1:next==='ring'?1.15:.95;e.guardianMode='cast';e.aim=C.center(w.player);e.shotOrigin=C.center(e);w.events.push({type:'guardian-cast',pattern:next,time:w.elapsed});w.events.push({type:'warning'});
    }
    return true;
  }
  function afterDamage(w){
    const dead=new Set(w.enemies.filter(e=>is(w,e)&&e.hp<=0).map(e=>e.id));
    if(dead.size){w.enemies=w.enemies.filter(e=>!(e.kind==='skeleton'&&e.hp>0&&dead.has(e.summonerId)));w.hostile=[];w.events.push({type:'summon-dismiss'});}
    for(const e of w.enemies)if(is(w,e)&&e.hp>0)transition(w,e);
  }
  function label(e){return e.enraged?(e.guardianMode==='enrage-warning'?'能量失控 · 即将爆发':'能量失控 · 每0.5秒一轮'):e.phaseTimer>0?'第二阶段 · 力量觉醒':e.recover>0?`施法后摇 · ${e.recover.toFixed(1)}秒`:e.windup>0?(e.pattern==='summon'?'召唤骷髅兵':e.pattern==='ring'?'环形能量球':'扇形能量球'):'寻找机会，留意下一次预警';}
  const api={is,rooted,canStand,move,shotAngles,summon,update,afterDamage,label};root.DungeonGuardian=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
