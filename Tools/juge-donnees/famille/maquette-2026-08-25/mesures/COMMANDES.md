# Commandes de mesure — juge données ⊥ « La Famille » — 2026-08-25

Stack locale déjà montée (7 conteneurs `mafia-clean-city-*`, Traefik sur http://localhost).
Rien n'a été monté, redémarré ni arrêté. Compte de démo NON touché.

⚠️ PIÈGE RENCONTRÉ ET CONTOURNÉ : `curl -s … > fichier.json` **nu** a produit un fichier
TRONQUÉ à 200 octets terminé par `…` (couche d'affichage du proxy RTK ; cf. socle
« une redirection n'est pas un pipe »). Détecté par `json.load` → `Invalid control character
at line 1 column 201`. Toutes les mesures ont été (re)faites via `rtk proxy curl`, et
chaque fichier a été validé par `json.load` (voir VALIDATION ci-dessous).

## 1. Compte frais
KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > 01-signup.json
# → callsign jd-1787683680, account_id 01a03a40-311e-7d3a-a894-a18ce1b4c1cf

TOKEN=$(python3 -c "import json;print(json.load(open('01-signup.json'))['payload']['data']['access_token'])")
KEY2=$(python3 -c 'import uuid;print(uuid.uuid4())')
curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $KEY2" \
  -d '{"client_version":"1.0.0"}' > 02-session-open.json

## 2. Lectures (toutes en `rtk proxy curl`)
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants                  > 03-lieutenants.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants/$LID             > 04-lieutenant-detail.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/me                           > 05-me.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/recruitment/candidates       > 06-recruitment-candidates.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/recruitment/quests           > 07-recruitment-quests.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/autonomy-reports             > 08-autonomy-reports.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/flag-review                  > 09-flag-review.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/dealers          > 10-dealers.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/couriers         > 11-couriers.json
rtk proxy curl -s                                  http://localhost/v1/i18n/bundle?locale=fr         > 12-i18n-bundle-fr.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/world/districts              > 13-world-districts.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/supply-chain/graph           > 14-supply-chain-graph.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/economy/wallet               > 15-wallet.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/16/interior    > 16-district16-interior.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/meta/task-categories         > 17-task-categories.json
rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/exceptions/queue             > 18-exceptions-queue.json

## VALIDATION
for f in *.json; do python3 -c "import json;json.load(open('$f'))" || echo "TRONQUÉ: $f"; done
