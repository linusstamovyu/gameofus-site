// Saves the draft and its photos on this device only (plan 07 Q15), in IndexedDB. Nothing uploads until the
// order is sent. If IndexedDB is unavailable (some private windows), the order still works for this visit.
import { legacyPhotoKeys, newDraft, reviveDraft, type Draft } from "./draft";

const DB = "gameofus-order";
const DRAFT_KEY = "current";
let dbPromise: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("drafts");
        req.result.createObjectStore("photos");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(store: "drafts" | "photos", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then(db => {
    if (!db) return undefined;
    return new Promise<T | undefined>(resolve => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  });
}

export async function loadDraft(): Promise<Draft> {
  const raw = await run("drafts", "readonly", s => s.get(DRAFT_KEY));
  const draft = reviveDraft(raw);
  // A draft from before the one-photo rule keeps one photo per friend; the other photos' blobs go.
  for (const key of legacyPhotoKeys(raw, draft)) void deletePhoto(key);
  return draft;
}

export async function saveDraft(d: Draft): Promise<void> {
  await run("drafts", "readwrite", s => s.put(d, DRAFT_KEY));
}

/** Blobs kept in memory too, so a device without IndexedDB can still send this visit's order. */
const memory = new Map<string, Blob>();

export async function savePhoto(key: string, blob: Blob): Promise<void> {
  memory.set(key, blob);
  await run("photos", "readwrite", s => s.put(blob, key));
}

export async function loadPhoto(key: string): Promise<Blob | undefined> {
  return memory.get(key) ?? (await run<Blob>("photos", "readonly", s => s.get(key)));
}

export async function deletePhoto(key: string): Promise<void> {
  memory.delete(key);
  await run("photos", "readwrite", s => s.delete(key));
}

/** After an order is sent, or when the organiser starts over. */
export async function clearAll(): Promise<Draft> {
  memory.clear();
  await run("photos", "readwrite", s => s.clear());
  const fresh = newDraft();
  await saveDraft(fresh);
  return fresh;
}
