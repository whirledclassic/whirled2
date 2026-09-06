## What shipped (?v=20260906ax)

- **Room visual overhaul (P0):** pale-blue Now playing mini-bar (title ellipsis + Open / Set / Mute); killed outdoor **green grass** stage gradients; occupant strip classic dark/pale-blue (presence dot soft blue, not neon green); engine “mounts here” hidden when avatar worn; toasts ≤2s at top (Chat cleared no longer stuck mid-loft).
- **Whirl starter avatar:** renamed from Cyan Hair (display / Stuff / nameplate / pack.json / index). Folder path stays `assets/avatars/user-pack/cyan-hair/`. **Auto-add + auto-Wear** on login/boot (and Stuff visit) for new users and tofu/empty wear — idempotent. Walk/emote/artFaces from **ar** preserved.
- **FLA Test Avatar** seeded into Stuff as Coming Soon sketch pack from `fla-lab/extracted`.
- **NaN name fix:** `sanitizeDisplayName` / occupant self prefers session name; heal `TestNaN0NaN0` style corruption; `pad2` hardened.
- **Chat Speak/Think/Shout** compose button + /shout; **party invite** friends from panel / occupant menu.\n- **Flash path:** classic-avatar.js Whirl copy; Ruffle hybrid path kept (aw).
- Preserves **av** chat visit-since / Clear, **au** Dev Hub, earn-only coins/bars, no MySpace / fake shop.
- Cache: **`?v=20260906ax`**. Push script: `/tmp/push-ax.js` (dry-run default).

## What shipped (?v=20260906aw)

- Classic Flash / Whirled avatars panel (`src/classic-avatar.js`); hybrid SWF+PNG; Experimental Wear; Ruffle loft host.
- Preserved av chat visit-since + au Dev Hub. Cache `?v=20260906aw`.

## Prior (?v=20260906av)

- Chat visit-scope + Clear my view; Make Door; name-click menu; Room vs Private tabs.

# Whirled2 Chrome — STATUS

Date: 2026-09-06

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear / chrome walk / emotes on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
- **Whirl** is the starter avatar (slug `cyan-hair`).
