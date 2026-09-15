// The static ground is painted once per world into an offscreen layer; anything
// that moves is the theme's `live` pass, drawn every frame.
import { H, W, groundAt } from "./map";
import type { Theme } from "./themes/types";

export function paintStaticLayer(theme: Theme, T: number, dpr: number): HTMLCanvasElement {
  const layer = document.createElement("canvas");
  layer.width = Math.round(W * T * dpr);
  layer.height = Math.round(H * T * dpr);
  const g = layer.getContext("2d")!;
  g.scale(dpr, dpr);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) theme.tile(g, groundAt(x, y), x, y, T);
  theme.extras?.(g, T);
  return layer;
}
