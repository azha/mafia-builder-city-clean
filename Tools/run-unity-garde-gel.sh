#!/bin/bash
# Lanceur de PASSAGE avec chien de garde de GEL (créneau du 2026-09-23, passages 2 à 4) — forme de passage, en attendant la garde
# permanente dans `run-unity-check.sh`.
# ⚠️ DEPUIS LA GARDE PERMANENTE (même jour), `run-unity-check.sh` fait la même chose SEUL (STALL_S, défaut 420, RC_GEL=5, test nommé) :
#    ce lanceur n'est plus nécessaire ; il reste pour les arbres qui n'ont pas encore mergé la garde.
# POURQUOI : `ManometreOracle.Oracle1` a gelé le fil principal de l'éditeur 30 min (journal muet, CPU ≈ 378 %) sans que le délai de
# test d'Unity ne morde — un fil principal gelé ne rend jamais la main à NUnit. Ce lanceur TUE l'éditeur quand le journal ne grandit
# plus pendant $STALL_S secondes et NOMME le test en cours (dernier « MafiaCI: RUN »). Mesuré au passage 4 : tué à 245 s, test nommé.
# ⚠️ STALL_S doit dépasser le plus long silence LÉGITIME d'un test : le plus long `[Timeout]` du dépôt vaut 300 s (2 tests). 240 a
#    suffi aux passages 2-4 (aucun de ces deux tests), mais au filtre complet prenez STALL_S=420.
# Usage (depuis la racine du dépôt, variables du harnais inchangées) :
#   LOG_FILE=… TIMEOUT_S=… STALL_S=420 WT="$PWD" MAFIA_CI_CATEGORIES=… (ou MAFIA_CI_TESTS=…) bash Tools/run-unity-garde-gel.sh
: "${STALL_S:=420}"
[ -n "$LOG_FILE" ] || { echo "⛔ LOG_FILE requis (le chien de garde lit ce journal)"; exit 2; }
for v in MAFIA_DEMO_IDENTIFIER MAFIA_DEMO_PASSWORD MAFIA_CAPTURE_IDENTIFIER MAFIA_CAPTURE_PASSWORD; do [ -z "${!v}" ] || { echo "⛔ $v POSÉE — FAUTE, STOP"; exit 3; }; done
echo "MAFIA_DEMO_* et MAFIA_CAPTURE_* absentes (attendu)"; date +%T
bash Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests &
H=$!
sleep 30
while kill -0 $H 2>/dev/null; do
  sleep 15
  [ -f "$LOG_FILE" ] || continue
  age=$(( $(date +%s) - $(stat -c %Y "$LOG_FILE") ))
  if [ "$age" -ge "$STALL_S" ]; then
    echo "⛔ JOURNAL FIGÉ depuis ${age}s — $(date +%T) — dernier : $(grep 'MafiaCI: RUN' "$LOG_FILE" | tail -1)"
    # Cible l'éditeur par son -logFile (le motif du harnais) : un motif sur la ligne de commande d'Unity attrape aussi le shell appelant.
    pkill -TERM -u "$(id -u)" -f "logFile $LOG_FILE"; sleep 10; pkill -KILL -u "$(id -u)" -f "logFile $LOG_FILE"
    break
  fi
done
wait $H; echo RC_RUN=$?; date +%T
