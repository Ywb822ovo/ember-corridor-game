(function(root){
  'use strict';
  const R=typeof module!=='undefined'?require('./rng.js'):root.DungeonRng;
  const costs=Object.freeze({melee:1,ranged:1.2,elite:4,boss:35,hound:1,pulse:1.5,grenadier:1.6,warden:4,overseer:45});
  const profiles=Object.freeze({
    'ruins-entry':{count:[14,16],waves:[3,4],pool:['melee','melee','ranged'],budget:18,limit:4,delay:1},
    'ruins-hall':{count:[16,18],waves:[3,4],pool:['melee','melee','ranged'],forced:'elite',budget:24,limit:6,delay:1},
    'ruins-elite':{count:[6,8],waves:[2,3],pool:['melee','melee','ranged'],forced:'elite',budget:13,limit:4,delay:1},
    guardian:{count:[1,1],waves:[1,1],pool:['boss'],budget:35,limit:10,delay:1,boss:true},
    'workshop-entry':{count:[4,5],waves:[2,3],pool:['hound','hound','pulse'],budget:7,limit:4,delay:1.5},
    'workshop-cross':{count:[6,7],waves:[3,4],pool:['hound','pulse','grenadier'],budget:10,limit:4,delay:5.5},
    'workshop-elite':{count:[1,2],waves:[1,2],pool:['hound'],forced:'warden',budget:6,limit:4,delay:2},
    'workshop-core':{count:[8,10],waves:[3,4],pool:['hound','pulse','grenadier'],budget:14,limit:4,delay:2},
    overseer:{count:[1,1],waves:[1,1],pool:['overseer'],budget:45,limit:4,delay:2,boss:true}
  });
  const roles={0:'ruins-entry',2:'ruins-hall',3:'ruins-elite',5:'guardian',6:'workshop-entry',7:'workshop-cross',9:'workshop-elite',10:'workshop-core',11:'overseer'};
  const remote=kind=>['ranged','pulse','grenadier'].includes(kind);
  function generate(role,random){
    const p=profiles[role];if(!p)return [];
    const count=R.int(random,...p.count),waves=Math.min(count,R.int(random,...p.waves));
    const sizes=Array(waves).fill(Math.floor(count/waves));for(let i=0;i<count%waves;i++)sizes[i]++;
    const batches=R.shuffle(sizes,random).map((n,wave)=>{
      const kinds=[];let remotes=0;
      for(let i=0;i<n;i++){
        const candidates=i===0||remotes>=Math.floor(n*.4)?p.pool.filter(k=>!remote(k)):p.pool;
        const kind=candidates[R.int(random,0,candidates.length-1)];kinds.push(kind);if(remote(kind))remotes++;
      }
      return {at:wave===0?p.delay:0,kinds};
    });
    if(p.forced)batches.at(-1).kinds[batches.at(-1).kinds.length-1]=p.forced;
    if(batches.flatMap(b=>b.kinds).reduce((sum,k)=>sum+costs[k],0)>p.budget)throw new Error('Encounter exceeds configured budget: '+role);
    return batches;
  }
  function install(data){
    data.roguelike=1;
    for(const room of data.rooms){
      room.encounterRole=roles[room.id]||null;
      room.batches=generate(room.encounterRole,R.create(R.hash('preview',room.id)));
      const p=profiles[room.encounterRole];if(p){room.enemyLimit=p.limit;if(!p.boss){room.waveMode='clear';room.waveBreak=2;}}
    }
    return data;
  }
  function plan(rooms,seed){return rooms.map(room=>({...room,batches:generate(room.encounterRole,R.create(R.hash(seed,'encounters',room.id)))}));}
  const signature=room=>JSON.stringify(room.batches);
  const api={costs,profiles,roles,remote,generate,install,plan,signature};root.DungeonEncounters=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
