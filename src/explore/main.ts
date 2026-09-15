// The Explore page (plan 18 §1-2): every part of the catalogue, browsable with no photos, with favourites that
// arrive already picked in the builder. Data is ./catalog.ts; this file only draws it.
import "../styles.css";
import "./explore.css";
import siteData from "../content/site.json";
import type { SiteConfig } from "../content/types";
import { el } from "../dom";
import { loopPreview } from "../order/preview/loop";
import { GAME_SCENES } from "../order/preview/gameScenes";
import { catchScene, evolutionScene, moveScene, talkScene } from "../order/steps/extrasScenes";
import { carScene, loopBox, slideshow, type Scene } from "../order/steps/loops";
import { initCountryPicker } from "../shared/countryPicker";
import { track, trackClicks } from "../shared/analytics";
import { EXPLORE_TABS, type ExploreCard, type ExploreTab } from "./catalog";
import { favouriteCount, loadFavourites, saveFavourites, toggleFavourite, type Favourites } from "./favourites";
import { decodeList, LIST_MIN_FAVOURITES } from "./listEmail";

const site = siteData as SiteConfig;

/** Moving previews, by the key a card names. Built lazily: a scene is only made for a card that is drawn. */
const SCENES: Record<string, () => Scene> = {
  "veh:car": () => carScene("explore-car", "loop_veh_car.webp", "order-assets/veh_car.webp", "Cars driving"),
  "veh:taxi": () => carScene("explore-taxi", "loop_veh_taxi.webp", "order-assets/veh_taxi.webp", "A taxi driving"),
  "story:plate": () => slideshow("explore-story-plate", [1, 2, 3, 4].map(i => ({ file: `loop_story_plate_${i}.webp`, hold: 1.25 })), "Your memory, told in the game's own pictures."),
  "story:boss": () => slideshow("explore-story-boss", [{ file: "loop_story_boss_1.webp", hold: 1.6 }, { file: "loop_story_boss_2.webp", hold: 1.3 }, { file: "loop_story_boss_3.webp", hold: 1.5 }], "A boss sizing you up."),
  "story:cut": () => slideshow("explore-story-cut", [1, 2, 3, 4].map(i => ({ file: `loop_story_cut_${i}.webp`, hold: 2.2 })), "A moment drawn as a cutscene.", { fade: 0.5, push: true }),
  "extras:evo": evolutionScene,
  "extras:move": moveScene,
  "extras:talk": talkScene,
  "extras:catch": catchScene,
};

let favs: Favourites = loadFavourites();

function art(card: ExploreCard): HTMLElement {
  const box = el("span", "ex-art");
  box.style.backgroundImage = `url(${card.art})`;
  if (card.scene?.startsWith("game:")) {
    const scene = GAME_SCENES[card.scene.slice(5)];
    if (scene) box.append(loopPreview(scene, { poster: card.art, label: `${card.title}: gameplay preview` }));
  } else if (card.scene && SCENES[card.scene]) {
    box.append(loopBox(SCENES[card.scene](), "ex-loop"));
  }
  return box;
}

function cardView(tab: ExploreTab, card: ExploreCard): HTMLElement {
  const on = card.fav ? favs[card.fav.kind].includes(card.fav.id) : false;
  const item = el("article", `ex-card${on ? " on" : ""}`);
  const text = el("div", "ex-text");
  text.append(el("h3", null, card.title), el("p", null, card.blurb));
  const badge = el("span", `ex-badge${card.adult ? " adult" : ""}`, card.badge);
  text.append(badge);
  item.append(art(card), text);
  if (card.fav) {
    const { kind, id } = card.fav;
    const heart = el("button", "ex-heart", on ? "♥" : "♡");
    heart.type = "button";
    heart.setAttribute("aria-pressed", String(on));
    heart.setAttribute("aria-label", `${on ? "Remove" : "Add"} ${card.title} ${on ? "from" : "to"} your favourites`);
    heart.onclick = () => {
      const was = favs[kind].includes(id);
      favs = toggleFavourite(favs, kind, id);
      saveFavourites(favs);
      track(was ? "favourite_remove" : "favourite_add", { kind, id, tab: tab.id });
      const now = !was;
      item.classList.toggle("on", now);
      heart.textContent = now ? "♥" : "♡";
      heart.setAttribute("aria-pressed", String(now));
      heart.setAttribute("aria-label", `${now ? "Remove" : "Add"} ${card.title} ${now ? "from" : "to"} your favourites`);
      if (now) heart.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], { duration: 260 });
      renderBar();
    };
    item.append(heart);
  }
  // A card reports its first look once, which is what the funnel needs ("which things do people actually view").
  seen.observe(item);
  item.dataset.tab = tab.id;
  item.dataset.id = card.id;
  return item;
}

const reported = new Set<string>();
const seen = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const t = e.target as HTMLElement;
    const key = `${t.dataset.tab}:${t.dataset.id}`;
    if (reported.has(key)) continue;
    reported.add(key);
    seen.unobserve(t);
    track("explore_card_view", { tab: t.dataset.tab!, id: t.dataset.id! });
  }
}, { threshold: 0.6 });

function renderCatalog() {
  const main = document.getElementById("catalog")!;
  const tabs = document.getElementById("tabList")!;
  for (const tab of EXPLORE_TABS) {
    const link = el("a", "ex-tab", tab.label);
    link.href = `#${tab.id}`;
    link.dataset.tab = tab.id;
    link.onclick = () => track("explore_tab", { tab: tab.id });
    tabs.append(link);

    const sec = el("section", "ex-section");
    sec.id = tab.id;
    const head = el("div", "ex-head");
    const h = el("div");
    h.append(el("h2", null, tab.label), el("p", null, tab.intro));
    const add = el("a", "btn ghost small", "Add these to my game ▶");
    add.href = `order.html?from=explore&step=${tab.step}`;
    add.dataset.track = "explore_to_builder";
    add.dataset.trackWhere = `tab_${tab.id}`;
    head.append(h, add);
    const grid = el("div", "ex-grid");
    for (const card of tab.cards) grid.append(cardView(tab, card));
    sec.append(head, grid);
    main.append(sec);
  }

  // The tab under the top of the screen is the one lit in the strip.
  const spy = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      tabs.querySelectorAll(".ex-tab").forEach(a => a.classList.toggle("on", (a as HTMLElement).dataset.tab === e.target.id));
    }
  }, { rootMargin: "-40% 0px -55% 0px" });
  main.querySelectorAll("section").forEach(s => spy.observe(s));
}

function renderBar() {
  const n = favouriteCount(favs);
  // Enough to be worth keeping: offer to email it (plan 18 phase 4).
  const canList = n >= LIST_MIN_FAVOURITES;
  document.getElementById("listOpen")!.hidden = !canList;
  if (!canList) document.getElementById("listForm")!.hidden = true;
  const bar = document.getElementById("favBar")!;
  bar.hidden = n === 0;
  document.getElementById("favCount")!.textContent = `♥ ${n} favourite${n === 1 ? "" : "s"} · picked for you when you start`;
  const go = document.getElementById("favGo")!;
  go.onclick = () => track("explore_to_builder", { where: "fav_bar", favourites: n });
}

function toast(message: string) {
  const t = document.getElementById("exToast")!;
  t.textContent = message;
  t.hidden = false;
  clearTimeout(Number(t.dataset.timer));
  t.dataset.timer = String(window.setTimeout(() => (t.hidden = true), 4000));
}

/** A link from the emailed list puts those favourites back (added to anything already picked here). */
function restoreFromLink() {
  const params = new URLSearchParams(location.search);
  if (!params.has("list")) return;
  const incoming = decodeList(params.get("list"));
  for (const kind of ["game", "minigame", "vehicle"] as const) for (const id of incoming[kind]) if (!favs[kind].includes(id)) favs = toggleFavourite(favs, kind, id);
  saveFavourites(favs);
  track("list_restored", { items: favouriteCount(incoming) });
  history.replaceState(null, "", location.pathname + location.hash);
  if (favouriteCount(incoming)) toast(`Your list is back: ${favouriteCount(incoming)} picked`);
}

function bindListForm() {
  const form = document.getElementById("listForm") as HTMLFormElement;
  const open = document.getElementById("listOpen")!;
  const email = document.getElementById("listEmail") as HTMLInputElement;
  const updates = document.getElementById("listUpdates") as HTMLInputElement;
  const note = document.getElementById("listNote")!;
  const send = document.getElementById("listSend") as HTMLButtonElement;
  const defaultNote = note.innerHTML;
  open.onclick = () => {
    form.hidden = !form.hidden;
    if (!form.hidden) { track("list_form_open", { favourites: favouriteCount(favs) }); email.focus(); }
  };
  email.addEventListener("input", () => { note.classList.remove("error"); note.innerHTML = defaultNote; });
  form.onsubmit = async e => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      note.textContent = "Add an email address so we know where to send it.";
      note.classList.add("error");
      email.focus();
      return;
    }
    send.disabled = true;
    send.textContent = "Sending…";
    try {
      const res = await fetch("/api/list", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.value.trim(), favourites: favs, updates: updates.checked }) });
      const body = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) throw new Error(body.message || "The email didn't go. Your list is still saved on this device.");
      track("list_emailed", { favourites: favouriteCount(favs), updates: updates.checked });
      form.hidden = true;
      toast("Sent. Check your inbox for your list.");
    } catch (err) {
      note.textContent = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "The email didn't go. Your list is still saved on this device.";
      note.classList.add("error");
    } finally {
      send.disabled = false;
      send.textContent = "Send ▶";
    }
  };
}

document.querySelectorAll<HTMLElement>("[data-draft]").forEach(n => (n.hidden = !site.isDraft));
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());
restoreFromLink();
renderCatalog();
renderBar();
bindListForm();
trackClicks();
void initCountryPicker();
// After layout, or the jump lands short of a section whose images have not sized yet.
if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
