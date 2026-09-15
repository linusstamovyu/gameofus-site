// Step 8, Extras for your characters: evolutions, talking faces, voice lines, signature moves, custom items,
// recruiting the rest of the squad and multiplayer. The rules and prices are in ../sections/extras.
import "./extras.css";
import { el } from "../../dom";
import { orderAsset } from "../catalogue";
import { allowanceChip, checkbox, heading, money, sectionHandle, stepEyebrow, type StepView } from "../context";
import { ADDONS } from "../prices";
import {
  effectiveMultiplayer, hostingIncluded, ITEM_EFFECT_MAX, ITEM_NAME_MAX, MAX_ITEMS, MAX_MOVES, MAX_VOICE_LINES, MOVE_NAME_MAX,
  VOICE_LINE_MAX, type CustomItem, type EvolutionKind, type ExtrasChoices, type MultiplayerMode, type SignatureMove, type VoiceLine,
} from "../sections/extras";
import { fileButton, removeUpload, uploadUrl } from "../upload";

const newId = (prefix: string) => `${prefix}-${(crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;

export const extrasStep: StepView = (ctx, panel) => {
  const h = sectionHandle<ExtrasChoices>(ctx, "extras");
  const c = h.choices();
  const sc = h.context();
  const cur = ctx.currency();
  const price = (id: keyof typeof ADDONS) => money(ctx, ADDONS[id].price[cur]);
  const friends = [...new Set(sc.friends.filter(Boolean))];
  const urls: string[] = [];
  let alive = true;

  /** Structural change: re-render. */
  const patch = (fn: (now: ExtrasChoices) => ExtrasChoices) => h.set(fn(h.choices()));
  /** Typing: keep the DOM so the field keeps focus. */
  const type = (fn: (now: ExtrasChoices) => ExtrasChoices) => h.set(fn(h.choices()), { rerender: false });

  panel.classList.add("s-extras");
  panel.append(heading(stepEyebrow("extras"), "Extras for your characters",
    "The finishing touches that make each friend feel like themselves: new forms, their own voice, moves named after your in-jokes, and ways to play together."));

  if (!friends.length) {
    const note = el("div", "upsell s-extras-empty");
    note.append(el("p", null, "Most of these are made for a particular friend, so add your squad's names first."));
    const back = el("button", "btn ghost small", "Back to your squad");
    back.type = "button";
    back.onclick = () => ctx.go("squad");
    note.append(back);
    panel.append(note);
  }

  const shelf = (title: string, chip?: HTMLElement) => {
    const s = el("section", "shelf");
    const head = el("div", "shelf-head");
    head.append(el("h2", null, title));
    if (chip) head.append(chip);
    s.append(head);
    return s;
  };

  const intro = (s: HTMLElement, art: HTMLElement, text: string) => {
    const row = el("div", "s-extras-intro");
    row.append(art, el("p", null, text));
    s.append(row);
  };

  const pic = (file: string, cls = "s-extras-pic") => {
    const img = el("img", cls);
    img.src = orderAsset(file);
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    return img;
  };

  // ---------- evolutions ----------
  {
    const current = friends.filter(n => Object.prototype.hasOwnProperty.call(c.evolutions, n));
    const s = shelf("Evolutions", allowanceChip(current.length, sc.includes.evolutions, price("evolution"), "evolutions"));
    const strip = el("div", "s-extras-evo");
    strip.append(pic("extras_evo_1.webp"), el("span", "s-extras-arrow", "→"), pic("extras_evo_2.webp"), el("span", "s-extras-arrow", "→"), pic("extras_evo_3.webp"));
    strip.querySelectorAll(".s-extras-arrow").forEach(a => a.setAttribute("aria-hidden", "true"));
    intro(s, strip, `A friend levels up and turns into a new form mid-battle. Pick a form from our templates (${price("evolution")}) or tell us their idea and we design one (${price("evolution_custom")}). Included evolutions cover designed ones first.`);
    const options: [EvolutionKind | "none", string][] = [["none", "No evolution"], ["template", "Template form"], ["custom", "Designed from their idea"]];
    for (const name of friends) {
      const row = el("fieldset", "s-extras-row");
      row.append(el("legend", null, name));
      const seg = el("div", "s-extras-seg");
      const now = c.evolutions[name] ?? "none";
      for (const [value, label] of options) {
        const opt = el("label", now === value ? "on" : null);
        const input = el("input");
        input.type = "radio";
        input.name = `evo-${friends.indexOf(name)}`;
        input.checked = now === value;
        input.addEventListener("change", () => patch(ch => {
          const entries = Object.entries(ch.evolutions).filter(([n]) => n !== name);
          if (value !== "none") entries.push([name, value]);
          return { ...ch, evolutions: Object.fromEntries(entries) as Record<string, EvolutionKind> };
        }));
        opt.append(input, el("span", null, label));
        seg.append(opt);
      }
      row.append(seg);
      s.append(row);
    }
    panel.append(s);
  }

  // ---------- talking faces ----------
  {
    const s = shelf("Talking faces");
    const face = el("span", "s-extras-talk");
    face.append(pic("extras_talk_rest.webp", "rest"), pic("extras_talk_open.webp", "open"));
    intro(s, face, `When the game loads in, their mouth moves as they say their line. ${price("talking_face")} each.`);
    const list = el("div", "s-extras-checks");
    for (const name of friends) {
      list.append(checkbox(name, c.talkingFaces.includes(name), v => patch(ch => ({
        ...ch, talkingFaces: v ? [...ch.talkingFaces.filter(n => n !== name), name] : ch.talkingFaces.filter(n => n !== name),
      }))));
    }
    s.append(list);
    panel.append(s);
  }

  // ---------- voice lines ----------
  {
    const counted = c.voiceLines.filter(v => friends.includes(v.friend)).length;
    const s = shelf("Voice lines", allowanceChip(counted, sc.includes.voiceLines, price("voice_line"), "voice lines"));
    s.append(el("p", "rules", `Short lines your friends record themselves, played in the game (${price("voice_line")} each beyond what's included). Write the words now; the recording can come later.`));
    c.voiceLines.forEach((v, i) => s.append(voiceCard(v, i)));
    if (c.voiceLines.length < MAX_VOICE_LINES) {
      const add = el("button", "btn ghost small s-extras-add", c.voiceLines.length ? "Add another voice line" : "Add a voice line");
      add.type = "button";
      add.disabled = !friends.length;
      add.onclick = () => patch(ch => ch.voiceLines.length >= MAX_VOICE_LINES ? ch
        : { ...ch, voiceLines: [...ch.voiceLines, { id: newId("line"), friend: friends[0] ?? "", line: "", audio: null }] });
      s.append(add);
    } else {
      s.append(el("p", "s-extras-note", `That's the most voice lines one game can hold (${MAX_VOICE_LINES}).`));
    }
    panel.append(s);
  }

  // ---------- signature moves ----------
  {
    const s = shelf("Signature moves");
    intro(s, pic("extras_move.webp"), `Name their moves after your in-jokes. ${sc.includes.movesPerCharacter === 1 ? "One move" : `${sc.includes.movesPerCharacter} moves`} per character included; extras are ${price("move")} each, or ${price("move_custom")} with its own custom effect. Included moves cover custom ones first.`);
    const total = c.moves.length;
    for (const name of friends) {
      const mine = c.moves.filter(m => m.friend === name);
      const card = el("div", "s-extras-card");
      const head = el("div", "shelf-head");
      head.append(el("h3", null, name), allowanceChip(mine.length, sc.includes.movesPerCharacter, price("move"), "moves"));
      card.append(head);
      mine.forEach((m, i) => card.append(moveRow(m, name, i)));
      const add = el("button", "btn ghost small", mine.length ? `Add another move for ${name}` : `Add a move for ${name}`);
      add.type = "button";
      add.disabled = total >= MAX_MOVES;
      add.onclick = () => patch(ch => ch.moves.length >= MAX_MOVES ? ch
        : { ...ch, moves: [...ch.moves, { id: newId("move"), friend: name, name: "", customVfx: false }] });
      card.append(add);
      s.append(card);
    }
    if (total >= MAX_MOVES) s.append(el("p", "s-extras-note", `That's the most moves one game can hold (${MAX_MOVES}).`));
    panel.append(s);
  }

  // ---------- items ----------
  {
    const s = shelf("Custom items and drinks");
    const art = el("span", "s-extras-pair");
    art.append(pic("extras_item_drink.webp"), pic("extras_item_can.webp"));
    intro(s, art, `A drink from your local, a snack only you lot eat, with an effect in battle. ${price("item")} each with a stock icon, or ${price("item_custom")} drawn for you.`);
    c.items.forEach((it, i) => s.append(itemCard(it, i)));
    if (c.items.length < MAX_ITEMS) {
      const add = el("button", "btn ghost small s-extras-add", c.items.length ? "Add another item" : "Add an item");
      add.type = "button";
      add.onclick = () => patch(ch => ch.items.length >= MAX_ITEMS ? ch
        : { ...ch, items: [...ch.items, { id: newId("item"), name: "", effect: "", drawn: false }] });
      s.append(add);
    } else {
      s.append(el("p", "s-extras-note", `That's the most items one game can hold (${MAX_ITEMS}).`));
    }
    panel.append(s);
  }

  // ---------- recruit + multiplayer ----------
  {
    const s = shelf("Playing together");
    const grid = el("div", "game-grid s-extras-grid");
    grid.append(optionCard("Recruit your squad", "Meet the rest of the group in battles, recruit them, and switch between them. Free.",
      "extras_recruit.webp", c.recruit, false, () => patch(ch => ({ ...ch, recruit: !ch.recruit }))));
    s.append(grid);

    s.append(el("h3", "s-extras-sub", "Multiplayer"));
    const mode = effectiveMultiplayer(c.multiplayer, sc);
    const mgrid = el("div", "game-grid s-extras-grid");
    const standard = sc.edition === "standard";
    const onlineNote = hostingIncluded(sc) ? "Hosted for a year, included with Ultimate." : `We host it for a year: ${price("hosting_year")}.`;
    const modes: [MultiplayerMode, string, string, boolean][] = [
      ["none", "Just one player", "Everyone takes turns on one device.", false],
      ["wifi", "Same wifi", standard ? "Deluxe and up. Play together on the same network." : "Play together on the same network. Included.", standard],
      ["online", "Online", `Play together from anywhere. ${onlineNote}`, false],
    ];
    for (const [id, title, blurb, disabled] of modes) {
      mgrid.append(optionCard(title, blurb, id === "none" ? "" : "extras_multiplayer.webp", mode === id, disabled,
        () => patch(ch => ({ ...ch, multiplayer: id })), "radio"));
    }
    mgrid.setAttribute("role", "radiogroup");
    mgrid.setAttribute("aria-label", "Multiplayer");
    s.append(mgrid);
    panel.append(s);
  }

  // ---------- builders ----------

  function voiceCard(v: VoiceLine, i: number): HTMLElement {
    const card = el("div", "s-extras-card");
    const top = el("div", "s-extras-line-top");
    const who = el("label", "field");
    who.append(el("span", null, `Voice line ${i + 1}: who says it`));
    const sel = el("select", "s-extras-select");
    if (!friends.includes(v.friend)) {
      const o = el("option", null, "Choose who");
      o.value = "";
      o.selected = true;
      sel.append(o);
    }
    for (const n of friends) {
      const o = el("option", null, n);
      o.value = n;
      o.selected = n === v.friend;
      sel.append(o);
    }
    sel.addEventListener("change", () => patch(ch => ({ ...ch, voiceLines: ch.voiceLines.map(x => (x.id === v.id ? { ...x, friend: sel.value } : x)) })));
    who.append(sel);
    top.append(who);
    const rm = el("button", "link-btn danger", "Remove");
    rm.type = "button";
    rm.onclick = () => {
      if (v.audio) void removeUpload(v.audio);
      patch(ch => ({ ...ch, voiceLines: ch.voiceLines.filter(x => x.id !== v.id) }));
    };
    top.append(rm);
    card.append(top);

    const words = el("label", "field");
    words.append(el("span", null, "The words"));
    const input = el("input");
    input.type = "text";
    input.maxLength = VOICE_LINE_MAX;
    input.placeholder = "Right lads, who's buying the first round?";
    input.value = v.line;
    input.addEventListener("input", () => type(ch => ({ ...ch, voiceLines: ch.voiceLines.map(x => (x.id === v.id ? { ...x, line: input.value.slice(0, VOICE_LINE_MAX) } : x)) })));
    words.append(input);
    card.append(words);

    const rec = el("div", "s-extras-rec");
    if (v.audio) {
      const audio = el("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.setAttribute("aria-label", `Recording for voice line ${i + 1}`);
      rec.append(audio);
      void uploadUrl(v.audio).then(url => {
        if (!url) return;
        if (!alive) { URL.revokeObjectURL(url); return; }
        urls.push(url);
        audio.src = url;
      });
      const drop = el("button", "link-btn danger", "Remove recording");
      drop.type = "button";
      drop.onclick = () => {
        const ref = v.audio;
        if (ref) void removeUpload(ref);
        patch(ch => ({ ...ch, voiceLines: ch.voiceLines.map(x => (x.id === v.id ? { ...x, audio: null } : x)) }));
      };
      rec.append(drop);
    } else {
      rec.append(fileButton("Attach recording", "audio", ref => {
        if (!h.choices().voiceLines.some(x => x.id === v.id)) { void removeUpload(ref); return; }
        patch(ch => ({ ...ch, voiceLines: ch.voiceLines.map(x => (x.id === v.id ? { ...x, audio: ref } : x)) }));
      }), el("span", "s-extras-hint", "Or send it later."));
    }
    card.append(rec);
    return card;
  }

  function moveRow(m: SignatureMove, friend: string, i: number): HTMLElement {
    const row = el("div", "s-extras-move");
    const name = el("label", "field");
    name.append(el("span", null, `${friend}'s move ${i + 1}`));
    const input = el("input");
    input.type = "text";
    input.maxLength = MOVE_NAME_MAX;
    input.placeholder = "Casual Nutmeg";
    input.value = m.name;
    input.addEventListener("input", () => type(ch => ({ ...ch, moves: ch.moves.map(x => (x.id === m.id ? { ...x, name: input.value.slice(0, MOVE_NAME_MAX) } : x)) })));
    name.append(input);
    row.append(name);
    row.append(checkbox(`Custom effect (${price("move_custom")} if extra)`, m.customVfx,
      v => patch(ch => ({ ...ch, moves: ch.moves.map(x => (x.id === m.id ? { ...x, customVfx: v } : x)) }))));
    const rm = el("button", "link-btn danger", "Remove");
    rm.type = "button";
    rm.setAttribute("aria-label", `Remove ${friend}'s move ${i + 1}`);
    rm.onclick = () => patch(ch => ({ ...ch, moves: ch.moves.filter(x => x.id !== m.id) }));
    row.append(rm);
    return row;
  }

  function itemCard(it: CustomItem, i: number): HTMLElement {
    const card = el("div", "s-extras-card");
    const name = el("label", "field");
    name.append(el("span", null, `Item ${i + 1}: name`));
    const input = el("input");
    input.type = "text";
    input.maxLength = ITEM_NAME_MAX;
    input.placeholder = "Sangria of Doom";
    input.value = it.name;
    input.addEventListener("input", () => type(ch => ({ ...ch, items: ch.items.map(x => (x.id === it.id ? { ...x, name: input.value.slice(0, ITEM_NAME_MAX) } : x)) })));
    name.append(input);
    const effect = el("label", "field");
    effect.append(el("span", null, "What it does"));
    const eff = el("input");
    eff.type = "text";
    eff.maxLength = ITEM_EFFECT_MAX;
    eff.placeholder = "Heals a lot, but you can't aim for two turns";
    eff.value = it.effect;
    eff.addEventListener("input", () => type(ch => ({ ...ch, items: ch.items.map(x => (x.id === it.id ? { ...x, effect: eff.value.slice(0, ITEM_EFFECT_MAX) } : x)) })));
    effect.append(eff);
    card.append(name, effect);
    const foot = el("div", "s-extras-line-top");
    foot.append(checkbox(`Draw it for us (${price("item_custom")} instead of ${price("item")})`, it.drawn,
      v => patch(ch => ({ ...ch, items: ch.items.map(x => (x.id === it.id ? { ...x, drawn: v } : x)) }))));
    const rm = el("button", "link-btn danger", "Remove");
    rm.type = "button";
    rm.setAttribute("aria-label", `Remove item ${i + 1}`);
    rm.onclick = () => patch(ch => ({ ...ch, items: ch.items.filter(x => x.id !== it.id) }));
    foot.append(rm);
    card.append(foot);
    return card;
  }

  function optionCard(title: string, blurb: string, art: string, on: boolean, disabled: boolean, pick: () => void, role?: "radio"): HTMLElement {
    const b = el("button", `game s-extras-option${on ? " on" : ""}`);
    b.type = "button";
    if (role) {
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(on));
    } else {
      b.setAttribute("aria-pressed", String(on));
    }
    b.disabled = disabled;
    if (art) {
      const img = el("span", "art");
      img.style.backgroundImage = `url(${orderAsset(art)})`;
      b.append(img);
    }
    const text = el("span", "game-text");
    text.append(el("b", null, title), el("span", null, blurb));
    b.append(text, el("span", "tick", on ? "✓" : "+"));
    b.onclick = pick;
    return b;
  }

  return () => {
    alive = false;
    for (const u of urls) URL.revokeObjectURL(u);
  };
};
