// The order API (plan 17). Handlers take the Env and return Responses, so tests can run them with in-memory
// fakes. Rules: the Worker prices every order itself with prices.ts; photos go to a private bucket under
// pending/<id>/ until the order is paid or sent as a request, then move to orders/<id>/; an R2 lifecycle rule
// deletes pending/ after 2 days.
import { checkPayload, payloadUploads, picksFromPayload, type OrderPayload } from "../src/order/payload";
import { FOUNDER_SPOTS, quote, type Quote } from "../src/order/prices";
import { customerEmail, ownerEmail, sendEmail } from "./email";
import type { Env, ExecutionContext, KVNamespace, R2Bucket } from "./env";
import { checkoutForm, createCheckoutSession, verifyStripeSignature } from "./stripe";

export interface OrderRecord {
  id: string;
  createdAt: string;
  status: "pending" | "checkout" | "requested" | "paid";
  payload: OrderPayload;
  quote: Quote;
  stripeSessionId?: string;
  paidAt?: string;
}

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const AUDIO_EXT: Record<string, string> = { "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg", "audio/aac": "aac" };
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PAID_COUNT = "paid-orders";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status: number, message: string) => json({ error: status === 503 ? "not_open" : "bad_request", message }, status);

/** Storage, payments and email must all exist before anyone can pay. */
export function shopOpen(env: Env): env is Env & { ORDERS: R2Bucket; SHOP: KVNamespace; STRIPE_SECRET_KEY: string } {
  return Boolean(env.ORDERS && env.SHOP && env.STRIPE_SECRET_KEY);
}

export async function paidOrders(kv: KVNamespace | undefined): Promise<number | null> {
  if (!kv) return null;
  const n = Number(await kv.get(PAID_COUNT));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const recordKey = (prefix: "pending" | "orders", id: string) => `${prefix}/${id}/order.json`;

async function readRecord(bucket: R2Bucket, id: string): Promise<[OrderRecord, "pending" | "orders"] | null> {
  for (const prefix of ["pending", "orders"] as const) {
    const obj = await bucket.get(recordKey(prefix, id));
    if (obj) return [JSON.parse(await obj.text()) as OrderRecord, prefix];
  }
  return null;
}

const writeRecord = (bucket: R2Bucket, prefix: "pending" | "orders", r: OrderRecord) =>
  bucket.put(recordKey(prefix, r.id), JSON.stringify(r, null, 2), { httpMetadata: { contentType: "application/json" } });

/** Moves everything under pending/<id>/ to orders/<id>/, so the lifecycle rule never deletes a real order. */
async function promote(bucket: R2Bucket, r: OrderRecord): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: `pending/${r.id}/`, cursor });
    for (const o of page.objects) {
      if (o.key.endsWith("/order.json")) continue;
      const body = await bucket.get(o.key);
      if (body) await bucket.put(o.key.replace(/^pending\//, "orders/"), await body.arrayBuffer(), { httpMetadata: body.httpMetadata });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  await writeRecord(bucket, "orders", r);
  const old: string[] = [];
  cursor = undefined;
  do {
    const page = await bucket.list({ prefix: `pending/${r.id}/`, cursor });
    old.push(...page.objects.map(o => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  if (old.length) await bucket.delete(old);
}

function siteUrl(env: Env, request: Request): string {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

async function notify(env: Env, r: OrderRecord, site: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM) {
    console.log(`Order ${r.id} ${r.status}: email not configured, skipped`);
    return;
  }
  const jobs: Promise<void>[] = [sendEmail(env.RESEND_API_KEY, env.ORDER_EMAIL_FROM, r.payload.organiser.email, customerEmail(r), env.ORDER_EMAIL_TO)];
  if (env.ORDER_EMAIL_TO) jobs.push(sendEmail(env.RESEND_API_KEY, env.ORDER_EMAIL_FROM, env.ORDER_EMAIL_TO, ownerEmail(r, site), r.payload.organiser.email));
  const results = await Promise.allSettled(jobs);
  for (const res of results) if (res.status === "rejected") console.error(`Order ${r.id}: email failed`, res.reason);
}

// ---------- handlers ----------

export async function handleStatus(env: Env): Promise<Response> {
  return json({ open: shopOpen(env), paidOrders: await paidOrders(env.SHOP), founderSpots: FOUNDER_SPOTS });
}

export async function handleCreate(request: Request, env: Env, newId: () => string = () => crypto.randomUUID()): Promise<Response> {
  if (!shopOpen(env)) return fail(503, "Ordering isn't open yet.");
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail(400, "The order couldn't be read.");
  }
  const checked = checkPayload(raw);
  if (!checked.ok) return fail(400, checked.error);
  const payload = checked.value;
  const q = quote(picksFromPayload(payload), payload.currency, (await paidOrders(env.SHOP)) ?? 0);
  const record: OrderRecord = { id: newId(), createdAt: new Date().toISOString(), status: "pending", payload, quote: q };
  await writeRecord(env.ORDERS, "pending", record);
  return json({ id: record.id, total: q.total, currency: q.currency, isRequest: q.isRequest, priceChanged: q.total !== payload.shownTotal });
}

/** A friend's one photo (owner, 15 Sep 2026: one per character; the face and body crops are numbers in the payload). */
export async function handlePhoto(request: Request, env: Env, id: string, friendId: string): Promise<Response> {
  if (!shopOpen(env)) return fail(503, "Ordering isn't open yet.");
  const found = await readRecord(env.ORDERS, id);
  if (!found || found[1] !== "pending" || found[0].status !== "pending") return fail(404, "That order can't take photos any more.");
  if (!found[0].payload.friends.some(f => f.id === friendId)) return fail(400, "Unknown photo.");
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!PHOTO_TYPES.has(type)) return fail(400, "Photos must be JPEG, PNG or WebP.");
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_PHOTO_BYTES) return fail(413, "That photo is too large.");
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_PHOTO_BYTES) return fail(413, "That photo is empty or too large.");
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  // Replace any earlier upload of the same photo with a different extension.
  await env.ORDERS.delete(["jpg", "png", "webp"].filter(e => e !== ext).map(e => `pending/${id}/photos/${friendId}.${e}`));
  await env.ORDERS.put(`pending/${id}/photos/${friendId}.${ext}`, body, { httpMetadata: { contentType: type } });
  return json({ ok: true });
}

/** A file attached in steps 4–9. Only ids the order's own sections name are accepted. */
export async function handleFile(request: Request, env: Env, id: string, fileId: string): Promise<Response> {
  if (!shopOpen(env)) return fail(503, "Ordering isn't open yet.");
  const found = await readRecord(env.ORDERS, id);
  if (!found || found[1] !== "pending" || found[0].status !== "pending") return fail(404, "That order can't take files any more.");
  const ref = payloadUploads(found[0].payload).find(u => u.id === fileId);
  if (!ref) return fail(400, "Unknown file.");
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const isImage = ref.kind === "image" && PHOTO_TYPES.has(type);
  const isAudio = ref.kind === "audio" && type in AUDIO_EXT;
  if (!isImage && !isAudio) return fail(400, ref.kind === "audio" ? "Voice notes must be m4a, mp3, wav, webm, ogg or aac." : "Photos must be JPEG, PNG or WebP.");
  const limit = isAudio ? MAX_AUDIO_BYTES : MAX_PHOTO_BYTES;
  if (Number(request.headers.get("content-length") ?? "0") > limit) return fail(413, "That file is too large.");
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > limit) return fail(413, "That file is empty or too large.");
  const ext = isAudio ? AUDIO_EXT[type] : type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const existing = await env.ORDERS.list({ prefix: `pending/${id}/files/${fileId}.` });
  if (existing.objects.length) await env.ORDERS.delete(existing.objects.map(x => x.key));
  await env.ORDERS.put(`pending/${id}/files/${fileId}.${ext}`, body, { httpMetadata: { contentType: type } });
  return json({ ok: true });
}

export async function handleSubmit(request: Request, env: Env, id: string, ctx?: ExecutionContext): Promise<Response> {
  if (!shopOpen(env)) return fail(503, "Ordering isn't open yet.");
  const found = await readRecord(env.ORDERS, id);
  if (!found) return fail(404, "Order not found.");
  const [record, prefix] = found;
  if (prefix !== "pending") return fail(400, "This order has already been sent.");
  const photos = await env.ORDERS.list({ prefix: `pending/${id}/photos/` });
  const files = await env.ORDERS.list({ prefix: `pending/${id}/files/` });
  const needed = record.payload.friends.length + payloadUploads(record.payload).length;
  const arrived = photos.objects.length + files.objects.length;
  if (arrived < needed) return fail(400, `Some photos or files didn't arrive (${arrived} of ${needed}). Please send the order again.`);
  const site = siteUrl(env, request);

  // Re-quote at the moment of paying: the founder count may have moved since the order was created.
  const q = quote(picksFromPayload(record.payload), record.payload.currency, (await paidOrders(env.SHOP)) ?? 0);
  if (q.isRequest) {
    const done: OrderRecord = { ...record, quote: q, status: "requested" };
    await promote(env.ORDERS, done);
    const mail = notify(env, done, site);
    if (ctx) ctx.waitUntil(mail);
    else await mail;
    return json({ kind: "request" });
  }
  const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, checkoutForm({ orderId: id, quote: q, email: record.payload.organiser.email, siteUrl: site, editionName: record.payload.edition.replace(/^./, c => c.toUpperCase()) }));
  await writeRecord(env.ORDERS, "pending", { ...record, quote: q, status: "checkout", stripeSessionId: session.id });
  return json({ kind: "checkout", url: session.url });
}

/** Stripe's webhook: a completed Checkout Session marks the order paid, counts it once and sends the emails. */
export async function handleStripeWebhook(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.ORDERS || !env.SHOP) return fail(503, "Webhook not configured.");
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) return fail(400, "Bad signature.");
  const event = JSON.parse(raw) as { type: string; data: { object: { id: string; metadata?: { order_id?: string }; payment_status?: string } } };
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return json({ ignored: event.type });
  const session = event.data.object;
  if (session.payment_status && session.payment_status !== "paid") return json({ waiting: session.payment_status });
  const id = session.metadata?.order_id;
  if (!id) return fail(400, "No order id on the session.");
  // Stripe retries webhooks: count and email each order exactly once.
  if (await env.SHOP.get(`paid:${id}`)) return json({ duplicate: true });
  const found = await readRecord(env.ORDERS, id);
  if (!found) return fail(404, "Order not found.");
  const paid: OrderRecord = { ...found[0], status: "paid", paidAt: new Date().toISOString(), stripeSessionId: session.id };
  await promote(env.ORDERS, paid);
  await env.SHOP.put(`paid:${id}`, paid.paidAt!);
  await env.SHOP.put(PAID_COUNT, String(((await paidOrders(env.SHOP)) ?? 0) + 1));
  const mail = notify(env, paid, siteUrl(env, request));
  if (ctx) ctx.waitUntil(mail);
  else await mail;
  return json({ ok: true });
}
