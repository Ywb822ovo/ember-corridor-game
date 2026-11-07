(function(root){
  'use strict';
  const M=root.DungeonMachines,T=root.DungeonTactics,W=root.DungeonWorkshop;
  class WorkshopRenderer{
    constructor(ctx){this.ctx=ctx;this.cache=new Map();this.industrialCache=new WeakMap();this.reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}
    floor(map){
      if(map.workshopV2){this.industrialFloor(map);return;}
      if(!this.cache.has(map.id)){
        const canvas=document.createElement('canvas');canvas.width=map.cols*80;canvas.height=map.rows*80;const c=canvas.getContext('2d');
        c.fillStyle='#182632';c.fillRect(0,0,canvas.width,canvas.height);
        for(let y=0;y<map.rows;y++)for(let x=0;x<map.cols;x++){
          const px=x*80,py=y*80;
          if(map.walk[y][x]){
            c.fillStyle=(x+y)%2?'#354b55':'#30454f';c.fillRect(px+1,py+1,78,78);c.strokeStyle='#52707a55';c.lineWidth=1;c.strokeRect(px+5,py+5,70,70);
            c.fillStyle='#779097';for(const [dx,dy]of[[10,10],[68,68]])c.fillRect(px+dx,py+dy,3,3);
            if(y===map.rows-3){c.fillStyle='#5a756c';c.fillRect(px+10,py+36,60,7);}
          }else{
            c.fillStyle='#182a36';c.fillRect(px,py,80,80);c.fillStyle='#516674';c.fillRect(px+3,py+3,74,61);c.fillStyle='#657c86';c.fillRect(px+5,py+5,70,9);c.fillStyle='#233a48';c.fillRect(px+7,py+22,66,31);c.fillStyle='#82bbb8';c.fillRect(px+16,py+30,48,4);c.fillStyle='#a18b66';c.fillRect(px+10,py+63,60,8);
          }
        }
        c.fillStyle='#a9c5bb18';c.textAlign='center';c.font='bold 36px Microsoft YaHei';c.fillText(map.id===11?'ASSEMBLY CONTROL':'LOST WORKSHOP',canvas.width/2,canvas.height/2-35);c.font='14px Consolas';c.fillText('SECTOR '+String(map.id-5).padStart(2,'0'),canvas.width/2,canvas.height/2-9);
        this.cache.set(map.id,canvas);
      }
      this.ctx.drawImage(this.cache.get(map.id),0,0);
    }
    industrialFloor(map){
      let canvas=this.industrialCache.get(map);
      if(!canvas){
        canvas=document.createElement('canvas');canvas.width=map.cols*map.tileSize;canvas.height=map.rows*map.tileSize;const c=canvas.getContext('2d'),s=map.tileSize,width=canvas.width,height=canvas.height;
        const maintenance=[8,14].includes(map.id),heavy=map.id===9,line=map.id===10;
        c.fillStyle='#101f2e';c.fillRect(0,0,width,height);
        for(let y=0;y<map.rows;y++)for(let x=0;x<map.cols;x++){
          const px=x*s,py=y*s;
          if(map.walk[y][x]){
            c.fillStyle=maintenance?((x+y)%2?'#354f64':'#314b60'):heavy?((x+y)%2?'#263a4e':'#293e51'):((x+y)%2?'#2b4258':'#293e53');c.fillRect(px+1,py+1,s-2,s-2);
            c.strokeStyle='#7994ac1c';c.lineWidth=1;c.strokeRect(px+5,py+5,s-10,s-10);
            c.fillStyle='#7892a5';for(const [a,b]of[[9,9],[s-11,s-11]])c.fillRect(px+a,py+b,2,2);
            // Wear is deterministic and restricted to edge tiles, keeping the fight readable.
            if(!maintenance&&(x===1||x===map.cols-2)&&y%3===1){c.fillStyle='#101d2d66';c.fillRect(px+14,py+24,24,9);c.fillRect(px+24,py+18,25,9);c.strokeStyle='#8aa0ad38';c.beginPath();c.moveTo(px+9,py+60);c.lineTo(px+26,py+55);c.stroke();}
          }else{
            const border=x===0||y===0||x===map.cols-1||y===map.rows-1;
            c.fillStyle='#102132';c.fillRect(px,py,s,s);c.fillStyle=heavy?'#476078':'#3e586f';c.fillRect(px+4,py+4,s-8,s-12);c.fillStyle='#627c90';c.fillRect(px+5,py+4,s-10,7);c.fillStyle='#20364c';c.fillRect(px+11,py+21,s-22,s-40);
            c.strokeStyle='#0e1c2b';c.lineWidth=3;c.strokeRect(px+4,py+4,s-8,s-12);c.fillStyle='#8ca1b0';for(const [a,b]of[[10,14],[s-14,s-22]])c.fillRect(px+a,py+b,4,4);
            if(!border){
              if(maintenance){
                c.fillStyle='#7898ad';c.fillRect(px+10,py+21,s-20,4);c.strokeStyle='#c6dde2';c.lineWidth=3;
                for(let i=0;i<3;i++){const tx=px+20+i*17;c.beginPath();c.moveTo(tx,py+29);c.lineTo(tx,py+52);c.stroke();c.beginPath();c.arc(tx,py+29,5,0,Math.PI*1.5);c.stroke();}
                c.fillStyle='#57758d';c.fillRect(px+10,py+58,s-20,7);
              }else if(heavy){
                c.fillStyle='#152b3e';c.fillRect(px+9,py+20,s-18,s-36);c.strokeStyle='#8595a0';c.lineWidth=5;c.beginPath();c.arc(px+s/2,py+s/2,17,0,Math.PI*2);c.stroke();
                for(let i=0;i<8;i++){const a=i*Math.PI/4;c.fillStyle='#788b9c';c.fillRect(px+s/2+Math.cos(a)*21-4,py+s/2+Math.sin(a)*21-4,8,8);}c.fillStyle='#c89b56';c.fillRect(px+s/2-5,py+s/2-5,10,10);
              }else{c.fillStyle='#64899d';c.fillRect(px+15,py+28,s-30,5);c.fillStyle='#75c3ce';c.fillRect(px+20,py+41,s-40,4);if(line){c.fillStyle='#172b40';c.fillRect(px+13,py+48,s-26,10);for(let i=0;i<4;i++){c.fillStyle='#92c3d0';c.fillRect(px+17+i*12,py+50,5,4);}}}
            }
          }
        }
        // Pipes sit over the boundary walls; no decorative machines create invisible barriers.
        for(const x of [36,width-36]){c.strokeStyle='#0e1b28';c.lineWidth=18;c.beginPath();c.moveTo(x,28);c.lineTo(x,height-28);c.stroke();c.strokeStyle=heavy?'#6b7b88':'#608b9e';c.lineWidth=10;c.stroke();for(let y=100;y<height-80;y+=120){c.fillStyle='#a0b4c0';c.fillRect(x-8,y,16,6);}}
        for(const x of [120,width-136])for(const y of [34,height-45]){c.fillStyle='#0c1926';c.fillRect(x-4,y-4,28,16);c.fillStyle=maintenance?'#b1e4e9':'#e8a953';c.fillRect(x,y,20,7);}
        if(maintenance){c.strokeStyle='#7cbbcb55';c.lineWidth=3;for(const p of [map.service,map.supply].filter(Boolean)){c.strokeRect(p.x-86,p.y-76,172,146);c.fillStyle='#bedce344';for(let i=0;i<3;i++)c.fillRect(p.x-60+i*44,p.y+82,25,4);}}
        if(line){for(const x of [120,width-160])for(const y of [220,680]){c.fillStyle='#172b3d';c.fillRect(x,y,40,48);c.fillStyle='#6b879c';c.fillRect(x+6,y+6,28,23);c.fillStyle='#a5c3cf';c.fillRect(x+13,y+13,14,5);c.fillStyle='#344e64';c.fillRect(x+5,y+33,10,11);c.fillRect(x+25,y+33,10,11);}}
        this.industrialCache.set(map,canvas);
      }
      this.ctx.drawImage(canvas,0,0);
    }
    actor(e){
      const c=this.ctx,d=M.defs[e.kind],flip=Math.cos(e.angle||0)<0;c.save();c.translate(Math.round(e.x),Math.round(e.y+(e.bob||0))-d.size+15);c.scale(flip?-d.size/16:d.size/16,d.size/16);c.translate(-8,0);
      for(const [x,y,w,h,color]of d.parts){c.fillStyle=color;if((e.kind==='warden'||e.kind==='overseer')&&x===6&&y===8)c.fillStyle=e.mode==='open'||e.mode==='core'||e.mode==='stunned'?'#c1fff1':'#4c7a87';if(e.kind==='mother'&&x===5&&y===7&&e.windup>0)c.fillStyle='#ffe0a1';c.fillRect(x,y,w,h);if(e.hit>0){c.globalAlpha=e.hit/.15*.5;c.fillStyle='#fff4c5';c.fillRect(x,y,w,h);c.globalAlpha=1;}}
      if(e.kind==='bomber'&&e.windup>0){c.fillStyle='#ffe6b5';c.fillRect(7,5,2,3);}
      c.restore();
      if(e.behavior==='rammer'&&e.mode==='stunned'){c.save();c.fillStyle='#c9f7f3';c.textAlign='center';c.font='bold 19px Consolas';c.fillText('✦  ✦',e.x,e.y-d.size-8);c.restore();}
    }
    warning(world,e){
      const c=this.ctx;c.save();c.lineCap='round';
      if(e.kind==='mother'&&e.windup>0){c.strokeStyle='#ffd18b';c.lineWidth=3;c.setLineDash([6,5]);c.beginPath();c.ellipse(e.x,e.y+4,48,23,0,0,Math.PI*2);c.stroke();c.setLineDash([]);c.fillStyle='#ffe4ab';c.font='bold 12px Microsoft YaHei';c.textAlign='center';c.fillText('装配 ×2 · '+e.windup.toFixed(1)+'秒',e.x,e.y+46);}
      if(e.behavior==='rammer'&&e.chargePlan){const p=e.chargePlan;c.strokeStyle='#ffaa483d';c.lineWidth=(e.radius+13)*2;c.beginPath();c.moveTo(e.x,e.y);c.lineTo(p.end.x,p.end.y);c.stroke();c.strokeStyle='#ffd99b';c.lineWidth=3;c.setLineDash([12,7]);c.beginPath();c.moveTo(e.x,e.y);c.lineTo(p.end.x,p.end.y);c.stroke();c.setLineDash([]);c.strokeRect(p.end.x-8,p.end.y-8,16,16);}
      if(e.kind==='repairDrone'&&e.windup>0){const target=world.enemies.find(t=>t.id===e.repairTarget);if(target){c.strokeStyle='#9ce8d5';c.lineWidth=3;c.setLineDash([5,5]);c.beginPath();c.moveTo(e.x,e.y-20);c.lineTo(target.x,target.y-20);c.stroke();c.setLineDash([]);c.fillStyle='#d6fff3';c.font='bold 17px Consolas';c.fillText('+',target.x+16,target.y-40);}}
      if(e.kind==='bomber'&&e.windup>0){c.fillStyle='#ffaa4826';c.strokeStyle='#ffaa48';c.lineWidth=3;c.setLineDash([8,5]);c.beginPath();c.arc(e.x,e.y,100,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.font='bold 16px Microsoft YaHei';c.textAlign='center';c.fillStyle='#fff0d9';c.fillText(e.windup.toFixed(1)+'秒',e.x,e.y+27);}
      if(e.kind==='hound'&&e.chargePlan){const p=e.chargePlan;c.strokeStyle='#f5bf6240';c.lineWidth=(e.radius+13)*2;c.beginPath();c.moveTo(p.start.x,p.start.y);c.lineTo(p.end.x,p.end.y);c.stroke();c.strokeStyle='#ffe3aa';c.lineWidth=2;c.beginPath();c.arc(p.end.x,p.end.y,e.radius,0,Math.PI*2);c.stroke();}
      if(e.kind==='pulse'&&e.aim&&e.shotOrigin){const origin=e.shotOrigin,a=T.shotAngles(e)[0],end=T.rayEnd(world.geometry,origin,a,780);c.strokeStyle=e.mode==='burst'?'#ffb5a677':'#ffb5a6cc';c.lineWidth=2;c.setLineDash([9,7]);c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(end.x,end.y);c.stroke();c.setLineDash([]);for(let d=60;d<Math.hypot(end.x-origin.x,end.y-origin.y);d+=100){c.save();c.translate(origin.x+Math.cos(a)*d,origin.y+Math.sin(a)*d);c.rotate(a);c.beginPath();c.moveTo(-7,-5);c.lineTo(0,0);c.lineTo(-7,5);c.stroke();c.restore();}}
      c.restore();
    }
    mechanisms(world){
      const c=this.ctx;
      if(world.map.bossRules){
        const b=W.bounds(world.map),r=world.map.bossRules,e=world.enemies.find(e=>e.kind==='overseer'),overload=e?.phase===2&&e.phaseTimer===0;c.save();
        c.font='bold 13px Consolas';c.textAlign='center';
        for(let i=0;i<r.columns;i++){const x=b.x+(i+.5)*b.w/r.columns;c.fillStyle='#15283d';c.fillRect(x-26,b.y-30,52,23);c.fillStyle=overload?'#ff6d70':'#9edbe8';c.fillRect(x-20,b.y-26,40,5);c.fillText(String(i+1).padStart(2,'0'),x,b.y-5);}
        c.strokeStyle=overload?'#b04e6150':'#719db23b';c.lineWidth=3;c.beginPath();c.moveTo(r.anchor.x,r.anchor.y-105);c.lineTo(r.anchor.x,b.y-32);c.moveTo(b.x+20,b.y-32);c.lineTo(b.x+b.w-20,b.y-32);c.stroke();
        for(const x of [b.x-32,b.x+b.w+20])for(const y of [b.y+80,b.y+b.h/2,b.y+b.h-80]){c.fillStyle='#142638';c.fillRect(x,y,12,30);c.fillStyle=overload?'#ff6572':'#72cad7';c.fillRect(x+3,y+4,6,22);}
        c.restore();
      }
      for(const p of world.workshop.pads){
        const off=world.completed[world.roomIndex]||world.workshop.offFor>0||p.state==='off',active=!off&&p.state==='active',warning=!off&&p.state==='warning';
        if(['conveyor','steam','saw'].includes(p.type)){this.environment(p,off,active,warning);continue;}
        c.save();c.fillStyle='#172d38';c.fillRect(p.x-4,p.y-4,p.w+8,p.h+8);c.fillStyle=active?'#e0a45c':warning?'#65523e':'#2b4651';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle=warning||active?'#ffba64':'#557987';c.lineWidth=3;c.setLineDash(warning?[8,5]:[]);c.strokeRect(p.x,p.y,p.w,p.h);c.setLineDash([]);
        for(let x=10;x<p.w-8;x+=20){c.fillStyle=active?'#183d48':'#5c7880';c.fillRect(p.x+x,p.y+9,5,p.h-18);}
        c.fillStyle=active?'#173a45':warning?'#ffe8b1':'#c4d7d5';c.font='bold 19px Microsoft YaHei';c.textAlign='center';c.fillText(p.type==='press'?'↓':'ϟ',p.x+p.w/2,p.y+p.h/2+3);c.font='bold 11px Microsoft YaHei';c.fillText(off?'已断电':warning?`${p.type==='press'?'落锤':'通电'} ${p.timer.toFixed(1)}秒`:active?'危险':p.type==='press'?'液压冲床':'脉冲电板',p.x+p.w/2,p.y+p.h-12);if(world.map.workshopV2)this.stripes(p);c.restore();
      }
      for(const t of world.threats){
        if(t.kind==='edge'){
          c.save();c.strokeStyle='#ffd47a';c.fillStyle='#ffd47a';c.lineWidth=3;c.setLineDash([9,8]);const a=[Math.PI/2,Math.PI,-Math.PI/2,0][t.side];
          for(const p of W.edgePoints(world,t.side,t.count)){c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(a)*100,p.y+Math.sin(a)*100);c.stroke();c.beginPath();c.arc(p.x,p.y,7,0,Math.PI*2);c.fill();}
          const b=W.bounds(world.map);c.font='bold 17px Microsoft YaHei';c.textAlign='center';c.fillText(`边缘输送 · ${t.remaining.toFixed(1)}秒`,b.x+b.w/2,b.y+30);c.restore();continue;
        }
        if(t.delay>0)continue;const active=t.phase==='active';c.save();c.strokeStyle=active?'#e5fff4':'#ffcd8a';c.fillStyle=active?'#b4f5e2c0':'#e9b16a26';c.lineWidth=3;c.setLineDash(active?[]:[8,6]);
        if(t.kind==='laser'){c.strokeStyle=active?'#fff4ec':'#ffdf74';c.fillStyle=active?'#ff4a508f':`rgba(255,210,80,${.1+.08*(1+Math.sin(world.roomTime*18))/2})`;}
        let tx=t.x,ty=t.y;
        if(t.shape==='circle'){
          c.beginPath();c.arc(t.x,t.y,t.radius,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.strokeStyle='#ffefbe';c.beginPath();c.arc(t.x,t.y,t.radius-7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-t.remaining/t.warning));c.stroke();
          if(t.kind==='grenade'&&t.origin){const progress=Math.min(1,(t.warning-t.remaining)/.45);c.fillStyle='#f5d68e';c.beginPath();c.arc(t.origin.x+(t.x-t.origin.x)*progress,t.origin.y+(t.y-t.origin.y)*progress-Math.sin(progress*Math.PI)*60,7,0,Math.PI*2);c.fill();}
        }else if(t.shape==='box'){c.translate(t.x,t.y);c.rotate(t.angle);c.fillRect(0,-t.h/2,t.w,t.h);c.strokeRect(0,-t.h/2,t.w,t.h);tx=t.w/2;ty=0;}
        else{c.fillRect(t.x,t.y,t.w,t.h);c.strokeRect(t.x,t.y,t.w,t.h);tx=t.x+t.w/2;ty=Math.max(t.y+35,world.player.y-80);}
        if(t.kind==='laser'&&active){c.fillStyle='#fff3e6';c.fillRect(t.x+t.w/2-2,t.y,4,t.h);}
        c.setLineDash([]);c.font='bold 13px Microsoft YaHei';c.textAlign='center';c.fillStyle=active?'#fff1d3':'#ffe6ae';if(t.kind!=='laser'||t.w>70)c.fillText(active?'危险':`${t.kind==='laser'?t.column+'列激光':t.kind==='grenade'?'投雷':t.kind==='beam'?'电束':'落锤'} ${t.remaining.toFixed(1)}秒`,tx,ty+5);c.restore();
      }
      if(world.map.console){const p=world.map.console,off=world.workshop.offFor>0;c.save();c.fillStyle='#183241';c.fillRect(p.x-24,p.y-39,48,49);c.fillStyle=off?'#abe5b8':'#91dae1';c.fillRect(p.x-19,p.y-34,38,23);c.fillStyle='#21464b';c.font='bold 18px Microsoft YaHei';c.textAlign='center';c.fillText('ϟ',p.x,p.y-16);c.fillStyle='#b5c4bc';c.fillRect(p.x-30,p.y+10,60,7);c.font='bold 11px Microsoft YaHei';c.fillStyle='#d9f3df';c.fillText(off?`断电 ${world.workshop.offFor.toFixed(1)}秒`:world.workshop.cooldown>0?`冷却 ${Math.ceil(world.workshop.cooldown)}秒`:'E · 暂停机关4秒',p.x,p.y+35);c.restore();}
    }
    environment(p,off,active,warning){
      const c=this.ctx;c.save();c.fillStyle='#19303f';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle=off?'#536879':warning||active?'#ffaa48':'#597e97';c.lineWidth=3;c.setLineDash(warning?[8,5]:[]);c.strokeRect(p.x,p.y,p.w,p.h);c.setLineDash([]);
      if(p.type==='conveyor'){
        c.save();c.translate(p.x+p.w/2,p.y+p.h/2);c.rotate(p.angle||0);const length=Math.abs(Math.cos(p.angle||0))>.5?p.w:p.h;
        c.fillStyle=off?'#586e7d':'#8bd8e4';c.font='bold 28px Consolas';c.textAlign='center';const offset=off||this.reduced?0:(p.clock*28)%48;for(let x=-length/2+24+offset;x<length/2-12;x+=48)c.fillText('›',x,9);c.restore();
      }else if(p.type==='saw'){
        const {from:a,to:b}=p.track;c.strokeStyle='#9db3c5';c.lineWidth=5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
        const q=root.DungeonWorkshopHazards.sawPosition(p);c.save();c.translate(q.x,q.y);c.rotate(off?0:p.clock*5);c.fillStyle=active?'#e4edf3':'#708495';c.beginPath();for(let i=0;i<24;i++){const r=i%2?p.radius*.7:p.radius;c.lineTo(Math.cos(i*Math.PI/12)*r,Math.sin(i*Math.PI/12)*r);}c.closePath();c.fill();c.fillStyle='#ffaa48';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.restore();
      }else{
        c.fillStyle='#829eaf';c.fillRect(p.x+12,p.y+p.h/2-8,p.w-24,16);
        if(active){c.fillStyle='#dcebf044';c.fillRect(p.x+4,p.y+4,p.w-8,p.h-8);for(let i=0;i<4;i++){c.fillStyle='#e6f3f078';const x=p.x+12+(i%2)*(p.w-24),y=p.y+18+i*(p.h-32)/4;c.beginPath();c.ellipse(x,y,12,15,0,0,Math.PI*2);c.fill();}}
      }
      if(p.type!=='conveyor')this.stripes(p);c.font='bold 11px Microsoft YaHei';c.textAlign='center';c.fillStyle='#e8f2f5';c.fillText(off?'已断电':warning?'预警 '+p.timer.toFixed(1)+'秒':p.type==='conveyor'?'传送带':p.type==='saw'?'锯片轨道':active?'蒸汽喷发':'蒸汽喷口',p.x+p.w/2,p.y-9);c.restore();
    }
    stripes(p){const c=this.ctx;c.fillStyle='#152333';c.fillRect(p.x,p.y+p.h-6,p.w,6);c.fillStyle='#dca458';for(let x=p.x+3;x<p.x+p.w-6;x+=18){c.beginPath();c.moveTo(x,p.y+p.h);c.lineTo(x+6,p.y+p.h-6);c.lineTo(x+13,p.y+p.h-6);c.lineTo(x+7,p.y+p.h);c.fill();}}
    shake(world){
      const e=world.enemies.find(e=>e.kind==='overseer');if(!e||e.phaseTimer>0)return 0;
      return e.restartAt!==undefined&&world.roomTime-e.restartAt<.3?3:world.threats.some(t=>t.kind==='laser'&&t.phase==='active')?1.2:0;
    }
    overlay(world,width,height){
      if(!world.map.bossRules)return;const e=world.enemies.find(e=>e.kind==='overseer'&&e.hp>0);if(!e)return;
      const c=this.ctx,blackout=e.phaseTimer>0,restart=e.restartAt!==undefined&&world.roomTime-e.restartAt<1.2;
      c.save();
      if(blackout){c.fillStyle='#030711d9';c.fillRect(0,0,width,height);}
      if(restart){c.fillStyle=this.reduced?'#dd28371a':`rgba(235,45,64,${.07+.07*(1+Math.sin(world.roomTime*18))/2})`;c.fillRect(0,0,width,height);c.strokeStyle='#ff596d';c.lineWidth=5;c.strokeRect(3,3,width-6,height-6);}
      if(blackout||restart){c.textAlign='center';c.fillStyle=blackout?'#aebccc':'#ffd4cf';c.font=`bold ${Math.min(32,width/22)}px Microsoft YaHei`;c.fillText(blackout?'全厂断电':'核心过载',width/2,height*.34);c.font='14px Microsoft YaHei';c.fillText(blackout?'控制中枢正在重新供能':'高压装置重启 · 观察预警',width/2,height*.34+30);}
      c.restore();
    }
    services(world){root.DungeonWayfarers?.draw(this.ctx,world);}

  }
  root.WorkshopRenderer=WorkshopRenderer;
})(globalThis);
