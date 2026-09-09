# Commandes exécutées — juge données ⊥, ① intérieur de district + ② fiche, clôture 2026-09-07

Stack : `http://localhost` (Traefik → game-back recréé le 07/09). Dépôt back lu en LECTURE seule,
`HEAD = b1d61f018158ac363bc6b076f80db089af514c4f` (`main`) — `3117f159` (SHA annoncé par le dossier)
est ANCÊTRE de ce HEAD (`git merge-base --is-ancestor 3117f159 HEAD` → 0). Le SHA de l'IMAGE reste
**DÉDUIT** : aucune route ne l'imprime.

## Compte FRAIS (jamais `operational_demo@…`, jamais `demo_capture@…`)

    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
    curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
      -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > 01-signup.json
    # jeton : payload.data.access_token (auth.controller.ts:255 `@Post('signup')`)
    TOKEN=$(python3 -c "import json;print(json.load(open('01-signup.json'))['payload']['data']['access_token'])")
    curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $TOKEN" -d '{"client_version":"juge-donnees-1.0"}' > 02-session-open.json

Identité du compte : voir `00-compte-frais.txt` (callsign, clé d'idempotence, date).

## Lectures (toutes en GET, jeton du compte frais)

    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/world/districts           > 03-world-districts.json
    for i in $(seq 1 18); do
      curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/$i/interior > 04-interior-$i.json
    done
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/me/buildings               > 05-me-buildings.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/16/heat      > 06-heat-16.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/economy/wallet             > 07-economy_wallet.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/me                         > 07-me.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/laundering     > 08-laundering.json
    curl -s "http://localhost/v1/i18n/bundle?locale=fr"                                      > 09-i18n-bundle-fr.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/16/stash     > 10-stash-16.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/dealers        > 11-dealers.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/city/district/16/unconformity > 17-unconformity-16.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/operational/building/<id>  > 16-building-card-<id>.json

## ⚠️ UNE (1) MUTATION, DÉCLARÉE — nécessaire à DIMENSIONNER la question Q4 (« BLANCHIR »)

Le front (archive `d5ddc40`, `DistrictInteriorScreenController.cs:2058-2061`) désactive le CTA
BLANCHIR sur l'affirmation « rend **404 POUR TOUT LE MONDE, DANS TOUS LES ENVIRONNEMENTS** ».
Seule la requête tranche. Faite sur MON compte frais, une fois, avec `amount_cents:1` :

    curl -s -o 12-laundering-inject.json -w "HTTP %{http_code}\n" \
      -X POST http://localhost/v1/operational/laundering/inject \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
      -d '{"front_shop_id":"e0c38061-…","safehouse_id":"4b29152f-…","amount_cents":1}'
    → HTTP 200

Puis re-lectures : `13-laundering-apres.json`, `14-laundering-pipeline.json`,
`15-interior-16-apres.json` (delta de l'intérieur après l'inject : **aucun champ ne bouge**).

Aucune route `_test`, aucun `advance`, aucun tick, aucun seed.

## Inventaire de routes (oracle Python, jamais un compte lu au terminal)

Balayage des **148** `*.controller.ts` de `services/game-back/src` : **1029** décorateurs de route,
**169** sous `JwtAuthGuard`, dont **36** appartiennent au domaine de cet écran (chemin contenant
`city/district`, `world/district`, `me/buildings`, `operational/building`, `operational/dealer`,
`operational/laundering`, `economy/wallet`, `session/open`, `i18n/bundle`, hors `_test`/`admin`).
Sortie complète : `18-routes-domaine.txt`.
