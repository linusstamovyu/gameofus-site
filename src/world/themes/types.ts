import type { Stop } from "../../content/types";
import type { Ground } from "../map";
import type { Ctx, View } from "./kit";

export type ThemeId = "beach" | "space" | "neon" | "jungle" | "ski" | "fairy";

export interface Theme {
  id: ThemeId;
  label: string;
  /** Short line under the label in the picker. */
  blurb: string;
  /** Finishes "You are standing … right now." */
  place: string;
  /** Behind the map, and the picker swatch. */
  stageBg: string;
  swatch: [string, string];
  lines: { barrier: string; blocked: string };
  /** Extra image files this theme draws (loaded on first use). */
  files?: Record<string, string>;

  /** Static ground, painted once into the layer. */
  tile(g: Ctx, band: Ground, x: number, y: number, T: number): void;
  /** Static pictures bigger than a tile (a temple, a castle, a planet). */
  extras?(g: Ctx, T: number): void;
  /** Animated ground: sea, traffic, ice glints. Drawn under everyone. */
  live?(ctx: Ctx, T: number, time: number, animated: boolean, v: View): void;

  tall(ctx: Ctx, T: number, x: number, y: number, time: number, img: (key: string) => HTMLImageElement | undefined): void;
  small(ctx: Ctx, T: number, x: number, y: number, time: number): void;
  sign(ctx: Ctx, T: number, s: Stop): void;

  /** Colour grade over the world (night, twilight). */
  grade?(ctx: Ctx, T: number, v: View): void;
  /** Additive lights and world-anchored particles, over the grade. */
  lights?(ctx: Ctx, T: number, time: number, animated: boolean, v: View): void;
  /** Weather in screen space: rain, snow. */
  screen?(ctx: Ctx, vw: number, vh: number, time: number, animated: boolean): void;
}
