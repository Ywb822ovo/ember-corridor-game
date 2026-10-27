(function(root){
  'use strict';
  const list=Object.freeze([
    Object.freeze({id:'sidearm',name:'旅人短枪',tag:'稳定 · 中距离',damage:400,interval:.72,range:480,pellets:1,pierce:1,spread:0,speed:490,color:'#fff0c8',price:8,description:'保持中距离，稳定开火。适合第一次进入遗迹。'}),
    Object.freeze({id:'shotgun',name:'散射霰弹枪',tag:'近战爆发 · 五发散射',damage:200,interval:1.05,range:240,pellets:5,pierce:1,spread:Math.PI*2/9,speed:440,color:'#ffd18b',price:10,description:'五颗弹丸近距离全中时伤害1000。找机会靠近，打完及时撤退。'}),
    Object.freeze({id:'piercer',name:'直线穿透枪',tag:'引怪成线 · 穿透三人',damage:600,interval:1.10,range:600,pellets:1,pierce:3,spread:0,speed:600,color:'#a5eced',price:10,description:'每个目标伤害600，最多穿过三个敌人。把怪引成一条线，墙会挡弹。'})
  ]);
  const byId=Object.freeze(Object.fromEntries(list.map(item=>[item.id,item])));
  function create(id='sidearm',modifiers={damage:1,interval:1},overrides={}){
    const base=byId[id]||byId.sidearm;
    const damage=overrides.damage??base.damage,interval=overrides.shotInterval??base.interval;
    return {...base,damage:Math.round(damage*modifiers.damage*1e6)/1e6,interval:Math.max(interval*.55,interval*modifiers.interval),range:overrides.range??base.range,flash:0};
  }
  function icon(id){
    const colors=id==='shotgun'?['#a77854','#f2c489']:id==='piercer'?['#608a9a','#afe9ea']:['#767b91','#d5d8e3'];
    const barrel=id==='shotgun'?'<path d="M20 12h59v9H20zM20 23h59v9H20z"/>':id==='piercer'?'<path d="M15 16h70v12H15zM73 20h20v4H73z"/>':'<path d="M16 13h54v13H16zM65 18h14v8H65z"/>';
    return `<svg viewBox="0 0 104 52" aria-hidden="true" class="gun-art"><g fill="${colors[0]}" stroke="#282434" stroke-width="3">${barrel}<path d="M29 27h15l-8 18H23z"/></g><path fill="${colors[1]}" d="M20 16h44v4H20z"/><path fill="#bc8a59" d="M29 30h9l-5 12h-9z"/></svg>`;
  }
  const api={UNIT:200,list,byId,create,icon};root.DungeonWeapons=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
