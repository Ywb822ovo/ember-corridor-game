(function(root){
  'use strict';
  const R=typeof module!=='undefined'?require('./rng.js'):root.DungeonRng;
  const weapons=typeof module!=='undefined'?require('./weapons.js'):root.DungeonWeapons;
  const catalogs={
    early:[...weapons.list.map(w=>({id:'weapon-'+w.id,weaponId:w.id,name:w.name,price:w.price,category:'weapon'})),{id:'power',name:'强化弹头',price:12},{id:'rapid',name:'速射配件',price:10},{id:'repair',name:'应急药剂',price:6}],
    late:[{id:'late-repair',effect:'repair',name:'战前药剂',price:10,description:'恢复3点生命',icon:'♥'},{id:'late-shield',effect:'shield',name:'双层护盾',price:14,description:'补充至两层护盾',icon:'◇'},{id:'late-power',effect:'power',name:'决战弹头',price:18,description:'所有武器伤害 +20%',icon:'↗'},{id:'late-rapid',effect:'rapid',name:'决战供能器',price:14,description:'射击间隔缩短10%',icon:'ϟ'}],
    workshop:[{id:'workshop-power',effect:'power',name:'工坊强化弹头',description:'所有武器伤害 +20%',price:20},{id:'workshop-rapid',effect:'rapid',name:'工坊供能器',description:'射击间隔缩短10%',price:18},{id:'workshop-repair',effect:'repair',name:'工坊药剂',description:'恢复3点生命',price:10},{id:'workshop-shield',effect:'shield',name:'工坊护盾',description:'补充至两层护盾',price:14}]
  };
  function rewardPool(room,weapon){
    if(!(room.reward||[0,2,3].includes(room.id))||room.type==='boss')return [];
    const pool=['power','rapid','repair','shield'];
    if(room.id!==0)pool.push('heart','perk-'+weapon);
    return pool;
  }
  function rewards(room,weapon,seed){
    const pool=rewardPool(room,weapon);if(!pool.length)return [];
    const random=R.create(R.hash(seed,'rewards',room.id,weapon));
    let ids=[room.id===0?'power':R.shuffle(['power','rapid'],random)[0],R.shuffle(pool.filter(id=>['repair','shield','heart'].includes(id)),random)[0]];
    ids.push(R.shuffle(pool.filter(id=>!ids.includes(id)),random)[0]);
    return R.shuffle(ids,random);
  }
  function shop(kind,seed,weapon){
    const random=R.create(R.hash(seed,'shop',kind)),all=catalogs[kind];let ids;
    if(kind==='early'){
      const guns=all.filter(x=>x.weaponId&&x.weaponId!==weapon).map(x=>x.id);
      ids=['repair','power',R.shuffle(guns,random)[0]];
      const rest=R.shuffle(all.map(x=>x.id).filter(id=>!ids.includes(id)),random);ids.push(...rest.slice(0,R.int(random,1,2)));
    }else if(kind==='late')ids=['late-repair','late-shield',R.shuffle(['late-power','late-rapid'],random)[0]];
    else ids=['workshop-power','workshop-repair',R.shuffle(['workshop-rapid','workshop-shield'],random)[0]];
    return R.shuffle(ids,random);
  }
  const api={catalogs,rewardPool,rewards,shop};root.DungeonLoot=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
