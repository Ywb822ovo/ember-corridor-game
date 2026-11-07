(function(root){
  'use strict';
  function residents(w){
    const a=[],map=w.map,metal=map.chapter===2;
    function add(point,slot,trader){
      if(!point)return;const used=Boolean(w.restUsed),full=w.player.hp>=w.player.maxHp;
      a.push({...point,id:w.roomIndex+':'+slot,slot,trader,metal,style:trader?'merchant':metal?'mechanic':'camp',
        speaker:trader?(metal?'留守货商':'行囊商人'):metal?'留灯的维修员':'温暖的篝火',
        greeting:trader?(metal?'还在赶路？我这里有些能用的东西。':'旅人，要补充点物资吗？'):used?(metal?'修整完毕，愿你一路顺利。':'火光安静地陪着你。'):full?(metal?'你状态很好，继续前进吧。':'火苗轻轻跳动，身上的疲惫渐渐散去。'):metal?'先歇一会儿，我来帮你修整。':'火还暖着，坐下来歇歇吧。',
        action:trader?'看看货物':metal?'请帮我修整':'坐下休息',available:trader||!used&&!full,
        detail:trader?(metal?'金币可换物资，零件可换本章的武器改造。':'挑选需要的物资，价格在货物清单中。'):used?'这里的恢复机会已经用过了。':full?'生命已满，不需要消耗本房间的恢复机会。':'免费恢复3点生命，每个房间可使用一次。'});
    }
    add(map.service,'service',map.type==='shop');add(map.supply,'supply',true);return a;
  }
  function near(w){
    if(w.state!=='safe'||w.nearConsole)return null;
    const a=residents(w);return a.find(n=>n.slot==='supply'&&Math.hypot(w.player.x-n.x,w.player.y-n.y)<=74)||a.find(n=>Math.hypot(w.player.x-n.x,w.player.y-n.y)<=74)||null;
  }
  function portrait(c,n){
    c.save();c.translate(48,72);actor(c,{...n,x:0,y:0},false);c.restore();
  }
  function actor(c,n,flip){
    c.save();c.translate(Math.round(n.x),Math.round(n.y));if(flip)c.scale(-1,1);
    c.fillStyle='#0d182b66';c.beginPath();c.ellipse(0,10,27,8,0,0,Math.PI*2);c.fill();
    if(n.style==='camp'){
      c.fillStyle='#684634';c.fillRect(-23,4,46,8);c.fillStyle='#d66d42';c.beginPath();c.moveTo(-19,5);c.lineTo(-12,-19);c.lineTo(-3,-10);c.lineTo(3,-36);c.lineTo(13,-15);c.lineTo(19,5);c.closePath();c.fill();c.fillStyle='#ffcf7e';c.beginPath();c.moveTo(-10,5);c.lineTo(2,-20);c.lineTo(11,5);c.closePath();c.fill();
    }else{
      c.fillStyle=n.metal?'#36596c':'#715849';c.fillRect(-20,-18,40,23);c.fillStyle=n.metal?'#7dabb5':'#ab845e';c.fillRect(-16,-24,32,21);
      c.fillStyle=n.metal?'#304a5c':'#4d4b58';c.fillRect(-15,-49,30,27);c.fillRect(-20,-42,40,15);
      c.fillStyle=n.metal?'#aacfd0':'#e2bd92';c.fillRect(-10,-42,21,17);c.fillStyle='#29313b';c.fillRect(-5,-37,3,4);c.fillRect(5,-37,3,4);
      c.fillStyle='#db9a5a';c.fillRect(-15,-25,32,6);c.fillRect(9,-20,6,11);
      c.fillStyle='#253745';c.fillRect(-15,2,11,9);c.fillRect(5,2,11,9);
      if(n.style==='mechanic'){c.strokeStyle='#c6dbe1';c.lineWidth=4;c.beginPath();c.moveTo(25,1);c.lineTo(25,-22);c.moveTo(25,-22);c.lineTo(19,-29);c.moveTo(25,-22);c.lineTo(31,-29);c.stroke();}
      else{c.fillStyle=n.metal?'#4b7084':'#947047';c.fillRect(-31,-10,63,15);c.fillStyle='#d3b580';c.fillRect(-33,-14,67,5);c.fillStyle='#7eaba7';c.fillRect(-21,-22,11,8);c.fillStyle='#d1bd91';c.fillRect(6,-24,13,10);}
    }
    c.restore();
  }
  function draw(c,w){
    const people=residents(w);for(const n of people)actor(c,n,w.player.x<n.x);
    const distance=n=>Math.hypot(w.player.x-n.x,w.player.y-n.y),speaker=near(w)||people.reduce((a,b)=>!a||distance(b)<distance(a)?b:a,null);
    for(const n of people){
      if(w.state!=='safe'||n.id!==speaker?.id||distance(n)>132)continue;
      const text=n.greeting,lines=text.length>16?[text.slice(0,16),text.slice(16)]:[text],width=Math.max(...lines.map(t=>t.length))*12+24,y=n.y-81-(lines.length-1)*16;
      c.save();c.fillStyle='#18232ef2';c.strokeStyle=n.metal?'#87bec9':'#cba873';c.lineWidth=2;c.fillRect(n.x-width/2,y-17,width,lines.length*17+18);c.strokeRect(n.x-width/2,y-17,width,lines.length*17+18);c.font='12px Microsoft YaHei';c.textAlign='center';c.fillStyle='#f3dfbf';lines.forEach((t,i)=>c.fillText(t,n.x,y+i*17));
      if(Math.hypot(w.player.x-n.x,w.player.y-n.y)<=74){c.fillStyle=n.metal?'#bceaf0':'#ffe0a2';c.font='bold 12px Microsoft YaHei';c.fillText('⋯',n.x,n.y+29);}c.restore();
    }
  }
  const api={residents,near,actor,portrait,draw};root.DungeonWayfarers=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
