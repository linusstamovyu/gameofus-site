// Talks to the Worker (worker/index.ts). Every call fails soft into a sentence the page can show.
import type { Draft } from "./draft";
import { PHOTO_KINDS } from "./draft";
import type { CreatedOrder, OrderPayload, SubmitResult } from "./payload";
import type { Currency } from "./prices";
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

export function toPayload(d: Draft, currency: Currency, country: string, shownTotal: number): OrderPayload {
  return {
    edition: d.edition ?? "standard",
    currency,
    country,
    friends: d.friends.map(f => ({ id: f.id, name: f.name.trim() })),
    bigGames: d.bigGames,
    minigames: d.minigames,
    customGame: d.customGame.trim(),
    partyMode: d.partyMode,
    flexPass: d.flexPass,
    directorsCut: d.directorsCut,
    organiser: { ...d.organiser, name: d.organiser.name.trim(), email: d.organiser.email.trim() },
    shownTotal,
  };
}

export async function createOrder(payload: OrderPayload): Promise<CreatedOrder> {
  return call<CreatedOrder>("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}

/** Uploads every photo of every friend, reporting progress as 0..1. */
export async function uploadPhotos(orderId: string, d: Draft, onProgress: (done: number) => void): Promise<void> {
  const jobs = d.friends.flatMap(f => PHOTO_KINDS.map(({ kind }) => ({ f, kind, meta: f.photos[kind] })));
  let done = 0;
  for (const { f, kind, meta } of jobs) {
    const blob = meta && (await loadPhoto(meta.key));
    if (!blob) throw new OrderError(`${f.name || "A friend"}'s ${kind} photo is missing on this device. Add it again on the squad step.`);
    await call(`/api/orders/${encodeURIComponent(orderId)}/photos/${encodeURIComponent(f.id)}/${kind}`, { method: "PUT", headers: { "content-type": blob.type || "image/jpeg" }, body: blob });
    onProgress(++done / jobs.length);
  }
}

export async function submitOrder(orderId: string): Promise<SubmitResult> {
  return call<SubmitResult>(`/api/orders/${encodeURIComponent(orderId)}/submit`, { method: "POST" });
}
