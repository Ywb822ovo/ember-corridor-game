(function(root){
  'use strict';
  const profiles=typeof module!=='undefined'?require('./profiles.js'):root.ActorProfiles;
  const machines=typeof module!=='undefined'?require('./machines.js'):root.DungeonMachines;
  const ACTORS=Object.freeze({hero:{sprite:98,size:56},skeleton:{size:48,rank:'normal',parts:[[5,1,7,5,'#e5d8b6'],[6,6,5,2,'#c6b99c'],[6,8,5,3,'#dfd1af'],[7,11,2,2,'#b5a68f'],[3,7,2,5,'#cabc9f'],[12,7,2,5,'#cabc9f'],[5,12,2,3,'#e5d8b6'],[10,12,2,3,'#e5d8b6']]},melee:{sprite:110,size:48},ranged:{sprite:111,size:50},elite:{sprite:122,size:66},boss:{sprite:121,size:92}});
  function appearance(body){return machines.defs[body.kind]||ACTORS[body.kind]||ACTORS.hero;}
  function center(body){const a=appearance(body);return {x:body.x,y:body.y-a.size/2+15+(body.bob||0)};}
  // The same 16px sprite silhouette, scale, flip and foot anchor used by render.js.
  // Weapon, name label and the ground marker are deliberately outside the body.
  function hitsBody(shot,body){
    const a=appearance(body),scale=a.size/16,r=shot.radius??3;
    const left=Math.round(body.x)-a.size/2,top=Math.round(body.y+(body.bob||0))-a.size+15;
    const flip=body.kind?Math.cos(body.angle||0)<0:body.facing<0;
    for(const [sx,sy,width,height]of a.parts||profiles[a.sprite]){
      const x=left+(flip?16-sx-width:sx)*scale,y=top+sy*scale;
      const nx=Math.max(x,Math.min(x+width*scale,shot.x)),ny=Math.max(y,Math.min(y+height*scale,shot.y));
      if((shot.x-nx)**2+(shot.y-ny)**2<=r*r)return true;
    }
    return false;
  }
  const api={ACTORS,appearance,center,hitsBody};root.DungeonCombat=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
