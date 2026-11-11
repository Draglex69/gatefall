# Data safety form (Play Console → Policy and programs → App content → Data safety)

These answers match what the game does in version 47 (see `public/privacy.html`). If you add analytics,
ads, crash reporting, accounts or purchases later, the answers change.

## Overview questions
| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (only for online multiplayer) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (the room server must run on HTTPS) |
| Do you provide a way for users to request that their data is deleted? | **No** → there is nothing to request: online room data is deleted automatically within hours; everything else stays on the device. (If you prefer, answer Yes and point to the contact email in the privacy policy.) |

## Data types
Mark these as **collected** (sent off the device), **not shared**:

| Category → type | Collected? | Why / details |
|---|---|---|
| Personal info → **Name** | Yes, **optional** | The player name typed for online rooms (Google counts nicknames as "Name"). Purpose: **App functionality**. Not processed ephemerally (kept in memory while the room exists). |
| App activity → **Other actions** (Google's examples for this type include gameplay) | Yes, **optional** | The moves of an online duel, relayed to the other players. Purpose: **App functionality**. |

Not collected: location, contacts, photos/videos, audio, files, calendar, messages, health, financial info,
web browsing, device or other IDs (the room ID is random per session and not tied to the device; if you want
to be extra careful, add "Device or other IDs" as optional, App functionality), app info and performance
(no crash logs), advertising ID.

**Sharing**: answer **No**. Showing your name and moves to the players you chose to play with is a
user-initiated transfer, which Google does not count as sharing.

## Other "App content" declarations
| Declaration | Answer |
|---|---|
| Privacy policy | URL of `privacy.html` |
| Ads | **No, my app does not contain ads** |
| App access | **All functionality is available without special access** (no login) |
| Content rating | see `content-rating.md` |
| Target audience and content | see `content-rating.md` |
| News app | No |
| COVID-19 contact tracing / status | No |
| Government app | No |
| Financial features | None |
| Health | None |
| Data deletion | not applicable (no accounts) |
| Advertising ID | No (the app does not use it; Capacitor does not add the AD_ID permission) |
