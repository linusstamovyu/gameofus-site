// Mars base: habitat domes on the horizon, a rust ridge with airlocks, a catwalk,
// red regolith with craters and rover tracks, a landing-pad edge, and open space below.
import { Ground, H, PALMS, PARASOLS, W, hash } from "../map";
import { blocks, ellipse, glow, rgb, r01, rgba, roundRect, shadow, vnoise, wrap, type Ctx } from "./kit";
import type { Theme } from "./types";

const TAU = Math.PI * 2;
/** kit's mix returns rgb(), which cannot be fed back into mix; this one returns hex so it chains. */
const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a), [br, bg, bb] = rgb(b), k = Math.max(0, Math.min(1, t));
  return `#${hex2(ar + (br - ar) * k)}${hex2(ag + (bg - ag) * k)}${hex2(ab + (bb - ab) * k)}`;
}
const sstep = (a: number, b: number, v: number) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };

/* ---------- fixed features (tile units) ---------- */
const DOMES = [{ x: 2.3, r: 0.75 }, { x: 6.9, r: 1.05 }, { x: 11.6, r: 0.7 }, { x: 15.4, r: 1.0 }, { x: 20.2, r: 0.8 }];
const MAST = { x: 9.25, top: 0.07 };
const AIRLOCKS = [4, 18]; // left tile of a 2-wide door in rows 1-2
const CRATERS = [
  { x: 7.0, y: 5.9, r: 0.85 }, { x: 14.2, y: 7.0, r: 0.7 }, { x: 19.7, y: 8.3, r: 1.0 }, { x: 5.3, y: 11.35, r: 0.5 },
  { x: 12.2, y: 11.1, r: 0.55 }, { x: 3.7, y: 4.7, r: 0.4 }, { x: 21.2, y: 10.9, r: 0.42 }, { x: 10.6, y: 7.8, r: 0.32 },
];
type P = [number, number];
const TRACKS: { p: [P, P, P, P]; a0: number }[] = [
  { p: [[-0.5, 9.6], [3.5, 8.4], [6.5, 12.3], [10.0, 11.8]], a0: 0.2 },
  { p: [[13.0, 12.3], [15.5, 8.4], [17.5, 7.9], [20.1, 5.85]], a0: 0.05 },
];
const PLANET = { x: 17.2, y: 22.4, r: 5.9 };
const MOON = { x: 4.6, y: 15.5, r: 0.55 };
const VOID_TOP = 13.62; // below the rock lip under the pad
const NEBULA: [number, number, number, string, number][] = [
  [3.5, 14.6, 4.5, "#6a2bb0", 0.22], [9.5, 16.4, 5.0, "#1f7fa0", 0.18], [12.5, 14.4, 3.2, "#b0357a", 0.12], [1.0, 17.2, 3.0, "#2a58c0", 0.16],
];
const BOULDERS = [{ x: 13.0, y: 4.55, r: 0.28 }, { x: 6.3, y: 8.2, r: 0.22 }, { x: 16.9, y: 9.35, r: 0.3 }, { x: 0.55, y: 11.8, r: 0.26 }, { x: 11.6, y: 9.7, r: 0.18 }, { x: 19.0, y: 11.5, r: 0.2 }];
/** How far the plateau's rock hangs down into row 13, in tiles. */
const lipAt = (fx: number) => 0.2 + 0.26 * vnoise(fx, 0, 1.1, 23) + 0.1 * vnoise(fx, 0, 0.28, 24);
const isRover = (x: number) => x === 10 || x === 20;

/* ---------- ground ---------- */
function regolith(g: Ctx, x: number, y: number, T: number) {
  blocks(g, x, y, T, 8, (fx, fy) => {
    const n = vnoise(fx, fy, 2.2, 1) * 0.65 + vnoise(fx, fy, 0.7, 2) * 0.35;
    const d = vnoise(fx, fy, 5.5, 3);
    const dark = sstep(0.4, 1.0, vnoise(fx + 31, fy, 3.2, 4));
    return mix(mix(mix("#a24326", "#d27749", n), "#e29a68", Math.max(0, d - 0.55) * 1.7), "#8a361d", dark * 0.35);
  });
  const px = x * T, py = y * T, u = T / 16;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = hash(x, y, i) > 0.5 ? "rgba(80,24,10,.3)" : "rgba(255,210,170,.32)";
    g.fillRect(px + hash(x, y, i + 20) * (T - u), py + hash(x, y, i + 40) * (T - u), u * 0.8, u * 0.8);
  }
  if (hash(x, y, 9) > 0.45) { // a pebble, lit from the top-left
    const bx = px + (0.15 + hash(x, y, 10) * 0.7) * T, byy = py + (0.2 + hash(x, y, 11) * 0.6) * T, s = u * (0.9 + hash(x, y, 12) * 1.1);
    ellipse(g, bx + s * 0.3, byy + s * 0.55, s * 1.2, s * 0.5, "rgba(60,18,8,.28)");
    ellipse(g, bx, byy, s, s * 0.72, "#8a3b22");
    ellipse(g, bx - s * 0.3, byy - s * 0.25, s * 0.45, s * 0.28, "rgba(255,190,150,.45)");
  }
}

function tile(g: Ctx, band: Ground, x: number, y: number, T: number) {
  const px = x * T, py = y * T, u = T / 16;
  switch (band) {
    case Ground.Town: {
      const sky = g.createLinearGradient(0, 0, 0, T);
      sky.addColorStop(0, "#03040b"); sky.addColorStop(0.5, "#0e0d22"); sky.addColorStop(0.78, "#43201f");
      g.fillStyle = sky; g.fillRect(px, py, T, T);
      for (let i = 0; i < 6; i++) {
        const b = hash(x, i, 31);
        g.fillStyle = `rgba(235,238,255,${0.35 + b * 0.6})`;
        const s = b > 0.85 ? u : u * 0.55;
        g.fillRect(px + hash(x, i, 32) * T, py + hash(x, i, 33) * T * 0.5, s, s);
      }
      for (let i = 0; i < 16; i++) { // far hills, continuous across columns
        const fx = x + i / 16;
        const h = T * (0.55 + 0.12 * vnoise(fx, 0, 1.9, 3) + 0.05 * vnoise(fx, 0, 0.45, 4));
        g.fillStyle = "#2c1513"; g.fillRect(px + i * u, py + h, u + 0.5, T - h);
      }
      g.fillStyle = "#3d1d15"; g.fillRect(px, py + T * 0.8, T, T * 0.2);
      return;
    }
    case Ground.Cliff: {
      blocks(g, x, y, T, 8, (fx, fy) => {
        const n = vnoise(fx, fy, 1.1, 5) * 0.6 + vnoise(fx, fy, 0.35, 6) * 0.4;
        return mix("#74301a", "#b8592f", n);
      });
      const shade = g.createLinearGradient(0, T, 0, 3 * T);
      shade.addColorStop(0, "rgba(255,170,110,.14)"); shade.addColorStop(1, "rgba(35,10,5,.32)");
      g.fillStyle = shade; g.fillRect(px, py, T, T);
      // strata: row-positioned beds, waved by continuous noise along x
      for (let k = 0; k < 6; k++) {
        const ly = T * (1.28 + 0.29 * k + 0.08 * hash(k, 0, 40));
        if (ly < py - u * 3 || ly > py + T + u * 3) continue;
        const th = u * (0.8 + hash(k, 0, 42) * 1.2);
        for (let i = 0; i < 16; i++) {
          const wv = (vnoise(x + i / 16, k, 1.6, 41) - 0.5) * u * 4;
          g.fillStyle = "rgba(255,200,150,.13)"; g.fillRect(px + i * u, ly + wv - u * 0.7, u + 0.5, u * 0.7);
          g.fillStyle = "rgba(55,15,6,.24)"; g.fillRect(px + i * u, ly + wv, u + 0.5, th);
        }
      }
      // pits and pocks
      for (let i = 0; i < 3; i++) {
        const hx = px + hash(x, y, 60 + i) * (T - u * 2), hy = py + hash(x, y, 70 + i) * (T - u * 2);
        if (y === 1 && hy < py + T * 0.45) continue;
        ellipse(g, hx, hy, u * 1.1, u * 0.7, "rgba(50,14,6,.35)");
        g.fillStyle = "rgba(255,200,160,.2)"; g.fillRect(hx - u, hy + u * 0.6, u * 2, u * 0.5);
      }
      // cracks: one per chosen column, continuous down both rows
      if (hash(x, 0, 13) > 0.45) {
        const x0 = px + T * (0.2 + 0.6 * hash(x, 0, 14)), y0 = T * 1.38, y1 = T * (2.05 + 0.8 * hash(x, 0, 16)), st = u * 3;
        const at = (wy: number) => x0 + (hash(x, Math.floor(wy / st), 17) - 0.5) * u * 3.2;
        g.save(); g.beginPath(); g.rect(px - u * 3, py, T + u * 6, T); g.clip();
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = pass ? "rgba(35,8,3,.6)" : "rgba(255,190,140,.22)"; g.lineWidth = pass ? u * 0.7 : u * 0.5;
          g.beginPath();
          for (let wy = Math.floor(y0 / st) * st; wy <= y1; wy += st) {
            const cx0 = at(wy) + (pass ? 0 : u * 0.6);
            if (wy === Math.floor(y0 / st) * st) g.moveTo(cx0, Math.max(y0, wy)); else g.lineTo(cx0, wy);
          }
          g.stroke();
        }
        g.restore();
      }
      if (y === 1) { // jagged ridge against the far plain
        for (let i = 0; i < 16; i++) {
          const fx = x + i / 16;
          const top = T * (0.12 + 0.24 * vnoise(fx, 0, 1.4, 7) + 0.07 * vnoise(fx, 0, 0.3, 8));
          g.fillStyle = "#3d1d15"; g.fillRect(px + i * u, py, u + 0.5, top);
          g.fillStyle = "rgba(255,185,130,.45)"; g.fillRect(px + i * u, py + top, u + 0.5, u * 0.8);
        }
      } else { // talus and a dark foot where the wall meets the catwalk
        const foot = g.createLinearGradient(0, py + T * 0.6, 0, py + T);
        foot.addColorStop(0, "rgba(30,8,4,0)"); foot.addColorStop(1, "rgba(30,8,4,.45)");
        g.fillStyle = foot; g.fillRect(px, py + T * 0.6, T, T * 0.4);
        for (let i = 0; i < 3; i++) {
          const rx = px + hash(x, 0, 80 + i) * T, s = u * (1.2 + hash(x, 0, 83 + i) * 1.4);
          ellipse(g, rx, py + T - s * 0.6, s * 1.2, s * 0.75, "#7e361e");
          ellipse(g, rx - s * 0.3, py + T - s * 0.95, s * 0.55, s * 0.3, "rgba(255,190,140,.35)");
        }
      }
      return;
    }
    case Ground.Board: {
      g.fillStyle = "#23272f"; g.fillRect(px, py, T, T);
      const gy0 = py + T * 0.22, gy1 = py + T * 0.84;
      g.fillStyle = "#4d5561"; g.fillRect(px, gy0, T, gy1 - gy0);
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 3; j++) {
          const hx = px + i * (T / 8) + u * 0.45, hy = gy0 + u * 0.6 + j * u * 3.25;
          g.fillStyle = "#12151a"; g.fillRect(hx, hy, u * 1.1, u * 2.2);
          g.fillStyle = "rgba(190,200,215,.25)"; g.fillRect(hx - u * 0.45, hy - u * 0.4, u * 2, u * 0.35);
        }
      // dust drifted onto the grating
      blocks(g, x, y + 0.22, T, 6, (fx) => rgba("#b45a33", Math.max(0, vnoise(fx, 3, 1.3, 9) - 0.5) * 0.5));
      g.fillStyle = "#23272f"; g.fillRect(px, py, T, T * 0.22); // re-cover the top band after the dust pass
      // hazard edge, world-aligned diagonal stripes
      const hy0 = py + u * 0.4, hh = T * 0.18;
      g.save(); g.beginPath(); g.rect(px, hy0, T, hh); g.clip();
      g.fillStyle = "#f0bd2c"; g.fillRect(px, hy0, T, hh);
      g.fillStyle = "#15161a";
      const per = T / 3;
      for (let k = Math.floor(px / per) - 1; k <= Math.floor((px + T) / per) + 1; k++) {
        const sx = k * per;
        g.beginPath(); g.moveTo(sx, hy0); g.lineTo(sx + per / 2, hy0); g.lineTo(sx + per / 2 - hh, hy0 + hh); g.lineTo(sx - hh, hy0 + hh); g.fill();
      }
      g.restore();
      g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(px, hy0, T, u * 0.3);
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(px, hy0 + hh, T, u * 0.4);
      // kick plate with rivets
      g.fillStyle = "#5c6470"; g.fillRect(px, gy1, T, py + T - gy1);
      g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(px, gy1, T, u * 0.4);
      g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(px, py + T - u * 0.6, T, u * 0.6);
      for (let k = 0; k < 4; k++) {
        const rx = px + (k + 0.5) * (T / 4), ry = gy1 + (py + T - gy1) / 2;
        ellipse(g, rx + u * 0.15, ry + u * 0.15, u * 0.55, u * 0.55, "rgba(0,0,0,.45)");
        ellipse(g, rx, ry, u * 0.5, u * 0.5, "#9aa3af");
      }
      if (x % 2 === 0) { // panel seam every two tiles
        g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(px, gy0, u * 0.6, gy1 - gy0);
        g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(px + u * 0.6, gy0, u * 0.3, gy1 - gy0);
      }
      return;
    }
    case Ground.Sand:
      regolith(g, x, y, T);
      if (y === 4) {
        const sh = g.createLinearGradient(0, py, 0, py + T * 0.3);
        sh.addColorStop(0, "rgba(25,8,4,.35)"); sh.addColorStop(1, "rgba(25,8,4,0)");
        g.fillStyle = sh; g.fillRect(px, py, T, T * 0.3);
      }
      return;
    case Ground.Wet: {
      regolith(g, x, y, T);
      const top = py + T * 0.3, lip = py + T * 0.86;
      blocks(g, x, y + 0.3, T, 8, (fx, fy) => mix("#5f636d", "#7a7f89", vnoise(fx, fy, 1.8, 12) * 0.7 + vnoise(fx, fy, 0.5, 13) * 0.3));
      g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(px, top, T, u * 0.4);
      g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(px, top + u * 0.4, T, u * 0.35);
      // down-pointing chevrons, world-aligned
      const c0 = py + T * 0.42, c1 = py + T * 0.74, per = T / 2, th = u * 1.8;
      g.save(); g.beginPath(); g.rect(px, c0, T, c1 - c0); g.clip();
      for (let k = Math.floor(px / per) - 1; k <= Math.floor((px + T) / per); k++) {
        const sx = k * per + per * 0.1, hw = per * 0.4;
        g.fillStyle = "#e8b52a";
        g.beginPath(); g.moveTo(sx, c0); g.lineTo(sx + th, c0); g.lineTo(sx + hw, c1 - th); g.lineTo(sx + 2 * hw - th, c0);
        g.lineTo(sx + 2 * hw, c0); g.lineTo(sx + hw, c1); g.closePath(); g.fill();
      }
      g.restore();
      // dust over the paint
      blocks(g, x, y + 0.3, T, 6, (fx, fy) => rgba("#c2663b", Math.max(0, vnoise(fx, fy, 1.1, 14) - 0.45) * 0.55));
      g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(px, py + T * 0.3 + T * 0.56 - 1, T, 1);
      g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(px + T - u * 0.5, top, u * 0.5, lip - top);
      // the lip, with a runway light housing per tile
      g.fillStyle = "#1c1f26"; g.fillRect(px, lip, T, py + T - lip);
      g.fillStyle = "#8a909b"; g.fillRect(px, lip, T, u * 0.5);
      roundRect(g, px + T / 2 - u * 1.6, lip + u * 0.5, u * 3.2, u * 1.4, u * 0.4, "#3a3f48");
      ellipse(g, px + T / 2, lip + u * 1.2, u * 0.9, u * 0.5, "#5a2c16");
      return;
    }
    case Ground.Sea: {
      blocks(g, x, y, T, 12, (fx, fy) => {
        const n = sstep(0.3, 0.95, vnoise(fx, fy, 4.2, 21)), m = sstep(0.4, 1.0, vnoise(fx + 7, fy, 3.1, 22));
        const deep = mix("#060714", "#03030a", (fy - 13) / 5);
        return mix(mix(deep, "#1f0f3c", n * 0.7), "#0a2c3a", m * 0.45);
      });
      for (let i = 0; i < 5; i++) {
        const b = hash(x, y, 90 + i);
        g.fillStyle = `rgba(210,220,255,${0.15 + b * 0.35})`;
        g.fillRect(px + hash(x, y, 100 + i) * T, py + hash(x, y, 110 + i) * T, u * 0.5, u * 0.5);
      }
      if (y === 13) { // the underside of the plateau, cut off above open space
        for (let i = 0; i < 16; i++) {
          const fx = x + i / 16;
          const lb = lipAt(fx) * T;
          const grd = g.createLinearGradient(0, py, 0, py + lb);
          grd.addColorStop(0, "#7a331c"); grd.addColorStop(1, "#240c07");
          g.fillStyle = grd; g.fillRect(px + i * u, py, u + 0.5, lb);
          g.fillStyle = "rgba(255,160,110,.12)"; g.fillRect(px + i * u, py + lb * 0.35, u + 0.5, u * 0.5);
          g.fillStyle = "rgba(120,190,255,.18)"; g.fillRect(px + i * u, py + lb - u * 0.4, u + 0.5, u * 0.4);
        }
      }
      return;
    }
  }
}

/* ---------- static pictures ---------- */
function domes(g: Ctx, T: number) {
  const u = T / 16, baseY = T * 0.62, groundY = T * 0.84;
  g.save(); g.beginPath(); g.rect(0, 0, W * T, T); g.clip();
  // connecting tubes
  for (let i = 0; i < DOMES.length - 1; i++) {
    const a = DOMES[i].x * T, b = DOMES[i + 1].x * T, ty = baseY + T * 0.1;
    g.fillStyle = "#59606c"; g.fillRect(a, ty - u * 1.3, b - a, u * 2.6);
    g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(a, ty - u * 1.3, b - a, u * 0.5);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(a, ty + u * 0.9, b - a, u * 0.4);
    for (let s = a + u * 4; s < b; s += u * 5) { g.fillStyle = "#3b414b"; g.fillRect(s, ty - u * 1.5, u * 0.8, u * 3); }
  }
  // solar arrays on stilts
  for (const sx of [4.45, 13.5, 18.0]) {
    const x0 = sx * T;
    g.fillStyle = "#3b414b"; g.fillRect(x0 + u * 3, T * 0.6, u * 0.6, groundY - T * 0.6);
    g.fillStyle = "#1f3a6a";
    g.beginPath(); g.moveTo(x0, T * 0.58); g.lineTo(x0 + u * 8, T * 0.5); g.lineTo(x0 + u * 8.6, T * 0.6); g.lineTo(x0 + u * 0.6, T * 0.68); g.fill();
    g.strokeStyle = "rgba(140,180,235,.55)"; g.lineWidth = u * 0.25;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x0 + u * 2 * k, T * 0.58 - u * 0.25 * k * 1.6); g.lineTo(x0 + u * (2 * k + 0.6), T * 0.68 - u * 0.25 * k * 1.6); g.stroke(); }
  }
  // comms mast
  const mx = MAST.x * T;
  g.strokeStyle = "#8b93a0"; g.lineWidth = u * 0.5;
  g.beginPath(); g.moveTo(mx - u * 1.2, groundY); g.lineTo(mx, MAST.top * T); g.lineTo(mx + u * 1.2, groundY); g.stroke();
  for (let k = 1; k < 6; k++) { const yy = groundY - (groundY - MAST.top * T) * (k / 6), w = u * 1.2 * (1 - k / 6); g.beginPath(); g.moveTo(mx - w, yy); g.lineTo(mx + w, yy); g.stroke(); }
  for (const d of DOMES) {
    const cx = d.x * T, hr = d.r * T, vr = Math.min(hr * 0.62, baseY - T * 0.05);
    // module under the dome
    g.fillStyle = "#6c7482"; g.fillRect(cx - hr, baseY, hr * 2, groundY - baseY);
    g.fillStyle = "rgba(255,255,255,.3)"; g.fillRect(cx - hr, baseY, hr * 2, u * 0.5);
    g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(cx - hr, groundY - u * 0.8, hr * 2, u * 0.8);
    for (let k = 0, wx = cx - hr + u * 1.5; wx < cx + hr - u * 1.5; k++, wx += u * 2.6) {
      g.fillStyle = hash(Math.round(d.x * 10), k, 51) > 0.35 ? "#ffcf7a" : "#2a2e36";
      g.fillRect(wx, baseY + u * 1.6, u * 1.2, u * 1.1);
    }
    // interior
    g.save(); g.beginPath(); g.ellipse(cx, baseY, hr, vr, 0, Math.PI, TAU); g.closePath(); g.clip();
    const inside = g.createLinearGradient(0, baseY - vr, 0, baseY);
    inside.addColorStop(0, "#16323d"); inside.addColorStop(1, "#2c3f36"); g.fillStyle = inside; g.fillRect(cx - hr, baseY - vr, hr * 2, vr);
    glow(g, cx, baseY, hr * 0.9, "#ffb86a", 0.35);
    for (let k = 0; k < 7; k++) {
      const bx = cx - hr * 0.75 + (k / 6) * hr * 1.5;
      ellipse(g, bx, baseY - u * 0.8, u * (1.4 + hash(k, Math.round(d.x), 52) * 1.2), u * (1.2 + hash(k, 3, 53) * 1.6), k % 2 ? "#3f8a4e" : "#5aa85c");
    }
    g.fillStyle = "rgba(160,225,245,.14)"; g.fillRect(cx - hr, baseY - vr, hr * 2, vr);
    g.strokeStyle = "rgba(185,225,240,.35)"; g.lineWidth = u * 0.35;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.ellipse(cx, baseY, Math.max(0.1, hr * Math.abs(k) / 3.4), vr, 0, Math.PI, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(cx - hr, baseY - vr * 0.5); g.quadraticCurveTo(cx, baseY - vr * 0.62, cx + hr, baseY - vr * 0.5); g.stroke();
    g.restore();
    g.strokeStyle = "#9aa3b0"; g.lineWidth = u * 0.8;
    g.beginPath(); g.ellipse(cx, baseY, hr, vr, 0, Math.PI, TAU); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.65)"; g.lineWidth = u * 0.6;
    g.beginPath(); g.ellipse(cx, baseY, hr * 0.82, vr * 0.82, 0, Math.PI * 1.15, Math.PI * 1.42); g.stroke();
  }
  g.restore();
}

function hazardRing(g: Ctx, x0: number, y0: number, w: number, h: number, band: number, T: number) {
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.rect(x0 + band, y0 + band, w - band * 2, h - band); g.clip("evenodd");
  g.fillStyle = "#f0bd2c"; g.fillRect(x0, y0, w, h);
  g.fillStyle = "#15161a";
  const per = T / 4;
  for (let k = Math.floor((x0 - h) / per); k <= Math.ceil((x0 + w) / per); k++) {
    const sx = k * per;
    g.beginPath(); g.moveTo(sx, y0); g.lineTo(sx + per / 2, y0); g.lineTo(sx + per / 2 + h, y0 + h); g.lineTo(sx + h, y0 + h); g.fill();
  }
  g.restore();
}

function airlock(g: Ctx, T: number, ax: number) {
  const u = T / 16, x0 = ax * T + T * 0.16, x1 = (ax + 2) * T - T * 0.16, top = T * 1.34, bot = 3 * T, w = x1 - x0;
  roundRect(g, x0 - u * 2.5, top - u * 3, w + u * 5, bot - top + u * 3, u * 2, "rgba(25,8,4,.6)");
  g.fillStyle = "#565d69"; g.fillRect(x0 - u, top - u, w + u * 2, bot - top + u);
  g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(x0 - u, top - u, w + u * 2, u * 0.5);
  hazardRing(g, x0, top, w, bot - top, u * 2.2, T);
  const ix = x0 + u * 2.2, iy = top + u * 2.2, iw = w - u * 4.4, ih = bot - iy;
  g.fillStyle = "#1a1d23"; g.fillRect(ix, iy, iw, ih);
  const pw = iw / 2 - u * 0.3;
  for (let s = 0; s < 2; s++) {
    const dx = ix + s * (iw / 2 + u * 0.3);
    const grd = g.createLinearGradient(dx, 0, dx + pw, 0);
    grd.addColorStop(0, s ? "#727a87" : "#9aa2ae"); grd.addColorStop(1, s ? "#8d95a1" : "#7c8490");
    g.fillStyle = grd; g.fillRect(dx, iy, pw, ih);
    for (let r = 1; r < 5; r++) { g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(dx + u, iy + (ih * r) / 5, pw - u * 2, u * 0.5); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(dx + u, iy + (ih * r) / 5 + u * 0.5, pw - u * 2, u * 0.3); }
    roundRect(g, dx + pw * 0.22, iy + ih * 0.16, pw * 0.56, ih * 0.2, u, "#0b1b24", "#4b525e", u * 0.5);
    g.fillStyle = "rgba(120,230,255,.35)"; g.fillRect(dx + pw * 0.3, iy + ih * 0.19, pw * 0.14, u * 0.6);
    g.fillStyle = "#3a404a"; g.fillRect(s ? dx + u * 0.8 : dx + pw - u * 1.6, iy + ih * 0.5, u * 0.8, ih * 0.22);
  }
  // lintel plate with invented glyphs and a status lamp
  g.fillStyle = "#22262d"; g.fillRect(x0 + w * 0.25, top - u * 4.2, w * 0.5, u * 2.6);
  for (let k = 0; k < 5; k++) { g.fillStyle = "#6fe6f5"; g.fillRect(x0 + w * 0.3 + k * u * 1.6, top - u * 3.4, u * (0.6 + hash(ax, k, 5) * 0.6), u * 1.1); }
  ellipse(g, x0 + w * 0.5, top - u * 5.2, u * 1.1, u * 0.8, "#1e3a2a");
  // keypad on the rock beside it
  roundRect(g, x1 + u * 1.6, top + T * 0.5, u * 3, u * 4, u * 0.5, "#4a515c", "#23272e", u * 0.4);
  g.fillStyle = "#9bf2a8"; g.fillRect(x1 + u * 2.2, top + T * 0.5 + u * 0.7, u * 1.8, u * 0.8);
  for (let k = 0; k < 4; k++) { g.fillStyle = "#b9c0ca"; g.fillRect(x1 + u * (2.1 + (k % 2) * 1.2), top + T * 0.5 + u * (2 + Math.floor(k / 2) * 1.1), u * 0.7, u * 0.6); }
}

function craters(g: Ctx, T: number) {
  const u = T / 16;
  for (const c of CRATERS) {
    const cx = c.x * T, cy = c.y * T, r = c.r * T, ry = r * 0.55;
    ellipse(g, cx, cy + ry * 0.1, r * 1.45, ry * 1.45, "rgba(235,160,110,.16)");
    ellipse(g, cx + r * 0.08, cy + ry * 0.2, r * 1.08, ry * 1.08, "rgba(70,20,8,.25)");
    ellipse(g, cx, cy, r, ry, "#d98c5d");
    const bowl = g.createLinearGradient(0, cy - ry * 0.8, 0, cy + ry * 0.8);
    bowl.addColorStop(0, "#5a2210"); bowl.addColorStop(0.6, "#8d3d22"); bowl.addColorStop(1, "#b9603a");
    g.fillStyle = bowl; g.beginPath(); g.ellipse(cx, cy + ry * 0.08, r * 0.8, ry * 0.76, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,215,175,.7)"; g.lineWidth = Math.max(1, u * 0.6);
    g.beginPath(); g.ellipse(cx, cy, r * 0.97, ry * 0.97, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.strokeStyle = "rgba(255,200,160,.35)";
    g.beginPath(); g.ellipse(cx, cy + ry * 0.08, r * 0.78, ry * 0.74, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    for (let k = 0; k < 3; k++) {
      const bx = cx + (hash(k, Math.round(c.x * 10), 55) - 0.5) * r, by = cy + (hash(k, Math.round(c.y * 10), 56) - 0.3) * ry * 0.8;
      ellipse(g, bx, by, u * 0.8, u * 0.5, "#6e2c16");
      g.fillStyle = "rgba(255,200,160,.4)"; g.fillRect(bx - u * 0.5, by - u * 0.5, u * 0.6, u * 0.3);
    }
  }
}

function bez(p: [P, P, P, P], t: number): P {
  const m = 1 - t;
  const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
}
function tracks(g: Ctx, T: number) {
  const u = T / 16;
  for (const tr of TRACKS) {
    const N = 140;
    for (let side = -1; side <= 1; side += 2)
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), [ax, ay] = bez(tr.p, t), [bx, by] = bez(tr.p, Math.min(1, t + 0.005));
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const px = (ax + nx * 0.17 * side) * T, py = (ay + ny * 0.17 * side * 0.6) * T;
        const a = tr.a0 + (1 - tr.a0) * sstep(0, 0.35, t);
        g.save(); g.translate(px, py); g.rotate(Math.atan2(dy, dx));
        g.fillStyle = `rgba(90,28,12,${0.22 * a})`; g.fillRect(-u * 0.9, -u * 0.55, u * 1.8, u * 1.1);
        if (i % 2 === 0) { g.fillStyle = `rgba(60,18,6,${0.3 * a})`; g.fillRect(-u * 0.25, -u * 0.6, u * 0.5, u * 1.2); }
        g.fillStyle = `rgba(245,175,125,${0.18 * a})`; g.fillRect(-u * 0.9, u * 0.55, u * 1.8, u * 0.35);
        g.restore();
      }
  }
}

function inPlanet(px: number, py: number, T: number) {
  const dx = px / T - PLANET.x, dy = py / T - PLANET.y;
  return dx * dx + dy * dy < (PLANET.r + 0.05) ** 2;
}
function bodies(g: Ctx, T: number) {
  const u = T / 16;
  g.save();
  g.beginPath(); g.moveTo(0, H * T);
  for (let i = 0; i <= W * 16; i++) g.lineTo((i / 16) * T, (13 + lipAt(i / 16)) * T - 1);
  g.lineTo(W * T, H * T); g.closePath(); g.clip();
  g.globalCompositeOperation = "lighter";
  for (const [nx, ny, nr, col, a] of NEBULA) {
    g.save(); g.translate(nx * T, ny * T); g.scale(1, 0.45);
    glow(g, 0, 0, nr * T, col, a);
    g.restore();
  }
  g.restore();
  g.save(); g.beginPath(); g.rect(0, VOID_TOP * T, W * T, (H - VOID_TOP) * T); g.clip();
  const cx = PLANET.x * T, cy = PLANET.y * T, r = PLANET.r * T;
  const halo = g.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.18);
  halo.addColorStop(0, "rgba(120,210,255,.45)"); halo.addColorStop(1, "rgba(120,210,255,0)");
  g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, r * 1.18, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip();
  const body = g.createRadialGradient(cx - r * 0.35, cy - r * 0.55, r * 0.1, cx, cy, r);
  body.addColorStop(0, "#d6efe9"); body.addColorStop(0.45, "#7fb7c9"); body.addColorStop(1, "#1f3f5c");
  g.fillStyle = body; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  for (let k = 0; k < 9; k++) { // curved cloud bands
    const by = cy - r + r * 0.12 * k + hash(k, 0, 57) * r * 0.05;
    g.strokeStyle = k % 2 ? "rgba(255,255,255,.16)" : "rgba(30,70,100,.18)";
    g.lineWidth = u * (1 + hash(k, 0, 58) * 3);
    g.beginPath(); g.ellipse(cx, by + r * 0.9, r * 1.4, r * 0.95, -0.12, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  }
  const night = g.createLinearGradient(cx - r * 0.6, cy - r, cx + r, cy);
  night.addColorStop(0, "rgba(3,5,15,0)"); night.addColorStop(0.55, "rgba(3,5,15,0)"); night.addColorStop(1, "rgba(3,5,15,.8)");
  g.fillStyle = night; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
  g.strokeStyle = "rgba(200,240,255,.7)"; g.lineWidth = u * 0.6;
  g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.08, Math.PI * 1.62); g.stroke();
  // a small lumpy moon
  const mx = MOON.x * T, my = MOON.y * T, mr = MOON.r * T;
  const mg = g.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, "#c9b8a8"); mg.addColorStop(1, "#4a3c36");
  g.fillStyle = mg; g.beginPath(); g.ellipse(mx, my, mr, mr * 0.86, 0.3, 0, TAU); g.fill();
  for (let k = 0; k < 4; k++) ellipse(g, mx + (hash(k, 1, 59) - 0.5) * mr, my + (hash(k, 2, 59) - 0.5) * mr * 0.8, mr * 0.16, mr * 0.12, "rgba(40,30,28,.45)");
  g.restore();
}

/* ---------- props ---------- */
function antennaBlink(x: number, y: number, time: number) { return wrap(time + hash(x, y, 4) * 3, 1.8) < 0.4; }

function tall(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const cx = x * T + T / 2, by = (y + 1) * T, u = T / 16, ph = hash(x, y, 4) * TAU;
  shadow(ctx, cx + T * 0.08, by - T * 0.12, T * 0.46, T * 0.15, 0.3);
  ctx.fillStyle = "#4a505a"; ctx.fillRect(cx - T * 0.38, by - T * 0.22, T * 0.76, T * 0.12);
  ctx.fillStyle = "#838b97"; ctx.fillRect(cx - T * 0.38, by - T * 0.22, T * 0.76, u * 0.6);
  const baseY = by - T * 0.22, Ht = T * 1.88, topY = baseY - Ht, bw = T * 0.3, tw = T * 0.08, S = 6;
  const lx = (k: number) => cx - (bw + (tw - bw) * k), rx = (k: number) => cx + (bw + (tw - bw) * k), yk = (k: number) => baseY - Ht * k;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4b525d"; ctx.lineWidth = u * 0.55;
  for (let s = 0; s < S; s++) {
    const k0 = s / S, k1 = (s + 1) / S;
    ctx.beginPath(); ctx.moveTo(lx(k0), yk(k0)); ctx.lineTo(rx(k1), yk(k1)); ctx.moveTo(rx(k0), yk(k0)); ctx.lineTo(lx(k1), yk(k1));
    ctx.moveTo(lx(k1), yk(k1)); ctx.lineTo(rx(k1), yk(k1)); ctx.stroke();
  }
  ctx.strokeStyle = "#8f98a6"; ctx.lineWidth = u * 1.1;
  ctx.beginPath(); ctx.moveTo(lx(0), yk(0)); ctx.lineTo(lx(1), yk(1)); ctx.moveTo(rx(0), yk(0)); ctx.lineTo(rx(1), yk(1)); ctx.stroke();
  ctx.strokeStyle = "#d0d6de"; ctx.lineWidth = u * 0.4;
  ctx.beginPath(); ctx.moveTo(lx(0) + u * 0.2, yk(0)); ctx.lineTo(lx(1) + u * 0.2, yk(1)); ctx.stroke();
  // warning bands on the top section
  for (let k = 0; k < 3; k++) { const yy = yk(0.84 + k * 0.05); ctx.fillStyle = k % 2 ? "#f2f2f2" : "#d8412f"; ctx.fillRect(lx(0.86 + k * 0.05) - u * 0.4, yy, rx(0.86 + k * 0.05) - lx(0.86 + k * 0.05) + u * 0.8, u * 0.9); }
  // equipment box with a cyan status diode
  roundRect(ctx, cx - T * 0.16, yk(0.3) - T * 0.18, T * 0.32, T * 0.2, u * 0.6, "#c9ced6", "#4b525d", u * 0.4);
  ctx.fillStyle = "#2d333c"; ctx.fillRect(cx - T * 0.1, yk(0.3) - T * 0.13, T * 0.12, u * 0.6);
  ctx.fillStyle = wrap(time * 1.7 + ph, 1) < 0.55 ? "#7af6ff" : "#1f5360"; ctx.fillRect(cx + T * 0.06, yk(0.3) - T * 0.13, u, u);
  // rotating dish
  const pivY = topY - T * 0.12, a = time * 0.55 + ph, c = Math.cos(a), sn = Math.sin(a), R = T * 0.33;
  ctx.fillStyle = "#3a4049"; ctx.fillRect(cx - u * 0.6, pivY, u * 1.2, topY - pivY + u);
  ctx.fillStyle = "#2c3139"; ctx.fillRect(cx - T * 0.14, topY - u * 0.6, T * 0.28, u * 1.4);
  const drawArm = () => {
    ctx.strokeStyle = "#aab1bb"; ctx.lineWidth = u * 0.45;
    const fx = cx + sn * T * 0.24;
    ctx.beginPath(); ctx.moveTo(cx - Math.abs(c) * R * 0.6, pivY - R * 0.6); ctx.lineTo(fx, pivY); ctx.lineTo(cx - Math.abs(c) * R * 0.6, pivY + R * 0.6); ctx.stroke();
    ellipse(ctx, fx, pivY, u * 0.9, u * 0.9, "#e4e8ec");
  };
  const rx2 = Math.max(u * 0.7, R * Math.abs(c));
  if (c < 0) drawArm();
  const face = ctx.createLinearGradient(cx - rx2, pivY - R, cx + rx2, pivY + R);
  if (c >= 0) { face.addColorStop(0, "#f2f4f6"); face.addColorStop(1, "#8e97a3"); } else { face.addColorStop(0, "#8d95a0"); face.addColorStop(1, "#4d545e"); }
  ctx.fillStyle = face; ctx.beginPath(); ctx.ellipse(cx, pivY, rx2, R, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#5a616c"; ctx.lineWidth = u * 0.5; ctx.stroke();
  if (c >= 0) { ctx.strokeStyle = "rgba(90,100,115,.5)"; ctx.beginPath(); ctx.ellipse(cx, pivY, rx2 * 0.6, R * 0.6, 0, 0, TAU); ctx.stroke(); drawArm(); }
  else { ctx.strokeStyle = "rgba(40,45,52,.7)"; ctx.beginPath(); ctx.moveTo(cx, pivY - R); ctx.lineTo(cx, pivY + R); ctx.moveTo(cx - rx2, pivY); ctx.lineTo(cx + rx2, pivY); ctx.stroke(); }
  // spire and beacon
  ctx.strokeStyle = "#9aa2ad"; ctx.lineWidth = u * 0.35;
  ctx.beginPath(); ctx.moveTo(cx + T * 0.12, topY); ctx.lineTo(cx + T * 0.12, by - T * 2.58); ctx.stroke();
  ellipse(ctx, cx + T * 0.12, by - T * 2.6, u * 0.8, u * 0.8, antennaBlink(x, y, time) ? "#ff5a4a" : "#5e1a16");
}

function roverLed(x: number, y: number, T: number): P {
  const flip = hash(x, y, 5) > 0.5 ? -1 : 1;
  return [x * T + T / 2 + flip * T * 0.26 * 1.2, (y + 1) * T - T * 1.2];
}
function rover(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const cx = x * T + T / 2, by = (y + 1) * T, u = T / 16, flip = hash(x, y, 5) > 0.5 ? -1 : 1;
  shadow(ctx, cx, by - T * 0.1, T * 0.5, T * 0.13, 0.28);
  ctx.save(); ctx.translate(cx, 0); ctx.scale(flip, 1);
  const wy = by - T * 0.16, wr = T * 0.12;
  ctx.strokeStyle = "#5f6670"; ctx.lineWidth = u * 0.7;
  ctx.beginPath(); ctx.moveTo(-T * 0.34, wy); ctx.lineTo(-T * 0.17, by - T * 0.34); ctx.lineTo(0, wy); ctx.moveTo(-T * 0.17, by - T * 0.34); ctx.lineTo(T * 0.2, by - T * 0.34); ctx.lineTo(T * 0.34, wy); ctx.stroke();
  for (const wx of [-0.34, 0, 0.34]) {
    ellipse(ctx, wx * T, wy, wr, wr, "#24262b");
    for (let k = 0; k < 6; k++) { const ang = (k / 6) * TAU; ctx.fillStyle = "#44474e"; ctx.fillRect(wx * T + Math.cos(ang) * wr * 0.8 - u * 0.3, wy + Math.sin(ang) * wr * 0.8 - u * 0.3, u * 0.6, u * 0.6); }
    ellipse(ctx, wx * T, wy, wr * 0.45, wr * 0.45, "#a3aab4");
    ellipse(ctx, wx * T - u * 0.3, wy - u * 0.3, wr * 0.15, wr * 0.15, "#e8ecf0");
  }
  roundRect(ctx, -T * 0.4, by - T * 0.58, T * 0.8, T * 0.24, u * 0.8, "#e6e8ec", "#6b727c", u * 0.4);
  ctx.fillStyle = "#c9a54a"; ctx.fillRect(-T * 0.36, by - T * 0.42, T * 0.36, T * 0.06);
  ctx.fillStyle = "rgba(255,240,180,.5)"; ctx.fillRect(-T * 0.36, by - T * 0.42, T * 0.36, u * 0.3);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = "#3c424b"; ctx.fillRect(T * 0.06 + k * u * 1.4, by - T * 0.53, u * 0.7, T * 0.11); }
  // solar deck
  ctx.fillStyle = "#27467c";
  ctx.beginPath(); ctx.moveTo(-T * 0.46, by - T * 0.6); ctx.lineTo(T * 0.36, by - T * 0.6); ctx.lineTo(T * 0.3, by - T * 0.7); ctx.lineTo(-T * 0.4, by - T * 0.7); ctx.fill();
  ctx.strokeStyle = "rgba(150,190,240,.6)"; ctx.lineWidth = u * 0.25;
  for (let k = 1; k < 6; k++) { const sx = -T * 0.46 + (k / 6) * T * 0.82; ctx.beginPath(); ctx.moveTo(sx, by - T * 0.6); ctx.lineTo(sx + T * 0.05, by - T * 0.7); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(-T * 0.4, by - T * 0.7, T * 0.7, u * 0.3);
  // mast camera and whip antenna
  ctx.fillStyle = "#8a919b"; ctx.fillRect(T * 0.24, by - T * 0.98, u * 0.8, T * 0.38);
  roundRect(ctx, T * 0.14, by - T * 1.08, T * 0.26, T * 0.14, u * 0.5, "#dfe3e8", "#5e656f", u * 0.35);
  ellipse(ctx, T * 0.36, by - T * 1.01, u * 0.9, u * 0.9, "#1b2027");
  ellipse(ctx, T * 0.35, by - T * 1.02, u * 0.3, u * 0.3, "#9fdcff");
  ctx.fillStyle = wrap(time * 1.3 + hash(x, y, 6), 1) < 0.5 ? "#7af6ff" : "#1f5360"; ctx.fillRect(T * 0.2, by - T * 1.03, u * 0.9, u * 0.9);
  ctx.strokeStyle = "#b5bcc5"; ctx.lineWidth = u * 0.3;
  ctx.beginPath(); ctx.moveTo(-T * 0.32, by - T * 0.7); ctx.lineTo(-T * 0.36, by - T * 1.12); ctx.stroke();
  ellipse(ctx, -T * 0.36, by - T * 1.13, u * 0.5, u * 0.5, "#e4e8ec");
  ctx.restore();
}
function crates(ctx: Ctx, T: number, x: number, y: number, time: number) {
  const cx = x * T + T / 2, by = (y + 1) * T, u = T / 16;
  shadow(ctx, cx, by - T * 0.1, T * 0.48, T * 0.14, 0.28);
  const box = (x0: number, y0: number, w: number, h: number, body: string, cap: string) => {
    ctx.fillStyle = body; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x0, y0, w, u * 0.5);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x0 + w - u * 1.2, y0, u * 1.2, h);
    ctx.fillStyle = cap; ctx.fillRect(x0, y0, u * 1.6, u * 1.6); ctx.fillRect(x0 + w - u * 1.6, y0, u * 1.6, u * 1.6);
    ctx.fillRect(x0, y0 + h - u * 1.6, u * 1.6, u * 1.6); ctx.fillRect(x0 + w - u * 1.6, y0 + h - u * 1.6, u * 1.6, u * 1.6);
    ctx.strokeStyle = "rgba(20,20,25,.55)"; ctx.lineWidth = u * 0.4; ctx.strokeRect(x0, y0, w, h);
  };
  box(cx - T * 0.4, by - T * 0.5, T * 0.66, T * 0.4, "#d8dce2", "#e0662c");
  ctx.save(); ctx.beginPath(); ctx.rect(cx - T * 0.34, by - T * 0.2, T * 0.54, u * 1.3); ctx.clip();
  ctx.fillStyle = "#f0bd2c"; ctx.fillRect(cx - T * 0.34, by - T * 0.2, T * 0.54, u * 1.3);
  ctx.fillStyle = "#15161a"; for (let k = 0; k < 7; k++) { const sx = cx - T * 0.36 + k * u * 1.6; ctx.beginPath(); ctx.moveTo(sx, by - T * 0.2); ctx.lineTo(sx + u * 0.8, by - T * 0.2); ctx.lineTo(sx + u * 2.1, by - T * 0.2 + u * 1.3); ctx.lineTo(sx + u * 1.3, by - T * 0.2 + u * 1.3); ctx.fill(); }
  ctx.restore();
  for (let k = 0; k < 4; k++) { ctx.fillStyle = "#3a3f48"; ctx.fillRect(cx - T * 0.28 + k * u * 1.5, by - T * 0.42, u * (0.6 + hash(x, k, 7) * 0.5), u * 1.6); }
  ctx.fillStyle = wrap(time * 0.9 + hash(x, y, 6), 1) < 0.6 ? "#7dff9a" : "#1f4a2c"; ctx.fillRect(cx + T * 0.12, by - T * 0.42, u, u);
  box(cx - T * 0.28, by - T * 0.82, T * 0.46, T * 0.32, "#e0662c", "#8e3a1a");
  ctx.fillStyle = "#fff4e6"; ctx.fillRect(cx - T * 0.18, by - T * 0.72, T * 0.2, u * 1.1);
  // gas canister
  const gx = cx + T * 0.3;
  roundRect(ctx, gx, by - T * 0.66, T * 0.16, T * 0.56, u * 1.2, "#8f97a2", "#3c424b", u * 0.4);
  ctx.fillStyle = "#43d7ee"; ctx.fillRect(gx, by - T * 0.44, T * 0.16, u);
  ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(gx + u * 0.6, by - T * 0.62, u * 0.5, T * 0.4);
}

/* ---------- the theme ---------- */
export const space: Theme = {
  id: "space",
  label: "Mars base",
  blurb: "Red dust, domes and starlight",
  place: "on a base on Mars",
  stageBg: "#05060f",
  swatch: ["#c1602f", "#05060f"],
  lines: { barrier: "No tether reaches that far", blocked: "Can’t walk there" },
  tile,
  extras(g, T) {
    domes(g, T);
    for (const ax of AIRLOCKS) airlock(g, T, ax);
    tracks(g, T);
    craters(g, T);
    const u = T / 16;
    for (const b of BOULDERS) {
      const bx = b.x * T, by = b.y * T, r = b.r * T;
      ellipse(g, bx + r * 0.35, by + r * 0.45, r * 1.25, r * 0.45, "rgba(50,14,6,.35)");
      g.fillStyle = "#6e2e19"; g.beginPath(); g.moveTo(bx - r, by + r * 0.4); g.lineTo(bx - r * 0.8, by - r * 0.35); g.lineTo(bx - r * 0.2, by - r * 0.75);
      g.lineTo(bx + r * 0.6, by - r * 0.55); g.lineTo(bx + r, by + r * 0.1); g.lineTo(bx + r * 0.7, by + r * 0.5); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,190,140,.45)"; g.beginPath(); g.moveTo(bx - r * 0.8, by - r * 0.35); g.lineTo(bx - r * 0.2, by - r * 0.75); g.lineTo(bx + r * 0.6, by - r * 0.55); g.lineTo(bx - r * 0.1, by - r * 0.2); g.closePath(); g.fill();
      g.fillStyle = "rgba(40,10,4,.35)"; g.fillRect(bx + r * 0.1, by, r * 0.8, u * 0.5);
    }
    bodies(g, T);
  },
  live(ctx, T, time, animated, v) {
    if (v.y1 < 13) return;
    const t = animated ? time : 0, u = T / 16;
    ctx.save(); ctx.beginPath(); ctx.rect(v.x0 * T, VOID_TOP * T, (v.x1 - v.x0 + 1) * T, (H - VOID_TOP) * T); ctx.clip();
    // twinkling stars
    for (let y = Math.max(13, v.y0); y <= v.y1; y++)
      for (let x = v.x0; x <= v.x1; x++)
        for (let k = 0; k < 2; k++) {
          const sx = (x + hash(x, y, 50 + k)) * T, sy = (y + hash(x, y, 60 + k)) * T;
          if (sy < VOID_TOP * T || inPlanet(sx, sy, T)) continue;
          const h1 = hash(x, y, 70 + k), tw = 0.5 + 0.5 * Math.sin(t * (1.2 + h1 * 2.6) + h1 * TAU);
          const a = 0.2 + 0.8 * tw * tw, big = hash(x, y, 80 + k) > 0.82;
          ctx.fillStyle = big ? `rgba(255,236,200,${a})` : `rgba(215,228,255,${a})`;
          const s = big ? u : u * 0.6;
          ctx.fillRect(sx, sy, s, s);
          if (big && tw > 0.75) { ctx.fillStyle = `rgba(255,240,210,${(tw - 0.75) * 1.6})`; ctx.fillRect(sx - u * 1.2, sy + s / 2 - u * 0.15, u * 2.4 + s, u * 0.3); ctx.fillRect(sx + s / 2 - u * 0.15, sy - u * 1.2, u * 0.3, u * 2.4 + s); }
        }
    // a slow drifting star field
    for (let i = 0; i < 28; i++) {
      const sx = wrap(r01(i, 7) * W - t * (0.05 + 0.05 * r01(i, 8)), W) * T, sy = (VOID_TOP + 0.1 + r01(i, 9) * (H - VOID_TOP - 0.2)) * T;
      if (sx < v.x0 * T - T || sx > (v.x1 + 1) * T || inPlanet(sx, sy, T)) continue;
      ctx.fillStyle = `rgba(190,210,255,${0.3 + 0.4 * r01(i, 10)})`; ctx.fillRect(sx, sy, u * 0.5, u * 0.5);
    }
    if (animated) {
      // shooting star
      const P = 6.5, n = Math.floor(t / P), f = (t - n * P) / 0.9;
      if (f < 1) {
        const x0 = (1 + r01(n, 3) * 17) * T, y0 = (13.9 + r01(n, 4) * 1.4) * T, dx = T * 5.5, dy = T * 1.6;
        const hx = x0 + dx * f, hy = y0 + dy * f, tl = 0.3;
        const grd = ctx.createLinearGradient(hx - dx * tl, hy - dy * tl, hx, hy);
        grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(1, `rgba(255,250,235,${0.9 * (1 - f)})`);
        ctx.strokeStyle = grd; ctx.lineWidth = u * 0.6; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(hx - dx * tl, hy - dy * tl); ctx.lineTo(hx, hy); ctx.stroke();
      }
    }
    // satellite
    const satX = (wrap(t * 0.32 + 4, W + 6) - 3) * T, satY = (15.0 + Math.sin(t * 0.3) * 0.2) * T;
    if (satX > v.x0 * T - T * 2 && satX < (v.x1 + 2) * T) {
      ctx.save(); ctx.translate(satX, satY); ctx.rotate(Math.sin(t * 0.2) * 0.25);
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#223f78"; ctx.fillRect(s < 0 ? -u * 9 : u * 2, -u * 1.6, u * 7, u * 3.2);
        ctx.fillStyle = "rgba(150,190,240,.5)"; for (let k = 1; k < 4; k++) ctx.fillRect((s < 0 ? -u * 9 : u * 2) + k * u * 1.75, -u * 1.6, u * 0.25, u * 3.2);
        ctx.fillStyle = "#8b929c"; ctx.fillRect(s < 0 ? -u * 2 : u * 1.2, -u * 0.2, u * 0.8, u * 0.4);
      }
      ctx.fillStyle = "#d8b24c"; ctx.fillRect(-u * 1.3, -u * 1.3, u * 2.6, u * 2.6);
      ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillRect(-u * 1.3, -u * 1.3, u * 2.6, u * 0.4);
      ctx.strokeStyle = "#c9ced6"; ctx.lineWidth = u * 0.3; ctx.beginPath(); ctx.moveTo(0, -u * 1.3); ctx.lineTo(0, -u * 3); ctx.stroke();
      if (wrap(t, 1.2) < 0.15) { ctx.fillStyle = "#ff6a5a"; ctx.fillRect(-u * 0.4, -u * 3.4, u * 0.8, u * 0.8); }
      ctx.restore();
    }
    ctx.restore();
  },
  tall: (ctx, T, x, y, time) => tall(ctx, T, x, y, time),
  small(ctx, T, x, y, time) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    ctx.save(); ctx.translate(cx, by); ctx.scale(1.2, 1.2); ctx.translate(-cx, -by);
    (isRover(x) ? rover : crates)(ctx, T, x, y, time);
    ctx.restore();
  },
  sign(ctx, T, s) {
    const px = s.x * T, by = (s.y + 1) * T, u = T / 16, lift = T * 0.08;
    shadow(ctx, px + T / 2, by - T * 0.1, T * 0.4, T * 0.12, 0.26);
    ctx.fillStyle = "#3a3f48"; ctx.fillRect(px + T * 0.26, by - T * 0.18, T * 0.48, T * 0.08);
    for (const ox of [0.3, 0.62]) {
      ctx.fillStyle = "#6b7482"; ctx.fillRect(px + T * ox, by - T * 0.8, T * 0.08, T * 0.64);
      ctx.fillStyle = "#a9b1bc"; ctx.fillRect(px + T * ox, by - T * 0.8, u * 0.4, T * 0.64);
    }
    roundRect(ctx, px - u * 0.4, by + lift - T * 1.36, T + u * 0.8, T * 0.64, u * 1.6, "#8c95a2", "#2f343c", u * 0.5);
    roundRect(ctx, px + u * 0.8, by + lift - T * 1.29, T - u * 1.6, T * 0.5, u, "#2a2f37");
    roundRect(ctx, px + u * 1.4, by + lift - T * 1.26, T - u * 2.8, T * 0.44, u * 0.6, "#04111a");
    ctx.fillStyle = "rgba(80,220,255,.07)";
    for (let k = 0; k < 7; k++) ctx.fillRect(px + u * 1.4, by + lift - T * 1.26 + k * u, T - u * 2.8, u * 0.4);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glow(ctx, px + T / 2, by + lift - T * 1.04, T * 0.8, "#3ee8ff", 0.22);
    ctx.restore();
    for (const [bx, byy] of [[1.5, 1.3], [14.5, 1.3], [1.5, 9.4], [14.5, 9.4]] as P[]) ellipse(ctx, px + u * bx, by + lift - T * 1.36 + u * byy, u * 0.45, u * 0.45, "#d7dde5");
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(T * 0.24)}px "Pixelify Sans", monospace`;
    ctx.fillStyle = "rgba(60,230,255,.45)"; ctx.fillText(s.label ?? "", px + T / 2 + u * 0.35, by + lift - T * 1.03);
    ctx.fillText(s.label ?? "", px + T / 2 - u * 0.35, by + lift - T * 1.03);
    ctx.fillStyle = "#b8fbff"; ctx.fillText(s.label ?? "", px + T / 2, by + lift - T * 1.03);
    ctx.fillStyle = "#7dff9a"; ctx.fillRect(px + T - u * 2.6, by + lift - T * 0.89, u * 0.7, u * 0.7);
  },
  grade(ctx, _T, v) {
    ctx.save(); ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "#e1e6f4"; ctx.fillRect(v.cx, v.cy, v.vw, v.vh);
    ctx.restore();
  },
  lights(ctx, T, time, animated, v) {
    const t = animated ? time : 0, u = T / 16;
    ctx.globalCompositeOperation = "lighter";
    const inView = (wx: number, wy: number, m: number) => wx > v.x0 * T - m && wx < (v.x1 + 1) * T + m && wy > v.y0 * T - m && wy < (v.y1 + 1) * T + m;
    // runway lights chasing along the pad edge
    if (v.y1 >= 12)
      for (let x = v.x0; x <= v.x1; x++) {
        const ph = wrap(t * 7 - x, W), on = animated ? Math.max(0, 1 - ph / 3) : 0.5;
        const lx = x * T + T / 2, ly = 12 * T + T * 0.86 + u * 1.2;
        glow(ctx, lx, ly, T * (0.35 + 0.3 * on), "#ffae3a", 0.12 + 0.55 * on);
        ellipse(ctx, lx, ly, u * 0.8, u * 0.45, `rgba(255,220,150,${0.25 + 0.75 * on})`);
      }
    // antenna beacons
    for (const [x, y] of PALMS) {
      const bx = x * T + T / 2 + T * 0.12, byy = (y + 1) * T - T * 2.6;
      if (!inView(bx, byy, T)) continue;
      const on = antennaBlink(x, y, t);
      glow(ctx, bx, byy, T * (on ? 0.55 : 0.2), "#ff4a3a", on ? 0.55 : 0.1);
    }
    // habitat: mast beacon, window spill, airlock lamps
    if (v.y0 <= 2) {
      const mOn = wrap(t, 2.2) < 0.35;
      glow(ctx, MAST.x * T, MAST.top * T, T * (mOn ? 0.5 : 0.18), "#ff4a3a", mOn ? 0.6 : 0.12);
      for (const d of DOMES) glow(ctx, d.x * T, T * 0.58, d.r * T * 0.9, "#ffb86a", 0.08 + 0.03 * Math.sin(t * 0.8 + d.x));
      for (const ax of AIRLOCKS) {
        const lx = ax * T + T, ly = T * 1.34 - u * 5.2, cyc = wrap(t * 0.6 + ax * 0.13, 1);
        glow(ctx, lx, ly, T * 0.45, "#5bff9a", 0.22 + 0.25 * Math.max(0, Math.sin(cyc * TAU)));
        ellipse(ctx, lx, ly, u * 0.9, u * 0.6, "rgba(160,255,190,.7)");
      }
    }
    // status lights on rovers and crates
    for (const [x, y] of PARASOLS) {
      if (!isRover(x)) continue;
      const [lx, ly] = roverLed(x, y, T);
      if (!inView(lx, ly, T)) continue;
      if (wrap(t * 1.3 + hash(x, y, 6), 1) < 0.5) glow(ctx, lx, ly, T * 0.3, "#5ef0ff", 0.4);
    }
    // low-gravity dust motes, drifting and settling slowly
    for (let i = 0; i < 46; i++) {
      const mx = wrap(r01(i, 1) * W + t * (0.06 + 0.1 * r01(i, 2)), W) * T;
      const my = (3.6 + r01(i, 3) * 8.8 + Math.sin(t * (0.3 + 0.3 * r01(i, 4)) + i) * 0.35) * T;
      if (!inView(mx, my, 0)) continue;
      const a = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.7));
      ctx.fillStyle = `rgba(255,205,165,${a})`;
      const s = u * (0.5 + r01(i, 5) * 0.6);
      ctx.fillRect(mx, my, s, s);
    }
  },
};
