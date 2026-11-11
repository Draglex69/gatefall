# Names and art to change before a public store release

Store reviewers (Google, Apple, Valve) and rights holders look for other companies' characters, brands and
card names. Free web play among friends is low-key; a listed, downloadable game is a commercial product, and
one complaint can get it removed from a store. Nothing below has been changed yet: these are your cards, so
you decide. This is a practical checklist, not legal advice; for a paid or large release, ask a lawyer.

## High risk: change before release

| Card (id) | What it is | Why it matters | Suggested fix |
|---|---|---|---|
| **Kuromi, Mischief Kitty** (`kuromi`) | Name, and art with jester ears, pink skull and arrow tail | Kuromi is a Sanrio character; name and look are both protected | New name and a redrawn original creature (keep the "KITTY" mechanics) |
| **My Melody, Friendship Kitty** (`melody`) | Name, and art with pink hood and floppy ears | My Melody is a Sanrio character | Same: new name and original art. Its effect text mentions Kuromi and needs the new name |
| **Kong, Skyscraper Sovereign** (`kong`, boss `b_kong`, powers "Skyscraper Chestbeat", "Metropolitan Rampage") | Giant chest-beating ape on a skyscraper | "Kong" and the ape-on-a-skyscraper image point straight at King Kong, whose rights are still held (the 1933 film is not public domain in the US until 2029, and "Kong" is used as a trademark) | Rename (for example "Titanape, Tower Breaker") and redraw so it doesn't climb a skyscraper; also replace `public/gatefall-preview.png`, which shows this boss, and its alt text in `index.html` |
| **Red Bull** (`redbull`) with flavor text "Red Bull gives Wings" | An energy-drink brand name and its famous slogan, art of a winged red bull | A registered trademark and slogan of an active, litigious company; also brings a "drink brand" into the content rating | Rename (for example "Skybound Tonic" or "Wingbrew") and write a new flavor text; redraw so the art isn't a red bull with wings |

## Medium risk: card names taken word for word from Yu-Gi-Oh!

Game rules can't be owned, but exact card names make the game look like a copy and invite a takedown request.

| Card (id) | Same or near-identical Yu-Gi-Oh! card | Suggested direction |
|---|---|---|
| Ring of Destruction (`ring`) | Ring of Destruction | e.g. "Cinder Noose", "Ring of Ruin" |
| Skill Drain (`skilldrain`) | Skill Drain | e.g. "Silencing Field", "Null Aura" |
| Creature Swap (`swap`) | Creature Swap | e.g. "Changeling Pact", "Exchange of Souls" |
| Waking the Dragon (`waking`) | Waking the Dragon | e.g. "Wyrmcall", "Dragon's Wake" |
| Scapegoats + Sheep Token (`goats`, `sheep`) | Scapegoat + Sheep Token | e.g. "Woolwall" + "Fluff Token" |
| Black Hole (`hole`) | Dark Hole | "Black Hole" is a common word; fine to keep, or "Void Collapse" |
| Twin Cyclone (`cyclone`) | Double Cyclone / Twin Twisters | similar, low priority; e.g. "Twin Gale" |
| The **"Xyz"** summoning term (used throughout the rules text) | Konami's name for this mechanic | rename the mechanic, e.g. "Stack Summon", "Fusion of Ranks" |

The overall card frame and rule words (Normal Summon, Tribute, Spell/Trap, Graveyard, 8000 Life Points,
phase names) are common across many card games and are not a problem on their own; the more original names,
art and rules a game has, the safer it is. The Monster Life Points rule (version 47) is a good step in that direction.

## Already fine
- All other card names, bosses and Duelists are original or come from folklore (Yuki Onna).
- Pixel art, animations and the synthesized soundtrack were made for the game.
- Fonts: Jersey 10 and Pixelify Sans, SIL Open Font License 1.1, bundled with their license files in
  `public/fonts/` (the license allows bundling them in a sold game; the font files may not be sold alone).
- The name **Gatefall**: before release, search the trademark registers (USPTO, EUIPO/TMview, WIPO Global
  Brand Database) and the stores for games with the same or a confusingly similar name, and reserve the
  domain and social handles you want.

## How to rename a card later
Each card is one entry in `CARDS` in `index.html` (by id). Change `name`, `text`/`flavor`, and its art function
(`MON_ART`/`BOSS_ART`) but keep the **id**, so saved decks and save codes keep working. Search the file for
the old name in log messages and effect texts (for example My Melody's effect mentions Kuromi).
