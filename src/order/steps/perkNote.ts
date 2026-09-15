// The beach tour bonus, said where it applies (plan 18 phase 2): the Games step for the minigames, the Games step
// for Party Mode on Ultimate, and the custom items shelf for the 3 free items with examples of icons we already have.
import { el } from "../../dom";
import { orderAsset } from "../catalogue";
import type { Ctx } from "../context";
import { PERK_ITEM_EXAMPLES, PERK_LABEL, perkActive, perkDaysLeft, perkKind, type PerkKind } from "../perk";

/** The note for this spot, or null when the bonus isn't unlocked, has run out, or is a different kind here. */
export function perkNote(ctx: Ctx, where: PerkKind): HTMLElement | null {
  const d = ctx.draft();
  if (!perkActive(d.perkUnlockedAt)) return null;
  const kind = perkKind(d.edition ?? "standard", d.consent.adults);
  if (kind !== where) return null;
  const days = perkDaysLeft(d.perkUnlockedAt);
  const note = el("div", "perk-note");
  note.append(el("b", null, "Beach tour bonus"), el("span", null, `${PERK_LABEL[kind]} · ${days} day${days === 1 ? "" : "s"} left`));
  if (kind === "items") {
    const wrap = el("div", "perk-items");
    wrap.setAttribute("aria-label", "Ideas: icons already in the game");
    for (const [label, file] of PERK_ITEM_EXAMPLES) {
      const f = el("figure");
      const img = el("img");
      img.src = orderAsset(`item_${file}.webp`);
      img.alt = "";
      img.loading = "lazy";
      f.append(img, el("span", null, label));
      wrap.append(f);
    }
    const why = el("p", null, "Something personal works best: a souvenir from the trip, the magazine, the keys, the wristband, the drink. Pick the stock icon option and the first 3 are free.");
    why.style.margin = "0";
    why.style.flexBasis = "100%";
    note.append(why, wrap);
  }
  return note;
}
