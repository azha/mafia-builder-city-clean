#!/usr/bin/env bash
# W3.U-DA/C2 — G1 : tout binaire importé sous Assets/Art/** doit être un POINTEUR LFS dans
# l'index git, pas un blob. Mécanisme du design (§4.3) : `git cat-file -p <sha>` sur le blob
# INDEXÉ, assert en-tête de pointeur LFS. Un répertoire vide rendrait 0/0 = vrai à vide — garde
# anti-vacuité : N >= 1 chemin vérifié, sinon échec explicite (pas un pass silencieux).
#
# usage: lfs-pointer-check.sh <chemin versionné...>
#   sortie : 0 si TOUS les chemins sont des pointeurs LFS (et qu'il y en a >= 1) ; 1 sinon.
set -uo pipefail
cd "$(dirname "$0")/.."

if [[ $# -eq 0 ]]; then
  echo "G1: 0 chemin fourni — anti-vacuité: un répertoire vide ne peut pas passer G1 par défaut." >&2
  exit 1
fi

FAIL=0
CHECKED=0
for path in "$@"; do
  sha=$(git ls-files -s -- "$path" 2>/dev/null | awk '{print $2}')
  if [[ -z "$sha" ]]; then
    echo "G1 FAIL: '$path' n'est pas dans l'index git (pas committé/stagé)." >&2
    FAIL=1
    continue
  fi
  header=$(git cat-file -p "$sha" 2>/dev/null | head -1)
  CHECKED=$((CHECKED+1))
  if [[ "$header" != "version https://git-lfs.github.com/spec/v1" ]]; then
    echo "G1 FAIL: '$path' (blob $sha) n'est PAS un pointeur LFS — première ligne: '$header'" >&2
    FAIL=1
  else
    echo "G1 PASS: '$path' -> pointeur LFS confirmé (blob $sha)"
  fi
done

if [[ $CHECKED -eq 0 ]]; then
  echo "G1: 0 chemin réellement vérifié — anti-vacuité." >&2
  exit 1
fi

exit $FAIL
