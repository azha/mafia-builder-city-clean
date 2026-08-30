# Commandes de mesure — juge données ⊥ police — 2026-08-25

Compte FRAIS (`jdpol-1787686176`), stack dev locale (`mafia-clean-city-*`, Traefik sur `http://localhost`).
Aucun conteneur monté ni redémarré ; compte de démo jamais touché. Toutes les sorties sont dans `mesures/`.

```bash
# 1. signup (Idempotency-Key requis — auth.controller.ts:240) → mesures/01-signup.json
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jdpol-$(date +%s)"
curl -s -o mesures/01-signup.json -w "http=%{http_code}\n" -X POST http://localhost/v1/auth/signup \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
  -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"          # → 201 ; jeton à payload.data.access_token

# 2. session/open (client_version obligatoire — session.controller.ts:60-63) → mesures/02-session-open.json
curl -s -o mesures/02-session-open.json -X POST http://localhost/v1/session/open \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"client_version":"juge-donnees-police"}'                # → 200, 12 clés

# 3. les 30 routes police sur COMPTE FRAIS → mesures/03-fresh-codes.txt  (30 × 404)
for i in $(seq 1 18); do curl -s -o mesures/fresh/inspection-$i.json -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/$i/inspection; done
for i in $(seq 1 6); do curl ... /v1/city/precinct/$i/belief ; curl ... /v1/city/precinct/$i/patrol ; done

# 4. player_id (le spec E2E fait pareil — inspection_queue.spec.ts:102-108)
rtk proxy docker exec -i mafia-clean-city-pg-1 psql -U mafia -d mafia_clean_city -tAc \
  "SELECT player_id FROM player WHERE callsign='$CS';"          # 01a03a66-464a-71e3-8255-24e4bf6e9d65

# 5. DIMENSIONNEMENT — seam `_test` (inspection_queue.spec.ts:234) : 1 jour in-game
curl -s -o mesures/05-advance-1440.json -X POST \
  "http://localhost/v1/_test/citysim/advance?ticks=1440&player_id=$PID" \
  -H "Idempotency-Key: $(uuidgen)" -H 'Content-Type: application/json' -d '{}'
#   → twelve_h:2, nightly:1 ; puis re-mesure → mesures/06-apres1j-codes.txt (30 × 200)
# puis 6 jours de plus (ticks=8640) → mesures/08-apres7j-codes.txt (30 × 200), corps dans mesures/apres-7j/

# 6. action FILE : 9 dépôts → mesures/15-flood.txt (backlash_triggered=true au 8e)
curl -s -X POST http://localhost/v1/city/inspection/report -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen)" \
  -d '{"building_id":42,"entry_type":"FALSE_REPORT"}'           # → 201
# le même avec un uuid de bâtiment réel → mesures/13-report-uuid.json → 422 VALIDATION_FAILED

# 7. portefeuille avant/après → mesures/10-wallet-avant.json, mesures/12-wallet-apres.json (delta 0)
# 8. world/districts SANS en-tête d'autorisation → mesures/14-world-districts.json (200, 18 lignes)
# 9. bornes → mesures/18-erreurs.txt (district 0/19/abc → 422 ; précinct 0/7/abc → 422 ; sans jeton → 401)
```

⚠️ Tout `curl` est passé avec `-o fichier` (jamais de sortie au terminal), chaque fichier relu par
`json.load`. Tout `docker exec` est passé par `rtk proxy` (le proxy nu rend une erreur d'usage).
