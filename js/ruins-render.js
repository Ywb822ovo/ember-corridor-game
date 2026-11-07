(function(root){
  'use strict';
  class RuinsRenderer{
    constructor(){this.cache=new WeakMap();}
    floor(ctx,map){
      let canvas=this.cache.get(map);
      if(!canvas){
        canvas=document.createElement('canvas');canvas.width=map.cols*map.tileSize;canvas.height=map.rows*map.tileSize;
        const c=canvas.getContext('2d'),s=map.tileSize;
        c.fillStyle='#171c24';c.fillRect(0,0,canvas.width,canvas.height);
        for(let y=0;y<map.rows;y++)for(let x=0;x<map.cols;x++){
          const px=x*s,py=y*s;
          if(map.walk[y][x]){
            c.fillStyle=(x+y)%2?'#41464a':'#3d4247';c.fillRect(px,py,s,s);
            c.strokeStyle='#525652';c.lineWidth=2;c.strokeRect(px+2,py+2,s-4,s-4);
            c.strokeStyle='#333940';c.beginPath();c.moveTo(px+4,py+s-4);c.lineTo(px+s-4,py+s-4);c.stroke();
            if((x*7+y*3)%11===0){c.strokeStyle='#66675b';c.beginPath();c.moveTo(px+18,py+13);c.lineTo(px+27,py+23);c.lineTo(px+21,py+38);c.stroke();}
          }else{
            c.fillStyle='#68695e';c.fillRect(px,py,s,s);c.fillStyle='#454b4e';c.fillRect(px+4,py+7,s-8,s-12);
            c.strokeStyle='#272f39';c.lineWidth=4;c.strokeRect(px+2,py+2,s-4,s-4);c.beginPath();c.moveTo(px+4,py+40);c.lineTo(px+s-4,py+40);c.moveTo(px+40,py+4);c.lineTo(px+40,py+38);c.stroke();
          }
        }
        for(const b of map.solids||[]){
          c.fillStyle='#151d2477';c.fillRect(b.x-6,b.y+12,b.w+12,b.h+10);
          c.fillStyle='#292f35';c.fillRect(b.x,b.y,b.w,b.h);
          c.fillStyle='#8b8874';c.fillRect(b.x+4,b.y-14,b.w-8,b.h-6);
          c.fillStyle='#696d64';c.fillRect(b.x+9,b.y-9,b.w-18,b.h-17);
          c.strokeStyle='#303b40';c.lineWidth=3;c.strokeRect(b.x+5,b.y-13,b.w-10,b.h-8);
          c.fillStyle='#aca185';c.fillRect(b.x+12,b.y-7,b.w-24,4);
        }
        this.cache.set(map,canvas);
      }
      ctx.drawImage(canvas,0,0);
    }
  }
  root.DungeonRuinsRenderer=RuinsRenderer;
})(globalThis);
