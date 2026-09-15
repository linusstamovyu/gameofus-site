// The five carts under test, each drawn from the same Cart state so a tester compares designs, not data.
//   B  · Ladder        — this order priced on every edition, a bar per section
//   C  · Inventory     — picks as their own pictures in slots
//   R7 · Itinerary     — a boarding pass: steps are stops, extras are excess baggage
//   D  · Research      — one live total, editions priced by difference, extras framed as "Deluxe covers this"
//   E  · Ready-made    — D's rules applied to a full loadout you trim down (Park et al. 2000)
// Every variant shows the same three things (total, what's picked, what the extras cost); what differs is how.
import { el } from "../dom";
import { tierPill, TIER_LOOK, tierClass } from "../order/tier";
import { EDITION_IDS, type EditionId } from "../order/prices";
import {
  allowanceOf, betterEdition, editionOptions, editionPrice, money, quoteOf, sections, totalOver,
  type Cart, type SectionId, type VariantId,
} from "./state";

export interface CartHandlers {
  /** Remove one pick from inside the cart. */
  remove(section: SectionId, id: string): void;
  /** Switch edition from inside the cart. */
  setEdition(edition: EditionId): void;
  /** Jump the shelf to a section (the empty-state buttons). */
  focus(section: SectionId): void;
}

export const VARIANT_NAMES: Record<VariantId, string> = {
  B: "Ladder", C: "Inventory", R7: "Itinerary pass", D: "Your game", E: "Ready-made",
};

const KEY: Record<SectionId, string> = { friends: "k-squad", bigGames: "k-games", minigames: "k-minis" };

/** "€220.96  €260.96  −15%", always on one line: the saving has to be read against the price, not under it. */
function priceLine(c: Cart, big = true): HTMLElement {
  const q = quoteOf(c);
  const row = el("div", `price-line${big ? " big" : ""}`);
  row.append(el("strong", null, money(q.total)));
  if (q.normalTotal > q.total) {
    row.append(el("s", null, money(q.normalTotal)));
    const off = Math.floor((1 - q.total / q.normalTotal) * 100);
    if (off > 0) row.append(el("span", "off", `−${off}%`));
  }
  return row;
}

const savingLine = (c: Cart): HTMLElement | null => {
  const q = quoteOf(c);
  return q.normalTotal > q.total ? el("div", "saving", `Founder price saves you ${money(q.normalTotal - q.total)}`) : null;
};

function removeButton(section: SectionId, id: string, name: string, h: CartHandlers): HTMLButtonElement {
  const b = el("button", "x");
  b.type = "button";
  b.textContent = "×";
  b.title = `Remove ${name}`;
  b.setAttribute("aria-label", `Remove ${name}`);
  b.onclick = () => h.remove(section, id);
  return b;
}

function emptyButton(section: SectionId, label: string, h: CartHandlers): HTMLButtonElement {
  const b = el("button", "pick-more");
  b.type = "button";
  b.textContent = label;
  b.onclick = () => h.focus(section);
  return b;
}

/** The edition ladder: every edition priced for THIS order, labelled by the difference (Allard et al. 2019). */
function ladder(c: Cart, h: CartHandlers, opts: { differences: boolean }): HTMLElement {
  const box = el("div", "ladder");
  const rows = editionOptions(c);
  const order = [...rows].sort((a, b) => Number(b.best) - Number(a.best) || EDITION_IDS.indexOf(a.edition) - EDITION_IDS.indexOf(b.edition));
  for (const row of order) {
    const on = row.edition === c.edition;
    const rung = el("div", `rung${on ? " on" : ""}${row.best ? " best" : ""}`);
    rung.append(tierPill(row.edition));
    rung.append(el("small", null, on ? "your pick now" : row.best ? "covers everything you picked" : "this order, on this edition"));
    rung.append(el("span", "d", on ? money(row.total) : opts.differences && row.difference !== 0
      ? `${row.difference < 0 ? "−" : "+"}${money(Math.abs(row.difference))}` : money(row.total)));
    if (!on) {
      const b = el("button", "switch");
      b.type = "button";
      b.textContent = `Switch to ${TIER_LOOK[row.edition].name}`;
      b.onclick = () => h.setEdition(row.edition);
      rung.append(b);
    }
    box.append(rung);
  }
  return box;
}

// ---------------------------------------------------------------- B · Ladder
function cartB(c: Cart, h: CartHandlers): HTMLElement {
  const wrap = el("aside", "cart v-b");
  const top = el("div", "c-top");
  top.append(el("div", "lbl", "This order on each edition"));
  wrap.append(top, ladder(c, h, { differences: false }));
  const meters = el("div", "meters");
  for (const s of sections(c)) {
    const m = el("div", `meter ${KEY[s.id]}${s.over ? " over" : ""}`);
    const head = el("div", "top");
    head.append(el("i", "key"), el("b", null, s.label));
    head.append(el("span", null, `${s.picked.length} / ${s.included}${s.over ? ` · +${money(s.over * s.extraEach)}` : ""}`));
    const bar = el("div", "bar");
    const shown = Math.max(s.picked.length, s.included) || 1;
    const inc = el("i");
    inc.style.width = `${(Math.min(s.picked.length, s.included) / shown) * 100}%`;
    const over = el("i", "x");
    over.style.width = `${(s.over / shown) * 100}%`;
    bar.append(inc, over);
    m.append(head, bar);
    const better = betterEdition(c);
    if (s.over && better) m.append(el("div", "next", `${TIER_LOOK[better.edition].name} includes more`));
    meters.append(m);
  }
  wrap.append(meters);
  const foot = el("div", "c-foot");
  foot.append(priceLine(c));
  wrap.append(foot);
  return wrap;
}

// ------------------------------------------------------------- C · Inventory
function cartC(c: Cart, h: CartHandlers): HTMLElement {
  const wrap = el("aside", "cart v-c");
  const top = el("div", "c-top");
  top.append(el("div", "lbl", "Your loadout"));
  const sub = el("div", "c-sub");
  sub.append(tierPill(c.edition), document.createTextNode(totalOver(c) ? ` · ${totalOver(c)} extra added` : " · all included"));
  top.append(sub);
  wrap.append(top);
  for (const s of sections(c)) {
    const box = el("div", `inv-sec ${KEY[s.id]}${s.over ? " over" : ""}`);
    const head = el("h4");
    head.append(el("i", "key"), document.createTextNode(s.label), el("span", null, `${s.picked.length} / ${s.included}`));
    box.append(head);
    const slots = el("div", "slots");
    s.picked.forEach((p, i) => {
      const slot = el("div", `sl${i >= s.included ? " x" : ""}`);
      slot.style.backgroundImage = `url(${p.art})`;
      slot.title = p.name;
      if (i >= s.included) slot.dataset.p = `+${money(s.extraEach)}`;
      slot.append(removeButton(s.id, p.id, p.name, h));
      slots.append(slot);
    });
    for (let i = s.picked.length; i < s.included; i++) slots.append(el("div", "sl empty"));
    box.append(slots);
    if (!s.picked.length) box.append(emptyButton(s.id, `Choose a ${s.label.toLowerCase().replace(/s$/, "")}`, h));
    wrap.append(box);
  }
  const bar = el("div", "c-bar");
  bar.append(priceLine(c));
  wrap.append(bar);
  return wrap;
}

// ------------------------------------------------------------ R7 · Itinerary
function cartR7(c: Cart, h: CartHandlers): HTMLElement {
  const wrap = el("aside", "cart v-r7");
  const head = el("div", "ph");
  head.append(el("b", null, "✈ GAME OF US"), el("span", null, `${TIER_LOOK[c.edition].name.toUpperCase()} CLASS`));
  wrap.append(head);
  const route = el("div", "route");
  for (const s of sections(c)) {
    const stop = el("div", `stop ${KEY[s.id]}${s.picked.length ? "" : " todo"}`);
    const body = el("div");
    body.append(el("div", "nm", s.label));
    body.append(el("div", "it", s.picked.length ? s.picked.map(p => p.name).join(", ") : "nothing yet"));
    stop.append(el("i", "dot"), body, el("span", "a", `${s.included} incl.`));
    route.append(stop);
  }
  wrap.append(route);
  const extras = sections(c).flatMap(s => s.picked.slice(s.included).map(p => ({ ...p, price: s.extraEach, section: s.id })));
  if (extras.length) {
    const bag = el("div", "bag");
    bag.append(el("div", "h", `Excess baggage · ${extras.length} item${extras.length === 1 ? "" : "s"}`));
    for (const e of extras) {
      const line = el("div", "ln x");
      line.append(el("span", null, e.name), el("span", "a", money(e.price)));
      line.append(removeButton(e.section, e.id, e.name, h));
      bag.append(line);
    }
    wrap.append(bag);
  }
  wrap.append(el("div", "perf"));
  const foot = el("div", "pf");
  foot.append(priceLine(c));
  const better = betterEdition(c);
  if (better) {
    const cls = el("div", "class");
    cls.append(tierPill(better.edition));
    cls.append(el("span", null, `Upgrade your class: no excess baggage, ${money(editionPrice(better.edition))}`));
    const b = el("button", "switch");
    b.type = "button";
    b.textContent = "Upgrade";
    b.onclick = () => h.setEdition(better.edition);
    cls.append(b);
    foot.append(cls);
  }
  wrap.append(foot);
  return wrap;
}

// ------------------------------------------------- D and E · the research cart
function researchCart(c: Cart, h: CartHandlers, ready: boolean): HTMLElement {
  const wrap = el("aside", `cart v-d${ready ? " v-e" : ""}`);
  const head = el("div", "d-head");
  const name = el("div", "d-name", ready ? "Your game, ready to go" : "Your game");
  name.append(el("small", null, ready
    ? `The ${TIER_LOOK[c.edition].name} edition, filled in. Take out anything you don't want.`
    : `${TIER_LOOK[c.edition].name} edition · built as you pick`));
  head.append(name);
  wrap.append(head);

  const total = el("div", "d-total");
  const row = el("div", "row");
  row.append(priceLine(c));
  row.append(tierPill(c.edition));
  total.append(row);
  const saving = savingLine(c);
  if (saving) total.append(saving);
  total.append(el("div", "fine", "This is the whole price. Nothing is added at checkout."));
  wrap.append(total);

  const lad = el("div", "d-ladder");
  lad.append(el("div", "lbl", "This order on each edition"));
  lad.append(ladder(c, h, { differences: true }));
  wrap.append(lad);

  const secs = el("div", "d-secs");
  const better = betterEdition(c);
  for (const s of sections(c)) {
    const box = el("div", `d-sec ${KEY[s.id]}`);
    const hd = el("div", "h");
    hd.append(el("i", "key"), document.createTextNode(s.label));
    hd.append(el("span", "n", s.over ? `${s.picked.length} · ${s.included} included` : `${s.picked.length} of ${s.included} included`));
    box.append(hd);
    const list = el("div", "d-slots");
    s.picked.forEach((p, i) => {
      const chip = el("span", i >= s.included ? "plus" : "");
      chip.append(document.createTextNode(i >= s.included ? `${p.name} ${money(s.extraEach)}` : p.name));
      chip.append(removeButton(s.id, p.id, p.name, h));
      list.append(chip);
    });
    const left = s.included - s.picked.length;
    if (left > 0) list.append(el("span", "more", `${left} more included`));
    box.append(list);
    if (s.over && better && better.edition !== c.edition) {
      const cover = el("div", "cover");
      cover.append(document.createTextNode(`${TIER_LOOK[better.edition].name} includes `), el("b", null, String(allowanceFor(better.edition, s.id))), document.createTextNode(ready ? "" : " of these"));
      box.append(cover);
    }
    if (!s.picked.length) box.append(emptyButton(s.id, `Choose a ${s.label.toLowerCase().replace(/s$/, "")}`, h));
    secs.append(box);
  }
  wrap.append(secs);

  const foot = el("div", "d-foot");
  if (ready) foot.append(el("div", "fine", "Everything here is yours to keep or take out. The price follows what's left."));
  wrap.append(foot);
  return wrap;
}

const ALLOWANCE_KEY = { friends: "characters", bigGames: "bigGames", minigames: "minigames" } as const;

function allowanceFor(edition: EditionId, section: SectionId): number {
  return allowanceOf(edition)[ALLOWANCE_KEY[section]];
}

export function renderCart(variant: VariantId, c: Cart, h: CartHandlers): HTMLElement {
  const node = variant === "B" ? cartB(c, h)
    : variant === "C" ? cartC(c, h)
    : variant === "R7" ? cartR7(c, h)
    : researchCart(c, h, variant === "E");
  node.classList.add(tierClass(c.edition));
  return node;
}
