// Maps /api paths to handlers. Kept apart from index.ts so tests can drive it without the ASSETS binding.
import type { Env, ExecutionContext } from "./env";
import { handleCreate, handleFile, handlePhoto, handleStatus, handleStripeWebhook, handleSubmit, json } from "./orders";

const ID = "([0-9a-f-]{36})";
const FRIEND = "([a-zA-Z0-9-]{1,40})";

export const fail404 = () => json({ error: "not_found", message: "Not found." }, 404);

export async function route(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const m = request.method;
  let match: RegExpMatchArray | null;

  if (pathname === "/api/geo" && m === "GET") {
    const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? null;
    return json({ country });
  }
  if (pathname === "/api/status" && m === "GET") return handleStatus(env);
  if (pathname === "/api/orders" && m === "POST") return handleCreate(request, env);
  if ((match = pathname.match(new RegExp(`^/api/orders/${ID}/photos/${FRIEND}/(face|body|outfit)$`))) && m === "PUT") {
    return handlePhoto(request, env, match[1], match[2], match[3]);
  }
  if ((match = pathname.match(new RegExp(`^/api/orders/${ID}/files/([a-zA-Z0-9-]{1,40})$`))) && m === "PUT") return handleFile(request, env, match[1], match[2]);
  if ((match = pathname.match(new RegExp(`^/api/orders/${ID}/submit$`))) && m === "POST") return handleSubmit(request, env, match[1], ctx);
  if (pathname === "/api/stripe" && m === "POST") return handleStripeWebhook(request, env, ctx);
  return null;
}
