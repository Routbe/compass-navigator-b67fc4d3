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
- [x] Live sitemap: rout.be is now primary; sitemap index + all sub-sitemaps answer 200 directly, robots points to rout.be
- [x] Review every about page (phone, light + dark): no errors, no sideways scrolling; overview title fixed
- [x] Minor protection DB script 0174 applied to live Neon; robots/llms/sitemap cache headers verified
- [ ] Parent e-mail actually sent — blocked: mail service keys not supplied

## Nov 2 (17:21) request
- [x] Mail engine on Postmark (transactional stream, no tracking, no List-Unsubscribe, X-Entity-Ref-ID, system sender), dark-mode mail frame, env example, DNS record list

## Nov 2 (17:24) request
- [x] Command Center: in-card QR widget (generate/copy/PNG), today agenda widget + "+ Boeking", System Pulse bar for empty modules
- [x] Status line text "ROUT OS v2.5 · Alle systemen operationeel" on signed-in pages
- [x] Agenda & Boekingen in Cmd+K and side menu
- [x] Re-verify 0173/0174 live, sitemap/llms cache headers, identity vs settings split
- [ ] Postmark live send — blocked: POSTMARK_SERVER_TOKEN + rout.be domain verification in Postmark
