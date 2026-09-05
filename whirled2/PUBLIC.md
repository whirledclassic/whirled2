# Why this exists — money, community, and a public room

This page is for people who are not going to compile Java 8. It is the public note.

Whirled 2 is a **new** user-generated world in a normal browser. Rooms, walk-around avatars, stuff people make. No Flash. That is a powerful tool if it actually ships. It does not ship because one person is nostalgic. It ships if the community that already kept this idea alive decides it is worth another try — on a modern engine anyone can open.

Classic private-server work lives in [`../classic/`](../classic/). This page is about the **public** product.

---

## What the original project cost (published numbers)

Nobody published a clean “line-item budget for Whirled only.” The numbers we have are from Three Rings themselves and from contemporaneous press. Treat them as **order of magnitude**, not an audit.

| Figure | What it is | When / who |
| --- | --- | --- |
| **~$5 million invested** in Whirled | CEO Daniel James, Flash Gaming Summit, March 2010: *“Whirled is at $300K revenue, $5M invested. Abject failure.”* He later said those were *approximate total investment in the project and total revenue to date. There are no profits.* | 2010 |
| **~$300,000 revenue** | Same talk. Revenue, not profit. | Through early 2010 |
| **$3.5 million** VC into Three Rings | Reported March 2008 (True Ventures, Chance Technologies / Accel seed, existing investors). Whirled was in alpha. The round funded the *company*, not a Whirled-only envelope. | 2008 |
| **$1.4 million** earlier Three Rings round | PitchBook lists a Series A1 (Aug 2007). Combined raised-to-date figures for the studio sit around **$4.9 million** before the 2011 Sega deal. | 2007–2011 |
| **~39 people** on staff at launch | VentureBeat / Forbes, November 2008. Puzzle Pirates was the money-maker; Whirled was the new platform. | 2008 |
| Puzzle Pirates **~$4 million** revenue in 2007 | Company-wide, mostly virtual goods. Context for why they thought a UGC world could work. | 2007 |

Sources: [Wikipedia — Whirled](https://en.wikipedia.org/wiki/Whirled) (quotes the 2010 line and the forum clarification), [GamesIndustry.biz](https://www.gamesindustry.biz/three-rings-secures-35-million-funding), [VentureBeat](https://venturebeat.com/business/three-rings-launches-whirled-for-virtual-rooms-games-and-goods/), [Forbes](https://www.forbes.com/2008/11/10/whirled-three-rings-tech-personal-cx_mji_1110whirled.html), [PitchBook company profile](https://pitchbook.com/profiles/company/12332-71).

**How to read that without lying:**

- A professional studio in San Francisco, with VC and a live sister MMO, still put **millions** into a Flash + Java UGC world and did not get the revenue back.
- James said the quiet part out loud in 2010. They kept trying anyway until Grey Havens took the site (2013) and the official world closed (8 April 2017).
- That is not a verdict on the *idea*. It is a verdict on that stack, that era, and that cost structure.

Whirled 2 is not a $5 million studio. If we pretend it is, we will burn people.

---

## What that money bought then — and what we are *not* buying

Then: office, salaries, Flash tooling, GWT chrome, a Java cluster, billing, a shop, creator payouts (roughly a third to the maker, a third to Three Rings, a third to the affiliate on a sale), prize pools for Flash games.

Now:

- Browser + TypeScript + Pixi. One cheap VPS + HTTPS when there is a room to point at.
- No Flash Player license. No recreation of the old shop catalog. No claim on whirled.com.
- Art and code from people who show up. Credit always. Pay only from money the live world actually makes. See [ARTISTS.md](ARTISTS.md).

The original world was expensive because it was a company product on a dying client. A modern UGC room that anyone can open in Chrome is cheaper to *start*. It is not free. Hosting, art, moderation, and time still cost something. The difference is we do not need a loft and a Series B to put one walkable room on the internet.

---

## This does not exist without the community

Official Whirled ended. The idea did not.

People who were not on the Three Rings payroll:

- kept [whirled.club](https://www.whirled.club) and the [wiki](https://wiki.whirled.club) up so the verbs and the stories were not just a 404
- published and patched Grey Havens `msoy` so a private original server is even possible
- wrote the lab notes we still read (including Shadowsych’s old dedicated-box guide — history, not our recipe)
- already tried browser remakes ([lulzsun/whirled2](https://github.com/lulzsun/whirled2), [html5-msoy](https://github.com/pravatbhusal/html5-msoy)) so we are not pretending this title appeared in a vacuum
- answered mail, Discord, and “is whirled.com dead?” for a decade

Whirled 2 is possible because that work exists. A modern user-generated platform in a normal browser is the piece that is still missing: **anyone** can join without a Flash plugin, a museum VM, or an invite to a private lab. That is the tool. The community is the reason it is worth building.

If you made rooms, avatars, games, or just showed up in 2008–2017 — this page is also for you. We are not asking you to donate your old shop files. We are asking whether the *shape* of that world deserves a 2026 engine.

---

## What we are trying to make

A public, user-generated world people can open in a browser.

- Your room.
- An avatar that walks.
- Furniture and games other people made — later, after walk works.
- No crash-the-client shop items. That drama stays in the past.

Same product idea as 2007–2017. New chrome, new art, new server when we need one. Details: [SAME-AND-DIFFERENT.md](SAME-AND-DIFFERENT.md), [ROADMAP.md](ROADMAP.md).

First public proof is still [issue #1](https://github.com/whirledclassic/whirled2/issues/1): one click-to-walk room. Until that is on the internet, everything else is talk.

---

## Crowdfunding — notes, not a campaign

There is **no live campaign** on this repo today. Do not send money to a random inbox because a page mentioned Kickstarter.

If / when we ask the public for money, the rules are:

1. **Playable room first.** Crowdfund a URL people can click, not a mood board.
2. **Itemize.** VPS + domain + HTTPS. A month of focused client work. Art bounties with names attached. Moderation time. That is a campaign. “Bring back Whirled” is not.
3. **No original assets as rewards.** No ripped avatars, no shop dumps, no “we licensed the old catalog.” We did not.
4. **No $5 million story.** The 2010 number is why we stay small. A few thousand dollars of honest hosting and art is the right scale until the room is fun.
5. **Pay from revenue later.** Same line as [ARTISTS.md](ARTISTS.md): volunteer now, credit always, pay only if the live world makes money and the maintainer can pay from that.
6. **Pick one pipe.** Open Collective / Ko-fi / a single campaign page — public ledger. Not five unofficial links.
7. **Refunds and failure.** If the room does not ship, leftover host money goes back or to a named preservation target (wiki / museum listing), written down before anyone pays.

Virtual Worlds Museum offered a listing and an ask-for-funds line on the existing Whirled exhibit. That is a pointer, not a grant. Museum does not fund this project.

---

## Networking — a short public note

How this project talks to the rest of the internet without turning into a spam account:

- **GitHub is the log.** Issues labeled `whirled2` or `whirled`. If it is not in an issue, it is a rumor.
- **Do not harvest old player lists.** No scraped emails, no “we found your 2012 account.” People who want in will find the repo.
- **whirled.club is not us.** Link it. Do not impersonate it. Do not tell their players we are the official sequel.
- **MADE Discord** (Museum of Art and Digital Entertainment) is a place Alex Handy pointed at. Slow room. Useful people. Invite in [../classic/SOURCES.md](../classic/SOURCES.md).
- **Virtual Worlds Museum** will list the effort if we stay real. Engage with the exhibit page; do not demand a grant.
- **Other remakes are colleagues, not enemies.** Jimmy Quach’s whirled2 is a different stack. Say so. Link it.
- **Press / podcasts / wiki edits:** one maintainer voice (Josh). No fake “team of 40.” We are not Three Rings.
- **When a public demo exists:** one HTTPS URL. Not a home IP. Not ten Discord “try this ngrok.”

Networking that matters after the room exists: embed a room on a page, send a link, let people walk. That is the whole loop.

---

## Keep in mind (public checklist)

- Flash is dead. The public product cannot depend on it.
- A UGC world without people is an empty canvas. Community first, shop never-first.
- Millions of dollars already failed once on this idea. We win by staying cheap and shipping a room.
- Credit the makers of the *old* world without stealing their files.
- If a rights holder hates the name, we rename. The work stays.
- Money in public, or no money talk.

---

## How to help this month without a wallet

1. [Issue #1](https://github.com/whirledclassic/whirled2/issues/1) — the ugly walkable room
2. Art under [ARTISTS.md](ARTISTS.md)
3. Tell one person who actually lived in Whirled. Not a blast list.

Contact: josh.awe99@gmail.com  
Issues: https://github.com/whirledclassic/whirled2/issues
