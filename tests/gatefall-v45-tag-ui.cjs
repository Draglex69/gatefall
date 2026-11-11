const {chromium}=require('playwright');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:430,height:900},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await ctx.newCDPSession(page);
 const longPress=async sel=>{const b=await page.locator(sel).first().boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);};
 await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('.mbtn'));
 await page.locator('[data-go="tag"]').click();
 await page.waitForFunction(()=>S&&S.tag&&S.players.length===4);
 const setup=await page.evaluate(()=>({names:S.players.map(p=>p.name),teams:S.players.map((_,j)=>teamNo(S,j)),ff:S.ffN,coop:document.body.dataset.coop,tag:document.body.dataset.tag}));
 assert.deepEqual(setup.teams,[0,0,1,1]);assert.equal(setup.ff,4);assert.equal(setup.tag,'1');
 // battle board: mine Ogre (boosted) vs rivals
 await page.evaluate(()=>{
   const mon=(uid,id,pos='atk',extra={})=>({card:{uid,id},pos,faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0,...extra});
   S.pending=null;S.dice=[];S.turn=6;S.active=0;S.phase='battle';S.drawWait=[];S.hunterReady={};
   for(const p of S.players)p.m=p.m.map(()=>null);
   // v47: no set traps or quick spells in the rivals' hands, so the bots can't change the outcome
   for(const p of S.players){p.st.forEach((s,k)=>{if(s&&s.faceDown)p.st[k]=null;});}P(S,2).hand=[];P(S,3).hand=[];
   P(S,0).m[0]=mon(9101,'ogre','atk',{boost:1000});P(S,0).m[1]=mon(9102,'ogre','atk');P(S,2).m[3]=mon(9103,'ashblade');P(S,3).m[4]=mon(9104,'tidewisp');
   ui.busy=false;ui.mode=null;ui.sheet=null;render();});
 await page.waitForTimeout(300);
 await longPress('[data-zone="m:0:0"]');
 assert(await page.evaluate(()=>ui.mode&&ui.mode.type==='attack'),'long press selects');
 await page.tap('[data-ctl="attackgo"]');await page.waitForTimeout(250);
 const targets=await page.evaluate(()=>[...document.querySelectorAll('.zone.target')].map(e=>e.dataset.zone));
 assert(targets.includes('m:2:3')&&targets.includes('m:3:4')&&targets.includes('m:0:1'),'rival A, rival B and my own monster are targets: '+targets);
 const before=await page.evaluate(()=>P(S,3).lp);
 await page.tap('[data-zone="m:3:4"]');
 await page.waitForFunction(()=>!P(S,3).m[4],{timeout:8000});
 await page.waitForFunction(()=>!ui.busy);
 assert(await page.evaluate(()=>P(S,3).lp)<before,'rival B takes battle damage');
 console.log('attack on rival B ok; LP B',before,'->',await page.evaluate(()=>P(S,3).lp));
 // direct attack on rival A's Duelist zone with the second Ogre
 const lpA=await page.evaluate(()=>P(S,2).lp);
 await page.evaluate(()=>{P(S,2).m[3]=null;render();});await page.waitForTimeout(200);
 await longPress('[data-zone="m:0:1"]');await page.tap('[data-ctl="attackgo"]');await page.waitForTimeout(250);
 const heroT=await page.evaluate(()=>[...document.querySelectorAll('.zone.target')].map(e=>e.dataset.zone));
 assert(heroT.includes('hero:2')&&heroT.includes('hero:3'),'both rival Duelists can be attacked directly: '+heroT);
 await page.tap('[data-zone="hero:2"]');
 for(let k=0;k<10;k++){const pd=await page.evaluate(()=>S.pending&&S.pending.player);if(pd==null)break;await page.evaluate(()=>{const pd=S.pending;if(pd.player!==ME)return;dispatch(pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:pd.options[0].value});});await page.waitForTimeout(800);}
 await page.waitForFunction(()=>S.log.some(l=>/attacks Rival A directly|block/i.test(l.text))&&!ui.busy&&!S.inChain,{timeout:20000}).catch(()=>{});
 await page.waitForTimeout(800);
 const lpA2=await page.evaluate(()=>P(S,2).lp);console.log('direct attack on rival A: LP',lpA,'->',lpA2, JSON.stringify(await page.evaluate(()=>({log:S.log.slice(-8).map(l=>l.text),pend:S.pending&&S.pending.kind,mode:ui.mode,m1:P(S,0).m[1]}))));
 assert(lpA2<lpA||await page.evaluate(()=>S.log.slice(-6).some(l=>/block/i.test(l.text))),'direct attack landed or was blocked');
 // team shield: rival B's Duelist on the field protects rival A too
 await page.evaluate(()=>{const mon=(uid,id)=>({card:{uid,id},pos:'atk',faceDown:false,summonedTurn:0,attacked:false,posChanged:false,boost:0});
   P(S,0).m[7]=mon(9105,'ogre');P(S,3).m[2]=mon(P(S,3).hero.card.uid,P(S,3).hero.id);P(S,2).m[0]=mon(9106,'tidewisp');S.pending=null;ui.mode=null;render();});
 await page.waitForTimeout(200);
 const shield=await page.evaluate(()=>({a:attackOptions(S,0,7,2),b:attackOptions(S,0,7,3)}));
 console.log('shield',JSON.stringify(shield));
 assert(!shield.a.direct&&shield.a.targets.length===0,'rival A shielded by partner Duelist');assert(!shield.b.direct&&shield.b.targets.length===1,'must hit rival B\'s Duelist');
 await page.screenshot({path:'./test-output/gatefall-v45-tag-ui.png'});
 console.log('PASS 2v2 UI; errors',errors);
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
