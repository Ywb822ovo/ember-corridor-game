(function(root){
  'use strict';
  function layout(width,height,mobile,insets={}){
    width=Math.max(1,Number(width)||1);height=Math.max(1,Number(height)||1);
    const rotated=Boolean(mobile&&height>width),s={top:0,right:0,bottom:0,left:0,...insets};
    return {width:rotated?height:width,height:rotated?width:height,rotated,compact:mobile&&Math.max(width,height)<=740,
      safe:rotated?{top:s.right,right:s.bottom,bottom:s.left,left:s.top}:s};
  }
  function localDelta(dx,dy,rotated){return rotated?{x:dy,y:-dx}:{x:dx,y:dy};}
  class Stage{
    constructor(element){
      this.element=element;this.mobile=matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0;
      this.probe=document.createElement('div');this.probe.setAttribute('aria-hidden','true');
      this.probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;width:0;height:0;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';document.body.append(this.probe);
      document.documentElement.classList.toggle('touch-mode',this.mobile);
      this.refresh=this.refresh.bind(this);this.refresh();this.installScrolling();
      addEventListener('resize',this.refresh);addEventListener('orientationchange',this.refresh);
      if(window.visualViewport){visualViewport.addEventListener('resize',this.refresh);visualViewport.addEventListener('scroll',this.refresh);}
    }
    refresh(){
      const view=window.visualViewport,sw=view?.width||innerWidth,sh=view?.height||innerHeight,style=getComputedStyle(this.probe);
      const insets={};for(const side of ['top','right','bottom','left'])insets[side]=parseFloat(style.getPropertyValue('padding-'+side))||0;
      const next=layout(sw,sh,this.mobile,insets),changed=!this.size||next.rotated!==this.rotated||Math.abs(next.width-this.size.width)>.5||Math.abs(next.height-this.size.height)>.5;
      this.size=next;this.rotated=next.rotated;const html=document.documentElement;
      html.classList.toggle('stage-rotated',next.rotated);html.classList.toggle('compact-stage',next.compact);
      for(const [key,value]of Object.entries({'stage-width':next.width,'stage-height':next.height,'screen-width':sw,'screen-height':sh,'view-left':view?.offsetLeft||0,'view-top':view?.offsetTop||0}))html.style.setProperty('--'+key,value+'px');
      for(const side of Object.keys(next.safe))html.style.setProperty('--safe-'+side,next.safe[side]+'px');
      if(changed){this.scrollGesture=null;dispatchEvent(new Event('dungeonviewportchange'));}
    }
    installScrolling(){
      document.addEventListener('pointerdown',event=>{
        this.suppressedClick=null;
        if(!this.rotated||event.pointerType!=='touch'||event.target.closest('input,select,textarea')||!event.target.closest('.front-shell,.menu-card,dialog'))return;
        let el=event.target;
        while(el&&el!==document.body){if(el.scrollHeight>el.clientHeight+1&&/auto|scroll/.test(getComputedStyle(el).overflowY))break;el=el.parentElement;}
        if(!el||el===document.body)return;
        this.scrollGesture={id:event.pointerId,x:event.clientX,y:event.clientY,top:el.scrollTop,el,target:event.target,moved:false};
      },true);
      document.addEventListener('pointermove',event=>{
        const g=this.scrollGesture;if(!g||g.id!==event.pointerId||!this.rotated)return;
        const d=localDelta(event.clientX-g.x,event.clientY-g.y,true);if(Math.abs(d.y)<8&&!g.moved)return;
        g.moved=true;event.preventDefault();g.el.scrollTop=g.top-d.y;
        try{if(!g.el.hasPointerCapture(g.id))g.el.setPointerCapture(g.id);}catch{}
      },{capture:true,passive:false});
      const end=event=>{const g=this.scrollGesture;if(!g||g.id!==event.pointerId)return;if(g.moved)this.suppressedClick={id:g.id,target:g.target,time:performance.now()};this.scrollGesture=null;try{if(g.el.hasPointerCapture(g.id))g.el.releasePointerCapture(g.id);}catch{}};
      document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
      document.addEventListener('click',event=>{const s=this.suppressedClick;if(s&&performance.now()-s.time<500&&(event.pointerId===s.id||(event.pointerId===undefined&&event.target===s.target))){event.preventDefault();event.stopPropagation();this.suppressedClick=null;}},true);
    }
    snapshot(){return {rotated:this.rotated,width:this.size.width,height:this.size.height};}
  }
  const api={layout,localDelta,Stage};if(typeof module==='object'&&module.exports)module.exports=api;else root.DungeonViewport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
