#!/bin/sh
# Juge données ⊥ — ㉚ « les routes » + les deux gestes — maquette — 2026-11-11
# Commandes RÉELLEMENT exécutées contre la pile locale (X-Server-Build 8d0184a4).
# Compte JETABLE jd5-* créé pour ce run ; aucun POST sur un objet qui n'est pas propre à ce compte.
# Jetons masqués dans les sorties (`***`).

# ── 0. X-Server-Build AVANT ───────────────────────────────────────────────────
curl -s -i -m5 http://localhost/v1/supply-chain/graph | grep -iE '^HTTP|^x-server-build|^date'
#   -> mesures/x-server-build-avant.txt   (401 + X-Server-Build: 8d0184a4)

# ── 1. compte jetable ─────────────────────────────────────────────────────────
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd5-$(date +%s)"
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS-Aa1!\"}" > 01-signup.json
#   jeton lu à payload.data.access_token  (auth.controller.ts:239-262)
TOK='***'

curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOK" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"client_version":"1.0.0"}' > 02-session-open.json
#   -> octroie le kit de départ (5 bâtiments, îlots 1501..1505, district « La Lisière »)
#   -> porte structural_budget = {"used":0,"cap_reached":false}

# ── 2. les deux LECTURES de l'écran, sur compte frais ─────────────────────────
curl -s -H "Authorization: Bearer $TOK" http://localhost/v1/supply-chain/graph   > 03-graph-compte-frais.json
#   -> nodes 5, legs 0, routes 0   (routes[] VIDE sur compte neuf : il faut dimensionner)
curl -s -H "Authorization: Bearer $TOK" http://localhost/v1/me/buildings         > 04-me-buildings.json

# ── 3. DIMENSIONNEMENT par une VRAIE action joueur sur MON compte ─────────────
curl -s -X POST http://localhost/v1/operational/routes -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOK" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"originBlock":1503,"destBlock":1502}' > 05-route-create.json
curl -s -H "Authorization: Bearer $TOK" http://localhost/v1/supply-chain/graph   > 06-graph-apres-creation.json
#   -> routes[0] = {route_id, origin_building_id, destination_building_id,
#                   sinuosity_stress_bucket:"pristine", time_to_collapse_bucket:"na",
#                   state:"active", rebuilding:false}        <- 7 clés, state JAMAIS 'draft'

curl -s -H "Authorization: Bearer $TOK" http://localhost/v1/operational/routes   > 07-operational-routes-LISTE-BRUTE.json
#   -> la LIGNE BRUTE entière (sinuosity_index, straight_line_distance, patch_count,
#      rebuild_completes_at_tick, mycelial_transit_stress_multiplier…) sur une route JOUEUR.

# ── 4. les GESTES, sur MA route ───────────────────────────────────────────────
RID=a35ba468-23df-4c74-ac49-fb47fe9ccaaf
# 4a. mode invalide — 422, aucun effet
curl -s -X POST "http://localhost/v1/operational/routes/$RID/rebuild" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOK" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"mode":"NOPE"}'
#   -> 422 VALIDATION_FAILED / user_facing_i18n_key "error.validation.failed"
# 4b. maintain sur un legId inexistant — 404 (garde de propriété)
curl -s -X POST "http://localhost/v1/supply-chain/legs/$(python3 -c 'import uuid;print(uuid.uuid4())')/maintain" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOK" \
  -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" -d '{"mode":"quick_patch"}'
#   -> 404 RESOURCE_NOT_FOUND / "error.resource.not_found"
# 4c. le GESTE réel
curl -s -X POST "http://localhost/v1/operational/routes/$RID/rebuild" -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOK" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"mode":"MINIMAL_REROUTE"}' > 08-rebuild-MINIMAL_REROUTE.json
#   -> 200 {routeId, mode, version:2, rebuildCompletesAtTick:1512}
# 4d. le MÊME geste, immédiatement — le refus du cadre 167
curl -s -X POST "http://localhost/v1/operational/routes/$RID/rebuild" ... -d '{"mode":"MINIMAL_REROUTE"}' \
  > 09-rebuild-2e-REFUS.json
#   -> 409 REBUILD_IN_PROGRESS / user_facing_i18n_key "error.sinuosity.rebuild_in_progress"
# 4e. l'APRÈS-GESTE
curl -s -H "Authorization: Bearer $TOK" http://localhost/v1/supply-chain/graph   > 10-graph-APRES-GESTE.json
#   -> rebuilding:true, state:"active", time_to_collapse_bucket "na" -> "approaching" (!)

# ── 5. X-Server-Build APRÈS ───────────────────────────────────────────────────
curl -s -i -m5 http://localhost/v1/supply-chain/graph | grep -iE '^HTTP|^x-server-build|^date'
#   -> mesures/x-server-build-apres.txt

# ── 6. les mots servis (string_table du cumul back 74c5a0b0) ──────────────────
git -C /home/erutheone/project/mafia-clean-city show 74c5a0b0:services/game-back/src/i18n/string_table.ts
#   -> compte, par texte exact, dans mesures/mots-servis-74c5a0b0.txt

# ── 7. la maquette ÉPINGLÉE ───────────────────────────────────────────────────
git -C /home/erutheone/project/atelier3d-mafia-C1 show 17803d1:ecrans-brennar-6.html > maquette-17803d1.html
#   md5 28ddb122e119e9185cd32c8e1e8acac4 · 2 730 084 o · 170 cadres / 170 étiquettes
#   cadres 159..169 découpés dans mesures/cadres/cadre-1NN.html
