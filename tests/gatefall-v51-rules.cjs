/* v51 checkup: rules fixes found by the full audit. Run: node tests/gatefall-v51-rules.cjs */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
js+='\n;globalThis.T={CARDS,BOSSES,newGame,apply,P,monLp,monMaxLp,destroyMonster,botAction,netHash,sweepTokens};';
const ctx={document:{addEventListener(){}},console:{log(){},warn(){},error(){}},Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const T=ctx.T;
function flush(S){for(let n=0;n<40&&S.pending;n++){const pd=S.pending;if(pd.type==='respond')T.apply(S,pd.player,{t:'respond',value:null});else if(pd.kind==='first')T.apply(S,pd.player,{t:'choose',value:'b:first'});else break;}if(!S.pending&&S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});return S;}
const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
function game(){const S=T.newGame(7,['A','B'],[Array(60).fill('ashblade'),Array(60).fill('ashblade')],null,['trickster','trickster']);flush(S);S.turn=2;S.phase='battle';S.active=0;for(const p of S.players)p.hand=[];return S;}
const deck=Array(40).fill('ashblade');
let S,a,b;

// 1. co-op hunts: the boss starts with its 3 powers (they were wiped right after setup)
for(const id of Object.keys(T.BOSSES)){
  const co=T.newGame(3,['A','B','Boss'],[deck,deck,[]],null,null,id,true);
  assert.equal(co.players[2].st.filter(Boolean).length,T.BOSSES[id].abil.length,`co-op ${id} has its powers`);
}

// 2. the boss's Standby Phase runs: Regenerating Ooze heals, a destroyed power returns; Mitosis isn't swept as a token
S=T.newGame(5,['A','Boss'],[deck,[]],null,null,'gloop');flush(S);
{ const bp=T.P(S,1);S.active=0;S.phase='main1';S.turn=2;S.pending=null;bp.lp=3000;
  const gk=bp.st.findIndex(z=>z&&z.card.id==='ab_split');const split=bp.st[gk].card;bp.st[gk]=null;bp.gy.push(split);
  T.sweepTokens(S);assert(bp.gy.some(c=>c.uid===split.uid),'Mitosis stays in the Graveyard (not a token)');
  for(let n=0;n<40&&S.winner==null&&S.turn<14;n++){
    const who=S.active;
    if(S.pending){const pd=S.pending;T.apply(S,pd.player,pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:pd.options[pd.options.length-1].value});continue;}
    if(S.phase==='draw'){for(const j of (S.drawWait||[]))T.apply(S,j,{t:'draw'});continue;}
    if(S.phase==='standby'){T.apply(S,who,{t:'toMain1'});flush(S);continue;}
    const e=T.apply(S,who,{t:'endTurn'});if(e){T.apply(S,who,{t:'toBattle'});T.apply(S,who,{t:'toMain2'});T.apply(S,who,{t:'endTurn'});}
  }
  assert(S.log.some(l=>/regains 800 LP \(Regenerating Ooze\)/.test(l.text)),'Regenerating Ooze heals the boss');
  assert(bp.lp>3000,'boss LP went up');
  assert(bp.st.some(z=>z&&z.card.uid===split.uid),'Mitosis manifests again');
}

// 3. Ironheart Warden on the field: every monster a lost team attack would destroy is asked about before the battle
const putWarden=(S,o,slot,uid)=>{const q=T.P(S,o);q.hero={id:'warden',used:true,card:{uid,id:'warden'},field:true};q.m[slot]=mon(uid,'warden','def');};
for(const [answers,expect] of [[['b:no','b:no'],'- - warden'],[['b:yes'],'ashblade:1 - -'],[['b:no','b:yes'],'- ashblade:1 -']]){
  S=game();a=T.P(S,0);b=T.P(S,1);putWarden(S,0,2,90);
  a.m[0]=mon(10,'ashblade','atk',{lp:100});a.m[1]=mon(11,'ashblade','atk',{lp:100});b.m[0]=mon(20,'ouroth');
  assert.equal(T.apply(S,0,{t:'attack',slot:0,tp:1,target:0,team:[1]}),null);flush(S);
  const asked=[],q=[...answers];
  while(S.pending&&S.pending.kind==='wardenSaveBattle'){asked.push(S.pending.slot);T.apply(S,0,{t:'choose',value:q.shift()});flush(S);}
  assert.deepEqual(asked,answers.length===1?[0]:[0,1],'asked in order before the battle');
  assert(!S.pending,'nothing left hanging');
  assert.equal(a.m.slice(0,3).map(z=>z?(z.card.id==='warden'?'warden':z.card.id+':'+T.monLp(S,z)):'-').join(' ').replace(/warden$/,'warden'),expect.replace('- - warden','- - warden'),'result for '+answers);
}

// 4. Mercy Colossus: its battle damage heals instead, for monsters too, and when it is attacked
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'mercy');b.m[0]=mon(20,'ashblade');
T.apply(S,0,{t:'attack',slot:0,tp:1,target:0});flush(S);
assert(b.m[0]&&T.monLp(S,b.m[0])===T.monMaxLp(S,b.m[0])&&b.lp===8600,'Mercy attacking: monster untouched, its player gains 600');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ashblade');b.m[0]=mon(20,'mercy');
T.apply(S,0,{t:'attack',slot:0,tp:1,target:0});flush(S);
assert(a.m[0]&&T.monLp(S,a.m[0])===T.monMaxLp(S,a.m[0])&&a.lp===8600,'Mercy attacked: attacker untouched, its player gains 600');

// 5. Rampart Ram drained in the chain stops instead of fighting with 700 ATK in Defense Position
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'rampart','def');b.m[0]=mon(20,'ashblade');
b.st[0]={card:{uid:30,id:'skilldrain'},faceDown:true,setTurn:0,controller:1};
T.apply(S,0,{t:'attack',slot:0,tp:1,target:0});
{ const sd=S.pending&&S.pending.options.find(o=>o.eff==='skilldrain');assert(sd,'Skill Drain offered');T.apply(S,1,{t:'respond',value:sd.value});flush(S); }
assert(a.m[0]&&T.monLp(S,a.m[0])===T.monMaxLp(S,a.m[0])&&b.m[0]&&T.monLp(S,b.m[0])===T.monMaxLp(S,b.m[0]),'the attack stops: nobody hurt');
assert(S.log.some(l=>/can no longer attack from Defense Position/.test(l.text)));

// 6. Velvet Nyx never steals from a co-op partner
S=T.newGame(11,['A','B','Boss'],[deck,deck,[]],null,['burglar','trickster'],'gloop',true);flush(S);
S.turn=3;S.phase='battle';S.active=0;S.pending=null;a=T.P(S,0);b=T.P(S,1);a.m.fill(null);b.m.fill(null);
a.m[0]=mon(10,'kitten');b.m[1]=mon(20,'vellum','atk',{lp:50});b.hand=[{uid:70,id:'fortune'},{uid:71,id:'gale'}];
{ const ah=a.hand.length;T.apply(S,0,{t:'attack',slot:0,tp:1,target:1});flush(S);assert.equal(b.hand.length,2,'partner keeps the hand');assert.equal(a.hand.length,ah); }

// 7. Graveseed: no battle prompt for tokens or for monsters that endure anyway
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre');b.m[0]=mon(20,'sheep','atk');b.gy.push({uid:30,id:'graveseed'});
T.apply(S,0,{t:'attack',slot:0,tp:1,target:0});assert(!(S.pending&&S.pending.kind==='gyBattle'),'no prompt for a token');flush(S);
assert(b.gy.some(c=>c.id==='graveseed'),'Graveseed kept');
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre');b.m[0]=mon(20,'twinsoul','atk',{lp:100});b.gy.push({uid:30,id:'graveseed'});
T.apply(S,0,{t:'attack',slot:0,tp:1,target:0});assert(!(S.pending&&S.pending.kind==='gyBattle'),'no prompt when Twinsoul endures');flush(S);
assert(b.m[0]&&T.monLp(S,b.m[0])===1&&b.gy.some(c=>c.id==='graveseed'),'Twinsoul endures at 1 LP, Graveseed kept');

// 8. Show Off's petrified monsters can't block (same as Petrified Titan)
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'ogre');
b.m[0]=mon(20,'bastion','def',{petrifiedUntil:S.turn,showOff:S.turn});b.m[1]=mon(21,'titan','def');
T.apply(S,0,{t:'attack',slot:0,tp:1,target:null});
assert(!(S.pending&&S.pending.options||[]).some(o=>/Bastion|Titan/.test(o.label)),'no petrified blockers');

// 9. the bot keeps Veilmoth Sprite when its monster's LP absorbs the whole hit
S=game();a=T.P(S,0);b=T.P(S,1);a.m[0]=mon(10,'kaiju','atk',{boost:900});b.m[0]=mon(20,'ogre');b.hand=[{uid:40,id:'veilmoth'}];
T.apply(S,0,{t:'attack',slot:0,tp:1,target:0});
if(S.pending&&S.pending.player===1){const act=T.botAction(S,1);assert(!(act&&/40/.test(String(act.value))),'Veilmoth kept');}

// 10. a phased-out monster comes back as hurt as it left
S=game();a=T.P(S,0);S.phase='main1';a.m[0]=mon(10,'phantom','atk',{lp:100});
assert.equal(T.apply(S,0,{t:'xyzEff',slot:0,n:0}),null);flush(S);
S.active=1;S.turn++;T.apply(S,1,{t:'endTurn'});flush(S);
for(let n=0;n<6&&S.phase!=='main1';n++){if(S.phase==='draw')for(const j of S.drawWait||[])T.apply(S,j,{t:'draw'});flush(S);}
{ const z=a.m.find(x=>x&&x.card.uid===10);assert(z,'Phantom is back');assert.equal(T.monLp(S,z),100,'still at 100 LP'); }

// 11. texts follow the Monster LP rule
for(const id of ['fireball','skyfire'])assert(!/destroyed if the damage beats/.test(T.CARDS[id].text),id+' text');
assert(/direct attack deals its DEF/.test(T.CARDS.rampart.text),'Rampart Ram explains its direct attack');
assert(!/weaker monster is destroyed/.test(html),'rules sheet uses the LP rule');
console.log('v51 rules: all checks passed');
