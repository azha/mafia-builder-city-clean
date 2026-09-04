#!/usr/bin/env bash
# §F-4 — UN run SEUL par catégorie, et un verdict qu'on peut opposer.
#
# ⛔ LES DEUX FAUX VERTS DU HARNAIS, mesurés le 2026-09-04 et payés tous les deux :
#   1. sans `-executeMethod`, `run-unity-check.sh` fait un simple contrôle de compilation,
#      atteint son `-quit` et rend **EXIT=0** — 44 s, zéro test, zéro image. Un vert qui ne
#      prouve rien sur la catégorie demandée.
#   2. sans `LOG_FILE=`, il DÉTRUIT son log Unity (`mktemp` + `rm`). Il ne reste que la ligne
#      de durée, donc plus rien ne distingue « 1 test vert » de « 0 test exécuté ».
# ⇒ Les deux sont posés ici, en dur, pour qu'aucun appelant ne puisse les oublier.
#
# ⛔ ET LE TROISIÈME, QUI EST LE SUJET MÊME DE CE CHANTIER : un filtre qui ne matche RIEN sort
#   **RC=0**. `MafiaCI` imprime `declares=N comptes=N` justement pour ça — un `declares=0` est
#   un run VIDE, pas un run vert, et ce script REFUSE de le rapporter comme un succès.
set -uo pipefail
CAT="${1:?usage: mesurer-categorie.sh <Categorie>}"
DIR="${DIR:-/home/erutheone/project/mafia-clean-city/scratchpad/chantier-F-2026-09-03/f4}"
mkdir -p "$DIR"
LOG="$DIR/$CAT.log"

LOG_FILE="$LOG" MAFIA_CI_CATEGORIES="$CAT" TIMEOUT_S="${TIMEOUT_S:-900}" \
  bash "$(dirname "${BASH_SOURCE[0]}")/run-unity-check.sh" -executeMethod MafiaCI.RunPlayModeTests \
  > "$DIR/$CAT.stdout" 2>&1
RC=$?

fin=$(grep -aoE 'RunPlayModeTests finished — passed=[0-9]+ failed=[0-9]+[^"]*' "$LOG" 2>/dev/null | tail -1)
dep=$(grep -aoE 'DÉCLARÉS SOUS LE FILTRE *: *[0-9]+' "$LOG" 2>/dev/null | tail -1 | grep -oE '[0-9]+$')
seg=$(grep -acE 'SIGSEGV|Segmentation fault|core dumped|Obtained [0-9]+ stack frames' "$LOG" 2>/dev/null)
ela=$(grep -aoE 'elapsed=[0-9]+s' "$DIR/$CAT.stdout" 2>/dev/null | tail -1)

if   [ -z "$fin" ] && [ "${seg:-0}" -gt 0 ]; then V="SIGSEGV"
elif [ -z "$fin" ];                          then V="PAS-DE-VERDICT"
elif [ "${dep:-0}" = "0" ];                  then V="VIDE (le filtre n a rien matche)"
elif echo "$fin" | grep -qE 'failed=0( |$)';  then V="VERT"
else                                              V="ROUGE"
fi
printf '%-24s %-32s declares=%-4s %-10s RC=%s\n' "$CAT" "$V" "${dep:-?}" "${ela:-?}" "$RC"
printf '%s\n' "    ${fin:-<aucune ligne finished>}"
