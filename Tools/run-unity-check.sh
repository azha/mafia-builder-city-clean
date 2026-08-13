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
set -uo pipefail

: "${UNITY:=/home/erutheone/Unity/Hub/Editor/6000.4.6f1/Editor/Unity}"
: "${WT:=/home/erutheone/project/mafia-builder-city-clean}"

LOG=$(mktemp)
"$UNITY" -batchmode -quit -projectPath "$WT" -logFile "$LOG" "$@"
RC=$?                                  # capturé AVANT tout pipe

if grep -qF 'error CS' "$LOG"; then
  grep -F 'error CS' "$LOG"
  rm -f "$LOG"
  exit 1
fi

rm -f "$LOG"
exit $RC
