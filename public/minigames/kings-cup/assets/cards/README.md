# Shared playing-card assets

This folder is a reusable, game-agnostic 52-card deck for the Frokost minigames. It is deliberately kept in the isolated minigame workspace so it does not interfere with the active Claude session in the main game directory.

## Contents

- `cards/<suit>/<rank>.png`: all 52 face cards, normalized to predictable paths
- `backs/default.png`: shared face-down card
- `extras/`: red joker, black joker, and an empty card frame
- `manifest.json`: dimensions, suit/rank metadata, values, license, and path pattern
- `deck.js`: optional zero-dependency ES module for creating, shuffling, and drawing a deck
- `preview.html`: a visual inventory of every imported asset
- `LICENSE.txt`: the original asset-pack license

The normalized images are 64×64 PNG pixel-art sprites. Render them at whole-number scales and use `image-rendering: pixelated` to retain crisp edges.

## Card IDs and paths

Cards use standard short IDs in code:

- `AS` = ace of spades → `cards/spades/A.png`
- `10H` = ten of hearts → `cards/hearts/10.png`
- `QC` = queen of clubs → `cards/clubs/Q.png`

Jokers are included only as optional shared assets. `createStandardDeck()` returns the standard 52 cards without jokers.

## Usage

```js
import {
  CARD_BACK_ASSET,
  createStandardDeck,
  drawCards,
  shuffleDeck,
} from "./deck/deck.js";

const deck = shuffleDeck(createStandardDeck("/assets/cards"));
const { drawn: openingHand, remaining } = drawCards(deck, 2);

console.log(openingHand[0].id);             // for example, "AS"
console.log(openingHand[0].asset);          // /assets/cards/cards/spades/A.png
console.log(openingHand[0].blackjackValue); // 11
console.log(`/assets/cards/${CARD_BACK_ASSET}`);
```

For Blackjack, aces have a starting `blackjackValue` of 11; the game should reduce an ace to 1 whenever the hand would otherwise bust.

## Source and license

The artwork is Kenney's **Playing Cards Pack**, downloaded from OpenGameArt. It is released under Creative Commons Zero (CC0), so it can be copied, modified, and used commercially without attribution. Keeping a source note is still recommended.

- Source: <https://opengameart.org/content/playing-cards-pack>
- Creator: Kenney
- License: CC0 1.0
- Original archive: `../source/playing-cards-pack.zip`
- Archive SHA-256: `b93b0313818e9c8f6acc24b008efdec1d8a6360b13afe953beed23881588be3c`

The original archive and its extracted source files are retained in `../source/` for provenance. Only this `deck/` folder needs to be copied into the game later.

## Preview

From `shared-card-assets`, run a local static server, then open `/deck/preview.html`:

```sh
python3 -m http.server 5176
```
