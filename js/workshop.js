(function(root){
  'use strict';
  const {distance,clamp}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const {center}=typeof module!=='undefined'?require('./combat.js'):root.DungeonCombat;
  const T=typeof module!=='undefined'?require('./tactics.js'):root.DungeonTactics;
  const M=typeof module!=='undefined'?require('./machines.js'):root.DungeonMachines;
  const P=typeof module!=='undefined'?require('./progression.js'):root.DungeonProgression;
  const H=typeof module!=='undefined'?require('./workshop-hazards.js'):root.DungeonWorkshopHazards;
  const N=typeof module!=='undefined'?require('./workshop-enemies.js'):root.DungeonWorkshopEnemies;
  const E=typeof module!=='undefined'?require('./workshop-elites.js'):root.DungeonWorkshopElites;
  function create(map){return {pads:(map.mechanisms||[]).map(H.create),offFor:0,cooldown:0,dangerUntil:0,owner:null,shotUntil:0};}
  function reserve(w,duration,owner='enemy'){
    if(w.map.bossRules){
      const family=owner==='enemy'?'hound':owner,s=w.workshop;
      s.reservations=(s.reservations||[]).filter(r=>r.until>w.roomTime);
      const families=activeFamilies(w);
      if(owner==='enemy'&&families.includes('hound')||!families.includes(family)&&families.length>=2)return false;
      s.reservations.push({family,until:w.roomTime+duration});s.dangerUntil=Math.max(s.dangerUntil,w.roomTime+duration);s.owner=family;return true;
    }
    const s=w.workshop;if(owner!=='rammer'&&s.priorityUntil>w.roomTime&&w.enemies.some(e=>e.id===s.priorityEnemy&&e.hp>0&&E.rammer(e)))return false;
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
    const s=w.workshop;s.cooldown=Math.max(0,s.cooldown-dt);if(w.map.bossRules)tickBossPads(w,dt);else H.tickPads(w,dt,reserve,inside);
    for(const t of w.threats){
      if(t.cancelOnDeath&&!w.enemies.some(e=>e.id===t.ownerId&&e.hp>0)){t.phase='done';continue;}
      if(t.delay>0){t.delay=Math.max(0,t.delay-dt);continue;}
      t.remaining=Math.max(0,t.remaining-dt);
      if(t.phase==='warning'&&t.remaining===0){if(t.kind==='edge'){if(edgeFire(w,t))t.phase='done';continue;}t.phase='active';t.remaining=t.active??.2;w.events.push({type:'mechanism'});}
      else if(t.phase==='active'&&t.remaining===0)t.phase='done';
      if(t.phase==='active'&&!t.hitPlayer&&inside(w.player,t)){t.hitPlayer=true;w.hurt(t.damage??1);}
    }
    w.threats=w.threats.filter(t=>t.phase!=='done');
  }
  function shot(w,e){const a=Math.atan2(e.aim.y-e.shotOrigin.y,e.aim.x-e.shotOrigin.x),speed=(e.projectileSpeed??195)*P.rules(w.difficulty).projectile;w.hostile.push({...e.shotOrigin,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,radius:10});w.events.push({type:'enemyshot'});}
  function hound(w,e,dt){
    const boss=w.enemies.find(b=>b.id===e.summonerId&&b.kind==='overseer');
    if(boss&&(boss.phaseTimer>0||boss.restTimer>0||boss.summonIntro>0)){e.windup=0;e.charge=0;e.chargePlan=null;e.mode='chase';e.cooldown=.8;return;}
    e.mode??='chase';
    if(e.mode==='recover'){e.recover=Math.max(0,e.recover-dt);if(!e.recover)e.mode='chase';return;}
    if(e.mode==='charge'){
      const plan=e.chargePlan,remaining=distance(e,plan.end),travel=Math.min(remaining,330*dt);let blocked=false;
      if(w.cfg.workshopV2){
        // Conveyors may offset a locked charge. Stop on a collision instead of snapping through a wall.
        const steps=Math.max(1,Math.ceil(travel/4)),vx=(plan.end.x-e.x)/(remaining||1)*travel/steps,vy=(plan.end.y-e.y)/(remaining||1)*travel/steps;
        for(let i=0;i<steps;i++){const x=e.x,y=e.y;w.geometry.move(e,vx,vy);if(distance({x,y},e)<Math.hypot(vx,vy)-.001){blocked=true;break;}}
      }else{e.x+=Math.cos(plan.angle)*travel;e.y+=Math.sin(plan.angle)*travel;}
      e.charge=blocked?0:Math.max(0,(remaining-travel)/330);
      if(e.charge<1e-7){if(!blocked){e.x=plan.end.x;e.y=plan.end.y;}e.charge=0;e.mode='recover';e.recover=.9;e.cooldown=.4;}return;
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
  function bounds(map){
    const cells=[];map.walk.forEach((row,y)=>row.forEach((ok,x)=>{if(ok)cells.push({x,y});}));const size=map.tileSize;
    const x=Math.min(...cells.map(p=>p.x))*size,y=Math.min(...cells.map(p=>p.y))*size;
    return {x,y,w:(Math.max(...cells.map(p=>p.x))+1)*size-x,h:(Math.max(...cells.map(p=>p.y))+1)*size-y};
  }
  function subtract(area,cut){
    const l=Math.max(area.x,cut.x),r=Math.min(area.x+area.w,cut.x+cut.w),t=Math.max(area.y,cut.y),b=Math.min(area.y+area.h,cut.y+cut.h);
    if(l>=r||t>=b)return [area];
    return [{x:area.x,y:area.y,w:area.w,h:t-area.y},{x:area.x,y:b,w:area.w,h:area.y+area.h-b},{x:area.x,y:t,w:l-area.x,h:b-t},{x:r,y:t,w:area.x+area.w-r,h:b-t}].filter(a=>a.w>0&&a.h>0);
  }
  function laserAreas(w,parity){
    const map=w.map,r=map.bossRules,b=bounds(map),size=map.tileSize,width=b.w/r.columns,areas=[];
    const cuts=[{x:r.anchor.x-56,y:r.anchor.y-104,w:112,h:120},{x:map.start.x-70,y:map.start.y-60,w:140,h:120}];
    for(let col=parity;col<r.columns;col+=2){
      const left=b.x+col*width,right=left+width,edges=[left,right];
      for(let x=Math.ceil(left/size)*size;x<right;x+=size)edges.push(x);
      for(const s of map.solids||[])for(const x of [s.x,s.x+s.w])if(x>left&&x<right)edges.push(x);
      edges.sort((a,b)=>a-b);
      for(let i=1;i<edges.length;i++){
        const x=(edges[i-1]+edges[i])/2;let bottom=b.y+b.h;
        for(let row=Math.floor(b.y/size);row<map.rows-1;row++)if(!map.walk[row]?.[Math.floor(x/size)]){bottom=row*size;break;}
        for(const s of map.solids||[])if(x>=s.x&&x<s.x+s.w&&s.y>=b.y)bottom=Math.min(bottom,s.y);
        let pieces=[{x:edges[i-1],y:b.y,w:edges[i]-edges[i-1],h:bottom-b.y}];
        for(const cut of cuts)pieces=pieces.flatMap(a=>subtract(a,cut));
        areas.push(...pieces.filter(a=>a.h>0).map(a=>({...a,column:col+1})));
      }
    }
    return areas;
  }
  function edgePoints(w,side,count){const b=bounds(w.map);return Array.from({length:count},(_,i)=>{const t=(i+.5)/count;return side===0?{x:b.x+b.w*t,y:b.y+14}:side===1?{x:b.x+b.w-14,y:b.y+b.h*t}:side===2?{x:b.x+b.w*t,y:b.y+b.h-14}:{x:b.x+14,y:b.y+b.h*t};});}
  function edgeFire(w,t){
    const cap=w.difficulty==='hard'?20:15;if(w.hostile.length+t.count>cap)return false;
    const angle=[Math.PI/2,Math.PI,-Math.PI/2,0][t.side],speed=w.map.bossRules.edge.speed*P.rules(w.difficulty).projectile;
    for(const p of edgePoints(w,t.side,t.count))w.hostile.push({...p,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius:7,life:7,ownerId:t.ownerId});
    w.events.push({type:'enemyshot'});return true;
  }
  function expose(w,e){
    const r=w.map.bossRules;e.mode='core';e.openTimer=e.phase===2?r.overload.exposure:r.exposure;e.restTimer=e.phase===2?r.overload.rest:r.rest;e.windup=0;e.actionTimer=0;
    stopEquipment(w);w.workshop.reservations=[];
    for(const dog of w.enemies.filter(d=>d.summonerId===e.id)){dog.windup=0;dog.charge=0;dog.chargePlan=null;dog.mode='chase';dog.cooldown=.8;}
    w.events.push({type:'core'});
  }
  function bossSummon(w,e){
    e.mode='summon';e.summonPhases.push(e.phase);e.windup=0;
    for(let i=0;i<2;i++)if(w.spawn('hound',{summonerId:e.id}))w.enemies.at(-1).summonerId=e.id;
    w.events.push({type:'summon'});
    if(e.phase===2){e.mode='summon-start';e.summonIntro=1;}
  }
  function bossPulse(w,e){
    const r=w.map.bossRules,laser=e.phase===2?r.overload.laser:r.laser;
    const areas=laserAreas(w,e.pulseIndex%2);
    if(!escapeRoute(w,areas,laser.warning)){stopEquipment(w);if(!escapeRoute(w,areas,laser.warning))return false;}
    for(const a of areas)threat(w,{...a,kind:'laser',family:'laser',pulse:e.pulseIndex,shape:'rect',warning:laser.warning,active:laser.active,damage:1,ownerId:e.id,cancelOnDeath:true});
    e.pulseIndex++;
    e.nextPulseAt=e.actionClock+laser.warning+laser.active+(e.phase===2||e.pulseIndex%2?laser.gap:0);
    return true;
  }
  function overseer(w,e,dt){
    const r=w.map.bossRules;if(!r)return;e.mode??='idle';e.attackIndex??=0;e.summonPhases??=[];e.bob=0;e.angle=0;Object.assign(e,r.anchor);
    if(e.phaseTimer>0){e.phaseTimer=Math.max(0,e.phaseTimer-dt);if(!e.phaseTimer){e.mode='idle';e.restartAt=w.roomTime;e.cooldown=0;w.events.push({type:'phase',stage:'restart'});}return;}
    if(e.phase===2&&!e.summonPhases.includes(2)){bossSummon(w,e);return;}
    if(e.summonIntro>0){e.summonIntro=Math.max(0,e.summonIntro-dt);if(!e.summonIntro)e.mode='idle';return;}
    if(e.mode==='summon'){if(!w.enemies.some(p=>p.summonerId===e.id&&p.hp>0))expose(w,e);return;}
    if(e.restTimer>0){
      e.openTimer=Math.max(0,e.openTimer-dt);e.restTimer=Math.max(0,e.restTimer-dt);
      e.mode=e.openTimer>0?'core':'rest';if(!e.restTimer){e.mode='idle';e.cooldown=0;}return;
    }
    if(e.actionTimer>0){
      e.actionTimer=Math.max(0,e.actionTimer-dt);e.actionClock+=dt;e.windup=Math.max(0,e.windup-dt);
      if(e.mode==='laser'){
        const laser=e.phase===2?r.overload.laser:r.laser,total=e.phase===2?laser.pulses:laser.pairs*2;
        if(e.pulseIndex<total&&e.actionClock+1e-7>=e.nextPulseAt)bossPulse(w,e);
        // A safety delay may extend a major skill, but never shortens a telegraph or drops a pulse.
        if(e.pulseIndex<total&&!e.actionTimer)e.actionTimer=.01;
      }
      if(e.mode==='hammers'&&e.hammersLeft>0&&e.actionClock+1e-7>=(3-e.hammersLeft)*r.hammer.spacing){
        threat(w,{kind:'hammer',family:'hammer',shape:'circle',x:w.player.x,y:w.player.y,radius:r.hammer.radius,warning:r.hammer.warning,active:r.hammer.active,damage:2,ownerId:e.id,cancelOnDeath:true});e.hammersLeft--;
      }
      if(!e.actionTimer&&!w.threats.some(t=>t.ownerId===e.id))expose(w,e);
      else if(!e.actionTimer)e.actionTimer=.01;
      return;
    }
    e.cooldown=Math.max(0,e.cooldown-dt);if(e.cooldown)return;
    if(e.phase===1&&e.attackIndex>=4&&!e.summonPhases.includes(1)){bossSummon(w,e);return;}
    const action=e.attackIndex%(e.phase===2?3:4),family=['laser','edge','hammer','beam'][action];
    if(action===1&&w.hostile.length+(e.phase===2?r.overload.edgeCount:r.edge.count)>(w.difficulty==='hard'?20:15))return;
    if(!reserve(w,.01,family))return;
    e.attackIndex++;e.actionClock=0;e.mode=['laser','edge','hammers','beams'][action];
    if(action===0){const l=e.phase===2?r.overload.laser:r.laser;e.pulseIndex=0;e.actionTimer=e.phase===2?l.pulses*(l.warning+l.active)+(l.pulses-1)*l.gap:r.laser.pairs*(2*(l.warning+l.active)+l.gap);e.windup=l.warning;bossPulse(w,e);}
    if(action===1){e.edgeSide??=0;e.actionTimer=r.edge.warning+.05;threat(w,{kind:'edge',family:'edge',shape:'edge',side:e.edgeSide++%4,count:e.phase===2?r.overload.edgeCount:r.edge.count,warning:r.edge.warning,active:0,ownerId:e.id,cancelOnDeath:true});}
    if(action===2){e.actionTimer=r.hammer.warning+2*r.hammer.spacing+r.hammer.active+.01;e.hammersLeft=3;e.windup=r.hammer.warning;}
    if(action===3){const b=bounds(w.map);e.actionTimer=r.beam.warning+r.beam.active;e.windup=r.beam.warning;for(const x of [b.x+b.w/3-r.beam.width/2,b.x+b.w*2/3-r.beam.width/2])threat(w,{kind:'beam',family:'beam',shape:'rect',x,y:b.y,w:r.beam.width,h:b.h,warning:r.beam.warning,active:r.beam.active,damage:1,ownerId:e.id,cancelOnDeath:true});}
  }
  function update(w,e,dt){
    if(!M.is(e))return false;
    if(E.update(w,e,dt,reserve))return true;
    if(N.update(w,e,dt))return true;
    if(e.kind==='hound')hound(w,e,dt);
    if(e.kind==='pulse')pulse(w,e,dt);
    if(e.kind==='grenadier')grenadier(w,e,dt);
    if(e.kind==='warden')warden(w,e,dt);
    if(e.kind==='overseer'){
      overseer(w,e,dt);
    }
    return true;
  }
  function clearBossThreats(w,e){
    w.threats=[];w.hostile=[];
    // Despawn without kill rewards: these actors belong to the interrupted boss skill.
    w.enemies=w.enemies.filter(p=>p.summonerId!==e.id);
    for(const p of w.workshop.pads){p.state='off';p.timer=0;p.hitPlayer=false;p.hitIds=[];}
    w.workshop.reservations=[];w.workshop.owner=null;w.workshop.dangerUntil=w.roomTime;
  }
  function stopEquipment(w){for(const p of w.workshop.pads){p.state='off';p.timer=0;p.nextAt=null;p.hitIds=[];p.hitPlayer=false;}}
  function activeFamilies(w){
    const families=new Set();
    for(const t of w.threats)if(t.phase==='warning'||t.phase==='active')families.add(t.family||t.kind);
    for(const p of w.workshop.pads)if(p.state==='warning'||p.state==='active')families.add(p.type);
    for(const r of w.workshop.reservations||[])if(r.until>w.roomTime)families.add(r.family);
    for(const e of w.enemies)if(e.hp>0){
      if(e.kind==='overseer'&&e.actionTimer>0)families.add(({laser:'laser',edge:'edge',hammers:'hammer',beams:'beam'})[e.mode]);
      if(e.kind==='hound'&&e.summonerId){if(e.warmup>0)families.add('summon');if(e.windup>0||e.mode==='charge')families.add('hound');}
    }
    families.delete(undefined);return [...families];
  }
  function escapeRoute(w,proposed,warning){
    // Search timed short paths rather than just checking whether any safe tile exists.
    const step=20,speed=w.cfg.speed,max=warning*speed,start={x:w.player.x,y:w.player.y,radius:16},q=[{...start,travel:0}],seen=new Set(['0,0']);
    const danger=[...w.threats.filter(t=>t.shape!=='edge'&&(t.phase==='active'||t.phase==='warning')),...w.workshop.pads.filter(p=>['active','warning'].includes(p.state)),...proposed];
    const boss=w.enemies.find(e=>e.kind==='overseer'&&e.hp>0);
    const dangerousAt=(area,seconds)=>{
      if(proposed.includes(area))return seconds>=warning;
      const remaining=area.remaining??area.timer??0;
      if(area.phase==='active'||area.state==='active')return seconds<=remaining;
      const duration=area.active??w.map.bossRules?.overload[area.type]?.active??.8;
      return seconds>=remaining&&seconds<=remaining+duration;
    };
    for(let i=0;i<q.length;i++){
      const n=q[i];if(!danger.some(a=>inside(n,a)))return {x:n.x,y:n.y,seconds:n.travel/speed};
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
        const length=Math.hypot(dx,dy)*step,travel=n.travel+length;if(travel>max)continue;
        const x=n.x+dx*step,y=n.y+dy*step,key=`${Math.round((x-start.x)/step)},${Math.round((y-start.y)/step)}`;
        if(seen.has(key))continue;
        let safe=true;
        for(let j=1;j<=5;j++){const p={x:n.x+dx*step*j/5,y:n.y+dy*step*j/5,radius:16},seconds=(n.travel+length*j/5)/speed;if(!w.geometry.canStand(p.x,p.y,16)||danger.some(a=>dangerousAt(a,seconds)&&inside(p,a))||boss&&distance(p,boss)<boss.radius+16&&distance(p,boss)<distance(n,boss)-.001){safe=false;break;}}
        if(safe){seen.add(key);q.push({x,y,radius:16,travel});}
      }
    }
    return null;
  }
  function tickBossPads(w,dt){
    const s=w.workshop,boss=w.enemies.find(e=>e.kind==='overseer'&&e.hp>0),off=s.offFor>0;s.offFor=Math.max(0,s.offFor-dt);
    if(!boss||boss.phaseTimer>0||boss.restTimer>0||boss.summonIntro>0||!['laser','edge','hammers','beams','summon'].includes(boss.mode)||off){stopEquipment(w);return;}
    for(const p of s.pads){
      if(p.type==='conveyor'){
        p.state='running';p.clock=(p.clock||0)+dt;
        const speed=boss.phase===2?w.map.bossRules.overload.beltSpeed:p.speed;
        for(const body of [w.player,...w.enemies])if(body!==boss&&(body===w.player||body.hp>0&&body.warmup<=0)&&inside(body,p))w.geometry.move(body,Math.cos(p.angle)*speed*dt,Math.sin(p.angle)*speed*dt);
        continue;
      }
      if(boss.phase!==2){p.state='off';continue;}
      const r=w.map.bossRules.overload[p.type];if(!r)continue;
      if(p.state==='off'||p.nextAt==null){p.state='waiting';p.nextAt=w.roomTime+(p.delay??0);}
      p.timer=Math.max(0,(p.timer||0)-dt);
      if(p.state==='waiting'&&w.roomTime>=p.nextAt){
        const families=activeFamilies(w);
        if(!families.includes(p.type)&&families.length>=2)continue;
        if(!escapeRoute(w,[p],r.warning)){p.nextAt=w.roomTime+.15;continue;}
        p.state='warning';p.timer=r.warning;p.nextAt=w.roomTime+r.period;p.hitIds=[];p.hitPlayer=false;w.events.push({type:'warning'});
      }else if(p.state==='warning'&&p.timer===0){p.state='active';p.timer=r.active;w.events.push({type:'mechanism'});}
      else if(p.state==='active'&&p.timer===0)p.state='waiting';
      if(p.state==='active'){
        if(!p.hitPlayer&&inside(w.player,p)){p.hitPlayer=true;w.hurt(1);}
        for(const e of w.enemies)if(e!==boss&&e.hp>0&&e.warmup<=0&&!p.hitIds.includes(e.id)&&inside(e,p)){p.hitIds.push(e.id);w.damageEnemy(e,H.rules[p.type].enemy,{kind:'hazard',weaponId:'mechanism'});}
      }
    }
  }
  function limitDamage(w,e,amount){
    if(e.kind!=='overseer'||!w.map.bossRules||e.phase!==1)return amount;
    const threshold=Math.round(e.maxHp*w.map.bossRules.threshold*100)/100;
    // Excess damage is discarded at the threshold so a single volley cannot skip the blackout.
    return e.hp>threshold?Math.min(amount,e.hp-threshold):amount;
  }
  function afterDamage(w,e){
    if(e.kind!=='overseer'||!w.map.bossRules)return;
    if(e.hp<=0){clearBossThreats(w,e);return;}
    if(e.phase===1&&e.hp<=e.maxHp*w.map.bossRules.threshold+.001){
      clearBossThreats(w,e);e.phase=2;e.phaseTimer=w.map.bossRules.overload.blackout;e.mode='blackout';
      e.actionTimer=0;e.restTimer=0;e.openTimer=0;e.windup=0;e.cooldown=0;e.attackIndex=0;e.hammersLeft=0;e.pulseIndex=0;e.actionClock=0;
      w.events.push({type:'phase',stage:'blackout'});
    }
  }
  function afterTick(w){for(const e of w.enemies)afterDamage(w,e);}
  function protectedTransition(w){return Boolean(w.map.bossRules&&w.enemies.some(e=>e.kind==='overseer'&&e.phaseTimer>0));}
  function contactAllowed(w,e){if(!w.map.bossRules)return true;const b=e.kind==='overseer'?e:w.enemies.find(b=>b.id===e.summonerId&&b.kind==='overseer');return !b||!(b.phaseTimer>0||b.restTimer>0||b.summonIntro>0||e===b&&b.mode==='summon');}
  function separate(w,dt){
    for(const e of w.enemies)if(M.is(e)&&e.kind!=='overseer'&&e.warmup<=0&&!e.windup&&!e.charge&&e.mode!=='burst')for(const other of w.enemies){
      if(other.id>=e.id||other.warmup>0||other.windup||other.charge||other.mode==='burst')continue;
      const d=distance(e,other),r=Math.min(38,e.radius+other.radius);if(d>0&&d<r)w.geometry.move(e,(e.x-other.x)/d*22*dt,(e.y-other.y)/d*22*dt);
    }
  }
  function multiplier(e,source){if(e.kind==='overseer')return e.phaseTimer>0?0:e.mode==='core'?1.5:.5;if(source.kind==='hazard')return 1;if(E.rammer(e))return e.mode==='stunned'?1.5:.75;if(e.kind==='warden')return e.mode==='open'?1.5:.6;return 1;}
  function label(e){return e.kind==='warden'?(e.mode==='open'?'核心暴露 · 易伤':e.windup>0?'液压砸击蓄力':'装甲开启 · 减伤'):e.kind==='overseer'?`${e.phase===2?'核心过载':'试运转'} · ${e.phaseTimer>0?'全厂断电':e.mode==='core'?'核心暴露':e.mode==='rest'?'设备冷却':['summon','summon-start'].includes(e.mode)?'维修召集':e.mode==='laser'?'竖列高压线':e.mode==='edge'?'边缘弹幕输送':e.mode==='beams'?'轨道电束':e.mode==='hammers'?'三连冲压':'装甲闭合'}`:e.kind==='hound'?(e.windup>0?'扑击蓄力':e.recover>0?'扑空停顿':'齿轮猎犬'):e.kind==='pulse'?(e.mode==='burst'?'脉冲三连发':'脉冲射手'):'投雷工匠';}
  const api={create,reserve,inside,threat,control,tick,update,afterTick,afterDamage,limitDamage,protectedTransition,contactAllowed,separate,multiplier,bounds,laserAreas,edgePoints,activeFamilies,escapeRoute,label:e=>E.handles(e)?E.label(e):N.templates[e.kind]?N.label(e):label(e)};root.DungeonWorkshop=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
