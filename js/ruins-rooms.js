(function(root){
  'use strict';
  const {Geometry,distance}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const size=80,cols=15,rows=13;
  const grid=test=>Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>Number(x>0&&x<cols-1&&y>0&&y<rows-1&&test(x,y))));
  const open=()=>grid(()=>true);
  function room(id,name,walk,solids=[],type='combat'){
    const start={x:200,y:520},portal={x:1000,y:520};
    const data={id,name,chapter:1,type,cols,rows,tileSize:size,walk,solids,start,portal,
      exits:[{x:1000,y:200,to:null,label:'上路'},{x:1000,y:840,to:null,label:'下路'}],
      batches:type==='rest'?[]:[{at:1,kinds:type==='elite'?['melee','elite']:['melee','melee','ranged']},{at:0,kinds:['melee','melee']}],
      enemyLimit:4,waveMode:type==='rest'?null:'clear',waveBreak:2,reward:type!=='rest',mechanisms:[],hazards:[]};
    const geometry=new Geometry(data);
    const candidates=[{x:120,y:200},{x:120,y:840},{x:600,y:200},{x:600,y:840},{x:1000,y:200},{x:1000,y:840},{x:1000,y:520},{x:840,y:520},{x:600,y:520},{x:840,y:360},{x:840,y:680},{x:1000,y:360},{x:1000,y:680}];
    const points=candidates.filter(p=>geometry.canStand(p.x,p.y,28)&&distance(p,start)>=320);
    data.spawnPoints={melee:points.map(p=>({...p})),ranged:points.map(p=>({...p})),elite:points.map(p=>({...p}))};
    return data;
  }
  const rooms=[
    room(0,'开阔广场',open()),
    room(1,'掩体迷宫',open(),[3,8].flatMap(y=>[5,8,11].map(x=>({x:x*size,y:y*size,w:size,h:size})))),
    room(2,'走廊通道',grid((x,y)=>y>=5&&y<=7||((x<=4||x>=10)&&y>=3&&y<=9))),
    room(3,'环形竞技场',open(),[3,9].flatMap(y=>[4,10].map(x=>({x:x*size,y:y*size,w:size,h:size})))),
    room(4,'纵横十字',grid((x,y)=>y>=5&&y<=7||x>=6&&x<=8)),
    room(5,'精英决斗场',open(),[3,9].flatMap(y=>[3,11].map(x=>({x:x*size,y:y*size,w:size,h:size}))),'elite'),
    room(6,'补给绿洲',open(),[],'rest'),
    room(7,'岔路中转房',open(),[{x:560,y:360,w:80,h:80},{x:560,y:600,w:80,h:80}])
  ];
  // The corridor and cross use reachable existing-format portal coordinates.
  rooms[2].exits=[{x:1000,y:360,to:null,label:'上路'},{x:1000,y:680,to:null,label:'下路'}];
  rooms[4].exits=[{x:600,y:200,to:null,label:'上路'},{x:600,y:840,to:null,label:'下路'}];
  rooms[6].service={x:600,y:520};rooms[6].supply={x:800,y:520};
  rooms[7].batches=[{at:1,kinds:['melee','melee','melee']}];
  const clone=index=>JSON.parse(JSON.stringify(rooms[index]));
  const api={rooms,clone};root.DungeonRuinsRooms=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
