(function(root){
  'use strict';
  // Each opaque rectangle is used by both drawing and projectile collision.
  const defs={
    hound:{size:52,rank:'normal',name:'齿轮猎犬',parts:[[2,7,11,5,'#6b9da4'],[10,5,5,5,'#a0d9d5'],[3,12,3,3,'#375967'],[10,12,3,3,'#375967'],[12,6,2,2,'#fff0a3'],[0,6,3,3,'#cc925b']]},
    pulse:{size:58,rank:'normal',name:'脉冲射手',parts:[[5,2,6,4,'#91c5d6'],[4,6,8,6,'#4f7b9e'],[5,12,2,3,'#314b69'],[9,12,2,3,'#314b69'],[9,7,6,2,'#b6ecf1'],[6,3,4,2,'#ffe1a0']]},
    grenadier:{size:58,rank:'normal',name:'投雷工匠',parts:[[2,5,5,8,'#b78a63'],[6,4,6,4,'#9cb5ba'],[6,8,7,5,'#667c89'],[6,13,3,2,'#3f4e62'],[11,13,3,2,'#3f4e62'],[8,5,3,1,'#ffcf83'],[1,6,3,4,'#e0b47b']]},
    warden:{size:80,rank:'elite',name:'重装执卫',parts:[[5,1,6,4,'#b9b6a2'],[1,5,14,6,'#586e83'],[4,7,8,6,'#9d8c6e'],[4,13,3,2,'#3b4b62'],[10,13,3,2,'#3b4b62'],[0,8,3,5,'#b49163'],[13,8,3,5,'#b49163'],[6,8,4,3,'#b7f7e1']]},
    overseer:{size:104,rank:'boss',name:'总装监工',parts:[[5,1,6,4,'#a6bec0'],[1,5,14,6,'#54778a'],[4,7,8,6,'#ac8a60'],[2,12,4,3,'#344c65'],[10,12,4,3,'#344c65'],[0,6,3,7,'#a2b0aa'],[13,6,3,7,'#a2b0aa'],[6,8,4,4,'#b0f2e8'],[6,2,4,1,'#ffe9a0']]}
  };
  const api={defs,is:body=>Boolean(defs[body.kind]),rank:body=>defs[body.kind]?.rank||body.kind};root.DungeonMachines=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
