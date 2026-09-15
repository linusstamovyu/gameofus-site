# Deploying

## One-time setup (needs your accounts)

1. **GitHub:** create a private repo, then from this folder:
   ```bash
   git remote add origin git@github.com:<you>/gameofus-site.git
   git push -u origin main
   ```
2. **Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git → pick the repo.
   | Setting | Value |
   |---|---|
   | Framework preset | None |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `NODE_VERSION` = `22` |
   Every push to `main` deploys; every other branch gets its own preview URL.
   If Cloudflare created it as a **Worker** instead (deploy command `npx wrangler deploy`), `wrangler.jsonc`
   handles it: it uploads `dist/` as static assets. Without that file wrangler tries to auto-configure Vite
   and fails on Vite 5.
3. **Domain:** Pages project → Custom domains → add the domain you bought, follow the DNS steps.
4. **Analytics:** Pages project → Metrics → enable Web Analytics (no cookies, no banner needed).

## The cart test (cart-test.html)

A five-minute design test: testers build a custom game five times, each with a different cart panel, half
starting empty and half starting filled in. Answers are anonymous and land in their own private bucket, never
in the orders one.

1. **Cloudflare → R2 → create bucket** `gameofus-cart-tests` (private).
2. Its binding is already in `wrangler.jsonc` (`CART_TESTS`). Push, and the page starts collecting.
   Until the bucket exists the page still works and `/api/cart-test` answers "not open yet", so nothing breaks.
3. Send people **`https://<your domain>/cart-test.html`**. It is `noindex`, so it won't turn up in search.
4. Read the results: **`https://<your domain>/api/cart-test/summary`** — per cart and per start mode, the
   average ratings, what people built, how long they took, and which cart won the vote.
5. To read the raw answers, download the objects from the bucket (each response is one JSON file).

## Before launch (4 Oct)

Fill in `src/content/site.json`:

| Field | What |
|---|---|
| `orderFormUrl` | The Tally form link. Order buttons open it with `?package=side_quest` etc. |
| `contactEmail` | Shown on the privacy and terms pages |
| `siteUrl` | `https://<your domain>` |
| `isDraft` | `false` removes the Draft labels |

Then complete the `[bracketed]` gaps in `privacy.html` and `terms.html`, run `npm test && npm run build`, and push.
