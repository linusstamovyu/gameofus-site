// PLACEHOLDER written by the scaffold; the keepsakes agent replaces this file (see sections/types.ts for the contract).
import type { Section } from "./types";

export interface KeepsakesChoices {
  notes: string;
}

export const keepsakesSection: Section<KeepsakesChoices> = {
  id: "keepsakes",
  label: "Keepsakes",
  defaults: () => ({ notes: "" }),
  check: raw => ({ notes: typeof (raw as { notes?: unknown })?.notes === "string" ? String((raw as { notes: string }).notes).slice(0, 2000) : "" }),
  addons: () => ({}),
  problems: () => [],
  summary: c => (c.notes ? [c.notes] : []),
  uploads: () => [],
};
