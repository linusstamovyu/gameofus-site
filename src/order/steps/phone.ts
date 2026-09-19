// Step 6, The phone: the Photos app, calls and news mails, and the two free apps (Maps, Games).
import "./phone.css";
import { el } from "../../dom";
import { orderAsset } from "../catalogue";
import { allowanceChip, checkbox, heading, money, sectionHandle, stepEyebrow, type StepView } from "../context";
import { ADDONS } from "../prices";
import {
  BEAT_ABOUT_MAX, BEAT_FROM_MAX, MAX_PHONE_BEATS, MAX_PHONE_PHOTOS, PHOTO_CAPTION_MAX,
  type BeatKind, type PhoneBeat, type PhoneChoices,
} from "../sections/phone";
import { fileButton, removeUpload, uploadUrl } from "../upload";

const newBeatId = () => `beat-${(crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}`;
let fieldSeq = 0;
const fieldId = (what: string) => `s-phone-${what}-${++fieldSeq}`;

export const phoneStep: StepView = (ctx, panel) => {
  const h = sectionHandle<PhoneChoices>(ctx, "phone");
  const c = h.choices();
  const cur = ctx.currency();
  const inc = h.context().includes;
  const urls: string[] = [];
  let alive = true;

  panel.append(heading(stepEyebrow("phone"), "What's on the phone?",
    "Everyone in the game carries a phone. Fill it with your real photos, the calls that start an adventure and the news that follows it."));

  const layout = el("div", "s-phone-layout");
  const screen = el("div", "s-phone-screen");
  const apps: [string, string][] = [["phone_photos.webp", "Photos"], ["phone_call.webp", "Calls"], ["phone_mail.webp", "Mail"], ["phone_news.webp", "News"], ["phone_maps.webp", "Maps"], ["phone_games.webp", "Games"]];
  for (const [file, label] of apps) {
    const app = el("span", "s-phone-app");
    const icon = el("span", "s-phone-icon");
    icon.style.backgroundImage = `url(${orderAsset(file)})`;
    app.append(icon, el("span", null, label));
    screen.append(app);
  }
  const frame = el("div", "s-phone-frame");
  frame.setAttribute("aria-hidden", "true");
  frame.append(el("span", "s-phone-notch"), screen);
  const main = el("div", "s-phone-main");
  layout.append(frame, main);
  panel.append(layout);

  // Photos app
  const photos = el("section", "shelf");
  const pHead = el("div", "shelf-head");
  pHead.append(el("h2", null, "Photos app"), allowanceChip(c.photos.length, inc.phonePhotos, money(ctx, ADDONS.phone_photo.price[cur]), "photos"));
  photos.append(pHead);
  const pIntro = el("div", "s-phone-intro");
  const pArt = el("span", "s-phone-art");
  pArt.style.backgroundImage = `url(${orderAsset("phone_photos.webp")})`;
  pIntro.append(pArt, el("p", "rules", `Your real photos, redrawn in the game's style, in an album you can flick through. Add a caption so we know the moment. Extra photos are ${money(ctx, ADDONS.phone_photo.price[cur])} each.`));
  photos.append(pIntro);

  const grid = el("div", "s-phone-photos");
  c.photos.forEach((photo, i) => {
    const card = el("figure", "s-phone-photo");
    const thumb = el("img", "s-phone-thumb");
    thumb.alt = photo.caption || `Photo ${i + 1}`;
    void uploadUrl(photo.upload).then(u => {
      if (!u) return;
      if (!alive) { URL.revokeObjectURL(u); return; }
      urls.push(u);
      thumb.src = u;
    });
    const cap = el("label", "field s-phone-caption");
    const capId = fieldId("caption");
    cap.htmlFor = capId;
    cap.append(el("span", null, "Caption"));
    const input = el("input");
    input.id = capId;
    input.maxLength = PHOTO_CAPTION_MAX;
    input.placeholder = "The night we missed the last bus";
    input.value = photo.caption;
    input.addEventListener("input", () => {
      const now = h.choices();
      h.set({ ...now, photos: now.photos.map(p => (p.upload.id === photo.upload.id ? { ...p, caption: input.value } : p)) }, { rerender: false });
    });
    cap.append(input);
    const remove = el("button", "link-btn danger", "Remove");
    remove.type = "button";
    remove.onclick = () => {
      void removeUpload(photo.upload);
      const now = h.choices();
      h.set({ ...now, photos: now.photos.filter(p => p.upload.id !== photo.upload.id) });
    };
    card.append(thumb, cap, remove);
    grid.append(card);
  });
  photos.append(grid);
  if (c.photos.length < MAX_PHONE_PHOTOS) {
    photos.append(fileButton(c.photos.length ? "Add another photo" : "Add photos", "image", ref => {
      const now = h.choices();
      if (now.photos.length >= MAX_PHONE_PHOTOS) { void removeUpload(ref); return; }
      h.set({ ...now, photos: [...now.photos, { upload: ref, caption: "" }] });
    }));
  } else {
    photos.append(el("p", "s-phone-note", `That's a full album (${MAX_PHONE_PHOTOS} photos).`));
  }
  main.append(photos);

  // Calls and news mails
  const beats = el("section", "shelf");
  const bHead = el("div", "shelf-head");
  bHead.append(el("h2", null, "Calls and news mails"), allowanceChip(c.beats.length, inc.phoneBeats, money(ctx, ADDONS.phone_beat.price[cur]), "calls and mails"));
  beats.append(bHead);
  beats.append(el("p", "rules", `A call or a breaking-news mail kicks off a moment in the story: Mum ringing to check you've eaten, a headline about your group. ${money(ctx, ADDONS.phone_beat.price[cur])} each, or ${money(ctx, ADDONS.phone_beat_custom.price[cur])} drawn specially for you (a caller portrait of the real person, or your own front page). Included ones cover the specially drawn ones first.`));

  c.beats.forEach((beat, i) => beats.append(beatCard(beat, i)));

  if (c.beats.length < MAX_PHONE_BEATS) {
    const row = el("div", "s-phone-add");
    for (const kind of ["call", "news"] as BeatKind[]) {
      const b = el("button", "btn ghost small", kind === "call" ? "Add a call" : "Add a news mail");
      b.type = "button";
      b.onclick = () => {
        const now = h.choices();
        if (now.beats.length >= MAX_PHONE_BEATS) return;
        h.set({ ...now, beats: [...now.beats, { id: newBeatId(), kind, from: "", about: "", custom: false }] });
      };
      row.append(b);
    }
    beats.append(row);
  } else {
    beats.append(el("p", "s-phone-note", `That's the most one phone can hold (${MAX_PHONE_BEATS}).`));
  }
  main.append(beats);

  // Apps
  const appsShelf = el("section", "shelf");
  const aHead = el("div", "shelf-head");
  aHead.append(el("h2", null, "Apps"), el("span", "chip-inv", "Free"));
  appsShelf.append(aHead);
  const aGrid = el("div", "game-grid s-phone-apps");
  aGrid.append(
    appCard("phone_maps.webp", "Maps", "A map of your world, with every place you picked.", c.mapsApp, v => h.set({ ...h.choices(), mapsApp: v })),
    appCard("phone_games.webp", "Games", "The party minigames you picked, playable from the phone.", c.gamesApp, v => h.set({ ...h.choices(), gamesApp: v })),
  );
  appsShelf.append(aGrid);
  main.append(appsShelf);

  function beatCard(beat: PhoneBeat, index: number): HTMLElement {
    const setBeat = (patch: Partial<PhoneBeat>, rerender = true) => {
      const now = h.choices();
      h.set({ ...now, beats: now.beats.map(b => (b.id === beat.id ? { ...b, ...patch } : b)) }, rerender ? undefined : { rerender: false });
    };
    const isCall = beat.kind === "call";
    const card = el("article", "s-phone-beat");
    const top = el("div", "s-phone-beat-head");
    const art = el("span", "s-phone-art");
    art.style.backgroundImage = `url(${orderAsset(isCall ? (beat.custom ? "phone_caller.webp" : "phone_call.webp") : (beat.custom ? "phone_news.webp" : "phone_mail.webp"))})`;
    top.append(art, el("h3", null, `${isCall ? "Call" : "News mail"} ${index + 1}`));
    const remove = el("button", "link-btn danger", "Remove");
    remove.type = "button";
    remove.onclick = () => {
      const now = h.choices();
      h.set({ ...now, beats: now.beats.filter(b => b.id !== beat.id) });
    };
    top.append(remove);
    card.append(top);

    const from = el("label", "field");
    from.dataset.field = `beat:${index}:from`;
    const fromId = fieldId("from");
    from.htmlFor = fromId;
    from.append(el("span", null, isCall ? "Who's calling?" : "Headline"));
    const fromInput = el("input");
    fromInput.id = fromId;
    fromInput.maxLength = BEAT_FROM_MAX;
    fromInput.placeholder = isCall ? "Mum" : "Local lads lose passports";
    fromInput.value = beat.from;
    fromInput.addEventListener("input", () => setBeat({ from: fromInput.value }, false));
    from.append(fromInput);

    const about = el("label", "field");
    about.dataset.field = `beat:${index}:about`;
    const aboutId = fieldId("about");
    about.htmlFor = aboutId;
    about.append(el("span", null, "What's it about?"));
    const ta = el("textarea", "s-phone-about");
    ta.id = aboutId;
    ta.rows = 3;
    ta.maxLength = BEAT_ABOUT_MAX;
    ta.placeholder = isCall ? "She rings the morning after to ask why the group chat is full of photos of a goat." : "The paper runs a story about the group's attempt to cross the harbour on an inflatable.";
    ta.value = beat.about;
    ta.addEventListener("input", () => setBeat({ about: ta.value }, false));
    about.append(ta);

    card.append(from, about, checkbox(
      `Draw it specially for you · ${money(ctx, ADDONS.phone_beat_custom.price[cur])}: ${isCall ? "a caller portrait of the real person" : "your own front page"}.`,
      beat.custom, v => setBeat({ custom: v })));
    return card;
  }

  return () => {
    alive = false;
    for (const u of urls) URL.revokeObjectURL(u);
  };
};

function appCard(file: string, name: string, blurb: string, on: boolean, onChange: (v: boolean) => void): HTMLElement {
  const b = el("button", `game${on ? " on" : ""}`);
  b.type = "button";
  b.setAttribute("aria-pressed", String(on));
  const img = el("span", "art");
  img.style.backgroundImage = `url(${orderAsset(file)})`;
  const text = el("span", "game-text");
  text.append(el("b", null, `${name} app`), el("span", null, blurb));
  b.append(img, text, el("span", "tick", on ? "✓" : "+"));
  b.onclick = () => onChange(!on);
  return b;
}
