# 03 : escalade RÉELLE de la carte pré-semée, puis close+open (recompute du hl_card)
curl -X POST /v1/exceptions/$EXC/resolve -d '{"method":"ESCALATE","chosen_action_id":"escalate"}'
curl -X POST /v1/session/close
curl -X POST /v1/session/open -d '{"client_version":"jd-2026-10-09"}'
