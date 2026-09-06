# Whirled2 Chrome — STATUS

Date: 2026-09-06

## What shipped (?v=20260906al)

**Hybrid auth + Discord return to Pages + boot resilience:**

1. **Login fix:** When `WHIRLED_API` is set (demo tunnel / Pages), `WhirledApi.login` / `register` prefer the Node API; on credential/taken **or** network failure they **fall back to offline `localStorage` users** so Pages-created accounts still Logon on the tunnel. Clearer errors when both fail. Beginner comments: Pages offline vs demo API.
2. **Boot/shell:** `finishBootAfterSession` / shell paint wrapped — a UI throw after successful session shows `#gate-err` or a recoverable shell (not a stuck empty gate). `bindGate` always runs when the gate is shown.
3. **Discord → Pages:** `CLIENT_RETURN_ORIGIN` / `DISCORD_SUCCESS_ORIGIN` + allowlisted `?return=` on `/api/auth/discord`. Portal **Redirect URI stays the tunnel** (`DISCORD_REDIRECT_URI`). Success can redirect to Pages `/?discord_token=…&v=20260906al`. Pages `index.html` sets `WHIRLED_API` to the live tunnel; `discordAuthStartUrl` appends `?return=` when page origin ≠ API.
4. Prior loft backdrop / tofu / chat SVG icons kept (`ak`). SWF lab stays **locked**. `#stage-slot` contract unchanged.

**Restart demo server with:**
`CLIENT_RETURN_ORIGIN=https://whirledclassic.github.io/whirled2/whirled2/web-mock`
(`PUBLIC_ORIGIN` / `DISCORD_REDIRECT_URI` still tunnel.)

## Prior (?v=20260906ak)

**Loft placeholder + Stuff Avatar viewer + chat-bar SVG icons** — see STUFF-AVATARS.md / AVATAR-STUFF-FIDELITY.md.

## Prior (?v=20260906aj)

- Discord create-account UX; QA pass ([QA-PAGES.md](./QA-PAGES.md)).

## Standing rules

- Coins/Bars earn-only; never invent fake catalog.
- Never say MySpace; say Profile look.
- `#stage-slot` = engine mount; Wear on `#avatar-wear-layer` sibling.
- No secrets in client — only `WHIRLED_API` origin.
