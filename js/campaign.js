(function(root){
  'use strict';
  function build(data){
    data.campaign=true;data.guardianRevamp=true;data.chapters=[{id:1,name:'遗迹地牢',rooms:[0,1,2,3,4,5]},{id:2,name:'失落工坊',rooms:[6,7,8,9,10,11]}];
    data.rooms.forEach(r=>r.chapter=1);data.rooms[2].name='塌陷回廊';data.rooms[2].hazards=[];
    const stats={hound:{hp:2000,speed:155,radius:15},pulse:{hp:2400,speed:75,radius:14},grenadier:{hp:2400,speed:60,radius:15},warden:{hp:7200,speed:55,radius:22,rank:'elite'},overseer:{hp:36000,speed:48,radius:28,rank:'boss'}};
    function room(id,name,cols,rows,blocks=[]){
      const walk=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>Number(x>0&&x<cols-1&&y>0&&y<rows-1)));
      for(const [x,y]of blocks)walk[y][x]=0;
      return {id,name,chapter:2,type:'combat',cols,rows,tileSize:80,walk,solids:[],start:{x:cols*40,y:(rows-1.5)*80},portal:{x:cols*40,y:120},batches:[],enemyStats:JSON.parse(JSON.stringify(stats)),enemyLimit:4,waveMode:'clear',waveBreak:2,exits:[],mechanisms:[]};
    }
    const a=room(6,'工坊入口',13,11,[[3,4],[9,4]]);
    a.batches=[{at:1.5,kinds:['hound']},{at:0,kinds:['hound','hound','pulse']}];a.reward=true;
    a.exits=[{to:7,x:520,y:120,label:'交叉装配厅'}];
    const b=room(7,'交叉装配厅',13,12,[[4,4],[8,4],[4,8],[8,8]]);
    b.batches=[{at:5.5,kinds:['hound','pulse']},{at:0,kinds:['hound','grenadier']},{at:0,kinds:['hound','pulse']}];
    b.exits=[{to:8,x:120,y:480,label:'补给室 · 稳妥路线'},{to:9,x:920,y:480,label:'精英车间 · 强化路线'},{to:6,x:520,y:840,label:'返回工坊入口'}];b.portal=b.exits[0];
    b.console={x:520,y:680};b.mechanisms=[{id:'assembly-pad',type:'electric',x:440,y:400,w:160,h:80,delay:3}];
    const c=room(8,'工坊补给室',11,10,[[2,2],[8,2]]);c.type='rest';c.waveMode=null;c.service={x:280,y:440};c.supply={x:600,y:440};
    c.exits=[{to:10,x:440,y:120,label:'核心前厅'},{to:7,x:440,y:680,label:'返回装配厅'}];
    const d=room(9,'精英车间',13,11,[[3,3],[9,3]]);d.type='elite';d.batches=[{at:2,kinds:['warden']}];d.reward=true;
    d.console={x:280,y:600};d.mechanisms=[{id:'workshop-press',type:'press',x:720,y:480,w:100,h:100,delay:4}];
    d.exits=[{to:10,x:520,y:120,label:'核心前厅'},{to:7,x:520,y:760,label:'返回装配厅'}];
    const e=room(10,'核心前厅',13,12,[[5,5],[6,5],[5,6],[6,6]]);e.reward=true;
    e.batches=[{at:2,kinds:['hound','hound','pulse']},{at:0,kinds:['hound','pulse','grenadier']},{at:0,kinds:['hound','pulse','pulse']}];
    e.console={x:520,y:720};e.mechanisms=[{id:'core-left',type:'electric',x:240,y:400,w:80,h:120,delay:3},{id:'core-right',type:'electric',x:760,y:400,w:80,h:120,delay:5.5}];
    e.exits=[{to:11,x:520,y:120,label:'中央总装室 · Boss'},{to:8,x:120,y:560,label:'返回补给室'},{to:9,x:920,y:560,label:'返回精英车间'}];
    const f=room(11,'中央总装室',15,11);f.type='boss';f.batches=[{at:2,kinds:['overseer']}];f.waveMode=null;
    f.exits=[{to:null,x:600,y:120,label:'升降梯控制台'}];
    data.rooms.push(a,b,c,d,e,f);return data;
  }
  const api={build};root.DungeonCampaign=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
