# Commandes exécutées (stack locale, Traefik `http://localhost`, 2026-08-25 ~19:29-19:32 UTC)

Toutes les mesures passent par `curl -o <fichier>` (jamais une sortie nue lue au terminal) puis
`python3 -c "json.load(...)"` — cf. mandat § Règles de mesure.

## Compte frais n°1 — `00-context.txt` porte le callsign et l'Idempotency-Key

    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-cmpt-$(date +%s)"
    curl -s -o 01-signup.json -w "HTTP %{http_code}\n" -X POST http://localhost/v1/auth/signup \
      -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
      -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"      # → HTTP 201
    TOKEN=$(python3 -c "import json;print(json.load(open('01-signup.json'))['payload']['data']['access_token'])")

    # 02-pre-*.json — les 7 routes de lecture AVANT session/open (toutes 200)
    for r in me economy/wallet progression ui/tutorial-state me/iap/balance me/iap/entitlements iap/catalogue; do
      curl -s -o "02-pre-$(echo $r | tr '/' '_').json" -w "%{http_code}\n" \
        -H "Authorization: Bearer $TOKEN" "http://localhost/v1/$r"
    done

    # 03-session-open.json (200) — client_version obligatoire
    curl -s -o 03-session-open.json -X POST http://localhost/v1/session/open \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d '{"client_version":"jd-1.0.0"}'

    # 04-post-*.json — les mêmes routes APRÈS session/open (corps identiques, cf. rapport §Non vérifié)

    # 05/06 — le tutoriel consigné puis relu
    curl -s -o 05-patch-tutorial.json -X PATCH http://localhost/v1/ui/tutorial \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d '{"tutorial_id":"tutorial.exception_card.onboarding_preseed"}'      # → 200
    curl -s -o 06-state-after-shown.json -H "Authorization: Bearer $TOKEN" \
      http://localhost/v1/ui/tutorial-state

    # 07 — opt-out dans les DEUX sens, avec relecture d'état à chaque fois
    for v in true false; do
      curl -s -o "07-optout-$v.json" -X PATCH http://localhost/v1/ui/tutorial-opt-out \
        -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
        -d "{\"tutorials_opt_out\":$v}"
      curl -s -o "07-state-optout-$v.json" -H "Authorization: Bearer $TOKEN" \
        http://localhost/v1/ui/tutorial-state
    done

    # 14 — déconnexion, puis preuve que le jeton est mort
    curl -s -o 14-signout.json -X POST http://localhost/v1/auth/signout \
      -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')"   # → 200
    curl -s -o 14-me-after-signout.json -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      http://localhost/v1/me                                   # → 401 AUTH_TOKEN_INVALID_SIGNATURE

## Compte frais n°2 — `locale: "fr"` au signup, opt-out AVANT tout `shown`

    curl -s -o 10-signup2.json -X POST http://localhost/v1/auth/signup ... -d '{...,"locale":"fr"}'
    curl -s -o 10-me2.json     -H "Authorization: Bearer $T2" http://localhost/v1/me
    curl -s -o /dev/null -X POST http://localhost/v1/session/open -H ... -d '{"client_version":"jd-1.0.0"}'
    curl -s -o 11-optout-true.json  -X PATCH http://localhost/v1/ui/tutorial-opt-out ... -d '{"tutorials_opt_out":true}'
    curl -s -o 11-state-optout.json -H "Authorization: Bearer $T2" http://localhost/v1/ui/tutorial-state
    curl -s -o 12-put-visibility.json -X PUT http://localhost/v1/me/meta-market/visibility ... -d '{"enabled":false}'   # → 200
    curl -s -o 12-me-after-visibility.json -H "Authorization: Bearer $T2" http://localhost/v1/me

## Compte frais n°3 — locale NON supportée + adresse fournie

    curl -s -o 15-signup-locale-zz.json -X POST http://localhost/v1/auth/signup ... \
      -d '{...,"locale":"zz-ZZ","email":"<callsign>@example.test"}'    # → 201, accepté
    curl -s -o 15-me-locale-zz.json -H "Authorization: Bearer $T3" http://localhost/v1/me

## i18n

    curl -s -o 13-i18n-fr.json   "http://localhost/v1/i18n/bundle?locale=fr"    # → 200
    curl -s -o 13-i18n-en.json   "http://localhost/v1/i18n/bundle?locale=en"
    curl -s -o 13-i18n-none.json "http://localhost/v1/i18n/bundle"              # → locale "en"
