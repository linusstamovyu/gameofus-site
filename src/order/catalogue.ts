// What the Games step offers (plan 07 Q8/Q10). Genre names only: the franchise-name test sweeps this file.
// Art is existing game art as stills for now (Q12), built into public/order-assets by build_site_assets.py.

export interface BigGame {
  id: string;
  name: string;
  blurb: string;
  art: string;
}

export interface Minigame {
  id: string;
  name: string;
  group: MinigameGroup;
  art: string;
  /** A drinking game: only offered when Party Mode (18+) is on. */
  drinking?: boolean;
}

export type MinigameGroup = "Cards" | "Dice & luck" | "Reflex" | "Strategy";

export const BIG_GAMES: BigGame[] = [
  { id: "kart", name: "Kart Race", blurb: "Beat a ghost lap round a circuit, with nitro and fuel to manage.", art: "game_kart.webp" },
  { id: "brawler", name: "Arcade Brawler", blurb: "A fighting-game tournament: who's the champion of the group?", art: "game_brawler.webp" },
  { id: "build", name: "Build & Climb", blurb: "Build ramps over gaps and climb to the top of a yard.", art: "game_build.webp" },
  { id: "craft", name: "Mine & Craft", blurb: "Mine, smelt and lay rails, then wire up the power to ride out.", art: "game_craft.webp" },
  { id: "gym", name: "Gym Puzzle", blurb: "Push the weights onto their plates and beat the trainers in order.", art: "game_gym.webp" },
  { id: "photo", name: "Photo Shoot", blurb: "Frame the perfect shot before someone runs through it.", art: "game_photo.webp" },
  { id: "escort", name: "Escort Errand", blurb: "Get a mate across town at his pace, one kerb at a time.", art: "game_escort.webp" },
  { id: "quiz", name: "Memory Quiz", blurb: "Order exactly what your friend always orders. Get it wrong and hear about it.", art: "game_quiz.webp" },
  { id: "chase", name: "Chase & Showdown", blurb: "Track someone down across the map and face them at the end.", art: "game_chase.webp" },
];

export const MINIGAME_GROUPS: MinigameGroup[] = ["Cards", "Dice & luck", "Reflex", "Strategy"];

export const MINIGAMES: Minigame[] = [
  { id: "blackjack", name: "Blackjack 21", group: "Cards", art: "mini_blackjack.webp" },
  { id: "kings-cup", name: "King's Cup", group: "Cards", art: "mini_kings-cup.webp", drinking: true },
  { id: "the-bus", name: "The Bus", group: "Cards", art: "mini_the-bus.webp", drinking: true },
  { id: "dice-push-your-luck", name: "Push Your Luck", group: "Dice & luck", art: "mini_dice-push-your-luck.webp" },
  { id: "three-cup-shuffle", name: "Three-Cup Shuffle", group: "Dice & luck", art: "mini_three-cup-shuffle.webp" },
  { id: "landmine", name: "Landmine", group: "Dice & luck", art: "mini_landmine.webp" },
  { id: "reaction-light", name: "Reaction Light", group: "Reflex", art: "mini_reaction-light.webp" },
  { id: "stop-the-pour", name: "Stop the Pour", group: "Reflex", art: "mini_stop-the-pour.webp" },
  { id: "safecracker", name: "Safecracker", group: "Reflex", art: "mini_safecracker.webp" },
  { id: "mini-battleships", name: "Mini Battleships", group: "Strategy", art: "mini_mini-battleships.webp" },
  { id: "takeaway-nim", name: "Takeaway Nim", group: "Strategy", art: "mini_takeaway-nim.webp" },
  { id: "tic-tac-toe", name: "Tic-Tac-Toe", group: "Strategy", art: "mini_tic-tac-toe.webp" },
];

export function visibleMinigames(partyMode: boolean): Minigame[] {
  return MINIGAMES.filter(m => partyMode || !m.drinking);
}

export const orderAsset = (file: string) => `order-assets/${file}`;
