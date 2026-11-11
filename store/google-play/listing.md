# Google Play store listing (English)

Copy these into Play Console → Grow users → Store presence → Main store listing. Limits are Google's.

## App name (max 30 characters)
```
Gatefall: Pixel Card Battler
```
(28 characters)

## Short description (max 80 characters)
```
Build a deck, duel friends and hunt giant bosses in a pixel-art card battler.
```
(77 characters)

## Full description (max 4000 characters)
```
Summon monsters, set traps and break through your rival's 8000 Life Points in Gatefall, a pixel-art card battler you can play alone, with a friend at your side, or against up to three friends online.

DUEL YOUR WAY
• Duel the bot: practice one-on-one against the computer.
• Monster Hunter: take on seven giant bosses, each with its own powers and protections. Bring their Life Points to zero to capture them as cards for your deck.
• Co-op hunts: two hunters share one field and one turn against a boss.
• 2v2 Tag Team: you and an ally share a field and a turn against two rivals.
• Free-for-all: three or four players, everyone against everyone.
• Online multiplayer: open a room, share the four-letter code, and play over Wi-Fi or mobile data. No account and no sign-in.

BUILD YOUR DECK
• 91 cards: monsters, spells, quick spells and traps.
• Pick a Duelist with their own passive power.
• Every monster has its own Life Points: wear down big monsters over several turns, heal them, or finish them with spells.
• Frontier Fields, team attacks, flying and double-damage monsters, berserk monsters and chains of responses.
• The Deck Editor checks your deck as you build it.

MADE FOR PLAYING
• Crisp pixel art and a chiptune soundtrack made for the game.
• Plays on phones and tablets, in portrait or landscape.
• Solo modes work offline.
• No ads. No in-app purchases. No accounts. No tracking.
```

## Category and tags
- App or game: **Game**
- Category: **Card**
- Tags (pick up to 5 in Play Console): Card battler, Deck building, Strategy, Pixel art, Multiplayer (choose from Google's list)

## Contact details (required, shown publicly)
- Email: a support address you are happy to show publicly (not a private inbox)
- Website: the address where the web version / privacy policy lives (optional)

## Privacy policy URL (required)
The address of `public/privacy.html` on your server, e.g. `https://play.your-domain.com/privacy`
(`server.mjs` serves it at `/privacy`). Fill in the yellow placeholders in that file first.

## Graphics
| Asset | Requirement | File |
|---|---|---|
| App icon | 512 x 512 PNG, 32-bit, ≤ 1 MB | `graphics/icon-512.png` |
| Feature graphic | 1024 x 500 PNG or JPEG, no transparency | `graphics/feature-graphic.png` |
| Phone screenshots | 2–8, 16:9 or 9:16, 320–3840 px per side; at least 4 at ≥1080 px for better placement | `screenshots/phone-*.png` |
| 7" tablet screenshots | up to 8 | `screenshots/tablet7-*.png` |
| 10" tablet screenshots | up to 8 | `screenshots/tablet10-*.png` |

Regenerate: `node scripts/make-icons.mjs` and `node store/google-play/make-screenshots.mjs` (with `node server.mjs`
running). Avoid screenshots showing cards whose names or art are still on the list in `IP-REVIEW.md`.
