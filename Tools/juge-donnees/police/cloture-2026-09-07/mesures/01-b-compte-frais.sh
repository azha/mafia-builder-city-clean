#!/usr/bin/env bash
# Juge données ⊥ ⑮ — mesure B sur COMPTE FRAIS (jamais operational_demo / demo_capture).
# Contrats recopiés : auth.controller.ts:255-258 (@Post signup, @Idempotent required, 201),
#                     auth.controller.ts:264 (allowlist callsign/password/email/locale),
#                     session.controller.ts:57-59 (@Post session/open, @HttpCode(200), JwtAuthGuard),
#                     session.controller.ts:70-73 (client_version REQUIS sinon 422).
# Jeton lu à payload.data.access_token (AuthClient.cs:50).
set -u
D="$(cd "$(dirname "$0")" && pwd)"
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())')
CS="jd15-$(date +%s)"
echo "callsign=$CS  idem=$KEY"

curl -s -o "$D/signup.json" -w 'HTTP %{http_code}\n' -X POST http://localhost/v1/auth/signup \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS-Aa1!\"}"

TOKEN=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["payload"]["data"]["access_token"])' "$D/signup.json")
echo "token_len=${#TOKEN}"
echo "$CS" > "$D/compte-frais.txt"

curl -s -o "$D/session-open.json" -w 'HTTP %{http_code}\n' -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"client_version":"juge-donnees-15"}'

# la route de LECTURE de l'écran ⑮, district 1 (celui que le contrôleur cible : districtId=1)
curl -s -o "$D/GET-inspection-d1.json" -w 'HTTP %{http_code}\n' \
  -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/1/inspection

echo "$TOKEN" > "$D/.token"

# --- ajout : la route d'agrégat ville candidate (Q2) ---
curl -s -o "$D/GET-world-districts.json" -w 'HTTP %{http_code}\n' \
  -H "Authorization: Bearer $TOKEN" http://localhost/v1/world/districts
