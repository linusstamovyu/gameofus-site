// Fairy-tale land, the static half: the twilight sky, the mossy wall, the pastel
// castle, the toadstool cottages, the glowing cobbles, the meadow scatter and
// the bluebell shore. Everything here is painted once into the layer; the
// positions of anything that GLOWS are exported so the lights pass can find it.
import stopsData from "../../content/stops.json";
import { Ground, H, PALMS, PARASOLS, PLAYER_START, W, hash } from "../map";
import { vnoise, type Ctx } from "./kit";

const TAU = Math.PI * 2;

/* ---------- shared positions (tile units) ---------- */
export const MOON: [number, number] = [4.3, 0.34];
/** Arched castle windows: x, y (centre). */
export const CASTLE_WINDOWS: [number, number][] = [
  [10.78, 1.22], [11.22, 1.22], [11, 1.72],
  [9.35, 1.52], [9.35, 2.28], [12.65, 1.52], [12.65, 2.28],
  [7.75, 1.9], [7.75, 2.5], [14.25, 1.9], [14.25, 2.5],
  [8.55, 2.45], [13.45, 2.45],
];
/** Pennant poles: x, tip y of the roof, colour. */
export const PENNANTS: [number, number, string][] = [
  [11, 0.2, "#ffd36e"], [9.35, 0.52, "#ff8cc6"], [12.65, 0.52, "#ff8cc6"], [7.75, 1.0, "#9ee7ff"], [14.25, 1.0, "#9ee7ff"],
];
/** Cottage windows and lanterns: x, y, radius. */
export const COTTAGE_LIGHTS: [number, number, number][] = [
  [1.2, 2.05, 0.16], [2.35, 2.2, 0.14], [2.25, 2.62, 0.06],
  [19.65, 2.2, 0.14], [20.8, 2.05, 0.16], [19.75, 2.62, 0.06],
];
export const CHIMNEYS: [number, number][] = [[2.65, 0.52], [19.35, 0.52]];
/** Wall crystals: x, y (base), scale, kind (0 cyan, 1 violet). */
export const CRYSTALS: [number, number, number, number][] = [
  [4.15, 2.62, 1, 0], [5.75, 1.95, 0.8, 1], [3.7, 1.55, 0.55, 1], [6.45, 2.7, 0.6, 0],
  [16.15, 2.6, 0.95, 1], [17.55, 1.8, 0.75, 0], [18.05, 2.72, 0.5, 1], [15.7, 1.5, 0.5, 0],
];
export const RING: { cx: number; cy: number; rx: number; ry: number; n: number } = { cx: 6.35, cy: 10.95, rx: 0.95, ry: 0.5, n: 11 };
/** Tiny glowing meadow mushrooms: x, y, kind. Filled by `meadow`. */
export const TINY_SHROOMS: [number, number, number][] = [];
/** Glow buds on the vines and the path moss: x, y. */
export const BUDS: [number, number][] = [];

/* ---------- small helpers ---------- */
type RGB = [number, number, number];
const hx = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export function lerp3(a: string, b: string, t: number): RGB {
  const A = hx(a), B = hx(b), k = Math.max(0, Math.min(1, t));
  return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
}
export const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixc = (a: RGB, b: string, t: number): RGB => { const B = hx(b); return [a[0] + (B[0] - a[0]) * t, a[1] + (B[1] - a[1]) * t, a[2] + (B[2] - a[2]) * t]; };

function fillEll(g: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string, rot = 0) {
  g.fillStyle = fill; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); g.fill();
}

const stops = stopsData as unknown as { x: number; y: number; kind: string }[];
const occupied = new Set<number>();
for (const [x, y] of [...PALMS, ...PARASOLS, PLAYER_START]) occupied.add(y * W + x);
for (const s of stops) { occupied.add(s.y * W + s.x); if (s.kind === "npc") occupied.add((s.y - 1) * W + s.x); }
const isFree = (fx: number, fy: number) => !occupied.has(Math.floor(fy) * W + Math.floor(fx));

/* ---------- ground tiles ---------- */
export function fairyTile(g: Ctx, band: Ground, x: number, y: number, T: number) {
  const px = x * T, py = y * T, u = T / 16;
  switch (band) {
    case Ground.Town: g.fillStyle = "#6a4796"; g.fillRect(px, py, T, T); return;
    case Ground.Cliff: g.fillStyle = "#3a3155"; g.fillRect(px, py, T, T); return;
    case Ground.Board: g.fillStyle = "#355a4e"; g.fillRect(px, py, T, T); return;
    case Ground.Sea: g.fillStyle = "#23255e"; g.fillRect(px, py, T, T); return;
    case Ground.Sand:
    case Ground.Wet: {
      const n = 6, b = T / n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const fx = x + (i + 0.5) / n, fy = y + (j + 0.5) / n;
          const n1 = vnoise(fx, fy, 2.6, 11), n2 = vnoise(fx, fy, 1.3, 12), n3 = vnoise(fx, fy, 4.2, 13);
          let c = lerp3("#3d7355", "#66a565", n1 * 0.85 + n2 * 0.15);
          if (n3 > 0.6) c = mixc(c, "#86c078", (n3 - 0.6) * 1.4);
          const lav = vnoise(fx, fy, 3.4, 14);
          if (lav > 0.66) c = mixc(c, "#6f7fa0", (lav - 0.66) * 1.2); // dusk light pooling
          if (fy < 4.6) c = mixc(c, "#2f5a48", (4.6 - fy) * 0.5); // shade at the foot of the path
          if (band === Ground.Wet) {
            const d = fy - 12; // row-varying: grass into mossy bank
            if (d > 0.45) c = mixc(c, vnoise(fx, fy, 0.9, 15) > 0.5 ? "#4a5a55" : "#3e3f58", Math.min(0.85, (d - 0.45) * 2.2));
          }
          g.fillStyle = css(c); g.fillRect(px + i * b, py + j * b, b + 0.5, b + 0.5);
        }
      // blade marks: little leaning pairs, never in rows
      g.lineWidth = Math.max(1, u * 0.55); g.lineCap = "round";
      for (let i = 0; i < 9; i++) {
        const bx = px + hash(x, y, i + 30) * (T - u), by = py + u * 2 + hash(x, y, i + 50) * (T - u * 2);
        if (band === Ground.Wet && by > py + T * 0.55) continue;
        const h = u * (1 + hash(x, y, i + 90) * 1.6), lean = (hash(x, y, i + 110) - 0.5) * u * 1.6;
        g.strokeStyle = hash(x, y, i + 70) > 0.45 ? "rgba(20,50,35,.4)" : "rgba(190,240,170,.3)";
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + lean, by - h);
        if (hash(x, y, i + 130) > 0.5) { g.moveTo(bx + u * 0.6, by); g.lineTo(bx + u * 0.6 - lean * 0.6, by - h * 0.7); }
        g.stroke();
      }
      return;
    }
  }
}

/* ---------- the big static picture ---------- */
export function fairyExtras(g: Ctx, T: number) {
  BUDS.length = 0;
  sky(g, T);
  wall(g, T);
  vines(g, T);
  castle(g, T);
  cottage(g, T, 1.75, false);
  cottage(g, T, 20.25, true);
  for (const [x, y, s, k] of CRYSTALS) crystal(g, T, x, y, s * 1.35, k);
  path(g, T);
  meadow(g, T);
  shore(g, T);
}

function sky(g: Ctx, T: number) {
  const WW = W * T;
  const gr = g.createLinearGradient(0, 0, 0, T);
  gr.addColorStop(0, "#2a1c5c"); gr.addColorStop(0.5, "#6c4798"); gr.addColorStop(0.85, "#d98bb6"); gr.addColorStop(1, "#f3b4bd");
  g.fillStyle = gr; g.fillRect(0, 0, WW, T);
  for (let i = 0; i < 90; i++) {
    const sx = hash(i, 1, 31) * WW, sy = hash(i, 2, 31) * T * 0.52, big = hash(i, 3, 31) > 0.88;
    g.fillStyle = `rgba(255,248,230,${0.35 + hash(i, 4, 31) * 0.55})`;
    const s = Math.max(1, T / 48) * (big ? 2 : 1);
    g.fillRect(sx, sy, s, s);
    if (big) { g.fillStyle = "rgba(255,248,230,.35)"; g.fillRect(sx - s, sy + s / 2 - 0.5, s * 3, 1); g.fillRect(sx + s / 2 - 0.5, sy - s, 1, s * 3); }
  }
  // moon with halo
  const [mx, my] = MOON;
  const halo = g.createRadialGradient(mx * T, my * T, 0, mx * T, my * T, T * 0.9);
  halo.addColorStop(0, "rgba(255,240,215,.55)"); halo.addColorStop(0.35, "rgba(255,220,230,.18)"); halo.addColorStop(1, "rgba(255,200,230,0)");
  g.fillStyle = halo; g.fillRect(mx * T - T, my * T - T, T * 2, T * 2);
  fillEll(g, mx * T, my * T, T * 0.2, T * 0.2, "#fff4de");
  fillEll(g, mx * T - T * 0.06, my * T - T * 0.03, T * 0.05, T * 0.045, "rgba(214,190,200,.5)");
  fillEll(g, mx * T + T * 0.07, my * T + T * 0.06, T * 0.035, T * 0.03, "rgba(214,190,200,.45)");
  fillEll(g, mx * T + T * 0.02, my * T - T * 0.1, T * 0.025, T * 0.02, "rgba(214,190,200,.4)");
  // far hills, then a nearer wooded ridge
  const ridge = (base: number, amp: number, seed: number, fill: string, bumps: boolean) => {
    g.beginPath(); g.moveTo(0, T);
    for (let px = 0; px <= WW; px += T / 8) {
      const f = px / T;
      const hy = base - (Math.sin(f * 0.55 + seed) * 0.08 + Math.sin(f * 1.7 + seed * 2) * 0.04 + vnoise(f, 0, 2.2, seed) * amp);
      g.lineTo(px, hy * T);
    }
    g.lineTo(WW, T); g.closePath(); g.fillStyle = fill; g.fill();
    if (bumps) {
      g.beginPath();
      for (let i = 0; i < W * 5; i++) {
        const f = (i + hash(i, 7, seed) * 0.6) / 5;
        const hy = base - (Math.sin(f * 0.55 + seed) * 0.08 + Math.sin(f * 1.7 + seed * 2) * 0.04 + vnoise(f, 0, 2.2, seed) * amp);
        const r = (0.06 + hash(i, 8, seed) * 0.07) * T;
        g.moveTo(f * T + r, hy * T); g.arc(f * T, hy * T, r, 0, TAU);
      }
      g.fill();
    }
  };
  ridge(0.72, 0.14, 3, "#a47bb3", false);
  ridge(0.86, 0.12, 5, "#76559a", true);
}

function wall(g: Ctx, T: number) {
  const top = T, WW = W * T, ch = T * 0.29, gap = Math.max(1, T * 0.025), u = T / 16;
  g.fillStyle = "#322a4b"; g.fillRect(0, top, WW, 2 * T);
  const courses = Math.ceil((2 * T) / ch);
  for (let c = 0; c < courses; c++) {
    const y0 = top + c * ch, bw = T * (0.6 + hash(c, 0, 41) * 0.28), off = -hash(c, 1, 41) * bw;
    const hgt = Math.min(ch, 3 * T - y0);
    for (let k = 0; off + k * bw < WW; k++) {
      const x0 = off + k * bw;
      const n = vnoise(x0 / T, y0 / T, 3, 7);
      const c0 = lerp3("#7b719c", "#aba2c6", hash(c, k, 43) * 0.55 + n * 0.45);
      g.beginPath(); g.roundRect(x0 + gap, y0 + gap, bw - gap * 2, hgt - gap * 2, T * 0.045);
      g.fillStyle = css(c0); g.fill();
      g.fillStyle = "rgba(255,240,255,.2)"; g.fillRect(x0 + gap * 3, y0 + gap, bw - gap * 6, u * 0.8);
      g.fillStyle = "rgba(20,10,45,.25)"; g.fillRect(x0 + gap * 2, y0 + hgt - gap - u, bw - gap * 4, u);
      if (hash(c, k, 44) > 0.8) { // hairline crack
        g.strokeStyle = "rgba(40,25,60,.45)"; g.lineWidth = Math.max(1, u * 0.5); g.beginPath();
        const cx0 = x0 + bw * (0.3 + hash(c, k, 45) * 0.4);
        g.moveTo(cx0, y0 + gap * 2); g.lineTo(cx0 + u * 1.5, y0 + hgt * 0.5); g.lineTo(cx0 - u, y0 + hgt - gap * 2); g.stroke();
      }
      const moss = vnoise((x0 + bw / 2) / T, y0 / T, 1.8, 9);
      if (moss > 0.55) {
        for (let m = 0; m < 5; m++) {
          const mx = x0 + gap + hash(c, k * 7 + m, 46) * (bw - gap * 2), my = y0 + gap + hash(c, k * 7 + m, 47) * hgt * 0.45;
          fillEll(g, mx, my, u * (1.2 + hash(c, m, 48) * 1.4), u * (0.8 + hash(c, m, 49)), m % 2 ? "#5f8c52" : "#7fb466");
        }
      }
    }
  }
  // lumpy moss cushion along the top of the wall
  for (let px = -T * 0.1; px < WW + T * 0.2; px += T / 7) {
    const i = Math.round(px / (T / 7));
    fillEll(g, px, top + T * (0.02 + hash(i, 0, 51) * 0.06), T * (0.09 + hash(i, 1, 51) * 0.08), T * (0.06 + hash(i, 2, 51) * 0.05), "#46704a");
  }
  for (let px = 0; px < WW; px += T / 5) {
    const i = Math.round(px / (T / 5));
    fillEll(g, px + T * 0.05, top + T * (0.0 + hash(i, 3, 51) * 0.04), T * (0.06 + hash(i, 4, 51) * 0.05), T * 0.035, "#7ab768");
  }
  // shadow at the foot of the wall
  const fs = g.createLinearGradient(0, 3 * T - T * 0.35, 0, 3 * T);
  fs.addColorStop(0, "rgba(15,8,35,0)"); fs.addColorStop(1, "rgba(15,8,35,.45)");
  g.fillStyle = fs; g.fillRect(0, 3 * T - T * 0.35, WW, T * 0.35);
}

function vines(g: Ctx, T: number) {
  const spots = [3.55, 4.75, 6.25, 15.45, 16.8, 18.0, 7.25, 14.75];
  spots.forEach((vx, i) => {
    const len = (0.9 + hash(i, 0, 61) * 0.85) * T, x0 = vx * T;
    const pts: [number, number][] = [];
    for (let s = 0; s <= 12; s++) {
      const yy = T * 1.02 + (len * s) / 12;
      pts.push([x0 + Math.sin(s * 0.9 + i) * T * 0.06, yy]);
    }
    g.strokeStyle = "#35603f"; g.lineWidth = Math.max(1.5, T * 0.035); g.lineCap = "round";
    g.beginPath(); pts.forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
    pts.forEach(([a, b], k) => {
      if (k === 0) return;
      const side = k % 2 ? 1 : -1;
      fillEll(g, a + side * T * 0.06, b, T * 0.06, T * 0.03, k % 3 ? "#5ea45a" : "#7cc46c", side * 0.6);
      if (hash(i, k, 62) > 0.62) {
        const fc = hash(i, k, 63) > 0.5 ? "#ffb3dd" : "#fff2fa";
        const fx0 = a - side * T * 0.05, fy0 = b + T * 0.02;
        for (let p = 0; p < 5; p++) fillEll(g, fx0 + Math.cos((p * TAU) / 5) * T * 0.025, fy0 + Math.sin((p * TAU) / 5) * T * 0.025, T * 0.02, T * 0.02, fc);
        fillEll(g, fx0, fy0, T * 0.014, T * 0.014, "#ffe27a");
        if (hash(i, k, 64) > 0.55) BUDS.push([fx0 / T, fy0 / T]);
      }
    });
  });
}

/* ---------- the castle ---------- */
function tower(g: Ctx, T: number, cx: number, w: number, topY: number, botY: number, tipY: number, roof: [string, string, string]) {
  const X = cx * T, Wp = w * T, u = T / 16;
  const body = g.createLinearGradient(X - Wp / 2, 0, X + Wp / 2, 0);
  body.addColorStop(0, "#b99bc4"); body.addColorStop(0.28, "#f7e8f0"); body.addColorStop(0.65, "#eed6e6"); body.addColorStop(1, "#a887b6");
  g.fillStyle = body; g.fillRect(X - Wp / 2, topY * T, Wp, (botY - topY) * T);
  for (let yy = topY * T + T * 0.17, r = 0; yy < botY * T; yy += T * 0.17, r++) {
    g.fillStyle = "rgba(120,85,140,.16)"; g.fillRect(X - Wp / 2, yy, Wp, Math.max(1, u * 0.5));
    for (let k = 0; k < 3; k++) {
      const jx = X - Wp / 2 + ((k + (r % 2) * 0.5 + 0.3) / 3) * Wp;
      g.fillRect(jx, yy - T * 0.17, Math.max(1, u * 0.5), T * 0.17);
    }
  }
  // corbel ring
  g.fillStyle = "#d8b9d8"; g.fillRect(X - Wp / 2 - u, topY * T - u, Wp + u * 2, u * 2.2);
  g.fillStyle = "rgba(90,60,110,.3)"; g.fillRect(X - Wp / 2 - u, topY * T + u * 1.2, Wp + u * 2, u);
  // conical roof, slightly flared
  const ov = T * 0.09, base = topY * T;
  const rg = g.createLinearGradient(X - Wp / 2 - ov, 0, X + Wp / 2 + ov, 0);
  rg.addColorStop(0, roof[1]); rg.addColorStop(0.35, roof[0]); rg.addColorStop(1, roof[2]);
  g.beginPath(); g.moveTo(X - Wp / 2 - ov, base);
  g.quadraticCurveTo(X - Wp * 0.12, base - (base - tipY * T) * 0.45, X, tipY * T);
  g.quadraticCurveTo(X + Wp * 0.12, base - (base - tipY * T) * 0.45, X + Wp / 2 + ov, base);
  g.closePath(); g.fillStyle = rg; g.fill();
  g.save(); g.clip();
  g.strokeStyle = "rgba(60,30,90,.28)"; g.lineWidth = Math.max(1, u * 0.6);
  for (let yy = tipY * T + T * 0.1; yy < base; yy += T * 0.085) {
    const k = (yy - tipY * T) / (base - tipY * T), half = (Wp / 2 + ov) * k;
    g.beginPath();
    for (let sx = -half; sx < half; sx += T * 0.09) g.arc(X + sx + T * 0.045, yy, T * 0.045, 0, Math.PI);
    g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(X - Wp * 0.3, tipY * T, Wp * 0.1, base - tipY * T);
  g.restore();
  fillEll(g, X, base, Wp / 2 + ov, T * 0.045, roof[2]);
  fillEll(g, X, tipY * T, T * 0.035, T * 0.035, "#ffd873");
}

function archWindow(g: Ctx, T: number, x: number, y: number, s = 1) {
  const w = T * 0.12 * s, h = T * 0.2 * s, X = x * T, Y = y * T;
  g.fillStyle = "#5b3d73"; g.beginPath(); g.roundRect(X - w / 2 - T * 0.02, Y - h / 2 - T * 0.02, w + T * 0.04, h + T * 0.03, [w, w, 1, 1]); g.fill();
  const gl = g.createLinearGradient(0, Y - h / 2, 0, Y + h / 2);
  gl.addColorStop(0, "#fff3b8"); gl.addColorStop(1, "#ffae5c");
  g.fillStyle = gl; g.beginPath(); g.roundRect(X - w / 2, Y - h / 2, w, h, [w / 2, w / 2, 0, 0]); g.fill();
  g.fillStyle = "rgba(110,60,70,.55)"; g.fillRect(X - 0.5, Y - h / 2, 1, h); g.fillRect(X - w / 2, Y, w, 1);
}

function castle(g: Ctx, T: number) {
  const u = T / 16, pink: [string, string, string] = ["#f39ccb", "#ffc6e3", "#b95a9c"], lav: [string, string, string] = ["#b596e6", "#dccbff", "#6f53a8"];
  // central keep
  tower(g, T, 11, 1.02, 0.98, 2.2, 0.2, lav);
  // rose window
  fillEll(g, 11 * T, 1.52 * T, T * 0.11, T * 0.11, "#5b3d73");
  const rw = g.createRadialGradient(11 * T, 1.52 * T, 0, 11 * T, 1.52 * T, T * 0.09);
  rw.addColorStop(0, "#fff6c9"); rw.addColorStop(1, "#ff9f6b");
  g.fillStyle = rw; g.beginPath(); g.arc(11 * T, 1.52 * T, T * 0.085, 0, TAU); g.fill();
  g.strokeStyle = "rgba(120,60,80,.6)"; g.lineWidth = 1;
  for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 4; g.beginPath(); g.moveTo(11 * T + Math.cos(a) * T * 0.085, 1.52 * T + Math.sin(a) * T * 0.085); g.lineTo(11 * T - Math.cos(a) * T * 0.085, 1.52 * T - Math.sin(a) * T * 0.085); g.stroke(); }
  // curtain wall with battlements
  const cT = 2.02 * T, cB = 3 * T, cL = 7.5 * T, cR = 14.5 * T;
  const cg = g.createLinearGradient(0, cT, 0, cB);
  cg.addColorStop(0, "#f2dcea"); cg.addColorStop(1, "#c9a8cc");
  g.fillStyle = cg; g.fillRect(cL, cT, cR - cL, cB - cT);
  for (let yy = cT + T * 0.16, r = 0; yy < cB; yy += T * 0.16, r++) {
    g.fillStyle = "rgba(125,90,145,.18)"; g.fillRect(cL, yy, cR - cL, Math.max(1, u * 0.5));
    for (let xx = cL + ((r % 2) * T * 0.2); xx < cR; xx += T * 0.4) g.fillRect(xx, yy, Math.max(1, u * 0.5), T * 0.16);
  }
  for (let xx = cL; xx < cR; xx += T * 0.26) { g.fillStyle = "#ecd2e4"; g.fillRect(xx, cT - T * 0.12, T * 0.15, T * 0.13); g.fillStyle = "rgba(90,60,110,.25)"; g.fillRect(xx + T * 0.11, cT - T * 0.12, T * 0.04, T * 0.13); }
  // gate: warm light through a portcullis
  const gx = 11 * T, gw = T * 0.72, gt = 2.3 * T;
  g.fillStyle = "#c29bc0"; g.beginPath(); g.roundRect(gx - gw / 2 - T * 0.07, gt - T * 0.06, gw + T * 0.14, cB - gt + T * 0.06, [gw, gw, 0, 0]); g.fill();
  const gg = g.createLinearGradient(0, gt, 0, cB);
  gg.addColorStop(0, "#3a2450"); gg.addColorStop(1, "#ffb36a");
  g.fillStyle = gg; g.beginPath(); g.roundRect(gx - gw / 2, gt, gw, cB - gt, [gw / 2, gw / 2, 0, 0]); g.fill();
  g.fillStyle = "rgba(40,20,50,.55)";
  for (let k = 1; k < 5; k++) g.fillRect(gx - gw / 2 + (gw * k) / 5 - 0.5, gt + T * 0.08, Math.max(1, u * 0.7), (cB - gt) * 0.55);
  g.fillRect(gx - gw / 2, gt + (cB - gt) * 0.35, gw, Math.max(1, u * 0.6));
  // hanging banners by the gate
  for (const bx of [9.95, 12.05]) {
    const X = bx * T;
    g.fillStyle = "#b986e0"; g.beginPath(); g.moveTo(X - T * 0.11, 2.12 * T); g.lineTo(X + T * 0.11, 2.12 * T); g.lineTo(X + T * 0.11, 2.62 * T); g.lineTo(X, 2.52 * T); g.lineTo(X - T * 0.11, 2.62 * T); g.closePath(); g.fill();
    g.fillStyle = "#ffd873"; g.fillRect(X - T * 0.11, 2.12 * T, T * 0.22, u);
    g.beginPath(); g.moveTo(X, 2.25 * T); g.lineTo(X + T * 0.05, 2.33 * T); g.lineTo(X, 2.41 * T); g.lineTo(X - T * 0.05, 2.33 * T); g.closePath(); g.fill();
  }
  // towers in front
  tower(g, T, 9.35, 0.74, 1.24, 3, 0.52, pink);
  tower(g, T, 12.65, 0.74, 1.24, 3, 0.52, pink);
  tower(g, T, 7.75, 0.64, 1.62, 3, 1.0, lav);
  tower(g, T, 14.25, 0.64, 1.62, 3, 1.0, lav);
  for (const [x, y] of CASTLE_WINDOWS) archWindow(g, T, x, y, y < 1.4 ? 0.85 : 1);
  // ivy on the tower feet
  for (const [vx, dir] of [[7.45, 1], [9.7, -1], [12.3, 1], [14.55, -1]] as [number, number][]) {
    for (let k = 0; k < 9; k++) {
      const yy = 3 * T - k * T * 0.07, xx = vx * T + Math.sin(k * 1.3) * T * 0.05 + dir * k * T * 0.01;
      fillEll(g, xx, yy, T * 0.05, T * 0.035, k % 2 ? "#4f8a4c" : "#6fb05f", 0.5 * dir);
      if (k % 4 === 2) fillEll(g, xx + T * 0.03, yy - T * 0.02, T * 0.02, T * 0.02, "#ffb3dd");
    }
  }
  // steps down onto the path
  g.fillStyle = "#b8a6c4"; g.fillRect(gx - gw / 2 - T * 0.05, cB - T * 0.04, gw + T * 0.1, T * 0.08);
}

/* ---------- toadstool cottages ---------- */
function cottage(g: Ctx, T: number, cx: number, purple: boolean) {
  const X = cx * T, u = T / 16, base = 3 * T, sideways = purple ? -1 : 1;
  // stem-shaped house
  const bg = g.createLinearGradient(X - T, 0, X + T, 0);
  bg.addColorStop(0, "#c9b4a6"); bg.addColorStop(0.35, "#fbf0df"); bg.addColorStop(0.75, "#e9d8c4"); bg.addColorStop(1, "#a88f86");
  g.fillStyle = bg; g.beginPath();
  g.moveTo(X - T * 1.0, base); g.bezierCurveTo(X - T * 1.12, base - T * 0.6, X - T * 0.78, base - T * 1.2, X - T * 0.8, base - T * 1.55);
  g.lineTo(X + T * 0.8, base - T * 1.55); g.bezierCurveTo(X + T * 0.78, base - T * 1.2, X + T * 1.12, base - T * 0.6, X + T * 1.0, base);
  g.closePath(); g.fill();
  g.strokeStyle = "rgba(140,110,100,.28)"; g.lineWidth = Math.max(1, u * 0.5);
  for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(X + k * T * 0.2, base); g.quadraticCurveTo(X + k * T * 0.22, base - T * 0.8, X + k * T * 0.18, base - T * 1.5); g.stroke(); }
  // round door in a pebble ring
  const dx = X - sideways * T * 0.1, dw = T * 0.5, dt = base - T * 0.74;
  for (let k = 0; k < 13; k++) {
    const a = Math.PI + (k / 12) * Math.PI;
    fillEll(g, dx + Math.cos(a) * (dw / 2 + T * 0.05), dt + dw / 2 + Math.sin(a) * (dw / 2 + T * 0.05), T * 0.045, T * 0.035, k % 2 ? "#9d8fa8" : "#b9aec2");
  }
  g.fillStyle = "#8c8098"; g.fillRect(dx - dw / 2 - T * 0.07, dt + dw / 2, T * 0.07, base - dt - dw / 2); g.fillRect(dx + dw / 2, dt + dw / 2, T * 0.07, base - dt - dw / 2);
  g.fillStyle = "#7c4a38"; g.beginPath(); g.roundRect(dx - dw / 2, dt, dw, base - dt, [dw / 2, dw / 2, 0, 0]); g.fill();
  g.fillStyle = "rgba(40,20,15,.35)"; for (let k = 1; k < 4; k++) g.fillRect(dx - dw / 2 + (dw * k) / 4, dt + T * 0.05, Math.max(1, u * 0.5), base - dt - T * 0.05);
  g.fillStyle = "#4b2a20"; g.fillRect(dx - dw / 2, dt + T * 0.35, dw, u); g.fillRect(dx - dw / 2, dt + T * 0.58, dw, u);
  fillEll(g, dx + dw * 0.28, dt + T * 0.45, T * 0.03, T * 0.03, "#ffd873");
  g.fillStyle = "#a79aaf"; g.fillRect(dx - dw / 2 - T * 0.1, base - T * 0.02, dw + T * 0.2, T * 0.09);
  // windows
  COTTAGE_LIGHTS.filter(([lx]) => Math.abs(lx - cx) < 1.3).forEach(([lx, ly, r]) => {
    if (r < 0.1) { // lantern on a bracket
      g.fillStyle = "#4b2a20"; g.fillRect(lx * T - T * 0.12, ly * T - T * 0.1, T * 0.12, Math.max(1, u * 0.6));
      g.fillStyle = "#3c2a30"; g.fillRect(lx * T - T * 0.04, ly * T - T * 0.08, T * 0.08, T * 0.14);
      g.fillStyle = "#ffe08a"; g.fillRect(lx * T - T * 0.025, ly * T - T * 0.05, T * 0.05, T * 0.08);
      return;
    }
    fillEll(g, lx * T, ly * T, r * T + T * 0.04, r * T + T * 0.04, "#6b4436");
    const wg = g.createRadialGradient(lx * T - r * T * 0.3, ly * T - r * T * 0.3, 0, lx * T, ly * T, r * T);
    wg.addColorStop(0, "#fff6c2"); wg.addColorStop(1, "#ffa652");
    g.fillStyle = wg; g.beginPath(); g.arc(lx * T, ly * T, r * T, 0, TAU); g.fill();
    g.fillStyle = "#6b4436"; g.fillRect(lx * T - 1, ly * T - r * T, 2, r * T * 2); g.fillRect(lx * T - r * T, ly * T - 1, r * T * 2, 2);
    // flower box
    g.fillStyle = "#8a5a3c"; g.fillRect(lx * T - r * T - T * 0.03, ly * T + r * T + T * 0.03, r * T * 2 + T * 0.06, T * 0.07);
    for (let k = 0; k < 5; k++) {
      const fxp = lx * T - r * T + (k / 4) * r * T * 2;
      fillEll(g, fxp, ly * T + r * T + T * 0.02, T * 0.035, T * 0.03, "#5ea45a");
      fillEll(g, fxp, ly * T + r * T, T * 0.022, T * 0.022, k % 2 ? "#ff9ccf" : "#fff0a0");
    }
  });
  // chimney
  const [chx, chy] = CHIMNEYS[purple ? 1 : 0];
  g.fillStyle = "#8f7f97"; g.fillRect(chx * T - T * 0.09, chy * T, T * 0.18, T * 0.5);
  g.fillStyle = "#6d5f78"; g.fillRect(chx * T - T * 0.11, chy * T - T * 0.03, T * 0.22, T * 0.07);
  // the cap
  const capY = base - T * 1.4, rx = T * 1.62, ry = T * 1.28;
  const hl = purple ? "#e3c4ff" : "#ff9aa2", mid = purple ? "#9a6ad8" : "#e0506a", edge = purple ? "#553a92" : "#98284f";
  const cg = g.createRadialGradient(X - T * 0.55, capY - ry * 0.65, T * 0.1, X, capY - ry * 0.2, rx * 1.1);
  cg.addColorStop(0, hl); cg.addColorStop(0.45, mid); cg.addColorStop(1, edge);
  g.fillStyle = cg; g.beginPath(); g.ellipse(X, capY, rx, ry, 0, Math.PI, TAU); g.ellipse(X, capY, rx, T * 0.2, 0, 0, Math.PI); g.fill();
  // underside gills
  fillEll(g, X, capY + T * 0.04, rx * 0.93, T * 0.13, purple ? "#e8d9ee" : "#f5e1d6");
  g.strokeStyle = "rgba(120,90,110,.45)"; g.lineWidth = Math.max(1, u * 0.5);
  for (let k = -9; k <= 9; k++) { g.beginPath(); g.moveTo(X + k * rx * 0.05, capY + T * 0.08); g.lineTo(X + k * rx * 0.1, capY + T * 0.16); g.stroke(); }
  fillEll(g, X, capY + T * 0.01, rx, T * 0.05, css(hx(edge), 0.7));
  // spots
  const spots: [number, number, number][] = [[-0.55, -0.55, 0.22], [0.1, -0.85, 0.2], [0.62, -0.45, 0.2], [-0.15, -0.3, 0.14], [-0.88, -0.2, 0.12], [0.9, -0.15, 0.1], [0.35, -0.2, 0.1], [-0.35, -0.9, 0.1]];
  for (const [sx, sy, sr] of spots) {
    const k = Math.sqrt(Math.max(0, 1 - sx * sx)), ex = X + sx * rx * 0.92 * sideways, ey = capY + sy * ry * k;
    fillEll(g, ex + T * 0.01, ey + T * 0.015, sr * T, sr * T * (0.55 + k * 0.35), "rgba(70,20,50,.25)");
    fillEll(g, ex, ey, sr * T, sr * T * (0.55 + k * 0.35), purple ? "#f6ecff" : "#fff4e8");
    fillEll(g, ex - sr * T * 0.3, ey - sr * T * 0.25, sr * T * 0.35, sr * T * 0.2, "rgba(255,255,255,.7)");
  }
  // a baby toadstool and grass at the foot
  const bx = X + sideways * T * 1.15;
  g.fillStyle = "#f3e6d8"; g.fillRect(bx - T * 0.04, base - T * 0.2, T * 0.08, T * 0.2);
  g.fillStyle = mid; g.beginPath(); g.ellipse(bx, base - T * 0.2, T * 0.15, T * 0.12, 0, Math.PI, TAU); g.fill();
  fillEll(g, bx - T * 0.05, base - T * 0.26, T * 0.03, T * 0.02, "#fff4e8");
  tufts(g, T, X - T * 0.95, base, 3); tufts(g, T, X + T * 0.95, base, 4);
}

function crystal(g: Ctx, T: number, x: number, y: number, s: number, kind: number) {
  const pal = kind ? ["#f2d8ff", "#c08ef0", "#6d47b8"] : ["#dcfbff", "#72d3f0", "#3572b8"];
  const X = x * T, Y = y * T;
  fillEll(g, X, Y + T * 0.02 * s, T * 0.22 * s, T * 0.07 * s, "rgba(20,10,40,.4)");
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.45 + (hash(i, Math.round(x * 10), 71) - 0.5) * 0.25;
    const len = T * s * (i === 1 || i === 2 ? 0.52 : 0.32) * (0.8 + hash(i, Math.round(x * 10), 72) * 0.3), wd = T * s * 0.08;
    const ox = X + (i - 1.5) * T * 0.06 * s;
    const tipX = ox + Math.cos(a) * len, tipY = Y + Math.sin(a) * len;
    const nx = -Math.sin(a) * wd, ny = Math.cos(a) * wd;
    const sx = ox + Math.cos(a) * len * 0.72, sy = Y + Math.sin(a) * len * 0.72;
    g.fillStyle = pal[1]; g.beginPath(); g.moveTo(ox - nx, Y - ny); g.lineTo(sx - nx, sy - ny); g.lineTo(tipX, tipY); g.lineTo(ox, Y); g.closePath(); g.fill();
    g.fillStyle = pal[2]; g.beginPath(); g.moveTo(ox, Y); g.lineTo(tipX, tipY); g.lineTo(sx + nx, sy + ny); g.lineTo(ox + nx, Y + ny); g.closePath(); g.fill();
    g.strokeStyle = pal[0]; g.lineWidth = Math.max(1, T * 0.018); g.beginPath(); g.moveTo(ox - nx * 0.5, Y - ny * 0.5); g.lineTo(sx - nx * 0.5, sy - ny * 0.5); g.lineTo(tipX, tipY); g.stroke();
  }
}

/* ---------- the glowing cobble path ---------- */
function path(g: Ctx, T: number) {
  const top = 3 * T, WW = W * T, rows = 3, rh = T / rows, gap = Math.max(1, T * 0.03);
  g.fillStyle = "#2f5446"; g.fillRect(0, top, WW, T);
  g.fillStyle = "rgba(110,220,160,.45)"; g.fillRect(0, top, WW, T);
  for (let j = 0; j < rows; j++) {
    let xc = -hash(j, 0, 81) * T * 0.3, k = 0;
    while (xc < WW) {
      const w = T * (0.25 + hash(j, k, 82) * 0.17), yy = top + j * rh;
      const n = vnoise(xc / T, 3 + j / 3, 2.5, 83);
      const col = lerp3("#857c9c", "#c9bfd4", hash(j, k, 84) * 0.6 + n * 0.4);
      g.beginPath(); g.roundRect(xc + gap, yy + gap + hash(j, k, 85) * gap, w - gap * 2, rh - gap * 2.2, T * 0.07); g.fillStyle = css(col); g.fill();
      fillEll(g, xc + w * 0.36, yy + rh * 0.34, w * 0.2, rh * 0.13, "rgba(255,248,255,.28)");
      g.fillStyle = "rgba(25,15,45,.28)"; g.fillRect(xc + gap * 2.5, yy + rh - gap * 2.5, w - gap * 5, Math.max(1, T * 0.025));
      if (hash(j, k, 86) > 0.8) fillEll(g, xc + w * 0.5, yy + gap * 2, w * 0.3, rh * 0.12, "#6fb566");
      if (hash(j, k, 87) > 0.86) BUDS.push([(xc + w) / T, (yy + rh * 0.5) / T]);
      xc += w; k++;
    }
  }
  // wall shadow and the grass lip along the meadow edge
  const sh = g.createLinearGradient(0, top, 0, top + T * 0.3);
  sh.addColorStop(0, "rgba(15,8,35,.45)"); sh.addColorStop(1, "rgba(15,8,35,0)");
  g.fillStyle = sh; g.fillRect(0, top, WW, T * 0.3);
  for (let i = 0; i < W * 4; i++) if (hash(i, 2, 88) > 0.35) tufts(g, T, (i / 4 + hash(i, 1, 88) * 0.2) * T, top + T + T * (0.02 + hash(i, 3, 88) * 0.08), 2 + i);
}

/* ---------- meadow scatter ---------- */
function tufts(g: Ctx, T: number, x: number, y: number, seed: number) {
  const n = 5, h = T * (0.13 + hash(Math.round(x), seed, 91) * 0.1);
  for (let i = 0; i < n; i++) {
    const a = (i - (n - 1) / 2) * 0.32, back = i % 2 === 0;
    g.strokeStyle = back ? "#2b5a42" : "#7fc46f"; g.lineWidth = Math.max(1, T * 0.028); g.lineCap = "round";
    g.beginPath(); g.moveTo(x + (i - 2) * T * 0.02, y);
    g.quadraticCurveTo(x + Math.sin(a) * h * 0.4, y - h * 0.6, x + Math.sin(a) * h, y - h * Math.cos(a));
    g.stroke();
  }
}

function flower(g: Ctx, T: number, x: number, y: number, petal: string, eye: string, s = 1) {
  g.strokeStyle = "#3f7a4a"; g.lineWidth = Math.max(1, T * 0.018); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + T * 0.08 * s); g.stroke();
  const r = T * 0.027 * s;
  for (let p = 0; p < 5; p++) fillEll(g, x + Math.cos((p * TAU) / 5 - 1.57) * r, y + Math.sin((p * TAU) / 5 - 1.57) * r * 0.85, r * 0.9, r * 0.8, petal);
  fillEll(g, x, y, r * 0.6, r * 0.55, eye);
}

function meadow(g: Ctx, T: number) {
  const pick = (i: number, s: number): [number, number] => [0.15 + hash(i, s, 101) * 21.7, 4.25 + hash(i, s, 102) * 7.6];
  // lusher darker patches and clover
  for (let i = 0; i < 18; i++) {
    const [x, y] = pick(i, 1);
    for (let k = 0; k < 5; k++) {
      const cx = (x + (hash(i, k, 103) - 0.5) * 0.45) * T, cy = (y + (hash(i, k, 104) - 0.5) * 0.3) * T, r = T * 0.032;
      fillEll(g, cx - r, cy, r, r, "#4c9a55"); fillEll(g, cx + r, cy, r, r, "#4c9a55"); fillEll(g, cx, cy - r * 1.1, r, r, "#5daf60");
      fillEll(g, cx - r * 0.3, cy - r * 0.4, r * 0.4, r * 0.3, "rgba(220,255,200,.35)");
    }
    if (hash(i, 9, 105) > 0.55) flower(g, T, x * T, (y - 0.05) * T, "#fff8fb", "#ffe9f4", 0.8);
  }
  for (let i = 0; i < 80; i++) { const [x, y] = pick(i, 2); if (isFree(x, y)) tufts(g, T, x * T, y * T, i); }
  const FLOWERS: [string, string][] = [["#ff9ccf", "#fff0a0"], ["#9cbcff", "#ffffff"], ["#ffe27a", "#e08a3a"], ["#ffffff", "#ffd36e"], ["#d6a8ff", "#fff0a0"]];
  for (let i = 0; i < 46; i++) {
    const [x, y] = pick(i, 3);
    if (!isFree(x, y)) continue;
    const [p, e] = FLOWERS[Math.floor(hash(i, 4, 106) * FLOWERS.length)];
    const n = 3 + Math.floor(hash(i, 5, 106) * 5);
    for (let k = 0; k < n; k++) flower(g, T, (x + (hash(i, k, 107) - 0.5) * 0.5) * T, (y + (hash(i, k, 108) - 0.5) * 0.28) * T, p, e, 0.8 + hash(i, k, 109) * 0.4);
  }
  // tiny glowing mushrooms
  TINY_SHROOMS.length = 0;
  for (let i = 0; i < 40 && TINY_SHROOMS.length < 16; i++) {
    const [x, y] = pick(i, 6);
    if (!isFree(x, y) || Math.hypot((x - RING.cx) / RING.rx, (y - RING.cy) / RING.ry) < 1.6) continue;
    const kind = hash(i, 7, 110) > 0.5 ? 1 : 0;
    for (let k = 0; k < 3; k++) {
      const mx = (x + k * 0.09) * T, my = (y + (k % 2) * 0.05) * T, s = k === 1 ? 1 : 0.7;
      g.fillStyle = "#efe6f5"; g.fillRect(mx - T * 0.012 * s, my - T * 0.08 * s, T * 0.024 * s, T * 0.08 * s);
      g.fillStyle = kind ? "#ff9ef0" : "#7ff0ff"; g.beginPath(); g.ellipse(mx, my - T * 0.08 * s, T * 0.05 * s, T * 0.04 * s, 0, Math.PI, TAU); g.fill();
      fillEll(g, mx - T * 0.015 * s, my - T * 0.1 * s, T * 0.012 * s, T * 0.009 * s, "#ffffff");
    }
    TINY_SHROOMS.push([x + 0.09, y - 0.08, kind]);
  }
  // the fairy ring: lusher grass, then pale mushrooms round it, back row first
  const { cx, cy, rx, ry, n } = RING;
  g.strokeStyle = "rgba(25,70,45,.35)"; g.lineWidth = T * 0.2; g.beginPath(); g.ellipse(cx * T, cy * T, rx * T, ry * T, 0, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(160,230,150,.18)"; g.lineWidth = T * 0.06; g.beginPath(); g.ellipse(cx * T, cy * T, rx * T, ry * T, 0, 0, TAU); g.stroke();
  const ring = Array.from({ length: n }, (_, i) => (i / n) * TAU + 0.2).sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const a of ring) {
    const mx = (cx + Math.cos(a) * rx) * T, my = (cy + Math.sin(a) * ry) * T, s = 0.85 + 0.25 * Math.sin(a * 3);
    fillEll(g, mx, my, T * 0.07 * s, T * 0.025 * s, "rgba(15,30,20,.3)");
    g.fillStyle = "#f3eadf"; g.fillRect(mx - T * 0.022 * s, my - T * 0.14 * s, T * 0.044 * s, T * 0.14 * s);
    g.fillStyle = "#f5c9df"; g.beginPath(); g.ellipse(mx, my - T * 0.14 * s, T * 0.09 * s, T * 0.07 * s, 0, Math.PI, TAU); g.fill();
    fillEll(g, mx, my - T * 0.14 * s, T * 0.09 * s, T * 0.015 * s, "#caa0bd");
    fillEll(g, mx - T * 0.03 * s, my - T * 0.18 * s, T * 0.018 * s, T * 0.012 * s, "#ffffff");
    fillEll(g, mx + T * 0.035 * s, my - T * 0.165 * s, T * 0.012 * s, T * 0.009 * s, "#ffffff");
  }
}

/* ---------- the bluebell shore ---------- */
function shore(g: Ctx, T: number) {
  const y0 = 12 * T, WW = W * T;
  // wet bank lip
  g.fillStyle = "#2b2640"; g.fillRect(0, 13 * T - T * 0.08, WW, T * 0.08);
  for (let px = 0; px < WW; px += T * 0.17) {
    const i = Math.round(px / (T * 0.17));
    const r = T * (0.07 + hash(i, 0, 121) * 0.07), sx = px + hash(i, 1, 121) * T * 0.08, sy = 13 * T - T * 0.1 + hash(i, 2, 121) * T * 0.06;
    fillEll(g, sx + r * 0.1, sy + r * 0.3, r, r * 0.6, "rgba(10,5,25,.4)");
    fillEll(g, sx, sy, r, r * 0.62, css(lerp3("#6f6886", "#aaa2bb", hash(i, 3, 121))));
    fillEll(g, sx - r * 0.3, sy - r * 0.25, r * 0.4, r * 0.2, "rgba(255,250,255,.3)");
    if (hash(i, 4, 121) > 0.7) fillEll(g, sx - r * 0.1, sy - r * 0.45, r * 0.6, r * 0.18, "#5f9a58");
  }
  // the mossy bank strip: little stones, moss cushions, star flowers
  for (let i = 0; i < 70; i++) {
    const sx = hash(i, 0, 126) * WW, sy = y0 + T * (0.55 + hash(i, 1, 126) * 0.28), k = hash(i, 2, 126);
    if (k < 0.45) { const r = T * (0.025 + hash(i, 3, 126) * 0.035); fillEll(g, sx, sy, r, r * 0.65, css(lerp3("#6d6682", "#a59dbb", hash(i, 4, 126)))); fillEll(g, sx - r * 0.3, sy - r * 0.25, r * 0.35, r * 0.18, "rgba(255,250,255,.3)"); }
    else if (k < 0.8) { fillEll(g, sx, sy, T * 0.06, T * 0.03, "#4f8a50"); fillEll(g, sx - T * 0.015, sy - T * 0.012, T * 0.03, T * 0.013, "#7cc06a"); }
    else flower(g, T, sx, sy - T * 0.05, "#fff8fb", "#ffd36e", 0.7);
  }
  // bluebells
  for (let i = 0; i < 26; i++) {
    const bx = (0.2 + hash(i, 0, 122) * 21.6) * T, by = y0 + T * (0.35 + hash(i, 1, 122) * 0.3);
    if (!isFree(bx / T, by / T)) continue;
    for (let k = 0; k < 3; k++) {
      const sx = bx + (k - 1) * T * 0.06, top = by - T * (0.22 + hash(i, k, 123) * 0.1), lean = (k - 1) * T * 0.04 + T * 0.05;
      fillEll(g, sx, by, T * 0.015, T * 0.1, "#3f7e4a", (k - 1) * 0.3);
      g.strokeStyle = "#3d7a48"; g.lineWidth = Math.max(1, T * 0.016); g.beginPath(); g.moveTo(sx, by); g.quadraticCurveTo(sx, top, sx + lean, top + T * 0.02); g.stroke();
      for (let b = 0; b < 3; b++) {
        const t = b / 3, ex = sx + lean * (0.35 + t * 0.65), ey = top + T * 0.04 + t * T * 0.09;
        fillEll(g, ex + T * 0.012, ey + T * 0.02, T * 0.024, T * 0.03, hash(i, b, 124) > 0.3 ? "#7e97ff" : "#b59bff");
        fillEll(g, ex + T * 0.012, ey + T * 0.045, T * 0.02, T * 0.008, "#3f3aa0");
      }
    }
  }
  // cattails by the water
  for (const rx of [0.55, 7.55, 12.55, 19.45]) {
    for (let k = 0; k < 4; k++) {
      const X = (rx + k * 0.09) * T, h = T * (0.45 + hash(k, Math.round(rx), 125) * 0.25), lean = (k - 1.5) * T * 0.05;
      g.strokeStyle = k % 2 ? "#4c8a52" : "#35683f"; g.lineWidth = Math.max(1, T * 0.022);
      g.beginPath(); g.moveTo(X, 13 * T - T * 0.1); g.quadraticCurveTo(X, 13 * T - h * 0.6, X + lean, 13 * T - h); g.stroke();
      if (k % 2 === 0) { g.fillStyle = "#6b4432"; g.beginPath(); g.roundRect(X + lean * 0.85 - T * 0.025, 13 * T - h * 0.95, T * 0.05, T * 0.15, T * 0.025); g.fill(); }
    }
  }
}

export const MAP_W = W, MAP_H = H;
