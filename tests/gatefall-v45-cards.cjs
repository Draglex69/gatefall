const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
js+='\n;globalThis.T={CARDS,newGame,apply,P,canFly,attackOptions,canActivateHand,canAttack,canChangePos,botChoose,netHash};';
const ctx={document:{addEventListener(){}},console,Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
const T=ctx.T;
const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
const flush=S=>{for(let n=0;n<40&&S.pending;n++){const pd=S.pending;if(pd.type==='respond')T.apply(S,pd.player,{t:'respond',value:null});else if(pd.kind==='first')T.apply(S,pd.player,{t:'choose',value:'b:first'});else break;}return S;};
function duel(){const S=T.newGame(21,['A','B'],[Array(40).fill('ashblade'),Array(40).fill('ashblade')],null,['warden','warden']);flush(S);
  while(!(S.active===0&&S.turn>=3&&S.phase==='main1')){if(S.pending)flush(S);else if(S.phase==='draw'){for(const j of S.drawWait.slice())T.apply(S,j,{t:'draw'});}else if(S.phase==='standby')T.apply(S,S.active,{t:'toMain1'});else T.apply(S,S.active,{t:'endTurn'});}
  return S;}
// ---- Red Bull
assert(T.CARDS.redbull.quick&&T.CARDS.redbull.flavor==='Red Bull gives Wings');
let S=duel(),A=T.P(S,0),B=T.P(S,1);A.hand=[{uid:500,id:'redbull'}];
A.m=A.m.map(()=>null);B.m=B.m.map(()=>null);A.m[0]=mon(501,'ogre');B.m[5]=mon(502,'titan');S.ffPos[1]=1;
let ao=JSON.parse(JSON.stringify(T.attackOptions(S,0,0,1)));assert.deepEqual(ao,{direct:false,targets:[5]},'Frontier monster in the way before wings');
assert(T.canActivateHand(S,0,500),'Red Bull usable');
assert.equal(T.apply(S,0,{t:'activate',uid:500}),null);assert.equal(S.pending.kind,'target');
assert(S.pending.options.some(o=>o.value==='m:0:0')&&S.pending.options.some(o=>o.value==='m:1:5'),'any face-up monster');
T.apply(S,0,{t:'choose',value:'m:0:0'});flush(S);
assert(A.m[0].flight&&T.canFly(S,A.m[0]),'ogre flies');
ao=JSON.parse(JSON.stringify(T.attackOptions(S,0,0,1)));assert(ao.direct,'flies over the Frontier monster');
assert(S.log.some(l=>/grows wings/.test(l.text)));
// flight survives Skill Drain-like negation (granted, not printed)
// ---- Show Off
S=duel();A=T.P(S,0);B=T.P(S,1);
A.m=A.m.map(()=>null);B.m=B.m.map(()=>null);
A.deck=[{uid:600,id:'ogre'},{uid:601,id:'tidewisp'},{uid:602,id:'ashblade'}];B.deck=[{uid:610,id:'titan'},{uid:611,id:'cinder'}];
A.hand=[{uid:620,id:'showoff'}];
const lpA=A.lp,lpB=B.lp;
assert(T.canActivateHand(S,0,620),'Show Off usable');
assert.equal(T.apply(S,0,{t:'activate',uid:620}),null);flush(S);
assert.equal(S.pending&&S.pending.kind,'showOffPick');assert.equal(S.pending.player,0);
assert(S.pending.options.some(o=>o.value==='d:601')&&S.pending.options.some(o=>o.value==='x'));
T.apply(S,0,{t:'choose',value:'d:601'});assert.equal(S.pending.kind,'showOffPos');
T.apply(S,0,{t:'choose',value:'b:def'});   // tidewisp 2100 DEF
assert.equal(S.pending&&S.pending.kind,'showOffPick');assert.equal(S.pending.player,1);
T.apply(S,1,{t:'choose',value:'d:611'});T.apply(S,1,{t:'choose',value:'b:atk'});   // cinder 1700 ATK
flush(S);
const zA=A.m.find(z=>z&&z.card.uid===601),zB=B.m.find(z=>z&&z.card.uid===611);
assert(zA&&zA.pos==='def'&&zB&&zB.pos==='atk','both summoned in chosen positions');
assert(!A.deck.some(c=>c.uid===601)&&!B.deck.some(c=>c.uid===611),'taken from the decks');
assert.equal(A.lp,lpA+1700,'A (2100 DEF) gains the other monster\'s 1700');assert.equal(B.lp,lpB,'B gains nothing');
const kB=B.m.indexOf(zB);assert(!T.canAttack(S,1,kB),'petrified');assert(!T.canChangePos(S,0,A.m.indexOf(zA)),'petrified: no position change');
// End Phase: both go to the Graveyard
T.apply(S,0,{t:'endTurn'});flush(S);
assert(!A.m.some(z=>z&&z.card.uid===601)&&!B.m.some(z=>z&&z.card.uid===611),'gone after the End Phase');
assert(A.gy.some(c=>c.uid===601)&&B.gy.some(c=>c.uid===611),'in the Graveyards');
// tie: both get the other's value; a pass is allowed
S=duel();A=T.P(S,0);B=T.P(S,1);A.m=A.m.map(()=>null);B.m=B.m.map(()=>null);
A.deck=[{uid:700,id:'ogre'}];B.deck=[{uid:710,id:'ogre'}];A.hand=[{uid:720,id:'showoff'}];const a0=A.lp,b0=B.lp;
T.apply(S,0,{t:'activate',uid:720});flush(S);T.apply(S,0,{t:'choose',value:'d:700'});T.apply(S,0,{t:'choose',value:'b:atk'});T.apply(S,1,{t:'choose',value:'d:710'});T.apply(S,1,{t:'choose',value:'b:atk'});flush(S);
assert.equal(A.lp,a0+2000);assert.equal(B.lp,b0+2000,'tie: both gain the other\'s ATK');
S=duel();A=T.P(S,0);B=T.P(S,1);A.m=A.m.map(()=>null);A.deck=[{uid:800,id:'ogre'}];A.hand=[{uid:820,id:'showoff'}];const a1=A.lp;
T.apply(S,0,{t:'activate',uid:820});flush(S);T.apply(S,0,{t:'choose',value:'d:800'});T.apply(S,0,{t:'choose',value:'b:atk'});
if(S.pending&&S.pending.kind==='showOffPick')T.apply(S,1,{t:'choose',value:'x'});flush(S);
assert.equal(A.lp,a1,'alone: no gain');
// bot choices
const pd={kind:'showOffPick',options:[{value:'d:1',card:'tidewisp'},{value:'d:2',card:'titan'},{value:'x'}]};assert.equal(T.botChoose(S,pd),'d:2');
assert.equal(T.botChoose(S,{kind:'showOffPos',options:[{value:'b:atk',card:'titan'},{value:'b:def',card:'titan'}]}),'b:def');
console.log('PASS: Red Bull (any face-up monster, flight over Frontier monsters, flavor text), Show Off (picks, positions, petrified, LP to the top showing, ties, passes, End Phase to Graveyard, bot choices)');
