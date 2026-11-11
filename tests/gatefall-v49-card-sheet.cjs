/* v49: every big card has one size (long texts scroll inside the card), and card sheets show the card's text
   beside the card, at phone, sideways-phone and tablet sizes. Needs `node server.mjs` on port 3000. */
const {chromium}=require('playwright');const assert=require('assert');
const URL=process.argv[2]||'http://localhost:3000/';
(async()=>{const b=await chromium.launch();const errors=[];
for(const [w,h] of [[390,844],[844,390],[1280,800]]){
  const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(URL,{waitUntil:'networkidle'});await p.evaluate(()=>setBanners(false));
  // every card the same size, whatever its text
  const sizes=await p.evaluate(()=>{const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0';document.body.appendChild(host);const s=new Set();
    for(const id of Object.keys(CARDS)){if(CARDS[id].bossAb)continue;host.innerHTML=bigCard(id);const el=host.firstElementChild;s.add(el.offsetWidth+'x'+el.offsetHeight);}host.remove();return [...s];});
  assert.deepEqual(sizes,['196x310'],'one card size: '+sizes);
  for(const [where,setup] of [['deck',"showView('deck');openSheet({type:'card',where:'view',id:'showoff'})"],['duel',"newBotDuel(2)"]]){
    await p.evaluate(c=>(0,eval)(c),setup);await p.waitForTimeout(800);
    if(where==='duel')await p.evaluate(()=>{S.pending=null;S.active=ME;S.phase='main1';S.turn=3;ui.busy=false;P(S,ME).hand.unshift({uid:9301,id:'archon'});render();openSheet({type:'card',where:'hand',uid:9301});});
    await p.waitForTimeout(400);
    const r=await p.evaluate(()=>{const bc=document.querySelector('.sheet .bc'),tx=bc&&bc.querySelector('.tx'),ct=document.querySelector('.sheet .ctext'),side=document.querySelector('.sheet .side');
      const br=bc.getBoundingClientRect(),sr=side.getBoundingClientRect(),sheet=document.querySelector('.sheet');
      return {h:bc.offsetHeight,scrolls:tx.scrollHeight>tx.clientHeight,ctext:!!ct&&ct.textContent.length>40,beside:sr.left>=br.right-1,sheetFits:sheet.getBoundingClientRect().bottom<=innerHeight+1};});
    assert.equal(r.h,310,`${w}x${h} ${where}: card keeps its size`);assert(r.scrolls,`${w}x${h} ${where}: the long text scrolls inside the card`);
    assert(r.ctext,`${w}x${h} ${where}: the text is shown beside the card`);assert(r.beside,`${w}x${h} ${where}: side panel to the right of the card`);assert(r.sheetFits,`${w}x${h} ${where}: sheet fits the screen`);
    await p.evaluate(()=>closeSheet());
  }
  await p.close();
}
await b.close();assert.deepEqual(errors,[]);
console.log('PASS: one card size for every card, text scrolls inside the card, card text beside the card in deck and duel sheets (phone, sideways, tablet)');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
