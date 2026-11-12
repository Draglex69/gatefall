/* v51 checkup: screen fixes. Needs `node server.mjs` on port 3000. Run: node tests/gatefall-v51-ui.cjs */
const {chromium}=require('playwright');const assert=require('assert');
const URL=process.env.GF_URL||'http://localhost:3000/';
(async()=>{const b=await chromium.launch();
 const open=async(w,h,opts={})=>{const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,reducedMotion:opts.motion||'no-preference'});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
   await p.goto(URL);await p.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('#menuView').children.length>0);await p.evaluate(()=>{try{setBanners(false)}catch(e){}});return p;};
 const board=async p=>{await p.evaluate(()=>{S.pending=null;S.chain=[];S.turn=4;S.active=ME;S.phase='battle';ui.busy=false;ui.sheet=null;ui.mode=null;
   const me=P(S,ME),put=(q,id,ex)=>{const k=freeM(q,S);if(k>=0){q.m[k]=newZone(S,{uid:++S.uid,id},{summonedTurn:0,...(ex||{})});}};
   put(me,'ogre');put(me,'rhino',{lp:600});for(const j of opponents(S,ME)){const q=P(S,j);put(q,'ashblade');put(q,'rhino');}
   document.querySelectorAll('#fx > *').forEach(e=>e.remove());render();fitScreen(true);});await p.waitForTimeout(400);};
 // 1. attack highlights are drawn above the card, and stay visible with reduced motion
 for(const motion of ['no-preference','reduce']){
   const p=await open(884,1104,{motion});await p.evaluate(()=>newBotDuel(2));await p.waitForTimeout(700);await board(p);
   const r=await p.evaluate(()=>{const z=[...document.querySelectorAll('#oppM .zone')].find(e=>e.querySelector('.mc'));z.classList.add('target');
     const a=getComputedStyle(z,'::after');return {content:a.content,z:+a.zIndex,shadow:a.boxShadow};});
   assert(r.content!=='none'&&r.z>=5&&/rgb/.test(r.shadow),'target outline above the card ('+motion+'): '+JSON.stringify(r));
   assert.deepEqual(p.errs,[]);await p.context().close();
 }
 // 2. bigger board on the Fold inner screen, both ways; the phase column never covers the side column
 for(const [w,h,min] of [[884,1104,95],[1104,884,85],[844,390,28],[860,376,28]]){
   const p=await open(w,h);await p.evaluate(()=>newBotDuel(2));await p.waitForTimeout(700);await board(p);
   const m=await p.evaluate(()=>{const z=document.querySelector('#myM .zone').offsetWidth,ph=document.querySelector('.phcol').getBoundingClientRect(),sd=document.getElementById('gameSide').getBoundingClientRect();
     return {z,phR:ph.right,side:sd.width?sd.left:null,over:document.documentElement.scrollHeight-innerHeight};});
   assert(m.z>=min,`${w}x${h}: cards ${m.z}px, want >= ${min}`);assert(m.over<=0,'no page scroll');
   if(m.side!=null)assert(m.phR<=m.side,`${w}x${h}: phase column clear of the side column`);
   await p.context().close();
 }
 // 3. co-op on the cover screen: every zone inside the screen, LP as a bar
 { const p=await open(376,860);await p.evaluate(()=>newTagDuel());await p.waitForTimeout(700);await board(p);
   const m=await p.evaluate(()=>{let l=1e9,r=0;document.querySelectorAll('#gameView .zone').forEach(e=>{const q=e.getBoundingClientRect();if(q.width){l=Math.min(l,q.left);r=Math.max(r,q.right);}});return {l,r,z:document.querySelector('#myM .zone').offsetWidth,tiny:document.body.dataset.tiny};});
   assert(m.l>=0&&m.r<=376,'2v2 zones inside the cover screen '+JSON.stringify(m));assert(m.z>=29,'2v2 cards '+m.z);assert.equal(m.tiny,'1');
   await p.context().close(); }
 // 4. Captured! on a short landscape screen: every button reachable
 { const p=await open(860,376);await p.evaluate(()=>newHunt('gloop'));await p.waitForTimeout(700);
   await p.evaluate(()=>{S.pending=null;S.winner=ME;S.reason='Beaten.';ui.busy=false;ui.fxUntil=0;render();});await p.waitForTimeout(2600);
   const btns=p.locator('.capture-ov button');const n=await btns.count();assert(n>=3,'capture buttons');
   for(let i=0;i<n;i++){await btns.nth(i).scrollIntoViewIfNeeded();const bb=await btns.nth(i).boundingBox();assert(bb&&bb.y>=0&&bb.y+bb.height<=376,'capture button '+i+' reachable');}
   await p.context().close(); }
 // 5. Log sheet: Close stays on screen; Android back closes a card sheet even over your own prompt
 { const p=await open(376,860);await p.evaluate(()=>newBotDuel(2));await p.waitForTimeout(700);
   await p.evaluate(()=>{for(let i=0;i<80;i++)S.log.push({text:'Line '+i,p:null});S.pending=null;ui.busy=false;openSheet({type:'log'});});await p.waitForTimeout(400);
   const bb=await p.locator('.sheet button',{hasText:'Close'}).boundingBox();assert(bb&&bb.y+bb.height<=860,'log Close visible');
   const closed=await p.evaluate(()=>{closeSheet();S.pending={type:'respond',player:ME,options:[],prompt:'x'};openSheet({type:'card',where:'view',id:'ogre'});appBack();const r=ui.sheet;S.pending=null;return r;});
   assert.equal(closed,null,'back closes the card sheet');
   await p.context().close(); }
 // 6. the boss card shows the boss's own Life Points
 { const p=await open(884,1104);await p.evaluate(()=>openSheet({type:'card',where:'view',id:'b_gloop'}));await p.waitForTimeout(300);
   assert(/LP 6000/.test(await p.locator('.sheet .bc .l').first().textContent()),'Gloop card shows LP 6000');await p.context().close(); }
 await b.close();console.log('v51 ui: all checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
