// Neon city: a rainy megacity at midnight. The palms become neon sign pylons, the
// parasols become vending machines, the sea becomes a four-lane road of light.
// Ground and traffic live in neon-ground.ts; props, light and weather are here.
import type { Stop } from "../../content/types";
import { PALMS, PARASOLS, W, hash } from "../map";
import { ellipse, glow, mix, perWidth, rgba, shadow, wrap, type Ctx } from "./kit";
import {
  AMBER, ANTENNAS, BB_Y0, BB_Y1, BILLBOARDS, CYAN, LANTERNS, LIME, MAG, RED, SHOPS, VENTS, VIOLET,
  forCars, glyph, glyphPath, neonExtras, neonLive, neonTile,
} from "./neon-ground";
import type { Theme } from "./types";

const PYLON_COLORS = [MAG, CYAN, AMBER, VIOLET, LIME];
const pylonColor = (x: number, y: number) => PYLON_COLORS[(x * 3 + y) % PYLON_COLORS.length];
const VEND = [
  { body: "#dfe3ea", side: "#a9aebb", head: CYAN },
  { body: "#c4312d", side: "#8a1f1d", head: AMBER },
  { body: "#2f5ed0", side: "#1f3f91", head: MAG },
  { body: "#e8e3d2", side: "#b3ad98", head: LIME },
];
const vendOf = (x: number, y: number) => VEND[(x + y * 2) % VEND.length];

/** Glyph cell i of pylon (x,y) buzzing off? Occasional, and always on in a still frame. */
function flickerOff(x: number, y: number, i: number, time: number, animated: boolean) {
  if (!animated) return false;
  const seg = Math.floor(time * 11);
  return hash(seg, x * 31 + y * 7 + i, 5) < 0.07 || (i === 0 && hash(Math.floor(time * 2.3), x, 6) < 0.18 && wrap(time * 23, 1) < 0.5);
}

/* ---------- tall: neon sign pylon ---------- */
function pylon(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const u = T / 16, cx = x * T + T / 2, by = (y + 1) * T, c = pylonColor(x, y);
  const animated = time !== 0, top = by - T * 2.6, bot = by - T * 0.74, bw = T * 0.66;
  shadow(ctx, cx, by - T * 0.14, T * 0.42, T * 0.14, 0.35);
  // footing and pole
  ctx.fillStyle = "#3a3c48"; ctx.fillRect(cx - T * 0.24, by - T * 0.26, T * 0.48, T * 0.14);
  ctx.fillStyle = "#23242e"; ctx.fillRect(cx - T * 0.24, by - T * 0.14, T * 0.48, u);
  ctx.fillStyle = "#1a1b24"; ctx.fillRect(cx - u * 1.1, bot, u * 2.2, by - T * 0.26 - bot);
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(cx - u * 1.1, bot, u * 0.5, by - T * 0.26 - bot);
  ctx.fillStyle = "#101119"; ctx.fillRect(cx + u * 1.1, bot + u * 2, u * 0.4, T * 0.4); // conduit
  // antenna and cap
  ctx.fillStyle = "#1a1b24"; ctx.fillRect(cx + bw * 0.25, top - T * 0.2, u * 0.5, T * 0.22);
  ctx.fillStyle = "#23222e"; ctx.fillRect(cx - bw / 2 - u * 0.5, top - u * 1.2, bw + u, u * 1.4);
  // casing
  ctx.fillStyle = "#0e0c16"; ctx.fillRect(cx - bw / 2, top, bw, bot - top);
  ctx.fillStyle = "#24212f"; ctx.fillRect(cx + bw / 2 - u * 0.9, top, u * 0.9, bot - top);
  const inner = ctx.createLinearGradient(0, top, 0, bot);
  inner.addColorStop(0, mix("#0e0c16", c, 0.22)); inner.addColorStop(1, mix("#0e0c16", c, 0.08));
  ctx.fillStyle = inner; ctx.fillRect(cx - bw / 2 + u * 1.2, top + u * 1.2, bw - u * 2.6, bot - top - u * 2.4);
  // side blade on alternate pylons, for a different silhouette
  if ((x + y) % 2) {
    const sx = cx - bw / 2 - T * 0.24, sy = top + T * 0.3;
    ctx.fillStyle = "#0e0c16"; ctx.fillRect(sx, sy, T * 0.24, T * 0.62);
    ctx.strokeStyle = mix(c, "#fff", 0.2); ctx.lineWidth = u * 0.5; ctx.strokeRect(sx + u * 0.6, sy + u * 0.6, T * 0.24 - u * 1.2, T * 0.62 - u * 1.2);
    for (let i = 0; i < 2; i++) glyph(ctx, sx + T * 0.12, sy + T * (0.17 + i * 0.28), u * 1.8, x * 11 + i + 50, PYLON_COLORS[(x + 2) % 5], u * 0.45);
  }
  // neon tube border: coloured tube with a hot white core
  const buzz = animated && hash(Math.floor(time * 7), x, 9) < 0.06;
  ctx.strokeStyle = buzz ? mix(c, "#000", 0.5) : c; ctx.lineWidth = u * 1.1;
  ctx.beginPath(); ctx.roundRect(cx - bw / 2 + u * 1.6, top + u * 1.6, bw - u * 3.4, bot - top - u * 3.2, u * 1.5); ctx.stroke();
  ctx.strokeStyle = buzz ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.75)"; ctx.lineWidth = u * 0.35; ctx.stroke();
  // four stacked glyphs
  const cell = (bot - top - u * 5) / 4, gs = Math.min(bw * 0.52, cell * 0.66);
  for (let i = 0; i < 4; i++) {
    const off = flickerOff(x, y, i, time, animated);
    const gc = off ? mix(c, "#000", 0.65) : mix(c, "#ffffff", 0.5);
    glyph(ctx, cx - u * 0.3, top + u * 2.5 + cell * (i + 0.5), gs, x * 100 + y * 10 + i, gc, u * 1.1);
  }
  // rain beading on the casing
  ctx.fillStyle = "rgba(200,220,255,.25)";
  for (let i = 0; i < 4; i++) ctx.fillRect(cx - bw / 2 + hash(x, i, 13) * bw, top + hash(x, i, 14) * (bot - top), u * 0.4, u * 1.2);
}

/* ---------- small: vending machine ---------- */
function vending(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const u = T / 16, cx = x * T + T / 2, by = (y + 1) * T, st = vendOf(x, y);
  const w = T * 0.74, h = T * 1.46, x0 = cx - w / 2, base = by - T * 0.12, top = base - h, d = u * 1.6;
  shadow(ctx, cx + u, base, T * 0.46, T * 0.14, 0.4);
  // body, with a side face for depth
  ctx.fillStyle = st.side; ctx.fillRect(x0 + w, top + d * 0.6, d, h - d * 0.6);
  ctx.fillStyle = st.body; ctx.fillRect(x0, top, w, h);
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x0, top, u * 0.6, h);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x0, base - u * 1.2, w + d, u * 1.2);
  // lit header
  const flick = time !== 0 && hash(Math.floor(time * 9), x, 21) < 0.05;
  ctx.fillStyle = flick ? mix(st.head, "#000", 0.5) : st.head; ctx.fillRect(x0 + u, top + u, w - u * 2, T * 0.17);
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x0 + u, top + u, w - u * 2, u * 0.5);
  for (let i = 0; i < 3; i++) glyph(ctx, x0 + w * (0.25 + i * 0.25), top + u + T * 0.085, u * 1.6, x * 7 + y + i, "rgba(20,10,30,.8)", u * 0.45);
  // display window: backlit rows of cans and bottles with price lights
  const wx = x0 + u * 1.2, wy = top + T * 0.25, ww = w * 0.66, wh = T * 0.72;
  const bl = ctx.createLinearGradient(0, wy, 0, wy + wh);
  bl.addColorStop(0, "#f4fbff"); bl.addColorStop(1, "#b9d6e8");
  ctx.fillStyle = bl; ctx.fillRect(wx, wy, ww, wh);
  const rows = 3, per = 4, rh = wh / rows, cw = ww / per;
  const CANS = ["#2f6fd8", "#e2453a", "#f2b632", "#39b36b", "#8a4fd8", "#ededed", "#20242c", "#ff7ab8"];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < per; i++) {
      const col = CANS[Math.floor(hash(x * 13 + i, y * 7 + r, 23) * CANS.length)];
      const bx = wx + cw * i + cw * 0.22, bh = rh * (hash(i, r, x) > 0.5 ? 0.62 : 0.5);
      ctx.fillStyle = col; ctx.fillRect(bx, wy + rh * (r + 0.72) - bh, cw * 0.56, bh);
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(bx + u * 0.3, wy + rh * (r + 0.72) - bh + u * 0.4, u * 0.5, bh - u);
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(bx, wy + rh * (r + 0.72) - bh, cw * 0.56, u * 0.6);
    }
    ctx.fillStyle = "#1a1d28"; ctx.fillRect(wx, wy + rh * (r + 0.74), ww, rh * 0.26);
    for (let i = 0; i < per; i++) { ctx.fillStyle = hash(i, r, x + 40) > 0.25 ? "#5dff8a" : "#ff4d4d"; ctx.fillRect(wx + cw * (i + 0.4), wy + rh * (r + 0.83), cw * 0.2, rh * 0.09); }
  }
  ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = u * 0.4; ctx.strokeRect(wx, wy, ww, wh);
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath(); ctx.moveTo(wx + ww * 0.55, wy); ctx.lineTo(wx + ww * 0.75, wy); ctx.lineTo(wx + ww * 0.3, wy + wh); ctx.lineTo(wx + ww * 0.1, wy + wh); ctx.closePath(); ctx.fill();
  // control strip: coin slot, note slot, readout
  const px0 = wx + ww + u * 0.8, pw = x0 + w - u - px0;
  ctx.fillStyle = "#2a2d38"; ctx.fillRect(px0, wy, pw, wh);
  ctx.fillStyle = "#081a10"; ctx.fillRect(px0 + u * 0.4, wy + u, pw - u * 0.8, u * 2);
  ctx.fillStyle = "#6dff9a"; ctx.fillRect(px0 + u * 0.8, wy + u * 1.5, pw - u * 1.6, u * 0.8);
  ctx.fillStyle = "#b9bdc9"; ctx.fillRect(px0 + pw / 2 - u * 0.25, wy + u * 4.5, u * 0.5, u * 2);
  ctx.fillStyle = "#0b0c10"; ctx.fillRect(px0 + u * 0.5, wy + u * 8, pw - u, u * 0.8);
  // dispenser flap
  ctx.fillStyle = "#15171f"; ctx.fillRect(x0 + u * 1.5, base - T * 0.3, w - u * 3, T * 0.16);
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x0 + u * 1.5, base - T * 0.3, w - u * 3, u * 0.5);
  ctx.fillStyle = rgba("#000000", 0.15); ctx.fillRect(x0 + w * 0.15, base - T * 0.1, w * 0.7, u * 0.6);
}

/* ---------- sign: holo panel ---------- */
const SIGN_SPOTS = new Map<string, [number, number]>();
function holoSign(ctx: Ctx, T: number, s: Stop) {
  SIGN_SPOTS.set(s.id, [s.x, s.y]);
  const u = T / 16, px = s.x * T, by = (s.y + 1) * T;
  shadow(ctx, px + T / 2, by - T * 0.12, T * 0.36, T * 0.12, 0.35);
  ctx.fillStyle = "#3a3c48"; ctx.fillRect(px + T * 0.3, by - T * 0.2, T * 0.4, T * 0.1);
  ctx.fillStyle = "#1b1c25"; ctx.fillRect(px + T * 0.46, by - T * 0.7, T * 0.08, T * 0.52);
  const x0 = px + T * 0.0, y0 = by - T * 1.34, w = T, h = T * 0.62;
  ctx.fillStyle = "#07091a"; ctx.fillRect(x0, y0, w, h);
  const grd = ctx.createLinearGradient(0, y0, 0, y0 + h);
  grd.addColorStop(0, "rgba(53,232,255,.2)"); grd.addColorStop(1, "rgba(255,63,180,.12)");
  ctx.fillStyle = grd; ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = "rgba(140,240,255,.07)";
  for (let yy = y0 + 2; yy < y0 + h; yy += 3) ctx.fillRect(x0, yy, w, 1);
  ctx.strokeStyle = CYAN; ctx.lineWidth = u * 0.9; ctx.strokeRect(x0 + u * 0.5, y0 + u * 0.5, w - u, h - u);
  ctx.fillStyle = MAG; // corner brackets
  for (const [bx, byy] of [[x0, y0], [x0 + w - u * 2.4, y0], [x0, y0 + h - u * 0.8], [x0 + w - u * 2.4, y0 + h - u * 0.8]]) ctx.fillRect(bx, byy, u * 2.4, u * 0.8);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(T * 0.25)}px "Pixelify Sans", monospace`;
  ctx.fillStyle = "rgba(53,232,255,.45)"; ctx.fillText(s.label ?? "", px + T / 2 + 1, y0 + h / 2 + 1);
  ctx.fillStyle = "#f2fdff"; ctx.fillText(s.label ?? "", px + T / 2, y0 + h / 2);
}

export const neon: Theme = {
  id: "neon",
  label: "Neon city",
  blurb: "Rain, neon, midnight",
  place: "in a neon city at midnight",
  stageBg: "#07061a",
  swatch: ["#ff3fb4", "#0b0a1f"],
  lines: { barrier: "Traffic’s too fast", blocked: "That’s a wall of neon" },
  tile: neonTile,
  extras: neonExtras,
  live: neonLive,
  tall: (ctx, T, x, y, time) => pylon(ctx, T, x, y, time),
  small: (ctx, T, x, y, time) => vending(ctx, T, x, y, time),
  sign: holoSign,

  grade(ctx, _T, v) {
    ctx.fillStyle = "rgba(14,6,40,.24)"; ctx.fillRect(v.cx, v.cy, v.vw, v.vh);
  },

  lights(ctx, T, time, animated, v) {
    const t = animated ? time : 0, u = T / 16;
    const inX = (a: number, b: number) => b >= v.x0 - 2 && a <= v.x1 + 2;
    const inY = (a: number, b: number) => b >= v.y0 - 2 && a <= v.y1 + 2;
    ctx.globalCompositeOperation = "lighter";

    if (inY(0, 3)) {
      // aircraft warning lights on the towers
      for (let i = 0; i < ANTENNAS.length; i++) {
        const [ax, ay] = ANTENNAS[i];
        if (!inX(ax, ax)) continue;
        const on = !animated || wrap(t * 0.8 + i * 0.37, 1) < 0.45;
        if (on) { glow(ctx, ax * T, ay * T, u * 3, RED, 0.9); ctx.fillStyle = "#ffb0a0"; ctx.fillRect(ax * T - 1, ay * T - 1, 2, 2); }
      }
      // expressway traffic high on the megastructure
      for (let i = 0; i < perWidth(12); i++) {
        const dir = i % 2 ? 1 : -1, span = W + 8;
        const x = wrap(hash(i, 0, 401) * span + dir * t * (4 + hash(i, 1, 401) * 3), span) - 4;
        if (!inX(x, x + 1)) continue;
        const yy = T * (dir > 0 ? 1.1 : 1.16), col = dir > 0 ? "#ffe9c0" : "#ff4040";
        const grd = ctx.createLinearGradient(x * T, 0, (x + dir * -0.9) * T, 0);
        grd.addColorStop(0, rgba(col, 0.9)); grd.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = grd; ctx.fillRect(Math.min(x, x - dir * 0.9) * T, yy, 0.9 * T, u * 0.7);
      }
      // billboards bathe the wall
      BILLBOARDS.forEach((b, i) => {
        if (!inX(b.x, b.x + b.w)) return;
        const pulse = animated ? 0.85 + 0.15 * Math.sin(t * 1.3 + i * 1.7) : 1;
        const cx = (b.x + b.w / 2) * T, cy = ((BB_Y0 + BB_Y1) / 2) * T;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.55);
        glow(ctx, 0, 0, b.w * T * 0.75, b.c, 0.22 * pulse); ctx.restore();
        ctx.fillStyle = rgba(b.c, 0.18 * pulse); ctx.fillRect(b.x * T, BB_Y0 * T, b.w * T, (BB_Y1 - BB_Y0) * T);
      });
      // shop spill and lanterns
      for (const s of SHOPS) {
        if (!inX(s.x, s.x + s.w) || s.kind === "shutter") continue;
        ctx.fillStyle = rgba(s.c, 0.14); ctx.fillRect(s.x * T + u, 2.22 * T, s.w * T - u * 2.6, u * 0.8);
        const warm = s.kind === "arcade" ? s.c : "#ffc27a";
        ctx.save(); ctx.translate((s.x + s.w / 2) * T, 2.97 * T); ctx.scale(s.w * 0.55, 0.75);
        glow(ctx, 0, 0, T, warm, 0.2); ctx.restore();
      }
      for (const [lx, seed] of LANTERNS) {
        if (!inX(lx, lx)) continue;
        const f = animated ? 0.8 + 0.2 * Math.sin(t * 5 + seed * 2.1) * Math.sin(t * 1.3 + seed) : 1;
        glow(ctx, lx * T, 2.42 * T, u * 5.5, RED, 0.5 * f); glow(ctx, lx * T, 2.42 * T, u * 2, AMBER, 0.35 * f);
      }
      // LED strips on the walkway: a pulse running each way
      const mw = (v.x1 + 3) * T, mx0 = Math.max(0, v.x0 - 2) * T;
      ctx.fillStyle = rgba(CYAN, 0.35); ctx.fillRect(mx0, 3 * T + u * 0.8, mw - mx0, u * 0.7);
      ctx.fillStyle = rgba(MAG, 0.35); ctx.fillRect(mx0, 4 * T - u * 1.4, mw - mx0, u * 0.7);
      for (let k = 0; k < 2; k++) {
        const p1 = wrap(t * 5.5 + k * 11, W + 4) - 2, p2 = W + 2 - wrap(t * 4.2 + k * 13, W + 4);
        for (const [p, yy, col, dir] of [[p1, 3 * T + u * 0.8, CYAN, 1], [p2, 4 * T - u * 1.4, MAG, -1]] as [number, number, string, number][]) {
          const grd = ctx.createLinearGradient(p * T, 0, (p - dir * 2.5) * T, 0);
          grd.addColorStop(0, rgba("#ffffff", 0.95)); grd.addColorStop(0.15, rgba(col, 0.9)); grd.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = grd; ctx.fillRect(Math.min(p, p - dir * 2.5) * T, yy - u * 0.4, 2.5 * T, u * 1.5);
          glow(ctx, p * T, yy, u * 4, col, 0.35);
        }
      }
    }

    // pylon halos and hot glyphs
    PALMS.forEach(([x, y]) => {
      if (!inX(x, x + 1) || !inY(y - 3, y + 1)) return;
      const c = pylonColor(x, y), cx = x * T + T / 2, top = (y + 1) * T - T * 2.6, bot = (y + 1) * T - T * 0.74;
      const buzz = animated && hash(Math.floor(t * 7), x, 9) < 0.06;
      ctx.save(); ctx.translate(cx, (top + bot) / 2); ctx.scale(0.7, 1);
      glow(ctx, 0, 0, T * 1.35, c, buzz ? 0.08 : 0.3); ctx.restore();
      const bw = T * 0.66, cell = (bot - top - u * 5) / 4, gs = Math.min(bw * 0.52, cell * 0.66);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) if (!flickerOff(x, y, i, t, animated)) glyphPath(ctx, cx - u * 0.3, top + u * 2.5 + cell * (i + 0.5), gs, x * 100 + y * 10 + i);
      ctx.strokeStyle = rgba(c, 0.55); ctx.lineWidth = u * 1.1; ctx.lineCap = "square"; ctx.stroke();
      if (!buzz) { ctx.strokeStyle = rgba(c, 0.45); ctx.lineWidth = u * 1.1; ctx.beginPath(); ctx.roundRect(cx - bw / 2 + u * 1.6, top + u * 1.6, bw - u * 3.4, bot - top - u * 3.2, u * 1.5); ctx.stroke(); }
      glow(ctx, cx + T * 0.2, top - T * 0.2, u * 2.2, RED, animated && wrap(t * 0.7 + x * 0.3, 1) > 0.5 ? 0 : 0.8);
      // colour spill on the wet ground at its foot
      ctx.save(); ctx.translate(cx, (y + 1) * T - T * 0.1); ctx.scale(1, 0.3); glow(ctx, 0, 0, T * 0.9, c, 0.22); ctx.restore();
    });

    // vending machines: panel glow and a pool of light in front
    PARASOLS.forEach(([x, y]) => {
      if (!inX(x, x + 1) || !inY(y - 2, y + 1)) return;
      const st = vendOf(x, y), cx = x * T + T / 2, by = (y + 1) * T;
      ctx.save(); ctx.translate(cx, by + T * 0.08); ctx.scale(1, 0.32); glow(ctx, 0, 0, T * 1.05, "#bfe8ff", 0.3); ctx.restore();
      ctx.fillStyle = "rgba(210,240,255,.22)"; ctx.fillRect(cx - T * 0.37 + u * 1.2, by - T * 0.12 - T * 1.46 + T * 0.25, T * 0.49, T * 0.72);
      glow(ctx, cx, by - T * 1.5, T * 0.45, st.head, 0.28);
    });

    // holo signs
    for (const [sx, sy] of SIGN_SPOTS.values()) {
      if (!inX(sx, sx + 1) || !inY(sy - 2, sy + 1)) continue;
      const f = animated ? 0.85 + 0.15 * Math.sin(t * 3 + sx) : 1;
      const y0 = (sy + 1) * T - T * 1.34;
      ctx.strokeStyle = rgba(CYAN, 0.5 * f); ctx.lineWidth = u * 0.9; ctx.strokeRect(sx * T + u * 0.5, y0 + u * 0.5, T - u, T * 0.62 - u);
      ctx.save(); ctx.translate(sx * T + T / 2, y0 + T * 0.31); ctx.scale(1, 0.6); glow(ctx, 0, 0, T * 0.95, CYAN, 0.16 * f); ctx.restore();
      // a flicker of scan light rolling down the panel
      if (animated) { ctx.fillStyle = rgba(CYAN, 0.18); ctx.fillRect(sx * T, y0 + wrap(t * 0.6 + sx, 1) * T * 0.6, T, u * 0.6); }
    }

    if (inY(11, 13)) {
      // kerb underglow breathing
      const a = animated ? 0.35 + 0.15 * Math.sin(t * 1.6) : 0.45;
      const x0 = Math.max(0, v.x0 - 1) * T, x1 = (v.x1 + 2) * T;
      ctx.fillStyle = rgba(CYAN, a); ctx.fillRect(x0, 12.88 * T, x1 - x0, u * 0.7);
      const grd = ctx.createLinearGradient(0, 12.9 * T, 0, 13.35 * T);
      grd.addColorStop(0, rgba(CYAN, a * 0.45)); grd.addColorStop(1, rgba(CYAN, 0));
      ctx.fillStyle = grd; ctx.fillRect(x0, 12.9 * T, x1 - x0, 0.45 * T);
    }

    // traffic light: headlight beams forward, tail light streaks behind
    if (v.y1 >= 13) forCars(t, c => {
      if (!inX(c.x - 3, c.x + c.len + 3)) return;
      const L = c.len * T, cy = c.y * T, hw = T * 0.25;
      const front = c.dir > 0 ? c.x * T + L : c.x * T, back = c.dir > 0 ? c.x * T : c.x * T + L;
      const beam = T * 1.6, bx1 = front + c.dir * beam;
      const bg = ctx.createLinearGradient(front, 0, bx1, 0);
      bg.addColorStop(0, "rgba(255,244,210,.45)"); bg.addColorStop(1, "rgba(255,244,210,0)");
      ctx.fillStyle = bg; ctx.beginPath();
      ctx.moveTo(front, cy - hw * 0.8); ctx.lineTo(bx1, cy - hw * 1.5); ctx.lineTo(bx1, cy + hw * 1.5); ctx.lineTo(front, cy + hw * 0.8); ctx.closePath(); ctx.fill();
      const trail = T * (1.4 + c.v * 0.16) * (animated ? 1 : 0.6), tx1 = back - c.dir * trail;
      const tg = ctx.createLinearGradient(back, 0, tx1, 0);
      tg.addColorStop(0, "rgba(255,40,40,.85)"); tg.addColorStop(1, "rgba(255,40,40,0)");
      ctx.fillStyle = tg;
      ctx.fillRect(Math.min(back, tx1), cy - hw + u * 0.3, trail, u * 1.3); ctx.fillRect(Math.min(back, tx1), cy + hw - u * 1.6, trail, u * 1.3);
      glow(ctx, front, cy, u * 4, "#fff2cc", 0.5); glow(ctx, back, cy, u * 3.5, RED, 0.45);
      if (c.under) { ctx.save(); ctx.translate(c.x * T + L / 2, cy + u); ctx.scale(1, 0.35); glow(ctx, 0, 0, L * 0.8, c.under, 0.4); ctx.restore(); }
    });

    // steam from the street vents (a soft cloud, not added light)
    ctx.globalCompositeOperation = "source-over";
    if (inY(1, 3)) for (const vx of VENTS) {
      if (!inX(vx, vx)) continue;
      for (let i = 0; i < 6; i++) {
        const ph = wrap((animated ? t * 0.35 : 0.2) + i / 6, 1);
        const sx = vx * T + Math.sin(ph * 5 + i) * u * 3 + ph * u * 6, sy = 2.9 * T - ph * T * 1.15;
        ellipse(ctx, sx, sy, u * (1.5 + ph * 6), u * (1.2 + ph * 4), `rgba(210,205,235,${0.16 * (1 - ph) * Math.min(1, ph * 6)})`);
      }
    }
  },

  screen(ctx, vw, vh, time, animated) {
    const t = animated ? time : 0;
    // two layers of slanted rain, one stroke each
    for (const [n, len, a, lw, speed] of [[110, 12, 0.14, 1, 520], [60, 22, 0.24, 1.4, 820]] as const) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sp = speed * (0.8 + hash(i, len, 501) * 0.4);
        const y = wrap(hash(i, len, 502) * (vh + 80) + t * sp, vh + 80) - 40;
        const x = wrap(hash(i, len, 503) * (vw + 120) - t * sp * 0.28 - y * 0.28, vw + 120) - 60;
        ctx.moveTo(x, y); ctx.lineTo(x - len * 0.28, y + len);
      }
      ctx.strokeStyle = `rgba(190,215,255,${animated ? a : a * 0.6})`; ctx.lineWidth = lw; ctx.stroke();
    }
  },
};
