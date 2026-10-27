(function(root){
  'use strict';
  class GuardianRenderer{
    constructor(ctx){this.ctx=ctx;}
    skeleton(e){
      const c=this.ctx,a=root.DungeonCombat.appearance(e),s=a.size/16;c.save();c.translate(Math.round(e.x),Math.round(e.y+(e.bob||0)));if(Math.cos(e.angle)<0)c.scale(-1,1);c.translate(-a.size/2,-a.size+15);c.scale(s,s);
      for(const [x,y,w,h,color]of a.parts){c.fillStyle=color;c.fillRect(x,y,w,h);}
      c.fillStyle='#42303b';c.fillRect(6,2,2,2);c.fillRect(9,2,2,2);c.fillRect(8,4,1,1);c.fillRect(7,6,1,1);c.fillRect(9,6,1,1);c.fillRect(7,8,1,3);c.fillRect(9,8,1,3);
      c.fillStyle='#f197a9';c.fillRect(6,3,1,1);c.fillRect(9,3,1,1);c.restore();
    }
    floor(w){
      const c=this.ctx;
      for(const e of w.enemies){
        if(e.kind==='skeleton'&&e.warmup>0){c.save();c.strokeStyle='#d9b8e7';c.fillStyle='#995eb52b';c.lineWidth=2;c.beginPath();c.ellipse(e.x,e.y+10,27,14,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([4,4]);c.beginPath();c.ellipse(e.x,e.y+10,35,20,0,0,Math.PI*2);c.stroke();c.fillStyle='#f1d8e4';c.font='bold 10px Microsoft YaHei';c.textAlign='center';c.fillText(`骷髅现身 ${e.warmup.toFixed(1)}秒`,e.x,e.y+39);c.restore();}
        if(!root.DungeonGuardian.is(w,e))continue;
        if(e.enraged){c.save();const radius=52+(this.reduced?0:Math.sin(w.elapsed*5)*4);c.strokeStyle='#f5ae8cb0';c.fillStyle='#bf4d6e22';c.lineWidth=3;c.beginPath();c.ellipse(e.x,e.y+8,radius,20,0,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([9,9]);c.strokeStyle='#d480b6';c.beginPath();c.ellipse(e.x,e.y+8,radius+10,25,0,0,Math.PI*2);c.stroke();c.restore();}
      }
    }
    summonWarning(e){
      const c=this.ctx;c.save();c.strokeStyle='#e3b7f1';c.lineWidth=2;c.fillStyle='#79458b44';c.beginPath();c.ellipse(e.x,e.y+7,55,25,0,0,Math.PI*2);c.fill();c.stroke();
      for(let i=0;i<6;i++){const a=i*Math.PI/3;c.fillStyle='#f0c7ff';c.fillRect(e.x+Math.cos(a)*45-3,e.y+7+Math.sin(a)*20-3,6,6);}
      c.font='bold 12px Microsoft YaHei';c.textAlign='center';c.fillStyle='#efcaff';c.fillText(`亡者召集 · ${e.windup.toFixed(1)}秒`,e.x,e.y+51);c.restore();
    }
  }
  root.GuardianRenderer=GuardianRenderer;
})(globalThis);
