#!/usr/bin/env bash
# W4.P4a/C2 — harnais de vérification Unity batchmode.
# usage: run-unity-check.sh [-executeMethod X ...]
#
# Lance Unity en batchmode sur CE projet, capture le code de sortie AVANT tout pipe (aucun
# `| tail`/`| head` ici — ils détruisent le code de sortie, piège commis par la v1 du design),
# et grep le log pour une erreur de compilation qu'un `-quit` propre pourrait laisser passer.
#
# $UNITY et $WT sont liés ICI (pas des raccourcis de document) : le script s'exécute tel quel,
# sans variable d'environnement à poser au préalable. Ils restent overridables si déjà exportés.
#
# ⚠️ CORRECTIF POST-C2 (mesuré pendant C3) : `-quit` inconditionnel court-circuite tout run de
# test ASYNCHRONE lancé via `-executeMethod` (TestRunnerApi.Execute() ne bloque pas ; le process
# a été observé quitter — "Batchmode quit successfully invoked" — AVANT qu'aucune ligne
# "MafiaCI:" n'apparaisse dans le log, càd avant que RunFinished n'ait jamais été appelé. RC=0
# silencieux : un faux vert qui ne prouve rien, exactement le piège nommé par C2/D6). Quand
# `-executeMethod` est présent, on laisse la méthode elle-même appeler EditorApplication.Exit()
# (c'est ce que fait MafiaCI.RunPlayModeTests) ; sinon (contrôle de compilation nu, comme la
# falsifiable de C2), `-quit` reste nécessaire — rien d'autre ne fermerait le process.
set -uo pipefail

: "${UNITY:=/home/erutheone/Unity/Hub/Editor/6000.4.6f1/Editor/Unity}"
: "${WT:=/home/erutheone/project/mafia-builder-city-clean}"

EXTRA_ARGS=(-quit)
for a in "$@"; do
  if [[ "$a" == "-executeMethod" ]]; then EXTRA_ARGS=(); fi
done

LOG=$(mktemp)
# filet de sécurité : sans -quit (chemin -executeMethod), un run qui n'appelle jamais
# EditorApplication.Exit() (exception avant RunFinished, etc.) resterait ouvert pour toujours —
# incendie silencieux (charge machine sans notification, leçon déjà payée sur ce dépôt).
timeout 600 "$UNITY" -batchmode "${EXTRA_ARGS[@]}" -projectPath "$WT" -logFile "$LOG" "$@"
RC=$?                                  # capturé AVANT tout pipe

if grep -qF 'error CS' "$LOG"; then
  grep -F 'error CS' "$LOG"
  rm -f "$LOG"
  exit 1
fi

rm -f "$LOG"
exit $RC
