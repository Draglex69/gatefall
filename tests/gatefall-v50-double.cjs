/* v50: Double Damage, a property like Flight, and Crushhorn Rhino (Level 4). Run: node tests/gatefall-v50-double.cjs */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
js+='\n;globalThis.T={CARDS,DECK,newGame,apply,P,monBaseLp,monLp,hasDouble,battleDestructionTargets,netHash,isEffectMon};';
const ctx={document:{addEventListener(){}},console,Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const T=ctx.T;
function flush(S){for(let n=0;n<40&&S.pending;n++){const pd=S.pending;if(pd.type==='respond')T.apply(S,pd.player,{t:'respond',value:null});else if(pd.kind==='first')T.apply(S,pd.player,{t:'choose',value:'b:first'});else break;}if(!S.pending&&S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});return S;}
const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
function game(){const S=T.newGame(7,['A','B'],[Array(60).fill('ashblade'),Array(60).fill('ashblade')],null,['trickster','trickster']);flush(S);S.turn=2;S.phase='battle';S.active=0;return S;}
const atk=(S,slot,target,extra={})=>{const e=T.apply(S,0,{t:'attack',slot,tp:1,target,...extra});flush(S);return e;};
let S,a,b;
// the card
const d=T.CARDS.rhino;assert(d&&d.level===4&&d.doubleDmg&&T.isEffectMon(d),'Level 4 Effect monster with Double Damage');
assert(T.DECK.includes('rhino'),'in the base deck');assert.equal(T.monBaseLp({id:'rhino'}),1400);
// direct attack: twice its ATK
S=game();b=T.P(S,1);T.P(S,0).m[0]=mon(10,'rhino');assert.equal(atk(S,0,null),null);assert.equal(b.lp,8000-2800,'direct attack for 2 x 1400');
assert(S.log.some(l=>/Double damage!/.test(l.text)),'logged');
// against an Attack Position monster: the doubled gap hits its LP, the rest carries over
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');b.m[0]=mon(20,'tidewisp');
atk(S,0,0);assert(!b.m[0],'1000 x 2 = 2000 against 1000 LP: destroyed');assert.equal(b.lp,7000,'1000 carries over');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');b.m[0]=mon(20,'vellum');
atk(S,0,0);assert.equal(T.monLp(S,b.m[0]),1100-400,'200 gap doubled to 400');
// against Defense: only the part above DEF, doubled
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino',undefined,{boost:1000});b.m[0]=mon(20,'bastion','def');
atk(S,0,0);assert.equal(T.monLp(S,b.m[0]),1500-800,'2400 vs 2000 DEF: 400 doubled');
// damage it takes, or recoil, is not doubled
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');b.m[0]=mon(20,'ashblade');
atk(S,0,0);assert.equal(T.monLp(S,a.m[0]),1400-500,'losing: takes the plain gap');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');b.m[0]=mon(20,'bastion','def');
atk(S,0,0);assert.equal(a.lp,8000-600,'recoil from a higher DEF is not doubled');
// team attacks are not doubled
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');a.m[1]=mon(11,'ogre');b.m[0]=mon(20,'ouroth');
assert.equal(atk(S,0,0,{team:[1]}),null);assert.equal(T.monLp(S,b.m[0]),3500,'3400 vs 4000: team loses');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino',undefined,{boost:600});a.m[1]=mon(11,'ogre');b.m[0]=mon(20,'ouroth');
atk(S,0,0,{team:[1]});assert.equal(T.monLp(S,b.m[0]),3500,'equal: nothing');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino',undefined,{boost:1000});a.m[1]=mon(11,'ogre');b.m[0]=mon(20,'ouroth');
atk(S,0,0,{team:[1]});assert.equal(T.monLp(S,b.m[0]),3500-400,'team gap not doubled');
// a property like Flight: an effect can give it to any monster (z.doubleDmg); Skill Drain stops only the card's own
S=game();b=T.P(S,1);T.P(S,0).m[0]=mon(10,'ogre',undefined,{doubleDmg:true});assert(T.hasDouble(S,T.P(S,0).m[0]));atk(S,0,null);assert.equal(b.lp,8000-4000,'given Double Damage');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');a.m[1]=mon(11,'ogre',undefined,{doubleDmg:true});a.st[0]={card:{uid:30,id:'skilldrain'},faceDown:false,live:true,setTurn:0};
assert(!T.hasDouble(S,a.m[0])&&T.hasDouble(S,a.m[1]),'Skill Drain negates the card text, not a given property');
atk(S,0,null);assert.equal(b.lp,8000-1400,'drained Rhino hits for 1400');
// the protection prompts see the doubled damage coming
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rhino');b.m[0]=mon(20,'vellum',undefined,{lp:300});
assert.equal(T.battleDestructionTargets(S,{ai:0,dp:1,slot:0,uid:10,target:0,tuid:20}).length,1,'200 x 2 = 400 >= 300 LP: predicted');
// determinism
const run=()=>{const s=game();T.P(s,0).m[0]=mon(10,'rhino');T.P(s,1).m[0]=mon(20,'tidewisp');T.apply(s,0,{t:'attack',slot:0,tp:1,target:0});flush(s);return T.netHash(s);};
assert.equal(run(),run());
console.log('PASS: Crushhorn Rhino and Double Damage (direct, vs Attack, vs Defense, overflow, not on losses/recoil/teams, given by effects, Skill Drain, predictions)');
