(function(root){
  'use strict';
  // Normalize the original native stats once. Runtime uses base * current coefficient;
  // changing a chapter coefficient must also change its native monsters.
  const templates=Object.freeze({
    melee:{hp:1000,speed:135,radius:13,at:[1,0]},ranged:{hp:800,speed:72,radius:13,projectile:195,at:[1,0]},
    elite:{hp:5600/1.4,speed:90/1.04,radius:19,at:[1,3]},boss:{hp:22000/1.4,speed:55/1.04,radius:24,projectile:175/1.04,ring:140/1.04,at:[1,5]},
    skeleton:{hp:1400/1.4,speed:140/1.04,radius:13,at:[1,5]},hound:{hp:2000/1.4,speed:155/1.08,radius:15,at:[2,0]},
    pulse:{hp:2400/1.4,speed:75/1.08,radius:14,projectile:195/1.08,at:[2,0]},grenadier:{hp:2400/1.4,speed:60/1.08,radius:15,at:[2,0]},
    warden:{hp:7200/1.4,speed:55/1.08,radius:22,at:[2,3]},overseer:{hp:36000/1.624,speed:48/1.1124,radius:28,at:[2,5]}
  });
  const chapters=Object.freeze({
    1:{hp:1,speed:1,hpStep:.2,speedStep:.02,delay:0,maxTier:2},
    2:{hp:1.4,speed:1.08,hpStep:.08,speedStep:.015,delay:3,maxTier:5},
    // Extension point only; this does not implement or unlock chapter three.
    3:{hp:1.8,speed:1.16,hpStep:.1,speedStep:.02,delay:0,maxTier:5}
  });
  function coefficients(chapter,depth,config=chapters){
    const c=config[chapter];if(!c||!Number.isInteger(depth)||depth<0)throw new Error('Invalid difficulty depth');
    const tier=Math.min(c.maxTier,Math.max(0,depth-c.delay));
    return {hp:c.hp*(1+c.hpStep*tier),speed:c.speed*(1+c.speedStep*tier),projectile:c.speed*(1+c.speedStep*tier),tier};
  }
  function stats(kind,room,config=chapters){
    const t=templates[kind];if(!t)throw new Error('Unknown monster template: '+kind);
    const current=coefficients(room.chapter||1,room.depth??0,config);
    const {hp,speed,projectile}=current;
    return {hp:Math.round(t.hp*hp),speed:Math.round(t.speed*speed*1000)/1000,radius:t.radius,
      ...(t.projectile?{projectileSpeed:t.projectile*projectile}:{}),...(t.ring?{ringSpeed:t.ring*projectile}:{}),
      depthCoefficients:{hp,speed,projectile,tier:current.tier}};
  }
  function install(data){
    for(const room of data.rooms){room.depth=data.chapters.find(c=>c.id===room.chapter).rooms.indexOf(room.id);room.enemyStats=Object.fromEntries(Object.keys(templates).map(kind=>[kind,stats(kind,room)]));}
    return data;
  }
  const api={templates,chapters,coefficients,stats,install};root.DungeonDifficulty=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
