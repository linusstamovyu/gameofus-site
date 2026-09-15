// The country picker: a flag + currency button in the header, a list to choose from, and a one-line banner
// the first time we guess. The choice is remembered on this device (plan 03 P23).
import { el } from "../dom";
import type { Currency } from "../order/prices";
import { COUNTRIES, countryName, currencyFor, flag, guessCountry, normaliseCountry } from "./country";

const KEY = "gou-country";
type Listener = (country: string, currency: Currency) => void;

let current = "DK";
let chosen = false;
const listeners: Listener[] = [];

export function currentCountry(): string {
  return current;
}

export function currentCurrency(): Currency {
  return currencyFor(current);
}

export function onCountryChange(fn: Listener): void {
  listeners.push(fn);
}

function setCountry(code: string, byVisitor: boolean): void {
  current = code;
  chosen = chosen || byVisitor;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, chosen }));
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  document.querySelectorAll<HTMLElement>("[data-country-button]").forEach(renderButton);
  listeners.forEach(fn => fn(current, currencyFor(current)));
}

function readStored(): { code: string; chosen: boolean } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const code = normaliseCountry(raw?.code);
    return code ? { code, chosen: Boolean(raw.chosen) } : null;
  } catch {
    return null;
  }
}

async function edgeCountry(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch("/api/geo", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
    return ((await res.json()) as { country?: string | null }).country ?? null;
  } catch {
    return null; // no Worker (local dev, static preview): fall back to the browser's languages
  }
}

function renderButton(b: HTMLElement): void {
  b.textContent = `${flag(current)} ${currencyFor(current)}`;
  b.setAttribute("aria-label", `Shopping from ${countryName(current)}, prices in ${currencyFor(current)}. Change country`);
}

/** Mount the header button (into every [data-country-slot]) and resolve the starting country. */
export async function initCountryPicker(): Promise<void> {
  const stored = readStored();
  if (stored) {
    current = stored.code;
    chosen = stored.chosen;
  }
  for (const slot of document.querySelectorAll<HTMLElement>("[data-country-slot]")) {
    const b = el("button", "country-btn");
    b.type = "button";
    b.dataset.countryButton = "";
    b.addEventListener("click", () => openList(b));
    renderButton(b);
    slot.replaceWith(b);
  }
  if (!stored) {
    const guess = guessCountry(await edgeCountry(), navigator.languages ?? [navigator.language]);
    setCountry(guess, false);
    showBanner(guess);
  } else {
    listeners.forEach(fn => fn(current, currencyFor(current)));
  }
}

function showBanner(code: string): void {
  if (chosen) return;
  const bar = el("div", "country-banner");
  bar.setAttribute("role", "status");
  const text = el("span", null, `${flag(code)} Shopping from ${countryName(code)}? Prices are shown in ${currencyFor(code)}.`);
  const ok = el("button", "link-btn", "Yes");
  ok.type = "button";
  ok.onclick = () => { setCountry(code, true); bar.remove(); };
  const change = el("button", "link-btn", "Change");
  change.type = "button";
  change.onclick = () => { bar.remove(); openList(document.querySelector<HTMLElement>("[data-country-button]")); };
  bar.append(text, ok, change);
  document.body.prepend(bar);
}

function openList(anchor: HTMLElement | null): void {
  document.querySelector(".country-list")?.remove();
  const box = el("div", "country-list");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Choose where you're shopping from");
  const head = el("p", "country-head", "Where are you shopping from?");
  const list = el("ul");
  for (const c of COUNTRIES) {
    const li = el("li");
    const b = el("button", c.code === current ? "on" : null);
    b.type = "button";
    b.append(el("span", "flag", flag(c.code)), el("span", "name", c.name), el("span", "cur", currencyFor(c.code)));
    b.onclick = () => { setCountry(c.code, true); close(); };
    li.append(b);
    list.append(li);
  }
  const closeBtn = el("button", "link-btn", "Close");
  closeBtn.type = "button";
  closeBtn.onclick = () => close();
  box.append(head, list, closeBtn);
  document.body.append(box);
  const r = anchor?.getBoundingClientRect();
  if (r) {
    box.style.top = `${Math.round(r.bottom + 8)}px`;
    box.style.right = `${Math.max(12, Math.round(window.innerWidth - r.right))}px`;
  }
  (box.querySelector("button.on") as HTMLElement | null)?.focus();
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
  const onDown = (e: PointerEvent) => { if (!box.contains(e.target as Node) && e.target !== anchor) close(); };
  document.addEventListener("keydown", onKey);
  setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
  function close() {
    box.remove();
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("pointerdown", onDown);
    anchor?.focus();
  }
}
