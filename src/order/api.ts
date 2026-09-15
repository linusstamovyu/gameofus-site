// Talks to the Worker (worker/index.ts). Every call fails soft into a sentence the page can show.
import type { Draft } from "./draft";
import { squadFriends } from "./draft";
import type { CreatedOrder, OrderPayload, SubmitResult } from "./payload";
import type { Currency } from "./prices";
import { sectionUploads } from "./sections";
import { loadPhoto } from "./storage";

export class OrderError extends Error {
  constructor(message: string, readonly notOpen = false) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new OrderError("We couldn't reach the shop. Check your connection and try again; your order is saved on this device.");
  }
  const isJson = res.headers.get("content-type")?.includes("json");
  const body = isJson ? ((await res.json()) as { error?: string; message?: string }) : null;
  if (res.status === 503 || !isJson) {
    throw new OrderError("Ordering opens on 4 October. Your order is saved on this device, so you can send it then.", true);
  }
  if (!res.ok) throw new OrderError(body?.message ?? "Something went wrong sending your order. Please try again.");
  return body as T;
}

export interface ShopStatus {
  /** Payments, storage and email are all configured on the Worker. */
  open: boolean;
  /** Paid orders so far (drives founder pricing), or null when unknown. */
  paidOrders: number | null;
}

export async function shopStatus(): Promise<ShopStatus> {
  try {
    return await call<ShopStatus>("/api/status", { method: "GET" });
  } catch {
    return { open: false, paidOrders: null };
  }
}

const crop = (b: { x: number; y: number; width: number; height: number } | null) =>
  b && { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };

export function toPayload(d: Draft, currency: Currency, country: string, shownTotal: number): OrderPayload {
  return {
    edition: d.edition ?? "standard",
    currency,
    country,
    friends: squadFriends(d).map(f => ({
      id: f.id,
      name: f.name.trim(),
      photo: f.photo ? { width: f.photo.width, height: f.photo.height, face: crop(f.photo.face), body: crop(f.photo.body) } : null,
    })),
    bigGames: d.bigGames,
    minigames: d.minigames,
    customGame: d.customGame.trim(),
    partyMode: d.partyMode,
    flexPass: d.flexPass,
    directorsCut: d.directorsCut,
    sections: d.sections,
    organiser: { ...d.organiser, name: d.organiser.name.trim(), email: d.organiser.email.trim() },
    perkUnlockedAt: d.perkUnlockedAt,
    shownTotal,
  };
}

export async function createOrder(payload: OrderPayload): Promise<CreatedOrder> {
  return call<CreatedOrder>("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}

/** Uploads each friend's one photo and every file attached in steps 4–9, reporting progress as 0..1. */
export async function uploadPhotos(orderId: string, d: Draft, onProgress: (done: number) => void): Promise<void> {
  const id = encodeURIComponent(orderId);
  const jobs: { path: string; key: string | undefined; missing: string }[] = [
    // One photo per friend (owner, 15 Sep 2026); the face and full-body crops travel as numbers in the order.
    ...squadFriends(d).map(f => ({
      path: `/api/orders/${id}/photos/${encodeURIComponent(f.id)}`,
      key: f.photo?.key,
      missing: `${f.name || "A friend"}'s photo is missing on this device. Add it again on the squad step.`,
    })),
    ...sectionUploads(d.sections).map(u => ({
      path: `/api/orders/${id}/files/${encodeURIComponent(u.id)}`,
      key: u.id,
      missing: `"${u.name}" is missing on this device. Attach it again on the ${u.section} step.`,
    })),
  ];
  let done = 0;
  for (const job of jobs) {
    const blob = job.key && (await loadPhoto(job.key));
    if (!blob) throw new OrderError(job.missing);
    await call(job.path, { method: "PUT", headers: { "content-type": blob.type || "application/octet-stream" }, body: blob });
    onProgress(++done / jobs.length);
  }
}

export async function submitOrder(orderId: string): Promise<SubmitResult> {
  return call<SubmitResult>(`/api/orders/${encodeURIComponent(orderId)}/submit`, { method: "POST" });
}
