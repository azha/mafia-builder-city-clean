# Commandes exécutées (toutes via `rtk proxy curl` à partir de 08-*, cf. §Non vérifié piège d'affichage)

    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
    curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
      -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}"        > 01-signup.json
    TOKEN=$(python3 -c "import json;print(json.load(open('01-signup.json'))['payload']['data']['access_token'])")
    curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: <uuid>" -d '{"client_version":"jd-1.0.0"}' > 02-session-open.json
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants                > 03-lieutenants-list.json
    LID=<lieutenants[0].lieutenant_id>
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/lieutenants/$LID           > 04-lieutenant-detail.json
    curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/meta/horizon/execution-plans?lieutenant_id=$LID" > 05-execution-plans.json
    curl -s -H "Authorization: Bearer $TOKEN" "http://localhost/v1/me/reputation?lieutenant_id=$LID"                > 06-me-reputation.json
    docker exec mafia-clean-city-pg-1 psql -U mafia -d mafia_clean_city -A -F'|' \
      -c "SELECT <22 colonnes> FROM lieutenant WHERE lieutenant_id='$LID';"                  > 07-db-lieutenant-row.txt
    rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/flag-review       > 08-flag-review.json
    rtk proxy curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/exceptions/queue  > 09-exceptions-queue.json
    # DIMENSIONNEMENT (le compte frais rend budget_bands:{} et cue_bands:{} — un corps vide n'est pas un ensemble de clés)
    rtk proxy curl -s -X POST .../lieutenants/$LID/autonomy/decision      -d '{"kind":"reset_budget"}'                       > 10-autonomy-decision.json
    rtk proxy curl -s -X POST .../lieutenants/$LID/standing-order         -d '{"rule_source":"WHEN STATE(cook_idle,=,true) THEN EXECUTE_DEFAULT @50;","lapse_action":"REVERT_DEFAULT"}' > 11-standing-order-issue.json
    rtk proxy curl -s      -H ... .../lieutenants/$LID                                                                       > 12-lieutenant-detail-after.json
    rtk proxy curl -s -X POST .../lieutenants/$LID/signal-drift/decision  -d '{"kind":"disrupt_cue","target_cue":"DIRECT_ORDER"}' > 13-signal-drift-decision.json
    rtk proxy curl -s      -H ... .../lieutenants/$LID                                                                       > 14-lieutenant-detail-after2.json
    rtk proxy curl -s      -H ... "/v1/meta/horizon/execution-plans?lieutenant_id=$LID"                                       > 15-execution-plans-after.json
    rtk proxy curl -s -X POST .../lieutenants/$LID/behavior-script        -d '{"source":"WHEN STATE(cook_idle,=,true) THEN EXECUTE_DEFAULT @50;"}' > 16-attach-script.json
    rtk proxy curl -s      -H ... .../lieutenants/$LID                                                                       > 17-detail-after-script.json
    # REFUS (formes)
    rtk proxy curl -s -w 'HTTP=%{http_code}' ... 3 appels                                                                    > 18-refusals.txt
    rtk proxy curl -s      -H ... /v1/autonomy-reports                                                                       > 19-autonomy-reports.json
    rtk proxy curl -s      -H ... /v1/i18n/bundle                                                                            > 20-i18n-bundle.json
    rtk proxy curl -s      -H ... /v1/meta/task-categories                                                                   > 21-task-categories.json
