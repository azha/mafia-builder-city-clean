#!/usr/bin/env bash
# Juge données ⊥ ⑮ — DIMENSIONNEMENT ASSUMÉ, sur MON compte frais uniquement (jamais un compte partagé).
# La mutation POST /v1/city/inspection/report n'avait AUCUN corps réel au 04/09 ("mutation — pas de
# corps réel"). Elle est ici appelée avec la forme que le CLIENT envoie : building_id ENTIER
# (InspectionClient.cs:63 construit `{"building_id":<int>,"entry_type":"<str>"}`).
set -u
D="$(cd "$(dirname "$0")" && pwd)"; TOKEN=$(cat "$D/.token")
for t in GENUINE_REPORT FALSE_REPORT; do
  curl -s -o "$D/POST-report-$t.json" -w "POST report $t HTTP %{http_code}\n" \
    -X POST http://localhost/v1/city/inspection/report \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
    -d "{\"building_id\":1001,\"entry_type\":\"$t\"}"
done
# la file est-elle créée par le dépôt ? (chaîne de préconditions)
curl -s -o "$D/GET-inspection-d1-apres-report.json" -w 'GET inspection d1 APRES report HTTP %{http_code}\n' \
  -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/1/inspection
