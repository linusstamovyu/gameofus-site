// Praia de Albufeira: the original beach, unchanged. The palm is the game's own art.
import { Ground, hash } from "../map";
import { shadow, signBoard, type Ctx } from "./kit";
import type { Theme } from "./types";

const PALM_HOLDS = [0.2, 0.4, 0.3, 0.2]; // the sway rests at the ends of its swing
const PALM_CYCLE = PALM_HOLDS.reduce((a, b) => a + b, 0);

function tile(g: Ctx, t: Ground, x: number, y: number, T: number) {
  const px = x * T, py = y * T, u = T / 16;
  switch (t) {
    case Ground.Town:
      g.fillStyle = "#f4eee2"; g.fillRect(px, py, T, T);
      g.fillStyle = hash(x, 0, 7) > 0.45 ? "#c8643b" : "#d99a5b"; g.fillRect(px, py, T, T * 0.42);
      g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(px, py + T * 0.42, T, u);
      g.fillStyle = "#3f6fae"; g.fillRect(px + T * 0.2, py + T * 0.6, u * 3, u * 4); g.fillRect(px + T * 0.62, py + T * 0.6, u * 3, u * 4);
      g.fillStyle = "rgba(0,0,0,.08)"; g.fillRect(px + T - u, py, u, T);
      return;
    case Ground.Cliff: {
      // Golden limestone: flute width seeded by column, strata by row (never both, or it reads as plaid).
      g.fillStyle = "#d39a4a"; g.fillRect(px, py, T, T);
      const fw = 2 + Math.floor(hash(x, 0, 3) * 3);
      for (let i = 0; i < 16; i += fw + 1 + Math.floor(hash(x, i, 5) * 2)) {
        g.fillStyle = `rgba(90,50,15,${0.1 + hash(x, y, i) * 0.08})`; g.fillRect(px + i * u, py, u * fw * 0.5, T);
      }
      g.fillStyle = "rgba(255,230,170,.18)"; g.fillRect(px, py + (hash(0, y, 9) * 0.6 + 0.1) * T, T, u * 2);
      if (y === 1) {
        g.fillStyle = "#5e7a3a";
        for (let i = 0; i < 4; i++) { const bx = px + hash(x, i, 11) * T * 0.8; g.beginPath(); g.ellipse(bx + u * 2, py + u * 1.5, u * 2.4, u * 1.6, 0, 0, 7); g.fill(); }
      }
      if (y === 2) { g.fillStyle = "rgba(60,35,10,.25)"; g.fillRect(px, py + T - u * 2, T, u * 2); }
      return;
    }
    case Ground.Board:
      g.fillStyle = "#ecd39c"; g.fillRect(px, py, T, T);
      g.fillStyle = "#b07e4f"; g.fillRect(px, py + u * 2, T, T - u * 4);
      g.fillStyle = "#8a5d36"; for (let i = 0; i < 4; i++) g.fillRect(px + (i * T) / 4, py + u * 2, u * 0.7, T - u * 4);
      return;
    case Ground.Sand:
    case Ground.Wet:
      g.fillStyle = t === Ground.Sand ? "#ecd39c" : "#d7b77c"; g.fillRect(px, py, T, T);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = hash(x, y, i) > 0.5 ? "rgba(170,125,60,.22)" : "rgba(255,248,225,.5)";
        g.fillRect(px + hash(x, y, i + 20) * (T - u), py + hash(x, y, i + 40) * (T - u), u, u);
      }
      if (t === Ground.Wet) { g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(px, py + T * 0.55, T, u); }
      return;
    case Ground.Sea:
      return; // painted live
  }
}

export const beach: Theme = {
  id: "beach",
  label: "Albufeira beach",
  blurb: "The real trip",
  place: "on Praia de Albufeira",
  stageBg: "#2f8fb5",
  swatch: ["#ecd39c", "#2f8fb5"],
  lines: { barrier: "Too cold for a swim", blocked: "Can’t walk there" },
  files: { palm: "palm.webp" },
  tile,
  live(ctx, T, time, animated, v) {
    const t = animated ? time : 0;
    for (let y = Math.max(13, v.y0); y <= v.y1; y++)
      for (let x = v.x0; x <= v.x1; x++) {
        const px = x * T, py = y * T, u = T / 16;
        ctx.fillStyle = y === 13 ? "#3aa3c6" : "#2f8fb5"; ctx.fillRect(px, py, T + 1, T + 1);
        if (y === 13) {
          ctx.fillStyle = "rgba(255,255,255,.85)";
          for (let i = 0; i < 16; i++) { const w = Math.sin(t * 2 + (x * 16 + i) * 0.45) * u * 1.5 + u * 1.5; ctx.fillRect(px + i * u, py, u + 0.5, w + u); }
        }
        const off = ((t * 0.5 + hash(x, y, 2)) % 1) * T;
        ctx.fillStyle = `rgba(210,240,250,${0.25 + 0.2 * Math.sin(t * 1.5 + hash(x, y, 1) * 6.28)})`;
        ctx.fillRect(px + off * 0.6, py + hash(x, y, 3) * (T - u), u * 4, u);
      }
  },
  tall(ctx, T, x, y, time, img) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.5, T * 0.16, 0.2);
    const palm = img("palm");
    if (!palm?.complete || !palm.naturalWidth) return;
    const phase = (time + hash(x, y, 4) * PALM_CYCLE) % PALM_CYCLE;
    let frame = 0;
    for (let acc = 0; frame < 3; frame++) { acc += PALM_HOLDS[frame]; if (phase < acc) break; }
    const fw = palm.naturalWidth / 4, w = T * 2.3, h = (w * palm.naturalHeight) / fw;
    ctx.save();
    if (hash(x, y, 8) > 0.5) { ctx.translate(cx * 2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(palm, frame * fw, 0, fw, palm.naturalHeight, cx - w / 2, by - h, w, h);
    ctx.restore();
  },
  small(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T, r = T * 0.62, cy = by - T * 1.4;
    shadow(ctx, cx + T * 0.15, by - T * 0.25, T * 0.62, T * 0.24, 0.18);
    ctx.fillStyle = "#6d4a2b"; ctx.fillRect(cx - T * 0.04, by - T * 1.35, T * 0.08, T * 1.2);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#fbf3e4" : "#e0533d";
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4); ctx.closePath(); ctx.fill();
    }
  },
  sign: (ctx, T, s) => signBoard(ctx, T, s, { post: "#5b3a1f", board: "#4e2e17", face: "#9b6636", ink: "#fdf6e3" }),
};
