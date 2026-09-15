import { describe, expect, it } from "vitest";
import { BIG_GAMES, MINIGAMES, visibleMinigames } from "../src/order/catalogue";
import {
  addFriend, allowanceUse, chooseEdition, newDraft, problems, removeFriend, reviveDraft, setPartyMode, setPhoto, shareMessage, toggleIn, toPicks, updateFriend,
  type Draft, type PhotoMeta,
} from "../src/order/draft";
import { checkPayload, picksFromPayload } from "../src/order/payload";
import { faceCrop, judgePhoto, laplacianVariance, meanBrightness, quantise } from "../src/order/photoRules";
import { ACTIVE_LADDER, MAX_FRIENDS, smallestEditionFor } from "../src/order/prices";

const photo = (status: PhotoMeta["status"] = "ok"): PhotoMeta => ({ key: "k", width: 900, height: 1200, status, note: "" });

function fullSquad(n: number): Draft {
  let d = newDraft();
  for (let i = 0; i < n; i++) {
    d = addFriend(d, `f${i}`);
    d = updateFriend(d, `f${i}`, { name: `Friend ${i}` });
    for (const k of ["face", "body", "outfit"] as const) d = setPhoto(d, `f${i}`, k, photo());
  }
  return d;
}

describe("draft", () => {
  it("follows the squad size with the edition until the visitor picks one", () => {
    let d = fullSquad(2);
    expect(d.edition).toBe(smallestEditionFor(2));
    d = addFriend(addFriend(addFriend(addFriend(addFriend(d, "a"), "b"), "c"), "d"), "e");
    expect(d.edition).toBe(smallestEditionFor(7));
    d = chooseEdition(d, "standard");
    d = removeFriend(d, "a");
    expect(d.edition).toBe("standard");
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
    expect(problems(d, "squad").map(p => p.message)).toEqual(["Friend 1 needs a name.", "Friend 1: add a face photo.", "Friend 1: add a full body photo.", "Friend 1: add an outfit photo."]);
    d = fullSquad(1);
    d = setPhoto(d, "f0", "face", { ...photo("fail"), note: "We can't find a face." });
    expect(problems(d, "squad")[0].message).toMatch(/won't work\. We can't find a face/);
    expect(problems(fullSquad(1), "squad")).toEqual([]);
    expect(problems(fullSquad(1), "games")[0].message).toMatch(/big game/);
  });

  it("asks for the organiser's details, and the age gate only with Party Mode", () => {
    let d = { ...fullSquad(2), bigGames: ["kart"] };
    expect(problems(d, "review").map(p => p.message)).toEqual([
      "Add your name.", "Add an email address we can reach you on.",
      "Confirm that everyone in the photos agreed to be in the game.", "Tick that we can start work straight away.",
    ]);
    d = { ...d, organiser: { ...d.organiser, name: "Mads", email: "mads@example.com", photosPermission: true, startNow: true } };
    expect(problems(d, "review")).toEqual([]);
    d = setPartyMode(d, true);
    expect(problems(d, "review", 2026).map(p => p.message)).toContain("Party Mode is 18+: add your birth year.");
    d = { ...d, organiser: { ...d.organiser, birthYear: "2010", adultsConfirmed: true } };
    expect(problems(d, "review", 2026).map(p => p.message)).toContain("Party Mode is 18+: add your birth year.");
    d = { ...d, organiser: { ...d.organiser, birthYear: "1996" } };
    expect(problems(d, "review", 2026)).toEqual([]);
  });

  it("offers drinking games only with Party Mode, and takes them back out when it's turned off", () => {
    expect(visibleMinigames(false).some(m => m.drinking)).toBe(false);
    expect(visibleMinigames(true)).toHaveLength(MINIGAMES.length);
    let d = setPartyMode(newDraft(), true);
    d = { ...d, minigames: ["kings-cup", "blackjack"] };
    expect(setPartyMode(d, false).minigames).toEqual(["blackjack"]);
  });

  it("turns the draft into the counts prices.ts quotes", () => {
    let d = { ...fullSquad(3), bigGames: toggleIn(toggleIn([], "kart"), "gym"), minigames: ["blackjack"], customGame: "  a thing  ", flexPass: true };
    d = setPartyMode(d, true);
    expect(toPicks(d)).toEqual({ edition: d.edition, friends: 3, bigGames: 2, minigames: 1, addons: { big_game_custom: 1, party_mode: 1, flex_pass: 1 } });
    expect(allowanceUse(d).bigGames.used).toBe(2);
  });

  it("revives a stored draft safely and throws away anything it doesn't recognise", () => {
    expect(reviveDraft(null).friends).toEqual([]);
    expect(reviveDraft({ version: 7 }).step).toBe("squad");
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
    expect(picksFromPayload(r.value)).toEqual({ edition: "deluxe", friends: 2, bigGames: 1, minigames: 1, addons: { flex_pass: 1 } });
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

describe("photo rules", () => {
  const base = { kind: "face" as const, width: 1000, height: 1200, brightness: 130, sharpness: 300 };
  const face = (w: number, score = 0.9) => ({ x: 300, y: 300, width: w, height: w, score });

  it("fails what can't work and only warns about what could be better", () => {
    expect(judgePhoto({ ...base, width: 300, faces: [face(200)] }).status).toBe("fail");
    expect(judgePhoto({ ...base, faces: [] }).status).toBe("fail");
    expect(judgePhoto({ ...base, faces: [face(300), face(250)] }).status).toBe("fail");
    expect(judgePhoto({ ...base, faces: [face(100)] }).status).toBe("warn");
    expect(judgePhoto({ ...base, faces: [face(300)], brightness: 30 }).status).toBe("warn");
    expect(judgePhoto({ ...base, faces: [face(300)], sharpness: 5 }).status).toBe("warn");
    expect(judgePhoto({ ...base, faces: [face(300)] }).status).toBe("ok");
    expect(judgePhoto({ ...base, faces: [face(300, 0.2)] }).status).toBe("fail"); // a low-confidence blob isn't a face
  });

  it("never blocks when face detection couldn't run on the device", () => {
    expect(judgePhoto({ ...base, faces: null }).status).toBe("unchecked");
    expect(judgePhoto({ ...base, kind: "body", faces: null }).status).toBe("ok");
  });

  it("measures brightness and blur", () => {
    const flat = new Uint8ClampedArray(10 * 10 * 4).fill(200);
    expect(Math.round(meanBrightness(flat))).toBe(200);
    expect(laplacianVariance(flat, 10, 10)).toBe(0);
    const checker = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < 100; i++) checker.fill((i % 10) % 2 === (Math.floor(i / 10) % 2) ? 255 : 0, i * 4, i * 4 + 3);
    expect(laplacianVariance(checker, 10, 10)).toBeGreaterThan(1000);
  });

  it("snaps colours to the palette and crops round the face, inside the photo", () => {
    const px = new Uint8ClampedArray([27, 158, 150, 255]);
    expect([...quantise(px)]).toEqual([26, 158, 149, 255]);
    const c = faceCrop(1000, 800, { x: 900, y: 700, width: 200, height: 200, score: 1 });
    expect(c.x + c.size).toBeLessThanOrEqual(1000);
    expect(c.y + c.size).toBeLessThanOrEqual(800);
    expect(faceCrop(600, 900, null).size).toBeLessThanOrEqual(600);
  });
});

describe("catalogue", () => {
  it("has nine big games with art, and the ladder the page uses exists", () => {
    expect(BIG_GAMES).toHaveLength(9);
    for (const g of [...BIG_GAMES, ...MINIGAMES]) expect(g.art).toMatch(/\.webp$/);
    expect(["A", "B"]).toContain(ACTIVE_LADDER);
  });
});
