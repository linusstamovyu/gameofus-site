// The walkable beach in the hero: tap to walk, a guided tour, and a card per stop.
import type { Offer, SquadMember, Stop } from "../content/types";
import { $, asset, el, photoPair } from "../dom";
import { ACTIVE_LADDER, LADDERS, formatMoney } from "../order/prices";
import { drawCharacter, drawMarker, drawPalm, drawParasol, drawPrompt, drawSign, drawTarget } from "./draw";
import { BeachMap, Ground, H, PALMS, PARASOLS, W, groundAt } from "./map";
import { paintSea, paintStaticLayer } from "./paint";
import { Player, type Facing } from "./player";

const LOW_FPS = 24;          // below this, sea and palms stop animating
const FPS_SAMPLE_SECONDS = 4;
const WIDE_CARD_MIN_WIDTH = 980; // card sits beside the lad, so the camera shifts over

export class BeachWorld {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly map: BeachMap;
  private readonly player: Player;
  private readonly squad = new Map<string, SquadMember>();
  private readonly sprites = new Map<string, HTMLImageElement>();
  private readonly visited = new Set<string>();
  private readonly keys = new Set<string>();
  private T = 48; private dpr = 1; private vw = 0; private vh = 0;
  private layer: HTMLCanvasElement | null = null;
  private cam = { x: 0, y: 0 };
  private time = 0; private last = performance.now(); private dt = 0;
  private focused = false; private tourIndex = -1; private toastLeft = 0;
  private lowPower = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private fpsFrames = 0; private fpsTime = 0; private fpsChecked = false;

  constructor(private readonly stage: HTMLElement, private readonly stops: Stop[], squad: SquadMember[], private readonly offer: Offer) {
    const canvas = $<HTMLCanvasElement>("canvas", stage);
    this.ctx = canvas.getContext("2d")!;
    this.map = new BeachMap(stops);
    this.player = new Player(this.map);
    squad.forEach(m => { this.squad.set(m.id, m); this.loadSprite(m.id, m.walk); });
    this.loadSprite("palm", "palm.webp");

    new ResizeObserver(() => this.resize()).observe(stage);
    this.resize();
    document.fonts?.ready.then(() => this.rebuildLayer());
    this.bindInput(canvas);
    this.bindTour();
    requestAnimationFrame(t => this.frame(t));
    // ?debug exposes the world for manual stepping (browsers that pause rAF in background tabs).
    if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __beach: this });
  }

  /** Advance and draw one frame by hand (debugging only). */
  step(dt = 1 / 60) { this.dt = dt; this.update(); this.render(); }

  /* ---------- setup ---------- */
  private loadSprite(key: string, file: string) {
    const img = new Image(); img.src = asset(file); this.sprites.set(key, img);
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
  private rebuildLayer() { this.layer = paintStaticLayer(this.T, this.dpr); }

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
      if (!this.map.walkable(tx, ty)) { this.toast(groundAt(tx, ty) === Ground.Sea ? "Too cold for a swim" : "Can’t walk there"); return; }
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
    const dots = $("#dots");
    this.stops.forEach(() => dots.append(document.createElement("i")));
    $("#next").addEventListener("click", () => this.tourGo(this.tourIndex + 1));
    $("#prev").addEventListener("click", () => this.tourGo(this.tourIndex - 1));
    this.renderTour();
  }
  private renderTour() {
    const s = this.stops[this.tourIndex];
    $("#tourStep").textContent = s ? `Stop ${this.tourIndex + 1} of ${this.stops.length}` : "Guided tour";
    $("#tourName").textContent = s ? s.title : `${this.stops.length} stops on the beach`;
    ($("#prev") as HTMLButtonElement).disabled = this.tourIndex <= 0;
    $("#next").textContent = this.tourIndex < 0 ? "Start ▶" : this.tourIndex >= this.stops.length - 1 ? "Replay ↺" : "Next ▶";
    [...$("#dots").children].forEach((d, i) => d.classList.toggle("on", i <= this.tourIndex));
  }
  private tourGo(i: number) {
    this.hideTitle();
    this.tourIndex = i >= this.stops.length ? 0 : Math.max(0, i);
    this.closeCard(); this.renderTour();
    if (!this.player.walkToStop(this.stops[this.tourIndex])) this.toast("No way through from here");
  }

  /* ---------- cards ---------- */
  private cardOpen() { return !$("#card").hidden; }
  private openCard(s: Stop) {
    this.visited.add(s.id);
    this.player.cancelRoute();
    this.tourIndex = this.stops.indexOf(s); this.renderTour();
    const card = $("#card");
    card.replaceChildren();

    const art = el("div", "art"); art.style.backgroundImage = `url(${asset(s.art)})`;
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
    if (s.text) body.append(el("p", null, s.text));
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
    if (s.showTiers) {
      const g = el("div", "tiers");
      this.offer.tiers.forEach(t => {
        const d = el("div", t.star ? "star" : null);
        d.append(el("b", null, t.short), el("span", null, formatMoney(LADDERS[ACTIVE_LADDER].editions[t.id].founder.DKK, "DKK")), el("em", null, t.copy[ACTIVE_LADDER].friends));
        g.append(d);
      });
      body.append(g);
    }
    const acts = el("div", "actions");
    if (s.last) { const a = el("a", "btn", "See all prices ↓"); a.href = "#prices"; acts.append(a); }
    else { const n = el("button", "btn", "Next stop ▶"); n.onclick = () => this.tourGo(this.tourIndex + 1); acts.append(n); }
    const keep = el("button", "btn ghost", "Keep exploring");
    keep.onclick = () => { this.closeCard(); this.stage.focus({ preventScroll: true }); };
    acts.append(keep);
    body.append(acts);

    card.append(art, body);
    card.hidden = false; $("#scrim").hidden = false;
    card.classList.remove("enter"); void card.offsetWidth; card.classList.add("enter");
    // Keyboard and screen-reader users land on the card's first action, not somewhere behind it.
    acts.querySelector<HTMLElement>(".btn")?.focus({ preventScroll: true });
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

    ctx.fillStyle = "#2f8fb5"; ctx.fillRect(0, 0, vw, vh);
    ctx.save(); ctx.translate(-cx, -cy);
    if (this.layer) ctx.drawImage(this.layer, 0, 0, mw, mh);
    paintSea(ctx, T, this.time, !this.lowPower,
      Math.max(0, Math.floor(cx / T)), Math.max(0, Math.floor(cy / T)),
      Math.min(W - 1, Math.floor((cx + vw) / T)), Math.min(H - 1, Math.floor((cy + vh) / T)));
    if (player.target) drawTarget(ctx, T, player.target[0], player.target[1], this.time);

    const palmTime = this.lowPower ? 0 : this.time;
    const items: [number, () => void][] = [];
    PALMS.forEach(([x, y]) => items.push([y + 1, () => drawPalm(ctx, T, this.sprites.get("palm"), x, y, palmTime)]));
    PARASOLS.forEach(([x, y]) => items.push([y + 1, () => drawParasol(ctx, T, x, y)]));
    this.stops.forEach(s => items.push([s.y + 1, () => s.kind === "npc" && s.who
      ? drawCharacter(ctx, T, this.sprites.get(s.who), s.x * T, s.y * T, this.npcFacing(s), false, 0)
      : drawSign(ctx, T, s)]));
    items.push([player.drawY + 1.01, () => drawCharacter(ctx, T, this.sprites.get("rico"), ppx, ppy, player.facing, player.moving && player.t < 0.5, player.step % 2)]);
    items.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw());
    this.stops.forEach(s => drawMarker(ctx, T, s, this.visited.has(s.id), this.time));

    const facing = player.facingStop();
    if (facing) {
      const name = facing.who ? this.squad.get(facing.who)?.name : undefined;
      const label = (this.focused ? "E · " : "Tap · ") + (facing.kind === "npc" && name ? `Talk to ${name}` : "Read the sign");
      drawPrompt(ctx, T, label, player.x, player.y);
    }
    ctx.restore();
  }
}
