#!/usr/bin/env bash
# Juge données ⊥ — La Décision du jour — maquette — 2026-08-25
# Toutes les commandes exécutées pour produire les corps de mesures/. Stack dev locale, Traefik sur http://localhost.
# Comptes FRAIS (jd-*, jd2-*) ; le compte de démo operational_demo@example.test n'a JAMAIS été touché.

# ── 1. signup (Idempotency-Key REQUIS — auth.controller.ts:239 @Idempotent({required:true})) ────────
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
curl -s -o signup.json -X POST http://localhost/v1/auth/signup \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"                       # → 201
TOK=$(python3 -c "import json;print(json.load(open('signup.json'))['payload']['data']['access_token'])")

# ── 2. session/open sur compte frais (client_version obligatoire — session.controller.ts:60-63) ─────
curl -s -o session-open-fresh.json -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" \
  -d '{"client_version":"jd-1.0.0"}'                                        # → 200, hl_card: null, 12 clés

# ── 3. DIMENSIONNEMENT : un corps vide n'est pas un ensemble de clés ────────────────────────────────
#    Le provider AUTONOMY_REPORTS_PENDING (providers/autonomy-reports.provider.ts:46-73) exige UNE ligne
#    autonomy_reports non résolue. 3 issues => impact 3/5=0,6 (moderate) ; 30 h => urgency 30/48=0,625 (elevated).
PID=<player_id du compte frais>   # SELECT player_id FROM player WHERE callsign=$CS
LT=<lieutenant_id du compte frais>
docker exec -i mafia-clean-city-pg-1 psql -U mafia -d mafia_clean_city -v ON_ERROR_STOP=1 -tAc \
 "INSERT INTO autonomy_reports (lieutenant_id, player_id, cycle_id, issues, emitted_at)
  VALUES ('$LT','$PID',1,'[…3 ReportIssue bien formées…]'::jsonb, now() - interval '30 hours') RETURNING report_id;"
#    computeAndPersist ne tourne QUE sur le chemin openFresh gagnant (session.service.ts:142) => close+open.
curl -s -o session-close.json  -X POST http://localhost/v1/session/close -H "Authorization: Bearer $TOK"
curl -s -o session-open-with-card.json -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"client_version":"jd-1.0.0"}'

# ── 4. les deux routes d'action + leurs refus ──────────────────────────────────────────────────────
CID=<card_id>
curl -s -o skip-200.json  -X POST "http://localhost/v1/session/hl-card/$CID/skip"   -H "Authorization: Bearer $TOK"  # 200 {skipped:true}
curl -s -o skip-409.json  -X POST "http://localhost/v1/session/hl-card/$CID/skip"   -H "Authorization: Bearer $TOK"  # 409 RESOURCE_STATE_CONFLICT
curl -s -o session-open-after-skip.json   -X POST http://localhost/v1/session/open  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"client_version":"jd-1.0.0"}'
curl -s -o commit-200.json -X POST "http://localhost/v1/session/hl-card/$CID/commit" -H "Authorization: Bearer $TOK" # 200 {committed:true,structural:false}
curl -s -o commit-409.json -X POST "http://localhost/v1/session/hl-card/$CID/commit" -H "Authorization: Bearer $TOK" # 409
curl -s -o commit-404.json -X POST "http://localhost/v1/session/hl-card/$(uuidgen)/commit" -H "Authorization: Bearer $TOK" # 404
curl -s -o commit-nonuuid.json -X POST "http://localhost/v1/session/hl-card/pas-un-uuid/commit" -H "Authorization: Bearer $TOK" # 500 ⚠
curl -s -o skip-nonuuid.json   -X POST "http://localhost/v1/session/hl-card/pas-un-uuid/skip"   -H "Authorization: Bearer $TOK" # 500 ⚠
curl -s -o commit-401.json     -X POST "http://localhost/v1/session/hl-card/$CID/commit"                                        # 401
curl -s -o session-open-after-commit.json -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"client_version":"jd-1.0.0"}'

# ── 5. état cap_reached:true AVEC une carte tactique (le seul écrivain prod du compteur est
#       structural-decision-governor.repository.ts:99 ; ici on pose la valeur pour prouver la FORME) ──
docker exec -i mafia-clean-city-pg-1 psql -U mafia -d mafia_clean_city -v ON_ERROR_STOP=1 -tAc \
 "UPDATE player_progression_state SET structural_decisions_this_session=1 WHERE player_id='$PID';"
curl -s -o session-open-cap-reached.json -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" -d '{"client_version":"jd-1.0.0"}'

# ── 6. voisinage demandé par le dossier + destination de l'issue A ──────────────────────────────────
curl -s -o meta-complexity-budget.json -H "Authorization: Bearer $TOK" http://localhost/v1/meta/complexity-budget
curl -s -o meta-pressure.json          -H "Authorization: Bearer $TOK" http://localhost/v1/meta/pressure
curl -s -o autonomy-reports.json       -H "Authorization: Bearer $TOK" http://localhost/v1/autonomy-reports
curl -s -o i18n-bundle-fr.json 'http://localhost/v1/i18n/bundle?locale=fr'
curl -s -o i18n-bundle-en.json 'http://localhost/v1/i18n/bundle?locale=en'
# contrôle négatif du même compte, 0 rapport : autonomy-reports-empty.json → 200 {"reports":[]}
