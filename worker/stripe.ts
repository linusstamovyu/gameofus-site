// Stripe over plain fetch (no SDK in the Worker). Checkout Session creation and webhook signature checks.
import type { Quote } from "../src/order/prices";

/** Stripe's form encoding for a Checkout Session. Payment methods are left to the Stripe dashboard, which is
 *  where Klarna and MobilePay are switched on (plan 17: no code change when they're approved). */
export function checkoutForm(opts: { orderId: string; quote: Quote; email: string; siteUrl: string; editionName: string }): URLSearchParams {
  const f = new URLSearchParams();
  const cur = opts.quote.currency.toLowerCase();
  f.set("mode", "payment");
  f.set("success_url", `${opts.siteUrl}/order.html?done=paid&id=${encodeURIComponent(opts.orderId)}`);
  f.set("cancel_url", `${opts.siteUrl}/order.html?cancelled=1`);
  f.set("customer_email", opts.email);
  f.set("client_reference_id", opts.orderId);
  f.set("metadata[order_id]", opts.orderId);
  f.set("payment_intent_data[metadata][order_id]", opts.orderId);
  f.set("payment_intent_data[description]", `Game of Us · ${opts.editionName} edition`);
  opts.quote.lines.forEach((line, i) => {
    f.set(`line_items[${i}][quantity]`, String(line.qty));
    f.set(`line_items[${i}][price_data][currency]`, cur);
    f.set(`line_items[${i}][price_data][unit_amount]`, String(line.unit));
    f.set(`line_items[${i}][price_data][product_data][name]`, line.label);
  });
  return f;
}

export async function createCheckoutSession(secretKey: string, form: URLSearchParams): Promise<{ id: string; url: string }> {
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !body.url || !body.id) throw new Error(`Stripe: ${body.error?.message ?? res.status}`);
  return { id: body.id, url: body.url };
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checks a Stripe-Signature header ("t=…,v1=…") against the raw body, within a 5-minute window. */
export async function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map(p => p.split("=", 2) as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || !/^\d+$/.test(t) || Math.abs(nowSeconds - Number(t)) > 300) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return sigs.some(s => safeEqual(s, expected));
}

/** For tests: a header Stripe would send for this body. */
export async function signForTest(rawBody: string, secret: string, t: number): Promise<string> {
  return `t=${t},v1=${await hmacHex(secret, `${t}.${rawBody}`)}`;
}
