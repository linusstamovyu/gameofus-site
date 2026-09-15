// Fills the page sections from src/content. The markup around them is static in index.html.
import type { Offer, SiteConfig, SquadMember } from "../content/types";
import { $, el, formatDkk, photoPair } from "../dom";

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
  const carts = $("#carts");
  for (const t of offer.tiers) {
    const card = el("article", t.star ? "cart star" : "cart");
    const label = el("div", "label");
    label.append(el("h3", null, t.name), el("span", "tag", t.tag));
    const each = Math.round(t.founderDkk / t.people);
    const price = el("div", "price");
    price.append(el("span", "founder", "Founder price"), document.createElement("br"));
    price.append(document.createTextNode(`${formatDkk(each)} `), el("small", null, "DKK per person"));
    const total = el("p", "total");
    total.append(document.createTextNode(`${formatDkk(t.founderDkk)} DKK for ${t.people} friends `), el("s", null, `${formatDkk(t.normalDkk)} DKK`));
    const worth = el("p", "worth", `Worth ${formatDkk(t.worthDkk)} DKK as add-ons`);
    const ul = el("ul");
    t.features.forEach(f => ul.append(el("li", null, f)));
    const foot = el("div", "foot");
    foot.append(orderButton(t.cta, t.id, site, t.star ? "btn" : "btn ghost"));
    card.append(label, price, total, worth, ul, foot);
    carts.append(card);
  }
  $("#perFriend").textContent = offer.perFriendNote;
  $("#founderNote").textContent = `Founder prices for the first ${offer.founderSpots} orders. The crossed-out price is the normal price after that.`;
  $("#addons").textContent = "Add-ons: " + offer.addons.map(([n, p]) => `${n} ${p}`).join(" · ");
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
