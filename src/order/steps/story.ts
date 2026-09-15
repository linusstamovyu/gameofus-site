// Step 7, Your story: the memory (typed or as a voice note), tone, language, villain, key moments and the ending.
// The rules and prices live in ../sections/story; this file only lays them out.
import { el } from "../../dom";
import { allowanceChip, checkbox, heading, money, sectionHandle, stepEyebrow, type StepView } from "../context";
import { ADDONS } from "../prices";
import {
  BOSS_MAX, ENDING_LABEL, ENDING_MESSAGE_MAX, ENDING_TYPES, LANGUAGE_MAX, MAX_MOMENTS, MEMORY_MAX, MEMORY_MIN,
  MOMENT_MAX, TONE_BLURB, TONE_LABEL, TONES, type Ending, type Moment, type StoryChoices,
} from "../sections/story";
import type { UploadRef } from "../sections/types";
import { fileButton, removeUpload, uploadUrl } from "../upload";
import "./story.css";
import { loopBox, slideshow, type Scene } from "./loops";

const newMomentId = () => `m-${(crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 36)}`;

export const storyStep: StepView = (ctx, panel) => {
  const h = sectionHandle<StoryChoices>(ctx, "story");
  const c = h.choices();
  const sctx = h.context();
  const cur = ctx.currency();

  // Object URLs for previews; revoked when the step goes away (or if they arrive after it has).
  const urls: string[] = [];
  let gone = false;
  const preview = (ref: UploadRef, apply: (url: string) => void) => {
    void uploadUrl(ref).then(url => {
      if (!url) return;
      if (gone) { URL.revokeObjectURL(url); return; }
      urls.push(url);
      apply(url);
    });
  };
  const patch = (fn: (s: StoryChoices) => StoryChoices, rerender = true) => h.set(fn(h.choices()), rerender ? undefined : { rerender: false });
  const patchMoment = (id: string, fn: (m: Moment) => Moment, rerender = true) =>
    patch(s => ({ ...s, moments: s.moments.map(m => (m.id === id ? fn(m) : m)) }), rerender);

  panel.append(heading(stepEyebrow("story"), "Tell us the story",
    "One real night becomes the main quest. Tell it the way you'd tell it at the pub: who was there, what went wrong, what everyone still laughs about."));

  // The memory
  const mem = el("section", "shelf s-story-memory");
  const memHead = el("div", "shelf-head");
  memHead.append(el("h2", null, "The memory"));
  mem.append(memHead);
  mem.append(loopBanner(slideshow("story-plate", [1, 2, 3, 4].map(i => ({ file: `loop_story_plate_${i}.webp`, hold: 1.25 })), "Your memory, told in the game's own pictures: a bartender shakes, pours and serves a drink.", { w: 480, h: 160 })));
  const memLabel = el("label", "field");
  memLabel.append(el("span", null, "The night everyone still talks about"));
  const memText = el("textarea", "s-story-text");
  memText.rows = 7;
  memText.maxLength = MEMORY_MAX;
  memText.placeholder = "We missed the last ferry, so we…";
  memText.value = c.memory;
  const count = el("span", "s-story-count");
  const updateCount = () => {
    const n = memText.value.trim().length;
    count.textContent = h.choices().voiceNote || n >= MEMORY_MIN
      ? `${n} / ${MEMORY_MAX}`
      : `${n} / ${MEMORY_MAX} · at least ${MEMORY_MIN} characters, or add a voice note`;
  };
  updateCount();
  memText.addEventListener("input", () => {
    patch(s => ({ ...s, memory: memText.value }), false);
    updateCount();
  });
  memLabel.append(memText, count);
  mem.append(memLabel);

  const voice = el("div", "s-story-voice");
  if (c.voiceNote) {
    const ref = c.voiceNote;
    const row = el("div", "s-story-voice-row");
    row.append(el("span", "s-story-file", `Voice note: ${ref.name || "attached"}`));
    const audio = el("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.setAttribute("aria-label", "Your voice note");
    preview(ref, url => { audio.src = url; });
    const rm = el("button", "btn ghost small", "Remove");
    rm.type = "button";
    rm.onclick = () => {
      void removeUpload(ref);
      patch(s => ({ ...s, voiceNote: null }));
    };
    row.append(rm);
    voice.append(row, audio);
    voice.append(el("p", "s-story-hint", "Got the voice note. Typing is optional now, but a few names and places help."));
  } else {
    voice.append(fileButton("Record or attach a voice note", "audio", ref => patch(s => ({ ...s, voiceNote: ref }))));
    voice.append(el("p", "s-story-hint", "Rather talk than type? Record it on your phone and attach it here."));
  }
  mem.append(voice);
  panel.append(mem);

  // Tone and language
  const tone = el("section", "shelf");
  const toneHead = el("div", "shelf-head");
  toneHead.append(el("h2", null, "Tone"));
  tone.append(toneHead);
  const chips = el("div", "s-story-chips");
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", "Tone");
  for (const t of TONES) {
    chips.append(choiceChip(TONE_LABEL[t], TONE_BLURB[t], c.tone === t, () => patch(s => ({ ...s, tone: t }))));
  }
  tone.append(chips);
  const lang = el("label", "field s-story-lang");
  lang.append(el("span", null, "Language the game is written in"));
  const langIn = el("input");
  langIn.type = "text";
  langIn.maxLength = LANGUAGE_MAX;
  langIn.value = c.language;
  langIn.placeholder = "English";
  langIn.addEventListener("input", () => patch(s => ({ ...s, language: langIn.value }), false));
  lang.append(langIn);
  tone.append(lang);
  panel.append(tone);

  // The boss
  const boss = el("section", "shelf");
  const bossHead = el("div", "shelf-head");
  bossHead.append(el("h2", null, "The boss"));
  boss.append(bossHead);
  boss.append(loopBanner(slideshow("story-boss", [{ file: "loop_story_boss_1.webp", hold: 1.6 }, { file: "loop_story_boss_2.webp", hold: 1.3 }, { file: "loop_story_boss_3.webp", hold: 1.5 }], "Every quest needs someone, or something, to beat: a boss sizing you up.", { w: 480, h: 160 })));
  const bossLabel = el("label", "field");
  bossLabel.append(el("span", null, "Who or what the squad is up against (optional)"));
  const bossIn = el("input");
  bossIn.type = "text";
  bossIn.maxLength = BOSS_MAX;
  bossIn.value = c.boss;
  bossIn.placeholder = "The bouncer who wouldn't let Sam in";
  bossIn.addEventListener("input", () => patch(s => ({ ...s, boss: bossIn.value }), false));
  bossLabel.append(bossIn);
  boss.append(bossLabel);
  panel.append(boss);

  // Key moments
  const mo = el("section", "shelf");
  const moHead = el("div", "shelf-head");
  const cuts = c.moments.filter(m => m.cutscene).length;
  moHead.append(el("h2", null, "Key moments"), allowanceChip(cuts, sctx.includes.cutscenes, money(ctx, ADDONS.cutscene.price[cur]), "cutscenes"));
  mo.append(moHead);
  mo.append(el("p", "rules", `Up to ${MAX_MOMENTS} beats the story has to hit. Mark one as a cutscene and we'll draw it as an illustrated scene.`));
  mo.append(loopBanner(slideshow("story-cutscene", [1, 2, 3, 4].map(i => ({ file: `loop_story_cut_${i}.webp`, hold: 2.2 })), "A moment drawn as a cutscene: the lads run for a flight, take off and land by the pool.", { w: 480, h: 160, fade: 0.5, push: true })));
  const list = el("ol", "s-story-moments");
  c.moments.forEach((m, i) => {
    const li = el("li", "s-story-moment");
    const lab = el("label", "field");
    lab.append(el("span", null, `Moment ${i + 1}`));
    const ta = el("textarea", "s-story-text");
    ta.rows = 2;
    ta.maxLength = MOMENT_MAX;
    ta.value = m.text;
    ta.placeholder = "Dan falls in the harbour";
    ta.addEventListener("input", () => patchMoment(m.id, x => ({ ...x, text: ta.value }), false));
    lab.append(ta);
    li.append(lab);

    const photoRow = el("div", "s-story-photo");
    if (m.photo) {
      const ref = m.photo;
      const img = el("img", "s-story-thumb");
      img.alt = `Photo for moment ${i + 1}`;
      preview(ref, url => { img.src = url; });
      const rm = el("button", "btn ghost small", "Remove photo");
      rm.type = "button";
      rm.onclick = () => {
        void removeUpload(ref);
        patchMoment(m.id, x => ({ ...x, photo: null }));
      };
      photoRow.append(img, rm);
    } else {
      photoRow.append(fileButton("Add a photo", "image", ref => patchMoment(m.id, x => ({ ...x, photo: ref }))));
    }
    li.append(photoRow);

    li.append(checkbox(`Draw this as a cutscene`, m.cutscene, v => patchMoment(m.id, x => ({ ...x, cutscene: v }))));
    const del = el("button", "link-btn", "Remove moment");
    del.type = "button";
    del.onclick = () => {
      if (m.photo) void removeUpload(m.photo);
      patch(s => ({ ...s, moments: s.moments.filter(x => x.id !== m.id) }));
    };
    li.append(del);
    list.append(li);
  });
  if (c.moments.length) mo.append(list);
  if (c.moments.length < MAX_MOMENTS) {
    const add = el("button", "btn ghost small", c.moments.length ? "Add another moment" : "Add a key moment");
    add.type = "button";
    add.onclick = () => patch(s => ({ ...s, moments: [...s.moments, { id: newMomentId(), text: "", photo: null, cutscene: false }] }));
    mo.append(add);
  } else {
    mo.append(el("p", "s-story-hint", `That's the most moments we can fit (${MAX_MOMENTS}).`));
  }
  panel.append(mo);

  // Ending
  const end = el("section", "shelf");
  const endHead = el("div", "shelf-head");
  endHead.append(el("h2", null, "The ending"));
  end.append(endHead);
  end.append(el("p", "rules", `Finish on something personal: a dedication, a birthday message, or a proposal. ${money(ctx, ADDONS.ending.price[cur])}, or ${money(ctx, ADDONS.ending_custom.price[cur])} for a bespoke reveal scene.`));
  const endChips = el("div", "s-story-chips");
  endChips.setAttribute("role", "group");
  endChips.setAttribute("aria-label", "Ending");
  const endBlurb: Record<Ending["type"], string> = {
    none: "The credits roll on the squad.",
    dedication: "A message for someone, after the last battle.",
    birthday: "The game ends by wishing them a happy birthday.",
    proposal: "The last scene asks the question.",
  };
  for (const t of ENDING_TYPES) {
    endChips.append(choiceChip(ENDING_LABEL[t], endBlurb[t], c.ending.type === t,
      () => patch(s => ({ ...s, ending: t === "none" ? { type: "none", message: "", custom: false } : { ...s.ending, type: t } }))));
  }
  end.append(endChips);
  if (c.ending.type !== "none") {
    const box = el("div", "upsell s-story-ending");
    const msg = el("label", "field");
    msg.append(el("span", null, c.ending.type === "proposal" ? "What you want to ask, in your words" : "The message"));
    const ta = el("textarea", "s-story-text");
    ta.rows = 3;
    ta.maxLength = ENDING_MESSAGE_MAX;
    ta.value = c.ending.message;
    ta.addEventListener("input", () => patch(s => ({ ...s, ending: { ...s.ending, message: ta.value } }), false));
    msg.append(ta);
    box.append(msg);
    box.append(checkbox(`Make it a bespoke reveal scene (${money(ctx, ADDONS.ending_custom.price[cur])} instead of ${money(ctx, ADDONS.ending.price[cur])})`,
      c.ending.custom, v => patch(s => ({ ...s, ending: { ...s.ending, custom: v } }))));
    if (c.ending.type === "proposal") {
      box.append(el("p", "s-story-private", "We'll keep it secret. Nothing is shown publicly, and the ending stays hidden until they reach it."));
    }
    end.append(box);
  }
  panel.append(end);

  return () => {
    gone = true;
    for (const u of urls) URL.revokeObjectURL(u);
  };
};

function choiceChip(label: string, blurb: string, on: boolean, pick: () => void): HTMLElement {
  const b = el("button", `s-story-chip${on ? " on" : ""}`);
  b.type = "button";
  b.setAttribute("aria-pressed", String(on));
  b.append(el("b", null, label), el("span", null, blurb));
  b.onclick = pick;
  return b;
}

/** A banner that plays the game's own plates (./loops) instead of one still. */
function loopBanner(scene: Scene): HTMLElement {
  const fig = el("figure", "s-story-art");
  fig.append(loopBox(scene, "s-story-loop"));
  return fig;
}
