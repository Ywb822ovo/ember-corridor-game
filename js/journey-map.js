(function(root){
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const paths={flame:'M12 2C14 7 19 8 19 14A7 7 0 0 1 5 14C5 11 7 8 9 6C8 10 11 11 11 8Z',demon:'M5 9L2 2L10 6H14L22 2L19 9V16L15 21H9L5 16ZM8 12L10 13M16 12L14 13M10 17H14'};
  function symbol(type){return type==='boss'?'demon':['shop','rest'].includes(type)?'flame':null;}
  function model(w){
    const ids=w.chapterRoomIds,rooms=w.runPlans||w.data.rooms;
    const positions=w.chapter===1&&w.layout?w.layout.positions:w.chapter===2?{6:[50,89],7:[50,70],8:[18,49],9:[82,49],10:[50,28],11:[50,9],14:[82,28]}:Object.fromEntries(ids.map((id,i)=>[id,[8+84*i/Math.max(1,ids.length-1),50]]));
    const unique=new Map();
    for(const id of ids)for(const exit of rooms[id].exits||[]){if(!ids.includes(exit.to)||exit.to===id)continue;const [a,b]=[id,exit.to].sort((a,b)=>a-b);unique.set(a+':'+b,{a,b,complete:Boolean(w.completed[a]&&w.completed[b])});}
    // Legacy chapter one has implicit sequential exits.
    if(!w.layout&&w.chapter===1&&!unique.size)for(let i=1;i<ids.length;i++)unique.set(i,{a:ids[i-1],b:ids[i],complete:Boolean(w.completed[ids[i-1]]&&w.completed[ids[i]])});
    return {chapter:w.chapter,seed:w.runSeed,nodes:ids.map(id=>({id,position:positions[id],name:rooms[id].name,icon:symbol(rooms[id].type),current:id===w.roomIndex,complete:Boolean(w.completed[id]),visited:Boolean(w.visited[id]),hidden:id===14&&!w.visited[id]&&!w.workshopRun?.badge})),edges:[...unique.values()]};
  }
  function icon(name){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.classList.add('map-symbol','map-symbol-'+name);svg.setAttribute('aria-hidden','true');const p=document.createElementNS(ns,'path');p.setAttribute('d',paths[name]);svg.append(p);return svg;}
  class View{
    constructor(element){this.element=element;this.key='';this.nodes=new Map();this.lines=[];}
    update(w){
      const m=model(w),key=JSON.stringify([m.chapter,m.seed,m.nodes.map(n=>[n.id,n.position,n.icon]),m.edges.map(e=>[e.a,e.b])]);
      if(key!==this.key){
        this.key=key;this.element.replaceChildren();this.element.className='map-nodes branch-map journey-map'+(m.chapter===1?' exploration-map':'');this.nodes.clear();this.lines=[];
        const svg=document.createElementNS(ns,'svg');svg.classList.add('journey-lines');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
        for(const edge of m.edges){const line=document.createElementNS(ns,'line'),a=m.nodes.find(n=>n.id===edge.a).position,b=m.nodes.find(n=>n.id===edge.b).position;for(const [k,v]of Object.entries({x1:a[0],y1:a[1],x2:b[0],y2:b[1]}))line.setAttribute(k,v);line.dataset.from=edge.a;line.dataset.to=edge.b;svg.append(line);this.lines.push(line);}this.element.append(svg);
        for(const n of m.nodes){const el=document.createElement('span');el.id='map-room-'+n.id;el.dataset.room=n.id;el.style.left=n.position[0]+'%';el.style.top=n.position[1]+'%';el.setAttribute('role','img');if(n.icon)el.append(icon(n.icon));const avatar=document.createElement('span');avatar.className='map-avatar';avatar.setAttribute('aria-hidden','true');el.append(avatar);this.element.append(el);this.nodes.set(n.id,el);}
      }
      for(const n of m.nodes){const el=this.nodes.get(n.id);el.className='map-node'+(n.current?' current':'')+(n.complete?' cleared':'')+(!n.visited?' unknown':'')+(n.icon?' special':'')+(n.hidden?' concealed':'');el.querySelector('.map-avatar').hidden=!n.current;el.setAttribute('aria-label',(n.current?'当前位置，':'')+(n.hidden?'未探索房间':n.name)+(n.complete?'，已完成':''));if(n.current)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');}
      this.lines.forEach((line,i)=>line.classList.toggle('complete',m.edges[i].complete));this.element.setAttribute('aria-label','本章路线，主角头像表示当前位置，亮线连接已完成的相邻房间');
      return m;
    }
  }
  const api={symbol,model,icon,View};root.DungeonJourneyMap=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
