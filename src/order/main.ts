// The order page (plan 07, launch slice of plan 17): four steps over one saved draft, a running total, and a
// thank-you screen after Stripe or a sent request. Steps live in steps/*.ts; rules in draft.ts and prices.ts.
import "../styles.css";
import "./order.css";
import siteData from "../content/site.json";
import type { SiteConfig } from "../content/types";
import { $, el } from "../dom";
import { currentCountry, currentCurrency, initCountryPicker, onCountryChange } from "../shared/countryPicker";
import { shopStatus } from "./api";
import { money, type Ctx, type StepView } from "./context";
import { blockingProblems, withPerk, chooseEdition, DEFERRED_STEPS, needsConsent, prefillSquad, problems, setOccasion, squadFriends, STEPS, toPicks, type Draft, type StepId } from "./draft";
import { OCCASION_IDS, type OccasionId } from "./occasions";
import { loadPerk } from "../shared/tourProgress";
import { applyFavourites, favouriteCount, loadFavourites } from "../explore/favourites";
import { track, trackClicks } from "../shared/analytics";
import { tierPill } from "./tier";
import { EDITION_IDS, FOUNDER_SPOTS, quote, type EditionId } from "./prices";
import { clearAll, loadDraft, saveDraft } from "./storage";
import { consentView } from "./steps/consent";
import { editionStep } from "./steps/edition";
import { gamesStep } from "./steps/games";
import { reviewStep } from "./steps/review";
import { purposeStep } from "./steps/purpose";
import { squadStep } from "./steps/squad";
import { extrasStep } from "./steps/extras";
import { keepsakesStep } from "./steps/keepsakes";
import { phoneStep } from "./steps/phone";
import { storyStep } from "./steps/story";
import { vehiclesStep } from "./steps/vehicles";
import { worldStep } from "./steps/world";

const site = siteData as SiteConfig;
const VIEWS: Record<StepId, StepView> = {
  purpose: purposeStep, squad: squadStep, edition: editionStep, games: gamesStep,
  world: worldStep, vehicles: vehiclesStep, phone: phoneStep, story: storyStep, extras: extrasStep, keepsakes: keepsakesStep,
  review: reviewStep,
};

let draft: Draft;
let paid = 0;
let spotsLeft: number | null = null;
let open = false;
let cleanup: (() => void) | void;
let saveTimer = 0;
/** The consent screen is up (first visit, or reopened from Review). */
let consenting = false;

const ctx: Ctx = {
  draft: () => draft,
  update(fn, opts = {}) {
    draft = fn(draft);
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void saveDraft(draft), 250);
    if (opts.rerender === false) {
      // Typing can finish a step, so the stepper's locks follow it; the panel is left alone to keep focus.
      renderStepper();
      renderBar();
    }
    else render();
  },
  currency: currentCurrency,
  country: currentCountry,
  quote: (d = draft) => quote(toPicks(d), currentCurrency(), paid),
  paidOrders: () => paid,
  founderSpotsLeft: () => spotsLeft,
  shopOpen: () => open,
  go(step) {
    consenting = false;
    draft = { ...draft, step };
    void saveDraft(draft);
    track("builder_step", { step });
    if (step === "review") track("review_reached");
    render();
    $("#order").scrollIntoView({ behavior: "smooth", block: "start" });
    ($("#panel").querySelector("h1") as HTMLElement | null)?.focus();
  },
  openConsent() {
    consenting = true;
    render();
    $("#order").scrollIntoView({ behavior: "smooth", block: "start" });
    ($("#panel").querySelector("h1") as HTMLElement | null)?.focus();
  },
  notify(message, tone = "info") {
    const n = $("#notice");
    n.textContent = message;
    n.className = `order-notice ${tone}`;
    n.hidden = false;
    clearTimeout(Number(n.dataset.timer));
    n.dataset.timer = String(window.setTimeout(() => (n.hidden = true), 7000));
  },
};

function stepIndex(id: StepId) {
  return STEPS.findIndex(s => s.id === id);
}

function renderStepper() {
  const ol = $("#stepper");
  ol.hidden = consenting;
  ol.replaceChildren();
  const current = stepIndex(draft.step);
  STEPS.forEach((s, i) => {
    const li = el("li", i === current ? "on" : i < current ? "done" : null);
    const b = el("button", null);
    b.type = "button";
    b.append(el("span", "n", String(i + 1)), el("span", "l", s.label));
    if (i === current) b.setAttribute("aria-current", "step");
    // You can always go back; going forward past an unfinished step is what Next is for.
    // The squad's photos don't lock later steps (plan 18 §3); Review still checks them.
    b.disabled = i > current && STEPS.slice(0, i).some(p => blockingProblems(draft, p.id).length > 0);
    b.onclick = () => ctx.go(s.id);
    li.append(b);
    ol.append(li);
  });
}

function renderBar() {
  $("#bar").hidden = consenting;
  const q = ctx.quote();
  const box = $("#barTotal");
  box.replaceChildren();
  if (!draft.friends.length) {
    box.append(el("span", "bar-label", "Add your squad to see your price"));
  } else {
    const main = el("span", "bar-main");
    if (draft.edition) main.append(tierPill(draft.edition), " ");
    main.append(el("strong", null, q.isRequest ? `from ${money(ctx, q.total)}` : money(ctx, q.total)));
    if (q.founder && q.normalTotal > q.total) main.append(" ", el("s", null, money(ctx, q.normalTotal)));
    box.append(main, el("span", "bar-label", `${squadFriends(draft).length > 1 ? `≈ ${money(ctx, q.perFriend, true)} per friend · ` : ""}${q.founder ? "founder price" : "normal price"}${q.bonus > 0 ? ` · beach bonus −${money(ctx, q.bonus)}` : ""}`));
  }
  const i = stepIndex(draft.step);
  $<HTMLButtonElement>("#back").hidden = i === 0;
  const next = $<HTMLButtonElement>("#next");
  next.hidden = draft.step === "review";
  next.textContent = i === STEPS.length - 2 ? "Review ▶" : "Next ▶";
}

function render() {
  if (typeof cleanup === "function") cleanup();
  const panel = $("#panel");
  panel.replaceChildren();
  if (consenting) {
    // Before step 1 (and when reopened from Review): no stepper or price bar until it's answered.
    cleanup = consentView(ctx, panel, () => ctx.go(draft.step));
  } else cleanup = VIEWS[draft.step](ctx, panel);
  const h1 = panel.querySelector("h1");
  if (h1) h1.tabIndex = -1;
  renderStepper();
  renderBar();
}

function doneScreen(kind: string, id: string) {
  $("#stepper").hidden = true;
  $("#bar").hidden = true;
  const panel = $("#panel");
  const paidNow = kind === "paid";
  panel.replaceChildren(
    el("p", "eyebrow", paidNow ? "Payment received" : "Request sent"),
    el("h1", null, paidNow ? "Your game is on its way" : "We've got your request"),
    el("p", "lede", paidNow
      ? "Thank you! We've emailed your receipt. Next, each friend in the game gets a short consent form from us, and you'll see your characters within 5 days of us having everything."
      : "Thank you! Your order includes a custom game, so we'll reply by email with a quote and a payment link, usually within two days."),
    el("p", "order-ref", `Order reference: ${id.slice(0, 8).toUpperCase()}`),
  );
  const home = el("a", "btn", "Back to the beach");
  home.href = "./";
  panel.append(home);
}

async function start() {
  document.querySelectorAll<HTMLElement>("[data-draft]").forEach(n => (n.hidden = !site.isDraft));
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
  const params = new URLSearchParams(location.search);

  const done = params.get("done");
  if (done === "paid" || done === "request") {
    void initCountryPicker();
    if (done === "paid") await clearAll();
    doneScreen(done, params.get("id") ?? "");
    return;
  }

  // A fresh (or old, empty) draft opens with the default edition's slots ready (steps/squad.ts).
  draft = prefillSquad(await loadDraft());
  const wanted = params.get("edition") as EditionId | null;
  if (wanted && EDITION_IDS.includes(wanted)) draft = chooseEdition(draft, wanted);
  // From a home page occasion tile (plan 19): the door presets the order and opens on step 0, where the
  // visitor can see what it set and change it. An edition named in the URL still wins, since that came
  // from a price card the visitor actually read.
  const wantedOccasion = params.get("occasion") as OccasionId | null;
  if (wantedOccasion && OCCASION_IDS.includes(wantedOccasion)) {
    draft = { ...setOccasion(draft, wantedOccasion), step: "purpose" };
    track("builder_from_occasion", { occasion: wantedOccasion });
  }
  // A bonus unlocked on the beach tour on this device (plan 18 phase 2) rides along with the order.
  draft = withPerk(draft, loadPerk());
  // From Explore (plan 18 §2): favourites arrive ticked, and "Add these" opens the step they belong to.
  const fromExplore = params.get("from") === "explore";
  const wantedStep = params.get("step") as StepId | null;
  if (params.get("from") === "beach") track("builder_from_beach", { step: wantedStep ?? "", bonus: draft.perkUnlockedAt !== null });
  if (fromExplore) {
    const favs = loadFavourites();
    draft = applyFavourites(draft, favs);
    track("builder_from_explore", { favourites: favouriteCount(favs), step: wantedStep ?? "" });
  }
  if (wantedStep && STEPS.some(s => s.id === wantedStep) && wantedStep !== "review") draft = { ...draft, step: wantedStep };
  if (params.get("cancelled")) draft = { ...draft, step: "review" };
  // Applied once: a reload shouldn't keep overriding a later choice.
  if (wanted || wantedOccasion || fromExplore || params.get("from") || wantedStep || params.get("cancelled")) history.replaceState(null, "", location.pathname);
  consenting = needsConsent(draft);
  $("#back").onclick = () => ctx.go(STEPS[Math.max(0, stepIndex(draft.step) - 1)].id);
  $("#next").onclick = () => {
    const found = blockingProblems(draft, draft.step);
    if (DEFERRED_STEPS.has(draft.step) && problems(draft, draft.step).length) {
      ctx.notify("No rush on the photos: carry on picking, and finish your squad before you pay.");
    }
    if (found.length) {
      ctx.notify(found[0].message + (found.length > 1 ? ` (and ${found.length - 1} more)` : ""), "error");
      return;
    }
    ctx.go(STEPS[Math.min(STEPS.length - 1, stepIndex(draft.step) + 1)].id);
  };
  onCountryChange(() => render());
  trackClicks();
  render();
  if (params.get("cancelled")) ctx.notify("Checkout was cancelled. Nothing was charged; your order is still here.");
  void initCountryPicker();
  const status = await shopStatus();
  open = status.open;
  if (status.paidOrders !== null) {
    paid = status.paidOrders;
    spotsLeft = Math.max(0, FOUNDER_SPOTS - paid);
  }
  if (!open) ctx.notify("Ordering opens on 4 October. You can build your order now; it's saved on this device.");
  render();
}

void start();
