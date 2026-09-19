// Fills the page sections from src/content. The markup around them is static in index.html.
import type { Occasions, Offer, SquadMember } from "../content/types";
import { occasionArt } from "../order/occasions";
import { $, asset, el } from "../dom";
import { ACTIVE_LADDER, ADDONS, FOUNDER_SPOTS, LADDERS, formatMoney, type AddonId, type Currency, type Edition } from "../order/prices";

export function renderSquad(squad: SquadMember[]) {
  const roster = $("#roster");
  // Three steps side by side, so the whole value is on screen at once: the real photo, the portrait we drew from it,
  // and the character walking in the game.
  const figure = (caption: string, media: HTMLElement, game: boolean) => {
    const f = el("figure", game ? "game" : null);
    f.append(media, el("figcaption", null, caption));
    return f;
  };
  const image = (file: string, cls: string, alt: string) => {
    const i = el("img", cls); i.src = asset(file); i.alt = alt; i.loading = "lazy"; return i;
  };
  const arrow = () => { const a = el("span", "arrow", "→"); a.setAttribute("aria-hidden", "true"); return a; };
  for (const m of squad) {
    const card = el("article", "lad");
    const steps = el("div", "steps-row");
    if (m.photo) steps.append(figure("Real photo", image(m.photo, "photo", `${m.name} in real life`), false), arrow());
    const walk = el("div", "walk");
    walk.style.backgroundImage = `url(${asset(m.walk)})`;
    walk.setAttribute("role", "img");
    walk.setAttribute("aria-label", `${m.name} walking in the game`);
    steps.append(figure("Portrait", image(m.face, "portrait", `${m.name}'s portrait in the game`), true), arrow(), figure("Walking", walk, true));
    const info = el("div", "info");
    const h = el("h3", null, m.name);
    h.append(el("span", `chip ${m.type}`, m.type));
    info.append(h, el("p", null, m.line), el("span", "move", `Signature move: ${m.move}`));
    card.append(steps, info);
    roster.append(card);
  }
}

/** Money as the big number on a card: "400" + "DKK per person", or "£45" + "per person". */
function bigMoney(minor: number, currency: Currency, suffix: string): [string, string] {
  const shown = formatMoney(minor, currency, { round: true });
  return currency === "DKK" ? [shown.replace(" DKK", ""), `DKK${suffix ? " " + suffix : ""}`] : [shown, suffix];
}

/** The "worth X" figure in the visitor's currency, scaled from the DKK figure by the edition's own ladder. */
function worthIn(dkk: number, ed: Edition, currency: Currency): string {
  const minor = (dkk * 100 * ed.founder[currency]) / ed.founder.DKK;
  const step = currency === "DKK" ? 10000 : 1000;
  return formatMoney(Math.round(minor / step) * step, currency, { round: true });
}

/** Renders the price section in a currency; called again whenever the visitor changes country. */
export function renderOffer(offer: Offer, currency: Currency) {
  const ladder = LADDERS[ACTIVE_LADDER];
  const money = (minor: number) => formatMoney(minor, currency);
  const carts = $("#carts");
  carts.replaceChildren();
  for (const t of offer.tiers) {
    const ed = ladder.editions[t.id];
    const copy = t.copy[ladder.id];
    const card = el("article", t.star ? "cart star" : "cart");
    const label = el("div", "label");
    label.append(el("h3", null, t.name), el("span", "tag", copy.tag));
    const price = el("div", "price");
    price.append(el("span", "founder", "Founder price"), document.createElement("br"));
    const total = el("p", "total");
    const normal = el("s", null, money(ed.normal[currency]));
    normal.setAttribute("aria-label", `normally ${money(ed.normal[currency])}`);
    if (ladder.display === "perPersonFirst") {
      // Version A: the per-person figure is the big number, the total and "worth" sit under it.
      const [n, unit] = bigMoney(ed.founder[currency] / ed.people, currency, "per person");
      price.append(document.createTextNode(`${n} `), el("small", null, unit));
      total.append(document.createTextNode(`${money(ed.founder[currency])} for ${ed.people} friends `), normal);
      card.append(label, price, total, el("p", "worth", `Worth ${worthIn(ed.worthDkk, ed, currency)} as add-ons`));
    } else {
      // Version B: the total leads; Standard is a gift for two and is never split.
      const [n, unit] = bigMoney(ed.founder[currency], currency, "");
      price.append(document.createTextNode(`${n} `));
      if (unit) price.append(el("small", null, unit));
      price.append(normal);
      total.textContent = ed.people > 3 ? `≈ ${formatMoney(ed.founder[currency] / ed.people, currency, { round: true })} per friend` : "For two";
      card.append(label, price, total);
    }
    const ul = el("ul");
    copy.features.forEach(f => ul.append(el("li", null, f)));
    const foot = el("div", "foot");
    foot.append(orderLink(t.cta, t.id, t.star ? "btn" : "btn ghost"));
    card.append(ul, foot);
    carts.append(card);
  }
  const deluxe = ladder.editions.deluxe;
  const words = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  $("#perFriend").textContent = offer.perFriendNote[ladder.id]
    .replace("{people}", words[deluxe.people] ?? String(deluxe.people))
    .replace("{each} DKK", formatMoney(deluxe.founder[currency] / deluxe.people, currency, { round: true }));
  $("#founderNote").textContent = `Founder prices for the first ${FOUNDER_SPOTS} orders. The crossed-out price is the normal price after that. Prices in ${currency}, including VAT where it applies.`;
  const addons = offer.addons[ladder.id].filter((a): a is [AddonId, string, boolean] => a[0] in ADDONS);
  $("#addons").textContent = "Add-ons: " + addons.map(([id, label, from]) => `${label} ${from ? "from " : ""}${money(ADDONS[id].price[currency])}`).join(" · ");
}

/**
 * The occasion doors (plan 19). Each tile is a LINK into the order page's step 0 with the occasion preset,
 * so the page stays a page: the question "what's it for" is asked once, in the builder, not in two places.
 */
export function renderOccasions(occ: Occasions, offer: Offer) {
  const christmas = `Order a Deluxe game by ${offer.deadlines.find(([n]) => n === "Deluxe")?.[1] ?? "early November"} to have it for Christmas.`;
  const grid = $("#occ");
  grid.replaceChildren();
  for (const tile of occ.tiles) {
    const a = el("a", "occ-tile");
    a.href = `order.html?occasion=${encodeURIComponent(tile.id)}`;
    a.dataset.track = "occasion_tile";
    a.dataset.trackWhich = tile.id;
    const art = el("img", "occ-art") as HTMLImageElement;
    art.src = asset(occasionArt(tile.id));
    art.alt = "";
    art.loading = "lazy";
    art.width = 960;
    art.height = 640;
    art.addEventListener("error", () => art.remove());
    a.append(art, el("b", null, tile.title), el("span", null, tile.line || christmas));
    grid.append(a);
  }

  // The partner occasion's door (it has no tile above: one illustration, shown once), with its illustration beside it (public/assets/occ_partner.webp, tools/build_occasion_art.py).
  const card = $("#forTwo");
  card.replaceChildren();
  card.className = "fortwo";
  const art = el("img", "fortwo-art");
  (art as HTMLImageElement).src = asset(occ.forTwo.art);
  (art as HTMLImageElement).alt = "A couple walking out of their flat into their own town at sunset";
  (art as HTMLImageElement).loading = "lazy";
  art.addEventListener("error", () => art.remove());
  const text = el("div", "fortwo-text");
  text.append(el("p", "eyebrow", occ.forTwo.eyebrow), el("h3", null, occ.forTwo.title), el("p", null, occ.forTwo.line));
  const go = el("a", "btn ghost", occ.forTwo.cta);
  go.href = `order.html?occasion=${encodeURIComponent(occ.forTwo.id)}`;
  go.dataset.track = "fortwo_cta";
  text.append(go);
  card.append(art, text);
}

/** The rest of the page around the prices: deadlines and the two general order buttons. */
export function renderOrderCalls(offer: Offer) {
  const dl = offer.deadlines.map(([n, d]) => `${n} ${d}`).join(" · ");
  $("#deadlines").textContent = `Christmas order deadlines: ${dl}.`;
  $("#ctaButton").replaceWith(orderLink("Start your order ▶", "", "btn dark"));
  $("#navOrder").replaceWith(orderLink("Start your order", "", "btn"));
}

/** Every order button opens the order page; a price card also pre-selects its edition (plan 07 Q23). */
function orderLink(label: string, editionId: string, cls: string): HTMLElement {
  const a = el("a", cls, label);
  a.href = editionId ? `order.html?edition=${encodeURIComponent(editionId)}` : "order.html";
  return a;
}

export function renderFaq(faq: [string, string][]) {
  const box = $("#faqList");
  faq.forEach(([q, a], i) => {
    const d = el("details");
    if (i === 0) d.open = true;
    d.append(el("summary", null, q), el("p", null, a));
    box.append(d);
  });
}

export function renderPause() {
  document.querySelectorAll<HTMLButtonElement>("[data-pause]").forEach(b => b.addEventListener("click", () => {
    const scene = b.closest(".scene")!;
    const paused = scene.classList.toggle("paused");
    b.textContent = paused ? "▶" : "❚❚";
    b.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
  }));
}
