// PLACEHOLDER: flat colours so the picker works. Replaced by the space theme build.
import { Ground } from "../map";
import { shadow, signBoard } from "./kit";
import type { Theme } from "./types";

const BAND = ['#1a1f33', '#8e3b22', '#3b404b', '#b5532d', '#6b6f78', '#070814'];

export const space: Theme = {
  id: "space",
  label: "Mars base",
  blurb: "Moon-dust sci-fi",
  place: "on a base on Mars",
  stageBg: "#070814",
  swatch: ["#b5532d", "#070814"],
  lines: { barrier: "No tether reaches that far", blocked: "Can’t walk there" },
  tile(g, band, x, y, T) {
    const i = band === Ground.Town ? 0 : band === Ground.Cliff ? 1 : band === Ground.Board ? 2 : band === Ground.Sand ? 3 : band === Ground.Wet ? 4 : 5;
    g.fillStyle = BAND[i]; g.fillRect(x * T, y * T, T, T);
  },
  tall(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.4, T * 0.14);
    ctx.fillStyle = "#b5532d"; ctx.fillRect(cx - T * 0.3, by - T * 2, T * 0.6, T * 1.9);
  },
  small(ctx, T, x, y) {
    const cx = x * T + T / 2, by = (y + 1) * T;
    shadow(ctx, cx, by - T * 0.12, T * 0.35, T * 0.12);
    ctx.fillStyle = "#b5532d"; ctx.fillRect(cx - T * 0.3, by - T * 0.8, T * 0.6, T * 0.7);
  },
  sign: (ctx, T, s) => signBoard(ctx, T, s, { post: "#333", board: "#222", face: "#555", ink: "#fff" }),
};
