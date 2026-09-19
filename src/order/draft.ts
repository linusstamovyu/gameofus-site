// The order being built, as plain data (plan 07). Pure functions only, so every rule is testable: the page
// (steps/*.ts) renders a Draft and replaces it through these functions; storage.ts saves it on this device.
// Nothing here knows a price: prices come from prices.ts through toPicks().
import { BIG_GAMES, MINIGAMES, minigameLocked, selectableMinigames } from "./catalogue";
import { checkSections, defaultSections, sectionAddons, sectionById, SECTIONS, type SectionChoices } from "./sections";
import type { SectionContext, SectionId } from "./sections/types";
import { perkActive, perkFree, perkKind } from "./perk";
import { OCCASION_IDS, occasionById, suggestedSize, type OccasionId } from "./occasions";
import type { OutlineId, StoryChoices, Tone } from "./sections/story";
import { ACTIVE_LADDER, EDITION_IDS, LADDERS, MAX_FRIENDS, smallestEditionFor, type AddonId, type EditionId, type LadderId, type OrderPicks } from "./prices";

export type StepId = "purpose" | "squad" | "edition" | "games" | SectionId | "review";
export const STEPS: { id: StepId; label: string }[] = [
  { id: "purpose", label: "What's it for" },
  { id: "squad", label: "Your squad" },
  { id: "edition", label: "Your edition" },
  { id: "games", label: "Games" },
  ...SECTIONS.map(s => ({ id: s.id as StepId, label: s.label })),
  { id: "review", label: "Review" },
];
const SECTION_IDS = new Set<string>(SECTIONS.map(s => s.id));
export const isSectionStep = (id: StepId): id is SectionId => SECTION_IDS.has(id);

export type CheckStatus = "ok" | "warn" | "fail" | "unchecked";

/** A rectangle in the photo's own pixels. */
export interface PhotoBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * ONE photo per character (owner, 15 Sep 2026, replacing face + full body + outfit): it has to show one person
 * with a clear face and the whole body, head to feet. The "Full body" and "Face" boxes on the squad step are
 * crops of this one image, kept as numbers; nothing else is stored or uploaded.
 */
export interface PhotoMeta {
  /** Key of the resized image blob in this device's storage. */
  key: string;
  width: number;
  height: number;
  status: CheckStatus;
  note: string;
  /** Where the face is, for the "Face" box. */
  face: (PhotoBox & { score: number }) | null;
  /** Where the person is, head to feet, for the "Full body" box. */
  body: PhotoBox | null;
  /** Carried over from a three-photo draft: the squad step checks it again before it counts. */
  recheck?: boolean;
}

export interface Friend {
  id: string;
  name: string;
  photo: PhotoMeta | null;
}

export interface Organiser {
  name: string;
  email: string;
  birthYear: string;
  adultsConfirmed: boolean;
  photosPermission: boolean;
  startNow: boolean;
}

/** The answers on the consent screen shown before step 1 (it is a gate, not a step). */
export interface Consent {
  /** "Is everyone in your group 18 or over?" Unanswered until the visitor picks one. */
  adults: "yes" | "no" | null;
  /** When the consent screen was last completed; null means it still has to be shown. */
  answeredAt: number | null;
}

/**
 * OFF (owner, 2026-09-15): answering Yes only UNLOCKS Party Mode (18+); the customer ticks it themselves. It is a
 * paid add-on, and EU consumer law (CRD art. 22) does not allow pre-ticked boxes for extra payments. Kept as a
 * switch so the rule is written down in one place, not so it can be turned back on.
 */
export const PRETICK_PARTY_MODE_ON_ADULTS = false;

export interface Draft {
  version: 1;
  step: StepId;
  /** What the game is for (plan 19). A door, not a product: it presets, it never prices. Null = not asked. */
  occasion: OccasionId | null;
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
  /** Steps 4–9, one entry per section (sections/*.ts). */
  sections: SectionChoices;
  organiser: Organiser;
  consent: Consent;
  /** When the beach tour bonus was unlocked on this device (perk.ts), or null. Only counts while perkActive. */
  perkUnlockedAt: number | null;
  updatedAt: number;
}

export function newDraft(now = Date.now()): Draft {
  return {
    version: 1,
    step: "purpose",
    occasion: null,
    friends: [],
    edition: null,
    editionChosen: false,
    bigGames: [],
    minigames: [],
    customGame: "",
    partyMode: false,
    flexPass: false,
    directorsCut: false,
    sections: defaultSections(),
    organiser: { name: "", email: "", birthYear: "", adultsConfirmed: false, photosPermission: false, startNow: false },
    consent: { adults: null, answeredAt: null },
    perkUnlockedAt: null,
    updatedAt: now,
  };
}

/** A stored draft from an older or broken save comes back as a fresh one rather than crashing the page. */
export function reviveDraft(raw: unknown): Draft {
  const d = raw as Partial<Draft> | null;
  if (!d || d.version !== 1 || !Array.isArray(d.friends)) return newDraft();
  const base = newDraft(d.updatedAt ?? Date.now());
  const known = new Set(STEPS.map(s => s.id));
  const organiser = { ...base.organiser, ...(d.organiser ?? {}) };
  const consent = reviveConsent(d.consent, organiser);
  const revived: Draft = {
    ...base,
    ...d,
    step: known.has(d.step as StepId) ? (d.step as StepId) : "squad",
    edition: EDITION_IDS.includes(d.edition as EditionId) ? (d.edition as EditionId) : null,
    occasion: OCCASION_IDS.includes(d.occasion as OccasionId) ? (d.occasion as OccasionId) : null,
    friends: d.friends.slice(0, MAX_FRIENDS).map(reviveFriend),
    bigGames: (d.bigGames ?? []).filter(id => BIG_GAMES.some(g => g.id === id)),
    minigames: (d.minigames ?? []).filter(id => MINIGAMES.some(g => g.id === id)),
    sections: checkSections(d.sections),
    organiser: { ...organiser, adultsConfirmed: consent.adults === "yes" },
    consent,
    perkUnlockedAt: typeof d.perkUnlockedAt === "number" && Number.isFinite(d.perkUnlockedAt) ? d.perkUnlockedAt : null,
  };
  // A "no" answer can never carry Party Mode or a drinking game, whatever the save says.
  return revived.consent.adults === "no" || !revived.partyMode ? { ...revived, partyMode: false, minigames: revived.minigames.filter(id => selectableMinigames(false).some(m => m.id === id)) } : revived;
}

const numBox = (b: unknown): PhotoBox | null => {
  const r = b as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  const box = { x: n(r.x), y: n(r.y), width: n(r.width), height: n(r.height) };
  return Object.values(box).every(Number.isFinite) && box.width > 0 && box.height > 0 ? box : null;
};

/**
 * One friend from a stored draft. Drafts from before the one-photo rule had up to three photos (face, body,
 * outfit) and none of them was checked for a whole body. The full-body photo is the one most likely to pass, so it
 * is kept (then the face photo, then the outfit one) and marked for a re-check; the squad step checks it again on
 * this device and, if it fails, asks for a new photo with the reason. The other two are dropped (see
 * legacyPhotoKeys, which lets the page delete their blobs).
 */
export function reviveFriend(raw: unknown): Friend {
  const f = (raw ?? {}) as Record<string, unknown>;
  const id = typeof f.id === "string" ? f.id : "";
  const name = typeof f.name === "string" ? f.name : "";
  const photoOf = (p: unknown, recheck: boolean): PhotoMeta | null => {
    const r = p as Record<string, unknown> | null;
    if (!r || typeof r.key !== "string" || typeof r.width !== "number" || typeof r.height !== "number") return null;
    const status = (["ok", "warn", "fail", "unchecked"] as const).includes(r.status as CheckStatus) ? (r.status as CheckStatus) : "unchecked";
    const face = numBox(r.face);
    const score = typeof (r.face as Record<string, unknown> | null)?.score === "number" ? Number((r.face as Record<string, unknown>).score) : 0;
    return recheck
      ? { key: r.key, width: r.width, height: r.height, status: "unchecked", note: "Checking this photo again…", face: null, body: null, recheck: true }
      : { key: r.key, width: r.width, height: r.height, status, note: typeof r.note === "string" ? r.note : "", face: face && { ...face, score }, body: numBox(r.body), ...(r.recheck === true ? { recheck: true } : {}) };
  };
  if ("photo" in f) return { id, name, photo: photoOf(f.photo, false) };
  const old = (f.photos ?? {}) as Record<string, unknown>;
  return { id, name, photo: photoOf(old.body, true) ?? photoOf(old.face, true) ?? photoOf(old.outfit, true) };
}

/** Blob keys a three-photo draft referred to that the revived draft no longer uses (safe to delete). */
export function legacyPhotoKeys(raw: unknown, revived: Draft): string[] {
  const friends = Array.isArray((raw as Partial<Draft> | null)?.friends) ? ((raw as { friends: unknown[] }).friends) : [];
  const kept = new Set(revived.friends.map(f => f.photo?.key).filter(Boolean));
  return friends.flatMap(f => Object.values(((f as Record<string, unknown>)?.photos ?? {}) as Record<string, { key?: unknown } | null>))
    .map(p => p?.key).filter((k): k is string => typeof k === "string" && !kept.has(k));
}

/**
 * Drafts saved before the consent screen existed have no answers: the screen is shown to them once. An old
 * "everyone playing Party Mode is 18+" tick carries over as a Yes, so they only have to confirm it.
 */
function reviveConsent(raw: unknown, organiser: Organiser): Consent {
  const c = (raw ?? {}) as Partial<Consent>;
  const adults = c.adults === "yes" || c.adults === "no" ? c.adults : organiser.adultsConfirmed ? "yes" : null;
  const answeredAt = typeof c.answeredAt === "number" && adults !== null ? c.answeredAt : null;
  return { adults, answeredAt };
}

/** What stops the consent screen from being done. Empty means the order can start. */
export function consentProblems(d: Draft): string[] {
  return consentGaps(d).map(g => g.message);
}

/** The consent screen's gaps, each with the field it is about, in the order they appear on the screen. */
export function consentGaps(d: Draft): { message: string; field: string }[] {
  const out: { message: string; field: string }[] = [];
  if (!d.organiser.photosPermission) out.push({ message: "Confirm that everyone in the photos has agreed to be in the game.", field: "consent:photos" });
  if (d.consent.adults === null) out.push({ message: "Tell us whether everyone in your group is 18 or over.", field: "consent:adults" });
  return out;
}

/** The consent screen is shown until it has been completed once; after that only when asked for (review). */
export function needsConsent(d: Draft): boolean {
  return d.consent.answeredAt === null || consentProblems(d).length > 0;
}

/** Record one answer on the consent screen. Yes unlocks Party Mode (never ticks it); No switches it off and locks it. */
export function setAdults(d: Draft, adults: "yes" | "no"): Draft {
  const was = d.consent.adults;
  let next = touch(d, { consent: { ...d.consent, adults }, organiser: { ...d.organiser, adultsConfirmed: adults === "yes" } });
  if (adults === "no") next = setPartyMode(next, false);
  else if (was !== "yes" && PRETICK_PARTY_MODE_ON_ADULTS) next = setPartyMode(next, true);
  return next;
}

export function setPhotosPermission(d: Draft, v: boolean): Draft {
  return touch(d, { organiser: { ...d.organiser, photosPermission: v } });
}

/** Finish the consent screen. Refused (draft unchanged) while an answer is missing. */
export function completeConsent(d: Draft, now = Date.now()): Draft {
  if (consentProblems(d).length) return d;
  return touch(d, { consent: { ...d.consent, answeredAt: now } });
}

/** Party Mode can only be switched on once the group has said everyone is 18 or over. */
export function partyModeAvailable(d: Draft): boolean {
  return d.consent.adults !== "no";
}

/** Replace one section's choices. */
export function setSection<T>(d: Draft, id: SectionId, value: T): Draft {
  return touch(d, { sections: { ...d.sections, [id]: value } });
}

/** What a section is told about the rest of the order. */
export function sectionContext(d: Draft, currency: SectionContext["currency"] = "DKK", ladder: LadderId = activeLadder()): SectionContext {
  const edition = d.edition ?? "standard";
  return { edition, includes: LADDERS[ladder].editions[edition].includes, friends: squadFriends(d).map(f => f.name.trim()), partyMode: d.partyMode, currency };
}

const touch = (d: Draft, patch: Partial<Draft>): Draft => ({ ...d, ...patch, updatedAt: Date.now() });

export function addFriend(d: Draft, id: string): Draft {
  if (d.friends.length >= MAX_FRIENDS) return d;
  return touch(d, { friends: [...d.friends, { id, name: "", photo: null }] });
}

/** Removing a slot never takes the squad below MIN_FRIENDS (the last slot can be cleared, not removed). */
export function removeFriend(d: Draft, id: string): Draft {
  if (d.friends.length <= MIN_FRIENDS) return d;
  return touch(d, { friends: d.friends.filter(f => f.id !== id) });
}

export function updateFriend(d: Draft, id: string, patch: Partial<Friend>): Draft {
  return touch(d, { friends: d.friends.map(f => (f.id === id ? { ...f, ...patch } : f)) });
}

/** Set or clear a friend's one photo. */
export function setPhoto(d: Draft, friendId: string, meta: PhotoMeta | null): Draft {
  return touch(d, { friends: d.friends.map(f => (f.id === friendId ? { ...f, photo: meta } : f)) });
}

// ---------- squad slots (owner, 15 Sep 2026) ----------
// The squad step opens with one slot per character the edition includes (Deluxe: 6), so you "have" what you
// buy. The edition drives the slot count, not the other way round: picking an edition pads or trims EMPTY
// slots, and adding past the allowance is an extra character at the add-on price (prices.ts), never a
// silent change of edition.
// EVERY SLOT MUST BE FILLED (owner, 15 Sep 2026, replacing "an empty slot is an open seat, not charged"): an
// empty slot blocks step 1 and the send, and it counts in the price, so the total never changes by surprise
// when the last friend is typed in. The way out is to fill it, remove it, or pick a smaller edition.
// The minimum is ONE character, not the edition's count: a Deluxe order with four friends is allowed (the
// edition price stays), and the squad step suggests the smaller edition when that would cost less
// (prices.downgradeHint) rather than forcing it. Standard below 2 has nothing smaller to suggest.

/** The fewest slots a squad can be taken down to. */
export const MIN_FRIENDS = 1;

/** The edition a fresh order opens on (the recommended, gold one). */
export const DEFAULT_EDITION: EditionId = "deluxe";

const slotId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9-]/gi, "").slice(0, 36);

/** A slot nobody has started: no name, no photo. It blocks the order until it is filled or removed. */
export const isEmptySlot = (f: Friend): boolean => !f.name.trim() && !f.photo;
/** Older name for isEmptySlot, kept for callers that still use it. */
export const isOpenSlot = isEmptySlot;

/** The friends someone has started (name or photo), for name lists and previews. Empty slots are left out. */
export const squadFriends = (d: Draft): Friend[] => d.friends.filter(f => !isEmptySlot(f));

/** Every slot in the order, empty or not: what is charged and what has to be filled. */
export const squadSize = (d: Draft): number => d.friends.length;

/** 1-based numbers of the empty slots. */
export const emptySlots = (d: Draft): number[] => d.friends.flatMap((f, i) => (isEmptySlot(f) ? [i + 1] : []));

/**
 * Pad with empty slots up to the edition's characters, and drop empty slots beyond it (the last ones first,
 * wherever they sit). Started friends are never dropped, so a squad bigger than the edition stays as extras.
 */
export function fitSlots(d: Draft, makeId: () => string = slotId, ladder: LadderId = activeLadder()): Draft {
  const want = Math.min(MAX_FRIENDS, LADDERS[ladder].editions[d.edition ?? DEFAULT_EDITION].includes.characters);
  let next = d;
  while (next.friends.length < want) next = addFriend(next, makeId());
  while (next.friends.length > want) {
    const last = next.friends.map(isEmptySlot).lastIndexOf(true);
    if (last < 0) break;
    next = { ...next, friends: next.friends.filter((_, i) => i !== last) };
  }
  return next;
}

/** A draft with no squad yet opens on the default edition with its slots ready (also normalises old empty drafts). */
export function prefillSquad(d: Draft, makeId: () => string = slotId): Draft {
  if (d.friends.length) return d;
  return fitSlots({ ...d, edition: d.edition ?? DEFAULT_EDITION }, makeId);
}

export function chooseEdition(d: Draft, edition: EditionId, makeId: () => string = slotId): Draft {
  return fitSlots(touch(d, { edition, editionChosen: true }), makeId);
}

// ---------- step 0: what's it for (plan 19) ----------

const story = (d: Draft): StoryChoices => d.sections.story as StoryChoices;
const setStory = (d: Draft, patch: Partial<StoryChoices>): Draft => setSection(d, "story", { ...story(d), ...patch });

/** The tone a tile sets is copy, never a price, so it is applied straight away. */
export function setTone(d: Draft, tone: Tone): Draft {
  return setStory(d, { tone });
}

export function setOutline(d: Draft, outline: OutlineId): Draft {
  return setStory(d, { outline });
}

/**
 * Pick the occasion. It sets the tone and, while the visitor has not picked an edition themselves, the
 * edition and the number of slots the occasion opens on. It never touches an add-on: a suggestion is
 * offered with its price and added by a tap (occasions.ts).
 */
export function setOccasion(d: Draft, id: OccasionId, makeId: () => string = slotId, ladder: LadderId = activeLadder()): Draft {
  const occ = occasionById(id);
  if (!occ) return d;
  let next = touch(d, { occasion: id });
  next = setTone(next, occ.tone);
  if (next.editionChosen) return next;
  return setGroupSize(touch(next, { edition: occ.edition }), suggestedSize(id), makeId, ladder);
}

/**
 * "How many people is it for?" — the second and last question of step 0.
 *
 * It sets the SLOTS to the answer, not to the edition's allowance: a group of four told us they are four,
 * and padding back up to Deluxe's six would leave two empty slots, which block the send. The edition
 * follows as the smallest one that fits, and `editionChosen` stays false so the edition step is still a
 * recommendation rather than a decision already taken. A friend somebody has already typed in is never
 * dropped, so the size can only grow past what is filled.
 */
export function setGroupSize(d: Draft, size: number, makeId: () => string = slotId, ladder: LadderId = activeLadder()): Draft {
  const started = squadFriends(d).length;
  const want = Math.max(MIN_FRIENDS, started, Math.min(MAX_FRIENDS, Math.round(size)));
  const edition = d.editionChosen ? d.edition : smallestEditionFor(want, ladder);
  let next = touch(d, { edition: edition ?? d.edition ?? DEFAULT_EDITION });
  while (next.friends.length < want) next = addFriend(next, makeId());
  while (next.friends.length > want) {
    const last = next.friends.map(isEmptySlot).lastIndexOf(true);
    if (last < 0) break;
    next = { ...next, friends: next.friends.filter((_, i) => i !== last) };
  }
  return next;
}

export function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}

export function setPartyMode(d: Draft, on: boolean): Draft {
  if (on && !partyModeAvailable(d)) return d;
  // Turning Party Mode off takes the drinking games back out rather than charging for games that are locked.
  const allowed = new Set(selectableMinigames(on).map(m => m.id));
  return touch(d, { partyMode: on, minigames: d.minigames.filter(id => allowed.has(id)) });
}

/** Pick or drop a minigame. A drinking game is locked (no change) until Party Mode is on. */
export function toggleMinigame(d: Draft, id: string): Draft {
  const m = MINIGAMES.find(g => g.id === id);
  if (!m || (minigameLocked(m, d.partyMode) && !d.minigames.includes(id))) return d;
  return touch(d, { minigames: toggleIn(d.minigames, id) });
}

/** The counts prices.ts needs. Party Mode, Flex Pass, Director's Cut and a custom game are add-ons. */
export function toPicks(d: Draft): OrderPicks {
  const addons: Partial<Record<AddonId, number>> = {};
  if (d.customGame.trim()) addons.big_game_custom = 1;
  if (d.partyMode) addons.party_mode = 1;
  if (d.flexPass) addons.flex_pass = 1;
  if (d.directorsCut) addons.directors_cut = 1;
  const { rush, ...fromSections } = sectionAddons(d.sections, sectionContext(d));
  for (const [id, n] of Object.entries(fromSections)) addons[id as AddonId] = (addons[id as AddonId] ?? 0) + n;
  return {
    edition: d.edition ?? "standard",
    friends: Math.max(MIN_FRIENDS, squadSize(d)),
    bigGames: d.bigGames.length,
    minigames: d.minigames.length,
    addons,
    rush: Boolean(rush),
    ...(perkActive(d.perkUnlockedAt) ? { free: perkFree(perkKind(d.edition ?? "standard", d.consent.adults)) } : {}),
  };
}

/** Carry a bonus unlocked on the beach into the order. Keeps the earliest unlock, so it can't be re-extended. */
export function withPerk(d: Draft, unlockedAt: number | null): Draft {
  if (unlockedAt === null || !perkActive(unlockedAt)) return d;
  if (d.perkUnlockedAt !== null && perkActive(d.perkUnlockedAt) && d.perkUnlockedAt <= unlockedAt) return d;
  return { ...d, perkUnlockedAt: unlockedAt };
}

export interface StepProblem {
  step: StepId;
  message: string;
  /** The control this is about, matching a `data-field` in the step view (see `sections/types.ts`). */
  field?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What stops a step from being done, in plain words. An empty list means the step is complete. */
export function problems(d: Draft, step: StepId, thisYear = new Date().getFullYear()): StepProblem[] {
  const out: StepProblem[] = [];
  const say = (message: string, field?: string) => out.push(field ? { step, message, field } : { step, message });
  if (step === "squad") {
    if (!d.friends.length) say("Add at least one friend.");
    d.friends.forEach((f, i) => {
      // Every slot the order has must be filled: an empty one is either a friend still to add or a slot to remove.
      // The last slot can't be removed (MIN_FRIENDS), so it isn't offered as a way out there.
      if (isEmptySlot(f)) return say(d.friends.length > MIN_FRIENDS ? `Slot ${i + 1} is empty — add a friend or remove the slot.` : `Slot ${i + 1} is empty — add a friend.`, `friend:${f.id}:name`);
      const who = f.name.trim() || `Friend ${i + 1}`;
      if (!f.name.trim()) say(`Friend ${i + 1} needs a name.`, `friend:${f.id}:name`);
      const p = f.photo;
      if (!p) say(`${who}: add a photo (one clear face, head to feet).`, `friend:${f.id}:photo`);
      else if (p.recheck) say(`${who}: we're still checking the photo.`, `friend:${f.id}:photo`);
      else if (p.status === "fail") say(`${who}: the photo won't work. ${p.note}`, `friend:${f.id}:photo`);
    });
  }
  if (step === "edition" && !d.edition) say("Pick an edition.", "edition");
  if (step === "games") {
    if (!d.bigGames.length && !d.customGame.trim()) say("Pick at least one big game, or describe your own.", "big-games");
  }
  if (isSectionStep(step)) {
    const sec = sectionById(step);
    for (const p of sec.problems(d.sections[step], sectionContext(d))) typeof p === "string" ? say(p) : say(p.message, p.field);
  }
  if (step === "review") {
    for (const s of STEPS.filter(x => x.id !== "review").map(x => x.id)) out.push(...problems(d, s, thisYear));
    const o = d.organiser;
    if (!o.name.trim()) say("Add your name.");
    if (!EMAIL.test(o.email.trim())) say("Add an email address we can reach you on.");
    if (d.partyMode) {
      const year = Number(o.birthYear);
      if (!/^\d{4}$/.test(o.birthYear) || thisYear - year < 18 || year < thisYear - 110) say("Party Mode is 18+: add your birth year.");
      if (!o.adultsConfirmed) say("Confirm that everyone playing Party Mode is 18 or over.");
    }
    if (d.consent.adults === null) say("Tell us whether everyone in your group is 18 or over.");
    if (!o.photosPermission) say("Confirm that everyone in the photos agreed to be in the game.");
    if (!o.startNow) say("Tick that we can start work straight away.");
  }
  return out;
}

/**
 * Steps that can be left unfinished while building (plan 18 §3, owner 15 Sep 2026): the squad's photos are the
 * hardest part, so they come last. Their problems still show on the step and still block Review, which re-checks
 * every step before anything can be paid or sent, so an order can never go without them.
 */
export const DEFERRED_STEPS: ReadonlySet<StepId> = new Set<StepId>(["squad"]);

/** What stops Next (and the stepper) moving past this step. Empty for a deferred step. */
export function blockingProblems(d: Draft, step: StepId): StepProblem[] {
  return DEFERRED_STEPS.has(step) ? [] : problems(d, step);
}

export function stepDone(d: Draft, step: StepId): boolean {
  return problems(d, step).length === 0;
}

/** Allowance used vs included, for the inventory counters. */
export function allowanceUse(d: Draft, ladder: LadderId = activeLadder()) {
  const inc = LADDERS[ladder].editions[d.edition ?? "standard"].includes;
  return {
    friends: { used: squadSize(d), included: inc.characters },
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
