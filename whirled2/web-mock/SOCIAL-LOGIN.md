# Social login — easiest path for Whirled2 (Pages + optional demo Node)

**Date:** 2026-09-06 (ET)  
**Project:** `whirledclassic/whirled2` web-mock — static **GitHub Pages** + optional `server/server.mjs` demo API.  
**Constraint:** Username/password stays primary. **Facebook Connect stays removed** (Meta App ID / SDK friction). Buttons may remain **Coming Soon** until credentials exist.  
**Reality check:** Pure static Pages **cannot** safely complete OAuth code↔token exchange (client secret must not ship in the browser). Real social login needs the **demo Node server** (or another tiny callback host) with env vars.

Whirled2 is not affiliated with Three Rings / whirled.club.

---

## Ranking by hassle for owner (J)

Lowest hassle first. “Hassle” = dashboard clicks + verification + ongoing account burden for *you*, not player UX.

| Rank | Provider | Hassle | Why |
|------|----------|--------|-----|
| **1** | **GitHub OAuth App** | **Lowest** | You already use `gh` / GitHub daily. One form under Settings → Developer settings → **OAuth Apps**: name, Homepage URL, **Authorization callback URL** → Client ID + generate Client Secret. No Cloud project, no consent-screen branding maze. Audience = builders; fine for revival/devs. |
| **2** | **Discord OAuth2** | **Low** | Discord Developer Portal → New Application → OAuth2 → Client ID/Secret + Redirects. Very quick. Great **player** audience for Whirled community. Slightly more hassle than GitHub only because it is a *second* portal (not the same place you already push code). |
| **3** | **Google OAuth** | **Medium–high** | Google Cloud project → **OAuth consent screen** (app name, support email, scopes, test users while unverified) → Credentials → OAuth client. Extra steps and verification friction for public “In production”. |
| **4** | **Twitch** | **Medium** | Twitch Developer Console app + redirect; similar shape to Discord, weaker default audience fit here. |
| **5** | **Twitter / X** | **High** | Developer portal + historically paid/restricted API access and policy churn — avoid as primary. |
| **6** | **Apple Sign In** | **Highest** | Apple Developer Program (**paid**), Services ID, domains/return URLs, extra platform rules — skip unless shipping a native iOS app later. |

**Do not bring Facebook back as primary** — already removed in `?v=20260906aa` (see `DEV-NOTES.md` / `STATUS.md`).

---

## Recommendation (top 1–2)

### Ship order

1. **GitHub** — first real social when you turn OAuth on (least owner hassle; credentials live next to the repo you already own).  
2. **Discord** — second button (community fit). Keep both as **Coming Soon** on the gate until env vars are set.

Google can wait. Twitch/X/Apple stay unlabeled or buried “more later”.

### Credentials needed

All of these need a **server-side** callback (extend `server/server.mjs` or equivalent). Store secrets in env — never in `app.js` / Pages assets.

| Provider | What you create | Env vars (suggested) | Callback example |
|----------|-----------------|----------------------|------------------|
| **GitHub** | [OAuth App](https://github.com/settings/developers) — Homepage = Pages or site root; Callback = demo API `/api/auth/github/callback` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `http://127.0.0.1:8787/api/auth/github/callback` (local) + one prod URL if demo host is public |
| **Discord** | [Developer Portal](https://discord.com/developers/applications) app → OAuth2 → Redirects; scopes typically `identify` (+ `email` if you want it) | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | `…/api/auth/discord/callback` |
| Google (later) | Cloud Console OAuth client (Web) + consent screen | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `…/api/auth/google/callback` |

**Also needed on the demo server (any provider):**

- Session cookie or token issuance after profile fetch (map to existing `users` / `sessions` shape in `server/data.json`).
- CSRF `state` (and prefer **PKCE** where supported — GitHub now documents PKCE for OAuth apps).
- Pages `WHIRLED_API` pointing at that demo origin when testing social; empty `WHIRLED_API` on plain Pages → keep Coming Soon / password only.

### Coming Soon until credentials exist

- Gate / Account already treat Discord / Google as labels (`CONCEPT.md`, About copy). Add **GitHub** the same way when UI is touched.
- Enable a provider only when **both** Client ID and Secret are present in server env; otherwise button stays disabled + “Coming Soon”.
- No zero-setup social on static Pages alone (`STATUS.md` out-of-scope line stands).

### Minimal owner checklist (when ready)

1. Pick host for callback (local `server.mjs` first).  
2. Create **GitHub OAuth App** → copy ID/secret → env.  
3. Implement `/api/auth/github` redirect + `/callback` code exchange → create/link local user → set session.  
4. Point Pages test build at `WHIRLED_API`.  
5. Optionally repeat for Discord.  
6. Leave Google/Apple/X off the primary gate.

---

## Related

- Facebook removed: `DEV-NOTES.md` / `STATUS.md` (`?v=20260906aa`).  
- Demo API overview: `server/server.mjs` header + `DEV-NOTES.md`.  
- Do not heavy-edit `app.js` in research passes — wire OAuth in a dedicated auth wave.

*Doc-only — nothing pushed.*
