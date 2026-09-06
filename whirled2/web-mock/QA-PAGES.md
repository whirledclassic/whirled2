# QA-PAGES — Whirled2 web-mock page matrix

**Date:** 2026-09-06 (America/New_York)  
**Build:** `?v=20260906al` (`LOGO_V` in `app.js` / `index.html`)  
**Method:** Fresh user via demo API (`http://127.0.0.1:8787/`), Playwright click-through + handler review.  
**Constraints kept:** pale-blue chrome; no MySpace wording; Avatar SWF lab **locked** (sprite Wear path OK; Ruffle on hold); do **not** push.

---

## Critical bugs fixed

| Bug | Fix |
|-----|-----|
| **Rooms lobby click-steal** — `#app` uses `data-tab="rooms-lobby"` for CSS (hide chat bar). `closest("[data-tab]")` matched `#app` on empty / unhandled clicks → `paint("rooms-lobby")` fell through to a hard-coded **Groups stub** and wiped the lobby. | Click handler only accepts `button[data-tab], a[data-tab]` with known ids (`me/stuff/games/rooms/groups/shop`). `paint()` maps `rooms-lobby` → `rooms()`; unknown tabs fall back to `rooms()` instead of the Groups stub. |
| Cosmetics | Aligned `data-stuff-cat` handler indent (logic was already correct). |

Version note: aseprite / Stuff sprite pass already moved cache from `ah` → `ai` → **`aj`**. QA fixes are folded into **`aj`** (no further bump; no push).

---

## Matrix

| Area | Result | Notes |
|------|--------|-------|
| **1. Gate** | **PASS** | Sign Up + Logon forms; Legal / Disclaimer link; Discord CTA present when `WHIRLED_API` + OAuth (`Create account with Discord` / link to `/api/auth/discord`). |
| **2. Me home** | **PASS** | Friendly People strip; My News; wallet coins/bars → Transactions. Daily reward modal (Nice!) on first login — dismiss before other clicks. |
| **3. Me → My Profile** | **PASS** | Edit status (save persists); Edit photo / information / look panels open; wall Post + Delete (owner); Discord linked badge only when account linked (fresh password user = no badge). |
| **4. Me → Mail** | **PASS** | Inbox / compose shell; primary controls respond. |
| **4. Me → Friends** | **PASS** | Friends list / requests shell. |
| **4. Me → Notices** | **PASS** | Notice list + mark controls. |
| **4. Me → Account** | **PASS** | Account + Friendly People toggle. |
| **4. Me → Club** | **PASS** | Tier Coming Soon cards (no payments). |
| **4. Me → Transactions** | **PASS** | Via wallet chrome (`data-me="transactions"`) — not a me-link strip item. Shows login / grants. |
| **4. Me → My Rooms** | **PASS** | List + Create Room… |
| **5. Stuff** | **PASS** | Category rail (`data-stuff-cat`) Avatars→Videos; Upload form; detail when items exist. SWF lab On hold; sprite / Aseprite upload path available. |
| **6. Games** | **PASS** | Browse / Tables (`data-games-home=lobby`) / AVR / My scores nav all wire. |
| **7. Rooms** | **PASS** | Lobby tile → preview → Enter (`data-room-preview-enter`); Create Room panel; lock triad; Share/embed; Room music (`data-open-room-music`); chat send; volume popover + mute. Lobby empty-click no longer nukes page (see critical fix). |
| **8. Groups** | **PASS** | Empty state + Create group form; after create, detail / Enter hall. |
| **8. Shop ♥** | **PASS*** | Grid ♥ (`data-shop-fav`) + `whirled2.favorites` work when listings exist. Default shop is empty (no invented catalog) — hearts appear after List Item / seeded `whirled2.shop`. |
| **Legal** | **PASS** | Gate + shell Legal open. |

\*Empty catalog is intentional policy, not a dead handler.

---

## Remaining / deferred (not fixed this pass)

- View Rooms on profile still jumps to global lobby (SITE-FIXES #7).
- Snapshot lobby thumbs / glow-hold / friends’ rooms strip / mail grouping (SITE-FIXES #8–11).
- Shop ♥ not visible until someone lists an item (by design).
- Daily reward modal blocks clicks until Nice! (expected; lives on `document.body`).
- Avatar SWF / Ruffle still **ON HOLD** (`?avatarLab=1` only for lab).
- Do not push unless asked.

---

## How to re-check locally

```bash
cd server && ./start-local.sh   # http://127.0.0.1:8787/
# Register fresh user → dismiss Daily reward → walk tabs above
```

Offline: empty `WHIRLED_API` → localStorage mode (Discord Coming Soon on gate).
