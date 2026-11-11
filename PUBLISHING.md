# Publishing Gatefall: web, Google Play, App Store, Windows, macOS, Linux, Steam

The game stays **one file**, `index.html`, plus `public/` (icons, fonts, privacy policy, offline cache).
Every platform gets a copy of it made by `scripts/build-app.mjs`; online play on every platform goes through
one small **room server** (`server.mjs`). Fix a bug once in `index.html` and every platform gets it.

```
index.html + public/ ──► scripts/build-app.mjs ──┬─► build/web/              any static web host, itch.io
                                                 ├─► platforms/mobile/www/   Capacitor → Google Play (.aab), App Store
                                                 └─► platforms/desktop/app/  Electron → Windows, macOS, Linux, Steam
server.mjs ── serves the web version itself + /api/rooms (online rooms for every platform) + /privacy
```

## Website and APK from GitHub (set up November 2026)

The repository `Draglex69/gatefall` builds everything by itself (`.github/workflows/release.yml`) on every push
to `main`, or by hand under Actions → Release → Run workflow:

1. **Website + online rooms** on Cloudflare: the Worker in `worker/` serves the game and runs the rooms (one
   Durable Object per room). Address: `https://gatefall.<your-subdomain>.workers.dev`.
2. **Android APK**, attached to the GitHub Release `v<GAME_VERSION>`. Online rooms in the APK use the website's
   address. With your signing key in the `ANDROID_KEYSTORE_*` secrets, every APK is signed with it (new versions
   install over old ones) and a Play Store `.aab` is built too; without it, each APK gets a throwaway key
   (uninstall the old app before installing a new one).

### One-time Cloudflare setup

1. Cloudflare dashboard → **Workers & Pages**. If asked, pick your free `workers.dev` subdomain.
2. Copy your **Account ID** (Workers & Pages overview, right side, or the address bar after `dash.cloudflare.com/`).
3. My Profile → **API Tokens** → Create Token → template **Edit Cloudflare Workers** → account: yours, zone: All
   zones → Create → copy the token (shown once).
4. GitHub → `Draglex69/gatefall` → Settings → Secrets and variables → Actions → **New repository secret**:
   `CLOUDFLARE_API_TOKEN` = the token, `CLOUDFLARE_ACCOUNT_ID` = the account ID.
5. GitHub → Actions → **Release** → Run workflow. The run's summary shows the website address; the release
   has the APK.
6. Optional: own domain: Cloudflare → the `gatefall` Worker → Settings → Domains & Routes → add your domain,
   then add the repository **variable** `GATEFALL_URL` = `https://your-domain` so the APK uses it.

Free plan budget: every player in an online room asks the server about twice a second, and the free plan
allows 100,000 requests a day, so about 12 player-hours of online play per day. Offline modes cost nothing.
The $5/month Workers Paid plan raises this to 10 million requests a month.

### Your signing key (do this once, keep it forever)

`keytool -genkeypair -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`, keep the file
and passwords safe, then add the secrets `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload.jks`),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`). App ID: `ch.teastory.gatefall`
(change it before the first Play upload if you want another; it is permanent after that).

## What is ready (version 47)

- **Platform switch in the game** (`window.GATEFALL_CONFIG`): apps use a configured room server, have no
  service worker or "Install" button, handle the Android back button, open invite links, pause sound in the
  background, and run under a strict Content Security Policy.
- **Room server** with CORS for the apps and `/api/health` for hosting checks (`server.mjs`, and the same in
  `api/routes/rooms.ts`).
- **Fonts bundled** (`public/fonts/`, SIL Open Font License): no requests to Google or any other site, which also
  keeps the privacy story simple (no third parties at all).
- **Folder-independent web build**: the service worker and manifest work at a site root or in a subfolder.
- **Privacy policy** (`public/privacy.html`, shown in the game under Settings → Privacy policy and served at
  `/privacy`). Fill in the yellow placeholders.
- **Android/iOS project** (`platforms/mobile/`, Capacitor 8, target API 36) with step-by-step README.
- **Desktop project** (`platforms/desktop/`, Electron 45 + electron-builder) with Steam notes.
- **Google Play kit** (`store/google-play/`): checklist, listing texts, data safety and content rating answers,
  icon, feature graphic, screenshot generator and screenshots.
- **Icons and splash screens** for every platform from one source: `node scripts/make-icons.mjs`.
- **IP checklist** (`IP-REVIEW.md`): card names and art to change before a public release.
- Test: `tests/gatefall-v46-app-build.cjs` builds the Android version, serves it from its own origin and plays
  an online duel against the web version through the room server.

## Decisions needed from you

1. **Application ID**, e.g. `com.yourname.gatefall` (permanent on Google Play and the App Store). Put it in
   `platforms/mobile/capacitor.config.json` and `platforms/desktop/package.json`.
2. **Publisher / developer name** and a public **support email**.
3. **Domain** for the web version, the room server and the privacy policy (one `server.mjs` can serve all three).
4. The **cards in `IP-REVIEW.md`** (Kuromi, My Melody, Kong, Red Bull, and exact Yu-Gi-Oh! names).
5. **Price**: free, paid, or free with something optional later. Today the game has no ads or purchases,
   which keeps every store form short.

## Costs (checked November 2026; confirm when you sign up)

| Where | Fee | Notes |
|---|---|---|
| Google Play | US$25 once | personal accounts: closed test with 12+ testers for 14 days before production |
| Apple App Store | US$99 per year | needs a Mac with Xcode 26+ |
| Steam (Steam Direct) | US$100 per game | recouped after US$1,000 in sales; 30 days after paying before release; "Coming soon" page at least 2 weeks |
| Microsoft Store | free for individual developers | |
| itch.io | free | you choose the revenue share |
| Room server | about US$0–7 per month | a small always-on Node host; free tiers that sleep lose rooms when they sleep |
| Domain | about US$10–20 per year | |
| Code signing (optional) | Windows certificate or Azure Trusted Signing; Apple Developer ID comes with the US$99 | only for installers sold outside the stores |

## Recommended order

1. **Decide the items above** and fix the `IP-REVIEW.md` cards (the store screenshots should show the final cards).
2. **Room server + web version on your domain** (needed by the apps for online play and for the privacy policy URL).
3. **Google Play**: start the closed test early, because the 14 days run while you work on the rest.
   Follow `store/google-play/README.md`.
4. **Steam**: create the store page early ("Coming soon" collects wishlists), then release the Electron build.
5. **App Store**: needs a Mac; the Capacitor project is shared with Android.
6. **itch.io / Microsoft Store / web portals**: quick extras.

## Room server

`server.mjs` has no dependencies and runs on any Node 18+ host: Render, Railway, Fly.io, a small VPS, or a PC.
It serves the web version at `/`, the privacy policy at `/privacy`, and online rooms at `/api/rooms`.

- Must be reachable over **HTTPS** (all these hosts provide it). Apps refuse plain http.
- Run **one instance**: rooms live in memory. Don't scale it to several machines without sticky routing.
- Hosts that sleep when idle (free tiers) drop the rooms of a sleeping server and make the first connection slow.
- Optional: `ALLOWED_ORIGINS` restricts which origins may use the rooms (the apps use `https://localhost`
  on Android, `capacitor://localhost` on iOS and `app://gatefall` on desktop).
- Health check for the host's dashboard: `GET /api/health`.

Then build the apps with `--server https://your-domain` (and `--web https://your-domain` for invite links).

## Web

- **Your own site**: deploy the project with `node server.mjs` (web version + rooms + privacy page together).
- **Static hosts / itch.io / portals**: `node scripts/build-app.mjs --platform web --server https://your-domain`
  makes `build/web/`. Zip its contents and upload as an HTML5 game on itch.io ("This file will be played in the
  browser", embed size e.g. 1280x820, enable the fullscreen button and mobile friendly). Without `--server`,
  online rooms only work when the page is served by `server.mjs`.
- The Claude artifact link stays a good way to share test versions with friends; it is not meant as the public home.

## Android (Google Play)

`platforms/mobile/README.md` (building the app) and `store/google-play/README.md` (the Play Console steps).

## iOS (App Store)

1. On a Mac with Xcode 26+: in `platforms/mobile`, `npm install`, `npx cap add ios`, `npm run icons`,
   `npm run ios -- --server https://your-domain` (opens Xcode).
2. In Xcode: set the Team (your Apple Developer account), bundle identifier = your app ID, version and build number.
3. Add a privacy manifest if Xcode or App Store Connect asks for one (Capacitor documents which "required reason"
   APIs it uses).
4. Product → Archive → upload to App Store Connect; test with **TestFlight**.
5. App Store Connect: privacy "nutrition label" (same facts as `store/google-play/data-safety.md`: name and
   gameplay, optional, for app functionality, not linked to identity, no tracking), age rating questionnaire
   (same answers as `content-rating.md`), screenshots (6.9" and 13" iPad sizes; `make-screenshots.mjs` can be
   extended with those viewports), description from `listing.md`.
6. Apple rejects apps that are "just a website"; Gatefall is a complete game bundled inside the app, works offline,
   and handles the safe area, so it should pass guideline 4.2.

## Windows, macOS, Linux and Steam

`platforms/desktop/README.md`: `npm start` to try, `npm run dist:win|dist:linux|dist:mac` for installers,
`npm run steam` for the folders you upload to Steam with SteamPipe.

Before a Steam release, consider: **gamepad controls** (needed for "Steam Deck Verified" and the "Full controller
support" tag), Steam achievements (via `steamworks.js`), and a windowed/fullscreen setting (F11 works already).

## Keeping versions in step

- `GAME_VERSION` in `index.html` is the single version number. Raise it with every release, together with the
  service worker cache name in `public/sw.js`.
- Android `versionCode` = `GAME_VERSION` (e.g. 46), `versionName` = e.g. `1.0.46`; same idea for iOS build numbers
  and `platforms/desktop/package.json` `version`.
- Online duels need the same `GAME_VERSION` on all devices; the game tells players to update when it differs.
  Stores roll updates out over days, so expect a short overlap after each release.

## Still worth doing in the game before 1.0

- Rename/redraw the `IP-REVIEW.md` cards.
- Gamepad support (Steam, Steam Deck, Android TV-style controllers).
- A player-name filter (blocked words), useful once strangers can meet in rooms.
- Tablet layout: in landscape on a tablet the board is sized by the screen height and leaves wide empty margins (see `store/google-play/screenshots/tablet7-*`); bigger cards there would make better tablet screenshots.
- Translations (store listings can be localized too; German and Spanish are easy first picks).
