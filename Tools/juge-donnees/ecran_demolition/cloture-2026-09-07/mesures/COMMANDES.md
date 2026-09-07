# Commandes exécutées — juge données ⊥ ㉝ — 2026-09-07 (04:23–04:26 UTC)

Compte FRAIS créé pour cette mesure : `jd-1788755035` (voir `B/00-compte.txt`).
⛔ Aucun appel sur `operational_demo@…` ni `demo_capture@…`. Aucune route `_test`. Aucun `advance`/tick.
Toutes les mutations sont sur MON compte frais et sont déclarées ci-dessous (dimensionnement).

## Amorce
    curl -s -o /dev/null -w "%{http_code}" "http://localhost/v1/i18n/bundle?locale=fr"      -> 200
    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
    curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
      -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"        -> B/01-signup.json
    # jeton lu à payload.data.access_token (AuthClient lit le même champ)
    curl -s -X POST http://localhost/v1/session/open -H "Authorization: Bearer $TOKEN" \
      -d '{"client_version":"juge-donnees-2026-09-07"}'                                     -> B/02-session-open.json

## Lectures (aucune mutation)
    GET /v1/friction/state                      -> B/10-friction-state.json
    GET /v1/friction/replacement-options        -> B/11-replacement-options.json
    GET /v1/world/districts                     -> B/12-world-districts.json
    GET /v1/city/district/{1..18}/interior      -> B/interior/<id>.json   (balayage des 18, comme l'écran)
    GET /v1/friction/nodes/{uuid} × 4           -> B/nodes/<uuid>.json
    GET /v1/me/buildings                        -> B/30-me-buildings.json      ⚠ route que l'écran N'APPELLE PAS

## Refus (aucune mutation d'état)
    POST /v1/friction/nodes/{1502}/decommission  {}               -> B/20-decomm-sans-confirm.json  (422)
    POST /v1/friction/nodes/{1501}/decommission  {"confirm":true} -> B/21-decomm-lieutenant.json    (409)

## DIMENSIONNEMENT — mutations assumées, sur mon compte frais UNIQUEMENT
Motif : `friction/replacement-options` rend `[]` tant qu'aucune parcelle n'est libérée ; la moitié
droite de la maquette (m-82/84) n'est pas mesurable autrement. Aucune route joueur ne peuplerait
cette liste sans une démolition réelle.
    POST /v1/friction/nodes/{1502}/decommission {"confirm":true}  -> B/22-decomm-ok.json   (200)
    GET  /v1/friction/replacement-options                         -> B/23-options-apres.json
    GET  /v1/friction/state                                       -> B/24-state-apres.json
    POST /v1/friction/replacement-options/{rang1}/pick {}         -> B/25-pick.json        (409)
    GET  /v1/friction/replacement-options                         -> B/26-options-apres-pick.json
    GET  /v1/friction/state                                       -> B/27-state-apres-pick.json
    GET  /v1/city/district/16/interior                            -> B/28-interior16-apres.json

## Inventaires
    M : mesures/M/maquette-cadres-brut.txt · maquette-cadres-lisible.txt (lignes 5069/5071/5073/5075/5077/5079
        de `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`)
    F : mesures/F/usages-champs.txt (comptes de lecture par champ, scopés aux 2 fichiers de l'écran ;
        contrôle positif : `friction_node_count` -> 1 hit avec le MÊME motif qui rend 0 sur
        `perimeter_site_count`, donc le motif mord)

## Note de mesure
Tout compte qui décide est passé par un fichier + `python3`. Une lecture directe au terminal a été
tronquée une fois (`{"...friction_..."`), confirmant que la couche d'affichage n'est pas opposable.
