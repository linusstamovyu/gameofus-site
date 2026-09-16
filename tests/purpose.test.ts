// Step 0, "what's it for" (plan 19): the occasion doors, the group-size rule, the story outlines, and the
// art they play. The step's own DOM is not tested (no jsdom here) — these are the rules it renders.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDITION, MIN_FRIENDS, newDraft, prefillSquad, problems, setGroupSize, setOccasion, setOutline,
  squadFriends, squadSize, STEPS, updateFriend, type Draft,
} from "../src/order/draft";
import { GROUP_SIZES, OCCASIONS, OCCASION_IDS, occasionById, suggestedSize } from "../src/order/occasions";
import { OUTLINES, OUTLINE_IDS, outlineById, storySection, type StoryChoices } from "../src/order/sections/story";
import { checkPayload, type OrderPayload } from "../src/order/payload";
import { MAX_FRIENDS, smallestEditionFor } from "../src/order/prices";

const orderAssets = resolve(__dirname, "..", "public/order-assets");
const story = (d: Draft) => d.sections.story as StoryChoices;
let n = 0;
const id = () => `s${n++}`;

const withFriend = (d: Draft, slot = 0, name = "Mads"): Draft => updateFriend(d, d.friends[slot].id, { name });

describe("step 0: what's it for", () => {
  it("is the first step, and a fresh order opens on it", () => {
    expect(STEPS[0].id).toBe("purpose");
    expect(newDraft().step).toBe("purpose");
    expect(newDraft().occasion).toBeNull();
  });

  it("never blocks: the occasion is optional, so the step can be skipped", () => {
    expect(problems(newDraft(), "purpose")).toEqual([]);
    expect(problems(setOccasion(newDraft(), "trip", id), "purpose")).toEqual([]);
  });

  it("sets the tone and the edition from the occasion, and nothing that costs money", () => {
    const before = prefillSquad(newDraft(), id);
    const d = setOccasion(before, "partner", id);
    expect(d.occasion).toBe("partner");
    expect(story(d).tone).toBe("romance");
    expect(d.edition).toBe("standard");
    // Suggestions are offered with a price and a tap, never applied by the door (plan 03: the total leads).
    expect(d.partyMode).toBe(false);
    expect(d.flexPass).toBe(false);
    expect(d.directorsCut).toBe(false);
    expect(story(d).ending.type).toBe("none");
    expect(story(d).outline).toBe("own");
  });

  it("opens each occasion on the size it suggests", () => {
    for (const occ of OCCASIONS) {
      const d = setOccasion(prefillSquad(newDraft(), id), occ.id, id);
      expect(squadSize(d), occ.id).toBe(suggestedSize(occ.id));
    }
  });

  it("leaves the edition alone once the visitor has picked one themselves", () => {
    const chosen: Draft = { ...prefillSquad(newDraft(), id), edition: "ultimate", editionChosen: true };
    const d = setOccasion(chosen, "partner", id);
    expect(d.edition).toBe("ultimate");
    expect(story(d).tone).toBe("romance");
  });
});

describe("how many people is it for", () => {
  it("sets the slots to the answer, not to the edition's allowance", () => {
    const d = setGroupSize(prefillSquad(newDraft(), id), 4, id);
    expect(squadSize(d)).toBe(4);
    // and the edition follows as the smallest that fits, still as a recommendation
    expect(d.edition).toBe(smallestEditionFor(4));
    expect(d.editionChosen).toBe(false);
  });

  it("never drops a friend somebody has already typed in", () => {
    let d = setGroupSize(prefillSquad(newDraft(), id), 4, id);
    d = withFriend(d, 0, "Mads");
    d = withFriend(d, 1, "Rico");
    d = setGroupSize(d, 1, id);
    expect(squadFriends(d).map(f => f.name)).toEqual(["Mads", "Rico"]);
    expect(squadSize(d)).toBe(2);
  });

  it("clamps to the sizes the game can take", () => {
    expect(squadSize(setGroupSize(newDraft(), 0, id))).toBe(MIN_FRIENDS);
    expect(squadSize(setGroupSize(newDraft(), 99, id))).toBe(MAX_FRIENDS);
    for (const n of GROUP_SIZES) expect(n).toBeLessThanOrEqual(MAX_FRIENDS);
  });

  it("opens a squad with no edition on the default one", () => {
    const d = setGroupSize({ ...newDraft(), edition: null }, 12, id);
    expect(d.edition ?? DEFAULT_EDITION).toBeTruthy();
    expect(squadSize(d)).toBe(12);
  });
});

describe("the story outlines", () => {
  it("offers four shapes plus our own story, and every occasion points at real ones", () => {
    expect(OUTLINE_IDS).toContain("own");
    expect(OUTLINES).toHaveLength(5);
    for (const occ of OCCASIONS) {
      expect(occ.outlines.length, occ.id).toBeGreaterThan(0);
      for (const o of occ.outlines) expect(OUTLINE_IDS, `${occ.id} -> ${o}`).toContain(o);
    }
  });

  it("every outline but our own says what the customer has to tell us", () => {
    for (const o of OUTLINES) {
      if (o.id === "own") expect(o.asks).toBe("");
      else expect(o.asks.length, o.id).toBeGreaterThan(0);
    }
  });

  it("rides the story section, so it reaches the Worker and the order sheet", () => {
    const d = setOutline(newDraft(), "heist");
    expect(story(d).outline).toBe("heist");
    expect(storySection.check(story(d)).outline).toBe("heist");
    expect(storySection.summary(storySection.check({ ...story(d), memory: "They took our passports." }), { edition: "deluxe", includes: { characters: 6, bigGames: 3, minigames: 6, vehicles: 3, phonePhotos: 6, phoneBeats: 1, zones: 3, evolutions: 1, cutscenes: 1, movesPerCharacter: 1, voiceLines: 1, revisions: 2 }, friends: [], partyMode: false, currency: "DKK" }))
      .toContain("Outline: The Heist");
    // junk comes back as our own story rather than crashing the page
    expect(storySection.check({ outline: "wedding" }).outline).toBe("own");
  });

  it("asks for that outline's own blank when the memory is empty", () => {
    const heist = storySection.check({ outline: "heist" });
    expect(storySection.problems(heist, { edition: "standard", includes: { characters: 2, bigGames: 1, minigames: 3, vehicles: 1, phonePhotos: 3, phoneBeats: 0, zones: 1, evolutions: 0, cutscenes: 0, movesPerCharacter: 1, voiceLines: 0, revisions: 1 }, friends: [], partyMode: false, currency: "DKK" })[0])
      .toBe(`${outlineById("heist").asks} Type it in, or attach a voice note.`);
  });

  it("ships the three frames and the card each outline plays", () => {
    for (const o of OUTLINES) {
      if (o.id === "own") continue;
      for (const n of [1, 2, 3]) {
        expect(existsSync(resolve(orderAssets, `loop_outline_${o.id}_${n}.webp`)), `loop_outline_${o.id}_${n}.webp`).toBe(true);
      }
      expect(existsSync(resolve(orderAssets, `outline_${o.id}.webp`)), `outline_${o.id}.webp`).toBe(true);
    }
  });
});

describe("the occasion on the order", () => {
  const good = (over: Partial<OrderPayload> = {}): unknown => ({
    edition: "standard",
    currency: "DKK",
    country: "DK",
    friends: [{ id: "a", name: "Mads", photo: null }],
    bigGames: ["kart"],
    minigames: [],
    customGame: "",
    partyMode: false,
    flexPass: false,
    directorsCut: false,
    sections: {},
    organiser: { name: "Mads", email: "m@example.com", birthYear: "", adultsConfirmed: false, photosPermission: true, startNow: true },
    shownTotal: 79900,
    ...over,
  });

  it("carries a known occasion and drops anything else", () => {
    for (const occ of OCCASION_IDS) {
      const checked = checkPayload(good({ occasion: occ }));
      expect(checked.ok && checked.value.occasion, occ).toBe(occ);
    }
    for (const junk of [undefined, null, "wedding", 7, {}]) {
      const checked = checkPayload(good({ occasion: junk as never }));
      expect(checked.ok && checked.value.occasion).toBeNull();
    }
  });

  it("names every occasion it offers", () => {
    for (const id of OCCASION_IDS) {
      const occ = occasionById(id)!;
      expect(occ.title.length).toBeGreaterThan(0);
      expect(occ.line.length).toBeGreaterThan(0);
      // The recommendation reads "Because <why>, there are 6 of you…", so it must not be a title.
      expect(occ.why.startsWith("it "), id).toBe(true);
    }
    expect(occasionById("nope" as never)).toBeNull();
  });
});
