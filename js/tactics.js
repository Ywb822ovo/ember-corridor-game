(function(root){
  'use strict';
  const {distance}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const {center}=typeof module!=='undefined'?require('./combat.js'):root.DungeonCombat;
  function shotAngles(e){
    const origin=e.shotOrigin||center(e),angle=Math.atan2(e.aim.y-origin.y,e.aim.x-origin.x);
    if(e.kind!=='boss')return [angle];
    if(e.pattern==='ring')return Array.from({length:12},(_,i)=>angle+.15+(e.phase===2?(Math.floor(e.attackCount/2)%2)*Math.PI/12:0)+i*Math.PI/6);
    const half=e.phase===2?3:2;return Array.from({length:half*2+1},(_,i)=>angle+(i-half)*(e.phase===2?.15:.22));
  }
  function rayEnd(geometry,origin,angle,length,radius=10){
    let end={...origin};for(let d=0;d<=length;d+=2){const p={x:origin.x+Math.cos(angle)*Math.min(length,d+2),y:origin.y+Math.sin(angle)*Math.min(length,d+2)};if(!geometry.canStand(p.x,p.y,radius))break;end=p;}return end;
  }
  function chargePlan(geometry,e,target,length=170.5){
    const start={x:e.x,y:e.y},angle=Math.atan2(target.y-e.y,target.x-e.x),end=rayEnd(geometry,start,angle,length,e.radius);
    return {start,end,angle,length:distance(start,end)};
  }
  function projectile(world,origin,angle,speed=155){world.hostile.push({...origin,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:6,radius:10});}
  function updateElite(world,e,dt){
    if(e.recover>0){e.recover=Math.max(0,e.recover-dt);return;}
    if(e.charge>0){const plan=e.chargePlan,remaining=distance(e,plan.end),travel=Math.min(remaining,310*dt);e.x+=Math.cos(plan.angle)*travel;e.y+=Math.sin(plan.angle)*travel;e.charge=Math.max(0,(remaining-travel)/310);if(e.charge<1e-7){e.x=plan.end.x;e.y=plan.end.y;e.charge=0;e.recover=.8;}return;}
    if(e.windup>0){e.windup=Math.max(0,e.windup-dt);if(e.windup===0){e.chargePlan??=chargePlan(world.geometry,e,e.aim);e.chargeAngle=e.chargePlan.angle;e.charge=e.chargePlan.length/310;e.aim=null;e.cooldown=2.4;}return;}
    e.cooldown=Math.max(0,e.cooldown-dt);world.moveEnemy(e,world.player,dt);
    if(e.cooldown===0&&distance(e,world.player)<370&&world.geometry.visible(e,world.player,e.radius)){
      e.windup=.8;e.aim={x:world.player.x,y:world.player.y};e.chargePlan=chargePlan(world.geometry,e,e.aim);e.pattern='charge';world.events.push({type:'warning'});
    }
  }
  function updateBoss(world,e,dt){
    if(e.phaseTimer>0){e.phaseTimer=Math.max(0,e.phaseTimer-dt);return;}
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(e.windup===0){
        const origin=e.shotOrigin||center(e);for(const angle of shotAngles(e))projectile(world,origin,angle,e.pattern==='fan'?175:140);
        e.pattern=e.pattern==='fan'?'ring':'fan';e.cooldown=e.phase===2?1.2:1.6;e.aim=null;e.shotOrigin=null;e.attackCount++;
      }
      return;
    }
    e.cooldown=Math.max(0,e.cooldown-dt);
    if(distance(e,world.player)>210||!world.geometry.visible(center(e),center(world.player),10))world.moveEnemy(e,world.player,dt);
    if(e.cooldown===0&&world.geometry.visible(center(e),center(world.player),10)){
      e.windup=e.pattern==='ring'?1.15:.95;e.aim=center(world.player);e.shotOrigin=center(e);world.events.push({type:'warning'});
    }
  }
  function update(world,e,dt){if(e.kind==='elite'){updateElite(world,e,dt);return true;}if(e.kind==='boss'){updateBoss(world,e,dt);return true;}return false;}
  const api={update,shotAngles,rayEnd,chargePlan};root.DungeonTactics=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
