(function(root){
  'use strict';
  class Renderer{
    constructor(canvas,images){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.workshop=new WorkshopRenderer(this.ctx);this.guardian=new GuardianRenderer(this.ctx);this.images=images;this.camera={x:0,y:0,room:-1};this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.last=0;new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();}
    resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);}
    sprite(index,x,y,size=48,flip=false){const ctx=this.ctx;ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(this.images.sprites,index%12*16,Math.floor(index/12)*16,16,16,-size/2,-size+15,size,size);ctx.restore();}
    gun(x,y,angle,flash,id='sidearm'){const c=this.ctx;c.save();c.translate(x,y-8);c.rotate(angle);const long=id==='piercer',scatter=id==='shotgun';c.fillStyle='#252334';c.fillRect(10,-7,long?44:scatter?34:27,scatter?16:13);c.fillStyle=long?'#729da5':scatter?'#b48d60':'#a5aabb';c.fillRect(13,-5,long?40:scatter?30:24,8);c.fillStyle=long?'#c6f1ef':'#e2d5bd';c.fillRect(16,-5,long?34:22,3);if(scatter){c.fillStyle='#69483d';c.fillRect(14,4,29,4);}c.fillStyle='#ad754c';c.fillRect(14,2,8,10);const end=long?54:scatter?45:40;if(flash>0){c.fillStyle=long?'#bafaff':'#fff0be';c.fillRect(end,-4,long?15:10,5);c.fillRect(end+4,-8,4,13);}c.restore();}
    shadow(body,width=19){const c=this.ctx;c.fillStyle='#39293c77';c.beginPath();c.ellipse(body.x,body.y+10,width,7,0,0,Math.PI*2);c.fill();}
    draw(world,time){
      const c=this.ctx,w=this.w,h=this.h;if(!w||!h)return;
      const dt=this.last?Math.min(.05,time-this.last):.016;this.last=time;
      const zoom=Math.min(w/1050,h/620),vw=w/zoom,vh=h/zoom,p=world.player;
      const roomW=world.map.cols*world.map.tileSize,roomH=world.map.rows*world.map.tileSize;
      const tx=roomW<vw?(roomW-vw)/2:Math.max(-20,Math.min(roomW-vw+20,p.x-vw/2));
      const ty=roomH<vh?(roomH-vh)/2:Math.max(-20,Math.min(roomH-vh+20,p.y-vh*.54));
      if(this.camera.room!==world.roomIndex||world.state==='title'){this.camera.x=tx;this.camera.y=ty;this.camera.room=world.roomIndex;}
      else{const smooth=1-Math.exp(-dt*14);this.camera.x+=(tx-this.camera.x)*smooth;this.camera.y+=(ty-this.camera.y)*smooth;}
      this.view={zoom,cx:this.camera.x,cy:this.camera.y};
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#37232b';c.fillRect(0,0,w,h);
      c.save();c.scale(zoom,zoom);c.translate(-this.camera.x,-this.camera.y);c.imageSmoothingEnabled=false;
      const hurt=world.effects.find(e=>e.type==='hurt');if(this.settings?.shake&&!this.reduced&&world.state==='combat'&&hurt){const amount=3*hurt.life/hurt.maxLife;c.translate(Math.sin(time*83)*amount,Math.cos(time*71)*amount);}
      const map=world.map,mw=map.cols*map.tileSize,mh=map.rows*map.tileSize;
      if(map.chapter===2)this.workshop.floor(map);else c.drawImage(this.images.rooms[world.map.imageIndex??world.roomIndex],0,0,mw,mh);
      this.hazards(world);
      if(map.chapter===2)this.workshop.mechanisms(world);
      const light=c.createRadialGradient(p.x,p.y,70,p.x,p.y,650);light.addColorStop(0,'#ffdda100');light.addColorStop(.65,'#3020390c');light.addColorStop(1,'#24152766');c.fillStyle=light;c.fillRect(this.camera.x,this.camera.y,vw,vh);
      if(['cleared','safe','shop'].includes(world.state)||world.completed[world.roomIndex]||(['shop','rest'].includes(world.map.type)&&world.state==='paused'))for(const exit of world.exits)this.portal(exit,time);
      if(map.chapter===2)this.workshop.services(world);
      else{if(world.map.service)this.service(world.map,time);if(world.map.supply)this.service({...world.map,type:'shop',service:world.map.supply,supplyLabel:true},time);}
      this.guardian.reduced=this.reduced;this.guardian.floor(world);
      // Draw locked-shot warnings before entities. The target point stays fixed.
      for(const e of world.enemies)if(e.windup>0&&e.aim)this.warning(world,e);
      for(const e of world.enemies)if(e.kind==='pulse'&&e.mode==='burst')this.workshop.warning(world,e);
      for(const b of world.bullets){c.strokeStyle=b.pierce>1?'#40747e':'#5b3d38';c.lineWidth=b.pierce>1?7:6;c.lineCap='square';c.beginPath();c.moveTo(b.x-b.vx*(b.pierce>1?.035:.017),b.y-b.vy*(b.pierce>1?.035:.017));c.lineTo(b.x,b.y);c.stroke();c.strokeStyle=b.color||'#fff0c8';c.lineWidth=3;c.stroke();}
      const bodies=[...world.enemies.map(e=>({body:e,type:'enemy'})),{body:p,type:'hero'}].sort((a,b)=>a.body.y-b.body.y);
      for(const {body:e,type}of bodies){
        this.shadow(e);c.save();
        if(type==='hero'){
          const bob=p.bob||0;c.globalAlpha=p.invulnerable>0&&Math.floor(p.invulnerable*16)%2?.55:1;
          if(p.moving){const foot=this.reduced?0:Math.sin(time*14)*3;c.fillStyle='#333e5c';c.fillRect(p.x-11,p.y+8+foot,7,7);c.fillRect(p.x+4,p.y+8-foot,7,7);}
          const actor=DungeonCombat.appearance(p);this.sprite(actor.sprite,p.x,p.y+bob,actor.size,p.facing<0);this.gun(p.x,p.y+bob,p.angle,world.weapon.flash,world.weapon.id);
          c.strokeStyle='#fff2c377';c.lineWidth=1;c.beginPath();c.ellipse(p.x,p.y+12,18,7,0,0,Math.PI*2);c.stroke();
        }else{
          if(e.warmup>0){c.globalAlpha=.3;c.strokeStyle='#ab314e';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.ellipse(e.x,e.y+5,26,15,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}
          const actor=DungeonCombat.appearance(e),bob=e.bob||0;
          if(['boss','elite'].includes(DungeonMachines.rank(e))){c.strokeStyle=DungeonMachines.rank(e)==='boss'?(e.phase===2?'#f59c88':'#ce84d9'):'#edb655';c.lineWidth=e.phaseTimer>0?4:2;c.beginPath();c.ellipse(e.x,e.y+9,DungeonMachines.rank(e)==='boss'?38:27,12,0,0,Math.PI*2);c.stroke();}
          if(e.kind==='skeleton')this.guardian.skeleton(e);else if(DungeonMachines.is(e))this.workshop.actor(e);else this.sprite(actor.sprite,e.x,e.y+bob,actor.size,Math.cos(e.angle)<0);
          if(DungeonMachines.is(e)){c.fillStyle=e.mode==='open'||e.mode==='core'?'#bbffe2':'#d2e8e6';c.font='bold 10px Microsoft YaHei';c.textAlign='center';c.fillText(DungeonWorkshop.label(e),e.x,e.y-actor.size+5);}
          if(e.slow>0){c.strokeStyle='#8ae4f0';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y+11,e.radius+6,7,0,0,Math.PI*2);c.stroke();}
          if(e.kind==='elite'||e.kind==='boss'){c.fillStyle=e.kind==='boss'?(e.phase===2?'#ffbd9c':'#d7a4eb'):'#ffdc85';c.font='bold 11px Microsoft YaHei';c.textAlign='center';c.fillText(e.kind==='boss'?(e.enraged?'守卫 · 能量失控':e.phase===2?'守卫 · Ⅱ阶段':'遗迹守卫'):e.windup>0?'冲锋蓄力！':e.recover>0?'冲锋后停顿':'精英',e.x,e.y-actor.size+5);}
          if(e.kind==='skeleton'){c.fillStyle='#e9d4b0';c.font='bold 10px Microsoft YaHei';c.textAlign='center';c.fillText('召唤骷髅',e.x,e.y-actor.size+5);}
          if(e.kind==='ranged'){
            c.fillStyle='#633c39';c.fillRect(e.x+17,e.y-30,4,38);c.fillStyle=e.windup>0?'#ffc2aa':'#d27492';c.fillRect(e.x+13,e.y-35,12,13);c.fillStyle='#ffe6be';c.fillRect(e.x+17,e.y-32,4,5);
            if(e.windup>0){c.fillStyle='#fff1bf';c.font='bold 18px Microsoft YaHei';c.textAlign='center';c.fillText('!',e.x,e.y-52);}
          }
          if(e.hit>0&&!DungeonMachines.is(e)){c.globalAlpha=e.hit/.15*.35;c.fillStyle='#fff0b9';c.fillRect(e.x-17,e.y-32,34,32);}
        }
        c.restore();
      }
      for(const b of world.hostile){const r=b.radius??10;c.fillStyle=b.enraged?'#713947':'#622b43';c.beginPath();c.arc(b.x,b.y,r,0,Math.PI*2);c.fill();c.fillStyle=b.enraged?'#f1a66e':'#f56c79';c.beginPath();c.arc(b.x,b.y,Math.max(2,r-3),0,Math.PI*2);c.fill();c.fillStyle='#ffebc0';c.fillRect(b.x-1.5,b.y-2,3,3);}
      // Dedicated overlay pass: other sprites cannot cover an enemy's bar or HP value.
      for(const e of world.enemies)this.healthBar(e);
      // A persistent marker keeps the player readable even when monsters overlap.
      c.strokeStyle='#9ce6ed';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+12,21,8,0,0,Math.PI*2);c.stroke();
      c.fillStyle='#2b3a4c';c.fillRect(p.x-9,p.y-58,18,15);c.fillStyle='#b7f8f5';c.font='bold 10px Microsoft YaHei';c.textAlign='center';c.fillText('你',p.x,p.y-47);
      if(p.shield>0){c.strokeStyle='#9bf0f0b0';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-15,35,43,0,0,Math.PI*2);c.stroke();}
      if(p.burn>0){for(let i=0;i<4;i++){const x=p.x-21+i*13,y=p.y+10,h=8+(this.reduced?4:Math.sin(world.elapsed*12+i)*5+5);c.fillStyle='#df542c';c.fillRect(x,y-h,7,h);c.fillStyle='#ffe092';c.fillRect(x+2,y-h*.6,3,h*.6);}}
      for(const e of world.effects){const alpha=e.life/e.maxLife;c.save();c.globalAlpha=alpha;
        if(e.type==='death'){c.fillStyle='#ffd485';c.font='bold 15px Microsoft YaHei';c.textAlign='center';if(e.value>0)c.fillText(`+${e.value}`,e.x,e.y-20-(1-alpha)*20);if(this.settings?.particles!==false)for(let i=0;i<7;i++){const a=i*Math.PI*2/7,r=(1-alpha)*32;c.fillRect(e.x+Math.cos(a)*r-2,e.y-15+Math.sin(a)*r-2,4,4);}}
        else if(e.type==='shield'){c.strokeStyle='#b7f8ff';c.lineWidth=4;c.beginPath();c.arc(e.x,e.y-15,30+(1-alpha)*22,0,Math.PI*2);c.stroke();}
        else{c.strokeStyle=e.type==='hurt'?'#b93550':'#fff1bf';c.lineWidth=3;for(let i=0;i<5;i++){const a=i*Math.PI*2/5,r=(1-alpha)*20;c.beginPath();c.moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);c.lineTo(e.x+Math.cos(a)*(r+7),e.y+Math.sin(a)*(r+7));c.stroke();}}
        c.restore();
      }
      this.damageNumbers(world);
      c.restore();
      if(['cleared','safe'].includes(world.state))this.portalArrow(world.navigationExit);
      if(hurt&&world.state==='combat'&&!this.reduced){c.fillStyle='#a22d4510';c.fillRect(0,0,w,h);}
    }
    healthBar(enemy){
      const c=this.ctx,actor=DungeonCombat.appearance(enemy),b=DungeonFeedback.bar(enemy,actor.size),rank=DungeonMachines.rank(enemy);
      if(enemy.y>=this.view.cy)b.y=Math.max(b.y,this.view.cy+48);
      c.save();c.globalAlpha=enemy.warmup>0?.75:1;
      c.fillStyle='#211b2bef';c.fillRect(b.x-2,b.y-2,b.width+4,b.height+4);
      c.fillStyle='#514251';c.fillRect(b.x,b.y,b.width,b.height);
      c.fillStyle=b.color;c.fillRect(b.x,b.y,b.width*b.ratio,b.height);
      c.strokeStyle=rank==='elite'?'#f3d08a':rank==='boss'?'#dfb6ef':'#ba8c91';c.lineWidth=1;c.strokeRect(b.x-1,b.y-1,b.width+2,b.height+2);
      c.font=`bold ${rank==='boss'?11:10}px Consolas, monospace`;c.textAlign='center';c.textBaseline='bottom';
      const tw=c.measureText(b.text).width;c.fillStyle='#211b2be8';c.fillRect(enemy.x-tw/2-3,b.y-16,tw+6,13);
      c.fillStyle=rank==='elite'?'#ffe3a4':'#fff3dd';c.fillText(b.text,enemy.x,b.y-4);c.restore();
    }
    damageNumbers(world){
      const c=this.ctx;
      for(const p of world.damagePopups){
        const age=1-p.life/p.maxLife,y=Math.max(p.y-(this.reduced?0:age*18),this.view.cy+26),text='-'+DungeonFeedback.format(p.amount);
        c.save();c.globalAlpha=Math.min(1,p.life/.25);c.font=`bold ${p.hits>1?18:16}px Consolas, monospace`;c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';c.lineWidth=4;c.strokeStyle='#241927';c.strokeText(text,p.x,y);c.fillStyle=p.weaponId==='piercer'?'#b7f5ff':p.weaponId==='shotgun'?'#ffe39b':'#fff4d8';c.fillText(text,p.x,y);c.restore();
      }
    }
    warning(world,e){
      if(DungeonMachines.is(e)){this.workshop.warning(world,e);return;}
      if(DungeonGuardian.is(world,e)&&e.pattern==='summon'){this.guardian.summonWarning(e);return;}
      const c=this.ctx,T=DungeonTactics;c.save();c.lineCap='round';
      if(e.kind==='elite'){
        const plan=e.chargePlan;if(!plan){c.restore();return;}
        // Inner capsule is the enemy footprint; the outer band includes player contact radius.
        c.strokeStyle='#ef9b442b';c.lineWidth=(e.radius+world.player.radius)*2;c.beginPath();c.moveTo(plan.start.x,plan.start.y);c.lineTo(plan.end.x,plan.end.y);c.stroke();
        c.strokeStyle='#f7b04a68';c.lineWidth=e.radius*2;c.beginPath();c.moveTo(plan.start.x,plan.start.y);c.lineTo(plan.end.x,plan.end.y);c.stroke();
        c.strokeStyle='#ffe0a1';c.lineWidth=2;c.beginPath();c.arc(plan.end.x,plan.end.y,e.radius,0,Math.PI*2);c.stroke();
        this.warningArrow(plan.end,plan.angle,'#ffe0a1');c.font='bold 11px Microsoft YaHei';c.fillStyle='#ffe0a1';c.textAlign='center';c.fillText('冲锋范围',plan.end.x,plan.end.y+e.radius+20);
      }else{
        const origin=e.shotOrigin||DungeonCombat.center(e),length=DungeonGuardian.is(world,e)?(e.pattern==='fan'?175:140)*DungeonProgression.rules(world.difficulty).projectile*6:e.kind==='boss'?(e.pattern==='fan'?1050:840):world.cfg.enemyBulletSpeed*4;
        for(const angle of DungeonGuardian.is(world,e)?DungeonGuardian.shotAngles(e,world.difficulty):T.shotAngles(e)){
          const end=T.rayEnd(world.geometry,origin,angle,length),distance=Math.hypot(end.x-origin.x,end.y-origin.y);
          c.strokeStyle='#ff657b77';c.lineWidth=2;c.setLineDash([8,8]);c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(end.x,end.y);c.stroke();c.setLineDash([]);
          for(let d=70;d<distance;d+=130)this.warningArrow({x:origin.x+Math.cos(angle)*d,y:origin.y+Math.sin(angle)*d},angle,'#ffb0ae');
        }
        c.font='bold 10px Microsoft YaHei';c.fillStyle='#ffc1b5';c.textAlign='center';c.fillText(e.enraged?'能量失控 · 保持走位':'弹道预警',origin.x,origin.y+45);
      }c.restore();
    }
    warningArrow(point,angle,color){const c=this.ctx;c.save();c.translate(point.x,point.y);c.rotate(angle);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(-7,-5);c.lineTo(0,0);c.lineTo(-7,5);c.stroke();c.restore();}
    hazards(world){
      const c=this.ctx,hot=!world.completed[world.roomIndex],time=world.elapsed;
      for(const h of world.map.hazards||[]){
        c.fillStyle='#35272e';c.fillRect(h.x-5,h.y-5,h.w+10,h.h+10);
        c.fillStyle=hot?'#ae3d27':'#584038';c.fillRect(h.x,h.y,h.w,h.h);
        c.fillStyle=hot?'#eb702b':'#6e4940';c.fillRect(h.x+5,h.y+5,h.w-10,h.h-10);
        for(let y=8;y<h.h-6;y+=20)for(let x=8;x<h.w-6;x+=24){
          const pulse=this.reduced?1:(Math.sin(time*3+x*.2+y*.1)+1)/2;
          c.fillStyle=hot?(pulse>.5?'#ffe08a':'#fba544'):'#80604b';c.fillRect(h.x+x,h.y+y,12,4);c.fillRect(h.x+x+8,h.y+y+4,4,7);
        }
        c.font='bold 11px Microsoft YaHei';c.textAlign='center';c.fillStyle=hot?'#fff0bf':'#c7a386';c.fillText(hot?'岩浆':'已冷却',h.x+h.w/2,h.y+h.h/2+4);
      }
    }
    service(map,time){
      const c=this.ctx,p=map.service,rest=map.type==='rest';this.shadow(p,24);
      c.save();c.strokeStyle=rest?'#e8ad60':'#d7c17d';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+13,30,11,0,0,Math.PI*2);c.stroke();
      if(rest){
        c.fillStyle='#744c36';c.fillRect(p.x-23,p.y+5,46,8);c.save();c.translate(p.x,p.y);if(!this.reduced)c.scale(1+Math.sin(time*7)*.06,1+Math.sin(time*9)*.08);
        c.fillStyle='#d86b46';c.beginPath();c.moveTo(-21,6);c.lineTo(-15,-19);c.lineTo(-5,-10);c.lineTo(1,-42);c.lineTo(11,-21);c.lineTo(18,-25);c.lineTo(22,6);c.fill();c.fillStyle='#ffda8c';c.beginPath();c.moveTo(-10,6);c.lineTo(0,-23);c.lineTo(12,6);c.fill();c.restore();
      }else{this.sprite(84,p.x,p.y,60);c.fillStyle='#c48a50';c.fillRect(p.x-29,p.y+3,58,12);c.fillStyle='#e3ba7b';c.fillRect(p.x-31,p.y,62,5);}
      c.font='bold 12px Microsoft YaHei';c.textAlign='center';c.fillStyle='#ffe2ab';c.fillText(rest?'篝火 · 免费恢复3点':map.supplyLabel?'战前补给 · 金币消费':'旅人商店',p.x,p.y-55);c.font='10px Microsoft YaHei';c.fillText('靠近按 E',p.x,p.y+37);c.restore();
    }
    portal(point,time){
      const c=this.ctx;c.save();c.translate(point.x,point.y);const pulse=this.reduced?1:1+Math.sin(time*3)*.08;
      const g=c.createRadialGradient(0,0,2,0,0,55);g.addColorStop(0,'#a9faff66');g.addColorStop(1,'#4a89a900');c.fillStyle=g;c.fillRect(-60,-60,120,120);
      c.scale(pulse,pulse);c.strokeStyle='#78d6e5';c.lineWidth=5;c.beginPath();c.ellipse(0,3,30,16,0,0,Math.PI*2);c.stroke();c.strokeStyle='#c2f8e9';c.lineWidth=2;c.beginPath();c.ellipse(0,3,23,11,0,0,Math.PI*2);c.stroke();
      c.fillStyle='#85d9e975';c.fillRect(-10,-36,4,34);c.fillRect(6,-46,3,43);c.fillStyle='#d1ffff';c.fillRect(-3,-25,6,6);
      c.textAlign='center';c.font='11px Microsoft YaHei';c.fillStyle='#d9fffd';c.fillText(point.label||'传送门',0,34);c.restore();
    }
    portalArrow(point){
      const c=this.ctx,{zoom,cx,cy}=this.view,sx=(point.x-cx)*zoom,sy=(point.y-cy)*zoom;
      if(sx>50&&sx<this.w-50&&sy>150&&sy<this.h-100)return;
      const center={x:this.w/2,y:this.h*.54},dx=sx-center.x,dy=sy-center.y;
      let ratio=1;if(dx>0)ratio=Math.min(ratio,(this.w-50-center.x)/dx);if(dx<0)ratio=Math.min(ratio,(50-center.x)/dx);if(dy>0)ratio=Math.min(ratio,(this.h-110-center.y)/dy);if(dy<0)ratio=Math.min(ratio,(150-center.y)/dy);
      const x=center.x+dx*ratio,y=center.y+dy*ratio;c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle='#b7f5ef';c.beginPath();c.moveTo(10,0);c.lineTo(-7,-7);c.lineTo(-3,0);c.lineTo(-7,7);c.closePath();c.fill();c.restore();c.fillStyle='#d9fffd';c.font='10px Microsoft YaHei';c.textAlign='center';c.fillText('传送门',x,y+24);
    }
  }
  root.DungeonRenderer=Renderer;
})(globalThis);
