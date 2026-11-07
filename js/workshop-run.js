(function(root){
  'use strict';
  const ids=Object.freeze([6,7,8,9,14,10,11]);
  const create=()=>({version:1,parts:0,badge:false,components:[],hiddenClaimed:false,modifications:[],charge:0,pressureLoot:{}});
  function budget(w,e,settle=false){
    const s=w.workshopRun;s.pressureLoot??={};const l=s.pressureLoot[w.roomIndex]??={gold:0,parts:0,credited:[],settled:false};
    if(l.settled||e?.summonerId)return {gold:0};
    if(e){if(l.credited.includes(e.id))return {gold:0};l.credited.push(e.id);}
    const total=w.map.batches.reduce((n,b)=>n+b.kinds.length,0)||1,b=w.map.lootBudget;
    const gold=settle?b.gold:Math.floor(Math.min(1,l.credited.length/total)*Math.floor(b.gold*.6)),parts=settle?b.parts:Math.floor(Math.min(1,l.credited.length/total)*Math.floor(b.parts*.5));
    const gain={gold:Math.max(0,gold-l.gold)};s.parts+=Math.max(0,parts-l.parts);l.gold=Math.max(l.gold,gold);l.parts=Math.max(l.parts,parts);if(settle)l.settled=true;return gain;
  }
  function enter(w){
    if(!w.cfg.workshopV2||w.chapter!==2)return;
    const s=w.workshopRun;
    if(w.roomIndex===8&&!s.components.includes('stabilizer')){s.components.push('stabilizer');w.feedback='取得稳压部件：升降井供能的候选部件。';w.events.push({type:'workshop-component',component:'stabilizer'});}
    if(w.roomIndex===14&&!s.hiddenClaimed){s.hiddenClaimed=true;s.parts+=8;w.player.shield=2;w.feedback='检修物资已领取：双层护盾与8零件。工牌门后可通往核心前厅。';w.events.push({type:'workshop-cache'});}
  }
  function clear(w){
    if(!w.cfg.workshopV2||w.chapter!==2)return;
    const s=w.workshopRun;
    const gain=w.map.workshopPressure?budget(w,null,true):null;
    if(!gain&&w.map.type!=='boss')s.parts+=w.roomIndex===9?12:4;
    if(w.roomIndex===9){s.badge=true;if(!s.components.includes('booster'))s.components.push('booster');w.feedback='取得工牌与增压部件：可开启隐藏检修间。';w.events.push({type:'workshop-badge'});}
    return gain;
  }
  function kill(w,e){if(!w.cfg.workshopV2||w.chapter!==2)return;if(w.map.workshopPressure)return budget(w,e);if(e.summonerId)return;const rank=e.rank||e.kind;if(rank!=='boss')w.workshopRun.parts+=rank==='elite'?12:2;}
  const api={ids,create,enter,clear,kill};root.DungeonWorkshopRun=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
