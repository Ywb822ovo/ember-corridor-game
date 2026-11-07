(function(root){
  'use strict';
  const resolveMode=(choice,mobile=false,fine=false)=>choice==='manual'||choice==='auto'?choice:mobile&&!fine?'auto':'manual';
  function worldPoint(client,rect,size,view,rotated=false){
    if(!client||!view||![client.x,client.y,rect.left,rect.top,rect.width,rect.height,size.width,size.height,view.zoom,view.cx,view.cy].every(Number.isFinite)||rect.width<=0||rect.height<=0||size.width<=0||size.height<=0||view.zoom<=0)return null;
    const dx=client.x-rect.left,dy=client.y-rect.top;
    if(dx<0||dy<0||dx>rect.width||dy>rect.height)return null;
    const x=rotated?dy*size.width/rect.height:dx*size.width/rect.width;
    const y=rotated?(rect.width-dx)*size.height/rect.width:dy*size.height/rect.height;
    return {x:x/view.zoom+view.cx-(view.shakeX||0),y:y/view.zoom+view.cy-(view.shakeY||0)};
  }
  class Pointer{
    constructor({canvas,viewport,renderer,enabled}){
      Object.assign(this,{canvas,viewport,renderer,enabled});this.client=null;
      this.move=event=>{if(event.pointerType==='mouse'){if(this.enabled())this.client={x:event.clientX,y:event.clientY};else this.reset();}};
      document.addEventListener('pointermove',this.move);document.addEventListener('pointerdown',this.move);
      document.addEventListener('pointerout',event=>{if(event.pointerType==='mouse'&&!event.relatedTarget)this.reset();});
      addEventListener('resize',()=>this.reset());addEventListener('dungeonviewportchange',()=>this.reset());
    }
    reset(){this.client=null;}
    point(){return worldPoint(this.client,this.canvas.getBoundingClientRect(),{width:this.canvas.clientWidth,height:this.canvas.clientHeight},this.renderer()?.view,this.viewport.rotated);}
  }
  const api={resolveMode,worldPoint,Pointer};if(typeof module==='object'&&module.exports)module.exports=api;else root.DungeonAiming=api;
})(typeof globalThis!=='undefined'?globalThis:this);
