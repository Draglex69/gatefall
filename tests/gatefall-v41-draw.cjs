const {chromium}=require('playwright');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for (const [mode,how] of [['duel','deck-tap'],['duel','button'],['duel','key'],['duel','tap-while-busy'],['coop','deck-tap'],['coop','button'],['hunt','button']]){
 const ctx=await browser.newContext({viewport:{width:390,height:664},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{const t=m.text();if((m.type()==='error'||m.type()==='warning')&&!t.includes('GL Driver')&&!t.includes('ERR_')&&!t.includes('404'))console.log(' console:',t.slice(0,300));});
 await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('.mbtn'));
 await page.evaluate(m=>{if(m==='duel')newBotDuel(2);else if(m==='coop')newCoop('gloop');else newHunt('gloop');},mode);
 await page.waitForTimeout(500);
 for(let k=0;k<40;k++){const st=await page.evaluate(()=>({pend:S.pending&&S.pending.kind,busy:ui.busy}));if(st.pend!=='first')break;if(!st.busy)await page.evaluate(()=>dispatch({t:'choose',value:S.pending.options[S.pending.options.length-1].value}));await page.waitForTimeout(400);}
 let reached=false;const t0=Date.now();
 while(Date.now()-t0<90000){
   const st=await page.evaluate(()=>({phase:S.phase,pend:S.pending?{p:S.pending.player}:null,dw:S.drawWait||[],busy:ui.busy,win:S.winner}));
   if(st.win!=null)break;
   if(st.phase==='draw'&&st.dw.includes(0)){reached=true;break;}
   if(st.busy){await page.waitForTimeout(200);continue;}
   if(st.pend&&st.pend.p===0){await page.evaluate(()=>{const pd=S.pending;dispatch(pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:pd.options[0].value});});await page.waitForTimeout(300);continue;}
   if(!st.pend&&st.phase!=='draw'){if(await page.evaluate(()=>canAct(S,ME)))await page.evaluate(()=>dispatch({t:'endTurn'}));}
   await page.waitForTimeout(300);
 }
 assert(reached,mode+' never reached draw');
 const hand0=await page.evaluate(()=>S.players[0].hand.length);
 if(how==='tap-while-busy'){
   // fake a running animation lock, tap, then let the lock clear
   await page.evaluate(()=>{ui.busy=true;ui.busySince=Date.now();});
   await page.tap('.zone.pile[data-zone="deck:0"]');
   const mid=await page.evaluate(()=>({hand:S.players[0].hand.length,q:ui.drawQueued}));
   assert.equal(mid.hand,hand0);assert.equal(mid.q,true,'queued');
   await page.evaluate(()=>{present(null,[],()=>{render();pump();});});
 } else if(how==='button'){
   await page.waitForFunction(()=>!ui.busy);assert.equal(await page.locator('[data-ctl="draw"]').count(),1,'draw button present');
   const b=await page.locator('[data-ctl="draw"]').boundingBox();assert(b.x>=0&&b.x+b.width<=390,'button fits '+JSON.stringify(b));
   await page.tap('[data-ctl="draw"]');
 } else if(how==='key'){
   await page.waitForFunction(()=>!ui.busy);await page.keyboard.press('Space');
 } else { await page.waitForFunction(()=>!ui.busy);await page.tap('.zone.pile[data-zone="deck:0"]'); }
 await page.waitForFunction(h=>S.players[0].hand.length===h+1,hand0,{timeout:8000});
 const after=await page.evaluate(()=>({phase:S.phase,dw:S.drawWait,btn:document.querySelectorAll('[data-ctl="draw"]').length}));
 assert(!(after.dw||[]).includes(0),'no longer waiting on me');assert.equal(after.btn,0,'button gone');
 if(how==='button')await page.screenshot({path:'verify-'+mode+'-button.png'});
 console.log('PASS',mode,how,'errors',errors);
 await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
