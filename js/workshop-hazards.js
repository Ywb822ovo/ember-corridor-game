(function(root){
  'use strict';
  const {distance}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const rules=Object.freeze({electric:{player:1,enemy:1200,warning:1.2,active:.8},press:{player:2,enemy:2000,warning:1.2,active:.2},steam:{player:1,enemy:1400,warning:1.2,active:.8},saw:{player:1,enemy:1400,warning:1.2}});
  function create(p){return {...JSON.parse(JSON.stringify(p)),state:p.type==='conveyor'?'running':'waiting',timer:p.delay??3,clock:0,hitIds:[],hitPlayer:false};}
  function sawPosition(p){const a=p.track.from,b=p.track.to,length=distance(a,b)||1,travel=(p.clock*(p.speed||100))%(length*2),t=(travel<=length?travel:length*2-travel)/length;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
  function damage(w,p,area,inside){
    const r=rules[p.type];
    if(!p.hitPlayer&&inside(w.player,area)){p.hitPlayer=true;w.hurt(p.playerDamage??r.player);}
    for(const e of w.enemies)if(e.hp>0&&e.warmup<=0&&!p.hitIds.includes(e.id)&&inside(e,area)){
      p.hitIds.push(e.id);w.damageEnemy(e,p.enemyDamage??r.enemy,{kind:'hazard',weaponId:'mechanism',volley:p.id+'-'+(p.cycle||0)});
    }
  }
  function tickPads(w,dt,reserve,inside){
    const s=w.workshop,off=s.offFor>1e-7;s.offFor=Math.max(0,s.offFor-dt);
    if(off)return;
    for(const p of s.pads){
      if(p.state==='off')continue;
      if(p.type==='conveyor'){
        p.state='running';p.clock=(p.clock||0)+dt;
        for(const body of [w.player,...w.enemies])if((body===w.player||body.hp>0&&body.warmup<=0)&&!(body.behavior==='rammer'&&body.mode==='charge')&&inside(body,p)){
          const speed=p.speed??80;w.geometry.move(body,Math.cos(p.angle||0)*speed*dt,Math.sin(p.angle||0)*speed*dt);
        }
        continue;
      }
      p.clock??=0;const r=rules[p.type];if(!r)continue;
      p.timer=Math.max(0,p.timer-dt);
      if(p.state==='waiting'&&p.timer===0&&reserve(w,r.warning+(r.active??.4)+.35,'mechanism')){
        p.state='warning';p.timer=r.warning;p.hitIds=[];p.hitPlayer=false;p.cycle=(p.cycle||0)+1;w.events.push({type:'warning'});
      }else if(p.state==='warning'&&p.timer===0){p.state='active';p.timer=r.active??1e9;w.events.push({type:'mechanism'});}
      else if(p.state==='active'&&p.timer===0){p.state='waiting';p.timer=3;}
      if(p.state==='active'){
        if(p.type==='saw'){
          const before=sawPosition(p);p.clock+=dt;const after=sawPosition(p),steps=Math.max(1,Math.ceil(distance(before,after)/4));
          // A sweep prevents a saw from skipping a body in a long frame.
          for(let i=1;i<=steps;i++)damage(w,p,{shape:'circle',x:before.x+(after.x-before.x)*i/steps,y:before.y+(after.y-before.y)*i/steps,radius:p.radius??22},inside);
          p.hitClock=(p.hitClock||0)+dt;if(p.hitClock>=.85){p.hitClock=0;p.hitIds=[];p.hitPlayer=false;}
        }else damage(w,p,p,inside);
      }
    }
  }
  const api={rules,create,sawPosition,tickPads};root.DungeonWorkshopHazards=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
