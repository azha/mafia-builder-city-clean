#!/usr/bin/env bash
# Fermeture EXPLICITE de la session du juge (dossier.md §⛔ — le gouverneur de décisions
# structurelles ne mord que si une session active existe ; une session laissée ouverte a
# déjà fait tomber 59 tests sur ce dépôt).
set -u
cd "$(dirname "$0")"
curl -s -X POST http://localhost/v1/session/close \
  -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(python3 -c 'import uuid;print(uuid.uuid4())')" -d '{}' \
  > 90-session-close.json
python3 -m json.tool 90-session-close.json
