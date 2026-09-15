// PLACEHOLDER: flat colours so the picker works. Replaced by the jungle theme build.
import { Ground } from "../map";
import { shadow, signBoard } from "./kit";
import type { Theme } from "./types";

const BAND = ['#1f3d22', '#6f7a5e', '#8a8474', '#4f7f35', '#6b4a2b', '#2f6f5f'];

export const jungle: Theme = {
  id: "jungle",
  label: "Jungle temple",
  blurb: "Ruins and rivers",
  place: "at a temple deep in the jungle",
  stageBg: "#0f2a1a",
  swatch: ["#4f8a3a", "#2f6f5f"],
  lines: { barrier: "The river’s too fast", blocked: "Can’t walk there" },
  tile(g, band, x, y, T) {
    const i = band === Ground.Town ? 0 : band === Ground.Cliff ? 1 : band === Ground.Board ? 2 : band === Ground.Sand ? 3 : band === Ground.Wet ? 4 : 5;
    g.fillStyle = BAND[i]; g.fillRect(x * T, y * T, T, T);
  },
  tall(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.4, T * 0.14);
    ctx.fillStyle = "#4f8a3a"; ctx.fillRect(cx - T * 0.3, by - T * 2, T * 0.6, T * 1.9);
  },
  small(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.35, T * 0.12);
    ctx.fillStyle = "#4f8a3a"; ctx.fillRect(cx - T * 0.3, by - T * 0.8, T * 0.6, T * 0.7);
  },
  sign: (ctx, T, s) => signBoard(ctx, T, s, { post: "#333", board: "#222", face: "#555", ink: "#fff" }),
};
