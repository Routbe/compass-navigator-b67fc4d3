# Repository import

## Second import (Nov 2 2026, from github.com/Routbe/compass-navigator-52)
- [x] Copy code, pages, assets, database scripts and tests into this project; secrets and the old project's settings left out.
- [x] Merge the library list, keeping this project's framework versions.
- [x] Check the preview: landing page, about/docs, sign-in screen and QR generator render.
- [x] Run the app's own test suite: 1522 of 1524 pass.
- [x] Data stays in the user's own Neon database (chosen 2 Nov); the Neon connection still has to be linked so the app can reach it.
- [ ] Verify accounts and existing records read back correctly once the Neon connection is linked — no export needed, the data stays in Neon.
- [ ] Supply service keys (payments, mail, storage, sign-in providers, cron) through the secure form and verify each flow.
- [x] Duplicate script number 0169 resolved (the workspace-icon script moved to 0172), the offline schema record rebuilt, and agent_audit_logs added to the account-merge rules as append-only. All 1524 checks pass.


- [x] Import ROUT source, styles, assets and dependencies without replacing project identity.
- [x] Verify public screens, QR generation, navigation and imported tests (1497 initial passing tests; 9 route retries and 13 focused checks passed; source migration snapshot test remains failing).
- [ ] Activate and verify existing accounts and connected services — blocked by original database and service credentials.

## Open (Nov 2 request)
- [x] Workspace Studio top cut off (missing page frame)
- [x] Private→workspace conversion: URL becomes /w/<name> (or chosen name / verified domain), design carried over (verified design wins, other saved as draft), old URL redirects 30 days
- [x] Workspace share preview image not loading in Studio
- [x] Verified domain: private account serves on domain directly, not as rout.be/<domain>; workspaces may use domain as name
- [x] Identity tab: Mastodon/social verification for personal (incl. alias) + workspace; workspace Bluesky via verified domain
- [x] Restored maximilien.brussels verified design onto workspace maximilien-6yak (draft)

## Nov 2 (14:48) request
- [x] Verify 1:1 import against the GitHub repository (only intentional differences)
- [x] Neon connection linked
- [x] Studio "Wijzigingen opslaan…" spins forever — fix
- [x] Workspace username: editable chosen part (4-char suffix fixed) + use verified domain as username button

## Nov 2 (14:52) request
- [x] Mastodon form: username + server fields, prefilled, rel="me" snippet, copy buttons for user.rout.be / rout.be/user (choose one or both)
- [x] GitHub website verification guidance (same addresses)
- [x] Workspace Studio Bluesky block (username.w.rout.be / domain.rout.be)
- [ ] DNS: *.w.rout.be wildcard + per-name certificates for domain.rout.be — blocked: needs the user at their rout.be DNS/hosting provider

## Nov 2 (16:15) request
- [x] Sign-in / claim / connect screens follow light & dark theme again (forced dark removed)
- [x] Footer: less white space
- [x] Sitemap index + static/profiles/workspaces/calendars sub-sitemaps, robots.txt (AI bots + disallows), llms.txt + llms-full.txt, Organization/Service JSON-LD
- [ ] Live sitemap: rout.be redirects to www.rout.be, so sitemap URLs point at a redirect — blocked: user must make rout.be the primary domain at their host (Vercel)
- [ ] Review content + design of every about page — not started
- [ ] Minor protection: date of birth, parental consent mail, /parent/control, parent-gated payments, Q&A levels, DB script — not started (needs DB script approval + mail sending)
