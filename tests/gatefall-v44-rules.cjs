const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
js+='\n;globalThis.T={CARDS,newGame,apply,P,canAct,canBattle,setBerserk,isBerserk,canActivateHand,bossSeat,netHash};';
const ctx={document:{addEventListener(){}},console,Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const T=ctx.T;
const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
function flush(S){for(let n=0;n<40&&S.pending;n++){const pd=S.pending;if(pd.type==='respond')T.apply(S,pd.player,{t:'respond',value:null});else if(pd.kind==='first')T.apply(S,pd.player,{t:'choose',value:'b:first'});else break;}if(!S.pending&&S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});return S;}
function coop(){let S=T.newGame(11,['A','B','Boss'],[Array(60).fill('ashblade'),Array(60).fill('ashblade'),[]],null,['warden','tactician','warden'],'gloop',true);flush(S);return S;}
function duel(){let S=T.newGame(11,['A','B'],[Array(60).fill('ashblade'),Array(60).fill('ashblade')],null,['warden','tactician'],null,false);flush(S);return S;}

// ---- shared co-op turn: both act, phases are shared, ready keeps the phase
let S=coop();assert(S.coop);
// skip to the hunters' turn 3 (draws done)
const toHunters=()=>{while(!(S.active!==T.bossSeat(S)&&S.turn>=3&&S.phase==='main1')){if(S.pending)flush(S);else if(S.phase==='draw'){for(const j of S.drawWait.slice())T.apply(S,j,{t:'draw'});}else if(S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});else T.apply(S,S.active,{t:'endTurn'});}};
toHunters();
assert(S.log.some(l=>/Turn 3: the hunters/.test(l.text)),'turn label names the hunters');
assert(T.canAct(S,0)&&T.canAct(S,1),'both hunters act');
// A summons, then B summons, in the same main phase
const A=T.P(S,0),B=T.P(S,1);const ca=A.hand.find(c=>c.id==='ashblade'),cb=B.hand.find(c=>c.id==='ashblade');
assert.equal(T.apply(S,0,{t:'summon',uid:ca.uid,tributes:[]}),null);flush(S);
assert.equal(T.apply(S,1,{t:'summon',uid:cb.uid,tributes:[]}),null);flush(S);
assert(A.m.some(z=>z&&z.card.uid===ca.uid)&&B.m.some(z=>z&&z.card.uid===cb.uid),'both summoned in one shared Main Phase');
// B enters the Battle Phase for both; A readies there; B goes on in the same phase
assert.equal(T.apply(S,1,{t:'toBattle'}),null);flush(S);assert.equal(S.phase,'battle');
assert.equal(T.apply(S,0,{t:'endTurn'}),null);flush(S);
assert.equal(S.phase,'battle','phase kept after A is ready');assert(S.hunterReady[0]&&!S.hunterReady[1]);assert(!T.canAct(S,0)&&T.canAct(S,1));
assert(S.log.some(l=>/A are ready|A is ready/.test(l.text)&&/carries on from the Battle Phase/.test(l.text)),'ready log names the phase');
assert.equal(T.apply(S,1,{t:'toMain2'}),null);assert.equal(S.phase,'main2');
assert.equal(T.apply(S,1,{t:'endTurn'}),null);flush(S);
assert.equal(S.active,T.bossSeat(S),'boss turn after both ready');assert.deepEqual(S.hunterReady,{});

// ---- berserk: can't skip the Battle Phase
S=duel();const p=T.P(S,0);while(!(S.active===0&&S.turn>=3&&S.phase==='main1')){if(S.pending)flush(S);else if(S.phase==='draw'){for(const j of S.drawWait.slice())T.apply(S,j,{t:'draw'});}else if(S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});else T.apply(S,S.active,{t:'endTurn'});}
p.m[0]=mon(300,'ogre','atk',{summonedTurn:1});T.setBerserk(S,0,0);
assert.equal(T.apply(S,0,{t:'endTurn'}),"A berserk monster has to battle: enter the Battle Phase first.");
assert.equal(T.apply(S,0,{t:'toBattle'}),null);flush(S);
assert(p.m[0].attacked||S.phase!=='main1','berserk charged in battle');
assert.equal(T.apply(S,0,{t:'toMain2'}),null);assert.equal(T.apply(S,0,{t:'endTurn'}),null,'end turn allowed after battling');
// not on turn 1 (no battle possible)
S=duel();if(S.active===0&&S.turn===1){T.P(S,0).m[0]=mon(301,'ogre');T.setBerserk(S,0,0);assert.equal(T.apply(S,0,{t:'endTurn'}),null,'turn 1 has no Battle Phase to skip');}

// ---- Berserker Call
assert(T.CARDS.bcall&&T.CARDS.bcall.quick&&T.CARDS.bcall.bigArt);
S=duel();const q=T.P(S,0);while(!(S.active===0&&S.turn>=3&&S.phase==='main1')){if(S.pending)flush(S);else if(S.phase==='draw'){for(const j of S.drawWait.slice())T.apply(S,j,{t:'draw'});}else if(S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});else T.apply(S,S.active,{t:'endTurn'});}
q.hand=[{uid:400,id:'bcall'}];q.m[0]=mon(401,'ogre');q.m[1]=mon(402,'ashblade','def',{faceDown:true});T.P(S,1).m[2]=mon(403,'tidewisp');
assert(T.canActivateHand(S,0,400),'usable');
assert.equal(T.apply(S,0,{t:'activate',uid:400}),null);flush(S);
assert(T.isBerserk(q.m[0])&&T.isBerserk(T.P(S,1).m[2]),'face-up monsters on both sides are berserk');assert(!q.m[1].berserk,'face-down untouched');
assert(S.log.some(l=>/gorilla screams/.test(l.text)));
console.log('PASS: shared co-op turn (joint main phase, shared battle phase, ready keeps phase, boss after both), berserk must-battle rule, Berserker Call');
