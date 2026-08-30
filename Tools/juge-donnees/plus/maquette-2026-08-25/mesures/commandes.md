# Commandes exécutées (juge données ⊥ — Plus — 2026-08-25)

Stack locale dev, Traefik sur http://localhost. Compte FRAIS (jamais le compte de démo).
Aucun conteneur monté/redémarré. Tout `curl` par chemin absolu `/usr/bin/curl -o <fichier>`
(le `curl` nu est proxifié : sa sortie peut être remplacée par un résumé de schéma).
Chaque fichier a été validé par `json.load`.

## Compte
    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-plus-$(date +%s)"
    curl -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
      -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"   # 201 -> 01-signup.json
    # callsign  jd-plus-1787685599   player_id 01a03a5d-787e-7478-9b74-36bd8a7ed268
    curl -X POST http://localhost/v1/session/open -H "Authorization: Bearer $TOKEN" \
      -d '{"client_version":"jd-1.0.0"}'                                              # 200 -> 02-session-open.json

## Lectures (GET, Bearer)
    /v1/cue-stack/current                    200 -> 03-cue-stack-current.json   (vide)
    /v1/flag-review                          200 -> 04-flag-review.json         (cards vide)
    /v1/recruitment/quests?status=active     200 -> 05-recruitment-quests-active.json (vide)
    /v1/recruitment/quests                   200 -> 05b-recruitment-quests-all.json
    /v1/compression/state                    200 -> 06-compression-state.json
    /v1/compression/board                    404 -> 07-compression-board.json    (RESOURCE_NOT_FOUND)
    /v1/recruitment/candidates               200 -> 08-recruitment-candidates.json (vide)
    /v1/cue-stack/named-sequences            403 -> 09-named-sequences.json      (NAMED_SEQUENCE_UNLOCK_REQUIRED, tier 1)
    /v1/city/district/1/inspection           404 -> 10-inspection-d1.json        (city sim non tickée)
    /v1/city/district/2/inspection           404 -> (idem)
    /v1/me                                   200 -> 11-me.json
    /v1/city/precinct/1/patrol               404 -> 12-precinct1-patrol.json
    /v1/city/precinct/1/belief               404 -> 13-precinct1-belief.json
    /v1/i18n/bundle                          200 -> 14-i18n-bundle.json
    /v1/meta/complexity-budget               200 -> 15-complexity-budget.json
    /v1/meta/capability-debts                200 -> 16-capability-debts.json
    /v1/autonomy-reports                     200 -> 17-autonomy-reports.json     (reports vide)
    /v1/friction/state                       200 -> 18-friction-state.json
    /v1/friction/replacement-options         200 -> 19-replacement-options.json  (options vide)
    /v1/annealing/rolling-queue              200 -> 20-annealing-rolling-queue.json (4 bâtiments touchables)
    /v1/exceptions                           404 -> 21-exceptions.json           (pas de route à ce chemin)

## Dimensionnement par ACTIONS JOUEUR réelles (aucun seam _test)
    POST /v1/cue-stack/compose  (5 slots MAINTENANCE_BATCH sur les 4 bâtiments touchables)
                                             200 -> 22-compose.json   (corps: compose-body.json)
    GET  /v1/cue-stack/current               200 -> 23-current-pending.json    state=pending, 5 slots
    POST /v1/cue-stack/commit  {}            200 -> 24-commit.json
    GET  /v1/cue-stack/current               200 -> 25-current-committed.json  state=committed, 5 slots TOUS status=pending
    POST /v1/cue-stack/reorder (mêmes slots) 409 -> 26-reorder-after-commit.json  RESOURCE_STATE_CONFLICT

## Dimensionnement par SEAM _test (déclaré — aucun chemin joueur ne crée de candidat sur compte frais)
    POST /v1/_test/recruitment/replenish-saltline {player_id}   201 -> 27-replenish.json  (4 candidats)
    GET  /v1/recruitment/candidates                             200 -> 28-candidates.json  (4)
    POST /v1/recruitment/quests {candidate_id, quest_type:saltline}  201 -> 29-quest-start.json   [ACTION JOUEUR]
    GET  /v1/recruitment/quests?status=active                   200 -> 30-quests-active.json
         -> 1 quête, session_ready=false, next_session_ready_at_game_minute=2220

## Idempotence de session/open (rafraîchissement des glances)
    POST /v1/session/open (2e appel)         200 -> 31-session-open-2.json   MÊME session_id

## Oracle de routes (indépendant du terminal)
    scratchpad/routes.py -> routes.json : parse les 144 *.controller.ts de services/game-back/src
    total 1017 décorateurs · 680 _test · 164 sous JwtAuthGuard
    (calibration : le 1017 recoupe le compte du socle CLAUDE.md « 1 017 routes réelles »)
