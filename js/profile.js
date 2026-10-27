(function(root){
  'use strict';
  const {byId}=typeof module!=='undefined'?require('./weapons.js'):root.DungeonWeapons;
  const P=typeof module!=='undefined'?require('./progression.js'):root.DungeonProgression;
  const KEY='last-five-waves.profile.v1',copy=value=>JSON.parse(JSON.stringify(value));
  const defaults=()=>({schema:1,equipped:'sidearm',progress:P.empty(),settings:{master:.8,sfx:.7,mute:false,shake:true,particles:true},stats:{wins:0,bestTime:null,chapterClears:0,runs:[]}});
  const number=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  function validate(value){
    if(!value||value.schema!==1||!byId[value.equipped])throw new Error('记录版本或武器信息不正确。');
    const s=value.settings,t=value.stats;
    if(!s||!['master','sfx'].every(k=>number(s[k],0,1))||!['mute','shake','particles'].every(k=>typeof s[k]==='boolean'))throw new Error('音量或效果设置不正确。');
    if(!t||!Number.isInteger(t.wins)||!number(t.wins,0,1e7)||!Array.isArray(t.runs)||t.runs.length>5||(t.bestTime!==null&&!number(t.bestTime,.01,36000)))throw new Error('战绩信息不正确。');
    const runs=t.runs.map(r=>{
      const roomCount=r?.roomCount??5;
      if(!r||![5,6,12].includes(roomCount)||!['won','lost','chapter-complete'].includes(r.result)||!byId[r.startingWeaponId]||!byId[r.weaponId]||!Number.isInteger(r.room)||!number(r.room,0,roomCount-1)||!Number.isInteger(r.kills)||!number(r.kills,0,1e6)||!Number.isInteger(r.coins)||!number(r.coins,0,1e6)||!number(r.elapsed,.01,36000)||typeof r.date!=='string'||r.date.length>64||!Number.isFinite(Date.parse(r.date)))throw new Error('某条冒险记录不完整。');
      if(r.result==='won'&&r.room!==roomCount-1)throw new Error('通关记录的房间信息不正确。');
      if(r.result==='won'&&roomCount===12)throw new Error('两章原型不能记为完整逃离。');
      if(r.result==='chapter-complete'&&(roomCount!==12||r.room!==11))throw new Error('阶段完成记录不正确。');
      if(r.difficulty!==undefined&&(!P.valid(r.startChapter,r.difficulty)||r.startChapter===2&&r.room<6))throw new Error('章节或难度信息不正确。');
      if(r.endDifficulty!==undefined&&!['normal','hard'].includes(r.endDifficulty))throw new Error('结束难度信息不正确。');
      const meta=r.difficulty===undefined?{}:{startChapter:r.startChapter,difficulty:r.difficulty,endDifficulty:r.endDifficulty||r.difficulty};
      return {date:r.date,result:r.result,room:r.room,roomCount,kills:r.kills,coins:r.coins,elapsed:r.elapsed,startingWeaponId:r.startingWeaponId,weaponId:r.weaponId,...meta};
    });
    const wins=runs.filter(r=>r.result==='won');
    if(t.wins<wins.length||(t.wins===0)!==(t.bestTime===null)||wins.some(r=>t.bestTime>r.elapsed))throw new Error('通关次数和最佳时间不一致。');
    const chapterClears=t.chapterClears??0;if(!Number.isInteger(chapterClears)||!number(chapterClears,0,1e7)||chapterClears<runs.filter(r=>r.result==='chapter-complete').length)throw new Error('阶段完成次数不正确。');
    return {schema:1,equipped:value.equipped,progress:P.normalize(value.progress,{...t,chapterClears,runs}),settings:{master:s.master,sfx:s.sfx,mute:s.mute,shake:s.shake,particles:s.particles},stats:{wins:t.wins,bestTime:t.bestTime,chapterClears,runs}};
  }
  class Store{
    constructor(storage){
      this.storage=storage;this.data=defaults();this.available=Boolean(storage);this.warning='';
      let raw;try{raw=storage?.getItem(KEY);}catch{this.available=false;}
      if(raw)try{this.data=validate(JSON.parse(raw));}catch{this.warning='本地记录无法读取，已使用默认设置。';}
      try{if(!storage)throw new Error('unavailable');storage.setItem(KEY+'.probe','1');storage.removeItem(KEY+'.probe');}catch{this.available=false;this.warning='当前记录仅在本次打开期间有效，可导出备份。';}
    }
    save(){try{if(!this.storage)throw new Error('storage unavailable');this.storage.setItem(KEY,JSON.stringify(this.data));this.available=true;return true;}catch{this.available=false;this.warning='当前记录仅在本次打开期间有效，可导出备份。';return false;}}
    equip(id){if(!byId[id])return false;this.data.equipped=id;this.save();return true;}
    setting(key,value){if(!(key in this.data.settings))return false;const next=copy(this.data);next.settings[key]=value;try{this.data=validate(next);}catch{return false;}this.save();return true;}
    clearChapter(chapter,difficulty){if(!P.canEnter(this.data.progress,chapter,difficulty))return false;const next=P.complete(this.data.progress,chapter,difficulty);if(this.data.progress[chapter][difficulty])return false;this.data.progress=next;this.save();return true;}
    record(snapshot,date=new Date().toISOString()){
      if(!['won','lost','chapter-complete'].includes(snapshot.state))return false;
      const r={date,result:snapshot.state,room:snapshot.roomIndex,roomCount:snapshot.roomCount??5,kills:snapshot.kills,coins:snapshot.coins,elapsed:Math.max(.01,Math.round(snapshot.elapsed*100)/100),startingWeaponId:snapshot.startingWeaponId,weaponId:snapshot.weapon.id,...(snapshot.difficulty?{startChapter:snapshot.startChapter,difficulty:snapshot.startingDifficulty||snapshot.difficulty,endDifficulty:snapshot.difficulty}:{})};
      const next=copy(this.data);next.stats.runs.unshift(r);next.stats.runs=next.stats.runs.slice(0,5);
      if(r.result==='won'){next.stats.wins++;next.stats.bestTime=next.stats.bestTime===null?r.elapsed:Math.min(next.stats.bestTime,r.elapsed);}
      if(r.result==='chapter-complete')next.stats.chapterClears=(next.stats.chapterClears||0)+1;
      this.data=validate(next);this.save();return true;
    }
    export(){return JSON.stringify(this.data,null,2);}
    preview(raw){if(typeof raw!=='string'||raw.length>200000)throw new Error('请选择小于200KB的记录文件。');try{return validate(JSON.parse(raw));}catch(error){if(error instanceof SyntaxError)throw new Error('文件不是有效的JSON记录。');throw error;}}
    import(profile){this.data=validate(profile);this.save();}
    clear(){this.data=defaults();this.save();}
  }
  const api={KEY,defaults,validate,Store};root.DungeonProfile=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
