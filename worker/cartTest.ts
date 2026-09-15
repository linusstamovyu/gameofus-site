// Cart-test responses (cart-test.html). Anonymous, and kept in their own private bucket, the same split the
// logo vote uses: survey answers must never land in the orders bucket. Every field is validated here, because
// anything the browser sends is untrusted; unknown fields are dropped rather than stored.
import type { Env, R2Bucket } from "./env";
import { json } from "./orders";

const VARIANTS = ["B", "C", "R7", "D", "E"] as const;
const MODES = ["add", "trim"] as const;
const MAX_TASKS = 8;
const MAX_COMMENT = 600;

type Variant = (typeof VARIANTS)[number];
type Mode = (typeof MODES)[number];

export interface CartTaskResult {
  variant: Variant;
  mode: Mode;
  position: number;
  seconds: number;
  adds: number;
  removes: number;
  editionChanges: number;
  edition: string;
  friends: number;
  bigGames: number;
  minigames: number;
  extras: number;
  /** Minor units (cents), as the price table works in. */
  total: number;
  ratings: { clear: number; pressure: number; buy: number };
}

export interface CartTestResponse {
  id: string;
  createdAt: string;
  tasks: CartTaskResult[];
  favourite: Variant;
  /** 1 = preferred starting empty … 5 = preferred starting filled in. 0 when unanswered. */
  startPreference: number;
  comment?: string;
  name?: string;
  screen?: string;
}

const fail = (status: number, message: string) => json({ error: status === 503 ? "not_open" : "bad_request", message }, status);
const open = (env: Env): env is Env & { CART_TESTS: R2Bucket } => Boolean(env.CART_TESTS);
const int = (value: unknown, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
const score = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function validTask(value: unknown): value is CartTaskResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const t = value as Record<string, unknown>;
  const r = t.ratings as Record<string, unknown> | undefined;
  return VARIANTS.includes(t.variant as Variant)
    && MODES.includes(t.mode as Mode)
    && int(t.position, MAX_TASKS) && int(t.seconds, 60 * 60)
    && int(t.adds, 999) && int(t.removes, 999) && int(t.editionChanges, 999)
    && typeof t.edition === "string" && t.edition.length <= 20
    && int(t.friends, 99) && int(t.bigGames, 99) && int(t.minigames, 99) && int(t.extras, 99)
    && int(t.total, 100_000_00)
    && Boolean(r) && score(r?.clear) && score(r?.pressure) && score(r?.buy);
}

/** Only the fields above are kept: a response is rebuilt from scratch rather than stored as it arrived. */
export async function handleCartTest(request: Request, env: Env, newId: () => string = () => crypto.randomUUID()): Promise<Response> {
  if (!open(env)) return fail(503, "The test isn't collecting answers yet. The site owner needs to connect the cart-test bucket.");
  let raw: unknown;
  try { raw = await request.json(); } catch { return fail(400, "The answers couldn't be read."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "The answers are invalid.");
  const value = raw as Record<string, unknown>;
  const tasks = value.tasks;
  if (!Array.isArray(tasks) || !tasks.length || tasks.length > MAX_TASKS || !tasks.every(validTask)) {
    return fail(400, "Build at least one cart before sending.");
  }
  if (!VARIANTS.includes(value.favourite as Variant)) return fail(400, "Pick the panel you'd want.");
  const response: CartTestResponse = {
    id: newId(),
    createdAt: new Date().toISOString(),
    tasks: (tasks as CartTaskResult[]).map(t => ({
      variant: t.variant, mode: t.mode, position: t.position, seconds: t.seconds,
      adds: t.adds, removes: t.removes, editionChanges: t.editionChanges,
      edition: t.edition, friends: t.friends, bigGames: t.bigGames, minigames: t.minigames,
      extras: t.extras, total: t.total,
      ratings: { clear: t.ratings.clear, pressure: t.ratings.pressure, buy: t.ratings.buy },
    })),
    favourite: value.favourite as Variant,
    startPreference: score(value.startPreference) ? value.startPreference : 0,
  };
  const comment = text(value.comment, MAX_COMMENT);
  const name = text(value.name, 80);
  const screen = text(value.screen, 20);
  if (comment) response.comment = comment;
  if (name) response.name = name;
  if (screen) response.screen = screen;
  await env.CART_TESTS.put(`cart-tests/${response.id}.json`, JSON.stringify(response), { httpMetadata: { contentType: "application/json" } });
  return json({ ok: true, id: response.id, tasks: response.tasks.length });
}

interface Row { carts: number; clear: number; pressure: number; buy: number; total: number; extras: number; seconds: number; favourite: number }
const emptyRow = (): Row => ({ carts: 0, clear: 0, pressure: 0, buy: 0, total: 0, extras: 0, seconds: 0, favourite: 0 });
const avg = (sum: number, n: number, dp = 2) => (n ? Number((sum / n).toFixed(dp)) : 0);

/** A read-only summary: per variant, and per start mode, which is the comparison the test exists to make. */
export async function handleCartTestSummary(env: Env): Promise<Response> {
  if (!open(env)) return fail(503, "The test isn't collecting answers yet.");
  const byVariant = new Map<string, Row>();
  const byMode = new Map<string, Row>();
  let responses = 0;
  let startPreference = 0;
  let startPreferenceVotes = 0;
  let cursor: string | undefined;
  do {
    const page = await env.CART_TESTS.list({ prefix: "cart-tests/", cursor });
    for (const object of page.objects) {
      const body = await env.CART_TESTS.get(object.key);
      if (!body) continue;
      let response: CartTestResponse;
      try { response = JSON.parse(await body.text()) as CartTestResponse; } catch { continue; }
      if (!Array.isArray(response.tasks)) continue;
      responses++;
      if (score(response.startPreference)) { startPreference += response.startPreference; startPreferenceVotes++; }
      const fav = byVariant.get(response.favourite) ?? emptyRow();
      fav.favourite++;
      byVariant.set(response.favourite, fav);
      for (const t of response.tasks) {
        for (const [map, key] of [[byVariant, t.variant], [byMode, t.mode]] as const) {
          const row = map.get(key) ?? emptyRow();
          row.carts++;
          row.clear += t.ratings.clear;
          row.pressure += t.ratings.pressure;
          row.buy += t.ratings.buy;
          row.total += t.total;
          row.extras += t.extras;
          row.seconds += t.seconds;
          map.set(key, row);
        }
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const shape = (key: string, row: Row) => ({
    key, carts: row.carts, favourite: row.favourite,
    clear: avg(row.clear, row.carts), pressure: avg(row.pressure, row.carts), buy: avg(row.buy, row.carts),
    averageTotal: Math.round(row.total / (row.carts || 1)), averageExtras: avg(row.extras, row.carts),
    averageSeconds: Math.round(row.seconds / (row.carts || 1)),
  });
  return json({
    responses,
    startPreference: avg(startPreference, startPreferenceVotes),
    variants: [...byVariant].map(([key, row]) => shape(key, row)).sort((a, b) => b.buy - a.buy),
    modes: [...byMode].map(([key, row]) => shape(key, row)),
  });
}
