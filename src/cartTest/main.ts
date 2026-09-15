// The cart test (cart-test.html): five carts, each built for real by the tester, half of them starting empty
// and half starting full, then a vote. Nothing here is a mock-up: the shelf, the prices and the allowances are
// the order page's own. Responses go to /api/cart-test (worker/cartTest.ts) and are anonymous.
import "../styles.css";
import "../order/order.css";
import "./cartTest.css";
import { $, el } from "../dom";
import { TIER_LOOK } from "../order/tier";
import { renderCart, VARIANT_NAMES, type CartHandlers } from "./variants";
import {
  FRIENDS, TEST_BIG_GAMES, TEST_MINIGAMES, has, money, quoteOf, sections, startCart, toggle, totalOver,
  type Cart, type Mode, type SectionId, type VariantId,
} from "./state";
import type { EditionId } from "../order/prices";

const VARIANTS: VariantId[] = ["B", "C", "R7", "D", "E"];
/** E is the one drawn for trimming, so it always starts full; the other four are split two and two. */
const ALWAYS_TRIM: VariantId[] = ["E"];

interface Rating { clear: number; pressure: number; buy: number }
interface TaskResult {
  variant: VariantId; mode: Mode; position: number; seconds: number;
  adds: number; removes: number; editionChanges: number;
  edition: EditionId; friends: number; bigGames: number; minigames: number;
  extras: number; total: number; ratings: Rating;
}

const shuffle = <T,>(list: T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Each tester sees every cart once, in a random order, with the modes balanced across the four. */
function plan(): { variant: VariantId; mode: Mode }[] {
  const flexible = shuffle(VARIANTS.filter(v => !ALWAYS_TRIM.includes(v)));
  const modes = shuffle<Mode>(["add", "add", "trim", "trim"]);
  const tasks = flexible.map((variant, i) => ({ variant, mode: modes[i] }));
  tasks.push(...ALWAYS_TRIM.map(variant => ({ variant, mode: "trim" as Mode })));
  return shuffle(tasks);
}

const tasks = plan();
const results: TaskResult[] = [];
let step = 0;
let cart: Cart = startCart(tasks[0].mode);
let adds = 0, removes = 0, editionChanges = 0, startedAt = Date.now();

const app = () => $("#app");

function shelfCard(section: SectionId, id: string, name: string, art: string, blurb: string, kind: "friend" | "game" | "mini"): HTMLElement {
  const on = has(cart, section, id);
  const b = el("button", `pickable ${kind}${on ? " on" : ""}`);
  b.type = "button";
  b.setAttribute("aria-pressed", String(on));
  const img = el("span", "art");
  img.style.backgroundImage = `url(${art})`;
  b.append(img);
  const text = el("span", "txt");
  text.append(el("b", null, name));
  if (blurb) text.append(el("span", null, blurb));
  b.append(text, el("span", "tick", on ? "✓" : "+"));
  b.onclick = () => {
    const next = toggle(cart, section, id);
    if (next.action === "none") return;
    if (next.action === "add") adds++; else removes++;
    cart = next.cart;
    draw();
  };
  return b;
}

function shelf(): HTMLElement {
  const wrap = el("div", "shelf-col");
  const s = sections(cart);
  const head = (id: SectionId, title: string, note: string) => {
    const h = el("div", "shelf-head");
    h.append(el("h2", null, title));
    const state = s.find(x => x.id === id)!;
    h.append(el("span", "chip-inv" + (state.over ? " over" : ""), `${state.picked.length} of ${state.included} included${state.over ? ` · ${state.over} extra` : ""}`));
    const sec = el("section", "shelf");
    sec.id = `sec-${id}`;
    sec.append(h);
    if (note) sec.append(el("p", "rules", note));
    return sec;
  };

  const people = head("friends", "Who's in the game?", "Each friend becomes a playable character drawn from their photo.");
  const grid1 = el("div", "grid friends");
  for (const f of FRIENDS) grid1.append(shelfCard("friends", f.id, f.name, `assets/${f.face}`, "", "friend"));
  people.append(grid1);

  const big = head("bigGames", "Big games", "The set pieces a chapter is built around.");
  const grid2 = el("div", "grid games");
  for (const g of TEST_BIG_GAMES) grid2.append(shelfCard("bigGames", g.id, g.name, `order-assets/${g.art}`, g.blurb, "game"));
  big.append(grid2);

  const mini = head("minigames", "Party minigames", "Quick games you play together.");
  const grid3 = el("div", "grid minis");
  for (const g of TEST_MINIGAMES) grid3.append(shelfCard("minigames", g.id, g.name, `order-assets/${g.art}`, "", "mini"));
  mini.append(grid3);

  wrap.append(people, big, mini);
  return wrap;
}

const handlers: CartHandlers = {
  remove(section, id) {
    const next = toggle(cart, section, id);
    if (next.action === "none") return;
    removes++;
    cart = next.cart;
    draw();
  },
  setEdition(edition) {
    if (edition === cart.edition) return;
    editionChanges++;
    cart = { ...cart, edition };
    draw();
  },
  focus(section) {
    document.getElementById(`sec-${section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  },
};

function progress(): HTMLElement {
  const row = el("div", "prog");
  row.append(el("span", "lbl", `Cart ${step + 1} of ${tasks.length}`));
  const bar = el("div", "bar");
  for (let i = 0; i < tasks.length; i++) bar.append(el("i", i < step ? "on" : i === step ? "now" : ""));
  row.append(bar);
  return row;
}

function draw() {
  const { mode } = tasks[step];
  const panel = app();
  panel.replaceChildren();
  panel.append(progress());
  const brief = el("div", "brief");
  brief.append(el("h1", null, mode === "add" ? "Build the game you'd actually buy" : "Here's a game we've put together for you"));
  brief.append(el("p", null, mode === "add"
    ? "Add the friends and games you want. The panel on the right keeps the price. When it looks like the game you'd buy, carry on."
    : "It's filled in already. Take out anything you don't want, add anything missing, then carry on when it looks like the game you'd buy."));
  panel.append(brief);

  const cols = el("div", "cols");
  cols.append(shelf());
  const rail = el("div", "rail");
  rail.append(renderCart(tasks[step].variant, cart, handlers));
  const next = el("button", "btn big next");
  next.type = "button";
  next.textContent = "This is my game ▶";
  next.onclick = askRatings;
  rail.append(next);
  cols.append(rail);
  panel.append(cols);
}

function scale(name: string, label: string, low: string, high: string): HTMLElement {
  const box = el("div", "scale");
  box.append(el("p", null, label));
  const row = el("div", "row");
  row.append(el("small", null, low));
  for (let n = 1; n <= 5; n++) {
    const id = `${name}-${n}`;
    const input = el("input");
    input.type = "radio";
    input.name = name;
    input.id = id;
    input.value = String(n);
    const lab = el("label", null, String(n));
    lab.htmlFor = id;
    row.append(input, lab);
  }
  row.append(el("small", null, high));
  box.append(row);
  return box;
}

const picked = (name: string) => Number((document.querySelector(`input[name="${name}"]:checked`) as HTMLInputElement | null)?.value ?? 0);

function askRatings() {
  const panel = app();
  panel.replaceChildren();
  panel.append(progress());
  const q = quoteOf(cart);
  const head = el("div", "brief");
  head.append(el("h1", null, "Three quick questions about that cart"));
  head.append(el("p", null, `You built a ${TIER_LOOK[cart.edition].name} game at ${money(q.total)}. There are no wrong answers.`));
  panel.append(head);
  const form = el("form", "qs");
  form.append(scale("clear", "How clearly did the panel show what you were getting and what it cost?", "not at all", "completely"));
  form.append(scale("pressure", "How pushy did it feel?", "not at all", "very pushy"));
  form.append(scale("buy", "How likely would you be to buy the game you just built?", "not at all", "very likely"));
  const err = el("p", "err");
  const go = el("button", "btn big");
  go.type = "submit";
  go.textContent = step === tasks.length - 1 ? "Finish ▶" : "Next cart ▶";
  form.append(err, go);
  form.onsubmit = e => {
    e.preventDefault();
    const ratings = { clear: picked("clear"), pressure: picked("pressure"), buy: picked("buy") };
    if (!ratings.clear || !ratings.pressure || !ratings.buy) {
      err.textContent = "Answer all three, then carry on.";
      return;
    }
    const s = sections(cart);
    results.push({
      variant: tasks[step].variant, mode: tasks[step].mode, position: step + 1,
      seconds: Math.round((Date.now() - startedAt) / 1000),
      adds, removes, editionChanges,
      edition: cart.edition,
      friends: s[0].picked.length, bigGames: s[1].picked.length, minigames: s[2].picked.length,
      extras: totalOver(cart), total: quoteOf(cart).total, ratings,
    });
    step++;
    if (step >= tasks.length) return finish();
    cart = startCart(tasks[step].mode);
    adds = 0; removes = 0; editionChanges = 0; startedAt = Date.now();
    draw();
    scrollTo({ top: 0, behavior: "smooth" });
  };
  panel.append(form);
  scrollTo({ top: 0, behavior: "smooth" });
}

function finish() {
  const panel = app();
  panel.replaceChildren();
  const head = el("div", "brief");
  head.append(el("h1", null, "Last bit: which one would you want?"));
  head.append(el("p", null, "You saw five ways of showing the same order, in the order below."));
  panel.append(head);

  const form = el("form", "qs");
  const pickBox = el("div", "scale");
  pickBox.append(el("p", null, "Which panel would you want when buying this for real?"));
  const list = el("div", "favs");
  results.forEach((r, i) => {
    const id = `fav-${r.variant}`;
    const input = el("input");
    input.type = "radio";
    input.name = "fav";
    input.id = id;
    input.value = r.variant;
    const lab = el("label", "fav", "");
    lab.htmlFor = id;
    lab.append(el("b", null, `${i + 1}. ${VARIANT_NAMES[r.variant]}`));
    lab.append(el("span", null, `${r.mode === "add" ? "started empty" : "started filled in"} · you built ${money(r.total)}`));
    list.append(input, lab);
  });
  pickBox.append(list);
  form.append(pickBox);
  form.append(scale("startpref", "Which way of starting did you prefer?", "starting empty", "starting filled in"));

  const why = el("div", "field");
  const whyLab = el("label", null, "Anything you noticed? (optional)");
  whyLab.htmlFor = "why";
  const whyBox = el("textarea");
  whyBox.id = "why";
  whyBox.maxLength = 600;
  whyBox.placeholder = "For example: the second one made it obvious I was paying extra.";
  why.append(whyLab, whyBox);
  const nameField = el("div", "field");
  const nameLab = el("label", null, "Your name (optional)");
  nameLab.htmlFor = "who";
  const nameBox = el("input");
  nameBox.id = "who";
  nameBox.maxLength = 80;
  nameField.append(nameLab, nameBox);
  form.append(why, nameField);

  const err = el("p", "err");
  const go = el("button", "btn big");
  go.type = "submit";
  go.textContent = "Send my answers";
  form.append(err, go);
  form.onsubmit = async e => {
    e.preventDefault();
    const fav = (document.querySelector('input[name="fav"]:checked') as HTMLInputElement | null)?.value;
    if (!fav) { err.textContent = "Pick the one you'd want, then send."; return; }
    go.disabled = true;
    err.textContent = "Sending…";
    const body = {
      tasks: results, favourite: fav, startPreference: picked("startpref"),
      comment: whyBox.value.trim(), name: nameBox.value.trim(),
      screen: `${window.innerWidth}x${window.innerHeight}`,
    };
    try {
      const res = await fetch("/api/cart-test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      // Running the page without the Worker (a plain `vite` dev server) answers with the HTML page, so a
      // failed parse means "there's no API here", not "your answers were rejected".
      const data = await res.json().catch(() => ({ message: "The answer collector isn't running here." })) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Could not save your answers.");
      thanks();
    } catch (error) {
      err.textContent = `${error instanceof Error ? error.message : "Could not save your answers."} You can send them as a file instead.`;
      err.append(downloadLink(body));
      go.disabled = false;
    }
  };
  panel.append(form);
  scrollTo({ top: 0, behavior: "smooth" });
}

/** Last resort: hand the tester their own answers so a run at a table with no wifi isn't wasted. */
function downloadLink(body: unknown): HTMLAnchorElement {
  const a = el("a", "dl", "Download my answers");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }));
  a.download = `cart-test-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  return a;
}

function thanks() {
  const panel = app();
  panel.replaceChildren();
  const box = el("div", "brief done");
  box.append(el("h1", null, "That's it — thank you"));
  box.append(el("p", null, "Your answers are saved. Nothing you built here is an order, and no email or payment details were asked for."));
  const home = el("a", "btn", "Back to the site");
  home.href = "./";
  box.append(home);
  panel.append(box);
  scrollTo({ top: 0, behavior: "smooth" });
}

function intro() {
  const panel = app();
  panel.replaceChildren();
  const box = el("div", "brief intro");
  box.append(el("h1", null, "Help us pick how the order page should look"));
  box.append(el("p", null, "You'll build a custom game five times, each with a different panel showing your order. It takes about five minutes. Some start empty, some start already filled in."));
  const list = el("ul", "plain");
  list.append(el("li", null, "Nothing here is a real order — no payment, no email, nothing to install."));
  list.append(el("li", null, "Answers are anonymous unless you type your name at the end."));
  list.append(el("li", null, "Prices are the real ones from the shop, in euros."));
  box.append(list);
  const go = el("button", "btn big");
  go.type = "button";
  go.textContent = "Start ▶";
  go.onclick = () => { startedAt = Date.now(); draw(); };
  box.append(go);
  panel.append(box);
}

intro();
