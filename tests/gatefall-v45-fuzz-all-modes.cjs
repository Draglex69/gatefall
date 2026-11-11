const {load,play,cardUids}=require('./fuzz-lib.cjs');
const T=load();const N=+(process.argv[2]||20);
const deck=T.countsToList(T.STARTER);
const modes={
  duel:s=>T.newGame(s,['A','B'],[deck,deck]),
  ffa3:s=>T.newGame(s,['A','B','C'],[deck,deck,deck]),
  ffa4:s=>T.newGame(s,['A','B','C','D'],[deck,deck,deck,deck]),
  hunt_gloop:s=>T.newGame(s,['A','Boss'],[deck,[]],null,null,'gloop'),
  hunt_kong:s=>T.newGame(s,['A','Boss'],[deck,[]],null,null,'kong'),
  coop_morvane:s=>T.newGame(s,['A','B','Boss'],[deck,deck,[]],null,null,'morvane',true),
  coop_cindermaw:s=>T.newGame(s,['A','B','Boss'],[deck,deck,[]],null,null,'cindermaw',true),
  coop_split:s=>T.newGame(s,['A','B','Boss'],[deck,deck,[]],null,null,'skarra',true,false,true),
  tag:s=>T.newGame(s,['A','B','C','D'],[deck,deck,deck,deck],null,null,null,false,false,false,true),
};
const report={};
for(const [name,mk] of Object.entries(modes)){
  const r={games:0,done:0,stalls:0,exc:0,errs:0,dups:0,badLp:0,bossAttacks:0,turns:0};report[name]=r;
  for(let seed=1;seed<=N;seed++){
    let S;try{S=mk(seed*7919+name.length);}catch(e){r.exc++;console.log(name,seed,'EXC setup',e.message);continue;}
    const before=new Set(cardUids(S));
    let res;try{res=play(T,S,{onAct:(seat,a)=>{if(a.t==='attack'&&S.players[seat].isBoss)r.bossAttacks++;}});}catch(e){r.exc++;console.log(name,seed,'EXC',e.stack.split('\n').slice(0,3).join(' | '));continue;}
    r.games++;r.turns+=S.turn;if(res.done)r.done++;
    if(res.stall){r.stalls++;if(r.stalls<=2)console.log(name,seed,'STALL',JSON.stringify(res).slice(0,300));}
    if(res.errors.length){r.errs+=res.errors.length;if(r.errs<=3)console.log(name,seed,'REFUSED',JSON.stringify(res.errors.slice(0,2)).slice(0,300));}
    if(S.players.some(p=>!Number.isFinite(p.lp)||p.lp<0))r.badLp++;
    const u=cardUids(S);const d=u.filter((x,i)=>u.indexOf(x)!==i);if(d.length){r.dups++;if(r.dups<=2)console.log(name,seed,'DUP',d.slice(0,4));}
    const lost=[...before].filter(x=>!u.includes(x));if(lost.length){r.lost=(r.lost||0)+1;if(r.lost<=2)console.log(name,seed,'LOST uids',lost.slice(0,5));}
  }
}
console.log(JSON.stringify(report,null,0));
