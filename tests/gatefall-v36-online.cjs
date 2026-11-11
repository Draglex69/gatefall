const {chromium}=require('playwright');
const assert=require('assert');
const URL='http://localhost:3000';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,});
 const ctx0=await browser.newContext({viewport:{width:1100,height:850}});
 const ctx1=await browser.newContext({viewport:{width:1000,height:800}});
 const host=await ctx0.newPage(),guest=await ctx1.newPage(),pages=[host,guest];
 const errors=[];for(const p of pages)p.on('pageerror',e=>errors.push(e.message));
 const act=async(p,a)=>p.evaluate(a=>{ui.busy=false;dispatch(a);},a);
 const snap=p=>p.evaluate(()=>({me:ME,turn:S&&S.turn,active:S&&S.active,phase:S&&S.phase,pending:S&&S.pending,ready:S&&S.hunterReady,drawWait:S&&S.drawWait,n:Net.acts.length,h:netHash(S),nh:Net.hashes[Net.acts.length],hands:S&&S.players.map(p=>p.hand.length)}));
 const pass=async p=>{const s=await snap(p);if(!s.pending||s.pending.player!==s.me)return false;const pd=s.pending;if(pd.type==='respond')await act(p,{t:'respond',value:null});else if(pd.type==='choose'){const opts=pd.options||[];const v=(opts.find(o=>o.value==='b:done')||opts.find(o=>o.value==='x')||opts[0]||{}).value;if(v!=null)await act(p,{t:'choose',value:v});}return true;};
 const sync=async(timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){const [a,b]=await Promise.all([snap(host),snap(guest)]);if(a.n===b.n&&a.h===b.h&&a.nh===b.nh&&a.h===a.nh&&b.h===b.nh)return;await pass(host);await pass(guest);await sleep(180);}throw new Error('Online states did not synchronize: '+JSON.stringify([await snap(host),await snap(guest)]));};
 const wait=async(fn,timeout=45000)=>{const end=Date.now()+timeout;while(Date.now()<end){const [a,b]=await Promise.all([snap(host),snap(guest)]);if(fn(a,b))return;await pass(host);await pass(guest);await sleep(220);}throw new Error('Timed out: '+JSON.stringify([await snap(host),await snap(guest)]));};
 await Promise.all(pages.map(p=>p.goto(URL,{waitUntil:'networkidle'})));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>roomChecked&&RoomNS)));
 await Promise.all(pages.map(p=>p.evaluate(()=>setBanners(false))));
 // Host an online co-op hunt through the actual lobby.
 await host.locator('[data-go="hunt"]').click();
 await host.locator('[data-bossinfo="gloop"]').click();await host.locator('[data-cooponline="gloop"]').click();   // v48: the boss's card holds the hunt buttons
 await host.locator('[data-net="host"]').click();
 await host.waitForFunction(()=>Net.role==='host'&&Net.r&&Net.code.length===4);
 const code=await host.evaluate(()=>Net.code);
 await guest.locator('[data-go="lobby"]').click();
 await guest.locator('#nick').fill('Ally');
 await guest.locator('#joinCode').fill(code.toUpperCase());
 await guest.locator('[data-net="join"]').click();
 await host.waitForFunction(()=>Net.guests.length===1,{timeout:15000});
 await host.locator('[data-net="start"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>S&&S.coop&&Net.gid&&S.players.length===3)));
 assert.deepEqual(await host.evaluate(()=>[ME,Net.bots]),[0,[2]]);
 assert.deepEqual(await guest.evaluate(()=>[ME,Net.bots]),[1,[2]]);
 await sync();
 // Both clients render seven central positions, aligned side piles, and only hunter Frontier Fields.
 for(const p of pages){
   assert.equal(await p.locator('#oppM [data-zone^="m:2:"]').count(),7);
   assert.equal(await p.locator('#oppST [data-zone^="s:2:"]').count(),7);
   assert.equal(await p.locator('#oppST [data-zone="hero:2"]').count(),0);
   assert.equal(await p.locator('.coop-row').count(),1);
   assert.equal(await p.locator('.shared-lane').count(),1);
   assert.equal(await p.locator('.coop-strow').count(),1);
   for(const el of await p.locator('.coop-row').all()){
     assert.equal(await el.locator('[data-zone^="m:"]').count(),7);
     assert.equal(await el.locator('.zone').count(),9);
   }
   assert.equal(await p.locator('.coop-strow > .zone').count(),7);
   assert.equal(await p.locator('.coop-strow .zone').count(),9);
   const me=await p.evaluate(()=>ME);assert.deepEqual(await p.locator('.coop-strow > .zone').evaluateAll(els=>els.map(el=>el.dataset.zone)),[`s:${me}:0`,`s:${me}:1`,'hero:0',`s:${me}:2`,'hero:1',`s:${me}:3`,`s:${me}:4`]);
   assert.equal(await p.locator('.coop-strow [data-zone^="deck:"]').count(),2);
   assert.equal(await p.locator('.coop-strow [data-zone^="ex:"]').count(),2);
   const ally=1-me;
   assert.equal(await p.locator(`.pile-solo.deck > [data-zone="deck:${me}"]`).count(),1);
   assert.equal(await p.locator(`.pile-solo.deck > .partner-pile[data-zone="deck:${ally}"]`).count(),1);
   assert.equal(await p.locator(`.pile-solo.extra > [data-zone="ex:${me}"]`).count(),1);
   assert.equal(await p.locator(`.pile-solo.extra > .partner-pile[data-zone="ex:${ally}"]`).count(),1);
   assert.equal(await p.locator('.partner-pile.deck .partner-count').textContent(),String(await p.evaluate(j=>P(S,j).deck.length,ally)));
   assert.equal(await p.locator('.partner-pile.extra .partner-count').textContent(),String(await p.evaluate(j=>P(S,j).extra.length,ally)));
   assert.equal(await p.locator('#lpPartner').textContent(),String(await p.evaluate(j=>P(S,j).lp,ally)));
   assert.equal(await p.locator('.coop-name').count(),0);assert.equal(await p.locator('#hsMe .hname').count(),0);
   assert.equal(await p.locator('#oppST .pile').count(),2);assert.equal(await p.locator('#oppM .pile').count(),2);
   assert.equal(await p.locator('[data-zone^="banish:"]').count(),2);
   assert.equal(await p.locator('[data-zone^="gy:"]').count(),2);
   assert.deepEqual(await p.locator('#oppM > .pile').evaluateAll(els=>els.map(el=>el.dataset.zone)),['gy:2','banish:2']);
   assert.equal(await p.locator('#ffRow [data-zone^="ff:"]').count(),2);
 }
 await host.screenshot({path:'./test-output/gatefall-v40-online-coop.png'});
 // Opening roll winner chooses first; no opening draw.
 await wait((a,b)=>a.pending&&a.pending.kind==='first'&&b.pending&&b.pending.kind==='first');
 const first=await host.evaluate(()=>S.pending.player);
 await act(first===0?host:guest,{t:'choose',value:'b:first'});
 await wait((a,b)=>a.turn===1&&b.turn===1&&!a.pending&&!b.pending);
 await host.waitForFunction(()=>!document.querySelector('.dice-ov,.fx-flash,.phase-banner')&&!ui.busy);
 await sleep(500);
 await host.screenshot({path:'./test-output/gatefall-v40-online-coop-clear.png'});
 assert.deepEqual(await host.evaluate(()=>S.drawWait),[]);
 assert.deepEqual(await guest.evaluate(()=>S.drawWait),[]);
 // Either client can switch the synchronized field layout and restore the shared default.
 await act(host,{t:'fieldLayout',split:true});await sync();
 for(const p of pages){assert.equal(await p.locator('.coop-row').count(),2);assert.equal(await p.evaluate(()=>S.splitField),true);}
 await act(guest,{t:'fieldLayout',split:false});await sync();
 for(const p of pages){assert.equal(await p.locator('.coop-row').count(),1);assert.equal(await p.evaluate(()=>S.splitField),false);}
 // The non-active hunter can act independently during the shared hunter turn.
 let s0=await snap(host),active=s0.active,other=active===0?1:0;
 assert([0,1].includes(active));
 assert.equal(await (other===0?host:guest).evaluate(j=>canAct(S,j),other),true);
 await act(other===0?host:guest,{t:'endTurn'});
 await wait((a,b)=>a.ready&&a.ready[other]&&b.ready&&b.ready[other]);
 // The original active hunter is the second one to ready up.
 await act(active===0?host:guest,{t:'endTurn'});
 await wait((a,b)=>a.active===2&&b.active===2);
 // Boss bot takes its turn without any boss Draw Phase wait.
 await wait((a,b)=>a.phase==='draw'&&b.phase==='draw'&&a.drawWait.length===2&&b.drawWait.length===2,60000);
 let ds=await snap(host);assert.deepEqual([...ds.drawWait].sort(),[0,1]);assert(!ds.drawWait.includes(2));
 const before=(await snap(host)).hands;
 // Independent manual deck actions: one hunter drawing does not draw for the other.
 await host.locator('[data-zone="deck:0"]').click();
 await wait((a,b)=>a.hands[0]===before[0]+1&&b.hands[0]===before[0]+1&&a.hands[1]===before[1]&&b.hands[1]===before[1]);
 assert((await snap(host)).drawWait.includes(1));
 await guest.locator('[data-zone="deck:1"]').click();
 await wait((a,b)=>a.hands[0]===before[0]+1&&b.hands[0]===before[0]+1&&a.hands[1]===before[1]+1&&b.hands[1]===before[1]+1&&a.drawWait.length===0&&b.drawWait.length===0);
 await sync();
 // v46: the host confirms guest moves; install the fixtures only after the guest's last move is confirmed,
 // or the confirmation's hash (taken before the fixtures) would ask for a repair snapshot.
 await guest.waitForFunction(()=>!Net.pend.length,{timeout:15000});
 // Install identical test fixtures on both lockstep clients, then use only numbered actions.
 // This forces a hunter -> boss -> hunter response chain in the real online room.
 for(const p of pages)await p.evaluate(()=>{
   clearInterval(Net.hb);
   window.chainSeen=[];const original=addLink;
   addLink=function(st,link){chainSeen.push(link.player);return original(st,link);};
   S.players[0].normalSummoned=false;
   S.players[0].hand.push({uid:++S.uid,id:'ogre'});
   if(!allMon(S).length)S.players[1].m[1]=newZone(S,{uid:++S.uid,id:'ogre'});
   for(let j=0;j<3;j++){
     const slot=freeST(P(S,j));if(slot<0)throw new Error('No free test Spell/Trap slot');
     P(S,j).st[slot]={card:{uid:++S.uid,id:j===0?'triad':j===1?'crash':'sinkhole'},faceDown:true,setTurn:0,controller:j};
   }
   Net.hashes[Net.acts.length]=netHash(S);
 });
 const ogre=await host.evaluate(()=>S.players[0].hand.find(c=>c.id==='ogre').uid);
 await act(host,{t:'summon',uid:ogre,zone:0,tributes:[],def:false});
 await guest.waitForFunction(()=>S.pending&&S.pending.type==='respond'&&S.pending.player===1&&S.pending.options.some(o=>o.id==='crash'),{timeout:15000});
 await act(guest,{t:'respond',value:await guest.evaluate(()=>S.pending.options.find(o=>o.id==='crash').value)});
 await host.waitForFunction(()=>S.pending&&S.pending.type==='respond'&&S.pending.player===0&&S.pending.options.some(o=>o.id==='triad'),{timeout:15000});
 await act(host,{t:'respond',value:await host.evaluate(()=>S.pending.options.find(o=>o.id==='triad').value)});
 await wait((a,b)=>!a.pending&&!b.pending);
 await sync();
 const chains=[await host.evaluate(()=>chainSeen),await guest.evaluate(()=>chainSeen)];
 assert.deepEqual(chains[0],chains[1]);
 assert.deepEqual([...new Set(chains[0])].sort(),[0,1,2],JSON.stringify(chains));
 // A real numbered action combines both hunters' monsters against one boss target.
 for(const p of pages)await p.evaluate(()=>{
   S.active=0;S.phase='battle';S.turn=Math.max(3,S.turn);S.pending=null;S.winner=null;
   for(let j=0;j<3;j++){P(S,j).hand=[];P(S,j).gy=[];P(S,j).st.fill(null);}
   P(S,0).m=Array(9).fill(null);P(S,1).m=Array(9).fill(null);
   P(S,0).m[0]=newZone(S,{uid:2420,id:'ogre'});
   P(S,1).m[1]=newZone(S,{uid:2421,id:'ogre'});
   P(S,2).m[6]=newZone(S,{uid:2422,id:'stormcrown'},{lp:100});   // v47: worn down to 100 LP, so the team's 1700 gap finishes it and 1600 carries over
   Net.hashes[Net.acts.length]=netHash(S);
 });
 const teamBossLp=await host.evaluate(()=>P(S,2).lp);
 await act(host,{t:'attack',slot:0,tp:2,target:6,team:['1:1']});
 await sync();
 for(const p of pages){
   const r=await p.evaluate(()=>({a:P(S,0).m[0]&&P(S,0).m[0].attacked,b:P(S,1).m[1]&&P(S,1).m[1].attacked,target:P(S,2).m[6],lp:P(S,2).lp}));
   assert(r.a&&r.b&&!r.target&&r.lp<teamBossLp,JSON.stringify(r));
 }
 // Either hunter can pay the other's monsters for a Tribute Summon.
 for(const p of pages)await p.evaluate(()=>{
   S.active=0;S.phase='main1';S.pending=null;S.winner=null;P(S,0).normalSummoned=false;
   P(S,0).m=Array(9).fill(null);P(S,1).m=Array(9).fill(null);
   P(S,0).hand=[{uid:2430,id:'morvane'}];P(S,0).gy=[];P(S,1).gy=[];
   P(S,1).m[0]=newZone(S,{uid:2431,id:'ogre'});P(S,1).m[1]=newZone(S,{uid:2432,id:'ogre'});
   Net.hashes[Net.acts.length]=netHash(S);
 });
 await act(host,{t:'summon',uid:2430,tributes:['1:0','1:1'],zone:0,def:false});
 await sync();
 for(const p of pages){
   const r=await p.evaluate(()=>({id:P(S,0).m[0]&&P(S,0).m[0].card.id,a:P(S,1).m[0],b:P(S,1).m[1],gy:P(S,1).gy.map(c=>c.uid)}));
   assert.equal(r.id,'morvane');assert(!r.a&&!r.b);assert(r.gy.includes(2431)&&r.gy.includes(2432),JSON.stringify(r));
 }
 // Mixed-owner Xyz materials detach from the correct fields and stay attached.
 const xc=await host.evaluate(()=>Object.keys(CARDS).find(id=>CARDS[id].xyz&&CARDS[id].rank===4));
 assert(xc);
 for(const p of pages)await p.evaluate(xc=>{
   S.active=0;S.phase='main1';S.pending=null;S.winner=null;
   P(S,0).m=Array(9).fill(null);P(S,1).m=Array(9).fill(null);P(S,0).gy=[];P(S,1).gy=[];
   P(S,0).extra=[{uid:2440,id:xc}];
   P(S,0).m[0]=newZone(S,{uid:2441,id:'ogre'});P(S,1).m[0]=newZone(S,{uid:2442,id:'ogre'});
   Net.hashes[Net.acts.length]=netHash(S);
 },xc);
 await act(host,{t:'xyz',uid:2440,mats:['0:0','1:0']});
 await sync();
 for(const p of pages){
   const r=await p.evaluate(()=>({id:P(S,0).m[0]&&P(S,0).m[0].card.id,mats:P(S,0).m[0]&&P(S,0).m[0].mats.length,ally:P(S,1).m[0],gy0:P(S,0).gy.map(c=>c.uid),gy1:P(S,1).gy.map(c=>c.uid)}));
   assert.equal(r.id,xc);assert.equal(r.mats,2);assert(!r.ally);assert(!r.gy0.includes(2441)&&!r.gy1.includes(2442),JSON.stringify(r));
 }
 // The partner's monsters can also pay for the active hunter's Duelist summon.
 for(const p of pages)await p.evaluate(()=>{
   S.active=0;S.phase='main1';S.pending=null;S.winner=null;P(S,0).normalSummoned=false;
   P(S,0).m=Array(9).fill(null);P(S,1).m=Array(9).fill(null);P(S,0).hero.field=false;P(S,1).gy=[];
   P(S,1).m[0]=newZone(S,{uid:2450,id:'ogre'});P(S,1).m[1]=newZone(S,{uid:2451,id:'ogre'});
   Net.hashes[Net.acts.length]=netHash(S);
 });
 await act(host,{t:'heroSummon',tributes:['1:0','1:1'],zone:0});
 await sync();
 for(const p of pages){
   const r=await p.evaluate(()=>({kind:P(S,0).m[0]&&CARDS[P(S,0).m[0].card.id].kind,field:P(S,0).hero.field,gy:P(S,1).gy.map(c=>c.uid)}));
   assert.equal(r.kind,'hero');assert(r.field);assert(r.gy.includes(2450)&&r.gy.includes(2451),JSON.stringify(r));
 }
 // Same-duel boss rush is a synchronized action and rebuilds seven boss positions.
 for(const p of pages)await p.evaluate(()=>{S.winner=0;S.reason='Online boss-rush verification.';S.pending=null;Net.hashes[Net.acts.length]=netHash(S);});
 const oldHunt=await host.evaluate(()=>S.hunt);
 await act(host,{t:'bossRush'});
 await wait((a,b)=>a.h!==b.h?false:true);
 await sync();
 assert.notEqual(await host.evaluate(()=>S.hunt),oldHunt);
 assert.equal(await guest.evaluate(()=>S.hunt),await host.evaluate(()=>S.hunt));
 for(const p of pages){assert.equal(await p.evaluate(()=>P(S,2).m.length),7);assert.equal(await p.evaluate(()=>P(S,2).st.length),7);assert.equal(await p.evaluate(()=>S.winner),null);}
 assert.deepEqual(errors,[]);
 console.log('PASS: v40 hosted shared field, synchronized split option, aligned piles, independent draws, shared turns, three-seat chain, cross-hunter attacks and sacrifices, boss rush, and matching hashes');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
