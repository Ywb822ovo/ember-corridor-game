(function(root){
  'use strict';
  const {distance}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const D=typeof module!=='undefined'?require('./difficulty.js'):root.DungeonDifficulty;
  const M=typeof module!=='undefined'?require('./machines.js'):root.DungeonMachines;
  // Separate additive templates keep the ten original templates and calibration unchanged.
  const templates=Object.freeze({repairDrone:{hp:1000/1.4,speed:100/1.08,radius:13},bomber:{hp:1400/1.4,speed:130/1.08,radius:15}});
  function stats(kind,room){const t=templates[kind],c=D.coefficients(2,room.depth);return {hp:Math.round(t.hp*c.hp),speed:Math.round(t.speed*c.speed*1000)/1000,radius:t.radius,depthCoefficients:c};}
  function repair(w,e,dt){
    e.cooldown=Math.max(0,e.cooldown-dt);
    const repairable=t=>t&&M.is(t)&&M.rank(t)!=='boss'&&!['repairDrone','bomber'].includes(t.kind);
    const valid=t=>repairable(t)&&t.hp>0&&t.warmup<=0&&distance(e,t)<=240&&w.geometry.visible(e,t,3);
    if(e.windup>0){
      const target=w.enemies.find(t=>t.id===e.repairTarget);e.windup=Math.max(0,e.windup-dt);
      if(!valid(target)){e.windup=0;e.repairTarget=null;e.cooldown=1;return;}
      if(!e.windup){const amount=Math.min(600,target.maxHp*.25,target.maxHp-target.hp);target.hp+=amount;e.cooldown=4;e.repairTarget=null;w.events.push({type:'machine-repair',amount});}return;
    }
    const injured=w.enemies.filter(t=>valid(t)&&t.hp<t.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    if(injured&&!e.cooldown){e.windup=1;e.repairTarget=injured.id;w.events.push({type:'warning'});return;}
    const ally=w.enemies.find(t=>repairable(t)&&t!==e&&t.hp>0);
    if(ally){if(distance(e,ally)>140)w.moveEnemy(e,ally,dt);}else w.moveEnemy(e,w.player,dt);
  }
  function bomber(w,e,dt){
    if(e.windup>0){
      e.windup=Math.max(0,e.windup-dt);
      if(!e.windup){
        e.hp=0;e.selfDestructed=true;
        if(distance(e,w.player)<=100+w.player.radius&&w.geometry.visible(e,w.player,3))w.hurt(1);
        for(const t of w.enemies)if(t!==e&&t.hp>0&&t.warmup<=0&&distance(e,t)<=100+t.radius&&w.geometry.visible(e,t,3))w.damageEnemy(t,1800,{kind:'hazard',weaponId:'self-destruct',volley:'blast-'+e.id});
        w.effects.push({x:e.x,y:e.y,type:'machine-blast',life:.3,maxLife:.3});w.events.push({type:'mechanism'});
      }return;
    }
    if(distance(e,w.player)<=130&&w.geometry.visible(e,w.player,3)){e.windup=1;w.events.push({type:'warning'});return;}
    w.moveEnemy(e,w.player,dt);
  }
  function update(w,e,dt){if(e.kind==='repairDrone'){repair(w,e,dt);return true;}if(e.kind==='bomber'){bomber(w,e,dt);return true;}return false;}
  const label=e=>e.kind==='repairDrone'?(e.windup>0?'维修蓄力 '+e.windup.toFixed(1)+'秒':'修理无人机'):(e.windup>0?'自爆倒计时 '+e.windup.toFixed(1)+'秒':'自爆搬运机');
  const api={templates,stats,update,label};root.DungeonWorkshopEnemies=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
