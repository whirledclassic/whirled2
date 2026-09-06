## What shipped (?v=20260906bb)

- **Flash walk polish:** Hybrid loft MUST use PNG idle/walk (Whirl path) — not tofu, not frozen SWF slide. Root cause: preview/thumb alone counted as Hybrid + empty walk frames wiped billboard → tofu; huge SWF data URLs could break Wear persist.
- **SWF-only:** transparent Ruffle + synthesized bob/flip while chrome moves; never tofu when SWF worn.
- **One-flow:** Analyze auto-checks Experimental + Hybrid → Save → **Wear & enter loft**.
- **Emotes:** Hybrid frames work; else Coming Soon stubs that don’t break walk.
- **Docs:** `HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md` — **Ruffle = YES (optional)**; default smooth move = PNG hybrid. Dev Hub callout + Groups **Dev Updates** thread.
- Cache: **`?v=20260906bb`**. Push: `/tmp/push-bb.js` (dry-run; do not merge over mid-flight **ba** blindly — fold note if needed). QA: `node scripts/qa-flash-check.cjs`.
- Preserves Whirl, pale-blue az chrome, av chat visit-since, transparent Ruffle, PE none on loft SWF.

## What shipped (?v=20260906ba)

- **Groups (wiki-faithful):** list / create / join, group home (logo+banner placeholders), discussion threads + replies, search, sticky/announce flags, Group chat button. Pale-blue classic mobile-friendly chrome.
- **Seeded `Whirled2 Developers`:** owner = first/local admin; members get Developers role; threads **Updates & notes**, **Flash / avatars**, **General**. Auto overnight changelog + NaN QA note + Flash-without-plugin post (links `HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md`).
- **Admin panel:** Me → Admin + header Admin (if `isAdmin`). List local users; Make/Remove admin. Bootstrap: first account / Test / `whirled2.forceAdmin=1` + `whirled2.admins` (Dev Hub).
- **/broadcast:** escalating **coins** (base 50 ×1.5/day count). Classic wiki used Bars (start ~5); Whirled2 earn-only documents the coin model. Highlighted `BROADCAST` bubble; insufficient funds error.
- **QA NaN fix:** `sanitizeDisplayName` always strips `/NaN/gi`; heal session/users/profiles on boot; presence self-name never paints `QA AxNaNNaN`.
- Also: friends search email/realName/interests; decorate filter/snap/scale (earlier in ba pass).
- Preserve: ay Flash hybrid + transparent Ruffle, Whirl, chat visit-since, Dev Hub, pale-blue az room chrome, earn-only, no MySpace, no fake catalog.
- Cache: **`?v=20260906ba`**. Push: `/tmp/push-ba.js` (dry-run default). Do not fight `classic-avatar.js` walk (bb Flash agent).

## What shipped (?v=20260906az)

- Extra visual polish on ay bar kill: flat pale stage-wrap, soft loft viewport, wood floor clipped inside `#stage-slot`.
- Immersive pale `#cfe4f4`; music FAB pale-blue. CSS-only.

## What shipped (?v=20260906ay)

- Flash interact: transparent Ruffle; Hybrid (smooth) default; pale-blue room chrome (no brown/black bars).

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
- **Whirl** is the starter avatar (slug `cyan-hair`).
