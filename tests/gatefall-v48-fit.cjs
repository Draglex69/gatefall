/* v48: the game fits one screen everywhere. On phones, tablets and desktops, portrait and landscape, every
   view (menu, Monster Hunter, Multiplayer, Deck editor, and duels in every mode) fits without the page or the
   app scrolling. Needs `node server.mjs` on port 3000 (or pass another address). */
const {chromium}=require('playwright');const assert=require('assert');
const URL=process.argv[2]||'http://localhost:3000/';
const SIZES=[[360,640],[390,844],[412,915],[844,390],[667,375],[768,1024],[1024,768],[1280,720],[1920,1080]];
const MODES=[['menu',null],['hunt',"showView('hunt')"],['lobby',"showView('lobby')"],['deck',"showView('deck')"],['duel','newBotDuel(2)'],['hunt duel',"newHunt('cindermaw')"],['co-op',"newCoop('skarra')"],['2v2','newTagDuel()'],['free-for-all','newBotDuel(4)']];
(async()=>{const b=await chromium.launch();const bad=[],errors=[];
for(const [w,h] of SIZES){const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:w<900,hasTouch:true});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${w}x${h}: ${e.message}`));
 for(const [m,code] of MODES){
  await p.goto(URL,{waitUntil:'networkidle'});await p.evaluate(()=>setBanners(false));
  if(code)await p.evaluate(c=>(0,eval)(c),code);
  await p.waitForTimeout(code&&/new/.test(code)?1800:500);
  const r=await p.evaluate(()=>{const de=document.documentElement,app=document.getElementById('app'),v=document.querySelector('.view:not([hidden])');
    window.scrollTo(0,9999);const sy=scrollY;window.scrollTo(0,0);
    return {page:Math.max(0,de.scrollHeight-de.clientHeight),sy,app:app.scrollHeight-app.clientHeight,view:v.scrollHeight-v.clientHeight,wide:de.scrollWidth-de.clientWidth};});
  if(r.page>0||r.sy>0||r.app>1||r.view>2||r.wide>0)bad.push(`${w}x${h} ${m}: ${JSON.stringify(r)}`);
 }
 await ctx.close();}
await b.close();
assert.deepEqual(bad,[],'every view fits the screen:\n'+bad.join('\n'));assert.deepEqual(errors,[]);
console.log(`PASS: no page or app scrolling, nothing cut off: ${SIZES.length} screen sizes x ${MODES.length} views`);
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
