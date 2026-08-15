#!/usr/bin/env bash
# W3.U1 C1-F0 (design §3 C1-F0) — la preuve du juge, SUR CE LOT : le mécanisme (catégorie "W3U1"
# ajoutée à MafiaCI.cs, artefact LOG_FILE préservé) doit être prouvé PAR une faute injectée qui
# PASSE PAR LE FILTRE — jamais une preuve qui contourne le filtre qu'elle prétend garder. Mirrors
# `test-run-unity-check.sh`'s section 4 (W4P4a) — une catégorie de plus, le même patron.
set -e
cd "$(dirname "$0")/.."

LOG="$(mktemp)"

echo "=== 1/3 : vert sur l'arbre sain — passed >= N, jamais le seul code de sortie ==="
LOG_FILE="$LOG" ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
PASSED_BASELINE=$(grep -oE 'passed=[0-9]+' "$LOG" | tail -1 | cut -d= -f2)
echo "passed(baseline)=$PASSED_BASELINE"
if [[ -z "$PASSED_BASELINE" || "$PASSED_BASELINE" -lt 1 ]]; then
  echo "ECHEC: aucun 'passed=N' trouvé dans le log préservé — l'artefact n'a pas survécu, ou le filtre n'a rien exécuté."
  exit 1
fi
echo "OK: arbre sain -> vert, passed=$PASSED_BASELINE (>= 1, le compte distingue le vert du vide)"

echo "=== 2/3 : rouge sur une faute injectée QUI PASSE PAR LE FILTRE (catégorie W3U1) ==="
PROBE=Assets/Tests/PlayMode/_W3U1HarnessProbeTests.cs
cat > "$PROBE" <<'CS'
using NUnit.Framework;
namespace MafiaCleanCity.Shell.Tests
{
    [Category("W3U1")]
    public class _W3U1HarnessProbeTests
    {
        [Test]
        public void Probe_DeliberateFailure() { Assert.Fail("sonde de régression du harnais W3.U1"); }
    }
}
CS
set +e
LOG_FILE="$LOG" ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
RC=$?
set -e
if [[ "$RC" == "0" ]]; then
  rm -f "$PROBE" "$PROBE.meta"
  echo "ECHEC: le juge n'a pas rougi sur une faute injectée dans sa PROPRE catégorie (W3U1)"
  exit 1
fi
echo "OK: faute injectée dans W3U1 -> rouge (code de sortie $RC, non nul)"

echo "=== 3/3 : re-vert après retrait, passed >= N attendu (le baseline mesuré en 1/3) ==="
rm -f "$PROBE" "$PROBE.meta"
LOG_FILE="$LOG" ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
PASSED_AFTER=$(grep -oE 'passed=[0-9]+' "$LOG" | tail -1 | cut -d= -f2)
echo "passed(after)=$PASSED_AFTER"
if [[ -z "$PASSED_AFTER" || "$PASSED_AFTER" -lt "$PASSED_BASELINE" ]]; then
  echo "ECHEC: passed=$PASSED_AFTER n'atteint pas le plancher attendu ($PASSED_BASELINE)"
  rm -f "$LOG"
  exit 1
fi
echo "OK: le juge distingue vert et rouge sur SA PROPRE catégorie — passed=$PASSED_AFTER >= $PASSED_BASELINE"
rm -f "$LOG"
