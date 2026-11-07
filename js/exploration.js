(function(root){
  'use strict';
  const R=typeof module!=='undefined'?require('./rng.js'):root.DungeonRng;
  const E=typeof module!=='undefined'?require('./encounters.js'):root.DungeonEncounters;
  const D=typeof module!=='undefined'?require('./difficulty.js'):root.DungeonDifficulty;
  const T=typeof module!=='undefined'?require('./ruins-rooms.js'):root.DungeonRuinsRooms;
  const patterns={
    5:[[[0],[1,4],[2],[5]]],
    6:[[[0],[1,3],[2],[4],[5]],[[0],[1,4],[2],[3],[5]]],
    7:[[[0],[1,3],[2],[12],[4],[5]],[[0],[1,3],[2],[4,12],[5]]],
    8:[[[0],[1,4],[2],[3,13],[12],[5]],[[0],[2,1],[3],[4,13],[12],[5]]]
  };
  function parseSeed(text){
    if(text===undefined||text===null||String(text).trim()==='')return null;
    const value=String(text).trim();if(!/^\d{1,10}$/.test(value)||Number(value)>4294967295)throw new Error('种子请输入 0～4294967295 的整数。');
    return Number(value);
  }
  function batches(room,template,depth,random){
    if(['rest','shop'].includes(room.type))return [];
    const budget=template===7?4+depth:8+depth*2,elite=room.type==='elite';
    const count=Math.max(elite?2:3,Math.floor((budget-(elite?3:0))/1.2));
    const waves=Math.min(count,R.int(random,count<=4?1:2,count<=4?2:3)),result=[];
    for(let w=0;w<waves;w++){
      const n=Math.floor(count/waves)+(w<count%waves?1:0),kinds=[];let remote=0;
      for(let i=0;i<n;i++){
        const ranged=template!==2&&i>0&&remote<Math.floor(n*.4)&&random()<(template===1||template===3?.6:.3);
        kinds.push(ranged?'ranged':'melee');if(ranged)remote++;
      }
      result.push({at:w===0?1:0,kinds});
    }
    if(elite)result.at(-1).kinds[0]='elite';
    return result;
  }
  function generate(data,seed){
    const random=R.create(R.hash(seed,'layout-v1')),n=R.int(random,5,8);
    const layers=patterns[n][R.int(random,0,patterns[n].length-1)].map(layer=>R.shuffle(layer,random));
    const ids=layers.flat(),positions={},depths={},templates={},rooms=E.plan(data.rooms,seed),available=R.shuffle([0,1,2,3,4],random);
    for(let depth=0;depth<layers.length;depth++)for(let row=0;row<layers[depth].length;row++){
      const id=layers[depth][row];depths[id]=depth;positions[id]=[8+depth/(layers.length-1)*84,layers[depth].length===1?50:row===0?22:78];
      if(id===5){templates[id]=-1;rooms[id]=JSON.parse(JSON.stringify(rooms[id]));continue;}
      const safe=[1,4,13].includes(id),template=safe?6:id===3?5:layers[depth+1]?.length===2?7:available.shift()??0;
      templates[id]=template;const room=T.clone(template);room.id=id;
      if(id===0)room.name='守卫前厅 · '+room.name;
      if(id===1){room.name='旅人补给铺';room.type='shop';delete room.supply;}
      if(id===4)room.name='篝火休息站';
      room.depth=depth;room.reward=!safe;room.batches=batches(room,template,depth,R.create(R.hash(seed,'room-encounter',id)));
      room.enemyLimit=Math.min(6,3+Math.floor(depth/2));
      const scaledDepth=Math.round(depth/Math.max(1,layers.length-2)*2);
      room.enemyStats=Object.fromEntries(Object.keys(D.templates).map(kind=>[kind,D.stats(kind,{chapter:1,depth:Math.min(2,scaledDepth)})]));
      rooms[id]=room;
    }
    const short=id=>rooms[id].name.split(' · ').at(-1);
    for(let depth=0;depth<layers.length;depth++)for(const id of layers[depth]){
      const room=rooms[id];room.depth=depth;
      if(id===5){room.exits=[{...room.portal,to:6,label:'第二章 · 失落工坊'}];continue;}
      const next=layers[depth+1],previous=layers[depth-1]||[],anchors=room.exits.map(p=>({...p}));
      room.exits=next.map((to,index)=>({...next.length===1?room.portal:anchors[index],to,label:(next.length===2?(index===0?'上路 · ':'下路 · '):'前进 · ')+short(to)}));
      room.portal={...room.exits[0]};
      room.exits.push(...previous.map((to,index)=>({x:room.start.x,y:room.start.y+(previous.length===2?(index===0?-80:80):0),to,label:'返回 · '+short(to)})));
    }
    return {version:1,seed,ids,layers,positions,depths,templates,rooms};
  }
  const signature=layout=>JSON.stringify({layers:layout.layers,templates:layout.templates});
  const api={generate,parseSeed,signature};root.DungeonExploration=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
