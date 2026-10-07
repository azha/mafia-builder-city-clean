#!/usr/bin/env bash
# Juge données ⊥ ④ Accueil — mode CLÔTURE — 2026-10-07
# Les commandes EXACTES qui ont produit `mesures/`. Compte NEUF, pile dev locale (Traefik http://localhost).
# Back servi : image `mafia-clean-city-game-back` bâtie 2026-09-26T14:36:56+02:00, dernier commit back de
# `main` = ac8d3e01 (2026-09-26 14:34) → c'est le BACK DE `main` 71fd2125 (les commits du 07/10 ne touchent
# que tests/docs). Contrôle positif : `LAUNDERING_SAFEHOUSE_SHORT` (chaîne du dernier commit back) présent
# dans 5 fichiers de `dist/` du conteneur ; contrôle négatif : chaîne bidon → 0.
set -euo pipefail

KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd4-$(date +%s)"
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS-9xA\"}" > POST_auth_signup.json
TOKEN=$(python3 -c "import json;print(json.load(open('POST_auth_signup.json'))['payload']['data']['access_token'])")

curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -d '{"client_version":"juge-donnees-1.0"}' > POST_session_open.json

for pair in "GET_me:/v1/me" \
            "GET_economy_wallet:/v1/economy/wallet" \
            "GET_progression:/v1/progression" \
            "GET_me_buildings:/v1/me/buildings" \
            "GET_operational_dealers:/v1/operational/dealers" \
            "GET_lieutenants:/v1/lieutenants" \
            "GET_exceptions_queue:/v1/exceptions/queue" \
            "GET_autonomy_reports:/v1/autonomy-reports" \
            "GET_me_clock:/v1/me/clock" \
            "GET_flag_review:/v1/flag-review"; do
  n=${pair%%:*}; u=${pair#*:}
  c=$(curl -s -o "$n.json" -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "http://localhost$u")
  echo "$c  $u"
done
# → 200 partout SAUF /v1/me/clock : 404 (route du cumul back NON fusionné)

LAB=$(python3 -c "import json;print([b['building'] for b in json.load(open('GET_me_buildings.json'))['payload']['data']['buildings'] if b['operational_type']=='lab'][0])")
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/operational/lab/$LAB"                      > GET_operational_lab_id.json
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/operational/precursors?building_id=$LAB"   > GET_operational_precursors.json
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/city/district/16/stash"                    > GET_city_district_16_stash.json
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/city/district/16/heat"                     > GET_city_district_16_heat.json

# La sonde de chaleur de ④ est câblée en dur sur le district 16 : contrôle sur 4 districts
for d in 1 5 16 18; do
  curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/city/district/$d/heat" > "GET_heat_d$d.json"
done
# → citywide=COLD partout. ⚠️ CONTRÔLE NON DISCRIMINANT : sur compte neuf TOUT vaut COLD.

curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/i18n/bundle"           > GET_i18n_bundle.json     # locale servie : "en"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/i18n/bundle?locale=fr" > GET_i18n_bundle_fr.json  # 1998 entrées, locale "fr"
