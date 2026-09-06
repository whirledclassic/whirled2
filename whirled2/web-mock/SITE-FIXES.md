# SITE-FIXES — whirled.club / wiki vs Whirled2 web-mock

**Date:** 2026-09-06 (ET)  
**Sources:** [wiki.whirled.club](https://wiki.whirled.club) (Starting out, Me tab, Profile, Shop, Stuff, Room, Chat, Mail, Friends, Groups, Currency); live [whirled.club](https://whirled.club) (JS client — little static HTML); mock at `/workspace/whirled2-web-mock/` (`STATUS.md`, `ROOMS-FIDELITY.md`, `app.js`).  
**Scope:** Small / medium **chrome + UI** gaps fixable soon. **No** avatar SWF / Ruffle work here.  
**Constraints (keep):** never invent fake catalog; no “MySpace” wording; Coins & Bars **earn-only** (Buy disabled); classic **pale blue** paper chrome.

Whirled2 is a same-spirit revival chrome mock — not affiliated with Three Rings / whirled.club.

---

## Avatar SWF import — ON HOLD / side project

**Avatar SWF upload, Ruffle host shim, and wardrobe-by-hash are ON HOLD** as a separate side project (`AVATAR-IMPORT.md`). Do not block chrome fidelity on Flash playback. Stuff → Avatars stays thumbnail / stub upload only until that track resumes.

---

## What already shipped recently

| Wave | User-visible |
|------|----------------|
| **?v=20260906ad** | **SITE-FIXES top 5** — Friendly People strip; wall Delete; Shop grid ♥; Volume + mute-safe music; Share/embed room; owner lock triad. Avatar lab still locked. |
| **?v=20260906ac** | **Chat** polish — Overlay bubbles (cyan names, contrast, fade), readable Slide panel, clearer tabs/unread, Send + 16px mobile input, stage bubbles. Mobile Overlay-only (no black hood). |
| **?v=20260906ac** | **Games** expand — Browse / Tables / AVR Coming Soon / My scores; Parlor vs AVR explainers; labeled Coming Soon cards (**not** fake catalog); detail Play / Watch / Tables; local `whirled2.gameScores` stub. |
| **?v=20260906ab** | **Club** Coming Soon — Me → Club Free / Supporter / Creator / Studio tier cards (no payments). |
| **?v=20260906aa** | **Room preview** before enter; shared loft **music** / soundtrack; Facebook Connect removed. Soft enter curtain + lobby lock glyphs + occupant name chips also present. |

Also already solid vs wiki (keep): Me / Stuff / Shop / Friends / Mail / Groups shells; header ✉ mail badge + balances → Transactions; Shop sort + detail ♥ / rate / comments; Friends requests Accept/Decline; room lock triad; decorate chips + View items; chat tabs Room/PM/Group + `/me` `/think` `/away`.

---

## Prioritized gap list (top 8–12)

Ranked by **user-visible impact** × **effort (small/medium chrome only)**. Skip multi-room graph, doors engine, directory presence API, parlor engine, and avatar SWF.

| # | Fix | Why (classic cue) | Mock today | Size |
|---|-----|-------------------|------------|------|
| **1** | ✅ **Me → Friendly People strip** | Wiki Me tab: Friendly People under Friends Online (auto-accept helpers). | **Shipped ad** — Me home strip + Account toggle + auto-accept. | S |
| **2** | ✅ **Profile Comment Wall — Delete (owner)** | Wiki Profile: delete (or report) wall comments. | **Shipped ad** — owner/author Delete on wall rows. | S |
| **3** | ✅ **Shop grid ♥ Favorite** | Wiki Shop: heart on listing / item page; favorites feed profile “Recent Favorites”. | **Shipped ad** — ♥ on grid cards + detail (same favorites key). | S |
| **4** | ✅ **Toolbar Volume slider** | Wiki Room: Volume opens a **slider**; mute alone is not classic. | **Shipped ad** — mute + slider popover; prefs persisted. | S–M |
| **5** | ✅ **Mute-safe music load** | Wiki Music / Room: muted → **do not load** the track (avoids bad MP3 breaking the room). | **Shipped ad** — muted skips local src + embed iframe mount. | S–M |
| **6** | ✅ **Share / embed room popup** | Wiki Room control bar: Share or embed → options popup (not only clipboard). | **Shipped ad** — Share/embed modal (URL + iframe snippet). | S–M |
| **7** | **Profile “View Rooms” → that player’s rooms** | Wiki: unlocked public rooms for **that** player. | `data-rooms-lobby` jumps to **global** Rooms lobby. | S |
| **8** | **Lobby thumbs via Take snapshot** | Classic lobby thumbs = room snapshot; Room menu Take snapshot. | Gradient `.thumb`; snapshot menu is **stub**. Rasterize decorate-layer (+ stage placeholder) → save dataURL on room / local key → lobby + preview. | M |
| **9** | **Clickable-furniture glow hold** | Wiki Room: hold control → green door / orange link / white game glows. | Occupant presence legend exists; **no** Room-menu hold-to-glow on decorate chips. CSS outline on chips is enough pre-engine. | S–M |
| **10** | **Friends’ rooms strip (Rooms lobby)** | Classic discovery: friends’ activity / Join them, not only Featured/Active. | Lobby Featured/Active/My Rooms; no “Friends here” strip from real `loadFriends()` + occupants. **Never invent people.** | M |
| **11** | **Mail conversation grouping** | Wiki Mail: related Reply / Follow-up mails stay together; unread blue highlight. | Flat inbox; Reply / Follow up / Select All / Delete Selected already work. | M |
| **12** | **Occupant / chat name-color polish** | Wiki Room: blue normal, yellow `/away`, gray+Zzz idle, Club star, white pets. | Away tint + legend partial; idle Zzz + Club star (Coming Soon label only) still thin. | S |

### Explicitly deferred (not in this list)

- Avatar SWF / Ruffle / wardrobe hash (**ON HOLD**).
- Multi-room IDs, doors graph, real Hot New publish API.
- Fake parlor/AVR catalog titles; Buy Bars / live Club checkout.
- Engine click-to-walk, zoom camera, true stage snapshot.

---

## Constraints checklist (every fix)

- [ ] Pale blue classic chrome (`--paper` / Classic Blue) — no gold/purple base UI.
- [ ] Coins & Bars earn-only labels; Buy stays disabled.
- [ ] No invented shop/game/room catalog rows.
- [ ] No “MySpace” (or similar) wording in copy.
- [ ] Beginner comments (`// How this works` / `// Beginner:`) on new keys / flows.
- [ ] Do **not** heavy-edit `app.js` for unrelated refactors; prefer targeted chrome patches + CSS.

---

## Suggested next 5 (recommended build order)

1. ✅ Me home **Friendly People** strip (wire existing helpers).  
2. ✅ Profile wall **Delete** for owner.  
3. ✅ Shop grid **♥ Favorite** (+ optional Recent Favorites on profile).  
4. ✅ Toolbar **Volume slider** + **mute-safe** media load.  
5. ✅ **Share/embed** room popup (copy link + embed snippet shell).

**Also in ?v=20260906ad:** Room lock Unlocked / Friends / Locked owner-only UI polish.

Then: View Rooms → owner filter; snapshot thumbs; glow hold; friends’ rooms strip.  
PLAN only (not shipped): mobile landscape fullscreen + corner chat.

---

*Shipped in `?v=20260906ad` (see `STATUS.md` / `LOGO_V`). Avatar lab remains locked. Do not push unless asked.*

---

## Rooms create fidelity

**Sources (2026-09-06 ET):** [Room](https://wiki.whirled.club/wiki/Room), [Room editing FAQ](https://wiki.whirled.club/wiki/Room_editing_FAQ), [Door](https://wiki.whirled.club/wiki/Door), [Create Whirleds](https://wiki.whirled.club/wiki/Create_Whirleds), [Party](https://wiki.whirled.club/wiki/Party), [Create backdrops](https://wiki.whirled.club/wiki/Create_backdrops); mock `roomsLobby` / Room menu / lock triad in `app.js` (`?v=20260906ad`).  
**Scope:** Create-room UX + type/privacy click-choices. Multi-room engine / doors graph still deferred for full play — checklist below is chrome-implementable in steps.

### Classic offered (what players clicked)

| Concept | Classic behavior | Is it a “room type” at create? |
|---------|------------------|--------------------------------|
| **Create path A** | Me → **My Rooms** → pay **1 bar** *or* **10,000 coins** (click once) → new room named **Home** | Create flow, not a type |
| **Create path B** | Decorate → select furniture → **Make Door** → “Show all my rooms **(or buy a new one)**” → pay → visit new room → **Set this location as target** | Create-via-door |
| **Privacy triad** | Decorate Room lock buttons L→R: **Unlocked** (anyone), **Friends** (friends only), **Locked** (owner only; Agents could bypass) | Set **after** own; not a create-wizard radio |
| **Group / Whirled** | Group managers **Purchase Whirled** (bars) → **Mark** owned rooms into themed Whirled; home template for new players entering that Whirled | Group/theme branding — **not** a privacy mode on the create dialog |
| **Party** | Separate control-bar feature: create/join party; leader privacy **Open / Group / Closed**; follow-leader across rooms | **Not** a room type |
| **Backdrop geometry** | On backdrop upload: **Walls / No walls / Flatland / Bird’s eye** (+ depth/horizon/actor sizes) | Scene geometry — not lobby “create room” clicks |
| **Doors / glows** | Any furniture → Make Door / Drop Door; hover or hold **Clickable furniture**: **green** door, **orange** link, **white** game | In-room after create |
| **Snapshot thumbs** | Room menu → **Take snapshot** → preview popup; lobby thumbs = room snapshots | After room exists |

**Naming note for UI copy:** classic “public” ≈ **Unlocked**. Prefer Unlocked / Friends / Locked (wiki language). Do **not** invent a fourth create radio for Party or Theme — Party stays toolbar; Theme = group Whirled mark (Coming Soon shell already).

### Mock create-room UI today

| Piece | Mock (`whirled2-web-mock`) |
|-------|----------------------------|
| My Rooms | Lobby section + Me links → **same single Studio Loft** tile only |
| Create / buy room | **Missing** — no pay buttons, no second room id, no “Home” spawn |
| Privacy | **Present** — Room menu lock triad `unlocked` / `friends` / `locked` + `canEnterLoft` (`whirled2.roomLock.loft`) |
| Group / theme at create | **Missing** as create choice; Groups have Edit Whirled theme **Coming Soon** + optional local header hex |
| Party | Local party board create/join — **not** a create-room type; no follow-leader |
| Doors | **Missing** — decorate chips only; no Make Door / Drop Door / link target |
| Clickable glows | **Missing** — occupant legend exists; no hold-to-glow on chips (SITE-FIXES #9) |
| Snapshot thumbs | **Stub** — Room menu “Take snapshot (stub)”; lobby `.thumb` = gradient (SITE-FIXES #8) |
| Multi-room model | Still single loft keys (`*.loft`) — see `ROOMS-FIDELITY.md` |

### Implementable checklist (chrome-first)

Wire in beginner comments (`// How this works` / `// Beginner:`). Prefer local keys first; demo server later. **Do not invent** public Hot New rows.

**Create shell (P0 chrome)**

- [ ] **My Rooms → Create room** panel (lobby + Me → Rooms): name field (default `Home` / `{display}'s Room`), optional blurb.
- [ ] **Privacy click-choice** on create (same triad as Room menu): Unlocked / Friends / Locked — default Unlocked; write `mode` + `ownerId` on the new room record.
- [ ] Honest **cost copy**: classic was 1 bar / 10k coins — mock may use **earn-only** labels (“Coming Soon · classic cost was…”) or a local coin sink if wallet already has coins; **never** enable Buy Bars.
- [ ] On confirm: append to `whirled2.rooms` (or migrate from loft-only) → refresh My Rooms tiles → open preview (existing preview sheet) for the new id.
- [ ] Keep **no Party / no Theme radios** on this dialog — link text: “Parties = toolbar · Themed Whirled = Groups (Coming Soon)”.

**Not on create dialog (document in UI help)**

- [ ] **Group hall / Mark Whirled** — stay on Groups / comment-or-rate Mark flow when multi-room exists.
- [ ] **Backdrop Walls / Flatland / …** — decorate / Stuff backdrop settings later.
- [ ] **Party Open/Group/Closed** — party board only.

**Still missing adjacent fidelity (call out — do not pretend done)**

- [ ] **Doors**: Make Door / Drop Door / “buy new” path / Set target (CSS chip actions OK pre-engine).
- [ ] **Glows**: hold Room → Clickable furniture → green / orange / white outlines on decorate chips.
- [ ] **Snapshot thumbs**: Take snapshot rasterize → dataURL on room → lobby + preview thumb (replace gradient).

**Data sketch (for implementer)**

```text
whirled2.rooms[roomId] = {
  id, name, ownerId, lock: { mode, ownerId },
  createdAt, thumbDataUrl?, markedWhirledId?: null
}
// Migrate: treat current loft as default home id "loft" until renamed.
```

---

## Mobile landscape immersion (planned)

**Priority:** **High — after current chrome wave** (Friendly People, wall Delete, Shop ♥, Volume + mute-safe, Share/embed). Do not block those fixes.

**Intent (player-facing):**

1. User **rotates phone to landscape** while in a room (`inRoom`) → enter **immersive mode**: hide top tabs / Me chrome; stage fills the viewport (fullscreen-ish; use Fullscreen API if allowed, else CSS landscape layout).
2. **Chat** moves to a **bottom corner** compact Overlay (keep mobile Overlay-only rule; no black hood).
3. User **exits landscape** (rotate back to portrait) **or** taps an explicit Exit immersive control → **restore full chrome** (tabs, status, bar).

**Notes for implementer:**

- Gate on `matchMedia("(orientation: landscape)")` + `inRoom`; ignore lobby.
- Persist nothing required (session-only flag OK). Respect existing `whirled2.chatUi` / room mute.
- ENGINE DEV: only retarget chrome around `#stage-slot` — do not remount Pixi on rotate.
- Accessibility: provide Exit control even if orientation flip fails (tablet docked, etc.).

**Status:** Planned / not shipped. Track here; no `app.js` work in this doc pass.

