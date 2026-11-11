const {chromium}=require('playwright');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:430,height:900},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await ctx.newCDPSession(page);
 const longPress=async(sel)=>{const b=await page.locator(sel).first().boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);};
 await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('.mbtn'));
 // set up a battle-phase board directly in the rules state (deterministic), then render
 await page.evaluate(()=>{
   newBotDuel(2);
   const mon=(uid,id,extra={})=>({card:{uid,id},pos:'atk',faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
   S.pending=null;S.dice=[];S.turn=4;S.active=0;S.phase='battle';
   P(S,0).m=Array(P(S,0).m.length).fill(null);P(S,1).m=Array(P(S,1).m.length).fill(null);
   P(S,0).m[0]=mon(901,'ogre',{boost:2000});P(S,0).m[1]=mon(902,'ashblade');P(S,0).m[2]=mon(903,'ashblade');
   P(S,1).m[1]=mon(904,'ashblade');
   P(S,1).hand=[];P(S,1).st=P(S,1).st.map(()=>null);   // v50: no traps or quick spells, so the bot can't change the checked battles
   ui.busy=false;ui.mode=null;ui.sheet=null;render();
 });
 await page.waitForTimeout(300);
 // 1. short tap opens the card sheet, not attack mode
 await page.tap('[data-zone="m:0:0"]');await page.waitForTimeout(250);
 assert(await page.evaluate(()=>!!ui.sheet&&!ui.mode),'short tap opens sheet');
 await page.evaluate(()=>closeSheet());await page.waitForTimeout(150);
 // 2. long press selects the lead
 await longPress('[data-zone="m:0:0"]');
 let st=await page.evaluate(()=>({mode:ui.mode,sheet:!!ui.sheet,ctl:document.querySelector('#controls').innerText}));
 assert(st.mode&&st.mode.type==='attack'&&st.mode.stage==='pick'&&st.mode.slot===0,'long press starts attack pick: '+JSON.stringify(st));
 assert(/Attack/.test(st.ctl)&&!st.sheet,'attack button shown');
 // 3. short tap adds an ally to the team
 await page.tap('[data-zone="m:0:1"]');await page.waitForTimeout(200);
 st=await page.evaluate(()=>ui.mode);assert.deepEqual(st.team,['0:1'],'ally added: '+JSON.stringify(st));
 // enemy tap in pick stage does nothing
 await page.tap('[data-zone="m:1:1"]');await page.waitForTimeout(200);
 assert(await page.evaluate(()=>ui.mode&&ui.mode.stage==='pick'&&S.phase==='battle'),'enemy tap ignored in pick stage');
 // 4. Attack -> target stage, highlights on own and enemy monsters
 await page.tap('[data-ctl="attackgo"]');await page.waitForTimeout(200);
 st=await page.evaluate(()=>({stage:ui.mode.stage,targets:[...document.querySelectorAll('.zone.target')].map(e=>e.dataset.zone)}));
 assert.equal(st.stage,'target');assert(st.targets.includes('m:0:2')&&st.targets.includes('m:1:1')&&!st.targets.includes('m:0:0')&&!st.targets.includes('m:0:1'),'targets '+JSON.stringify(st.targets));
 // 5. attack my own third monster with the team
 const lp0=await page.evaluate(()=>[P(S,0).lp,P(S,1).lp]);
 await page.tap('[data-zone="m:0:2"]');
 await page.waitForFunction(()=>!P(S,0).m[2],{timeout:8000});
 await page.waitForFunction(()=>!ui.busy);
 st=await page.evaluate(()=>({lp:[P(S,0).lp,P(S,1).lp],m0:!!P(S,0).m[0],m1:!!P(S,0).m[1],mode:ui.mode,log:S.log.slice(-3).map(l=>l.text)}));
 assert(st.lp[0]<lp0[0]&&st.lp[1]===lp0[1],'the owner of the losing ally takes battle damage '+JSON.stringify(st));assert(st.m0&&st.m1&&!st.mode,'attackers remain, mode cleared');
 await page.screenshot({path:'./test-output/gatefall-v42-attack-ally.png'});
 // 6. a fresh monster long-pressed then attacks the enemy (normal damage path)
 await page.evaluate(()=>{P(S,0).m[0].attacked=false;P(S,0).m[0].atkCount=0;render();});await page.waitForTimeout(200);
 await longPress('[data-zone="m:0:0"]');await page.tap('[data-ctl="attackgo"]');await page.waitForTimeout(200);
 await page.tap('[data-zone="m:1:1"]');
 await page.waitForFunction(()=>!P(S,1).m[1],{timeout:8000});await page.waitForFunction(()=>!ui.busy);
 st=await page.evaluate(()=>[P(S,0).lp,P(S,1).lp]);assert(st[1]<lp0[1],'enemy took damage');
 console.log('PASS attack UI: long press, ally team, Attack stage, own-side target with battle damage, enemy target with damage; errors',errors);
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
