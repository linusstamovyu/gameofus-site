// Fills the page sections from src/content. The markup around them is static in index.html.
import type { Offer, SiteConfig, SquadMember } from "../content/types";
import { $, el, formatDkk, photoPair } from "../dom";
import { ACTIVE_LADDER, ADDONS, FOUNDER_SPOTS, LADDERS, formatMoney, type AddonId } from "../order/prices";

export function renderSquad(squad: SquadMember[]) {
  const roster = $("#roster");
  for (const m of squad) {
    const card = el("article", "lad");
    const pair = el("div", "pair");
    pair.append(photoPair(m.name, m.face, m.photo));
    const info = el("div", "info");
    const h = el("h3", null, m.name);
    h.append(el("span", `chip ${m.type}`, m.type));
    info.append(h, el("p", null, m.line), el("span", "move", `Signature move: ${m.move}`));
    card.append(pair, info);
    roster.append(card);
  }
}

export function renderOffer(offer: Offer, site: SiteConfig) {
  const ladder = LADDERS[ACTIVE_LADDER];
  const dkk = (minor: number) => formatMoney(minor, "DKK");
  const carts = $("#carts");
  for (const t of offer.tiers) {
    const ed = ladder.editions[t.id];
    const copy = t.copy[ladder.id];
    const card = el("article", t.star ? "cart star" : "cart");
    const label = el("div", "label");
    label.append(el("h3", null, t.name), el("span", "tag", copy.tag));
    const price = el("div", "price");
    price.append(el("span", "founder", "Founder price"), document.createElement("br"));
    const total = el("p", "total");
    const normal = el("s", null, dkk(ed.normal.DKK));
    normal.setAttribute("aria-label", `normally ${dkk(ed.normal.DKK)}`);
    if (ladder.display === "perPersonFirst") {
      // Version A: the per-person figure is the big number, the total and "worth" sit under it.
      price.append(document.createTextNode(`${formatDkk(Math.round(ed.founder.DKK / 100 / ed.people))} `), el("small", null, "DKK per person"));
      total.append(document.createTextNode(`${dkk(ed.founder.DKK)} for ${ed.people} friends `), normal);
      card.append(label, price, total, el("p", "worth", `Worth ${formatDkk(ed.worthDkk)} DKK as add-ons`));
    } else {
      // Version B: the total leads; Standard is a gift for two or three and is never split.
      price.append(document.createTextNode(`${formatDkk(ed.founder.DKK / 100)} `), el("small", null, "DKK"), normal);
      total.textContent = ed.people > 3 ? `≈ ${formatDkk(Math.round(ed.founder.DKK / 100 / ed.people))} DKK per friend` : "For two or three";
      card.append(label, price, total);
    }
    const ul = el("ul");
    copy.features.forEach(f => ul.append(el("li", null, f)));
    const foot = el("div", "foot");
    foot.append(orderButton(t.cta, t.id, site, t.star ? "btn" : "btn ghost"));
    card.append(ul, foot);
    carts.append(card);
  }
  const deluxe = ladder.editions.deluxe;
  const words = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  $("#perFriend").textContent = offer.perFriendNote[ladder.id]
    .replace("{people}", words[deluxe.people] ?? String(deluxe.people))
    .replace("{each}", formatDkk(Math.round(deluxe.founder.DKK / 100 / deluxe.people)));
  $("#founderNote").textContent = `Founder prices for the first ${FOUNDER_SPOTS} orders. The crossed-out price is the normal price after that.`;
  const addons = offer.addons[ladder.id].filter((a): a is [AddonId, string, boolean] => a[0] in ADDONS);
  $("#addons").textContent = "Add-ons: " + addons.map(([id, label, from]) => `${label} ${from ? "from " : ""}${dkk(ADDONS[id].price.DKK)}`).join(" · ");
  const dl = offer.deadlines.map(([n, d]) => `${n} ${d}`).join(" · ");
  $("#deadlines").textContent = `Christmas order deadlines: ${dl}.`;
  $("#occChristmas").textContent = `Order a Deluxe game by ${offer.deadlines.find(([n]) => n === "Deluxe")?.[1] ?? "early November"} to have it for Christmas.`;
  $("#ctaButton").replaceWith(orderButton("Start your order ▶", "", site, "btn dark"));
  $("#navOrder").replaceWith(orderButton("Start your order", "", site, "btn"));
}

/**
 * An order button. With no order form configured yet it scrolls to prices and
 * says ordering opens soon, rather than linking to nowhere.
 */
function orderButton(label: string, tierId: string, site: SiteConfig, cls: string): HTMLElement {
  if (site.orderFormUrl) {
    const a = el("a", cls, label);
    const url = new URL(site.orderFormUrl);
    if (tierId) url.searchParams.set("package", tierId);
    a.href = url.toString(); a.target = "_blank"; a.rel = "noopener";
    return a;
  }
  const b = el("button", cls, label);
  b.type = "button";
  b.addEventListener("click", () => {
    document.getElementById("prices")?.scrollIntoView({ behavior: "smooth" });
    const note = $("#orderSoon");
    note.hidden = false;
  });
  return b;
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
