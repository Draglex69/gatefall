// shared headless driver: every seat is a bot, using the game's own botPlan
const fs=require('fs'),vm=require('vm');
function load(path){
  const html=fs.readFileSync(path||'./index.html','utf8');
  let js=html.split('<script>')[1].split('</script>')[0].split('document.addEventListener("click"')[0];
  js+='\n;globalThis.T={CARDS,DECK,STARTER,BOSSES,countsToList,newGame,apply,P,canAct,canBattle,botAction,botPlan,opponents,teamNo,mate,liveTeam,netHash,alive,PHASE_MOVES};';
  const ctx={document:{addEventListener(){}},console:{log(){},warn(){},error:console.error},Math,JSON,setTimeout,clearTimeout,setInterval,clearInterval,WeakMap,Map,Set,Promise,performance:{now:()=>0}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(js,ctx);
  return ctx.T;
}
function play(T,S,{maxSteps=6000,onAct}={}){
  let steps=0,last='',same=0,skipKey='',skip=new Set(),errors=[];
  while(S.winner==null&&steps++<maxSteps){
    const key=S.turn+':'+S.phase;if(key!==skipKey){skipKey=key;skip=new Set();}
    const plan=T.botPlan(S,()=>true,skip);
    if(!plan){return {stall:'no plan',steps,errors,state:{phase:S.phase,active:S.active,ready:S.hunterReady,pending:S.pending&&S.pending.kind,dw:S.drawWait}};}
    const {seat,a}=plan;let err=a?T.apply(S,seat,a):'none';
    if(onAct&&!err)onAct(seat,a);
    if(err){
      const pd=S.pending,real=a&&!T.PHASE_MOVES.includes(a.t)&&a.t!=='draw';
      if(real&&!(pd&&pd.player===seat))skip.add(seat);
      else{const fb=pd&&pd.player===seat?(pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:pd.options[0].value}):(S.drawWait||[]).includes(seat)?{t:'draw'}:T.canAct(S,seat)?{t:'endTurn'}:null;
        let e2=fb?T.apply(S,seat,fb):'nofb';if(e2&&fb&&fb.t==='endTurn'&&S.phase==='main1')e2=T.apply(S,seat,{t:'toBattle'});
        if(e2)errors.push([JSON.stringify(a),err,e2]);}
    }
    const sig=JSON.stringify([S.turn,S.phase,S.active,S.pending&&S.pending.kind,S.pending&&S.pending.player,S.hunterReady,S.players.map(p=>[p.lp,p.hand.length,p.deck.length,p.m.filter(Boolean).length])]);
    if(sig===last){if(++same>80)return {stall:'loop',steps,errors,sig};}else{same=0;last=sig;}
  }
  return {steps,errors,done:S.winner!=null};
}
function cardUids(S){
  const all=[];for(const p of S.players){for(const c of [...p.deck,...p.hand,...p.gy,...p.extra])all.push(c.uid);for(const z of p.m)if(z){all.push(z.card.uid);(z.mats||[]).forEach(c=>all.push(c.uid));}}
  const st=new Set();for(const p of S.players)for(const z of p.st)if(z&&!st.has(z)){st.add(z);all.push(z.card.uid);}
  if(S.field)all.push(S.field.card.uid);for(const x of S.exiled||[])all.push(x.card.uid);
  return all;
}
module.exports={load,play,cardUids};
