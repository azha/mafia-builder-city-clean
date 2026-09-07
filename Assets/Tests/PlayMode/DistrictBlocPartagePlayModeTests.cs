using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    /// ⛔ CE QUE CETTE SUITE EXISTE POUR ATTRAPER, et pourquoi rien ne l'attrapait.
    /// `DistrictBackgroundAnchor.FindParcel` est clé par (x,y) : elle rend UNE parcelle par BLOC.
    /// Deux bâtiments d'un même bloc recevaient donc le même pivot, au pixel près — un seul
    /// bâtiment visible, les libellés superposés, les marqueurs de lieutenant de l'un empilés sur
    /// l'autre. Mesuré en jeu le 2026-09-07 : 13 bâtiments pour 11 BLOCS DISTINCTS.
    ///
    /// ★★ AUCUNE GARDE SUR L'ÉCART ENTRE ANCRES NE POUVAIT LE VOIR, et c'est la leçon :
    ///    *l'écart minimal entre ancres est une propriété des ANCRES ; la superposition est une
    ///    propriété de la CLÉ.* Deux bâtiments qui PARTAGENT une ancre sont à écart nul quel que
    ///    soit l'espacement du semis. Un semis mieux réparti n'y change rien.
    ///
    /// ⛔ ET LA FIXTURE VOISINE NE POUVAIT PAS LE PRODUIRE : `WrapGrid` y assigne `block_id = i`,
    ///    donc UN bloc par bâtiment. La classe était hors de la population testée, pas ratée par
    ///    une assertion trop faible. C'est pourquoi cette suite FABRIQUE le bloc partagé au lieu
    ///    de l'attendre d'un compte — un scénario qui dépend des données d'un compte cesse de
    ///    dimensionner le jour où le compte change.
    [Category("BlocPartage")]
    public class DistrictBlocPartagePlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            if (hote == null) return;
            var d = hote.GetComponent<DistrictInteriorScreenController>();
            if (d != null && d.ScreenRoot != null)
            {
                Canvas c = d.ScreenRoot.GetComponentInParent<Canvas>();
                if (c != null) Object.Destroy(c.gameObject);
            }
            Object.Destroy(hote);
        }

        private static DistrictInteriorBuildingDto Batiment(string id, int blockId) => new DistrictInteriorBuildingDto
        {
            building = id, block_id = blockId, operational_type = "lab",
            conversion_band = "OPERATIONAL", shell_state = "STANDING", condition_band = "SOUND",
            revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE",
            lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false,
            lieutenant_ids = new string[0],
        };

        /// <summary>DEUX blocs seulement — 7 en (0,0) et 8 en (1,0) — et c'est le TEST qui décide
        /// quel bâtiment va dans lequel. Toute la différence avec le `WrapGrid` du voisin, qui
        /// assigne `block_id = i` et rend donc le bloc partagé INEXPRIMABLE.</summary>
        private static DistrictInteriorDto GrilleDeuxBlocs(DistrictInteriorBuildingDto[] batiments) =>
            new DistrictInteriorDto
            {
                district = "district-test", district_id = 1, profile = "lattice",
                name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = 2, height = 1 },
                blocks = new[]
                {
                    new DistrictInteriorBlockDto { block_id = 7, x = 0, y = 0 },
                    new DistrictInteriorBlockDto { block_id = 8, x = 1, y = 0 },
                },
                buildings = batiments,
                day_phase = "NIGHT",
            };

        private static List<RectTransform> CellulesSousLeBloc(DistrictInteriorScreenController d, int x, int y)
        {
            var trouvees = new List<RectTransform>();
            foreach (RectTransform rt in d.ScreenRoot.GetComponentsInChildren<RectTransform>(true))
                if (rt.name == $"Cell_{x}_{y}" || rt.name.StartsWith($"Cell_{x}_{y}_", StringComparison.Ordinal))
                    trouvees.Add(rt);
            return trouvees;
        }

        // ── F1 — deux bâtiments d'un MÊME bloc ne se posent pas au même endroit ──────────────────

        [UnityTest]
        public IEnumerator F1_DeuxBatimentsDunMemeBloc_NeSeSuperposentPas()
        {
            // bloc 7 partagé par DEUX bâtiments · bloc 8 mono-occupant (le témoin immobile)
            var batiments = new[]
            {
                Batiment("bat-aaa", 7),
                Batiment("bat-bbb", 7),
                Batiment("bat-ccc", 8),
            };

            hote = new GameObject("Diorama_BlocPartage_F1");
            var d = hote.AddComponent<DistrictInteriorScreenController>();
            d.Render(GrilleDeuxBlocs(batiments));

            // ⛔ ANTI-VACUITÉ AVANT TOUTE COMPARAISON : un scénario où aucun bloc n'est partagé
            //    rendrait « aucune superposition » VRAI À VIDE. On exige que le monde contienne
            //    bien le cas dégénéré avant de mesurer quoi que ce soit.
            var parBloc = batiments.GroupBy(b => b.block_id).ToDictionary(g => g.Key, g => g.Count());
            Assert.IsTrue(parBloc.Values.Any(n => n > 1),
                "scénario DIMENSIONNÉ — au moins un bloc doit porter plusieurs bâtiments, sinon "
                + "cette suite ne teste rien et le vert ne dit rien.");
            Assert.IsTrue(parBloc.Values.Any(n => n == 1),
                "scénario DIMENSIONNÉ — au moins un bloc MONO-occupant, sinon le témoin d'immobilité "
                + "ci-dessous n'existe pas.");

            List<RectTransform> partage = CellulesSousLeBloc(d, 0, 0);
            Assert.AreEqual(2, partage.Count,
                $"les DEUX bâtiments du bloc partagé doivent produire DEUX cellules — vues : "
                + $"[{string.Join(" | ", partage.Select(r => r.name))}]");

            // ⛔ LES NOMS D'ABORD (garde STRUCTURELLE avant garde de VALEUR) : tant que deux nœuds
            //    portent le même nom, tout appariement par nom prend le premier venu et mesure
            //    l'autre sans le dire. C'est ce qui a rendu la garde voisine aveugle.
            Assert.AreEqual(2, partage.Select(r => r.name).Distinct().Count(),
                "les deux cellules doivent porter des noms DISTINCTS");

            float dx = Mathf.Abs(partage[0].anchoredPosition.x - partage[1].anchoredPosition.x);
            Assert.Greater(dx, 1f,
                $"les deux bâtiments du bloc 7 sont à {dx:0.00} unités l'un de l'autre — au même "
                + "endroit, le joueur en voit UN et ne peut pas toucher l'autre. (Le seuil de 1 "
                + "écarte un écart qui ne serait qu'un artefact d'arrondi au pixel écran.)");

            yield return null;
        }

        // ── F2 — le mono-occupant ne bouge PAS d'un pixel (contrôle négatif) ─────────────────────

        [UnityTest]
        public IEnumerator F2_UnBlocMonoOccupant_NeBougePas()
        {
            // ⛔ LE CONTRÔLE QUI PROTÈGE LE RESTE DU JEU. `EtalementDansParcelle` rend EXACTEMENT 0
            //    quand le bloc n'a qu'un occupant : sans cette garde, un lot qui « répartit » aurait
            //    déplacé les 11 bâtiments mono-occupants du compte réel, et toutes les mesures de
            //    position déjà ratifiées (pp-F2, socle, navigation) auraient bougé en silence.
            hote = new GameObject("Diorama_BlocPartage_F2");
            var d = hote.AddComponent<DistrictInteriorScreenController>();
            d.Render(GrilleDeuxBlocs(new[] { Batiment("bat-seul", 7), Batiment("bat-autre", 8) }));

            List<RectTransform> seules = CellulesSousLeBloc(d, 0, 0);
            Assert.AreEqual(1, seules.Count, "un seul bâtiment dans ce bloc ⇒ une seule cellule");
            Assert.AreEqual("Cell_0_0", seules[0].name,
                "le nom du mono-occupant est INCHANGÉ — six sites de test cherchent `Cell_x_y` "
                + "littéralement ; un suffixe systématique les casserait tous.");

            float attendu = 0f * 100f; // bloc x=0 ⇒ repli de grille (0,0) : aucune ancre en test
            Assert.AreEqual(attendu, seules[0].anchoredPosition.x, 0.0001f,
                "le mono-occupant reste exactement sur son pivot — étalement nul, pas « petit »");

            yield return null;
        }

        // ── F3 — l'ordre dans le bloc est STABLE, il ne suit pas l'ordre du serveur ──────────────

        [UnityTest]
        public IEnumerator F3_LOrdreDansLeBloc_NeDependPasDeLOrdreDeLaReponse()
        {
            // ⛔ POURQUOI : `ordered` est trié sur (y,x) du BLOC. À l'intérieur d'un bloc ces deux
            //    clés sont ÉGALES, donc le tri ne départage rien et l'ordre resterait celui du
            //    serveur. Deux captures du même compte échangeraient alors les deux bâtiments, et
            //    un juge lirait un déplacement là où rien n'a bougé.
            hote = new GameObject("Diorama_BlocPartage_F3");
            var d = hote.AddComponent<DistrictInteriorScreenController>();

            // ⛔⛔ LE `yield` AVANT LA MESURE, ET IL EST LE SUJET DU TEST AUTANT QUE L'ORDRE.
            //    La v1 lisait `sens1` IMMÉDIATEMENT après `Render()` et `sens2` APRÈS une frame :
            //    deux variables bougeaient ensemble — l'ordre de la réponse ET l'instant de la
            //    mesure. Rouge mesuré : attendu -119,00000762939453, obtenu autre chose.
            //    `SnapToScreenPixel` ARRONDIT une position MONDE, qui dépend d'un canvas déjà
            //    posé : les deux relevés n'étaient donc pas comparables, et le rouge n'accusait
            //    pas le code qu'il prétendait juger.
            //    ★ C'est la faute que ce dépôt écrit partout — *deux variables qui bougent
            //      ensemble ne départagent rien* — commise ici DANS le test écrit pour attraper
            //      un défaut de déterminisme. Les deux relevés sont désormais pris au MÊME point
            //      du cycle de frame.
            // ⛔⛔⛔ RENDU DE CHAUFFE, ET IL EST OBLIGATOIRE — mesuré, pas supposé.
            //    Sans lui : premier relevé -119,000008, second -238,000015. EXACTEMENT ×2, et la
            //    cause n'est pas l'ordre de la réponse : `Canvas.scaleFactor` lu dans la frame de
            //    son propre `AddComponent` rend 1,000000 — une valeur PLAUSIBLE, pas une erreur.
            //    Or `cellSize` divise par ce facteur, donc TOUTE la géométrie du premier rendu est
            //    à une autre échelle. Le test aurait accusé le tri d'un défaut qui appartient au
            //    cycle de vie du canvas.
            //    ⇒ Le rendu de chauffe est jeté ; les deux relevés comparés se font ensuite sur un
            //      canvas POSÉ, et l'ordre de la réponse redevient la seule variable.
            d.Render(GrilleDeuxBlocs(new[] { Batiment("bat-aaa", 7), Batiment("bat-bbb", 7), Batiment("bat-ccc", 8) }));
            yield return null;

            d.Render(GrilleDeuxBlocs(new[] { Batiment("bat-aaa", 7), Batiment("bat-bbb", 7), Batiment("bat-ccc", 8) }));
            yield return null;
            float[] sens1 = CellulesSousLeBloc(d, 0, 0).Select(r => r.anchoredPosition.x).OrderBy(v => v).ToArray();

            // MÊME contenu, ordre de réponse INVERSÉ — la seule variable qui change
            d.Render(GrilleDeuxBlocs(new[] { Batiment("bat-bbb", 7), Batiment("bat-aaa", 7), Batiment("bat-ccc", 8) }));
            yield return null;
            float[] sens2 = CellulesSousLeBloc(d, 0, 0).Select(r => r.anchoredPosition.x).OrderBy(v => v).ToArray();

            Assert.AreEqual(2, sens1.Length, "anti-vacuité — deux positions à comparer au premier rendu");
            Assert.AreEqual(sens1.Length, sens2.Length, "même nombre de cellules dans les deux sens");
            for (int i = 0; i < sens1.Length; i++)
                Assert.AreEqual(sens1[i], sens2[i], 0.0001f,
                    "l'ensemble des positions ne dépend pas de l'ordre de la réponse");
        }

        // ── F4 — le helper PUR, sans rendu : les propriétés de la répartition ────────────────────

        [Test]
        public void F4_EtalementDansParcelle_ProprietesDeLaRepartition()
        {
            var parcelle = new DistrictBackgroundParcelDto { x = 0, y = 0, largeur_px = 120f, pivot_px = new[] { 0f, 0f } };

            Assert.AreEqual(0f, DistrictBackgroundAnchor.EtalementDansParcelle(parcelle, 0, 1, 64f), 0.0001f,
                "mono-occupant ⇒ étalement EXACTEMENT nul");

            float a = DistrictBackgroundAnchor.EtalementDansParcelle(parcelle, 0, 2, 64f);
            float b = DistrictBackgroundAnchor.EtalementDansParcelle(parcelle, 1, 2, 64f);
            Assert.AreNotEqual(a, b, "deux occupants ⇒ deux décalages DIFFÉRENTS");
            Assert.AreEqual(0f, a + b, 0.0001f, "la répartition est CENTRÉE sur le pivot (somme nulle)");
            Assert.Less(Mathf.Abs(a), 120f * 0.5f, "aucun occupant ne sort de sa propre parcelle");
            Assert.Less(Mathf.Abs(b), 120f * 0.5f, "aucun occupant ne sort de sa propre parcelle");

            // ⛔ CONTRÔLE NÉGATIF : une parcelle SANS largeur mesurée doit retomber sur la largeur
            //    de repli fournie par l'appelant, pas sur zéro — sinon la superposition revient
            //    exactement là où l'atelier n'a pas mesuré, c'est-à-dire là où on ne regarde pas.
            var sansLargeur = new DistrictBackgroundParcelDto { x = 0, y = 0, largeur_px = 0f };
            float c = DistrictBackgroundAnchor.EtalementDansParcelle(sansLargeur, 0, 2, 64f);
            Assert.AreNotEqual(0f, c, "largeur_px absente ⇒ repli sur la largeur de l'appelant, jamais 0");

            // et le repli à zéro AUSSI (aucune largeur connue d'aucun côté) : là, 0 est la seule
            // réponse honnête — on ne fabrique pas un écart depuis rien.
            Assert.AreEqual(0f, DistrictBackgroundAnchor.EtalementDansParcelle(sansLargeur, 0, 2, 0f), 0.0001f,
                "aucune largeur connue ⇒ 0, déclaré, plutôt qu'un nombre inventé");
        }
    }
}
