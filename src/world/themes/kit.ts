// Shared drawing tools for the world themes. Every theme paints the SAME map
// (same bands, same prop tiles, same people); only the pictures change.
import type { Stop } from "../../content/types";
import { hash } from "../map";

export type Ctx = CanvasRenderingContext2D;

/** Tile range and camera for the part of the map on screen. */
export interface View { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; vw: number; vh: number }

/* ---------- colour ---------- */
const rgbCache = new Map<string, [number, number, number]>();
export function rgb(hex: string): [number, number, number] {
  let c = rgbCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}
/** Mix two hex colours; t = 0 is `a`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a), [br, bg, bb] = rgb(b), k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(ar + (br - ar) * k)},${Math.round(ag + (bg - ag) * k)},${Math.round(ab + (bb - ab) * k)})`;
}
export const rgba = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };

/* ---------- noise ---------- */
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Smooth value noise in tile units, continuous across tiles (so ground never shows a grid). */
export function vnoise(x: number, y: number, scale: number, s = 0): number {
  const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = smooth(fx - ix), ty = smooth(fy - iy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/**
 * Fill a tile as an n×n grid of blocks, each coloured from its own position in
 * tile units. With vnoise inside, that gives soft pixel-art gradients.
 */
export function blocks(g: Ctx, x: number, y: number, T: number, n: number, color: (fx: number, fy: number) => string) {
  const b = T / n;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      g.fillStyle = color(x + (i + 0.5) / n, y + (j + 0.5) / n);
      g.fillRect(x * T + i * b, y * T + j * b, b + 0.5, b + 0.5);
    }
}

/* ---------- shapes ---------- */
export function ellipse(g: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string) {
  g.fillStyle = fill; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); g.fill();
}
export function shadow(g: Ctx, cx: number, cy: number, rx: number, ry: number, a = 0.22) {
  ellipse(g, cx, cy, rx, ry, `rgba(10,8,20,${a})`);
}
/** Soft additive light. Use inside a "lighter" pass for real glow. */
export function glow(g: Ctx, cx: number, cy: number, r: number, color: string, a: number) {
  const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  grd.addColorStop(0, rgba(color, a)); grd.addColorStop(1, rgba(color, 0));
  g.fillStyle = grd; g.fillRect(cx - r, cy - r, r * 2, r * 2);
}
export function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 1) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}

/* ---------- deterministic particles ---------- */
/** 0..1 from an index and a salt, stable across frames. */
export const r01 = (i: number, s: number) => hash(i, s, 91);
/** Wrap a value into 0..m. */
export const wrap = (v: number, m: number) => ((v % m) + m) % m;

/* ---------- a sign any theme can dress ---------- */
export interface SignStyle { post: string; board: string; face: string; ink: string; font?: string; glow?: string }
export function signBoard(ctx: Ctx, T: number, s: Stop, st: SignStyle) {
  const px = s.x * T, by = (s.y + 1) * T;
  shadow(ctx, px + T / 2, by - T * 0.1, T * 0.38, T * 0.12, 0.2);
  ctx.fillStyle = st.post; ctx.fillRect(px + T * 0.44, by - T * 0.8, T * 0.12, T * 0.7);
  ctx.fillStyle = st.board; ctx.fillRect(px + T * 0.02, by - T * 1.28, T * 0.96, T * 0.56);
  ctx.fillStyle = st.face; ctx.fillRect(px + T * 0.07, by - T * 1.23, T * 0.86, T * 0.46);
  if (st.glow) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glow(ctx, px + T / 2, by - T * 1.0, T * 0.9, st.glow, 0.28);
    ctx.restore();
  }
  ctx.fillStyle = st.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(T * 0.24)}px ${st.font ?? '"Pixelify Sans", monospace'}`;
  ctx.fillText(s.label ?? "", px + T / 2, by - T * 0.99);
}
