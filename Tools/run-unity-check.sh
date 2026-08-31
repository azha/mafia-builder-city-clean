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
#
# ⚠️ CORRECTIF W3.U1/C1-F0 : le log portait `passed=N` (MafiaCI.cs, RunFinished) — la SEULE trace
# qui distingue "le filtre a matché et tout est vert" de "le filtre n'a rien matché" (les deux
# sortent RC=0). Ce script le détruisait sur SES DEUX chemins de sortie avant qu'on ait pu le lire
# — une falsifiable qui interroge cet artefact n'était pas exécutable. LOG_FILE (optionnel) fixe le
# chemin et EN CONSERVE le contenu ; par défaut (LOG_FILE non posé), comportement byte-identique à
# avant (mktemp + suppression) pour tout appelant existant.
#
# ⚠️ CORRECTIF W3.U1 (revue ⊥, addendum @ 4845b0f2) : la revue a d'abord blanchi son propre BLOCKING
# de dépassement de `timeout 600` avec une durée déduite de `mtime` de fichiers (136 s) — puis
# retrouvé, en relisant son PROPRE log, que ce même run avait en réalité tourné **1518 s** et
# terminé en **SIGKILL (137)**, jamais un `EditorApplication.Exit()` propre. Une durée déduite
# indirectement n'est pas une mesure. Ce script imprime désormais SA PROPRE durée écoulée
# (`SECONDS`, bash) dans le log préservé ET sur stdout — un fait mesuré par le processus qui a
# réellement attendu, jamais recalculé après coup depuis des horodatages de fichiers tiers.
set -uo pipefail

: "${UNITY:=/home/erutheone/Unity/Hub/Editor/6000.4.6f1/Editor/Unity}"
# ⚠️ CORRECTIF WORKTREE (mesuré 2026-08-31, session pilote-B) : ce défaut était le chemin EN DUR
# du dépôt principal, alors que le commentaire d'en-tête (ligne 5) promet « sur CE projet ». Dans
# un worktree les deux divergent, et le script visait silencieusement l'arbre d'une AUTRE session.
# Mesuré : le run 18 a été lancé sans `WT=` sur sa ligne (chaque appel shell est neuf, un export
# posé au run précédent ne survit pas) et Unity a répondu
#   « another Unity instance is running with this project open. Project: …/mafia-builder-city-clean »
# — il a donc été arrêté par le VERROU DE L'ÉDITEUR VOISIN, pas par une garde de ce script. Se
# reposer sur le verrou d'autrui n'est pas une protection : si cet éditeur avait été fermé, un
# batchmode complet serait parti sur le projet d'une autre session.
# Le défaut est désormais la racine du dépôt qui CONTIENT ce script, donc toujours l'arbre appelant.
if [[ -z "${WT:-}" ]]; then
  WT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && git rev-parse --show-toplevel 2>/dev/null) \
    || { echo "run-unity-check: impossible de résoudre la racine du dépôt" >&2; exit 2; }
  [[ -n "$WT" ]] || { echo "run-unity-check: racine du dépôt vide" >&2; exit 2; }
fi
: "${LOG_FILE:=}"

EXTRA_ARGS=(-quit)
for a in "$@"; do
  if [[ "$a" == "-executeMethod" ]]; then EXTRA_ARGS=(); fi
done

if [[ -n "$LOG_FILE" ]]; then
  LOG="$LOG_FILE"
  KEEP_LOG=1
else
  LOG=$(mktemp)
  KEEP_LOG=0
fi
# filet de sécurité : sans -quit (chemin -executeMethod), un run qui n'appelle jamais
# EditorApplication.Exit() (exception avant RunFinished, etc.) resterait ouvert pour toujours —
# incendie silencieux (charge machine sans notification, leçon déjà payée sur ce dépôt).
#
# ⚠️ MESURÉ (arbre final W3.U1, addendum revue ⊥, 2026-08-16) : elapsed=559s pour un run vert
# (passed=87 failed=0) avec l'ancien plafond de 600s — 41s de marge, 7%. La durée imprimée
# ci-dessous couvre TOUT l'écart mesuré par la revue (le process Unity reste vivant, CPU actif,
# bien après que MafiaCI ait loggé "finished" et appelé EditorApplication.Exit() — le shutdown
# natif du process, pas la logique de test, domine la fin de la mesure). Sur une machine
# partagée dont la charge varie (swap, process voisins), 7% de marge expose au même faux-rouge
# "TIMEOUT" que celui que cette mesure devait éliminer. Relevé à 900s (61% de marge sur la
# valeur mesurée) plutôt que splitté : aucun signe que la durée croît avec le NOMBRE de tests
# (elle est dominée par le shutdown natif, constant), donc scinder les catégories n'aurait pas
# réduit ce risque — seul monter le plafond le fait.
: "${TIMEOUT_S:=900}"   # surchargeable par l'environnement (voir la note ci-dessus) : une
                        # affectation DURE ici a déjà fait croire à un appelant qu'il avait relevé le
                        # plafond alors que sa variable était écrasée en silence.
SECONDS=0                              # bash : compteur d'écoulé, remis à 0 ici
timeout "$TIMEOUT_S" "$UNITY" -batchmode "${EXTRA_ARGS[@]}" -projectPath "$WT" -logFile "$LOG" "$@"
RC=$?                                  # capturé AVANT tout pipe
ELAPSED_S=$SECONDS

# Durée + issue, écrites dans le log préservé (si KEEP_LOG) ET sur stdout — jamais uniquement
# déduites après coup. `timeout` rend 124 s'IL a dû tuer le process (délai dépassé) ; tout AUTRE
# code >128 signale un signal reçu d'ailleurs (ex. 137 = SIGKILL externe, ce que la revue a mesuré
# une fois) — distingué explicitement, jamais confondu avec un `EditorApplication.Exit()` propre.
if [[ "$RC" == 124 ]]; then
  ISSUE="TIMEOUT (tué par 'timeout ${TIMEOUT_S}s' lui-même)"
elif [[ "$RC" -gt 128 ]]; then
  ISSUE="SIGNAL $((RC - 128)) (tué de l'extérieur, jamais un EditorApplication.Exit propre)"
else
  ISSUE="sortie normale (RC=$RC)"
fi
DURATION_LINE="MafiaCI-harness: elapsed=${ELAPSED_S}s timeout=${TIMEOUT_S}s issue=[$ISSUE]"
echo "$DURATION_LINE"
[[ -n "${LOG_FILE:-}" ]] && echo "$DURATION_LINE" >> "$LOG"

if grep -qF 'error CS' "$LOG"; then
  grep -F 'error CS' "$LOG"
  [[ "$KEEP_LOG" == 0 ]] && rm -f "$LOG"
  exit 1
fi

[[ "$KEEP_LOG" == 0 ]] && rm -f "$LOG"
exit $RC
