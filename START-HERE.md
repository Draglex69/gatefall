# Gatefall — New Chat Transfer Notes

## Start here

Upload `Gatefall-complete-project.zip` to the new chat and include this note. The ZIP contains the current game, hosted multiplayer server, installable PWA files, build configuration, regression tests, and these transfer notes.

The main game is **Gatefall v50**. The current in-code constant is `const GAME_VERSION = 50`. A test copy is published as a Claude artifact (https://claude.ai/artifact/NvnjZUhEWsx6ys1cqrnz8N). Store releases are prepared but not done yet: see `PUBLISHING.md`.

## Most important files

- `index.html` — complete current game source, including rules, cards, art, UI, animation, networking client, settings, and install controls.
- `public/manifest.webmanifest` — installable PWA manifest.
- `public/sw.js` — offline app-shell worker; current cache name is `gatefall-v50-shell-r1`. Works at a site root or in a subfolder.
- `public/fonts/` — the two pixel fonts (Jersey 10, Pixelify Sans; OFL) bundled; the game loads nothing from other sites.
- `public/privacy.html` — privacy policy (placeholders in yellow), shown in-game under Settings → Privacy policy and served at `/privacy`.
- `server.mjs` — zero-dependency Node server (game + `/api/rooms` relay). `node server.mjs` runs the whole game with public online rooms; no `npm install` or build needed.
- `public/icons/` — standard, maskable, and Apple icons.
- `public/gatefall-preview.png` and `public/gatefall-mobile.png` — social and installation images.
- `api/routes/rooms.ts` — hosted multiplayer room API.
- `api/lib/vite.ts` — HTML serving, social metadata, cache handling, and app integration.
- `api/boot.ts` and the other `api/` files — server entry and supporting backend code.
- `package.json` and `package-lock.json` — dependencies and commands.
- `tests/` — current deterministic, browser, hosted-online, PWA and app-build regression scripts.
- `PUBLISHING.md` — how to publish on web, Google Play, App Store, Windows/macOS/Linux and Steam; costs, order, decisions.
- `IP-REVIEW.md` — card names/art to change before a public release (Sanrio, King Kong, Red Bull, exact Yu-Gi-Oh! names).
- `scripts/build-app.mjs` — builds the game for `web`, `android`, `ios` or `desktop` with `window.GATEFALL_CONFIG`; `scripts/make-icons.mjs` — every icon, splash and store graphic from `public/gatefall-icon.svg`.
- `platforms/mobile/` — Capacitor 8 project (Android/iOS); `platforms/desktop/` — Electron project (Windows/macOS/Linux/Steam).
- `store/google-play/` — Play Console checklist, listing texts, data safety + content rating answers, graphics, screenshots and their generator.

No `.env` file or private credentials are included. Use `.env.example` if environment configuration is needed. `node_modules/` and generated `dist/` output are deliberately excluded; reinstall and rebuild them.

## Run locally

Quickest (no install, no build):

```bash
node server.mjs            # http://localhost:3000, PORT=... to change
```

The Vite/Hono stack still works too:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Note: `package-lock.json` used to point at a private npm mirror (`npm.mirrors.msh.team`); it now points at the public registry.

Production:

```bash
npm run build
PORT=3100 npm start
```

The production build creates `dist/public/` and `dist/boot.js`. The project did not contain a Dockerfile at the time of packaging.

## What the game does

Gatefall is a pixel-art card battler with:

- Solo duels and free-for-all play.
- Deck Editor with save codes and a Test Field.
- Hosted multiplayer rooms and shared public invite links.
- Two-player cooperative Monster Hunter boss fights.
- Same-duel boss rush and multiple capturable bosses.
- Shared hunter turns, reaction chains, monsters, summoning resources, and combined attacks.
- Duelists, Flip effects, Spells, Traps, Xyz monsters, dice, animations, and responsive layouts.
- Installable PWA behavior with offline local modes; multiplayer APIs remain network-only.

## Major completed work

### Gameplay and cards

- Portable save codes.
- Duelist attack protection and summon-position choices.
- Axiom Archon effects and multi-element badges.
- Tribute ladder: Levels 5–6 need 1 tribute, 7–8 need 2, 9–10 need 3, 11–12 need 4, and Level 13+ needs 5.
- Kong-inspired capturable boss with skyscraper scale and chest-beating.
- One manual Attack/Defense Position change per monster per turn, except on its summon turn.
- Level 2 Flip monsters with bounce/draw effects and Quick Effect self-setting.
- Riptide Caller, face-down protection rules, draw Traps, Ironheart Warden, draw-to-seven Spell, Aurum Revenant fix, Duelist Blessing/Curse rules, Yuki Onna/Whiteout behavior, Crash Arrival, and Graveseed Sprite.
- Kuromi and My Melody Kitty monsters.
- Rolling pixelated 3D dice and optional phase banners.
- Manual Draw Phase deck taps and swipes.
- Varied boss protection puzzles and unlockable Duelists.

### Co-op and field layout

- Default co-op layout: seven shared monster zones, seven shared Spell/Trap positions, one shared Graveyard, and one shared Banishment.
- Duelists occupy shared Spell/Trap positions 3 and 5.
- Ordinary co-op monster slots are `[0,1,2,3,4,7,8]`; `BOSS = 6`, `FF = 5`, and `BOSS_MID = 2`.
- Owner-aware monster references such as `1:0` preserve card ownership.
- The former two-row layout remains available in Settings through `S.splitField`.
- Layout changes use the numbered deterministic action `{t:"fieldLayout",split:true|false}`.
- Shared Spell/Trap arrays are linked by `linkCoopST(S)` without compacting occupied slots.
- Boss Graveyard/Banishment sides were swapped.
- Deck, Extra Deck, Graveyard, and Banishment zones use monster-zone dimensions.
- Both hunters’ Decks and Extra Decks were later changed from paired sideways piles to the current view: only the local player’s pile is full-size; the partner has a compact tappable icon and count. Extra Deck partner icon is on the left; Deck partner icon is on the right.
- Yellow hunter/LP labels above the monster field and the full local Duelist name below it were removed.
- Partner LP appears beside the local player’s LP beneath the field.

### Multiplayer and PWA

- Numbered deterministic actions, state hashes, snapshots, rollback, retransmission, rejoin, rematches, and HTTP room polling.
- Online co-op seats: host hunter 0, guest hunter 1, host-controlled boss bot 2.
- PWA manifest uses standalone display and any orientation.
- Standard, maskable, and Apple icons plus wide/narrow installation screenshots.
- Install/help controls, offline shell caching, and update-safe no-cache handling for HTML, manifest, and worker.
- `/api/*` traffic is explicitly excluded from service-worker interception.

## v51 changes (2026-11-12): full checkup

Rules (`tests/gatefall-v51-rules.cjs`):
- Co-op hunts: the boss keeps its 3 powers (`newGame` made the 7-slot boss row after `setupBoss`, wiping them).
- `bossStandby` now runs in the boss's Standby Phase (`beginStandby`): Regenerating Ooze / Molten Heart heal, destroyed powers return after 3 rounds. Mitosis and Brood Chamber use `tokenId` instead of `token`, so `sweepTokens` no longer deletes them.
- Battle protection questions (Warden paying 1000, Graveseed, a Warden on the field destroying itself instead: new prompt `wardenSaveBattle`) are all asked before the battle in `prepareBattleWardens`, one monster at a time; `battleAskable` skips tokens and monsters saved anyway (`autoSaved`: invincible, endure, Bulwark Aegis). Inside the battle (`S.inBattle`, `resolveBattleNow`) `destroyMonster` never opens a prompt; no answer means "no".
- Mercy Colossus heals instead of damaging monsters too, and when attacked (`merciful` in `resolveBattleNow`).
- A Defense Position attacker that loses its ability in the chain (Skill Drain) stops its attack.
- Velvet Nyx steals only from opponents; Show Off's petrified monsters can't block; the bot weighs Veilmoth Sprite by the damage that would really reach its LP; phased-out monsters come back with the LP they left with (`S.exiled[].lp`).
- Texts: Fireball, Skyfire Judgment, Rampart Ram (direct attack deals its DEF), rules sheet "Attacking".

Screen (`tests/gatefall-v51-ui.cjs`):
- Attack mode: chosen attacker (gold glow) and targets (blinking red, static with reduced motion) are outlined in `::after` above the card.
- Bigger board on big screens: `--appmax` (980px in a duel), `--zmax` 112px, `--zmaxc` 84px. Landscape screens at least 1000px wide (Fold inner held sideways, tablets, desktops) use the side-by-side layout (`--appmax: 100vw - 380px`). The side column keeps 44px clear for the phase column.
- Co-op / 2v2 width formula counts the two small side piles (`/ 10.12`), so cards are ~25% bigger on narrow phones; the hand uses spare height there. Cards under 38px (`body[data-tiny]`) show their LP as a bar only. Badges scale with the card (`--bf`); the ×2 badge stays inside its zone above the LP badge.
- Captured! overlay scrolls and shrinks its card on short screens; safe-area top/bottom padding outside duels; boss sprite (`.bwrap` z-index 2) sits under neighbouring cards; `#fx` goes under an open sheet; the end screen waits for the final blow (`ui.endHoldSince`); hunt tiles no longer stretch; Log/Rules buttons stick to the sheet bottom; boss cards show the boss's LP; Duelist chips in one row (pictures only under 520px); Android back closes any open sheet.
- Still open: privacy policy placeholders (name, contact address, release date, hosting provider).

## v50 changes (2026-11-04): Double Damage

- **Double Damage** is a monster property like Flight: from the card (`doubleDmg:true`, negated by Skill Drain) or given by an effect (`z.doubleDmg`, not negated, lost when the monster leaves the field); `hasDouble(S, z)`. When the monster attacks on its own, the battle damage it inflicts is doubled (`dbl`/`twice()` in `resolveBattle`): the gap it deals to a monster's LP (Attack or Defense target, blockers, a boss's LP) and damage to the player (direct attacks, carry-over; also Rampart Ram's throw-back if it ever has the property). Not doubled: team attacks, damage it takes when it loses, recoil from a higher DEF. `battleDestructionTargets` and the bots count the doubled damage. A ×2 badge (`.dblb`) shows on its zone; the card sheet says DOUBLE DAMAGE; rules sheet explains Flight and Double Damage together.
- **Crushhorn Rhino** (`rhino`, Level 4, 1400/1200, Stone Beast, 1400 LP, Double Damage, new pixel art); in the base `DECK` instead of the second Shadowpaw Kitten.
- Tests: `tests/gatefall-v50-double.cjs`; the v42 attack UI test clears the bot's hand and traps so a response can't change the checked battle.

## v49 changes (2026-11-04): card text beside the card

- Every big card (`bigCard`) has one size, 196 x 310 px (a monster with a short text); a long text scrolls inside the card's text box (`.bc .tx` flex + `overflow-y:auto`) instead of stretching the card. Face-down cards match.
- Card sheets (hand, field, Graveyard, Duelist, boss, deck editor) show the card's text large beside the card (`cardTextBlock(id)`, `.ctext`, scrolls when long); `cardType(d)` gives the [Race / Kind] line for both. Sheets with a card are wider (`.sheet:has(.cardview)`); on phones the card is shown at 74% so the text still fits beside it (stacks only below 330 px).
- Tests: `tests/gatefall-v49-card-sheet.cjs`.

## v48 changes (2026-11-03): one screen, no scrolling

- The page never scrolls on any device: `html`/`body` are fixed to the screen (`box-sizing:border-box` so the Claude viewer's safe-area padding fits inside), `overscroll-behavior:none`, `.app` fills the height and every open view gets the rest (`.view:not([hidden]){flex:1; min-height:0}`). Opened in the Claude phone app, the page used to be a little taller than the screen (the viewer's notch/home-bar padding was added on top), so it could be dragged off screen.
- `fitScreen()` (via `scheduleFit()`, after each render, view change and resize) shrinks what doesn't fit: the menu in compact steps (`#menuView.fit1`–`fit5`: drop the card fan, tighter buttons, hide subtitles and stretch the list, two columns, mini title), Monster Hunter (`fit1`–`fit3`), Multiplayer (`fit1`–`fit2`), and the duel board by capping the card width (`--zcap`, down to 24px; co-op/2v2 22px).
- Phones held sideways (`orientation:landscape` and `max-height:560px`): the duel splits into the board (`#gameBoard`) and a side column with the buttons and the hand (`#gameSide`); both wrappers are `display:contents` otherwise. The menu, Monster Hunter and Multiplayer use two or more columns there.
- Monster Hunter is a grid of boss tiles; a tile opens the boss's card, which now holds the Hunt / Co-op + bot / Online co-op buttons (same `data-huntgo`/`data-coopgo`/`data-cooponline` handlers). Multiplayer panels sit in columns where there is room.
- The animated background hides itself if the phone takes away its graphics context (`webglcontextlost`).
- Tests: `tests/gatefall-v48-fit.cjs` (9 screen sizes x 9 views: no page/app scrolling, nothing cut off). The v36 online test opens the boss card before tapping Online co-op.

## v47 changes (2026-11-03): Monster Life Points

- **Every monster has Life Points** (`monBaseLp(card)`: a card's own `lp`, else round100(Level-or-Rank × 250 + best of ATK/DEF × 0.25), at least 300; Duelists count as Level 6). Zones carry `z.lp` (set by `newZone`); `monLp`/`monMaxLp` (max = base + `z.lpBoost` + equips' `eqLp`); a zone without `lp` (old saves) is at full LP. `settle` → `clingOn`: a monster saved from destruction at 0 LP keeps 1 LP.
- **Battle** (`resolveBattle`): ATK vs ATK, the weaker side takes the gap (`battleHitMonster`; a losing team shares it in order via `battleHitTeam`); equal hurts neither. Defense Position: only ATK above DEF reaches the LP; a lower ATK costs the attacker's player the difference (as before). Damage beyond a monster's LP carries over to its controller; players otherwise take battle damage only from direct attacks. Blockers share the gap in order, overflow to their player. **Bosses keep their old rule** (beaten = driven back + the full gap to the boss's LP; effect damage still compares with ATK/DEF). `battleDestructionTargets` predicts 0-LP results for the Warden/Graveyard protection prompts (`teamHitDoomed`).
- **Effect damage** on monsters ignores ATK/DEF and hits LP (`effectDamageMonster`, Skyfire Judgment per monster). Destroy effects still destroy outright. Healing Spring also heals your face-up monsters (`healMonster`, never above max); Bulwark Aegis gives `eqLp:500` (raises the max and heals 500).
- **Rampart Ram** (`rampart`, Level 4, 700/2100, `defAttack`): `defAttacker()`/`attackPosOK()` let it attack in Defense Position with its DEF, alone (team refused). vs Defense: nothing happens; vs Attack: higher DEF → the difference to the controller (not the monster); lower DEF → the Ram takes the gap like a guarding monster (overflow to its player). Blocked: nothing. Skill Drain stops it. In the base `DECK` (replaces one Blazeguard Duelist). Bots value LP kills, hurting hits and the Ram's throw-backs; Fireball targets by LP.
- **Display**: big cards show ATK | DEF | LP along the bottom; hand/list cards show ATK/DEF plus a green LP badge at the bottom right; field monsters get a zone-level badge with a bar (`lpBadge`, gold when hurt, red at a third or less); card sheet shows current/max LP; `monHit`/`monHeal` events pop numbers over the zone. Rules sheet updated.
- Tests: `tests/gatefall-v47-monster-lp.cjs`. Old rules tests (v36 rules + online, v43) were updated to the LP rules; the 2v2 UI test clears the rivals' traps and hands so bots can't change the checked battle; the v44 UI test waits for the board to catch up after Berserker Call.

## v46 changes (2026-11-03)

- **Publishing preparation** (see `PUBLISHING.md`): `GF_CFG` from `window.GATEFALL_CONFIG` (`platform`, `app`, `server`, `webUrl`, `sw`). Rooms use `roomsUrl()` + `ROOM_CREDS` (cross-origin to the configured server, no cookies); an app without a server offers offline modes only. Apps: no service worker / install button / manifest, invite text with the room code (or a link to `webUrl`), Capacitor `App` hooks in `setupAppShell` (back button → `appBack()`: cancel attack mode, close sheet, `goMenu`, else exit; `appUrlOpen`/launch URL → `openInvite`; `appStateChange` → `Sound.background`). `inviteRoom` is now `let` (`roomFromUrl`). Version mismatch message names both versions.
- `server.mjs` + `api/routes/rooms.ts`: CORS (`ALLOWED_ORIGINS`, default `*`), OPTIONS preflight, `GET /api/health`, `/privacy` → `public/privacy.html`, `.woff` type.
- Fonts bundled in `public/fonts` (WOFF); Google Fonts links removed. Manifest addresses relative to itself, `sw.js` uses `BASE` (the worker's folder). In-game privacy sheet (`type:"privacy"`) loads the bundled `privacy.html`.
- **Online referee protocol** (since late v45 work, now released): guests send `prop`, the host broadcasts final `act` (`auth:1`, `aid`), guests keep `Net.pend` and roll back/replay on races (`guestTakeAuth`, `replayPending`, `reject`), `confirmedLen()`.
- Tests: `tests/gatefall-v46-app-build.cjs` (Android build from its own origin with a Capacitor stand-in: config, CSP, cross-origin hosting with a web guest, synced duel, back button, app links, background audio). The PWA test checks resolved manifest addresses; the v36 online test waits for the guest's last move to be confirmed before installing fixtures; the v44 UI test also handles turns led by the Ally Bot and bot plays that close the card sheet.

## v45 changes (2026-11-03)

- **Teams model** (shared by co-op and 2v2): `teamNo(S,j)` (co-op: hunters 0, boss 1; tag: seats 0+1 → 0, 2+3 → 1; otherwise the seat), `sameTeam`, `paired` (a non-boss player in team play), `mate`, `teamSeats`, `liveTeam`, `onActiveTeam`, `teamLabel`, `nextTurnSeat` (next team's first player still in). `opponents()`, `canAct`, `sharedHunter` (= `mate`), shared zones, `linkCoopST` (one shared S/T array per team via `linkTeamST`), turn flow, eliminate/winner and results all use them. Old snapshots without `team` fall back to the co-op rule.
- **2v2 Tag Team** (`S.tag`, `newGame(..., tag=true)`, 4 players): co-op field layout for both teams (7 shared monster zones, 5 S/T + both Duelists, shared Graveyard/Banishment, per-player Deck/Extra with compact partner piles), shared team turn (Ready like co-op), per-player LP, a player at 0 is out; the team wins when both rivals are out. Four Frontier Fields (`S.ffN = 4`). The rivals' rows render mirrored on top; both rivals' LP + hand counts in the top bar (`#lpOppPartner`). A partner's Duelist or Frontier monster on the field shields the whole team (`attackOptions`). Local: menu "2v2 Tag Team" (`newTagDuel`: You + Ally Bot vs Rival A + Rival B). Online: lobby Mode → "2v2 Tag Team" (`Net.tag`, `start.tag`); seats 1+2 vs 3+4, empty seats get host-run bots. The d20 is rolled by all four; the winner picks which team starts.
- **Frontier zone numbers moved** to `FFZ + q` (`FFZ = 20`); zones 0–4, 7, 8 are monster zones. Previously Frontier positions 2/3 (= zones 7/8) collided with the 7-zone row.
- **Bots in a shared turn** (`botPlan`, used by `pump`): teammate bots finish their moves in a phase before anyone moves the phase on; while a human teammate is still in, bots never move the phase or ready. A refused bot move benches that bot for the rest of the phase (`ui.botSkip`) instead of retrying forever.
- **New cards**: Red Bull (`redbull`, Quick Spell, `z.flight`, `canFly` honours granted Flight, flavour text field `flavor` shown in italics on the card, painted art `BOSS_ART.wingbull`), Show Off (`showoff`, `showOffNext`/`showOffFinish`/`showOffSweep`, choices `showOffPick`/`showOffPos`, monsters `petrifiedUntil` + `showOff` sent to the GY in the End Phase).
- **Checkup fixes** (found by a rules review + fuzzing ~9,000 games, and by soak tests): the boss never attacked in co-op since v43 (attack legality now uses `opponents`); a partner's own Frontier Field counted as occupying yours on a shared field; tributes/materials from a partner could overwrite your own monster (`freedBy`); a hunter knocked out on their turn skipped the boss's turn (partner now carries on); Gloam Trickster could flip a boss face-down (bosses excluded, boss AI flips back up); Inferno Breath knocked the boss itself off; the ally bot could negate or Sinkhole its partner, and Thrallwing Parasite / Creature Swap / Aurum Revenant could take a partner's cards (now opponents / own cards only); Ironheart Warden's self-sacrifice now comes after automatic protections, never for tokens, and is a choice for monsters (`wardenSave` prompt; one choice covers a sweep); Graveseed's prompt comes after automatic protections; Tide Scholar's passive now needs 2 or fewer cards; Yuki Onna's passive (−200 ATK to opponents' monsters) is implemented (`yukiChill`); Tidewisp bots bounce rivals' monsters, not their own; Call to Arms / Parasite equips record their controller; a second Parasite drops the first; a stolen monster with no room to go home drops its equips; Kaiju tributes give Graveseed's draw; Twinfang's double attack is negated by Skill Drain; bots answer prompts before drawing; banished monsters of a player who is out don't come back; co-op "Hunt again" restarts co-op (was solo); Duelist texts list their on-field effects.
- Tests: `tests/gatefall-v45-cards.cjs`, `-frontier.cjs`, `-tag-ui.cjs`, `-online-tag.cjs`, `-fuzz-all-modes.cjs` (+ `fuzz-lib.cjs`). The v36 rules test was updated for the Frontier zone numbers and the Warden prompt.

## v44 changes (2026-11-03)

- **Berserker Call** (`bcall`, Quick Spell, limited to 1, `eff:"berserkAll"`): every face-up monster on the field (both sides, bosses included) goes berserk. Card art: `BOSS_ART.berserker` (a red gorilla, head back, screaming with three scream arcs), shown on the card through `MON_ART.bcall` + the `bigArt` flag (the painted-art branch in the card renderer now accepts big-art spells). Animation `FX_PRE.berserkCall`: a giant gorilla rears up over the table (`.fx-ape`, `bossArtHTML("berserker")`), screams (rings from the mouth, red flash, shake), the awakened monsters flare, and it sinks away.
- **Must battle**: a player whose field has a berserk monster can't end the turn (or, in co-op, ready) from Main Phase 1 while a Battle Phase is possible: "A berserk monster has to battle: enter the Battle Phase first." Bots turn such an `endTurn` into `toBattle`.
- **Co-op shared turn (real fix)**: before, a hunter's "Ready" reset the phase to Main 1 for the partner, which made the shared turn play out as two sequential turns (two Battle Phases, and the bot ally only moved after you were ready). Now the phases are shared: either hunter advances them (`canBattle` → any hunter who `canAct`), `readyHunter()` marks a hunter ready **without** touching the phase (hand-limit discard first), the partner carries on from where things are, and the End Phase + boss turn happen only when both are ready. Turn log says "Turn N: the hunters"; the phase banner says "Hunters' turn"; the button is "Ready".
- **Bot ally plays alongside you**: `pump()` schedules a co-op bot hunter as a *helper* while the human is active: it summons, sets, activates and attacks in the shared phases but never moves the phase on or readies while the human is still acting (it idles and re-plans after each of your actions, so it can Xyz with your monsters, and it attacks in the Battle Phase you open). Once you are ready it finishes and readies itself. A refused helper plan just waits. `botSummon` no longer plans plain summons on a full field.
- Tests: `tests/gatefall-v44-rules.cjs` (shared turn, must-battle, Berserker Call) and `tests/gatefall-v44-ui.cjs` (card art, helper interleaving, scream animation, refused Ready).

## v43 changes (2026-11-03)

- **Allied battles deal battle damage** like any other battle (the earlier "no damage between allies" rule is gone): the owner of the losing monster takes the difference.
- **Effect damage** (`effectDamagePlayer`, `effectDamageMonster`): can hit a player or a monster; a monster is destroyed when the damage is greater than its ATK (Attack Position) or DEF (Defense Position), otherwise it holds. Effect damage and effect destruction carry an attribute: cards declare `dmgType` / `destroyType` (`EFFECT_TYPES`: fire, thunder, dark, ice, water, wind, earth, light). Black Hole `destroyType:"dark"`, Ring of Destruction `destroyType:"fire", dmgType:"fire"`, Skyfire Judgment `dmgType:"thunder"`, Fireball `dmgType:"fire"`. Attributes are logged and colour the `effectHit` animation; no rule keys off them yet. `destroyTypeNow(S)` reads the resolving card's destruction attribute for later use.
- **Skyfire Judgment** now has `eff:"judgment"`: thunder effect damage equal to the caster's current LP to every monster the opponent controls (destroys those it beats).
- **Fireball** (`fireball`, Quick Spell, in the starter deck in place of one Twin Cyclone, limited to 2): 1500 fire effect damage to any player or any monster (own ones included). Graveyard effect once per turn: pay 1500 LP to return it to the hand (`canFireBack`/`doFireBack`, action `{t:"fireBack", uid}`, button in the Graveyard sheet; `p.opt.fireBack` marks the turn). Bots use it on low-LP opponents or monsters it can destroy.
- **Berserk status** (`z.berserk`, indefinite; `setBerserk(S, owner, slot)`): can't change Attack → Defense by itself (`canChangePos`), stands up into Attack Position when its side's Battle Phase begins (`berserkStandUp` in `toBattle`), and during the Battle Phase charges one of the nearest monsters at random (`berserkStep`, run from `settle()`; nearest by `zoneDistance`, allies included, never itself; direct attack when nothing is in reach; `rnd(S)` keeps it deterministic for online play). Visual: red outline + BERSERK tag, "BERSERK" in the card sheet. **No card applies Berserk yet**; `setBerserk` is the hook.
- Tests: `tests/gatefall-v43-rules.cjs`, `tests/gatefall-v43-ui.cjs`. The v42 allied-attack test was folded into the v43 rules test (its no-damage assertion is obsolete).

## v42 changes (2026-11-03)

- **Game-start stall (the real "cannot draw" bug)**: at turn 0 the controls rendered the Draw Phase branch before the pending-prompt branch, so the player who won the d20 roll never saw the "Go first / Go second" buttons and the game sat at "Waiting for the Draw Phase". The prompt now always comes first (`renderControls`). `tests/gatefall-v42-start-prompt.cjs` drives the real UI.
- **New attack mechanic (all modes)**: a monster may attack any other monster on the table, allies included (own field or the co-op partner's), never itself. `friendlySide(S, ai, dp)` marks such battles: no direct attack, no Frontier/Duelist obstacle, no battle damage, no Ember Tactician burn; the weaker monster is still destroyed. Rules: `attackOptions`, the `attack` case in `apply`, `resolveBattle`. Bots never attack allies (`opponents()`).
- **Select-then-attack UI**: press and hold a monster of yours (`LONG_MS` = 480 ms) to select it as the lead attacker (`startAttackMode`); short taps on other ready Attack Position monsters (partner's included) add or remove them from the team (`attackToggle`); then **Attack** (`data-ctl="attackgo"`) switches to the target stage, where any highlighted monster on any side, or a Duelist zone for a direct attack, can be tapped (`attackModeTap`); **Back** returns to picking. A short tap still opens the card sheet, whose "Attack a monster" button also starts the pick stage. `ui.mode = {type:"attack", slot, team:[], stage:"pick"|"target"}`. Long presses suppress the trailing click for 150 ms; the context menu is blocked on monster zones. Tests: `tests/gatefall-v42-ally-attack.cjs` (rules), `tests/gatefall-v42-attack-ui.cjs` (touch long press flow).
- PWA test reads the cache name from `sw.js` instead of hardcoding it.

## v41 changes (2026-11-03 checkup)

- **Draw Phase**: a `Draw a card` button now appears in the controls during your Draw Phase, next to the pulsing deck. Tapping or swiping the deck still works, and so do Space / Enter / D on a keyboard. A deck tap during an effect animation is no longer dropped silently: it is queued and played the moment the animation ends (a lock older than 2.5 s is cleared). The "TAP / SWIPE" hint moved above the deck so the LP bar can never cover it.
- **Co-op bot stall**: the bot's attack planner iterated `turnOrderAfter` (which includes the partner hunter) and could pick a partner's monster or a direct attack on the partner; the rules refuse that, so the ally bot repeated the refused move forever. `botAttack` and `botTeam` now iterate `opponents(S, me)`, and a bot whose plan is refused ends its shared turn instead of looping.
- **Boss hunt intro**: `heroIntro` threw (caught) when a seat had no Duelist card; it now skips such seats.
- **Room transport**: `detectRoomService()` picks the Claude artifact `room` capability when the page runs as a published Claude artifact (signed-in viewers the owner shared it with), otherwise the same-origin `/api/rooms` relay. Neither reachable → the Multiplayer lobby explains what is needed instead of a dead form. The lobby copy and the invite button adapt (`roomKind` = `"claude"` | `"hosted"`). Snapshot chunks are paced (12 per 400 ms) for the live room's send budget.
- **Standalone server** `server.mjs` (see above) mirrors `api/routes/rooms.ts` and `api/lib/vite.ts` without dependencies.
- **Tests**: paths are now relative (`./index.html`, `./test-output/`), `tests/gatefall-v41-draw.cjs` covers deck tap, the Draw button, keyboard draw, a tap during an animation, and co-op/hunt draws. Run with `node server.mjs` on port 3000 (PWA test expects a second copy on 3100: `PORT=3100 node server.mjs`).
- **Claude artifact copy**: `../artifact/gatefall.html` is the same game as a Claude artifact page (relative asset paths, no service worker, `SW_URL = ""`), published with capabilities `room` (topic `msg` open to interact), `db`, `user`.

## Latest fixes and verification

The most recent update fixed a bot co-op stall during the shared Draw Phase. `pump()` now schedules bots listed in `S.drawWait` even when a human is `S.active`. The controls show Draw Phase instructions instead of a false “Your response” prompt.

The same update added compact partner Deck/Extra Deck icons, relocated partner LP, removed redundant labels, reserved layout space so compact icons remain tappable, rebuilt the LP bar when switching between normal and co-op modes, and made narrow-screen response buttons wrap rather than clip.

All of these checks passed after the changes:

- Deterministic rules and prior gameplay regressions.
- Shared-field capacity/migration, Yuki freeze, cross-hunter teams and sacrifices, Crash Arrival, and other existing tests.
- Shared Draw Phase with human active and ally bot waiting.
- Current-player full piles and independently tappable partner piles with correct counts.
- Portrait and landscape geometry, LP visibility, and responsive controls.
- Hosted host/guest perspectives, independent draws, shared turns, three-seat chains, cross-hunter attacks and sacrifices, boss rush, and matching hashes.
- Manifest parsing, Chromium installability, icons, install controls, app-shell cache, offline local play, network-only API behavior, offline messaging, and online recovery.

## Known limitations / bugs

- No known blocking defect remains in the tested flows.
- Online multiplayer requires internet access and a publicly published deployment. A saved preview/version alone is not public hosting.
- Offline play is for local modes; hosted multiplayer cannot work offline.
- The single-file `index.html` contains the complete game, but PWA installation requires the included `public/` support files and a suitable HTTP/HTTPS host.
- Regression scripts retain some environment-specific paths and may need path adjustments outside the original sandbox.

## Suggested next work

No requested feature is open. The user chose to keep the `IP-REVIEW.md` cards for now. Next publishing step: Google Play (`store/google-play/README.md`), after the user picks the app ID and where the room server runs. Balance of the LP numbers may need tuning after real play.

## Instruction for the new chat

Continue from this package as the current source of truth. Read `index.html` before changing gameplay or layout. Preserve deterministic state and network hashes, keep presentation events out of deterministic state, rerun all relevant regression suites after edits, and do not claim the app is publicly live unless an actual publish action has succeeded.
