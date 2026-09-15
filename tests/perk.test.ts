import { describe, expect, it } from "vitest";
import { newDraft, setAdults, setPartyMode, toPicks, withPerk, type Draft } from "../src/order/draft";
import { checkPayload, picksFromPayload } from "../src/order/payload";
import { PERK_DAYS, perkActive, perkDaysLeft, perkKind } from "../src/order/perk";
import { ADDONS, quote } from "../src/order/prices";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 20);

describe("beach tour bonus rules", () => {
  it("is active for 7 days from unlocking and never from the future", () => {
    expect(perkActive(NOW - DAY, NOW)).toBe(true);
    expect(perkActive(NOW - PERK_DAYS * DAY, NOW)).toBe(false);
    expect(perkActive(NOW + DAY, NOW)).toBe(false);
    expect(perkActive("yesterday", NOW)).toBe(false);
    expect(perkDaysLeft(NOW - 1.5 * DAY, NOW)).toBe(6);
  });

  it("gives minigames below Ultimate, Party Mode on Ultimate, items when not everyone is 18+", () => {
    expect(perkKind("standard", null)).toBe("minigames");
    expect(perkKind("deluxe", "no")).toBe("minigames");
    expect(perkKind("ultimate", "yes")).toBe("party_mode");
    expect(perkKind("ultimate", "no")).toBe("items");
  });
});

describe("the bonus in a quote", () => {
  it("takes minigames past the allowance off, and says what it saved", () => {
    const picks = { edition: "standard" as const, friends: 2, bigGames: 1, minigames: 12 };
    const full = quote(picks, "DKK", 0);
    const gifted = quote({ ...picks, free: { minigame: 12 } }, "DKK", 0);
    expect(full.total - gifted.total).toBe(9 * ADDONS.minigame.price.DKK);
    expect(gifted.bonus).toBe(9 * ADDONS.minigame.price.DKK);
    expect(gifted.lines.some(l => l.id === "minigame")).toBe(false);
  });

  it("never goes below zero or gives away something not picked", () => {
    const q = quote({ edition: "ultimate", friends: 10, bigGames: 5, minigames: 12, addons: { item: 1 }, free: { item: 3, party_mode: 1 } }, "DKK", 0);
    expect(q.bonus).toBe(ADDONS.item.price.DKK);
    expect(q.lines.some(l => l.id === "item" || l.id === "party_mode")).toBe(false);
  });
});

describe("the bonus through the draft and the Worker", () => {
  it("keeps the earliest unlock so it can't be re-extended", () => {
    const early = Date.now() - 2 * DAY;
    const d = withPerk(newDraft(), early);
    expect(withPerk(d, Date.now()).perkUnlockedAt).toBe(early);
    expect(withPerk(newDraft(), Date.now() - 30 * DAY).perkUnlockedAt).toBe(null);
  });

  it("frees Party Mode on an 18+ Ultimate draft", () => {
    let d: Draft = { ...newDraft(), edition: "ultimate", bigGames: ["kart"] };
    d = setPartyMode(setAdults(d, "yes"), true);
    d = withPerk(d, Date.now() - DAY);
    expect(quote(toPicks(d), "DKK", 0).lines.some(l => l.id === "party_mode")).toBe(false);
  });

  it("the Worker drops an expired or forged unlock time", () => {
    const base = {
      edition: "standard", currency: "DKK", country: "DK", friends: [{ id: "a", name: "Mads" }], bigGames: ["kart"], minigames: [],
      customGame: "", sections: {}, organiser: { name: "O", email: "o@x.dk", photosPermission: true, startNow: true }, shownTotal: 0,
    };
    const fresh = checkPayload({ ...base, perkUnlockedAt: NOW - DAY }, 2026, NOW);
    const stale = checkPayload({ ...base, perkUnlockedAt: NOW - 30 * DAY }, 2026, NOW);
    const forged = checkPayload({ ...base, perkUnlockedAt: "free please" }, 2026, NOW);
    expect(fresh.ok && fresh.value.perkUnlockedAt).toBe(NOW - DAY);
    expect(stale.ok && stale.value.perkUnlockedAt).toBe(null);
    expect(forged.ok && forged.value.perkUnlockedAt).toBe(null);
    expect(fresh.ok && picksFromPayload(fresh.value, NOW).free).toEqual({ minigame: 12 });
    expect(fresh.ok && picksFromPayload(fresh.value, NOW + 8 * DAY).free).toBeUndefined();
  });
});
