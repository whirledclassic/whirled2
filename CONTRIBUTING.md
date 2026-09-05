# Contributing

This account is two projects with one front door. Pick a track before you type.

| Track | Folder | Label |
| --- | --- | --- |
| Original Whirled / msoy lab | [`classic/`](classic/) | `whirled` |
| New browser room | [`whirled2/`](whirled2/) | `whirled2` |

Same/different vs the 2007 client: [`whirled2/SAME-AND-DIFFERENT.md`](whirled2/SAME-AND-DIFFERENT.md).

## Ground rules

- One job per PR. A walk-cycle is a PR. A new renderer is not a first PR.
- Talk in an issue before a large change.
- No secrets, no `.env`, no lab VM hostnames, no player dumps.
- No original Whirled / msoy binaries or ripped shop assets.
- Do not vendor `greyhavens/msoy` into this tree.
- Be an adult. Harassment or "gotcha" crash content gets you removed.

## What to work on

Look at open issues. Prefer anything tagged `good first issue` or `help wanted`.

Whirled 2 priority:

1. Playable empty room (click to walk, camera follows)
2. One avatar sprite + idle / walk
3. Place 3 furniture props
4. Deploy notes for a $5 VPS + HTTPS

Classic priority: keep lab notes accurate. Do not publish the VM.

## Artist work

See [docs/ARTISTS.md](docs/ARTISTS.md). Same money line as code: volunteer now, credit always, pay only from real revenue later.

## Code style (Whirled 2)

- TypeScript, strict when the scaffold lands under `whirled2/`
- PixiJS for the room
- No new runtime dependency without an issue saying why

## Commit style

Short, present tense. `Add click-to-walk to room` not `Added some stuff`.
Prefix if it is not obvious: `classic:` or `w2:`.
