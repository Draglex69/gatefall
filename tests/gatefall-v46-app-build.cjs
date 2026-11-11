/* v46: an Android app build (scripts/build-app.mjs) served from its own origin, with a stand-in for the Capacitor
   bridge. Checks: config is read, no service worker or install button, CSP allows the game, cross-origin room
   hosting through server.mjs (CORS) with a web guest joining, "Copy room code" invites, hardware back button,
   invite links that open the app. Needs `node server.mjs` on port 3000. */
const {chromium}=require('playwright');const assert=require('assert');const {execFileSync,spawn}=require('child_process');
const path=require('path'),fs=require('fs'),http=require('http');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'test-output','app-build'),WEB='http://localhost:3000',APP_PORT=3300;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 execFileSync('node',[path.join(ROOT,'scripts/build-app.mjs'),'--platform','android','--server',WEB,'--out',OUT],{stdio:'pipe'});
 const html=fs.readFileSync(path.join(OUT,'index.html'),'utf8');
 assert(/window\.GATEFALL_CONFIG = \{"platform":"android","server":"http:\/\/localhost:3000"/.test(html),'config written');
 assert(!fs.existsSync(path.join(OUT,'sw.js'))&&!/rel="manifest"/.test(html),'web-only parts removed');
 // a tiny static server for the app files (a different origin than the room server, like https://localhost in Capacitor)
 const types={'.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2'};
 const srv=http.createServer((q,r)=>{const f=path.join(OUT,decodeURIComponent(new URL(q.url,'http://x').pathname).replace(/^\/$/,'/index.html'));if(!f.startsWith(OUT)||!fs.existsSync(f)){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(APP_PORT);
 const browser=await chromium.launch({headless:true});
 const errors=[],csp=[];
 const appCtx=await browser.newContext({viewport:{width:412,height:915},hasTouch:true,isMobile:true});
 await appCtx.addInitScript(()=>{
   window.__cap={listeners:{},exited:false};
   window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>'android',Plugins:{App:{
     addListener(name,fn){window.__cap.listeners[name]=fn;return Promise.resolve({remove(){}});},
     exitApp(){window.__cap.exited=true;},getLaunchUrl:async()=>({url:''})}}};
 });
 const app=await appCtx.newPage();
 app.on('pageerror',e=>errors.push('app: '+e.message));
 app.on('console',m=>{if(/Content Security Policy|Refused to/i.test(m.text()))csp.push(m.text());});
 await app.goto(`http://localhost:${APP_PORT}/`,{waitUntil:'load'});
 await app.waitForFunction(()=>typeof roomChecked!=='undefined'&&roomChecked,{timeout:20000});
 const st=await app.evaluate(()=>({cfg:GF_CFG,kind:roomKind,ns:!!RoomNS,install:document.querySelector('#bInstall').hidden,sw:navigator.serviceWorker?navigator.serviceWorker.controller:null,hooks:Object.keys(window.__cap.listeners).sort()}));
 console.log('app state',JSON.stringify(st));
 assert.equal(st.cfg.platform,'android');assert.equal(st.cfg.app,true);assert.equal(st.kind,'hosted');assert(st.ns,'room service found cross-origin');
 assert.equal(st.install,true,'install button hidden in the app');assert.deepEqual(st.hooks,['appStateChange','appUrlOpen','backButton']);
 // host a room from the app, join it from the web version
 await app.evaluate(()=>setBanners(false));
 await app.locator('[data-go="lobby"]').click();await app.locator('[data-net="host"]').click();
 await app.waitForFunction(()=>Net.role==='host'&&Net.code.length===4,{timeout:15000});
 const code=await app.evaluate(()=>Net.code);
 const inviteTxt=await app.locator('[data-net="invite"]').innerText();assert(/Copy room code/.test(inviteTxt),'apps without a web address share the room code');
 const web=await (await browser.newContext({viewport:{width:1100,height:850}})).newPage();
 web.on('pageerror',e=>errors.push('web: '+e.message));
 await web.goto(`${WEB}/?room=${code.toUpperCase()}`,{waitUntil:'load'});
 await web.waitForFunction(()=>roomChecked&&RoomNS&&ui.view==='lobby',{timeout:20000});
 assert.equal(await web.locator('#joinCode').inputValue(),code.toUpperCase(),'invite link fills the code');
 await web.locator('#nick').fill('Webby');await web.locator('[data-net="join"]').click();
 await app.waitForFunction(()=>Net.guests.length===1,{timeout:15000});
 await app.locator('[data-net="start"]').click();
 await Promise.all([app,web].map(p=>p.waitForFunction(()=>ui.view==='game'&&S,{timeout:20000})));
 // play a few moves on both sides and compare state
 const t0=Date.now();
 while(Date.now()-t0<25000){
   for(const p of [app,web]) await p.evaluate(()=>{
     if(!S||S.winner!=null||ui.busy)return;const pd=S.pending;
     if(pd&&pd.player===ME){dispatch(pd.type==='respond'?{t:'respond',value:null}:{t:'choose',value:botChoose?botChoose(S,pd):pd.options[0].value});return;}
     if((S.drawWait||[]).includes(ME)){dispatch({t:'draw'});return;}
     if(canAct(S,ME))dispatch(botAction(S,ME)||{t:'endTurn'});
   }).catch(()=>{});
   const t=await app.evaluate(()=>S.turn);if(t>=4)break;await sleep(300);
 }
 await sleep(2500);
 const [a,b]=await Promise.all([app,web].map(p=>p.evaluate(()=>({n:Net.acts.length,h:netHash(S),turn:S.turn}))));
 console.log('synced',JSON.stringify(a),JSON.stringify(b));
 assert(a.turn>=2,'the duel got going');assert.equal(a.h,b.h,'app and web agree on the game state');
 // hardware back button: closes a sheet, then asks before leaving the duel; at the menu it exits the app
 await app.evaluate(()=>openSheet({type:'sound'}));await app.evaluate(()=>window.__cap.listeners.backButton());
 assert.equal(await app.evaluate(()=>ui.sheet),null,'back closes a sheet');
 await app.evaluate(()=>window.__cap.listeners.backButton());
 assert.equal(await app.evaluate(()=>ui.sheet&&ui.sheet.type),'leave','back in a duel asks first');
 await app.evaluate(()=>leaveOnline());
 assert.equal(await app.evaluate(()=>ui.view),'menu');
 await app.evaluate(()=>window.__cap.listeners.backButton());
 assert.equal(await app.evaluate(()=>window.__cap.exited),true,'back at the menu exits');
 // an invite link that opens the app goes to the lobby with the code filled in
 await app.evaluate(()=>{window.__cap.exited=false;window.__cap.listeners.appUrlOpen({url:'https://play.example.com/?room=WXYZ'});});
 assert.equal(await app.evaluate(()=>ui.view),'lobby');assert.equal(await app.locator('#joinCode').inputValue(),'WXYZ');
 // going to the background pauses the sound
 await app.evaluate(()=>{Sound.unlock();window.__cap.listeners.appStateChange({isActive:false});});
 await sleep(300);
 const audio=await app.evaluate(()=>Sound.running);
 assert.equal(audio,false,'audio paused in the background');
 await app.screenshot({path:path.join(ROOT,'test-output','app-build-lobby.png')});
 assert.deepEqual(csp,[],'no content security policy violations');
 assert.deepEqual(errors,[],'no page errors');
 await browser.close();srv.close();
 // the static web build works from a subfolder (itch.io, GitHub Pages): service worker scope, offline cache, fonts
 const WEBOUT=path.join(ROOT,'test-output','web-build');
 execFileSync('node',[path.join(ROOT,'scripts/build-app.mjs'),'--platform','web','--out',WEBOUT],{stdio:'pipe'});
 const sub=http.createServer((q,r)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);if(!u.startsWith('/games/gatefall/')){r.writeHead(404);return r.end();}
   const f=path.join(WEBOUT,u.slice('/games/gatefall/'.length)||'index.html');if(!f.startsWith(WEBOUT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}
   r.writeHead(200,{'Content-Type':({'.js':'text/javascript','.webmanifest':'application/manifest+json','.woff':'font/woff'})[path.extname(f)]||types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(APP_PORT+1);
 const pctx=await chromium.launchPersistentContext(path.join(ROOT,'test-output','web-sub-profile-'+Date.now()),{headless:true});
 const wp=pctx.pages()[0]||await pctx.newPage();wp.on('pageerror',e=>errors.push('sub: '+e.message));
 await wp.goto(`http://localhost:${APP_PORT+1}/games/gatefall/`,{waitUntil:'networkidle'});
 await wp.evaluate(async()=>{await navigator.serviceWorker.ready;});await wp.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:15000});
 const sw=await wp.evaluate(async()=>{const c=await caches.open((await caches.keys())[0]);return {scope:(await navigator.serviceWorker.getRegistration()).scope,paths:(await c.keys()).map(q=>new URL(q.url).pathname)};});
 assert(sw.scope.endsWith('/games/gatefall/'),'worker scope is the subfolder');
 assert(sw.paths.includes('/games/gatefall/index.html')&&sw.paths.includes('/games/gatefall/fonts/Jersey10-Regular.woff'),'shell cached under the subfolder');
 await pctx.setOffline(true);await wp.reload({waitUntil:'load'});
 assert.equal(await wp.evaluate(()=>ui.view),'menu','loads offline');assert(await wp.evaluate(()=>document.fonts.check('20px "Jersey 10"')),'bundled fonts offline');
 await pctx.close();sub.close();
 assert.deepEqual(errors,[],'no page errors');
 console.log('PASS: app build config, cross-origin rooms, app hosts a web guest, back button, app links, background audio, CSP; web build offline from a subfolder');
})().catch(e=>{console.error('FAIL',e);process.exit(1);});
