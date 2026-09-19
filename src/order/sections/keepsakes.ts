// Step 9, Keepsakes and delivery: the trailer, the printable gift card, rush delivery and the date it's wanted by.
// PURE (see ./types): shared by the page and the Worker. Flex Pass and Director's Cut are top-level draft fields
// priced by the draft itself, so they are deliberately NOT in this section's addons.
import type { EditionId } from "../prices";
import type { Section, SectionAddons, SectionProblem } from "./types";

export const RECIPIENT_MAX = 60;
export const MESSAGE_MAX = 300;

export interface GiftCard {
  on: boolean;
  recipient: string;
  message: string;
  /** "" or YYYY-MM-DD. */
  giveOn: string;
}

export interface KeepsakesChoices {
  trailer: boolean;
  giftCard: GiftCard;
  rush: boolean;
  /** "" or YYYY-MM-DD. Optional; a date that's too soon is a warning, never a blocker. */
  wantedBy: string;
}

/** Normal delivery, in days after we have everything (the low end for Ultimate's 6–10 weeks). */
export const NORMAL_LEAD_DAYS: Record<EditionId, number> = { standard: 14, deluxe: 28, ultimate: 42 };
/** Rush roughly halves it. */
export const RUSH_LEAD_DAYS: Record<EditionId, number> = { standard: 7, deluxe: 14, ultimate: 21 };

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Milliseconds (UTC midnight) for a real YYYY-MM-DD calendar date, or null. */
export function parseDay(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t;
}

/** A valid YYYY-MM-DD, or "". */
export function cleanDate(s: unknown): string {
  return parseDay(s) === null ? "" : (s as string).trim();
}

/** "24 Dec 2026". */
export function formatDay(s: string): string {
  const t = parseDay(s);
  if (t === null) return s;
  const d = new Date(t);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Today as YYYY-MM-DD in the visitor's local calendar (the UI passes this to the pure helpers). */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/**
 * How a wanted-by date sits against the delivery time, given `today` (YYYY-MM-DD):
 * "" no date (or an unreadable today) · "ok" fits normal (or rush, when rush is on) ·
 * "rush" too soon for normal delivery but rush should make it · "tight" sooner than even rush.
 */
export function wantedByStatus(wantedBy: string, edition: EditionId, today: string, rush = false): "" | "ok" | "rush" | "tight" {
  const want = parseDay(wantedBy);
  const now = parseDay(today);
  if (want === null || now === null) return "";
  const days = Math.round((want - now) / DAY_MS);
  if (days >= NORMAL_LEAD_DAYS[edition]) return "ok";
  if (days >= RUSH_LEAD_DAYS[edition]) return rush ? "ok" : "rush";
  return "tight";
}

/** True when the date is sooner than normal delivery for the edition (the "consider rush" warning). */
export function wantedByTooSoon(wantedBy: string, edition: EditionId, today: string): boolean {
  const s = wantedByStatus(wantedBy, edition, today);
  return s === "rush" || s === "tight";
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const obj = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const keepsakesSection: Section<KeepsakesChoices> = {
  id: "keepsakes",
  label: "Keepsakes",
  defaults: () => ({ trailer: false, giftCard: { on: false, recipient: "", message: "", giveOn: "" }, rush: false, wantedBy: "" }),
  check(raw) {
    const r = obj(raw);
    const g = obj(r.giftCard);
    return {
      trailer: r.trailer === true,
      giftCard: { on: g.on === true, recipient: str(g.recipient, RECIPIENT_MAX), message: str(g.message, MESSAGE_MAX), giveOn: cleanDate(g.giveOn) },
      rush: r.rush === true,
      wantedBy: cleanDate(r.wantedBy),
    };
  },
  addons(c) {
    const out: SectionAddons = {};
    if (c.trailer) out.trailer = 1;
    if (c.giftCard.on) out.gift_card = 1;
    if (c.rush) out.rush = 1;
    return out;
  },
  problems(c): SectionProblem[] {
    return c.giftCard.on && !c.giftCard.recipient.trim() ? [{ message: "Who is the gift card for? Add their name, or turn the gift card off.", field: "giftcard:recipient" }] : [];
  },
  summary(c) {
    const lines: string[] = [];
    if (c.trailer) lines.push("Trailer video");
    if (c.giftCard.on) {
      let line = c.giftCard.recipient ? `Gift card for ${c.giftCard.recipient}` : "Gift card (no name yet)";
      if (c.giftCard.giveOn) line += `, to give on ${formatDay(c.giftCard.giveOn)}`;
      if (c.giftCard.message) line += `: "${c.giftCard.message}"`;
      lines.push(line);
    }
    if (c.rush) lines.push("Rush delivery");
    if (c.wantedBy) lines.push(`Wanted by ${formatDay(c.wantedBy)}`);
    return lines;
  },
  uploads: () => [],
};
