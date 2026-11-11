const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
js+='\n;globalThis.T={monLp,CARDS,newGame,apply,P,attackOptions,takeEv,friendlySide,setBerserk,canChangePos,canFireBack,effectDamageMonster,canActivateHand,netHash,resolveLink};';
const ctx={document:{addEventListener(){}},console,Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const T=ctx.T;
function flush(S){for(let n=0;n<40&&S.pending;n++){const pd=S.pending;if(pd.type==='respond')T.apply(S,pd.player,{t:'respond',value:null});else if(pd.kind==='first')T.apply(S,pd.player,{t:'choose',value:'b:first'});else break;}if(!S.pending&&S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});return S;}
const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
function game(coop=false){const names=coop?['A','B','Boss']:['A','B'];const decks=names.map((_,i)=>i===2?[]:Array(60).fill('ashblade'));let S=T.newGame(7,names,decks,null,coop?['warden','tactician','warden']:['warden','tactician'],coop?'gloop':null,coop);flush(S);return S;}
const give=(p,uid,id)=>{const c={uid,id};p.hand.push(c);return c;};

// ---- allied battles now deal battle damage
let S=game();let p=T.P(S,0);S.turn=2;S.phase='battle';S.active=0;p.lp=8000;
// v47 monster Life Points: the weaker monster takes the gap; what goes past its LP hits its owner
p.m[0]=mon(1,'ogre',undefined,{boost:1000});p.m[1]=mon(2,'ashblade',undefined,{lp:300});
assert.equal(T.apply(S,0,{t:'attack',slot:0,tp:0,target:1}),null);flush(S);
assert(!p.m[1]&&p.m[0],'weaker destroyed at 0 LP');assert.equal(p.lp,8000-Math.floor((3000-1900-300)/2),'owner takes the overflow (halved by Ironheart Warden)');

// ---- Fireball: card exists, quick, usable in battle phase from hand
assert(T.CARDS.fireball&&T.CARDS.fireball.quick&&T.CARDS.fireball.dmgType==='fire');
S=game();p=T.P(S,0);S.turn=2;S.phase='battle';S.active=0;p.hand=[];const fb=give(p,50,'fireball');
assert(T.canActivateHand(S,0,50),'fireball usable in battle phase');
// to a player
assert.equal(T.apply(S,0,{t:'activate',uid:50}),null);assert.equal(S.pending&&S.pending.kind,'target');
assert(S.pending.options.some(o=>o.value==='p:1')&&S.pending.options.some(o=>o.value==='p:0'),'players offered');
T.apply(S,0,{t:'choose',value:'p:1'});flush(S);
assert.equal(T.P(S,1).lp,6500,'1500 fire damage to the opponent');assert(p.gy.some(c=>c.uid===50),'fireball in GY');
assert(S.log.some(l=>/Fire effect damage/.test(l.text)),'typed log');
// to a monster: destroyed if damage beats ATK, holds otherwise
S=game();p=T.P(S,0);S.turn=2;S.phase='main1';S.active=0;p.hand=[];give(p,51,'fireball');give(p,52,'fireball');
T.P(S,1).m[0]=mon(60,'tidewisp');T.P(S,1).m[1]=mon(61,'kaiju');T.P(S,1).m[2]=mon(62,'ogre','def');
assert.equal(T.apply(S,0,{t:'activate',uid:51}),null);assert(S.pending.options.some(o=>o.value==='m:1:0'),'monsters offered');
T.apply(S,0,{t:'choose',value:'m:1:0'});flush(S);assert(!T.P(S,1).m[0],'tidewisp (1000 LP) destroyed by 1500 fire');assert.equal(T.P(S,1).lp,8000,'no LP loss from monster damage');
assert.equal(T.apply(S,0,{t:'activate',uid:52}),null);T.apply(S,0,{t:'choose',value:'m:1:1'});flush(S);assert(T.P(S,1).m[1]&&T.monLp(S,T.P(S,1).m[1])===700,'kaiju (2200 LP) holds with 700');
// defense position uses DEF: ogre 1000 DEF < 1500 -> destroyed
S=game();p=T.P(S,0);S.turn=2;S.phase='main1';S.active=0;p.hand=[];give(p,53,'fireball');T.P(S,1).m[2]=mon(62,'ogre','def');
assert.equal(T.apply(S,0,{t:'activate',uid:53}),null);T.apply(S,0,{t:'choose',value:'m:1:2'});flush(S);assert(!T.P(S,1).m[2],'effect damage ignores DEF: ogre (1500 LP) destroyed');
// my own monster can be targeted too
S=game();p=T.P(S,0);S.turn=2;S.phase='main1';S.active=0;p.hand=[];give(p,54,'fireball');p.m[0]=mon(63,'tidewisp');
assert.equal(T.apply(S,0,{t:'activate',uid:54}),null);assert(S.pending.options.some(o=>o.value==='m:0:0'));T.apply(S,0,{t:'choose',value:'m:0:0'});flush(S);assert(!p.m[0],'own tidewisp destroyed');

// ---- Fireball graveyard recovery: pay 1500, once per turn
S=game();p=T.P(S,0);S.turn=2;S.phase='main1';S.active=0;p.lp=8000;p.gy.push({uid:70,id:'fireball'});p.hand=[];
assert(T.canFireBack(S,0,70),'can recover');
assert.equal(T.apply(S,0,{t:'fireBack',uid:70}),null);assert.equal(p.lp,6500);assert(p.hand.some(c=>c.uid===70)&&!p.gy.some(c=>c.uid===70),'back in hand');
p.gy.push({uid:71,id:'fireball'});assert(!T.canFireBack(S,0,71),'once per turn');
S.turn=3;assert(T.canFireBack(S,0,71),'next turn ok');p.lp=1500;assert(!T.canFireBack(S,0,71),'needs more than 1500 LP');

// ---- Skyfire Judgment: thunder damage equal to the caster's LP to every opposing monster's LP
S=game();p=T.P(S,0);S.turn=2;S.phase='main1';S.active=0;p.hand=[];give(p,80,'skyfire');p.lp=2200;
T.P(S,1).m[0]=mon(81,'ogre');T.P(S,1).m[1]=mon(82,'ouroth');T.P(S,1).m[2]=mon(83,'ashblade','def');
assert.equal(T.apply(S,0,{t:'activate',uid:80}),null);flush(S);
assert(!T.P(S,1).m[0],'ogre (1500 LP) destroyed by 2200');assert(T.P(S,1).m[1]&&T.monLp(S,T.P(S,1).m[1])===1300,'ouroth (3500 LP) holds with 1300');assert(!T.P(S,1).m[2],'ashblade in Defense (1500 LP) destroyed');
assert(S.log.some(l=>/Thunder effect damage/.test(l.text)),'thunder log');
assert.equal(T.CARDS.hole.destroyType,'dark');assert.equal(T.CARDS.ring.destroyType,'fire');assert.equal(T.CARDS.skyfire.dmgType,'thunder');

// ---- Berserk
S=game();p=T.P(S,0);S.turn=3;S.phase='main1';S.active=0;
p.m[0]=mon(90,'ogre','def',{summonedTurn:1});T.setBerserk(S,0,0);
assert(p.m[0].berserk&&S.log.some(l=>/goes berserk/.test(l.text)));
// def -> atk is allowed manually, atk -> def is not
assert(T.canChangePos(S,0,0),'berserk in defense may stand up');p.m[0].pos='atk';assert(!T.canChangePos(S,0,0),'berserk cannot go to defense');
p.m[0].pos='def';
// enemy monsters at various distances: nearest = mirrored column. Own slot 0 faces opp slot 4 (5-wide row)
const w=5;   // regular zones 0..4; slot 5 is the Frontier Field
T.P(S,1).m[4]=mon(91,'tidewisp');T.P(S,1).m[0]=mon(92,'tidewisp');
assert.equal(T.apply(S,0,{t:'toBattle'}),null);flush(S);
assert.equal(p.m[0].pos,'atk','berserk rose into attack position at battle phase');
assert(!T.P(S,1).m[4]&&T.P(S,1).m[0],'berserk charged the nearest (mirrored) monster, not the far one');
assert(S.log.some(l=>/berserk and charges/.test(l.text)));
// no monsters in reach -> direct attack
S=game();p=T.P(S,0);S.turn=3;S.phase='main1';S.active=0;p.m[1]=mon(93,'ogre','atk',{summonedTurn:1});T.setBerserk(S,0,1);
assert.equal(T.apply(S,0,{t:'toBattle'}),null);flush(S);assert.equal(T.P(S,1).lp,6000,'direct attack for 2000');
// berserk persists and lasts; a berserk monster may hit an ally if that is nearest
S=game();p=T.P(S,0);S.turn=3;S.phase='main1';S.active=0;p.m[1]=mon(94,'ogre','atk',{summonedTurn:1,boost:500});p.m[2]=mon(95,'tidewisp','atk',{summonedTurn:1});T.setBerserk(S,0,1);
T.P(S,1).m[0]=mon(96,'tidewisp');  // far corner, distance 1+|4-1|=4 vs ally at distance 1
assert.equal(T.apply(S,0,{t:'toBattle'}),null);flush(S);assert(!p.m[2]&&T.P(S,1).m[0],'berserk hit the adjacent ally');assert(p.m[1].berserk,'still berserk');
// deterministic: same seed, same actions, same hash
const run=()=>{let S=game();let p=T.P(S,0);S.turn=3;S.phase='main1';S.active=0;p.m[1]=mon(94,'ogre','atk',{summonedTurn:1});p.m[2]=mon(95,'tidewisp','atk',{summonedTurn:1});p.m[0]=mon(97,'tidewisp','atk',{summonedTurn:1});T.setBerserk(S,0,1);T.apply(S,0,{t:'toBattle'});flush(S);return T.netHash(S);};
assert.equal(run(),run(),'berserk random pick is deterministic');
console.log('PASS: allied battle damage, Fireball (player/monster/own, hold vs destroy, GY recovery once per turn), Skyfire Judgment thunder damage, effect attributes, Berserk (position lock, stand up, nearest target, direct attack, ally hit, deterministic)');
