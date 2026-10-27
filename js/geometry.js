(function(root){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  class Geometry{
    constructor(map){this.map=map;this.solids=map.solids||[];this.floor=[];map.walk.forEach((row,y)=>row.forEach((ok,x)=>{const p={x:(x+.5)*map.tileSize,y:(y+.5)*map.tileSize};if(ok&&this.canStand(p.x,p.y,13))this.floor.push(p);}));this.flow=new Map();this.flowKey='';}
    isFloor(x,y){return Boolean(this.map.walk[y]?.[x]);}
    canStand(x,y,radius){
      const s=this.map.tileSize;
      for(let row=Math.floor((y-radius)/s);row<=Math.floor((y+radius)/s);row++){
        for(let col=Math.floor((x-radius)/s);col<=Math.floor((x+radius)/s);col++){
          if(this.isFloor(col,row))continue;
          const nx=clamp(x,col*s,(col+1)*s),ny=clamp(y,row*s,(row+1)*s);
          if(Math.hypot(x-nx,y-ny)<radius)return false;
        }
      }
      for(const b of this.solids){const nx=clamp(x,b.x,b.x+b.w),ny=clamp(y,b.y,b.y+b.h);if(Math.hypot(x-nx,y-ny)<radius)return false;}
      return true;
    }
    move(body,dx,dy){if(this.canStand(body.x+dx,body.y,body.radius))body.x+=dx;if(this.canStand(body.x,body.y+dy,body.radius))body.y+=dy;}
    visible(a,b,radius=3){const len=distance(a,b),steps=Math.max(1,Math.ceil(len/4));for(let i=0;i<=steps;i++){const t=i/steps;if(!this.canStand(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,radius))return false;}return true;}
    makeFlow(target,radius=13){
      const s=this.map.tileSize,col=Math.floor(target.x/s),row=Math.floor(target.y/s),key=`${col},${row}`,cacheKey=`${key}/${radius}`;
      if(cacheKey===this.flowKey)return;this.flowKey=cacheKey;this.flow.clear();this.flow.set(key,0);const q=[[col,row]];
      for(let i=0;i<q.length;i++){const [x,y]=q[i],d=this.flow.get(`${x},${y}`);for(const [nx,ny]of[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const k=`${nx},${ny}`;if(this.isFloor(nx,ny)&&this.canStand((nx+.5)*s,(ny+.5)*s,radius)&&!this.flow.has(k)){this.flow.set(k,d+1);q.push([nx,ny]);}}}
    }
    towards(body,target){
      if(this.visible(body,target,body.radius))return target;
      this.makeFlow(target,body.radius);const s=this.map.tileSize,col=Math.floor(body.x/s),row=Math.floor(body.y/s);
      let best=this.flow.get(`${col},${row}`)??Infinity,next={x:(col+.5)*s,y:(row+.5)*s};
      for(const [x,y]of[[col+1,row],[col-1,row],[col,row+1],[col,row-1]]){const d=this.flow.get(`${x},${y}`);if(d!==undefined&&d<best){best=d;next={x:(x+.5)*s,y:(y+.5)*s};}}
      const center={x:(col+.5)*s,y:(row+.5)*s};
      if(next.x!==center.x&&Math.abs(body.y-center.y)>2)return {x:body.x,y:center.y};
      if(next.y!==center.y&&Math.abs(body.x-center.x)>2)return {x:center.x,y:body.y};
      return next;
    }
  }
  const api={Geometry,clamp,distance};root.DungeonGeometry=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
