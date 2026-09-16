import { describe, expect, it } from "vitest";
import { BIG_GAMES, MINIGAMES, minigameLocked, selectableMinigames } from "../src/order/catalogue";
import {
  addFriend, allowanceUse, DEFAULT_EDITION, emptySlots, MIN_FRIENDS, PRETICK_PARTY_MODE_ON_ADULTS, prefillSquad, squadFriends, completeConsent, consentProblems, needsConsent, partyModeAvailable, setAdults, setPhotosPermission, toggleMinigame, setSection, chooseEdition, newDraft, problems, removeFriend, reviveDraft, setPartyMode, setPhoto, shareMessage, toggleIn, toPicks, updateFriend,
  type Draft, type PhotoMeta,
} from "../src/order/draft";
import { checkPayload, picksFromPayload } from "../src/order/payload";
import { ACTIVE_LADDER, LADDERS, MAX_FRIENDS } from "../src/order/prices";
import { storySection } from "../src/order/sections/story";
import { worldSection } from "../src/order/sections/world";

const photo = (status: PhotoMeta["status"] = "ok"): PhotoMeta => ({ key: "k", width: 900, height: 1200, status, note: "", face: null, body: null });

function fullSquad(n: number): Draft {
  let d: Draft = { ...newDraft(), edition: "deluxe" };
  for (let i = 0; i < n; i++) {
    d = addFriend(d, `f${i}`);
    d = updateFriend(d, `f${i}`, { name: `Friend ${i}` });
    d = setPhoto(d, `f${i}`, photo());
  }
  return d;
}

describe("draft", () => {
  it("opens with the edition's character slots, and the edition sizes the empty slots", () => {
    const inc = (id: "standard" | "deluxe" | "ultimate") => LADDERS[ACTIVE_LADDER].editions[id].includes.characters;
    let n = 0;
    const id = () => `s${n++}`;
    let d = prefillSquad(newDraft(), id);
    expect(d.edition).toBe(DEFAULT_EDITION);
    expect(d.friends).toHaveLength(inc(DEFAULT_EDITION));
    expect(squadFriends(d)).toEqual([]);
    // Empty slots are charged: the total doesn't jump when the last friend is typed in.
    expect(toPicks(d).friends).toBe(inc(DEFAULT_EDITION));
    // A squad already started is left alone (old drafts).
    expect(prefillSquad(fullSquad(2), id).friends).toHaveLength(2);
    // Picking an edition pads or trims EMPTY slots only; filled friends are never dropped.
    d = updateFriend(d, "s0", { name: "Mads" });
    d = chooseEdition(d, "ultimate", id);
    expect(d.friends).toHaveLength(inc("ultimate"));
    d = chooseEdition(d, "standard", id);
    expect(d.friends).toHaveLength(inc("standard"));
    expect(d.friends[0].name).toBe("Mads");
    // Adding past the allowance keeps the edition (the extra is priced by prices.ts), and removing never moves it.
    for (let i = 0; i < 3; i++) d = updateFriend(addFriend(d, `x${i}`), `x${i}`, { name: `X${i}` });
    expect(d.edition).toBe("standard");
    expect(d.friends).toHaveLength(5); // Mads, the Standard's empty second slot, three extras
    expect(toPicks(d).friends).toBe(5);
    d = removeFriend(d, "x0");
    expect(d.edition).toBe("standard");
    expect(allowanceUse(d).friends).toEqual({ used: 4, included: inc("standard") });
  });

  it("never removes the last slot, and picking a smaller edition drops empty slots wherever they sit", () => {
    let d = addFriend(newDraft(), "only");
    expect(removeFriend(d, "only").friends).toHaveLength(MIN_FRIENDS);
    d = { ...fullSquad(3), edition: "ultimate" as const };
    d = addFriend(addFriend(d, "e1"), "e2");
    d = { ...d, friends: [d.friends[3], ...d.friends.slice(0, 3), d.friends[4]] }; // an empty slot first
    expect(emptySlots(d)).toEqual([1, 5]);
    d = chooseEdition(d, "standard");
    expect(d.friends.map(f => f.id)).toEqual(["f0", "f1", "f2"]); // 3 friends beyond Standard's 2 stay as an extra
  });

  it("caps the squad at 12", () => {
    let d = newDraft();
    for (let i = 0; i < 20; i++) d = addFriend(d, `f${i}`);
    expect(d.friends).toHaveLength(MAX_FRIENDS);
  });

  it("says what's missing on each step, in plain words", () => {
    const empty = newDraft();
    expect(problems(empty, "squad")[0].message).toMatch(/Add at least one friend/);
    let d = addFriend(empty, "x");
    expect(problems(d, "squad").map(p => p.message)).toEqual(["Slot 1 is empty — add a friend."]); // the only slot can't be removed
    d = updateFriend(d, "x", { name: "Mads" });
    expect(problems(d, "squad").map(p => p.message)).toEqual(["Mads: add a photo (one clear face, head to feet)."]);
    d = setPhoto(updateFriend(d, "x", { name: "" }), "x", photo());
    expect(problems(d, "squad").map(p => p.message)).toEqual(["Friend 1 needs a name."]);
    expect(problems(setPhoto(d, "x", { ...photo(), recheck: true }), "squad").map(p => p.message)).toContain("Friend 1: we're still checking the photo.");
    // An empty slot next to a real friend blocks the step until it's filled or removed.
    const withEmpty = addFriend(fullSquad(1), "open");
    expect(problems(withEmpty, "squad").map(p => p.message)).toEqual(["Slot 2 is empty — add a friend or remove the slot."]);
    expect(problems(withEmpty, "review").map(p => p.message)).toContain("Slot 2 is empty — add a friend or remove the slot.");
    expect(problems(removeFriend(withEmpty, "open"), "squad")).toEqual([]);
    d = fullSquad(1);
    d = setPhoto(d, "f0", { ...photo("fail"), note: "We can't see feet. Step back so the whole body is in the shot." });
    expect(problems(d, "squad")[0].message).toMatch(/photo won't work\. We can't see feet/);
    expect(problems(fullSquad(1), "squad")).toEqual([]);
    expect(problems(fullSquad(1), "games")[0].message).toMatch(/big game/);
  });

  it("needs a home base and the memory before review, as steps 4–9 require", () => {
    const d = { ...fullSquad(2), bigGames: ["kart"] };
    const messages = problems(d, "review").map(p => p.message);
    expect(messages).toContain("Add at least your home base.");
    expect(messages).toContain("Tell us the memory, or attach a voice note.");
  });

  it("asks for the organiser's details, and the age gate only with Party Mode", () => {
    let d = { ...fullSquad(2), bigGames: ["kart"] };
    d = setSection(d, "world", worldSection.check({ places: [{ id: "home1", kind: "home", kit: "home", name: "Our flat", photos: [] }] }));
    d = setSection(d, "story", storySection.check({ memory: "The night we lost the passports in Albufeira." }));
    expect(problems(d, "review").map(p => p.message)).toEqual([
      "Add your name.", "Add an email address we can reach you on.", "Tell us whether everyone in your group is 18 or over.",
      "Confirm that everyone in the photos agreed to be in the game.", "Tick that we can start work straight away.",
    ]);
    d = { ...d, organiser: { ...d.organiser, name: "Mads", email: "mads@example.com", photosPermission: true, startNow: true } };
    d = setAdults(d, "no");
    expect(problems(d, "review")).toEqual([]);
    d = { ...d, consent: { ...d.consent, adults: "yes" } };
    d = setPartyMode(d, true);
    expect(problems(d, "review", 2026).map(p => p.message)).toContain("Party Mode is 18+: add your birth year.");
    d = { ...d, organiser: { ...d.organiser, birthYear: "2010", adultsConfirmed: true } };
    expect(problems(d, "review", 2026).map(p => p.message)).toContain("Party Mode is 18+: add your birth year.");
    d = { ...d, organiser: { ...d.organiser, birthYear: "1996" } };
    expect(problems(d, "review", 2026)).toEqual([]);
  });

  it("shows drinking games locked without Party Mode, and takes them back out when it's turned off", () => {
    const kingsCup = MINIGAMES.find(m => m.id === "kings-cup")!;
    expect(minigameLocked(kingsCup, false)).toBe(true);
    expect(minigameLocked(kingsCup, true)).toBe(false);
    expect(selectableMinigames(false).some(m => m.drinking)).toBe(false);
    expect(selectableMinigames(true)).toHaveLength(MINIGAMES.length);
    expect(toggleMinigame(newDraft(), "kings-cup").minigames).toEqual([]);
    expect(toggleMinigame(newDraft(), "blackjack").minigames).toEqual(["blackjack"]);
    expect(toggleMinigame(setPartyMode(newDraft(), true), "kings-cup").minigames).toEqual(["kings-cup"]);
    let d = setPartyMode(newDraft(), true);
    d = { ...d, minigames: ["kings-cup", "blackjack"] };
    expect(setPartyMode(d, false).minigames).toEqual(["blackjack"]);
  });

  it("needs the consent screen answered before the order starts", () => {
    let d = newDraft();
    expect(needsConsent(d)).toBe(true);
    expect(consentProblems(d)).toHaveLength(2);
    expect(completeConsent(d, 5).consent.answeredAt).toBeNull();
    d = setAdults(setPhotosPermission(d, true), "no");
    d = completeConsent(d, 5);
    expect(d.consent.answeredAt).toBe(5);
    expect(needsConsent(d)).toBe(false);
    // Stays answered through a save and reload.
    expect(needsConsent(reviveDraft(JSON.parse(JSON.stringify(d))))).toBe(false);
  });

  it("a Yes only unlocks Party Mode (never pre-ticked), and a No turns it off and keeps it locked", () => {
    expect(PRETICK_PARTY_MODE_ON_ADULTS).toBe(false);
    let d = setAdults(setPhotosPermission(newDraft(), true), "yes");
    expect(d.partyMode).toBe(false);
    expect(d.organiser.adultsConfirmed).toBe(true);
    expect(toPicks(d).addons?.party_mode).toBeUndefined();
    expect(partyModeAvailable(d)).toBe(true);
    // The drinking games stay locked until the customer ticks it themselves.
    expect(toggleMinigame(d, "kings-cup").minigames).toEqual([]);
    d = setPartyMode(d, true);
    expect(toPicks(d).addons?.party_mode).toBe(1);
    // Answering Yes again leaves the customer's own choice alone either way.
    expect(setAdults(d, "yes").partyMode).toBe(true);
    d = setAdults(setPartyMode(d, false), "yes");
    expect(d.partyMode).toBe(false);
    d = toggleMinigame(setPartyMode(d, true), "kings-cup");
    d = setAdults(d, "no");
    expect(d.partyMode).toBe(false);
    expect(d.minigames).toEqual([]);
    expect(d.organiser.adultsConfirmed).toBe(false);
    expect(partyModeAvailable(d)).toBe(false);
    expect(setPartyMode(d, true).partyMode).toBe(false);
    expect(toggleMinigame(d, "the-bus").minigames).toEqual([]);
  });

  it("normalises drafts saved before the consent screen", () => {
    const { consent: _drop, ...old } = setPartyMode(fullSquad(1), true);
    const plain = reviveDraft({ ...old, organiser: { ...old.organiser, adultsConfirmed: false } });
    expect(plain.consent).toEqual({ adults: null, answeredAt: null });
    expect(needsConsent(plain)).toBe(true);
    const ticked = reviveDraft({ ...old, organiser: { ...old.organiser, adultsConfirmed: true } });
    expect(ticked.consent.adults).toBe("yes");
    expect(ticked.partyMode).toBe(true);
    expect(needsConsent(ticked)).toBe(true);
    const contradictory = reviveDraft({ ...old, minigames: ["kings-cup", "blackjack"], consent: { adults: "no", answeredAt: 1 } });
    expect(contradictory.partyMode).toBe(false);
    expect(contradictory.minigames).toEqual(["blackjack"]);
    expect(reviveDraft({ ...old, consent: { adults: "maybe", answeredAt: 3 } }).consent).toEqual({ adults: null, answeredAt: null });
  });

  it("turns the draft into the counts prices.ts quotes", () => {
    let d = { ...fullSquad(3), bigGames: toggleIn(toggleIn([], "kart"), "gym"), minigames: ["blackjack"], customGame: "  a thing  ", flexPass: true };
    d = setPartyMode(d, true);
    expect(toPicks(d)).toEqual({ edition: d.edition, friends: 3, bigGames: 2, minigames: 1, addons: { big_game_custom: 1, party_mode: 1, flex_pass: 1 }, rush: false });
    expect(allowanceUse(d).bigGames.used).toBe(2);
  });

  it("revives a stored draft safely and throws away anything it doesn't recognise", () => {
    expect(reviveDraft(null).friends).toEqual([]);
    // A draft this build cannot read comes back as a fresh one, which opens on step 0 (plan 19).
    expect(reviveDraft({ version: 7 }).step).toBe("purpose");
    // A draft it CAN read keeps its own place, and an unknown step lands on the squad rather than step 0:
    // somebody with friends typed in is past being asked what the game is for.
    expect(reviveDraft({ ...fullSquad(1), step: "nope", occasion: "wedding" }).occasion).toBeNull();
    const d = reviveDraft({ ...fullSquad(1), step: "nope", edition: "mega", bigGames: ["kart", "rocket"] });
    expect(d.step).toBe("squad");
    expect(d.edition).toBeNull();
    expect(d.bigGames).toEqual(["kart"]);
  });

  it("writes the group-chat message", () => {
    expect(shareMessage(["Mads", "Rico", "Kai"], "1,049 DKK", "350 DKK", "Deluxe")).toContain("starring Mads, Rico and Kai! It came to 1,049 DKK, so that's 350 DKK each.");
  });
});

describe("payload the Worker accepts", () => {
  const good = {
    edition: "deluxe", currency: "DKK", country: "dk", friends: [{ id: "a1", name: "Mads" }, { id: "b2", name: "Rico" }],
    bigGames: ["kart", "kart", "nope"], minigames: ["kings-cup", "blackjack"], customGame: "", partyMode: false, flexPass: true, directorsCut: false,
    organiser: { name: "Mads", email: "m@example.com", birthYear: "", adultsConfirmed: false, photosPermission: true, startNow: true }, shownTotal: 104900,
  };

  it("cleans a good order: duplicates and unknown games out, drinking games out without Party Mode", () => {
    const r = checkPayload(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.bigGames).toEqual(["kart"]);
    expect(r.value.minigames).toEqual(["blackjack"]);
    expect(r.value.country).toBe("DK");
    expect(picksFromPayload(r.value)).toEqual({ edition: "deluxe", friends: 2, bigGames: 1, minigames: 1, addons: { flex_pass: 1 }, rush: false });
  });

  it.each([
    [{ edition: "mega" }, /edition/],
    [{ currency: "USD" }, /currency/],
    [{ friends: [] }, /1 to 12/],
    [{ friends: [{ id: "a", name: "" }] }, /name/],
    [{ friends: [{ id: "a", name: "X" }, { id: "a", name: "Y" }] }, /share an id/],
    [{ bigGames: [], customGame: "" }, /big game/],
    [{ organiser: { ...good.organiser, email: "nope" } }, /email/],
    [{ organiser: { ...good.organiser, startNow: false } }, /confirmations/],
    [{ partyMode: true }, /18\+/],
  ])("refuses %o", (patch, msg) => {
    const r = checkPayload({ ...good, ...patch }, 2026);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });
});

describe("catalogue", () => {
  it("has nine big games with art, and the ladder the page uses exists", () => {
    expect(BIG_GAMES).toHaveLength(9);
    for (const g of [...BIG_GAMES, ...MINIGAMES]) expect(g.art).toMatch(/\.webp$/);
    expect(["A", "B"]).toContain(ACTIVE_LADDER);
  });
});
