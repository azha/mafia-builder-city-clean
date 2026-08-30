# Commandes exactes des mesures (2026-08-25, stack locale dev, compte FRAIS `jd-1787685073`)

Toutes les mesures via `curl -o <fichier>` (jamais de sortie nue — la couche d'affichage tronque),
chaque fichier validé par `json.load`.

```bash
# 01 — signup (Idempotency-Key REQUIS, auth.controller.ts:238-241) ; jeton à payload.data.access_token
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
curl -s -o 01-signup.json -X POST http://localhost/v1/auth/signup \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"          # 201

TOKEN=$(python3 -c "import json;print(json.load(open('01-signup.json'))['payload']['data']['access_token'])")

# 02 — session/open (client_version obligatoire, session.controller.ts:57-63)
curl -s -o 02-session-open.json -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"client_version":"juge-donnees-1.0"}'                    # 200

# 03..06 — lectures sur compte frais
curl -s -o 03-cue-stack-current-frais.json     http://localhost/v1/cue-stack/current           -H "Authorization: Bearer $TOKEN"  # 200
curl -s -o 04-named-sequences-list-palier1.json http://localhost/v1/cue-stack/named-sequences  -H "Authorization: Bearer $TOKEN"  # 403
curl -s -o 05-progression.json                  http://localhost/v1/progression                -H "Authorization: Bearer $TOKEN"  # 200
curl -s -o 06-annealing-rolling-queue.json      http://localhost/v1/annealing/rolling-queue    -H "Authorization: Bearer $TOKEN"  # 200

# 08 — compose 4 MAINTENANCE_BATCH sur les 4 bâtiments du kit (cibles lues en 06.touchable)
curl -s -o 08-compose.json -X POST http://localhost/v1/cue-stack/compose \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d @07-compose-body.json   # 200

# 11 — route SAUVEGARDÉE créée par ACTION JOUEUR (route.service.ts:203 is_saved:true)
curl -s -o 11-create-route.json -X POST http://localhost/v1/operational/routes \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"originBlock":1501,"destBlock":1502,"vehicleType":"foot","stance":"balanced","routeName":"jd-route-1"}'  # 201

# 12 — SEED déclaré (route _test) : le bassin de candidats est VIDE sur compte frais
curl -s -o 12-replenish-saltline.json -X POST http://localhost/v1/_test/recruitment/replenish-saltline \
  -H 'Content-Type: application/json' -d "{\"player_id\":\"$PID\"}"                                 # 201, inserted:4

# 15/18/19/20 — compose mixte 3 types, reorder, commit sans/avec acquittement
curl -s -o 15-compose-mixte.json -X POST http://localhost/v1/cue-stack/compose  ... -d @14-compose-mixte-body.json  # 200
curl -s -o 18-reorder.json       -X POST http://localhost/v1/cue-stack/reorder  ... -d @17-reorder-body.json        # 200
curl -s -o 19-commit-sans-ack.json -X POST http://localhost/v1/cue-stack/commit ... -d '{}'                          # 409 SETTLING_COMPOUND_REQUIRED
curl -s -o 20-commit-ack.json      -X POST http://localhost/v1/cue-stack/commit ... -d '{"acknowledge_compounding":true}' # 200

# 27/32 — SEAM déclaré (route _test) : le tick d'exécution. NODE_ENV=development et
# CITYSIM_CONTINUOUS_LOOPS ABSENT du conteneur ⇒ l'horloge est épinglée, la pile ne s'exécute JAMAIS
# organiquement sur cette stack. `runTick` est la MÊME méthode que le créneau MINUTE/29.
curl -s -o 27-tick-N.json -X POST http://localhost/v1/_test/cue-stack/run-execution-tick \
  -H 'Content-Type: application/json' -d "{\"playerId\":\"$PID\",\"gameMinute\":<M>}"               # 200

# SEED SQL déclaré (compte jetable, jamais le compte de démo) — atteindre le palier 2 par le chemin
# joueur demande K signaux ADD_RULE distincts ET N exceptions traitées (progression.service.ts:29-33) :
docker exec mafia-clean-city-pg-1 psql -U mafia -d mafia_clean_city -tAc \
  "update player_progression_state set rule_vocabulary_tier=2 where player_id='<PID>' returning rule_vocabulary_tier;"

# 41..46 — séquences nommées au palier 2
curl -s -o 41-named-seq-save.json -X POST http://localhost/v1/cue-stack/named-sequences ... -d '{"name":"Tournee du matin"}'  # 201
curl -s -o 42-named-seq-list.json       http://localhost/v1/cue-stack/named-sequences   ...                                    # 200
curl -s -o 44-apply.json          -X POST http://localhost/v1/cue-stack/named-sequences/$SEQ/apply ...                         # 200
curl -s -o 46-apply-nonuuid.json  -X POST http://localhost/v1/cue-stack/named-sequences/pas-un-uuid/apply ...                  # 500 ⚠

# 47 — bundle i18n
curl -s -o 47-i18n-bundle.json http://localhost/v1/i18n/bundle -H "Authorization: Bearer $TOKEN"   # 200, 67 messages, locale=en
```
