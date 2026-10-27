(function(root){
  'use strict';
  class AudioEngine{
    constructor(settings){this.settings=settings;this.context=null;this.gain=null;this.voices=0;this.count=0;this.last={};}
    async unlock(){try{if(!this.context){const C=root.AudioContext||root.webkitAudioContext;if(!C)return;this.context=new C();this.gain=this.context.createGain();this.gain.connect(this.context.destination);this.apply(this.settings);}if(this.context.state==='suspended')await this.context.resume();}catch{this.failed=true;}}
    apply(settings){this.settings=settings;if(this.gain)this.gain.gain.value=settings.mute?0:settings.master*settings.sfx*.18;}
    tone(frequency,duration,type='square',end=frequency){
      const c=this.context;if(!c||c.state!=='running'||this.voices>=8||this.settings.mute||this.settings.master===0||this.settings.sfx===0)return;
      const osc=c.createOscillator(),env=c.createGain(),at=c.currentTime;osc.type=type;osc.frequency.setValueAtTime(frequency,at);osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),at+duration);env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(.65,at+.005);env.gain.exponentialRampToValueAtTime(.0001,at+duration);osc.connect(env);env.connect(this.gain);this.voices++;this.count++;osc.onended=()=>{this.voices--;osc.disconnect();env.disconnect();};osc.start(at);osc.stop(at+duration+.01);
    }
    play(type,weaponId='sidearm'){
      if(type==='guardian-enrage')type='phase';if(type==='guardian-summon')type='warning';if(type==='guardian-shot')type='warning';if(type==='chapter-complete')type='won';if(type==='poweroff')type='select';if(type==='core')type='reward';if(type==='mechanism')type='warning';
      const now=this.context?.currentTime??0;if(now-(this.last[type]??-10)<(type==='hit'?.055:type==='shot'?.04:.1))return;this.last[type]=now;
      const notes={hit:[390,.04,'triangle',220],hurt:[170,.18,'sawtooth',65],kill:[600,.09,'triangle',300],warning:[340,.12,'sine',530],clear:[470,.28,'triangle',920],enter:[320,.18,'sine',600],reward:[650,.16,'triangle',1050],heal:[520,.25,'sine',980],purchase:[720,.12,'triangle',1100],phase:[135,.42,'sawtooth',350],won:[520,.5,'triangle',1250],lost:[240,.45,'triangle',65],select:[520,.035,'triangle',700]};
      if(type==='shield')this.tone(1050,.16,'sine',350);
      else if(type==='shot'){const n=weaponId==='shotgun'?[95,.13,'sawtooth',40]:weaponId==='piercer'?[750,.13,'triangle',170]:[210,.065,'square',65];this.tone(...n);}else if(notes[type])this.tone(...notes[type]);
    }
    diagnostic(){return {state:this.failed?'unavailable':this.context?.state||'locked',volume:this.gain?.gain.value??0,voices:this.voices,generatedTones:this.count};}
  }
  root.DungeonAudio=AudioEngine;
})(globalThis);
