# Commandes des mesures — juge données ⊥ compression — 2026-08-25

Stack locale dev, 7 conteneurs `mafia-clean-city-*`, Traefik sur `http://localhost` (`docker-ps.txt`).
Aucun conteneur monté ni redémarré. Aucun accès au compte de démo.
Compte utilisé : FRAIS, créé pour cette mesure — `player_id` dans `player_id.txt`
(`01a03a5a-9705-71d8-be51-d2eac1b13664`, callsign dans `00-account.txt`). Jetable.

## 1. Compte frais (aucune fixture)

    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
    curl -s -o signup.json -X POST http://localhost/v1/auth/signup \
      -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
      -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"                       # 201
    TOKEN=$(python3 -c "import json;print(json.load(open('signup.json'))['payload']['data']['access_token'])")
    curl -s -o session-open.json -X POST http://localhost/v1/session/open \
      -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuidgen)" \
      -H 'Content-Type: application/json' -d '{"client_version":"juge-donnees-1.0"}'   # 200
    curl -s -o compression-state.json      -H "Authorization: Bearer $TOKEN" http://localhost/v1/compression/state   # 200
    curl -s -o compression-board-404.json  -H "Authorization: Bearer $TOKEN" http://localhost/v1/compression/board   # 404
    curl -s -o friction-state.json         -H "Authorization: Bearer $TOKEN" http://localhost/v1/friction/state      # 200
    curl -s -o i18n-bundle.json            -H "Authorization: Bearer $TOKEN" 'http://localhost/v1/i18n/bundle?locale=fr'  # 200

Refus sur compte frais : `refus-compression-engage.json` (404), `refus-compression-defer.json` (404),
`refus-decide.json` (404), `refus-decide-badchoice.json` (422 — `choice` absent).

## 2. Fixture « semaine annoncée » (SQL brut, scopé à MON joueur)

Même geste que `tests/e2e/core_loops/compression_board.spec.ts:193-211`
(`seedProgressionState` + `openOpenEventDirect`) — le seul chemin qui ouvre un cycle sans
faire monter `org_stress` par des dizaines de sessions réelles.

    Q(){ docker compose --project-name mafia-clean-city exec -T pg psql -U mafia -d mafia_clean_city -v ON_ERROR_STOP=1 -tAc "$1"; }
    Q "INSERT INTO player_progression_state (player_id, org_stress, compression_week_state)
       VALUES ('$PID', 61, 'warning')
       ON CONFLICT (player_id) DO UPDATE SET org_stress=EXCLUDED.org_stress,
         compression_week_state=EXCLUDED.compression_week_state;"
    Q "INSERT INTO compression_events (player_id,state,opened_at_tick,decisions_budget,stress_at_fire)
       VALUES ('$PID','open',0,5,61) RETURNING id;"

Puis, par les ROUTES JOUEUR réelles uniquement :

    GET  /v1/compression/state                      -> state-warning.json        (200, mounting/warning/true)
    POST /v1/compression/defer                      -> defer-ok.json             (200, {deferred:true})
    GET  /v1/compression/state                      -> state-after-defer.json    (200, deferral_available:false)
    POST /v1/compression/defer                      -> defer-exhausted.json      (409 DEFERRAL_EXHAUSTED)
    POST /v1/compression/engage                     -> engage.json               (200)
    GET  /v1/compression/board                      -> board.json                (200, 1 entrée)
    GET  /v1/compression/state                      -> state-active.json         (200, compression_active/active)
    POST /v1/session/open                           -> session-open-active.json  (200, compression_glance)
    POST /v1/compression/board/problems/<id>/decide -> decide-dismiss-422.json   (422 sur exception_card)
    GET  /v1/compression/board                      -> board-after-dismiss.json  (200, used 0->1 MALGRÉ le 422)
    POST .../decide {choice:skip}                   -> decide-skip.json          (200, finalized:true)
    GET  /v1/compression/board                      -> board-after-finalize.json (404)
    GET  /v1/compression/state                      -> state-after-finalize.json (200, calm/none/false)

## 3. Contrôle POSITIF de `dismiss` (cycle 2, avec un `flag` réel)

    Q "INSERT INTO flagged_items (player_id, lieutenant_id, routine_item_descriptor, flag_reason,
        deviation_score_internal, emitted_tick, game_day, resolution)
       VALUES ('$PID','$LT','{}'::jsonb,'{\"key\":\"flag.jd.test\"}'::jsonb,0.7,0,1,'pending') RETURNING flag_id;"
    (+ re-seed warning/open event)
    POST /v1/compression/engage                     -> engage2.json              (200)
    GET  /v1/compression/board                      -> board2.json               (200, 2 entrées : exception_card + flag)
    POST .../decide {choice:dismiss} sur le `flag`  -> decide-dismiss-flag-ok.json (200)   <-- CONTRÔLE POSITIF
    GET  /v1/compression/board                      -> board2-after-dismiss.json (200, addressed:true sur le flag)
    POST .../decide {choice:skip}                   -> decide-skip2.json         (200, finalized:true)

`decision_ref` en base après ce cycle (jamais projeté) :

    Q "SELECT source_kind||' :: addressed='||(addressed_at IS NOT NULL)::text
         ||' :: decision_ref='||COALESCE(decision_ref::text,'NULL')
         ||' :: persisted='||persisted::text
       FROM compression_problem_entry WHERE player_id='$PID' ORDER BY source_kind;"
    exception_card :: addressed=true :: decision_ref={"choice": "skip", "applied": false} :: persisted=false
    exception_card :: addressed=true :: decision_ref={"choice": "skip", "applied": false} :: persisted=false
    flag           :: addressed=true :: decision_ref={"verb": "dismiss_flag", "choice": "dismiss",
                                        "result": {"verdict":"dismissed","resolved":true,"token_returned":false},
                                        "applied": true} :: persisted=false

## 4. `crushing` + FORCED_ENGAGEMENT (org_stress=96)

    Q "UPDATE player_progression_state SET org_stress=96, compression_week_state='warning' WHERE player_id='$PID';"
    Q "INSERT INTO compression_events (...) VALUES ('$PID','open',0,5,96) RETURNING id;"
    GET  /v1/compression/state -> state-crushing.json  (200, {crushing, warning, false})
    POST /v1/compression/defer -> defer-forced.json    (409 FORCED_ENGAGEMENT)

## 5. Épuisement du budget par des refus 422 (cycle 3)

    POST /v1/compression/engage -> engage3.json ; GET board -> board3.json (1 entrée exception_card)
    6 x POST .../decide {choice:"dismiss"} sur cette entrée :
      budget-1..5.json -> 422 VALIDATION_FAILED  (le budget est consommé À CHAQUE FOIS)
      budget-6.json    -> 409 COMPRESSION_BUDGET_EXHAUSTED
    GET board -> board3-exhausted.json : decisions_used=5, decisions_remaining=0,
                 l'unique entrée TOUJOURS addressed:false, cycle TOUJOURS actif (pas de finalize).
