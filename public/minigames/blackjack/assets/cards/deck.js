export const SUITS = Object.freeze([
  Object.freeze({ name: "clubs", code: "C", symbol: "♣", color: "black" }),
  Object.freeze({ name: "diamonds", code: "D", symbol: "♦", color: "red" }),
  Object.freeze({ name: "hearts", code: "H", symbol: "♥", color: "red" }),
  Object.freeze({ name: "spades", code: "S", symbol: "♠", color: "black" }),
]);

export const RANKS = Object.freeze([
  Object.freeze({ name: "ace", label: "A", highValue: 14, blackjackValue: 11 }),
  ...Array.from({ length: 9 }, (_, index) => {
    const value = index + 2;
    return Object.freeze({
      name: String(value),
      label: String(value),
      highValue: value,
      blackjackValue: value,
    });
  }),
  Object.freeze({ name: "jack", label: "J", highValue: 11, blackjackValue: 10 }),
  Object.freeze({ name: "queen", label: "Q", highValue: 12, blackjackValue: 10 }),
  Object.freeze({ name: "king", label: "K", highValue: 13, blackjackValue: 10 }),
]);

export const CARD_BACK_ASSET = "backs/default.png";
export const JOKER_ASSETS = Object.freeze({
  red: "extras/joker-red.png",
  black: "extras/joker-black.png",
});

function joinAssetPath(base, relativePath) {
  const cleanBase = String(base).replace(/\/$/, "");
  return cleanBase ? `${cleanBase}/${relativePath}` : relativePath;
}

/**
 * Builds a fresh 52-card deck. Jokers are intentionally excluded.
 * Card IDs use conventional short notation: AS, 10H, QC, and so on.
 */
export function createStandardDeck(assetBase = "") {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${rank.label}${suit.code}`,
      suit: suit.name,
      suitCode: suit.code,
      suitSymbol: suit.symbol,
      color: suit.color,
      rank: rank.label,
      rankName: rank.name,
      highValue: rank.highValue,
      blackjackValue: rank.blackjackValue,
      asset: joinAssetPath(assetBase, `cards/${suit.name}/${rank.label}.png`),
    })),
  );
}

/** Returns a shuffled copy and leaves the supplied deck untouched. */
export function shuffleDeck(deck, random = Math.random) {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

/** Returns dealt cards and the remaining deck without mutating the input. */
export function drawCards(deck, count = 1) {
  const safeCount = Math.max(0, Math.min(deck.length, Math.floor(count)));
  return {
    drawn: deck.slice(0, safeCount),
    remaining: deck.slice(safeCount),
  };
}
