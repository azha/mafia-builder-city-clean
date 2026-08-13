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

echo "=== 4/4 : le chemin -executeMethod async (MafiaCI) rougit vraiment sur un test qui echoue ==="
echo "    (regression du piege mesure pendant C3 : -quit inconditionnel fermait le process AVANT"
echo "     que TestRunnerApi.RunFinished ne soit jamais appele -- RC=0 silencieux, aucun test execute)"
PROBE=Assets/Tests/PlayMode/_W4P4aHarnessProbeTests.cs
cat > "$PROBE" <<'CS'
using NUnit.Framework;
namespace MafiaCleanCity.Theme.Tests
{
    [Category("W4P4a")]
    public class _W4P4aHarnessProbeTests
    {
        [Test]
        public void Probe_DeliberateFailure() { Assert.Fail("sonde de regression du harnais"); }
    }
}
CS
if ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests; then
  rm -f "$PROBE" "$PROBE.meta"
  echo "ECHEC: MafiaCI.RunPlayModeTests n'a pas rougi sur un test qui echoue (regression du piege -quit)"
  exit 1
fi
rm -f "$PROBE" "$PROBE.meta"
if ! ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests; then
  echo "ECHEC: MafiaCI.RunPlayModeTests reste rouge apres retrait de la sonde"
  exit 1
fi
echo "OK: MafiaCI.RunPlayModeTests distingue vert et rouge sur le chemin async"
