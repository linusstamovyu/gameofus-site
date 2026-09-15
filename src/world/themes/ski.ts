// PLACEHOLDER: flat colours so the picker works. Replaced by the ski theme build.
import { Ground } from "../map";
import { shadow, signBoard } from "./kit";
import type { Theme } from "./types";

const BAND = ['#6b4226', '#7a5236', '#9b7a55', '#eef4fa', '#d6e3ef', '#a9d3e8'];

export const ski: Theme = {
  id: "ski",
  label: "Ski village",
  blurb: "Snow and chalets",
  place: "in an alpine ski village",
  stageBg: "#b9d4e6",
  swatch: ["#eef4fa", "#6b4226"],
  lines: { barrier: "The ice is too thin", blocked: "Can’t walk there" },
  tile(g, band, x, y, T) {
    const i = band === Ground.Town ? 0 : band === Ground.Cliff ? 1 : band === Ground.Board ? 2 : band === Ground.Sand ? 3 : band === Ground.Wet ? 4 : 5;
    g.fillStyle = BAND[i]; g.fillRect(x * T, y * T, T, T);
  },
  tall(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.4, T * 0.14);
    ctx.fillStyle = "#eef4fa"; ctx.fillRect(cx - T * 0.3, by - T * 2, T * 0.6, T * 1.9);
  },
  small(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.35, T * 0.12);
    ctx.fillStyle = "#eef4fa"; ctx.fillRect(cx - T * 0.3, by - T * 0.8, T * 0.6, T * 0.7);
  },
  sign: (ctx, T, s) => signBoard(ctx, T, s, { post: "#333", board: "#222", face: "#555", ink: "#fff" }),
};
