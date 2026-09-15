// The end-of-tour showcase (plan 18 phase 3): the game playing itself, in the beach stage, before the last CTA.
//   1. BLACKJACK plays itself: a scripted hand at Kai's table, watch only.
//   2. A KART LAP drives itself for ~20 s on the game's real circuit, chasing the ghost.
//   3. "Take the wheel": one lap to steer yourself (auto-throttle, so a phone needs only left and right).
// TODO (owner, 15 Sep 2026): a talking-face intro goes FIRST here, once the new voice-over is recorded. Not built.
//
// Everything is drawn on one canvas off the page's own clock (requestAnimationFrame), paused while the tab is hidden.
import { el } from "../dom";
import { orderAsset } from "../order/catalogue";
import { track } from "../shared/analytics";
import { KART_H, KART_W, LAP_TILES, LapCounter, nearest, onTrack, poseAt, dirForHeading, type Dir } from "./kartLap";

const W = 640, H = 400;
const UI = '"Pixelify Sans","Trebuchet MS",sans-serif';
const BJ_SECONDS = 12.5;
const AUTO_LAP_SECONDS = 20;
/** Your lap: you can win it, but not by accident. */
const PLAY_SPEED = 15, OFF_TRACK = 0.5, TURN_RATE = 3.1, GHOST_PLAY_SECONDS = 27, PLAY_LIMIT = 90;
const TILE = 24; // the baked circuit is 16 px a tile, drawn at 1.5x

type Phase = "blackjack" | "kart" | "ready" | "countdown" | "play" | "done";

interface Card { at: number; seat: "rico" | "coco" | "dealer"; file: string; value: number; hidden?: boolean }

// One hand, told by the cards. Rico stands on 17, Coco hits 11 into 21, the dealer busts.
const HAND: Card[] = [
  { at: 0.4, seat: "rico", file: "hearts_K", value: 10 },
  { at: 0.8, seat: "coco", file: "clubs_5", value: 5 },
  { at: 1.2, seat: "dealer", file: "spades_10", value: 10 },
  { at: 1.6, seat: "rico", file: "diamonds_7", value: 7 },
  { at: 2.0, seat: "coco", file: "diamonds_6", value: 6 },
  { at: 2.4, seat: "dealer", file: "hearts_6", value: 6, hidden: true },
  { at: 5.0, seat: "coco", file: "hearts_10", value: 10 },
  { at: 8.0, seat: "dealer", file: "clubs_9", value: 9 },
];
const FLIP_AT = 6.6;
const CAPTIONS: [number, string][] = [
  [0, "Kai deals you in"], [3.0, "Rico has 17. He stands."], [4.1, "Coco has 11. She hits…"], [5.4, "21!"],
  [6.6, "Kai turns over 16. He has to hit…"], [8.4, "Bust! Kai has 25."], [9.4, "Rico and Coco win the hand"],
];

export class Showcase {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private readonly actions: HTMLElement;
  private readonly images = new Map<string, HTMLImageElement>();
  private phase: Phase = "blackjack";
  private t = 0;
  private last = 0;
  private raf = 0;
  private keys = new Set<string>();
  private steer = 0; // on-screen buttons: -1, 0, 1
  // Your lap
  private car = { x: 0, y: 0, heading: 0, speed: 0 };
  private lap = new LapCounter(0);
  private lapTime = 0;
  private cam = { x: 0, y: 0 };

  constructor(private readonly stage: HTMLElement, private readonly onClose: () => void) {
    this.root = el("section", "showcase");
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-label", "The game playing itself: a blackjack hand and a kart lap");
    const head = el("div", "sc-head");
    const title = el("b", null, "The game, playing itself");
    const close = el("button", "close", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "Close");
    close.onclick = () => this.close();
    head.append(title, close);
    this.canvas = el("canvas");
    this.canvas.width = W * 2;
    this.canvas.height = H * 2;
    this.canvas.setAttribute("aria-hidden", "true");
    this.g = this.canvas.getContext("2d")!;
    this.actions = el("div", "sc-actions");
    // The canvas sits in a box that takes the room left between the header and the buttons; on its own in a flex
    // column its intrinsic size pushes the buttons out of the stage.
    const box = el("div", "sc-canvas");
    box.append(this.canvas);
    this.root.append(head, box, this.actions);
    this.root.addEventListener("keydown", this.onKey);
    this.root.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));
    for (const f of [...HAND.map(c => `card_${c.file}.webp`), "card_back.webp", "pv_kart_full.webp", "pv_car_red.webp", "pv_car_blue.webp"]) this.load(orderAsset(f));
    for (const who of ["kai", "rico", "coco"]) this.load(`assets/${who}_face.webp`);
  }

  open(): void {
    this.stage.append(this.root);
    this.root.tabIndex = -1;
    this.root.focus({ preventScroll: true });
    track("showcase_open");
    this.setPhase("blackjack");
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    // ?debug, like the beach: step it by hand in a tab whose animation frames are paused.
    if (new URLSearchParams(location.search).has("debug")) Object.assign(window, { __showcase: this });
  }

  /** Advance and draw one frame by hand (debugging only). */
  step(dt = 1 / 60) { this.update(dt); this.draw(); }

  close(): void {
    cancelAnimationFrame(this.raf);
    this.root.remove();
    this.onClose();
  }

  private load(url: string) {
    const img = new Image();
    img.src = url;
    this.images.set(url, img);
  }
  private img(url: string) {
    const i = this.images.get(url);
    return i && i.complete && i.naturalWidth ? i : null;
  }

  private setPhase(p: Phase) {
    this.phase = p;
    this.t = 0;
    this.actions.replaceChildren();
    const btn = (label: string, cls: string, fn: () => void) => {
      const b = el("button", cls, label);
      b.type = "button";
      b.onclick = fn;
      this.actions.append(b);
      return b;
    };
    const build = () => {
      const a = el("a", "btn", "Start building ▶");
      a.href = "order.html?from=beach";
      a.dataset.track = "showcase_to_builder";
      a.dataset.trackPhase = this.phase;
      this.actions.append(a);
    };
    if (p === "blackjack") btn("Skip ▶", "btn ghost", () => this.setPhase("kart"));
    if (p === "kart") { btn("Take the wheel ▶", "btn", () => this.startPlay()); build(); }
    if (p === "ready" || p === "done") { btn(p === "done" ? "Drive it again ↺" : "Take the wheel ▶", "btn", () => this.startPlay()); build(); }
    if (p === "countdown" || p === "play") {
      const hold = (label: string, dir: number) => {
        const b = btn(label, "btn ghost sc-steer", () => {});
        b.setAttribute("aria-label", dir < 0 ? "Steer left" : "Steer right");
        const on = (e: Event) => { e.preventDefault(); this.steer = dir; };
        const off = () => { if (this.steer === dir) this.steer = 0; };
        b.addEventListener("pointerdown", on);
        for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, off);
      };
      hold("◀ Left", -1);
      this.actions.append(el("span", "sc-hint", "or ← → / A D"));
      hold("Right ▶", 1);
    }
  }

  private startPlay() {
    const start = poseAt(0);
    this.car = { x: start.x, y: start.y, heading: start.heading, speed: 0 };
    this.lap = new LapCounter(nearest(start.x, start.y).along);
    this.lapTime = 0;
    this.keys.clear();
    this.steer = 0;
    track("showcase_take_wheel");
    this.setPhase("countdown");
    this.root.focus({ preventScroll: true });
  }

  private onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.key === "Escape") { this.close(); return; }
    if (this.phase === "play" || this.phase === "countdown") {
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d"].includes(k)) { e.preventDefault(); this.keys.add(k); }
    }
    e.stopPropagation(); // the beach behind must not walk while this is up
  };

  private frame = (now: number) => {
    const dt = document.hidden ? 0 : Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.t += dt;
    if (this.phase === "blackjack" && this.t >= BJ_SECONDS) { track("showcase_blackjack_done"); this.setPhase("kart"); }
    if (this.phase === "kart" && this.t >= AUTO_LAP_SECONDS) { track("showcase_kart_auto_done"); this.setPhase("ready"); }
    if (this.phase === "countdown" && this.t >= 1.8) this.setPhase("play");
    if (this.phase === "play") this.drive(dt);
  }

  private drive(dt: number) {
    const k = this.keys;
    const steer = (k.has("arrowleft") || k.has("a") ? -1 : 0) + (k.has("arrowright") || k.has("d") ? 1 : 0) || this.steer;
    const c = this.car;
    const top = PLAY_SPEED * (onTrack(c.x, c.y) ? 1 : OFF_TRACK);
    c.speed += (top - c.speed) * Math.min(1, dt * 2.2);
    c.heading += steer * TURN_RATE * dt * Math.min(1, c.speed / 6);
    c.x = Math.max(1, Math.min(KART_W - 1, c.x + Math.cos(c.heading) * c.speed * dt));
    c.y = Math.max(1, Math.min(KART_H - 1, c.y + Math.sin(c.heading) * c.speed * dt));
    this.lapTime += dt;
    const done = this.lap.update(c.x, c.y);
    if (done >= LAP_TILES - 2 || this.lapTime >= PLAY_LIMIT) {
      track("showcase_lap_done", { seconds: Math.round(this.lapTime * 10) / 10, finished: done >= LAP_TILES - 2 });
      this.setPhase("done");
    }
  }

  /* ---------- drawing ---------- */
  private draw() {
    const g = this.g;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.imageSmoothingEnabled = false;
    if (this.phase === "blackjack") this.drawBlackjack();
    else this.drawKart();
  }

  private caption(text: string, y = H - 34) {
    const g = this.g;
    g.font = `700 20px ${UI}`;
    const w = g.measureText(text).width + 28;
    g.fillStyle = "rgba(32,36,44,.88)";
    g.beginPath(); g.roundRect((W - w) / 2, y - 22, w, 34, 8); g.fill();
    g.fillStyle = "#fdf6e3";
    g.textAlign = "center";
    g.fillText(text, W / 2, y + 2);
    g.textAlign = "left";
  }

  private drawBlackjack() {
    const g = this.g, t = this.t;
    g.fillStyle = "#1f6b4a"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(255,255,255,.18)"; g.lineWidth = 3;
    g.beginPath(); g.ellipse(W / 2, 30, 300, 280, 0, 0, Math.PI); g.stroke();
    g.fillStyle = "rgba(255,255,255,.22)"; g.font = `700 15px ${UI}`; g.textAlign = "center";
    g.fillText("BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON 17", W / 2, 150);
    g.textAlign = "left";

    const seats = { dealer: { x: W / 2, y: 60, face: "kai", name: "Kai (dealer)" }, rico: { x: 170, y: 250, face: "rico", name: "Rico" }, coco: { x: 470, y: 250, face: "coco", name: "Coco" } } as const;
    const shoe = { x: W - 70, y: 40 };
    const CARD = 84, GAP = 34;
    for (const [id, s] of Object.entries(seats) as [keyof typeof seats, (typeof seats)[keyof typeof seats]][]) {
      const face = this.img(`assets/${s.face}_face.webp`);
      const fy = id === "dealer" ? s.y - 40 : s.y + 78;
      g.fillStyle = "#fdf6e3";
      g.beginPath(); g.arc(s.x - 90, fy + 22, 26, 0, Math.PI * 2); g.fill();
      if (face) { g.save(); g.beginPath(); g.arc(s.x - 90, fy + 22, 24, 0, Math.PI * 2); g.clip(); g.imageSmoothingEnabled = true; g.drawImage(face, s.x - 114, fy - 2, 48, 48); g.restore(); g.imageSmoothingEnabled = false; }
      const mine = HAND.filter(c => c.seat === id && c.at <= t);
      const total = mine.reduce((n, c) => n + (c.hidden && t < FLIP_AT ? 0 : c.value), 0);
      g.fillStyle = "#fdf6e3"; g.font = `700 16px ${UI}`;
      g.fillText(`${s.name}${mine.length ? ` · ${total}${id === "dealer" && t < FLIP_AT && mine.length > 1 ? "+?" : ""}` : ""}`, s.x - 58, fy + 28);
      mine.forEach((c, i) => {
        const k = Math.min(1, (t - c.at) / 0.35);
        const e = 1 - (1 - k) ** 3;
        const tx = s.x - CARD / 2 + (i - (mine.length - 1) / 2) * GAP + 20;
        const ty = id === "dealer" ? s.y : s.y - 30;
        const x = shoe.x + (tx - shoe.x) * e, y = shoe.y + (ty - shoe.y) * e;
        const face = c.hidden && t < FLIP_AT ? this.img(orderAsset("card_back.webp")) : this.img(orderAsset(`card_${c.file}.webp`));
        if (face) g.drawImage(face, x, y, CARD, CARD);
      });
    }
    const cap = [...CAPTIONS].reverse().find(([at]) => t >= at);
    if (cap) this.caption(cap[1], cap[0] >= 9.4 ? H / 2 + 10 : H - 34);
  }

  private carSprite(file: string, x: number, y: number, dir: Dir, alpha: number) {
    const im = this.img(orderAsset(file));
    if (!im) return;
    const row = { down: 0, up: 1, left: 2, right: 3 }[dir];
    const cell = im.width / 4, size = TILE * 3;
    this.g.globalAlpha = alpha;
    this.g.drawImage(im, (Math.floor(this.t * 12) % 4) * cell, row * cell, cell, cell, x * TILE - this.cam.x - size / 2, y * TILE - this.cam.y - size / 2, size, size);
    this.g.globalAlpha = 1;
  }

  private drawKart() {
    const g = this.g, t = this.t;
    const auto = this.phase === "kart" || this.phase === "ready";
    const me = auto ? poseAt((t / AUTO_LAP_SECONDS) * LAP_TILES) : { x: this.car.x, y: this.car.y, dir: dirForHeading(this.car.heading) };
    const ghostSeconds = auto ? AUTO_LAP_SECONDS : GHOST_PLAY_SECONDS;
    // Watching, the ghost runs just ahead; driving, it laps in GHOST_PLAY_SECONDS from your start and waits at the line.
    const ghost = auto ? poseAt(((t + 0.6) / AUTO_LAP_SECONDS) * LAP_TILES) : poseAt(Math.min(1, this.lapTime / GHOST_PLAY_SECONDS) * (LAP_TILES - 0.01));
    const tx = Math.max(0, Math.min(KART_W * TILE - W, me.x * TILE - W / 2));
    const ty = Math.max(0, Math.min(KART_H * TILE - H, me.y * TILE - H / 2));
    this.cam.x += (tx - this.cam.x) * 0.25; this.cam.y += (ty - this.cam.y) * 0.25;
    g.fillStyle = "#c9a56a"; g.fillRect(0, 0, W, H);
    const bg = this.img(orderAsset("pv_kart_full.webp"));
    g.imageSmoothingEnabled = true;
    if (bg) g.drawImage(bg, -this.cam.x, -this.cam.y, bg.width * 1.5, bg.height * 1.5);
    this.carSprite("pv_car_blue.webp", ghost.x, ghost.y, ghost.dir, 0.5);
    this.carSprite("pv_car_red.webp", me.x, me.y, me.dir, 1);
    g.imageSmoothingEnabled = false;

    // HUD
    g.fillStyle = "rgba(32,36,44,.85)"; g.beginPath(); g.roundRect(12, 12, 250, 50, 8); g.fill();
    g.fillStyle = "#fdf6e3"; g.font = `700 16px ${UI}`;
    const secs = auto ? Math.min(t, AUTO_LAP_SECONDS) : this.lapTime;
    g.fillText(`LAP ${secs.toFixed(1)}s`, 24, 34);
    g.fillStyle = "#9fd6e4"; g.font = `500 13px ${UI}`;
    g.fillText(`Ghost lap ${ghostSeconds.toFixed(1)}s`, 24, 52);
    if (!auto) {
      const pct = Math.min(1, this.lap.distance / LAP_TILES);
      g.fillStyle = "rgba(32,36,44,.85)"; g.fillRect(W - 172, 22, 156, 14);
      g.fillStyle = "#f2b233"; g.fillRect(W - 170, 24, 152 * pct, 10);
    }

    if (this.phase === "kart") this.caption(t < 6 ? "Beat the ghost lap round a real circuit" : t < 13 ? "Your mates in the cars, your town round the track" : "Or take the wheel yourself…");
    if (this.phase === "ready") this.caption("Your turn: one lap, steer with ← →");
    if (this.phase === "countdown") this.caption(t < 0.6 ? "3" : t < 1.2 ? "2" : "1", H / 2);
    if (this.phase === "play" && !onTrack(this.car.x, this.car.y)) this.caption("Sand slows you down");
    if (this.phase === "done") {
      const finished = this.lap.distance >= LAP_TILES - 2;
      const won = finished && this.lapTime < GHOST_PLAY_SECONDS;
      this.caption(!finished ? "Out of time. The ghost is still out there." : won ? `${this.lapTime.toFixed(1)}s. You beat the ghost!` : `${this.lapTime.toFixed(1)}s. The ghost wins this one.`, H / 2);
    }
  }
}
