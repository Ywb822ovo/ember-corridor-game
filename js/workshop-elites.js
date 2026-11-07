(function(root){
  'use strict';
  const {distance}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const D=typeof module!=='undefined'?require('./difficulty.js'):root.DungeonDifficulty;
  const T=typeof module!=='undefined'?require('./tactics.js'):root.DungeonTactics;
  const templates=Object.freeze({mother:{hp:9000/1.4,speed:60/1.08,radius:24},worker:{hp:800/1.4,speed:140/1.08,radius:11},warden:{hp:12000/1.4,speed:55/1.08,radius:22,behavior:'rammer'}});
  function stats(kind,room){const t=templates[kind],c=D.coefficients(2,room.depth);return {hp:Math.round(t.hp*c.hp),speed:Math.round(t.speed*c.speed*1000)/1000,radius:t.radius,behavior:t.behavior,depthCoefficients:c};}
  const rammer=e=>e.kind==='warden'&&e.behavior==='rammer';
  const handles=e=>rammer(e)||['mother','worker'].includes(e.kind);
  function mother(w,e,dt){
    e.nextSummonAt??=w.roomTime+3;
    const children=w.enemies.filter(t=>t.kind==='worker'&&t.hp>0&&t.summonerId===e.id);
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup<=1e-7){
        e.windup=0;let count=0;
        if(children.length<=2&&w.enemies.length<=w.map.enemyLimit-2)for(let i=0;i<2;i++)if(w.spawn('worker',{summonerId:e.id,near:e}))count++;
        e.nextSummonAt+=10;while(e.nextSummonAt<=w.roomTime+1e-7)e.nextSummonAt+=10;e.mode='idle';w.events.push({type:'factory-summon',count});
      }return;
    }
    if(w.roomTime>=e.nextSummonAt-1-1e-7&&w.roomTime<e.nextSummonAt&&children.length<=2&&w.enemies.length<=w.map.enemyLimit-2){e.windup=1;e.mode='assemble';w.events.push({type:'warning'});return;}
    if(w.roomTime>=e.nextSummonAt){e.nextSummonAt+=10;return;}
    if(distance(e,w.player)>300)w.moveEnemy(e,w.player,dt);
  }
  function impact(w,e){e.mode='stunned';e.stunTimer=2;e.charge=0;e.windup=0;e.aim=null;e.chargePlan=null;w.events.push({type:'machine-impact'},{type:'mechanism'});}
  function plan(w,e){return T.chargePlan(w.geometry,e,{x:e.x+Math.cos(e.chargeAngle)*700,y:e.y+Math.sin(e.chargeAngle)*700},700);}
  function charge(w,e,dt,reserve){
    e.mode??='armored';
    if(e.mode==='stunned'){e.stunTimer=Math.max(0,e.stunTimer-dt);if(e.stunTimer<=1e-7){e.stunTimer=0;e.mode='armored';e.cooldown=2;}return;}
    if(e.mode==='charge'){
      e.angle=e.chargeAngle;
      const travel=Math.min(e.chargeRemaining,360*dt),steps=Math.max(1,Math.ceil(travel/4)),dx=Math.cos(e.chargeAngle)*travel/steps,dy=Math.sin(e.chargeAngle)*travel/steps;
      for(let i=0;i<steps;i++){
        if(!w.geometry.canStand(e.x+dx,e.y+dy,e.radius)){impact(w,e);return;}
        e.x+=dx;e.y+=dy;if(distance(e,w.player)<=e.radius+w.player.radius)w.hurt(2,e);
      }
      e.chargeRemaining=Math.max(0,e.chargeRemaining-travel);e.charge=e.chargeRemaining/360;
      if(e.chargeRemaining<=1e-7){e.mode='armored';e.cooldown=2;e.charge=0;e.chargePlan=null;}return;
    }
    if(e.windup>0){e.angle=e.chargeAngle;e.chargePlan=plan(w,e);e.windup=Math.max(0,e.windup-dt);if(e.windup<=1e-7){e.windup=0;e.mode='charge';e.chargeRemaining=700;e.charge=700/360;e.aim=null;}return;}
    e.cooldown=Math.max(0,e.cooldown-dt);w.moveEnemy(e,w.player,dt);
    if(!e.cooldown&&distance(e,w.player)<500&&w.geometry.visible(e,w.player,e.radius)){
      // Wait for the current danger, then get one turn before another floor activation.
      w.workshop.priorityEnemy=e.id;w.workshop.priorityUntil=w.roomTime+.2;
      if(!reserve(w,3.5,'rammer'))return;
      w.workshop.priorityEnemy=null;w.workshop.priorityUntil=0;
      e.windup=1;e.mode='windup';e.aim={x:w.player.x,y:w.player.y};e.chargeAngle=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);e.chargePlan=plan(w,e);w.events.push({type:'warning'});
    }
  }
  function update(w,e,dt,reserve){if(e.kind==='mother'){mother(w,e,dt);return true;}if(e.kind==='worker'){w.moveEnemy(e,w.player,dt);return true;}if(rammer(e)){charge(w,e,dt,reserve);return true;}return false;}
  function cleanup(w){const dead=new Set(w.enemies.filter(e=>e.kind==='mother'&&e.hp<=0).map(e=>e.id));if(!dead.size)return;w.enemies=w.enemies.filter(e=>{if(e.kind==='worker'&&e.hp>0&&dead.has(e.summonerId)){w.effects.push({x:e.x,y:e.y,type:'death',life:.3,maxLife:.3,value:0});return false;}return true;});}
  function label(e){if(e.kind==='mother')return e.windup>0?'装配母机 · 装配 '+e.windup.toFixed(1)+'秒':'装配母机 · 持续增兵';if(e.kind==='worker')return '近战小机器人';return e.mode==='stunned'?'撞墙眩晕 '+e.stunTimer.toFixed(1)+'秒 · 核心暴露':e.windup>0?'直线冲锋 · 躲到侧面':e.mode==='charge'?'重装冲锋':'重装冲锋者';}
  const api={templates,stats,rammer,handles,update,cleanup,label};root.DungeonWorkshopElites=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
