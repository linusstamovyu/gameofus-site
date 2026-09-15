// PLACEHOLDER written by the scaffold; the world agent replaces this file (see sections/types.ts for the contract).
import type { Section } from "./types";

export interface WorldChoices {
  notes: string;
}

export const worldSection: Section<WorldChoices> = {
  id: "world",
  label: "Your world",
  defaults: () => ({ notes: "" }),
  check: raw => ({ notes: typeof (raw as { notes?: unknown })?.notes === "string" ? String((raw as { notes: string }).notes).slice(0, 2000) : "" }),
  addons: () => ({}),
  problems: () => [],
  summary: c => (c.notes ? [c.notes] : []),
  uploads: () => [],
};
