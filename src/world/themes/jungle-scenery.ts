// Jungle temple, the static half: ground tiles and everything bigger than a tile
// (the canopy wall, the carved ruin wall, the stepped temple, the slab trail, the
// floor litter and the riverbank). Painted once into the layer; jungle.ts moves.
import stopsData from "../../content/stops.json";
import { Ground, PALMS, PARASOLS, PLAYER_START, W, hash } from "../map";
import { blocks, rgb, vnoise, type Ctx } from "./kit";

export type C3 = [number, number, number];
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp3 = (a: C3, b: C3, t: number): C3 => {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
export const css = (c: C3, a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const TAU = Math.PI * 2;

export const PAL = {
  canopyDeep: rgb("#0b2213"), canopyDark: rgb("#163b1f"), leaf1: rgb("#1f4d25"), leaf2: rgb("#2f6b2c"),
  leaf3: rgb("#4a8f37"), leaf4: rgb("#86c253"),
  stoneDark: rgb("#4a4a3c"), stone: rgb("#7b7a64"), stoneLite: rgb("#a3a185"), stoneWarm: rgb("#948a6c"),
  tStone: rgb("#b0a47f"), tLite: rgb("#d2c79e"), tDark: rgb("#6a624b"),
  moss: rgb("#5b8a2f"), mossLite: rgb("#86b045"),
  floorA: rgb("#2f5a26"), floorB: rgb("#4c7d31"), floorC: rgb("#6a8a38"), soil: rgb("#5a4a2b"),
  mudA: rgb("#6e5634"), mudB: rgb("#4a3a23"), earth: rgb("#3a3322"),
};

/* ---------- small drawing helpers ---------- */
/** A leaf growing from (x,y) toward angle `ang`. */
export function leaf(g: Ctx, x: number, y: number, len: number, wid: number, ang: number, fill: string, rib?: string) {
  const c = Math.cos(ang), s = Math.sin(ang);
  g.fillStyle = fill; g.beginPath();
  g.ellipse(x + (c * len) / 2, y + (s * len) / 2, Math.max(0.1, len / 2), Math.max(0.1, wid / 2), ang, 0, TAU); g.fill();
  if (rib) {
    g.strokeStyle = rib; g.lineWidth = Math.max(0.5, wid * 0.14);
    g.beginPath(); g.moveTo(x + c * len * 0.1, y + s * len * 0.1); g.lineTo(x + c * len * 0.85, y + s * len * 0.85); g.stroke();
  }
}
function blob(g: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
  g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); g.fill();
}
/** A round clump of foliage, shaded from the upper left. */
export function clump(g: Ctx, cx: number, cy: number, r: number, seed: number, shade: [string, string, string, string]) {
  blob(g, cx, cy, r, r * 0.8, shade[0]);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + hash(seed, k, 1) * 0.6;
    leaf(g, cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.3, r * (0.75 + hash(seed, k, 2) * 0.35), r * 0.36, a, k % 3 ? shade[0] : shade[1]);
  }
  blob(g, cx - r * 0.18, cy - r * 0.2, r * 0.66, r * 0.5, shade[1]);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (1.0 + (k / 5) * 0.9) + hash(seed, k, 3) * 0.3;
    leaf(g, cx - r * 0.2, cy - r * 0.2, r * (0.55 + hash(seed, k, 4) * 0.25), r * 0.26, a, shade[2]);
  }
  for (let k = 0; k < 3; k++)
    blob(g, cx - r * (0.1 + hash(seed, k, 5) * 0.45), cy - r * (0.2 + hash(seed, k, 6) * 0.35), r * 0.12, r * 0.07, shade[3]);
}
/** A fern: fronds fanning up from a base. */
function fern(g: Ctx, x: number, y: number, s: number, seed: number) {
  const dark = css(PAL.leaf1), mid = css(PAL.leaf2), lite = css(PAL.leaf3);
  for (let f = 0; f < 5; f++) {
    const a = -Math.PI / 2 + (f - 2) * 0.55 + (hash(seed, f, 1) - 0.5) * 0.2, len = s * (0.7 + (f === 2 ? 0.3 : hash(seed, f, 2) * 0.2));
    const c = Math.cos(a), si = Math.sin(a);
    g.strokeStyle = dark; g.lineWidth = Math.max(0.6, s * 0.05);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + c * len, y + si * len); g.stroke();
    for (let p = 1; p <= 5; p++) {
      const t = p / 6, px = x + c * len * t, py = y + si * len * t, pl = s * 0.28 * (1 - t * 0.6);
      leaf(g, px, py, pl, pl * 0.4, a - 0.9, p % 2 ? mid : lite);
      leaf(g, px, py, pl, pl * 0.4, a + 0.9, p % 2 ? lite : mid);
    }
  }
}

/* ---------- where decor must not sit ---------- */
const occupied = new Set<string>([
  ...PALMS.map(([x, y]) => `${x},${y}`), ...PARASOLS.map(([x, y]) => `${x},${y}`),
  ...(stopsData as { x: number; y: number }[]).map(s => `${s.x},${s.y}`), `${PLAYER_START[0]},${PLAYER_START[1]}`,
]);
const free = (fx: number, fy: number) => !occupied.has(`${Math.floor(fx)},${Math.floor(fy)}`);

/* ---------- the ground tiles ---------- */
export function jungleTile(g: Ctx, t: Ground, x: number, y: number, T: number) {
  const px = x * T, py = y * T, u = T / 16;
  switch (t) {
    case Ground.Town:
      blocks(g, x, y, T, 4, (fx, fy) => css(lerp3(PAL.canopyDeep, PAL.canopyDark, vnoise(fx, fy, 1.1, 3) * 0.9 + fy * 0.2)));
      return;
    case Ground.Cliff:
      blocks(g, x, y, T, 4, (fx, fy) => css(lerp3(PAL.stoneDark, PAL.earth, vnoise(fx, fy, 1.4, 4))));
      return;
    case Ground.Board:
      blocks(g, x, y, T, 4, (fx, fy) => css(lerp3(PAL.earth, rgb("#3e4a2a"), vnoise(fx, fy, 0.9, 5))));
      return;
    case Ground.Sand: {
      blocks(g, x, y, T, 8, (fx, fy) => {
        const m = vnoise(fx, fy, 2.3, 1), d = vnoise(fx, fy, 1.1, 2), l = vnoise(fx, fy, 3.5, 7);
        let c = lerp3(PAL.floorA, PAL.floorB, m * 1.1 - 0.05);
        c = lerp3(c, PAL.floorC, (l - 0.62) * 1.6);
        c = lerp3(c, PAL.soil, Math.min(0.26, (d - 0.64) * 1.0));
        return css(lerp3(c, PAL.canopyDark, (5.2 - fy) * 0.35)); // shade under the canopy wall
      });
      for (let i = 0; i < 7; i++) {
        const sx = px + hash(x, y, i + 20) * (T - u * 2), sy = py + hash(x, y, i + 40) * (T - u * 2), k = hash(x, y, i);
        if (k < 0.45) { // a grass tuft
          g.fillStyle = k < 0.22 ? "rgba(140,190,80,.55)" : "rgba(25,55,20,.45)";
          g.fillRect(sx, sy, u * 0.5, u * 1.6); g.fillRect(sx + u * 0.8, sy + u * 0.4, u * 0.5, u * 1.2); g.fillRect(sx - u * 0.7, sy + u * 0.6, u * 0.5, u);
        } else if (k < 0.75) { g.fillStyle = "rgba(60,40,20,.35)"; g.fillRect(sx, sy, u, u * 0.7); }
        else { g.fillStyle = "rgba(180,210,120,.28)"; g.fillRect(sx, sy, u * 0.7, u * 0.7); }
      }
      return;
    }
    case Ground.Wet:
      blocks(g, x, y, T, 5, (fx, fy) => {
        const n = vnoise(fx, fy, 1.2, 8);
        return css(lerp3(lerp3(PAL.mudA, PAL.mudB, n * 0.9), rgb("#3a3a26"), (fy - 12.5) * 1.2));
      });
      for (let i = 0; i < 4; i++) {
        g.fillStyle = hash(x, y, i) > 0.5 ? "rgba(30,20,10,.3)" : "rgba(200,180,130,.25)";
        g.fillRect(px + hash(x, y, i + 20) * (T - u), py + hash(x, y, i + 40) * (T - u), u, u * 0.7);
      }
      return;
    case Ground.Sea:
      g.fillStyle = "#2c5642"; g.fillRect(px, py, T, T);
      return;
  }
}

/* ---------- extras: everything that crosses tiles ---------- */
export function jungleExtras(g: Ctx, T: number) {
  floor(g, T);
  bank(g, T);
  trail(g, T);
  wall(g, T);
  canopy(g, T);
  temple(g, T);
  vines(g, T);
  wallFoot(g, T);
}

function clip(g: Ctx, T: number, y0: number, y1: number, draw: () => void) {
  g.save(); g.beginPath(); g.rect(0, y0 * T, W * T, (y1 - y0) * T); g.clip(); draw(); g.restore();
}

function floor(g: Ctx, T: number) {
  const u = T / 16;
  clip(g, T, 4, 12, () => {
    // exposed roots spreading from each big tree
    for (const [tx, ty] of PALMS) {
      const cx = (tx + 0.5) * T, cy = (ty + 0.85) * T;
      for (let r = 0; r < 6; r++) {
        const a = (r / 6) * TAU + hash(tx, ty, r) * 0.5, len = T * (0.9 + hash(tx, r, 3) * 0.9);
        const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.45;
        const mx = cx + Math.cos(a + 0.4) * len * 0.5, my = cy + Math.sin(a + 0.4) * len * 0.25;
        g.lineCap = "round";
        g.strokeStyle = "rgba(20,15,8,.35)"; g.lineWidth = u * 1.8;
        g.beginPath(); g.moveTo(cx, cy + u * 0.6); g.quadraticCurveTo(mx, my + u * 0.6, ex, ey + u * 0.6); g.stroke();
        g.strokeStyle = "#6e5a3e"; g.lineWidth = u * 1.3;
        g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
        g.strokeStyle = "rgba(190,170,120,.45)"; g.lineWidth = u * 0.4;
        g.beginPath(); g.moveTo(cx, cy - u * 0.4); g.quadraticCurveTo(mx, my - u * 0.4, ex, ey - u * 0.3); g.stroke();
      }
    }
    // leaf litter
    const litter = ["#7a5a2e", "#9a7a3a", "#6b7a30", "#b08a3e", "#5a4526", "#8f9a3e"];
    for (let i = 0; i < 520; i++) {
      const fx = hash(i, 1, 60) * W, fy = 4 + hash(i, 2, 60) * 8;
      if (vnoise(fx, fy, 2.2, 9) < 0.35) continue; // litter gathers in drifts
      const a = hash(i, 3, 60) * TAU, len = u * (1.6 + hash(i, 4, 60) * 1.6);
      leaf(g, fx * T, fy * T, len, len * 0.45, a, litter[Math.floor(hash(i, 5, 60) * litter.length)], "rgba(40,28,12,.35)");
    }
    // pebbles
    for (let i = 0; i < 70; i++) {
      const fx = hash(i, 1, 61) * W, fy = 4.2 + hash(i, 2, 61) * 7.6, r = u * (0.7 + hash(i, 3, 61));
      blob(g, fx * T + u * 0.3, fy * T + u * 0.4, r, r * 0.6, "rgba(20,20,10,.3)");
      blob(g, fx * T, fy * T, r, r * 0.65, css(lerp3(PAL.stone, PAL.stoneLite, hash(i, 4, 61))));
    }
    // half-buried carved stones: flat, so they still read as ground
    for (const [fx, fy, s] of [[6.3, 10.4, 1], [19.6, 7.3, 2], [14.2, 11.3, 3], [1.4, 6.6, 4]] as const) {
      const x = fx * T, y = fy * T, w = T * 0.7, h = T * 0.32;
      g.fillStyle = "rgba(15,25,10,.35)"; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.75, w * 0.6, h * 0.5, 0, 0, TAU); g.fill();
      g.fillStyle = css(PAL.stone); g.fillRect(x, y, w, h);
      g.fillStyle = css(PAL.stoneLite); g.fillRect(x, y, w, u);
      g.fillStyle = "rgba(40,40,25,.55)";
      for (let k = 0; k < 3; k++) g.fillRect(x + u * (1.5 + k * 3.5), y + u * 1.6, u * 2, u * (k === 1 ? 2 : 1));
      blob(g, x + w * (0.2 + hash(s, 0, 62) * 0.6), y + u * 0.4, w * 0.3, u * 1.2, css(PAL.moss));
    }
    // ferns and flowers, kept off every tile something stands on
    for (let i = 0; i < 60; i++) {
      const fx = hash(i, 1, 63) * W, fy = 4.6 + hash(i, 2, 63) * 7.2;
      if (!free(fx, fy) || !free(fx, fy - 0.5)) continue;
      if (hash(i, 3, 63) < 0.42) fern(g, fx * T, fy * T, T * (0.32 + hash(i, 4, 63) * 0.18), i);
      else {
        const col = hash(i, 5, 63) < 0.55 ? "#e0402f" : "#f2c23a";
        for (let k = 0; k < 3; k++) {
          const bx = fx * T + (hash(i, k, 64) - 0.5) * T * 0.4, by = fy * T + (hash(i, k, 65) - 0.5) * T * 0.25;
          g.strokeStyle = "#2a5a22"; g.lineWidth = u * 0.4; g.beginPath(); g.moveTo(bx, by + u * 2.2); g.lineTo(bx, by); g.stroke();
          leaf(g, bx, by + u * 1.8, u * 1.6, u * 0.7, -0.6, "#3f7a2c");
          for (let p = 0; p < 5; p++) blob(g, bx + Math.cos((p / 5) * TAU) * u * 0.8, by + Math.sin((p / 5) * TAU) * u * 0.8, u * 0.65, u * 0.65, col);
          blob(g, bx, by, u * 0.45, u * 0.45, "#fff0a8");
        }
      }
    }
  });
}

function bank(g: Ctx, T: number) {
  const u = T / 16;
  clip(g, T, 11.5, 13, () => {
    // grass fringe spilling over the mud, so the edge is never a ruled line
    for (const [shade, reach, salt] of [[0.15, 1.25, 70], [0.5, 0.8, 170]] as const) {
      g.fillStyle = css(lerp3(PAL.floorA, PAL.floorB, shade));
      g.beginPath(); g.moveTo(0, 12 * T);
      let x = 0, i = 0;
      while (x < W * T + u) {
        const step = u * (0.8 + hash(i, 12, salt) * 1.8), len = u * reach * (0.6 + hash(i, 13, salt) * 3 * vnoise(x / T, 12, 1.5, salt + 1));
        g.lineTo(x + step * 0.5, 12 * T + len); g.lineTo(x + step, 12 * T + u * 0.2);
        x += step; i++;
      }
      g.lineTo(W * T, 11.8 * T); g.lineTo(0, 11.8 * T); g.fill();
    }
    // puddles
    for (let i = 0; i < 9; i++) {
      const x = (hash(i, 1, 72) * W) * T, y = 12.45 * T + hash(i, 2, 72) * T * 0.3, rx = T * (0.25 + hash(i, 3, 72) * 0.35);
      blob(g, x, y, rx, rx * 0.28, "rgba(40,50,35,.75)");
      blob(g, x - rx * 0.25, y - rx * 0.06, rx * 0.45, rx * 0.07, "rgba(190,210,170,.35)");
    }
    // bank stones
    for (let i = 0; i < 14; i++) {
      const x = hash(i, 1, 73) * W * T, y = 12.55 * T + hash(i, 2, 73) * T * 0.35, r = u * (1.4 + hash(i, 3, 73) * 1.8);
      blob(g, x + u * 0.5, y + u * 0.5, r, r * 0.6, "rgba(20,15,8,.4)");
      blob(g, x, y, r, r * 0.66, css(lerp3(PAL.stoneDark, PAL.stone, hash(i, 4, 73))));
      blob(g, x - r * 0.3, y - r * 0.25, r * 0.45, r * 0.2, "rgba(210,210,180,.35)");
    }
    // reeds and bulrushes along the waterline
    for (let c = 0; c < 16; c++) {
      const cx = (hash(c, 1, 74) * W) * T;
      if (!free(cx / T, 12)) continue;
      for (let k = 0; k < 7; k++) {
        const x = cx + (k - 3) * u * 0.9 + hash(c, k, 75) * u, h = T * (0.45 + hash(c, k, 76) * 0.4), lean = (hash(c, k, 77) - 0.5) * u * 4;
        g.strokeStyle = k % 2 ? "#5f8a34" : "#46702a"; g.lineWidth = u * 0.55;
        g.beginPath(); g.moveTo(x, 13 * T); g.quadraticCurveTo(x, 13 * T - h * 0.5, x + lean, 13 * T - h); g.stroke();
        if (hash(c, k, 78) > 0.62) { g.fillStyle = "#5a3a1e"; g.fillRect(x + lean * 0.8 - u * 0.55, 13 * T - h * 0.92, u * 1.1, u * 2.8); }
      }
    }
  });
}

function trail(g: Ctx, T: number) {
  const u = T / 16, y0 = 3 * T, y1 = 4 * T;
  clip(g, T, 3, 4, () => {
    let sx = -T * 0.3, n = 0;
    while (sx < W * T) {
      const w = T * (0.72 + hash(n, 3, 50) * 0.62), split = hash(n, 4, 50) > 0.62;
      const rows = split ? [[y0 + u, y0 + T * 0.48], [y0 + T * 0.48 + u * 0.8, y1 - u]] : [[y0 + u, y1 - u]];
      rows.forEach(([a, b], r) => {
        const x = sx + u * 0.7, ww = w - u * 1.4, n2 = n * 3 + r;
        const base = lerp3(lerp3(rgb("#8f8870"), rgb("#a09472"), hash(n2, 1, 51)), rgb("#b9b294"), vnoise(sx / T, 3, 1.3, 52) * 0.5);
        g.fillStyle = css(base); g.beginPath(); g.roundRect(x, a, ww, b - a, u * 1.2); g.fill();
        g.fillStyle = "rgba(255,250,220,.18)"; g.fillRect(x, a, ww, u * 0.8); g.fillRect(x, a, u * 0.8, b - a);
        g.fillStyle = "rgba(30,30,15,.28)"; g.fillRect(x, b - u * 0.9, ww, u * 0.9); g.fillRect(x + ww - u * 0.8, a, u * 0.8, b - a);
        // weathering pits
        for (let k = 0; k < 4; k++) g.fillRect(x + hash(n2, k, 53) * (ww - u), a + hash(n2, k, 54) * (b - a - u), u * 0.7, u * 0.6);
        if (hash(n2, 2, 55) > 0.45) { // a crack
          g.strokeStyle = "rgba(25,22,12,.6)"; g.lineWidth = u * 0.45; g.beginPath();
          let cx = x + ww * (0.2 + hash(n2, 5, 55) * 0.6), cy = a;
          g.moveTo(cx, cy);
          for (let k = 1; k <= 4; k++) { cx += (hash(n2, k, 56) - 0.5) * u * 5; cy = a + ((b - a) * k) / 4; g.lineTo(cx, cy); }
          g.stroke();
        }
        if (hash(n2, 6, 57) > 0.55) blob(g, x + ww * hash(n2, 7, 57), b - u, ww * 0.25, u * 1.4, css(PAL.moss, 0.85));
      });
      // moss in the joint
      g.fillStyle = css(PAL.moss); g.fillRect(sx + w - u * 0.8, y0 + u * 2 + hash(n, 8, 58) * u * 4, u * 1.4, T * 0.4);
      g.fillStyle = css(PAL.mossLite, 0.7); g.fillRect(sx + w - u * 0.6, y0 + u * 3 + hash(n, 9, 58) * u * 6, u * 0.8, u * 2);
      sx += w; n++;
    }
    const foot = g.createLinearGradient(0, y0, 0, y0 + T * 0.35);
    foot.addColorStop(0, "rgba(10,14,6,.6)"); foot.addColorStop(1, "rgba(10,14,6,0)");
    g.fillStyle = foot; g.fillRect(0, y0, W * T, T * 0.35);
    g.fillStyle = css(PAL.moss, 0.8); g.fillRect(0, y0, W * T, u * 0.9);
    // roots crossing the path from the wall
    for (let i = 0; i < 7; i++) {
      const x = (hash(i, 1, 59) * W) * T;
      if (Math.abs(x - 11 * T) < T * 1.2) continue; // leave the temple stair clear
      const bend = (hash(i, 2, 59) - 0.5) * T * 1.4;
      g.lineCap = "round";
      g.strokeStyle = "rgba(20,15,8,.45)"; g.lineWidth = u * 2;
      g.beginPath(); g.moveTo(x, y0 + u); g.bezierCurveTo(x + bend, y0 + T * 0.3, x - bend, y0 + T * 0.7, x + bend * 0.6, y1 + u); g.stroke();
      g.strokeStyle = "#6b5738"; g.lineWidth = u * 1.4;
      g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + bend, y0 + T * 0.3 - u, x - bend, y0 + T * 0.7 - u, x + bend * 0.6, y1); g.stroke();
      g.strokeStyle = "rgba(200,180,130,.4)"; g.lineWidth = u * 0.4;
      g.beginPath(); g.moveTo(x - u * 0.4, y0); g.bezierCurveTo(x + bend - u * 0.4, y0 + T * 0.3 - u * 1.4, x - bend - u * 0.4, y0 + T * 0.7 - u * 1.4, x + bend * 0.6, y1 - u * 0.6); g.stroke();
    }
  });
}

/** Invented carved glyphs, never real script. */
function glyph(g: Ctx, cx: number, cy: number, s: number, kind: number) {
  g.strokeStyle = "rgba(35,35,22,.75)"; g.fillStyle = "rgba(35,35,22,.75)"; g.lineWidth = Math.max(1, s * 0.12);
  g.beginPath();
  switch (kind % 5) {
    case 0: // spiral
      for (let k = 0; k <= 16; k++) { const a = k * 0.55, r = s * 0.05 + k * s * 0.026; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; k ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke(); return;
    case 1: // a face
      g.strokeRect(cx - s * 0.4, cy - s * 0.38, s * 0.8, s * 0.76);
      g.fillRect(cx - s * 0.26, cy - s * 0.18, s * 0.16, s * 0.12); g.fillRect(cx + s * 0.1, cy - s * 0.18, s * 0.16, s * 0.12);
      g.fillRect(cx - s * 0.2, cy + s * 0.14, s * 0.4, s * 0.08); return;
    case 2: // step fret
      g.moveTo(cx - s * 0.4, cy + s * 0.3); g.lineTo(cx - s * 0.4, cy - s * 0.3); g.lineTo(cx + s * 0.3, cy - s * 0.3); g.lineTo(cx + s * 0.3, cy + s * 0.1);
      g.lineTo(cx - s * 0.1, cy + s * 0.1); g.lineTo(cx - s * 0.1, cy - s * 0.08); g.stroke(); return;
    case 3: // sun
      g.arc(cx, cy, s * 0.16, 0, TAU); g.stroke();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.fillRect(cx + Math.cos(a) * s * 0.32 - s * 0.04, cy + Math.sin(a) * s * 0.32 - s * 0.04, s * 0.08, s * 0.08); }
      return;
    default: // bird-serpent zigzag
      g.moveTo(cx - s * 0.4, cy); for (let k = 1; k <= 4; k++) g.lineTo(cx - s * 0.4 + k * s * 0.2, cy + (k % 2 ? -s * 0.22 : s * 0.22)); g.stroke();
      g.fillRect(cx + s * 0.32, cy - s * 0.1, s * 0.12, s * 0.12);
  }
}

function wall(g: Ctx, T: number) {
  const u = T / 16;
  clip(g, T, 1, 3, () => {
    const courses = 4, ch = (2 * T) / courses;
    for (let k = 0; k < courses; k++) {
      const top = T + k * ch;
      let x = -hash(k, 0, 33) * T, j = 0;
      while (x < W * T) {
        const w = T * (0.75 + hash(k, j, 34) * 0.75), bx = x + u * 0.5, bw = w - u, by = top + u * 0.5, bh = ch - u;
        const broken = hash(k, j, 35) > 0.93 && k > 0;
        if (broken) { // a fallen-out block: dark hollow with a fern in it
          g.fillStyle = "#1b2014"; g.fillRect(bx, by, bw, bh);
          fern(g, bx + bw / 2, by + bh, T * 0.3, k * 50 + j);
        } else {
          const shadeUp = (3 - k) / 3; // the canopy shades the upper courses
          const c = lerp3(lerp3(PAL.stone, PAL.stoneWarm, hash(k, j, 36)), PAL.stoneDark, shadeUp * 0.35 + vnoise(x / T, k, 1.7, 37) * 0.2);
          g.fillStyle = css(c); g.fillRect(bx, by, bw, bh);
          g.fillStyle = "rgba(255,250,215,.16)"; g.fillRect(bx, by, bw, u * 0.8); g.fillRect(bx, by, u * 0.7, bh);
          g.fillStyle = "rgba(20,20,10,.32)"; g.fillRect(bx, by + bh - u, bw, u); g.fillRect(bx + bw - u * 0.8, by, u * 0.8, bh);
          for (let p = 0; p < 5; p++) { g.fillStyle = "rgba(30,30,15,.25)"; g.fillRect(bx + hash(k * 9 + j, p, 38) * (bw - u), by + hash(k * 9 + j, p, 39) * (bh - u), u * 0.7, u * 0.6); }
          if (hash(k, j, 40) > 0.58 && bw > T * 0.6) { // carved panel
            const gs = bh * 0.8;
            g.fillStyle = "rgba(20,20,10,.2)"; g.fillRect(bx + bw / 2 - gs * 0.55, by + bh / 2 - gs * 0.5, gs * 1.1, gs);
            g.fillStyle = "rgba(255,250,215,.12)"; g.fillRect(bx + bw / 2 - gs * 0.55, by + bh / 2 + gs * 0.44, gs * 1.1, u * 0.6);
            glyph(g, bx + bw / 2, by + bh / 2, gs, Math.floor(hash(k, j, 41) * 5));
          }
          if (hash(k, j, 42) > 0.6) { // crack
            g.strokeStyle = "rgba(20,18,10,.6)"; g.lineWidth = u * 0.4; g.beginPath();
            let cx = bx + bw * hash(k, j, 43), cy = by;
            g.moveTo(cx, cy); for (let s = 1; s <= 3; s++) { cx += (hash(k, j * 3 + s, 44) - 0.5) * u * 5; cy = by + (bh * s) / 3; g.lineTo(cx, cy); } g.stroke();
          }
        }
        // moss creeping over the top of the block, denser up high
        if (hash(k, j, 45) < 0.75 - k * 0.12) {
          const mw = bw * (0.3 + hash(k, j, 46) * 0.6), mx = bx + hash(k, j, 47) * (bw - mw);
          g.fillStyle = css(PAL.moss); g.fillRect(mx, by, mw, u * 1.4);
          for (let d = 0; d < 4; d++) g.fillRect(mx + hash(k * 7 + j, d, 48) * mw, by, u * 1.1, u * (1.6 + hash(k * 7 + j, d, 49) * 4));
          g.fillStyle = css(PAL.mossLite, 0.8); g.fillRect(mx + u, by, mw * 0.6, u * 0.6);
        }
        x += w; j++;
      }
    }
    // shade cast by the canopy on the top of the wall
    const sh = g.createLinearGradient(0, T, 0, T * 1.9);
    sh.addColorStop(0, "rgba(5,20,8,.55)"); sh.addColorStop(1, "rgba(5,20,8,0)");
    g.fillStyle = sh; g.fillRect(0, T, W * T, T);
  });
}

function canopy(g: Ctx, T: number) {
  const shades: [string, string, string, string][] = [
    [css(PAL.canopyDeep), css(PAL.canopyDark), css(PAL.leaf1), css(PAL.leaf2)],
    [css(PAL.canopyDark), css(PAL.leaf1), css(PAL.leaf2), css(PAL.leaf3)],
    [css(PAL.leaf1), css(PAL.leaf2), css(PAL.leaf3), css(PAL.leaf4)],
  ];
  clip(g, T, 0, 1.45, () => {
    for (let layer = 0; layer < 3; layer++) {
      const per = 5 - layer;
      for (let i = 0; i < W * per + 2; i++) {
        const cx = (i / per + (hash(i, layer, 1) - 0.5) * 0.3) * T;
        const cy = (0.1 + layer * 0.28 + hash(i, layer, 2) * 0.4) * T;
        // the temple top stands clear of the canopy
        if (Math.abs(cx - 11 * T) < T * (1.25 + layer * 0.25) && layer > 0) continue;
        clump(g, cx, cy, T * (0.34 + hash(i, layer, 3) * 0.2 - layer * 0.03), i * 7 + layer, shades[layer]);
      }
    }
    // bromeliads and a few red flowers in the canopy
    for (let i = 0; i < 18; i++) {
      const cx = hash(i, 1, 80) * W * T, cy = (0.3 + hash(i, 2, 80) * 0.8) * T;
      if (Math.abs(cx - 11 * T) < T * 1.8) continue;
      for (let p = 0; p < 5; p++) leaf(g, cx, cy, T * 0.1, T * 0.035, -Math.PI / 2 + (p - 2) * 0.5, p % 2 ? "#c8352a" : "#e8683a");
    }
  });
}

function temple(g: Ctx, T: number) {
  const u = T / 16, C = 11 * T;
  const tiers = [ // [top, bottom, half width] in tiles
    [0.66, 1.24, 2.15], [1.24, 2.04, 2.9], [2.04, 3.0, 3.65],
  ];
  // tiers, widest (lowest) last so each ledge sits in front of the one above
  for (let i = 0; i < tiers.length; i++) {
    const [t0, t1, hw] = tiers[i], top = t0 * T, bot = t1 * T, L = C - hw * T, R = C + hw * T;
    g.fillStyle = "rgba(8,15,6,.45)"; g.fillRect(L - u * 2, top + u, (R - L) + u * 4, bot - top); // cast shadow
    // stone courses on the face
    const rows = 2;
    for (let r = 0; r < rows; r++) {
      const ry = top + u * 1.4 + (r * (bot - top - u * 1.4)) / rows, rh = (bot - top - u * 1.4) / rows;
      let x = L - hash(i, r, 90) * T * 0.5, j = 0;
      while (x < R) {
        const w = T * (0.5 + hash(i * 5 + r, j, 91) * 0.35), bx = Math.max(L, x), bw = Math.min(R, x + w) - bx;
        if (bw > 0) {
          g.fillStyle = css(lerp3(lerp3(PAL.tDark, PAL.tStone, 0.55 + hash(i * 5 + r, j, 92) * 0.45), PAL.tDark, (bx - L) / (R - L) * 0.35));
          g.fillRect(bx, ry, bw, rh);
          g.fillStyle = "rgba(30,25,12,.35)"; g.fillRect(bx + bw - u * 0.6, ry, u * 0.6, rh); g.fillRect(bx, ry + rh - u * 0.6, bw, u * 0.6);
          if (hash(i * 5 + r, j, 93) > 0.45 && bw > T * 0.4) glyph(g, bx + bw / 2, ry + rh / 2, rh * 0.72, Math.floor(hash(i, j, 94) * 5));
        }
        x += w; j++;
      }
    }
    // outline, then the ledge: lit top, shaded right-hand return
    g.strokeStyle = "rgba(20,18,8,.7)"; g.lineWidth = u * 0.8; g.strokeRect(L, top, R - L, bot - top);
    g.fillStyle = "rgba(15,12,5,.45)"; g.fillRect(L, top + u * 1.4, R - L, u * 0.9);
    g.fillStyle = css(PAL.tLite); g.fillRect(L - u, top, R - L + u * 2, u * 1.4);
    g.fillStyle = "rgba(255,250,220,.35)"; g.fillRect(L - u, top, R - L + u * 2, u * 0.5);
    g.fillStyle = "rgba(20,15,8,.35)"; g.fillRect(R - u * 1.5, top, u * 1.5, bot - top);
    g.fillStyle = "rgba(255,250,220,.12)"; g.fillRect(L, top, u * 1.2, bot - top);
    // moss dripping off the ledge
    for (let d = 0; d < 14; d++) {
      const mx = L + hash(i, d, 95) * (R - L), mh = u * (1 + hash(i, d, 96) * 5);
      g.fillStyle = css(d % 3 ? PAL.moss : PAL.mossLite); g.fillRect(mx, top + u * 0.8, u * (1 + hash(i, d, 97) * 2.5), mh);
    }
  }
  // the stair down the middle, with carved balustrades
  const sw = T * 0.62, sTop = 0.78 * T, sBot = 3 * T;
  g.fillStyle = "rgba(10,15,8,.4)"; g.fillRect(C - sw - u * 3.5, sTop, sw * 2 + u * 7, sBot - sTop);
  for (const side of [-1, 1]) {
    const bx = side < 0 ? C - sw - u * 3 : C + sw;
    g.fillStyle = css(side < 0 ? PAL.tLite : PAL.tStone); g.fillRect(bx, sTop, u * 3, sBot - sTop);
    g.fillStyle = "rgba(20,18,8,.6)"; g.fillRect(side < 0 ? bx - u * 0.6 : bx + u * 3, sTop, u * 0.6, sBot - sTop);
    g.fillStyle = "rgba(30,25,12,.3)"; for (let k = 0; k < 7; k++) g.fillRect(bx, sTop + k * T * 0.33, u * 3, u * 0.5);
    // serpent head at the foot
    g.fillStyle = css(PAL.stoneWarm); g.fillRect(bx - u * 0.5, sBot - u * 5, u * 4, u * 5);
    g.fillStyle = "#2a2a1a"; g.fillRect(bx + u * (side < 0 ? 0.6 : 2), sBot - u * 3.8, u, u); g.fillRect(bx, sBot - u * 1.6, u * 3, u * 0.6);
  }
  const steps = 18;
  for (let s = 0; s < steps; s++) {
    const y = sTop + (s * (sBot - sTop)) / steps, h = (sBot - sTop) / steps;
    g.fillStyle = css(lerp3(PAL.tDark, PAL.tStone, 0.45 + (s / steps) * 0.55)); g.fillRect(C - sw, y, sw * 2, h);
    g.fillStyle = "rgba(255,250,220,.28)"; g.fillRect(C - sw, y, sw * 2, u * 0.5);
    g.fillStyle = "rgba(25,20,10,.35)"; g.fillRect(C - sw, y + h - u * 0.6, sw * 2, u * 0.6);
    if (hash(s, 0, 98) > 0.55) { g.fillStyle = css(PAL.moss, 0.9); g.fillRect(C - sw + hash(s, 1, 98) * sw * 1.6, y + h - u * 1.2, u * 3, u * 0.8); }
    if (hash(s, 2, 98) > 0.8) { g.fillStyle = "rgba(25,20,10,.5)"; g.fillRect(C - sw + hash(s, 3, 98) * sw * 1.8, y + u * 0.6, u * 0.5, h - u); }
  }
  // the shrine on top, with its dark doorway
  const shL = C - 1.4 * T, shR = C + 1.4 * T, shB = 0.84 * T;
  g.fillStyle = css(PAL.tStone); g.fillRect(shL, 0, shR - shL, shB);
  g.strokeStyle = "rgba(20,18,8,.7)"; g.lineWidth = u * 0.8; g.strokeRect(shL, -u, shR - shL, shB + u);
  g.fillStyle = "rgba(20,15,8,.35)"; g.fillRect(shR - u * 2, 0, u * 2, shB);
  g.fillStyle = css(PAL.tLite); g.fillRect(shL - u * 1.5, shB * 0.28, shR - shL + u * 3, u * 1.6);
  for (let k = 0; k < 6; k++) glyph(g, shL + T * 0.25 + k * T * 0.4, shB * 0.14, T * 0.2, k + 2);
  // doorway: stepped corbel arch
  const dw = T * 0.34, dTop = shB * 0.42;
  g.fillStyle = "#0a0f08";
  g.beginPath(); g.moveTo(C - dw, shB); g.lineTo(C - dw, dTop + u * 3); g.lineTo(C - dw * 0.62, dTop + u * 1.5); g.lineTo(C - dw * 0.3, dTop);
  g.lineTo(C + dw * 0.3, dTop); g.lineTo(C + dw * 0.62, dTop + u * 1.5); g.lineTo(C + dw, dTop + u * 3); g.lineTo(C + dw, shB); g.closePath(); g.fill();
  g.fillStyle = "rgba(60,90,40,.25)"; g.fillRect(C - dw, shB - u * 1.2, dw * 2, u * 1.2);
  g.fillStyle = css(PAL.tLite); g.fillRect(C - dw - u * 2.2, dTop + u * 2, u * 1.8, shB - dTop - u * 2); g.fillRect(C + dw + u * 0.4, dTop + u * 2, u * 1.8, shB - dTop - u * 2);
  g.fillStyle = "rgba(30,25,12,.4)"; g.fillRect(C + dw + u * 1.6, dTop + u * 2, u * 0.6, shB - dTop - u * 2);
  // stone braziers either side of the stair (their flames are drawn live)
  for (const side of [-1, 1]) {
    const bx = C + side * (sw + T * 0.55), by = 2.95 * T;
    g.fillStyle = "rgba(10,10,5,.4)"; g.beginPath(); g.ellipse(bx, by, u * 4, u * 1.2, 0, 0, TAU); g.fill();
    g.fillStyle = css(PAL.stone); g.fillRect(bx - u * 1.3, by - u * 6, u * 2.6, u * 6);
    g.fillStyle = css(PAL.stoneLite); g.fillRect(bx - u * 3, by - u * 8, u * 6, u * 2.4);
    g.fillStyle = "#2a1a0e"; g.fillRect(bx - u * 2.4, by - u * 8.4, u * 4.8, u * 0.9);
  }
  // foliage crowding the shrine's shoulders
  const sh: [string, string, string, string] = [css(PAL.leaf1), css(PAL.leaf2), css(PAL.leaf3), css(PAL.leaf4)];
  clump(g, shL - T * 0.25, T * 0.95, T * 0.34, 301, sh);
  clump(g, shR + T * 0.3, T * 0.9, T * 0.3, 302, sh);
  clump(g, C - 3.5 * T, T * 2.1, T * 0.36, 303, sh);
  clump(g, C + 3.55 * T, T * 1.95, T * 0.34, 304, sh);
}

function vines(g: Ctx, T: number) {
  const u = T / 16, C = 11 * T;
  clip(g, T, 0.5, 3.1, () => {
    for (let v = 0; v < W * 1.6; v++) {
      const x = (v / 1.6 + (hash(v, 0, 20) - 0.5) * 0.4) * T;
      if (Math.abs(x - C) < T * 0.9) continue; // never over the stair
      const top = T * (0.8 + hash(v, 1, 20) * 0.4), len = T * (0.7 + hash(v, 2, 20) * 1.5), sway = (hash(v, 3, 20) - 0.5) * u * 6;
      g.strokeStyle = "#2a4a1e"; g.lineWidth = u * 0.7;
      g.beginPath(); g.moveTo(x, top); g.bezierCurveTo(x + sway, top + len * 0.33, x - sway, top + len * 0.66, x + sway * 0.4, top + len); g.stroke();
      for (let l = 1; l < 9; l++) {
        const t = l / 9;
        if (t * len > len - u) break;
        const ly = top + len * t, lx = x + sway * (Math.sin(t * 3.1) * 0.8);
        leaf(g, lx, ly, u * (2.4 - t), u * 1.2, l % 2 ? 0.5 : Math.PI - 0.5, l % 3 ? "#3f7d2c" : "#5d9c3a", "rgba(20,40,12,.5)");
      }
    }
  });
}

function wallFoot(g: Ctx, T: number) {
  clip(g, T, 2.3, 3.4, () => {
    for (let i = 0; i < 16; i++) {
      const x = hash(i, 1, 85) * W * T;
      if (Math.abs(x - 11 * T) < T * 1.6) continue;
      fern(g, x, 3.12 * T, T * (0.35 + hash(i, 2, 85) * 0.2), 900 + i);
    }
  });
}
