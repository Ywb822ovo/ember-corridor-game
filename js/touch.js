(function(root){
  'use strict';
  function vector(dx,dy,radius=44){
    const length=Math.hypot(dx,dy);
    if(length<8)return {x:0,y:0,px:0,py:0};
    const scale=Math.min(length,radius)/length;
    return {x:dx*scale/radius,y:dy*scale/radius,px:dx*scale,py:dy*scale};
  }
  function combine(keyboard,touch){const x=keyboard.x+touch.x,y=keyboard.y+touch.y,len=Math.hypot(x,y);return len>1?{x:x/len,y:y/len}:{x,y};}
  function target(world){
    if(world.nearConsole)return {label:world.completed[world.roomIndex]?'已断电':world.workshop.cooldown>0?'冷却中':'断电',ready:!world.completed[world.roomIndex]&&world.workshop.cooldown<=0};
    if(world.nearSupply)return {label:'补给',ready:true};
    if(world.nearService)return {label:world.map.type==='shop'?'商店':world.restUsed?'已休息':world.player.hp===world.player.maxHp?'生命已满':'休息',ready:world.map.type==='shop'||(!world.restUsed&&world.player.hp<world.player.maxHp)};
    if(world.nearPortal&&['cleared','safe'].includes(world.state))return {label:'传送',ready:true};
    return {label:'交互',ready:false};
  }
  class Controller{
    constructor({onInteract,onPause,onGesture,viewport}){
      this.viewport=viewport;this.mobile=viewport.mobile;
      this.enabled=false;this.axis={x:0,y:0};this.attacking=false;this.pointers={};
      const $=id=>document.getElementById(id);this.root=$('touch-controls');this.stick=$('move-pad');this.knob=$('move-knob');this.attack=$('touch-attack');this.interact=$('touch-interact');
      document.documentElement.classList.toggle('touch-mode',this.mobile);
      const capture=(el,id)=>{try{el.setPointerCapture(id);}catch{}};
      const down=(kind,el,event)=>{
        if(!this.enabled||this.pointers[kind]!==undefined)return;
        event.preventDefault();onGesture();this.pointers[kind]=event.pointerId;capture(el,event.pointerId);
        if(kind==='move')this.move(event);else{this.attacking=true;el.classList.add('pressed');el.setAttribute('aria-pressed','true');}
      };
      const up=(kind,el,event)=>{
        if(this.pointers[kind]!==event.pointerId)return;
        delete this.pointers[kind];if(kind==='move')this.zeroStick();else{this.attacking=false;el.classList.remove('pressed');el.setAttribute('aria-pressed','false');}
      };
      for(const [kind,el]of[['move',this.stick],['attack',this.attack]]){
        el.addEventListener('pointerdown',e=>down(kind,el,e));
        for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,e=>up(kind,el,e));
        el.addEventListener('contextmenu',e=>e.preventDefault());
      }
      this.stick.addEventListener('pointermove',e=>{if(this.pointers.move===e.pointerId&&this.enabled){e.preventDefault();this.move(e);}});
      this.interact.addEventListener('click',()=>{if(this.enabled&&!this.interact.disabled){onGesture();onInteract();}});
      $('touch-pause').addEventListener('click',()=>{onGesture();onPause();});
      this.resize=()=>this.reset();
      addEventListener('dungeonviewportchange',this.resize);addEventListener('blur',()=>this.reset());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.reset();});
    }
    move(event){const rect=this.stick.getBoundingClientRect(),local=DungeonViewport.localDelta(event.clientX-rect.x-rect.width/2,event.clientY-rect.y-rect.height/2,this.viewport.rotated),v=vector(local.x,local.y,this.stick.clientWidth*.32);this.axis={x:v.x,y:v.y};this.knob.style.transform=`translate(${v.px}px,${v.py}px)`;}
    zeroStick(){this.axis={x:0,y:0};this.knob.style.transform='translate(0,0)';}
    reset(){this.zeroStick();this.attacking=false;this.attack.classList.remove('pressed');this.attack.setAttribute('aria-pressed','false');for(const [kind,id]of Object.entries(this.pointers)){const el=kind==='move'?this.stick:this.attack;try{if(el.hasPointerCapture(id))el.releasePointerCapture(id);}catch{}}this.pointers={};}
    update(world,page){
      const game=page==='game',active=['combat','cleared','safe'].includes(world.state);
      this.enabled=this.mobile&&game&&active;
      if(!this.enabled)this.reset();
      this.root.hidden=!this.enabled;
      document.getElementById('touch-pause').hidden=!(this.mobile&&game&&active);
      const action=target(world);this.interact.querySelector('strong').textContent=action.label;this.interact.querySelector('small').textContent=action.ready?'点击交互':'靠近目标';this.interact.disabled=!action.ready;
      this.attack.disabled=world.state!=='combat';this.attack.querySelector('small').textContent=world.state==='combat'?'按住射击':'暂无敌人';
    }
    snapshot(){return {mobile:this.mobile,portrait:this.viewport.rotated,viewport:this.viewport.snapshot(),enabled:this.enabled,axis:{...this.axis},attacking:this.attacking};}
  }
  const api={vector,combine,target,Controller};if(typeof module==='object'&&module.exports)module.exports=api;else root.DungeonTouch=api;
})(typeof globalThis!=='undefined'?globalThis:this);
