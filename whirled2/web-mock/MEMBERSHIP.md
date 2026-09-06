# Whirled2 Club / Membership — research & Coming Soon plan

**Status:** Coming Soon UI only (Me → Club / header Club). **No live payments**, no Buy Bars, no checkout. Coins & Bars stay earn-only play labels. Whirled2 is **not affiliated** with Three Rings Design, whirled.club, or any official Whirled commercial entity.

Cache / chrome version when this doc was written: `?v=20260906ac` (see `LOGO_V` in `app.js`).

---

## Classic / Club Whirled facts (cite for design)

Public research summary (wiki + community history; not a claim of partnership):

### Dual currency + creator cash-out (original Three Rings era)

- **Coins** — everyday play / soft currency earned in-world.
- **Bars** — harder currency historically tied to purchases and premium flow.
- **Bling** — creator cash-out path: when players spent bars on creator listings, creators could receive bling and (with enough balance / rules) cash out.

Creator shop economics (historical wiki picture, approximate):

- **Coin listings** — roughly **~40%** of the coin price went to the creator (platform kept the rest).
- **Bar listings** — creators received **bling** on the order of **~60% of the bar price** historically (wiki-reported; exact rules changed over time).

### Club Whirled subscription (added ~2009)

Three Rings added a **Club Whirled** subscription around **2009** as a recurring membership on top of the free social world (extra perks, recognition, convenience — not a full paid-only game).

### Business outcome (public CEO-era comments)

By around **2010**, leadership commentary described roughly **~$5M invested** against roughly **~$300K revenue** — characterized as an **“abject failure”** commercially despite a beloved community. Contributors often cited:

- High **Flash** client / tooling costs
- The industry shift toward **mobile**
- Thin conversion from free players → paying members

### Aftermath

**Grey Havens** later operated the service; the classic stack ultimately wound down / dissolved around **2017**. Community-run **whirled.club** and related efforts kept the spirit alive separately from Whirled2.

### Club Whirled revival (whirled.club era — for contrast)

Modern **Club Whirled** on whirled.club (optional, often **non-renewing** packs — learn from their FAQ: avoid surprise auto-renew) has advertised tiers such as:

| Pack (example) | Price (example) | Notable perks (examples) |
| --- | --- | --- |
| Monthly-style | **$4.99** | Bars/mo, daily coin bonus, Club star, free parties/listings, etc. |
| Mid | **$11.99** | Larger pack of the same perk family |
| Larger | **$29.99** | Longer / bigger grant of bars + member perks |

Typical perk themes (not exhaustive): **10 bars/mo** (or pack equivalent), **daily coin bonus**, **Club star**, free parties / listings, **legacy avatars**, convenience unlocks.

Whirled2 studies these as **history and UX lessons** — we do **not** copy their billing, brands, or proprietary assets.

---

## Why memberships / profit struggled (analysis)

Lessons we take into the Whirled2 2026 Coming Soon model:

1. **High fixed cost vs thin free→pay conversion** — Flash + ops ate runway while most players stayed free.
2. **Confusing 3-currency stack** — coins / bars / bling made value hard to explain (“what do I buy, and who gets paid?”).
3. **Creator cash-out was good in theory but slow/opaque** for many players — trust and clarity matter as much as the percentage.
4. **Sub perks often felt like “bonus bars”** rather than durable **identity / creator tools** — easy to undervalue once bars were spent.
5. **Platform took large cuts** + listing friction — creators felt squeezed; listing UX slowed the virtuous cycle.
6. **Tech debt (Flash) ate runway** — engine choice is a business decision; Whirled2’s new-engine path exists partly so membership spend can fund product, not archaeology.

---

## Whirled2 2026 revised model (planned — **not live**)

**Principles**

- **Free core forever** — full social play without a paywall.
- Membership buys **tools, status, and creator runway** — **not** combat / pay-to-win power.
- **Transparent cuts** — creators should see the split before listing.
- **Optional yearly**; **no auto-renew surprise** (learn from Club Whirled FAQ patterns).
- Coins & Bars remain **earn-only labels** in this mock; any real billing would be a later product decision with clear UI (not present today).

### Planned tiers (names/copy may change)

| Tier | Planned display price | Intent |
| --- | --- | --- |
| **Free** | $0 | Full social play; earn coins/bars via play/streaks; browse shop; one loft |
| **Supporter** | ~$4.99/mo or yearly option (planned) | Club star, cosmetic flair, streak boosts, early-access room themes — no pay-to-win |
| **Creator** | ~$9.99/mo or yearly option (planned) | List/sell avatars & stuff; **creators keep most** (~**85–90%**); Whirled2 takes a **small membership-tier cut** (~**10–15%**); creator dashboard Coming Soon; bling cash-out Coming Soon |
| **Studio** | Higher / team pricing (planned) | Team seats, higher listing caps, hall branding, **lower cut**, analytics Coming Soon |

### Creator economics (planned contrast vs classic)

- Classic coin listings often left creators with a minority share (~40% wiki picture).
- Whirled2 **Creator / Studio** aim: **creators keep most of the sale**; platform takes a **small, tier-visible cut** — membership funds runway so the cut can stay modest.
- **Bling cash-out** and **revenue share dashboard** are explicitly **Coming Soon** (not live).

### Cool features on the roadmap (Coming Soon labels)

- Creator storefront
- Revenue share dashboard
- Member-only room themes
- Priority events
- Gift memberships
- Seasonal Club avatars

---

## Chrome implementation notes

- UI: `meClub()` in `app.js` (Me → Club + header Club).
- Interest: localStorage stub `whirled2.clubInterested.{userId}` + optional email `whirled2.clubNotify.{userId}` — **no mailing list server**.
- Styles: `.club-*` in `src/styles.css` (pale-blue classic shell, tier accents).
- **ENGINE DEV:** Club is chrome-only HTML inside `#main`. Do not mount payments, do not touch `#stage-slot`, room music, or Pixi.

---

## Disclaimer (repeat for contributors)

No payments today. Not affiliated with whirled.club / Three Rings. Prototypes may change. Coins & Bars are play currency labels only.
