import { describe, expect, it } from "vitest";
import { LADDERS, type EditionId } from "../src/order/prices";
import { MAX_PHONE_BEATS, MAX_PHONE_PHOTOS, phoneSection, type PhoneBeat, type PhoneChoices } from "../src/order/sections/phone";
import type { SectionContext, UploadRef } from "../src/order/sections/types";

const ctx = (edition: EditionId): SectionContext => ({ edition, includes: LADDERS.A.editions[edition].includes, friends: ["A", "B"], partyMode: false, currency: "DKK" });
const ref = (id: string): UploadRef => ({ id, kind: "image", name: `${id}.jpg`, type: "image/jpeg", size: 1000 });
const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ upload: ref(`p${i}`), caption: "" }));
const beat = (id: string, custom = false, kind: PhoneBeat["kind"] = "call"): PhoneBeat => ({ id, kind, from: "Mum", about: "Dinner", custom });
const choices = (patch: Partial<PhoneChoices>): PhoneChoices => ({ ...phoneSection.defaults(), ...patch });

describe("phone section", () => {
  it("defaults to an empty phone with both free apps on", () => {
    expect(phoneSection.defaults()).toEqual({ photos: [], beats: [], mapsApp: true, gamesApp: true });
    expect(phoneSection.check(phoneSection.defaults())).toEqual(phoneSection.defaults());
  });

  it("never throws on junk and falls back to defaults", () => {
    for (const junk of [null, undefined, 3, "x", [], { photos: "no", beats: 7, mapsApp: "yes" }]) {
      expect(phoneSection.check(junk)).toEqual(phoneSection.defaults());
    }
  });

  it("sanitises photos: bad refs, duplicates, long captions, the cap", () => {
    const raw = {
      photos: [
        { upload: ref("ok-1"), caption: "  hello  " },
        { upload: ref("ok-1"), caption: "dupe" },
        { upload: { ...ref("bad id!"), kind: "image" }, caption: "" },
        { upload: { ...ref("audio"), kind: "audio" } },
        { upload: { ...ref("neg"), size: -1 } },
        { upload: { ...ref("notype"), type: 5 } },
        { upload: ref("long"), caption: "x".repeat(200) },
        "nope",
      ],
    };
    const c = phoneSection.check(raw);
    expect(c.photos.map(p => p.upload.id)).toEqual(["ok-1", "long"]);
    expect(c.photos[0].caption).toBe("hello");
    expect(c.photos[1].caption).toHaveLength(80);
    expect(phoneSection.check({ photos: photos(50) }).photos).toHaveLength(MAX_PHONE_PHOTOS);
  });

  it("sanitises beats: unknown kinds, bad ids, duplicates, caps, custom must be true", () => {
    const c = phoneSection.check({
      beats: [
        { id: "a", kind: "call", from: " Mum ", about: "y".repeat(900), custom: "yes" },
        { id: "a", kind: "news", from: "dupe", about: "" },
        { id: "b", kind: "text", from: "x", about: "x" },
        { id: "<script>", kind: "news", from: "x", about: "x" },
        { id: "c", kind: "news", from: "z".repeat(100), about: "ok", custom: true },
      ],
    });
    expect(c.beats.map(b => b.id)).toEqual(["a", "c"]);
    expect(c.beats[0]).toMatchObject({ from: "Mum", custom: false });
    expect(c.beats[0].about).toHaveLength(500);
    expect(c.beats[1].from).toHaveLength(60);
    expect(c.beats[1].custom).toBe(true);
    const many = Array.from({ length: 20 }, (_, i) => beat(`b${i}`));
    expect(phoneSection.check({ beats: many }).beats).toHaveLength(MAX_PHONE_BEATS);
  });

  it("keeps app toggles only when they are booleans", () => {
    expect(phoneSection.check({ mapsApp: false, gamesApp: false })).toMatchObject({ mapsApp: false, gamesApp: false });
    expect(phoneSection.check({ mapsApp: 0, gamesApp: null })).toMatchObject({ mapsApp: true, gamesApp: true });
  });

  it("charges photos over each edition's allowance", () => {
    // standard 3, deluxe 6, ultimate 12
    expect(phoneSection.addons(choices({ photos: photos(3) }), ctx("standard"))).toEqual({});
    expect(phoneSection.addons(choices({ photos: photos(7) }), ctx("standard"))).toEqual({ phone_photo: 4 });
    expect(phoneSection.addons(choices({ photos: photos(7) }), ctx("deluxe"))).toEqual({ phone_photo: 1 });
    expect(phoneSection.addons(choices({ photos: photos(12) }), ctx("ultimate"))).toEqual({});
  });

  it("charges beats over the allowance, covering custom beats first", () => {
    const mixed = [beat("a"), beat("b", true), beat("c", false, "news")];
    // standard includes 0 beats
    expect(phoneSection.addons(choices({ beats: mixed }), ctx("standard"))).toEqual({ phone_beat: 2, phone_beat_custom: 1 });
    // deluxe includes 1: it covers the custom one
    expect(phoneSection.addons(choices({ beats: mixed }), ctx("deluxe"))).toEqual({ phone_beat: 2 });
    // ultimate includes 3: all covered
    expect(phoneSection.addons(choices({ beats: mixed }), ctx("ultimate"))).toEqual({});
    // two customs on deluxe: one custom extra, plain still extra
    expect(phoneSection.addons(choices({ beats: [beat("a", true), beat("b", true), beat("c")] }), ctx("deluxe"))).toEqual({ phone_beat: 1, phone_beat_custom: 1 });
    // ultimate with 4 customs + 1 plain
    const five = [beat("a", true), beat("b", true), beat("c", true), beat("d", true), beat("e")];
    expect(phoneSection.addons(choices({ beats: five }), ctx("ultimate"))).toEqual({ phone_beat: 1, phone_beat_custom: 1 });
  });

  it("asks every beat for who or a headline and what it's about", () => {
    expect(phoneSection.problems(choices({}), ctx("standard"))).toEqual([]);
    const probs = phoneSection.problems(choices({ beats: [{ ...beat("a"), from: "" }, { ...beat("b", false, "news"), about: "" }, beat("c")] }), ctx("standard"));
    expect(probs).toHaveLength(2);
    expect(probs[0]).toMatchObject({ message: expect.stringMatching(/Call 1/), field: "beat:0:from" });
    expect(probs[1]).toMatchObject({ message: expect.stringMatching(/News mail 2/), field: "beat:1:about" });
  });

  it("summarises photos, beats and apps", () => {
    const c = choices({
      photos: [{ upload: ref("p0"), caption: "Beach day" }, { upload: ref("p1"), caption: "" }],
      beats: [beat("a"), { ...beat("b", true, "news"), from: "Local lads lose passports", about: "At the airport" }],
      gamesApp: false,
    });
    const lines = phoneSection.summary(c, ctx("deluxe"));
    expect(lines).toContain("Photos app: 2 photos");
    expect(lines).toContain("Call from Mum: Dinner");
    expect(lines.some(l => l.startsWith('News mail: "Local lads lose passports"'))).toBe(true);
    expect(lines).toContain("Apps: Maps");
    expect(phoneSection.summary(phoneSection.defaults(), ctx("deluxe"))).toEqual(["Apps: Maps, Games"]);
  });

  it("lists every photo as an upload", () => {
    expect(phoneSection.uploads(choices({ photos: photos(3) })).map(u => u.id)).toEqual(["p0", "p1", "p2"]);
    expect(phoneSection.uploads(phoneSection.defaults())).toEqual([]);
  });
});
