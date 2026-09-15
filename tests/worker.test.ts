import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env, KVNamespace, R2Bucket, R2ObjectBody } from "../worker/env";
import { route } from "../worker/router";
import { checkoutForm, signForTest, verifyStripeSignature } from "../worker/stripe";
import { customerEmail, ownerEmail } from "../worker/email";
import { quote, LADDERS, ACTIVE_LADDER } from "../src/order/prices";
import { defaultSections } from "../src/order/sections";

// ---------- in-memory Cloudflare fakes ----------
function fakeBucket() {
  const store = new Map<string, { body: ArrayBuffer; type?: string }>();
  const bucket: R2Bucket = {
    async get(key) {
      const v = store.get(key);
      if (!v) return null;
      const obj: R2ObjectBody = { key, size: v.body.byteLength, httpMetadata: { contentType: v.type }, arrayBuffer: async () => v.body, text: async () => new TextDecoder().decode(v.body) };
      return obj;
    },
    async put(key, value, opts) {
      store.set(key, { body: typeof value === "string" ? new TextEncoder().encode(value).buffer : value, type: opts?.httpMetadata?.contentType });
    },
    async delete(keys) {
      for (const k of Array.isArray(keys) ? keys : [keys]) store.delete(k);
    },
    async list({ prefix }) {
      return { objects: [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, size: v.body.byteLength })), truncated: false };
    },
  };
  return { bucket, store };
}
function fakeKv(): KVNamespace & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, get: async k => data.get(k) ?? null, put: async (k, v) => void data.set(k, v) };
}

const ORIGIN = "https://gameofus.test";
const req = (method: string, path: string, body?: BodyInit, headers: Record<string, string> = {}) => new Request(ORIGIN + path, { method, body, headers });

const payload = {
  edition: "deluxe", currency: "DKK", country: "DK", friends: [{ id: "f1", name: "Mads" }, { id: "f2", name: "Rico" }],
  bigGames: ["kart"], minigames: ["blackjack"], customGame: "", partyMode: false, flexPass: false, directorsCut: false,
  sections: defaultSections(),
  organiser: { name: "Mads Hansen", email: "mads@example.com", birthYear: "", adultsConfirmed: false, photosPermission: true, startNow: true },
  shownTotal: LADDERS[ACTIVE_LADDER].editions.deluxe.founder.DKK,
};

function openEnv() {
  const { bucket, store } = fakeBucket();
  const kv = fakeKv();
  const env: Env = { ASSETS: { fetch: async () => new Response("asset") }, ORDERS: bucket, SHOP: kv, STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test", SITE_URL: ORIGIN };
  return { env, store, kv };
}

async function createWithPhotos(env: Env, body = payload) {
  const created = (await (await route(req("POST", "/api/orders", JSON.stringify(body), { "content-type": "application/json" }), env))!.json()) as { id: string; total: number; priceChanged: boolean; isRequest: boolean };
  for (const f of body.friends) {
    const r = await route(req("PUT", `/api/orders/${created.id}/photos/${f.id}`, new Uint8Array([255, 216, 255, 1, 2, 3]), { "content-type": "image/jpeg" }), env);
    expect(r!.status).toBe(200);
  }
  return created;
}

afterEach(() => vi.restoreAllMocks());

describe("worker: before the shop is open", () => {
  it("serves status and geo, and refuses orders with 503 until storage and Stripe exist", async () => {
    const env: Env = { ASSETS: { fetch: async () => new Response("asset") } };
    const status = await (await route(req("GET", "/api/status"), env))!.json();
    expect(status).toEqual({ open: false, paidOrders: null, founderSpots: 30 });
    const order = await route(req("POST", "/api/orders", JSON.stringify(payload)), env);
    expect(order!.status).toBe(503);
    expect(await route(req("GET", "/api/nothing"), env)).toBeNull();
  });
});

describe("worker: logo ratings", () => {
  it("stores any number of independent 1–5 logo ratings and summarizes them", async () => {
    const { bucket } = fakeBucket();
    const env: Env = { ASSETS: { fetch: async () => new Response("asset") }, VOTES: bucket };
    const first = await route(req("POST", "/api/logo-votes", JSON.stringify({ ratings: { "universe-caps/01": 5, "standalone/universe-orbit": 3 } }), { "content-type": "application/json" }), env);
    expect(first!.status).toBe(200);
    const second = await route(req("POST", "/api/logo-votes", JSON.stringify({ ratings: { "universe-caps/01": 4 } }), { "content-type": "application/json" }), env);
    expect(second!.status).toBe(200);
    const summary = await (await route(req("GET", "/api/logo-votes/summary"), env))!.json() as { respondents: number; ratedLogos: number; options: { option: string; average: number; ratings: number }[] };
    expect(summary.respondents).toBe(2);
    expect(summary.ratedLogos).toBe(2);
    expect(summary.options[0]).toMatchObject({ option: "universe-caps/01", average: 4.5, ratings: 2 });
  });

  it("rejects a ratings form with no valid scores", async () => {
    const { bucket } = fakeBucket();
    const env: Env = { ASSETS: { fetch: async () => new Response("asset") }, VOTES: bucket };
    const response = await route(req("POST", "/api/logo-votes", JSON.stringify({ ratings: { "universe-caps/01": 6 } }), { "content-type": "application/json" }), env);
    expect(response!.status).toBe(400);
  });
});

describe("worker: an order from start to paid", () => {
  it("prices the order itself, takes the photos, starts checkout and counts the payment once", async () => {
    const { env, store, kv } = openEnv();
    const created = await createWithPhotos(env);
    expect(created.priceChanged).toBe(false);
    expect(created.total).toBe(quote({ edition: "deluxe", friends: 2, bigGames: 1, minigames: 1, addons: {} }, "DKK", 0).total);
    expect([...store.keys()].filter(k => k.startsWith(`pending/${created.id}/photos/`))).toHaveLength(2);

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }), { status: 200 }));
    const submit = await (await route(req("POST", `/api/orders/${created.id}/submit`), env))!.json();
    expect(submit).toEqual({ kind: "checkout", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
    const sent = new URLSearchParams(String(fetchMock.mock.calls[0][1]!.body));
    expect(sent.get("line_items[0][price_data][currency]")).toBe("dkk");
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe(String(created.total));
    expect(sent.get("metadata[order_id]")).toBe(created.id);
    expect(sent.get("success_url")).toBe(`${ORIGIN}/order.html?done=paid&id=${created.id}`);

    const event = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_test_1", payment_status: "paid", metadata: { order_id: created.id } } } });
    const sig = await signForTest(event, "whsec_test", Math.floor(Date.now() / 1000));
    const hook = await route(req("POST", "/api/stripe", event, { "stripe-signature": sig }), env);
    expect(await hook!.json()).toEqual({ ok: true });
    expect(kv.data.get("paid-orders")).toBe("1");
    expect([...store.keys()].some(k => k.startsWith("pending/"))).toBe(false);
    const record = JSON.parse(new TextDecoder().decode(store.get(`orders/${created.id}/order.json`)!.body));
    expect(record.status).toBe("paid");
    expect([...store.keys()].filter(k => k.startsWith(`orders/${created.id}/photos/`))).toHaveLength(2);

    // Stripe retries: the second delivery changes nothing.
    const again = await route(req("POST", "/api/stripe", event, { "stripe-signature": sig }), env);
    expect(await again!.json()).toEqual({ duplicate: true });
    expect(kv.data.get("paid-orders")).toBe("1");
  });

  it("switches to normal prices once the founder spots are gone, and says the price changed", async () => {
    const { env, kv } = openEnv();
    kv.data.set("paid-orders", "30");
    const created = await createWithPhotos(env);
    expect(created.priceChanged).toBe(true);
    expect(created.total).toBe(quote({ edition: "deluxe", friends: 2, bigGames: 1, minigames: 1, addons: {} }, "DKK", 30).total);
  });

  it("sends an order with a custom game as a request, with no checkout", async () => {
    const { env, store } = openEnv();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const created = await createWithPhotos(env, { ...payload, customGame: "Revolving door heist" });
    expect(created.isRequest).toBe(true);
    const submit = await (await route(req("POST", `/api/orders/${created.id}/submit`), env))!.json();
    expect(submit).toEqual({ kind: "request" });
    expect(fetchMock).not.toHaveBeenCalled(); // no Stripe, and no email without Resend configured
    expect(JSON.parse(new TextDecoder().decode(store.get(`orders/${created.id}/order.json`)!.body)).status).toBe("requested");
  });

  it("refuses to submit before every photo has arrived, and refuses photos for the wrong friend or type", async () => {
    const { env } = openEnv();
    const created = (await (await route(req("POST", "/api/orders", JSON.stringify(payload)), env))!.json()) as { id: string };
    const early = await route(req("POST", `/api/orders/${created.id}/submit`), env);
    expect(early!.status).toBe(400);
    expect((await early!.json()).message).toMatch(/0 of 2/);
    expect((await route(req("PUT", `/api/orders/${created.id}/photos/stranger`, new Uint8Array([1]), { "content-type": "image/jpeg" }), env))!.status).toBe(400);
    expect((await route(req("PUT", `/api/orders/${created.id}/photos/f1`, "<svg/>", { "content-type": "image/svg+xml" }), env))!.status).toBe(400);
  });

  it("takes files named by the order's sections, refuses others, and waits for them before submitting", async () => {
    const { env, store } = openEnv();
    const sections = { ...defaultSections(), world: { places: [{ id: "home1", kind: "home", kit: "home", name: "Our flat", mapPin: "", fromPhotos: true, photos: [{ id: "placephoto1", kind: "image", name: "flat.jpg", type: "image/jpeg", size: 6 }], notes: "" }], signs: [] } };
    const created = await createWithPhotos(env, { ...payload, sections } as typeof payload);
    const early = await route(req("POST", `/api/orders/${created.id}/submit`), env);
    expect((await early!.json()).message).toMatch(/2 of 3/);
    expect((await route(req("PUT", `/api/orders/${created.id}/files/notinorder`, new Uint8Array([1]), { "content-type": "image/jpeg" }), env))!.status).toBe(400);
    expect((await route(req("PUT", `/api/orders/${created.id}/files/placephoto1`, new Uint8Array([1]), { "content-type": "audio/mpeg" }), env))!.status).toBe(400);
    expect((await route(req("PUT", `/api/orders/${created.id}/files/placephoto1`, new Uint8Array([255, 216, 1]), { "content-type": "image/jpeg" }), env))!.status).toBe(200);
    expect(store.has(`pending/${created.id}/files/placephoto1.jpg`)).toBe(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "cs_2", url: "https://checkout.stripe.com/x" }), { status: 200 }));
    const ok = await route(req("POST", `/api/orders/${created.id}/submit`), env);
    expect((await ok!.json()).kind).toBe("checkout");
  });

  it("rejects a webhook with a bad or stale signature", async () => {
    const { env } = openEnv();
    const body = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "x", metadata: { order_id: "y" } } } });
    expect((await route(req("POST", "/api/stripe", body, { "stripe-signature": "t=1,v1=abc" }), env))!.status).toBe(400);
    const stale = await signForTest(body, "whsec_test", Math.floor(Date.now() / 1000) - 3600);
    expect(await verifyStripeSignature(body, stale, "whsec_test")).toBe(false);
    expect(await verifyStripeSignature(body, await signForTest(body, "other", Math.floor(Date.now() / 1000)), "whsec_test")).toBe(false);
  });
});

describe("worker: emails and checkout form", () => {
  const q = quote({ edition: "deluxe", friends: 2, bigGames: 4, minigames: 1, addons: { flex_pass: 1 } }, "GBP", 0);
  const record = { id: "3f1e2d4c-0000-4000-8000-000000000000", createdAt: "", status: "paid" as const, payload: { ...payload, currency: "GBP" as const, edition: "deluxe" as const }, quote: q };

  it("puts every price line on the Stripe session in the order's currency", () => {
    const f = checkoutForm({ orderId: record.id, quote: q, email: "m@example.com", siteUrl: ORIGIN, editionName: "Deluxe" });
    expect(f.get("line_items[0][price_data][currency]")).toBe("gbp");
    expect(q.lines.length).toBeGreaterThan(1);
    const sum = q.lines.reduce((s, _l, i) => s + Number(f.get(`line_items[${i}][price_data][unit_amount]`)) * Number(f.get(`line_items[${i}][quantity]`)), 0);
    expect(sum).toBe(q.total);
  });

  it("gives the owner what's needed to start and the customer what happens next", () => {
    const owner = ownerEmail(record, ORIGIN);
    expect(owner.text).toContain("PAID · Deluxe edition");
    expect(owner.text).toContain("Mads, Rico");
    expect(owner.text).toContain("consent form");
    const customer = customerEmail(record);
    expect(customer.text).toContain("Hi Mads,");
    expect(customer.text).toContain("money back");
    expect(customer.subject).toBe("Your Game of Us order is booked");
  });
});
