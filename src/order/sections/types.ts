// The contract every order step after Games follows (plan 07 steps 4–9). A Section is PURE data logic, shared
// by the page and the Worker: the Worker re-checks and re-prices each section itself, so nothing here may touch
// the DOM, storage or the network. The step's UI lives in src/order/steps/<id>.ts.
import type { AddonId, Allowance, Currency, EditionId } from "../prices";

export type SectionId = "world" | "vehicles" | "phone" | "story" | "extras" | "keepsakes";

/** A file the organiser attached in a section (a place photo, a voice note…). Stored on the device until sent. */
export interface UploadRef {
  /** Unique within the order: [a-zA-Z0-9-], at most 40 chars. Also the storage key on the device. */
  id: string;
  kind: "image" | "audio";
  /** Original file name, for the owner's email. */
  name: string;
  /** MIME type of the stored (possibly resized) file. */
  type: string;
  size: number;
}

export interface SectionContext {
  edition: EditionId;
  /** What the chosen edition includes (zones, vehicles, phonePhotos, …). */
  includes: Allowance;
  /** Names of the friends in the squad, in order. */
  friends: string[];
  partyMode: boolean;
  currency: Currency;
}

/** Add-on quantities a section adds to the order. "rush" is special: +50% of everything else (plan 03). */
export type SectionAddons = Partial<Record<AddonId | "rush", number>>;

export interface Section<T> {
  id: SectionId;
  /** Stepper label, e.g. "Your world". */
  label: string;
  /** Launch state: nothing picked yet. */
  defaults(): T;
  /**
   * Sanitise untrusted data (a stored draft, or a payload arriving at the Worker) into a valid T.
   * Never throws: unknown ids are dropped, strings trimmed and capped, counts clamped, missing fields defaulted.
   */
  check(raw: unknown): T;
  /** What this section adds to the price, given the edition's allowance. Only extras over the allowance cost. */
  addons(choices: T, ctx: SectionContext): SectionAddons;
  /** What stops the step being done, in plain words. [] means complete. Most sections are optional: return []. */
  problems(choices: T, ctx: SectionContext): string[];
  /** Plain-text lines for the review step and the owner's email, e.g. "Home base: Nørrebro flat (from photos)". */
  summary(choices: T, ctx: SectionContext): string[];
  /** Every file this section's choices refer to, so the page uploads them and the Worker expects them. */
  uploads(choices: T): UploadRef[];
}
