using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // W3.U2 C10 (design §3 C10, engagement 7 — U-12 : "3-4 boucles ambiantes maximum, budgétées").
    // C10-F2 (le budget est une contrainte, pas une intention) : le nombre de boucles ambiantes
    // ACTIVES est ≤ 4, cible = le compte À L'EXÉCUTION — jamais une intention en prose. Les deux
    // falsifiables ci-dessous couvrent les DEUX moitiés de la propriété (socle : une garde
    // anti-vacuité ne prouve pas qu'un scénario est dimensionné) :
    //   C10F2a — SATURATION : au-delà du budget, le compte plafonne EXACTEMENT à MaxAmbientLoops,
    //     jamais 0 (qui prouverait seulement l'impuissance de la sonde) ni au-delà.
    //   C10F2b — SOUS LE BUDGET : avec MOINS de candidats que le plafond, le compte suit EXACTEMENT
    //     le nombre de candidats — la garde anti-saturation ne doit pas non plus tuer le mécanisme.
    // Les deux tests vérifient en plus que le compte correspond à des composants AmbientPulseLoop
    // RÉELLEMENT attachés (pas un compteur déconnecté du monde qu'il prétend décrire — la même
    // classe de piège qu'un `default` qui avale une garde).
    //
    // ⛔ C10-F1 (lieutenants visibles à leur affectation, U-11) N'EST PAS testé ici : ce chunk ne le
    // livre pas — voir DistrictInteriorScreenController.cs (tête de fichier, § C10) et
    // Tools/w3u2-c10-notes.md § Deviations pour la mesure qui fonde ce STOP.
    [Category("W3U2")]
    public class DistrictInteriorAmbientLoopsPlayModeTests
    {
        private GameObject bareHostGo;

        [TearDown]
        public void TearDown()
        {
            if (bareHostGo != null)
            {
                var diorama = bareHostGo.GetComponent<DistrictInteriorScreenController>();
                if (diorama != null && diorama.ScreenRoot != null)
                {
                    Canvas c = diorama.ScreenRoot.GetComponentInParent<Canvas>();
                    if (c != null) Object.Destroy(c.gameObject); // un diorama sans shell bâtit son PROPRE Canvas
                }
                Object.Destroy(bareHostGo);
            }
        }

        // ── fabrication de payloads (mêmes champs que le DTO réel de C7/C9 — valeurs choisies par le
        // test, jamais lues d'un fetch) ──────────────────────────────────────────────────────────

        /// <summary>Un bâtiment qui réclame les TROIS candidats d'ambiance à la fois (néon EARNING +
        /// fumée ACTIVE + grésillement CRITICAL non pris en charge) — le pire cas pour le budget.</summary>
        private static DistrictInteriorBuildingDto MakeTripleCandidate(string buildingId, int blockId) => new DistrictInteriorBuildingDto
        {
            building = buildingId,
            block_id = blockId,
            operational_type = "lab",
            conversion_band = "OPERATIONAL",
            shell_state = "STANDING",
            condition_band = "SOUND",
            revenue_band = "EARNING",
            revenue_chain = "WIRED",
            activity_band = "ACTIVE",
            lapse_phase_bucket = "CRITICAL",
            maintenance_in_progress = false,
        };

        /// <summary>Un bâtiment qui ne réclame AUCUN candidat d'ambiance — présent (fenêtre ambre,
        /// binding 1+2) mais sans revenu/activité/dette (le repli honnête de D2/D3).</summary>
        private static DistrictInteriorBuildingDto MakeZeroCandidate(string buildingId, int blockId) => new DistrictInteriorBuildingDto
        {
            building = buildingId,
            block_id = blockId,
            operational_type = "stash",
            conversion_band = "OPERATIONAL",
            shell_state = "STANDING",
            condition_band = "SOUND",
            revenue_band = "IDLE",
            revenue_chain = "UNWIRED",
            activity_band = "IDLE",
            lapse_phase_bucket = "WITHIN_WINDOW",
            maintenance_in_progress = false,
        };

        private static DistrictInteriorDto WrapGrid(DistrictInteriorBuildingDto[] buildings)
        {
            var blocks = new DistrictInteriorBlockDto[buildings.Length];
            for (int i = 0; i < buildings.Length; i++)
                blocks[i] = new DistrictInteriorBlockDto { block_id = i, x = i, y = 0 };
            return new DistrictInteriorDto
            {
                district = "district-1",
                district_id = 1,
                profile = "lattice",
                name_canonical = "Test",
                bank_side = "north",
                grid = new DistrictInteriorGridDto { width = buildings.Length, height = 1 },
                blocks = blocks,
                buildings = buildings,
                day_phase = "NIGHT",
            };
        }

        // ── C10-F2a — SATURATION : 6 bâtiments × 3 candidats chacun (18 candidats) plafonnent EXACTEMENT
        // à MaxAmbientLoops, jamais plus ─────────────────────────────────────────────────────────────

        [UnityTest]
        public IEnumerator C10F2a_MoreCandidatesThanBudget_ActiveLoopCountCapsExactlyAtMax()
        {
            var buildings = new DistrictInteriorBuildingDto[6];
            for (int i = 0; i < buildings.Length; i++)
                buildings[i] = MakeTripleCandidate($"building-{i}", i);
            // scénario DIMENSIONNÉ : 18 candidats (6 bâtiments × 3 bindings dynamiques) — largement
            // au-delà du plafond de 4 ; si le budget ne tenait pas, ce scénario le révélerait.
            Assert.Greater(buildings.Length * 3, DistrictInteriorScreenController.MaxAmbientLoops,
                "scénario dimensionné — le nombre de candidats DOIT excéder le plafond");

            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F2a");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(buildings));

            Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, diorama.ActiveAmbientLoopCount,
                "C10-F2 — le budget est une CONTRAINTE : le compte plafonne EXACTEMENT à MaxAmbientLoops, pas 0, pas au-delà");

            // le compte n'est pas un compteur déconnecté — il correspond à des composants RÉELLEMENT attachés.
            int actualComponents = diorama.ScreenRoot.GetComponentsInChildren<AmbientPulseLoop>(true).Length;
            Assert.AreEqual(diorama.ActiveAmbientLoopCount, actualComponents,
                "le compte DOIT correspondre à des AmbientPulseLoop réellement attachés, pas une intention en prose");

            yield return null;
        }

        // ── C10-F2b — SOUS LE BUDGET : le mécanisme n'est pas bloqué à 0 (anti-vacuité, socle règle
        // "une garde anti-vacuité ne prouve pas qu'un scénario est DIMENSIONNÉ") ──────────────────────

        [UnityTest]
        public IEnumerator C10F2b_FewerCandidatesThanBudget_ActiveLoopCountTracksCandidatesExactly()
        {
            // 2 candidats (< 4) : 1 bâtiment triple-candidat (3 sources, mais lui seul ne peut pas
            // prouver le plafond) mélangé à 1 bâtiment zéro-candidat — situation réaliste où TOUS les
            // candidats sont servis, aucun n'est refusé par le budget.
            var buildings = new[]
            {
                MakeZeroCandidate("building-0", 0),
                MakeZeroCandidate("building-1", 1),
            };
            // Exactement 2 candidats au total, en modifiant UN SEUL champ par bâtiment pour rester lisible :
            buildings[0].revenue_chain = "WIRED";
            buildings[0].revenue_band = "EARNING"; // 1 candidat : néon
            buildings[1].activity_band = "ACTIVE"; // 1 candidat : fumée
            int expectedCandidates = 2;
            Assert.Less(expectedCandidates, DistrictInteriorScreenController.MaxAmbientLoops,
                "scénario dimensionné — le nombre de candidats DOIT rester SOUS le plafond");

            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F2b");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(buildings));

            Assert.AreEqual(expectedCandidates, diorama.ActiveAmbientLoopCount,
                "sous le budget, le compte suit EXACTEMENT les candidats — pas 0 (le mécanisme n'est pas mort), pas plafonné artificiellement");

            int actualComponents = diorama.ScreenRoot.GetComponentsInChildren<AmbientPulseLoop>(true).Length;
            Assert.AreEqual(diorama.ActiveAmbientLoopCount, actualComponents,
                "le compte DOIT correspondre à des AmbientPulseLoop réellement attachés");

            yield return null;
        }

        // ── re-render : le budget ne fuit pas d'un rendu à l'autre (ClearContent détruit les boucles
        // de l'ancien rendu — un re-render sous le plafond ne doit PAS hériter du plafond précédent) ──

        [UnityTest]
        public IEnumerator C10F2c_ReRenderBelowBudget_DoesNotInheritThePreviousRenderSCount()
        {
            var saturating = new DistrictInteriorBuildingDto[6];
            for (int i = 0; i < saturating.Length; i++)
                saturating[i] = MakeTripleCandidate($"building-{i}", i);

            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F2c");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(saturating));
            Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, diorama.ActiveAmbientLoopCount,
                "premier rendu — saturé");

            var single = new[] { MakeTripleCandidate("building-0", 0) }; // 1 bâtiment = 3 candidats
            diorama.Render(WrapGrid(single));
            Assert.AreEqual(3, diorama.ActiveAmbientLoopCount,
                "second rendu — 3 candidats, PAS 4 : le compteur ne doit pas hériter du rendu précédent");

            int actualComponents = diorama.ScreenRoot.GetComponentsInChildren<AmbientPulseLoop>(true).Length;
            Assert.AreEqual(3, actualComponents,
                "les composants du premier rendu doivent avoir été détruits par ClearContent, pas accumulés");

            yield return null;
        }
    }
}
