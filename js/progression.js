(function(root){
  'use strict';
  const empty=()=>({1:{normal:false,hard:false},2:{normal:false,hard:false}});
  const valid=(chapter,difficulty)=>[1,2].includes(chapter)&&['normal','hard'].includes(difficulty);
  function canEnter(p,chapter,difficulty){
    if(!valid(chapter,difficulty))return false;
    if(chapter===1&&difficulty==='normal')return true;
    if(chapter===1)return Boolean(p?.[1]?.normal);
    if(!p?.[1]?.normal)return false;
    return difficulty==='normal'||Boolean(p?.[2]?.normal);
  }
  function normalize(value,stats={}){
    const p=empty();
    if(value===undefined){
      if(stats.wins>0||stats.chapterClears>0||(stats.runs||[]).some(r=>r.result==='won'||r.roomCount===12&&r.room>=6))p[1].normal=true;
      if(stats.chapterClears>0||(stats.runs||[]).some(r=>r.result==='chapter-complete')){p[1].normal=true;p[2].normal=true;}
      return p;
    }
    for(const c of [1,2])for(const d of ['normal','hard']){if(typeof value?.[c]?.[d]!=='boolean')throw new Error('章节解锁记录不完整。');p[c][d]=value[c][d];}
    if(p[1].hard&&!p[1].normal||p[2].normal&&!p[1].normal||p[2].hard&&!p[2].normal)throw new Error('章节解锁顺序不正确。');
    return p;
  }
  function complete(value,chapter,difficulty){const p=normalize(value);if(canEnter(p,chapter,difficulty))p[chapter][difficulty]=true;return p;}
  function rules(difficulty){return difficulty==='hard'?{hp:1.35,melee:1.08,projectile:1.10}:{hp:1,melee:1,projectile:1};}
  function loadout(chapter){return chapter===2?{health:8,coins:20,damage:1.44,interval:.9,perk:1}:{health:8,coins:0,damage:1,interval:1,perk:0};}
  const api={empty,canEnter,normalize,complete,rules,loadout,valid};root.DungeonProgression=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
