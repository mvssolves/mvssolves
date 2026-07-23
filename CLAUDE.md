# mvssolves-landing — operating notes

Static hand-coded HTML site (no build step). Deploys via Cloudflare Pages,
git-connected: push to `main` = auto-deploy, live in seconds. There is no
staging/manual-approval gate — `main` IS production.

## Hard-won lessons (read before touching script loading / build behavior)

**`defer`/`async` is a no-op on inline `<script>` tags with no `src`.**
Browsers ignore it per spec — an inline script always runs immediately, at
its position in the parse, regardless of the attribute. If it sits right
after deferred external scripts it depends on (e.g. `gsap.registerPlugin(...)`
as its first line), it will throw before those externals have executed,
and everything after that line in the block silently never runs. If a
large inline script has hard dependencies on external libraries, the
inline code must be externalized into its own `.js` file before `defer`
can do anything useful for it — deferring only the libraries and leaving
the dependent code inline does not work.

**Local dev server != production.** This site is served through Cloudflare
Pages/CDN in production (email-obfuscation rewriting, bot-check script
injection, possibly Rocket Loader or other automatic JS optimizations).
A plain local static server (`python3 -m http.server`, `npx serve`) has
none of that in front of it. A script-loading change that looks clean
locally (no console errors) is not proven safe — it has to be checked
against something that actually goes through Cloudflare's edge before it
touches `main`.

**Rule: any change to `<script>` tag attributes, load order, or execution
timing must be pushed to a branch first and verified against that
branch's Cloudflare Pages preview deployment (`<branch>.<project>.pages.dev`)
before merging to `main`.** Content-only changes (copy, CSS, markup that
doesn't touch script loading/order) don't need this — this rule is
specifically for anything that changes *when or how* JS executes.

**If a change like this ever breaks the live site again:** revert
immediately (`git revert`, not `reset --hard` — this is a shared remote),
push the revert before doing anything else, then diagnose. Don't leave
production broken while investigating.

## Token-reducer index (query before reading whole files)

Repo-local semantic index at `.cache/index.db`. Query it FIRST for any
question about existing HTML/JS/copy here, before a full `Read`.

**Always `sync` before the first query of a session** — the index goes
stale silently and then returns nothing for recently-added files, which
looks like "no results" rather than "not indexed". This is what made it
useless for `redesign/` until 2026-07-23.

```bash
source ~/.claude/plugins/marketplaces/Madhan230205-claude-token-reducer/.venv/bin/activate
P=~/.claude/plugins/marketplaces/Madhan230205-claude-token-reducer/scripts/context_pipeline.py
python $P sync  --inputs . --db .cache/index.db          # incremental, fast
python $P query --query "<question>" --db .cache/index.db --json
```

**Config findings — measured 2026-07-23, don't redo these experiments:**

- **Keep `--hybrid-mode fallback` (the default). Do NOT use `always`.**
  Tested on the same query: `fallback` put the correct chunk top at score
  0.285; `always` collapsed every score to ~0.02 and pulled unrelated
  legal-page chunks into the top 5. The 256-dim MiniLM vectors are too
  weak to rank against BM25 here — the vector layer adds noise, not
  recall. `fallback` still uses vectors when FTS returns <3 hits, which
  is the case that actually needs them.
- **Backend is `onnx` (MiniLM) and that's the best working option.**
  `--embedding-backend ml` with the `jina-embeddings-v2-base-code` model
  named in the plugin's own `settings.json` silently FALLS BACK to `hash`
  (it needs `trust_remote_code`, which the pipeline doesn't pass). Hash
  embeddings then disable vector search entirely
  (`hashEmbeddingSkipVector: true`), so that path is strictly worse. The
  failure is silent — check `embedding_backend` in the index output, not
  just the exit code.
- `sentence-transformers`, `torch`, `onnxruntime`, `hnswlib` and
  tree-sitter are all installed; missing deps are not the issue.

Fall back to a full `Read` only when the index genuinely returns nothing
relevant, or when verifying exact bytes before a script-loading push.
