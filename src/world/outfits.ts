// Walk sheets dressed for a world: world -> squad id -> site-relative URL in public/worlds (loaded when the world is picked;
// kept out of public/assets, which tools/build_site_assets.py rebuilds from scratch).
// Deployed by tools/deploy_regenerated_outfits.py from source/outfits/regenerated-simple (whole regenerated outfits).
// The beach has no entry on purpose: the squad walks Albufeira in their own clothes.
// A sheet that is missing or still loading falls back to the lad's normal clothes.
import type { ThemeId } from "./themes/types";

const SQUAD = ["rico", "kai", "elias", "ethan", "nala", "coco"];
const dressedFor = (world: ThemeId) => Object.fromEntries(SQUAD.map(id => [id, `worlds/${id}_walk_${world}.webp`]));

export const OUTFITS: Partial<Record<ThemeId, Record<string, string>>> = {
  space: dressedFor("space"),
  neon: dressedFor("neon"),
  jungle: dressedFor("jungle"),
  ski: dressedFor("ski"),
  fairy: dressedFor("fairy"),
};
