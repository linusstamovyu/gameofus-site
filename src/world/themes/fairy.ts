// PLACEHOLDER: flat colours so the picker works. Replaced by the fairy theme build.
import { Ground } from "../map";
import { shadow, signBoard } from "./kit";
import type { Theme } from "./types";

const BAND = ['#3b2d5c', '#6a7486', '#9a93a8', '#5a9a60', '#7aa86a', '#2a3f8f'];

export const fairy: Theme = {
  id: "fairy",
  label: "Fairy-tale land",
  blurb: "Castles and fireflies",
  place: "in a fairy-tale kingdom",
  stageBg: "#1d1638",
  swatch: ["#b58fe0", "#2a3f8f"],
  lines: { barrier: "The lake is enchanted", blocked: "Can’t walk there" },
  tile(g, band, x, y, T) {
    const i = band === Ground.Town ? 0 : band === Ground.Cliff ? 1 : band === Ground.Board ? 2 : band === Ground.Sand ? 3 : band === Ground.Wet ? 4 : 5;
    g.fillStyle = BAND[i]; g.fillRect(x * T, y * T, T, T);
  },
  tall(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.4, T * 0.14);
    ctx.fillStyle = "#b58fe0"; ctx.fillRect(cx - T * 0.3, by - T * 2, T * 0.6, T * 1.9);
  },
  small(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.35, T * 0.12);
    ctx.fillStyle = "#b58fe0"; ctx.fillRect(cx - T * 0.3, by - T * 0.8, T * 0.6, T * 0.7);
  },
  sign: (ctx, T, s) => signBoard(ctx, T, s, { post: "#333", board: "#222", face: "#555", ink: "#fff" }),
};
