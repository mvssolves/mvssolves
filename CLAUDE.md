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
