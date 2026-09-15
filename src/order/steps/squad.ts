// Step 1, Your squad: a slot per friend with a name and ONE photo (owner, 15 Sep 2026, replacing three photos and
// the pixel preview), checked in the browser for one clear face and the whole body, shown back as two boxes.
// The step opens with one slot per character the edition includes (owner, 15 Sep 2026): Deluxe opens on six.
// Every slot must be filled or removed before the order can go (draft.ts). The edition strip at the top resizes the empty slots; adding past the allowance is a discreet "+" tile that
// says what the extra character costs (prices.ts), and suggests the next edition when that is cheaper.
import { el } from "../../dom";
import { heading, money, stepEyebrow, type Ctx, type StepView } from "../context";
import { addFriend, chooseEdition, isOpenSlot, MIN_FRIENDS, removeFriend, setPhoto, squadFriends, toPicks, updateFriend, type Friend } from "../draft";
import { processPhoto, recheckStoredPhoto, warmFaceDetector } from "../photo";
import { ACTIVE_LADDER, ADDONS, downgradeHint, EDITION_IDS, LADDERS, MAX_FRIENDS, upgradeHint } from "../prices";
import { faceCrop, type Box } from "../photoRules";
import { deletePhoto, loadPhoto, savePhoto } from "../storage";
import { tierClass, tierPill, TIER_LOOK } from "../tier";

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9-]/gi, "").slice(0, 36);
const STATUS_PREFIX = { ok: "", warn: "Check this: ", fail: "Won't work: ", unchecked: "" } as const;

export const squadStep: StepView = (ctx, panel) => {
  warmFaceDetector();
  const d = ctx.draft();
  const cur = ctx.currency();
  const eds = LADDERS[ACTIVE_LADDER].editions;
  const edition = d.edition;
  const included = edition ? eds[edition].includes.characters : null;
  panel.append(heading(stepEyebrow("squad"), "Who's in the game?",
    "Add each friend with one photo: just them, standing, face clear, head to feet. We pick out the full body and the face from it; the final character is drawn by hand."));

  // Not ready to hand over photos? Look around first (plan 18 §3); the squad can be finished last, before paying.
  const skip = el("p", "squad-skip");
  const look = el("a", "link-btn", "Just show me what's in it ▶");
  look.href = "explore.html";
  look.dataset.track = "squad_skip_to_explore";
  skip.append("No photos to hand? You can add them last, before you pay. ", look);
  panel.append(skip);

  // The edition, as rarity chips: picking one sets how many character slots are ready below.
  const strip = el("div", "squad-tiers");
  strip.append(el("span", "squad-tiers-label", "Your edition"));
  const chips = el("div", "tier-chips");
  chips.setAttribute("role", "radiogroup");
  chips.setAttribute("aria-label", "Edition");
  for (const id of EDITION_IDS) {
    const on = edition === id;
    const chip = el("button", `tier-chip ${tierClass(id)}${on ? " on" : ""}`);
    chip.type = "button";
    chip.setAttribute("role", "radio");
    chip.setAttribute("aria-checked", String(on));
    const n = eds[id].includes.characters;
    chip.append(el("i", "tier-gem"), el("b", null, TIER_LOOK[id].name), el("small", null, `${n} characters`));
    chip.onclick = () => { if (!on) ctx.update(dr => chooseEdition(dr, id, newId)); };
    chips.append(chip);
  }
  strip.append(chips);
  panel.append(strip);

  const rules = el("p", "rules");
  rules.textContent = "Only photos of people who agreed to be in the game. No children, celebrities or brand logos. Photos stay on this device until you send the order.";
  panel.append(rules);

  const list = el("div", "friends");
  d.friends.forEach((f, i) => list.append(friendCard(ctx, f, i)));

  // The "+" tile: always there, never loud. Past the allowance it says what one more costs.
  const filled = squadFriends(d).length;
  const add = el("button", "add-slot");
  add.type = "button";
  add.disabled = d.friends.length >= MAX_FRIENDS;
  const over = included !== null && d.friends.length >= included;
  const addText = el("span", "add-slot-text");
  addText.append(el("b", "add-slot-plus", "+"), document.createTextNode(d.friends.length ? " Add a character" : " Add your first friend"));
  add.append(addText);
  if (add.disabled) add.append(el("small", null, `${MAX_FRIENDS} is the most one game holds`));
  else if (over && edition) add.append(el("small", null, `Extra character · ${money(ctx, ADDONS.character_custom.price[cur])} each, beyond ${TIER_LOOK[edition].name}'s ${included}`));
  add.onclick = () => {
    const id = newId();
    ctx.update(dr => addFriend(dr, id));
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-friend="${id}"] input[type=text]`)?.focus());
  };
  list.append(add);
  panel.append(list);

  const row = el("div", "add-row");
  if (edition) row.append(tierPill(edition));
  row.append(el("span", "friend-count", included === null
    ? `${filled} of ${MAX_FRIENDS} friends`
    : `${d.friends.length > included ? `${d.friends.length} characters · ${included} included, ${d.friends.length - included} extra` : `${filled} of ${included} characters added`}${d.friends.length > filled ? ` · ${d.friends.length - filled} empty ${d.friends.length - filled === 1 ? "slot" : "slots"} to fill or remove` : ""}`));
  panel.append(row);

  // Fewer slots than the edition holds (slots were removed), and a smaller edition would cost less: say so.
  // It is a suggestion, not a rule: keeping the bigger edition with fewer friends is allowed (draft.ts MIN_FRIENDS).
  const down = included !== null && d.friends.length < included ? downgradeHint(toPicks(d), cur, ctx.paidOrders()) : null;
  if (down) {
    const box = el("div", `upgrade tier-upgrade ${tierClass(down.edition)}`);
    const name = TIER_LOOK[down.edition].name;
    box.append(el("span", null, `${edition ? TIER_LOOK[edition].name : "This edition"} holds ${included} characters and you have ${d.friends.length}. ${name} would cost ${money(ctx, down.saves)} less for this squad.`));
    const b = el("button", "btn small", `Switch to ${name}`);
    b.type = "button";
    b.onclick = () => ctx.update(dr => chooseEdition(dr, down.edition, newId));
    box.append(b);
    panel.append(box);
  }

  // Over the allowance, and a bigger edition covers it for no more: say so (the same rule as the games step).
  const hint = included !== null && d.friends.length > included ? upgradeHint(toPicks(d), cur, ctx.paidOrders()) : null;
  if (hint) {
    const box = el("div", `upgrade tier-upgrade ${tierClass(hint.edition)}`);
    const name = TIER_LOOK[hint.edition].name;
    box.append(el("span", null, hint.saves > 0
      ? `${name} holds ${eds[hint.edition].includes.characters} characters and saves you ${money(ctx, hint.saves)} on this squad.`
      : `${name} holds ${eds[hint.edition].includes.characters} characters for the same price.`));
    const b = el("button", "btn small", `Switch to ${name}`);
    b.type = "button";
    b.onclick = () => ctx.update(dr => chooseEdition(dr, hint.edition, newId));
    box.append(b);
    panel.append(box);
  }
};

function friendCard(ctx: Ctx, f: Friend, index: number): HTMLElement {
  const card = el("article", isOpenSlot(f) ? "friend open" : "friend");
  card.dataset.friend = f.id;

  const main = el("div", "friend-main");
  const nameRow = el("div", "name-row");
  const label = el("label", "field");
  label.append(el("span", null, isOpenSlot(f) ? `Slot ${index + 1} · empty: add a friend or remove it` : `Friend ${index + 1}`));
  const name = el("input");
  name.type = "text";
  name.maxLength = 60;
  name.autocomplete = "off";
  name.placeholder = "Their name, as it should appear in the game";
  name.value = f.name;
  name.addEventListener("input", () => ctx.update(d => updateFriend(d, f.id, { name: name.value }), { rerender: false }));
  label.append(name);
  const remove = el("button", "link-btn danger", isOpenSlot(f) ? "Remove slot" : "Remove");
  remove.type = "button";
  // The squad never goes below one slot (draft.ts MIN_FRIENDS); the last one can only be filled.
  const last = ctx.draft().friends.length <= MIN_FRIENDS;
  remove.disabled = last;
  if (last) remove.title = "A game needs at least one character";
  remove.onclick = async () => {
    if (f.photo) await deletePhoto(f.photo.key);
    ctx.update(d => removeFriend(d, f.id));
  };
  nameRow.append(label, remove);

  main.append(nameRow, shot(ctx, f));
  card.append(main);
  return card;
}

// ---------- the one photo (owner, 15 Sep 2026) ----------
// One upload per character. It passes only with one clear face AND the whole body, head to feet (photoRules.ts).
// Once checked it is shown as two boxes cut from that same photo: "Full body" and "Face". Tapping either replaces it.

/** Photos being re-checked right now (drafts carried over from three photos), so a re-render doesn't start another. */
const rechecking = new Set<string>();

function shot(ctx: Ctx, f: Friend): HTMLElement {
  const meta = f.photo;
  const wrap = el("div", `shot ${meta ? `has ${meta.recheck ? "busy" : meta.status}` : "empty"}`);
  const inputId = `photo-${f.id}`;
  const picker = fileInput(inputId);
  const camera = fileInput(`${inputId}-camera`);
  camera.setAttribute("capture", "environment");
  const note = el("p", "shot-note");

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type) {
      note.textContent = "That isn't a photo. Use a JPEG or PNG.";
      return;
    }
    wrap.className = `shot ${meta ? "has" : "empty"} busy`;
    note.textContent = "Checking the photo…";
    try {
      const out = await processPhoto(file);
      const key = `${f.id}-photo-${Date.now()}`;
      await savePhoto(key, out.blob);
      if (meta) await deletePhoto(meta.key);
      ctx.update(d => setPhoto(d, f.id, { key, width: out.width, height: out.height, status: out.verdict.status, note: out.verdict.note, face: out.verdict.face, body: out.verdict.body }));
    } catch (err) {
      wrap.className = `shot ${meta ? `has ${meta.status}` : "empty"}`;
      note.textContent = err instanceof Error ? err.message : "That photo didn't work. Try another.";
      ctx.notify(note.textContent, "error");
    }
  };
  for (const input of [picker, camera]) {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.value = "";
      void accept(file);
    });
  }
  wrap.addEventListener("dragover", e => { e.preventDefault(); wrap.classList.add("drag"); });
  wrap.addEventListener("dragleave", () => wrap.classList.remove("drag"));
  wrap.addEventListener("drop", e => {
    e.preventDefault();
    wrap.classList.remove("drag");
    void accept(e.dataTransfer?.files?.[0]);
  });

  const pickBtn = el("label", "btn ghost small", meta ? "Replace photo" : "Choose a photo");
  pickBtn.htmlFor = picker.id;
  const camBtn = el("label", "btn ghost small shot-camera", "Take a photo");
  camBtn.htmlFor = camera.id;
  const actions = el("div", "shot-actions");
  actions.append(pickBtn, camBtn);

  if (!meta) {
    const drop = el("label", "shot-drop");
    drop.htmlFor = picker.id;
    drop.append(el("b", null, "Drop one photo here"), el("span", null, "Just them, standing, with their face clear and everything from head to feet in the shot."));
    note.textContent = "";
    wrap.append(drop, actions, note, picker, camera);
    return wrap;
  }

  const boxes = el("div", "shot-boxes");
  // With no body found the whole photo fills the "Full body" box; an empty "Face" box says why.
  const bodyBox = shotBox("Full body", picker.id, "");
  const crowd = /people in this photo/.test(meta.note);
  const faceBox = shotBox("Face", picker.id, meta.face || meta.recheck ? "" : crowd ? "One person per photo" : "No face found");
  boxes.append(bodyBox.el, faceBox.el);
  const prefix = meta.recheck ? "" : STATUS_PREFIX[meta.status];
  note.textContent = `${prefix}${meta.note}`;
  const del = el("button", "link-btn", "Remove photo");
  del.type = "button";
  del.onclick = async () => {
    await deletePhoto(meta.key);
    ctx.update(d => setPhoto(d, f.id, null));
  };
  actions.append(del);
  wrap.append(boxes, note, actions, picker, camera);

  void loadPhoto(meta.key).then(async blob => {
    if (!blob) {
      note.textContent = "This photo is missing on this device. Add it again.";
      wrap.className = "shot has fail";
      return;
    }
    try {
      const bitmap = await createImageBitmap(blob);
      drawBody(bodyBox.canvas, bitmap, meta.body);
      drawFace(faceBox.canvas, bitmap, meta.face);
      bitmap.close();
    } catch {
      /* the note already says what we know; the boxes stay blank */
    }
  });

  if (meta.recheck && !rechecking.has(meta.key)) {
    rechecking.add(meta.key);
    void loadPhoto(meta.key).then(async blob => {
      try {
        if (!blob) return ctx.update(d => setPhoto(d, f.id, null));
        const out = await recheckStoredPhoto(blob);
        const v = out.verdict;
        const status = v.status;
        const note = status === "fail" ? `${v.note} We now need one photo with the face and the whole body.` : v.note;
        ctx.update(d => setPhoto(d, f.id, { key: meta.key, width: out.width, height: out.height, status, note, face: v.face, body: v.body }));
      } catch {
        ctx.update(d => setPhoto(d, f.id, { ...meta, recheck: undefined, status: "fail", note: "We couldn't check this photo again. Add one photo with the face and the whole body." }));
      } finally {
        rechecking.delete(meta.key);
      }
    });
  }
  return wrap;
}

function fileInput(id: string): HTMLInputElement {
  const input = el("input");
  input.type = "file";
  input.accept = "image/*";
  input.className = "visually-hidden";
  input.id = id;
  return input;
}

function shotBox(title: string, inputId: string, empty: string): { el: HTMLElement; canvas: HTMLCanvasElement } {
  const fig = el("label", "shot-box");
  fig.htmlFor = inputId;
  fig.title = "Tap to replace the photo";
  const canvas = el("canvas");
  canvas.width = title === "Face" ? 240 : 180;
  canvas.height = 240;
  fig.append(canvas, el("span", "shot-box-label", title));
  if (empty) fig.append(el("span", "shot-box-empty", empty));
  return { el: fig, canvas };
}

/** The person, head to feet, fitted into the box (the whole photo when no body was found). */
function drawBody(c: HTMLCanvasElement, img: ImageBitmap, body: Box | null): void {
  const src = body ?? { x: 0, y: 0, width: img.width, height: img.height };
  // The box takes the person's own shape (tall and narrow, or wider with arms out), within limits.
  c.width = Math.round(Math.min(Math.max(c.height * (src.width / src.height), c.height * 0.4), c.height * 1.2));
  const ctx2 = c.getContext("2d")!;
  ctx2.clearRect(0, 0, c.width, c.height);
  const s = Math.min(c.width / src.width, c.height / src.height);
  const w = src.width * s, h = src.height * s;
  ctx2.imageSmoothingQuality = "high";
  ctx2.drawImage(img, src.x, src.y, src.width, src.height, (c.width - w) / 2, (c.height - h) / 2, w, h);
}

/** The face, zoomed to fill the square (blank when no face was found). */
function drawFace(c: HTMLCanvasElement, img: ImageBitmap, face: Box | null): void {
  const ctx2 = c.getContext("2d")!;
  ctx2.clearRect(0, 0, c.width, c.height);
  if (!face) return;
  const crop = faceCrop(img.width, img.height, face);
  ctx2.imageSmoothingQuality = "high";
  ctx2.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, c.width, c.height);
}
