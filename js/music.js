(function(root){
  'use strict';
  const TRACKS=Object.freeze({menu:'assets/music/menu.mp3',ruins:'assets/music/ruins.mp3',workshop:'assets/music/workshop.mp3',boss:'assets/music/boss.mp3'});
  function scene({page='home',state='title',resumeState='combat',chapter=1,roomType='combat',completed=false}={}){
    if(page!=='game')return {track:'menu',level:.7};
    if(['lost','won','chapter-complete','title'].includes(state))return {track:null,level:0};
    if(state==='chapter-intro')return {track:'menu',level:.45};
    const paused=state==='paused',active=paused?resumeState:state;
    const track=['shop','rest'].includes(roomType)||active==='safe'||active==='shop'?'menu':roomType==='boss'&&!completed?'boss':chapter===2?'workshop':'ruins';
    return {track,level:(track==='menu'?.45:active==='reward'?.45:active==='cleared'?.65:1)*(paused?.25:1)};
  }
  class Player{
    constructor(context,output,{createAudio=()=>new root.Audio(),fade=1,direct=false}={}){
      this.context=context;this.output=output;this.createAudio=createAudio;this.fade=fade;this.direct=direct;this.volume=1;
      this.entries=new Map();this.scene={track:'menu',level:.7};this.active=true;this.enabled=true;this.current=null;this.ducked=false;this.destroyed=false;
    }
    update(next){
      if(next.track===this.scene.track&&next.level===this.scene.level)return;
      this.scene=next;this.reconcile();
    }
    configure({active=this.active,enabled=this.enabled}={}){
      const changed=active!==this.active||enabled!==this.enabled;this.active=active;this.enabled=enabled;
      if(changed)this.reconcile(true);
    }
    ramp(entry,value,duration=this.fade){
      entry.target=value;
      if(this.direct){
        clearInterval(entry.fadeTimer);
        const from=entry.envelope||0,start=Date.now();
        const step=()=>{const t=duration?Math.min(1,(Date.now()-start)/(duration*1000)):1;entry.envelope=from+(value-from)*t;entry.audio.volume=Math.max(0,Math.min(1,this.volume*entry.envelope));if(t===1){clearInterval(entry.fadeTimer);entry.fadeTimer=null;}};
        if(duration)entry.fadeTimer=setInterval(step,40);step();return;
      }
      const now=this.context.currentTime,param=entry.gain.gain;
      if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);
      else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}
      param.linearRampToValueAtTime(value,now+duration);
    }
    setVolume(value){this.volume=value;if(this.direct)for(const e of this.entries.values())e.audio.volume=Math.max(0,Math.min(1,value*(e.envelope||0)));}
    pause(entry){
      clearTimeout(entry.pauseTimer);entry.pauseTimer=null;entry.generation++;entry.pending=false;entry.audio.pause();entry.playing=false;
      this.ramp(entry,0,0);
    }
    getEntry(id){
      if(this.entries.has(id))return this.entries.get(id);
      const audio=this.createAudio(),gain=this.context.createGain();
      audio.preload='none';audio.loop=true;audio.src=TRACKS[id];gain.gain.value=0;
      let source=null;
      if(this.direct)audio.volume=0;
      else{source=this.context.createMediaElementSource(audio);source.connect(gain);gain.connect(this.output);}
      const entry={audio,gain,source,pending:false,playing:false,error:null,pauseTimer:null,target:0,generation:0};
      audio.addEventListener('error',()=>{entry.error='unavailable';entry.playing=false;this.ramp(entry,0,0);});
      this.entries.set(id,entry);return entry;
    }
    reconcile(retry=false){
      if(this.destroyed)return;
      if(!this.active||!this.enabled){for(const e of this.entries.values())this.pause(e);return;}
      const id=this.scene.track;
      if(!id){
        for(const e of this.entries.values())if(!e.pauseTimer&&(e.playing||e.pending)){
          this.ramp(e,0);e.pauseTimer=setTimeout(()=>this.pause(e),this.fade*1000);
        }
        this.current=null;return;
      }
      let entry;try{entry=this.getEntry(id);}catch{this.failed=true;return;}
      if(entry.error&&!retry)return;
      if(entry.pending)return;
      if(entry.playing&&!entry.audio.paused){this.activate(id,entry);return;}
      entry.pending=true;
      const generation=++entry.generation;
      if(entry.error){entry.audio.load();entry.error=null;}
      let play;try{play=entry.audio.play();}catch(error){play=Promise.reject(error);}
      Promise.resolve(play).then(()=>{
        if(generation!==entry.generation)return;
        entry.pending=false;
        if(this.destroyed||!this.active||!this.enabled||this.scene.track!==id){this.pause(entry);return;}
        entry.error=null;entry.playing=true;this.activate(id,entry);
      },error=>{if(generation!==entry.generation)return;entry.pending=false;entry.playing=false;entry.error=error?.name==='NotAllowedError'?'blocked':'unavailable';this.ramp(entry,0,0);});
    }
    activate(id,entry){
      const previous=this.current;clearTimeout(entry.pauseTimer);entry.pauseTimer=null;
      for(const [other,e]of this.entries)if(other!==id){
        if(other===previous&&e.playing&&!e.pauseTimer){
          this.ramp(e,0);e.pauseTimer=setTimeout(()=>this.pause(e),this.fade*1000);
        }else if(other!==previous)this.pause(e);
      }
      this.current=id;this.ramp(entry,this.scene.level*(this.ducked?.4:1));
    }
    duck(){
      this.ducked=true;clearTimeout(this.duckTimer);
      if(this.current)this.ramp(this.entries.get(this.current),this.scene.level*.4,.1);
      this.duckTimer=setTimeout(()=>{this.ducked=false;this.reconcile();},1200);
    }
    diagnostic(){
      return {track:this.scene.track,current:this.current,active:this.active,enabled:this.enabled,ducked:this.ducked,mode:this.direct?'media-volume':'web-audio',
        tracks:[...this.entries].map(([id,e])=>({id,paused:e.audio.paused,pending:e.pending,error:e.error,time:e.audio.currentTime||0,duration:Number.isFinite(e.audio.duration)?e.audio.duration:null,target:e.target}))};
    }
    destroy(){this.destroyed=true;clearTimeout(this.duckTimer);for(const e of this.entries.values()){this.pause(e);e.source?.disconnect();e.gain.disconnect();}}
  }
  const api={TRACKS,scene,Player};if(typeof module==='object'&&module.exports)module.exports=api;else root.DungeonMusic=api;
})(typeof globalThis!=='undefined'?globalThis:this);
