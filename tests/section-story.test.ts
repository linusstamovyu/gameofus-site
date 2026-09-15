import { describe, expect, it } from "vitest";
import { LADDERS, type EditionId } from "../src/order/prices";
import { MAX_MOMENTS, MEMORY_MAX, storySection, type Moment, type StoryChoices } from "../src/order/sections/story";
import type { SectionContext, UploadRef } from "../src/order/sections/types";

const ctx = (edition: EditionId): SectionContext => ({
  edition,
  includes: LADDERS.A.editions[edition].includes,
  friends: ["Sam", "Dan"],
  partyMode: false,
  currency: "GBP",
});

const audio: UploadRef = { id: "voice-1", kind: "audio", name: "night.m4a", type: "audio/mp4", size: 1000 };
const photo = (id: string): UploadRef => ({ id, kind: "image", name: `${id}.jpg`, type: "image/jpeg", size: 500 });
const moment = (id: string, cutscene: boolean, text = "Something happened"): Moment => ({ id, text, photo: null, cutscene });
const base = (over: Partial<StoryChoices> = {}): StoryChoices => ({ ...storySection.defaults(), memory: "We missed the last ferry and slept on the beach.", ...over });

describe("story section", () => {
  it("starts empty with lads tone, English and no ending", () => {
    const d = storySection.defaults();
    expect(d).toEqual({ memory: "", voiceNote: null, tone: "lads", language: "English", boss: "", moments: [], ending: { type: "none", message: "", custom: false } });
    expect(storySection.check(d)).toEqual(d);
  });

  it("check() survives junk", () => {
    for (const junk of [null, undefined, 42, "x", [], { moments: "nope", ending: 7, tone: {} }]) {
      expect(storySection.check(junk)).toEqual(storySection.defaults());
    }
  });

  it("check() trims, caps and defaults", () => {
    const c = storySection.check({
      memory: `  ${"a".repeat(MEMORY_MAX + 50)}  `,
      tone: "horror",
      language: "   ",
      boss: "b".repeat(500),
      ending: { type: "wedding", message: "hi", custom: true },
    });
    expect(c.memory.length).toBe(MEMORY_MAX);
    expect(c.tone).toBe("lads");
    expect(c.language).toBe("English");
    expect(c.boss.length).toBe(200);
    expect(c.ending).toEqual({ type: "none", message: "", custom: false });
    expect(storySection.check({ language: "l".repeat(80) }).language.length).toBe(40);
    expect(storySection.check({ tone: "romance" }).tone).toBe("romance");
  });

  it("check() validates uploads by kind and drops bad moments", () => {
    const c = storySection.check({
      voiceNote: { ...audio, kind: "image" },
      moments: [
        { id: "ok-1", text: " hi ", photo: photo("p1"), cutscene: "yes" },
        { id: "bad id!", text: "x" },
        { id: "ok-1", text: "duplicate" },
        { id: "ok-2", text: "y".repeat(400), photo: { ...audio }, cutscene: true },
        { id: "ok-3", photo: { id: "p1", kind: "image", type: "image/jpeg", size: -1 } },
        "junk",
      ],
    });
    expect(c.voiceNote).toBeNull();
    expect(c.moments.map(m => m.id)).toEqual(["ok-1", "ok-2", "ok-3"]);
    expect(c.moments[0]).toEqual({ id: "ok-1", text: "hi", photo: photo("p1"), cutscene: false });
    expect(c.moments[1].text.length).toBe(300);
    expect(c.moments[1].photo).toBeNull();
    expect(c.moments[1].cutscene).toBe(true);
    expect(c.moments[2].photo).toBeNull();
    expect(storySection.check({ voiceNote: audio }).voiceNote).toEqual(audio);
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, text: "t" }));
    expect(storySection.check({ moments: many }).moments.length).toBe(MAX_MOMENTS);
  });

  it("charges cutscenes over each edition's allowance", () => {
    const four = [moment("a", true), moment("b", true), moment("c", true), moment("d", false), moment("e", true)];
    const c = base({ moments: four });
    expect(storySection.addons(c, ctx("standard"))).toEqual({ cutscene: 4 });
    expect(storySection.addons(c, ctx("deluxe"))).toEqual({ cutscene: 3 });
    expect(storySection.addons(c, ctx("ultimate"))).toEqual({});
    expect(storySection.addons(base(), ctx("standard"))).toEqual({});
  });

  it("prices endings: none free, standard ending, custom instead", () => {
    for (const ed of ["standard", "deluxe", "ultimate"] as EditionId[]) {
      expect(storySection.addons(base({ ending: { type: "birthday", message: "Happy 30th", custom: false } }), ctx(ed))).toEqual({ ending: 1 });
      expect(storySection.addons(base({ ending: { type: "proposal", message: "Will you?", custom: true } }), ctx(ed))).toEqual({ ending_custom: 1 });
    }
  });

  it("lists problems, with the voice-note exception", () => {
    expect(storySection.problems(storySection.defaults(), ctx("standard"))).toHaveLength(1);
    expect(storySection.problems(base({ memory: "too short" }), ctx("standard"))[0]).toMatch(/at least 20/);
    expect(storySection.problems(base(), ctx("standard"))).toEqual([]);
    expect(storySection.problems(base({ memory: "", voiceNote: audio }), ctx("standard"))).toEqual([]);
    expect(storySection.problems(base({ ending: { type: "dedication", message: "", custom: false } }), ctx("standard"))).toHaveLength(1);
    expect(storySection.problems(base({ moments: [moment("a", false, "")] }), ctx("standard"))).toHaveLength(1);
  });

  it("summarises the story", () => {
    const long = "x".repeat(200);
    const c = base({
      memory: long,
      voiceNote: audio,
      tone: "romance",
      language: "Danish",
      boss: "The ferry",
      moments: [moment("a", true), moment("b", true), moment("c", false)],
      ending: { type: "proposal", message: "Will you?", custom: true },
    });
    expect(storySection.summary(c, ctx("deluxe"))).toEqual([
      `${"x".repeat(120)}…`,
      "Voice note: night.m4a",
      "Tone: Romance · Language: Danish",
      "Boss: The ferry",
      "Key moments: 3 (2 as cutscenes)",
      "Ending: proposal (custom)",
    ]);
    expect(storySection.summary(base({ memory: "Short and sweet memory here" }), ctx("deluxe"))).toEqual(["Short and sweet memory here", "Tone: Lads · Language: English"]);
  });

  it("lists the voice note and moment photos as uploads", () => {
    const c = base({ voiceNote: audio, moments: [{ ...moment("a", false), photo: photo("p1") }, moment("b", false), { ...moment("c", true), photo: photo("p2") }] });
    expect(storySection.uploads(c).map(u => u.id)).toEqual(["voice-1", "p1", "p2"]);
    expect(storySection.uploads(base())).toEqual([]);
  });
});
