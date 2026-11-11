#!/usr/bin/env bash
# Juge données ⊥ — ㉚ La chaîne vue du graphe — mesures du 2026-11-11.
# Pile locale : X-Server-Build = 35bdd6cb (relevé sur CHAQUE réponse, cf. response_meta.server_build_ref).
# Compte JETABLE jd-1794417737 ; jeton et mot de passe JAMAIS écrits dans mesures/ (masqués `***`).
# AUCUN redémarrage / reconstruction / migration ; aucun compte existant touché.

# --- 1. compte frais ---
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > signup.json
TOK=$(python3 -c "import json;print(json.load(open('signup.json'))['payload']['data']['access_token'])")
# -> mesures/signup.json (access_token masqué)

# --- 2. session/open (octroie le kit de départ : 5 bâtiments) ---
curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ***" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"client_version":"jd-30-1.0.0"}' > session-open.json

# --- 3. la route du dossier, COMPTE FRAIS ---
curl -s -H "Authorization: Bearer ***" http://localhost/v1/supply-chain/graph > graph-frais.json
# -> nodes 5 (tous `silent`, has_arrow false), legs 0, routes 0

# --- 4. identité + la route qui porte le NOM des bâtiments (hors module du dossier) ---
curl -s -H "Authorization: Bearer ***" http://localhost/v1/me           > me.json
curl -s -H "Authorization: Bearer ***" http://localhost/v1/me/buildings > me-buildings.json
# -> 5 entrées, name_i18n = {key: game.fiction.building.name, params:{enseigne,district,block}}
#    jointure mesurée sur building_id : 5/5, 0 nœud du graphe sans nom.

# --- 5. DIMENSIONNEMENT des legs (code de PRODUCTION réel : LegAccrualService.recordThroughput,
#        invoqué par la route _test gated NODE_ENV!=production — PAS une route joueur, dit comme tel) ---
PID=$(python3 -c "import json;print(json.load(open('me.json'))['payload']['data']['player_id'])")
for i in 1 2 3; do   # cargo 50 / 200000 / 99000000 ; SI 1.0 / 2.0 / 4.0 ; gameMinute 1001..1003
  curl -s -X POST http://localhost/v1/_test/supply-chain/record-throughput -H 'Content-Type: application/json' \
    -d "{\"playerId\":\"$PID\",\"originBuildingId\":\"<B$i>\",\"destinationBuildingId\":\"<B$((i+1))>\",
         \"cargoGrams\":<CG>,\"routeSinuosityIndex\":<SI>,\"gameMinute\":$((1000+i))}"
done
curl -s -H "Authorization: Bearer ***" http://localhost/v1/supply-chain/graph > graph-dim1.json
# -> legs 3 : debt_bucket observés {accruing, fractured} ; bypassed false ; routes toujours 0

# --- 6. bypassed=true par la ROUTE JOUEUR d'action (POST .../legs/:legId/maintain) ---
curl -s -X POST http://localhost/v1/supply-chain/legs/cb9b1704-8252-4797-8dfe-4d364585863c/maintain \
  -H 'Content-Type: application/json' -H "Authorization: Bearer ***" \
  -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" -d '{"mode":"reroute_bypass"}'
# -> 200 {leg_id, mode:"reroute_bypass", maintenance_completes_at_tick:null, next_stressed_leg{…debt_bucket:"fractured"}}

# --- 7. bandes de pression non-`silent` : 16 ticks BACKPRESSURE_UPDATE (le MÊME runTick du scheduler) ---
for gm in 2000 2060 2120 2180 2240 2300 2360 2420 2480 2540 2600 2660 2720 2780 2840 2900; do
  curl -s -o /dev/null -X POST http://localhost/v1/_test/supply-chain/run-backpressure-update \
    -H 'Content-Type: application/json' -d "{\"playerId\":\"$PID\",\"gameMinute\":$gm}"
done
curl -s -H "Authorization: Bearer ***" http://localhost/v1/supply-chain/graph > graph-dim2.json
# -> buckets {silent, warm} ; has_arrow true sur 1 nœud, arrow_to_building_id non-null ; bypassed true sur 1 leg

# --- 8. DIMENSIONNEMENT de `routes` par la ROUTE JOUEUR POST /v1/operational/routes ---
curl -s -X POST http://localhost/v1/operational/routes -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ***" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"originBlock":1501,"destBlock":1502,"routeName":"jd-30"}'            # 201
curl -s -X POST http://localhost/v1/operational/routes -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ***" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" \
  -d '{"originBlock":1502,"destBlock":1504,"routeName":"jd-30-b","vehicleType":"car"}'   # 201
curl -s -H "Authorization: Bearer ***" http://localhost/v1/supply-chain/graph > graph-dim3.json
# -> routes 2 : sinuosity_stress_bucket "pristine", time_to_collapse_bucket "na", state "active", rebuilding false

# --- 9. ORDRE : le même jeu de données, deux appels, deux ordres (aucun ORDER BY au back) ---
# graph-frais.json  : 3addd2b3 cf5c00a5 89acce10 1c7fba73 b2681989
# graph-dim2.json   : cf5c00a5 89acce10 3addd2b3 1c7fba73 b2681989   -> MEME_ORDRE = False

# --- 10. maquette : cadre épinglé par git, extrait par son LIBELLÉ ---
# git -C /home/erutheone/project/atelier3d-mafia-c2 show ec35deec:ecrans-brennar-6.html
#   -> 2 657 406 octets, 6 894 lignes, sha256 147c70d3…c45e1 ; 155 ouvertures `<div class="cadre">`
#   -> cadre « ㉚ La chaîne vue du graphe … » : INDEX_0BASED = 154, 155ᵉ des 155 — mesures/cadre30-source.html
