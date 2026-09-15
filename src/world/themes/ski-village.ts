// Ski village: the pictures bigger than a tile. The chalet row along the top
// (y0–2), the ski tracks and footprints across the snow, the ridge along the
// lake and the cracks in the ice. All static: painted once into the layer.
import { W, hash } from "../map";
import { ellipse, mix, rgba, roundRect, type Ctx } from "./kit";

/* ---------- shared palette ---------- */
export const SNOW = "#f7fbff";
export const SNOW_SHADE = "#cfdff0";
export const SNOW_DEEP = "#b3cbe4";
const LOG = "#80502c", LOG_DARK = "#4b2b16", LOG_LIGHT = "#a26c3f";
const RENDER = "#f1e7d3";
const STONE = "#858a94";

/** A deterministic stream of 0..1 numbers for one feature. */
function stream(seed: number) { let i = 0; return () => hash(i++, seed, 13); }

/* ---------- the snowy pine (hero prop, and small ones in the backdrop) ---------- */
/**
 * Pine with layered tiers, each capped with snow. `sway` is the tip's sideways
 * offset in px; every tier leans by its height, so the trunk never moves.
 */
export function drawPine(g: Ctx, cx: number, by: number, h: number, sway: number, seed: number) {
  const trunkH = h * 0.11, tiers = 5;
  g.fillStyle = "#5b3a22"; g.fillRect(cx - h * 0.035, by - trunkH - h * 0.03, h * 0.07, trunkH + h * 0.03);
  g.fillStyle = "rgba(30,15,5,.35)"; g.fillRect(cx, by - trunkH - h * 0.03, h * 0.035, trunkH + h * 0.03);
  for (let i = 0; i < tiers; i++) {
    const yb = by - trunkH - i * h * 0.16, th = h * (0.3 - i * 0.02), hw = h * 0.29 * (1 - i * 0.16);
    const lean = (k: number) => sway * ((by - k) / h);
    const ax = cx + lean(yb - th), ay = yb - th, bx = cx + lean(yb);
    // Tier body with a scalloped, drooping hem.
    g.beginPath(); g.moveTo(ax, ay);
    g.quadraticCurveTo(bx - hw * 0.35, yb - th * 0.45, bx - hw, yb);
    const sc = 3;
    for (let s = 0; s < sc; s++) {
      const x0 = bx - hw + (s * 2 * hw) / sc, x1 = x0 + (2 * hw) / sc;
      g.quadraticCurveTo((x0 + x1) / 2, yb + h * 0.035, x1, yb);
    }
    g.quadraticCurveTo(bx + hw * 0.35, yb - th * 0.45, ax, ay);
    g.fillStyle = i % 2 ? "#23553d" : "#1f4c37"; g.fill();
    // Shade the far (right) side.
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx + hw * 0.1, yb + h * 0.02); g.lineTo(bx + hw, yb); g.closePath();
    g.fillStyle = "rgba(5,25,30,.28)"; g.fill();
    // Needle strokes on the lit side.
    g.fillStyle = "rgba(120,180,120,.35)";
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + hash(seed, i, k) * 0.55;
      g.fillRect(bx - hw * f * 0.8, yb - th * (1 - f) * 0.9, Math.max(1, h * 0.02), Math.max(1, h * 0.008));
    }
    // Snow cap: follows both slopes down to ~45% of the tier, wavy lower edge.
    const d = 0.5 + hash(seed, i, 9) * 0.12, lx = ax + (bx - hw - ax) * d, rx = ax + (bx + hw - ax) * (d - 0.06);
    const ly = ay + (yb - ay) * d, ry = ay + (yb - ay) * (d - 0.06);
    g.beginPath(); g.moveTo(ax, ay - h * 0.012);
    g.lineTo(lx - h * 0.012, ly + h * 0.01);
    const n = 4;
    for (let s = 1; s <= n; s++) {
      const fx = lx + ((rx - lx) * s) / n, fy = ly + ((ry - ly) * s) / n;
      g.quadraticCurveTo(lx + ((rx - lx) * (s - 0.5)) / n, fy + h * (0.035 + hash(seed, i, s) * 0.03), fx, fy);
    }
    g.closePath(); g.fillStyle = SNOW; g.fill();
    g.fillStyle = "rgba(150,180,215,.55)";
    g.beginPath(); g.moveTo(ax + h * 0.01, ay + h * 0.02); g.lineTo(rx, ry); g.lineTo(rx - h * 0.04, ry - h * 0.005); g.closePath(); g.fill();
    // Clumps of snow sitting on the hem tips.
    ellipse(g, bx - hw * 0.72, yb - h * 0.004, h * 0.04, h * 0.017, SNOW);
    if (hash(seed, i, 4) > 0.4) ellipse(g, bx + hw * 0.3, yb + h * 0.012, h * 0.03, h * 0.013, "#e4eef8");
  }
  // Tuft on the tip.
  ellipse(g, cx + sway, by - trunkH - (tiers - 1) * h * 0.16 - h * 0.23, h * 0.03, h * 0.022, SNOW);
}

/* ---------- the chalets ---------- */
interface Chalet { x0: number; w: number; ridge: number; gable: boolean; shutter: string; door: number; }
const CHALETS: Chalet[] = [
  { x0: 0.2, w: 3.5, ridge: 0.34, gable: false, shutter: "#b83a2e", door: 0.3 },
  { x0: 4.75, w: 3.3, ridge: 0.3, gable: true, shutter: "#2f6a4a", door: 0.66 },
  { x0: 9.05, w: 4.7, ridge: 0.16, gable: true, shutter: "#b83a2e", door: 0.5 },
  { x0: 14.8, w: 3.4, ridge: 0.42, gable: false, shutter: "#2d5d8c", door: 0.34 },
  { x0: 19.15, w: 3.9, ridge: 0.26, gable: true, shutter: "#2f6a4a", door: 0.44 },
];
const EAVE = 1.08, GF = 1.95, FOUND = 2.72;

/** Chimney tops in tile units, where the smoke leaves. */
export const CHIMNEYS: [number, number][] = CHALETS.map(c => [c.x0 + c.w * (c.gable ? 0.2 : 0.74), (c.ridge + EAVE) / 2 - 0.4]);
/** Warm windows and door lamps in tile units, for the glow pass. */
export const WINDOW_LIGHTS: [number, number, number][] = [];

function slopeSnow(g: Ctx, x0: number, y0: number, x1: number, y1: number, T: number, seed: number) {
  // Fascia board along one roof slope, snow heaped on top of it, icicles under it.
  const len = Math.hypot(x1 - x0, y1 - y0), nx = (y0 - y1) / len, ny = (x1 - x0) / len; // normal
  const up = ny > 0 ? -1 : 1; // normal pointing up
  g.strokeStyle = LOG_DARK; g.lineWidth = T * 0.1; g.lineCap = "round";
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const steps = Math.max(4, Math.round(len / (T * 0.12)));
  g.beginPath();
  g.moveTo(x0, y0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
    const lump = T * (0.1 + 0.05 * Math.sin(i * 1.7 + seed) + hash(seed, i, 2) * 0.03);
    g.lineTo(px + nx * up * lump, py + ny * up * lump);
  }
  g.lineTo(x1, y1); g.closePath(); g.fillStyle = SNOW; g.fill();
  g.strokeStyle = SNOW_SHADE; g.lineWidth = T * 0.03;
  g.beginPath(); g.moveTo(x0, y0 - T * 0.02); g.lineTo(x1, y1 - T * 0.02); g.stroke();
  g.fillStyle = "#e6f5ff";
  for (let i = 1; i < steps; i++) {
    if (hash(seed, i, 5) < 0.45) continue;
    const t = i / steps, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t + T * 0.05, l = T * (0.06 + hash(seed, i, 6) * 0.1);
    g.beginPath(); g.moveTo(px - T * 0.018, py); g.lineTo(px + T * 0.018, py); g.lineTo(px, py + l); g.closePath(); g.fill();
  }
}

function window_(g: Ctx, x: number, y: number, w: number, h: number, T: number, shutter: string, seed: number) {
  const f = T * 0.035;
  WINDOW_LIGHTS.push([(x + w / 2) / T, (y + h / 2) / T, w / T]);
  // Shutters with a heart cut out.
  for (const sx of [x - w * 0.42 - f, x + w + f]) {
    g.fillStyle = shutter; g.fillRect(sx, y - f, w * 0.42, h + f * 2);
    g.fillStyle = "rgba(0,0,0,.18)";
    for (let k = 1; k < 3; k++) g.fillRect(sx + (w * 0.42 * k) / 3, y - f, 1, h + f * 2);
    const hx = sx + w * 0.21, hy = y + h * 0.4, r = w * 0.055;
    g.fillStyle = "rgba(30,15,10,.55)";
    ellipse(g, hx - r * 0.7, hy, r, r, "rgba(30,15,10,.55)"); ellipse(g, hx + r * 0.7, hy, r, r, "rgba(30,15,10,.55)");
    g.beginPath(); g.moveTo(hx - r * 1.6, hy + r * 0.3); g.lineTo(hx + r * 1.6, hy + r * 0.3); g.lineTo(hx, hy + r * 2.4); g.closePath(); g.fill();
  }
  g.fillStyle = "#3a2213"; g.fillRect(x - f, y - f, w + f * 2, h + f * 2);
  const grd = g.createLinearGradient(0, y, 0, y + h);
  grd.addColorStop(0, "#ffe7a3"); grd.addColorStop(1, "#f59a3d");
  g.fillStyle = grd; g.fillRect(x, y, w, h);
  // Curtains and a silhouette of a lamp or plant inside.
  g.fillStyle = "rgba(190,70,40,.55)"; g.fillRect(x, y, w * 0.16, h); g.fillRect(x + w * 0.84, y, w * 0.16, h);
  if (hash(seed, 1, 1) > 0.5) { g.fillStyle = "rgba(90,40,15,.5)"; g.fillRect(x + w * 0.3, y + h * 0.62, w * 0.14, h * 0.38); ellipse(g, x + w * 0.37, y + h * 0.58, w * 0.1, h * 0.08, "rgba(80,110,40,.55)"); }
  g.fillStyle = "#3a2213"; g.fillRect(x + w / 2 - f / 2, y, f, h); g.fillRect(x, y + h * 0.45, w, f * 0.8);
  // Sill with a window box of snow and pine sprigs.
  g.fillStyle = "#5a351c"; g.fillRect(x - f * 2, y + h + f, w + f * 4, T * 0.07);
  g.fillStyle = "#2f5a3a"; for (let k = 0; k < 4; k++) g.fillRect(x + (w * (k + 0.3)) / 4, y + h - T * 0.02, T * 0.05, T * 0.035);
  roundRect(g, x - f * 2.2, y + h + f - T * 0.03, w + f * 4.4, T * 0.045, T * 0.02, SNOW);
}

function chalet(g: Ctx, c: Chalet, T: number, ci: number) {
  const X0 = c.x0 * T, X1 = (c.x0 + c.w) * T, W_ = X1 - X0, OV = T * 0.28, rnd = stream(ci + 40);
  const eave = EAVE * T, ridge = c.ridge * T, gf = GF * T, found = FOUND * T, base = 3 * T;

  // --- log wall ---
  g.fillStyle = LOG; g.fillRect(X0, eave - T * 0.1, W_, gf - eave + T * 0.1);
  const logH = T * 0.13;
  for (let k = 0, yy = eave - T * 0.1; yy < gf; k++, yy += logH) {
    g.fillStyle = mix(LOG, LOG_LIGHT, hash(k, ci, 3) * 0.45); g.fillRect(X0, yy, W_, logH);
    g.fillStyle = "rgba(255,210,160,.18)"; g.fillRect(X0, yy, W_, Math.max(1, logH * 0.18));
    g.fillStyle = LOG_DARK; g.fillRect(X0, yy + logH - Math.max(1, T * 0.022), W_, Math.max(1, T * 0.022));
    // Knots, seeded along the log.
    for (let n = 0; n < 2; n++) ellipse(g, X0 + hash(k, ci, n + 7) * W_, yy + logH * 0.5, T * 0.02, T * 0.012, "rgba(60,30,10,.45)");
    // Log ends crossing at the corners.
    for (const ex of [X0 - T * 0.03, X1 + T * 0.03]) {
      ellipse(g, ex, yy + logH * 0.5, T * 0.07, logH * 0.48, "#b07a4a");
      ellipse(g, ex, yy + logH * 0.5, T * 0.035, logH * 0.24, "#8a5a33");
    }
  }

  // --- upper windows ---
  const nWin = c.w > 4 ? 3 : 2, ww = T * 0.36, wh = T * 0.36;
  for (let i = 0; i < nWin; i++) {
    const wx = X0 + (W_ * (i + 0.5)) / nWin - ww / 2;
    if (c.gable && Math.abs(wx + ww / 2 - (X0 + X1) / 2) < T * 0.5) continue; // the gable carries its own
    window_(g, wx, eave + T * 0.17, ww, wh, T, c.shutter, ci * 10 + i);
  }

  // --- ground floor ---
  g.fillStyle = RENDER; g.fillRect(X0, gf, W_, found - gf);
  for (let k = 0; k < W_ / (T * 0.1); k++) {
    g.fillStyle = hash(k, ci, 21) > 0.5 ? "rgba(150,120,80,.12)" : "rgba(255,255,255,.35)";
    g.fillRect(X0 + hash(k, ci, 22) * W_, gf + hash(k, ci, 23) * (found - gf), Math.max(1, T * 0.025), Math.max(1, T * 0.025));
  }
  const dw = T * 0.44, dx = X0 + W_ * c.door - dw / 2, dTop = gf + T * 0.2;
  const slots = c.w > 4 ? 4 : 3;
  for (let i = 0; i < slots; i++) {
    const cx = X0 + (W_ * (i + 0.5)) / slots;
    if (Math.abs(cx - (dx + dw / 2)) < T * 0.75) continue;
    window_(g, cx - T * 0.17, gf + T * 0.22, T * 0.34, T * 0.3, T, c.shutter, ci * 10 + i + 5);
  }
  // Door: arched, planked, lit glazing, a lantern beside it.
  g.fillStyle = "#3a2213";
  g.beginPath(); g.moveTo(dx - T * 0.04, found); g.lineTo(dx - T * 0.04, dTop + dw / 2); g.arc(dx + dw / 2, dTop + dw / 2, dw / 2 + T * 0.04, Math.PI, 0); g.lineTo(dx + dw + T * 0.04, found); g.fill();
  g.fillStyle = "#7a4424";
  g.beginPath(); g.moveTo(dx, found); g.lineTo(dx, dTop + dw / 2); g.arc(dx + dw / 2, dTop + dw / 2, dw / 2, Math.PI, 0); g.lineTo(dx + dw, found); g.fill();
  g.fillStyle = "rgba(40,20,8,.45)"; for (let k = 1; k < 4; k++) g.fillRect(dx + (dw * k) / 4, dTop + T * 0.05, 1, found - dTop);
  g.fillStyle = "#ffcf7a"; g.beginPath(); g.arc(dx + dw / 2, dTop + dw / 2, dw * 0.24, Math.PI, 0); g.fill();
  g.fillStyle = "#e2b04a"; g.fillRect(dx + dw * 0.78, dTop + T * 0.3, T * 0.04, T * 0.04);
  const lx = dx + dw + T * 0.12, ly = dTop + T * 0.08;
  g.fillStyle = "#2a1a10"; g.fillRect(lx - T * 0.01, ly - T * 0.05, T * 0.02, T * 0.05); g.fillRect(lx - T * 0.055, ly, T * 0.11, T * 0.02);
  g.fillStyle = "#ffd36e"; g.fillRect(lx - T * 0.035, ly + T * 0.02, T * 0.07, T * 0.1);
  g.fillStyle = "#2a1a10"; g.fillRect(lx - T * 0.05, ly + T * 0.12, T * 0.1, T * 0.02);
  WINDOW_LIGHTS.push([lx / T, (ly + T * 0.07) / T, 0.2]);
  // Snow step at the door.
  roundRect(g, dx - T * 0.08, found - T * 0.04, dw + T * 0.16, T * 0.06, T * 0.03, "#e9f1f8");

  // --- balcony with carved railing ---
  const bx0 = X0 - T * 0.06, bx1 = X1 + T * 0.06, railTop = eave + T * 0.46, deck = gf - T * 0.1;
  g.fillStyle = "rgba(40,20,10,.25)"; g.fillRect(X0, gf, W_, T * 0.07); // shadow on the render below
  for (let bx = bx0 + T * 0.2; bx < bx1 - T * 0.1; bx += T * 0.9) {
    g.fillStyle = LOG_DARK; g.beginPath(); g.moveTo(bx, deck + T * 0.08); g.lineTo(bx + T * 0.06, deck + T * 0.08); g.lineTo(bx + T * 0.03, deck + T * 0.2); g.closePath(); g.fill();
  }
  const bw = T * 0.085, gap = T * 0.03;
  for (let i = 0, bx = bx0 + T * 0.04; bx + bw < bx1 - T * 0.03; i++, bx += bw + gap) {
    g.fillStyle = i % 2 ? "#c78b4f" : "#b97c43";
    g.beginPath(); g.moveTo(bx, railTop); g.lineTo(bx + bw, railTop); g.lineTo(bx + bw, deck); g.lineTo(bx, deck); g.fill();
    // Carved cut-outs alternate: a round hole and a diamond.
    const mx = bx + bw / 2, my = railTop + (deck - railTop) * 0.5;
    g.fillStyle = "rgba(55,25,10,.8)";
    if (i % 2) { g.beginPath(); g.arc(mx, my, bw * 0.24, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.moveTo(mx, my - bw * 0.4); g.lineTo(mx + bw * 0.22, my); g.lineTo(mx, my + bw * 0.4); g.lineTo(mx - bw * 0.22, my); g.closePath(); g.fill(); }
    g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(bx + bw - 1, railTop, 1, deck - railTop);
  }
  g.fillStyle = "#5e3820"; g.fillRect(bx0, deck, bx1 - bx0, T * 0.08);
  g.fillStyle = "#6a3f22"; g.fillRect(bx0 - T * 0.02, railTop - T * 0.04, bx1 - bx0 + T * 0.04, T * 0.05);
  // Snow along the rail top and the deck edge, with a few drips.
  g.beginPath(); g.moveTo(bx0 - T * 0.03, railTop - T * 0.03);
  for (let x = bx0; x <= bx1 + 1; x += T * 0.12) g.quadraticCurveTo(x + T * 0.06, railTop - T * (0.1 + rnd() * 0.04), x + T * 0.12, railTop - T * 0.035);
  g.lineTo(bx1 + T * 0.03, railTop - T * 0.02); g.closePath(); g.fillStyle = SNOW; g.fill();
  roundRect(g, bx0 - T * 0.02, deck + T * 0.055, bx1 - bx0 + T * 0.04, T * 0.04, T * 0.02, "#e8f1f9");
  g.fillStyle = "#e6f5ff";
  for (let x = bx0 + T * 0.1; x < bx1; x += T * 0.17) if (rnd() > 0.5) { g.beginPath(); g.moveTo(x - 1.5, deck + T * 0.09); g.lineTo(x + 1.5, deck + T * 0.09); g.lineTo(x, deck + T * (0.14 + rnd() * 0.08)); g.fill(); }

  // --- stone foundation ---
  g.fillStyle = STONE; g.fillRect(X0 - T * 0.05, found, W_ + T * 0.1, base - found);
  const sh = (base - found) / 2;
  for (let r = 0; r < 2; r++) {
    let sx = X0 - T * 0.05 - (r ? T * 0.1 : 0);
    for (let k = 0; sx < X1 + T * 0.05; k++) {
      const sw = T * (0.18 + hash(k, r * 7 + ci, 31) * 0.16), sy = found + r * sh;
      roundRect(g, Math.max(sx, X0 - T * 0.05), sy + 0.5, Math.min(sw - 1, X1 + T * 0.05 - sx), sh - 1, T * 0.03, mix("#7c828d", "#a3a8b0", hash(k, r + ci, 32)));
      g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(Math.max(sx, X0 - T * 0.05) + 1, sy + 1, Math.max(0, Math.min(sw, X1 + T * 0.05 - sx) - 3), 1);
      sx += sw;
    }
  }
  g.fillStyle = "rgba(240,247,252,.9)"; g.fillRect(X0 - T * 0.06, found - 1, W_ + T * 0.12, Math.max(1.5, T * 0.025));

  // --- roof plane, heaped with snow ---
  const rx0 = X0 - OV, rx1 = X1 + OV, inset = T * 0.3;
  g.beginPath(); g.moveTo(rx0, eave); g.lineTo(rx1, eave); g.lineTo(rx1 - inset, ridge); g.lineTo(rx0 + inset, ridge); g.closePath();
  const rg = g.createLinearGradient(0, ridge, 0, eave);
  rg.addColorStop(0, "#ffffff"); rg.addColorStop(0.7, "#eef5fb"); rg.addColorStop(1, "#d3e3f1");
  g.fillStyle = rg; g.fill();
  g.save(); g.clip();
  // Soft wind-drift lumps (blue shade under, white highlight over).
  for (let k = 0; k < c.w * 3; k++) {
    const lx2 = rx0 + rnd() * (rx1 - rx0), ly2 = ridge + rnd() * (eave - ridge);
    ellipse(g, lx2 + T * 0.03, ly2 + T * 0.03, T * (0.14 + rnd() * 0.1), T * 0.045, "rgba(160,190,220,.35)");
    ellipse(g, lx2, ly2, T * 0.12, T * 0.035, "rgba(255,255,255,.8)");
  }
  g.restore();
  // Ridge line, cornice and icicles at the eave.
  g.fillStyle = "rgba(255,255,255,.95)";
  for (let x = rx0 + inset; x < rx1 - inset; x += T * 0.16) ellipse(g, x + T * 0.08, ridge + T * 0.01, T * 0.1, T * 0.05, "#ffffff");
  g.fillStyle = LOG_DARK; g.fillRect(rx0, eave, rx1 - rx0, T * 0.09);
  g.fillStyle = "#6b4226"; for (let x = rx0 + T * 0.1; x < rx1; x += T * 0.28) g.fillRect(x, eave + T * 0.09, T * 0.06, T * 0.05);
  g.beginPath(); g.moveTo(rx0 - T * 0.04, eave + T * 0.04);
  for (let x = rx0; x < rx1; x += T * 0.2) g.quadraticCurveTo(x + T * 0.1, eave + T * (0.1 + rnd() * 0.05), x + T * 0.2, eave + T * 0.03);
  g.lineTo(rx1 + T * 0.04, eave - T * 0.05); g.lineTo(rx0 - T * 0.04, eave - T * 0.05); g.closePath();
  g.fillStyle = SNOW; g.fill();
  g.fillStyle = "#e3f4ff";
  for (let x = rx0 + T * 0.05; x < rx1; x += T * 0.09) {
    const l = rnd() > 0.35 ? T * (0.05 + rnd() * 0.17) : 0;
    if (l) { g.beginPath(); g.moveTo(x - T * 0.02, eave + T * 0.07); g.lineTo(x + T * 0.02, eave + T * 0.07); g.lineTo(x, eave + T * 0.07 + l); g.fill(); }
  }
  g.fillStyle = "rgba(120,170,210,.5)"; g.fillRect(rx0, eave + T * 0.075, rx1 - rx0, 1);

  // --- chimney ---
  const [chx, chy] = CHIMNEYS[ci], cX = chx * T, cY = chy * T, cw = T * 0.22;
  g.fillStyle = "#7d7f86"; g.fillRect(cX - cw / 2, cY, cw, T * 0.42);
  for (let r = 0; r < 4; r++) {
    g.fillStyle = "rgba(40,40,50,.35)"; g.fillRect(cX - cw / 2, cY + r * T * 0.1, cw, 1);
    g.fillRect(cX - cw / 2 + (r % 2 ? cw * 0.35 : cw * 0.65), cY + r * T * 0.1, 1, T * 0.1);
  }
  g.fillStyle = "#3b3b42"; g.fillRect(cX - cw * 0.35, cY - T * 0.02, cw * 0.7, T * 0.04);
  ellipse(g, cX - cw * 0.35, cY - T * 0.01, cw * 0.28, T * 0.04, SNOW);
  ellipse(g, cX, cY + T * 0.4, cw * 0.9, T * 0.06, SNOW);

  // --- front gable ---
  if (c.gable) {
    const gw = Math.min(W_ * 0.62, T * 2.2), gmx = (X0 + X1) / 2, gx0 = gmx - gw / 2, gx1 = gmx + gw / 2, gp = ridge - T * 0.08;
    g.beginPath(); g.moveTo(gx0, eave + T * 0.12); g.lineTo(gmx, gp + T * 0.08); g.lineTo(gx1, eave + T * 0.12); g.closePath();
    g.fillStyle = "#6f4124"; g.fill();
    g.save(); g.clip();
    for (let x = gx0; x < gx1; x += T * 0.11) { g.fillStyle = hash(Math.round(x), ci, 5) > 0.5 ? "rgba(255,200,150,.12)" : "rgba(40,20,8,.18)"; g.fillRect(x, gp, T * 0.11, eave - gp + T * 0.2); g.fillStyle = "rgba(40,20,8,.45)"; g.fillRect(x, gp, 1, eave - gp + T * 0.2); }
    g.restore();
    // A little arched gable window and a carved sun medallion.
    const gwY = gp + (eave - gp) * 0.42, gww = T * 0.24;
    g.fillStyle = "#3a2213"; g.beginPath(); g.arc(gmx, gwY, gww * 0.62, Math.PI, 0); g.lineTo(gmx + gww * 0.62, gwY + gww * 0.75); g.lineTo(gmx - gww * 0.62, gwY + gww * 0.75); g.fill();
    g.fillStyle = "#ffd98a"; g.beginPath(); g.arc(gmx, gwY, gww * 0.5, Math.PI, 0); g.lineTo(gmx + gww * 0.5, gwY + gww * 0.66); g.lineTo(gmx - gww * 0.5, gwY + gww * 0.66); g.fill();
    g.fillStyle = "#3a2213"; g.fillRect(gmx - 0.5, gwY - gww * 0.5, 1, gww * 1.2);
    WINDOW_LIGHTS.push([gmx / T, (gwY + gww * 0.2) / T, 0.25]);
    // The gable's own upper window pair on the log wall.
    window_(g, gmx - T * 0.18, eave + T * 0.17, T * 0.36, T * 0.36, T, c.shutter, ci * 10 + 9);
    slopeSnow(g, gx0 - T * 0.14, eave + T * 0.2, gmx, gp, T, ci * 3 + 1);
    slopeSnow(g, gmx, gp, gx1 + T * 0.14, eave + T * 0.2, T, ci * 3 + 2);
    ellipse(g, gmx, gp - T * 0.04, T * 0.14, T * 0.08, SNOW);
  }

  // Hanging carved sign on the biggest chalet: a painted pine, no lettering.
  if (c.w > 4.5) {
    const sx = X1 - T * 0.55, sy = gf + T * 0.05;
    g.fillStyle = "#2a1a10"; g.fillRect(sx - T * 0.02, sy, T * 0.3, T * 0.02); g.fillRect(sx + T * 0.03, sy, 1, T * 0.06); g.fillRect(sx + T * 0.22, sy, 1, T * 0.06);
    roundRect(g, sx - T * 0.02, sy + T * 0.06, T * 0.3, T * 0.22, T * 0.04, "#c98f55", "#5a331b", 1.5);
    g.fillStyle = "#2f5a3a"; g.beginPath(); g.moveTo(sx + T * 0.13, sy + T * 0.09); g.lineTo(sx + T * 0.21, sy + T * 0.24); g.lineTo(sx + T * 0.05, sy + T * 0.24); g.fill();
    g.fillStyle = "#b83a2e"; g.fillRect(sx + T * 0.2, sy + T * 0.1, T * 0.03, T * 0.03);
  }
}

/* ---------- the backdrop behind the chalets ---------- */
function backdrop(g: Ctx, T: number) {
  const mw = W * T;
  const sky = g.createLinearGradient(0, 0, 0, T * 1.6);
  sky.addColorStop(0, "#7fbfea"); sky.addColorStop(1, "#d9eefa");
  g.fillStyle = sky; g.fillRect(0, 0, mw, T * 3);
  // Far peaks: blue rock, snow above a ragged snowline, shaded east faces.
  const peaks: [number, number][] = [];
  for (let i = -1; i < W / 2.2 + 2; i++) peaks.push([i * 2.2 + hash(i, 0, 51) * 1.1, 0.05 + hash(i, 0, 52) * 0.45]);
  g.beginPath(); g.moveTo(0, T * 1.6);
  for (let i = 0; i < peaks.length - 1; i++) {
    const [ax, ay] = peaks[i], [bx, by] = peaks[i + 1];
    g.lineTo(ax * T, ay * T); g.lineTo(((ax + bx) / 2) * T, (Math.max(ay, by) + 0.45) * T);
  }
  g.lineTo(mw, T * 1.6); g.closePath(); g.fillStyle = "#e9f3fb"; g.fill();
  for (let i = 0; i < peaks.length - 1; i++) {
    const [ax, ay] = peaks[i], [bx, by] = peaks[i + 1], vx = (ax + bx) / 2, vy = Math.max(ay, by) + 0.45;
    g.beginPath(); g.moveTo(ax * T, ay * T); g.lineTo(vx * T, vy * T); g.lineTo((ax + 0.2) * T, (vy + 0.4) * T); g.closePath();
    g.fillStyle = "rgba(120,160,200,.45)"; g.fill();
    // Rock bands below the snow.
    g.fillStyle = "rgba(95,125,160,.55)";
    g.beginPath(); g.moveTo((ax - 0.55) * T, (ay + 0.55) * T); g.lineTo((ax - 0.15) * T, (ay + 0.42) * T); g.lineTo(ax * T, (ay + 0.6) * T); g.lineTo((ax + 0.3) * T, (ay + 0.45) * T); g.lineTo((ax + 0.6) * T, (ay + 0.75) * T); g.lineTo((ax - 0.7) * T, (ay + 0.8) * T); g.closePath(); g.fill();
  }
  // Soft sun haze, top right.
  const sun = g.createRadialGradient(mw * 0.86, 0, 0, mw * 0.86, 0, T * 3);
  sun.addColorStop(0, "rgba(255,250,225,.75)"); sun.addColorStop(1, "rgba(255,250,225,0)");
  g.fillStyle = sun; g.fillRect(mw * 0.86 - T * 3, 0, T * 6, T * 3);
  // A dark forest line, then the snowbank the village sits in.
  for (let i = 0; i < W * 3; i++) {
    const x = (i / 3 + hash(i, 1, 53) * 0.3) * T, h = T * (0.45 + hash(i, 1, 54) * 0.35), by = T * 1.95;
    g.fillStyle = hash(i, 1, 55) > 0.5 ? "#2c5a5a" : "#244e52";
    g.beginPath(); g.moveTo(x, by - h); g.lineTo(x + h * 0.28, by); g.lineTo(x - h * 0.28, by); g.closePath(); g.fill();
    g.fillStyle = "rgba(240,248,255,.85)";
    g.beginPath(); g.moveTo(x, by - h); g.lineTo(x + h * 0.1, by - h * 0.62); g.lineTo(x - h * 0.1, by - h * 0.66); g.closePath(); g.fill();
  }
  const bank = g.createLinearGradient(0, T * 1.85, 0, T * 3);
  bank.addColorStop(0, "#f4f9fd"); bank.addColorStop(1, "#cddff0");
  g.beginPath(); g.moveTo(0, T * 3);
  for (let x = 0; x <= W; x += 0.25) g.lineTo(x * T, T * (1.92 + 0.08 * Math.sin(x * 2.1) + 0.05 * Math.sin(x * 5.3 + 1)));
  g.lineTo(mw, T * 3); g.closePath(); g.fillStyle = bank; g.fill();
}

function gapProps(g: Ctx, T: number) {
  // Gap 1 and 4: pines. Gap 2: skis in a rack. Gap 3: a firewood store.
  drawPine(g, 4.25 * T, 2.97 * T, T * 1.7, 0, 71);
  drawPine(g, 18.85 * T, 2.97 * T, T * 1.45, 0, 72);
  // Ski rack.
  const rx = 8.1 * T, ry = 2.95 * T;
  const skis = ["#d8392b", "#f2b233", "#2f7fc4", "#e9e9ef", "#3c9a5a"];
  skis.forEach((col, i) => {
    const x = rx + T * (0.1 + i * 0.16);
    g.save(); g.translate(x, ry); g.rotate(-0.12 + i * 0.03);
    roundRect(g, -T * 0.03, -T * 0.95, T * 0.06, T * 0.92, T * 0.03, col);
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(-T * 0.03, -T * 0.4, T * 0.06, T * 0.05);
    g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(-T * 0.02, -T * 0.9, 1, T * 0.5);
    ellipse(g, 0, -T * 0.94, T * 0.035, T * 0.02, SNOW);
    g.restore();
  });
  g.fillStyle = "#5e3820"; g.fillRect(rx, ry - T * 0.55, T * 0.9, T * 0.05); g.fillRect(rx + T * 0.02, ry - T * 0.55, T * 0.05, T * 0.55); g.fillRect(rx + T * 0.83, ry - T * 0.55, T * 0.05, T * 0.55);
  roundRect(g, rx - T * 0.02, ry - T * 0.6, T * 0.94, T * 0.05, T * 0.025, SNOW);
  // Firewood store under a little snowy lean-to.
  const wx = 13.8 * T, wy = 2.96 * T, ww = T * 0.95;
  g.fillStyle = "#4b2b16"; g.fillRect(wx, wy - T * 0.85, T * 0.05, T * 0.85); g.fillRect(wx + ww - T * 0.05, wy - T * 0.85, T * 0.05, T * 0.85);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) {
    const cx = wx + T * 0.14 + k * T * 0.17 + (r % 2) * T * 0.08, cy = wy - T * 0.09 - r * T * 0.14;
    if (cx > wx + ww - T * 0.1) continue;
    ellipse(g, cx, cy, T * 0.075, T * 0.07, mix("#b5824f", "#d6a871", hash(k, r, 81)));
    ellipse(g, cx, cy, T * 0.04, T * 0.037, "rgba(140,90,50,.6)");
    ellipse(g, cx, cy, T * 0.012, T * 0.012, "rgba(90,55,25,.8)");
  }
  g.beginPath(); g.moveTo(wx - T * 0.1, wy - T * 0.8); g.lineTo(wx + ww + T * 0.1, wy - T * 0.95); g.lineTo(wx + ww + T * 0.1, wy - T * 0.86); g.lineTo(wx - T * 0.1, wy - T * 0.72); g.closePath();
  g.fillStyle = "#3f2414"; g.fill();
  g.beginPath(); g.moveTo(wx - T * 0.12, wy - T * 0.8);
  for (let x = 0; x <= 1; x += 0.2) g.lineTo(wx - T * 0.1 + (ww + T * 0.2) * x, wy - T * (0.8 + 0.15 * x) - T * (0.08 + hash(Math.round(x * 5), 0, 82) * 0.05));
  g.lineTo(wx + ww + T * 0.12, wy - T * 0.95); g.closePath(); g.fillStyle = SNOW; g.fill();
  // Snow drifted against every foundation and prop in the row.
  for (let x = 0; x < W; x += 0.5) ellipse(g, (x + hash(Math.round(x * 2), 3, 83) * 0.3) * T, 2.98 * T, T * 0.35, T * 0.06, "rgba(245,250,255,.9)");
}

/** A soft, feathered drift: blue lee shadow below-right, bright crest above. */
function softDrift(g: Ctx, x: number, y: number, rx: number, ry: number, a = 1) {
  const blob = (cx: number, cy: number, col: string, al: number, sx: number, sy: number) => {
    g.save(); g.translate(cx, cy); g.scale(1, sy / sx);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, sx);
    grd.addColorStop(0, rgba(col, al)); grd.addColorStop(0.6, rgba(col, al * 0.6)); grd.addColorStop(1, rgba(col, 0));
    g.fillStyle = grd; g.fillRect(-sx, -sx, sx * 2, sx * 2); g.restore();
  };
  blob(x + rx * 0.12, y + ry * 0.55, "#8fb0d6", 0.45 * a, rx * 1.05, ry * 0.9);
  blob(x, y, "#ffffff", 0.95 * a, rx, ry);
}

/* ---------- marks on the snow ---------- */
type Pt = [number, number];
function bez(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
}
function samplePath(curves: Pt[][], step: number): Pt[] {
  const out: Pt[] = [];
  for (const c of curves) for (let i = 0; i <= step; i++) out.push(bez(c, i / step));
  return out;
}
/** Offset a polyline sideways by d tiles. */
function offset(pts: Pt[], d: number): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / l) * d, p[1] + (dx / l) * d];
  });
}
function strokePts(g: Ctx, pts: Pt[], T: number, dy = 0) {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * T, y * T + dy) : g.moveTo(x * T, y * T + dy))); g.stroke();
}

const TRACKS: Pt[][][] = [
  // Swoops in from the west edge, arcs low through the middle, climbs out east.
  [[[-0.5, 7.4], [4, 4.6], [8.5, 11.4], [13.5, 8.2]], [[13.5, 8.2], [16.5, 6.2], [19, 5.8], [22.5, 7.2]]],
  // Leaves the terrace, carves two turns down to the lake shore.
  [[[6.6, 4.05], [4.5, 6.8], [9.5, 7.2], [11.8, 9.2]], [[11.8, 9.2], [14.4, 11.3], [18.8, 9.2], [20.8, 12.6]]],
];

function skiTracks(g: Ctx, T: number) {
  g.lineCap = "round"; g.lineJoin = "round";
  TRACKS.forEach((curves, ti) => {
    const mid = samplePath(curves, 40);
    for (const side of [-0.09, 0.09]) {
      const p = offset(mid, side);
      g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = Math.max(1.5, T * 0.05); strokePts(g, p, T, T * 0.03);
      g.strokeStyle = "rgba(110,145,190,.5)"; g.lineWidth = Math.max(1.2, T * 0.045); strokePts(g, p, T);
    }
    // Pole plants, alternating sides along the track.
    for (let i = 6; i < mid.length - 3; i += 9) {
      const [x, y] = offset(mid, (i / 9) % 2 ? 0.42 : -0.42)[i];
      ellipse(g, x * T, y * T, T * 0.05, T * 0.03, "rgba(130,160,200,.35)");
      ellipse(g, x * T, y * T, T * 0.018, T * 0.012, "rgba(90,120,165,.6)");
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.beginPath(); g.ellipse(x * T, y * T + 1, T * 0.05, T * 0.03, 0, 0, Math.PI); g.stroke();
      void ti;
    }
  });
}

function footprints(g: Ctx, T: number) {
  const path = samplePath([[[7.7, 3.35], [7.2, 5.5], [10.2, 6.8], [9.6, 8.2]], [[9.6, 8.2], [8.9, 9.7], [5.6, 10.6], [6.4, 12.7]]], 60);
  // Walk the path at an even stride.
  let acc = 0, n = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i], seg = Math.hypot(bx - ax, by - ay);
    acc += seg;
    if (acc < 0.3) continue;
    acc = 0; n++;
    const dx = (bx - ax) / seg, dy = (by - ay) / seg, side = n % 2 ? 0.08 : -0.08;
    const x = (bx - dy * side) * T, y = (by + dx * side) * T, ang = Math.atan2(dy, dx) + Math.PI / 2;
    const onDeck = by < 4;
    g.save(); g.translate(x, y); g.rotate(ang);
    ellipse(g, 0, 0, T * 0.05, T * 0.085, onDeck ? "rgba(235,242,250,.75)" : "rgba(125,155,195,.42)");
    ellipse(g, 0, -T * 0.03, T * 0.03, T * 0.035, onDeck ? "rgba(255,255,255,.7)" : "rgba(100,130,175,.35)");
    g.restore();
  }
}

function snowDetails(g: Ctx, T: number) {
  // Wind ripples: long faint curves, seeded per ripple, crossing tiles cleanly.
  g.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const y0 = 4.5 + hash(i, 0, 91) * 7, x0 = hash(i, 1, 91) * W - 2, len = 2 + hash(i, 2, 91) * 3;
    g.strokeStyle = "rgba(160,190,225,.28)"; g.lineWidth = Math.max(1, T * 0.03);
    g.beginPath();
    for (let s = 0; s <= 16; s++) { const x = x0 + (len * s) / 16; const y = y0 + Math.sin(s * 0.4 + i) * 0.12; s ? g.lineTo(x * T, y * T) : g.moveTo(x * T, y * T); }
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1;
    g.beginPath();
    for (let s = 0; s <= 16; s++) { const x = x0 + (len * s) / 16; const y = y0 + Math.sin(s * 0.4 + i) * 0.12 - 0.04; s ? g.lineTo(x * T, y * T) : g.moveTo(x * T, y * T); }
    g.stroke();
  }
  // Rocks peeking out, capped with snow.
  const rocks: [number, number, number][] = [[7.5, 7.75, 0.28], [19.35, 8.6, 0.22], [12.5, 11.7, 0.2], [4.3, 11.75, 0.16], [14.4, 6.4, 0.13], [0.5, 4.8, 0.2]];
  rocks.forEach(([x, y, r], i) => {
    const px = x * T, py = y * T, R = r * T;
    ellipse(g, px + R * 0.2, py + R * 0.35, R * 1.2, R * 0.35, "rgba(120,150,190,.35)");
    g.fillStyle = "#6e7480";
    g.beginPath(); g.moveTo(px - R, py + R * 0.3); g.quadraticCurveTo(px - R * 0.9, py - R * 0.7, px - R * 0.1, py - R * 0.75); g.quadraticCurveTo(px + R, py - R * 0.6, px + R, py + R * 0.3); g.closePath(); g.fill();
    g.fillStyle = "#555b67"; g.beginPath(); g.moveTo(px + R * 0.1, py - R * 0.6); g.quadraticCurveTo(px + R, py - R * 0.5, px + R, py + R * 0.3); g.lineTo(px + R * 0.2, py + R * 0.3); g.closePath(); g.fill();
    g.fillStyle = SNOW;
    g.beginPath(); g.moveTo(px - R * 0.95, py - R * 0.15); g.quadraticCurveTo(px - R * 0.8, py - R * 0.95, px - R * 0.05, py - R * 0.92);
    g.quadraticCurveTo(px + R * 0.85, py - R * 0.8, px + R * 0.9, py - R * 0.25); g.quadraticCurveTo(px + R * 0.3, py - R * (0.3 + hash(i, 0, 93) * 0.2), px - R * 0.3, py - R * 0.35); g.closePath(); g.fill();
    ellipse(g, px, py + R * 0.32, R * 1.1, R * 0.16, "#f2f7fc");
  });
  // Dry grass stalks and twigs poking through.
  const tufts: Pt[] = [[14.3, 7.9], [6.2, 10.8], [20.2, 11.9], [11.6, 7.7], [17.6, 9.3], [2.6, 6.7]];
  tufts.forEach(([x, y], i) => {
    for (let k = 0; k < 5; k++) {
      const bx = (x + (k - 2) * 0.05) * T, by = y * T, h = T * (0.14 + hash(i, k, 94) * 0.14), lean = (hash(i, k, 95) - 0.5) * T * 0.12;
      g.strokeStyle = k % 2 ? "#a88a5a" : "#8a6d44"; g.lineWidth = Math.max(1, T * 0.02);
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx, by - h * 0.6, bx + lean, by - h); g.stroke();
    }
    ellipse(g, x * T, y * T + 1, T * 0.14, T * 0.035, "#f2f7fc");
  });
}

/* ---------- the ridge along the lake, and the ice ---------- */
const ridgeEdge = (x: number) => 13.02 + 0.1 * Math.sin(x * 1.7) + 0.06 * Math.sin(x * 3.9 + 1.3);

function ridge(g: Ctx, T: number) {
  const mw = W * T;
  // Blue shadow thrown onto the ice under the overhang.
  g.beginPath(); g.moveTo(0, ridgeEdge(0) * T);
  for (let x = 0; x <= W; x += 0.2) g.lineTo(x * T, (ridgeEdge(x) + 0.28) * T);
  g.lineTo(mw, ridgeEdge(W) * T); g.closePath(); g.fillStyle = "rgba(70,120,170,.28)"; g.fill();
  // An aqua lip of shore ice.
  g.beginPath(); g.moveTo(0, ridgeEdge(0) * T);
  for (let x = 0; x <= W; x += 0.2) g.lineTo(x * T, (ridgeEdge(x) + 0.12 + 0.04 * Math.sin(x * 7)) * T);
  for (let x = W; x >= 0; x -= 0.2) g.lineTo(x * T, (ridgeEdge(x) - 0.02) * T);
  g.closePath(); g.fillStyle = "rgba(170,230,245,.85)"; g.fill();
  // The ridge itself: packed snow rolling over the edge.
  g.beginPath(); g.moveTo(0, 12.4 * T);
  for (let x = 0; x <= W; x += 0.2) g.lineTo(x * T, (ridgeEdge(x) + 0.02) * T);
  g.lineTo(mw, 12.4 * T); g.closePath();
  const rg = g.createLinearGradient(0, 12.4 * T, 0, 13.1 * T);
  rg.addColorStop(0, "rgba(233,241,249,0)"); rg.addColorStop(0.35, "#e7f0f8"); rg.addColorStop(0.85, "#d2e2f1"); rg.addColorStop(1, "#b9d0e6");
  g.fillStyle = rg; g.fill();
  // Crest highlight and icicles hanging off the lip.
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(1.5, T * 0.04);
  g.beginPath();
  for (let x = 0; x <= W; x += 0.2) { const y = (ridgeEdge(x) - 0.32 + 0.05 * Math.sin(x * 2.3)) * T; x ? g.lineTo(x * T, y) : g.moveTo(0, y); }
  g.stroke();
  g.fillStyle = "rgba(225,245,255,.9)";
  for (let i = 0; i < W * 5; i++) {
    if (hash(i, 0, 97) < 0.5) continue;
    const x = i / 5 + 0.1, y = ridgeEdge(x) * T, l = T * (0.05 + hash(i, 1, 97) * 0.12);
    g.beginPath(); g.moveTo(x * T - T * 0.02, y); g.lineTo(x * T + T * 0.02, y); g.lineTo(x * T, y + l); g.fill();
  }
}

function cracks(g: Ctx, T: number) {
  g.save();
  g.beginPath(); g.rect(0, 13.15 * T, W * T, 5 * T); g.clip();
  g.lineCap = "round"; g.lineJoin = "round";
  const walk = (x: number, y: number, ang: number, len: number, seed: number, depth: number) => {
    const r = stream(seed), pts: Pt[] = [[x, y]];
    for (let i = 0; i < len; i++) {
      ang += (r() - 0.5) * 0.9; x += Math.cos(ang) * 0.32; y += Math.sin(ang) * 0.22;
      pts.push([x, y]);
      if (depth < 2 && r() > 0.8) walk(x, y, ang + (r() > 0.5 ? 1 : -1) * (0.7 + r() * 0.5), Math.floor(len * 0.4), seed * 7 + i, depth + 1);
    }
    g.strokeStyle = "rgba(255,255,255,.75)"; g.lineWidth = depth ? 1 : 1.6; strokePts(g, pts, T, 1.2);
    g.strokeStyle = `rgba(55,105,150,${depth ? 0.45 : 0.62})`; g.lineWidth = depth ? 0.9 : 1.4; strokePts(g, pts, T);
  };
  walk(1.5, 14.2, 0.2, 18, 11, 0);
  walk(9.2, 15.4, -0.3, 15, 12, 0);
  walk(14.5, 13.6, 0.9, 12, 13, 0);
  walk(16.8, 16.6, -0.1, 17, 14, 0);
  walk(4.2, 17.3, -0.6, 10, 15, 0);
  // A star-burst of fractures: the thin patch.
  for (let k = 0; k < 7; k++) walk(11.4, 16.1, (k / 7) * Math.PI * 2, 4 + (k % 3), 30 + k, 2);
  ellipse(g, 11.4 * T, 16.1 * T, T * 0.5, T * 0.3, "rgba(40,95,140,.18)");
  // Snow drifts combed out by the wind.
  for (let i = 0; i < 16; i++) {
    const x = hash(i, 0, 99) * W, y = 13.5 + hash(i, 1, 99) * 4.3, len = T * (0.7 + hash(i, 2, 99) * 1.6);
    for (let k = 0; k < 4; k++) ellipse(g, x * T + k * len * 0.22, y * T + (k % 2) * T * 0.04, len * (0.3 - k * 0.05), T * (0.07 - k * 0.012), "rgba(245,251,255,.55)");
  }
  g.restore();
}

/* ---------- the deck edge ---------- */
function deckDrifts(g: Ctx, T: number) {
  // Soft powder blown onto the boards: long low drifts, heaviest at the wall.
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 0, 103) * W, y = 3.12 + hash(i, 1, 103) * 0.75, w = 0.4 + hash(i, 2, 103) * 0.9;
    softDrift(g, x * T, y * T, w * T * 0.55, T * (0.05 + hash(i, 3, 103) * 0.04), 0.8);
  }
  // A bench, a lantern post and a sled parked on the terrace.
  const bx = 13.2 * T, by = 3.35 * T;
  g.fillStyle = "#5e3820"; g.fillRect(bx, by, T * 0.9, T * 0.08); g.fillRect(bx + T * 0.05, by + T * 0.08, T * 0.05, T * 0.18); g.fillRect(bx + T * 0.8, by + T * 0.08, T * 0.05, T * 0.18);
  g.fillStyle = "#7a4a2a"; g.fillRect(bx, by - T * 0.2, T * 0.9, T * 0.06);
  roundRect(g, bx - T * 0.02, by - T * 0.25, T * 0.94, T * 0.05, T * 0.025, SNOW);
  roundRect(g, bx - T * 0.02, by - T * 0.03, T * 0.94, T * 0.05, T * 0.025, SNOW);
  const sx = 6.15 * T, sy = 3.72 * T;
  g.strokeStyle = "#4b2b16"; g.lineWidth = Math.max(1.2, T * 0.03);
  g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + T * 0.7, sy); g.quadraticCurveTo(sx + T * 0.85, sy, sx + T * 0.85, sy - T * 0.14); g.stroke();
  g.fillStyle = "#c0392b"; g.fillRect(sx + T * 0.06, sy - T * 0.16, T * 0.62, T * 0.07);
  g.fillStyle = "#e3584a"; for (let k = 0; k < 4; k++) g.fillRect(sx + T * (0.08 + k * 0.16), sy - T * 0.16, T * 0.1, T * 0.07);
  g.fillStyle = "#4b2b16"; g.fillRect(sx + T * 0.12, sy - T * 0.09, T * 0.03, T * 0.09); g.fillRect(sx + T * 0.55, sy - T * 0.09, T * 0.03, T * 0.09);
  roundRect(g, sx + T * 0.06, sy - T * 0.2, T * 0.62, T * 0.05, T * 0.025, SNOW);
}

function snowProps(g: Ctx, T: number) {
  // A pair of skis and poles planted in the snow, and a snow drift mound or two.
  const px = 17.35 * T, py = 8.1 * T;
  ellipse(g, px + T * 0.1, py + T * 0.04, T * 0.35, T * 0.08, "rgba(120,155,200,.35)");
  [["#2f7fc4", -0.08], ["#2f7fc4", 0.06]].forEach(([col, a], i) => {
    g.save(); g.translate(px + T * (i * 0.12), py); g.rotate(a as number);
    roundRect(g, -T * 0.035, -T * 0.85, T * 0.07, T * 0.88, T * 0.035, col as string);
    g.fillStyle = "#1f2a38"; g.fillRect(-T * 0.035, -T * 0.42, T * 0.07, T * 0.09);
    g.fillStyle = "rgba(255,255,255,.45)"; g.fillRect(-T * 0.02, -T * 0.8, 1, T * 0.35);
    g.restore();
  });
  g.strokeStyle = "#3a3f48"; g.lineWidth = Math.max(1, T * 0.02);
  g.beginPath(); g.moveTo(px + T * 0.32, py); g.lineTo(px + T * 0.4, py - T * 0.72); g.moveTo(px + T * 0.4, py); g.lineTo(px + T * 0.33, py - T * 0.7); g.stroke();
  ellipse(g, px + T * 0.33, py - T * 0.12, T * 0.05, T * 0.015, "#3a3f48");
  ellipse(g, px + T * 0.1, py + T * 0.02, T * 0.3, T * 0.06, SNOW);
  // Wind-built mounds with a blue lee side.
  const mounds: [number, number, number][] = [[3.6, 5.55, 0.7], [16.2, 9.9, 0.8], [11.2, 10.3, 0.55], [21.3, 11.6, 0.6], [0.6, 9.8, 0.5]];
  mounds.forEach(([x, y, r]) => {
    softDrift(g, x * T, y * T, r * T * 0.7, T * 0.17);
  });
}

function deckEdge(g: Ctx, T: number) {
  // Snow overhanging the terrace's front beam, falling into the field below.
  g.fillStyle = "rgba(110,150,195,.25)"; g.fillRect(0, 4 * T, W * T, T * 0.14);
  g.beginPath(); g.moveTo(0, 3.93 * T);
  for (let x = 0; x <= W; x += 0.25) g.lineTo(x * T, (4.02 + 0.03 * Math.sin(x * 3.1) + hash(Math.round(x * 4), 0, 101) * 0.03) * T);
  g.lineTo(W * T, 3.93 * T); g.closePath(); g.fillStyle = "#eef5fb"; g.fill();
  g.fillStyle = rgba("#ffffff", 0.9);
  for (let x = 0; x < W; x += 0.5) ellipse(g, (x + 0.25) * T, 3.94 * T, T * 0.22, T * 0.03, "rgba(255,255,255,.9)");
}

export function extras(g: Ctx, T: number) {
  WINDOW_LIGHTS.length = 0;
  g.save(); g.beginPath(); g.rect(0, 0, W * T, 3 * T); g.clip();
  backdrop(g, T);
  CHALETS.forEach((c, i) => chalet(g, c, T, i));
  gapProps(g, T);
  g.restore();
  g.save(); g.beginPath(); g.rect(0, 3 * T, W * T, 10.3 * T); g.clip();
  deckDrifts(g, T);
  snowDetails(g, T);
  snowProps(g, T);
  skiTracks(g, T);
  footprints(g, T);
  deckEdge(g, T);
  g.restore();
  ridge(g, T);
  cracks(g, T);
}
