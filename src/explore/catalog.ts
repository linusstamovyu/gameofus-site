// Everything the Explore page shows (plan 18 §1), built from the builder's own catalogues so the two can never
// disagree. PURE data: no DOM. The page attaches the moving previews by `scene` key.
import { BIG_GAMES, MINIGAMES, orderAsset } from "../order/catalogue";
import type { StepId } from "../order/draft";
import { VEHICLE_TYPES } from "../order/sections/vehicles";
import type { FavKind } from "./favourites";
import { includedBadge } from "./included";

export type ExploreTabId = "games" | "minigames" | "vehicles" | "world" | "phone" | "story" | "extras";

export interface ExploreCard {
  id: string;
  title: string;
  blurb: string;
  /** Still art (also the poster under a moving preview). */
  art: string;
  /** Key into the page's preview table, when a moving loop exists. */
  scene?: string;
  /** "Standard 1 · Deluxe 3 · Ultimate 5", "From Deluxe", "Add-on", "Free"… */
  badge: string;
  /** Present when the card can be favourited and carried into the builder. */
  fav?: { kind: FavKind; id: string };
  /** 18+ (a drinking game): shown, but only picked with Party Mode. */
  adult?: boolean;
}

export interface ExploreTab {
  id: ExploreTabId;
  label: string;
  /** One line under the tab heading. */
  intro: string;
  /** The builder step "Add these" opens. */
  step: StepId;
  cards: ExploreCard[];
}

const a = orderAsset;

export const EXPLORE_TABS: ExploreTab[] = [
  {
    id: "games", label: "Big games", step: "games",
    intro: "The set pieces a chapter is built around. Turn-based battles with your mates as fighters are always in.",
    cards: BIG_GAMES.map(g => ({ id: g.id, title: g.name, blurb: g.blurb, art: a(g.art), scene: `game:${g.id}`, badge: includedBadge("bigGames", BIG_GAMES.length), fav: { kind: "game", id: g.id } })),
  },
  {
    id: "minigames", label: "Party minigames", step: "games",
    intro: "Quick games anyone in the world can challenge you to. Turn on Party Mode (18+) and every loss is a sip.",
    cards: MINIGAMES.map(m => ({ id: m.id, title: m.name, blurb: m.group, art: a(m.art), badge: m.drinking ? "Party Mode (18+)" : includedBadge("minigames", MINIGAMES.length), fav: { kind: "minigame", id: m.id }, adult: m.drinking })),
  },
  {
    id: "vehicles", label: "Getting around", step: "vehicles",
    intro: "Walking works fine. Or buy a car, rent a scooter, hail a taxi or ride a mine cart.",
    cards: [
      ...VEHICLE_TYPES.map(v => ({ id: v.id, title: v.name, blurb: v.blurb, art: a(v.art), scene: v.id === "car" || v.id === "taxi" ? `veh:${v.id}` : undefined, badge: includedBadge("vehicles", VEHICLE_TYPES.length), fav: { kind: "vehicle" as const, id: v.id } })),
      { id: "own_car", title: "Your own car", blurb: "The group's real car, drawn from a photo, to drive around town.", art: a("veh_dealer.webp"), badge: "Add-on" },
    ],
  },
  {
    id: "world", label: "Your world", step: "world",
    intro: "Your real places become the map. Pick a starting kit for each, or send photos and we build it from them.",
    cards: [
      ...([
        ["home", "Home base", "The flat, the house, the halls: where the trip starts and where you wake up."],
        ["town", "Your town", "The streets you actually walk, the corner shop and the bus stop."],
        ["beach", "Beach", "Sand, sunbeds and the sea you swam in."],
        ["harbour", "Harbour", "A marina with boats, a quay and somewhere to eat."],
        ["city", "City", "A big-city block for the weekend away."],
        ["stadium", "Stadium", "The ground you go to, with a pitch you can play on."],
        ["nightlife", "Nightlife", "The bar you always end up in, and the club after it."],
        ["countryside", "Countryside", "Fields, a cabin, a long walk to the pub."],
      ] as const).map(([id, title, blurb]) => ({ id: `kit-${id}`, title, blurb, art: a(`world_${id}.webp`), badge: includedBadge("zones") })),
      { id: "shop-sign", title: "Your bar's sign", blurb: "A real shop or bar from your life, up on the street as signage.", art: a("world_shopsign.webp"), badge: "Add-on" },
    ],
  },
  {
    id: "phone", label: "The phone", step: "phone",
    intro: "Everyone carries a phone in the game. It rings, it gets mail, and it keeps your real photos.",
    cards: [
      { id: "photos", title: "Photos app", blurb: "Your real photos, redrawn in the game's style, in an album you can flick through.", art: a("phone_photos.webp"), badge: includedBadge("phonePhotos") },
      { id: "calls", title: "Phone calls", blurb: "Mum ringing to check you've eaten. The call that starts the quest.", art: a("phone_call.webp"), badge: includedBadge("phoneBeats") },
      { id: "news", title: "Breaking news", blurb: "A headline about your group, landing mid-adventure.", art: a("phone_news.webp"), badge: includedBadge("phoneBeats") },
      { id: "maps", title: "Maps app", blurb: "A map of your world with every place you picked.", art: a("phone_maps.webp"), badge: "Free" },
      { id: "games-app", title: "Games app", blurb: "Play the party minigames straight from the phone.", art: a("phone_games.webp"), badge: "Free" },
    ],
  },
  {
    id: "story", label: "Your story", step: "story",
    intro: "Tell us the night everyone still talks about. It becomes the main quest, told in the game's own pictures.",
    cards: [
      { id: "memory", title: "The memory", blurb: "Lost passports, a missed flight, a stag do gone sideways. Type it or send a voice note.", art: a("loop_story_plate_1.webp"), scene: "story:plate", badge: "Always included" },
      { id: "boss", title: "The villain", blurb: "Every quest needs someone, or something, to beat at the end.", art: a("loop_story_boss_1.webp"), scene: "story:boss", badge: "Always included" },
      { id: "cutscenes", title: "Cutscenes", blurb: "Key moments drawn as illustrated scenes.", art: a("loop_story_cut_1.webp"), scene: "story:cut", badge: includedBadge("cutscenes") },
      { id: "ending", title: "The ending", blurb: "A dedication, a birthday reveal, or a proposal on the end card.", art: a("loop_story_plate_4.webp"), badge: "Add-on" },
    ],
  },
  {
    id: "extras", label: "Extras & keepsakes", step: "extras",
    intro: "The bits that make it unmistakably your group, and something to hand over on the day.",
    cards: [
      { id: "evolution", title: "Evolutions", blurb: "Your mate levels up into a new form.", art: a("loop_poster_evo.webp"), scene: "extras:evo", badge: includedBadge("evolutions") },
      { id: "moves", title: "Signature moves", blurb: "The thing he always does, turned into an attack.", art: a("loop_poster_move.webp"), scene: "extras:move", badge: includedBadge("movesPerCharacter") },
      { id: "voice", title: "Voice lines", blurb: "Their real catchphrase, said out loud in the game.", art: a("loop_poster_talk.webp"), badge: includedBadge("voiceLines") },
      { id: "talking-face", title: "Talking face", blurb: "Their face talks as they arrive in the world.", art: a("loop_poster_talk.webp"), scene: "extras:talk", badge: "Add-on" },
      { id: "catch", title: "Catch the squad", blurb: "Throw a drink, and the rest of the group joins your team.", art: a("loop_poster_catch.webp"), scene: "extras:catch", badge: "Free" },
      { id: "items", title: "Your own items", blurb: "The drink you always order, as an item that heals you.", art: a("extras_item_drink.webp"), badge: "Add-on" },
      { id: "trailer", title: "Trailer video", blurb: "A 60-second trailer to post in the group chat.", art: a("loop_story_cut_2.webp"), badge: "Add-on" },
      { id: "gift-card", title: "Printable gift card", blurb: "A card with a QR code to the game, to hand over on the day.", art: a("keep_giftcard.webp"), badge: "Add-on" },
    ],
  },
];

export const exploreTab = (id: string): ExploreTab | undefined => EXPLORE_TABS.find(t => t.id === id);
