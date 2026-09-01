#!/usr/bin/env bash
# Instrument du juge données ⊥ — ㊲ La réputation — clôture 2026-08-31
# Compte FRAIS (jamais operational_demo), session ouverte, puis FERMÉE en sortie (voir 90-close.sh).
# Toutes les sorties atterrissent à côté de ce script.
set -u
cd "$(dirname "$0")"
H=http://localhost

CS="jd-rep-$(date +%s)"
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())')
echo "callsign=$CS" | tee compte.txt

# 1. signup — Idempotency-Key REQUIS (auth.controller.ts:239-241)
curl -s -X POST $H/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > 01-signup.json
TOKEN=$(python3 -c 'import json;print(json.load(open("01-signup.json"))["payload"]["data"]["access_token"])')
echo "token_len=${#TOKEN}" >> compte.txt
A=(-H "Authorization: Bearer $TOKEN")

# 2. session/open (session.controller.ts:56) — octroie le kit de départ
curl -s -X POST $H/v1/session/open "${A[@]}" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" -d '{}' > 02-session-open.json

# 3. identité — pour épingler MON player_id (pile partagée : tout dénombrement filtré dessus)
curl -s "${A[@]}" $H/v1/me > 03-me.json

# 4. mes bâtiments (pour recruter un lieutenant sur un bâtiment À MOI)
curl -s "${A[@]}" "$H/v1/me/buildings" > 04-buildings.json

# 5. roster lieutenants sur compte neuf
curl -s "${A[@]}" $H/v1/lieutenants > 05-lieutenants-avant.json

echo "$TOKEN" > .token
echo "--- signup/session/me/buildings/lieutenants capturés ---"
