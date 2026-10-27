(function(root){
  'use strict';
  const traits=Object.freeze({
    sidearm:{name:'游击步伐',icon:'➚',descriptions:['短枪击杀后，移速 +15%，持续3秒','短枪击杀后，移速 +25%，持续3秒']},
    shotgun:{name:'震退弹丸',icon:'»',descriptions:['命中击退28像素，每轮每敌一次；蓄力、冲锋期间免疫击退','击退提升至42像素，每轮每敌一次；蓄力、冲锋期间免疫击退']},
    piercer:{name:'寒铁穿透',icon:'❄',descriptions:['命中后移动减速25%，持续1.2秒；不改变冲锋','移动减速提升至40%，持续1.2秒；不改变冲锋']}
  });
  function option(id,rank=0){const t=traits[id];return {id:'perk-'+id,name:t.name,icon:t.icon,description:t.descriptions[Math.min(rank,1)],rank:Math.min(rank+1,2),disabled:rank>=2};}
  const api={traits,option};root.DungeonGrowth=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
