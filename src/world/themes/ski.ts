// Ski village: a cosy alpine village on a bright cold day. Chalets along the
// top, a timber terrace, fresh snow where everyone stands, a packed ridge and
// a frozen lake nobody should walk on. Big pictures live in ./ski-village.
import { Ground, H, W, hash } from "../map";
import { blocks, ellipse, glow, mix, r01, rgb, roundRect, shadow, vnoise, wrap, type Ctx } from "./kit";
import { CHIMNEYS, SNOW, WINDOW_LIGHTS, drawPine, extras } from "./ski-village";
import type { Theme } from "./types";

type RGB = [number, number, number];
/** Mix in numbers, so a mix can be mixed again (kit's mix returns a css string). */
const mx = (a: RGB, b: RGB, t: number): RGB => { const k = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const C = (hex: string) => rgb(hex);

function tile(g: Ctx, t: Ground, x: number, y: number, T: number) {
  const px = x * T, py = y * T, u = T / 16;
  switch (t) {
    case Ground.Town:
    case Ground.Cliff:
      // Painted over by the chalet row; a sky-to-snow fallback underneath.
      g.fillStyle = y === 0 ? "#b8def5" : "#e6f0f8"; g.fillRect(px, py, T, T);
      return;
    case Ground.Board: {
      // Timber terrace: boards run along the path, joints staggered per board.
      g.fillStyle = "#8a5a36"; g.fillRect(px, py, T, T);
      const bh = T / 4;
      for (let b = 0; b < 4; b++) {
        const by = py + b * bh;
        g.fillStyle = mix("#9a663d", "#b27a4a", hash(b, x, 3) * 0.6 + (b % 2) * 0.2); g.fillRect(px, by + 1, T, bh - 1);
        g.fillStyle = "rgba(255,220,170,.2)"; g.fillRect(px, by + 1, T, Math.max(1, u * 0.6));
        g.fillStyle = "#553219"; g.fillRect(px, by, T, 1);
        // Grain streaks along the board.
        g.fillStyle = "rgba(70,40,20,.22)";
        g.fillRect(px + hash(x, b, 4) * T * 0.6, by + bh * 0.5, T * 0.3, 1);
        const jx = px + (0.15 + hash(x, b, 5) * 0.7) * T;
        if (hash(x, b, 6) > 0.45) {
          g.fillStyle = "#4a2b15"; g.fillRect(jx, by + 1, 1.2, bh - 1);
          g.fillStyle = "#3a2210"; g.fillRect(jx - u * 1.2, by + bh * 0.45, u * 0.7, u * 0.7); g.fillRect(jx + u * 0.9, by + bh * 0.45, u * 0.7, u * 0.7);
        }
      }
      // Snow banked along the building side and the front edge (drifts on top are in extras).
      const top = g.createLinearGradient(0, py, 0, py + T * 0.3);
      top.addColorStop(0, "rgba(246,251,255,.9)"); top.addColorStop(1, "rgba(246,251,255,0)");
      g.fillStyle = top; g.fillRect(px, py, T, T * 0.3);
      const bot = g.createLinearGradient(0, py + T * 0.75, 0, py + T);
      bot.addColorStop(0, "rgba(246,251,255,0)"); bot.addColorStop(1, "rgba(246,251,255,.75)");
      g.fillStyle = bot; g.fillRect(px, py + T * 0.75, T, T * 0.25);
      return;
    }
    case Ground.Sand:
    case Ground.Wet: {
      const wet = t === Ground.Wet;
      blocks(g, x, y, T, 8, (fx, fy) => {
        const soft = vnoise(fx, fy, 2.6, 1), shade = vnoise(fx, fy, 6.5, 2), fine = vnoise(fx, fy, 0.7, 3);
        let c = mx(C("#fcfeff"), C("#dde9f5"), soft * 0.85 + fine * 0.25);
        if (shade > 0.5) c = mx(c, C("#bdd3ea"), (shade - 0.5) * 2);
        if (wet) c = mx(c, C("#d0e0ee"), (fy - 12) * 0.9 + fine * 0.15);
        // Under the terrace edge the snow sits in the deck's shadow.
        if (fy < 4.35) c = mx(c, C("#c4d7ea"), (4.35 - fy) * 1.6);
        return css(c);
      });
      // Crystals: blue-grey specks and bright glints, seeded per tile.
      for (let i = 0; i < 5; i++) {
        const sx = px + hash(x, y, i + 20) * (T - u), sy = py + hash(x, y, i + 40) * (T - u);
        g.fillStyle = hash(x, y, i) > 0.55 ? "rgba(120,155,200,.3)" : "rgba(255,255,255,.95)";
        g.fillRect(sx, sy, Math.max(1, u * 0.7), Math.max(1, u * 0.7));
      }
      if (wet) {
        // Packed crust: a boot-flattened band and faint sled runners along the ridge.
        g.fillStyle = "rgba(150,180,215,.22)"; g.fillRect(px, py + T * 0.28, T, Math.max(1, u * 0.7)); g.fillRect(px, py + T * 0.36, T, Math.max(1, u * 0.7));
        g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(px, py + T * 0.26, T, 1);
      }
      return;
    }
    case Ground.Sea: {
      // Frozen lake: pale ice with deep patches and row-seeded frost striations.
      blocks(g, x, y, T, 12, (fx, fy) => {
        const deep = vnoise(fx, fy, 4.2, 4), soft = vnoise(fx, fy, 1.4, 5);
        let c = mx(C("#cdebf7"), C("#93c9e4"), soft * 0.8 + (fy - 13) * 0.08);
        if (deep > 0.48) c = mx(c, C("#5b9fc8"), (deep - 0.48) * 2);
        if (deep > 0.72) c = mx(c, C("#3f82b0"), (deep - 0.72) * 2.5);
        const drift = vnoise(fx, fy, 1.8, 6);
        if (drift > 0.64) c = mx(c, C("#f3fafe"), (drift - 0.64) * 3);
        return css(c);
      });
      for (let k = 0; k < 3; k++) {
        const ry = py + (0.15 + hash(0, y * 3 + k, 8) * 0.75) * T;
        g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(px, ry, T, 1);
      }
      // Trapped bubbles in the ice.
      for (let i = 0; i < 3; i++) {
        if (hash(x, y, i + 60) < 0.86) continue;
        const bx = px + hash(x, y, i + 61) * T, by = py + hash(x, y, i + 62) * T;
        g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1;
        g.beginPath(); g.arc(bx, by, u * (0.6 + hash(x, y, i + 63)), 0, Math.PI * 2); g.stroke();
      }
      return;
    }
  }
}

/** A four-point glint. */
function star(ctx: Ctx, x: number, y: number, r: number, a: number) {
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillRect(x - r, y - 0.6, r * 2, 1.2); ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
}

export const ski: Theme = {
  id: "ski",
  label: "Ski village",
  blurb: "Chalets, fresh powder, a frozen lake",
  place: "in an alpine ski village",
  stageBg: "#cfe6f4",
  swatch: ["#f4f9fd", "#8a5230"],
  lines: { barrier: "The ice is too thin", blocked: "Can’t walk there" },
  tile,
  extras,

  live(ctx, T, time, animated, v) {
    const t = animated ? time : 0;
    // Sparkles on the snow: each glint wakes on its own beat.
    for (let y = Math.max(4, v.y0); y <= Math.min(12, v.y1); y++)
      for (let x = v.x0; x <= v.x1; x++) {
        const h = hash(x, y, 77);
        if (h < 0.5) continue;
        const a = Math.pow(Math.max(0, Math.sin(t * (1.6 + h) + h * 40)), 8);
        if (a < 0.05) continue;
        star(ctx, (x + hash(x, y, 78)) * T, (y + hash(x, y, 79)) * T, T * 0.07 * a + 1, a * 0.95);
      }
    if (v.y1 < 13) return;
    const top = 13.15 * T, bottom = H * T, left = v.x0 * T, right = (v.x1 + 1) * T;
    ctx.save();
    ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    // The sun's glint sweeps slowly across the ice, a skewed band of light.
    const span = W + 10, gx = (wrap(t * 1.3 + 4, span) - 5) * T;
    ctx.save(); ctx.transform(1, 0, -0.55, 1, 0, 0);
    const shift = 0.55 * 15.5 * T;
    const lg = ctx.createLinearGradient(gx + shift - T * 1.1, 0, gx + shift + T * 1.1, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(230,248,255,.2)"); lg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = lg; ctx.fillRect(gx + shift - T * 1.1, top, T * 2.2, bottom - top);
    ctx.restore();
    // Twinkles on the ice, brightest inside the sweep.
    for (let i = 0; i < 34; i++) {
      const x = r01(i, 1) * W * T, y = top + r01(i, 2) * (bottom - top);
      if (x < left || x > right) continue;
      const near = Math.max(0, 1 - Math.abs(x - (gx + 0.55 * (15.5 * T - y))) / (T * 2.5));
      const a = Math.pow(Math.max(0, Math.sin(t * 2.4 + r01(i, 3) * 30)), 6) * 0.5 + near * 0.5;
      if (a > 0.06) star(ctx, x, y, T * 0.09 * a + 1, Math.min(1, a));
    }
    ctx.globalCompositeOperation = "source-over";
    // Wind-blown snow streaks skating over the ice.
    for (let i = 0; i < 40; i++) {
      const speed = 1.4 + r01(i, 5) * 1.8, cyc = W + 6;
      const pos = wrap(r01(i, 4) * cyc + t * speed, cyc) - 3;
      const x = pos * T, y = top + (0.2 + r01(i, 6) * 0.78) * (bottom - top) + Math.sin(t * 1.3 + i) * T * 0.06;
      const len = T * (0.35 + r01(i, 7) * 0.8);
      if (x + len < left || x - len > right) continue;
      const life = Math.sin(Math.PI * wrap(pos / cyc + 0.1, 1));
      const a = 0.55 * life;
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x, y, len, Math.max(1, T * 0.025));
      ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`; ctx.fillRect(x - len * 0.5, y + 1, len * 0.5, 1);
    }
    ctx.restore();
  },

  tall(ctx, T, x, y, time) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    ellipse(ctx, cx + T * 0.12, by - T * 0.12, T * 0.55, T * 0.17, "rgba(90,130,180,.28)");
    ellipse(ctx, cx, by - T * 0.14, T * 0.36, T * 0.11, "#f4f8fc");
    const sway = Math.sin(time * 0.9 + hash(x, y, 4) * 6.28) * T * 0.06 + Math.sin(time * 2.3 + x) * T * 0.015;
    drawPine(ctx, cx, by - T * 0.12, T * 2.55, sway, x * 31 + y);
    ellipse(ctx, cx - T * 0.1, by - T * 0.12, T * 0.3, T * 0.07, "#fbfdff");
  },

  small(ctx, T, x, y, time) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    ellipse(ctx, cx + T * 0.1, by - T * 0.12, T * 0.44, T * 0.14, "rgba(90,130,180,.3)");
    const ball = (bx: number, byy: number, r: number) => {
      ellipse(ctx, bx, byy, r, r * 0.95, "#bcd2e6");
      ellipse(ctx, bx - r * 0.1, byy - r * 0.1, r * 0.9, r * 0.84, "#fbfdff");
      ellipse(ctx, bx - r * 0.38, byy - r * 0.38, r * 0.25, r * 0.18, "#ffffff");
    };
    const r1 = T * 0.3, r2 = T * 0.22, r3 = T * 0.165;
    const y1 = by - T * 0.14 - r1 * 0.85, y2 = y1 - r1 * 0.8 - r2 * 0.7, y3 = y2 - r2 * 0.8 - r3 * 0.75;
    // Stick arms behind the middle ball.
    ctx.strokeStyle = "#5b3a22"; ctx.lineWidth = Math.max(1.5, T * 0.035); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - r2 * 0.6, y2); ctx.lineTo(cx - T * 0.52, y2 - T * 0.2); ctx.moveTo(cx - T * 0.42, y2 - T * 0.15); ctx.lineTo(cx - T * 0.5, y2 - T * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r2 * 0.6, y2); ctx.lineTo(cx + T * 0.5, y2 - T * 0.08); ctx.moveTo(cx + T * 0.4, y2 - T * 0.06); ctx.lineTo(cx + T * 0.47, y2 - T * 0.2); ctx.stroke();
    ball(cx, y1, r1); ball(cx, y2, r2); ball(cx, y3, r3);
    // Coal buttons.
    for (let k = 0; k < 3; k++) ellipse(ctx, cx + T * 0.01, y2 - r2 * 0.35 + k * r2 * 0.36, T * 0.025, T * 0.024, "#2a2a30");
    ellipse(ctx, cx, y1 - r1 * 0.2, T * 0.028, T * 0.026, "#2a2a30");
    // Scarf: a red band with white stripes, the tail flapping in the breeze.
    const sy = y2 - r2 * 0.78;
    roundRect(ctx, cx - r3 * 1.05, sy - T * 0.04, r3 * 2.1, T * 0.085, T * 0.04, "#d6392d");
    ctx.fillStyle = "#fff4ee"; ctx.fillRect(cx - r3 * 0.5, sy - T * 0.04, T * 0.025, T * 0.085); ctx.fillRect(cx + r3 * 0.3, sy - T * 0.04, T * 0.025, T * 0.085);
    ctx.save(); ctx.translate(cx + r3 * 0.55, sy + T * 0.02); ctx.rotate(0.25 + Math.sin(time * 3.1 + x) * 0.14);
    roundRect(ctx, -T * 0.035, 0, T * 0.075, T * 0.24, T * 0.025, "#c3302a");
    ctx.fillStyle = "#fff4ee"; ctx.fillRect(-T * 0.035, T * 0.08, T * 0.075, T * 0.02); ctx.fillRect(-T * 0.035, T * 0.15, T * 0.075, T * 0.02);
    ctx.fillStyle = "#e2584a"; for (let k = 0; k < 3; k++) ctx.fillRect(-T * 0.03 + k * T * 0.025, T * 0.24, 1.2, T * 0.035);
    ctx.restore();
    // Face: coal eyes, a carrot nose, a coal smile.
    ellipse(ctx, cx - r3 * 0.35, y3 - r3 * 0.12, T * 0.022, T * 0.026, "#1f1f26");
    ellipse(ctx, cx + r3 * 0.32, y3 - r3 * 0.12, T * 0.022, T * 0.026, "#1f1f26");
    ctx.fillStyle = "#f0802a"; ctx.beginPath(); ctx.moveTo(cx - T * 0.01, y3 + r3 * 0.02); ctx.lineTo(cx + T * 0.2, y3 + r3 * 0.18); ctx.lineTo(cx - T * 0.01, y3 + r3 * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c95f1a"; ctx.fillRect(cx + T * 0.05, y3 + r3 * 0.16, T * 0.02, 1);
    for (let k = 0; k < 5; k++) ellipse(ctx, cx - r3 * 0.45 + k * r3 * 0.22, y3 + r3 * 0.5 + Math.sin((k / 4) * Math.PI) * r3 * 0.14, T * 0.012, T * 0.012, "#2a2a30");
    // Knitted bobble hat.
    ctx.fillStyle = "#c62f2a"; ctx.beginPath(); ctx.ellipse(cx, y3 - r3 * 0.55, r3 * 0.9, r3 * 0.75, 0, Math.PI, 0); ctx.fill();
    roundRect(ctx, cx - r3 * 0.98, y3 - r3 * 0.68, r3 * 1.96, r3 * 0.34, r3 * 0.12, "#e24a3c");
    ctx.fillStyle = "#fff4ee"; ctx.fillRect(cx - r3 * 0.9, y3 - r3 * 0.55, r3 * 1.8, Math.max(1, T * 0.018));
    ctx.fillStyle = "rgba(90,15,15,.25)"; for (let k = -2; k <= 2; k++) ctx.fillRect(cx + k * r3 * 0.3, y3 - r3 * 1.2, 1, r3 * 0.5);
    ellipse(ctx, cx + r3 * 0.1, y3 - r3 * 1.35, r3 * 0.3, r3 * 0.28, "#fff8f4");
    ellipse(ctx, cx + r3 * 0.2, y3 - r3 * 1.28, r3 * 0.14, r3 * 0.12, "#e7dcd6");
    // Snow heaped around the base.
    ellipse(ctx, cx, by - T * 0.14, T * 0.36, T * 0.08, "#f4f8fc");
  },

  sign(ctx, T, s) {
    // A ski-trail signpost: split-log post, arrow board, snow cap, blue trail disc.
    const px = s.x * T, by = (s.y + 1) * T, cx = px + T / 2;
    ellipse(ctx, cx + T * 0.08, by - T * 0.1, T * 0.4, T * 0.12, "rgba(90,130,180,.3)");
    ctx.fillStyle = "#6a4326"; ctx.fillRect(cx - T * 0.06, by - T * 0.86, T * 0.12, T * 0.76);
    ctx.fillStyle = "#4a2d18"; ctx.fillRect(cx + T * 0.02, by - T * 0.86, T * 0.04, T * 0.76);
    ctx.fillStyle = "rgba(255,210,160,.25)"; ctx.fillRect(cx - T * 0.05, by - T * 0.86, 1, T * 0.76);
    ellipse(ctx, cx, by - T * 0.34, T * 0.07, T * 0.07, "#2d6fbf");
    ellipse(ctx, cx, by - T * 0.34, T * 0.07, T * 0.07, "rgba(0,0,0,0)");
    ctx.strokeStyle = "#f4f8fc"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, by - T * 0.34, T * 0.07, 0, Math.PI * 2); ctx.stroke();
    // Arrow board: body plus a point on the right.
    const x0 = px - T * 0.06, x1 = px + T * 0.94, tip = px + T * 1.1, top = by - T * 1.3, bot = by - T * 0.76, mid = (top + bot) / 2;
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(tip, mid); ctx.lineTo(x1, bot); ctx.lineTo(x0, bot); ctx.closePath();
    ctx.fillStyle = "#4e2e17"; ctx.fill();
    const i = T * 0.04;
    ctx.beginPath(); ctx.moveTo(x0 + i, top + i); ctx.lineTo(x1 - i * 0.3, top + i); ctx.lineTo(tip - i * 1.6, mid); ctx.lineTo(x1 - i * 0.3, bot - i); ctx.lineTo(x0 + i, bot - i); ctx.closePath();
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, "#e7bc82"); wg.addColorStop(1, "#c9965c");
    ctx.fillStyle = wg; ctx.fill();
    ctx.fillStyle = "rgba(120,70,30,.22)";
    for (let k = 0; k < 3; k++) ctx.fillRect(x0 + i, top + (bot - top) * (0.3 + k * 0.22), (tip - x0) * (0.4 + hash(s.x, k, 3) * 0.4), 1);
    // Snow cap with a couple of drips.
    ctx.beginPath(); ctx.moveTo(x0 - T * 0.04, top + T * 0.03);
    for (let k = 0; k <= 5; k++) ctx.quadraticCurveTo(x0 + (x1 - x0) * ((k + 0.5) / 6), top - T * (0.09 + hash(s.x, k, 5) * 0.04), x0 + (x1 - x0) * ((k + 1) / 6), top - T * 0.01);
    ctx.lineTo(x1 + T * 0.04, top + T * 0.02); ctx.closePath(); ctx.fillStyle = SNOW; ctx.fill();
    ctx.fillStyle = "#e3f4ff";
    for (const f of [0.22, 0.7]) { ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * f - 1.5, top + 1); ctx.lineTo(x0 + (x1 - x0) * f + 1.5, top + 1); ctx.lineTo(x0 + (x1 - x0) * f, top + T * 0.08); ctx.fill(); }
    ctx.fillStyle = "#3a2210"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(T * 0.24)}px "Pixelify Sans", monospace`;
    ctx.fillText(s.label ?? "", px + T * 0.48, mid + 1);
    shadow(ctx, cx, by - T * 0.08, T * 0.14, T * 0.04, 0.18);
  },

  lights(ctx, T, time, animated, v) {
    const t = animated ? time : 0;
    // Warm window light, flickering like a fire inside.
    if (v.y0 <= 3) {
      ctx.globalCompositeOperation = "lighter";
      WINDOW_LIGHTS.forEach(([wx, wy, ww], i) => {
        if (wx < v.x0 - 1 || wx > v.x1 + 1) return;
        const f = 0.85 + 0.15 * Math.sin(t * 3.3 + i * 1.7) * Math.sin(t * 1.9 + i);
        glow(ctx, wx * T, wy * T, T * (0.35 + ww * 0.6), "#ffb45a", 0.28 * f);
      });
      ctx.globalCompositeOperation = "source-over";
    }
    // Chimney smoke: soft puffs rising, swelling and drifting downwind.
    CHIMNEYS.forEach(([cx, cy], ci) => {
      if (cx < v.x0 - 2 || cx > v.x1 + 2) return;
      for (let k = 0; k < 6; k++) {
        const life = wrap(t * 0.22 + k / 6 + ci * 0.37, 1);
        const px = (cx + life * 1.5 + Math.sin(t * 1.1 + k + ci) * 0.08 * life) * T;
        const py = (cy - 0.05 - life * 0.45 - life * life * 0.15) * T;
        
        const r = T * (0.07 + life * 0.2), a = (life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85) * 0.75;
        ellipse(ctx, px + r * 0.15, py + r * 0.1, r, r * 0.8, `rgba(170,185,205,${a * 0.6})`);
        ellipse(ctx, px, py, r * 0.85, r * 0.7, `rgba(245,248,252,${a})`);
      }
    });
  },

  screen(ctx, vw, vh, time, animated) {
    const t = animated ? time : 0;
    // Three layers of snowfall: far and slow, middle, and a few big close flakes.
    const layers = [
      { n: 70, size: 1.2, fall: 18, drift: 8, a: 0.55 },
      { n: 45, size: 2.2, fall: 34, drift: 14, a: 0.75 },
      { n: 16, size: 3.6, fall: 60, drift: 22, a: 0.85 },
    ];
    layers.forEach((L, li) => {
      const count = Math.round(L.n * Math.min(1.6, (vw * vh) / (900 * 600)));
      ctx.fillStyle = `rgba(255,255,255,${L.a})`;
      for (let i = 0; i < count; i++) {
        const seed = i * 7 + li * 1000;
        const y = wrap(r01(seed, 1) * vh + t * L.fall * (0.8 + r01(seed, 3) * 0.4), vh + 10) - 5;
        const x = wrap(r01(seed, 2) * vw + t * L.drift + Math.sin(t * 0.9 + r01(seed, 4) * 6.28) * L.size * 4, vw + 10) - 5;
        const s = L.size * (0.7 + r01(seed, 5) * 0.6);
        if (li === 0) ctx.fillRect(x, y, s, s);
        else { ctx.beginPath(); ctx.arc(x, y, s * 0.6, 0, Math.PI * 2); ctx.fill(); }
      }
    });
  },
};
