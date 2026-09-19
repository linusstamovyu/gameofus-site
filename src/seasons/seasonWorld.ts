// Season scroll preview: the hero's playable beach, where a sideways swipe travels through the six worlds in
// the order of the year and the map cross-dissolves between them. The squad, the tour and the cards are the
// hero's own; only the picture under them changes.
//
// A fork of world/world.ts on purpose (16 Sep 2026): other sessions are editing the live hero, and this is a
// preview. What is different from the hero:
// - `pos` (see seasons.ts) replaces the one current theme. Between two worlds BOTH are drawn and the second is
//   laid over the first at the blend fraction, so the sea, the rain, the night grade and the snow all fade too.
// - Markers and the talk prompt are drawn once, after the blend: they are the same in every world.
// - While a phone can't keep up, the two worlds are drawn at lower resolution during a blend only.
// - Static layers are cached per world, as many as a memory budget allows, and painted ahead while settled.
// - A director (the homepage story, src/story) can take over: it picks the worlds, the camera and zoom, the
//   visible window inside the canvas, and where Rico should walk to (he gets there with his own walk). While it
//   does, the map is a film with no input, unless the shot says the visitor may explore.
import type { Offer, SquadMember, Stop } from "../content/types";
import { $, asset, el, photoPair } from "../dom";
import { ACTIVE_LADDER, LADDERS, formatMoney } from "../order/prices";
import { perkActive, perkDaysLeft } from "../order/perk";
import { track } from "../shared/analytics";
import { currentCurrency } from "../shared/countryPicker";
import { loadVisited, saveVisited, unlockPerk } from "../shared/tourProgress";
import { drawCharacter, drawMarker, drawPrompt, drawTarget } from "../world/draw";
import { BeachMap, Ground, H, PALMS, PARASOLS, W, groundAt } from "../world/map";
import { OUTFITS } from "../world/outfits";
import { paintStaticLayer } from "../world/paint";
import { Player, type Facing } from "../world/player";
import { Showcase } from "../world/showcase";
import { themeById, type Theme } from "../world/themes";
import type { View } from "../world/themes/kit";
import {
  BLEND_EPS, JUMP_SECONDS, N, SEASONS, SETTLE_DELAY, blendAt, dominantAt, ease, indexOf, markerFraction, settleStep,
  shortestDelta, wheelWorlds, wrap,
} from "./seasons";

const LOW_FPS = 24;              // below this, sea and palms stop animating (the hero's rule)
const FPS_SAMPLE_SECONDS = 4;
const BLEND_FPS_MIN = 40;        // a blend slower than this switches to the softer, cheaper blend
const BLEND_SAMPLE_SECONDS = 1;  // of blend time, before judging
const WIDE_CARD_MIN_WIDTH = 980;
const SWIPE_START_PX = 10;       // a finger that moves less than this is a tap
// Painting a world's ground takes 25-55 ms (measured on an M-series Mac), so a world that isn't ready when a swipe
// reaches it is a visible stall. Layers are painted ahead while settled and kept up to this many pixels:
// all six on a phone (about 88 MB), about four on a retina laptop (36 MB each).
const LAYER_BUDGET_PX = 40_000_000;
const WARM_ORDER = [1, -1, 2, -2, 3];
const HINT_KEY = "gou-season-hint";

type Outfits = "own" | "fade";
export interface Rect { x: number; y: number; w: number; h: number }
/**
 * One frame of a directed shot. Worlds are indices into SEASONS. The camera centre is
 *   (cx, cy) * (1 - follow) + (Rico's centre + (ox, oy)) * follow, in tiles,
 * so a shot can hold on a spot, sit on Rico, or anywhere between, without lagging a frame behind his walk.
 */
export interface Shot {
  a: number; b: number; f: number;
  cx: number; cy: number; z: number;
  follow?: number; ox?: number; oy?: number;
  /** Where Rico should be. He walks (or jogs) there on his own, exactly as a tap would send him. */
  walkTo?: [number, number];
  /** Put him on walkTo at once instead of walking there (debug links that open mid-story). */
  snap?: boolean;
  /** Once he has arrived, turn him this way. */
  faceWhenStill?: Facing;
  /** 0..1: the map is awake. Markers fade in with it; above a half, taps, keys and cards work. */
  explore?: number;
  /** Who has the dialogue box: a stop id, or "rico". Gets a speech mark over their head. */
  talking?: string | null;
  /** Nearest-neighbour drawing, for push-ins far enough that the pixels should show. */
  crisp?: boolean;
}
export type Director = (dt: number) => Shot | null;
export interface WorldOptions {
  outfits?: Outfits;
  /** Remember the picked world on this device (the homepage's rule). */
  remember?: boolean;
}
const WORLD_KEY = "gou-world";
interface Touch { id: number; x0: number; y0: number; pos0: number; swiping: boolean }
interface Jump { from: number; to: number; t: number; markerFrom: number }

export class SeasonWorld {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly map: BeachMap;
  private readonly player: Player;
  private readonly squad = new Map<string, SquadMember>();
  private readonly sprites = new Map<string, HTMLImageElement>();
  private readonly visited = new Set<string>(loadVisited());
  private readonly keys = new Set<string>();
  private readonly themes = SEASONS.map(s => themeById(s.world));
  private readonly layers = new Map<string, HTMLCanvasElement>();
  private readonly bufA = document.createElement("canvas");
  private readonly bufB = document.createElement("canvas");
  private T = 48; private dpr = 1; private vw = 0; private vh = 0;
  /** Camera centre in world pixels, and zoom. */
  private cam = { x: 0, y: 0 };
  private zoom = 1;
  private director: Director | null = null;
  private shot: Shot | null = null;
  /** The part of the canvas that is on show (the homepage's card, before it opens out). */
  private win: Rect | null = null;
  private visible = true;
  private readonly remember: boolean;
  private walkGoal: [number, number] | null = null;
  private time = 0; private last = performance.now(); private dt = 0;
  private focused = false; private tourIndex = -1; private toastLeft = 0;
  private lowPower = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private fpsFrames = 0; private fpsTime = 0; private fpsChecked = false;

  /** Where in the year we are (seasons.ts). */
  private pos = 0;
  private idle = Infinity;       // seconds since the last sideways scroll
  private hold = false;          // ?pos= for screenshots: never settle until someone scrolls
  private touch: Touch | null = null;
  private jump: Jump | null = null;
  private dominant = 0;
  private outfits: Outfits;
  private softBlend: boolean;
  private blendForced: boolean;
  private blendFrames = 0; private blendTime = 0;
  private hintShown = false;
  private markerX = -1;
  /** Frame timings, for checking the blend's cost (?debug). */
  readonly perf = { frames: 0, blendFrames: 0, blendMs: 0, settledFrames: 0, settledMs: 0, layerMs: [] as number[] };

  constructor(private readonly stage: HTMLElement, private readonly stops: Stop[], squad: SquadMember[], private readonly offer: Offer, opts: WorldOptions = {}) {
    const canvas = $<HTMLCanvasElement>("canvas", stage);
    this.ctx = canvas.getContext("2d")!;
    this.map = new BeachMap(stops);
    this.player = new Player(this.map);
    squad.forEach(m => { this.squad.set(m.id, m); this.loadSprite(m.id, m.walk); });

    const q = new URLSearchParams(location.search);
    const start = q.get("pos");
    if (start !== null && Number.isFinite(Number(start))) { this.pos = wrap(Number(start)); this.hold = true; }
    else this.pos = Math.max(0, indexOf(q.get("world") ?? (opts.remember ? readStored(WORLD_KEY) : null)));
    this.remember = !!opts.remember;
    this.outfits = q.get("outfits") === "fade" ? "fade" : q.get("outfits") === "own" ? "own" : opts.outfits ?? "own";
    this.blendForced = q.has("blend");
    this.softBlend = q.get("blend") === "low";
    this.dominant = dominantAt(this.pos);

    new ResizeObserver(() => this.resize()).observe(stage);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }).observe(stage);
    this.resize();
    const start0 = this.playerCentre();
    this.cam = { x: start0.x, y: start0.y };
    document.fonts?.ready.then(() => this.layers.clear());
    this.bindInput(canvas);
    this.bindTour();
    this.bindWorldPicker();
    this.bindSeasonStrip();
    this.bindOutfitSwitch();
    this.showHint();
    if (this.hold) this.hideTitle(); // a parked blend is for looking at the map
    this.onDominantChange(true);
    requestAnimationFrame(t => this.frame(t));
    if (q.has("debug")) Object.assign(window, { __season: this });
  }

  /** Advance and draw one frame by hand (debugging only). */
  step(dt = 1 / 60) { this.dt = dt; this.update(); this.render(); }
  /** Park the blend at a position (debugging and screenshots). */
  setPos(p: number) { this.jump = null; this.pos = wrap(p); this.hold = true; this.onDominantChange(); }

  private get theme(): Theme { return this.themes[this.dominant]; }
  /** Directed, and the visitor can't touch the map. */
  private get locked() { return !!this.shot && (this.shot.explore ?? 0) < 0.5; }

  /* ---------- the director's side ---------- */
  setDirector(d: Director | null) { this.director = d; }
  setWindow(r: Rect | null) { this.win = r; }
  /** Canvas size (CSS px) and tile size, for framing a shot. */
  metrics() { return { vw: this.vw, vh: this.vh, T: this.T, W, H }; }
  /** The world picked at rest (what the map shows when nobody is directing). */
  get restIndex() { return dominantAt(this.pos); }
  /** Where Rico really is, in tiles. */
  playerTile() { return { x: this.player.drawX, y: this.player.drawY }; }
  /** Re-measure now, not on the next observer callback (the story resizes the stage between frames). */
  syncSize() { this.resize(); }
  /** Centre-of-camera range for a zoom, in tiles, keeping the window inside the map. */
  panRange(z: number, win: Rect | null = null): { x0: number; x1: number; y0: number; y1: number } {
    const w = win ?? { x: 0, y: 0, w: this.vw, h: this.vh };
    const ww = w.w / z / this.T, wh = w.h / z / this.T;
    const x0 = W <= ww ? W / 2 : ww / 2, x1 = W <= ww ? W / 2 : W - ww / 2;
    const y0 = H <= wh ? H / 2 : wh / 2, y1 = H <= wh ? H / 2 : H - wh / 2;
    return { x0, x1, y0, y1 };
  }
  private playerCentre() {
    return { x: (this.player.drawX + 0.5) * this.T, y: (this.player.drawY + 0.5) * this.T };
  }

  /* ---------- setup ---------- */
  private loadSprite(key: string, file: string, url = asset(file)) {
    if (this.sprites.has(key)) return;
    const img = new Image(); img.src = url; this.sprites.set(key, img);
  }
  /** A world's own art, and its dressed walk sheets when outfits fade with the map. */
  private loadThemeFiles(t: Theme) {
    for (const [key, file] of Object.entries(t.files ?? {})) this.loadSprite(`${t.id}:${key}`, file);
    if (this.outfits === "fade") for (const [who, file] of Object.entries(OUTFITS[t.id] ?? {})) this.loadSprite(`${t.id}:walk:${who}`, file, file);
  }
  /** Files for the world on screen and both neighbours, so a swipe either way finds them loaded. */
  private warmNeighbours() {
    for (const d of [0, 1, -1]) this.loadThemeFiles(this.themes[wrap(this.dominant + d)]);
  }
  private walkSprite(who: string, world: Theme) {
    if (this.outfits === "fade") {
      const dressed = this.sprites.get(`${world.id}:walk:${who}`);
      if (dressed?.complete && dressed.naturalWidth) return dressed;
    }
    return this.sprites.get(who);
  }
  private resize() {
    const r = this.stage.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (r.width === this.vw && r.height === this.vh && dpr === this.dpr) return;
    const T0 = this.T, dpr0 = this.dpr;
    this.dpr = dpr; this.vw = r.width; this.vh = r.height;
    const canvas = this.ctx.canvas;
    canvas.width = Math.round(this.vw * this.dpr); canvas.height = Math.round(this.vh * this.dpr);
    this.T = Math.max(34, Math.min(66, Math.round(this.vw / (this.vw < 700 ? 9 : 16))));
    // The ground only depends on the tile size: a height change (a phone's address bar, the story's strip) keeps it.
    if (this.T !== T0 || this.dpr !== dpr0) {
      this.layers.clear();
      this.cam.x *= this.T / T0; this.cam.y *= this.T / T0;
    }
    this.sizeBuffers();
  }
  /** The blend buffers are made once per size, never per frame. */
  private sizeBuffers() {
    const s = this.blendDpr();
    for (const b of [this.bufA, this.bufB]) {
      const w = Math.max(1, Math.round(this.vw * s)), h = Math.max(1, Math.round(this.vh * s));
      if (b.width !== w || b.height !== h) { b.width = w; b.height = h; }
    }
  }
  private blendDpr() { return this.softBlend ? Math.max(0.75, this.dpr * 0.5) : this.dpr; }

  /** A world's static ground, painted once and kept while the budget allows. */
  private layerFor(t: Theme): HTMLCanvasElement {
    let layer = this.layers.get(t.id);
    if (layer) return layer;
    const t0 = performance.now();
    layer = paintStaticLayer(t, this.T, this.dpr);
    this.perf.layerMs.push(Math.round(performance.now() - t0));
    this.layers.set(t.id, layer);
    this.trimLayers();
    return layer;
  }
  private layerPx() { return Math.round(W * this.T * this.dpr) * Math.round(H * this.T * this.dpr); }
  /** Over budget: drop the worlds furthest round the loop from the one on screen, never one being drawn. */
  private trimLayers() {
    const { a, b } = this.blend();
    const keep = new Set<string>([a.id, b.id, this.theme.id]);
    const far = (id: string) => Math.abs(shortestDelta(this.dominant, indexOf(id)));
    while (this.layers.size * this.layerPx() > LAYER_BUDGET_PX) {
      const drop = [...this.layers.keys()].filter(id => !keep.has(id)).sort((x, y) => far(y) - far(x))[0];
      if (!drop) break;
      this.layers.delete(drop);
    }
  }
  /** Settled: paint one missing world per frame, nearest first, while the budget has room for it. */
  private warmOneLayer() {
    if (!this.layers.has(this.theme.id)) { this.layerFor(this.theme); return; }
    if ((this.layers.size + 1) * this.layerPx() > LAYER_BUDGET_PX) return;
    for (const d of WARM_ORDER) {
      const t = this.themes[wrap(this.dominant + d)];
      if (!this.layers.has(t.id)) { this.layerFor(t); return; }
    }
  }

  /* ---------- seasons ---------- */
  /** Sideways travel, in worlds. */
  private scrub(worlds: number) {
    if (this.cardOpen() || this.shot || worlds === 0) return;
    this.finishJump();
    this.hold = false;
    this.pos = wrap(this.pos + worlds);
    this.idle = 0;
    this.hideTitle();
    this.hideHint();
  }
  /** Strip tap or drop-down: a straight fade to that world, skipping the ones in between. */
  jumpTo(index: number) {
    this.hold = false;
    const from = this.jump ? this.jump.to : dominantAt(this.pos);
    if (from === index && !this.jump) { this.pos = index; this.onDominantChange(); return; }
    this.finishJump();
    this.pos = from;
    this.jump = { from, to: index, t: 0, markerFrom: from };
    this.warmJump(index);
  }
  private warmJump(index: number) { this.loadThemeFiles(this.themes[index]); }
  private finishJump() {
    if (!this.jump) return;
    this.pos = this.jump.to;
    this.jump = null;
    this.onDominantChange();
  }
  /** The two worlds on screen now and how far between them. */
  private blend(): { a: Theme; b: Theme; f: number } {
    const shot = this.shot;
    if (shot) return { a: this.themes[wrap(shot.a)], b: this.themes[wrap(shot.b)], f: shot.f <= BLEND_EPS ? 0 : shot.f >= 1 - BLEND_EPS ? 1 : shot.f };
    if (this.jump) {
      const f = ease(this.jump.t / JUMP_SECONDS);
      return { a: this.themes[this.jump.from], b: this.themes[this.jump.to], f: f >= 1 - BLEND_EPS ? 1 : f };
    }
    const { a, b, f } = blendAt(this.pos);
    return { a: this.themes[a], b: this.themes[b], f };
  }
  private currentDominant(): number {
    if (this.shot) return wrap(this.shot.f < 0.5 ? this.shot.a : this.shot.b);
    if (this.jump) return ease(this.jump.t / JUMP_SECONDS) < 0.5 ? this.jump.from : this.jump.to;
    return dominantAt(this.pos);
  }
  private markerPos(): number {
    if (!this.jump) return this.pos;
    const j = this.jump;
    return j.markerFrom + shortestDelta(j.markerFrom, j.to) * ease(j.t / JUMP_SECONDS);
  }
  private onDominantChange(force = false) {
    const d = this.currentDominant();
    if (d === this.dominant && !force) return;
    this.dominant = d;
    const t = this.theme;
    this.stage.style.background = t.stageBg;
    this.stage.dataset.world = t.id;
    const select = $<HTMLSelectElement>("#worldSelect");
    if (select) select.value = t.id;
    this.paintSwatch();
    this.renderTour();
    this.warmNeighbours();
    document.querySelectorAll<HTMLElement>("#seasonStops button").forEach((b, i) => {
      b.classList.toggle("on", i === d);
      b.setAttribute("aria-pressed", String(i === d));
    });
    const now = $("#seasonNow");
    if (now) now.textContent = `${SEASONS[d].season} · ${t.label}`;
    const card = $("#card");
    if (card && !card.hidden) { const s = this.stops[this.tourIndex]; if (s) this.openCard(s); }
  }

  private bindWorldPicker() {
    const select = $<HTMLSelectElement>("#worldSelect");
    if (!select) return;
    // In season order, not the hero's order.
    this.themes.forEach(t => { const o = el("option", null, t.label); o.value = t.id; o.title = t.blurb; select.append(o); });
    select.value = this.theme.id;
    this.paintSwatch();
    let viaPointer = false; // the hero's guard: WASD on a focused select would pick worlds by type-ahead
    select.addEventListener("pointerdown", () => { viaPointer = true; });
    select.addEventListener("change", () => {
      this.jumpTo(Math.max(0, indexOf(select.value)));
      if (this.remember) writeStored(WORLD_KEY, select.value);
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

  private bindSeasonStrip() {
    const stopsEl = $("#seasonStops"), band = $("#seasonBand");
    if (!stopsEl) return;
    SEASONS.forEach((s, i) => {
      const b = el("button", "season-stop");
      b.type = "button";
      b.append(el("b", null, s.season), el("span", null, this.themes[i].label));
      b.addEventListener("click", () => this.jumpTo(i));
      stopsEl.append(b);
    });
    if (band) {
      // Each world's colour at the centre of its cell; the two ends meet halfway between the off-season and summer.
      const cols = this.themes.map(t => t.swatch[0] === "#f4f9fd" ? "#bcd6ea" : t.swatch[0]);
      const seam = `color-mix(in srgb, ${cols[N - 1]} 50%, ${cols[0]})`;
      const stops = cols.map((c, i) => `${c} ${((i + 0.5) / N) * 100}%`);
      band.style.background = `linear-gradient(90deg, ${seam} 0%, ${stops.join(", ")}, ${seam} 100%)`;
    }
  }
  private paintMarker() {
    const x = Math.round(markerFraction(this.markerPos()) * 1000) / 10;
    if (x === this.markerX) return;
    this.markerX = x;
    const m = $("#seasonMarker"), ghost = $("#seasonGhost");
    if (m) m.style.left = `${x}%`;
    // The loop: the marker slides off one end and in at the other.
    if (ghost) ghost.style.left = `${x < 50 ? x + 100 : x - 100}%`;
  }

  private bindOutfitSwitch() {
    document.querySelectorAll<HTMLButtonElement>("[data-outfits]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.outfits === this.outfits));
      b.addEventListener("click", () => {
        this.outfits = b.dataset.outfits === "fade" ? "fade" : "own";
        document.querySelectorAll<HTMLButtonElement>("[data-outfits]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
        this.warmNeighbours();
        const url = new URL(location.href);
        if (this.outfits === "fade") url.searchParams.set("outfits", "fade"); else url.searchParams.delete("outfits");
        history.replaceState(null, "", url);
      });
    });
  }

  private showHint() {
    const hint = $("#seasonHint");
    if (!hint || readStored(HINT_KEY)) return;
    hint.textContent = matchMedia("(pointer: coarse)").matches
      ? "⇆ Swipe sideways on the map to change season"
      : "⇆ Two-finger swipe sideways on the map (or Shift + scroll) to change season";
    hint.hidden = false;
    this.hintShown = true;
  }
  private hideHint() {
    if (!this.hintShown) return;
    this.hintShown = false;
    $("#seasonHint").hidden = true;
    writeStored(HINT_KEY, "1");
  }

  /* ---------- input ---------- */
  private bindInput(canvas: HTMLCanvasElement) {
    const st = this.stage;
    st.addEventListener("focus", () => { this.focused = true; st.classList.add("focused"); });
    st.addEventListener("blur", () => { this.focused = false; st.classList.remove("focused"); this.keys.clear(); });
    st.addEventListener("keydown", e => {
      if (e.target !== st || this.locked) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k) || "wasd".includes(k) && k.length === 1) e.preventDefault();
      if (e.key === "Escape") { this.closeCard(); return; }
      if (this.cardOpen()) return;
      if (k === "e" || k === "enter") { const s = this.player.facingStop(); if (s) this.openCard(s); return; }
      this.hideTitle(); this.keys.add(k);
    });
    st.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));

    // Sideways wheel over the map (a trackpad swipe, or Shift + a mouse wheel) travels through the year.
    // A mostly vertical wheel is left alone so the page still scrolls.
    st.addEventListener("wheel", e => {
      if (this.shot || (e.target as Element).closest(".card, .scrim, select")) return;
      if (!this.inWindow(e.clientX, e.clientY)) return;
      let dx = e.deltaX;
      const dy = e.deltaY;
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) dx = dy;
      else if (Math.abs(dx) <= Math.abs(dy)) return;
      e.preventDefault();
      this.scrub(wheelWorlds(dx, e.deltaMode, this.vw));
    }, { passive: false });

    // A mouse click walks at once (the hero's rule). A finger walks on release, unless it swiped sideways.
    canvas.addEventListener("pointerdown", e => {
      if (this.locked || !this.inWindow(e.clientX, e.clientY)) return;
      st.focus({ preventScroll: true });
      if (this.cardOpen()) return;
      if (e.pointerType !== "touch") { this.tapAt(e.clientX, e.clientY); return; }
      this.touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, pos0: this.pos, swiping: false };
    });
    canvas.addEventListener("pointermove", e => {
      const t = this.touch;
      if (!t || t.id !== e.pointerId || this.shot) return;
      const dx = e.clientX - t.x0, dy = e.clientY - t.y0;
      if (!t.swiping && Math.abs(dx) > SWIPE_START_PX && Math.abs(dx) > Math.abs(dy)) {
        t.swiping = true;
        this.finishJump();
        t.pos0 = this.pos + dx / this.vw; // no jump when the swipe starts past the dead zone
        try { canvas.setPointerCapture(e.pointerId); } catch { /* the pointer already left */ }
      }
      if (t.swiping) {
        // Content follows the finger: dragging left brings the next season in from the right.
        this.hold = false;
        this.pos = wrap(t.pos0 - dx / this.vw);
        this.idle = 0;
        this.hideTitle(); this.hideHint();
      }
    });
    const release = (e: PointerEvent, cancelled: boolean) => {
      const t = this.touch;
      if (!t || t.id !== e.pointerId) return;
      this.touch = null;
      if (t.swiping) { this.idle = SETTLE_DELAY - 0.12; return; } // lifting a finger is stopping
      if (!cancelled && Math.hypot(e.clientX - t.x0, e.clientY - t.y0) <= SWIPE_START_PX) this.tapAt(e.clientX, e.clientY);
    };
    canvas.addEventListener("pointerup", e => release(e, false));
    canvas.addEventListener("pointercancel", e => release(e, true));

    $("#heroWalk")?.addEventListener("click", () => { this.hideTitle(); st.focus({ preventScroll: true }); this.toast("Tap the ground to walk"); });
    $("#heroTour")?.addEventListener("click", () => this.tourGo(0));
    $("#miniTitle")?.addEventListener("click", () => { $("#titleCard").hidden = false; $("#miniTitle").hidden = true; });
    $("#scrim")?.addEventListener("pointerdown", () => this.closeCard());
  }
  /** The canvas can be bigger than what is on show (the homepage card): only the shown part is the map. */
  private inWindow(clientX: number, clientY: number) {
    if (!this.win) return true;
    const r = this.stage.getBoundingClientRect(), w = this.win;
    const x = clientX - r.left, y = clientY - r.top;
    return x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h;
  }
  private tapAt(clientX: number, clientY: number) {
    if (this.cardOpen() || this.locked) return;
    this.hideTitle();
    const r = this.stage.getBoundingClientRect();
    const { cx, cy, z } = this.frameNow;
    const tx = Math.floor((clientX - r.left) / z / this.T + cx / this.T);
    const ty = Math.floor((clientY - r.top) / z / this.T + cy / this.T);
    if (!this.map.inBounds(tx, ty)) return;
    const below = this.map.stopAt(tx, ty + 1);
    const stop = this.map.stopAt(tx, ty) ?? (below?.kind === "npc" ? below : undefined);
    if (stop) { if (!this.player.walkToStop(stop)) this.toast("No way through from here"); return; }
    if (!this.map.walkable(tx, ty)) { this.toast(groundAt(tx, ty) === Ground.Sea ? this.theme.lines.barrier : this.theme.lines.blocked); return; }
    if (!this.player.walkTo(tx, ty)) this.toast("Can’t reach that spot");
  }
  private keyDir(): Facing | null {
    const k = this.keys;
    if (k.has("arrowup") || k.has("w")) return "up";
    if (k.has("arrowdown") || k.has("s")) return "down";
    if (k.has("arrowleft") || k.has("a")) return "left";
    if (k.has("arrowright") || k.has("d")) return "right";
    return null;
  }
  private hideTitle() { const t = $("#titleCard"); if (!t || t.hidden) return; t.hidden = true; $("#miniTitle").hidden = false; }

  /* ---------- tour ---------- */
  private bindTour() {
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
    [...$("#dots").children].forEach((d, i) => { d.classList.toggle("on", this.visited.has(this.stops[i].id)); d.classList.toggle("here", i === this.tourIndex); });
  }
  private tourGo(i: number) {
    this.hideTitle();
    if (this.tourIndex < 0) track("tour_start");
    this.tourIndex = i >= this.stops.length ? 0 : Math.max(0, i);
    this.closeCard(); this.renderTour();
    if (!this.player.walkToStop(this.stops[this.tourIndex])) this.toast("No way through from here");
  }

  /* ---------- cards (the hero's, unchanged) ---------- */
  private cardOpen() { return !$("#card").hidden; }
  private openCard(s: Stop) {
    const firstTime = !this.visited.has(s.id);
    this.visited.add(s.id);
    saveVisited(this.visited);
    track("tour_stop", { id: s.id, first: firstTime, found: this.visited.size });
    const complete = this.stops.every(x => this.visited.has(x.id));
    if (complete && firstTime) track("tour_complete");
    this.player.cancelRoute();
    this.touch = null;
    this.tourIndex = this.stops.indexOf(s); this.renderTour();
    const card = $("#card");
    card.replaceChildren();

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
    const finale = complete && (firstTime || !!s.last);
    if (finale) h.after(this.finale());
    else if (s.showTiers) body.append(this.tiers());

    const acts = el("div", "actions");
    const nextMissing = () => {
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

    card.append(art, body, acts);
    const wasOpen = !card.hidden;
    card.hidden = false; $("#scrim").hidden = false;
    if (!wasOpen) { card.classList.remove("enter"); void card.offsetWidth; card.classList.add("enter"); }
    acts.querySelector<HTMLElement>(".btn")?.focus({ preventScroll: true });
  }
  private tiers(): HTMLElement {
    const g = el("div", "tiers");
    this.offer.tiers.forEach(t => {
      const d = el("div", t.star ? "star" : null);
      d.append(el("b", null, t.short), el("span", null, formatMoney(LADDERS[ACTIVE_LADDER].editions[t.id].founder[currentCurrency()], currentCurrency())), el("em", null, t.copy[ACTIVE_LADDER].friends));
      g.append(d);
    });
    return g;
  }
  private finale(): HTMLElement {
    const unlocked = unlockPerk();
    const box = el("div", "finale");
    box.append(el("p", "eyebrow", `Tour complete · ${this.stops.length}/${this.stops.length}`));
    if (perkActive(unlocked)) {
      const days = perkDaysLeft(unlocked);
      box.append(el("b", null, "Beach tour bonus unlocked"));
      box.append(el("p", null, `Order within ${days} day${days === 1 ? "" : "s"} and all 12 party minigames come at no extra cost. Ultimate already has all 12, so there Party Mode is free instead (or 3 custom items, if not everyone is 18+). It's applied for you when you order.`));
    } else {
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
    if (this.toastLeft > 0) { this.toastLeft -= dt; if (this.toastLeft <= 0) $("#toast").hidden = true; }
    this.measureFps(dt);

    const was = this.shot;
    this.shot = this.director?.(dt) ?? null;
    const shot = this.shot;
    if (shot && !was) { this.keys.clear(); this.touch = null; this.walkGoal = null; }
    // The film owns the map: an open card closes the moment the visitor scrolls on.
    if (this.locked && this.cardOpen()) this.closeCard();
    if (shot) {
      // Directed: the director owns the worlds. The picked world (pos) waits for the map to come back.
    } else if (this.jump) {
      this.jump.t += dt;
      if (this.jump.t >= JUMP_SECONDS) this.finishJump();
    } else if (!this.touch?.swiping && !this.hold) {
      this.idle += dt;
      if (this.idle >= SETTLE_DELAY && this.pos !== Math.round(this.pos)) {
        this.pos = wrap(settleStep(this.pos, this.lowPower ? dt * 2 : dt));
      }
    }
    this.onDominantChange();
    const f = this.blend().f;
    if (!this.jump && (f === 0 || f === 1)) this.warmOneLayer();
    this.paintMarker();

    if (shot && this.locked) {
      // Rico walks where the film wants him, with his own walk, and only re-routes when the goal moves.
      const goal = shot.walkTo ?? null;
      if (goal && shot.snap) {
        const pl = this.player;
        pl.cancelRoute(); pl.x = pl.fx = goal[0]; pl.y = pl.fy = goal[1]; pl.moving = false; pl.t = 1;
        this.walkGoal = goal;
      }
      if (goal && (!this.walkGoal || goal[0] !== this.walkGoal[0] || goal[1] !== this.walkGoal[1])) {
        this.walkGoal = goal;
        if (goal[0] !== this.player.x || goal[1] !== this.player.y || this.player.path.length) this.player.walkTo(goal[0], goal[1]);
      }
      this.player.update(dt, null, false);
      if (shot.faceWhenStill && !this.player.moving && !this.player.path.length) this.player.facing = shot.faceWhenStill;
      return;
    }
    // Exploring hands Rico back; the next film frame routes him again from wherever he got to.
    if (shot) this.walkGoal = null;
    if (this.cardOpen()) return;
    const arrived = this.player.update(dt, this.keyDir(), this.keys.has("shift"));
    if (arrived) this.openCard(arrived);
  }
  private measureFps(dt: number) {
    if (this.fpsChecked || document.hidden) return;
    this.fpsFrames++; this.fpsTime += dt;
    if (this.fpsTime >= FPS_SAMPLE_SECONDS) {
      this.fpsChecked = true;
      if (this.fpsFrames / this.fpsTime < LOW_FPS) this.lowPower = true;
    }
  }
  /** Two worlds a frame is the expensive part. A device that can't hold BLEND_FPS_MIN gets the softer blend. */
  private measureBlend(dt: number) {
    if (this.blendForced || this.softBlend || document.hidden) return;
    this.blendFrames++; this.blendTime += dt;
    if (this.blendTime >= BLEND_SAMPLE_SECONDS) {
      if (this.blendFrames / this.blendTime < BLEND_FPS_MIN) { this.softBlend = true; this.sizeBuffers(); }
      this.blendFrames = 0; this.blendTime = 0;
    }
  }
  private npcFacing(s: Stop, me: { x: number; y: number }): Facing {
    const dx = me.x - s.x, dy = me.y - s.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) return "down";
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }

  /** The camera as last drawn: canvas top-left in world pixels, and zoom. */
  private frameNow = { cx: 0, cy: 0, z: 1 };

  private render() {
    if (!this.visible || this.vw === 0) return;
    const t0 = performance.now();
    const { ctx, T, vw, vh, dpr, player } = this;
    const win = this.win ?? { x: 0, y: 0, w: vw, h: vh };
    const shot = this.shot;
    const offX = this.cardOpen() && win.w > WIDE_CARD_MIN_WIDTH ? 200 : 0;
    if (shot) {
      // Directed: exact, no easing (the director smooths its own progress). Rico's side is read after his step.
      const p = this.playerCentre(), f = shot.follow ?? 0;
      this.zoom = shot.z;
      this.cam.x = shot.cx * T * (1 - f) + (p.x + (shot.ox ?? 0) * T + offX / shot.z) * f;
      this.cam.y = shot.cy * T * (1 - f) + (p.y + (shot.oy ?? 0) * T) * f;
    } else {
      const p = this.playerCentre();
      const k = Math.min(1, this.dt * 8);
      this.cam.x += (p.x + offX - this.cam.x) * k; this.cam.y += (p.y - this.cam.y) * k;
      this.zoom = Math.abs(this.zoom - 1) < 0.002 ? 1 : Math.exp(Math.log(this.zoom) * (1 - k));
    }
    const z = this.zoom, mw = W * T, mh = H * T;
    // Keep what the window shows inside the map (or centre a map smaller than the window).
    const ww = win.w / z, wh = win.h / z;
    this.cam.x = mw <= ww ? mw / 2 : Math.max(ww / 2, Math.min(mw - ww / 2, this.cam.x));
    this.cam.y = mh <= wh ? mh / 2 : Math.max(wh / 2, Math.min(mh - wh / 2, this.cam.y));
    const px = dpr * z;
    const cx = Math.round((this.cam.x - (win.x + win.w / 2) / z) * px) / px;
    const cy = Math.round((this.cam.y - (win.y + win.h / 2) / z) * px) / px;
    this.frameNow = { cx, cy, z };
    const view: View = {
      x0: Math.max(0, Math.floor(cx / T)), y0: Math.max(0, Math.floor(cy / T)),
      x1: Math.min(W - 1, Math.floor((cx + vw / z) / T)), y1: Math.min(H - 1, Math.floor((cy + vh / z) / T)),
      cx, cy, vw: vw / z, vh: vh / z,
    };

    const { a, b, f } = this.blend();
    const blending = f > 0 && f < 1;
    if (!blending) {
      this.drawWorld(ctx, f >= 1 ? b : a, view, dpr);
    } else if (this.softBlend) {
      // Both worlds at the lower resolution, then scaled up together.
      const s = this.blendDpr();
      this.sizeBuffers();
      this.drawWorld(this.bufA.getContext("2d")!, a, view, s);
      this.drawWorld(this.bufB.getContext("2d")!, b, view, s);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(this.bufA, 0, 0, vw, vh);
      ctx.globalAlpha = f; ctx.drawImage(this.bufB, 0, 0, vw, vh); ctx.globalAlpha = 1;
    } else {
      // The first world straight onto the screen, the second into a buffer laid over it at the blend fraction.
      this.drawWorld(ctx, a, view, dpr);
      this.sizeBuffers();
      this.drawWorld(this.bufB.getContext("2d")!, b, view, dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = f; ctx.drawImage(this.bufB, 0, 0, vw, vh); ctx.globalAlpha = 1;
    }

    // Markers and the talk prompt are the same in every world: drawn once, sharp, over the blend.
    // A film has neither; a film the visitor is exploring fades them in.
    const awake = shot ? Math.max(0, Math.min(1, shot.explore ?? 0)) : 1;
    ctx.setTransform(px, 0, 0, px, -cx * px, -cy * px);
    if (awake > 0.01) {
      ctx.globalAlpha = awake;
      this.stops.forEach(s => drawMarker(ctx, T, s, this.visited.has(s.id), this.time));
      ctx.globalAlpha = 1;
      const facing = awake > 0.5 ? player.facingStop() : undefined;
      if (facing) {
        const name = facing.who ? this.squad.get(facing.who)?.name : undefined;
        const label = (this.focused ? "E · " : "Tap · ") + (facing.kind === "npc" && name ? `Talk to ${name}` : "Read the sign");
        drawPrompt(ctx, T, label, player.x, player.y);
      }
    }
    if (shot?.talking) this.drawSpeechMark(ctx, shot.talking);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ms = performance.now() - t0;
    this.perf.frames++;
    if (blending) { this.perf.blendFrames++; this.perf.blendMs += ms; this.measureBlend(this.dt); }
    else { this.perf.settledFrames++; this.perf.settledMs += ms; }
  }
  /** A little speech bubble over whoever has the dialogue box, so you can see who is talking. */
  private drawSpeechMark(ctx: CanvasRenderingContext2D, who: string) {
    const T = this.T;
    let x: number, top: number;
    if (who === "rico") { x = this.player.drawX; top = this.player.drawY * T - T * 1.2; }
    else {
      const s = this.stops.find(q => q.id === who);
      if (!s) return;
      x = s.x; top = s.kind === "npc" ? s.y * T - T * 1.2 : s.y * T - T * 0.5;
    }
    const w = T * 0.62, h = T * 0.4, r = h * 0.35;
    const bob = Math.sin(this.time * 5) * T * 0.04;
    ctx.save();
    ctx.translate(x * T + T / 2, top + bob);
    ctx.fillStyle = "#fdf6e3"; ctx.strokeStyle = "#20242c"; ctx.lineWidth = Math.max(2, T / 22);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, h, r);
    ctx.moveTo(-T * 0.08, 0); ctx.lineTo(0, T * 0.12); ctx.lineTo(T * 0.08, 0);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fdf6e3"; ctx.fillRect(-T * 0.07, -ctx.lineWidth, T * 0.14, ctx.lineWidth * 1.5);
    ctx.fillStyle = "#20242c";
    for (let i = -1; i <= 1; i++) {
      const lift = Math.max(0, Math.sin(this.time * 6 - i * 0.9)) * T * 0.03;
      ctx.beginPath(); ctx.arc(i * w * 0.24, -h / 2 - lift, T * 0.045, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  /** Everything one world draws, with the squad in it, at `scale` device pixels per CSS pixel. */
  private drawWorld(ctx: CanvasRenderingContext2D, theme: Theme, view: View, scale: number) {
    const { T, player } = this;
    const shot = this.shot, z = this.zoom;
    const vw = this.vw, vh = this.vh;
    const smooth = !shot?.crisp;
    const animated = !this.lowPower, t = animated ? this.time : 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = theme.stageBg; ctx.fillRect(0, 0, vw, vh);
    const k = scale * z;
    ctx.setTransform(k, 0, 0, k, -view.cx * k, -view.cy * k);
    ctx.imageSmoothingEnabled = smooth; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this.layerFor(theme), 0, 0, W * T, H * T);
    ctx.imageSmoothingEnabled = true;
    theme.live?.(ctx, T, this.time, animated, view);
    if (player.target && !this.locked) drawTarget(ctx, T, player.target[0], player.target[1], this.time);

    const me = { x: player.drawX, y: player.drawY, facing: player.facing, moving: player.moving && player.t < 0.5, step: player.step };
    const img = (key: string) => this.sprites.get(`${theme.id}:${key}`);
    const items: [number, () => void][] = [];
    PALMS.forEach(([x, y]) => items.push([y + 1, () => theme.tall(ctx, T, x, y, t, img)]));
    PARASOLS.forEach(([x, y]) => items.push([y + 1, () => theme.small(ctx, T, x, y, t)]));
    this.stops.forEach(s => items.push([s.y + 1, () => s.kind === "npc" && s.who
      ? this.person(ctx, s.who, theme, s.x * T, s.y * T, this.npcFacing(s, me), false, 0, smooth)
      : theme.sign(ctx, T, s)]));
    items.push([me.y + 1.01, () => this.person(ctx, "rico", theme, me.x * T, me.y * T, me.facing, me.moving, me.step % 2, smooth)]);
    items.sort((p, q) => p[0] - q[0]).forEach(([, draw]) => draw());
    theme.grade?.(ctx, T, view);
    if (theme.lights) { ctx.save(); theme.lights(ctx, T, this.time, animated, view); ctx.restore(); }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (theme.screen) { ctx.save(); theme.screen(ctx, vw, vh, this.time, animated); ctx.restore(); }
  }
  private person(ctx: CanvasRenderingContext2D, who: string, theme: Theme, px: number, py: number, facing: Facing, stepping: boolean, parity: number, smooth: boolean) {
    ctx.imageSmoothingEnabled = smooth;
    drawCharacter(ctx, this.T, this.walkSprite(who, theme), px, py, facing, stepping, parity);
    ctx.imageSmoothingEnabled = true;
  }
}

function readStored(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function writeStored(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* not saved */ } }
