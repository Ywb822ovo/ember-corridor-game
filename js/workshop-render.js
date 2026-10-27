(function(root){
  'use strict';
  const M=root.DungeonMachines,T=root.DungeonTactics,W=root.DungeonWorkshop;
  class WorkshopRenderer{
    constructor(ctx){this.ctx=ctx;this.cache=new Map();}
    floor(map){
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
    actor(e){
      const c=this.ctx,d=M.defs[e.kind],flip=Math.cos(e.angle||0)<0;c.save();c.translate(Math.round(e.x),Math.round(e.y+(e.bob||0))-d.size+15);c.scale(flip?-d.size/16:d.size/16,d.size/16);c.translate(-8,0);
      for(const [x,y,w,h,color]of d.parts){c.fillStyle=color;if((e.kind==='warden'||e.kind==='overseer')&&x===6&&y===8)c.fillStyle=e.mode==='open'||e.mode==='core'?'#c1fff1':'#4c7a87';c.fillRect(x,y,w,h);if(e.hit>0){c.globalAlpha=e.hit/.15*.5;c.fillStyle='#fff4c5';c.fillRect(x,y,w,h);c.globalAlpha=1;}}
      c.restore();
    }
    warning(world,e){
      const c=this.ctx;c.save();c.lineCap='round';
      if(e.kind==='hound'&&e.chargePlan){const p=e.chargePlan;c.strokeStyle='#f5bf6240';c.lineWidth=(e.radius+13)*2;c.beginPath();c.moveTo(p.start.x,p.start.y);c.lineTo(p.end.x,p.end.y);c.stroke();c.strokeStyle='#ffe3aa';c.lineWidth=2;c.beginPath();c.arc(p.end.x,p.end.y,e.radius,0,Math.PI*2);c.stroke();}
      if(e.kind==='pulse'&&e.aim&&e.shotOrigin){const origin=e.shotOrigin,a=T.shotAngles(e)[0],end=T.rayEnd(world.geometry,origin,a,780);c.strokeStyle=e.mode==='burst'?'#ffb5a677':'#ffb5a6cc';c.lineWidth=2;c.setLineDash([9,7]);c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(end.x,end.y);c.stroke();c.setLineDash([]);for(let d=60;d<Math.hypot(end.x-origin.x,end.y-origin.y);d+=100){c.save();c.translate(origin.x+Math.cos(a)*d,origin.y+Math.sin(a)*d);c.rotate(a);c.beginPath();c.moveTo(-7,-5);c.lineTo(0,0);c.lineTo(-7,5);c.stroke();c.restore();}}
      c.restore();
    }
    mechanisms(world){
      const c=this.ctx;
      for(const p of world.workshop.pads){
        const off=world.completed[world.roomIndex]||world.workshop.offFor>0,active=!off&&p.state==='active',warning=!off&&p.state==='warning';
        c.save();c.fillStyle='#172d38';c.fillRect(p.x-4,p.y-4,p.w+8,p.h+8);c.fillStyle=active?(p.type==='press'?'#e3a76a':'#8aeee6'):warning?'#6e6550':'#2b4651';c.fillRect(p.x,p.y,p.w,p.h);c.strokeStyle=warning?'#ffe2a3':active?'#e4ffef':'#557987';c.lineWidth=3;c.setLineDash(warning?[8,5]:[]);c.strokeRect(p.x,p.y,p.w,p.h);c.setLineDash([]);
        for(let x=10;x<p.w-8;x+=20){c.fillStyle=active?'#183d48':'#5c7880';c.fillRect(p.x+x,p.y+9,5,p.h-18);}
        c.fillStyle=active?'#173a45':warning?'#ffe8b1':'#c4d7d5';c.font='bold 19px Microsoft YaHei';c.textAlign='center';c.fillText(p.type==='press'?'↓':'ϟ',p.x+p.w/2,p.y+p.h/2+3);c.font='bold 11px Microsoft YaHei';c.fillText(off?'已断电':warning?`${p.type==='press'?'落锤':'通电'} ${p.timer.toFixed(1)}秒`:active?'危险':p.type==='press'?'液压冲床':'脉冲电板',p.x+p.w/2,p.y+p.h-12);c.restore();
      }
      for(const t of world.threats){
        if(t.delay>0)continue;const active=t.phase==='active';c.save();c.strokeStyle=active?'#e5fff4':'#ffcd8a';c.fillStyle=active?'#b4f5e2c0':'#e9b16a26';c.lineWidth=3;c.setLineDash(active?[]:[8,6]);
        let tx=t.x,ty=t.y;
        if(t.shape==='circle'){
          c.beginPath();c.arc(t.x,t.y,t.radius,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);c.strokeStyle='#ffefbe';c.beginPath();c.arc(t.x,t.y,t.radius-7,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-t.remaining/t.warning));c.stroke();
          if(t.kind==='grenade'&&t.origin){const progress=Math.min(1,(t.warning-t.remaining)/.45);c.fillStyle='#f5d68e';c.beginPath();c.arc(t.origin.x+(t.x-t.origin.x)*progress,t.origin.y+(t.y-t.origin.y)*progress-Math.sin(progress*Math.PI)*60,7,0,Math.PI*2);c.fill();}
        }else if(t.shape==='box'){c.translate(t.x,t.y);c.rotate(t.angle);c.fillRect(0,-t.h/2,t.w,t.h);c.strokeRect(0,-t.h/2,t.w,t.h);tx=t.w/2;ty=0;}
        else{c.fillRect(t.x,t.y,t.w,t.h);c.strokeRect(t.x,t.y,t.w,t.h);tx=t.x+t.w/2;ty=Math.max(t.y+35,world.player.y-80);}
        c.setLineDash([]);c.font='bold 13px Microsoft YaHei';c.textAlign='center';c.fillStyle=active?'#163d42':'#ffe6ae';c.fillText(active?'危险':`${t.kind==='grenade'?'投雷':t.kind==='beam'?'电束':'落锤'} ${t.remaining.toFixed(1)}秒`,tx,ty+5);c.restore();
      }
      if(world.map.console){const p=world.map.console,off=world.workshop.offFor>0;c.save();c.fillStyle='#183241';c.fillRect(p.x-24,p.y-39,48,49);c.fillStyle=off?'#abe5b8':'#91dae1';c.fillRect(p.x-19,p.y-34,38,23);c.fillStyle='#21464b';c.font='bold 18px Microsoft YaHei';c.textAlign='center';c.fillText('ϟ',p.x,p.y-16);c.fillStyle='#b5c4bc';c.fillRect(p.x-30,p.y+10,60,7);c.font='bold 11px Microsoft YaHei';c.fillStyle='#d9f3df';c.fillText(off?`断电 ${world.workshop.offFor.toFixed(1)}秒`:world.workshop.cooldown>0?`冷却 ${Math.ceil(world.workshop.cooldown)}秒`:'E · 暂停机关4秒',p.x,p.y+35);c.restore();}
    }
    services(world){
      const c=this.ctx;
      for(const [p,title,icon]of[[world.map.service,'维修站 · 免费恢复3点','＋'],[world.map.supply,'工坊商人 · 金币补给','◇']])if(p){
        c.save();c.fillStyle='#203c49';c.fillRect(p.x-32,p.y-38,64,54);c.strokeStyle='#a3d9d1';c.lineWidth=2;c.strokeRect(p.x-32,p.y-38,64,54);c.fillStyle='#7ba9a4';c.fillRect(p.x-25,p.y-31,50,25);c.fillStyle='#172f3e';c.font='bold 23px Microsoft YaHei';c.textAlign='center';c.fillText(icon,p.x,p.y-9);c.fillStyle='#c5d9c6';c.fillRect(p.x-36,p.y+12,72,10);c.font='bold 12px Microsoft YaHei';c.fillStyle='#d9eee1';c.fillText(title,p.x,p.y-57);c.font='11px Microsoft YaHei';c.fillText('靠近按 E',p.x,p.y+42);c.restore();
      }
    }
  }
  root.WorkshopRenderer=WorkshopRenderer;
})(globalThis);
