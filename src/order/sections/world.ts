// Step 4, Your world: the places the game is set in (each becomes a zone) and the real shops or bars that
// appear as signage. Pure data logic, shared by the page and the Worker (see ./types).
import type { Section, SectionAddons, SectionContext, SectionProblem, UploadRef } from "./types";

export const PLACE_KINDS = ["home", "town", "landmark", "country"] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export const PLACE_KITS = ["home", "town", "beach", "harbour", "city", "stadium", "nightlife", "countryside"] as const;
export type PlaceKit = (typeof PLACE_KITS)[number];

export const MAX_PLACES = 10;
export const MAX_PLACE_PHOTOS = 5;
export const MAX_SIGNS = 10;
export const NAME_MAX = 80;
export const PIN_MAX = 300;
export const NOTES_MAX = 500;
export const SIGN_MAX = 40;
export const ID_MAX = 40;

export interface Place {
  id: string;
  kind: PlaceKind;
  kit: PlaceKit;
  name: string;
  /** A map link or an address. Optional. */
  mapPin: string;
  /** Build it from their photos rather than from the template kit. */
  fromPhotos: boolean;
  photos: UploadRef[];
  notes: string;
}

export interface WorldChoices {
  places: Place[];
  signs: string[];
}

export const KIND_LABEL: Record<PlaceKind, string> = { home: "Home", town: "Town", landmark: "Landmark", country: "Another country" };

const ID_RE = /^[a-zA-Z0-9-]{1,40}$/;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

export function checkUpload(raw: unknown): UploadRef | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  if (r.kind !== "image") return null;
  if (typeof r.type !== "string" || typeof r.size !== "number" || !Number.isFinite(r.size) || r.size < 0) return null;
  return { id: r.id, kind: "image", name: str(r.name, 120), type: r.type.slice(0, 100), size: Math.floor(r.size) };
}

function checkPlace(raw: unknown): Place | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  const seen = new Set<string>();
  const photos = (Array.isArray(r.photos) ? r.photos : [])
    .map(checkUpload)
    .filter((p): p is UploadRef => !!p && !seen.has(p.id) && !!seen.add(p.id))
    .slice(0, MAX_PLACE_PHOTOS);
  return {
    id: r.id,
    kind: oneOf(PLACE_KINDS, r.kind, "town"),
    kit: oneOf(PLACE_KITS, r.kit, "town"),
    name: str(r.name, NAME_MAX),
    mapPin: str(r.mapPin, PIN_MAX),
    fromPhotos: r.fromPhotos === true,
    photos,
    notes: str(r.notes, NOTES_MAX),
  };
}

/** How many extra places each kind costs. Included slots cover from-photos places first (fairest to the customer). */
export function worldExtras(choices: WorldChoices, included: number): { zone: number; zone_photos: number } {
  const z = Math.max(0, Math.floor(included) || 0);
  const p = choices.places.filter(pl => pl.fromPhotos).length;
  const t = choices.places.length - p;
  const extraPhotos = Math.max(0, p - z);
  const leftover = Math.max(0, z - p);
  return { zone_photos: extraPhotos, zone: Math.max(0, t - leftover) };
}

export const worldSection: Section<WorldChoices> = {
  id: "world",
  label: "Your world",
  defaults: () => ({ places: [], signs: [] }),

  check(raw: unknown): WorldChoices {
    const r = obj(raw);
    const ids = new Set<string>();
    const places: Place[] = [];
    for (const item of Array.isArray(r.places) ? r.places : []) {
      if (places.length >= MAX_PLACES) break;
      const p = checkPlace(item);
      if (!p || ids.has(p.id)) continue;
      ids.add(p.id);
      places.push(p);
    }
    const signs = (Array.isArray(r.signs) ? r.signs : []).map(s => str(s, SIGN_MAX)).filter(Boolean).slice(0, MAX_SIGNS);
    return { places, signs };
  },

  addons(choices: WorldChoices, ctx: SectionContext): SectionAddons {
    const out: SectionAddons = {};
    const { zone, zone_photos } = worldExtras(choices, ctx.includes.zones);
    if (zone) out.zone = zone;
    if (zone_photos) out.zone_photos = zone_photos;
    if (choices.signs.length) out.shop_sign = choices.signs.length;
    return out;
  },

  problems(choices: WorldChoices): SectionProblem[] {
    const out: SectionProblem[] = [];
    if (!choices.places.length) return [{ message: "Add at least your home base.", field: "places" }];
    choices.places.forEach((p, i) => {
      const label = p.name || `Place ${i + 1}`;
      if (!p.name) out.push({ message: `Give place ${i + 1} a name.`, field: `place:${i}:name` });
      if (p.fromPhotos && !p.photos.length) out.push({ message: `${label} is built from your photos, so add at least one photo.`, field: `place:${i}:photos` });
    });
    return out;
  },

  summary(choices: WorldChoices): string[] {
    const lines = choices.places.map(p => {
      const how = p.fromPhotos ? `from ${p.photos.length} photo${p.photos.length === 1 ? "" : "s"}` : `${p.kit} style`;
      return `${KIND_LABEL[p.kind]} · ${p.name || "Unnamed place"} (${how})`;
    });
    if (choices.signs.length) lines.push(`Signs: ${choices.signs.join(", ")}`);
    return lines;
  },

  uploads: (choices: WorldChoices) => choices.places.flatMap(p => p.photos),
};
