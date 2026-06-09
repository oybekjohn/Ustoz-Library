# Handoff — Ustoz-Library Cloudflare deploy

_Last updated: 2026-06-09_

## Goal

Deploy **Ustoz-Library** (DL-library.uz — Renessans Ta'lim Universiteti raqamli kutubxonasi)
to Cloudflare so that **every `git push` to `master` automatically updates the live site**.

The app was converted from a static site into a full-stack app:

| Layer | Tech |
|-------|------|
| Frontend (site + admin) | Cloudflare **Pages** (`public/`) |
| Backend API | Cloudflare **Pages Functions** (`functions/`) |
| Books metadata DB | Cloudflare **D1** (`ustoz-library-db`) |
| Files (PDF, covers) | Cloudflare **R2** (`ustoz-library-files`) |
| Admin auth | Signed cookie (simple password) |

## Current state — ✅ DONE, site is live

- **Live site:** https://ustoz-library.pages.dev
- **Admin:** https://ustoz-library.pages.dev/admin — login `admin` / `Y45WIDMe5dw!`
- **GitHub:** `oybekjohn/Ustoz-Library`, branch `master`
- **Cloudflare account:** oybeksjob@gmail.com · Account ID `3469edd214dea54ce70128894cf0533a`
- **D1:** `ustoz-library-db`, id `1797ec13-f6e6-4501-9504-8d71036667ce`
- **R2:** `ustoz-library-files` (R2 was previously blocked on payment — now enabled)

Verified working (all HTTP 200):
- Home page loads
- `/api/books` returns all 7 books (D1 binding works)
- R2 cover (PNG) and PDF serve correctly
- Admin login returns `{"ok":true}` (secrets work)
- GitHub Actions run completed with `conclusion: success`

### Deployment model (important)
Project is a **Direct Upload Pages project created via CLI**, with auto-deploy driven by
**GitHub Actions** (not Cloudflare's native Git integration — see "What failed" below).

CLI commands used to set it up:
```bash
wrangler pages project create ustoz-library --production-branch master
wrangler pages deploy public --project-name ustoz-library
# Secrets (D1/R2 bindings come automatically from wrangler.toml):
echo "admin"            | wrangler pages secret put ADMIN_USERNAME  --project-name ustoz-library
echo 'Y45WIDMe5dw!'     | wrangler pages secret put ADMIN_PASSWORD  --project-name ustoz-library
echo '<session-secret>' | wrangler pages secret put SESSION_SECRET  --project-name ustoz-library
```

### Production secrets (set in Cloudflare Pages)
- `ADMIN_USERNAME` = `admin`
- `ADMIN_PASSWORD` = `Y45WIDMe5dw!`
- `SESSION_SECRET` = `b1fe959ead7e216fe94c22c2eab206fbc9a10cb71d6abb69db4c227561dee1d3`

### GitHub repo secrets (for Actions)
- `CLOUDFLARE_API_TOKEN` — Cloudflare token with **Cloudflare Pages: Edit** permission
- `CLOUDFLARE_ACCOUNT_ID` = `3469edd214dea54ce70128894cf0533a`

## Files actively edited this session

- `wrangler.toml` — project `name` set to `ustoz-library`; contains D1 + R2 bindings
  (bindings are picked up automatically on `wrangler pages deploy`).
- `.github/workflows/deploy.yml` — **created**. GitHub Actions workflow using
  `cloudflare/wrangler-action@v3` to run `pages deploy public --project-name=ustoz-library`
  on every push to `master`.

(No application source — `functions/`, `public/` — was modified; only deploy config.)

## What we tried that failed

1. **Cloudflare dashboard "Connect to Git" → created a Worker, not Pages.**
   The new unified Workers & Pages "Create" flow defaulted to a **Worker**
   (URL `ustoz-library.oybeksjob.workers.dev`). A Worker can't serve the `functions/`
   Pages-Functions API or `public/` assets → home page and `/api/books` both returned **404**.
   This was the core blocker. **Fix:** deleted the Worker, created a real Pages project via CLI.

2. **`name` mismatch between `wrangler.toml` and the Cloudflare project.**
   wrangler.toml said `ustoz-library` while the dashboard project was `dllibrary` (and vice-versa),
   causing `wrangler pages deploy` to fail with **"Project not found" (code 8000007)**.
   Flip-flopped the name a couple of times before settling on `ustoz-library` everywhere.

3. **Dashboard build config confusion.**
   The Worker-flow build screen asked for `npx wrangler deploy` / `npx wrangler versions upload`
   build commands — wrong for a Pages app. Wasted time before realizing it was the Worker flow.

4. **Direct Upload project can't be retro-fitted to native Git deploys.**
   Once the Pages project existed as Direct Upload (CLI), Cloudflare won't let you attach
   native Git integration. That's *why* we went with GitHub Actions for auto-deploy instead.

5. **`gh` CLI not installed** on this machine — used the GitHub REST API
   (`api.github.com/repos/.../actions/runs`) to poll Actions run status instead.

6. **Local DNS can't resolve `*.pages.dev`** from this machine (returns status 000 /
   "Non-existent domain"), though general internet works. Testing the live site from the
   terminal still works via `curl https://ustoz-library.pages.dev` once deployed — the earlier
   000s were before the Pages project existed.

## Next steps (optional — core goal is complete)

1. **Custom domain:** attach **DL-library.uz** to the Pages project
   (Cloudflare Pages → ustoz-library → Custom domains → Set up a domain).
   Requires the domain's DNS to be on / pointed to Cloudflare.
2. **Tighten the API token** if not already minimal (Pages: Edit on this account only).
3. **Smoke-test the admin write path end-to-end** in the browser: log in, add a new book with
   a PDF + cover upload, confirm it lands in D1/R2 and the QR code generates.
4. Consider pinning `cloudflare/wrangler-action` to a specific version (currently `@v3`) for
   reproducible CI.

## Useful references
- Full setup guide: `DEPLOY.md` in repo root.
- Migration script: `scripts/migrate.mjs` (`npm run migrate:remote` re-pushes the 7 seed books).
- Deploy state memory: `~/.claude/.../memory/cloudflare-deploy-state.md`.
