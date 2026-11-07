(function(root){
  'use strict';
  const E=typeof module!=='undefined'?require('./encounters.js'):root.DungeonEncounters;
  const D=typeof module!=='undefined'?require('./difficulty.js'):root.DungeonDifficulty;
  function build(data){
    data.campaign=true;data.guardianRevamp=true;data.chapters=[{id:1,name:'遗迹地牢',rooms:[0,1,2,3,4,5]},{id:2,name:'失落工坊',rooms:[6,7,8,9,10,11]}];
    data.rooms.forEach(r=>r.chapter=1);data.rooms[2].name='塌陷回廊';data.rooms[2].hazards=[];
    function room(id,name,cols,rows,blocks=[]){
      const walk=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>Number(x>0&&x<cols-1&&y>0&&y<rows-1)));
      for(const [x,y]of blocks)walk[y][x]=0;
      return {id,name,chapter:2,type:'combat',cols,rows,tileSize:80,walk,solids:[],start:{x:cols*40,y:(rows-1.5)*80},portal:{x:cols*40,y:120},batches:[],enemyLimit:4,waveMode:'clear',waveBreak:2,exits:[],mechanisms:[]};
    }
    const a=room(6,'工坊入口',13,11,[[3,4],[9,4]]);
    a.reward=true;
    a.exits=[{to:7,x:520,y:120,label:'交叉装配厅'}];
    const b=room(7,'交叉装配厅',13,12,[[4,4],[8,4],[4,8],[8,8]]);

    b.exits=[{to:8,x:120,y:480,label:'补给室 · 稳妥路线'},{to:9,x:920,y:480,label:'精英车间 · 强化路线'},{to:6,x:520,y:840,label:'返回工坊入口'}];b.portal=b.exits[0];
    b.console={x:520,y:680};b.mechanisms=[{id:'assembly-pad',type:'electric',x:440,y:400,w:160,h:80,delay:3}];
    const c=room(8,'工坊补给室',11,10,[[2,2],[8,2]]);c.type='rest';c.waveMode=null;c.service={x:280,y:440};c.supply={x:600,y:440};
    c.exits=[{to:10,x:440,y:120,label:'核心前厅'},{to:7,x:440,y:680,label:'返回装配厅'}];
    const d=room(9,'精英车间',13,11,[[3,3],[9,3]]);d.type='elite';d.reward=true;
    d.console={x:280,y:600};d.mechanisms=[{id:'workshop-press',type:'press',x:720,y:480,w:100,h:100,delay:4}];
    d.exits=[{to:10,x:520,y:120,label:'核心前厅'},{to:7,x:520,y:760,label:'返回装配厅'}];
    const e=room(10,'核心前厅',13,12,[[5,5],[6,5],[5,6],[6,6]]);e.reward=true;

    e.console={x:520,y:720};e.mechanisms=[{id:'core-left',type:'electric',x:240,y:400,w:80,h:120,delay:3},{id:'core-right',type:'electric',x:760,y:400,w:80,h:120,delay:5.5}];
    e.exits=[{to:11,x:520,y:120,label:'中央总装室 · Boss'},{to:8,x:120,y:560,label:'返回补给室'},{to:9,x:920,y:560,label:'返回精英车间'}];
    const f=room(11,'中央总装室',15,11);f.type='boss';f.waveMode=null;
    f.exits=[{to:null,x:600,y:120,label:'升降梯控制台'}];
    f.workshopV2=true;
    f.bossRules={columns:8,anchor:{x:f.cols*f.tileSize/2,y:4.5*f.tileSize},closedMultiplier:.5,coreMultiplier:1.5,threshold:.33,
      laser:{warning:1.2,active:.6,gap:.8,pairs:2},edge:{warning:.9,count:5,speed:195},hammer:{warning:1.2,spacing:.55,radius:75,active:.2},beam:{warning:1.3,active:.6,width:64},rest:2.5,exposure:1.5,
      overload:{blackout:1.5,laser:{warning:1,active:.5,gap:.35,pulses:4},edgeCount:8,rest:2,exposure:2,beltSpeed:180,electric:{warning:.8,active:.5,period:3},steam:{warning:1,active:.8,period:4.8}}};
    f.spawnPoints={overseer:[f.bossRules.anchor]};
    // The north-facing emitters are occluded by these existing walk-grid pillars.
    for(const [x,y]of [[3,3],[11,3],[3,7],[11,7]])f.walk[y][x]=0;
    const s=f.tileSize;
    f.mechanisms=[
      {id:'assembly-electric-left',type:'electric',x:2*s,y:5.5*s,w:s,h:s,delay:.2},
      {id:'assembly-electric-right',type:'electric',x:12*s,y:5.5*s,w:s,h:s,delay:1.7},
      {id:'assembly-steam-left',type:'steam',x:1.25*s,y:3.5*s,w:.75*s,h:1.5*s,delay:.9},
      {id:'assembly-steam-right',type:'steam',x:13*s,y:3.5*s,w:.75*s,h:1.5*s,delay:3.3},
      {id:'assembly-belt-left',type:'conveyor',x:4*s,y:5*s,w:s,h:3*s,angle:-Math.PI/2,speed:160},
      {id:'assembly-belt-right',type:'conveyor',x:10*s,y:5*s,w:s,h:3*s,angle:-Math.PI/2,speed:160}];
    data.rooms.push(a,b,c,d,e,f);return D.install(E.install(data));
  }
  const api={build};root.DungeonCampaign=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
