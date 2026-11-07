(function(root){
  'use strict';
  function hash(...parts){let h=2166136261;for(const ch of parts.join('|')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function create(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
  const int=(random,min,max)=>min+Math.floor(Math.min(.999999999,Math.max(0,Number(random())||0))*(max-min+1));
  function shuffle(items,random){const result=[...items];for(let i=result.length-1;i>0;i--){const j=int(random,0,i);[result[i],result[j]]=[result[j],result[i]];}return result;}
  const api={hash,create,int,shuffle};root.DungeonRng=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
