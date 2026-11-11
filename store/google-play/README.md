# Google Play release checklist

Everything Gatefall needs for its first Google Play release, in order. Files in this folder:
`listing.md` (store texts), `data-safety.md`, `content-rating.md`, `graphics/`, `screenshots/`,
`make-screenshots.mjs`, `assetlinks.template.json`. The app build itself is in `platforms/mobile/`.

Facts below were checked in November 2026; Google changes its rules often, so glance at the Play Console
Help Center when you start.

## 0. Decisions only you can make
- [ ] **Application ID** (package name), e.g. `com.yourname.gatefall`. Permanent after the first upload.
- [ ] **Developer name** shown on Play, and whether you publish as a **personal** or **organization** account.
- [ ] **Card names and art** listed in `../../IP-REVIEW.md`: rename/redraw before a public release.
- [ ] Where the **room server** and the **privacy policy** will live (see `PUBLISHING.md`, "Room server").
- [ ] Price: free (recommended). Google Play lets a paid app become free, but a free app can never become paid.

## 1. Developer account
- [ ] Sign up at play.google.com/console with a Google account you'll keep. One-time fee: **US$25**.
- [ ] Identity verification (government ID; organizations also need a D-U-N-S number). Takes a few days.
- [ ] Verify a contact phone number and email.
- [ ] Personal accounts created after 13 November 2023 must run a **closed test with at least 12 testers who
      stay opted in for 14 days in a row** before they can apply for production access. Organization accounts
      skip this. Plan two to three weeks for it.

## 2. Build requirements (handled by `platforms/mobile`)
- [ ] **Target API level 36** (Android 16): required for new apps and updates since 31 August 2026.
      Capacitor 8 uses compileSdk/targetSdk 36 and minSdk 24 (Android 7.0+).
- [ ] Upload format: **Android App Bundle (.aab)**, signed with your upload key; **Play App Signing** on.
- [ ] `versionCode` goes up with every upload.
- [ ] 64-bit: automatic (no native code of our own).
- [ ] Edge-to-edge layout on Android 15/16: the game uses safe-area insets; check on a phone with a notch and
      with gesture navigation and 3-button navigation.
- [ ] Permissions: only INTERNET (Capacitor adds it). No location, camera, contacts, ad ID.

## 3. Create the app in Play Console
- [ ] Create app → name "Gatefall: Pixel Card Battler", default language English (United States),
      **Game**, **Free**, accept the declarations.
- [ ] App content (Policy and programs → App content): privacy policy URL, ads (none), app access
      (no login needed), content rating, target audience (13+), data safety, news (no), government (no),
      financial features (none), health (none). Answers: `data-safety.md`, `content-rating.md`.
- [ ] Store listing: texts from `listing.md`, icon, feature graphic, screenshots.
- [ ] Store settings: category **Card**, contact email.

## 4. Testing tracks
1. **Internal testing** (up to 100 testers, available within minutes): upload the first .aab here and try it
   on your own phones. Check: offline modes, hosting and joining an online room against the web version,
   back button, rotating the phone, sound after switching apps, notches.
2. **Closed testing** (required 12+ testers for 14 days on new personal accounts): create a Google Group or
   an email list, share the opt-in link, keep them opted in. Ask them to actually play (Google looks at
   engagement), and collect feedback.
3. **Production**: after the 14 days, Dashboard → "Apply for production access" (questions about your testing),
   then create a production release. Start with a staged rollout (for example 20%).

Review usually takes from a few hours to several days; first submissions often take longer.

## 5. Before every update
- [ ] Bump `GAME_VERSION` in `index.html` (and the service worker cache name) and `versionCode`/`versionName`.
- [ ] Run the test scripts in `tests/`.
- [ ] `npm run web -- --server … && npx cap sync android`, build the signed .aab, upload, write release notes.
- [ ] Keep the room server compatible with older app versions still installed (players update slowly).
      The relay itself doesn't care about versions; the game compares `GAME_VERSION` when a duel starts and
      tells players with a different version to update.

## 6. After launch
- Watch Android vitals (crashes/ANRs) and reviews in Play Console.
- Keep the target API level current: Google raises it every year (usually by 31 August).
- Re-answer the content rating and data safety forms whenever features change.

## Other Android stores (optional)
The same `.aab`/`.apk` can go to the Samsung Galaxy Store, Amazon Appstore or itch.io. Note that Google's new
**Android developer verification** (rolling out since 2026) requires apps installed outside Play on certified
devices to come from a verified developer; a verified Play developer account covers this.
