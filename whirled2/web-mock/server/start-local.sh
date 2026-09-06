#!/usr/bin/env bash
# Whirled2 demo server — local Discord OAuth
#
# How this works: run from anywhere; cds into this server/ dir and starts node server.mjs.
# Discord OAuth needs both env vars (never commit secrets). Optional files also work:
#   /home/box/.config/whirled2/discord.env
#   server/.env.local  (gitignored)
#
# Export before starting (example — paste your own values; do not commit):
#   export DISCORD_CLIENT_ID="your_client_id"
#   export DISCORD_CLIENT_SECRET="your_client_secret"
#
# Tunnel / Pages return (optional):
#   export PUBLIC_ORIGIN="https://….trycloudflare.com"
#   export DISCORD_REDIRECT_URI="$PUBLIC_ORIGIN/api/auth/discord/callback"
#   export CLIENT_RETURN_ORIGIN="https://whirledclassic.github.io/whirled2/whirled2/web-mock"
#
# Then:
#   ./start-local.sh
# Open http://127.0.0.1:8787/ — gate shows Continue with Discord when enabled.
#
# ENGINE DEV: auth is chrome-only; never touches #stage-slot.

set -euo pipefail
cd "$(dirname "$0")"
exec node server.mjs
