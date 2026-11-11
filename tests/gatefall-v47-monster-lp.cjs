/* v47: monster Life Points and Rampart Ram (deterministic rules). Run: node tests/gatefall-v47-monster-lp.cjs */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
js+='\n;globalThis.T={curAtk,CARDS,DECK,newGame,apply,P,canAttack,monBaseLp,monLp,monMaxLp,battleHitTeam,effectDamageMonster,healMonster,netHash,settle,newZone,attackOptions};';
const ctx={document:{addEventListener(){}},console,Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const T=ctx.T;
function flush(S){for(let n=0;n<40&&S.pending;n++){const pd=S.pending;if(pd.type==='respond')T.apply(S,pd.player,{t:'respond',value:null});else if(pd.kind==='first')T.apply(S,pd.player,{t:'choose',value:'b:first'});else break;}if(!S.pending&&S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});return S;}
const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
// A has Ember Tactician's passive off (Gloam Trickster), B too: no damage halving, no burn bonus
function game(){const S=T.newGame(7,['A','B'],[Array(60).fill('ashblade'),Array(60).fill('ashblade')],null,['trickster','trickster']);flush(S);S.turn=2;S.phase='battle';S.active=0;return S;}
const atk=(S,slot,target,extra={})=>{const e=T.apply(S,0,{t:'attack',slot,tp:1,target,...extra});flush(S);return e;};
let S,a,b;

// ---- Life Points by strength
assert.equal(T.monBaseLp({id:'ogre'}),1500);assert.equal(T.monBaseLp({id:'tidewisp'}),1000);assert.equal(T.monBaseLp({id:'ouroth'}),3500);
assert.equal(T.monBaseLp({id:'sheep'}),300,'tokens have at least 300');assert.equal(T.monBaseLp({id:'fireball'}),0,'spells have none');
S=game();const nz=T.newZone(S,{uid:1,id:'kaiju'});assert.equal(nz.lp,2200,'new zones start at full LP');
assert.equal(T.monLp(S,mon(2,'ogre')),1500,'a zone without lp (old save) is at full LP');

// ---- Attack vs Attack: the weaker takes the gap; at 0 it is destroyed and the rest carries over
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre');b.m[0]=mon(20,'ashblade');
assert.equal(atk(S,0,0),null);
assert(b.m[0],'ashblade survives');assert.equal(T.monLp(S,b.m[0]),1400,'ashblade takes 100');assert.equal(b.lp,8000,'no player damage while LP remain');assert.equal(a.lp,8000);
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre',undefined,{boost:1000});b.m[0]=mon(20,'ashblade',undefined,{lp:300});
atk(S,0,0);assert(!b.m[0],'ashblade at 0 LP is destroyed');assert.equal(b.lp,8000-800,'1100 gap - 300 LP = 800 carries over');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ashblade');b.m[0]=mon(20,'ogre');
atk(S,0,0);assert.equal(T.monLp(S,a.m[0]),1400,'a weaker attacker takes the gap');assert.equal(b.lp,8000);assert.equal(a.lp,8000);
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ashblade');b.m[0]=mon(20,'ashblade');
atk(S,0,0);assert(a.m[0]&&b.m[0]&&T.monLp(S,a.m[0])===1500&&T.monLp(S,b.m[0])===1500,'equal strength hurts neither');

// ---- Defense Position: DEF shields LP, only the excess gets through; a lower attack hurts the attacker's player
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre',undefined,{boost:1000});b.m[0]=mon(20,'bastion','def');
atk(S,0,0);assert.equal(T.monLp(S,b.m[0]),500,'3000 ATK vs 2000 DEF: 1000 to LP');assert.equal(b.lp,8000);
a.m[0].attacked=false;a.m[0].atkCount=0;atk(S,0,0);assert(!b.m[0],'second hit finishes it');assert.equal(b.lp,7500,'500 beyond its LP carries over');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ashblade');b.m[0]=mon(20,'bastion','def');
atk(S,0,0);assert.equal(a.lp,7900,'attack below DEF: attacker player takes the difference');assert.equal(T.monLp(S,a.m[0]),1500);

// ---- team attacks share the damage in order
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre');a.m[1]=mon(11,'ashblade');b.m[0]=mon(20,'ouroth',undefined,{boost:2000});
assert.equal(atk(S,0,0,{team:[1]}),null);
assert(!a.m[0],'lead absorbs 1500 and falls');assert.equal(T.monLp(S,a.m[1]),900,'the partner takes the remaining 600');assert.equal(a.lp,8000);
// blockers / spreading helper: overflow past every monster
S=game();b=T.P(S,1);b.m[0]=mon(20,'tidewisp');b.m[1]=mon(21,'vellum');
const rest=T.battleHitTeam(S,[{owner:1,slot:0,z:b.m[0]},{owner:1,slot:1,z:b.m[1]}],2500,0);
assert(!b.m[0]&&!b.m[1],'both blockers fall');assert.equal(rest,400,'1000 + 1100 absorbed, 400 left over');

// ---- effect damage ignores ATK/DEF and hits LP
S=game();b=T.P(S,1);b.m[0]=mon(20,'ashblade');b.m[1]=mon(21,'ogre','def');b.m[2]=mon(22,'kaiju');
T.effectDamageMonster(S,1,0,1500,'fire','test',0);assert(!b.m[0],'1500 fire = ashblade LP: destroyed');
T.effectDamageMonster(S,1,1,1500,'fire','test',0);assert(!b.m[1],'Defense Position does not help against effect damage');
T.effectDamageMonster(S,1,2,1500,'fire','test',0);assert.equal(T.monLp(S,b.m[2]),700,'kaiju holds with 700');assert.equal(b.lp,8000,'no player damage');
// Fireball from the hand
S=game();a=T.P(S,0);b=T.P(S,1);S.phase='main1';a.hand=[{uid:50,id:'fireball'}];b.m[0]=mon(20,'warlord');
assert.equal(T.apply(S,0,{t:'activate',uid:50}),null);T.apply(S,0,{t:'choose',value:'m:1:0'});flush(S);assert.equal(T.monLp(S,b.m[0]),600,'warlord 2100 - 1500');

// ---- healing: Healing Spring heals your monsters up to their maximum
S=game();a=T.P(S,0);S.phase='main1';a.hand=[{uid:51,id:'spring'}];a.m[0]=mon(10,'ashblade',undefined,{lp:400});a.m[1]=mon(11,'kaiju',undefined,{lp:2100});
assert.equal(T.apply(S,0,{t:'activate',uid:51}),null);flush(S);
assert.equal(a.lp,10000);assert.equal(T.monLp(S,a.m[0]),1500,'healed to max, not beyond');assert.equal(T.monLp(S,a.m[1]),2200);
assert.equal(T.healMonster(S,0,0,500),0,'no healing above the maximum');
// Bulwark Aegis raises the maximum by 500 (exceptional effect)
S=game();a=T.P(S,0);S.phase='main1';a.hand=[{uid:52,id:'shield'}];a.m[0]=mon(10,'ashblade');
assert.equal(T.apply(S,0,{t:'activate',uid:52}),null);T.apply(S,0,{t:'choose',value:S.pending.options.find(o=>o.value.endsWith(':0:0')||o.value==='m:0:0').value});flush(S);
assert.equal(T.monMaxLp(S,a.m[0]),2000);assert.equal(T.monLp(S,a.m[0]),2000,'gains 500 above its normal maximum');

// ---- a monster protected from destruction at 0 LP clings on with 1 LP (Twinsoul Bulwark endures once per turn)
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre');b.m[0]=mon(20,'twinsoul',undefined,{lp:100});
atk(S,0,0);assert(b.m[0],'Twinsoul endures');assert.equal(T.monLp(S,b.m[0]),1,'1 LP left');assert.equal(b.lp,8000-(2000-600-100),'overflow still carries over');

// ---- destroy effects still destroy outright (Soul Lance on a full-LP monster)
S=game();a=T.P(S,0);b=T.P(S,1);S.phase='main1';a.hand=[{uid:53,id:'lance'}];b.m[0]=mon(20,'ouroth');
assert.equal(T.apply(S,0,{t:'activate',uid:53}),null);flush(S);assert(!b.m[0],'Soul Lance destroys a 3500 LP monster');

// ---- bosses keep their rule: beaten in battle = driven back, the gap hits the boss's LP
S=T.newGame(7,['A','Boss'],[Array(60).fill('ashblade'),[]],null,['trickster','trickster'],'gloop');flush(S);
{const bi=S.players.findIndex(q=>q.isBoss);const bp=T.P(S,bi);S.turn=3;S.phase='battle';S.active=1-bi;const me=T.P(S,1-bi);
 const bz=bp.m[6];if(bz){bz.pos='atk';me.m[0]=mon(10,'ouroth');const lp0=bp.lp,ba=T.curAtk(S,bz);const e=T.apply(S,1-bi,{t:'attack',slot:0,tp:bi,target:6});flush(S);
  assert.equal(e,null);assert(!bp.m[6]||bz.bossImmuneTurn===S.turn,'boss driven back (or its once-per-turn immunity)');assert.equal(bp.lp,lp0-(4000-ba),'full gap to the boss LP');}}

// ---- Rampart Ram: attacks from Defense Position with its DEF
assert(T.DECK.includes('rampart'),'in the base deck');assert.equal(T.monBaseLp({id:'rampart'}),1500);
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def');b.m[0]=mon(20,'tidewisp');
assert(T.canAttack(S,0,0),'can attack in Defense Position');
atk(S,0,0);assert.equal(b.lp,8000-(2100-400),'higher DEF: the difference hits the controller');assert.equal(T.monLp(S,b.m[0]),1000,'not the monster');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def');b.m[0]=mon(20,'bastion','def');
atk(S,0,0);assert(a.m[0]&&b.m[0]&&b.lp===8000&&a.lp===8000&&T.monLp(S,b.m[0])===1500&&T.monLp(S,a.m[0])===1500,'Defense vs Defense: nothing happens');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def');b.m[0]=mon(20,'ogre',undefined,{boost:1000});
atk(S,0,0);assert.equal(T.monLp(S,a.m[0]),600,'lower DEF: the Ram takes 3000 - 2100');assert.equal(a.lp,8000);
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def',{lp:500});b.m[0]=mon(20,'ogre',undefined,{boost:1000});
atk(S,0,0);assert(!a.m[0],'destroyed at 0 LP');assert.equal(a.lp,8000-400,'the rest carries over');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def');a.m[1]=mon(11,'ogre');b.m[0]=mon(20,'ouroth');
assert(/alone/.test(T.apply(S,0,{t:'attack',slot:0,tp:1,target:0,team:[1]})),'attacks alone from Defense Position');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def');a.st[0]={card:{uid:30,id:'skilldrain'},faceDown:false,live:true,setTurn:0};
assert(!T.canAttack(S,0,0),'Skill Drain stops it attacking from Defense Position');
a.m[0].pos='atk';assert(T.canAttack(S,0,0),'in Attack Position it attacks normally');

// ---- determinism
const run=()=>{const s=game();T.P(s,0).m[0]=mon(10,'ogre');T.P(s,1).m[0]=mon(20,'ashblade');T.apply(s,0,{t:'attack',slot:0,tp:1,target:0});flush(s);return T.netHash(s);};
assert.equal(run(),run(),'same moves, same state');

console.log('PASS: monster Life Points (values, ATK vs ATK, Defense shield, overflow, teams, blockers, effect damage, healing, Bulwark Aegis, cling at 1 LP, destroy effects, bosses unchanged) and Rampart Ram');
