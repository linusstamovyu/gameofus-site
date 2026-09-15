// Fairy-tale land: a pastel castle at twilight, toadstool cottages, a meadow with
// a fairy ring, an enchanted lake with a swan, blossom trees hung with lantern
// orbs, and fireflies everywhere. The static picture is in fairy-scene.ts.
import stopsData from "../../content/stops.json";
import { PALMS, PARASOLS, PLAYER_START, W, hash } from "../map";
import { type Ctx, type View } from "./kit";
import {
  BUDS, CASTLE_WINDOWS, CHIMNEYS, COTTAGE_LIGHTS, CRYSTALS, MOON, PENNANTS, RING, TINY_SHROOMS, fairyExtras, fairyTile,
} from "./fairy-scene";
import type { Theme } from "./types";

const TAU = Math.PI * 2;
const stops = stopsData as unknown as { x: number; y: number; kind: string }[];
// Faces fireflies keep clear of (the lads at their stops, and where you start).
const HEADS = [...stops.filter(s => s.kind === "npc"), { x: PLAYER_START[0], y: PLAYER_START[1] }].map(s => [s.x + 0.5, s.y - 0.4] as [number, number]);

function ell(g: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0) {
  g.fillStyle = fill; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); g.fill();
}

/* ---------- cached glow sprites (made once per colour, never per frame) ---------- */
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(color: string, hard = false): HTMLCanvasElement {
  const key = color + (hard ? "h" : "");
  let c = sprites.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    const [r, gg, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    if (hard) { gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, `rgba(${r},${gg},${b},.9)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`); }
    else { gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.3, `rgba(${r},${gg},${b},.45)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`); }
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    sprites.set(key, c);
  }
  return c;
}
function glowAt(ctx: Ctx, x: number, y: number, r: number, color: string, a: number, hard = false) {
  if (a <= 0.01) return;
  ctx.globalAlpha = Math.min(1, a); ctx.drawImage(sprite(color, hard), x - r, y - r, r * 2, r * 2);
}

/* ---------- magic tree ---------- */
const swayOf = (x: number, y: number, t: number) => Math.sin(t * 0.8 + hash(x, y, 4) * TAU) * 0.035 + Math.sin(t * 1.9 + hash(x, y, 5) * TAU) * 0.01;
const ORB_DX = [-0.78, -0.3, 0.3, 0.8];
const ORB_COL = ["#ffd27a", "#ff9ad5", "#9ff3ff", "#ffd27a"];
function orbAt(x: number, y: number, i: number, t: number): [number, number] {
  const flip = hash(x, y, 8) > 0.5 ? -1 : 1, sw = swayOf(x, y, t);
  const len = 0.5 + hash(x, y, 20 + i) * 0.38;
  const swing = Math.sin(t * 1.5 + i * 1.7 + hash(x, y, 4) * 6) * 0.03;
  return [x + 0.5 + ORB_DX[i] * flip + sw * 1.3 + swing, y + 1 - 1.55 + len];
}
const orbPulse = (x: number, y: number, i: number, t: number) => 0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.3 + hash(x, y, 30 + i) * 6);

const CANOPY: [number, number, number][][] = [
  [[-0.62, 0.2, 0.34], [-0.22, 0.32, 0.36], [0.24, 0.3, 0.36], [0.62, 0.18, 0.32], [0, 0.08, 0.45]],
  [[-0.56, -0.05, 0.36], [-0.16, -0.2, 0.42], [0.3, -0.18, 0.4], [0.68, -0.02, 0.3], [0, 0.1, 0.38], [-0.36, 0.16, 0.3], [0.38, 0.14, 0.3]],
  [[-0.46, -0.24, 0.25], [-0.06, -0.42, 0.28], [0.3, -0.36, 0.23], [0.52, -0.18, 0.16], [-0.66, -0.02, 0.14]],
  [[-0.5, -0.33, 0.1], [-0.12, -0.54, 0.13], [0.18, -0.5, 0.1], [0.46, -0.3, 0.07]],
];
const TREE_PAL = [["#4a2458", "#9c4f93", "#e07fbf", "#f6b3dd", "#ffe3f3"], ["#2f2458", "#6a4f9e", "#a987e0", "#cdb5f3", "#f2eaff"]];

function drawTree(ctx: Ctx, T: number, x: number, y: number, t: number) {
  const cx = x * T + T / 2, by = (y + 1) * T, ph = hash(x, y, 4) * TAU, flip = hash(x, y, 8) > 0.5 ? -1 : 1;
  const sw = swayOf(x, y, t) * T, pal = TREE_PAL[hash(x, y, 9) > 0.45 ? 0 : 1];
  ell(ctx, cx, by - T * 0.12, T * 0.46, T * 0.15, "rgba(15,8,35,.3)");
  // roots
  ctx.fillStyle = "#3f2a45";
  for (const d of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + d * T * 0.08, by - T * 0.35);
    ctx.quadraticCurveTo(cx + d * T * 0.28, by - T * 0.2, cx + d * T * 0.38, by - T * 0.08);
    ctx.lineTo(cx + d * T * 0.1, by - T * 0.12); ctx.closePath(); ctx.fill();
  }
  // twisted trunk
  const N = 10, L: [number, number][] = [], R: [number, number][] = [], mid: [number, number, number][] = [];
  for (let k = 0; k <= N; k++) {
    const s = k / N, yy = by - T * 0.12 - s * T * 1.35;
    const xc = cx + Math.sin(s * 3.4 + ph) * T * 0.07 * flip + sw * s * s;
    const w = T * (0.34 - s * 0.19) + Math.max(0, 0.18 - s) * T * 1.0;
    L.push([xc - w / 2, yy]); R.push([xc + w / 2, yy]); mid.push([xc, yy, w]);
  }
  const tg = ctx.createLinearGradient(cx - T * 0.25, 0, cx + T * 0.25, 0);
  tg.addColorStop(0, "#402a48"); tg.addColorStop(0.4, "#7a5a78"); tg.addColorStop(1, "#2e1d38");
  ctx.fillStyle = tg; ctx.beginPath();
  L.forEach(([a, b], k) => (k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
  for (let k = N; k >= 0; k--) ctx.lineTo(R[k][0], R[k][1]);
  ctx.closePath(); ctx.fill();
  ctx.lineCap = "round";
  for (const [off, col] of [[0, "rgba(205,175,210,.55)"], [Math.PI, "rgba(25,12,35,.45)"]] as [number, string][]) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, T * 0.03); ctx.beginPath();
    mid.forEach(([mx, my, w], k) => { const px = mx + Math.sin(k * 0.95 + ph + off) * w * 0.3; k ? ctx.lineTo(px, my) : ctx.moveTo(px, my); });
    ctx.stroke();
  }
  // branches up into the canopy
  const top = mid[N], ccx = cx + sw, ccy = by - T * 1.95;
  ctx.strokeStyle = "#3f2a45"; ctx.lineWidth = T * 0.07;
  for (const d of [-0.55, 0.05, 0.5]) { ctx.beginPath(); ctx.moveTo(top[0], top[1] + T * 0.05); ctx.quadraticCurveTo(top[0] + d * T * 0.2, ccy + T * 0.15, ccx + d * T, ccy); ctx.stroke(); }
  // canopy: outline, then dark, mid, light and highlight clusters, one path per colour
  const blob = (list: [number, number, number][], grow: number, fill: string) => {
    ctx.fillStyle = fill; ctx.beginPath();
    list.forEach(([dx, dy, r], i) => {
      const jig = Math.sin(t * 1.3 + i + ph) * T * 0.008;
      const bx = ccx + dx * T * 1.18 * flip + jig, bY = ccy + dy * T * 1.05, rr = (r * 1.15 + grow) * T;
      ctx.moveTo(bx + rr, bY); ctx.ellipse(bx, bY, rr, rr * 0.82, 0, 0, TAU);
    });
    ctx.fill();
  };
  blob([...CANOPY[0], ...CANOPY[1]], 0.04, pal[0]);
  blob(CANOPY[0], 0, pal[1]);
  blob(CANOPY[1], 0, pal[2]);
  blob(CANOPY[2], 0, pal[3]);
  blob(CANOPY[3], 0, pal[4]);
  ctx.fillStyle = "rgba(255,245,252,.9)"; ctx.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = hash(i, 1, Math.round(ph * 10)) * TAU, rr = Math.sqrt(hash(i, 2, Math.round(ph * 10)));
    const px = ccx + Math.cos(a) * rr * T * 0.95, py = ccy + Math.sin(a) * rr * T * 0.55, s = T * 0.02;
    ctx.moveTo(px + s, py); ctx.arc(px, py, s, 0, TAU);
  }
  ctx.fill();
  // hanging lantern orbs
  for (let i = 0; i < 4; i++) {
    const [ox, oy] = orbAt(x, y, i, t), hx = ox * T, hy = oy * T, p = orbPulse(x, y, i, t);
    ctx.strokeStyle = "rgba(235,215,245,.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - (swayOf(x, y, t) * 0.3) * T, ccy + T * 0.3); ctx.lineTo(hx, hy - T * 0.07); ctx.stroke();
    ell(ctx, hx, hy - T * 0.075, T * 0.03, T * 0.015, "#c9a24a");
    ell(ctx, hx, hy, T * 0.085, T * 0.09, ORB_COL[i]);
    ell(ctx, hx - T * 0.02, hy - T * 0.02, T * 0.03 * p, T * 0.03 * p, "#ffffff");
  }
  // drifting petals
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.22 + hash(x, y, 40 + i)) % 1 + 1) % 1;
    const px = ccx + (hash(x, y, 50 + i) - 0.5) * T * 1.6 + Math.sin(k * 9 + i) * T * 0.15, py = ccy + T * 0.3 + k * (by - ccy - T * 0.3);
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ell(ctx, px, py, T * 0.03, T * 0.018, pal[3], k * 8);
    ctx.globalAlpha = 1;
  }
}

/* ---------- giant glowing mushroom ---------- */
function drawShroom(ctx: Ctx, T: number, x: number, y: number, t: number) {
  const cx = x * T + T / 2, by = (y + 1) * T, lean = (hash(x, y, 3) - 0.5) * T * 0.12, p = 0.8 + 0.2 * Math.sin(t * 1.7 + x);
  ell(ctx, cx, by - T * 0.12, T * 0.38, T * 0.12, "rgba(15,8,35,.3)");
  // babies
  for (const [dx, s, col] of [[-0.3, 0.55, "#7ff0ff"], [0.32, 0.4, "#ff9ef0"]] as [number, number, string][]) {
    const bx = cx + dx * T, bb = by - T * 0.14;
    ctx.fillStyle = "#efe6f2"; ctx.fillRect(bx - T * 0.03 * s, bb - T * 0.28 * s, T * 0.06 * s, T * 0.28 * s);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(bx, bb - T * 0.28 * s, T * 0.15 * s, T * 0.12 * s, 0, Math.PI, TAU); ctx.fill();
    ell(ctx, bx - T * 0.04 * s, bb - T * 0.34 * s, T * 0.03 * s, T * 0.02 * s, "#ffffff");
  }
  // stem
  const topX = cx + lean, topY = by - T * 0.86;
  const sg = ctx.createLinearGradient(cx - T * 0.13, 0, cx + T * 0.13, 0);
  sg.addColorStop(0, "#fdf6ff"); sg.addColorStop(0.6, "#e4d6ec"); sg.addColorStop(1, "#a893b8");
  ctx.fillStyle = sg; ctx.beginPath();
  ctx.moveTo(cx - T * 0.14, by - T * 0.12); ctx.quadraticCurveTo(cx - T * 0.06, by - T * 0.5, topX - T * 0.08, topY);
  ctx.lineTo(topX + T * 0.08, topY); ctx.quadraticCurveTo(cx + T * 0.1, by - T * 0.5, cx + T * 0.14, by - T * 0.12);
  ctx.closePath(); ctx.fill();
  ell(ctx, cx + lean * 0.6, by - T * 0.6, T * 0.15, T * 0.04, "#d5c3de");
  ell(ctx, cx + lean * 0.6, by - T * 0.585, T * 0.13, T * 0.025, "#f6eefa");
  // luminous gills
  const capY = by - T * 0.94;
  const gg = ctx.createRadialGradient(topX, capY + T * 0.02, 0, topX, capY + T * 0.02, T * 0.55);
  gg.addColorStop(0, `rgba(255,255,210,${0.95 * p})`); gg.addColorStop(0.6, "rgba(180,255,200,.85)"); gg.addColorStop(1, "rgba(110,200,190,.9)");
  ell(ctx, topX, capY + T * 0.03, T * 0.54, T * 0.13, gg as unknown as string);
  ctx.strokeStyle = "rgba(90,150,130,.5)"; ctx.lineWidth = 1;
  for (let k = -7; k <= 7; k++) { ctx.beginPath(); ctx.moveTo(topX + k * T * 0.01, capY + T * 0.02); ctx.lineTo(topX + k * T * 0.07, capY + T * 0.12); ctx.stroke(); }
  // cap
  const cg = ctx.createRadialGradient(topX - T * 0.2, capY - T * 0.3, T * 0.03, topX, capY - T * 0.1, T * 0.66);
  cg.addColorStop(0, "#ffb3e0"); cg.addColorStop(0.45, "#d44ea6"); cg.addColorStop(1, "#6a2a7a");
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(topX, capY, T * 0.58, T * 0.44, 0, Math.PI, TAU); ctx.ellipse(topX, capY, T * 0.58, T * 0.06, 0, 0, Math.PI); ctx.fill();
  for (const [sx, sy, r] of [[-0.3, -0.26, 0.08], [0.05, -0.36, 0.09], [0.33, -0.2, 0.07], [-0.08, -0.14, 0.05], [0.22, -0.4, 0.04], [-0.46, -0.08, 0.05]]) {
    ell(ctx, topX + sx * T, capY + sy * T, r * T, r * T * 0.75, "#fff0fa");
    ell(ctx, topX + sx * T - r * T * 0.3, capY + sy * T - r * T * 0.25, r * T * 0.35, r * T * 0.2, "#ffffff");
  }
  ell(ctx, topX - T * 0.24, capY - T * 0.32, T * 0.1, T * 0.04, "rgba(255,255,255,.35)", -0.5);
}

/* ---------- sign wrapped in vines ---------- */
function drawSign(ctx: Ctx, T: number, s: { x: number; y: number; label?: string }) {
  const px = s.x * T, by = (s.y + 1) * T, cx = px + T / 2;
  ell(ctx, cx, by - T * 0.1, T * 0.4, T * 0.12, "rgba(15,8,35,.3)");
  // post
  ctx.fillStyle = "#4a3326"; ctx.fillRect(cx - T * 0.07, by - T * 0.85, T * 0.14, T * 0.76);
  ctx.fillStyle = "#6e4d38"; ctx.fillRect(cx - T * 0.05, by - T * 0.85, T * 0.03, T * 0.76);
  // board with bark edge and grain
  const bx = px + T * 0.02, bt = by - T * 1.32, bw = T * 0.96, bh = T * 0.58;
  ctx.fillStyle = "#4a2e1c"; ctx.beginPath(); ctx.roundRect(bx, bt, bw, bh, T * 0.08); ctx.fill();
  const wg = ctx.createLinearGradient(0, bt, 0, bt + bh);
  wg.addColorStop(0, "#b88458"); wg.addColorStop(1, "#8a5a38");
  ctx.fillStyle = wg; ctx.beginPath(); ctx.roundRect(bx + T * 0.04, bt + T * 0.04, bw - T * 0.08, bh - T * 0.08, T * 0.06); ctx.fill();
  ctx.strokeStyle = "rgba(70,40,20,.3)"; ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) { const yy = bt + (bh * k) / 4; ctx.beginPath(); ctx.moveTo(bx + T * 0.08, yy); ctx.quadraticCurveTo(cx, yy + T * 0.03 * (k % 2 ? 1 : -1), bx + bw - T * 0.08, yy); ctx.stroke(); }
  // label
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(T * 0.24)}px "Pixelify Sans", monospace`;
  ctx.fillStyle = "rgba(50,25,15,.7)"; ctx.fillText(s.label ?? "", cx + 1, bt + bh / 2 + 2);
  ctx.fillStyle = "#fff4dc"; ctx.fillText(s.label ?? "", cx, bt + bh / 2 + 1);
  // vine round the post and over one corner
  ctx.strokeStyle = "#3d7a48"; ctx.lineWidth = Math.max(1.5, T * 0.03); ctx.lineCap = "round"; ctx.beginPath();
  for (let k = 0; k <= 14; k++) { const yy = by - T * 0.1 - (k / 14) * T * 0.78, xx = cx + Math.sin(k * 0.9) * T * 0.09; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
  ctx.quadraticCurveTo(bx - T * 0.02, bt + bh * 0.6, bx + T * 0.18, bt - T * 0.02);
  ctx.quadraticCurveTo(bx + T * 0.35, bt - T * 0.07, bx + T * 0.45, bt + T * 0.02);
  ctx.stroke();
  for (const [lx, ly, r] of [[cx + T * 0.09, by - T * 0.3, 0.6], [cx - T * 0.09, by - T * 0.55, -0.6], [bx + T * 0.2, bt - T * 0.04, -0.4], [bx + T * 0.4, bt, 0.5]] as [number, number, number][]) ell(ctx, lx, ly, T * 0.06, T * 0.03, "#6fb05f", r);
  for (const [fx, fy] of [[bx + T * 0.1, bt + T * 0.05], [cx + T * 0.08, by - T * 0.45]]) { ell(ctx, fx, fy, T * 0.035, T * 0.035, "#ffb3dd"); ell(ctx, fx, fy, T * 0.014, T * 0.014, "#ffe27a"); }
  // the rune, carved in the post, glowing
  const ry = by - T * 0.42;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  glowAt(ctx, cx, ry, T * 0.26, "#8fe9ff", 0.7); ctx.globalAlpha = 1;
  ctx.restore();
  ctx.strokeStyle = "#dffbff"; ctx.lineWidth = Math.max(1, T * 0.022);
  ctx.beginPath(); ctx.moveTo(cx, ry - T * 0.07); ctx.lineTo(cx, ry + T * 0.07); ctx.moveTo(cx - T * 0.045, ry - T * 0.03); ctx.lineTo(cx, ry); ctx.lineTo(cx + T * 0.045, ry - T * 0.03); ctx.stroke();
}

/* ---------- the enchanted lake ---------- */
const PADS: [number, number, number][] = [
  [2.2, 14.1, 1], [6.8, 13.75, 0], [8.1, 15.9, 0], [11.7, 14.4, 1], [14.9, 16.6, 0], [17.3, 13.85, 1],
  [19.8, 15.3, 1], [1.1, 16.8, 0], [10.2, 17.1, 1], [21.1, 13.7, 0], [13.3, 13.6, 0], [5.6, 16.4, 0],
];
function drawLake(ctx: Ctx, T: number, t: number, v: View) {
  const y0 = Math.max(13, v.y0), x0 = v.x0 * T, x1 = (v.x1 + 1) * T;
  if (y0 > v.y1) return;
  const lg = ctx.createLinearGradient(0, 13 * T, 0, 18 * T);
  lg.addColorStop(0, "#3d3f95"); lg.addColorStop(0.35, "#2a2c78"); lg.addColorStop(1, "#171743");
  ctx.fillStyle = lg; ctx.fillRect(x0, y0 * T, x1 - x0, (v.y1 + 1 - y0) * T);
  // slow deep patches
  for (let i = 0; i < 9; i++) {
    const px = (((hash(i, 1, 201) * 26 + t * 0.06 * (0.5 + hash(i, 2, 201))) % 26) - 2) * T, py = (13.6 + hash(i, 3, 201) * 4.2) * T;
    ell(ctx, px, py, T * (1.2 + hash(i, 4, 201)), T * 0.35, i % 3 ? "rgba(15,12,50,.22)" : "rgba(150,140,230,.1)");
  }
  // reflection of the far shore glow along the bank
  const bank = ctx.createLinearGradient(0, 13 * T, 0, 13.5 * T);
  bank.addColorStop(0, "rgba(10,5,30,.55)"); bank.addColorStop(1, "rgba(10,5,30,0)");
  ctx.fillStyle = bank; ctx.fillRect(x0, 13 * T, x1 - x0, T * 0.5);
  // moonlight path
  const mx = MOON[0] * T;
  for (let r = 0; r < 26; r++) {
    const yy = (13.35 + r * 0.18) * T, spread = T * (0.18 + r * 0.035);
    const ox = Math.sin(t * 1.2 + r * 1.9) * spread * 0.5, w = spread * (0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + r * 2.7)));
    ctx.fillStyle = `rgba(255,236,200,${0.5 - r * 0.014})`;
    ctx.fillRect(mx + ox - w / 2, yy, w, Math.max(1, T * 0.03));
  }
  // ripple streaks drifting
  for (let y = y0; y <= v.y1; y++)
    for (let k = 0; k < 8; k++) {
      const px = ((hash(y, k, 202) * 24 + t * (0.12 + hash(y, k, 203) * 0.1)) % 24 - 1) * T;
      if (px < x0 - T || px > x1) continue;
      const a = 0.12 + 0.12 * Math.sin(t * 1.4 + k * 2 + y);
      ctx.fillStyle = `rgba(190,190,255,${a})`;
      ctx.fillRect(px, (y + hash(y, k, 204)) * T, T * (0.3 + hash(y, k, 205) * 0.6), Math.max(1, T * 0.025));
    }
  // pads, lotus and rings
  ctx.lineWidth = Math.max(1, T * 0.02);
  PADS.forEach(([px, py, lotus], i) => {
    const X = px * T, Y = py * T + Math.sin(t * 1.1 + i) * T * 0.02, r = T * (0.22 + hash(i, 1, 206) * 0.08);
    const k = ((t * 0.35 + hash(i, 2, 206)) % 1);
    ctx.strokeStyle = `rgba(200,210,255,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(X, Y, r + k * T * 0.5, (r + k * T * 0.5) * 0.45, 0, 0, TAU); ctx.stroke();
    ell(ctx, X + T * 0.02, Y + T * 0.04, r, r * 0.5, "rgba(8,5,25,.4)");
    const a0 = hash(i, 3, 206) * TAU;
    ctx.fillStyle = "#3f8a5e"; ctx.beginPath(); ctx.moveTo(X, Y); ctx.ellipse(X, Y, r, r * 0.5, 0, a0 + 0.35, a0 + TAU - 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#62b07a"; ctx.beginPath(); ctx.moveTo(X, Y); ctx.ellipse(X - r * 0.1, Y - r * 0.06, r * 0.75, r * 0.34, 0, a0 + 0.5, a0 + TAU - 0.5); ctx.closePath(); ctx.fill();
    if (lotus) {
      for (let pp = 0; pp < 6; pp++) {
        const a = (pp / 6) * TAU + 0.3;
        ell(ctx, X + Math.cos(a) * T * 0.07, Y - T * 0.05 + Math.sin(a) * T * 0.03, T * 0.07, T * 0.035, pp % 2 ? "#ffb6e1" : "#ffd6ef", a);
      }
      ell(ctx, X, Y - T * 0.08, T * 0.05, T * 0.04, "#fff0f8");
      ell(ctx, X, Y - T * 0.08, T * 0.022, T * 0.02, "#ffe27a");
    }
  });
  // reflected stars
  for (let i = 0; i < 34; i++) {
    const sx = hash(i, 1, 208) * W * T + Math.sin(t * 0.9 + i) * T * 0.03, sy = (13.4 + hash(i, 2, 208) * 4.5) * T;
    if (sx < x0 || sx > x1) continue;
    ctx.fillStyle = `rgba(255,248,225,${0.2 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1))})`;
    ctx.fillRect(sx, sy, Math.max(1, T * 0.025), Math.max(1, T * 0.012));
  }
  drawSwan(ctx, T, t);
  // mist wisps
  for (let i = 0; i < 5; i++) {
    const px = ((hash(i, 1, 207) * 30 + t * 0.15) % 30 - 4) * T, py = (13.5 + hash(i, 2, 207) * 3.8) * T;
    ell(ctx, px, py, T * 2.2, T * 0.22, "rgba(220,200,255,.07)");
  }
}

function drawSwan(ctx: Ctx, T0: number, t: number) {
  const X = ((((t ? 3 + t * 0.2 : 13) % 26) + 26) % 26 - 2) * T0, Y = (15.35 + Math.sin(t * 0.7) * 0.04) * T0, T = T0 * 1.45;
  // wake and reflection
  ctx.strokeStyle = "rgba(210,215,255,.3)"; ctx.lineWidth = Math.max(1, T * 0.02);
  for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(X - T * 0.2 - k * T * 0.25, Y - k * T * 0.06); ctx.lineTo(X - T * 0.2, Y + T * 0.02); ctx.lineTo(X - T * 0.2 - k * T * 0.25, Y + T * 0.1 + k * T * 0.06); ctx.stroke(); }
  ell(ctx, X, Y + T * 0.12, T * 0.36, T * 0.1, "rgba(240,240,255,.16)");
  // body
  ell(ctx, X, Y, T * 0.36, T * 0.16, "#f4f1ff");
  ctx.fillStyle = "#ffffff"; ctx.beginPath();
  ctx.moveTo(X - T * 0.32, Y - T * 0.02); ctx.quadraticCurveTo(X - T * 0.1, Y - T * 0.32, X + T * 0.2, Y - T * 0.06);
  ctx.quadraticCurveTo(X - T * 0.05, Y + T * 0.02, X - T * 0.32, Y - T * 0.02); ctx.fill();
  ctx.strokeStyle = "rgba(170,160,210,.7)"; ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(X - T * (0.22 - k * 0.1), Y - T * (0.12 - k * 0.02)); ctx.quadraticCurveTo(X - T * (0.1 - k * 0.1), Y - T * 0.02, X + T * (0.05 + k * 0.05), Y - T * 0.04); ctx.stroke(); }
  ell(ctx, X, Y + T * 0.08, T * 0.34, T * 0.05, "rgba(150,140,200,.35)");
  // neck and head
  ctx.strokeStyle = "#fbf9ff"; ctx.lineWidth = T * 0.07; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(X + T * 0.22, Y - T * 0.04); ctx.bezierCurveTo(X + T * 0.4, Y - T * 0.18, X + T * 0.18, Y - T * 0.4, X + T * 0.3, Y - T * 0.5); ctx.stroke();
  ell(ctx, X + T * 0.33, Y - T * 0.51, T * 0.06, T * 0.045, "#ffffff");
  ctx.fillStyle = "#ff9a4a"; ctx.beginPath(); ctx.moveTo(X + T * 0.37, Y - T * 0.53); ctx.lineTo(X + T * 0.47, Y - T * 0.49); ctx.lineTo(X + T * 0.37, Y - T * 0.48); ctx.closePath(); ctx.fill();
  ell(ctx, X + T * 0.33, Y - T * 0.53, T * 0.012, T * 0.012, "#1b1430");
  // a tiny gold crown, because it is that sort of lake
  ctx.fillStyle = "#ffd873"; ctx.beginPath();
  ctx.moveTo(X + T * 0.29, Y - T * 0.56); ctx.lineTo(X + T * 0.3, Y - T * 0.62); ctx.lineTo(X + T * 0.32, Y - T * 0.58); ctx.lineTo(X + T * 0.34, Y - T * 0.63); ctx.lineTo(X + T * 0.35, Y - T * 0.56); ctx.closePath(); ctx.fill();
}

/* ---------- fireflies ---------- */
const FLIES = 120;
const FLY_COL = ["#f2ff9a", "#f2ff9a", "#ffe08a", "#f2ff9a", "#ffc2f6", "#b9f7ff"];
function flyAt(i: number, t: number): [number, number, number] {
  const zone = hash(i, 1, 301);
  const bx = hash(i, 2, 301) * W;
  const by = zone < 0.3 ? 2.2 + hash(i, 3, 301) * 2.4 : zone < 0.72 ? 4.3 + hash(i, 3, 301) * 8.2 : 12.2 + hash(i, 3, 301) * 5.2;
  const f1 = 0.15 + hash(i, 4, 301) * 0.25, f2 = 0.4 + hash(i, 5, 301) * 0.5, p1 = hash(i, 6, 301) * TAU, p2 = hash(i, 7, 301) * TAU;
  const x = bx + Math.sin(t * f1 + p1) * 0.7 + Math.sin(t * f2 + p2) * 0.2;
  const y = by + Math.cos(t * f1 * 0.8 + p2) * 0.45 + Math.sin(t * f2 * 1.3 + p1) * 0.12;
  const blink = Math.sin(t * (0.9 + hash(i, 8, 301) * 1.4) + p1);
  const a = t ? 0.18 + 0.82 * Math.pow(Math.max(0, blink), 2) : 0.4 + hash(i, 9, 301) * 0.5;
  return [x, y, a];
}

export const fairy: Theme = {
  id: "fairy",
  label: "Fairy-tale land",
  blurb: "Castles and fireflies",
  place: "in a fairy-tale kingdom",
  stageBg: "#1d1638",
  swatch: ["#e9a8d8", "#3a2f7a"],
  lines: { barrier: "The lake is enchanted", blocked: "Can’t walk there" },
  tile: fairyTile,
  extras: fairyExtras,

  live(ctx, T, time, animated, v) {
    const t = animated ? time : 0;
    drawLake(ctx, T, t, v);
    if (v.y0 > 1) return;
    // pennants
    for (const [px, tip, col] of PENNANTS) {
      const X = px * T, top = Math.max(T * 0.02, (tip - 0.2) * T);
      ctx.fillStyle = "#8a6a4a"; ctx.fillRect(X - 0.75, top, 1.5, tip * T - top);
      const L = T * 0.3, h = T * 0.07;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X, top);
      for (let s = 1; s <= 6; s++) ctx.lineTo(X + (L * s) / 6, top + Math.sin(t * 5 - s * 0.9 + px) * T * 0.025 * (s / 6) + (h * s) / 12);
      for (let s = 6; s >= 0; s--) ctx.lineTo(X + (L * s) / 6, top + h + Math.sin(t * 5 - s * 0.9 + px) * T * 0.025 * (s / 6) - (h * s) / 12 * (s === 6 ? 1 : 1));
      ctx.closePath(); ctx.fill();
    }
    // sparkly chimney smoke
    for (const [cx, cy] of CHIMNEYS)
      for (let k = 0; k < 4; k++) {
        const ph = ((t * 0.3 + k / 4) % 1);
        const sx = cx * T + Math.sin(ph * 5 + k) * T * 0.08 + ph * T * 0.15, sy = (cy - 0.05) * T - ph * T * 0.5;
        ell(ctx, sx, sy, T * (0.06 + ph * 0.1), T * (0.05 + ph * 0.08), `rgba(235,220,255,${0.35 * (1 - ph)})`);
      }
  },

  tall: (ctx, T, x, y, time) => drawTree(ctx, T, x, y, time),
  small: (ctx, T, x, y, time) => drawShroom(ctx, T, x, y, time),
  sign: (ctx, T, s) => drawSign(ctx, T, s),

  grade(ctx, _T, v) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#cdb8ee"; ctx.fillRect(v.cx, v.cy, v.vw, v.vh);
    ctx.restore();
  },

  lights(ctx, T, time, animated, v) {
    const t = animated ? time : 0;
    const inView = (x: number, y: number, pad = 1) => x > v.x0 - pad && x < v.x1 + 1 + pad && y > v.y0 - pad && y < v.y1 + 1 + pad;
    ctx.globalCompositeOperation = "lighter";
    // windows, lanterns and the gate
    CASTLE_WINDOWS.forEach(([x, y], i) => inView(x, y) && glowAt(ctx, x * T, y * T, T * 0.38, "#ffb45e", 0.42 + 0.08 * Math.sin(t * 3 + i * 2.1)));
    if (inView(11, 2.7)) glowAt(ctx, 11 * T, 2.8 * T, T * 0.8, "#ffa65a", 0.45);
    COTTAGE_LIGHTS.forEach(([x, y, r], i) => inView(x, y) && glowAt(ctx, x * T, y * T, T * (r < 0.1 ? 0.45 : 0.6), "#ffb45e", 0.5 + 0.12 * Math.sin(t * 4.3 + i * 1.7) * Math.sin(t * 2.1 + i)));
    if (inView(MOON[0], MOON[1])) glowAt(ctx, MOON[0] * T, MOON[1] * T, T * 0.9, "#ffe9cf", 0.35);
    // crystals and vine buds
    CRYSTALS.forEach(([x, y, s, k], i) => {
      if (!inView(x, y)) return;
      const p = 0.55 + 0.35 * Math.sin(t * 1.3 + i * 1.9);
      glowAt(ctx, x * T, (y - 0.25 * s) * T, T * 0.75 * s, k ? "#c77dff" : "#5fdcff", p * 0.75);
    });
    BUDS.forEach(([x, y], i) => inView(x, y) && glowAt(ctx, x * T, y * T, T * 0.14, i % 2 ? "#8fffbf" : "#ffb8ea", 0.45 + 0.4 * Math.sin(t * 2.4 + i * 1.3)));
    // tree orbs
    for (const [x, y] of PALMS) {
      if (!inView(x, y - 2, 2)) continue;
      for (let i = 0; i < 4; i++) {
        const [ox, oy] = orbAt(x, y, i, t), p = orbPulse(x, y, i, t);
        glowAt(ctx, ox * T, oy * T, T * 0.5 * p, ORB_COL[i], 0.55 * p);
      }
    }
    // mushrooms
    for (const [x, y] of PARASOLS) {
      if (!inView(x, y)) continue;
      const p = 0.8 + 0.2 * Math.sin(t * 1.7 + x);
      glowAt(ctx, x * T + T / 2, (y + 1) * T - T * 0.85, T * 1.0, "#b8ffcf", 0.4 * p);
      glowAt(ctx, x * T + T / 2, (y + 1) * T - T * 1.1, T * 0.8, "#ff79c8", 0.22 * p);
    }
    TINY_SHROOMS.forEach(([x, y, k], i) => inView(x, y) && glowAt(ctx, x * T, y * T, T * 0.28, k ? "#ff9ef0" : "#7ff0ff", 0.4 + 0.25 * Math.sin(t * 1.9 + i)));
    for (let i = 0; i < RING.n; i++) {
      const a = (i / RING.n) * TAU + 0.2, x = RING.cx + Math.cos(a) * RING.rx, y = RING.cy + Math.sin(a) * RING.ry - 0.15;
      if (inView(x, y)) glowAt(ctx, x * T, y * T, T * 0.3, "#ffd0f0", 0.3 + 0.35 * Math.max(0, Math.sin(t * 2 - i * 0.57)));
    }
    if (inView(RING.cx, RING.cy)) glowAt(ctx, RING.cx * T, RING.cy * T, T * 1.2, "#c9a4ff", 0.16 + 0.06 * Math.sin(t));
    // lotus lights and lake sparkles
    PADS.forEach(([x, y, lotus], i) => lotus && inView(x, y) && glowAt(ctx, x * T, (y - 0.08) * T, T * 0.45, "#ffc2ea", 0.45 + 0.2 * Math.sin(t * 1.5 + i)));
    if (v.y1 >= 13) glowAt(ctx, MOON[0] * T, 15.2 * T, T * 1.6, "#fff0c8", 0.12);
    ctx.strokeStyle = "rgba(255,250,235,.9)"; ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const x = hash(i, 1, 401) * W, y = 13.3 + hash(i, 2, 401) * 4.5;
      if (!inView(x, y)) continue;
      const a = t ? Math.pow(Math.max(0, Math.sin(t * (1 + hash(i, 3, 401)) + i * 2.3)), 6) : hash(i, 4, 401) * 0.6;
      if (a < 0.05) continue;
      const r = T * 0.12 * a;
      glowAt(ctx, x * T, y * T, r * 1.6, "#fff6d8", a * 0.8, true);
      ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x * T - r, y * T); ctx.lineTo(x * T + r, y * T); ctx.moveTo(x * T, y * T - r); ctx.lineTo(x * T, y * T + r); ctx.stroke();
    }
    // fireflies
    for (let i = 0; i < FLIES; i++) {
      const [x, y, a0] = flyAt(i, t);
      if (!inView(x, y, 0.5)) continue;
      let a = a0;
      for (const [hx, hy] of HEADS) { const d = Math.hypot(x - hx, (y - hy) * 1.3); if (d < 0.7) a *= Math.max(0.1, d / 0.7); }
      const col = FLY_COL[i % FLY_COL.length];
      if (a > 0.45) glowAt(ctx, x * T, y * T, T * 0.62, col, a * 0.22);
      glowAt(ctx, x * T, y * T, T * 0.26, col, a * 0.75);
      glowAt(ctx, x * T, y * T, T * 0.09, col, a, true);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  },
};
