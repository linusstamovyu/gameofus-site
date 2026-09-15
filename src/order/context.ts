// What every step gets from the order page shell (main.ts).
import { el } from "../dom";
import type { Draft, StepId } from "./draft";
import { formatMoney, type Currency, type Quote } from "./prices";

export interface Ctx {
  draft(): Draft;
  /** Replace the draft. `rerender: false` keeps the step's DOM (typing into a field must not lose focus). */
  update(fn: (d: Draft) => Draft, opts?: { rerender?: boolean }): void;
  currency(): Currency;
  country(): string;
  quote(d?: Draft): Quote;
  paidOrders(): number;
  founderSpotsLeft(): number | null;
  shopOpen(): boolean;
  go(step: StepId): void;
  notify(message: string, tone?: "info" | "error"): void;
}

export type StepView = (ctx: Ctx, panel: HTMLElement) => void | (() => void);

export const money = (ctx: Ctx, minor: number, round = false) => formatMoney(minor, ctx.currency(), { round });

/** A labelled checkbox row. */
export function checkbox(label: string, checked: boolean, onChange: (v: boolean) => void, cls = "check"): HTMLLabelElement {
  const row = el("label", cls);
  const box = el("input");
  box.type = "checkbox";
  box.checked = checked;
  box.addEventListener("change", () => onChange(box.checked));
  row.append(box, el("span", null, label));
  return row;
}

export function heading(eyebrow: string, title: string, text?: string): HTMLElement {
  const head = el("header", "step-head");
  head.append(el("p", "eyebrow", eyebrow), el("h1", null, title));
  if (text) head.append(el("p", "lede", text));
  return head;
}

/** "2 of 3 included" as an inventory chip, with the extra price once it goes over. */
export function allowanceChip(used: number, included: number, extraEach: string, noun: string): HTMLElement {
  const over = Math.max(0, used - included);
  const chip = el("span", over ? "chip-inv over" : "chip-inv");
  chip.textContent = included >= 99 ? `${used} ${noun}, all included` : over ? `${used} of ${included} included · ${over} extra at ${extraEach} each` : `${used} of ${included} ${noun} included`;
  return chip;
}
