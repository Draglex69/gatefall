const {chromium}=require('playwright');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:430,height:900},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('.mbtn'));
 // deck editor lists Fireball
 await page.evaluate(()=>showView('deck'));await page.waitForTimeout(300);
 const inEditor=await page.evaluate(()=>!!document.querySelector('[data-dcard="fireball"],[data-viewcard="fireball"],[data-dadd="fireball"]'));
 assert(inEditor,'Fireball listed in the deck editor');
 await page.evaluate(()=>openSheet({type:'card',where:'view',id:'fireball'}));await page.waitForTimeout(300);
 assert((await page.locator('.bc .bn').textContent()).includes('Fireball'));
 await page.screenshot({path:'./test-output/gatefall-v43-fireball-card.png'});
 await page.evaluate(()=>closeSheet());
 // berserk badge on the field and the fireball fx run without errors
 await page.evaluate(()=>{newBotDuel(2);const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});S.pending=null;S.dice=[];S.turn=4;S.active=0;S.phase='main1';
   P(S,0).m=Array(P(S,0).m.length).fill(null);P(S,1).m=Array(P(S,1).m.length).fill(null);P(S,0).m[1]=mon(901,'ogre','def',{summonedTurn:1});P(S,1).m[2]=mon(902,'tidewisp');P(S,1).m[0]=mon(903,'ashblade');
   P(S,0).hand=[{uid:950,id:'fireball'}];setBerserk(S,0,1);ui.busy=false;ui.mode=null;ui.sheet=null;render();});
 await page.waitForTimeout(300);
 assert.equal(await page.locator('.zone.berserk').count(),1,'berserk zone styled');
 await page.screenshot({path:'./test-output/gatefall-v43-berserk.png'});
 // activate Fireball from the hand via the real UI: hand card -> sheet -> activate -> choose target
 await page.tap('[data-hand="950"]');await page.waitForTimeout(300);
 const btns=await page.locator('.bc .acts .btn, .sheet .acts .btn').allTextContents();
 console.log('sheet buttons',btns, await page.evaluate(()=>({can:canActivateHand(S,ME,950),canAct:canAct(S,ME),phase:S.phase,free:freeST(P(S,ME)),ok:effectOK(S,ME,'fireball',950)})));const act=page.locator('.acts .btn',{hasText:/Activate|Use|Cast/}).first();assert(await act.count(),'activate button in sheet: '+btns.join('|'));
 await act.tap();await page.waitForTimeout(300);
 // a hand spell is placed in a glowing Spell/Trap zone first
 assert(await page.evaluate(()=>ui.mode&&ui.mode.type==='place'),'place mode');
 const zone=await page.evaluate(()=>`[data-zone="s:${ME}:${ui.mode.allowed[0]}"]`);await page.tap(zone);await page.waitForTimeout(300);
 console.log('after activate',JSON.stringify(await page.evaluate(()=>({pending:S.pending&&(S.pending.kind||S.pending.type),sheet:ui.sheet,log:S.log.slice(-3).map(l=>l.text),hand:P(S,0).hand.length,btns:[...document.querySelectorAll('.acts .btn')].map(b=>b.textContent)}))));assert(await page.evaluate(()=>S.pending&&S.pending.kind==='target'),'target prompt');
 await page.screenshot({path:'./test-output/gatefall-v43-fireball-targets.png'});
 await page.evaluate(()=>dispatch({t:'choose',value:'m:1:2'}));
 await page.waitForFunction(()=>!P(S,1).m[2]&&!ui.busy,{timeout:10000});
 // battle phase: the berserk ogre stands up and charges by itself
 await page.evaluate(()=>dispatch({t:'toBattle'}));
 await page.waitForFunction(()=>S.phase!=='main1'&&!ui.busy,{timeout:10000});await page.waitForTimeout(500);
 const st=await page.evaluate(()=>({pos:P(S,0).m[1]&&P(S,0).m[1].pos,oppLp:P(S,1).lp,opp0:!!P(S,1).m[0],log:S.log.slice(-5).map(l=>l.text)}));
 console.log(JSON.stringify(st));
 assert.equal(st.pos,'atk');
 await page.screenshot({path:'./test-output/gatefall-v43-berserk-after.png'});
 console.log('PASS visual v43; errors',errors);
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
