#!/usr/bin/env node
/* Takes the Google Play screenshots from the real game: phone (1080x1920), 7" tablet (1920x1200) and
   10" tablet (2560x1600). Run it whenever the game's look changes:
     npm install --no-save playwright && npx playwright install chromium
     node server.mjs                       (in another terminal, from the project root)
     node store/google-play/make-screenshots.mjs [--url http://localhost:3000] [--device phone] [--scene duel,tag]
   Output: store/google-play/screenshots/<device>-<n>-<scene>.png. Look through them and keep the best 4-8 per
   device. Bots play the duels, so every run gives different boards; run it again for other moments. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argUrl = process.argv.indexOf("--url");
const URL = argUrl > 0 ? process.argv[argUrl + 1] : "http://localhost:3000";
const argOf = k => { const n = process.argv.indexOf(k); return n > 0 ? process.argv[n + 1].split(",") : null; };
const ONLY_DEVICES = argOf("--device"), ONLY_SCENES = argOf("--scene");
let chromium;
try { ({ chromium } = createRequire(import.meta.url)("playwright")); }
catch (e) { console.error("Playwright is missing. Run: npm install --no-save playwright && npx playwright install chromium"); process.exit(1); }

const DEVICES = [
  { name: "phone", viewport: { width: 360, height: 640 }, scale: 3, mobile: true },          // 1080x1920
  { name: "tablet7", viewport: { width: 960, height: 600 }, scale: 2, mobile: true },        // 1920x1200
  { name: "tablet10", viewport: { width: 1280, height: 800 }, scale: 2, mobile: true },      // 2560x1600
];
// boards worth showing: [scene, how to start it, play until this turn]
const SCENES = [
  ["menu", null, 0],
  ["duel", "newBotDuel(2)", 5],
  ["hunt", "newHunt('cindermaw')", 4],
  ["coop", "newCoop('skarra')", 3],
  ["tag", "newTagDuel()", 4],
  ["ffa", "newBotDuel(4)", 4],
  ["deck", "showView('deck')", 0],
];
const OUT = path.join(HERE, "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch();
for (const d of DEVICES){
  if (ONLY_DEVICES && !ONLY_DEVICES.includes(d.name)) continue;
  const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.scale, isMobile: d.mobile, hasTouch: true });
  const page = await ctx.newPage();
  let n = 0;
  for (const [scene, startCode, untilTurn] of SCENES){
    ++n;
    if (ONLY_SCENES && !ONLY_SCENES.includes(scene)) continue;
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { try { setBanners(false); Sound.setMusic(false); Sound.setSfx(false); } catch (e) {} });
    if (startCode) await page.evaluate(code => (0, eval)(code), startCode);
    if (untilTurn){
      // let the bots play both sides until a busy board in the human seat's main phase
      const t0 = Date.now();
      let tries = 0;
      while (Date.now() - t0 < 150000){
        const done = await page.evaluate(until => {
          if (!S) return true;
          if (S.winner != null) return "over";
          if (S.turn >= until && (S.active === ME || onActiveTeam(S, ME)) && S.phase === "main1" && !S.pending && !ui.busy && P(S, ME).m.filter(Boolean).length >= 2) return true;
          if (ui.busy) return false;
          const pd = S.pending;
          if (pd && pd.player === ME){ dispatch(pd.type === "respond" ? {t:"respond", value:null} : {t:"choose", value:botChoose(S, pd)}); return false; }
          if ((S.drawWait || []).includes(ME)){ dispatch({t:"draw"}); return false; }
          if (canAct(S, ME)) dispatch(botAction(S, ME) || {t:"endTurn"});
          return false;
        }, untilTurn).catch(() => false);
        // a duel that ended before the moment we want: start it again (a finished board makes a poor screenshot)
        if (done === "over" && ++tries < 4){ await page.evaluate(code => { ui.sheet = null; (0, eval)(code); }, startCode); continue; }
        if (done) break;
        await sleep(250);
      }
      await page.evaluate(() => { ui.sheet = null; renderSheet(); render(); });
      await sleep(1800);
    } else await sleep(600);
    const file = path.join(OUT, `${d.name}-${n}-${scene}.png`);
    await page.screenshot({ path: file });
    console.log("saved", path.relative(process.cwd(), file));
  }
  await ctx.close();
}
await browser.close();
