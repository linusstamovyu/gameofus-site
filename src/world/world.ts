// The walkable beach in the hero: tap to walk, a guided tour, and a card per stop.
import type { Offer, SquadMember, Stop } from "../content/types";
import { $, asset, el, photoPair } from "../dom";
import { ACTIVE_LADDER, LADDERS, formatMoney } from "../order/prices";
import { currentCurrency } from "../shared/countryPicker";
import { track } from "../shared/analytics";
import { loadVisited, saveVisited, unlockPerk } from "../shared/tourProgress";
import { perkActive, perkDaysLeft } from "../order/perk";
import { drawCharacter, drawMarker, drawPrompt, drawTarget } from "./draw";
import { BeachMap, Ground, H, PALMS, PARASOLS, W, groundAt } from "./map";
import { OUTFITS } from "./outfits";
import { paintStaticLayer } from "./paint";
import { THEMES, themeById, type Theme } from "./themes";
import type { View } from "./themes/kit";
import { Player, type Facing } from "./player";
import { Showcase } from "./showcase";

const LOW_FPS = 24;          // below this, sea and palms stop animating
const FPS_SAMPLE_SECONDS = 4;
const WIDE_CARD_MIN_WIDTH = 980; // card sits beside the lad, so the camera shifts over
const SWAP_SECONDS = 0.45;       // fade when the world changes
const THEME_KEY = "gou-world";

export class BeachWorld {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly map: BeachMap;
  private readonly player: Player;
  private readonly squad = new Map<string, SquadMember>();
  private readonly sprites = new Map<string, HTMLImageElement>();
  /** Stops talked to, in any order, remembered on this device (plan 18: any order counts towards 7/7). */
  private readonly visited = new Set<string>(loadVisited());
  private readonly keys = new Set<string>();
  private T = 48; private dpr = 1; private vw = 0; private vh = 0;
  private layer: HTMLCanvasElement | null = null;
  private cam = { x: 0, y: 0 };
  private time = 0; private last = performance.now(); private dt = 0;
  private focused = false; private tourIndex = -1; private toastLeft = 0;
  private lowPower = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private fpsFrames = 0; private fpsTime = 0; private fpsChecked = false;
  private theme: Theme = THEMES[0];
  private swapLeft = 0;

  constructor(private readonly stage: HTMLElement, private readonly stops: Stop[], squad: SquadMember[], private readonly offer: Offer) {
    const canvas = $<HTMLCanvasElement>("canvas", stage);
    this.ctx = canvas.getContext("2d")!;
    this.map = new BeachMap(stops);
    this.player = new Player(this.map);
    squad.forEach(m => { this.squad.set(m.id, m); this.loadSprite(m.id, m.walk); });
    this.theme = themeById(new URLSearchParams(location.search).get("world") ?? readStored(THEME_KEY));
    this.loadThemeFiles(this.theme);

    new ResizeObserver(() => this.resize()).observe(stage);
    this.resize();
    document.fonts?.ready.then(() => this.rebuildLayer());
    this.bindInput(canvas);
    this.bindTour();
    this.bindWorldPicker();
    requestAnimationFrame(t => this.frame(t));
    // ?debug exposes the world for manual stepping (browsers that pause rAF in background tabs).
    if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __beach: this });
  }

  /** Advance and draw one frame by hand (debugging only). */
  step(dt = 1 / 60) { this.dt = dt; this.update(); this.render(); }

  /* ---------- setup ---------- */
  private loadSprite(key: string, file: string, url = asset(file)) {
    if (this.sprites.has(key)) return;
    const img = new Image(); img.src = url; this.sprites.set(key, img);
  }
  /** A theme's own art and its dressed walk sheets, fetched the first time it is picked. */
  private loadThemeFiles(t: Theme) {
    for (const [key, file] of Object.entries(t.files ?? {})) this.loadSprite(`${t.id}:${key}`, file);
    for (const [who, file] of Object.entries(OUTFITS[t.id] ?? {})) this.loadSprite(`${t.id}:walk:${who}`, file, file);
  }
  private walkSprite(who: string) {
    const dressed = this.sprites.get(`${this.theme.id}:walk:${who}`);
    return dressed?.complete && dressed.naturalWidth ? dressed : this.sprites.get(who);
  }
  private resize() {
    const r = this.stage.getBoundingClientRect();
    this.dpr = Math.min(2, devicePixelRatio || 1); this.vw = r.width; this.vh = r.height;
    const canvas = this.ctx.canvas;
    canvas.width = Math.round(this.vw * this.dpr); canvas.height = Math.round(this.vh * this.dpr);
    // About 9 tiles across on a phone, 16 on a laptop.
    this.T = Math.max(34, Math.min(66, Math.round(this.vw / (this.vw < 700 ? 9 : 16))));
    this.rebuildLayer();
  }
  private rebuildLayer() { this.layer = paintStaticLayer(this.theme, this.T, this.dpr); }

  /* ---------- worlds ---------- */
  private bindWorldPicker() {
    const select = $<HTMLSelectElement>("#worldSelect");
    if (!select) return;
    THEMES.forEach(t => { const o = el("option", null, t.label); o.value = t.id; o.title = t.blurb; select.append(o); });
    select.value = this.theme.id;
    this.paintSwatch();
    // Left focused on the select, the walking keys become its type-ahead: A jumps to "Albufeira beach" and S to
    // "Ski village", so walking undid the world just picked (17 Sep 2026). Two guards:
    // - picked with a mouse or a finger, focus goes straight back to the beach;
    // - W/A/S/D pressed on the select walk instead (focus moves to the beach and the key is passed on).
    // Arrow keys stay with the select, so a keyboard user can still step through the worlds.
    let viaPointer = false;
    select.addEventListener("pointerdown", () => { viaPointer = true; });
    select.addEventListener("change", () => {
      this.setTheme(select.value);
      if (viaPointer) { select.blur(); this.stage.focus({ preventScroll: true }); }
      viaPointer = false;
    });
    select.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if (k.length !== 1 || !"wasd".includes(k) || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      this.stage.focus({ preventScroll: true });
      this.stage.dispatchEvent(new KeyboardEvent("keydown", { key: e.key, bubbles: true }));
    });
  }
  private paintSwatch() {
    const sw = $("#worldSwatch");
    if (sw) sw.style.background = `linear-gradient(135deg, ${this.theme.swatch[0]} 50%, ${this.theme.swatch[1]} 50%)`;
  }
  setTheme(id: string) {
    const next = themeById(id);
    if (next === this.theme) return;
    this.theme = next;
    this.loadThemeFiles(next);
    this.rebuildLayer();
    this.stage.style.background = next.stageBg;
    this.stage.dataset.world = next.id;
    this.swapLeft = SWAP_SECONDS;
    this.paintSwatch();
    this.renderTour();
    writeStored(THEME_KEY, next.id);
    const card = $("#card");
    if (!card.hidden) { const s = this.stops[this.tourIndex]; if (s) this.openCard(s); }
  }

  /* ---------- input ---------- */
  private bindInput(canvas: HTMLCanvasElement) {
    const st = this.stage;
    st.addEventListener("focus", () => { this.focused = true; st.classList.add("focused"); });
    st.addEventListener("blur", () => { this.focused = false; st.classList.remove("focused"); this.keys.clear(); });
    st.addEventListener("keydown", e => {
      if (e.target !== st) return; // buttons inside the stage keep their own keys
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) || "wasd".includes(k) && k.length === 1) e.preventDefault();
      if (e.key === "Escape") { this.closeCard(); return; }
      if (this.cardOpen()) return;
      if (k === "e" || k === "enter") { const s = this.player.facingStop(); if (s) this.openCard(s); return; }
      this.hideTitle(); this.keys.add(k);
    });
    st.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));

    canvas.addEventListener("pointerdown", e => {
      st.focus({ preventScroll: true });
      if (this.cardOpen()) return;
      this.hideTitle();
      const r = st.getBoundingClientRect();
      const tx = Math.floor((e.clientX - r.left + this.cam.x) / this.T);
      const ty = Math.floor((e.clientY - r.top + this.cam.y) / this.T);
      if (!this.map.inBounds(tx, ty)) return;
      // A tap on a person's head (the tile above them) counts as the person.
      const below = this.map.stopAt(tx, ty + 1);
      const stop = this.map.stopAt(tx, ty) ?? (below?.kind === "npc" ? below : undefined);
      if (stop) { if (!this.player.walkToStop(stop)) this.toast("No way through from here"); return; }
      if (!this.map.walkable(tx, ty)) { this.toast(groundAt(tx, ty) === Ground.Sea ? this.theme.lines.barrier : this.theme.lines.blocked); return; }
      if (!this.player.walkTo(tx, ty)) this.toast("Can’t reach that spot");
    });

    $("#heroWalk").addEventListener("click", () => { this.hideTitle(); st.focus({ preventScroll: true }); this.toast("Tap the sand to walk"); });
    $("#heroTour").addEventListener("click", () => this.tourGo(0));
    $("#miniTitle").addEventListener("click", () => { $("#titleCard").hidden = false; $("#miniTitle").hidden = true; });
    $("#scrim").addEventListener("pointerdown", () => this.closeCard());
  }
  private keyDir(): Facing | null {
    const k = this.keys;
    if (k.has("arrowup") || k.has("w")) return "up";
    if (k.has("arrowdown") || k.has("s")) return "down";
    if (k.has("arrowleft") || k.has("a")) return "left";
    if (k.has("arrowright") || k.has("d")) return "right";
    return null;
  }
  private hideTitle() { $("#titleCard").hidden = true; $("#miniTitle").hidden = false; }

  /* ---------- tour ---------- */
  private bindTour() {
    this.stage.style.background = this.theme.stageBg;
    this.stage.dataset.world = this.theme.id;
    const dots = $("#dots");
    this.stops.forEach(() => dots.append(document.createElement("i")));
    $("#next").addEventListener("click", () => this.tourGo(this.tourIndex + 1));
    $("#prev").addEventListener("click", () => this.tourGo(this.tourIndex - 1));
    this.renderTour();
  }
  private renderTour() {
    const s = this.stops[this.tourIndex];
    const found = this.stops.filter(x => this.visited.has(x.id)).length;
    const progress = `${found}/${this.stops.length} discovered`;
    $("#tourStep").textContent = s ? `Stop ${this.tourIndex + 1} · ${progress}` : found ? progress : "Guided tour";
    $("#tourName").textContent = s ? s.title : `${this.stops.length} stops · ${this.theme.label}`;
    ($("#prev") as HTMLButtonElement).disabled = this.tourIndex <= 0;
    $("#next").textContent = this.tourIndex < 0 ? "Start ▶" : this.tourIndex >= this.stops.length - 1 ? "Replay ↺" : "Next ▶";
    // A dot per stop, lit once that stop has been found, so wandering fills them in too.
    [...$("#dots").children].forEach((d, i) => { d.classList.toggle("on", this.visited.has(this.stops[i].id)); d.classList.toggle("here", i === this.tourIndex); });
  }
  private tourGo(i: number) {
    this.hideTitle();
    if (this.tourIndex < 0) track("tour_start");
    this.tourIndex = i >= this.stops.length ? 0 : Math.max(0, i);
    this.closeCard(); this.renderTour();
    if (!this.player.walkToStop(this.stops[this.tourIndex])) this.toast("No way through from here");
  }

  /* ---------- cards ---------- */
  private cardOpen() { return !$("#card").hidden; }
  private openCard(s: Stop) {
    const firstTime = !this.visited.has(s.id);
    this.visited.add(s.id);
    saveVisited(this.visited);
    track("tour_stop", { id: s.id, first: firstTime, found: this.visited.size });
    const complete = this.stops.every(x => this.visited.has(x.id));
    if (complete && firstTime) track("tour_complete");
    this.player.cancelRoute();
    this.tourIndex = this.stops.indexOf(s); this.renderTour();
    const card = $("#card");
    card.replaceChildren();

    // Beach art lives in assets/; a stop can borrow the order page's art by giving its path.
    const art = el("div", "art"); art.style.backgroundImage = `url(${s.art.includes("/") ? s.art : asset(s.art)})`;
    const close = el("button", "close", "✕"); close.setAttribute("aria-label", "Close"); close.onclick = () => this.closeCard();
    art.append(close);
    const body = el("div", "body");
    body.append(el("p", "eyebrow", s.eyebrow));
    const h = el("h2", null, s.title); h.id = "cardTitle"; body.append(h);

    const who = s.who ? this.squad.get(s.who) : undefined;
    if (who) {
      if (who.photo) art.classList.add("has-ref");
      art.append(photoPair(who.name, who.face, who.photo));
      if (who.photo) art.append(el("p", "face-tag", "In game"));
      const line = el("div", "who");
      line.append(el("span", `chip ${who.type}`, who.type), document.createTextNode(`${who.name} · Signature move: ${who.move}`));
      body.append(line);
    }
    if (s.text) body.append(el("p", null, s.text.replace("{place}", this.theme.place)));
    if (s.thumbs) {
      const g = el("div", "thumbs");
      s.thumbs.forEach(([src, label]) => { const f = el("figure"), d = el("div"); d.style.backgroundImage = `url(${asset(src)})`; f.append(d, el("span", null, label)); g.append(f); });
      body.append(g);
    }
    if (s.steps) {
      const ol = el("ol", "steps");
      s.steps.forEach(([b, t]) => { const li = el("li"), d = el("div"); d.append(el("b", null, b), document.createTextNode(t)); li.append(d); ol.append(li); });
      body.append(ol);
    }
    // The finale is on the card that found the 7th stop, and on the last stop for anyone coming back to it.
    const finale = complete && (firstTime || !!s.last);
    // Straight under the title, so the bonus and Start building are in view without scrolling the card.
    if (finale) h.after(this.finale());
    else if (s.showTiers) body.append(this.tiers());

    const acts = el("div", "actions");
    const nextMissing = () => {
      // Next stop in tour order; past the last one, the first stop not found yet.
      const after = this.stops.slice(this.tourIndex + 1).find(x => !this.visited.has(x.id));
      return this.stops.indexOf(after ?? this.stops.find(x => !this.visited.has(x.id)) ?? this.stops[0]);
    };
    if (!finale && !(complete && s.last)) {
      const n = el("button", "btn", s.last ? "Find the ones you missed ▶" : "Next stop ▶");
      n.onclick = () => this.tourGo(s.last ? nextMissing() : this.tourIndex + 1);
      acts.append(n);
    }
    if (s.step) {
      const add = el("a", "btn ghost", s.add ?? "Add this to my game");
      add.href = `order.html?from=beach&step=${encodeURIComponent(s.step)}`;
      add.dataset.track = "tour_add";
      add.dataset.trackStop = s.id;
      acts.append(add);
    }
    const all = el("a", "link-btn card-all", "See all ▶");
    all.href = s.tab ? `explore.html#${encodeURIComponent(s.tab)}` : "explore.html";
    all.dataset.track = "tour_see_all";
    all.dataset.trackStop = s.id;
    acts.append(all);

    // The actions sit outside the scrolling body, so Next stop and the Add button are always on screen:
    // on a phone the body text scrolls and the buttons stay put (they used to sit below the card's edge).
    card.append(art, body, acts);
    card.hidden = false; $("#scrim").hidden = false;
    card.classList.remove("enter"); void card.offsetWidth; card.classList.add("enter");
    // Keyboard and screen-reader users land on the card's first action, not somewhere behind it.
    acts.querySelector<HTMLElement>(".btn")?.focus({ preventScroll: true });
  }
  /** The three editions, with founder prices in the visitor's currency. */
  private tiers(): HTMLElement {
    const g = el("div", "tiers");
    this.offer.tiers.forEach(t => {
      const d = el("div", t.star ? "star" : null);
      d.append(el("b", null, t.short), el("span", null, formatMoney(LADDERS[ACTIVE_LADDER].editions[t.id].founder[currentCurrency()], currentCurrency())), el("em", null, t.copy[ACTIVE_LADDER].friends));
      g.append(d);
    });
    return g;
  }

  /** Shown on any card once all 7 have been found: the bonus, the prices and the way in. */
  private finale(): HTMLElement {
    const unlocked = unlockPerk();
    const box = el("div", "finale");
    box.append(el("p", "eyebrow", `Tour complete · ${this.stops.length}/${this.stops.length}`));
    if (perkActive(unlocked)) {
      const days = perkDaysLeft(unlocked);
      box.append(el("b", null, "Beach tour bonus unlocked"));
      box.append(el("p", null, `Order within ${days} day${days === 1 ? "" : "s"} and all 12 party minigames come at no extra cost. Ultimate already has all 12, so there Party Mode is free instead (or 3 custom items, if not everyone is 18+). It's applied for you when you order.`));
    } else {
      // Once per device: a tour walked again after the 7 days is still a tour, just without a second bonus.
      box.append(el("b", null, "You've seen it all"));
      box.append(el("p", null, "The beach tour bonus is one per device and this one has been used. Everything else is still on the table."));
    }
    box.append(this.tiers());
    const row = el("div", "finale-row");
    const watch = el("button", "btn ghost", "Watch it play ▶");
    watch.type = "button";
    watch.onclick = () => { this.closeCard(); new Showcase(this.stage, () => this.stage.focus({ preventScroll: true })).open(); };
    const go = el("a", "btn", "Start building ▶");
    go.href = "order.html?from=beach";
    go.dataset.track = "tour_to_builder";
    row.append(watch, go);
    box.append(row);
    return box;
  }

  private closeCard() {
    const card = $("#card");
    const hadFocus = card.contains(document.activeElement);
    card.hidden = true; $("#scrim").hidden = true;
    if (hadFocus) this.stage.focus({ preventScroll: true });
  }

  private toast(msg: string) { const t = $("#toast"); t.textContent = msg; t.hidden = false; this.toastLeft = 1.6; }

  /* ---------- loop ---------- */
  private frame(now: number) {
    this.dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.update(); this.render();
    requestAnimationFrame(t => this.frame(t));
  }
  private update() {
    const dt = this.dt;
    this.time += dt;
    if (this.swapLeft > 0) this.swapLeft = Math.max(0, this.swapLeft - dt);
    if (this.toastLeft > 0) { this.toastLeft -= dt; if (this.toastLeft <= 0) $("#toast").hidden = true; }
    this.measureFps(dt);
    if (this.cardOpen()) return;
    const arrived = this.player.update(dt, this.keyDir(), this.keys.has("shift"));
    if (arrived) this.openCard(arrived);
  }
  /** One-off check: a device that can't hold LOW_FPS gets a still sea and still palms. */
  private measureFps(dt: number) {
    if (this.fpsChecked || document.hidden) return;
    this.fpsFrames++; this.fpsTime += dt;
    if (this.fpsTime >= FPS_SAMPLE_SECONDS) {
      this.fpsChecked = true;
      if (this.fpsFrames / this.fpsTime < LOW_FPS) this.lowPower = true;
    }
  }
  private npcFacing(s: Stop): Facing {
    const dx = this.player.x - s.x, dy = this.player.y - s.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) return "down";
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }
  private render() {
    const { ctx, T, vw, vh, dpr, player } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const ppx = player.drawX * T, ppy = player.drawY * T, mw = W * T, mh = H * T;
    const offX = this.cardOpen() && vw > WIDE_CARD_MIN_WIDTH ? 200 : 0;
    let tx = ppx + T / 2 - vw / 2 + offX, ty = ppy + T / 2 - vh / 2;
    tx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, tx));
    ty = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, ty));
    const k = Math.min(1, this.dt * 8);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    const cx = Math.round(this.cam.x * dpr) / dpr, cy = Math.round(this.cam.y * dpr) / dpr;

    const theme = this.theme, animated = !this.lowPower, t = animated ? this.time : 0;
    const view: View = {
      x0: Math.max(0, Math.floor(cx / T)), y0: Math.max(0, Math.floor(cy / T)),
      x1: Math.min(W - 1, Math.floor((cx + vw) / T)), y1: Math.min(H - 1, Math.floor((cy + vh) / T)),
      cx, cy, vw, vh,
    };
    ctx.fillStyle = theme.stageBg; ctx.fillRect(0, 0, vw, vh);
    ctx.save(); ctx.translate(-cx, -cy);
    if (this.layer) ctx.drawImage(this.layer, 0, 0, mw, mh);
    theme.live?.(ctx, T, this.time, animated, view);
    if (player.target) drawTarget(ctx, T, player.target[0], player.target[1], this.time);

    const img = (key: string) => this.sprites.get(`${theme.id}:${key}`);
    const items: [number, () => void][] = [];
    PALMS.forEach(([x, y]) => items.push([y + 1, () => theme.tall(ctx, T, x, y, t, img)]));
    PARASOLS.forEach(([x, y]) => items.push([y + 1, () => theme.small(ctx, T, x, y, t)]));
    this.stops.forEach(s => items.push([s.y + 1, () => s.kind === "npc" && s.who
      ? drawCharacter(ctx, T, this.walkSprite(s.who), s.x * T, s.y * T, this.npcFacing(s), false, 0)
      : theme.sign(ctx, T, s)]));
    items.push([player.drawY + 1.01, () => drawCharacter(ctx, T, this.walkSprite("rico"), ppx, ppy, player.facing, player.moving && player.t < 0.5, player.step % 2)]);
    items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw());
    theme.grade?.(ctx, T, view);
    if (theme.lights) { ctx.save(); theme.lights(ctx, T, this.time, animated, view); ctx.restore(); }
    this.stops.forEach(s => drawMarker(ctx, T, s, this.visited.has(s.id), this.time));

    const facing = player.facingStop();
    if (facing) {
      const name = facing.who ? this.squad.get(facing.who)?.name : undefined;
      const label = (this.focused ? "E · " : "Tap · ") + (facing.kind === "npc" && name ? `Talk to ${name}` : "Read the sign");
      drawPrompt(ctx, T, label, player.x, player.y);
    }
    ctx.restore();
    if (theme.screen) { ctx.save(); theme.screen(ctx, vw, vh, this.time, animated); ctx.restore(); }
    if (this.swapLeft > 0) {
      ctx.fillStyle = theme.stageBg; ctx.globalAlpha = this.swapLeft / SWAP_SECONDS;
      ctx.fillRect(0, 0, vw, vh); ctx.globalAlpha = 1;
    }
  }
}

/** localStorage can throw (private windows, blocked storage); the world never depends on it. */
function readStored(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function writeStored(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* not saved */ } }
