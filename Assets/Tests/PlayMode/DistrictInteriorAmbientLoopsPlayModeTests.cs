using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Mouvements;
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
    // Les trois tests vérifient en plus que le compte correspond à des PISTES de la régie RÉELLEMENT
    // attachées (E2a : le composant à `Update` est supprimé ; les boucles sont des pistes `Ambiance` du
    // catalogue du HUD) — pas un compteur déconnecté du monde qu'il prétend décrire, la même classe de
    // piège qu'un `default` qui avale une garde. Chaque triplet de comptes a son CONTRÔLE NÉGATIF : le
    // même rendu SANS régie compte toujours 4 boucles admises par le budget (contrat épinglé), mais 0
    // piste et 0 `CanvasGroup` — l'assertion sur les pistes n'est donc jamais satisfaite par le compteur.
    //
    // ⛔ C10-F1 (lieutenants visibles à leur affectation, U-11) N'EST PAS testé ici : ce chunk ne le
    // livre pas — voir DistrictInteriorScreenController.cs (tête de fichier, § C10) et
    // Tools/w3u2-c10-notes.md § Deviations pour la mesure qui fonde ce STOP.
    [Category("W3U2")]
    public class DistrictInteriorAmbientLoopsPlayModeTests
    {
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private GameObject bareHostGo;

        [TearDown]
        public void TearDown()
        {
            RegieMouvement.Oublier();
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

        // ── les pistes d'ambiance, observées sur les OBJETS ─────────────────────────────────────────────

        private static readonly string[] NomsDesSources = { "RevenueSign", "ActivitySmoke", "MaintenanceFlicker" };

        /// <summary>Une régie de test à horloge posée à la main, AVANT tout rendu : la régie de test n'avance jamais seule, et son
        /// `Update` rejoue le même `t` (idempotent) — les `Tick` de ce test sont les seuls qui comptent.</summary>
        private static Regie RegieDeTest(out HorlogeFigee horloge)
        {
            Regie regie = RegieMouvement.PourTest();
            horloge = (HorlogeFigee)regie.Horloge;
            horloge.Temps = 100f;
            return regie;
        }

        /// <summary>Les `CanvasGroup` que la régie a posés sur les SOURCES du rendu (néon, fumée, scintillement).</summary>
        private static List<CanvasGroup> GroupesDesSources(DistrictInteriorScreenController diorama)
        {
            var res = new List<CanvasGroup>();
            foreach (CanvasGroup g in diorama.ScreenRoot.GetComponentsInChildren<CanvasGroup>(true))
                if (System.Array.IndexOf(NomsDesSources, g.gameObject.name) >= 0) res.Add(g);
            return res;
        }

        /// <summary>L'alpha de chaque groupe à cinq instants espacés de 0,5 s : une boucle VIT si son alpha bouge de plus de 0,02 sur 2 s
        /// (l'amplitude du plus mince, la fumée, est 0,69 de facteur ; sur la moitié d'une période de 3,9 s, elle ne peut pas rester plate).</summary>
        private static void AssertToutesVivent(Regie regie, HorlogeFigee horloge, List<CanvasGroup> groupes)
        {
            var mini = new float[groupes.Count];
            var maxi = new float[groupes.Count];
            for (int i = 0; i < groupes.Count; i++) { mini[i] = float.MaxValue; maxi[i] = float.MinValue; }
            for (int k = 0; k < 5; k++)
            {
                horloge.Temps = 100f + 0.5f * k;
                regie.Tick(horloge.Temps);
                for (int i = 0; i < groupes.Count; i++)
                {
                    mini[i] = Mathf.Min(mini[i], groupes[i].alpha);
                    maxi[i] = Mathf.Max(maxi[i], groupes[i].alpha);
                }
            }
            for (int i = 0; i < groupes.Count; i++)
                Assert.Greater(maxi[i] - mini[i], 0.02f, $"la boucle de {groupes[i].gameObject.name} doit VIVRE : son alpha varie sur 2 s");
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

            Regie regie = RegieDeTest(out HorlogeFigee horloge);
            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F2a");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(buildings));

            Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, diorama.ActiveAmbientLoopCount,
                "C10-F2 — le budget est une CONTRAINTE : le compte plafonne EXACTEMENT à MaxAmbientLoops, pas 0, pas au-delà");

            // le compte n'est pas un compteur déconnecté — il correspond à des PISTES réellement vivantes dans la régie du même hôte…
            Assert.AreEqual(diorama.ActiveAmbientLoopCount, regie.PistesVivantes,
                "le compte DOIT correspondre à des pistes réellement attachées, pas une intention en prose");
            // …et on les voit SUR LES OBJETS : un CanvasGroup par source admise, dont l'alpha varie
            List<CanvasGroup> groupes = GroupesDesSources(diorama);
            Assert.AreEqual(diorama.ActiveAmbientLoopCount, groupes.Count, "un CanvasGroup posé par la régie sur chaque source admise, aucun sur les autres");
            AssertToutesVivent(regie, horloge, groupes);

            // CONTRÔLE NÉGATIF : sans régie, le budget compte toujours 4 (contrat épinglé), mais il n'y a ni piste ni CanvasGroup —
            // l'assertion ci-dessus ne peut donc pas être satisfaite par le seul compteur
            RegieMouvement.Oublier();
            var nu = new GameObject("DistrictInteriorDiorama_C10F2a_SansRegie");
            var dioramaNu = nu.AddComponent<DistrictInteriorScreenController>();
            try
            {
                dioramaNu.Render(WrapGrid(buildings));
                Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, dioramaNu.ActiveAmbientLoopCount, "le compte épinglé ne dépend pas de la régie");
                Assert.AreEqual(0, GroupesDesSources(dioramaNu).Count, "sans régie : aucun CanvasGroup posé");
                Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, RegieMouvement.SansRegie, "sans régie : les attachements sont comptés, pas perdus en silence");
            }
            finally
            {
                if (dioramaNu.ScreenRoot != null)
                {
                    Canvas c = dioramaNu.ScreenRoot.GetComponentInParent<Canvas>();
                    if (c != null) Object.Destroy(c.gameObject);
                }
                Object.Destroy(nu);
            }

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

            Regie regie = RegieDeTest(out HorlogeFigee horloge);
            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F2b");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(buildings));

            Assert.AreEqual(expectedCandidates, diorama.ActiveAmbientLoopCount,
                "sous le budget, le compte suit EXACTEMENT les candidats — pas 0 (le mécanisme n'est pas mort), pas plafonné artificiellement");

            Assert.AreEqual(diorama.ActiveAmbientLoopCount, regie.PistesVivantes,
                "le compte DOIT correspondre à des pistes réellement attachées");
            List<CanvasGroup> groupes = GroupesDesSources(diorama);
            Assert.AreEqual(expectedCandidates, groupes.Count, "néon et fumée portent un CanvasGroup de la régie ; le scintillement (aucun candidat) non");
            Assert.IsFalse(groupes.Exists(g => g.gameObject.name == "MaintenanceFlicker"), "contrôle négatif : une source non candidate n'est pas animée");
            AssertToutesVivent(regie, horloge, groupes);

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

            Regie regie = RegieDeTest(out _);
            bareHostGo = new GameObject("DistrictInteriorDiorama_C10F2c");
            var diorama = bareHostGo.AddComponent<DistrictInteriorScreenController>();
            diorama.Render(WrapGrid(saturating));
            Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, diorama.ActiveAmbientLoopCount,
                "premier rendu — saturé");
            // la ligne de base du contrôle négatif : l'assertion finale sait distinguer 4 de 3 (et 7 si les pistes s'accumulaient)
            Assert.AreEqual(DistrictInteriorScreenController.MaxAmbientLoops, regie.PistesVivantes, "premier rendu — 4 pistes vivantes");

            var single = new[] { MakeTripleCandidate("building-0", 0) }; // 1 bâtiment = 3 candidats
            diorama.Render(WrapGrid(single));
            Assert.AreEqual(3, diorama.ActiveAmbientLoopCount,
                "second rendu — 3 candidats, PAS 4 : le compteur ne doit pas hériter du rendu précédent");

            // ⚠️ CORRECTIF DE PLACEMENT (le yield précédent, placé AVANT ce second Render(), était un
            // no-op : `ClearContent` du PREMIER render n'avait rien à détruire — root était vide avant
            // lui. C'est LE SECOND `Render()` (juste au-dessus) dont le `ClearContent` appelle `Destroy`
            // sur les sources du premier rendu — différé à la fin de frame. Le yield doit suivre CE
            // render-ci, pas le précéder, pour que la hiérarchie soit RÉELLEMENT purgée. Vérifié dans
            // le corps de `ClearContent`/`TryStartAmbientLoop` : aucun objet ne vit hors du sous-arbre
            // de `root` (root → GridArea → Cell → sign/smoke/flicker, la piste d'ambiance est une
            // entrée de la RÉGIE posée sur ces GameObjects, jamais un objet séparé) — `ClearContent`
            // détruit bien `root` en entier par cascade, aucune purge partielle.
            // E2a : `ClearContent` DÉTACHE aussi les pistes du sous-arbre qu'il détruit (`DetacherSous`) : le compte de la régie
            // est juste dès le second rendu, il n'attend pas la libération des cibles nulles au prochain `Tick`.
            yield return null;

            Assert.AreEqual(3, regie.PistesVivantes,
                "les pistes du premier rendu doivent avoir été détachées par ClearContent, pas accumulées (4 + 3 = 7 sinon)");
            Assert.AreEqual(3, GroupesDesSources(diorama).Count, "et les sources détruites ne portent plus rien : 3 CanvasGroup, ceux du second rendu");

            yield return null;
        }
    }
}
