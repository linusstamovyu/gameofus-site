// The Cloudflare Worker in front of the static site (plan 17). /api/* is answered here; everything else is the
// built site from dist/ via the ASSETS binding. wrangler.jsonc sends only /api/* to this code first.
import type { Env, ExecutionContext } from "./env";
import { fail404, route } from "./router";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      return (await route(request, env, ctx)) ?? fail404();
    } catch (err) {
      console.error("API error", err);
      return new Response(JSON.stringify({ error: "server", message: "Something went wrong on our side. Your order is saved on your device; please try again." }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  },
};
