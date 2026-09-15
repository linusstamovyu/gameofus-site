import type { Env, R2Bucket } from "./env";
import { json } from "./orders";

const OPTION = /^(?:(universe|collision)-(caps|title)\/(0[1-9]|10)|standalone\/(game-of-us-wordmark|universe-orbit|creative-collision))$/;
const MAX_COMMENT = 600;

export interface LogoRatingsVote {
  id: string;
  createdAt: string;
  ratings: Record<string, number>;
  name?: string;
  comment?: string;
}

const fail = (status: number, message: string) => json({ error: status === 503 ? "not_open" : "bad_request", message }, status);
const validOption = (value: unknown): value is string => typeof value === "string" && OPTION.test(value);
const score = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;

function voteOpen(env: Env): env is Env & { VOTES: R2Bucket } { return Boolean(env.VOTES); }

function validRatings(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.length <= 43 && entries.every(([option, rating]) => validOption(option) && score(rating));
}

export async function handleVote(request: Request, env: Env, newId: () => string = () => crypto.randomUUID()): Promise<Response> {
  if (!voteOpen(env)) return fail(503, "Voting isn't open yet. The site owner needs to connect the votes bucket.");
  let raw: unknown;
  try { raw = await request.json(); } catch { return fail(400, "The ratings couldn't be read."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(400, "The ratings are invalid.");
  const value = raw as Record<string, unknown>;
  if (!validRatings(value.ratings)) return fail(400, "Rate at least one logo from 1 to 5.");
  const name = typeof value.name === "string" ? value.name.trim().slice(0, 80) : "";
  const comment = typeof value.comment === "string" ? value.comment.trim().slice(0, MAX_COMMENT) : "";
  const vote: LogoRatingsVote = { id: newId(), createdAt: new Date().toISOString(), ratings: value.ratings };
  if (name) vote.name = name;
  if (comment) vote.comment = comment;
  await env.VOTES.put(`votes/${vote.id}.json`, JSON.stringify(vote), { httpMetadata: { contentType: "application/json" } });
  return json({ ok: true, id: vote.id, rated: Object.keys(vote.ratings).length });
}

export async function handleVoteSummary(env: Env): Promise<Response> {
  if (!voteOpen(env)) return fail(503, "Voting isn't open yet.");
  const rows = new Map<string, { total: number; ratings: number }>();
  let cursor: string | undefined;
  let respondents = 0;
  do {
    const page = await env.VOTES.list({ prefix: "votes/", cursor });
    for (const object of page.objects) {
      const body = await env.VOTES.get(object.key);
      if (!body) continue;
      let vote: LogoRatingsVote;
      try { vote = JSON.parse(await body.text()) as LogoRatingsVote; } catch { continue; }
      if (!validRatings(vote.ratings)) continue;
      respondents++;
      for (const [option, rating] of Object.entries(vote.ratings)) {
        const row = rows.get(option) ?? { total: 0, ratings: 0 };
        row.total += rating;
        row.ratings++;
        rows.set(option, row);
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  const options = [...rows.entries()].map(([option, row]) => ({ option, ratings: row.ratings, totalScore: row.total, average: Math.round((row.total / row.ratings) * 10) / 10 })).sort((a, b) => b.average - a.average || b.ratings - a.ratings || b.totalScore - a.totalScore || a.option.localeCompare(b.option));
  return json({ respondents, ratedLogos: options.length, options, scoring: { scale: "1–5", note: "Average score, then number of ratings" } });
}
