const {chromium}=require('playwright');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:430,height:900},hasTouch:true,isMobile:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{const t=m.text();if(m.type()==='error'&&!/GL Driver|ERR_|404|fonts/.test(t))console.log(' console:',t.slice(0,200));});
 await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('.mbtn'));
 // card art and the gorilla
 await page.evaluate(()=>openSheet({type:'card',where:'view',id:'bcall'}));await page.waitForTimeout(400);
 assert((await page.locator('.bc .bn').textContent()).includes('Berserker Call'));
 assert(await page.locator('.bc .art img').evaluate(el=>el.complete&&el.naturalWidth>0),'card art rendered');
 await page.screenshot({path:'./test-output/gatefall-v44-bcall-card.png'});await page.evaluate(()=>closeSheet());
 // --- co-op: the ally bot plays alongside the human in the shared main phase
 await page.evaluate(()=>newCoop('gloop'));
 for(let k=0;k<40;k++){const st=await page.evaluate(()=>({pend:S.pending&&S.pending.kind,busy:ui.busy}));if(st.pend!=='first')break;if(!st.busy)await page.evaluate(()=>dispatch({t:'choose',value:S.pending.options[0].value}));await page.waitForTimeout(400);}
 // reach the hunters' main phase on a turn >= 3 with both drawing
 const t0=Date.now();let ok=false;
 while(Date.now()-t0<120000){
   const st=await page.evaluate(()=>({turn:S.turn,phase:S.phase,active:S.active,boss:bossSeat(),pend:S.pending?S.pending.player:null,dw:S.drawWait||[],busy:ui.busy,ready:S.hunterReady,win:S.winner,mine:canAct(S,0)}));
   if(st.win!=null)break;
   if(st.turn>=3&&st.active!==st.boss&&st.phase==='main1'&&!st.pend&&!(st.ready&&st.ready[0])){ok=true;break;}
   if(st.busy){await page.waitForTimeout(150);continue;}
   if(st.dw.includes(0)){await page.evaluate(()=>dispatch({t:'draw'}));await page.waitForTimeout(300);continue;}
   if(st.pend===0){await page.evaluate(()=>{const pd=S.pending;dispatch(pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:pd.options[0].value});});await page.waitForTimeout(300);continue;}
   // v46: when the Ally Bot won the roll it leads the shared turn, and the human still has to ready up
   if(st.mine&&!st.pend&&st.phase!=='draw'){await page.evaluate(()=>dispatch({t:'endTurn'}));}
   await page.waitForTimeout(400);
 }
 assert(ok,'reached a shared hunters main phase');
 // give the helper time to act while the human idles
 await page.waitForTimeout(4000);
 // the partner may be asked to respond to the ally's plays (a chain window): pass
 for(let k=0;k<6;k++){const pend=await page.evaluate(()=>S.pending&&S.pending.player===ME&&S.pending.type);if(!pend)break;await page.evaluate(()=>dispatch(S.pending.type==='respond'?{t:'respond',value:null}:{t:'choose',value:S.pending.options[0].value}));await page.waitForTimeout(1500);}
 await page.waitForFunction(()=>!ui.busy&&!(S.pending&&S.pending.player===ME),{timeout:20000});await page.waitForTimeout(1500);
 // v46: a bot (ally or boss) may still be deciding a chain window; let it finish, passing any window that comes back to us
 for(let k=0;k<40;k++){const w=await page.evaluate(()=>ui.busy?'busy':S.pending?(S.pending.player===ME?'me':'other'):'free');if(w==='free')break;if(w==='me')await page.evaluate(()=>dispatch(S.pending.type==='respond'?{t:'respond',value:null}:{t:'choose',value:S.pending.options[0].value}));await page.waitForTimeout(500);}
 const st=await page.evaluate(()=>({ready:S.hunterReady,phase:S.phase,allyMons:P(S,1).m.filter(Boolean).length,allySummon:S.log.some(l=>/Ally Bot (summons|sets|calls)/.test(l.text)&&l.text),turnLabel:S.log.find(l=>/Turn \d+: the hunters/.test(l.text))&&1,canA:canAct(S,0),canB:canAct(S,1),ctl:document.querySelector('#controls').innerText}));
 console.log(JSON.stringify(st));
 assert(!st.ready||!st.ready[1],'ally did not ready while the human is still acting');
 assert(st.canA,'human can still act');assert(st.phase==='main1','phase untouched by the helper');
 assert(st.allyMons>0||st.allySummon,'ally bot summoned during the shared main phase');
 await page.screenshot({path:'./test-output/gatefall-v44-coop-shared.png'});
 // --- Berserker Call animation runs from the real UI
 await page.evaluate(()=>{P(S,0).hand.push({uid:9001,id:'bcall'});render();});
 // v46: the Ally Bot keeps playing in the shared turn and its plays can close our card sheet; retry like a player would
 let zone=null;
 for(let k=0;k<5&&!zone;k++){
   await page.waitForFunction(()=>!ui.busy,{timeout:15000});
   const pd=await page.evaluate(()=>S.pending&&S.pending.player===ME);
   if(pd){await page.evaluate(()=>dispatch(S.pending.type==='respond'?{t:'respond',value:null}:{t:'choose',value:S.pending.options[0].value}));await page.waitForTimeout(600);continue;}
   await page.tap('[data-hand="9001"]').catch(()=>{});await page.waitForTimeout(300);
   const act=page.locator('.acts .btn',{hasText:/^Activate$/}).first();
   if(await act.isVisible().catch(()=>false)){await act.tap({timeout:3000}).catch(()=>{});await page.waitForTimeout(250);}
   zone=await page.evaluate(()=>ui.mode&&ui.mode.allowed&&`[data-zone="s:${ME}:${ui.mode.allowed[0]}"]`);
   if(!zone){await page.evaluate(()=>{ui.mode=null;closeSheet();});await page.waitForTimeout(800);}
 }
 assert(zone,'place mode');await page.tap(zone);
 await page.waitForTimeout(900);await page.screenshot({path:'./test-output/gatefall-v44-scream.png'});
 await page.waitForFunction(()=>!ui.busy&&!S.pending,{timeout:15000});
 // v47: the Ally Bot may still be playing, so give the board a moment to catch up with the state
 let after;for(let k=0;k<12;k++){after=await page.evaluate(()=>({berserk:allMon(S,true).filter(x=>!x.z.faceDown&&x.z.summonedTurn<S.turn).every(x=>x.z.berserk),count:allMon(S,true).filter(x=>x.z.berserk).length,zones:document.querySelectorAll('.zone.berserk').length}));if(after.berserk&&after.count>0&&after.zones===after.count)break;await page.waitForTimeout(300);}
 console.log(JSON.stringify(after));assert(after.berserk&&after.count>0&&after.zones===after.count,'all face-up monsters berserk and styled');
 await page.screenshot({path:'./test-output/gatefall-v44-after-call.png'});
 // the Ready button is refused while a berserk monster has not battled
 await page.waitForFunction(()=>!ui.busy);
 const mine=await page.evaluate(()=>P(S,0).m.some(z=>z&&z.berserk)&&canBattle(S,ME));
 if(mine){await page.evaluate(()=>dispatch({t:'endTurn'}));await page.waitForTimeout(300);assert(await page.evaluate(()=>S.phase==='main1'&&!S.hunterReady[0]),'ready refused with a berserk monster');}
 console.log('PASS v44 UI; errors',errors);
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
