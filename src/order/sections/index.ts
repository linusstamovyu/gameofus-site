// Every section after Games, in flow order (plan 07 steps 4–9). The page, the payload check, the price and the
// Worker all loop over this list, so adding a section is one entry here plus its own files.
import { extrasSection } from "./extras";
import { keepsakesSection } from "./keepsakes";
import { phoneSection } from "./phone";
import { storySection } from "./story";
import type { Section, SectionContext, SectionId, UploadRef } from "./types";
import { vehiclesSection } from "./vehicles";
import { worldSection } from "./world";

// Each section has its own choice type, so the list is typed loosely on purpose.
export const SECTIONS: Section<any>[] = [worldSection, vehiclesSection, phoneSection, storySection, extrasSection, keepsakesSection];

export type SectionChoices = Record<SectionId, unknown>;

export function defaultSections(): SectionChoices {
  return Object.fromEntries(SECTIONS.map(s => [s.id, s.defaults()])) as SectionChoices;
}

/** Sanitises every section; anything missing comes back as that section's defaults. */
export function checkSections(raw: unknown): SectionChoices {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(SECTIONS.map(s => [s.id, s.check(r[s.id])])) as SectionChoices;
}

export function sectionAddons(choices: SectionChoices, ctx: SectionContext): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SECTIONS) {
    for (const [k, n] of Object.entries(s.addons(choices[s.id], ctx))) {
      if (typeof n === "number" && Number.isFinite(n) && n > 0) out[k] = (out[k] ?? 0) + Math.floor(n);
    }
  }
  return out;
}

export function sectionUploads(choices: SectionChoices): (UploadRef & { section: SectionId })[] {
  return SECTIONS.flatMap(s => s.uploads(choices[s.id]).map(u => ({ ...u, section: s.id })));
}

export function sectionById(id: SectionId) {
  return SECTIONS.find(s => s.id === id)!;
}
