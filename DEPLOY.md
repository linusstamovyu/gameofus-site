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
3. **Domain:** Pages project → Custom domains → add the domain you bought, follow the DNS steps.
4. **Analytics:** Pages project → Metrics → enable Web Analytics (no cookies, no banner needed).

## Before launch (4 Oct)

Fill in `src/content/site.json`:

| Field | What |
|---|---|
| `orderFormUrl` | The Tally form link. Order buttons open it with `?package=side_quest` etc. |
| `contactEmail` | Shown on the privacy and terms pages |
| `siteUrl` | `https://<your domain>` |
| `isDraft` | `false` removes the Draft labels |

Then complete the `[bracketed]` gaps in `privacy.html` and `terms.html`, run `npm test && npm run build`, and push.
