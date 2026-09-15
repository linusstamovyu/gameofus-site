// Before step 1: the consent screen (owner, 2026-09-15). A gate in front of the stepper rather than a numbered
// step, because it isn't part of building the game: it's asked once, stays answered on this device, and can be
// changed later from Review. Wording follows privacy.html; the rules live in draft.ts.
import "./consent.css";
import { el } from "../../dom";
import { checkbox, heading, money, type Ctx } from "../context";
import { completeConsent, consentProblems, setAdults, setPhotosPermission } from "../draft";
import { ADDONS } from "../prices";

export function consentView(ctx: Ctx, panel: HTMLElement, onDone: () => void): void {
  const d = ctx.draft();
  panel.append(heading("Before you start", "A couple of things first",
    "Your game is made from photos of your friends, so we need to know they're happy with that, and whether your group is old enough for Party Mode."));

  const photos = el("section", "consent-card");
  photos.append(el("h2", null, "Photos of your friends"));
  const list = el("ul", "consent-list");
  for (const line of [
    "You'll add one photo of each friend: just them, face clear, head to feet. It stays on this device until you press Pay or Send.",
    "The photo check (one clear face, head to feet) runs in your browser; the photos aren't sent anywhere for it.",
    "After you order, each friend in the game gets a consent form from us before we start.",
    "We don't make games with photos of anyone under 18.",
  ]) list.append(el("li", null, line));
  photos.append(list);
  const perm = checkbox("Everyone in the photos has agreed to be in the game.", d.organiser.photosPermission, v => ctx.update(dr => setPhotosPermission(dr, v), { rerender: false }));
  const read = el("p", "consent-links");
  const privacy = el("a", null, "privacy policy");
  privacy.href = "privacy.html";
  privacy.target = "_blank";
  const terms = el("a", null, "terms of sale");
  terms.href = "terms.html";
  terms.target = "_blank";
  read.append("How we handle the photos and how long we keep them is in our ", privacy, ". The ", terms, " apply when you order.");
  photos.append(perm, read);
  panel.append(photos);

  const age = el("section", "consent-card");
  age.append(el("h2", null, "Is everyone in your group 18 or over?"));
  const price = money(ctx, ADDONS.party_mode.price[ctx.currency()]);
  age.append(el("p", null, `This decides whether Party Mode (18+, ${price}) and its drinking minigames can be added.`));
  const choices = el("div", "consent-choices");
  choices.setAttribute("role", "radiogroup");
  choices.setAttribute("aria-label", "Is everyone in your group 18 or over?");
  for (const [value, label] of [["yes", "Yes, everyone is 18+"], ["no", "No, not everyone"]] as const) {
    const b = el("button", `consent-choice${d.consent.adults === value ? " on" : ""}`, label);
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(d.consent.adults === value));
    b.onclick = () => ctx.update(dr => setAdults(dr, value));
    choices.append(b);
  }
  age.append(choices);
  if (d.consent.adults === "yes") {
    // Yes only unlocks Party Mode; it is never ticked for the customer (paid add-on, no pre-ticked boxes).
    age.append(el("p", "consent-note", d.partyMode
      ? `Party Mode (18+) is on (${price}), so King's Cup and The Bus are unlocked. You can untick it on the Games step.`
      : `Party Mode (18+) is now unlocked, but not added. If you want it (${price}), tick it on the Games step; the drinking minigames unlock with it.`));
  } else if (d.consent.adults === "no") {
    age.append(el("p", "consent-note", "No problem: every game works without Party Mode. The drinking minigames stay greyed out and Party Mode can't be added."));
  }
  panel.append(age);

  const foot = el("div", "consent-foot");
  const list2 = el("ul", "problems");
  list2.hidden = true;
  const go = el("button", "btn big", d.consent.answeredAt ? "Save and go back ▶" : "Start building ▶");
  go.type = "button";
  go.onclick = () => {
    const found = consentProblems(ctx.draft());
    list2.replaceChildren(...found.map(m => el("li", null, m)));
    list2.hidden = !found.length;
    if (found.length) return;
    ctx.update(dr => completeConsent(dr), { rerender: false });
    onDone();
  };
  foot.append(list2, go);
  panel.append(foot);
}
