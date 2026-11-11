const {load}=require('./fuzz-lib.cjs');const assert=require('assert');const T=load();
const deck=T.countsToList(T.STARTER);
const S=T.newGame(3,['A','B','C','D'],[deck,deck,deck,deck],null,null,null,false,false,false,true);
while(S.pending)T.apply(S,S.pending.player,S.pending.type==='respond'?{t:'respond',value:null}:{t:'choose',value:'b:first'});
const a=S.active,b=T.liveTeam(S,a).find(j=>j!==a);
const mon=id=>({uid:900+Math.random()*1e6|0,id});
T.P(S,a).hand.push({uid:7001,id:'ashblade'});T.P(S,b).hand.push({uid:7002,id:'ashblade'});
assert.equal(T.apply(S,a,{t:'summon',uid:7001,tributes:[],zone:20}),null,'A claims FF 0');
while(S.pending)T.apply(S,S.pending.player,{t:'respond',value:null});
T.P(S,b).normalSummoned=false;
assert.equal(T.apply(S,b,{t:'summon',uid:7002,tributes:[],zone:21}),null,'partner claims FF 1 while A holds FF 0');
// 2v2 positions 2 and 3 are their own zones, not monster zones 7/8
const c=T.liveTeam(S,a).length?S.players.findIndex((_,j)=>!T.liveTeam(S,a).includes(j)):2;
T.P(S,a).hand.push({uid:7003,id:'ashblade'});T.P(S,a).normalSummoned=false;
assert.equal(T.apply(S,a,{t:'summon',uid:7003,tributes:[],zone:7}),null,'ordinary zone 7 still a monster zone');
const z7=T.P(S,a).m[7];assert(z7&&z7.card.uid===7003,'zone 7 is the 6th shared monster zone');
assert.deepEqual(Array.from(S.ffPos).slice(0,2).sort(),[0,1].sort(),'FF 0 and 1 claimed by the team');
console.log('PASS: partners each use their own Frontier Field on a shared field');
