import { describe, expect, it, vi, afterEach } from "vitest";
import { checkListRequest, decodeList, encodeList, listEmail, listLink, LIST_PER_DAY } from "../src/explore/listEmail";
import type { Env, KVNamespace, R2Bucket } from "../worker/env";
import { route } from "../worker/router";

const favs = { game: ["kart", "brawler"], minigame: ["blackjack"], vehicle: ["taxi"] };

describe("the emailed list", () => {
  it("round-trips through the restore link and drops anything unknown", () => {
    expect(decodeList(encodeList(favs))).toEqual(favs);
    expect(decodeList("g:kart.rocket|x:nope|m:")).toEqual({ game: ["kart"], minigame: [], vehicle: [] });
    expect(listLink("https://gameofus.dk", favs)).toBe("https://gameofus.dk/explore.html?list=g%3Akart.brawler%7Cm%3Ablackjack%7Cv%3Ataxi");
  });

  it("refuses a bad address or an empty list, and never pre-ticks updates", () => {
    expect(checkListRequest({ email: "nope", favourites: favs }).ok).toBe(false);
    expect(checkListRequest({ email: "a@b.dk", favourites: { game: ["rocket"] } }).ok).toBe(false);
    const ok = checkListRequest({ email: " a@b.dk ", favourites: favs, updates: "yes" });
    expect(ok.ok && ok.value).toMatchObject({ email: "a@b.dk", updates: false });
  });

  it("names things the way the site does and says whether it'll write again", () => {
    const quiet = listEmail({ email: "a@b.dk", favourites: favs, updates: false }, "https://gameofus.dk");
    expect(quiet.text).toContain("Kart Race");
    expect(quiet.text).toContain("Blackjack 21");
    expect(quiet.text).toContain("https://gameofus.dk/explore.html?list=");
    expect(quiet.text).toContain("only email");
    expect(listEmail({ email: "a@b.dk", favourites: favs, updates: true }, "x").text).toContain("stop");
  });
});

describe("worker: POST /api/list", () => {
  afterEach(() => vi.restoreAllMocks());
  const kv = (): KVNamespace => { const d = new Map<string, string>(); return { get: async k => d.get(k) ?? null, put: async (k, v) => void d.set(k, v) }; };
  const bucket = () => { const keys: string[] = []; const b = { put: async (k: string) => void keys.push(k) } as unknown as R2Bucket; return { b, keys }; };
  const post = (body: unknown) => new Request("https://gameofus.test/api/list", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

  it("is 503 until Resend is set up", async () => {
    const res = await route(post({ email: "a@b.dk", favourites: favs }), { ASSETS: { fetch: async () => new Response() } });
    expect(res!.status).toBe(503);
  });

  it("sends the list, keeps a lead only when asked, and limits each address per day", async () => {
    const { b, keys } = bucket();
    const env: Env = { ASSETS: { fetch: async () => new Response() }, RESEND_API_KEY: "re_x", ORDER_EMAIL_FROM: "Game of Us <hi@x.dk>", SHOP: kv(), ORDERS: b, SITE_URL: "https://gameofus.dk" };
    const sent = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect((await route(post({ email: "a@b.dk", favourites: favs }), env))!.status).toBe(200);
    expect(keys).toHaveLength(0);
    expect(JSON.parse(String(sent.mock.calls[0][1]!.body)).text).toContain("Kart Race");
    expect((await route(post({ email: "A@b.dk", favourites: favs, updates: true }), env))!.status).toBe(200);
    expect(keys.filter(k => k.startsWith("leads/"))).toHaveLength(1);
    for (let i = 2; i < LIST_PER_DAY; i++) await route(post({ email: "a@b.dk", favourites: favs }), env);
    expect((await route(post({ email: "a@b.dk", favourites: favs }), env))!.status).toBe(429);
  });
});
