// Step 6, The phone: the Photos app (their real photos redrawn), calls and news mails ("beats"), and the two
// free apps. PURE: shared by the page and the Worker, so no DOM, storage or network here.
import type { Section, SectionAddons, SectionContext, SectionProblem, UploadRef } from "./types";

export const MAX_PHONE_PHOTOS = 30;
export const MAX_PHONE_BEATS = 10;
export const PHOTO_CAPTION_MAX = 80;
export const BEAT_FROM_MAX = 60;
export const BEAT_ABOUT_MAX = 500;

export type BeatKind = "call" | "news";

export interface PhonePhoto {
  upload: UploadRef;
  caption: string;
}

export interface PhoneBeat {
  /** [a-zA-Z0-9-], at most 40 chars, unique in the list. */
  id: string;
  kind: BeatKind;
  /** Who calls, or the headline. */
  from: string;
  /** What it's about. */
  about: string;
  /** Drawn specially for them: a custom caller portrait or front page. */
  custom: boolean;
}

export interface PhoneChoices {
  photos: PhonePhoto[];
  beats: PhoneBeat[];
  mapsApp: boolean;
  gamesApp: boolean;
}

const SAFE_ID = /^[a-zA-Z0-9-]{1,40}$/;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A stored image reference, or null if anything about it is off. */
export function checkImageRef(raw: unknown): UploadRef | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || !SAFE_ID.test(r.id)) return null;
  if (r.kind !== "image") return null;
  if (typeof r.type !== "string") return null;
  if (typeof r.size !== "number" || !Number.isFinite(r.size) || r.size < 0) return null;
  return { id: r.id, kind: "image", name: str(r.name, 120), type: r.type.slice(0, 100), size: Math.floor(r.size) };
}

/** How many beats of each sort go over the allowance. The allowance covers custom beats first. */
export function beatExtras(beats: PhoneBeat[], included: number): { custom: number; plain: number } {
  const custom = beats.filter(b => b.custom).length;
  const plain = beats.length - custom;
  const inc = Math.max(0, included);
  const leftForPlain = Math.max(0, inc - custom);
  return { custom: Math.max(0, custom - inc), plain: Math.max(0, plain - leftForPlain) };
}

export const phoneSection: Section<PhoneChoices> = {
  id: "phone",
  label: "The phone",

  defaults: () => ({ photos: [], beats: [], mapsApp: true, gamesApp: true }),

  check(raw) {
    const r = obj(raw);
    const photos: PhonePhoto[] = [];
    const seenPhotos = new Set<string>();
    for (const p of Array.isArray(r.photos) ? r.photos : []) {
      if (photos.length >= MAX_PHONE_PHOTOS) break;
      const upload = checkImageRef(obj(p).upload);
      if (!upload || seenPhotos.has(upload.id)) continue;
      seenPhotos.add(upload.id);
      photos.push({ upload, caption: str(obj(p).caption, PHOTO_CAPTION_MAX) });
    }
    const beats: PhoneBeat[] = [];
    const seenBeats = new Set<string>();
    for (const b of Array.isArray(r.beats) ? r.beats : []) {
      if (beats.length >= MAX_PHONE_BEATS) break;
      const o = obj(b);
      if (typeof o.id !== "string" || !SAFE_ID.test(o.id) || seenBeats.has(o.id)) continue;
      if (o.kind !== "call" && o.kind !== "news") continue;
      seenBeats.add(o.id);
      beats.push({ id: o.id, kind: o.kind, from: str(o.from, BEAT_FROM_MAX), about: str(o.about, BEAT_ABOUT_MAX), custom: o.custom === true });
    }
    return {
      photos,
      beats,
      mapsApp: typeof r.mapsApp === "boolean" ? r.mapsApp : true,
      gamesApp: typeof r.gamesApp === "boolean" ? r.gamesApp : true,
    };
  },

  addons(c, ctx: SectionContext): SectionAddons {
    const out: SectionAddons = {};
    const photoExtra = Math.max(0, c.photos.length - Math.max(0, ctx.includes.phonePhotos));
    if (photoExtra) out.phone_photo = photoExtra;
    const { custom, plain } = beatExtras(c.beats, ctx.includes.phoneBeats);
    if (plain) out.phone_beat = plain;
    if (custom) out.phone_beat_custom = custom;
    return out;
  },

  problems(c) {
    const out: SectionProblem[] = [];
    c.beats.forEach((b, i) => {
      const what = b.kind === "call" ? `Call ${i + 1}` : `News mail ${i + 1}`;
      if (!b.from) out.push({ message: b.kind === "call" ? `${what} needs to say who's calling.` : `${what} needs a headline.`, field: `beat:${i}:from` });
      if (!b.about) out.push({ message: `${what} needs to say what it's about.`, field: `beat:${i}:about` });
    });
    return out;
  },

  summary(c) {
    const lines: string[] = [];
    if (c.photos.length) {
      lines.push(`Photos app: ${c.photos.length} photo${c.photos.length === 1 ? "" : "s"}`);
      for (const p of c.photos) if (p.caption) lines.push(`Photo: ${p.caption}`);
    }
    for (const b of c.beats) {
      const custom = b.custom ? " (drawn specially)" : "";
      if (!b.from || !b.about) {
        lines.push(`${b.kind === "call" ? "A call" : "A news mail"} (details still to fill in)`);
        continue;
      }
      lines.push(b.kind === "call" ? `Call from ${b.from}${custom}: ${b.about}` : `News mail: "${b.from}"${custom}: ${b.about}`);
    }
    const apps = [c.mapsApp && "Maps", c.gamesApp && "Games"].filter(Boolean) as string[];
    lines.push(apps.length ? `Apps: ${apps.join(", ")}` : "Apps: none");
    return lines;
  },

  uploads: c => c.photos.map(p => p.upload),
};
