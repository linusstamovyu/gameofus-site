// Step 4, Review: the squad on a character-select row, the line items, the organiser's details and the one
// button that sends it: Pay (Stripe Checkout) or, with a custom item, Send request (plan 07 §10).
import { el } from "../../dom";
import { BIG_GAMES, MINIGAMES } from "../catalogue";
import { checkbox, heading, money, stepEyebrow, type StepView } from "../context";
import { problems, sectionContext, shareMessage, squadFriends, type Organiser } from "../draft";
import { tierPill } from "../../shared/tier";
import { SECTIONS } from "../sections";
import { track } from "../../shared/analytics";
import { perkDaysLeft } from "../perk";
import { createOrder, OrderError, submitOrder, toPayload, uploadPhotos } from "../api";
import { ADDONS, LADDERS, ACTIVE_LADDER } from "../prices";
import { faceCrop, type Box } from "../photoRules";
import { clearAll, loadPhoto } from "../storage";

export const reviewStep: StepView = (ctx, panel) => {
  const d = ctx.draft();
  const q = ctx.quote();
  const cur = ctx.currency();
  const name = (d.edition ?? "standard").replace(/^./, c => c.toUpperCase());
  panel.append(heading(stepEyebrow("review"), "Check it and send it", "Here's your game. Change anything by going back; nothing is sent until you press the button at the bottom."));

  // The squad, like a character-select screen.
  const squad = el("section", "review-squad");
  squad.append(el("h2", null, "Your squad"));
  const row = el("div", "select-row");
  for (const f of squadFriends(d)) {
    const tile = el("figure", "select-tile");
    // The face from the friend's one photo (the pixel preview is gone, owner 15 Sep 2026).
    if (f.photo) {
      const c = el("canvas", "select-face");
      c.width = c.height = 96;
      tile.append(c);
      void drawFaceTile(c, f.photo.key, f.photo.face);
    } else tile.append(el("span", "select-blank", "?"));
    tile.append(el("figcaption", null, f.name || "Unnamed"));
    row.append(tile);
  }
  squad.append(row);
  panel.append(squad);

  // What's in it.
  const games = el("section", "review-list");
  const edHead = el("h2", "review-edition");
  edHead.append(tierPill(d.edition ?? "standard", `${name} edition`));
  games.append(edHead);
  const picked = [
    ...d.bigGames.map(id => BIG_GAMES.find(g => g.id === id)?.name),
    ...(d.customGame.trim() ? ["Your own game (we'll quote it)"] : []),
  ].filter(Boolean) as string[];
  games.append(el("p", null, `Big games: ${picked.join(", ") || "none yet"}`));
  const minis = d.minigames.map(id => MINIGAMES.find(m => m.id === id)?.name).filter(Boolean);
  games.append(el("p", null, `Party minigames: ${minis.join(", ") || "none"}`));
  const sctx = sectionContext(d, cur);
  for (const s of SECTIONS) {
    const lines = s.summary(d.sections[s.id], sctx);
    if (!lines.length) continue;
    const block = el("div", "review-section");
    const edit = el("button", "link-btn", "Change");
    edit.type = "button";
    edit.onclick = () => ctx.go(s.id);
    const h = el("h3", null, s.label);
    h.append(" ", edit);
    const ul = el("ul");
    lines.forEach(l => ul.append(el("li", null, l)));
    block.append(h, ul);
    games.append(block);
  }
  panel.append(games);

  // The bill.
  const bill = el("section", "bill");
  bill.append(el("h2", null, "Your price"));
  const table = el("table");
  for (const line of q.lines) {
    const tr = el("tr");
    tr.append(el("td", null, line.qty > 1 ? `${line.label} × ${line.qty}` : line.label), el("td", "num", ADDONS[line.id as keyof typeof ADDONS]?.custom ? `from ${money(ctx, line.total)}` : money(ctx, line.total)));
    table.append(tr);
  }
  if (q.bonus > 0) {
    // What the beach tour bonus took off: shown so the saving is visible, never a charged line.
    const tr = el("tr", "bonus-row");
    const days = d.perkUnlockedAt !== null ? perkDaysLeft(d.perkUnlockedAt) : 0;
    tr.append(el("td", null, `Beach tour bonus (${days} day${days === 1 ? "" : "s"} left)`), el("td", "num", `−${money(ctx, q.bonus)}`));
    table.append(tr);
  }
  const totalRow = el("tr", "total-row");
  const totalCell = el("td", "num");
  totalCell.append(el("strong", null, money(ctx, q.total)));
  if (q.founder && q.normalTotal > q.total) totalCell.append(" ", el("s", null, money(ctx, q.normalTotal)));
  totalRow.append(el("td", null, q.founder ? "Total, founder price" : "Total"), totalCell);
  table.append(totalRow);
  bill.append(table);
  const worthDkk = LADDERS[ACTIVE_LADDER].editions[d.edition ?? "standard"].worthDkk;
  if (cur === "DKK") bill.append(el("p", "save", `Bought as separate add-ons, what's in your edition would cost about ${worthDkk.toLocaleString("en-US")} DKK.`));
  bill.append(checkbox(`Add a Flex Pass · ${money(ctx, ADDONS.flex_pass.price[cur])}: an extra round of changes, swap a photo or a friend before we start, and move your delivery date once.`, d.flexPass, v => ctx.update(dr => ({ ...dr, flexPass: v }))));
  const share = shareMessage(squadFriends(d).map(f => f.name.trim()), money(ctx, q.total), money(ctx, q.perFriend, true), name);
  const shareBox = el("div", "share");
  shareBox.append(el("b", null, "Splitting it? Send this to the group chat after you've paid:"), el("p", "share-text", share));
  const copy = el("button", "btn ghost small", "Copy message");
  copy.type = "button";
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(share);
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Select the text to copy it";
    }
  };
  shareBox.append(copy);
  if (squadFriends(d).length > 1) bill.append(shareBox);
  bill.append(el("p", "guarantee", "Love the preview or your money back: you'll see your characters within 5 days, and if you don't like them we refund you in full before we build the game."));
  panel.append(bill);

  // The organiser.
  const form = el("section", "organiser");
  form.append(el("h2", null, "Your details"));
  const field = (label: string, key: keyof Pick<Organiser, "name" | "email" | "birthYear">, type: string, extra: Partial<HTMLInputElement> = {}) => {
    const l = el("label", "field");
    const input = el("input");
    input.type = type;
    input.value = d.organiser[key];
    Object.assign(input, extra);
    input.addEventListener("input", () => ctx.update(dr => ({ ...dr, organiser: { ...dr.organiser, [key]: input.value } }), { rerender: false }));
    l.append(el("span", null, label), input);
    return l;
  };
  form.append(field("Your name", "name", "text", { autocomplete: "name", maxLength: 80 }));
  form.append(field("Email, for your receipt and the preview", "email", "email", { autocomplete: "email", maxLength: 200 }));
  if (d.partyMode) form.append(field("Your birth year (Party Mode is 18+)", "birthYear", "text", { inputMode: "numeric", maxLength: 4, placeholder: "1995" }));
  // The 18+ answer comes from the consent screen before step 1; it's changed there, not with a second checkbox.
  const ages = el("p", "consent-summary", d.consent.adults === "yes" ? "Everyone in your group is 18 or over."
    : d.consent.adults === "no" ? "Not everyone in your group is 18 or over, so Party Mode is off." : "You haven't told us whether everyone is 18 or over.");
  const changeAges = el("button", "link-btn", "Change");
  changeAges.type = "button";
  changeAges.onclick = () => ctx.openConsent();
  ages.append(" ", changeAges);
  form.append(ages);
  form.append(checkbox("Everyone in the photos has agreed to be in the game. They'll each get a consent form from us before we start.", d.organiser.photosPermission, v => ctx.update(dr => ({ ...dr, organiser: { ...dr.organiser, photosPermission: v } }), { rerender: false })));
  const terms = el("label", "check");
  const tbox = el("input");
  tbox.type = "checkbox";
  tbox.checked = d.organiser.startNow;
  tbox.addEventListener("change", () => ctx.update(dr => ({ ...dr, organiser: { ...dr.organiser, startNow: tbox.checked } }), { rerender: false }));
  const tlabel = el("span");
  const link = el("a", null, "terms of sale");
  link.href = "terms.html";
  link.target = "_blank";
  tlabel.append("I agree to the ", link, ". Start work straight away: I understand my right to cancel ends once production starts, and until then I can cancel for a full refund.");
  terms.append(tbox, tlabel);
  form.append(terms);
  panel.append(form);

  // Send.
  const send = el("section", "send");
  const list = el("ul", "problems");
  const status = el("p", "send-status");
  status.setAttribute("role", "status");
  const button = el("button", "btn big", q.isRequest ? "Send my request ▶" : `Pay ${money(ctx, q.total)} ▶`);
  button.type = "button";
  const methods = el("p", "methods", q.isRequest
    ? "Your order includes a custom game, so we'll reply with a quote and a payment link. Nothing is charged now."
    : "Card, Apple Pay, Google Pay, MobilePay or Klarna (pay in 3), on Stripe's secure checkout.");
  button.onclick = async () => {
    const found = problems(ctx.draft(), "review");
    list.replaceChildren(...found.map(p => el("li", null, p.message)));
    if (found.length) {
      list.hidden = false;
      list.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    list.hidden = true;
    button.disabled = true;
    track("checkout_start", { request: q.isRequest });
    try {
      const now = ctx.draft();
      const live = ctx.quote(now);
      status.textContent = "Sending your order…";
      const created = await createOrder(toPayload(now, cur, ctx.country(), live.total));
      if (created.priceChanged) {
        status.textContent = `The price changed while you were ordering (the founder spots may have run out). It's now ${money(ctx, created.total)}. Press the button again to continue.`;
        button.disabled = false;
        return;
      }
      await uploadPhotos(created.id, now, done => (status.textContent = `Uploading photos… ${Math.round(done * 100)}%`));
      const result = await submitOrder(created.id);
      if (result.kind === "checkout") {
        status.textContent = "Taking you to secure checkout…";
        location.assign(result.url);
      } else {
        await clearAll();
        location.assign(`order.html?done=request&id=${encodeURIComponent(created.id)}`);
      }
    } catch (err) {
      status.textContent = err instanceof OrderError ? err.message : "Something went wrong. Your order is saved on this device; please try again.";
      button.disabled = false;
    }
  };
  list.hidden = true;
  send.append(list, button, methods, status);
  panel.append(send);
};

async function drawFaceTile(c: HTMLCanvasElement, key: string, face: Box | null): Promise<void> {
  const blob = await loadPhoto(key);
  if (!blob) return;
  try {
    const img = await createImageBitmap(blob);
    const crop = faceCrop(img.width, img.height, face);
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, c.width, c.height);
    img.close();
  } catch {
    /* leave the tile blank */
  }
}
