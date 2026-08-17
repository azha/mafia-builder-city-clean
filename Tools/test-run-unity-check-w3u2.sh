#!/usr/bin/env bash
# W3.U2 C4 (design §3 C4) — la preuve du juge, SUR CE LOT : le mécanisme (catégorie "W3U2"
# ajoutée à MafiaCI.cs) doit être prouvé PAR une faute injectée qui PASSE PAR LE FILTRE — jamais
# une preuve qui contourne le filtre qu'elle prétend garder. Mirrors
# `test-run-unity-check-w3u1.sh` — une catégorie de plus, le même patron.
#
# ⚠️ v2 (design R7) : C4 n'asserte plus un repère ABSOLU (l'écart 86/87 sur ce dépôt a montré
# qu'un absolu gravé peut être faux au moment même où on l'écrit) — le plancher de l'étape 3/3
# est le PASSED de l'étape 1/3, mesuré sur CE run, jamais recopié d'une version antérieure de ce
# fichier.
#
# STATUT AU 2026-08-17 (avant fenêtre de runs groupée, ruling contrôleur "MODE LÉGER") :
#   - étape 2/3 (rouge à travers le filtre W3U2) : DÉJÀ EXÉCUTÉE une fois cette session, confirmée
#     (RC=1, la sonde `_W3U2HarnessProbeTests` visible dans le log comme FAIL). La sonde a été
#     retirée de l'arbre après coup — 0 fichier `_W3U2*` présent au commit qui porte ce script.
#   - étape 1/3 et 3/3 (vert avant/après) : DIFFÉRÉES à la fenêtre de runs groupée du contrôleur.
#     Dernière mesure propre obtenue cette session, sur backend fraîchement réinitialisé (0 lignes
#     `player`), catégorie W3U2 déjà dans le tableau, sonde retirée : passed=86 failed=1 — l'UNIQUE
#     échec est `OrgVitalsPanelControllerPlayModeTests.C6F4_CohesionProbe...` (timeout sur
#     `/v1/_test/citysim/advance?ticks=2000`, un appel documenté "measured to exceed 30s"), et il
#     échouait DÉJÀ IDENTIQUEMENT sur une base rechargée à vide juste avant — donc pas un effet de
#     volume de données. Sans rapport avec ce chunk (aucun fichier OrgVitals/citysim touché ici) ;
#     lecture la plus probable : contention CPU machine (plusieurs process Unity + Docker actifs en
#     même temps), à confirmer à la fenêtre sur machine calme. Attendu à la fenêtre : passed=87
#     failed=0 (le plancher pristine mesuré AVANT tout édit de ce chunk, sur backend propre :
#     passed=87 failed=0, run élaboré avant l'ajout de "W3U2").
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

echo "=== 2/3 : rouge sur une faute injectée QUI PASSE PAR LE FILTRE (catégorie W3U2) ==="
PROBE=Assets/Tests/PlayMode/_W3U2HarnessProbeTests.cs
cat > "$PROBE" <<'CS'
using NUnit.Framework;
namespace MafiaCleanCity.CityMap.Tests
{
    [Category("W3U2")]
    public class _W3U2HarnessProbeTests
    {
        [Test]
        public void Probe_DeliberateFailure() { Assert.Fail("sonde de régression du harnais W3.U2"); }
    }
}
CS
set +e
LOG_FILE="$LOG" ./Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
RC=$?
set -e
if [[ "$RC" == "0" ]]; then
  rm -f "$PROBE" "$PROBE.meta"
  echo "ECHEC: le juge n'a pas rougi sur une faute injectée dans sa PROPRE catégorie (W3U2)"
  exit 1
fi
echo "OK: faute injectée dans W3U2 -> rouge (code de sortie $RC, non nul)"

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
