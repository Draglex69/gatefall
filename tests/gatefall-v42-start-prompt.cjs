const {chromium}=require('playwright');const assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const [mode,sel] of [['duel','[data-go="bot"]'],['hunt',null],['coop',null]]){
  const ctx=await browser.newContext({viewport:{width:430,height:900},hasTouch:true,isMobile:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>typeof S!=='undefined'&&document.querySelector('.mbtn'));
  if(sel)await page.tap(sel);else await page.evaluate(m=>m==='hunt'?newHunt('gloop'):newCoop('gloop'),mode);
  await page.waitForFunction(()=>S&&S.turn===0,{timeout:20000});
  // wait until either the prompt is ours or the bot took the roll
  await page.waitForFunction(()=>!ui.busy&&(!S.pending||S.pending.kind!=='first'||S.pending.player===ME||S.turn>0),{timeout:40000});
  const mine=await page.evaluate(()=>S.pending&&S.pending.kind==='first'&&S.pending.player===ME);
  if(mine){
    const txt=await page.locator('#controls').innerText();
    assert(!/Waiting for the Draw Phase/.test(txt),'stale waiting text: '+txt);
    const opt=page.locator('#controls [data-opt="b:first"]');
    assert.equal(await opt.count(),1,'Go first button missing; controls='+txt);
    await opt.tap();
    await page.waitForFunction(()=>S.turn>=1,{timeout:10000});
    console.log('PASS',mode,'opening choice shown and tappable');
  } else console.log('PASS',mode,'(bot won the roll, prompt was theirs)');
  assert.deepEqual(errors,[]);
  await ctx.close();
 }
 await browser.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
