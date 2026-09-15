// The worlds the preview can switch between. Same map, same people, new pictures.
import { beach } from "./beach";
import { fairy } from "./fairy";
import { jungle } from "./jungle";
import { neon } from "./neon";
import { ski } from "./ski";
import { space } from "./space";
import type { Theme, ThemeId } from "./types";

export const THEMES: Theme[] = [beach, space, neon, jungle, ski, fairy];

export const themeById = (id: string | null | undefined): Theme =>
  THEMES.find(t => t.id === id) ?? beach;

export type { Theme, ThemeId };
