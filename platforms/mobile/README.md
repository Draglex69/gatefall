# Gatefall for Android and iOS (Capacitor 8)

This folder turns the game into real store apps. The game itself stays the single `index.html` in the
project root; `scripts/build-app.mjs` copies it into `www/` here and Capacitor wraps it in a native app.

Everything below runs on **your computer**, not in the browser. Commands are run from this folder
(`platforms/mobile`) unless noted.

## One-time setup

1. Install **Node.js 22 or newer** (nodejs.org, the LTS version).
2. Install **Android Studio** (Otter 2025.2.1 or newer). On first start let it install the Android SDK.
   It brings its own Java, nothing else to install.
3. iOS only: a Mac with **Xcode 26** or newer.
4. In this folder: `npm install`
5. In the project root, once: `node scripts/fetch-fonts.mjs` (bundles the two pixel fonts so the app
   works offline and never contacts Google). The fonts are under the SIL Open Font License, which allows this.
6. Choose the **application ID** and put it into `capacitor.config.json` as `appId`
   (for example `com.yourname.gatefall`). It is permanent on Google Play: it can never be changed after the
   first upload, and `com.example...` is refused by Play.
7. Create the Android project: `npx cap add android` (and `npx cap add ios` on a Mac).
   Commit the created `android/` and `ios/` folders; they are part of the project from now on.
8. Icons and splash screens: `npm run icons` (uses the images in `assets/`, made by `scripts/make-icons.mjs`).

### Edge-to-edge on Android

Apps that target Android 16 (API 36, required on Google Play) always draw behind the status and navigation
bars. The game already keeps its controls inside the safe area with `env(safe-area-inset-*)`, and
`capacitor.config.json` sets `SystemBars.insetsHandling` to `native`. Capacitor's docs also recommend
turning edge-to-edge on in `android/app/src/main/java/.../MainActivity.java`:

```java
package com.yourname.gatefall;   // your appId

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    EdgeToEdge.enable(this);
    super.onCreate(savedInstanceState);
  }
}
```

## Every build

```bash
# online rooms need your running server.mjs (see PUBLISHING.md, "Room server")
npm run web -- --server https://rooms.your-domain.com --web https://play.your-domain.com
npx cap sync android
npx cap open android            # opens Android Studio; press Run to try it on a phone or emulator
```

Without `--server` the app still works, but only offline modes are offered (solo, hunts, free-for-all and
2v2 against bots, Deck Editor). `--web` is optional: with it, "Copy invite link" shares a link to the web
version; without it, players share the room code.

Before each store upload raise the version in `android/app/build.gradle`:
`versionCode` (a whole number that must go up with every upload: 1, 2, 3…) and `versionName`
(what players see, for example `"1.0.46"`).

## The release file for Google Play (.aab)

1. Android Studio: **Build → Generate Signed App Bundle or APK → Android App Bundle**.
2. Create a new **upload key** (keystore) the first time. Store the file and both passwords somewhere safe
   and backed up (a password manager). Never commit it. With Play App Signing (the default) Google keeps the
   real app signing key, and a lost upload key can be reset through Play support.
3. Choose **release**. The result is `android/app/release/app-release.aab`; upload that in Play Console.

From the command line instead: set up signing in `android/app/build.gradle` (see Android's "Sign your app"
guide), then `npm run bundle`.

## Invite links that open the app (optional, later)

When `--web` is set, invite links look like `https://play.your-domain.com/?room=ABCD`. The app already reacts
to such a link when Android opens it in the app. To make Android do that:

1. Add to the main `<activity>` in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <intent-filter android:autoVerify="true">
     <action android:name="android.intent.action.VIEW" />
     <category android:name="android.intent.category.DEFAULT" />
     <category android:name="android.intent.category.BROWSABLE" />
     <data android:scheme="https" android:host="play.your-domain.com" />
   </intent-filter>
   ```
2. Copy `store/google-play/assetlinks.template.json` to `public/.well-known/assetlinks.json` on the web
   server, with your package name and the SHA-256 fingerprint from Play Console → Test and release →
   App integrity → App signing.

Without this, links simply open the web version, which also works.

## What the game does differently inside the app

`window.GATEFALL_CONFIG` (written by `build-app.mjs`) tells the game it runs as an app:
- no service worker, no "Install app" button, no web manifest;
- online rooms go to the configured server (`server.mjs` allows that with CORS);
- the Android back button closes a sheet or prompt, cancels an attack selection, asks before leaving a duel,
  goes back to the menu, and on the menu closes the app;
- sound pauses while the app is in the background;
- a strict Content Security Policy: the app loads nothing from the internet except your room server.

Saved decks and settings live in the app's own storage (they are not shared with the browser version).
Players can move them with **Save code** in the menu.
