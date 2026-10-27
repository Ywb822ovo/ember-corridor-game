(function(root){
  'use strict';
  const round=value=>Math.round(value*1e6)/1e6;
  const format=value=>Number(Math.max(0,Number.isFinite(value)?value:0).toFixed(2)).toString();
  function bar(enemy,size){
    const kind=enemy.rank||enemy.kind,width=kind==='boss'?104:kind==='elite'?76:52,height=kind==='boss'?12:kind==='elite'?10:6;
    const hp=Math.max(0,enemy.hp),maxHp=Math.max(0,enemy.maxHp);
    return {x:enemy.x-width/2,y:enemy.y-size-15,width,height,ratio:maxHp?Math.min(1,hp/maxHp):0,text:`${format(hp)} / ${format(maxHp)}`,color:kind==='boss'?'#d39de4':kind==='elite'?'#f1c16e':'#e88588'};
  }
  function record(list,enemy,amount,hpLost,source={}){
    const volley=source.volley,weaponId=source.weaponId||'sidearm';
    let popup=volley===undefined?null:list.find(p=>p.enemyId===enemy.id&&p.volley===volley&&p.weaponId===weaponId&&p.life>0);
    if(popup){popup.amount=round(popup.amount+amount);popup.hpLost=round(popup.hpLost+hpLost);popup.hits++;popup.life=popup.maxLife;}
    else{
      const size=enemy.visualSize??(enemy.kind==='boss'?92:enemy.kind==='elite'?66:enemy.kind==='ranged'?50:48);
      const lane=list.filter(p=>p.enemyId===enemy.id&&p.life>0).length%3;
      const offsetX=(lane-1)*13,offsetY=-size-36-lane*11;
      popup={enemyId:enemy.id,volley,weaponId,amount:round(amount),hpLost:round(hpLost),hits:1,offsetX,offsetY,x:enemy.x+offsetX,y:enemy.y+offsetY,life:.9,maxLife:.9};
      list.push(popup);if(list.length>64)list.splice(0,list.length-64);
    }
    return popup;
  }
  const api={round,format,bar,record};root.DungeonFeedback=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
