// PLACEHOLDER written by the scaffold; the story agent replaces this file (see sections/types.ts for the contract).
import type { Section } from "./types";

export interface StoryChoices {
  notes: string;
}

export const storySection: Section<StoryChoices> = {
  id: "story",
  label: "Your story",
  defaults: () => ({ notes: "" }),
  check: raw => ({ notes: typeof (raw as { notes?: unknown })?.notes === "string" ? String((raw as { notes: string }).notes).slice(0, 2000) : "" }),
  addons: () => ({}),
  problems: () => [],
  summary: c => (c.notes ? [c.notes] : []),
  uploads: () => [],
};
