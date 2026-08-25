# Commandes de mesure — juge données ⊥ « La Revue du jour » — 2026-08-25

Stack : dev locale déjà montée (7 conteneurs, `docker-ps.txt`), Traefik sur `http://localhost`.
Aucun conteneur monté ni arrêté par ce jugement. Compte FRAIS créé pour cette passe
(`00-context.txt` : callsign), jamais le compte de démo piloté par l'éditeur Unity.

## 1. Compte frais + session

```
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > signup.json
TOKEN=$(python3 -c "import json;print(json.load(open('signup.json'))['payload']['data']['access_token'])")
# session/open — client_version REQUIS (session.controller.ts:60-63 -> 422 sans lui, mesuré)
curl -s -X POST http://localhost/v1/session/open -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"client_version":"jd-1.0.0"}' > session-open.json
```
→ `session-open.json` (compte frais, 0 flag) · `session-open-seeded.json` (2 flags pendants).

## 2. Corps à vide

```
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/flag-review > flag-review-fresh.json
```
→ `{"cards":[],"routine_pending_count":0,"batch_confirm_available":false}` — **un corps vide n'est pas
un ensemble de clés** ⇒ scénario dimensionné ci-dessous.

## 3. Dimensionnement (mêmes gestes que `tests/e2e/core_loops/flag_review_surface.spec.ts`)

Seed SQL direct dans le conteneur pg (helper `runsql` du spec, `flag_review_surface.spec.ts:100-104`),
scopé au SEUL joueur frais de cette passe :

```
q(){ docker compose --project-name mafia-clean-city exec -T pg psql -U mafia -d mafia_clean_city \
       -v ON_ERROR_STOP=1 -tAc "$1" | head -1; }
# 2 lieutenants (nom réel : le back projette lieutenant.name sur la carte)
q "INSERT INTO behavior_script DEFAULT VALUES RETURNING script_id;"
q "INSERT INTO lieutenant (player_id,name,name_locale,role_id,source,behavior_script_id)
   VALUES ('<pid>','Salvatore','fr',6,'civilian','<script>') RETURNING lieutenant_id;"
# 2 routine_items à flagger (game_day 11 et 12) + 17 routine_items 'pending' non flaggés
q "INSERT INTO routine_items (player_id,game_day,generator,dedup_key,responsible_role_id,
   lieutenant_id,status,descriptor,deviation_score_internal) VALUES (...) RETURNING routine_item_id;"
# le seam de création de flag (CoreLoopsTestController, core-loops-test.controller.ts:670)
curl -s -X POST http://localhost/v1/_test/core-loops/force-flag -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuid)" -d '{"routineItemId":"<ri>"}'
# les 3 bandes de trust_budget_bucket, par le compte de jetons (max=5 par défaut)
curl -s -X POST http://localhost/v1/_test/core-loops/set-tokens -d '{"lieutenantId":..,"playerId":..,"tokens":1|3|5}'
```

Corps obtenus :
- `flag-review-seeded.json`   — 2 cartes, `trust_budget_bucket` **low** (1/5) et **high** (5/5),
                                `routine_pending_count: 17`, `batch_confirm_available: true`
- `flag-review-standard.json` — contrôle positif de la 3ᵉ bande : **standard** (3/5)
- `session-open-seeded.json`  — `flag_review: {pending_review_count: 2, auto_open: true}`

## 4. Routes d'action (corps réels)

```
curl -s -X POST http://localhost/v1/flag-review/<flagId>/validate -H "Authorization: Bearer $TOKEN" ...
curl -s -X POST http://localhost/v1/flag-review/<flagId>/dismiss  ...
curl -s -X POST http://localhost/v1/flag-review/batch-confirm     ...
```
- `validate.json`        → 200 `{"resolved":true,"verdict":"validated","token_returned":true}`
- `validate-again.json`  → 409 `RESOURCE_STATE_CONFLICT`
- `validate-404.json`    → 404 `RESOURCE_NOT_FOUND` (flag inexistant / non possédé)
- `dismiss.json`         → 200 `{"resolved":true,"verdict":"dismissed","token_returned":false}`
- `batch-confirm.json`   → 200 `{"batch_confirmed_count":17}`
- `batch-confirm-2.json` → 200 `{"batch_confirmed_count":0}` (idempotent)
- `flag-review-after.json` → cartes vidées, `routine_pending_count: 0`

## 5. Routes adjacentes du domaine

```
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants          > lieutenants.json
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants/<lid>    > lieutenant-detail.json
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/1/heat > heat-district1.json
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/1/cohesion > cohesion-district1.json
```
- `lieutenants.json`       → 4 objets, clés `lieutenant_id, archetype, op_state_band, rule_count_band, tenure_bucket` — **pas de `name`**
- `lieutenant-detail.json` → porte `trust_budget_bucket: "standard"` ET `flag_frequency_band: "occasional"`
- `heat-district1.json`    → `{"district":"district-1","district_bucket":"COLD","citywide_bucket":"COLD","escalated":false,"buildings":[]}` — bucket INSTANTANÉ par district, jamais une tendance
- `cohesion-district1.json`→ **404** sur compte frais (« the city sim has not ticked nightly »)
