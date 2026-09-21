import { describe, expect, it } from "vitest";
import { EXPLORE_TABS } from "../src/explore/catalog";
import { applyFavourites, checkFavourites, emptyFavourites, favouriteCount, toggleFavourite } from "../src/explore/favourites";
import { badgeTier, includedBadge } from "../src/explore/included";
import { BIG_GAMES, MINIGAMES } from "../src/order/catalogue";
import { blockingProblems, newDraft, problems, setPartyMode, setAdults, STEPS } from "../src/order/draft";
import type { VehiclesChoices } from "../src/order/sections/vehicles";

describe("explore catalogue", () => {
  it("shows every big game and every minigame the builder sells", () => {
    const ids = (tab: string) => EXPLORE_TABS.find(t => t.id === tab)!.cards.map(c => c.id);
    expect(ids("games")).toEqual(BIG_GAMES.map(g => g.id));
    expect(ids("minigames")).toEqual(MINIGAMES.map(m => m.id));
  });

  it("points every tab at a real builder step, and every card has art and a badge", () => {
    for (const tab of EXPLORE_TABS) {
      expect(STEPS.some(s => s.id === tab.step)).toBe(true);
      for (const c of tab.cards) {
        expect(c.art).toMatch(/^order-assets\/.+\.webp$/);
        expect(c.badge.length).toBeGreaterThan(0);
      }
    }
  });

  it("marks the drinking games 18+", () => {
    const adult = EXPLORE_TABS.find(t => t.id === "minigames")!.cards.filter(c => c.adult).map(c => c.id);
    expect(adult).toEqual(MINIGAMES.filter(m => m.drinking).map(m => m.id));
  });
});

describe("included badge", () => {
  it("lists what each edition includes, from the price ladder", () => {
    expect(includedBadge("bigGames", 9)).toBe("Standard 1 · Deluxe 3 · Ultimate 5");
    expect(includedBadge("minigames", 12)).toBe("Standard 3 · Deluxe 6 · Ultimate all");
  });
  it("says From Deluxe when Standard has none", () => {
    expect(includedBadge("evolutions")).toBe("From Deluxe");
  });
  // The chip is painted in that edition's own metal, so the name it reads has to resolve to an edition —
  // a renamed tier would otherwise leave the badge quietly neutral rather than failing.
  it("names the edition a From badge is about, and nothing else", () => {
    expect(badgeTier(includedBadge("evolutions"))).toBe("deluxe");
    expect(badgeTier(includedBadge("bigGames", 9))).toBeNull();
    expect(badgeTier("From Nowhere")).toBeNull();
  });
});

describe("favourites", () => {
  it("drops unknown ids and duplicates from untrusted data", () => {
    expect(checkFavourites({ game: ["kart", "kart", "nope"], minigame: [3], vehicle: ["taxi"] })).toEqual({ game: ["kart"], minigame: [], vehicle: ["taxi"] });
    expect(checkFavourites("junk")).toEqual(emptyFavourites());
  });

  it("toggles on and off, and ignores ids that don't exist", () => {
    let f = toggleFavourite(emptyFavourites(), "game", "kart");
    expect(favouriteCount(f)).toBe(1);
    f = toggleFavourite(f, "game", "kart");
    expect(favouriteCount(f)).toBe(0);
    expect(toggleFavourite(f, "vehicle", "rocket")).toBe(f);
  });

  it("ticks favourites in the builder without undoing what's already picked", () => {
    const d = { ...newDraft(), bigGames: ["gym"] };
    const out = applyFavourites(d, { game: ["kart", "gym"], minigame: ["blackjack"], vehicle: ["taxi", "car"] });
    expect(out.bigGames).toEqual(["gym", "kart"]);
    expect(out.minigames).toEqual(["blackjack"]);
    expect((out.sections.vehicles as VehiclesChoices).types).toEqual(["car", "taxi"]);
  });

  it("never adds a drinking game unless Party Mode is on", () => {
    const f = { game: [], minigame: ["kings-cup", "blackjack"], vehicle: [] };
    expect(applyFavourites(newDraft(), f).minigames).toEqual(["blackjack"]);
    const party = setPartyMode(setAdults(newDraft(), "yes"), true);
    expect(applyFavourites(party, f).minigames).toEqual(["kings-cup", "blackjack"]);
  });
});

describe("the squad no longer gates the builder (plan 18 §3)", () => {
  it("lets you move on with an empty squad, but Review still refuses", () => {
    const d = newDraft();
    expect(problems(d, "squad").length).toBeGreaterThan(0);
    expect(blockingProblems(d, "squad")).toEqual([]);
    expect(blockingProblems(d, "games").length).toBeGreaterThan(0);
    expect(problems(d, "review").some(p => p.step === "squad")).toBe(true);
  });
});
