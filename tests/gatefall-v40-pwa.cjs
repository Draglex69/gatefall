const {chromium} = require('playwright');
const assert = require('assert');

(async () => {
  const context = await chromium.launchPersistentContext('./test-output/pwa-profile-' + Date.now(), {headless:true, viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
  const page = context.pages()[0] || await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3100/', {waitUntil:'networkidle'});
  await page.waitForSelector('.mbtn.orange');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  const cdp = await context.newCDPSession(page);
  const manifestResult = await cdp.send('Page.getAppManifest');
  assert(!manifestResult.errors.some(error => error.severity === 'error'), JSON.stringify(manifestResult.errors));
  const manifest = JSON.parse(manifestResult.data);
  assert.equal(manifest.name, 'Gatefall — Pixel Card Battler');
  assert.equal(manifest.short_name, 'Gatefall');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
  // v46: the manifest uses addresses relative to itself (so static hosts can serve the game from a subfolder)
  const at = u => new URL(u, 'http://127.0.0.1:3100/manifest.webmanifest').pathname;
  assert.equal(at(manifest.start_url), '/');
  assert.equal(at(manifest.scope), '/');
  assert.equal(at(manifest.id), '/');
  assert(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'));
  assert(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'maskable'));
  assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  assert.equal(manifest.screenshots.length, 2);

  const installability = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors, [], JSON.stringify(installability.installabilityErrors));
  const iconSizes = await page.evaluate(async () => {
    const paths = ['/icons/gatefall-192.png','/icons/gatefall-512.png','/icons/gatefall-maskable-192.png','/icons/gatefall-maskable-512.png','/icons/gatefall-apple-touch.png'];
    return Promise.all(paths.map(src => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve([src,image.naturalWidth,image.naturalHeight]); image.onerror = reject; image.src = src;
    })));
  });
  assert.deepEqual(iconSizes.map(x => x.slice(1)), [[192,192],[512,512],[192,192],[512,512],[180,180]]);

  const cached = await page.evaluate(async () => {
    const swSrc = await (await fetch('/sw.js', {cache:'no-store'})).text();
    const cache = await caches.open(swSrc.match(/CACHE_NAME = "([^"]+)"/)[1]);
    const paths = ['/','/index.html','/manifest.webmanifest','/sw.js','/gatefall-preview.png','/gatefall-mobile.png','/icons/gatefall-512.png'];
    return Promise.all(paths.map(async path => [path, !!(await cache.match(path))]));
  });
  // sw.js is deliberately fetched by the browser's worker update mechanism, not the app-shell cache.
  assert(cached.filter(x => x[0] !== '/sw.js').every(x => x[1]), JSON.stringify(cached));

  await page.locator('#bInstall').click();
  assert.equal(await page.locator('.sheet h2').textContent(), 'Install Gatefall');
  assert((await page.locator('.sheet').textContent()).includes('Offline play'));
  assert((await page.locator('.sheet').textContent()).includes('Online multiplayer'));
  await page.evaluate(() => closeSheet());
  await page.locator('#bSound').click();
  assert.equal(await page.locator('.tg').count(), 4);
  await page.getByRole('button', {name:'Install app & offline play'}).click();
  assert.equal(await page.locator('.sheet h2').textContent(), 'Install Gatefall');
  await page.evaluate(() => closeSheet());

  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {offline:true, latency:0, downloadThroughput:0, uploadThroughput:0});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('.mbtn.orange');
  assert.equal(await page.title(), 'Gatefall — Pixel Card Battler');
  assert(await page.evaluate(async () => {
    try { await fetch('/api/rooms/offline-probe', {cache:'no-store'}); return false; }
    catch (error) { return true; }
  }), 'A network-only API request should fail while the cached app remains usable');
  await page.locator('[data-go="bot"]').click();
  await page.waitForFunction(() => S && ui.match === 'bot' && ui.view === 'game');
  assert.equal(await page.locator('#gameView').isVisible(), true);
  await page.evaluate(() => {
    // Chromium's mobile emulation can leave navigator.onLine unchanged; the network itself is verifiably offline above.
    Object.defineProperty(navigator, 'onLine', {configurable:true, get:() => false});
    dispatchEvent(new Event('offline'));
    showView('menu');
  });
  await page.locator('[data-go="lobby"]').click();
  await page.waitForSelector('.status.warn');
  assert((await page.locator('#lobbyView').textContent()).includes("You're offline"));

  await cdp.send('Network.emulateNetworkConditions', {offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('.mbtn.orange');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  assert.deepEqual(errors, []);
  console.log('PASS: Gatefall manifest, installability, all icon purposes, install controls, app-shell cache, offline local play, offline messaging, and online recovery');
  await context.close();
})().catch(error => { console.error(error); process.exit(1); });
