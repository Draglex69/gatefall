# Gatefall for Windows, macOS, Linux and Steam (Electron)

The desktop app is a small Electron window around the same `index.html`. Run everything from this folder
(`platforms/desktop`) on your computer.

## Setup

1. Node.js 22 or newer.
2. `npm install`
3. Once, in the project root: `node scripts/fetch-fonts.mjs` (offline fonts).
4. Put your permanent application ID into `package.json` → `build.appId` (same one as the mobile app is fine).

## Try it

```bash
npm start -- --server https://rooms.your-domain.com
```
(`npm start` without `--server` plays the offline modes only.)

## Installers

```bash
npm run dist:win     # Windows: setup .exe (NSIS) and a portable .exe   → dist/
npm run dist:linux   # Linux: AppImage and .deb                          → dist/
npm run dist:mac     # macOS: .dmg (must be built on a Mac)              → dist/
```
To pass the server for installers, build the files first and then package:
`npm run web -- --server https://rooms.your-domain.com && npx electron-builder --win`.

Unsigned Windows installers show a SmartScreen warning and unsigned Mac apps are blocked by Gatekeeper.
For public releases outside Steam, sign them (Windows: a code-signing certificate or Azure Trusted Signing;
macOS: an Apple Developer ID plus notarization). Steam builds don't need Windows code signing.

## Steam

1. Join Steamworks (Steam Direct fee per game, see PUBLISHING.md) and create the app; note its **App ID**.
2. `npm run steam` makes unpacked folders: `dist/win-unpacked/` and `dist/linux-unpacked/`.
3. Upload those folders as depots with SteamPipe (the Steamworks SDK's `steamcmd` + an app build script).
   Launch options: `Gatefall.exe` (Windows), `gatefall` (Linux).
4. The game runs fine on Steam without any Steamworks code. Achievements, cloud saves or the overlay can be
   added later with `steamworks.js` (`npm install steamworks.js`, then `require("steamworks.js").init(APP_ID)`
   in `main.js`, and `steamworks.js`'s `electronEnableSteamOverlay()` for the overlay).
5. Steam Deck: the Linux build runs there and can be played with the touch screen or the trackpads.
   The game has no gamepad controls yet, so it can't get the "Deck Verified" badge until they are added.

## Microsoft Store (optional)

electron-builder can also make an `.appx`/MSIX (`"win": {"target": ["appx"]}` with your Partner Center
publisher identity). Alternatively, submit the web version as a PWA through PWABuilder.
