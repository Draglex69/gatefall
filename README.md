# Gatefall

A pixel-art card battler: summon monsters, set traps, hunt giant bosses and duel your friends online,
alone, in co-op, free-for-all or 2v2.

Written, designed and vibecoded by Alexander Tea.

- **Play:** the website (Cloudflare) and the Android APK are built automatically by GitHub Actions on every
  push to `main`. The APK is attached to the latest [release](../../releases/latest).
- **The game:** `index.html` (everything) + `public/` (icons, fonts, privacy policy).
- **Online rooms:** `worker/` (Cloudflare Worker + Durable Objects) or `server.mjs` (any Node host).
- **How publishing works:** [PUBLISHING.md](PUBLISHING.md). Project notes: [START-HERE.md](START-HERE.md).
