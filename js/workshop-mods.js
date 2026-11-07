(function(root){
  'use strict';
  const {center}=typeof module!=='undefined'?require('./combat.js'):root.DungeonCombat;
  const catalog=Object.freeze([
    {id:'mod-sidearm',targetWeapon:'sidearm',currency:'parts',name:'短枪双连发',description:'每轮两发，各造成70%伤害，第二发延后0.12秒',price:12,icon:'Ⅱ'},
    {id:'mod-shotgun',targetWeapon:'shotgun',currency:'parts',name:'霰弹过热弹',description:'命中附加2秒过热；每0.5秒造成单颗伤害的40%，同轮不叠加',price:14,icon:'♨'},
    {id:'mod-piercer',targetWeapon:'piercer',currency:'parts',name:'穿透蓄能器',description:'战斗中蓄能1.5秒后，下一轮伤害+40%',price:16,icon:'ϟ'}
  ]);
  const enabled=(w,id)=>w.cfg.workshopV2&&w.chapter===2&&w.workshopRun.modifications.includes('mod-'+id);
  function items(w){return catalog.map(item=>({...item,sold:w.workshopRun.modifications.includes(item.id),available:w.chapter===2&&w.workshopRun.parts>=item.price&&!w.workshopRun.modifications.includes(item.id)&&w.weapon.id===item.targetWeapon}));}
  function buy(w,item){if(!item||!item.available||item.currency!=='parts')return false;w.workshopRun.parts-=item.price;w.workshopRun.modifications.push(item.id);w.feedback='已安装'+item.name+'，本局第二章有效。';w.events.push({type:'purchase'});return true;}
  function tick(w,dt,fire,aimMode,aimPoint){
    if(!w.cfg.workshopV2||w.chapter!==2)return;
    w.workshopRun.charge=Math.min(1.5,(w.workshopRun.charge||0)+(w.weapon.id==='piercer'?dt:0));
    const b=w.pendingBurst;if(!b)return;
    if(!fire||w.weapon.id!==b.weaponId||aimMode==='manual'&&(!aimPoint||!Number.isFinite(aimPoint.x)||!Number.isFinite(aimPoint.y))){w.pendingBurst=null;return;}
    b.delay-=dt;if(b.delay>1e-7)return;
    const origin=center(w.player);if(aimMode==='manual'&&Math.hypot(aimPoint.x-origin.x,aimPoint.y-origin.y)<.001){w.pendingBurst=null;return;}
    const a=aimMode==='manual'?Math.atan2(aimPoint.y-origin.y,aimPoint.x-origin.x):b.angle;
    w.emitVolley(a,.7);w.pendingBurst=null;
  }
  function scale(w,a){
    if(enabled(w,'sidearm')){w.pendingBurst={delay:.12,angle:a,weaponId:w.weapon.id};return .7;}
    if(enabled(w,'piercer')&&w.workshopRun.charge>=1.5){w.workshopRun.charge=0;return 1.4;}
    return 1;
  }
  function hit(w,e,b){if(b.overheat&&e.lastHeatVolley!==b.volley&&e.hp>0){e.lastHeatVolley=b.volley;e.heatTicks=4;e.heatClock=.5;e.heatDamage=b.damage*.4;}}
  function heat(w,e,dt){if(!(e.heatTicks>0))return;e.heatClock-=dt;if(e.heatClock<=1e-7){e.heatClock+=.5;e.heatTicks--;w.damageEnemy(e,e.heatDamage,{kind:'modification',weaponId:'shotgun',volley:'heat-'+e.lastHeatVolley+'-'+e.heatTicks});}}
  const api={catalog,enabled,items,buy,tick,scale,hit,heat};root.DungeonWorkshopMods=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
