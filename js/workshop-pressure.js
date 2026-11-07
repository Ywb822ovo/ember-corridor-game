(function(root){
  'use strict';
  const R=typeof module!=='undefined'?require('./rng.js'):root.DungeonRng;
  const E=typeof module!=='undefined'?require('./workshop-elites.js'):root.DungeonWorkshopElites;
  const battles=Object.freeze({6:{waves:3,count:[4,5],limit:8,gold:8,parts:12},7:{waves:4,count:[5,6],limit:8,gold:8,parts:12},9:{waves:4,count:[3,5],limit:10,gold:14,parts:24},10:{waves:4,count:[5,6],limit:10,gold:12,parts:16}});
  function install(rooms,seed){
    const random=R.create(R.hash(seed,'pressure-v1'));
    const firstElite=random()<.5?'mother':'warden';
    for(const [key,p]of Object.entries(battles)){
      const m=rooms[Number(key)];m.workshopPressure=true;m.waveMode='timed';m.waveBreak=10;m.enemyLimit=p.limit;
      m.lootBudget={gold:p.gold,parts:p.parts};
      m.batches=Array.from({length:p.waves},(_,wave)=>{
        const count=R.int(random,...p.count),kinds=Array(count).fill('hound');
        if(wave>0){kinds[count-1]=random()<.5?'pulse':'bomber';if(wave===1)kinds[count-2]='repairDrone';}
        if(wave===p.waves-1&&[9,10].includes(m.id))kinds[0]=m.id===9?firstElite:firstElite==='mother'?'warden':'mother';
        return {at:1.5+wave*10,kinds:R.shuffle(kinds,random)};
      });
      for(const kind of Object.keys(E.templates))m.enemyStats[kind]=E.stats(kind,m);
    }
    const replace=(id,pads)=>{rooms[id].mechanisms=pads;};
    replace(6,[{id:'entry-belt',type:'conveyor',x:160,y:400,w:480,h:160,angle:0,speed:160},{id:'entry-plate',type:'electric',x:640,y:400,w:160,h:160,delay:3}]);
    replace(7,[{id:'cross-belt',type:'conveyor',x:160,y:400,w:480,h:160,angle:0,speed:160},{id:'assembly-pad',type:'electric',x:640,y:400,w:160,h:160,delay:3},{id:'cross-steam',type:'steam',x:720,y:240,w:80,h:160,delay:5}]);
    replace(9,[{id:'elite-belt',type:'conveyor',x:160,y:480,w:560,h:160,angle:0,speed:160},{id:'workshop-press',type:'press',x:720,y:480,w:160,h:160,delay:4},{id:'elite-saw',type:'saw',x:160,y:328,w:640,h:64,delay:2,track:{from:{x:192,y:360},to:{x:768,y:360}},speed:100,radius:22}]);
    rooms[9].console={x:280,y:720};
    replace(10,[{id:'core-belt-left',type:'conveyor',x:160,y:320,w:160,h:480,angle:-Math.PI/2,speed:160},{id:'core-left',type:'electric',x:160,y:160,w:160,h:160,delay:3},{id:'core-belt-right',type:'conveyor',x:720,y:320,w:160,h:480,angle:-Math.PI/2,speed:160},{id:'core-right',type:'electric',x:720,y:160,w:160,h:160,delay:5.5},{id:'core-steam',type:'steam',x:880,y:280,w:80,h:160,delay:4},{id:'core-saw',type:'saw',x:320,y:600,w:400,h:64,delay:3,track:{from:{x:352,y:632},to:{x:688,y:632}},speed:100,radius:22}]);
    return rooms;
  }
  function tick(w,dt){
    const batches=w.map.batches;
    while(w.waveIndex+1<batches.length&&batches[w.waveIndex+1].at<=w.roomTime+1e-7){w.waveIndex++;w.events.push({type:'wave',wave:w.waveIndex+1,total:batches.length});}
    w.roomSpawnClock=Math.max(0,(w.roomSpawnClock||0)-dt);
    if(w.roomSpawnClock>1e-7||!w.schedule.length||w.schedule[0].at>w.roomTime+1e-7)return;
    const mother=w.enemies.find(e=>e.kind==='mother'&&e.hp>0),children=mother?w.enemies.filter(e=>e.summonerId===mother.id&&e.hp>0).length:0,reserve=mother?Math.max(0,Math.min(2,4-children)):0;
    if(w.enemies.length>=w.map.enemyLimit-reserve)return;
    if(w.spawn(w.schedule[0].kind,{wave:w.schedule[0].wave})){w.schedule.shift();w.roomSpawnClock=.25;}
  }
  function status(w){const next=w.map.batches[w.waveIndex+1];return {mode:'timed',number:Math.max(0,w.waveIndex+1),total:w.map.batches.length,waiting:Boolean(next),next:next?w.waveIndex+2:null,delay:next?Math.max(0,next.at-w.roomTime):0,queued:w.schedule.filter(s=>s.at<=w.roomTime+1e-7).length};}
  const api={battles,install,tick,status};root.DungeonWorkshopPressure=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
