#!/usr/bin/env node
/* Renders every app icon, splash screen and the Google Play graphics from public/gatefall-icon.svg.
   Pixel-exact (nearest-neighbour scaling, the title is drawn with a built-in 5x7 pixel font), so it needs no
   fonts or internet. Needs Playwright:  npm install --no-save playwright && npx playwright install chromium
     node scripts/make-icons.mjs
   Writes:
     platforms/mobile/assets/   icon-only.png, icon-foreground.png, icon-background.png, splash.png, splash-dark.png
                                (inputs for `npx capacitor-assets generate`, which makes every Android/iOS size)
     platforms/desktop/build/   icon.png (electron-builder makes the .ico/.icns from it)
     store/google-play/graphics/ icon-512.png (store icon), feature-graphic.png (1024x500) */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let chromium;
try { ({ chromium } = createRequire(import.meta.url)("playwright")); }
catch (e) { console.error("Playwright is missing. Run: npm install --no-save playwright && npx playwright install chromium"); process.exit(1); }

const svg = fs.readFileSync(path.join(ROOT, "public", "gatefall-icon.svg"), "utf8");
const BG = "#0c1117";
const jobs = [
  // [file, width, height, kind]
  ["platforms/mobile/assets/icon-only.png", 1024, 1024, "full"],
  ["platforms/mobile/assets/icon-foreground.png", 1024, 1024, "foreground"],
  ["platforms/mobile/assets/icon-background.png", 1024, 1024, "background"],
  ["platforms/mobile/assets/splash.png", 2732, 2732, "splash"],
  ["platforms/mobile/assets/splash-dark.png", 2732, 2732, "splash"],
  ["platforms/desktop/build/icon.png", 1024, 1024, "full"],
  ["store/google-play/graphics/icon-512.png", 512, 512, "full"],
  ["store/google-play/graphics/feature-graphic.png", 1024, 500, "feature"],
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><body style='margin:0'></body>");
for (const [file, w, h, kind] of jobs){
  const dataUrl = await page.evaluate(async ({svg, w, h, kind, BG}) => {
    const img = new Image();
    const noBg = svg.replace(/<rect width="64" height="64" fill="#0c1117"\/>/, "");
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(kind === "foreground" ? noBg : svg);
    await img.decode();
    // rasterize the 64x64 artwork once at 1:1, then scale by whole pixels only
    const src = document.createElement("canvas"); src.width = src.height = 64;
    src.getContext("2d").drawImage(img, 0, 0, 64, 64);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const emblem = (px, x, y) => g.drawImage(src, 0, 0, 64, 64, x, y, 64 * px, 64 * px);
    if (kind === "full"){ emblem(w / 64, 0, 0); }
    else if (kind === "foreground"){ const px = Math.floor(w * 0.44 / 64); emblem(px, (w - 64 * px) / 2, (h - 64 * px) / 2); }   // inside the adaptive-icon safe zone
    else if (kind === "background"){ g.fillStyle = BG; g.fillRect(0, 0, w, h); }
    else if (kind === "splash"){ g.fillStyle = BG; g.fillRect(0, 0, w, h); const px = Math.floor(w * 0.22 / 64); emblem(px, Math.round((w - 64 * px) / 2), Math.round((h - 64 * px) / 2)); }
    else if (kind === "feature"){
      // 5x7 pixel font (rows top to bottom), enough for the title and tagline
      const F = {
        "A":[".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], "B":["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."], "C":[".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
        "D":["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."], "E":["#####", "#....", "#....", "####.", "#....", "#....", "#####"], "F":["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
        "G":[".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".####"], "H":["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], "I":["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
        "K":["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"], "L":["#....", "#....", "#....", "#....", "#....", "#....", "#####"], "M":["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
        "N":["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"], "O":[".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], "P":["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
        "Q":[".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"], "R":["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"], "S":[".####", "#....", "#....", ".###.", "....#", "....#", "####."],
        "T":["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."], "U":["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], "V":["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
        "W":["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"], "X":["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"], "Y":["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
        ".":[".....", ".....", ".....", ".....", ".....", ".##..", ".##.."], "·":[".....", ".....", ".....", ".##..", ".##..", ".....", "....."],
      };
      for (const k in F) F[k] = F[k].join("");
      const text = (str, px, x, y, color, shadow) => {
        let cx = x;
        for (const ch of str){
          const glyph = F[ch];
          if (glyph) for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (glyph[r * 5 + k] === "#"){
            if (shadow){ g.fillStyle = shadow; g.fillRect(cx + k * px + px / 2, y + r * px + px / 2, px, px); }
          }
          if (glyph) for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (glyph[r * 5 + k] === "#"){
            g.fillStyle = typeof color === "function" ? color(r) : color; g.fillRect(cx + k * px, y + r * px, px, px);
          }
          cx += 6 * px;
        }
        return cx - px - x;
      };
      const width = (str, px) => str.length * 6 * px - px;
      g.fillStyle = BG; g.fillRect(0, 0, w, h);
      // a faint pixel grid and a teal glow behind the emblem
      for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4){
        const d = Math.hypot(x - 230, y - 250) / 380;
        if (d < 1 && ((x + y) / 4) % 2 === 0){ g.fillStyle = `rgba(47,179,155,${(0.16 * (1 - d)).toFixed(3)})`; g.fillRect(x, y, 4, 4); }
      }
      g.fillStyle = "rgba(255,255,255,.035)";
      for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1);
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let n = 0; n < 70; n++){ g.fillStyle = rnd() < .5 ? "rgba(255,217,104,.5)" : "rgba(47,179,155,.45)"; const s = rnd() < .2 ? 4 : 2; g.fillRect(Math.floor(rnd() * w / 2) * 2, Math.floor(rnd() * h / 2) * 2, s, s); }
      emblem(5, 70, 90);
      const tx = 440, avail = w - tx - 40;
      const tp = Math.floor(avail / (6 * 8 - 1));
      text("GATEFALL", tp, tx, 150, r => r === 0 ? "#ffd968" : r >= 5 ? "#d99a1e" : "#f2b632", "#5a3608");
      const sub = "DUEL · HUNT · CONQUER", sp = 4;
      text(sub, sp, tx + Math.round((width("GATEFALL", tp) - width(sub, sp)) / 2), 150 + 7 * tp + 34, "#2fb39b", "#0a3a33");
      const tag = "PIXEL CARD BATTLER", tg = 3;
      text(tag, tg, tx + Math.round((width("GATEFALL", tp) - width(tag, tg)) / 2), 150 + 7 * tp + 34 + 7 * sp + 26, "#8fa3b5", null);
    }
    return c.toDataURL("image/png");
  }, {svg, w, h, kind, BG});
  const out = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("wrote", file, `${w}x${h}`);
}
await browser.close();
