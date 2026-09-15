// Step 7, Your story: the memory the main quest is built from, its tone and language, the villain, the key
// moments (some drawn as cutscenes) and how the game ends. Pure data logic, shared by the page and the Worker.
import type { Section, SectionAddons, SectionContext, UploadRef } from "./types";

export const TONES = ["lads", "romance", "family", "corporate"] as const;
export type Tone = (typeof TONES)[number];

export const ENDING_TYPES = ["none", "dedication", "birthday", "proposal"] as const;
export type EndingType = (typeof ENDING_TYPES)[number];

export const MEMORY_MIN = 20;
export const MEMORY_MAX = 4000;
export const LANGUAGE_MAX = 40;
export const BOSS_MAX = 200;
export const MAX_MOMENTS = 8;
export const MOMENT_MAX = 300;
export const ENDING_MESSAGE_MAX = 500;
export const ID_MAX = 40;
export const SUMMARY_MEMORY_CHARS = 120;

export interface Moment {
  id: string;
  text: string;
  photo: UploadRef | null;
  /** Drawn as an illustrated cutscene. */
  cutscene: boolean;
}

export interface Ending {
  type: EndingType;
  message: string;
  /** A bespoke reveal scene rather than the standard end card. */
  custom: boolean;
}

export interface StoryChoices {
  memory: string;
  voiceNote: UploadRef | null;
  tone: Tone;
  language: string;
  boss: string;
  moments: Moment[];
  ending: Ending;
}

export const TONE_LABEL: Record<Tone, string> = { lads: "Lads", romance: "Romance", family: "Family", corporate: "Corporate" };
export const TONE_BLURB: Record<Tone, string> = {
  lads: "Banter, chaos and in-jokes. Nobody is safe.",
  romance: "Sweet, a little silly, and about the two of you.",
  family: "Warm and fun for every age at the table.",
  corporate: "Team spirit with a wink. Safe to show the boss.",
};
export const ENDING_LABEL: Record<EndingType, string> = { none: "No special ending", dedication: "Dedication", birthday: "Birthday", proposal: "Proposal" };

const ID_RE = /^[a-zA-Z0-9-]{1,40}$/;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

export function checkStoryUpload(raw: unknown, kind: UploadRef["kind"]): UploadRef | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  if (r.kind !== kind) return null;
  if (typeof r.type !== "string" || typeof r.size !== "number" || !Number.isFinite(r.size) || r.size < 0) return null;
  return { id: r.id, kind, name: str(r.name, 120), type: r.type.slice(0, 100), size: Math.floor(r.size) };
}

function checkMoment(raw: unknown): Moment | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || !ID_RE.test(r.id)) return null;
  return { id: r.id, text: str(r.text, MOMENT_MAX), photo: checkStoryUpload(r.photo, "image"), cutscene: r.cutscene === true };
}

const endingCosts = (e: Ending) => e.type !== "none";

export const storySection: Section<StoryChoices> = {
  id: "story",
  label: "Your story",

  defaults: () => ({
    memory: "",
    voiceNote: null,
    tone: "lads",
    language: "English",
    boss: "",
    moments: [],
    ending: { type: "none", message: "", custom: false },
  }),

  check(raw) {
    const r = obj(raw);
    const ids = new Set<string>();
    const photoIds = new Set<string>();
    const voiceNote = checkStoryUpload(r.voiceNote, "audio");
    const moments: Moment[] = [];
    for (const m of Array.isArray(r.moments) ? r.moments : []) {
      if (moments.length >= MAX_MOMENTS) break;
      const c = checkMoment(m);
      if (!c || ids.has(c.id)) continue;
      ids.add(c.id);
      // One stored file belongs to one place in the order.
      if (c.photo && (photoIds.has(c.photo.id) || c.photo.id === voiceNote?.id)) c.photo = null;
      if (c.photo) photoIds.add(c.photo.id);
      moments.push(c);
    }
    const e = obj(r.ending);
    const type = oneOf(ENDING_TYPES, e.type, "none");
    return {
      memory: str(r.memory, MEMORY_MAX),
      voiceNote,
      tone: oneOf(TONES, r.tone, "lads"),
      language: str(r.language, LANGUAGE_MAX) || "English",
      boss: str(r.boss, BOSS_MAX),
      moments,
      ending: { type, message: type === "none" ? "" : str(e.message, ENDING_MESSAGE_MAX), custom: type !== "none" && e.custom === true },
    };
  },

  addons(c, ctx: SectionContext): SectionAddons {
    const out: SectionAddons = {};
    const cutscenes = c.moments.filter(m => m.cutscene).length;
    const extra = Math.max(0, cutscenes - ctx.includes.cutscenes);
    if (extra) out.cutscene = extra;
    if (endingCosts(c.ending)) {
      if (c.ending.custom) out.ending_custom = 1;
      else out.ending = 1;
    }
    return out;
  },

  problems(c) {
    const out: string[] = [];
    if (!c.voiceNote) {
      if (!c.memory) out.push("Tell us the memory, or attach a voice note.");
      else if (c.memory.length < MEMORY_MIN) out.push(`Tell us a bit more about the memory (at least ${MEMORY_MIN} characters), or attach a voice note.`);
    }
    if (c.moments.some(m => !m.text)) out.push("Every key moment needs a few words.");
    if (c.ending.type !== "none" && !c.ending.message) out.push(`Write the message for the ${ENDING_LABEL[c.ending.type].toLowerCase()} ending.`);
    return out;
  },

  summary(c) {
    const lines: string[] = [];
    if (c.memory) lines.push(c.memory.length > SUMMARY_MEMORY_CHARS ? `${c.memory.slice(0, SUMMARY_MEMORY_CHARS).trimEnd()}…` : c.memory);
    if (c.voiceNote) lines.push(`Voice note: ${c.voiceNote.name || "attached"}`);
    lines.push(`Tone: ${TONE_LABEL[c.tone]} · Language: ${c.language}`);
    if (c.boss) lines.push(`Boss: ${c.boss}`);
    if (c.moments.length) {
      const cuts = c.moments.filter(m => m.cutscene).length;
      lines.push(`Key moments: ${c.moments.length}${cuts ? ` (${cuts} as cutscene${cuts === 1 ? "" : "s"})` : ""}`);
    }
    if (c.ending.type !== "none") lines.push(`Ending: ${c.ending.type}${c.ending.custom ? " (custom)" : ""}`);
    return lines;
  },

  uploads(c) {
    const out: UploadRef[] = [];
    if (c.voiceNote) out.push(c.voiceNote);
    for (const m of c.moments) if (m.photo) out.push(m.photo);
    return out;
  },
};
