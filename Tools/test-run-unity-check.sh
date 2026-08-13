#!/usr/bin/env bash
# W4.P4a/C2 — falsifiable du harnais lui-même : il doit rougir sur une faute injectée, et
# revenir vert après son retrait. Sans ce script, "Unity est vert" ne prouve rien — c'est le
# contrôle positif du juge de tout le lot.
set -e
cd "$(dirname "$0")/.."

echo "=== 1/3 : vert sur l'arbre sain ==="
./Tools/run-unity-check.sh
echo "OK: arbre sain -> vert"

echo "=== 2/3 : rouge sur faute injectee ==="
printf 'class _Probe { int x = "boom"; }\n' > Assets/Scripts/_Probe.cs
if ./Tools/run-unity-check.sh; then
  rm -f Assets/Scripts/_Probe.cs Assets/Scripts/_Probe.cs.meta
  echo "ECHEC: le harnais ne detecte pas une erreur de compilation"
  exit 1
fi
rm -f Assets/Scripts/_Probe.cs Assets/Scripts/_Probe.cs.meta
echo "OK: faute injectee -> rouge (code de sortie non nul)"

echo "=== 3/3 : re-vert apres retrait ==="
./Tools/run-unity-check.sh
echo "OK: le harnais distingue vert et rouge"
