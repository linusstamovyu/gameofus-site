// Step 1, Your squad: a slot per friend with a name, a shirt colour and three photos (plan 07 Q13), each
// checked in the browser, and a pixel preview from the face photo (Q4).
import { el } from "../../dom";
import { heading, type Ctx, type StepView } from "../context";
import { addFriend, PHOTO_KINDS, removeFriend, setPhoto, SHIRT_COLOURS, updateFriend, type Friend, type PhotoKind } from "../draft";
import { pixelPreview, processPhoto, warmFaceDetector } from "../photo";
import { MAX_FRIENDS } from "../prices";
import type { FaceBox } from "../photoRules";
import { deletePhoto, loadPhoto, savePhoto } from "../storage";

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9-]/gi, "").slice(0, 36);
const STATUS_PREFIX = { ok: "", warn: "Check this: ", fail: "Won't work: ", unchecked: "" } as const;

export const squadStep: StepView = (ctx, panel) => {
  warmFaceDetector();
  const urls: string[] = [];
  panel.append(heading("Step 1 of 4", "Who's in the game?",
    "Add each friend with three photos: their face, their full body and an outfit. You'll see a quick pixel preview; the final character is drawn by hand."));

  const rules = el("p", "rules");
  rules.textContent = "Only photos of people who agreed to be in the game. No children, celebrities or brand logos. Photos stay on this device until you send the order.";
  panel.append(rules);

  const list = el("div", "friends");
  const d = ctx.draft();
  d.friends.forEach((f, i) => list.append(friendCard(ctx, f, i, urls)));
  panel.append(list);

  const add = el("button", "btn add-friend", d.friends.length ? "+ Add another friend" : "+ Add your first friend");
  add.type = "button";
  add.disabled = d.friends.length >= MAX_FRIENDS;
  add.onclick = () => {
    const id = newId();
    ctx.update(dr => addFriend(dr, id));
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-friend="${id}"] input[type=text]`)?.focus());
  };
  const count = el("span", "friend-count", `${d.friends.length} of ${MAX_FRIENDS} friends`);
  const row = el("div", "add-row");
  row.append(add, count);
  panel.append(row);

  return () => urls.forEach(u => URL.revokeObjectURL(u));
};

function friendCard(ctx: Ctx, f: Friend, index: number, urls: string[]): HTMLElement {
  const card = el("article", "friend");
  card.dataset.friend = f.id;

  const preview = el("div", "preview");
  if (f.preview) {
    const img = el("img");
    img.src = f.preview;
    img.alt = `Pixel preview of ${f.name || "this friend"}`;
    preview.append(img, el("span", "preview-label", "Preview, not final art"));
  } else {
    preview.append(el("span", "preview-empty", "Add a face photo to see a preview"));
  }

  const main = el("div", "friend-main");
  const nameRow = el("div", "name-row");
  const label = el("label", "field");
  label.append(el("span", null, `Friend ${index + 1}`));
  const name = el("input");
  name.type = "text";
  name.maxLength = 60;
  name.autocomplete = "off";
  name.placeholder = "Their name, as it should appear in the game";
  name.value = f.name;
  name.addEventListener("input", () => ctx.update(d => updateFriend(d, f.id, { name: name.value }), { rerender: false }));
  label.append(name);
  const remove = el("button", "link-btn danger", "Remove");
  remove.type = "button";
  remove.onclick = async () => {
    for (const p of Object.values(f.photos)) if (p) await deletePhoto(p.key);
    ctx.update(d => removeFriend(d, f.id));
  };
  nameRow.append(label, remove);

  const colours = el("div", "colours");
  colours.setAttribute("role", "radiogroup");
  colours.setAttribute("aria-label", "Shirt colour on the preview");
  for (const c of SHIRT_COLOURS) {
    const b = el("button", c === f.colour ? "swatch on" : "swatch");
    b.type = "button";
    b.style.background = c;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(c === f.colour));
    b.setAttribute("aria-label", `Shirt colour ${c}`);
    b.onclick = async () => {
      const face = f.photos.face && (await loadPhoto(f.photos.face.key));
      let previewUrl = f.preview;
      if (face) previewUrl = await redrawPreview(face, f.photos.face?.face ?? null, c);
      ctx.update(d => updateFriend(d, f.id, { colour: c, preview: previewUrl }));
    };
    colours.append(b);
  }

  const photos = el("div", "photos");
  for (const { kind, label: kindLabel, hint } of PHOTO_KINDS) photos.append(photoSlot(ctx, f, kind, kindLabel, hint, urls));

  main.append(nameRow, colours, photos);
  card.append(preview, main);
  return card;
}

function photoSlot(ctx: Ctx, f: Friend, kind: PhotoKind, label: string, hint: string, urls: string[]): HTMLElement {
  const meta = f.photos[kind];
  const slot = el("div", `photo ${meta ? `has ${meta.status}` : "empty"}`);
  const thumb = el("div", "thumb");
  if (meta) {
    void loadPhoto(meta.key).then(blob => {
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      urls.push(u);
      thumb.style.backgroundImage = `url(${u})`;
    });
  }
  const input = el("input");
  input.type = "file";
  input.accept = "image/*";
  input.className = "visually-hidden";
  input.id = `photo-${f.id}-${kind}`;
  const pick = el("label", "btn ghost small", meta ? "Replace" : "Add photo");
  pick.htmlFor = input.id;
  const text = el("div", "photo-text");
  text.append(el("b", null, label));
  const note = el("span", "note", meta ? `${STATUS_PREFIX[meta.status]}${meta.note}` : hint);
  text.append(note);

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    slot.className = "photo busy";
    note.textContent = "Checking the photo…";
    try {
      const out = await processPhoto(file, kind, f.colour);
      const key = `${f.id}-${kind}-${Date.now()}`;
      await savePhoto(key, out.blob);
      if (meta) await deletePhoto(meta.key);
      ctx.update(d => {
        let next = setPhoto(d, f.id, kind, { key, width: out.width, height: out.height, status: out.verdict.status, note: out.verdict.note, face: out.face });
        if (out.preview) next = updateFriend(next, f.id, { preview: out.preview });
        return next;
      });
    } catch (err) {
      slot.className = meta ? `photo has ${meta.status}` : "photo empty";
      note.textContent = err instanceof Error ? err.message : "That photo didn't work. Try another.";
      ctx.notify(note.textContent, "error");
    }
  });

  slot.append(thumb, text, pick, input);
  if (meta) {
    const del = el("button", "link-btn", "Remove");
    del.type = "button";
    del.onclick = async () => {
      await deletePhoto(meta.key);
      ctx.update(d => setPhoto(d, f.id, kind, null));
    };
    slot.append(del);
  }
  return slot;
}

/** Re-colouring the shirt redraws the preview from the stored face photo, without the face check. */
async function redrawPreview(face: Blob, box: FaceBox | null, colour: string): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(face);
    const c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext("2d")!.drawImage(bitmap, 0, 0);
    bitmap.close();
    return pixelPreview(c, box, colour);
  } catch {
    return undefined;
  }
}
