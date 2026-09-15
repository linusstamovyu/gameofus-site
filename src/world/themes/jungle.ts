// Jungle temple: a stepped ruin in deep rainforest, a slab trail along a carved wall,
// a mossy floor and a murky river with something in it. Static scenery lives in
// jungle-scenery.ts; this file is everything that moves, the props and the sign.
import type { Stop } from "../../content/types";
import { PARASOLS, W, hash } from "../map";
import { glow, r01, rgba, shadow, wrap, type Ctx, type View } from "./kit";
import { PAL, clump, css, jungleExtras, jungleTile, leaf, lerp3 } from "./jungle-scenery";
import type { Theme } from "./types";

const TAU = Math.PI * 2;
const IDOLS = new Set(["10,11", "20,5"]); // the other two "small" props are campfires
const CROC_LAP = W + 7;                     // tiles the crocodile drifts before it comes round again

/* ---------- the river ---------- */
function river(ctx: Ctx, T: number, time: number, animated: boolean, v: View) {
  if (v.y1 < 13) return;
  const t = animated ? time : 0, u = T / 16;
  const L = v.x0 * T, R = (v.x1 + 1) * T, top = 13 * T, bot = 18 * T;
  const grd = ctx.createLinearGradient(0, top, 0, bot);
  grd.addColorStop(0, "#4b7250"); grd.addColorStop(0.18, "#35604a"); grd.addColorStop(0.6, "#264c3c"); grd.addColorStop(1, "#2d5540");
  ctx.fillStyle = grd; ctx.fillRect(L, top, R - L, bot - top);

  // murky depth: slow drifting darker bands, seeded per row so they run the whole width
  for (let r = 0; r < 5; r++) {
    const y = top + (r + 0.3 + r01(r, 3) * 0.4) * T, off = wrap(t * T * 0.25 * (1 + r * 0.15) + r01(r, 4) * W * T, W * T);
    for (let k = -1; k < 2; k++) {
      const x = off + k * W * T * 0.5;
      ctx.fillStyle = "rgba(14,34,26,.14)"; ctx.beginPath(); ctx.ellipse(x, y, T * 3, T * 0.28, 0, 0, TAU); ctx.fill();
    }
  }

  // the bank's reflection: a dark band with the reeds wobbling in it
  ctx.fillStyle = "rgba(12,28,16,.35)"; ctx.fillRect(L, top, R - L, T * 0.55);
  for (let c = 0; c < 22; c++) {
    const x = r01(c, 90) * W * T;
    if (x < L - T || x > R + T) continue;
    const w = Math.sin(t * 2.2 + c) * u;
    ctx.fillStyle = "rgba(60,95,40,.35)";
    for (let k = 0; k < 4; k++) ctx.fillRect(x + k * u * 1.3 + w * (k % 2 ? 1 : -1), top + u * (2 + k), u * 0.6, T * (0.25 + r01(c, k + 91) * 0.2));
  }

  // ripple lines, broken into dashes that are fixed to the water and flow with it
  ctx.lineWidth = u * 0.5; ctx.lineCap = "butt";
  for (let i = 0; i < 12; i++) {
    const baseY = top + (0.7 + (i / 12) * 4.1 + r01(i, 80) * 0.25) * T, drift = t * T * (0.9 + r01(i, 81) * 0.6);
    const dash = T * (0.5 + r01(i, 82) * 0.6), gap = T * (0.4 + r01(i, 83) * 1.3), per = dash + gap;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(12,30,22,.35)" : "rgba(170,205,160,.2)";
    ctx.beginPath();
    const start = Math.floor((L - drift) / per) * per + drift;
    for (let x0 = start; x0 < R; x0 += per) {
      for (let s = 0; s <= 4; s++) {
        const x = x0 + (dash * s) / 4, y = baseY + Math.sin((x - drift) / (T * 0.55) + i) * u * 1.3;
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }

  // silt flecks
  for (let i = 0; i < 40; i++) {
    const x = wrap(r01(i, 85) * (W + 1) * T + t * T * (0.6 + r01(i, 86)), (W + 1) * T) - T * 0.5;
    if (x < L || x > R) continue;
    const y = top + (0.6 + r01(i, 87) * 4.3) * T;
    ctx.fillStyle = i % 2 ? "rgba(190,215,170,.22)" : "rgba(10,25,18,.3)"; ctx.fillRect(x, y, u * 0.6, u * 0.6);
  }

  // a mossy log riding the current
  {
    const lx = (wrap(15 + t * 0.75, W + 5) - 2.5) * T, ly = 16.55 * T + Math.sin(t * 1.4) * u * 0.6, lw = T * 1.3, rot = Math.sin(t * 0.5) * 0.05;
    if (lx + lw > L && lx - lw < R) {
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot);
      ctx.fillStyle = "rgba(12,28,20,.4)"; ctx.beginPath(); ctx.ellipse(u, u * 2, lw * 0.55, u * 2.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#4a3822"; ctx.beginPath(); ctx.roundRect(-lw / 2, -u * 2, lw, u * 4, u * 2); ctx.fill();
      ctx.fillStyle = "#6e5436"; ctx.fillRect(-lw / 2 + u * 2, -u * 1.8, lw - u * 4, u * 1.2);
      ctx.fillStyle = "#b08f5e"; ctx.beginPath(); ctx.ellipse(lw / 2 - u * 0.5, 0, u * 1.2, u * 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#6e5436"; ctx.lineWidth = u * 0.4; ctx.beginPath(); ctx.ellipse(lw / 2 - u * 0.5, 0, u * 0.5, u * 1, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = css(PAL.moss); ctx.fillRect(-lw * 0.3, -u * 2.2, lw * 0.35, u * 1.2);
      ctx.fillStyle = "#5a7a34"; ctx.fillRect(-lw * 0.05, -u * 3, u * 0.5, u); // a sprout
      leaf(ctx, -lw * 0.05, -u * 2.8, u * 1.8, u * 0.8, -0.8, "#6fae46");
      ctx.restore();
      ctx.strokeStyle = "rgba(210,230,200,.35)"; ctx.lineWidth = u * 0.5;
      ctx.beginPath(); ctx.moveTo(lx - lw * 0.55, ly - u * 2); ctx.lineTo(lx - lw * 0.9, ly - u * 3.5); ctx.moveTo(lx - lw * 0.55, ly + u * 2); ctx.lineTo(lx - lw * 0.9, ly + u * 3.5); ctx.stroke();
    }
  }

  // current streaks, all flowing east, faster mid-stream
  for (let r = 0; r < 5; r++) {
    const speed = T * (0.8 + (r === 1 || r === 2 ? 0.7 : 0.2));
    for (let i = 0; i < 16; i++) {
      const len = T * (0.3 + r01(i, r + 20) * 0.7);
      const x = wrap(r01(i, r + 10) * (W + 2) * T + t * speed * (0.8 + r01(i, r + 30) * 0.4), (W + 2) * T) - T;
      if (x + len < L || x > R) continue;
      const y = top + (r + r01(i, r + 40)) * T;
      ctx.fillStyle = i % 4 === 0 ? "rgba(18,40,30,.35)" : `rgba(150,190,140,${0.12 + r01(i, r + 50) * 0.14})`;
      ctx.fillRect(x, y, len, u * 0.55);
      if (i % 3 === 0) ctx.fillRect(x + len * 0.3, y + u * 1.2, len * 0.5, u * 0.45);
    }
  }

  // drifting leaves and foam flecks riding the current
  for (let i = 0; i < 18; i++) {
    const x = wrap(r01(i, 60) * (W + 2) * T + t * T * 1.1, (W + 2) * T) - T;
    if (x < L - T || x > R) continue;
    const y = top + (0.6 + r01(i, 61) * 4.2) * T + Math.sin(t * 2 + i) * u;
    if (i % 3) { ctx.fillStyle = "rgba(225,235,205,.45)"; ctx.fillRect(x, y, u * 1.2, u * 0.6); ctx.fillRect(x + u * 1.8, y + u * 0.4, u * 0.6, u * 0.5); }
    else leaf(ctx, x, y, u * 2.4, u, 0.4 + Math.sin(t + i) * 0.4, i % 2 ? "#9a7a3a" : "#6b8a30");
  }

  // rocks at the bank with the water breaking round them
  for (const [rx, ry, s] of [[4.6, 13.35, 1], [12.4, 13.5, 2], [19.2, 13.3, 3], [8.3, 16.6, 4]] as const) {
    const x = rx * T, y = ry * T, w = T * (0.36 + s * 0.04);
    if (x + T < L || x - T > R) continue;
    const p = Math.sin(t * 3 + s) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(220,235,210,${0.35 + p * 0.25})`; ctx.lineWidth = u * 0.7;
    ctx.beginPath(); ctx.ellipse(x - w * 0.2, y + u, w * (1.25 + p * 0.2), w * 0.45, 0, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = "rgba(230,240,220,.55)"; ctx.fillRect(x + w * 0.9, y - u * 0.2, w * (0.5 + p * 0.6), u * 0.6);
    ctx.fillStyle = "#4e5144"; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#7d7f6a"; ctx.beginPath(); ctx.ellipse(x - w * 0.2, y - w * 0.18, w * 0.62, w * 0.28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = css(PAL.moss); ctx.fillRect(x - w * 0.5, y - w * 0.4, w * 0.5, u * 0.9);
  }

  // lily pads, bobbing in the slack water
  for (let i = 0; i < 9; i++) {
    const bx = (0.8 + r01(i, 70) * (W - 1.6)) * T, by = top + (0.45 + r01(i, 71) * 4.2) * T;
    const x = bx + Math.sin(t * 0.6 + i * 1.7) * u * 1.4, y = by + Math.sin(t * 1.3 + i) * u * 0.5;
    if (x + T < L || x - T > R) continue;
    const r = T * (0.2 + r01(i, 72) * 0.14), rot = r01(i, 73) * TAU + Math.sin(t * 0.4 + i) * 0.25;
    ctx.fillStyle = "rgba(12,30,22,.35)"; ctx.beginPath(); ctx.ellipse(x + u * 0.6, y + u * 0.8, r, r * 0.62, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = i % 2 ? "#4f8f3a" : "#3f7d33";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.ellipse(x, y, r, r * 0.62, 0, rot + 0.35, rot + TAU - 0.35); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(160,210,110,.45)"; ctx.lineWidth = u * 0.4;
    ctx.beginPath(); for (let k = 1; k < 4; k++) { const a = rot + (k / 4) * TAU; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.52); } ctx.stroke();
    if (r01(i, 74) > 0.55) {
      for (let p = 0; p < 6; p++) leaf(ctx, x - r * 0.2, y - r * 0.15, u * 2, u * 0.9, -Math.PI / 2 + (p - 2.5) * 0.45, p % 2 ? "#f3b6cf" : "#e38ab0");
      ctx.fillStyle = "#ffe27a"; ctx.fillRect(x - r * 0.2 - u * 0.5, y - r * 0.15 - u * 0.8, u, u);
    }
  }

  crocodile(ctx, T, t, L, R);

  // the bank's lip: a dark undercut and a frothing edge
  ctx.fillStyle = "rgba(20,25,12,.45)"; ctx.fillRect(L, top, R - L, u * 1.4);
  ctx.fillStyle = "rgba(215,230,200,.5)";
  ctx.beginPath(); ctx.moveTo(L, top + u);
  for (let x = L; x <= R; x += u * 2) ctx.lineTo(x, top + u * (2 + Math.sin(t * 1.8 + x / (T * 0.37)) * 0.9 + Math.sin(x / (T * 0.13) - t) * 0.4));
  ctx.lineTo(R, top + u); ctx.closePath(); ctx.fill();
}

function crocodile(ctx: Ctx, T0: number, t: number, L: number, R: number) {
  const T = T0 * 1.5, u = T / 16;
  const hx = (wrap(8 + t * 0.32, CROC_LAP) - 3) * T0; // the snout; he drifts east, head first
  if (hx + T < L || hx - T * 3 > R) return;
  const y = 15.2 * T0 + Math.sin(t * 0.9) * u * 0.8;
  // wake: a V of ripples trailing behind the head
  for (let k = 0; k < 3; k++) {
    const d = T * (0.4 + k * 0.55 + ((t * 0.6) % 1) * 0.55), a = 0.18 - k * 0.04;
    ctx.strokeStyle = `rgba(200,225,195,${0.3 - k * 0.08})`; ctx.lineWidth = u * 0.6;
    ctx.beginPath(); ctx.moveTo(hx - d, y - d * a - u); ctx.lineTo(hx - d * 0.15, y - u * 0.5); ctx.lineTo(hx - d, y + d * a + u); ctx.stroke();
  }
  // submerged body
  ctx.fillStyle = "rgba(16,34,22,.5)"; ctx.beginPath(); ctx.ellipse(hx - T * 1.3, y, T * 1.25, T * 0.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "rgba(16,34,22,.35)"; ctx.beginPath(); ctx.ellipse(hx - T * 2.7, y + Math.sin(t * 2) * u, T * 0.5, T * 0.07, 0, 0, TAU); ctx.fill();
  // back scutes just breaking the surface
  for (let k = 0; k < 6; k++) {
    const sx = hx - T * (0.75 + k * 0.28);
    ctx.fillStyle = "#35462a"; ctx.fillRect(sx, y - u * 1.1 - (k % 2) * u * 0.4, u * 1.6, u * 0.9);
    ctx.fillStyle = "rgba(170,190,130,.35)"; ctx.fillRect(sx, y - u * 1.1 - (k % 2) * u * 0.4, u * 1.6, u * 0.3);
  }
  // snout and nostrils
  ctx.fillStyle = "#4a5c32"; ctx.beginPath(); ctx.ellipse(hx - u * 3, y, u * 4.2, u * 1.3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#6b7c43"; ctx.beginPath(); ctx.ellipse(hx - u * 3.4, y - u * 0.5, u * 3.4, u * 0.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1d2414"; ctx.fillRect(hx - u * 0.9, y - u * 0.9, u * 0.6, u * 0.5); ctx.fillRect(hx - u * 0.9, y + u * 0.1, u * 0.6, u * 0.5);
  // eyes: two bumps, and every few seconds a slow blink
  const blink = Math.sin(t * 0.7) > 0.97 ? 0.2 : 1;
  for (const dy of [-1.3, 1.1]) {
    const ex = hx - u * 8, ey = y + dy * u;
    ctx.fillStyle = "#3e4f2a"; ctx.beginPath(); ctx.ellipse(ex, ey, u * 1.6, u * 1.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e7c940"; ctx.beginPath(); ctx.ellipse(ex + u * 0.3, ey - u * 0.2, u * 0.85, u * 0.7 * blink, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#15180c"; ctx.fillRect(ex + u * 0.15, ey - u * 0.7 * blink, u * 0.35, u * 1.1 * blink);
  }
  const ring = (t * 0.8) % 1;
  ctx.strokeStyle = `rgba(210,230,200,${0.35 * (1 - ring)})`; ctx.lineWidth = u * 0.5;
  ctx.beginPath(); ctx.ellipse(hx - u * 7, y, u * (3 + ring * 6), u * (1.6 + ring * 2.2), 0, 0, TAU); ctx.stroke();
}

/* ---------- props ---------- */
function tree(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const u = T / 16, cx = x * T + T / 2, by = (y + 1) * T, ph = hash(x, y, 4) * TAU;
  const sway = Math.sin(time * 0.9 + ph) * u * 0.9, sway2 = Math.sin(time * 1.3 + ph + 1) * u * 0.5;
  const lean = (hash(x, y, 5) - 0.5) * u * 4;
  shadow(ctx, cx, by - T * 0.12, T * 0.48, T * 0.15, 0.28);

  // buttress roots
  for (const [dx, h, side] of [[-0.5, 0.62, -1], [-0.22, 0.8, -1], [0.26, 0.72, 1], [0.5, 0.5, 1]] as const) {
    ctx.fillStyle = side < 0 ? "#9a8c6c" : "#6e6450";
    ctx.beginPath(); ctx.moveTo(cx + dx * T * 0.15, by - T * h); ctx.quadraticCurveTo(cx + dx * T * 0.5, by - T * 0.25, cx + dx * T, by - T * 0.1);
    ctx.lineTo(cx + dx * T * 0.2, by - T * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(30,25,15,.3)"; ctx.fillRect(cx + dx * T * 0.62, by - T * 0.16, u * 2, u * 0.7);
  }
  // trunk: pale, tapering, bark lines, moss and an epiphyte
  const tb = by - T * 0.1, tt = by - T * 1.85, wB = T * 0.25, wT = T * 0.13;
  ctx.fillStyle = "#877b5e";
  ctx.beginPath(); ctx.moveTo(cx - wB, tb); ctx.quadraticCurveTo(cx - wB * 0.6 + lean, (tb + tt) / 2, cx - wT + lean + sway * 0.3, tt);
  ctx.lineTo(cx + wT + lean + sway * 0.3, tt); ctx.quadraticCurveTo(cx + wB * 0.6 + lean, (tb + tt) / 2, cx + wB, tb); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(40,32,20,.35)";
  ctx.beginPath(); ctx.moveTo(cx + wB * 0.2, tb); ctx.quadraticCurveTo(cx + wB * 0.3 + lean, (tb + tt) / 2, cx + wT * 0.2 + lean + sway * 0.3, tt);
  ctx.lineTo(cx + wT + lean + sway * 0.3, tt); ctx.quadraticCurveTo(cx + wB * 0.6 + lean, (tb + tt) / 2, cx + wB, tb); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(50,40,25,.45)"; ctx.lineWidth = u * 0.4;
  for (let k = 0; k < 4; k++) {
    const ox = (k - 1.5) * u * 1.4;
    ctx.beginPath(); ctx.moveTo(cx + ox, tb - u * 2); ctx.quadraticCurveTo(cx + ox * 0.8 + lean * 0.5, (tb + tt) / 2, cx + ox * 0.5 + lean, tt + u * 3); ctx.stroke();
  }
  ctx.fillStyle = css(PAL.moss);
  ctx.fillRect(cx - wB * 0.9 + lean * 0.2, by - T * 0.75, u * 2.2, u * 3.5); ctx.fillRect(cx - wT + lean * 0.7, by - T * 1.35, u * 1.6, u * 2.5);
  for (let p = 0; p < 5; p++) leaf(ctx, cx + wT + lean * 0.8, by - T * 1.2, u * 2.4, u * 0.8, -Math.PI / 2 + (p - 2) * 0.55, p % 2 ? "#c8352a" : "#e36a3a");
  // branches into the crown
  ctx.strokeStyle = "#7a6f55"; ctx.lineWidth = u * 1.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx + lean, tt + u * 2); ctx.lineTo(cx - T * 0.45 + sway, by - T * 2.15); ctx.moveTo(cx + lean, tt + u * 2); ctx.lineTo(cx + T * 0.5 + sway, by - T * 2.05); ctx.stroke();

  // crown: back layer darkest, front brightest; the top layers sway the most
  const ox = cx + lean + sway, oy = by - T * 2.1, s = hash(x, y, 6) * 1000 | 0;
  const deep: [string, string, string, string] = [css(PAL.canopyDark), css(PAL.leaf1), css(PAL.leaf2), css(PAL.leaf3)];
  const mid: [string, string, string, string] = [css(PAL.leaf1), css(PAL.leaf2), css(PAL.leaf3), css(PAL.leaf4)];
  const lit: [string, string, string, string] = [css(PAL.leaf2), css(PAL.leaf3), css(lerp3(PAL.leaf3, PAL.leaf4, 0.5)), "#c6e88a"];
  clump(ctx, ox - T * 0.78, oy + T * 0.22, T * 0.48, s + 1, deep);
  clump(ctx, ox + T * 0.8, oy + T * 0.26, T * 0.46, s + 2, deep);
  clump(ctx, ox, oy + T * 0.32, T * 0.58, s + 3, deep);
  clump(ctx, ox - T * 0.45 + sway2, oy - T * 0.12, T * 0.54, s + 4, mid);
  clump(ctx, ox + T * 0.5 + sway2, oy - T * 0.05, T * 0.5, s + 5, mid);
  clump(ctx, ox + sway2 * 1.5, oy - T * 0.4, T * 0.46, s + 6, lit);
  clump(ctx, ox - T * 0.9 + sway2, oy + T * 0.04, T * 0.3, s + 7, lit);
  clump(ctx, ox + T * 0.85 + sway2, oy - T * 0.02, T * 0.26, s + 8, lit);
  // hanging vines, swinging a beat behind the crown
  for (let k = 0; k < 4; k++) {
    const vx = ox + (k - 1.5) * T * 0.42, vy = oy + T * 0.42, len = T * (0.45 + hash(x, k, 7) * 0.5);
    const swing = Math.sin(time * 1.1 + ph + k) * u * 1.5;
    ctx.strokeStyle = "#2f5a22"; ctx.lineWidth = u * 0.55;
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.quadraticCurveTo(vx, vy + len * 0.5, vx + swing, vy + len); ctx.stroke();
    for (let l = 1; l <= 3; l++) leaf(ctx, vx + (swing * l) / 3, vy + (len * l) / 3.3, u * 1.8, u * 0.8, l % 2 ? 0.6 : Math.PI - 0.6, "#4a8f37");
  }
}

function campfire(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const u = T / 16, cx = x * T + T / 2, by = (y + 1) * T, fy = by - T * 0.26;
  shadow(ctx, cx, by - T * 0.2, T * 0.46, T * 0.16, 0.25);
  // scorched ground and ash
  ctx.fillStyle = "rgba(25,18,10,.5)"; ctx.beginPath(); ctx.ellipse(cx, fy, T * 0.3, T * 0.11, 0, 0, TAU); ctx.fill();
  const stone = (k: number) => {
    const a = (k / 8) * TAU, sx = cx + Math.cos(a) * T * 0.34, sy = fy + Math.sin(a) * T * 0.13;
    ctx.fillStyle = "#4a4a3c"; ctx.beginPath(); ctx.ellipse(sx, sy + u * 0.5, u * 2.4, u * 1.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = k % 2 ? "#8c8a72" : "#a19f85"; ctx.beginPath(); ctx.ellipse(sx - u * 0.3, sy - u * 0.2, u * 1.9, u * 1.1, 0, 0, TAU); ctx.fill();
  };
  for (let k = 4; k < 9; k++) stone(k % 8); // back half of the ring
  // logs
  for (const [a, c] of [[0.35, "#6b4a2b"], [-0.35, "#5a3c22"], [Math.PI / 2 - 0.1, "#7a5532"]] as const) {
    ctx.save(); ctx.translate(cx, fy); ctx.rotate(a);
    ctx.fillStyle = c; ctx.fillRect(-T * 0.27, -u * 1.2, T * 0.54, u * 2.4);
    ctx.fillStyle = "#c9a26b"; ctx.fillRect(T * 0.24, -u * 1.1, u * 0.9, u * 2.2);
    ctx.fillStyle = "rgba(255,120,40,.6)"; ctx.fillRect(-u * 2, -u * 0.4, u * 4, u * 0.8);
    ctx.restore();
  }
  // flames: three nested tongues flickering at different rates
  const flame = (w: number, h: number, dx: number, col: string) => {
    const tip = Math.sin(time * 7 + dx * 9) * u * 1.4;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(cx + dx - w, fy);
    ctx.quadraticCurveTo(cx + dx - w * 1.05, fy - h * 0.55, cx + dx + tip, fy - h);
    ctx.quadraticCurveTo(cx + dx + w * 1.05, fy - h * 0.55, cx + dx + w, fy);
    ctx.closePath(); ctx.fill();
  };
  const f1 = 1 + Math.sin(time * 9.1) * 0.08 + Math.sin(time * 13.7) * 0.05, f2 = 1 + Math.sin(time * 11.3 + 1) * 0.1;
  flame(T * 0.2, T * 0.62 * f1, 0, "#d9442a");
  flame(T * 0.11, T * 0.42 * f2, -T * 0.1, "#e8602c");
  flame(T * 0.1, T * 0.4 * f1, T * 0.1, "#e8602c");
  flame(T * 0.12, T * 0.44 * f2, 0, "#f59f30");
  flame(T * 0.06, T * 0.26 * f1, 0, "#ffe27a");
  for (let k = 0; k < 4; k++) stone(k); // front half
  // a thin smoke wisp
  for (let k = 0; k < 3; k++) {
    const p = (time * 0.35 + k / 3) % 1;
    ctx.fillStyle = `rgba(210,215,200,${0.18 * (1 - p)})`;
    ctx.beginPath(); ctx.ellipse(cx + Math.sin(time + k * 2) * u * 3 + p * u * 5, fy - T * (0.7 + p * 0.9), u * (1.5 + p * 3), u * (1 + p * 1.5), 0, 0, TAU); ctx.fill();
  }
}

function idol(ctx: Ctx, T: number, x: number, y: number) {
  const u = T / 16, cx = x * T + T / 2, by = (y + 1) * T;
  shadow(ctx, cx, by - T * 0.14, T * 0.44, T * 0.14, 0.3);
  // plinth
  ctx.fillStyle = "#5e5d4b"; ctx.fillRect(cx - T * 0.4, by - T * 0.34, T * 0.8, T * 0.22);
  ctx.fillStyle = "#8f8d74"; ctx.fillRect(cx - T * 0.4, by - T * 0.34, T * 0.8, u * 1.2);
  // head
  const hL = cx - T * 0.33, hT = by - T * 1.38, hw = T * 0.66, hh = T * 1.04;
  ctx.fillStyle = "#83806a"; ctx.beginPath(); ctx.roundRect(hL, hT, hw, hh, [T * 0.18, T * 0.18, u * 2, u * 2]); ctx.fill();
  ctx.fillStyle = "rgba(30,28,15,.35)"; ctx.fillRect(hL + hw - u * 2.5, hT + u * 3, u * 2.5, hh - u * 3);
  ctx.fillStyle = "rgba(255,250,220,.18)"; ctx.fillRect(hL + u, hT + u * 3, u * 1.2, hh - u * 5);
  // stepped headdress
  ctx.fillStyle = "#9d9a80"; ctx.fillRect(hL - u, hT + u * 2, hw + u * 2, u * 2.2);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? "#6f6c58" : "#a8a589"; ctx.fillRect(hL + u + k * u * 2.6, hT + u * 2.4, u * 1.6, u * 1.4); }
  // brow, eyes with amber gems, nose, grille mouth
  ctx.fillStyle = "#5c5a48"; ctx.fillRect(hL + u * 1.5, hT + u * 5.6, hw - u * 3, u * 1.2);
  for (const ex of [hL + u * 2.2, hL + hw - u * 5]) {
    ctx.fillStyle = "#1c1b12"; ctx.fillRect(ex, hT + u * 7, u * 2.8, u * 2);
    ctx.fillStyle = "#f0a52e"; ctx.fillRect(ex + u * 0.9, hT + u * 7.5, u * 1.1, u * 1.1);
  }
  ctx.fillStyle = "#6d6a56"; ctx.fillRect(cx - u * 1.2, hT + u * 8.5, u * 2.4, u * 3.2);
  ctx.fillStyle = "#1c1b12"; ctx.fillRect(hL + u * 2.4, hT + u * 12.6, hw - u * 4.8, u * 1.8);
  ctx.fillStyle = "#9d9a80"; for (let k = 0; k < 4; k++) ctx.fillRect(hL + u * 3 + k * u * 1.6, hT + u * 12.6, u * 0.6, u * 1.8);
  // cracks, moss cap and a draped vine
  ctx.strokeStyle = "rgba(25,22,12,.6)"; ctx.lineWidth = u * 0.4;
  ctx.beginPath(); ctx.moveTo(hL + hw * 0.7, hT + u * 4); ctx.lineTo(hL + hw * 0.62, hT + u * 7); ctx.lineTo(hL + hw * 0.76, hT + u * 10); ctx.stroke();
  ctx.fillStyle = css(PAL.moss); ctx.beginPath(); ctx.ellipse(cx - u, hT + u * 1.2, hw * 0.46, u * 1.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = css(PAL.mossLite); ctx.fillRect(cx - hw * 0.3, hT + u * 0.2, hw * 0.4, u * 0.7);
  for (let d = 0; d < 3; d++) { ctx.fillStyle = css(PAL.moss); ctx.fillRect(hL + u * (2 + d * 3.5), hT + u * 2, u, u * (2 + d)); }
  ctx.strokeStyle = "#2f5a22"; ctx.lineWidth = u * 0.6;
  ctx.beginPath(); ctx.moveTo(hL + u, hT + u * 2); ctx.quadraticCurveTo(hL - u * 2, hT + hh * 0.5, hL + u * 2, by - T * 0.34); ctx.stroke();
  for (let l = 0; l < 4; l++) leaf(ctx, hL - u * 0.6 + (l % 2) * u, hT + u * (4 + l * 3.4), u * 2, u * 0.9, l % 2 ? 0.4 : Math.PI - 0.4, "#4a8f37");
  // an offering of fruit and flowers at its foot
  ctx.fillStyle = "#e0402f"; ctx.beginPath(); ctx.arc(cx - T * 0.22, by - T * 0.38, u * 1.1, 0, TAU); ctx.fill();
  ctx.fillStyle = "#f2c23a"; ctx.beginPath(); ctx.arc(cx + T * 0.24, by - T * 0.37, u * 1, 0, TAU); ctx.fill();
}

function sign(ctx: Ctx, T: number, s: Stop) {
  const u = T / 16, px = s.x * T, by = (s.y + 1) * T, cx = px + T / 2;
  shadow(ctx, cx, by - T * 0.1, T * 0.36, T * 0.12, 0.25);
  // a crooked branch post
  ctx.fillStyle = "#4e3a24";
  ctx.beginPath(); ctx.moveTo(cx - u * 1.2, by - T * 0.1); ctx.lineTo(cx - u * 0.6, by - T * 0.82); ctx.lineTo(cx + u * 1.1, by - T * 0.82); ctx.lineTo(cx + u * 1.3, by - T * 0.1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(200,170,120,.3)"; ctx.fillRect(cx - u * 0.9, by - T * 0.8, u * 0.5, T * 0.66);
  // the board: two weathered planks, one corner chipped away
  const bL = px + T * 0.03, bR = px + T * 0.97, bT = by - T * 1.32, bB = by - T * 0.7;
  ctx.fillStyle = "#3d2b18";
  ctx.beginPath(); ctx.moveTo(bL, bT + u); ctx.lineTo(bR - u * 2.5, bT); ctx.lineTo(bR, bT + u * 2.5); ctx.lineTo(bR - u * 0.5, bB); ctx.lineTo(bL + u * 0.6, bB + u * 0.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#b3915c";
  ctx.beginPath(); ctx.moveTo(bL + u, bT + u * 1.8); ctx.lineTo(bR - u * 2.8, bT + u); ctx.lineTo(bR - u, bT + u * 3); ctx.lineTo(bR - u * 1.4, bB - u); ctx.lineTo(bL + u * 1.4, bB - u * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(60,40,20,.28)";
  ctx.fillRect(bL + u, (bT + bB) / 2 + u * 0.4, bR - bL - u * 2.4, u * 0.6); // plank seam
  for (let k = 0; k < 5; k++) ctx.fillRect(bL + u * (2 + hash(s.x, k, 1) * 11), bT + u * (2.4 + k * 1.7), u * (2 + hash(s.x, k, 2) * 4), u * 0.35);
  ctx.fillStyle = "rgba(90,130,50,.55)"; ctx.fillRect(bL + u, bB - u * 2.2, u * 3, u * 1.4); ctx.fillRect(bL + u * 1.4, bB - u * 3.2, u * 1.4, u);
  // rope lashing the board to the post
  ctx.fillStyle = "#d8c28a";
  for (let k = 0; k < 3; k++) { ctx.save(); ctx.translate(cx, bB - u * (1.2 + k * 1.1)); ctx.rotate(-0.45); ctx.fillRect(-u * 2.4, -u * 0.35, u * 4.8, u * 0.7); ctx.restore(); }
  ctx.fillStyle = "rgba(90,70,30,.5)"; ctx.fillRect(cx - u * 2.2, bB - u * 0.5, u * 4.4, u * 0.5);
  // label: dark carved ink on the pale face
  ctx.fillStyle = "#2a1b0c"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(T * 0.24)}px "Pixelify Sans", monospace`;
  ctx.fillText(s.label ?? "", cx - u * 0.3, by - T * 1.0);
  // a vine climbing the post and curling over the bottom corner
  ctx.strokeStyle = "#2f5a22"; ctx.lineWidth = u * 0.55;
  ctx.beginPath(); ctx.moveTo(cx - u * 1.5, by - T * 0.12); ctx.bezierCurveTo(cx + u * 2.5, by - T * 0.3, cx - u * 3, by - T * 0.5, cx + u * 1.5, by - T * 0.72);
  ctx.quadraticCurveTo(bR, by - T * 0.66, bR - u * 0.5, bB - u * 2); ctx.stroke();
  for (const [lx, ly, a] of [[cx + u * 1.3, by - T * 0.25, 0.3], [cx - u * 1.2, by - T * 0.46, Math.PI - 0.3], [cx + u * 1.6, by - T * 0.66, -0.2], [bR - u, bB - u * 1.5, -1.9]] as const)
    leaf(ctx, lx, ly, u * 2.4, u * 1.1, a, "#4a8f37", "rgba(20,40,12,.5)");
}

/* ---------- lights ---------- */
function lights(ctx: Ctx, T: number, time: number, animated: boolean, v: View) {
  const t = animated ? time : 0, u = T / 16;
  const inView = (x: number, y: number, m: number) => x > v.x0 * T - m && x < (v.x1 + 1) * T + m && y > v.y0 * T - m && y < (v.y1 + 1) * T + m;
  ctx.globalCompositeOperation = "lighter";

  // diagonal shafts of sun through gaps in the canopy
  for (let i = 0; i < 5; i++) {
    const sx = (2.5 + i * 4.4 + r01(i, 1) * 1.5) * T, w0 = T * (0.35 + r01(i, 2) * 0.35), w1 = w0 * 2.6, len = 11.5 * T;
    const a = 0.06 + 0.025 * Math.sin(t * 0.35 + i * 1.9);
    const grd = ctx.createLinearGradient(0, 0.9 * T, 0, len);
    grd.addColorStop(0, `rgba(255,240,170,${a})`); grd.addColorStop(0.75, `rgba(230,240,160,${a * 0.5})`); grd.addColorStop(1, "rgba(230,240,160,0)");
    ctx.fillStyle = grd; ctx.beginPath();
    ctx.moveTo(sx - w0, 0.9 * T); ctx.lineTo(sx + w0, 0.9 * T); ctx.lineTo(sx + w1 - 3 * T, len); ctx.lineTo(sx - w1 - 3 * T, len); ctx.closePath(); ctx.fill();
  }
  // dappled light patches on the floor, breathing as the canopy moves
  for (let i = 0; i < 16; i++) {
    const x = (r01(i, 10) * W) * T + Math.sin(t * 0.3 + i) * u * 3, y = (4.4 + r01(i, 11) * 7.4) * T;
    if (!inView(x, y, T)) continue;
    const a = 0.07 + 0.05 * Math.sin(t * 0.6 + i * 2.3);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.45);
    glow(ctx, 0, 0, T * (0.5 + r01(i, 12) * 0.5), "#fff4b8", a);
    ctx.restore();
  }
  // campfires, braziers, idol eyes and the temple door
  for (const [x, y] of PARASOLS) {
    if (IDOLS.has(`${x},${y}`)) {
      const e = 0.35 + 0.2 * Math.sin(t * 1.5 + x);
      for (const dx of [-0.19, 0.12]) glow(ctx, (x + 0.5 + dx) * T, (y + 1) * T - T * 1.38 + u * 8, T * 0.16, "#ffb040", e);
      continue;
    }
    const cx = (x + 0.5) * T, cy = (y + 1) * T - T * 0.5, f = 0.9 + 0.1 * Math.sin(t * 9) + 0.06 * Math.sin(t * 14.3);
    glow(ctx, cx, cy, T * 1.7 * f, "#ff9a3a", 0.3);
    glow(ctx, cx, cy + T * 0.1, T * 0.6, "#ffd27a", 0.35 * f);
    for (let k = 0; k < 7; k++) { // embers rising and winking out
      const p = (t * 0.5 + r01(k, x) ) % 1;
      const ex = cx + Math.sin(t * 2 + k * 1.7) * u * 3 + (r01(k, y) - 0.5) * T * 0.4, ey = cy - p * T * 1.3;
      ctx.fillStyle = `rgba(255,${170 + k * 10},80,${0.9 * (1 - p)})`; ctx.fillRect(ex, ey, u * 0.6, u * 0.6);
    }
  }
  for (const side of [-1, 1]) {
    const bx = 11 * T + side * (T * 0.62 + T * 0.55), by = 2.95 * T - u * 8.6, f = 1 + 0.15 * Math.sin(t * 10 + side);
    if (!inView(bx, by, T * 2)) continue;
    glow(ctx, bx, by, T * 1.1 * f, "#ff9a3a", 0.3);
    ctx.fillStyle = "rgba(255,140,50,.85)"; ctx.beginPath();
    ctx.moveTo(bx - u * 2, by); ctx.quadraticCurveTo(bx - u * 2, by - u * 3, bx + Math.sin(t * 8 + side) * u, by - u * 5.5 * f);
    ctx.quadraticCurveTo(bx + u * 2, by - u * 3, bx + u * 2, by); ctx.fill();
    ctx.fillStyle = "rgba(255,230,140,.9)"; ctx.fillRect(bx - u * 0.8, by - u * 2.4, u * 1.6, u * 2.2);
  }
  glow(ctx, 11 * T, 0.68 * T, T * 0.5, "#e8c060", 0.12 + 0.05 * Math.sin(t * 0.8));

  // pollen and spores drifting through the light
  for (let i = 0; i < 70; i++) {
    const x = wrap(r01(i, 20) * W * T + t * T * (0.05 + r01(i, 21) * 0.1) + Math.sin(t * 0.5 + i) * T * 0.4, W * T);
    const y = (1.6 + r01(i, 22) * 11) * T + Math.sin(t * 0.8 + i * 1.3) * T * 0.3;
    if (!inView(x, y, 0)) continue;
    const a = 0.3 + 0.35 * Math.sin(t * 2 + i * 0.9);
    if (a <= 0.05) continue;
    ctx.fillStyle = `rgba(255,248,190,${a})`; ctx.fillRect(x, y, u * 0.55, u * 0.55);
  }
  // fireflies over the riverbank
  for (let i = 0; i < 9; i++) {
    const x = (r01(i, 30) * W) * T + Math.sin(t * 0.7 + i * 2) * T * 0.5, y = (11.9 + r01(i, 31) * 1.3) * T + Math.sin(t * 1.1 + i) * T * 0.25;
    const a = Math.max(0, Math.sin(t * 1.7 + i * 2.1));
    if (a < 0.1 || !inView(x, y, T)) continue;
    glow(ctx, x, y, T * 0.18, "#d8ff70", 0.5 * a);
  }
  ctx.globalCompositeOperation = "source-over";
  // a few leaves spiralling down
  for (let i = 0; i < 6; i++) {
    const p = ((animated ? t : 3) * 0.07 + r01(i, 40)) % 1;
    const x = (r01(i, 41) * W) * T + Math.sin(p * 12 + i) * T * 0.4, y = (1 + p * 11) * T;
    if (!inView(x, y, T)) continue;
    leaf(ctx, x, y, u * 2.2, u, Math.sin(p * 16 + i) * 1.2, i % 2 ? "#a88a3a" : "#6f9a36");
  }
}

export const jungle: Theme = {
  id: "jungle",
  label: "Jungle temple",
  blurb: "Ruins and rivers",
  place: "at a temple deep in the jungle",
  stageBg: "#0f2a1a",
  swatch: ["#4f8a3a", "#2f5a44"],
  lines: { barrier: "The river’s too fast (and something’s in it)", blocked: "Too overgrown to get through" },
  tile: jungleTile,
  extras: jungleExtras,
  live: river,
  tall(ctx, T, x, y, time) { tree(ctx, T, x, y, time); },
  small(ctx, T, x, y, time) { if (IDOLS.has(`${x},${y}`)) idol(ctx, T, x, y); else campfire(ctx, T, x, y, time); },
  sign,
  grade(ctx, T, v) {
    const L = v.x0 * T, R = (v.x1 + 1) * T, top = v.y0 * T, bot = (v.y1 + 1) * T;
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#e4efcf"; ctx.fillRect(L, top, R - L, bot - top); // warm green, barely darker
    ctx.globalCompositeOperation = "source-over";
    const sh = ctx.createLinearGradient(0, 0, 0, 5 * T);
    sh.addColorStop(0, "rgba(6,22,10,.28)"); sh.addColorStop(1, "rgba(6,22,10,0)");
    ctx.fillStyle = sh; ctx.fillRect(L, 0, R - L, 5 * T);
    ctx.fillStyle = rgba("#0e3020", 0.12); ctx.fillRect(L, 13 * T, R - L, 5 * T); // the river sits in shade
    ctx.restore();
  },
  lights,
};
