# Commandes exécutées — juge données ⊥ Exceptions, 2026-08-25

Stack locale `mafia-clean-city-*` (Traefik sur `http://localhost`), aucun conteneur monté/redémarré.
Compte FRAIS `jd-1787684713` (jamais `operational_demo@example.test`). Toutes les mesures HTTP par
`curl -o <fichier>` (jamais `curl` nu — couche d'affichage RTK).

    # 1. compte frais
    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
    curl -s -o signup.json -w "HTTP=%{http_code}\n" -X POST http://localhost/v1/auth/signup \
      -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" \
      -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"            # 201
    TOKEN=$(python3 -c "import json;print(json.load(open('signup.json'))['payload']['data']['access_token'])")

    # 2. la file AVANT session/open (la carte d'amorçage est déjà là)
    curl -s -o queue-fresh-avant-session.json -H "Authorization: Bearer $TOKEN" \
      http://localhost/v1/exceptions/queue                            # 200

    # 3. session/open (12 clés de premier niveau, dont queue/backlog_badge/queue_pressure_band/opened_game_day)
    curl -s -o session-open.json -X POST http://localhost/v1/session/open \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
      -d '{"client_version":"juge-donnees-1.0"}'                      # 200

    # 4. archives à vide + roster (la jointure archetype) + /v1/me
    curl -s -o escalations-vide.json -H "Authorization: Bearer $TOKEN" http://localhost/v1/exceptions/escalations
    curl -s -o lieutenants.json     -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants
    curl -s -o me.json              -H "Authorization: Bearer $TOKEN" http://localhost/v1/me

    # 5. resolve — les chemins d'erreur puis le succès
    curl -s -o resolve-422-methode.json  ... -d '{"method":"NOPE","chosen_action_id":"acknowledge"}'   # 422 (énumère les 10 méthodes)
    curl -s -o resolve-422-addrule.json  ... -d '{"method":"ADD_RULE","chosen_action_id":"acknowledge"}'# 422 (non-addable)
    curl -s -o resolve-404-inconnu.json  .../00000000-0000-4000-8000-000000000000/resolve              # 404
    curl -s -o resolve-nonuuid.json      .../pas-un-uuid/resolve                                        # 500  ← défaut
    curl -s -o resolve-corps-vide.json   ... -d '{}'                                                    # 422
    curl -s -o resolve-escalate-200.json ... -d '{"method":"ESCALATE","chosen_action_id":"escalate"}'    # 200 {resolved,outcome:ESCALATED}
    curl -s -o resolve-409-rejeu.json    ... (le même)                                                  # 409
    curl -s -o queue-401.json            (sans Authorization)                                           # 401
    curl -s -o escalations-apres.json    -H "Authorization: Bearer $TOKEN" .../escalations              # total=1, la carte porte resolution_status=escalated

    # 6. clamps de pagination mesurés (limit=0→1, limit=999→100, offset=-5→0, limit=abc→20)
    for q in "limit=0" "limit=999" "offset=-5" "limit=abc"; do curl -s -H "Authorization: Bearer $TOKEN" \
      "http://localhost/v1/exceptions/escalations?$q" -o "esc-$q.json"; done

    # 7. cartes SEMÉES par le seam _test (POST /v1/_test/core-loops/seed-pending-exception),
    #    en recopiant la forme LITTÉRALE lue dans les producteurs — voir _seed-body.json / _seed-heat.json.
    #    (a) carte « riche » (effect + add_rule_dsl + confidence 0.3 + lieutenant) → queue-carte-riche.json (11 clés)
    #    (b) carte « nue »  (candidate_actions [] / suggested_action {}) → queue-carte-nue.json (10 clés)
    #    (c) réplique de la carte CHALEUR DE VILLE (3 issues, aucun `effect`) puis
    #        resolve method=LAY_LOW chosen_action_id=lay_low → resolve-laylow-heat.json : 422.

    # 8. lectures SQL en LECTURE SEULE (aucune écriture)
    docker exec mafia-clean-city-pg-1 psql -U mafia -d mafia_clean_city -tAc \
      "SELECT exception_id,priority,severity,confidence,emitted_at,resolved_at,resolution,resolution_status FROM exception_queue WHERE player_id='<PID>';"
      # → 6fc14788…|20|20|0.8|2026-08-25 19:05:13.877797+00|2026-08-25 19:05:55.852+00|{"method":"ESCALATE","chosen_action_id":"escalate"}|escalated
    docker exec … -tAc "SELECT lieutenant_id,name,name_locale,role_id FROM lieutenant WHERE player_id='<PID>';"
      # → …|Lieutenant|en|1   (×2)  ← la colonne existe, la VALEUR est un placeholder
    docker exec … -tAc "SELECT column_name,data_type FROM information_schema.columns WHERE table_name='buildings' ORDER BY ordinal_position;"
      # → 12 colonnes, AUCUNE colonne de nom
    docker exec … -tAc "SELECT table_name||'.'||column_name FROM information_schema.columns
                        WHERE column_name IN ('name','label','display_name','title') AND table_schema='public' ORDER BY 1;"
      # → 8 lignes : lawyers.name · lieutenant.name · named_sequences.name · region.display_name · telemetry_event(.*).name

    # 9. i18n
    curl -s -o i18n-fr.json "http://localhost/v1/i18n/bundle?locale=fr"   # 67 messages, 0 clé du domaine exceptions
    curl -s -o i18n-en.json "http://localhost/v1/i18n/bundle?locale=en"   # 67 messages

    # 10. surface sœur (précédent de projection du nom + du batch)
    curl -s -o flag-review.json -H "Authorization: Bearer $TOKEN" http://localhost/v1/flag-review
      # → { cards: [], routine_pending_count: 0, batch_confirm_available: false }  (0 carte sur compte frais)

## Oracle indépendant — distribution des `confidence` des 21 producteurs
`python3` sur les 21 fichiers écrivains (regex `^\s*confidence:\s*([0-9.]+),`) :
`{'0.9': 12, '0.8': 6, '0.7': 1, '0.6': 1, '0': 1}` — total 21, **1 seul** sous le seuil 0.6 (strict).
