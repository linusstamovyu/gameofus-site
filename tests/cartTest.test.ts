import { describe, expect, it } from "vitest";
import { route } from "../worker/router";
import type { Env, R2Bucket } from "../worker/env";
import type { CartTestResponse } from "../worker/cartTest";
import {
  FRIENDS, TEST_BIG_GAMES, TEST_MINIGAMES, allowanceOf, editionOptions, has, picksOf, quoteOf, sections, startCart, toggle, totalOver,
  type Cart,
} from "../src/cartTest/state";

// ---------------------------------------------------------------- the cart

describe("the test's cart", () => {
  it("starts empty in add mode and full in trim mode", () => {
    const add = startCart("add");
    expect(add.edition).toBe("standard");
    expect(add.bigGames).toHaveLength(0);
    expect(add.minigames).toHaveLength(0);
    expect(add.friends).toHaveLength(1);

    const trim = startCart("trim");
    const inc = allowanceOf("deluxe");
    expect(trim.edition).toBe("deluxe");
    expect(trim.friends).toHaveLength(inc.characters);
    expect(trim.bigGames).toHaveLength(inc.bigGames);
    expect(trim.minigames).toHaveLength(inc.minigames);
  });

  it("the trim start costs exactly the edition price: a full loadout, nothing extra", () => {
    const trim = startCart("trim");
    expect(totalOver(trim)).toBe(0);
    expect(quoteOf(trim).total).toBe(quoteOf({ ...trim, friends: trim.friends.slice(0, 1), bigGames: [], minigames: [] }).total);
  });

  it("every start picks real catalogue items", () => {
    const trim = startCart("trim");
    expect(trim.friends.every(id => FRIENDS.some(f => f.id === id))).toBe(true);
    expect(trim.bigGames.every(id => TEST_BIG_GAMES.some(g => g.id === id))).toBe(true);
    expect(trim.minigames.every(id => TEST_MINIGAMES.some(g => g.id === id))).toBe(true);
  });

  it("no drinking game is on the shelf, so Party Mode never has to be explained", () => {
    expect(TEST_MINIGAMES.some(m => m.drinking)).toBe(false);
  });

  it("adds and removes, and never empties the cast", () => {
    let c = startCart("add");
    c = toggle(c, "bigGames", "kart").cart;
    expect(has(c, "bigGames", "kart")).toBe(true);
    const off = toggle(c, "bigGames", "kart");
    expect(off.action).toBe("remove");
    expect(has(off.cart, "bigGames", "kart")).toBe(false);
    const last = toggle(startCart("add"), "friends", FRIENDS[0].id);
    expect(last.action).toBe("none");
    expect(last.cart.friends).toHaveLength(1);
  });

  it("charges for picks past the allowance, at the real add-on prices", () => {
    let c: Cart = { edition: "standard", friends: [FRIENDS[0].id], bigGames: [], minigames: [] };
    const base = quoteOf(c).total;
    c = toggle(c, "bigGames", "kart").cart; // 1 of 1 included
    expect(quoteOf(c).total).toBe(base);
    c = toggle(c, "bigGames", "brawler").cart; // over
    const s = sections(c).find(x => x.id === "bigGames")!;
    expect(s.over).toBe(1);
    expect(quoteOf(c).total).toBe(base + s.extraEach);
  });

  it("offers the edition that covers the order for less, and prices every edition for this order", () => {
    const c: Cart = { edition: "standard", friends: FRIENDS.slice(0, 3).map(f => f.id), bigGames: ["kart", "brawler"], minigames: ["blackjack", "landmine", "reaction-light", "safecracker"] };
    const rows = editionOptions(c);
    expect(rows).toHaveLength(3);
    const best = rows.find(r => r.best);
    expect(best?.edition).toBe("deluxe");
    expect(best!.difference).toBeLessThan(0);
    // The difference is what the ladder prints, so it has to be the real gap between the two totals.
    const standard = rows.find(r => r.edition === "standard")!;
    expect(best!.total - standard.total).toBe(best!.difference);
  });

  it("picks stay in the order they were chosen, so the slots past the allowance are the newest ones", () => {
    let c = startCart("add");
    for (const id of ["kart", "brawler", "build"]) c = toggle(c, "bigGames", id).cart;
    expect(sections(c).find(s => s.id === "bigGames")!.picked.map(p => p.id)).toEqual(["kart", "brawler", "build"]);
  });

  it("always prices at least one character, even though only one is in the cart", () => {
    expect(picksOf(startCart("add")).friends).toBe(1);
  });
});

// -------------------------------------------------------------- the worker

function bucket() {
  const store = new Map<string, string>();
  const r2: R2Bucket = {
    async get(key) {
      const value = store.get(key);
      return value === undefined ? null : { key, size: value.length, text: async () => value, arrayBuffer: async () => new ArrayBuffer(0) };
    },
    async put(key, value) { store.set(key, String(value)); },
    async delete() {},
    async list({ prefix }) { return { objects: [...store.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key, size: 0 })), truncated: false }; },
  };
  return { store, r2 };
}

const task = (over: Partial<Record<string, unknown>> = {}) => ({
  variant: "D", mode: "add", position: 1, seconds: 42, adds: 6, removes: 1, editionChanges: 0,
  edition: "standard", friends: 3, bigGames: 2, minigames: 4, extras: 3, total: 22096,
  ratings: { clear: 5, pressure: 2, buy: 4 }, ...over,
});

async function post(body: unknown, env: Env): Promise<Response> {
  const res = await route(new Request("https://x/api/cart-test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env);
  if (!res) throw new Error("no route for /api/cart-test");
  return res;
}

async function summary(env: Env): Promise<Response> {
  const res = await route(new Request("https://x/api/cart-test/summary"), env);
  if (!res) throw new Error("no route for the summary");
  return res;
}

describe("cart-test API", () => {
  const env = (r2?: R2Bucket) => ({ ASSETS: { fetch: async () => new Response("") }, CART_TESTS: r2 }) as unknown as Env;

  it("says so when the bucket isn't connected, instead of losing answers", async () => {
    const res = await post({ tasks: [task()], favourite: "D" }, env());
    expect(res.status).toBe(503);
    expect((await res.json() as { error: string }).error).toBe("not_open");
  });

  it("stores a response and reports what it saved", async () => {
    const { store, r2 } = bucket();
    const res = await post({ tasks: [task(), task({ variant: "E", mode: "trim", position: 2 })], favourite: "E", startPreference: 4, comment: " liked the second ", name: " Mads ", screen: "1440x900" }, env(r2));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, tasks: 2 });
    const [key] = [...store.keys()];
    expect(key).toMatch(/^cart-tests\/.+\.json$/);
    const saved = JSON.parse(store.get(key)!) as CartTestResponse;
    expect(saved.favourite).toBe("E");
    expect(saved.tasks.map(t => t.mode)).toEqual(["add", "trim"]);
    expect(saved.comment).toBe("liked the second");
    expect(saved.name).toBe("Mads");
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("keeps only the fields it knows: anything else sent is dropped", async () => {
    const { store, r2 } = bucket();
    await post({ tasks: [task({ email: "me@example.com" })], favourite: "D", secret: "nope" }, env(r2));
    const saved = store.get([...store.keys()][0])!;
    expect(saved).not.toContain("example.com");
    expect(saved).not.toContain("secret");
  });

  it("refuses answers that aren't answers", async () => {
    const { r2 } = bucket();
    const bad: [string, unknown][] = [
      ["no tasks", { tasks: [], favourite: "D" }],
      ["unknown variant", { tasks: [task({ variant: "Z" })], favourite: "D" }],
      ["unknown mode", { tasks: [task({ mode: "sideways" })], favourite: "D" }],
      ["rating out of range", { tasks: [task({ ratings: { clear: 9, pressure: 2, buy: 4 } })], favourite: "D" }],
      ["missing favourite", { tasks: [task()] }],
      ["silly total", { tasks: [task({ total: 999_999_999 })], favourite: "D" }],
      ["too many tasks", { tasks: Array.from({ length: 9 }, () => task()), favourite: "D" }],
    ];
    for (const [why, body] of bad) {
      const res = await post(body, env(r2));
      expect(res.status, why).toBe(400);
    }
  });

  it("summarises by variant and by start mode, which is the comparison the test is for", async () => {
    const { r2 } = bucket();
    await post({ tasks: [task({ total: 20000 }), task({ variant: "E", mode: "trim", position: 2, total: 30000, ratings: { clear: 4, pressure: 3, buy: 5 } })], favourite: "E" }, env(r2));
    await post({ tasks: [task({ total: 10000, ratings: { clear: 3, pressure: 1, buy: 2 } })], favourite: "D" }, env(r2));
    const res = await summary(env(r2));
    const body = await res.json() as { responses: number; variants: { key: string; carts: number; favourite: number; buy: number }[]; modes: { key: string; averageTotal: number }[] };
    expect(body.responses).toBe(2);
    const d = body.variants.find(v => v.key === "D")!;
    expect(d.carts).toBe(2);
    expect(d.favourite).toBe(1);
    expect(d.buy).toBe(3); // (4 + 2) / 2
    expect(body.modes.find(m => m.key === "trim")!.averageTotal).toBe(30000);
    expect(body.modes.find(m => m.key === "add")!.averageTotal).toBe(15000);
  });
});
