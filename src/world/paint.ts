// Tile painters. The static ground is painted once into an offscreen layer;
// only the sea is repainted each frame.
import { Ground, H, W, groundAt, hash } from "./map";

export function paintStaticLayer(T: number, dpr: number): HTMLCanvasElement {
  const layer = document.createElement("canvas");
  layer.width = Math.round(W * T * dpr);
  layer.height = Math.round(H * T * dpr);
  const g = layer.getContext("2d")!;
  g.scale(dpr, dpr);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) paintTile(g, groundAt(x, y), x, y, T);
  return layer;
}

function paintTile(g: CanvasRenderingContext2D, t: Ground, x: number, y: number, T: number) {
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

/** Sea rows in the visible window. `animated` false draws a still sea (low-power mode). */
export function paintSea(ctx: CanvasRenderingContext2D, T: number, time: number, animated: boolean,
  x0: number, y0: number, x1: number, y1: number) {
  const t = animated ? time : 0;
  for (let y = Math.max(13, y0); y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
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
}
