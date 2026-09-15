// The order being built, as plain data (plan 07). Pure functions only, so every rule is testable: the page
// (steps/*.ts) renders a Draft and replaces it through these functions; storage.ts saves it on this device.
// Nothing here knows a price: prices come from prices.ts through toPicks().
import { BIG_GAMES, MINIGAMES, visibleMinigames } from "./catalogue";
import { ACTIVE_LADDER, EDITION_IDS, LADDERS, MAX_FRIENDS, smallestEditionFor, type AddonId, type EditionId, type LadderId, type OrderPicks } from "./prices";

export type StepId = "squad" | "edition" | "games" | "review";
export const STEPS: { id: StepId; label: string }[] = [
  { id: "squad", label: "Your squad" },
  { id: "edition", label: "Your edition" },
  { id: "games", label: "Games" },
  { id: "review", label: "Review" },
];

export type PhotoKind = "face" | "body" | "outfit";
export const PHOTO_KINDS: { kind: PhotoKind; label: string; hint: string }[] = [
  { kind: "face", label: "Face", hint: "Close-up, looking at the camera, good light" },
  { kind: "body", label: "Full body", hint: "Head to toe, standing" },
  { kind: "outfit", label: "Outfit", hint: "What they'd wear in the game" },
];

export type CheckStatus = "ok" | "warn" | "fail" | "unchecked";

export interface PhotoMeta {
  /** Key of the resized image blob in this device's storage. */
  key: string;
  width: number;
  height: number;
  status: CheckStatus;
  note: string;
  /** Where the face was found (face photos), so a changed shirt colour redraws the same preview crop. */
  face?: { x: number; y: number; width: number; height: number; score: number } | null;
}

export interface Friend {
  id: string;
  name: string;
  /** Shirt colour on the preview body. */
  colour: string;
  photos: Partial<Record<PhotoKind, PhotoMeta>>;
  /** Small PNG data URL of the pixel preview, made from the face photo. */
  preview?: string;
}

export interface Organiser {
  name: string;
  email: string;
  birthYear: string;
  adultsConfirmed: boolean;
  photosPermission: boolean;
  startNow: boolean;
}

export interface Draft {
  version: 1;
  step: StepId;
  friends: Friend[];
  edition: EditionId | null;
  /** True once the visitor picked an edition themselves, so a changed squad size no longer moves it. */
  editionChosen: boolean;
  bigGames: string[];
  minigames: string[];
  customGame: string;
  partyMode: boolean;
  flexPass: boolean;
  directorsCut: boolean;
  organiser: Organiser;
  updatedAt: number;
}

export const SHIRT_COLOURS = ["#1a9e95", "#d39a4a", "#3a8fd6", "#e05a9b", "#7a4a26", "#6b8e23", "#8a5cc2", "#d64545"];

export function newDraft(now = Date.now()): Draft {
  return {
    version: 1,
    step: "squad",
    friends: [],
    edition: null,
    editionChosen: false,
    bigGames: [],
    minigames: [],
    customGame: "",
    partyMode: false,
    flexPass: false,
    directorsCut: false,
    organiser: { name: "", email: "", birthYear: "", adultsConfirmed: false, photosPermission: false, startNow: false },
    updatedAt: now,
  };
}

/** A stored draft from an older or broken save comes back as a fresh one rather than crashing the page. */
export function reviveDraft(raw: unknown): Draft {
  const d = raw as Partial<Draft> | null;
  if (!d || d.version !== 1 || !Array.isArray(d.friends)) return newDraft();
  const base = newDraft(d.updatedAt ?? Date.now());
  const known = new Set(STEPS.map(s => s.id));
  return {
    ...base,
    ...d,
    step: known.has(d.step as StepId) ? (d.step as StepId) : "squad",
    edition: EDITION_IDS.includes(d.edition as EditionId) ? (d.edition as EditionId) : null,
    friends: d.friends.slice(0, MAX_FRIENDS),
    bigGames: (d.bigGames ?? []).filter(id => BIG_GAMES.some(g => g.id === id)),
    minigames: (d.minigames ?? []).filter(id => MINIGAMES.some(g => g.id === id)),
    organiser: { ...base.organiser, ...(d.organiser ?? {}) },
  };
}

const touch = (d: Draft, patch: Partial<Draft>): Draft => ({ ...d, ...patch, updatedAt: Date.now() });

export function addFriend(d: Draft, id: string): Draft {
  if (d.friends.length >= MAX_FRIENDS) return d;
  const colour = SHIRT_COLOURS[d.friends.length % SHIRT_COLOURS.length];
  return autoEdition(touch(d, { friends: [...d.friends, { id, name: "", colour, photos: {} }] }));
}

export function removeFriend(d: Draft, id: string): Draft {
  return autoEdition(touch(d, { friends: d.friends.filter(f => f.id !== id) }));
}

export function updateFriend(d: Draft, id: string, patch: Partial<Friend>): Draft {
  return touch(d, { friends: d.friends.map(f => (f.id === id ? { ...f, ...patch } : f)) });
}

export function setPhoto(d: Draft, friendId: string, kind: PhotoKind, meta: PhotoMeta | null): Draft {
  return touch(d, {
    friends: d.friends.map(f => {
      if (f.id !== friendId) return f;
      const photos = { ...f.photos };
      if (meta) photos[kind] = meta;
      else delete photos[kind];
      return { ...f, photos, preview: kind === "face" && !meta ? undefined : f.preview };
    }),
  });
}

/** Until the visitor picks an edition, it follows the squad size (plan 07 Q16). */
function autoEdition(d: Draft, ladder: LadderId = activeLadder()): Draft {
  if (d.editionChosen) return d;
  return { ...d, edition: d.friends.length ? smallestEditionFor(d.friends.length, ladder) : null };
}

export function chooseEdition(d: Draft, edition: EditionId): Draft {
  return touch(d, { edition, editionChosen: true });
}

export function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}

export function setPartyMode(d: Draft, on: boolean): Draft {
  // Turning Party Mode off takes the drinking games back out rather than charging for games that vanish.
  const allowed = new Set(visibleMinigames(on).map(m => m.id));
  return touch(d, { partyMode: on, minigames: d.minigames.filter(id => allowed.has(id)) });
}

/** The counts prices.ts needs. Party Mode, Flex Pass, Director's Cut and a custom game are add-ons. */
export function toPicks(d: Draft): OrderPicks {
  const addons: Partial<Record<AddonId, number>> = {};
  if (d.customGame.trim()) addons.big_game_custom = 1;
  if (d.partyMode) addons.party_mode = 1;
  if (d.flexPass) addons.flex_pass = 1;
  if (d.directorsCut) addons.directors_cut = 1;
  return {
    edition: d.edition ?? "standard",
    friends: Math.max(1, d.friends.length),
    bigGames: d.bigGames.length,
    minigames: d.minigames.length,
    addons,
  };
}

export interface StepProblem {
  step: StepId;
  message: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What stops a step from being done, in plain words. An empty list means the step is complete. */
export function problems(d: Draft, step: StepId, thisYear = new Date().getFullYear()): StepProblem[] {
  const out: StepProblem[] = [];
  const say = (message: string) => out.push({ step, message });
  if (step === "squad") {
    if (!d.friends.length) say("Add at least one friend.");
    d.friends.forEach((f, i) => {
      const who = f.name.trim() || `Friend ${i + 1}`;
      if (!f.name.trim()) say(`Friend ${i + 1} needs a name.`);
      for (const { kind, label } of PHOTO_KINDS) {
        const p = f.photos[kind];
        if (!p) say(`${who}: add ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label.toLowerCase()} photo.`);
        else if (p.status === "fail") say(`${who}: the ${label.toLowerCase()} photo won't work. ${p.note}`);
      }
    });
  }
  if (step === "edition" && !d.edition) say("Pick an edition.");
  if (step === "games") {
    if (!d.bigGames.length && !d.customGame.trim()) say("Pick at least one big game, or describe your own.");
  }
  if (step === "review") {
    for (const s of ["squad", "edition", "games"] as StepId[]) out.push(...problems(d, s, thisYear));
    const o = d.organiser;
    if (!o.name.trim()) say("Add your name.");
    if (!EMAIL.test(o.email.trim())) say("Add an email address we can reach you on.");
    if (d.partyMode) {
      const year = Number(o.birthYear);
      if (!/^\d{4}$/.test(o.birthYear) || thisYear - year < 18 || year < thisYear - 110) say("Party Mode is 18+: add your birth year.");
      if (!o.adultsConfirmed) say("Confirm that everyone playing Party Mode is 18 or over.");
    }
    if (!o.photosPermission) say("Confirm that everyone in the photos agreed to be in the game.");
    if (!o.startNow) say("Tick that we can start work straight away.");
  }
  return out;
}

export function stepDone(d: Draft, step: StepId): boolean {
  return problems(d, step).length === 0;
}

/** Allowance used vs included, for the inventory counters. */
export function allowanceUse(d: Draft, ladder: LadderId = activeLadder()) {
  const inc = LADDERS[ladder].editions[d.edition ?? "standard"].includes;
  return {
    friends: { used: d.friends.length, included: inc.characters },
    bigGames: { used: d.bigGames.length, included: inc.bigGames },
    minigames: { used: d.minigames.length, included: inc.minigames },
  };
}

/** The message the organiser sends the group chat to collect everyone's share. */
export function shareMessage(names: string[], total: string, perFriend: string, edition: string): string {
  const who = names.filter(Boolean);
  const list = who.length > 1 ? `${who.slice(0, -1).join(", ")} and ${who[who.length - 1]}` : who[0] ?? "the squad";
  return `I've ordered us our own retro RPG (Game of Us, ${edition} edition) starring ${list}! It came to ${total}, so that's ${perFriend} each. Send it my way when you can 🎮`;
}

function activeLadder(): LadderId {
  return ACTIVE_LADDER;
}
