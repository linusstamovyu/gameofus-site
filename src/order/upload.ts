// Attaching a file in steps 4–9: images are resized like the squad photos, audio is kept as recorded. The file
// is stored on this device under the returned UploadRef's id and only uploaded when the order is sent.
import { el } from "../dom";
import { MAX_LONG_SIDE } from "./photo";
import type { UploadRef } from "./sections/types";
import { deletePhoto, loadPhoto, savePhoto } from "./storage";

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 36);

/** Store a chosen file and describe it. Throws an Error with a plain-words message if the file won't do. */
export async function attachFile(file: File, kind: UploadRef["kind"]): Promise<UploadRef> {
  const id = newId();
  if (kind === "audio") {
    if (!file.type.startsWith("audio/")) throw new Error("That isn't an audio file. Try a voice memo (m4a, mp3 or wav).");
    if (file.size > MAX_AUDIO_BYTES) throw new Error("That recording is over 15 MB. Keep voice notes under about 10 minutes.");
    await savePhoto(id, file);
    return { id, kind, name: file.name.slice(0, 120), type: file.type, size: file.size };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't open that photo. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("Couldn't save the photo."))), "image/jpeg", 0.88));
  await savePhoto(id, blob);
  return { id, kind, name: file.name.slice(0, 120), type: "image/jpeg", size: blob.size };
}

export function removeUpload(ref: UploadRef): Promise<void> {
  return deletePhoto(ref.id);
}

/** An object URL for showing an attached image; revoke it when the step re-renders. */
export async function uploadUrl(ref: UploadRef): Promise<string | null> {
  const blob = await loadPhoto(ref.id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * A button that opens the file picker and hands back a stored UploadRef. Errors are shown next to the button.
 * `accept` defaults to images or audio by kind.
 */
export function fileButton(label: string, kind: UploadRef["kind"], onAttached: (ref: UploadRef) => void, accept?: string): HTMLElement {
  const wrap = el("span", "file-button");
  const input = el("input");
  input.type = "file";
  input.accept = accept ?? (kind === "audio" ? "audio/*" : "image/*");
  input.className = "visually-hidden";
  input.id = `file-${newId()}`;
  const btn = el("label", "btn ghost small", label);
  btn.htmlFor = input.id;
  const note = el("span", "file-note");
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    note.textContent = "Adding…";
    try {
      const ref = await attachFile(file, kind);
      note.textContent = "";
      onAttached(ref);
    } catch (err) {
      note.textContent = err instanceof Error ? err.message : "That file didn't work.";
    }
  });
  wrap.append(input, btn, note);
  return wrap;
}
