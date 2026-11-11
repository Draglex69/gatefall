const {chromium}=require('playwright');const assert=require('assert');
const URL='http://localhost:3000',sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true});
 const host=await (await browser.newContext({viewport:{width:1100,height:850}})).newPage();
 const guest=await (await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})).newPage();
 const pages=[host,guest],errors=[];for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
 const snap=p=>p.evaluate(()=>({me:ME,turn:S&&S.turn,active:S&&S.active,phase:S&&S.phase,pend:S&&S.pending&&{p:S.pending.player,t:S.pending.type,k:S.pending.kind},dw:S&&S.drawWait,n:Net.acts.length,h:S&&netHash(S),win:S&&S.winner,ready:S&&S.hunterReady}));
 await Promise.all(pages.map(p=>p.goto(URL,{waitUntil:'networkidle'})));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>roomChecked&&RoomNS)));
 await Promise.all(pages.map(p=>p.evaluate(()=>setBanners(false))));
 await host.locator('[data-go="lobby"]').click();await host.locator('[data-net="host"]').click();
 await host.waitForFunction(()=>Net.role==='host'&&Net.r&&Net.code.length===4);
 await host.locator('[data-net="tagon"]').click();
 const code=await host.evaluate(()=>Net.code);
 await guest.locator('[data-go="lobby"]').click();await guest.locator('#nick').fill('Ally');await guest.locator('#joinCode').fill(code.toUpperCase());await guest.locator('[data-net="join"]').click();
 await host.waitForFunction(()=>Net.guests.length===1,{timeout:15000});
 await guest.waitForFunction(()=>Net.lobby&&Net.lobby.tag,{timeout:15000});
 const guestLobby=await guest.locator('#lobbyView').innerText();assert(/2v2 Tag Team/.test(guestLobby)&&/Team 2/.test(guestLobby),'guest sees the 2v2 lobby');
 await host.screenshot({path:'./test-output/online-tag-lobby.png'});
 await host.locator('[data-net="start"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>ui.view==='game'&&S&&S.tag,{timeout:20000})));
 const setup=await host.evaluate(()=>({names:S.players.map(p=>p.name),bots:Net.bots,teams:S.players.map((_,j)=>teamNo(S,j))}));
 console.log('setup',JSON.stringify(setup));assert.deepEqual(setup.teams,[0,0,1,1]);assert.deepEqual(setup.bots,[2,3]);
 // both humans play their seats with the bot brain; the host also runs the two rival bots
 const t0=Date.now();let rounds=0;
 while(Date.now()-t0<240000){
   rounds++;
   const st=await Promise.all(pages.map(snap));
   if(st[0].win!=null&&st[1].win!=null)break;
   for(const [i,p] of pages.entries()){
     await p.evaluate(()=>{
       if(!S||S.winner!=null||ui.busy)return;
       const pd=S.pending;
       if(pd&&pd.player===ME){dispatch(pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:botChoose?botChoose(S,pd):pd.options[0].value});return;}
       if((S.drawWait||[]).includes(ME)){dispatch({t:'draw'});return;}
       if(canAct(S,ME)){let a=botAction(S,ME);if(a&&a.t==='endTurn'&&S.phase==='main1'&&canBattle(S,ME)&&P(S,ME).m.some(z=>isBerserk(z)))a={t:'toBattle'};dispatch(a||{t:'endTurn'});}
     }).catch(()=>{});
   }
   await sleep(350);
   if(rounds%25===0){const [a,b]=st;console.log('turn',a.turn,'phase',a.phase,'n',a.n,b.n,'hash',a.h===b.h?'same':'DIFF');}
   globalThis.lastN=globalThis.lastN||[0,0];if(st[0].n===globalThis.lastN[0]){globalThis.stuck=(globalThis.stuck||0)+1;}else{globalThis.stuck=0;globalThis.lastN=[st[0].n,0];}
   if(globalThis.stuck===20){for(const [i,p] of pages.entries())console.log('STUCK side',i,JSON.stringify(await p.evaluate(()=>({me:ME,active:S.active,phase:S.phase,ready:S.hunterReady,pend:S.pending&&{p:S.pending.player,k:S.pending.kind,t:S.pending.type},dw:S.drawWait,canMe:canAct(S,ME),bots:Net.bots,isBotActive:isBotSeat(S.active),plan:(()=>{try{const pl=botPlan(S,isBotSeat,ui.botSkip);return pl&&{seat:pl.seat,a:pl.a};}catch(e){return 'ERR '+e.message}})(),myBot:canAct(S,ME)?botAction(S,ME):null,busy:ui.busy,skip:[...(ui.botSkip||[])],log:S.log.slice(-4).map(l=>l.text)}))));}
 }
 // let the relay settle and compare
 let ok=false;for(let k=0;k<40;k++){const [a,b]=await Promise.all(pages.map(snap));if(a.n===b.n&&a.h===b.h){ok=true;console.log('final',JSON.stringify({n:a.n,turn:a.turn,win:a.win}));break;}await sleep(300);}
 assert(ok,'host and guest ended with the same state');
 const won=await Promise.all(pages.map(p=>p.evaluate(()=>S.winner!=null?(sameTeam(S,S.winner,ME)?'won':'lost'):'running')));
 console.log('result per side',won);if(won[0]!=='running')assert.equal(won[0],won[1],'teammates share the result');
 await guest.screenshot({path:'./test-output/online-tag-guest.png'});
 console.log('PASS online 2v2; errors',errors);
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
