// Neon city, the ground: skyline, the megastructure wall with its billboards and
// shopfronts, the LED walkway, the wet plaza, the kerb and the road. Static art is
// painted once (tile + extras); `neonLive` animates traffic, puddles, rain and tickers.
import { Ground, PAD_LEFT as P, PALMS, PARASOLS, W, hash } from "../map";
import { blocks, ellipse, mix, perWidth, rgba, vnoise, wrap, type Ctx, type View } from "./kit";

/* ---------- palette ---------- */
export const MAG = "#ff3fb4", CYAN = "#35e8ff", AMBER = "#ffb13b", VIOLET = "#a66bff", RED = "#ff4a3a", LIME = "#b8ff5a";
const NEONS = [MAG, CYAN, AMBER, VIOLET, LIME];

/* ---------- invented glyphs ---------- */
// A 3×3 stroke grid: mostly horizontals and verticals, so it reads like signage
// in a script nobody can actually read.
const SEG: [number, number, number, number][] = [
  [0, 0, 2, 0], [0, 1, 2, 1], [0, 2, 2, 2], [0, 0, 0, 2], [1, 0, 1, 2], [2, 0, 2, 2],
  [0, 0, 1, 1], [2, 0, 1, 1], [1, 1, 0, 2], [1, 1, 2, 2], [0.5, 0, 0.5, 1], [1.5, 1, 1.5, 2], [0, 1.5, 1, 1.5],
];
export function glyphPath(g: Ctx, cx: number, cy: number, s: number, seed: number) {
  const h = s / 2;
  let n = 0;
  for (let i = 0; i < SEG.length; i++) {
    if (hash(seed, i, 77) < (i < 6 ? 0.52 : 0.8)) continue;
    const [a, b, c, d] = SEG[i];
    g.moveTo(cx + (a - 1) * h, cy + (b - 1) * h); g.lineTo(cx + (c - 1) * h, cy + (d - 1) * h); n++;
  }
  if (n < 3) { g.moveTo(cx - h, cy - h); g.lineTo(cx + h, cy - h); g.moveTo(cx, cy - h); g.lineTo(cx, cy + h); g.moveTo(cx - h, cy + h * 0.4); g.lineTo(cx + h, cy + h * 0.4); }
}
export function glyph(g: Ctx, cx: number, cy: number, s: number, seed: number, color: string, lw: number) {
  g.beginPath(); glyphPath(g, cx, cy, s, seed);
  g.strokeStyle = color; g.lineWidth = lw; g.lineCap = "square"; g.stroke();
}

/* ---------- layout (tile units, never pixels) ---------- */
// Positions were authored on the 22-wide map; `P` (PAD_LEFT) keeps them in step with
// the stops, and the extra pieces fill the open strip added on the left.
export interface Board { x: number; w: number; c: string; kind: "glyph" | "logo" | "ticker" | "bars" }
export const BB_Y0 = 1.4, BB_Y1 = 1.97;
export const BILLBOARDS: Board[] = ([
  // the left strip
  { x: P - 6.75, w: 3.0, c: CYAN, kind: "ticker" },
  { x: P - 3.05, w: 2.0, c: VIOLET, kind: "bars" },
  // the original row
  { x: 0.25, w: 2.5, c: MAG, kind: "glyph" },
  { x: 3.35, w: 1.7, c: CYAN, kind: "logo" },
  { x: 5.7, w: 3.3, c: AMBER, kind: "ticker" },
  { x: 9.75, w: 1.6, c: VIOLET, kind: "bars" },
  { x: 12.0, w: 2.9, c: MAG, kind: "glyph" },
  { x: 15.55, w: 2.1, c: CYAN, kind: "ticker" },
  { x: 18.35, w: 3.4, c: AMBER, kind: "glyph" },
] as Board[]).map((b, i) => (i < 2 ? b : { ...b, x: b.x + P }));

export type ShopKind = "noodle" | "shutter" | "arcade" | "kiosk";
export interface Shop { x: number; w: number; kind: ShopKind; c: string; i: number }
const SHOP_KINDS: ShopKind[] = ["noodle", "arcade", "shutter", "kiosk", "noodle", "kiosk"];
export const SHOPS: Shop[] = (() => {
  const out: Shop[] = [];
  for (let x = 0, i = 0; x < W; i++) {
    const w = Math.min(W - x, 1.7 + hash(i, 0, 41) * 1.3);
    out.push({ x, w, kind: SHOP_KINDS[i % SHOP_KINDS.length], c: NEONS[(i * 3) % NEONS.length], i });
    x += w;
  }
  return out;
})();
export const LANTERNS: [number, number][] = SHOPS.filter(s => s.kind === "noodle")
  .flatMap(s => [[s.x + s.w * 0.22, s.i], [s.x + s.w * 0.78, s.i + 1]] as [number, number][]);
export const VENTS = [P - 3.3, 4.15 + P, 11.6 + P, 18.95 + P];

interface Tower { x: number; w: number; h: number; lit: string }
const WARM = ["#ffd98a", "#9fefff", "#ffb3e6", "#ffe6a8"];
function buildRow(seed: number, minW: number, spanW: number, minH: number, spanH: number): Tower[] {
  const out: Tower[] = [];
  for (let x = -0.3, i = 0; x < W + 0.3; i++) {
    const w = minW + hash(i, seed, 3) * spanW;
    let h = minH + hash(i, seed, 4) * spanH;
    if (seed === 2 && hash(i, seed, 5) > 0.84) h = 0.84 + hash(i, seed, 6) * 0.08; // a tower
    out.push({ x, w, h, lit: WARM[Math.floor(hash(i, seed, 7) * WARM.length)] });
    x += w + (seed === 1 ? 0 : hash(i, seed, 8) * 0.12);
  }
  return out;
}
const FAR = buildRow(1, 0.3, 0.55, 0.28, 0.34);
const MID = buildRow(2, 0.38, 0.62, 0.34, 0.36);
export const ANTENNAS: [number, number][] = MID.filter(b => b.h > 0.8).map(b => [b.x + b.w * 0.5, 1 - b.h - 0.12]);

export const PUDDLES: [number, number, number, number][] = [
  [4.1, 5.62, 0.95, 0.3], [7.1, 7.35, 1.35, 0.4], [11.35, 6.45, 0.8, 0.26], [14.7, 9.62, 1.45, 0.42],
  [19.55, 7.4, 1.05, 0.33], [1.5, 10.25, 0.95, 0.3], [9.25, 10.5, 1.15, 0.34], [16.35, 6.35, 0.7, 0.22],
  [12.3, 11.45, 0.9, 0.24], [20.85, 10.95, 0.8, 0.27], [6.1, 4.55, 0.75, 0.2], [3.9, 11.62, 0.6, 0.18],
].map(([x, y, rx, ry]) => [x + P, y, rx, ry] as [number, number, number, number]).concat([
  // the left strip
  [2.3, 6.35, 1.1, 0.34], [5.2, 8.9, 0.85, 0.26], [1.2, 11.25, 0.75, 0.24], [4.6, 4.7, 0.7, 0.2],
]);
export function puddleColor(cx: number): string {
  let best = BILLBOARDS[0], d = 1e9;
  for (const b of BILLBOARDS) { const e = Math.abs(b.x + b.w / 2 - cx); if (e < d) { d = e; best = b; } }
  return best.c;
}
const MANHOLES: [number, number][] = [[4.5, 7.45], [12.45, 10.35], [19.5, 6.55], [7.5, 4.62], [-3.6, 9.45]].map(([x, y]) => [x + P, y] as [number, number]);
export const MANHOLE_ROAD: [number, number] = [12.6 + P, 16.62];
const MANHOLE_ROAD_LEFT: [number, number] = [P - 4.1, 14.62];
const DRAINS = [-3.1, 3.2, 9.6, 15.1, 20.2].map(x => x + P);

/* ---------- traffic ---------- */
export interface Lane { y: number; dir: 1 | -1; v: number; n: number }
export const LANES: Lane[] = [
  { y: 13.64, dir: -1, v: 6.6, n: 4 }, { y: 14.6, dir: -1, v: 9.4, n: 3 },
  { y: 15.62, dir: 1, v: 8.1, n: 4 }, { y: 16.6, dir: 1, v: 11.3, n: 3 },
];
const BODIES = ["#2a2d3b", "#3a2140", "#1e3447", "#4d5160", "#6e1d2b", "#20242c"];
export interface Car { x: number; y: number; dir: 1 | -1; len: number; body: string; taxi: boolean; under: string | null; v: number }
const SPAN = W + 9;
export function forCars(t: number, fn: (c: Car) => void) {
  LANES.forEach((L, li) => {
    for (let k = 0; k < L.n; k++) {
      const base = ((k + hash(k, li, 61) * 0.55) / L.n) * SPAN;
      const x = wrap(base + L.dir * L.v * t, SPAN) - 4.5;
      const taxi = hash(k, li, 63) > 0.72;
      fn({
        x, y: L.y, dir: L.dir, len: 1.15 + hash(k, li, 62) * 0.55, v: L.v, taxi,
        body: taxi ? "#d9a52a" : BODIES[Math.floor(hash(k, li, 64) * BODIES.length)],
        under: hash(k, li, 65) > 0.78 ? (hash(k, li, 66) > 0.5 ? MAG : CYAN) : null,
      });
    }
  });
}

/* ---------- static tiles ---------- */
export function neonTile(g: Ctx, t: Ground, x: number, y: number, T: number) {
  const px = x * T, py = y * T, u = T / 16;
  switch (t) {
    case Ground.Town: {
      const grd = g.createLinearGradient(0, py, 0, py + T);
      grd.addColorStop(0, "#060516"); grd.addColorStop(0.55, "#1a0f33"); grd.addColorStop(1, "#43184f");
      g.fillStyle = grd; g.fillRect(px, py, T, T);
      // low cloud lit from below, soft and continuous
      blocks(g, x, y, T, 8, (fx, fy) => rgba("#ff6fc8", Math.max(0, vnoise(fx, fy * 3, 1.3, 2) - 0.55) * 0.35 * (fy - y)));
      return;
    }
    case Ground.Cliff: {
      blocks(g, x, y, T, 8, (fx, fy) => mix("#1f1d2a", "#2e2b3a", vnoise(fx, fy, 0.9, 11) * 0.7 + vnoise(fx, fy, 3, 12) * 0.3));
      // panel seams by column, a ledge by row: never both on one feature
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(px + hash(x, 0, 3) * T * 0.8, py, u * 0.6, T);
      g.fillStyle = "rgba(255,255,255,.04)"; g.fillRect(px + hash(x, 0, 3) * T * 0.8 + u * 0.6, py, u * 0.4, T);
      g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(px, py + (0.3 + hash(0, y, 9) * 0.3) * T, T, u * 0.5);
      // rain stains running down from the ledges
      for (let i = 0; i < 3; i++) {
        const sx = px + hash(x, i, 21) * T, len = (0.3 + hash(x, i, 22) * 0.7) * T;
        g.fillStyle = `rgba(0,0,0,${0.12 + hash(x, i, 23) * 0.12})`; g.fillRect(sx, py, u * (0.5 + hash(x, i, 24)), len);
      }
      return;
    }
    case Ground.Board: {
      blocks(g, x, y, T, 8, (fx, fy) => mix("#262734", "#353747", vnoise(fx, fy, 1.1, 31)));
      // slab joints: vertical ones seeded by column, one running joint by row
      g.fillStyle = "rgba(0,0,0,.4)";
      for (let i = 0; i < 2; i++) g.fillRect(px + (i * 0.5 + hash(x, i, 33) * 0.18) * T, py + u * 3, u * 0.5, T - u * 6);
      g.fillRect(px, py + T * 0.52, T, u * 0.4);
      g.fillStyle = "rgba(160,190,255,.07)"; g.fillRect(px, py + T * 0.54, T, u * 0.3);
      // LED strip housings along both edges (the light itself is live)
      g.fillStyle = "#0b0b12"; g.fillRect(px, py, T, u * 2.2); g.fillRect(px, py + T - u * 2.4, T, u * 2.4);
      g.fillStyle = rgba(CYAN, 0.35); g.fillRect(px, py + u * 0.8, T, u * 0.7);
      g.fillStyle = rgba(MAG, 0.35); g.fillRect(px, py + T - u * 1.4, T, u * 0.7);
      for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(px + (i + 0.5) * (T / 4), py + T - u * 2.4, u * 0.4, u * 2.4); }
      return;
    }
    case Ground.Sand:
    case Ground.Wet: {
      const wet = t === Ground.Wet;
      blocks(g, x, y, T, 8, (fx, fy) => {
        const n = vnoise(fx, fy, 1.6, 41) * 0.6 + vnoise(fx, fy, 4.5, 42) * 0.4;
        const tint = vnoise(fx, fy, 2.4, 43);
        return mix(mix("#252a3c", "#414860", n), tint > 0.6 ? "#3a2650" : "#1c3346", 0.3);
      });
      // aggregate grit
      for (let i = 0; i < 7; i++) {
        g.fillStyle = hash(x, y, i) > 0.55 ? "rgba(150,165,210,.16)" : "rgba(0,0,0,.28)";
        g.fillRect(px + hash(x, y, i + 20) * (T - u), py + hash(x, y, i + 40) * (T - u), u * 0.8, u * 0.8);
      }
      // hairline cracks now and then
      if (hash(x, y, 49) > 0.82 && !wet) {
        g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = u * 0.4; g.beginPath();
        let cx = px + hash(x, y, 50) * T, cy = py + hash(x, y, 51) * T * 0.3; g.moveTo(cx, cy);
        for (let i = 0; i < 4; i++) { cx += (hash(x, y, 52 + i) - 0.5) * T * 0.35; cy += T * 0.18; g.lineTo(cx, cy); }
        g.stroke();
      }
      return;
    }
    case Ground.Sea: {
      blocks(g, x, y, T, 8, (fx, fy) => mix("#101119", "#1d1f2b", vnoise(fx, fy, 2.2, 61) * 0.7 + vnoise(fx, fy, 0.7, 62) * 0.3));
      // tyre polish: long horizontal sheen seeded by row
      for (let i = 0; i < 2; i++) {
        g.fillStyle = `rgba(120,140,200,${0.04 + hash(0, y, 70 + i) * 0.04})`;
        g.fillRect(px, py + (0.2 + i * 0.45 + hash(0, y, 72 + i) * 0.15) * T, T, u * 1.2);
      }
      for (let i = 0; i < 5; i++) {
        g.fillStyle = hash(x, y, i + 80) > 0.5 ? "rgba(140,150,190,.12)" : "rgba(0,0,0,.3)";
        g.fillRect(px + hash(x, y, i + 90) * T, py + hash(x, y, i + 100) * T, u * 0.7, u * 0.7);
      }
      return;
    }
  }
}

/* ---------- static art bigger than a tile ---------- */
function band(g: Ctx, T: number, y0: number, y1: number, draw: () => void) {
  g.save(); g.beginPath(); g.rect(0, y0 * T, W * T, (y1 - y0) * T); g.clip(); draw(); g.restore();
}

function skyline(g: Ctx, T: number) {
  band(g, T, 0, 1, () => {
    for (const b of FAR) {
      g.fillStyle = "#2b1d47"; g.fillRect(b.x * T, (1 - b.h) * T, b.w * T, b.h * T);
      g.fillStyle = "rgba(255,190,240,.18)";
      for (let r = 0; r < 4; r++) g.fillRect(b.x * T + T * 0.05, (1 - b.h + 0.06 + r * 0.07) * T, b.w * T * 0.8, 1);
    }
    MID.forEach((b, bi) => {
      const x0 = b.x * T, y0 = (1 - b.h) * T, w = b.w * T, h = b.h * T;
      g.fillStyle = "#120d22"; g.fillRect(x0, y0, w, h);
      g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x0, y0, 1.2, h); // rim light
      if (b.h > 0.8) { // spire + setback
        g.fillStyle = "#120d22"; g.fillRect(x0 + w * 0.3, y0 - T * 0.05, w * 0.4, T * 0.05);
        g.fillRect(x0 + w * 0.5 - 1, y0 - T * 0.12, 2, T * 0.08);
      }
      const sp = Math.max(3, T * 0.075), ws = Math.max(1, sp * 0.45);
      const cols = Math.floor((w - sp * 0.6) / sp), rows = Math.floor((h - sp) / sp);
      for (let r = 0; r < rows; r++) {
        const floorLit = hash(bi, r, 11) > 0.62;
        for (let c = 0; c < cols; c++) {
          const on = hash(bi * 97 + c, r, 12) > (floorLit ? 0.25 : 0.82);
          if (!on) continue;
          g.fillStyle = rgba(b.lit, 0.35 + hash(bi + c, r, 13) * 0.5);
          g.fillRect(x0 + sp * 0.5 + c * sp, y0 + sp * 0.6 + r * sp, ws, ws);
        }
      }
      if (hash(bi, 0, 14) > 0.8) { // a rooftop sign far away
        const c = NEONS[bi % NEONS.length];
        g.fillStyle = rgba(c, 0.8); g.fillRect(x0 + w * 0.15, y0 + T * 0.04, w * 0.7, T * 0.05);
      }
    });
    // haze where the city meets the megastructure
    const grd = g.createLinearGradient(0, T * 0.6, 0, T);
    grd.addColorStop(0, "rgba(90,30,110,0)"); grd.addColorStop(1, "rgba(120,40,120,.45)");
    g.fillStyle = grd; g.fillRect(0, T * 0.6, W * T, T * 0.4);
  });
}

function billboard(g: Ctx, T: number, b: Board) {
  const u = T / 16, x0 = b.x * T, y0 = BB_Y0 * T, w = b.w * T, h = (BB_Y1 - BB_Y0) * T;
  // struts to the deck
  g.fillStyle = "#0d0c14";
  for (const f of [0.18, 0.82]) g.fillRect(x0 + w * f - u * 0.5, 1.3 * T, u, y0 - 1.3 * T);
  g.fillStyle = "#08070d"; g.fillRect(x0 - u, y0 - u, w + u * 2, h + u * 2);
  const grd = g.createLinearGradient(0, y0, 0, y0 + h);
  grd.addColorStop(0, mix("#0a0812", b.c, 0.28)); grd.addColorStop(1, mix("#0a0812", b.c, 0.1));
  g.fillStyle = grd; g.fillRect(x0, y0, w, h);
  g.strokeStyle = b.c; g.lineWidth = u * 0.9; g.strokeRect(x0 + u * 0.6, y0 + u * 0.6, w - u * 1.2, h - u * 1.2);
  g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = u * 0.3; g.strokeRect(x0 + u * 0.6, y0 + u * 0.6, w - u * 1.2, h - u * 1.2);
  const cy = y0 + h / 2, s = h * 0.5;
  const seed = Math.round(b.x * 10);
  if (b.kind === "glyph") {
    const n = Math.max(2, Math.floor((w - u * 4) / (s * 1.4)));
    for (let i = 0; i < n; i++) glyph(g, x0 + u * 2 + s * 0.7 + i * (w - u * 4 - s * 1.4) / Math.max(1, n - 1), cy, s, seed + i, mix(b.c, "#ffffff", 0.45), u * 0.9);
  } else if (b.kind === "logo") {
    const lx = x0 + h * 0.55;
    g.strokeStyle = mix(b.c, "#fff", 0.4); g.lineWidth = u;
    g.beginPath(); g.arc(lx, cy, s * 0.6, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(lx - s * 0.6, cy); g.lineTo(lx + s * 0.6, cy); g.moveTo(lx, cy - s * 0.6); g.lineTo(lx + s * 0.4, cy + s * 0.45); g.stroke();
    for (let i = 0; i < 2; i++) glyph(g, lx + s * 1.3 + i * s * 1.15, cy, s * 0.8, seed + 9 + i, mix(b.c, "#fff", 0.3), u * 0.8);
  } else if (b.kind === "bars") {
    for (let i = 0; i < 7; i++) {
      const bh = h * (0.2 + hash(i, seed, 5) * 0.55);
      g.fillStyle = rgba(i % 2 ? b.c : MAG, 0.8); g.fillRect(x0 + u * 2 + i * (w - u * 4) / 7, y0 + h - u * 1.8 - bh, (w - u * 4) / 7 - u * 0.6, bh);
    }
  } // tickers scroll in the live pass
}

function shop(g: Ctx, T: number, s: Shop) {
  const u = T / 16, x0 = s.x * T, w = s.w * T, top = 2.0 * T, fasc = 0.24 * T, bot = 2.97 * T;
  // fascia
  g.fillStyle = "#15131d"; g.fillRect(x0, top, w, fasc);
  g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x0, top, w, u * 0.5);
  g.fillStyle = "rgba(0,0,0,.6)"; g.fillRect(x0 + w - u * 0.8, top, u * 0.8, bot - top); // party wall
  // neon trim under the fascia
  g.fillStyle = s.c; g.fillRect(x0 + u, top + fasc - u * 1.1, w - u * 2.6, u * 0.6);
  g.fillStyle = rgba("#ffffff", 0.6); g.fillRect(x0 + u, top + fasc - u * 0.95, w - u * 2.6, u * 0.2);
  // small lettering on the fascia
  const n = Math.max(1, Math.floor(s.w * 2.2));
  for (let i = 0; i < n; i++) glyph(g, x0 + u * 3 + i * T * 0.42, top + fasc * 0.42, T * 0.13, s.i * 13 + i, rgba(mix(s.c, "#fff", 0.5), 0.9), u * 0.45);
  const wy = top + fasc, wh = bot - wy;
  if (s.kind === "shutter") {
    g.fillStyle = "#3a3c48"; g.fillRect(x0 + u, wy, w - u * 2.6, wh);
    for (let yy = wy; yy < bot; yy += u * 1.3) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x0 + u, yy, w - u * 2.6, u * 0.45); }
    g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(x0 + u, wy, w - u * 2.6, u * 2);
    // spray tag
    g.save(); g.globalAlpha = 0.75; glyph(g, x0 + w * 0.4, wy + wh * 0.55, wh * 0.45, s.i * 7 + 3, LIME, u * 0.9); glyph(g, x0 + w * 0.62, wy + wh * 0.5, wh * 0.35, s.i * 7 + 4, MAG, u * 0.8); g.restore();
    // light leaking under a half-shut shutter
    g.fillStyle = rgba(AMBER, 0.55); g.fillRect(x0 + u, bot - u * 1.3, w - u * 2.6, u * 1.3);
  } else {
    const inner = s.kind === "arcade" ? mix("#200a2c", s.c, 0.35) : s.kind === "noodle" ? "#6b3a1c" : "#3b4f5a";
    const grd = g.createLinearGradient(0, wy, 0, bot);
    grd.addColorStop(0, inner); grd.addColorStop(1, mix(inner, "#fff2c8", s.kind === "arcade" ? 0.15 : 0.4));
    g.fillStyle = grd; g.fillRect(x0 + u, wy, w - u * 2.6, wh);
    if (s.kind === "noodle") {
      // noren curtain in split panels, with a door gap
      const panels = 4, pw = (w * 0.6) / panels, nx = x0 + w * 0.2;
      for (let i = 0; i < panels; i++) {
        g.fillStyle = i % 2 ? "#23264f" : "#1c1f44"; g.fillRect(nx + i * pw + u * 0.2, wy, pw - u * 0.4, wh * 0.42);
        g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(nx + i * pw + pw * 0.35, wy + wh * 0.12, pw * 0.3, u * 0.4);
      }
      g.fillStyle = "rgba(30,15,5,.55)"; // counter + stools silhouette
      g.fillRect(x0 + u, bot - wh * 0.28, w - u * 2.6, u * 1.2);
      for (let i = 0; i < 4; i++) g.fillRect(x0 + w * (0.2 + i * 0.18), bot - wh * 0.2, u * 1.5, wh * 0.2);
    } else if (s.kind === "arcade") {
      for (let i = 0; i < Math.floor(s.w * 2); i++) {
        const cxp = x0 + u * 3 + i * T * 0.48;
        g.fillStyle = "#0d0914"; g.fillRect(cxp, wy + wh * 0.15, T * 0.34, wh * 0.85);
        g.fillStyle = NEONS[(i + s.i) % NEONS.length]; g.fillRect(cxp + u, wy + wh * 0.22, T * 0.34 - u * 2, wh * 0.28);
        g.fillStyle = "rgba(255,255,255,.5)"; g.fillRect(cxp + u * 1.5, wy + wh * 0.26, u * 1.5, u * 0.6);
      }
    } else {
      // kiosk: shelves of goods, a glass door
      for (let r = 0; r < 3; r++) {
        g.fillStyle = "rgba(20,25,30,.6)"; g.fillRect(x0 + u * 2, wy + wh * (0.3 + r * 0.24), w * 0.55, u * 0.5);
        for (let i = 0; i < 9; i++) { g.fillStyle = NEONS[(i + r + s.i) % NEONS.length]; g.globalAlpha = 0.65; g.fillRect(x0 + u * 2.5 + i * w * 0.058, wy + wh * (0.18 + r * 0.24), u * 0.9, wh * 0.11); }
        g.globalAlpha = 1;
      }
      g.strokeStyle = "rgba(220,240,255,.35)"; g.lineWidth = u * 0.4; g.strokeRect(x0 + w * 0.7, wy + u, w * 0.2, wh - u);
    }
    g.fillStyle = "rgba(255,255,255,.08)"; // glass glare
    g.beginPath(); g.moveTo(x0 + w * 0.1, wy); g.lineTo(x0 + w * 0.22, wy); g.lineTo(x0 + w * 0.12, bot); g.lineTo(x0, bot); g.closePath(); g.fill();
  }
  // blade sign sticking out from the wall
  if (s.kind !== "shutter") {
    const bx = x0 + w - u * 3.2, by0 = top - T * 0.3;
    g.fillStyle = "#0a0910"; g.fillRect(bx - u * 1.3, by0, u * 2.6, T * 0.52);
    g.strokeStyle = s.c; g.lineWidth = u * 0.5; g.strokeRect(bx - u * 1, by0 + u * 0.3, u * 2, T * 0.52 - u * 0.6);
    glyph(g, bx, by0 + T * 0.13, u * 1.2, s.i * 5 + 1, s.c, u * 0.4); glyph(g, bx, by0 + T * 0.36, u * 1.2, s.i * 5 + 2, s.c, u * 0.4);
  }
  g.fillStyle = "#0c0b11"; g.fillRect(x0, bot, w, 3 * T - bot); // stoop
}

export function lantern(g: Ctx, T: number, lx: number, seed: number) {
  const u = T / 16, cx = lx * T, cy = 2.42 * T, rx = u * 2.4, ry = u * 3;
  g.fillStyle = "#1a1a1a"; g.fillRect(cx - 0.5, 2.22 * T, 1, cy - ry - 2.22 * T);
  ellipse(g, cx, cy, rx, ry, "#d8322a");
  ellipse(g, cx - rx * 0.3, cy - ry * 0.25, rx * 0.35, ry * 0.5, "rgba(255,190,120,.55)");
  g.strokeStyle = "rgba(90,10,10,.5)"; g.lineWidth = 0.8;
  for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx - rx * 0.95, cy + i * ry * 0.45); g.quadraticCurveTo(cx, cy + i * ry * 0.45 + u * 0.5, cx + rx * 0.95, cy + i * ry * 0.45); g.stroke(); }
  g.fillStyle = "#15110f"; g.fillRect(cx - rx * 0.55, cy - ry - u * 0.6, rx * 1.1, u * 0.9); g.fillRect(cx - rx * 0.55, cy + ry - u * 0.3, rx * 1.1, u * 0.9);
  glyph(g, cx, cy, u * 1.6, seed * 17, "rgba(30,5,5,.75)", u * 0.4);
  g.fillStyle = "#d8322a"; g.fillRect(cx - 0.5, cy + ry + u * 0.6, 1, u * 1.4);
}

function wall(g: Ctx, T: number) {
  const u = T / 16, mw = W * T;
  band(g, T, 1, 3, () => {
    // elevated expressway deck across the top of the megastructure
    g.fillStyle = "#302e3c"; g.fillRect(0, T, mw, T * 0.3);
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, T + u * 1.2, mw, u * 0.5);
    g.fillStyle = "#1a1823"; g.fillRect(0, T * 1.2, mw, T * 0.1);
    for (let px = 0; px < mw; px += T * 0.25) { g.fillStyle = "#171520"; g.fillRect(px, T, u * 0.5, u * 1.2); }
    g.fillStyle = "#171520"; g.fillRect(0, T + u * 0.3, mw, u * 0.4);
    for (let i = 0; i < W; i++) { g.fillStyle = rgba(AMBER, 0.8); g.fillRect((i + 0.5) * T, T * 1.235, u * 0.7, u * 0.5); }
    const sh = g.createLinearGradient(0, T * 1.3, 0, T * 1.62);
    sh.addColorStop(0, "rgba(0,0,0,.55)"); sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh; g.fillRect(0, T * 1.3, mw, T * 0.32);
    // pipes + AC units in the gaps between billboards
    g.fillStyle = "#1a1922"; g.fillRect(0, T * 1.33, mw, u * 0.9);
    for (let i = 0; i < perWidth(26); i++) {
      const ax = hash(i, 0, 51) * W, ay = 1.5 + hash(i, 1, 51) * 0.3;
      if (BILLBOARDS.some(b => ax > b.x - 0.4 && ax < b.x + b.w + 0.05)) continue;
      const aw = u * 4, ah = u * 3;
      if (hash(i, 2, 51) > 0.5) {
        g.fillStyle = "#3f4150"; g.fillRect(ax * T, ay * T, aw, ah);
        g.strokeStyle = "#1b1c24"; g.lineWidth = u * 0.4; g.beginPath(); g.arc(ax * T + aw * 0.6, ay * T + ah / 2, ah * 0.35, 0, 7); g.stroke();
        g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(ax * T, ay * T + ah, aw, u * 0.5);
      } else {
        g.fillStyle = rgba(WARM[i % WARM.length], 0.55); g.fillRect(ax * T, ay * T, u * 2.4, u * 3);
        g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(ax * T + u * 1.1, ay * T, u * 0.3, u * 3);
      }
    }
    BILLBOARDS.forEach(b => billboard(g, T, b));
    SHOPS.forEach(s => shop(g, T, s));
    LANTERNS.forEach(([lx, seed]) => lantern(g, T, lx, seed));
    for (const vx of VENTS) {
      g.fillStyle = "#0a0a0f"; g.fillRect(vx * T - u * 3, T * 2.86, u * 6, u * 1.6);
      for (let i = 0; i < 5; i++) { g.fillStyle = "#3c3d48"; g.fillRect(vx * T - u * 2.6 + i * u * 1.1, T * 2.87, u * 0.5, u * 1.3); }
    }
  });
}

function manhole(g: Ctx, T: number, mx: number, my: number) {
  const u = T / 16, cx = mx * T, cy = my * T, rx = T * 0.32, ry = T * 0.22;
  ellipse(g, cx, cy + u * 0.5, rx + u, ry + u, "rgba(0,0,0,.45)");
  ellipse(g, cx, cy, rx, ry, "#2b2c35");
  g.strokeStyle = "#17171e"; g.lineWidth = u * 0.6;
  g.beginPath(); g.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, 7); g.stroke();
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx * 0.68, ry * 0.68, 0, 0, 7); g.clip();
  g.strokeStyle = "rgba(0,0,0,.5)"; g.lineWidth = u * 0.35;
  for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(cx - rx + i * u * 1.5, cy - ry); g.lineTo(cx + rx + i * u * 1.5, cy + ry); g.moveTo(cx + rx + i * u * 1.5, cy - ry); g.lineTo(cx - rx + i * u * 1.5, cy + ry); g.stroke(); }
  g.restore();
  g.fillStyle = "rgba(140,160,230,.25)"; g.beginPath(); g.ellipse(cx - rx * 0.3, cy - ry * 0.55, rx * 0.4, u * 0.6, 0, 0, 7); g.fill();
}

function plaza(g: Ctx, T: number) {
  const u = T / 16, mw = W * T;
  band(g, T, 3, 13, () => {
    // wet ground mirrors the billboards and shop light just below the wall
    for (const b of BILLBOARDS) {
      g.save(); g.translate((b.x + b.w / 2) * T, T * 4.15); g.scale(b.w * 0.55, 1.1);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, T);
      grd.addColorStop(0, rgba(b.c, 0.2)); grd.addColorStop(1, rgba(b.c, 0));
      g.fillStyle = grd; g.fillRect(-T, 0, T * 2, T); g.restore();
    }
    // pools of light from lamps high on the megastructure, off the top of the picture
    for (const [lx, ly, rx, c, a] of [[10.6, 8.9, 3.2, "#ffc98a", 0.1], [4.4, 10.4, 2.4, MAG, 0.08], [17.2, 7.9, 2.8, CYAN, 0.08], [20.5, 11.2, 2, VIOLET, 0.08], [-3.4, 7.6, 2.6, AMBER, 0.08]] as [number, number, number, string, number][]) {
      g.save(); g.translate((lx + P) * T, ly * T); g.scale(rx, rx * 0.4);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, T);
      grd.addColorStop(0, rgba(c, a)); grd.addColorStop(1, rgba(c, 0));
      g.fillStyle = grd; g.fillRect(-T, -T, T * 2, T * 2); g.restore();
    }
    // faded road paint: an old lane line, worn by traffic that no longer comes here
    for (let px = 0; px < mw; px += T * 0.7) {
      const a = Math.max(0, vnoise(px / T, 0, 2.3, 7) - 0.3) * 0.35;
      g.fillStyle = rgba("#e6c35a", a); g.fillRect(px, T * 8.9, T * 0.45, u * 0.8); g.fillRect(px, T * 9.02, T * 0.45, u * 0.5);
    }
    // painted street lettering, big and faded
    g.save(); g.globalAlpha = 0.14;
    for (let i = 0; i < 3; i++) glyph(g, T * (13.6 + P + i * 1.0), T * 6.6, T * 0.75, 400 + i, "#e8ecff", u * 1.6);
    for (let i = 0; i < 2; i++) glyph(g, T * (5.6 + P + i * 1.0), T * 9.9, T * 0.72, 420 + i, "#e8ecff", u * 1.6);
    for (let i = 0; i < 2; i++) glyph(g, T * (P - 5.4 + i * 1.0), T * 7.9, T * 0.72, 440 + i, "#e8ecff", u * 1.6);
    g.beginPath(); g.moveTo(T * (18.6 + P), T * 9.6); g.lineTo(T * (20.4 + P), T * 9.6); g.moveTo(T * (20.4 + P), T * 9.6); g.lineTo(T * (19.9 + P), T * 9.25); g.moveTo(T * (20.4 + P), T * 9.6); g.lineTo(T * (19.9 + P), T * 9.95);
    g.strokeStyle = "#e8ecff"; g.lineWidth = u * 1.6; g.stroke();
    g.restore();
    // tactile guide strip before the kerb, continuous across the map
    g.fillStyle = "rgba(200,170,60,.28)"; g.fillRect(0, T * 11.72, mw, T * 0.16);
    g.fillStyle = "rgba(255,225,120,.28)";
    for (let px = u; px < mw; px += u * 2.4) { g.fillRect(px, T * 11.75, u * 0.9, u * 0.6); g.fillRect(px + u * 1.2, T * 11.81, u * 0.9, u * 0.6); }
    for (const dx of DRAINS) {
      g.fillStyle = "#0b0b10"; g.fillRect(dx * T, T * 12.12, T * 0.6, T * 0.26);
      for (let i = 0; i < 6; i++) { g.fillStyle = "#3a3b46"; g.fillRect(dx * T + u * 0.6 + i * u * 1.5, T * 12.15, u * 0.6, T * 0.2); }
    }
    MANHOLES.forEach(([mx, my]) => manhole(g, T, mx, my));
    // long wet reflections under the pylons: a soft smear with a couple of bright wobbly threads
    for (const [x, y] of PALMS) {
      const c = [MAG, CYAN, AMBER, VIOLET, LIME][(x * 3 + y) % 5], cx = (x + 0.5) * T, yy = (y + 0.9) * T, len = T * 1.7;
      const grd = g.createLinearGradient(0, yy, 0, yy + len);
      grd.addColorStop(0, rgba(c, 0.16)); grd.addColorStop(1, rgba(c, 0));
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(cx - T * 0.2, yy); g.lineTo(cx + T * 0.2, yy); g.lineTo(cx + T * 0.08, yy + len); g.lineTo(cx - T * 0.08, yy + len); g.closePath(); g.fill();
      for (let k = 0; k < 2; k++) {
        g.beginPath();
        for (let j = 0; j <= 10; j++) { const sx = cx + (k ? 0.1 : -0.1) * T + Math.sin(j * 2.7 + x + k) * u * 0.35, sy = yy + (j / 10) * len * 0.8; if (j) g.lineTo(sx, sy); else g.moveTo(sx, sy); }
        const lg = g.createLinearGradient(0, yy, 0, yy + len * 0.8); lg.addColorStop(0, rgba(c, 0.45)); lg.addColorStop(1, rgba(c, 0));
        g.strokeStyle = lg; g.lineWidth = u * 0.6; g.stroke();
      }
    }
    for (const [x, y] of PARASOLS) {
      const cx = (x + 0.5) * T, yy = (y + 0.95) * T;
      const grd = g.createLinearGradient(0, yy, 0, yy + T * 1.1);
      grd.addColorStop(0, "rgba(200,235,255,.22)"); grd.addColorStop(1, "rgba(200,235,255,0)");
      g.fillStyle = grd; g.fillRect(cx - T * 0.3, yy, T * 0.6, T * 1.1);
    }
    // puddles: a black mirror with the nearest neon smeared into them
    for (const [px, py, rx, ry] of PUDDLES) {
      const c = puddleColor(px);
      g.save(); g.beginPath(); g.ellipse(px * T, py * T, rx * T, ry * T, 0, 0, 7); g.clip();
      g.fillStyle = "#121830"; g.fillRect((px - rx) * T, (py - ry) * T, rx * 2 * T, ry * 2 * T);
      const grd = g.createLinearGradient((px - rx) * T, 0, (px + rx) * T, 0);
      grd.addColorStop(0, rgba(c, 0)); grd.addColorStop(0.35 + hash(px * 10, 0, 3) * 0.3, rgba(c, 0.6)); grd.addColorStop(1, rgba(c, 0));
      g.fillStyle = grd; g.fillRect((px - rx) * T, (py - ry * 0.5) * T, rx * 2 * T, ry * T);
      g.fillStyle = rgba(CYAN, 0.12); g.fillRect((px - rx) * T, (py + ry * 0.35) * T, rx * 2 * T, u * 0.6);
      g.restore();
      g.strokeStyle = "rgba(170,190,255,.14)"; g.lineWidth = u * 0.5;
      g.beginPath(); g.ellipse(px * T, py * T, rx * T, ry * T, 0, Math.PI * 1.05, Math.PI * 1.9); g.stroke();
    }
    // litter: soaked flyers and bottle caps
    for (let i = 0; i < perWidth(18); i++) {
      const lx = hash(i, 0, 71) * W, ly = 4.3 + hash(i, 1, 71) * 7.2;
      g.save(); g.translate(lx * T, ly * T); g.rotate((hash(i, 2, 71) - 0.5) * 1.6);
      if (i % 3) { g.fillStyle = rgba(i % 2 ? "#e9e4f5" : NEONS[i % NEONS.length], 0.22); g.fillRect(-u * 1.6, -u, u * 3.2, u * 2.2); }
      else { g.fillStyle = "rgba(210,210,230,.35)"; g.fillRect(-u * 0.4, -u * 0.4, u * 0.8, u * 0.8); }
      g.restore();
    }
  });
}

function kerb(g: Ctx, T: number) {
  const u = T / 16, mw = W * T;
  band(g, T, 12, 13.2, () => {
    g.fillStyle = "#4a4c5b"; g.fillRect(0, T * 12.56, mw, T * 0.26);
    g.fillStyle = "rgba(255,255,255,.14)"; g.fillRect(0, T * 12.56, mw, u * 0.6);
    for (let px = 0; px < mw; px += T * 0.75) { g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(px, T * 12.56, u * 0.45, T * 0.26); }
    g.fillStyle = "#101018"; g.fillRect(0, T * 12.82, mw, T * 0.18);
    g.fillStyle = rgba(CYAN, 0.55); g.fillRect(0, T * 12.88, mw, u * 0.7);
    // bollards, short, sitting on the kerb edge
    for (let bx = ((1 + P) % 2) || 2; bx < W; bx += 2) { // every other tile, on the same tiles relative to the stops
      const cx = bx * T, base = T * 12.8, hgt = T * 0.34;
      ellipse(g, cx, base, u * 1.6, u * 0.6, "rgba(0,0,0,.5)");
      g.fillStyle = "#2f3140"; g.fillRect(cx - u * 1.1, base - hgt, u * 2.2, hgt);
      ellipse(g, cx, base - hgt, u * 1.1, u * 0.55, "#474a5c");
      g.fillStyle = AMBER; g.fillRect(cx - u * 1.1, base - hgt * 0.62, u * 2.2, u * 0.9);
      g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(cx - u * 1.1, base - hgt, u * 0.5, hgt);
    }
  });
}

function road(g: Ctx, T: number) {
  const u = T / 16, mw = W * T, ZX0 = 6.4 + P, ZX1 = 8.3 + P;
  band(g, T, 13, 18, () => {
    g.fillStyle = "#08080d"; g.fillRect(0, T * 13, mw, T * 0.12);
    g.fillStyle = "rgba(160,180,255,.12)"; g.fillRect(0, T * 13.1, mw, u * 0.4);
    const worn = (px: number) => 0.45 + vnoise(px / T, 3, 1.4, 88) * 0.4;
    const lineRow = (yy: number, h: number, color: string, dash: number, gap: number) => {
      for (let px = 0; px < mw; px += (dash + gap) * T) {
        if (px + dash * T > ZX0 * T && px < ZX1 * T) continue;
        g.fillStyle = rgba(color, worn(px)); g.fillRect(px, yy * T - h / 2, dash * T, h);
      }
    };
    lineRow(13.2, u * 0.8, "#e9ecf5", 1, 0);
    lineRow(14.12, u * 0.8, "#e9ecf5", 0.62, 0.48);
    lineRow(15.06, u * 0.7, AMBER, 1, 0); lineRow(15.2, u * 0.7, AMBER, 1, 0);
    lineRow(16.13, u * 0.8, "#e9ecf5", 0.62, 0.48);
    lineRow(17.12, u * 0.8, "#e9ecf5", 1, 0);
    // zebra crossing
    for (let yy = 13.35; yy < 17.05; yy += 0.42) {
      g.fillStyle = rgba("#e9ecf5", 0.4 * worn(yy * 37)); g.fillRect(ZX0 * T, yy * T, (ZX1 - ZX0) * T, T * 0.24);
      g.fillStyle = "rgba(20,22,30,.22)"; for (let k = 0; k < 1; k++) g.fillRect((ZX0 + hash(Math.round(yy * 10), k, 5) * (ZX1 - ZX0 - 0.3)) * T, yy * T, T * (0.1 + hash(Math.round(yy * 10), k, 6) * 0.3), T * 0.24);
    }
    // lane arrows
    const arrow = (ax: number, ay: number, dir: number) => {
      g.save(); g.translate(ax * T, ay * T); g.scale(dir, 1); g.globalAlpha = 0.3;
      g.fillStyle = "#e9ecf5"; g.fillRect(-T * 0.5, -u * 0.6, T * 0.7, u * 1.2);
      g.beginPath(); g.moveTo(T * 0.45, 0); g.lineTo(T * 0.15, -u * 3); g.lineTo(T * 0.15, u * 3); g.closePath(); g.fill(); g.restore();
    };
    arrow(3.2 + P, 13.64, -1); arrow(15.4 + P, 14.6, -1); arrow(11.2 + P, 15.62, 1); arrow(19.1 + P, 16.6, 1); arrow(P - 2.6, 16.6, 1);
    manhole(g, T, MANHOLE_ROAD[0], MANHOLE_ROAD[1]); manhole(g, T, MANHOLE_ROAD_LEFT[0], MANHOLE_ROAD_LEFT[1]);
    // far-side crash barrier: plainly not a place to stand
    g.fillStyle = "#0b0b11"; g.fillRect(0, T * 17.36, mw, T * 0.64);
    for (let px = T * 0.2; px < mw; px += T * 0.9) { g.fillStyle = "#2c2e3a"; g.fillRect(px, T * 17.4, u * 1.2, T * 0.5); }
    g.fillStyle = "#6a6d7e"; g.fillRect(0, T * 17.46, mw, u * 2.2);
    g.fillStyle = "#3d3f4d"; g.fillRect(0, T * 17.46 + u * 1, mw, u * 0.5);
    for (let px = T * 0.2; px < mw; px += T * 0.9) { g.fillStyle = AMBER; g.fillRect(px + u * 0.2, T * 17.5, u * 0.8, u * 0.8); }
    for (let px = 0; px < mw; px += T * 1.5) { g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(px + T * 0.3, T * 17.75, T * 0.8, T * 0.25); }
  });
}

export function neonExtras(g: Ctx, T: number) {
  skyline(g, T); wall(g, T); plaza(g, T); kerb(g, T); road(g, T);
}

/* ---------- animated ground ---------- */
export function neonLive(ctx: Ctx, T: number, time: number, animated: boolean, v: View) {
  const t = animated ? time : 0, u = T / 16;
  const inX = (a: number, b: number) => b >= v.x0 - 1 && a <= v.x1 + 1;
  // tickers scroll along two billboards
  if (v.y0 <= 2) for (const b of BILLBOARDS) {
    if (b.kind !== "ticker" || !inX(b.x, b.x + b.w)) continue;
    const x0 = b.x * T + u * 1.2, y0 = BB_Y0 * T + u * 1.2, w = b.w * T - u * 2.4, h = (BB_Y1 - BB_Y0) * T - u * 2.4, s = h * 0.55, step = s * 1.35;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = mix("#0a0812", b.c, 0.18); ctx.fillRect(x0, y0, w, h);
    const off = t * T * 0.9, first = Math.floor(off / step), frac = off - first * step;
    ctx.beginPath();
    for (let i = 0; i < Math.ceil(w / step) + 2; i++) {
      glyphPath(ctx, x0 + s * 0.7 + i * step - frac, y0 + h / 2, s, Math.round(b.x) * 50 + wrap(first + i, 12));
    }
    ctx.strokeStyle = mix(b.c, "#fff", 0.35); ctx.lineWidth = u * 0.9; ctx.lineCap = "square"; ctx.stroke();
    ctx.restore();
  }
  // puddles shimmer: the reflection wobbles as drops land
  if (v.y1 >= 4 && v.y0 <= 12) for (const [px, py, rx, ry] of PUDDLES) {
    if (!inX(px - rx, px + rx) || py < v.y0 - 1 || py > v.y1 + 1) continue;
    const c = puddleColor(px);
    ctx.save(); ctx.beginPath(); ctx.ellipse(px * T, py * T, rx * T, ry * T, 0, 0, 7); ctx.clip();
    for (let i = 0; i < 3; i++) {
      const yy = (py - ry * 0.6 + i * ry * 0.55) * T, sw = Math.sin(t * (2.2 + i) + px * 3 + i) * rx * T * 0.25;
      ctx.fillStyle = rgba(i === 1 ? "#ffffff" : c, 0.1 + 0.07 * Math.sin(t * 3.1 + i * 2 + py));
      ctx.fillRect(px * T - rx * T * 0.55 + sw, yy, rx * T * (0.7 + 0.2 * Math.sin(t * 1.7 + i)), u * 0.8);
    }
    ctx.restore();
  }
  // rain rings on the plaza and splashes on the road
  if (animated) {
    ctx.lineWidth = Math.max(1, u * 0.35);
    for (let i = 0; i < perWidth(70); i++) {
      const rx = hash(i, 0, 301) * W, ry = 3.3 + hash(i, 1, 301) * 9.5;
      if (rx < v.x0 - 1 || rx > v.x1 + 1 || ry < v.y0 - 1 || ry > v.y1 + 1) continue;
      const ph = wrap(t * (0.7 + hash(i, 2, 301) * 0.6) + hash(i, 3, 301), 1);
      ctx.strokeStyle = `rgba(190,210,255,${(1 - ph) * 0.3})`;
      ctx.beginPath(); ctx.ellipse(rx * T, ry * T, u * (0.5 + ph * 3.2), u * (0.25 + ph * 1.3), 0, 0, 7); ctx.stroke();
    }
  }
  // traffic: bodies here, their lights in the lights pass (so the grade can't dim them)
  if (v.y1 >= 13) forCars(t, c => {
    if (!inX(c.x, c.x + c.len)) return;
    const x0 = c.x * T, L = c.len * T, cy = c.y * T, hw = T * 0.25, front = c.dir > 0 ? x0 + L : x0;
    ellipse(ctx, x0 + L / 2, cy + u * 1.5, L * 0.56, hw * 1.1, "rgba(0,0,0,.45)");
    if (c.under) ellipse(ctx, x0 + L / 2, cy + u, L * 0.6, hw * 1.35, rgba(c.under, 0.25));
    ctx.fillStyle = c.body; ctx.beginPath(); ctx.roundRect(x0, cy - hw, L, hw * 2, T * 0.12); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(x0 + T * 0.1, cy - hw, L - T * 0.2, u * 0.7);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x0 + T * 0.1, cy + hw - u * 0.9, L - T * 0.2, u * 0.9);
    // cabin: windscreen toward the front
    const cabW = L * 0.46, cabX = x0 + L * 0.27 + (c.dir > 0 ? L * 0.04 : -L * 0.04);
    ctx.fillStyle = "#0b1020"; ctx.beginPath(); ctx.roundRect(cabX, cy - hw * 0.72, cabW, hw * 1.44, T * 0.07); ctx.fill();
    ctx.fillStyle = c.body; ctx.fillRect(cabX + cabW * 0.28, cy - hw * 0.55, cabW * 0.44, hw * 1.1);
    ctx.fillStyle = rgba(CYAN, 0.25); ctx.fillRect(cabX + cabW * 0.08, cy - hw * 0.6, u * 0.6, hw * 1.2);
    if (c.taxi) { ctx.fillStyle = "#fff4c8"; ctx.fillRect(cabX + cabW * 0.42, cy - u * 0.9, cabW * 0.16, u * 1.8); }
    ctx.fillStyle = "#fff6d8"; ctx.fillRect(front - (c.dir > 0 ? u * 1.2 : 0), cy - hw + u * 0.3, u * 1.2, u * 1.2); ctx.fillRect(front - (c.dir > 0 ? u * 1.2 : 0), cy + hw - u * 1.5, u * 1.2, u * 1.2);
    const back = c.dir > 0 ? x0 : x0 + L - u;
    ctx.fillStyle = "#ff3030"; ctx.fillRect(back, cy - hw + u * 0.3, u, u * 1.4); ctx.fillRect(back, cy + hw - u * 1.7, u, u * 1.4);
  });
  if (animated && v.y1 >= 13) {
    ctx.fillStyle = "rgba(200,215,255,.35)";
    for (let i = 0; i < perWidth(50); i++) {
      const sx = hash(i, 0, 311) * W, sy = 13.2 + hash(i, 1, 311) * 4.1;
      if (sx < v.x0 - 1 || sx > v.x1 + 1) continue;
      const ph = wrap(t * 2.3 + hash(i, 2, 311), 1);
      if (ph > 0.35) continue;
      const r = u * (0.4 + ph * 3);
      ctx.fillRect(sx * T - r, sy * T, r * 2, u * 0.35); ctx.fillRect(sx * T - u * 0.2, sy * T - r * 0.6, u * 0.4, u * 0.4);
    }
  }
}
