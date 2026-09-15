// POST /api/list: email a visitor the favourites they picked on Explore (plan 18 phase 4).
// The address is used to send that one email. It is only KEPT when the visitor ticked the (never pre-ticked) box
// asking for founder-spot and Christmas-deadline news, and then as a lead with the list, so the owner can follow up.
// Needs Resend (RESEND_API_KEY + ORDER_EMAIL_FROM); leads need the ORDERS bucket; the daily limit needs SHOP.
import { checkListRequest, listEmail, LIST_PER_DAY } from "../src/explore/listEmail";
import { favouriteCount } from "../src/explore/favourites";
import { sendEmail } from "./email";
import type { Env } from "./env";
import { json } from "./orders";

const fail = (status: number, message: string) => json({ error: status === 503 ? "not_open" : status === 429 ? "too_many" : "bad_request", message }, status);

/** A key for the daily limit that doesn't put the address itself in KV. */
async function addressKey(email: string, day: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
  const hex = [...new Uint8Array(bytes)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
  return `list:${day}:${hex}`;
}

export async function handleList(request: Request, env: Env, now = new Date(), newId: () => string = () => crypto.randomUUID()): Promise<Response> {
  if (!env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM) return fail(503, "Emailing lists isn't switched on yet. Your list is still saved on this device.");
  let raw: unknown;
  try { raw = await request.json(); } catch { return fail(400, "The list couldn't be read."); }
  const checked = checkListRequest(raw);
  if (!checked.ok) return fail(400, checked.error);
  const list = checked.value;

  if (env.SHOP) {
    const key = await addressKey(list.email, now.toISOString().slice(0, 10));
    const sent = Number(await env.SHOP.get(key)) || 0;
    if (sent >= LIST_PER_DAY) return fail(429, "We've already sent that address a few lists today. Try again tomorrow.");
    await env.SHOP.put(key, String(sent + 1));
  }

  const site = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  try {
    await sendEmail(env.RESEND_API_KEY, env.ORDER_EMAIL_FROM, list.email, listEmail(list, site), env.ORDER_EMAIL_TO);
  } catch (err) {
    console.error("list email failed", err);
    return fail(502, "The email didn't go. Your list is still saved on this device; try again in a minute.");
  }
  if (list.updates && env.ORDERS) {
    const lead = { id: newId(), createdAt: now.toISOString(), email: list.email, favourites: list.favourites, consent: "founder spots and Christmas deadlines by email" };
    await env.ORDERS.put(`leads/${lead.id}.json`, JSON.stringify(lead, null, 2), { httpMetadata: { contentType: "application/json" } });
  }
  return json({ ok: true, items: favouriteCount(list.favourites) });
}
