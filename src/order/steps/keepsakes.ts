// Step 9, Keepsakes and delivery: the trailer, a printable gift card, rush delivery, the date it's wanted by, and
// the Flex Pass (a top-level draft field the Review step shows too, so the two stay in sync).
import "./keepsakes.css";
import { loopBox, slideshow } from "./loops";
import { el } from "../../dom";
import { orderAsset } from "../catalogue";
import { checkbox, heading, money, sectionHandle, stepEyebrow, type StepView } from "../context";
import { ACTIVE_LADDER, ADDONS } from "../prices";
import {
  MESSAGE_MAX, RECIPIENT_MAX, keepsakesSection, todayIso, wantedByStatus,
  type GiftCard, type KeepsakesChoices,
} from "../sections/keepsakes";

const DELIVERY_NOTE: Record<string, string> = {
  standard: "Standard is usually ready about 2 weeks after we have everything we need (photos and answers).",
  deluxe: "Deluxe is usually ready about 4 weeks after we have everything we need (photos and answers).",
  ultimate: "Ultimate is usually ready 6 to 10 weeks after we have everything we need (photos and answers).",
};

export const keepsakesStep: StepView = (ctx, panel) => {
  const h = sectionHandle<KeepsakesChoices>(ctx, "keepsakes");
  const c = h.choices();
  const cur = ctx.currency();
  const edition = ctx.draft().edition ?? "standard";
  const today = todayIso();

  panel.append(heading(stepEyebrow("keepsakes"), "Keepsakes and delivery",
    "The finishing touches: something to share, something to hand over on the day, and when you need it by."));

  // ---------- keepsakes ----------
  const keep = el("section", "shelf");
  const keepHead = el("div", "shelf-head");
  keepHead.append(el("h2", null, "Keepsakes"));
  keep.append(keepHead);
  const grid = el("div", "game-grid s-keepsakes-grid");
  grid.append(
    card("Trailer video", `A 60-second trailer of your game to share with the group · ${money(ctx, ADDONS.trailer.price[cur])}`, TRAILER, c.trailer,
      () => h.set({ ...h.choices(), trailer: !h.choices().trailer })),
    card("Printable gift card", `A PDF with a QR code to the game, to hand over on the day · ${money(ctx, ADDONS.gift_card.price[cur])}`, orderAsset("keep_giftcard.webp"), c.giftCard.on,
      () => { const now = h.choices(); h.set({ ...now, giftCard: { ...now.giftCard, on: !now.giftCard.on } }); }),
  );
  keep.append(grid);

  if (c.giftCard.on) {
    const box = el("div", "upsell s-keepsakes-gift");
    box.append(el("b", null, "Your gift card"));
    const setGift = (patch: Partial<GiftCard>) => { const now = h.choices(); h.set({ ...now, giftCard: { ...now.giftCard, ...patch } }, { rerender: false }); };

    const need = el("p", "s-keepsakes-warn", "Add who it's for, so we can put their name on the card.");
    need.setAttribute("role", "status");
    need.hidden = Boolean(c.giftCard.recipient.trim());

    const who = el("label", "field");
    const whoInput = el("input");
    whoInput.type = "text";
    whoInput.maxLength = RECIPIENT_MAX;
    whoInput.placeholder = "Sofie";
    whoInput.value = c.giftCard.recipient;
    whoInput.addEventListener("input", () => { setGift({ recipient: whoInput.value }); need.hidden = Boolean(whoInput.value.trim()); });
    who.append(el("span", null, "Who is it for?"), whoInput);

    const msg = el("label", "field");
    const msgInput = el("textarea", "s-keepsakes-textarea");
    msgInput.rows = 3;
    msgInput.maxLength = MESSAGE_MAX;
    msgInput.placeholder = "Happy birthday! Press start…";
    msgInput.value = c.giftCard.message;
    msgInput.addEventListener("input", () => setGift({ message: msgInput.value }));
    msg.append(el("span", null, "A message on the card (optional)"), msgInput);

    const when = el("label", "field");
    const whenInput = el("input");
    whenInput.type = "date";
    whenInput.min = today;
    whenInput.value = c.giftCard.giveOn;
    whenInput.addEventListener("change", () => setGift({ giveOn: whenInput.value }));
    when.append(el("span", null, "The day you'll give it (optional)"), whenInput);

    box.append(who, need, msg, when);
    keep.append(box);
  }
  panel.append(keep);

  // ---------- delivery ----------
  const delivery = el("section", "shelf");
  const delHead = el("div", "shelf-head");
  delHead.append(el("h2", null, "Delivery"));
  delivery.append(delHead);

  const current = ctx.quote();
  const rushCost = c.rush
    ? current.lines.find(l => l.id === "rush")?.total ?? 0
    : ctx.quote({ ...ctx.draft(), sections: { ...ctx.draft().sections, keepsakes: { ...c, rush: true } } }).total - current.total;
  delivery.append(checkbox(`Rush delivery · +50% of your order (${c.rush ? "" : "about "}+${money(ctx, rushCost)} right now): we move you to the front of the queue and roughly halve the wait.`,
    c.rush, v => h.set({ ...h.choices(), rush: v })));

  const date = el("label", "field s-keepsakes-date");
  const dateInput = el("input");
  dateInput.type = "date";
  dateInput.min = today;
  dateInput.value = c.wantedBy;
  date.append(el("span", null, "Need it by a certain date? (optional)"), dateInput);
  delivery.append(date);
  delivery.append(el("p", "rules", `${DELIVERY_NOTE[edition]} Rush roughly halves that.`));

  const warn = el("p", "s-keepsakes-warn");
  warn.setAttribute("role", "status");
  const showWarning = (wantedBy: string) => {
    const status = wantedByStatus(wantedBy, edition, today, h.choices().rush);
    warn.hidden = status === "" || status === "ok";
    warn.textContent = status === "rush"
      ? "That's sooner than we normally deliver. Rush delivery should get it to you in time."
      : status === "tight"
        ? "That's very soon, even with rush delivery. Send your order anyway and we'll tell you honestly what we can do."
        : "";
  };
  dateInput.addEventListener("change", () => { h.set({ ...h.choices(), wantedBy: dateInput.value }, { rerender: false }); showWarning(keepsakesSection.check(h.choices()).wantedBy); });
  showWarning(c.wantedBy);
  delivery.append(warn);
  panel.append(delivery);

  // ---------- peace of mind (top-level draft fields) ----------
  const peace = el("section", "shelf");
  const peaceHead = el("div", "shelf-head");
  peaceHead.append(el("h2", null, "Peace of mind"));
  peace.append(peaceHead);
  const d = ctx.draft();
  peace.append(checkbox(`Add a Flex Pass · ${money(ctx, ADDONS.flex_pass.price[cur])}: an extra round of changes, swap a photo or a friend before we start, and move your delivery date once.`,
    d.flexPass, v => ctx.update(dr => ({ ...dr, flexPass: v }))));
  if (ACTIVE_LADDER === "B") {
    peace.append(checkbox(`Director's Cut · ${money(ctx, ADDONS.directors_cut.price[cur])}: an evolution for every character, two more cutscenes, a second move each, voices for the whole cast and online multiplayer for a year.`,
      d.directorsCut, v => ctx.update(dr => ({ ...dr, directorsCut: v }))));
  }
  panel.append(peace);
};

const TRAILER = "loop:trailer";
const TRAILER_SCENE = () => slideshow("keepsakes-trailer",
  [["loop_story_cut_1.webp", 1.4], ["loop_story_plate_2.webp", 1.1], ["loop_story_cut_3.webp", 1.4], ["loop_story_boss_3.webp", 1.1], ["loop_story_cut_4.webp", 1.8]].map(([file, hold]) => ({ file: file as string, hold: hold as number })),
  "A trailer montage of scenes from the game", { fade: 0.35, push: true, trailer: true, w: 480, h: 180 });

function card(name: string, blurb: string, art: string, on: boolean, toggle: () => void): HTMLElement {
  const b = el("button", `game${on ? " on" : ""}`);
  b.type = "button";
  b.setAttribute("aria-pressed", String(on));
  // The trailer card plays a trailer-like montage of the game's own plates (./loops) rather than one still.
  const img = art === TRAILER ? loopBox(TRAILER_SCENE(), "art") : el("span", "art");
  if (art !== TRAILER) img.style.backgroundImage = `url(${art})`;
  const text = el("span", "game-text");
  text.append(el("b", null, name), el("span", null, blurb));
  b.append(img, text, el("span", "tick", on ? "✓" : "+"));
  b.onclick = toggle;
  return b;
}
