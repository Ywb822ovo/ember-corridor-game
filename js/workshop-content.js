(function(root){
  'use strict';
  const copy=x=>JSON.parse(JSON.stringify(x));
  const N=typeof module!=='undefined'?require('./workshop-enemies.js'):root.DungeonWorkshopEnemies;
  const R=typeof module!=='undefined'?require('./rng.js'):root.DungeonRng;
  // Additive 1.0 content. The original twelve-room campaign remains a compatibility fixture.
  const Pressure=typeof module!=='undefined'?require('./workshop-pressure.js'):root.DungeonWorkshopPressure;
  function plan(source,seed=0,options={}){
    const rooms=copy(source);
    const add=(id,...pads)=>rooms[id].mechanisms.push(...pads);
    add(6,{id:'entry-belt',type:'conveyor',x:320,y:400,w:320,h:80,angle:0,speed:80},
      {id:'entry-plate',type:'electric',x:640,y:400,w:80,h:80,delay:3});
    rooms[6].console={x:760,y:680};
    add(7,{id:'cross-belt',type:'conveyor',x:240,y:400,w:160,h:80,angle:0,speed:80},
      {id:'cross-steam',type:'steam',x:720,y:240,w:80,h:160,delay:5});
    add(9,{id:'elite-belt',type:'conveyor',x:480,y:480,w:240,h:80,angle:0,speed:80},
      {id:'elite-saw',type:'saw',x:160,y:328,w:640,h:64,delay:2,
        track:{from:{x:192,y:360},to:{x:768,y:360}},speed:100,radius:22});
    add(10,{id:'core-belt-left',type:'conveyor',x:240,y:520,w:80,h:160,angle:-Math.PI/2,speed:80},
      {id:'core-belt-right',type:'conveyor',x:760,y:520,w:80,h:160,angle:-Math.PI/2,speed:80},
      {id:'core-steam',type:'steam',x:880,y:280,w:80,h:160,delay:4},
      {id:'core-saw',type:'saw',x:320,y:200,w:400,h:64,delay:3,
        track:{from:{x:352,y:232},to:{x:688,y:232}},speed:100,radius:22});
    // One support unit together with a fighter; never a support-only wave.
    rooms[7].batches=[{at:5.5,kinds:['hound','bomber']},{at:0,kinds:['hound','repairDrone']},{at:0,kinds:['hound','pulse']}];
    rooms[9].batches=[{at:2,kinds:['warden','bomber','repairDrone']}];
    rooms[10].batches=[{at:2,kinds:['hound','bomber']},{at:0,kinds:['hound','pulse','repairDrone']},{at:0,kinds:['hound','pulse','grenadier']}];
    for(const id of [6,7,8,9,10])for(const kind of Object.keys(N.templates))rooms[id].enemyStats[kind]=N.stats(kind,rooms[id]);
    const random=R.create(R.hash(seed,'workshop-tools-v1'));
    for(const id of [7,10]){
      for(const b of rooms[id].batches)b.kinds=R.shuffle(b.kinds,random);
      rooms[id].batches.at(-1).kinds[0]=random()<.5?'hound':'bomber';
      if(random()<.5)rooms[id].batches.at(-1).kinds.push('hound');
    }
    rooms[7].exits.push({to:14,x:520,y:120,label:'工牌门 · 隐藏检修间',requiresBadge:true});
    rooms[9].exits.push({to:14,x:920,y:600,label:'工牌门 · 隐藏检修间',requiresBadge:true});
    rooms[10].exits.push({to:14,x:920,y:760,label:'工牌门 · 返回检修间',requiresBadge:true});
    const hidden=copy(rooms[8]);hidden.id=14;hidden.name='隐藏检修间';hidden.depth=3;delete hidden.service;
    hidden.exits=[{to:10,x:440,y:120,label:'检修通道 · 核心前厅'},{to:7,x:120,y:440,label:'返回装配厅'},{to:9,x:760,y:440,label:'返回精英车间'}];hidden.portal={...hidden.exits[0]};hidden.mechanisms=[];rooms[14]=hidden;
    for(const id of [6,7,8,9,10,14])rooms[id].workshopV2=true;
    return options.pressure?Pressure.install(rooms,seed):rooms;
  }
  const api={plan};root.DungeonWorkshopContent=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
