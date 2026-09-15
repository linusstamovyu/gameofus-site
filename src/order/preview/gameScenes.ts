// The Games step's moving card art: one scripted loop per big game, recreating that mechanic from the game's
// own art. Backgrounds are the real zones rendered by the game's tile painters (source/previews), sprites are
// the real sheets; tools/build_site_assets.py shrinks both into order-assets/pv_*. Coordinates are written in
// the game's TILES so each loop can be checked against the zone it was cut from.
import { orderAsset } from "../catalogue";
import type { LoopScene } from "./loop";

type G = CanvasRenderingContext2D;
type Dir = "down" | "up" | "left" | "right";
const W = 360;
const H = 240;
const a = (f: string) => orderAsset(`pv_${f}.webp`);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (x: number, y: number, k: number) => x + (y - x) * k;
const ease = (k: number) => k * k * (3 - 2 * k);
const PIXEL = '"Pixelify Sans","Courier New",monospace';
const UI = '"Trebuchet MS","Segoe UI",sans-serif';

// ---------------------------------------------------------------- shared helpers

interface Pose { x: number; y: number; dir: Dir; moving: boolean; dist: number }

/** Walk a key list [time, tx, ty] (straight segments, one axis at a time reads best). Holding = same tile twice. */
function path(t: number, keys: readonly (readonly [number, number, number])[], idleDir: Dir = "down"): Pose {
  let dist = 0;
  let dir: Dir = idleDir;
  for (let n = 0; n < keys.length - 1; n++) {
    const [t0, x0, y0] = keys[n];
    const [t1, x1, y1] = keys[n + 1];
    const len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    if (len > 0) dir = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? (x1 > x0 ? "right" : "left") : y1 > y0 ? "down" : "up";
    if (t < t1) {
      const k = clamp((t - t0) / (t1 - t0), 0, 1);
      return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), dir, moving: len > 0 && t >= t0, dist: dist + len * k };
    }
    dist += len;
  }
  const [, x, y] = keys[keys.length - 1];
  return { x, y, dir, moving: false, dist };
}

/** A 9-cell overworld sheet (down/up/left idle+2 steps, right = mirrored left), drawn one tile wide, two tall. */
function walker(g: G, sheet: HTMLImageElement, p: Pose, px: number, py: number, tile: number, face: Dir = p.dir): void {
  const cw = sheet.width / 9;
  const base = face === "down" ? 0 : face === "up" ? 3 : 6;
  const cell = base + (p.moving ? [1, 0, 2, 0][Math.floor(p.dist * 2.2) % 4] : 0);
  g.save();
  g.translate(Math.round(px + tile / 2), Math.round(py + tile));
  if (face === "right") g.scale(-1, 1);
  g.drawImage(sheet, cell * cw, 0, cw, sheet.height, -tile / 2, -tile * 2, tile, tile * 2);
  g.restore();
}

/** Fade from black over the first `inT` seconds and back to black over the last `outT`. */
function fades(g: G, t: number, dur: number, inT = 0.3, outT = 0.35): void {
  const k = t < inT ? 1 - t / inT : t > dur - outT ? (t - (dur - outT)) / outT : 0;
  if (k <= 0) return;
  g.fillStyle = `rgba(10,12,16,${clamp(k, 0, 1)})`;
  g.fillRect(0, 0, W, H);
}

/** The game's "!" notice bubble. */
function bang(g: G, cx: number, bottom: number, pop: number): void {
  const s = 0.6 + 0.4 * ease(clamp(pop, 0, 1)) + (pop > 1 ? 0 : 0.08 * Math.sin(pop * Math.PI));
  g.save();
  g.translate(cx, bottom);
  g.scale(s, s);
  g.fillStyle = "#fdf6e3";
  g.strokeStyle = "#20242c";
  g.lineWidth = 2.5;
  g.beginPath();
  g.roundRect(-9, -26, 18, 22, 5);
  g.moveTo(-3, -4); g.lineTo(0, 2); g.lineTo(3, -4);
  g.fill(); g.stroke();
  g.fillStyle = "#d63b2a";
  g.font = `bold 17px ${UI}`;
  g.textAlign = "center";
  g.fillText("!", 0, -9);
  g.restore();
}

function pill(g: G, text: string, cx: number, y: number, bg: string, fg = "#fff"): void {
  g.font = `bold 11px ${UI}`;
  const w = g.measureText(text).width + 16;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(cx - w / 2, y, w, 18, 9);
  g.fill();
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, cx, y + 9.5);
  g.textBaseline = "alphabetic";
}

// ---------------------------------------------------------------- Gym Puzzle (Iron Paradise)

/** The game's own barbell stack (PushBlockPuzzle.drawPlateStack), in its 64px tile units. */
function plateStack(g: G, onPlate: boolean): void {
  const ellipse = (col: string, cx: number, cy: number, rx: number, ry: number) => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  };
  const cx = 32, base = 52, rx = 25, ry = 10, th = 9, n = 4;
  if (onPlate) {
    ellipse("rgba(255,40,34,0.28)", cx, base + 2, rx + 9, ry + 6);
    g.strokeStyle = "rgba(255,70,60,0.95)";
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(cx, base + 2, rx + 4, ry + 3, 0, 0, Math.PI * 2);
    g.stroke();
  }
  ellipse("rgba(0,0,0,0.45)", cx, base + 3, rx + 4, ry + 2);
  for (let i = 0; i < n; i++) {
    const yb = base - i * th;
    ellipse("#0b0b0d", cx, yb, rx, ry);
    g.fillStyle = "#131316";
    g.fillRect(cx - rx, yb - th, rx * 2, th);
    g.fillStyle = "rgba(255,255,255,0.1)";
    g.fillRect(cx - rx, yb - th + 1, rx * 2, 1);
    g.fillStyle = "rgba(200,204,212,0.35)";
    g.fillRect(cx - 5 + (i % 2) * 6, yb - th + 4, 6, 2);
  }
  const top = base - n * th;
  ellipse("#1b1b1f", cx, top, rx, ry);
  ellipse("#3a3c41", cx, top, 7, 3);
  g.fillStyle = "#8d9299";
  g.fillRect(cx - 3, top - 12, 6, 12);
}

const gym: LoopScene = {
  id: "game-gym",
  width: W, height: H, duration: 6.2,
  images: { bg: a("gym_bg"), gate: a("gym_gate"), lad: a("rico_walk") },
  draw(g, t, img) {
    const T = 32, X0 = 0.375, Y0 = 2.5;
    const px = (tx: number) => (tx - X0) * T;
    const py = (ty: number) => (ty - Y0) * T;
    g.drawImage(img.bg, 0, 0, W, H);
    // The gate retracts once all three stacks sit on their plates.
    const open = clamp((t - 2.9) / 0.5, 0, 1);
    if (open > 0) {
      g.globalAlpha = open;
      g.drawImage(img.gate, px(1), py(2.5), 10 * T, 2 * T);
      g.globalAlpha = 1;
    }
    const pushK = clamp((t - 0.6) / 2, 0, 1);
    const stackY = lerp(8, 6, pushK);
    const lad = path(t, [[0, 6, 9], [0.6, 6, 9], [2.6, 6, 7], [3.5, 6, 7], [3.9, 5, 7], [5.7, 5, 3]], "up");
    if (t >= 0.6 && t < 2.6) lad.dir = "up";
    const things: { y: number; draw: () => void }[] = [
      { y: 6, draw: () => stackAt(3, 6, true) },
      { y: 6, draw: () => stackAt(9, 6, true) },
      { y: stackY, draw: () => stackAt(6, stackY, t >= 2.6) },
      { y: lad.y + 0.01, draw: () => walker(g, img.lad, lad, px(lad.x), py(lad.y), T, t < 3.5 ? "up" : lad.dir) },
    ];
    function stackAt(tx: number, ty: number, on: boolean) {
      g.save();
      g.translate(px(tx), py(ty));
      g.scale(0.5, 0.5);
      plateStack(g, on);
      g.restore();
    }
    things.sort((p, q) => p.y - q.y).forEach(o => o.draw());
    if (t > 2.6 && t < 3.3) {
      g.fillStyle = `rgba(255,50,40,${0.35 * (1 - (t - 2.6) / 0.7)})`;
      g.fillRect(0, 0, W, H);
    }
    fades(g, t, this.duration);
  },
};

// ---------------------------------------------------------------- Kart Race (Kartódromo)

const kart: LoopScene = {
  id: "game-kart",
  width: W, height: H, duration: 6,
  images: { bg: a("kart_bg"), car: a("car_red"), ghost: a("car_blue"), fuel: a("fuel") },
  draw(g, t, img) {
    const T = 24, Y0 = 14; // background baked at 24 px a tile, starting at tile row 14
    // The real centreline: down the west straight past the start line, then east along the bottom.
    const lap = (tt: number) => path(tt, [[0, 6, 18], [3.2, 6, 50], [5.8, 32, 50], [6.4, 38, 50]]);
    const me = lap(t);
    const ghost = lap(t + 0.35);
    const wx = (tx: number) => (tx + 0.5) * T;
    const wy = (ty: number) => (ty - Y0 + 0.5) * T;
    const camX = clamp(wx(me.x) - W / 2, 0, img.bg.width - W);
    const camY = clamp(wy(me.y) - H / 2, 0, img.bg.height - H);
    g.drawImage(img.bg, -Math.round(camX), -Math.round(camY));
    // A fuel can on the racing line, picked up as the car drives over it.
    const canY = 38;
    const got = clamp((t - 2.0) / 0.35, 0, 1);
    if (got < 1) {
      const s = 1 + got * 0.8;
      g.globalAlpha = 1 - got;
      const bob = Math.sin(t * 5) * 1.5;
      g.drawImage(img.fuel, wx(6) - camX - 11 * s, wy(canY) - camY - 11 * s + bob - got * 14, 22 * s, 22 * s);
      g.globalAlpha = 1;
    }
    const car = (im: HTMLImageElement, p: Pose, alpha: number) => {
      const row = { down: 0, up: 1, left: 2, right: 3 }[p.dir];
      const cell = im.width / 4;
      const size = T * 3;
      g.globalAlpha = alpha;
      g.drawImage(im, (Math.floor(t * 12) % 4) * cell, row * cell, cell, cell, wx(p.x) - camX - size / 2, wy(p.y) - camY - size / 2, size, size);
      g.globalAlpha = 1;
    };
    car(img.ghost, ghost, 0.5);
    car(img.car, me, 1);
    // Fuel gauge: drains as you drive, tops up at the can.
    const fuel = t < 2.0 ? 0.42 - t * 0.06 : Math.min(1, 0.3 + (t - 2.0) * 3) - Math.max(0, t - 2.25) * 0.03;
    g.fillStyle = "rgba(20,24,30,.78)";
    g.beginPath(); g.roundRect(10, H - 26, 104, 16, 4); g.fill();
    g.fillStyle = fuel < 0.3 ? "#e0533a" : "#f2b233";
    g.fillRect(14, H - 22, 96 * clamp(fuel, 0, 1), 8);
    g.fillStyle = "#fdf6e3";
    g.font = `bold 9px ${UI}`;
    g.fillText("FUEL", 118, H - 14);
    fades(g, t, this.duration, 0.25, 0.3);
  },
};

// ---------------------------------------------------------------- Build & Climb (Kai's yard)

const build: LoopScene = {
  id: "game-build",
  width: W, height: H, duration: 5.8,
  images: {
    bg: a("build_bg"), lad: a("rico_build"), walk: a("rico_walk"),
    ghost: a("ramp_ghost"), blueprint: a("ramp_blueprint"), partial: a("ramp_partial"), complete: a("ramp_complete"),
  },
  draw(g, t, img) {
    const T = 32, X0 = 3.875, Y0 = 26;
    const lad = path(t, [[0, 9, 37.2], [1.0, 9, 35], [2.9, 9, 35], [4.5, 9, 31], [4.9, 9, 30]], "up");
    const camY = clamp((lad.y - Y0) * T - 130, 0, img.bg.height - H);
    const px = (tx: number) => (tx - X0) * T;
    const py = (ty: number) => (ty - Y0) * T - camY;
    g.drawImage(img.bg, 0, -Math.round(camY));
    // Build mode: the blue ghost, then the build flickers blueprint <-> partial and lands on complete.
    let frame: HTMLImageElement | null = null;
    let alpha = 1;
    if (t >= 0.9 && t < 1.7) { frame = img.ghost; alpha = 0.5 + 0.2 * Math.sin(t * 9); }
    else if (t >= 1.7 && t < 2.8) frame = Math.floor((t - 1.7) / 0.177) % 2 ? img.partial : img.blueprint;
    else if (t >= 2.8) frame = img.complete;
    if (frame) {
      const h = T * 3.38;
      const w = h * (frame.width / frame.height);
      g.globalAlpha = alpha;
      g.drawImage(frame, px(9) + T / 2 - w / 2, py(34) + T - h, w, h);
      g.globalAlpha = 1;
    }
    walker(g, t < 2.9 ? img.lad : img.walk, lad, px(lad.x), py(lad.y), T, "up");
    if (t >= 0.9 && t < 2.9) pill(g, "BUILD MODE", W / 2, 10, "rgba(26,158,149,.92)");
    fades(g, t, this.duration);
  },
};

// ---------------------------------------------------------------- Mine & Craft (the railway, Station B)

const craft: LoopScene = {
  id: "game-craft",
  width: W, height: H, duration: 6,
  images: { bg: a("craft_bg"), lad: a("rico_walk"), rail: a("rail_v"), cart: a("cart_up") },
  draw(g, t, img) {
    const T = 32, X0 = 1.875, Y0 = 1.5;
    const laid = [1.0, 1.75, 2.5]; // rails over the pit at rows 7, 6, 5, nearest first
    const lad = path(t, [[0, 7, 10.4], [0.8, 7, 8], [1.2, 7, 8], [1.6, 7, 7], [1.95, 7, 7], [2.35, 7, 6], [2.9, 7, 6], [3.8, 7, 9]], "up");
    const riding = t >= 3.9;
    const cartP = path(t, [[3.9, 7, 9], [4.2, 7, 9], [5.5, 7, 2.2]], "up");
    const focusY = riding ? cartP.y : lad.y;
    const camY = clamp((focusY - Y0) * T - 120, 0, img.bg.height - H);
    const px = (tx: number) => (tx - X0) * T;
    const py = (ty: number) => (ty - Y0) * T - camY;
    g.drawImage(img.bg, 0, -Math.round(camY));
    laid.forEach((at, n) => {
      if (t < at) return;
      const k = clamp((t - at) / 0.18, 0, 1);
      const s = 1.35 - 0.35 * ease(k);
      const ty = 7 - n;
      g.globalAlpha = k;
      g.drawImage(img.rail, px(7) + T / 2 - 15 * s, py(ty) + T / 2 - 16 * s, 30 * s, 32 * s);
      g.globalAlpha = 1;
      if (k < 1) {
        g.fillStyle = `rgba(230,220,200,${0.6 * (1 - k)})`;
        for (let d = 0; d < 6; d++) {
          const ang = (d / 6) * Math.PI * 2;
          g.beginPath();
          g.arc(px(7) + T / 2 + Math.cos(ang) * 20 * k, py(ty) + T / 2 + Math.sin(ang) * 14 * k, 3, 0, Math.PI * 2);
          g.fill();
        }
      }
    });
    if (!riding) {
      walker(g, img.lad, lad, px(lad.x), py(lad.y), T, t < 2.9 ? "up" : lad.dir);
    } else {
      const into = clamp((t - 5.15) / 0.35, 0, 1);
      const h = T * 1.75 * (1 - 0.35 * into);
      const w = h * (img.cart.width / img.cart.height);
      g.globalAlpha = 1 - into;
      g.drawImage(img.cart, px(cartP.x) + T / 2 - w / 2, py(cartP.y) + T + 4 - h, w, h);
      g.globalAlpha = 1;
    }
    fades(g, t, this.duration);
  },
};

// ---------------------------------------------------------------- Escort Errand (Kreuzberg, on crutches)

const escort: LoopScene = {
  id: "game-escort",
  width: W, height: H, duration: 6.4,
  images: { bg: a("escort_bg"), lad: a("rico_walk"), mate: a("morten_crutch"), car: a("car_white") },
  draw(g, t, img) {
    const T = 32, X0 = 15.875, Y0 = 5;
    // A car goes past first; then both cross at the dropped kerb (x21-22). He is fast, his mate is not.
    const lad = path(t, [[0, 22, 8], [1.4, 22, 8], [3.0, 22, 12.5], [5.0, 22, 12.5], [6.2, 22, 15.5]], "down");
    const mate = path(t, [[0, 21, 7], [1.5, 21, 7], [6.4, 21, 12.4]], "down");
    const mid = (lad.y + mate.y) / 2;
    const camY = clamp((mid - Y0) * T - 110, 0, img.bg.height - H);
    const px = (tx: number) => (tx - X0) * T;
    const py = (ty: number) => (ty - Y0) * T - camY;
    g.drawImage(img.bg, 0, -Math.round(camY));
    const carX = lerp(30, 12, clamp(t / 1.6, 0, 1));
    if (t < 1.6) {
      const cell = img.car.width / 4;
      const size = T * 3;
      g.drawImage(img.car, (Math.floor(t * 12) % 4) * cell, 2 * cell, cell, cell, px(carX) - size / 2, py(11) + T / 2 - size / 2, size, size);
    }
    const waiting = t >= 3.0 && t < 5.0;
    const drawMate = () => walker(g, img.mate, { ...mate, dist: mate.dist * 0.7 }, px(mate.x), py(mate.y), T, "down");
    const drawLad = () => walker(g, img.lad, lad, px(lad.x), py(lad.y), T, waiting ? "up" : "down");
    if (mate.y < lad.y) { drawMate(); drawLad(); } else { drawLad(); drawMate(); }
    if (waiting) bang(g, px(lad.x) + T / 2, py(lad.y) - T - 4, (t - 3.0) / 0.25);
    fades(g, t, this.duration);
  },
};

// ---------------------------------------------------------------- Chase & Showdown (the marina quay)

const chase: LoopScene = {
  id: "game-chase",
  width: W, height: H, duration: 4.8,
  images: { bg: a("chase_bg"), lad: a("rico_run"), target: a("jonesy_walk") },
  draw(g, t, img) {
    const T = 32, X0 = 4, Y0 = 23.5;
    const run = path(t, [[0, 5, 29], [2.4, 14, 29]], "right");
    const him = path(t, [[0, 10, 29], [2.4, 16, 29]], "right");
    const camX = clamp(((run.x + him.x) / 2 - X0) * T - W / 2 + T / 2, 0, img.bg.width - W);
    const px = (tx: number) => (tx - X0) * T - camX;
    const py = (ty: number) => (ty - Y0) * T;
    g.drawImage(img.bg, -Math.round(camX), 0);
    walker(g, img.target, him, px(him.x), py(him.y), T, t < 2.4 ? "right" : "left");
    walker(g, img.lad, { ...run, dist: run.dist * 0.8 }, px(run.x), py(run.y), T, "right");
    if (t >= 2.45) bang(g, px(him.x) + T / 2, py(him.y) - T - 4, (t - 2.45) / 0.2);
    // The battle wipe: a white flash, then black bars closing in from alternating sides.
    if (t >= 3.3) {
      const k = clamp((t - 3.3) / 0.8, 0, 1);
      const bars = 8;
      g.fillStyle = "#0a0c10";
      for (let b = 0; b < bars; b++) {
        const w = W * ease(clamp(k * 1.6 - b * 0.06, 0, 1));
        const y = (b * H) / bars;
        g.fillRect(b % 2 ? W - w : 0, y, w, H / bars + 1);
      }
      const flash = clamp(1 - (t - 3.3) / 0.25, 0, 1);
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); }
    }
    fades(g, t, this.duration, 0.3, 0.01);
  },
};

// ---------------------------------------------------------------- Photo Shoot (the tower)

const photo: LoopScene = {
  id: "game-photo",
  width: W, height: H, duration: 5.4,
  images: { shot: a("caro"), kid: a("kid") },
  draw(g, t, img) {
    g.fillStyle = "#26211e";
    g.fillRect(0, 0, W, H);
    const fh = 220, fw = fh * 0.75, fx = (W - fw) / 2, fy = 10;
    // The framing drifts, gets ruined by a kid running through, then settles on her and the shutter fires.
    const keys: [number, number, number, number][] = [ // time, centre x, centre y (fractions), view height
      [0, 0.36, 0.5, 0.95], [1.3, 0.6, 0.55, 0.62], [2.5, 0.52, 0.66, 0.8], [3.4, 0.545, 0.69, 0.74], [9, 0.545, 0.69, 0.74],
    ];
    let n = 0;
    while (t > keys[n + 1][0]) n++;
    const k = ease(clamp((t - keys[n][0]) / (keys[n + 1][0] - keys[n][0]), 0, 1));
    const cx = lerp(keys[n][1], keys[n + 1][1], k) * img.shot.width;
    const cy = lerp(keys[n][2], keys[n + 1][2], k) * img.shot.height;
    const vh = lerp(keys[n][3], keys[n + 1][3], k) * img.shot.height;
    const vw = vh * 0.75;
    const sx = clamp(cx - vw / 2, 0, img.shot.width - vw);
    const sy = clamp(cy - vh / 2, 0, img.shot.height - vh);
    g.save();
    g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
    g.drawImage(img.shot, sx, sy, vw, vh, fx, fy, fw, fh);
    const kidIn = t >= 1.3 && t < 2.4;
    if (kidIn) {
      const kk = (t - 1.3) / 1.1;
      const cell = img.kid.width / 8;
      const kh = fh * 0.62;
      g.drawImage(img.kid, (Math.floor(t * 14) % 8) * cell, 0, cell, img.kid.height, lerp(fx - kh, fx + fw, kk), fy + fh - kh + 6, kh, kh);
    }
    g.restore();
    const good = t >= 3.3;
    g.strokeStyle = good ? "#43d17a" : "#fdf6e3";
    g.lineWidth = 3;
    const c = 16;
    for (const [x, y, dx, dy] of [[fx, fy, 1, 1], [fx + fw, fy, -1, 1], [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1]]) {
      g.beginPath(); g.moveTo(x + dx * c, y + dy * 2); g.lineTo(x + dx * 2, y + dy * 2); g.lineTo(x + dx * 2, y + dy * c); g.stroke();
    }
    if (kidIn) pill(g, "WAIT — he's in the shot", W / 2, fy + 8, "#d63b2a");
    // Zoom rail on the left, shutter on the right.
    const zoom = 1 - (vh / img.shot.height - 0.6) / 0.4;
    g.fillStyle = "rgba(253,246,227,.25)"; g.fillRect(52, 40, 4, 160);
    g.fillStyle = "#fdf6e3"; g.beginPath(); g.arc(54, 200 - 160 * clamp(zoom, 0, 1), 7, 0, Math.PI * 2); g.fill();
    const press = t >= 3.8 && t < 4.0 ? 3 : 0;
    g.fillStyle = "#fdf6e3"; g.beginPath(); g.arc(306, 120, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = good ? "#43d17a" : "#d9cdb4"; g.beginPath(); g.arc(306, 120, 12 - press, 0, Math.PI * 2); g.fill();
    if (t >= 3.8) {
      const flash = clamp(1 - (t - 3.8) / 0.45, 0, 1);
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(0, 0, W, H); }
      if (t >= 4.0) pill(g, "✓ PERFECT SHOT", W / 2, fy + fh - 28, "#1a9e95");
    }
    fades(g, t, this.duration, 0.25, 0.35);
  },
};

// ---------------------------------------------------------------- Memory Quiz (the coffee order)

const QUIZ: { q: string; choices: string[]; from: number; pick: number }[] = [
  { q: "What does he always order?", choices: ["Four espressos. One cup.", "One espresso, please.", "A filter coffee."], from: 2, pick: 0 },
  { q: "And the milk?", choices: ["Hot milk on the side.", "In it, please."], from: 1, pick: 0 },
  { q: "Anything with it?", choices: ["A croissant.", "A pastry."], from: 1, pick: 0 },
];

const quiz: LoopScene = {
  id: "game-quiz",
  width: W, height: H, duration: 6.4,
  images: { bg: a("coffee_bg") },
  draw(g, t, img) {
    g.drawImage(img.bg, 0, 0, W, H);
    const box = { x: 12, y: 132, w: W - 24, h: 98 };
    g.fillStyle = "#fdf6e3";
    g.strokeStyle = "#20242c";
    g.lineWidth = 3;
    g.beginPath(); g.roundRect(box.x, box.y, box.w, box.h, 6); g.fill(); g.stroke();
    g.textBaseline = "top";
    g.textAlign = "left";
    const per = 1.45;
    const qi = Math.floor(t / per);
    if (qi < QUIZ.length) {
      const q = QUIZ[qi];
      const lt = t - qi * per;
      g.fillStyle = "#20242c";
      g.font = `bold 13px ${UI}`;
      g.fillText(q.q, box.x + 12, box.y + 10);
      const cur = lt < 0.55 ? q.from : q.pick;
      q.choices.forEach((ch, n) => {
        const y = box.y + 32 + n * 20;
        const sel = n === cur;
        const confirmed = sel && lt > 0.95 && Math.floor(lt * 14) % 2 === 0;
        if (sel) {
          g.fillStyle = confirmed ? "#1a9e95" : "#efe3c6";
          g.beginPath(); g.roundRect(box.x + 8, y - 3, box.w - 16, 19, 4); g.fill();
        }
        g.fillStyle = confirmed ? "#fff" : "#20242c";
        g.font = `${sel ? "bold " : ""}12px ${UI}`;
        g.fillText(`${sel ? "▶ " : "   "}${ch}`, box.x + 14, y);
      });
    } else {
      const lt = t - QUIZ.length * per;
      g.fillStyle = "#20242c";
      g.font = `bold 13px ${UI}`;
      g.fillText("Exactly how he takes it.", box.x + 12, box.y + 12);
      g.font = `12px ${UI}`;
      g.fillText("You got the order right: THE USUAL ×2", box.x + 12, box.y + 34);
      const s = 0.7 + 0.3 * ease(clamp(lt / 0.25, 0, 1));
      g.save();
      g.translate(W - 70, box.y + 66);
      g.rotate(-0.12);
      g.scale(s, s);
      g.strokeStyle = "#1a9e95"; g.lineWidth = 3;
      g.beginPath(); g.roundRect(-46, -14, 92, 28, 5); g.stroke();
      g.fillStyle = "#1a9e95"; g.font = `bold 15px ${PIXEL}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("✓ CORRECT", 0, 1);
      g.restore();
    }
    g.textBaseline = "alphabetic";
    fades(g, t, this.duration, 0.25, 0.35);
  },
};

// ---------------------------------------------------------------- Arcade Brawler (the cabinet)

// Atlas order written by build_site_assets.py (PREVIEW_FIGHTER_CELLS).
const F = { idle: [0, 1, 2, 3], walk: [4, 5, 6, 7], punch: [8, 9, 10, 11], hit: 12, knockdown: 13, downed: 14, win: [15, 16] };

function fighter(g: G, atlas: HTMLImageElement, i: number, cx: number, facingRight: boolean): void {
  const cell = atlas.width / 9;
  const size = 104;
  g.save();
  g.translate(cx, 196 - size * (227 / 256)); // the sheet's measured baseline onto the stage floor
  if (!facingRight) g.scale(-1, 1);
  g.drawImage(atlas, (i % 9) * cell, Math.floor(i / 9) * cell, cell, cell, -size / 2, 0, size, size);
  g.restore();
}

const brawler: LoopScene = {
  id: "game-brawler",
  width: W, height: H, duration: 5.4,
  images: { bg: a("arcade_bg"), p1: a("rico_fighter"), p2: a("seb_fighter"), spark: a("spark") },
  draw(g, t, img) {
    g.drawImage(img.bg, 0, 0, W, H);
    const punch = (start: number) => (t < start ? -1 : t < start + 0.12 ? 0 : t < start + 0.22 ? 1 : t < start + 0.34 ? 2 : t < start + 0.48 ? 3 : -1);
    const x1 = lerp(118, 172, clamp((t - 0.7) / 0.7, 0, 1));
    let c1 = F.idle[Math.floor(t * 8) % 4];
    if (t >= 0.7 && t < 1.4) c1 = F.walk[Math.floor(t * 10) % 4];
    const p1a = punch(1.45), p1b = punch(2.2);
    if (p1a >= 0) c1 = F.punch[p1a];
    if (p1b >= 0) c1 = F.punch[p1b];
    if (t >= 3.0) c1 = F.win[Math.floor(t * 4) % 2];
    let x2 = 250;
    let c2 = F.idle[Math.floor(t * 8 + 2) % 4];
    if (t >= 1.67 && t < 2.1) { c2 = F.hit; x2 = 250 + 10 * ease(clamp((t - 1.67) / 0.15, 0, 1)); }
    if (t >= 2.1) x2 = 260;
    if (t >= 2.42) { c2 = t < 2.9 ? F.knockdown : F.downed; x2 = lerp(260, 300, ease(clamp((t - 2.42) / 0.45, 0, 1))); }
    fighter(g, img.p2, c2, x2, false);
    fighter(g, img.p1, c1, x1, true);
    for (const at of [1.67, 2.42]) {
      const k = (t - at) / 0.36;
      if (k < 0 || k >= 1) continue;
      const cell = img.spark.width / 4;
      const f = Math.floor(k * 11);
      g.drawImage(img.spark, (f % 4) * cell, Math.floor(f / 4) * cell, cell, cell, (at < 2 ? 250 : 262) - 52, 108, 64, 64);
    }
    // Health bars
    const hp2 = t < 1.67 ? 1 : t < 2.42 ? 0.55 : 0;
    const bar = (x: number, fill: number, right: boolean, name: string) => {
      g.fillStyle = "rgba(10,12,16,.8)"; g.fillRect(x, 12, 140, 12);
      g.fillStyle = fill > 0.3 ? "#f2c033" : "#e0533a";
      const w = 136 * fill;
      g.fillRect(right ? x + 138 - w : x + 2, 14, w, 8);
      g.fillStyle = "#fdf6e3"; g.font = `bold 10px ${PIXEL}`; g.textAlign = right ? "right" : "left";
      g.fillText(name, right ? x + 140 : x, 36);
    };
    bar(20, 1, false, "RICO");
    bar(W - 160, hp2, true, "SEB");
    if (t >= 2.75) {
      const s = 0.6 + 0.4 * ease(clamp((t - 2.75) / 0.2, 0, 1));
      g.save();
      g.translate(W / 2, 82); g.scale(s, s);
      g.font = `bold 44px ${PIXEL}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = 6; g.strokeStyle = "#20242c"; g.strokeText("K.O.", 0, 0);
      g.fillStyle = "#f2c033"; g.fillText("K.O.", 0, 0);
      g.restore();
      g.textBaseline = "alphabetic";
    }
    g.textAlign = "left";
    fades(g, t, this.duration, 0.25, 0.35);
  },
};

/** Big game id -> its loop. A game with no entry keeps its static art. */
export const GAME_SCENES: Record<string, LoopScene> = { gym, kart, build, craft, escort, chase, photo, quiz, brawler };

