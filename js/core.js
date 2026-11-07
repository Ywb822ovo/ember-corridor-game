(function(root){
  'use strict';
  const {Geometry,clamp,distance}=typeof module!=='undefined'?require('./geometry.js'):root.DungeonGeometry;
  const {center,hitsBody}=typeof module!=='undefined'?require('./combat.js'):root.DungeonCombat;
  const tactics=typeof module!=='undefined'?require('./tactics.js'):root.DungeonTactics;
  const weapons=typeof module!=='undefined'?require('./weapons.js'):root.DungeonWeapons;
  const growth=typeof module!=='undefined'?require('./growth.js'):root.DungeonGrowth;
  const feedback=typeof module!=='undefined'?require('./feedback.js'):root.DungeonFeedback;
  const machines=typeof module!=='undefined'?require('./machines.js'):root.DungeonMachines;
  const workshop=typeof module!=='undefined'?require('./workshop.js'):root.DungeonWorkshop;
  const progression=typeof module!=='undefined'?require('./progression.js'):root.DungeonProgression;
  const guardian=typeof module!=='undefined'?require('./guardian.js'):root.DungeonGuardian;
  const rng=typeof module!=='undefined'?require('./rng.js'):root.DungeonRng;
  const encounters=typeof module!=='undefined'?require('./encounters.js'):root.DungeonEncounters;
  const loot=typeof module!=='undefined'?require('./loot.js'):root.DungeonLoot;
  const exploration=typeof module!=='undefined'?require('./exploration.js'):root.DungeonExploration;
  const workshopContent=typeof module!=='undefined'?require('./workshop-content.js'):root.DungeonWorkshopContent;
  const workshopRun=typeof module!=='undefined'?require('./workshop-run.js'):root.DungeonWorkshopRun;
  const workshopMods=typeof module!=='undefined'?require('./workshop-mods.js'):root.DungeonWorkshopMods;
  const pressure=typeof module!=='undefined'?require('./workshop-pressure.js'):root.DungeonWorkshopPressure;
  const elites=typeof module!=='undefined'?require('./workshop-elites.js'):root.DungeonWorkshopElites;
  const PRODUCTS=loot.catalogs.early,LATE_PRODUCTS=loot.catalogs.late.filter(x=>x.id!=='late-rapid');
  const DEFAULTS=Object.freeze({speed:205,health:8,shotInterval:.72,damage:400,range:480,
    bulletSpeed:490,enemyBulletSpeed:175,enemyLimit:10,spawnDistance:245,spawnDelay:.9});
  class World{
    constructor(data,options={}){this.data=data;this.combatScale=data.combatScale??weapons.UNIT;this.cfg={...DEFAULTS,...(data.difficulty==='normal'?{enemyBulletSpeed:195}:{}),...options};this.random=options.random||Math.random;this.overrides=Object.fromEntries(['damage','shotInterval','range'].filter(k=>options[k]!==undefined).map(k=>[k,options[k]]));this.reset();}
    reset(weaponId='sidearm'){
      this.pendingBurst=null;this.workshopRun=workshopRun.create();
      this.runSeed=null;this.runPlans=null;this.layout=null;this.requestedSeed=null;this.rewardDrafts={};this.shopDrafts={};
      this.state='title';this.resumeState='combat';this.elapsed=0;this.coins=0;this.kills=0;this.upgrade=null;this.difficulty='normal';this.startingDifficulty='normal';this.startChapter=1;
      this.roomIndex=0;this.completed=this.data.rooms.map(()=>false);this.nextId=1;
      this.purchased=[];this.restUsed=false;this.restUsedRooms=[];this.visited=this.data.rooms.map(()=>false);this.feedback='';this.activeShop='early';this.rewardedRooms=[];this.perks={sidearm:0,shotgun:0,piercer:0};this.nextVolley=1;this.chapterCheckpoint=null;
      this.player={...this.data.rooms[0].start,hp:this.cfg.health,maxHp:this.cfg.health,radius:13,angle:0,facing:1,moving:false,invulnerable:0,burn:0,onLava:false,hazardClock:0,lavaContact:0,shield:0,haste:0};
      this.modifiers={damage:1,interval:1};this.startingWeaponId=weapons.byId[weaponId]?weaponId:'sidearm';this.weapon=this.createWeapon(this.startingWeaponId);
      this.enemies=[];this.bullets=[];this.hostile=[];this.effects=[];this.events=[];this.damagePopups=[];
      this.map=this.data.rooms[0];this.geometry=new Geometry(this.map);this.schedule=[];this.roomTime=0;this.roomKills=0;this.shotClock=0;this.rewardTaken=false;
      this.workshop=workshop.create(this.map);this.threats=[];
    }
    start(weaponId='sidearm',selection){
      if(selection&&!progression.canEnter(selection.progress,selection.chapter,selection.difficulty))return false;
      const supplied=exploration.parseSeed(selection?.seed??this.cfg.seed);
      this.reset(weaponId);this.requestedSeed=supplied;this.startChapter=selection?.chapter||1;this.difficulty=selection?.difficulty||'normal';this.startingDifficulty=this.difficulty;
      if(this.data.roguelike){
        this.runCount=(this.runCount||0)+1;
        this.runSeed=supplied===null?rng.hash(Math.floor(this.random()*4294967296),this.runCount):supplied;
        this.prepareRun();
        const opening=()=>this.runPlans[this.startChapter===2?6:0];
        const rewardKey=()=>loot.rewards(opening(),this.weapon.id,this.runSeed).slice().sort().join('|');
        for(let i=0;supplied===null&&i<64&&(encounters.signature(opening())===this.previousOpening||rewardKey()===this.previousOpeningRewards||this.layout&&exploration.signature(this.layout)===this.previousLayout);i++){
          this.runSeed=rng.hash(this.runSeed,'different-opening',i);this.prepareRun();
        }
        this.previousOpening=encounters.signature(opening());this.previousOpeningRewards=rewardKey();this.previousLayout=this.layout?exploration.signature(this.layout):null;
      }
      if(this.startChapter===2){const kit=progression.loadout(2);this.coins=kit.coins;this.player.hp=this.player.maxHp=kit.health;this.modifiers={damage:kit.damage,interval:kit.interval};this.perks[this.weapon.id]=kit.perk;this.refreshWeapon();this.enterRoom(6);this.saveChapterEntry();}
      else this.enterRoom(0);
      return true;
    }
    prepareRun(){
      if(this.cfg.exploration&&this.startChapter===1){const {rooms,...layout}=exploration.generate(this.data,this.runSeed);this.runPlans=rooms;this.layout=layout;}
      else this.runPlans=encounters.plan(this.data.rooms,this.runSeed);
      if(this.cfg.workshopV2)this.runPlans=workshopContent.plan(this.runPlans,this.runSeed,{pressure:this.cfg.workshopPressure});
      this.completed=this.runPlans.map(()=>false);this.visited=this.runPlans.map(()=>false);
    }
    get chapterRoomIds(){if(this.chapter===2&&this.cfg.workshopV2)return [...workshopRun.ids];return this.chapter===1&&this.layout?this.layout.ids:this.data.chapters?.find(c=>c.id===this.chapter)?.rooms||this.data.rooms.map((_,i)=>i);}
    createWeapon(id){const damage=this.overrides.damage??weapons.byId[id].damage*this.combatScale/weapons.UNIT;return weapons.create(id,this.modifiers,{...this.overrides,damage});}
    refreshWeapon(){const flash=this.weapon.flash;this.weapon=this.createWeapon(this.weapon.id);this.weapon.flash=flash;}
    equipWeapon(id){if(!weapons.byId[id])return false;this.pendingBurst=null;this.weapon=this.createWeapon(id);this.shotClock=this.weapon.interval;return true;}
    enterRoom(index,from=null){
      this.pendingBurst=null;this.roomIndex=index;this.map=this.runPlans?.[index]||this.data.rooms[index];this.geometry=new Geometry(this.map);
      if(this.data.roguelike&&!this.rewardDrafts[index]){
        this.rewardDrafts[index]=loot.rewards(this.map,this.weapon.id,this.runSeed);
      }
      this.player.x=this.map.start.x;this.player.y=this.map.start.y;this.player.moving=false;this.player.invulnerable=1;this.resetHazards();
      const entry=from===null?null:this.map.exits?.find(e=>e.to===from);if(entry){const dx=this.map.cols*40-entry.x,dy=this.map.rows*40-entry.y,n=Math.hypot(dx,dy)||1,x=entry.x+dx/n*100,y=entry.y+dy/n*100;if(this.geometry.canStand(x,y,13)){this.player.x=x;this.player.y=y;}}
      this.enemies=[];this.bullets=[];this.hostile=[];this.effects=[];this.damagePopups=[];this.roomTime=0;this.roomKills=0;this.shotClock=.25;
      this.schedule=this.completed[index]?[]:this.map.batches.flatMap((batch,wave)=>batch.kinds.map(kind=>({kind,at:batch.at,wave})));
      this.roomSpawnClock=0;this.waveIndex=-1;this.waveDelay=this.map.batches[0]?.at??1;
      this.player.bob=0;
      this.state=['shop','rest'].includes(this.map.type)?'safe':this.completed[index]?'cleared':'combat';this.feedback='';this.events.push({type:'enter',room:index});this.visited[index]=true;this.restUsed=this.restUsedRooms.includes(index);this.workshop=workshop.create(this.map);this.threats=[];workshopRun.enter(this);
    }
    pause(){if(!['combat','cleared','safe'].includes(this.state))return false;this.resumeState=this.state;this.state='paused';this.player.moving=false;return true;}
    resume(){if(this.state==='paused')this.state=this.resumeState;}
    get nearSupply(){return this.state==='safe'&&this.map.supply&&distance(this.player,this.map.supply)<=74;}
    get nearService(){return this.state==='safe'&&this.map.service&&distance(this.player,this.map.service)<=74;}
    get shopItems(){
      const kind=this.activeShop;
      if(this.data.roguelike&&!this.shopDrafts[kind])this.shopDrafts[kind]=loot.shop(kind,this.runSeed,this.startingWeaponId);
      const items=this.data.roguelike?this.shopDrafts[kind].map(id=>loot.catalogs[kind].find(item=>item.id===id)):kind==='workshop'?loot.catalogs.workshop:kind==='late'?LATE_PRODUCTS:PRODUCTS;
      const gold=items.map(item=>({...item,sold:this.purchased.includes(item.id),available:this.coins>=item.price&&!this.purchased.includes(item.id)&&((item.effect||item.id)!=='repair'||this.player.hp<this.player.maxHp)&&(item.effect!=='shield'||this.player.shield<2)&&(!item.weaponId||item.weaponId!==this.weapon.id)}));
      return kind==='workshop'&&this.cfg.workshopV2?[...gold,...workshopMods.items(this)]:gold;
    }
    get rewardOptions(){const common={power:{id:'power',name:'强化弹头',icon:'↗',description:'所有武器伤害 +20%'},rapid:{id:'rapid',name:'快速供能',icon:'ϟ',description:'射击间隔缩短10%'},repair:{id:'repair',name:'应急药剂',icon:'♥',description:'恢复3点生命',disabled:this.player.hp===this.player.maxHp},heart:{id:'heart',name:'强化护甲',icon:'♥',description:'最大生命 +1，并恢复1点',disabled:this.player.maxHp>=12},shield:{id:'shield',name:'双层护盾',icon:'◇',description:'护盾补充至2层',disabled:this.player.shield>=2}};if(this.data.roguelike&&this.rewardDrafts[this.roomIndex])return this.rewardDrafts[this.roomIndex].map(id=>id.startsWith('perk-')?growth.option(id.slice(5),this.perks[id.slice(5)]):common[id]);if(this.map.chapter===2)return this.roomIndex===6?[common.heart,common.power,common.repair]:this.roomIndex===9?[common.shield,common.power,common.repair]:[common.rapid,common.power,common.repair];return this.roomIndex===0?[common.power,common.rapid,common.repair]:[growth.option(this.weapon.id,this.perks[this.weapon.id]),this.roomIndex===2?common.power:common.rapid,common.repair];}
    buy(id){
      if(this.state!=='shop')return false;const item=this.shopItems.find(item=>item.id===id);
      if(!item||!item.available)return false;
      if(item.currency==='parts')return workshopMods.buy(this,item);
      this.coins-=item.price;this.purchased.push(id);
      const effect=item.effect||id;
      if(item.weaponId)this.equipWeapon(item.weaponId);
      if(effect==='power'||effect==='late-power'){this.modifiers.damage*=1.2;this.refreshWeapon();}
      if(effect==='rapid'){this.modifiers.interval*=.9;this.refreshWeapon();}
      if(effect==='repair'||effect==='late-repair')this.player.hp=Math.min(this.player.maxHp,this.player.hp+3);
      if(effect==='late-shield'||effect==='shield')this.player.shield=2;
      this.feedback=`已购买${item.name}`;this.events.push({type:'purchase'});return true;
    }
    closeShop(){if(this.state==='shop'){this.state='safe';return true;}return false;}
    chooseReward(choice){
      if(this.state!=='reward'||this.rewardedRooms.includes(this.roomIndex))return false;
      const option=this.rewardOptions.find(o=>o.id===choice);if(!option||option.disabled)return false;
      if(choice==='power'){this.modifiers.damage*=1.2;this.refreshWeapon();}
      if(choice==='rapid'){this.modifiers.interval*=.9;this.refreshWeapon();}
      if(choice==='repair')this.player.hp=Math.min(this.player.maxHp,this.player.hp+3);
      if(choice==='heart'){this.player.maxHp++;this.player.hp=Math.min(this.player.maxHp,this.player.hp+1);}
      if(choice==='shield')this.player.shield=2;
      if(choice.startsWith('perk-'))this.perks[this.weapon.id]++;
      this.upgrade=choice;this.rewardedRooms.push(this.roomIndex);if(this.roomIndex===0)this.rewardTaken=true;this.state='cleared';this.events.push({type:'reward',choice});return true;
    }
    get remaining(){return this.schedule.length+this.enemies.length;}
    get chapter(){return this.map.chapter||1;}
    get exits(){if(this.cfg.workshopV2&&this.chapter===2)return this.map.exits.map(e=>({...e,locked:Boolean(e.requiresBadge&&!this.workshopRun.badge),label:e.requiresBadge?(this.workshopRun.badge?'工牌已解锁 · 隐藏检修间':'需要工牌 · 隐藏检修间'):e.label}));return this.map.exits||[{...this.map.portal,to:this.roomIndex+1<this.data.rooms.length?this.roomIndex+1:null,label:this.data.campaign&&this.roomIndex===5?'第二章 · 失落工坊':'传送门'}];}
    get navigationExit(){return this.exits.find(e=>!e.locked&&e.to!==null&&(this.layout&&this.chapter===1?(this.runPlans[e.to]?.chapter===2||this.layout.depths[e.to]>this.map.depth):e.to>this.roomIndex)&&!this.completed[e.to])||this.exits[0];}
    get nearPortal(){return ['cleared','safe'].includes(this.state)&&this.exits.some(e=>distance(this.player,e)<=68);}
    get nearConsole(){return ['combat','cleared'].includes(this.state)&&this.map.console&&distance(this.player,this.map.console)<=74;}
    beginChapter(){if(this.state!=='chapter-intro')return false;this.state='combat';return true;}
    retryChapter(){
      if(!this.chapterCheckpoint||!['lost','chapter-complete'].includes(this.state))return false;
      const c=JSON.parse(JSON.stringify(this.chapterCheckpoint));this.reset(c.weaponId);this.runSeed=c.runSeed??null;this.runPlans=c.runPlans||null;this.layout=c.layout||null;this.requestedSeed=c.requestedSeed??null;this.workshopRun=c.workshopRun||workshopRun.create();this.rewardDrafts=c.rewardDrafts||{};this.shopDrafts=c.shopDrafts||{};this.coins=c.coins;this.kills=c.kills;this.elapsed=c.elapsed;this.modifiers=c.modifiers;this.perks=c.perks;this.purchased=c.purchased;this.rewardedRooms=c.rewardedRooms;this.restUsedRooms=c.restUsedRooms;this.completed=c.completed;this.visited=c.visited;this.startingWeaponId=c.startingWeaponId;this.player={...this.player,...c.player};this.upgrade=c.upgrade;this.difficulty=c.difficulty||'normal';this.startingDifficulty=c.startingDifficulty||'normal';this.startChapter=c.startChapter||1;this.equipWeapon(c.weaponId);this.chapterCheckpoint=c;this.enterRoom(6);return true;
    }
    saveChapterEntry(){const fields=['coins','kills','elapsed','modifiers','perks','purchased','rewardedRooms','restUsedRooms','completed','visited','startingWeaponId','player','upgrade','difficulty','startingDifficulty','startChapter','runSeed','runPlans','rewardDrafts','shopDrafts','layout','requestedSeed','workshopRun'];const c=Object.fromEntries(fields.map(k=>[k,JSON.parse(JSON.stringify(this[k]))]));c.weaponId=this.weapon.id;this.chapterCheckpoint=c;}
    interact(){
      this.feedback='';
      if(this.nearConsole)return workshop.control(this);
      if(this.nearSupply){this.activeShop=this.chapter===2?'workshop':'late';this.state='shop';this.player.moving=false;return true;}
      if(this.nearService){
        if(this.map.type==='shop'){this.activeShop='early';this.state='shop';this.player.moving=false;return true;}
        if(this.map.type==='rest'){
          if(this.restUsed){this.feedback='篝火已经使用过了。';return false;}
          if(this.player.hp===this.player.maxHp){this.feedback='生命已满，暂时不需要休息。';return false;}
          this.player.hp=Math.min(this.player.maxHp,this.player.hp+3);this.restUsed=true;this.restUsedRooms.push(this.roomIndex);this.feedback='休息完成，恢复3点生命。';this.events.push({type:'heal'});return true;
        }
      }
      if(!this.nearPortal)return false;
      const exit=this.exits.find(e=>distance(this.player,e)<=68),from=this.roomIndex;
      if(exit.locked){this.feedback='需要精英车间掉落的工牌，才能开启检修门。';return false;}
      this.completed[this.roomIndex]=true;
      if(exit.to!==null){if(this.data.campaign&&from===5&&exit.to===6)this.difficulty='normal';this.enterRoom(exit.to,from);if(this.data.campaign&&from===5&&exit.to===6){this.player.hp=Math.min(this.player.maxHp,this.player.hp+2);this.coins+=10;this.saveChapterEntry();this.state='chapter-intro';}}
      else{this.state=this.data.campaign?'chapter-complete':'won';this.player.moving=false;this.events.push({type:this.state});}
      return true;
    }
    spawn(kind,context={}){
      if(this.enemies.length>=(this.map.enemyLimit??this.cfg.enemyLimit))return false;
      const stats=this.map.enemyStats?.[kind]||(kind==='skeleton'?{hp:1400,speed:140}:{}),radius=stats.radius??(kind==='boss'?24:kind==='elite'?19:13);
      const safe=p=>this.geometry.canStand(p.x,p.y,radius)&&(!guardian.is(this,{kind})||guardian.canStand(this,{kind,radius},p.x,p.y))&&!this.lavaAt({x:p.x,y:p.y+10})&&!(this.map.mechanisms||[]).some(h=>workshop.inside({...p,radius},h))&&distance(p,this.player)>=this.cfg.spawnDistance&&this.enemies.every(e=>distance(e,p)>55)&&this.exits.every(e=>distance(p,e)>45);
      const preferred=(this.map.spawnPoints?.[kind]||[]).filter(safe);
      let spots=preferred.length?preferred:this.geometry.floor.filter(safe);
      if(context.near)spots=[...spots].sort((a,b)=>distance(a,context.near)-distance(b,context.near)).slice(0,8);
      if(!spots.length)return false;
      const p=spots[Math.floor(this.random()*spots.length)],ranged=kind==='ranged';
      const scale=progression.rules(this.difficulty),hp=(stats.hp??((kind==='boss'?90:kind==='elite'?22:this.roomIndex===0?4:(ranged?5:6))*this.combatScale))*scale.hp;
      const speed=(stats.speed??(kind==='boss'?50:kind==='elite'?85:ranged?68:125))*( ['melee','skeleton','elite','hound','warden','bomber','worker','mother'].includes(kind)?scale.melee:1);
      this.enemies.push({...p,id:this.nextId++,kind,rank:machines.defs[kind]?.rank||kind,visualSize:machines.defs[kind]?.size,radius,hp,maxHp:hp,speed,projectileSpeed:stats.projectileSpeed,ringSpeed:stats.ringSpeed,
        ...(stats.behavior?{behavior:stats.behavior}:{}),...(context.summonerId?{summonerId:context.summonerId}:{}),...(Number.isInteger(context.wave)?{wave:context.wave}:{}),...(kind==='mother'?{nextSummonAt:this.roomTime+3}:{}),
        warmup:machines.rank({kind})==='boss'?1.5:this.cfg.spawnDelay,hit:0,cooldown:1.1+this.random()*.5,windup:0,aim:null,angle:0,charge:0,pattern:kind==='boss'?'fan':null,bob:0,phase:1,phaseTimer:0,attackCount:0,recover:0});
      return true;
    }
    hurt(amount=1,point=this.player){
      if(this.state!=='combat'||this.player.invulnerable>0||workshop.protectedTransition(this))return;
      if(this.player.shield>0){this.player.shield--;this.player.invulnerable=.85;this.effects.push({x:this.player.x,y:this.player.y,type:'shield',life:.35,maxLife:.35});this.events.push({type:'shield'});return;}
      this.player.hp=Math.max(0,this.player.hp-amount);this.player.invulnerable=.85;
      this.effects.push({x:point.x,y:point.y,type:'hurt',life:.3,maxLife:.3});this.events.push({type:'hurt'});
    }
    resetHazards(){Object.assign(this.player,{burn:0,onLava:false,hazardClock:0,lavaContact:0});}
    lavaAt(point,radius=10){return (this.map.hazards||[]).some(h=>h.type==='lava'&&Math.hypot(point.x-clamp(point.x,h.x,h.x+h.w),point.y-clamp(point.y,h.y,h.y+h.h))<radius);}
    updateHazards(dt){
      const p=this.player,wasBurning=p.burn>0;p.onLava=this.lavaAt({x:p.x,y:p.y+10});
      p.lavaContact=p.onLava?p.lavaContact+dt:0;
      p.burn=p.lavaContact>=.6?2:Math.max(0,p.burn-dt);
      p.hazardClock=Math.max(0,p.hazardClock-dt);
      if(p.onLava||wasBurning){
        if(p.hazardClock<=1e-7){p.hp=Math.max(0,p.hp-1);p.hazardClock=1;p.invulnerable=Math.max(p.invulnerable,.85);this.effects.push({x:p.x,y:p.y,type:'hurt',life:.3,maxLife:.3});this.events.push({type:'hurt',source:p.onLava?'lava':'burn'});}
      }
    }
    moveEnemy(e,point,dt){
      const target=this.geometry.towards(e,point),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);
      if(d>1){const travel=Math.min(d,e.speed*(e.slow>0?e.slowFactor:1)*dt);if(guardian.is(this,e))guardian.move(this,e,dx/d*travel,dy/d*travel);else this.geometry.move(e,dx/d*travel,dy/d*travel);}
    }
    updateEnemies(dt){
      elites.cleanup(this);
      const p=this.player;
      for(const e of this.enemies){
        if(e.hp<=0)continue;
        workshopMods.heat(this,e,dt);if(e.hp<=0)continue;
        e.hit=Math.max(0,e.hit-dt);
        e.slow=Math.max(0,(e.slow||0)-dt);
        e.bob=Math.sin(this.elapsed*8+e.id)*1.5;
        if(e.warmup>0){e.warmup=Math.max(0,e.warmup-dt);continue;}
        const dist=distance(e,p);e.angle=Math.atan2(p.y-e.y,p.x-e.x);
        if(guardian.update(this,e,dt)||workshop.update(this,e,dt)||tactics.update(this,e,dt))continue;
        if(e.kind==='melee'||e.kind==='skeleton')this.moveEnemy(e,p,dt);
        else{
          if(e.windup>0){
            e.windup=Math.max(0,e.windup-dt);
            if(e.windup===0){
              const origin=e.shotOrigin||center(e),a=tactics.shotAngles(e)[0];
              const speed=(e.projectileSpeed??this.cfg.enemyBulletSpeed)*progression.rules(this.difficulty).projectile;
              this.hostile.push({...origin,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,radius:10});
              e.cooldown=(this.data.difficulty==='normal'?1.85:2.35)+this.random()*.35;e.aim=null;e.shotOrigin=null;
            }
          }else{
            e.cooldown=Math.max(0,e.cooldown-dt);
            const canShoot=this.geometry.visible(center(e),center(p),10);
            if(dist<170&&canShoot){
              const targets=this.geometry.floor.filter(q=>distance(q,p)>dist+50);
              if(targets.length){const goal=targets.reduce((a,b)=>distance(a,e)<distance(b,e)?a:b);this.moveEnemy(e,goal,dt);}
            }else if(dist>300||!canShoot)this.moveEnemy(e,p,dt);
            if(e.cooldown===0&&dist<=420&&canShoot){
              e.windup=.7;e.aim=center(p);e.shotOrigin=center(e);this.events.push({type:'warning'});
            }
          }
        }
        // Keep enemies distinguishable, without pushing them through geometry.
        for(const other of this.enemies){
          if(other.id>=e.id||other.warmup>0||e.windup>0||e.charge>0||other.windup>0||other.charge>0)continue;
          const d=distance(e,other);
          if(d>0&&d<29){const push=Math.min(26*dt,(29-d)*.3);this.geometry.move(e,(e.x-other.x)/d*push,(e.y-other.y)/d*push);}
        }
      }
    }
    fire(dt,enabled=true,aimMode='auto',aimPoint=null){
      workshopMods.tick(this,dt,enabled,aimMode,aimPoint);
      this.shotClock-=dt;this.weapon.flash=Math.max(0,this.weapon.flash-dt);
      const p=this.player,origin=center(p);let a;
      if(aimMode==='manual'){
        if(!aimPoint||!Number.isFinite(aimPoint.x)||!Number.isFinite(aimPoint.y))return;
        const dx=aimPoint.x-origin.x,dy=aimPoint.y-origin.y,length=Math.hypot(dx,dy);
        if(!Number.isFinite(length)||length<.001)return;
        a=Math.atan2(dy,dx);p.angle=a;
      }
      if(!enabled||this.shotClock>0)return;
      if(aimMode!=='manual'){
        // Original automatic targeting remains intact as the auto mode.
        let target=null,best=this.weapon.range;
        for(const e of this.enemies){const d=distance(e,this.player);if(e.hp>0&&e.warmup===0&&d<best&&this.geometry.visible(center(this.player),center(e),3)){best=d;target=e;}}
        if(!target)return;
        const goal=center(target);a=Math.atan2(goal.y-origin.y,goal.x-origin.x);p.angle=a;
      }
      this.emitVolley(a,workshopMods.scale(this,a));
      this.shotClock=this.weapon.interval;
    }
    emitVolley(a,damageScale=1){
      const origin=center(this.player),count=this.weapon.pellets;
      const volley=this.nextVolley++;
      for(let i=0;i<count;i++){
        const angle=a+(count===1?0:(i/(count-1)-.5)*this.weapon.spread);
        this.bullets.push({...origin,vx:Math.cos(angle)*this.weapon.speed,vy:Math.sin(angle)*this.weapon.speed,life:this.weapon.range/this.weapon.speed,remainingRange:this.weapon.range,damage:this.weapon.damage*damageScale,overheat:workshopMods.enabled(this,'shotgun'),radius:3,color:this.weapon.color,pierce:this.weapon.pierce,hitIds:[],weaponId:this.weapon.id,perkRank:this.perks[this.weapon.id],volley});
      }
      this.weapon.flash=.1;this.events.push({type:'shot'});
    }
    damageEnemy(enemy,amount,source={}){
      if(!Number.isFinite(amount)||amount<=0||enemy.hp<=0||enemy.warmup>0)return false;
      const before=enemy.hp,applied=feedback.round(workshop.limitDamage(this,enemy,amount*workshop.multiplier(enemy,source)));
      if(applied<=0)return false;
      enemy.hp=Math.max(0,feedback.round(before-applied));enemy.hit=.15;
      const hpLost=feedback.round(before-enemy.hp);feedback.record(this.damagePopups,enemy,applied,hpLost,source);
      this.events.push({type:'damage',enemyId:enemy.id,amount:applied,hpLost,weaponId:source.weaponId||this.weapon.id});workshop.afterDamage(this,enemy);return true;
    }
    updateProjectiles(dt){
      for(const [list,enemyShot]of[[this.bullets,false],[this.hostile,true]]){
        for(const b of list){
          const x=b.x,y=b.y,speed=Math.hypot(b.vx,b.vy),travel=Math.min(speed*dt,Math.max(0,b.life)*speed,b.remainingRange??Infinity),nx=x+(speed?b.vx/speed*travel:0),ny=y+(speed?b.vy/speed*travel:0),steps=Math.max(1,Math.ceil(Math.hypot(nx-x,ny-y)/4));
          for(let i=1;i<=steps&&b.life>0;i++){
            b.x=x+(nx-x)*i/steps;b.y=y+(ny-y)*i/steps;
            if(!this.geometry.canStand(b.x,b.y,b.radius??(enemyShot?10:3))){b.life=0;break;}
            if(enemyShot){if(hitsBody(b,this.player)){this.hurt(1,b);b.life=0;}}
            else{
              const e=this.enemies.find(e=>e.hp>0&&e.warmup===0&&!(b.hitIds||[]).includes(e.id)&&hitsBody(b,e));
              if(e){this.damageEnemy(e,b.damage,b);workshopMods.hit(this,e,b);
                if(b.perkRank>0){
                  if(b.weaponId==='sidearm'&&e.hp<=0)this.player.haste=3;
                  if(b.weaponId==='piercer'){e.slow=1.2;e.slowFactor=b.perkRank===1?.75:.6;}
                  if(b.weaponId==='shotgun'&&e.kind!=='overseer'&&e.lastKnockVolley!==b.volley&&e.windup<=0&&!(e.charge>0)&&!(guardian.is(this,e)&&guardian.rooted(e))){
                    e.lastKnockVolley=b.volley;const speed=Math.hypot(b.vx,b.vy)||1,knock=b.perkRank===1?28:42;
                    for(let t=0;t<knock;t+=2)if(guardian.is(this,e))guardian.move(this,e,b.vx/speed*Math.min(2,knock-t),b.vy/speed*Math.min(2,knock-t));else this.geometry.move(e,b.vx/speed*Math.min(2,knock-t),b.vy/speed*Math.min(2,knock-t));
                  }
                }
                b.hitIds??=[];b.hitIds.push(e.id);if(b.hitIds.length>=(b.pierce||1))b.life=0;this.effects.push({x:b.x,y:b.y,type:'hit',life:.18,maxLife:.18});this.events.push({type:'hit'});}
            }
          }
          b.life-=dt;if(b.remainingRange!==undefined){b.remainingRange=Math.max(0,b.remainingRange-travel);if(b.remainingRange===0)b.life=0;}
        }
      }
      this.bullets=this.bullets.filter(b=>b.life>0);this.hostile=this.hostile.filter(b=>b.life>0);
    }
    clearRoom(){
      this.pendingBurst=null;this.resetHazards();
      if(this.completed[this.roomIndex])return;
      const lootGain=workshopRun.clear(this);
      this.completed[this.roomIndex]=true;this.coins+=lootGain?.gold??(this.map.type==='boss'?0:5);this.bullets=[];this.hostile=[];this.player.moving=false;this.weapon.flash=0;
      if(this.data.campaign&&this.map.type==='boss')this.events.push({type:'chapter-clear',chapter:this.chapter,difficulty:this.difficulty});
      this.threats=[];for(const p of this.workshop.pads)p.state='off';
      this.state=((this.map.reward||[0,2,3].includes(this.roomIndex))&&this.map.type!=='boss'&&!this.rewardedRooms.includes(this.roomIndex))?'reward':'cleared';this.events.push({type:'clear'});
    }
    updateSpawns(dt){
      if(this.map.waveMode==='timed'){pressure.tick(this,dt);return;}
      if(this.map.waveMode!=='clear'){
        while(this.schedule.length&&this.schedule[0].at<=this.roomTime){if(!this.spawn(this.schedule[0].kind))break;this.schedule.shift();}
        return;
      }
      if(!this.schedule.length)return;
      const next=this.schedule[0].wave;
      if(next>this.waveIndex){
        if(this.enemies.length)return;
        this.waveDelay=Math.max(0,this.waveDelay-dt);
        if(this.waveDelay>0)return;
        this.waveIndex=next;this.waveDelay=this.map.waveBreak??2;
        this.events.push({type:'wave',wave:next+1,total:this.map.batches.length});
      }
      while(this.schedule.length&&this.schedule[0].wave===this.waveIndex){
        if(!this.spawn(this.schedule[0].kind))break;
        this.schedule.shift();
      }
    }
    tick(dt,input={}){
      if(!['combat','cleared','safe'].includes(this.state))return;
      dt=clamp(Number.isFinite(dt)?dt:0,0,.05);if(!dt)return;
      this.elapsed+=dt;const p=this.player;
      p.invulnerable=Math.max(0,p.invulnerable-dt);
      p.haste=Math.max(0,p.haste-dt);
      let dx=clamp(input.x||0,-1,1),dy=clamp(input.y||0,-1,1),len=Math.hypot(dx,dy);
      if(len){dx/=len;dy/=len;p.facing=dx===0?p.facing:Math.sign(dx);}
      const speed=this.cfg.speed*(p.haste>0&&this.weapon.id==='sidearm'?1+(this.perks.sidearm===2?.25:.15):1);
      p.moving=len>0;this.geometry.move(p,dx*speed*dt,dy*speed*dt);
      p.bob=p.moving?Math.sin(this.elapsed*14)*1.8:0;
      this.effects.forEach(e=>e.life-=dt);this.effects=this.effects.filter(e=>e.life>0);
      this.damagePopups.forEach(p=>{p.life-=dt;const target=this.enemies.find(e=>e.id===p.enemyId);if(target){p.x=target.x+p.offsetX;p.y=target.y+p.offsetY;}});this.damagePopups=this.damagePopups.filter(p=>p.life>0);
      if(this.state==='cleared'||this.state==='safe')return;
      this.roomTime+=dt;
      this.updateHazards(dt);
      workshop.tick(this,dt);
      if(p.hp<=0){this.state='lost';p.moving=false;this.events.push({type:'lost'});return;}
      this.updateSpawns(dt);
      this.updateEnemies(dt);workshop.separate(this,dt);this.fire(dt,input.fire!==false,input.aimMode,input.aimPoint);this.updateProjectiles(dt);
      guardian.afterDamage(this);elites.cleanup(this);
      for(const e of this.enemies)if(e.hp<=0){const lootGain=workshopRun.kill(this,e);this.events.push({type:'kill'});this.kills++;this.roomKills++;const rank=machines.rank(e),value=lootGain?.gold??(rank==='boss'||(e.kind==='skeleton'||e.kind==='worker')&&e.summonerId?0:rank==='elite'?6:1);this.coins+=value;this.effects.push({x:e.x,y:e.y,type:'death',life:.4,maxLife:.4,value});}
      this.enemies=this.enemies.filter(e=>e.hp>0);
      const touching=this.enemies.find(e=>e.warmup===0&&e.mode!=='stunned'&&workshop.contactAllowed(this,e)&&distance(e,p)<e.radius+p.radius);if(touching)this.hurt(['elite','boss'].includes(machines.rank(touching))?2:1);
      if(p.hp<=0){this.state='lost';p.moving=false;this.events.push({type:'lost'});return;}
      workshop.afterTick(this);
      if(this.remaining===0)this.clearRoom();
      else for(const e of this.enemies)if(e.kind==='boss'&&!guardian.is(this,e)&&e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;e.phaseTimer=1.2;e.windup=0;e.aim=null;e.cooldown=0;this.hostile=[];this.events.push({type:'phase'});}
    }
    snapshot(){
      return {workshopVersion:this.cfg.workshopPressure?2:this.cfg.workshopV2?1:null,pressureVersion:this.cfg.workshopPressure?1:undefined,workshopRun:JSON.parse(JSON.stringify(this.workshopRun)),layout:this.layout?JSON.parse(JSON.stringify(this.layout)):null,recordRoomIndex:this.cfg.workshopV2&&this.chapter===2?(this.layout?.ids.length??6)+workshopRun.ids.indexOf(this.roomIndex):this.layout?(this.chapter===1?this.layout.ids.indexOf(this.roomIndex):this.layout.ids.length+this.roomIndex-6):this.roomIndex,depth:this.map.depth??null,depthCoefficients:this.map.enemyStats?.melee?.depthCoefficients?{...this.map.enemyStats.melee.depthCoefficients}:null,runSeed:this.runSeed,rulesVersion:this.data.roguelike?1:null,encounter:this.data.roguelike?JSON.parse(JSON.stringify(this.map.batches)):null,state:this.state,difficulty:this.difficulty,startingDifficulty:this.startingDifficulty,startChapter:this.startChapter,elapsed:this.elapsed,roomIndex:this.roomIndex,roomCount:this.cfg.workshopV2?(this.layout?.ids.length??6)+7:this.layout?this.layout.ids.length+6:this.data.rooms.length,roomName:this.map.name,roomTime:this.roomTime,chapter:this.chapter,chapterName:this.data.chapters?.find(c=>c.id===this.chapter)?.name||'遗迹地牢',chapterRooms:[...this.chapterRoomIds],visited:[...this.visited],exits:this.exits.map(e=>({...e})),canRetryChapter:Boolean(this.chapterCheckpoint),nearConsole:Boolean(this.nearConsole),console:this.map.console?{...this.map.console}:null,mechanisms:JSON.parse(JSON.stringify(this.workshop)),threats:JSON.parse(JSON.stringify(this.threats)),
        wave:this.map.waveMode==='timed'?pressure.status(this):this.map.waveMode==='clear'?{number:Math.max(1,this.waveIndex+1),total:this.map.batches.length,waiting:this.schedule.length>0&&this.enemies.length===0,next:this.schedule[0]?.wave+1||null,delay:this.waveDelay}:null,
        completed:[...this.completed],coins:this.coins,kills:this.kills,remaining:this.remaining,pending:this.schedule.length,
        startingWeaponId:this.startingWeaponId,modifiers:{...this.modifiers},upgrade:this.upgrade,perks:{...this.perks},rewardedRooms:[...this.rewardedRooms],rewardOptions:this.rewardOptions,nearPortal:this.nearPortal,portal:{...this.map.portal},player:{...this.player},weapon:{...this.weapon},
        roomType:this.map.type||'combat',nearService:Boolean(this.nearService),service:this.map.service?{...this.map.service}:null,nearSupply:Boolean(this.nearSupply),supply:this.map.supply?{...this.map.supply}:null,activeShop:this.activeShop,purchased:[...this.purchased],restUsed:this.restUsed,shopItems:this.shopItems,feedback:this.feedback,
        damagePopups:this.damagePopups.map(p=>({...p})),enemies:this.enemies.map(e=>({...e,summonPhases:e.summonPhases?[...e.summonPhases]:undefined,aim:e.aim?{...e.aim}:null,shotOrigin:e.shotOrigin?{...e.shotOrigin}:null,chargePlan:e.chargePlan?{...e.chargePlan,start:{...e.chargePlan.start},end:{...e.chargePlan.end}}:null})),hostile:this.hostile.map(b=>({...b})),bulletCount:this.bullets.length};
    }
  }
  const api={World,DEFAULTS};root.DungeonCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
